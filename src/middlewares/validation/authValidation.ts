// src/middlewares/validation/authValidation.ts
import { query } from 'express-validator'
import { VALIDATION_MESSAGES } from '~/constants/messages'

// Validation rules for OAuth callback (query parameters)
export const validateOAuthCallback = [
    query('code')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.FIELD_REQUIRED('code'))
        .isString()
        .withMessage(VALIDATION_MESSAGES.FIELD_INVALID('code'))
        .isLength({ min: 5 })
        .withMessage(VALIDATION_MESSAGES.FIELD_TOO_SHORT('code', 5)),

    query('state')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.FIELD_REQUIRED('state'))
        .isString()
        .withMessage(VALIDATION_MESSAGES.FIELD_INVALID('state')),
]

// Validation rules for OAuth initiation (query parameters)
export const validateOAuthInitiation = [
    query('intent').optional().isIn(['login', 'register']).withMessage(VALIDATION_MESSAGES.FIELD_INVALID('intent')),
]
