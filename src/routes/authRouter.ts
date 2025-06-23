// src/routes/authRouter.ts
import express from 'express'
import { googleOAuthCallback, verifyFirebase } from '~/controllers/authController'
import { handleValidationErrors, validateFirebaseVerification } from '~/middlewares/validation'

const router = express.Router()

// POST /api/auth/verify-firebase - Step 1: Verify Firebase token
router.post('/verify-firebase', validateFirebaseVerification, handleValidationErrors, verifyFirebase)

// GET /api/auth/google/callback - Step 2: Handle Google OAuth callback
router.get('/google/callback', googleOAuthCallback)

export default router
