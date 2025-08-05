// src/controllers/shopController.ts
import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { JwtPayload } from 'jsonwebtoken'
import { GENERAL_MESSAGES } from '~/constants/messages'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { ShopItemInput, shopModel } from '~/models/shopModel'

interface UserJwtPayload extends JwtPayload {
    user_id: string
    user_name: string
}

// GET /api/shop/items - ショップアイテム一覧取得（購入済み情報付き）
export const getShopItems = asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.query

    // ユーザー認証情報を取得（オプション）
    let userId: string | undefined
    if (req.user && typeof req.user !== 'string') {
        userId = (req.user as UserJwtPayload).user_id
    }

    try {
        const items = await shopModel.getAllItems(category as string, userId)

        if (items.length === 0) {
            return res.status(400).json({
                success: false,
                message: '内容が見つかりません',
            })
        }

        res.status(200).json(items)
    } catch (error) {
        console.error('❌ [SHOP] Error fetching shop items:', error)
        res.status(500).json({
            success: false,
            message: GENERAL_MESSAGES.INTERNAL_ERROR,
        })
    }
})

// GET /api/shop/items/:item_id - ショップアイテム詳細取得
export const getShopItemById = asyncHandler(async (req: Request, res: Response) => {
    // バリデーションエラーチェック
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: '入力データが無効です',
            errors: errors.array(),
        })
    }

    const { item_id } = req.params

    try {
        const item = await shopModel.getItemById(item_id)

        if (!item) {
            return res.status(400).json({
                success: false,
                message: '内容が見つかりません',
            })
        }

        res.status(200).json([item])
    } catch (error) {
        console.error('❌ [SHOP] Error fetching shop item:', error)
        res.status(500).json({
            success: false,
            message: GENERAL_MESSAGES.INTERNAL_ERROR,
        })
    }
})

// POST /api/admin/shop/items - ショップアイテム登録（管理者用）
export const createShopItem = asyncHandler(async (req: Request, res: Response) => {
    // バリデーションエラーチェック
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: '入力データが無効です',
            errors: errors.array(),
        })
    }

    const itemData: ShopItemInput = req.body

    try {
        const createdItem = await shopModel.createItem(itemData)

        res.status(201).json({
            status: 201,
            message: 'アイテムが登録されました',
            data: createdItem,
        })
    } catch (error) {
        console.error('❌ [SHOP] Error creating shop item:', error)

        if (error instanceof Error && error.message.includes('Duplicate entry')) {
            return res.status(400).json({
                success: false,
                message: '既に存在するアイテムIDです。',
            })
        }

        res.status(500).json({
            success: false,
            message: GENERAL_MESSAGES.INTERNAL_ERROR,
        })
    }
})

// PUT /api/shop/purchase - アイテム購入
export const purchaseItem = asyncHandler(async (req: Request, res: Response) => {
    // バリデーションエラーチェック
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: '入力データが無効です',
            errors: errors.array(),
        })
    }

    const { item_id } = req.body

    // ユーザー認証確認 - 認証ミドルウェアで設定されたuser情報を取得
    if (!req.user || typeof req.user === 'string') {
        return res.status(401).json({
            success: false,
            message: 'ログインが必要です',
        })
    }

    const userId = (req.user as UserJwtPayload).user_id

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'ユーザー情報が見つかりません',
        })
    }

    try {
        await shopModel.purchaseItem(item_id, userId)

        // 購入後のアイテム情報を取得
        const item = await shopModel.getItemById(item_id)

        res.status(200).json({
            status: 200,
            message: '販売数を更新しました',
            data: {
                item_id: item_id,
                item_image_folder: item?.item_image_folder,
            },
        })
    } catch (error) {
        console.error('❌ [SHOP] Error purchasing item:', error)

        if (error instanceof Error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            })
        }

        res.status(500).json({
            success: false,
            message: GENERAL_MESSAGES.INTERNAL_ERROR,
        })
    }
})

// DELETE /api/admin/shop/:item_id - ショップアイテム削除（管理者用）
export const deleteShopItem = asyncHandler(async (req: Request, res: Response) => {
    // バリデーションエラーチェック
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: '入力データが無効です',
            errors: errors.array(),
        })
    }

    const { item_id } = req.params

    try {
        const deleted = await shopModel.deleteItem(item_id)

        if (!deleted) {
            return res.status(400).json({
                error: 'アイテムが見つかりません。',
            })
        }

        res.status(200).json({
            message: 'アイテムを削除しました。',
        })
    } catch (error) {
        console.error('❌ [SHOP] Error deleting shop item:', error)
        res.status(500).json({
            success: false,
            message: GENERAL_MESSAGES.INTERNAL_ERROR,
        })
    }
})

// GET /api/shop/categories - ペットカテゴリ一覧取得
export const getPetCategories = asyncHandler(async (req: Request, res: Response) => {
    try {
        const categories = await shopModel.getPetCategories()

        res.status(200).json({
            success: true,
            data: categories,
        })
    } catch (error) {
        console.error('❌ [SHOP] Error fetching pet categories:', error)
        res.status(500).json({
            success: false,
            message: GENERAL_MESSAGES.INTERNAL_ERROR,
        })
    }
})
