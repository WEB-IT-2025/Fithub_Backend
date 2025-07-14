// src/middlewares/validators.ts
import { NextFunction, Request, Response } from 'express'
import { body } from 'express-validator'
import { validationResult } from 'express-validator'

// グループ作成用バリデーション
export const validateGroupCreation = [
    body('user_id').notEmpty().withMessage('user_idは必須です'),
    body('group_name').notEmpty().withMessage('group_nameは必須です'),
    body('max_in_person').isInt({ min: 1 }).withMessage('max_in_personは1以上の整数で指定してください'),
    body('back_image').isURL().withMessage('back_imageは有効なURLで指定してください'),
    body('group_public').isBoolean().withMessage('group_publicはtrueまたはfalseで指定してください'),
]

// グループ更新用バリデーション
export const validateGroupUpdate = [
    body('group_id').notEmpty().withMessage('group_idは必須です'),
    body('group_name').optional().notEmpty().withMessage('group_nameは空にできません'),
    body('max_in_person').optional().isInt({ min: 1 }).withMessage('max_in_personは1以上の整数で指定してください'),
    body('back_image').optional().isURL().withMessage('back_imageは有効なURLで指定してください'),
]

// グループ削除用バリデーション
export const validateGroupDelete = [body('group_id').notEmpty().withMessage('group_idは必須です')]

// Admin認証（仮）
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    next()
}

// バリデーションエラー処理
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }
    next()
}
