// src/middlewares/validation/common.ts
import { NextFunction, Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { GENERAL_MESSAGES } from '~/constants/messages'

// Middleware to handle validation result
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: GENERAL_MESSAGES.VALIDATION_ERROR,
            errors: errors.array(),
        })
        return
    }

    next()
}
