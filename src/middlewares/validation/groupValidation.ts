import { body, param } from 'express-validator'

// グループ作成用バリデーション
export const validateGroupCreation = [
    body('user_id').notEmpty().withMessage('user_idは必須です'),
    body('group_name').notEmpty().withMessage('group_nameは必須です'),
    body('max_in_person').isInt({ min: 1 }).withMessage('max_in_personは1以上の整数で指定してください'),
    body('back_image').isURL().withMessage('back_imageは有効なURLで指定してください'),
]

// グループ更新用バリデーション
export const validateGroupUpdate = [
    param('group_id').notEmpty().withMessage('group_idは必須です'),
    body('group_name').optional().notEmpty().withMessage('group_nameは空にできません'),
    body('max_in_person').optional().isInt({ min: 1 }).withMessage('max_in_personは1以上の整数で指定してください'),
    body('back_image').optional().isURL().withMessage('back_imageは有効なURLで指定してください'),
]

// グループ削除用バリデーション
export const validateGroupDelete = [param('group_id').notEmpty().withMessage('group_idは必須です')]
