// src/routes/authRouter.ts
import express from 'express'
import { githubOAuthCallback, googleOAuthCallback, verifyFirebase } from '~/controllers/authController'
import { handleValidationErrors, validateFirebaseVerification } from '~/middlewares/validation'

const router = express.Router()

// POST /api/auth/verify-firebase - Step 1: Verify Firebase token
router.post('/verify-firebase', validateFirebaseVerification, handleValidationErrors, verifyFirebase)

// GET /api/auth/google/callback - Step 2: Handle Google OAuth callback
router.get('/google/callback', googleOAuthCallback)

// GET /api/auth/github/callback - Step 3: Handle GitHub OAuth callback (Final step)
router.get('/github/callback', githubOAuthCallback)

export default router
