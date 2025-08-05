// src/routes/shopRouter.ts
import { RequestHandler, Router } from 'express'
import {
    createShopItem,
    deleteShopItem,
    getPetCategories,
    getShopItemById,
    getShopItems,
    purchaseItem,
} from '~/controllers/shopController'
import { verifyToken } from '~/middlewares/authMiddleware'
import { validateCreateShopItem, validateItemId, validatePurchaseItem } from '~/middlewares/validation/shopValidation'

const shopRouter = Router()

// パブリックエンドポイント
shopRouter.get('/items', getShopItems) // GET /api/shop/items
shopRouter.get('/items/:item_id', validateItemId, getShopItemById) // GET /api/shop/items/:item_id
shopRouter.get('/categories', getPetCategories) // GET /api/shop/categories

// 認証が必要なエンドポイント
shopRouter.put('/purchase', verifyToken as RequestHandler, validatePurchaseItem, purchaseItem) // PUT /api/shop/purchase

// 管理者用エンドポイント（認証が必要）
shopRouter.post('/admin/items', verifyToken as RequestHandler, validateCreateShopItem, createShopItem) // POST /api/admin/shop/items
shopRouter.delete('/admin/:item_id', verifyToken as RequestHandler, validateItemId, deleteShopItem) // DELETE /api/admin/shop/:item_id

export default shopRouter
