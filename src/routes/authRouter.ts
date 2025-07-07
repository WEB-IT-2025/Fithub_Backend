// src/routes/authRouter.ts
import express from 'express'
import {
    getTokenReport,
    githubOAuthCallback,
    googleOAuthCallback,
    initiateGoogleOAuth,
    loginWithGitHub,
    loginWithGoogle,
    refreshAllTokens,
} from '~/controllers/authController'
import { handleValidationErrors, validateOAuthCallback, validateOAuthInitiation } from '~/middlewares/validation'

const router = express.Router()

// Registration OAuth Flow
router.get('/google', validateOAuthInitiation, handleValidationErrors, initiateGoogleOAuth)
router.get('/google/callback', validateOAuthCallback, handleValidationErrors, googleOAuthCallback)
router.get('/github/callback', validateOAuthCallback, handleValidationErrors, githubOAuthCallback)

// Login OAuth Flow
router.get('/login/google', validateOAuthInitiation, handleValidationErrors, loginWithGoogle)
router.get('/login/github', validateOAuthInitiation, handleValidationErrors, loginWithGitHub)

// Admin endpoints
router.get('/admin/token-report', getTokenReport)
router.post('/admin/refresh-all', refreshAllTokens)

export default router
