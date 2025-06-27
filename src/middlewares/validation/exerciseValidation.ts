// src/middlewares/validation/exerciseValidation.ts
import { body, query } from 'express-validator'

export const validateTimestampExerciseRecord = [
    body('user_id').notEmpty().withMessage('user_idは必須です'),
    body('steps').isInt({ min: 0 }).withMessage('stepsは0以上の整数である必要があります'),
    body('recorded_at').isISO8601().withMessage('recorded_atはISO8601形式の日付時刻である必要があります'),
]
export const validateHourlySummaryRequest = [
    query('user_id').notEmpty().withMessage('user_idは必須です'),
    query('date').isISO8601().withMessage('dateはYYYY-MM-DD形式で指定してください'),
]
export const validateDailySummaryRequest = [
    query('user_id').notEmpty().withMessage('user_idは必須です'),
    query('start_date').isISO8601().withMessage('start_dateはYYYY-MM-DD形式'),
    query('end_date').isISO8601().withMessage('end_dateはYYYY-MM-DD形式'),
]
