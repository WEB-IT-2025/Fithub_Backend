// ===== middlewares/validation/profileValidation.ts =====
import { NextFunction, Request, Response } from 'express'
import { body, query, validationResult } from 'express-validator'

export class ProfileValidation {
    // クエリパラメータでのユーザーID検証
    static getProfilesQuery = [
        query('user_id')
            .notEmpty()
            .withMessage('user_idが必要です')
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage('user_idの形式が不正です'),
    ]
    // middlewares/validation/profileValidation.ts
    static getPartnerProfileQuery = [
        query('requester_id').notEmpty().withMessage('requester_idが必要です'),
        query('target_user_id').notEmpty().withMessage('target_user_idが必要です'),
    ]

    // プロフィール更新用
    static updateProfileQuery = [
        query('user_id').notEmpty().withMessage('user_idが必要です'),
        body('user_name')
            .optional()
            .isLength({ min: 1, max: 128 })
            .withMessage('ユーザー名は1〜128文字である必要があります'),
        body('user_icon').optional().isURL().withMessage('アイコンURLの形式が不正です'),
        body('github_username')
            .optional()
            .matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/)
            .withMessage('GitHub名は有効な形式である必要があります'),
    ]

    // GitHub URL生成用
    static getGithubUrlQuery = [
        query('github_username')
            .notEmpty()
            .withMessage('github_usernameが必要です')
            .matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/)
            .withMessage('GitHub名は有効な形式である必要があります'),
    ]

    static handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                message: 'バリデーションエラー',
                errors: errors.array(),
            })
            return
        }
        next()
    }
}
