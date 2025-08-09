import { Request, Response } from 'express'

import { asyncHandler } from '../middlewares/asyncHandler'
import { petModel } from '../models/petModel'
import { UserPayload } from '../types/UserPayload'

// ユーザーのプロフィール情報取得（ペット情報含む）
export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as UserPayload)?.user_id

    if (!user_id) {
        return res.status(401).json({
            success: false,
            error: '認証が必要です',
        })
    }

    try {
        const profile = await petModel.getUserProfile(user_id)

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

// ユーザーのペット一覧取得（所有しているペット）
export const getUserPets = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as UserPayload)?.user_id

    if (!user_id) {
        return res.status(401).json({
            success: false,
            error: '認証が必要です',
        })
    }

    try {
        const pets = await petModel.getUserOwnedPets(user_id)

        res.status(200).json({
            success: true,
            data: pets,
        })
    } catch (error) {
        console.error('Error fetching user pets:', error)
        return res.status(500).json({
            success: false,
            error: 'ペット一覧の取得に失敗しました',
        })
    }
})

// 利用可能なペット一覧取得（購入可能なペット含む）
// 主ペット更新
export const updateUserMainPet = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as UserPayload)?.user_id
    const { pet_id, pet_name } = req.body

    if (!user_id) {
        return res.status(401).json({
            success: false,
            error: '認証が必要です',
        })
    }

    // 必須パラメータの検証
    if (!pet_id) {
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
        const petExists = userPets.some((pet: { item_id: string }) => pet.item_id === pet_id)

        if (!petExists) {
            return res.status(404).json({
                success: false,
                error: '指定されたペットを所有していません',
            })
        }

        const success = await petModel.updateUserMainPet(user_id, pet_id, pet_name.trim())

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

// サブペット更新
export const updateUserSubPet = asyncHandler(async (req: Request, res: Response) => {
    const user_id = (req.user as UserPayload)?.user_id
    const { pet_id, pet_name } = req.body

    if (!user_id) {
        return res.status(401).json({
            success: false,
            error: '認証が必要です',
        })
    }

    // 必須パラメータの検証
    if (!pet_id) {
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
        const petExists = userPets.some((pet: { item_id: string }) => pet.item_id === pet_id)

        if (!petExists) {
            return res.status(404).json({
                success: false,
                error: '指定されたペットを所有していません',
            })
        }

        const success = await petModel.updateUserSubPet(user_id, pet_id, pet_name.trim())

        if (success) {
            res.status(200).json({
                success: true,
                message: 'サブペットを更新しました',
            })
        } else {
            res.status(400).json({
                success: false,
                error: 'サブペットの更新に失敗しました',
            })
        }
    } catch (error) {
        console.error('Error updating sub pet:', error)
        return res.status(500).json({
            success: false,
            error: 'サブペットの更新中にエラーが発生しました',
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
        const success = await petModel.updatePetSizeStandard({
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
        const success = await petModel.updatePetHealthStandard({
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
