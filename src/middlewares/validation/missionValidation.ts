import { body, param } from 'express-validator'

export const validateMissionRegistration = [
    param('mission_id').notEmpty().withMessage('mission_idは必須です'),
    body('mission_name').notEmpty().withMessage('mission_nameは必須です'),
    body('mission_content').notEmpty().withMessage('mission_contentは必須です'),
    body('reward_content').isInt({ min: 0 }).withMessage('reward_contentは数値である必要があります'),
    body('mission_type').notEmpty().withMessage('mission_typeは必須です'),
]

export const validateMissionIdParam = [param('mission_id').notEmpty().withMessage('mission_idは必須です')]
