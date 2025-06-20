// src/controllers/authController.ts
import { Request, Response } from 'express'
import { AUTH_MESSAGES } from '~/constants/messages'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { firebaseAuthService } from '~/services/firebaseAuthService'

// POST /api/auth/verify-firebase
export const verifyFirebase = asyncHandler(async (req: Request, res: Response) => {
    const { firebase_id_token } = req.body

    // Verify Firebase token and get user data
    const verificationResult = await firebaseAuthService.verifyFirebaseToken(firebase_id_token)

    // Check if user already exists (complete account)
    if (verificationResult.is_existing_user) {
        return res.status(200).json({
            success: true,
            message: AUTH_MESSAGES.USER_ALREADY_EXISTS,
            user_exists: true,
            firebase_uid: verificationResult.firebase_uid,
            user_name: verificationResult.user_name,
            user_icon: verificationResult.user_icon,
        })
    }

    // Generate temporary session token for new user
    const tempSessionToken = firebaseAuthService.generateTempSessionToken(verificationResult)

    return res.status(200).json({
        success: true,
        message: AUTH_MESSAGES.FIREBASE_VERIFICATION_SUCCESS,
        temp_session_token: tempSessionToken,
        firebase_data: {
            firebase_uid: verificationResult.firebase_uid,
            user_name: verificationResult.user_name,
            user_icon: verificationResult.user_icon,
            email: verificationResult.email,
        },
        next_step: 'link_github',
    })
})
