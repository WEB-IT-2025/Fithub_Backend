import { Request, Response } from 'express'
import db from '~/config/database'

import { petModel } from '../models/petModel'

/**
 * ユーザーのペット一覧を取得するコントローラー（パラメータ付き）
 * 認証ミドルウェアでJWTからuser_idを取得し、そのユーザーのペット情報を返す
 * クエリパラメータ: category（カテゴリー絞り込み）, sort（ソート順）
 */
export const getUserPets = async (req: Request, res: Response): Promise<void> => {
    // 1. 認証ミドルウェアでセットされたuser_idを型アサーションで取得
    const user_id = (req.user as { user_id?: string })?.user_id
    const { category, sort } = req.query

    // 2. user_idがなければ認証エラーを返す
    if (!user_id) {
        res.status(401).json({ message: '認証情報が無効です' })
        return
    }

    try {
        // 3. モデルを使ってDBからユーザーのペット一覧を取得
        let pets = (await petModel.getPetsByUserId(user_id)) as Array<{
            item_id: string
            pet_name: string
            pet_image_folder: string
            pet_type: string
            user_pet_name: string
            user_main_pet: boolean
            user_sub_pet: boolean
            pet_size: number
            pet_states: number
            purchase_time: Date
        }>

        // 4. ペットがいなければ404エラーを返す
        if (!pets || pets.length === 0) {
            res.status(404).json({ message: 'ペットが見つかりません' })
            return
        }

        // 5. カテゴリーフィルタリング（pet_typeで絞り込み）
        if (category && category !== '全て') {
            pets = pets.filter((pet) => pet.pet_type === category)
        }

        // 6. 各ペットのパラメータを計算して追加
        const petsWithParams = await Promise.all(
            pets.map(async (pet) => {
                // メインペットかどうかを判定
                const isMainPet = pet.user_main_pet
                const params = await petModel.calculatePetParams(user_id, new Date(pet.purchase_time), isMainPet)
                return {
                    ...pet,
                    params,
                }
            })
        )

        // 7. ソート処理
        if (sort === '入手順') {
            petsWithParams.sort((a, b) => new Date(a.purchase_time).getTime() - new Date(b.purchase_time).getTime())
        } else if (sort === '親密度順') {
            petsWithParams.sort((a, b) => b.params.intimacy - a.params.intimacy)
        } else if (sort === '健康度順') {
            petsWithParams.sort((a, b) => b.params.health - a.params.health)
        }

        // 8. ペット情報を200で返す
        res.status(200).json(petsWithParams)
    } catch (err) {
        // 9. 予期せぬエラーは500で返す
        console.error('ユーザーペット情報取得エラー:', err)
        res.status(500).json({ message: 'ユーザーペット情報取得エラー' })
    }
}

/**
 * ユーザーの主ペットを更新するコントローラー
 * PUT /users/pets/:item_id/main
 */
export const updateUserMainPet = async (req: Request, res: Response): Promise<void> => {
    // JWT認証ミドルウェアでセットされたuser_idを取得
    const user_id = (req.user as { user_id?: string })?.user_id
    const item_id = req.params.pet_id // ルーターでpet_idパラメータを使用
    const { user_main_pet } = req.body

    // 必須項目チェック
    if (!user_id || !item_id || typeof user_main_pet !== 'boolean') {
        res.status(400).json({ message: 'リクエストが不正です' })
        return
    }

    try {
        // 主ペットを更新
        const result = await petModel.updateUserMainPet(user_id, item_id, user_main_pet)

        if (!result) {
            res.status(404).json({ message: 'ペットが見つかりません' })
            return
        }

        // 更新後のペット情報とパラメータを取得
        const [updatedPetRows] = (await db.query(
            `
            SELECT 
                p.item_id,
                p.pet_name,
                p.pet_image_folder,
                p.pet_type,
                up.user_pet_name,
                up.user_main_pet,
                up.user_sub_pet,
                up.pet_size,
                up.pet_states,
                pur.purchase_time
            FROM USERS_PETS up
            JOIN PETS p ON up.item_id = p.item_id
            JOIN PURCHASES pur ON up.user_id = pur.user_id AND up.item_id = pur.item_id
            WHERE up.user_id = ? AND up.item_id = ?
        `,
            [user_id, item_id]
        )) as [unknown[], unknown]

        if (Array.isArray(updatedPetRows) && updatedPetRows.length > 0) {
            const updatedPet = updatedPetRows[0] as {
                purchase_time: Date
                user_main_pet: boolean
                [key: string]: unknown
            }
            const params = await petModel.calculatePetParams(
                user_id,
                new Date(updatedPet.purchase_time),
                updatedPet.user_main_pet
            )

            res.status(200).json({
                message: '主ペットを更新しました。',
                pet: {
                    ...updatedPet,
                    params,
                },
            })
        } else {
            res.status(200).json({ message: '主ペットを更新しました。' })
        }
    } catch (err) {
        console.error('ユーザーペット情報更新エラー:', err)
        res.status(500).json({ message: 'ユーザーペット情報更新エラー' })
    }
}

/**
 * ユーザーのサブペットを更新するコントローラー
 * PUT /users/pets/:item_id/sub
 */
export const updateUserSubPet = async (req: Request, res: Response): Promise<void> => {
    // JWT認証ミドルウェアでセットされたuser_idを取得
    const user_id = (req.user as { user_id?: string })?.user_id
    const item_id = req.params.pet_id // ルーターでpet_idパラメータを使用
    const { user_sub_pet } = req.body

    // 必須項目チェック
    if (!user_id || !item_id || typeof user_sub_pet !== 'boolean') {
        res.status(400).json({ message: 'リクエストが不正です' })
        return
    }

    try {
        // サブペットを更新
        const result = await petModel.updateUserSubPet(user_id, item_id, user_sub_pet)

        if (!result) {
            res.status(404).json({ message: 'ペットが見つかりません' })
            return
        }

        // 更新後のペット情報とパラメータを取得
        const [updatedPetRows] = (await db.query(
            `
            SELECT 
                p.item_id,
                p.pet_name,
                p.pet_image_folder,
                p.pet_type,
                up.user_pet_name,
                up.user_main_pet,
                up.user_sub_pet,
                up.pet_size,
                up.pet_states,
                pur.purchase_time
            FROM USERS_PETS up
            JOIN PETS p ON up.item_id = p.item_id
            JOIN PURCHASES pur ON up.user_id = pur.user_id AND up.item_id = pur.item_id
            WHERE up.user_id = ? AND up.item_id = ?
        `,
            [user_id, item_id]
        )) as [unknown[], unknown]

        if (Array.isArray(updatedPetRows) && updatedPetRows.length > 0) {
            const updatedPet = updatedPetRows[0] as {
                purchase_time: Date
                user_main_pet: boolean
                [key: string]: unknown
            }
            const params = await petModel.calculatePetParams(
                user_id,
                new Date(updatedPet.purchase_time),
                updatedPet.user_main_pet
            )

            res.status(200).json({
                message: 'サブペットを更新しました。',
                pet: {
                    ...updatedPet,
                    params,
                },
            })
        } else {
            res.status(200).json({ message: 'サブペットを更新しました。' })
        }
    } catch (err) {
        console.error('ユーザーペット情報更新エラー:', err)
        res.status(500).json({ message: 'ユーザーペット情報更新エラー' })
    }
}

/**
 * 管理者によるペット新規登録コントローラー
 * POST /admin/pets
 */
export const registerPet = async (req: Request, res: Response): Promise<void> => {
    const { pet_id, pet_name, pet_image_folder, pet_type } = req.body

    // 必須項目チェック
    if (!pet_id || !pet_name || !pet_image_folder || !pet_type) {
        res.status(400).json({ message: 'リクエストが不正です' })
        return
    }

    try {
        // すでに同じpet_idが存在するか確認
        const exists = await petModel.getPetById(pet_id)
        if (exists) {
            res.status(400).json({ message: 'このペットは既に登録されています' })
            return
        }

        // ペット情報を登録
        await petModel.createPet(pet_id, pet_name, pet_image_folder, pet_type)

        res.status(201).json({ message: 'ペット情報を登録しました。' })
    } catch (err) {
        console.error('ペット情報登録エラー:', err)
        res.status(500).json({ message: 'ペット情報登録エラー' })
    }
}

/**
 * 管理者によるペット削除コントローラー
 * DELETE /admin/pets/:pet_id
 */
export const deletePet = async (req: Request, res: Response): Promise<void> => {
    const pet_id = req.params.pet_id

    // 必須項目チェック
    if (!pet_id) {
        res.status(400).json({ error: 'リクエストが不正です' })
        return
    }

    try {
        // 指定されたペットが存在するか確認
        const pet = await petModel.getPetById(pet_id)
        if (!pet) {
            res.status(404).json({ error: '指定されたペットが見つかりません。' })
            return
        }

        // ペットを削除
        await petModel.deletePetById(pet_id)

        res.status(200).json({ message: 'ペットを削除しました。' })
    } catch (err) {
        console.error('ペット削除エラー:', err)
        res.status(403).json({ error: 'ペット削除権限がありません。' })
    }
}

/**
 * プロフィール用のユーザー情報とペット情報を取得するコントローラー
 * GET /users/profile
 */
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
    const user_id = (req.user as { user_id?: string })?.user_id

    if (!user_id) {
        res.status(401).json({ message: '認証情報が無効です' })
        return
    }

    try {
        // ユーザーの基本情報を取得
        const [userRows] = (await db.query('SELECT user_name, user_icon, point FROM USERS WHERE user_id = ?', [
            user_id,
        ])) as [unknown[], unknown]

        if (!Array.isArray(userRows) || userRows.length === 0) {
            res.status(404).json({ message: 'ユーザーが見つかりません' })
            return
        }

        const userInfo = userRows[0] as { user_name: string; user_icon: string; point: number }

        // 今週のコントリビューション情報を取得
        const [contribRows] = (await db.query(
            `
            SELECT day, count 
            FROM CONTRIBUTIONS 
            WHERE user_id = ? 
            AND day >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
            AND day < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
            ORDER BY day
        `,
            [user_id]
        )) as [unknown[], unknown]

        // 今日の歩数データを取得
        const [todayStepsRows] = (await db.query(
            `
            SELECT SUM(steps) as total_steps 
            FROM EXERCISE_DATE 
            WHERE user_id = ? AND DATE(timestamp) = CURDATE()
        `,
            [user_id]
        )) as [unknown[], unknown]

        const todaySteps =
            Array.isArray(todayStepsRows) && todayStepsRows.length > 0 && todayStepsRows[0] ?
                (todayStepsRows[0] as { total_steps: number }).total_steps || 0
            :   0

        // 過去7日間の歩数データを取得
        const [weeklyStepsRows] = (await db.query(
            `
            SELECT DATE(timestamp) as date, SUM(steps) as daily_steps
            FROM EXERCISE_DATE 
            WHERE user_id = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(timestamp)
            ORDER BY date
        `,
            [user_id]
        )) as [unknown[], unknown]

        // メインペット情報を取得
        const [mainPetRows] = (await db.query(
            `
            SELECT 
                p.item_id,
                p.pet_name,
                p.pet_image_folder,
                p.pet_type,
                up.user_pet_name,
                up.pet_size,
                up.pet_states,
                pur.purchase_time
            FROM USERS_PETS up
            JOIN PETS p ON up.item_id = p.item_id
            JOIN PURCHASES pur ON up.user_id = pur.user_id AND up.item_id = pur.item_id
            WHERE up.user_id = ? AND up.user_main_pet = true
            LIMIT 1
        `,
            [user_id]
        )) as [unknown[], unknown]

        let mainPetWithParams = null
        if (Array.isArray(mainPetRows) && mainPetRows.length > 0) {
            const mainPet = mainPetRows[0] as { purchase_time: Date; [key: string]: unknown }
            // メインペットなのでisMainPet = trueを指定
            const params = await petModel.calculatePetParams(user_id, new Date(mainPet.purchase_time), true)
            mainPetWithParams = {
                ...mainPet,
                params,
            }
        }

        // レスポンスを返す
        res.status(200).json({
            user: {
                user_name: userInfo.user_name,
                user_icon: userInfo.user_icon,
                point: userInfo.point,
            },
            weekly_contributions: Array.isArray(contribRows) ? contribRows : [],
            exercise_data: {
                today_steps: todaySteps,
                weekly_steps: Array.isArray(weeklyStepsRows) ? weeklyStepsRows : [],
            },
            main_pet: mainPetWithParams,
        })
    } catch (err) {
        console.error('プロフィール情報取得エラー:', err)
        res.status(500).json({ message: 'プロフィール情報取得エラー' })
    }
}

/**
 * 管理者によるペットサイズの基準更新コントローラー
 * PUT /admin/standards/pet_size
 */
export const updatePetSizeStandard = async (req: Request, res: Response): Promise<void> => {
    const { pet_size } = req.body

    // 必須項目チェック
    if (!pet_size || typeof pet_size !== 'number') {
        res.status(400).json({ message: 'リクエストが不正です' })
        return
    }

    try {
        // THRESHOLD テーブルが存在するかチェック
        const threshold = await petModel.getThreshold()
        if (!threshold) {
            res.status(404).json({ message: 'ペットサイズが何も入ってません' })
            return
        }

        // ペットサイズ基準を更新
        await petModel.updatePetSizeThreshold(pet_size)

        res.status(200).json({ message: 'ペットサイズの基準を更新しました。' })
    } catch (err) {
        console.error('ペットサイズ情報更新エラー:', err)
        res.status(500).json({ message: 'ペットサイズ情報更新エラー' })
    }
}

/**
 * 管理者によるペットの健康度基準更新コントローラー
 * PUT /admin/standards/pet_health
 */
export const updatePetHealthStandard = async (req: Request, res: Response): Promise<void> => {
    const { pet_health } = req.body

    // 必須項目チェック
    if (!pet_health || typeof pet_health !== 'number') {
        res.status(400).json({ message: 'リクエストが不正です' })
        return
    }

    try {
        // THRESHOLD テーブルが存在するかチェック
        const threshold = await petModel.getThreshold()
        if (!threshold) {
            res.status(404).json({ message: '歩数ごとのペットの健康が何も入ってません' })
            return
        }

        // ペット健康度基準を更新
        await petModel.updatePetHealthThreshold(pet_health)

        res.status(200).json({ message: '歩数ごとのペットの健康の基準を更新しました。' })
    } catch (err) {
        console.error('歩数ごとのペットの健康情報更新エラー:', err)
        res.status(500).json({ message: '歩数ごとのペットの健康情報更新エラー' })
    }
}
