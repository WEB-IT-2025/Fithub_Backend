import { ValidationChain, body } from 'express-validator'

// 主ペット更新のバリデーション
export const updateMainPetValidation: ValidationChain[] = [
    body('pet_id')
        .notEmpty()
        .withMessage('ペットIDは必須です')
        .isString()
        .withMessage('ペットIDは文字列で入力してください'),

    body('pet_name')
        .notEmpty()
        .withMessage('ペット名は必須です')
        .isString()
        .withMessage('ペット名は文字列で入力してください')
        .isLength({ max: 100 })
        .withMessage('ペット名は100文字以内で入力してください'),
]

// サブペット更新のバリデーション
export const updateSubPetValidation: ValidationChain[] = [
    body('pet_id')
        .notEmpty()
        .withMessage('ペットIDは必須です')
        .isString()
        .withMessage('ペットIDは文字列で入力してください'),

    body('pet_name')
        .notEmpty()
        .withMessage('ペット名は必須です')
        .isString()
        .withMessage('ペット名は文字列で入力してください')
        .isLength({ max: 100 })
        .withMessage('ペット名は100文字以内で入力してください'),
]

// ペットサイズ基準更新のバリデーション（管理者）
export const updatePetSizeStandardValidation: ValidationChain[] = [
    body('pet_size_logic')
        .notEmpty()
        .withMessage('ペットサイズ基準値は必須です')
        .isNumeric()
        .withMessage('ペットサイズ基準値は数値で入力してください')
        .custom((value) => {
            const numValue = Number(value)
            if (numValue < 0) {
                throw new Error('ペットサイズ基準値は0以上である必要があります')
            }
            return true
        }),
]

// ペット健康度基準更新のバリデーション（管理者）
export const updatePetHealthStandardValidation: ValidationChain[] = [
    body('pet_health_logic')
        .notEmpty()
        .withMessage('ペット健康度基準値は必須です')
        .isNumeric()
        .withMessage('ペット健康度基準値は数値で入力してください')
        .custom((value) => {
            const numValue = Number(value)
            if (numValue < 0) {
                throw new Error('ペット健康度基準値は0以上である必要があります')
            }
            return true
        }),
]

// 削除予定：ペット登録のバリデーション（管理者）- Shop APIで処理
export const registerPetValidation: ValidationChain[] = [
    body('item_id')
        .notEmpty()
        .withMessage('アイテムIDは必須です')
        .isString()
        .withMessage('アイテムIDは文字列で入力してください')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('アイテムIDは英数字、アンダースコア、ハイフンのみ使用可能です')
        .isLength({ max: 64 })
        .withMessage('アイテムIDは64文字以内で入力してください'),

    body('pet_name')
        .notEmpty()
        .withMessage('ペット名は必須です')
        .isString()
        .withMessage('ペット名は文字列で入力してください')
        .isLength({ max: 20 })
        .withMessage('ペット名は20文字以内で入力してください'),

    body('pet_type')
        .notEmpty()
        .withMessage('ペットタイプは必須です')
        .isString()
        .withMessage('ペットタイプは文字列で入力してください')
        .isIn(['dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'other'])
        .withMessage('有効なペットタイプを選択してください'),

    body('pet_image_folder')
        .notEmpty()
        .withMessage('ペット画像フォルダは必須です')
        .isString()
        .withMessage('ペット画像フォルダは文字列で入力してください')
        .isLength({ max: 255 })
        .withMessage('ペット画像フォルダは255文字以内で入力してください'),

    body('item_point')
        .notEmpty()
        .withMessage('アイテムポイントは必須です')
        .isInt({ min: 0 })
        .withMessage('アイテムポイントは0以上の整数で入力してください'),
]

// ペット削除のバリデーション（管理者）
export const deletePetValidation: ValidationChain[] = [
    body('item_id')
        .notEmpty()
        .withMessage('アイテムIDは必須です')
        .isString()
        .withMessage('アイテムIDは文字列で入力してください')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('アイテムIDは英数字、アンダースコア、ハイフンのみ使用可能です'),
]
