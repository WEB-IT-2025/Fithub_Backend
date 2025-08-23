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
        .optional()
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('back_imageは1-100文字の文字列で指定してください')
        .matches(/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|gif|webp)$/i)
        .withMessage('back_imageは有効な画像ファイル名（.jpg, .png, .gif, .webp）で指定してください'),

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
    body('back_image')
        .optional()
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('back_imageは1-100文字の文字列で指定してください')
        .matches(/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|gif|webp)$/i)
        .withMessage('back_imageは有効な画像ファイル名（.jpg, .png, .gif, .webp）で指定してください'),
]

// グループ削除用バリデーション（グループリーダー権限チェック追加）
export const validateGroupDelete = [
    body('group_id').notEmpty().withMessage('group_idは必須です'),
    body('user_id')
        .optional() // admin削除時は不要
        .notEmpty()
        .withMessage('user_idは必須です（権限確認のため）'),
]

// メンバー操作用バリデーション（自己参加方式）
export const validateMemberOperation = [
    body('group_id').notEmpty().withMessage('group_idは必須です'),
    // user_idはJWTから取得するため不要
]

// 招待操作用バリデーション（グループリーダー限定）
export const validateInviteOperation = [
    body('group_id').notEmpty().withMessage('group_idは必須です'),
    body('user_id').notEmpty().withMessage('招待するuser_idは必須です'),
]

// 招待コード生成用バリデーション
export const validateInviteCodeGeneration = [body('group_id').notEmpty().withMessage('group_idは必須です')]

// 招待コード参加用バリデーション
export const validateInviteCodeJoin = [
    body('invite_code')
        .notEmpty()
        .withMessage('invite_codeは必須です')
        .isLength({ min: 8, max: 8 })
        .withMessage('招待コードは8文字です')
        .matches(/^[A-Z0-9]+$/)
        .withMessage('招待コードは英数字のみです'),
]

// メンバー退出用バリデーション（新規追加）
export const validateLeaveGroup = [body('group_id').notEmpty().withMessage('group_idは必須です')]

// 自己退会用バリデーション
export const validateSelfLeave = [body('group_id').notEmpty().withMessage('group_idは必須です')]

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
