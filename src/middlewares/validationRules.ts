// middlewares/validationRules.ts
import { body } from 'express-validator'

export const signupValidation = [
    body('userId').notEmpty().withMessage('userId は必須です'),
    body('userName').notEmpty().withMessage('userName は必須です'),
    body('userIcon').notEmpty().withMessage('userIcon は必須です'),
    body('point')
        .notEmpty()
        .withMessage('point は必須です')
        .toInt() // ← ここで文字列 "0" を数値 0 に変換
        .isInt({ min: 0 })
        .withMessage('point は 0 以上の整数である必要があります'),
]
