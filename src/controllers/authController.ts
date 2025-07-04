// src/controllers/authController.ts
import { Request, Response } from 'express'
import { AUTH_MESSAGES } from '~/constants/messages'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { userModel } from '~/models/userModel'
import { firebaseAuthService } from '~/services/firebaseAuthService'
import { githubOAuthService } from '~/services/githubOAuthService'
import { googleOAuthService } from '~/services/googleOAuthService'
import { tempOAuthStorage } from '~/services/tempOAuthStorage'

// POST /api/auth/verify-firebase
export const verifyFirebase = asyncHandler(async (req: Request, res: Response) => {
    const { firebase_id_token, google_access_token } = req.body

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

    // If we have Google access token, skip Google OAuth step
    if (google_access_token) {
        try {
            // Get Google user info to verify and store
            const googleUserInfo = await googleOAuthService.getUserInfo(google_access_token)

            // Verify that Google email matches Firebase email (security check)
            if (verificationResult.email && googleUserInfo.email !== verificationResult.email) {
                return res.status(400).json({
                    success: false,
                    message: 'Google OAuth認証のメールアドレスがFirebase認証と一致しません。',
                    error_code: 'EMAIL_MISMATCH',
                })
            }

            // Store Google OAuth data temporarily for GitHub callback
            const tempSessionToken = firebaseAuthService.generateTempSessionToken(verificationResult)
            tempOAuthStorage.storeGoogleOAuth(
                verificationResult.firebase_uid,
                {
                    access_token: google_access_token,
                    refresh_token: '', // May not be available from Firebase
                    expires_in: 3600, // Default expiry
                },
                {
                    google_id: googleUserInfo.id,
                    name: googleUserInfo.name,
                    email: googleUserInfo.email,
                    picture: googleUserInfo.picture,
                }
            )

            // Generate GitHub OAuth URL directly
            const githubOAuthUrl = githubOAuthService.generateGitHubOAuthUrl(tempSessionToken)

            return res.status(200).json({
                success: true,
                message: 'Firebase認証成功。GitHub認証を開始してください。',
                is_new_user: true,
                temp_session_token: tempSessionToken,
                github_oauth_url: githubOAuthUrl,
                next_step: 'redirect_to_github_oauth',
                google_data: {
                    google_id: googleUserInfo.id,
                    name: googleUserInfo.name,
                    email: googleUserInfo.email,
                    picture: googleUserInfo.picture,
                },
            })
        } catch (error) {
            console.error('❌ [AUTH] Google access token validation failed', {
                error: error instanceof Error ? error.message : String(error),
                firebase_uid: verificationResult.firebase_uid,
            })
            // Fallback to Google OAuth if access token is invalid
        }
    }

    // Fallback: Generate Google OAuth URL (if no access token provided)
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
    const startTime = Date.now()
    const { code, state, error } = req.query

    console.log('🔗 [GOOGLE] OAuth callback received', {
        timestamp: new Date().toISOString(),
        hasCode: !!code,
        hasState: !!state,
        hasError: !!error,
        error: error ? String(error) : null,
    })

    // Check for OAuth error
    if (error) {
        console.error('❌ [GOOGLE] OAuth error received', { error })
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

        // Store Google OAuth data temporarily for GitHub callback
        tempOAuthStorage.storeGoogleOAuth(
            tempSessionData.firebase_uid,
            {
                access_token: googleTokens.access_token,
                refresh_token: googleTokens.refresh_token,
                expires_in: googleTokens.expires_in,
            },
            {
                google_id: googleUserInfo.id,
                name: googleUserInfo.name,
                email: googleUserInfo.email,
                picture: googleUserInfo.picture,
            }
        )

        // Generate GitHub OAuth URL for next step
        const githubOAuthUrl = githubOAuthService.generateGitHubOAuthUrl(state as string)

        console.log('🔗 [GOOGLE] GitHub OAuth URL generated', {
            firebase_uid: tempSessionData.firebase_uid,
            totalDuration: Date.now() - startTime + 'ms',
        })

        // Return success with GitHub OAuth URL
        return res.status(200).json({
            success: true,
            message: 'Google OAuth 認証成功。GitHub認証を開始してください。',
            next_step: 'redirect_to_github_oauth',
            temp_session_token: state, // Keep using the same temp token
            github_oauth_url: githubOAuthUrl,
            google_data: {
                google_id: googleUserInfo.id,
                name: googleUserInfo.name,
                email: googleUserInfo.email,
                picture: googleUserInfo.picture,
            },
        })
    } catch (error) {
        console.error('❌ [GOOGLE] OAuth callback error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : null,
            firebase_uid: req.query.state ? 'present' : 'missing',
            duration: Date.now() - startTime + 'ms',
        })

        if (error instanceof Error && error.message.includes('expired')) {
            console.error('❌ [GOOGLE] Session expired', { error: error.message })
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

// GET /api/auth/github/callback
export const githubOAuthCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error } = req.query

    // Check for OAuth error
    if (error) {
        return res.status(400).json({
            success: false,
            message: `GitHub OAuth エラー: ${error}`,
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
        const githubTokens = await githubOAuthService.exchangeCodeForTokens(code as string)

        // Get GitHub user info
        const githubUserInfo = await githubOAuthService.getUserInfo(githubTokens.access_token)

        // Get user's email if not public
        let userEmail = githubUserInfo.email
        if (!userEmail) {
            const emails = await githubOAuthService.getUserEmails(githubTokens.access_token)
            const primaryEmail = emails.find((email) => email.primary && email.verified)
            userEmail = primaryEmail?.email || ''
        }

        // Get user's recent repos for initial sync
        const userRepos = await githubOAuthService.getUserRepos(githubTokens.access_token, 5)

        // Retrieve stored Google OAuth data
        const googleOAuthData = tempOAuthStorage.getAndRemoveGoogleOAuth(tempSessionData.firebase_uid)
        if (!googleOAuthData) {
            return res.status(400).json({
                success: false,
                message: 'Google OAuth データが見つかりません。最初からやり直してください。',
                error_code: 'GOOGLE_OAUTH_DATA_MISSING',
            })
        }

        // Create complete user account with all OAuth data
        await userModel.createCompleteUser({
            firebase_uid: tempSessionData.firebase_uid,
            user_name: tempSessionData.user_name,
            user_icon: tempSessionData.user_icon,
            email: tempSessionData.email,
            google_oauth: googleOAuthData.google_oauth,
            github_oauth: {
                access_token: githubTokens.access_token,
                github_user_id: githubUserInfo.id,
                github_username: githubUserInfo.login,
            },
        })

        // Generate full session token for complete account
        const fullSessionToken = firebaseAuthService.generateFullSessionToken(
            tempSessionData.firebase_uid,
            tempSessionData.user_name
        )

        // 🎉 Log successful user creation
        console.log('🎉 [AUTH] User account created successfully', {
            firebase_uid: tempSessionData.firebase_uid,
            user_name: tempSessionData.user_name,
            email: tempSessionData.email,
            google_id: googleOAuthData.google_user_info.google_id,
            github_id: githubUserInfo.id,
            github_username: githubUserInfo.login,
            github_repos: userRepos.length,
        })

        // Detect if this is a web request (popup) or mobile app request
        const userAgent = req.headers['user-agent'] || ''
        const isWebRequest = userAgent.includes('Mozilla') && !userAgent.includes('Mobile')

        const responseData = {
            success: true,
            message: 'アカウント作成が完了しました！Fithubへようこそ！',
            session_token: fullSessionToken,
            user: {
                user_id: tempSessionData.firebase_uid,
                user_name: tempSessionData.user_name,
                user_icon: tempSessionData.user_icon,
                email: tempSessionData.email,
            },
            oauth_data: {
                google: {
                    google_id: googleOAuthData.google_user_info.google_id,
                    name: googleOAuthData.google_user_info.name,
                    email: googleOAuthData.google_user_info.email,
                    picture: googleOAuthData.google_user_info.picture,
                    connected: true,
                },
                github: {
                    github_id: githubUserInfo.id,
                    username: githubUserInfo.login,
                    name: githubUserInfo.name,
                    email: userEmail,
                    avatar_url: githubUserInfo.avatar_url,
                    public_repos: githubUserInfo.public_repos,
                    followers: githubUserInfo.followers,
                    connected: true,
                },
            },
            initial_sync: {
                github_repos: userRepos.length,
                // google_fitness_data: would be fetched in real implementation
            },
        }

        // For web requests (popup), redirect to callback page with data
        if (isWebRequest) {
            const callbackUrl = new URL('/auth/callback', process.env.FRONTEND_URL || 'http://localhost:3001')
            callbackUrl.searchParams.set('success', 'true')
            callbackUrl.searchParams.set('message', encodeURIComponent(responseData.message))
            callbackUrl.searchParams.set('session_token', fullSessionToken)
            callbackUrl.searchParams.set('user_data', encodeURIComponent(JSON.stringify(responseData.user)))
            callbackUrl.searchParams.set('oauth_data', encodeURIComponent(JSON.stringify(responseData.oauth_data)))

            return res.redirect(callbackUrl.toString())
        }

        // For mobile/API requests, return JSON
        return res.status(200).json(responseData)
    } catch (error) {
        // ❌ Log error details
        console.error('❌ [AUTH] OAuth callback error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : null,
            firebase_uid: req.query.state ? 'present' : 'missing',
        })

        if (error instanceof Error && error.message.includes('expired')) {
            return res.status(401).json({
                success: false,
                message: AUTH_MESSAGES.SESSION_EXPIRED,
                error_code: 'SESSION_EXPIRED',
            })
        }

        return res.status(500).json({
            success: false,
            message: 'GitHub OAuth処理中にエラーが発生しました。',
            error_code: 'OAUTH_PROCESSING_ERROR',
        })
    }
})
