import { Request, Response } from 'express'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { shopModel } from '~/models/shopModel'

// ショップアイテム一覧取得
export const getShopItems = asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.query
    const user = req.user as { user_id: string; user_name: string } | undefined
    const userId = user?.user_id

    let items
    if (userId) {
        // 認証ユーザーの場合：所有状況付きで取得
        if (category && typeof category === 'string') {
            items = await shopModel.getItemsByCategoryWithOwnership(category, userId)
        } else {
            items = await shopModel.getAllItemsWithOwnership(userId)
        }

        // is_ownedをownedに変換
        items = items.map((item) => ({
            ...item,
            owned: Boolean(item.is_owned),
            is_owned: undefined, // 元のフィールドを削除
        }))
    } else {
        // 非認証ユーザーの場合：通常の取得
        if (category && typeof category === 'string') {
            items = await shopModel.getItemsByCategory(category)
        } else {
            items = await shopModel.getAllItems()
        }
    }

    res.status(200).json({
        success: true,
        message: 'ショップアイテム取得成功',
        data: items,
    })
})

// 単一アイテム詳細取得
export const getShopItemDetail = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const itemId = id // string型のままで使用

    if (!itemId) {
        return res.status(400).json({
            success: false,
            message: '無効なアイテムIDです',
        })
    }

    const item = await shopModel.getItemById(itemId)

    if (!item) {
        return res.status(404).json({
            success: false,
            message: 'アイテムが見つかりません',
        })
    }

    res.status(200).json({
        success: true,
        message: 'アイテム詳細取得成功',
        data: item,
    })
})

// アイテム購入
export const purchaseItem = asyncHandler(async (req: Request, res: Response) => {
    const { item_id } = req.body // 仕様に合わせてitem_idに変更
    const user = req.user as { user_id: string; user_name: string } | undefined
    const userId = user?.user_id

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'ユーザー認証が必要です',
        })
    }

    if (!item_id) {
        return res.status(400).json({
            success: false,
            message: '無効なアイテムIDです',
        })
    }

    const result = await shopModel.purchaseItem(userId, item_id)

    if (result.success) {
        res.status(200).json({
            success: true,
            message: result.message,
        })
    } else {
        res.status(400).json({
            success: false,
            message: result.message,
        })
    }
})

// 購入履歴取得
export const getPurchaseHistory = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as { user_id: string; user_name: string } | undefined
    const userId = user?.user_id

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'ユーザー認証が必要です',
        })
    }

    const history = await shopModel.getPurchaseHistory(userId)

    res.status(200).json({
        success: true,
        message: '購入履歴取得成功',
        data: history,
    })
})

// ユーザーポイント取得
export const getUserPoint = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as { user_id: string; user_name: string } | undefined
    const userId = user?.user_id

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'ユーザー認証が必要です',
        })
    }

    const point = await shopModel.getUserPoint(userId)

    if (point === null) {
        return res.status(404).json({
            success: false,
            message: 'ユーザーが見つかりません',
        })
    }

    res.status(200).json({
        success: true,
        message: 'ポイント取得成功',
        data: {
            point: point,
        },
    })
})
