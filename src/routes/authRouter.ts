// src/routes/authRouter.ts
import express from 'express'
import { verifyFirebase } from '~/controllers/authController'
import { handleValidationErrors, validateFirebaseVerification } from '~/middlewares/validation'

const router = express.Router()

// POST /api/auth/verify-firebase - Step 1: Verify Firebase token
router.post('/verify-firebase', validateFirebaseVerification, handleValidationErrors, verifyFirebase)

export default router
