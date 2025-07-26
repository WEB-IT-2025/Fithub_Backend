import { body, param, query } from 'express-validator'

// query を追加

export const validateMissionRegistration = [
    body('mission_id').notEmpty().withMessage('mission_idは必須です'),
    body('mission_name').notEmpty().withMessage('mission_nameは必須です'),
    body('mission_content').notEmpty().withMessage('mission_contentは必須です'),
    body('reward_content').isInt().withMessage('reward_contentは整数で指定してください'),
    body('mission_type').notEmpty().withMessage('mission_typeは必須です'),
]

export const validateMissionIdParam = [param('mission_id').notEmpty().withMessage('mission_idは必須です')]

// 新しくクエリパラメータ用のバリデーションを作成
export const validateMissionIdQuery = [query('mission_id').notEmpty().withMessage('mission_idは必須です')]

export const validateClearMissionBody = [
    body('user_id').notEmpty().withMessage('user_idは必須です'),
    body('mission_id').notEmpty().withMessage('mission_idは必須です'),
]
export const validateRevertMissionBody = [
    body('user_id').notEmpty().withMessage('user_idは必須です'),
    body('mission_id').notEmpty().withMessage('mission_idは必須です'),
]
// check-status用バリデーション
export const validateCheckStatusQuery = [
    query('user_id').notEmpty().withMessage('user_idは必須です'),
    query('mission_id').notEmpty().withMessage('mission_idは必須です'),
]

// check-progress用バリデーション
export const validateCheckProgressBody = [
    body('user_id').notEmpty().withMessage('user_idは必須です'),
    body('mission_id').notEmpty().withMessage('mission_idは必須です'),
]

// check-all-progress用バリデーション
export const validateCheckAllProgressBody = [body('user_id').notEmpty().withMessage('user_idは必須です')]
