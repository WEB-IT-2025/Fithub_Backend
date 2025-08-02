// src/middlewares/groupValidations.ts
import { NextFunction, Request, Response } from 'express'
import { body } from 'express-validator'
import { validationResult } from 'express-validator'

export const validateGroupCreation = [
    body('group_name')
        .notEmpty()
        .withMessage('group_nameは必須です')
        .isLength({ min: 1, max: 20 })
        .withMessage('group_nameは1-20文字で入力してください'),

    body('max_person').isInt({ min: 1 }).withMessage('max_personは1以上の整数で指定してください'),

    body('back_image')
        .notEmpty()
        .withMessage('back_imageは必須です')
        .isURL()
        .withMessage('back_imageは有効なURLで指定してください'),

    body('group_public').optional().isBoolean().withMessage('group_publicはtrueまたはfalseで指定してください'),
]

// グループ更新用バリデーション（グループリーダー権限チェック追加）
export const validateGroupUpdate = [
    body('group_id').notEmpty().withMessage('group_idは必須です'),
    body('user_id').notEmpty().withMessage('user_idは必須です（権限確認のため）'),
    body('group_name')
        .optional()
        .notEmpty()
        .withMessage('group_nameは空にできません')
        .isLength({ min: 1, max: 20 })
        .withMessage('group_nameは1-20文字で入力してください'),
    body('max_person') //
        .optional()
        .isInt({ min: 1 })
        .withMessage('max_personは1以上の整数で指定してください'),
    body('back_image').optional().isURL().withMessage('back_imageは有効なURLで指定してください'),
]

// グループ削除用バリデーション（グループリーダー権限チェック追加）
export const validateGroupDelete = [
    body('group_id').notEmpty().withMessage('group_idは必須です'),
    body('user_id')
        .optional() // admin削除時は不要
        .notEmpty()
        .withMessage('user_idは必須です（権限確認のため）'),
]

// メンバー操作用バリデーション（新規追加）
export const validateMemberOperation = [
    body('group_id').notEmpty().withMessage('group_idは必須です'),
    body('user_id').notEmpty().withMessage('user_idは必須です'),
    body('requester_id')
        .optional() // 一部の操作では不要
        .notEmpty()
        .withMessage('requester_idは必須です'),
]

// メンバー退出用バリデーション（新規追加）
export const validateLeaveGroup = [
    body('group_id').notEmpty().withMessage('group_idは必須です'),
    body('user_id').notEmpty().withMessage('user_idは必須です'),
]

// バリデーションエラー処理
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        res.status(400).json({
            // ✅ 修正: returnを削除
            error: 'バリデーションエラー',
            details: errors.array(),
        })
        return // ✅ 修正: returnを追加してvoidを返す
    }
    next()
}
