// src/middlewares/validation/authValidation.ts
import { body } from 'express-validator'
import { VALIDATION_MESSAGES } from '~/constants/messages'

// Validation rules for Firebase verification
export const validateFirebaseVerification = [
    body('firebase_id_token')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.FIELD_REQUIRED('firebase_id_token'))
        .isString()
        .withMessage(VALIDATION_MESSAGES.FIELD_INVALID('firebase_id_token'))
        .isLength({ min: 10 })
        .withMessage(VALIDATION_MESSAGES.FIELD_TOO_SHORT('firebase_id_token', 10)),
]

// Validation rules for GitHub account linking
export const validateGitHubLinking = [
    body('temp_session_token')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.FIELD_REQUIRED('temp_session_token'))
        .isString()
        .withMessage(VALIDATION_MESSAGES.FIELD_INVALID('temp_session_token')),

    body('github_code')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.FIELD_REQUIRED('github_code'))
        .isString()
        .withMessage(VALIDATION_MESSAGES.FIELD_INVALID('github_code'))
        .isLength({ min: 5 })
        .withMessage(VALIDATION_MESSAGES.FIELD_TOO_SHORT('github_code', 5)),
]

// Validation rules for login with Firebase
export const validateFirebaseLogin = [
    body('firebase_id_token')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.FIELD_REQUIRED('firebase_id_token'))
        .isString()
        .withMessage(VALIDATION_MESSAGES.FIELD_INVALID('firebase_id_token'))
        .isLength({ min: 10 })
        .withMessage(VALIDATION_MESSAGES.FIELD_TOO_SHORT('firebase_id_token', 10)),
]

// Validation rules for login with GitHub
export const validateGitHubLogin = [
    body('github_code')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.FIELD_REQUIRED('github_code'))
        .isString()
        .withMessage(VALIDATION_MESSAGES.FIELD_INVALID('github_code'))
        .isLength({ min: 5 })
        .withMessage(VALIDATION_MESSAGES.FIELD_TOO_SHORT('github_code', 5)),
]
