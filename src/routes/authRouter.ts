// src/routes/authRouter.ts
import express from 'express'
import {
    githubOAuthCallback,
    googleOAuthCallback,
    initiateGoogleOAuth,
    // Legacy endpoints (can be removed later)
    verifyFirebase,
} from '~/controllers/authController'
import { handleValidationErrors, validateFirebaseVerification } from '~/middlewares/validation'

const router = express.Router()

// NEW FLOW: Direct Google OAuth
// GET /api/auth/google - Step 1: Initiate Google OAuth (get auth URL)
router.get('/google', initiateGoogleOAuth)

// GET /api/auth/google/callback - Step 2: Handle Google OAuth callback
router.get('/google/callback', googleOAuthCallback)

// GET /api/auth/github/callback - Step 3: Handle GitHub OAuth callback (Final step)
router.get('/github/callback', githubOAuthCallback)

// LEGACY ENDPOINTS (for backward compatibility, can be removed later)
// POST /api/auth/verify-firebase - Old Step 1: Verify Firebase token
router.post('/verify-firebase', validateFirebaseVerification, handleValidationErrors, verifyFirebase)

export default router
