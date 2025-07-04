import { body, param } from 'express-validator'

export const validateMissionRegistration = [
    body('mission_id').notEmpty().withMessage('mission_idは必須です'),
    body('mission_name').notEmpty().withMessage('mission_nameは必須です'),
    body('mission_goal').notEmpty().withMessage('mission_goalは必須です'),
    body('reward_content').isInt().withMessage('reward_contentは整数で指定してください'),
    body('mission_type').notEmpty().withMessage('mission_typeは必須です'),
]

export const validateMissionIdParam = [param('mission_id').notEmpty().withMessage('mission_idは必須です')]
export const validateClearMissionBody = [
    body('user_id').notEmpty().withMessage('user_idは必須です'),
    body('mission_id').notEmpty().withMessage('mission_idは必須です'),
]
