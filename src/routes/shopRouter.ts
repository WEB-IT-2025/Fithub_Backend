import express from 'express'
import {
    getPurchaseHistory,
    getShopItemDetail,
    getShopItems,
    getUserPoint,
    purchaseItem,
} from '~/controllers/shopController'
import { optionalAuth } from '~/middlewares/optionalAuth'
import { handleValidationErrors } from '~/middlewares/validation'

const router = express.Router()

// === 一般ユーザー向けAPI ===

// ショップアイテム一覧取得（カテゴリフィルタ対応）
// GET /shop/items?category=supplement
router.get('/items', optionalAuth, getShopItems)

// 単一アイテム詳細取得
// GET /shop/items/:id
router.get('/items/:id', getShopItemDetail)

// アイテム購入（認証必要）
// POST /shop/purchases
router.post('/purchases', optionalAuth, handleValidationErrors, purchaseItem)

// 購入履歴取得（認証必要）
// GET /shop/history
router.get('/history', optionalAuth, handleValidationErrors, getPurchaseHistory)

// ユーザーポイント取得（認証必要）
// GET /shop/point
router.get('/point', optionalAuth, handleValidationErrors, getUserPoint)

export default router
