// src/middlewares/validation/shopValidation.ts
import { body, param } from 'express-validator'

export const validateCreateShopItem = [
    body('item_id')
        .notEmpty()
        .withMessage('アイテムIDは必須です')
        .isLength({ max: 64 })
        .withMessage('アイテムIDは64文字以下である必要があります'),

    body('item_name')
        .notEmpty()
        .withMessage('アイテム名は必須です')
        .isLength({ max: 50 })
        .withMessage('アイテム名は50文字以下である必要があります'),

    body('item_point').isInt({ min: 1 }).withMessage('アイテムポイントは1以上の整数である必要があります'),

    body('item_image_folder')
        .notEmpty()
        .withMessage('画像フォルダパスは必須です')
        .isLength({ max: 255 })
        .withMessage('画像フォルダパスは255文字以下である必要があります'),

    body('item_create_day').isISO8601().withMessage('作成日は有効な日付形式である必要があります'),

    body('item_delete_day').isISO8601().withMessage('削除日は有効な日付形式である必要があります'),

    body('item_details')
        .notEmpty()
        .withMessage('アイテム詳細は必須です')
        .isLength({ max: 255 })
        .withMessage('アイテム詳細は255文字以下である必要があります'),

    body('item_category')
        .isIn(['pet', 'item'])
        .withMessage('アイテムカテゴリは "pet" または "item" である必要があります'),

    body('pet_type').optional().isLength({ max: 255 }).withMessage('ペットタイプは255文字以下である必要があります'),
]

export const validatePurchaseItem = [
    body('item_id')
        .notEmpty()
        .withMessage('アイテムIDは必須です')
        .isLength({ max: 64 })
        .withMessage('アイテムIDは64文字以下である必要があります'),
]

export const validateItemId = [
    param('item_id')
        .notEmpty()
        .withMessage('アイテムIDは必須です')
        .isLength({ max: 64 })
        .withMessage('アイテムIDは64文字以下である必要があります'),
]
