// src/routes/authRouter.ts
import express from 'express'
import {
    getTokenReport,
    githubOAuthCallback,
    googleOAuthCallback,
    initiateGoogleOAuth,
    refreshAllTokens,
    verifyFirebase,
} from '~/controllers/authController'
import { handleValidationErrors, validateFirebaseVerification } from '~/middlewares/validation'

const router = express.Router()

// Google OAuth Flow
router.get('/google', initiateGoogleOAuth)
router.get('/google/callback', googleOAuthCallback)
router.get('/github/callback', githubOAuthCallback)

// Legacy Firebase endpoint
router.post('/verify-firebase', validateFirebaseVerification, handleValidationErrors, verifyFirebase)

// Admin endpoints
router.get('/admin/token-report', getTokenReport)
router.post('/admin/refresh-all', refreshAllTokens)

export default router
