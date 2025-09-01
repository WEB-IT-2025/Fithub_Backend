import { Request, Response } from 'express'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { petModel } from '~/models/petModel'
import { thresholdModel } from '~/models/thresholdModel'
import { petGrowthService } from '~/services/petGrowthService'
import { UserPayload } from '~/types/UserPayload'

// ユーザープロフィール取得（メインペット情報）- 認証不要
export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params

    // パスパラメーターの検証
    if (!userId) {
        return res.status(400).json({
            success: false,
            error: 'ユーザーIDが必要です',
        })
    }

    try {
        // ペット成長データを最新に更新
        await petGrowthService.updatePetGrowthForUser(userId)

        // 最新のプロフィール情報を取得
        const profile = await petModel.getUserProfile(userId)

        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'ユーザープロフィールが見つかりません',
            })
        }

        res.status(200).json({
            success: true,
            data: profile,
        })
    } catch (error) {
        console.error('Error fetching user profile:', error)
        return res.status(500).json({
            success: false,
            error: 'プロフィール情報の取得に失敗しました',
        })
    }
})

// ユーザーの名前のみ取得
export const getUserName = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as UserPayload)?.user_id

    if (!user_id) {
        return res.status(401).json({
            success: false,
            error: '認証が必要です',
        })
    }

    try {
        // ユーザー名のみを取得
        const userName = await petModel.getUserName(user_id)

        if (!userName) {
            return res.status(404).json({
                success: false,
                error: 'ユーザーが見つかりません',
            })
        }

        res.status(200).json({
            success: true,
            data: {
                user_id,
                user_name: userName,
            },
        })
    } catch (error) {
        console.error('Error fetching user name:', error)
        return res.status(500).json({
            success: false,
            error: 'ユーザー名の取得に失敗しました',
        })
    }
})

// ユーザーのペット一覧取得（所有しているペット）
// 最新の成長データで自動更新されたペット情報を返す
export const getUserPets = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as UserPayload)?.user_id

    if (!user_id) {
        return res.status(401).json({
            success: false,
            error: '認証が必要です',
        })
    }

    try {
        // ペット成長データを最新に更新
        await petGrowthService.updatePetGrowthForUser(user_id)

        // 最新のペット一覧を取得
        const pets = await petModel.getUserOwnedPets(user_id)

        res.status(200).json({
            success: true,
            data: {
                pets: pets,
            },
        })
    } catch (error) {
        console.error('Error fetching user pets:', error)
        return res.status(500).json({
            success: false,
            error: 'ペット情報の取得に失敗しました',
        })
    }
})

// 利用可能なペット一覧取得（購入可能なペット含む）
// 主ペット更新
export const updateUserMainPet = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as UserPayload)?.user_id
    const { item_id, pet_name } = req.body

    // デバッグ用ログ
    console.log('Request body:', req.body)
    console.log('pet_name:', pet_name, 'type:', typeof pet_name)

    if (!user_id) {
        return res.status(401).json({
            success: false,
            error: '認証が必要です',
        })
    }

    // 必須パラメータの検証
    if (!item_id) {
        return res.status(400).json({
            success: false,
            error: 'ペットIDは必須です',
        })
    }

    if (!pet_name || typeof pet_name !== 'string' || pet_name.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'ペット名は必須です',
        })
    }

    try {
        // ユーザーが所有しているペットの存在確認
        const userPets = await petModel.getUserOwnedPets(user_id)
        const petExists = userPets.some((pet: { item_id: string }) => pet.item_id === item_id)

        if (!petExists) {
            return res.status(404).json({
                success: false,
                error: '指定されたペットを所有していません',
            })
        }

        const success = await petModel.updateUserMainPet(user_id, item_id, pet_name.trim())

        if (success) {
            res.status(200).json({
                success: true,
                message: '主ペットを更新しました',
            })
        } else {
            res.status(400).json({
                success: false,
                error: '主ペットの更新に失敗しました',
            })
        }
    } catch (error) {
        console.error('Error updating main pet:', error)
        return res.status(500).json({
            success: false,
            error: '主ペットの更新中にエラーが発生しました',
        })
    }
})

// ペットサイズ基準更新（管理者）
export const updatePetSizeStandard = asyncHandler(async (req: Request, res: Response) => {
    const { pet_size_logic } = req.body

    // 必須パラメータの検証
    if (pet_size_logic === undefined || pet_size_logic === null) {
        return res.status(400).json({
            success: false,
            error: 'ペットサイズ基準値は必須です',
        })
    }

    // 数値型の検証
    const sizeLogic = Number(pet_size_logic)

    if (isNaN(sizeLogic) || sizeLogic < 0) {
        return res.status(400).json({
            success: false,
            error: 'ペットサイズ基準値は0以上の数値である必要があります',
        })
    }

    try {
        const success = await thresholdModel.updatePetSizeStandard({
            pet_size_logic: sizeLogic,
        })

        if (success) {
            res.status(200).json({
                success: true,
                message: 'ペットサイズ基準を更新しました',
            })
        } else {
            res.status(400).json({
                success: false,
                error: 'ペットサイズ基準の更新に失敗しました',
            })
        }
    } catch (error) {
        console.error('Error updating pet size standard:', error)
        return res.status(500).json({
            success: false,
            error: 'ペットサイズ基準の更新中にエラーが発生しました',
        })
    }
})

// ペット健康度基準更新（管理者）
export const updatePetHealthStandard = asyncHandler(async (req: Request, res: Response) => {
    const { pet_health_logic } = req.body

    // 必須パラメータの検証
    if (pet_health_logic === undefined || pet_health_logic === null) {
        return res.status(400).json({
            success: false,
            error: 'ペット健康度基準値は必須です',
        })
    }

    // 数値型の検証
    const healthLogic = Number(pet_health_logic)

    if (isNaN(healthLogic) || healthLogic < 0) {
        return res.status(400).json({
            success: false,
            error: 'ペット健康度基準値は0以上の数値である必要があります',
        })
    }

    try {
        const success = await thresholdModel.updatePetHealthStandard({
            pet_health_logic: healthLogic,
        })

        if (success) {
            res.status(200).json({
                success: true,
                message: 'ペット健康度基準を更新しました',
            })
        } else {
            res.status(400).json({
                success: false,
                error: 'ペット健康度基準の更新に失敗しました',
            })
        }
    } catch (error) {
        console.error('Error updating pet health standard:', error)
        return res.status(500).json({
            success: false,
            error: 'ペット健康度基準の更新中にエラーが発生しました',
        })
    }
})

// ペット成長データ更新（ユーザー）
export const updatePetGrowth = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as UserPayload)?.user_id

    if (!user_id) {
        return res.status(401).json({
            success: false,
            error: '認証が必要です',
        })
    }

    try {
        const success = await petGrowthService.updatePetGrowthForUser(user_id)

        if (success) {
            // 更新後のペットデータを取得
            const userPets = await petModel.getUserOwnedPets(user_id)

            res.status(200).json({
                success: true,
                message: 'ペット成長データを更新しました',
                data: {
                    pets: userPets,
                },
            })
        } else {
            res.status(400).json({
                success: false,
                error: 'ペット成長データの更新に失敗しました',
            })
        }
    } catch (error) {
        console.error('Error updating pet growth:', error)
        return res.status(500).json({
            success: false,
            error: 'ペット成長データの更新中にエラーが発生しました',
        })
    }
})

// 全ユーザーのペット成長データ更新（管理者）
export const updateAllPetGrowth = asyncHandler(async (req: Request, res: Response) => {
    try {
        await petGrowthService.updateAllUsersPetGrowth()

        res.status(200).json({
            success: true,
            message: '全ユーザーのペット成長データを更新しました',
        })
    } catch (error) {
        console.error('Error updating all pet growth:', error)
        return res.status(500).json({
            success: false,
            error: '全ユーザーのペット成長データ更新中にエラーが発生しました',
        })
    }
})

// 親密度アイテム使用（特定ペットの親密度向上）
export const useIntimacyItem = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as UserPayload)?.user_id
    const { item_id, pet_item_id } = req.body

    if (!user_id) {
        return res.status(401).json({
            success: false,
            error: '認証が必要です',
        })
    }

    if (!item_id || !pet_item_id) {
        return res.status(400).json({
            success: false,
            error: 'アイテムIDとペットIDは必須です',
        })
    }

    try {
        // アイテムの使用処理（USERS_ITEMSのitem_countを減らし、usage_intimacyをTRUEに）
        // 実際の実装では、アイテム使用ロジックを実装する必要があります
        // ここでは簡略化して、直接親密度を再計算

        // ペット成長データを更新（親密度が再計算される）
        const success = await petGrowthService.updatePetGrowthForUser(user_id)

        if (success) {
            // 更新後のペット情報を取得
            const updatedProfile = await petModel.getUserProfile(user_id)

            res.status(200).json({
                success: true,
                message: 'アイテムを使用しました',
                data: updatedProfile,
            })
        } else {
            res.status(500).json({
                success: false,
                error: 'アイテム使用処理に失敗しました',
            })
        }
    } catch (error) {
        console.error('Error using intimacy item:', error)
        return res.status(500).json({
            success: false,
            error: 'アイテム使用中にエラーが発生しました',
        })
    }
})
