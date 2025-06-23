// src/controllers/authController.ts
import { Request, Response } from 'express'
import { AUTH_MESSAGES } from '~/constants/messages'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { firebaseAuthService } from '~/services/firebaseAuthService'
import { googleOAuthService } from '~/services/googleOAuthService'

// POST /api/auth/verify-firebase
export const verifyFirebase = asyncHandler(async (req: Request, res: Response) => {
    const { firebase_id_token } = req.body

    // Verify Firebase token and get user data
    const verificationResult = await firebaseAuthService.verifyFirebaseToken(firebase_id_token)

    // Check if user already exists (complete account)
    if (verificationResult.is_existing_user) {
        // User already exists, generate full session token
        const fullSessionToken = firebaseAuthService.generateFullSessionToken(
            verificationResult.firebase_uid,
            verificationResult.user_name
        )

        return res.status(200).json({
            success: true,
            message: AUTH_MESSAGES.USER_ALREADY_EXISTS,
            is_new_user: false,
            session_token: fullSessionToken,
            user: {
                user_id: verificationResult.firebase_uid,
                user_name: verificationResult.user_name,
                user_icon: verificationResult.user_icon,
                email: verificationResult.email,
            },
        })
    }

    // New user - generate temp session token and Google OAuth URL
    const tempSessionToken = firebaseAuthService.generateTempSessionToken(verificationResult)
    const googleOAuthUrl = firebaseAuthService.generateGoogleOAuthUrl(tempSessionToken)

    return res.status(200).json({
        success: true,
        message: AUTH_MESSAGES.FIREBASE_VERIFICATION_SUCCESS,
        is_new_user: true,
        temp_session_token: tempSessionToken,
        google_oauth_url: googleOAuthUrl,
        next_step: 'redirect_to_google_oauth',
        firebase_data: {
            firebase_uid: verificationResult.firebase_uid,
            user_name: verificationResult.user_name,
            user_icon: verificationResult.user_icon,
            email: verificationResult.email,
        },
    })
})

// GET /api/auth/google/callback
export const googleOAuthCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error } = req.query

    // Check for OAuth error
    if (error) {
        return res.status(400).json({
            success: false,
            message: `OAuth エラー: ${error}`,
            error_code: 'OAUTH_ERROR',
        })
    }

    // Validate required parameters
    if (!code || !state) {
        return res.status(400).json({
            success: false,
            message: AUTH_MESSAGES.INVALID_REQUEST_PARAMETERS,
            error_code: 'MISSING_OAUTH_PARAMS',
        })
    }
    try {
        // Verify temp session token from state parameter
        const tempSessionData = firebaseAuthService.verifyTempSessionToken(state as string)

        // Exchange authorization code for tokens
        const googleTokens = await googleOAuthService.exchangeCodeForTokens(code as string)

        // Get Google user info to verify identity
        const googleUserInfo = await googleOAuthService.getUserInfo(googleTokens.access_token)

        // Verify that Google email matches Firebase email (security check)
        if (tempSessionData.email && googleUserInfo.email !== tempSessionData.email) {
            return res.status(400).json({
                success: false,
                message: 'Google OAuth認証のメールアドレスがFirebase認証と一致しません。',
                error_code: 'EMAIL_MISMATCH',
            })
        }

        // TODO: Store Google OAuth tokens in database
        // TODO: Proceed to GitHub OAuth or complete user creation

        // For now, return success with next step
        return res.status(200).json({
            success: true,
            message: 'Google OAuth 認証成功。GitHub認証を開始してください。',
            next_step: 'github_oauth',
            temp_session_token: state, // Keep using the same temp token
            google_data: {
                google_id: googleUserInfo.id,
                name: googleUserInfo.name,
                email: googleUserInfo.email,
                picture: googleUserInfo.picture,
            },
            // TODO: Add GitHub OAuth URL when implemented
        })
    } catch (error) {
        console.error('Google OAuth callback error:', error)

        if (error instanceof Error && error.message.includes('expired')) {
            return res.status(401).json({
                success: false,
                message: AUTH_MESSAGES.SESSION_EXPIRED,
                error_code: 'SESSION_EXPIRED',
            })
        }

        return res.status(500).json({
            success: false,
            message: 'Google OAuth処理中にエラーが発生しました。',
            error_code: 'OAUTH_PROCESSING_ERROR',
        })
    }
})
