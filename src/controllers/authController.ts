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
    const startTime = Date.now()
    const { firebase_id_token, google_access_token } = req.body

    console.log('🔥 [AUTH] Firebase verification started', {
        timestamp: new Date().toISOString(),
        hasToken: !!firebase_id_token,
        hasGoogleToken: !!google_access_token,
        tokenLength: firebase_id_token ? firebase_id_token.length : 0,
    })

    // Verify Firebase token and get user data
    const verificationResult = await firebaseAuthService.verifyFirebaseToken(firebase_id_token)

    console.log('🔥 [AUTH] Firebase token verified', {
        firebase_uid: verificationResult.firebase_uid,
        user_name: verificationResult.user_name,
        email: verificationResult.email,
        is_existing_user: verificationResult.is_existing_user,
        duration: Date.now() - startTime + 'ms',
    })

    // Check if user already exists (complete account)
    if (verificationResult.is_existing_user) {
        console.log('✅ [AUTH] Existing user login', {
            firebase_uid: verificationResult.firebase_uid,
            user_name: verificationResult.user_name,
        })

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

    console.log('🆕 [AUTH] New user detected, starting OAuth flow', {
        firebase_uid: verificationResult.firebase_uid,
        user_name: verificationResult.user_name,
        email: verificationResult.email,
        hasGoogleToken: !!google_access_token,
    })

    // If we have Google access token, skip Google OAuth step
    if (google_access_token) {
        console.log('🎯 [AUTH] Google access token provided, skipping Google OAuth')

        try {
            // Get Google user info to verify and store
            const googleUserInfo = await googleOAuthService.getUserInfo(google_access_token)

            console.log('✅ [AUTH] Google user info retrieved', {
                google_id: googleUserInfo.id,
                name: googleUserInfo.name,
                email: googleUserInfo.email,
            })

            // Verify that Google email matches Firebase email (security check)
            if (verificationResult.email && googleUserInfo.email !== verificationResult.email) {
                console.error('❌ [AUTH] Email mismatch detected', {
                    firebaseEmail: verificationResult.email,
                    googleEmail: googleUserInfo.email,
                })
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

            console.log('🔗 [AUTH] GitHub OAuth URL generated (skipped Google)', {
                firebase_uid: verificationResult.firebase_uid,
                totalDuration: Date.now() - startTime + 'ms',
            })

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
            console.log('🔄 [AUTH] Falling back to Google OAuth flow')
        }
    }

    // Fallback: Generate Google OAuth URL (if no access token provided)
    const tempSessionToken = firebaseAuthService.generateTempSessionToken(verificationResult)
    const googleOAuthUrl = firebaseAuthService.generateGoogleOAuthUrl(tempSessionToken)

    console.log('🔗 [AUTH] Google OAuth URL generated (fallback)', {
        firebase_uid: verificationResult.firebase_uid,
        tempTokenLength: tempSessionToken.length,
        totalDuration: Date.now() - startTime + 'ms',
    })

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
        console.error('❌ [GOOGLE] Missing OAuth parameters', { hasCode: !!code, hasState: !!state })
        return res.status(400).json({
            success: false,
            message: AUTH_MESSAGES.INVALID_REQUEST_PARAMETERS,
            error_code: 'MISSING_OAUTH_PARAMS',
        })
    }
    try {
        console.log('🔍 [GOOGLE] Verifying temp session token', { stateLength: (state as string).length })

        // Verify temp session token from state parameter
        const tempSessionData = firebaseAuthService.verifyTempSessionToken(state as string)

        console.log('✅ [GOOGLE] Temp session verified', {
            firebase_uid: tempSessionData.firebase_uid,
            user_name: tempSessionData.user_name,
            email: tempSessionData.email,
        })

        console.log('🔄 [GOOGLE] Exchanging code for tokens')
        // Exchange authorization code for tokens
        const googleTokens = await googleOAuthService.exchangeCodeForTokens(code as string)

        console.log('✅ [GOOGLE] Tokens received', {
            hasAccessToken: !!googleTokens.access_token,
            hasRefreshToken: !!googleTokens.refresh_token,
            expiresIn: googleTokens.expires_in,
        })

        console.log('🔍 [GOOGLE] Getting user info')
        // Get Google user info to verify identity
        const googleUserInfo = await googleOAuthService.getUserInfo(googleTokens.access_token)

        console.log('✅ [GOOGLE] User info retrieved', {
            google_id: googleUserInfo.id,
            name: googleUserInfo.name,
            email: googleUserInfo.email,
            hasProfilePicture: !!googleUserInfo.picture,
        })

        // Verify that Google email matches Firebase email (security check)
        if (tempSessionData.email && googleUserInfo.email !== tempSessionData.email) {
            console.error('❌ [GOOGLE] Email mismatch detected', {
                firebaseEmail: tempSessionData.email,
                googleEmail: googleUserInfo.email,
            })
            return res.status(400).json({
                success: false,
                message: 'Google OAuth認証のメールアドレスがFirebase認証と一致しません。',
                error_code: 'EMAIL_MISMATCH',
            })
        }

        console.log('💾 [GOOGLE] Storing OAuth data temporarily')
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
    const startTime = Date.now()
    const { code, state, error } = req.query

    console.log('🐙 [GITHUB] OAuth callback received', {
        timestamp: new Date().toISOString(),
        hasCode: !!code,
        hasState: !!state,
        hasError: !!error,
        error: error ? String(error) : null,
    })

    // Check for OAuth error
    if (error) {
        console.error('❌ [GITHUB] OAuth error received', { error })
        return res.status(400).json({
            success: false,
            message: `GitHub OAuth エラー: ${error}`,
            error_code: 'OAUTH_ERROR',
        })
    }

    // Validate required parameters
    if (!code || !state) {
        console.error('❌ [GITHUB] Missing OAuth parameters', { hasCode: !!code, hasState: !!state })
        return res.status(400).json({
            success: false,
            message: AUTH_MESSAGES.INVALID_REQUEST_PARAMETERS,
            error_code: 'MISSING_OAUTH_PARAMS',
        })
    }

    try {
        console.log('🔍 [GITHUB] Verifying temp session token', { stateLength: (state as string).length })

        // Verify temp session token from state parameter
        const tempSessionData = firebaseAuthService.verifyTempSessionToken(state as string)

        console.log('✅ [GITHUB] Temp session verified', {
            firebase_uid: tempSessionData.firebase_uid,
            user_name: tempSessionData.user_name,
            email: tempSessionData.email,
        })

        console.log('🔄 [GITHUB] Exchanging code for tokens')
        // Exchange authorization code for tokens
        const githubTokens = await githubOAuthService.exchangeCodeForTokens(code as string)

        console.log('✅ [GITHUB] Tokens received', {
            hasAccessToken: !!githubTokens.access_token,
        })

        console.log('🔍 [GITHUB] Getting user info')
        // Get GitHub user info
        const githubUserInfo = await githubOAuthService.getUserInfo(githubTokens.access_token)

        console.log('✅ [GITHUB] User info retrieved', {
            github_id: githubUserInfo.id,
            username: githubUserInfo.login,
            name: githubUserInfo.name,
            publicEmail: githubUserInfo.email,
            public_repos: githubUserInfo.public_repos,
            followers: githubUserInfo.followers,
        })

        // Get user's email if not public
        let userEmail = githubUserInfo.email
        if (!userEmail) {
            console.log('🔍 [GITHUB] Fetching private email addresses')
            const emails = await githubOAuthService.getUserEmails(githubTokens.access_token)
            const primaryEmail = emails.find((email) => email.primary && email.verified)
            userEmail = primaryEmail?.email || ''
            console.log('✅ [GITHUB] Email resolved', {
                emailsCount: emails.length,
                primaryEmail: userEmail,
            })
        }

        console.log('📚 [GITHUB] Fetching user repositories')
        // Get user's recent repos for initial sync
        const userRepos = await githubOAuthService.getUserRepos(githubTokens.access_token, 5)

        console.log('✅ [GITHUB] Repositories fetched', {
            reposCount: userRepos.length,
        })

        console.log('🔍 [GITHUB] Retrieving stored Google OAuth data')
        // Retrieve stored Google OAuth data
        const googleOAuthData = tempOAuthStorage.getAndRemoveGoogleOAuth(tempSessionData.firebase_uid)
        if (!googleOAuthData) {
            console.error('❌ [GITHUB] Google OAuth data not found', {
                firebase_uid: tempSessionData.firebase_uid,
            })
            return res.status(400).json({
                success: false,
                message: 'Google OAuth データが見つかりません。最初からやり直してください。',
                error_code: 'GOOGLE_OAUTH_DATA_MISSING',
            })
        }

        console.log('✅ [GITHUB] Google OAuth data retrieved', {
            google_id: googleOAuthData.google_user_info.google_id,
            google_email: googleOAuthData.google_user_info.email,
        })

        console.log('👤 [GITHUB] Creating complete user account')
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

        console.log('🎉 [GITHUB] User account created successfully', {
            firebase_uid: tempSessionData.firebase_uid,
            user_name: tempSessionData.user_name,
            email: tempSessionData.email,
            google_id: googleOAuthData.google_user_info.google_id,
            github_id: githubUserInfo.id,
            github_username: githubUserInfo.login,
            totalDuration: Date.now() - startTime + 'ms',
        })

        // Generate full session token for complete account
        const fullSessionToken = firebaseAuthService.generateFullSessionToken(
            tempSessionData.firebase_uid,
            tempSessionData.user_name
        )

        return res.status(200).json({
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
        })
    } catch (error) {
        console.error('❌ [GITHUB] OAuth callback error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : null,
            firebase_uid: req.query.state ? 'present' : 'missing',
            duration: Date.now() - startTime + 'ms',
        })

        if (error instanceof Error && error.message.includes('expired')) {
            console.error('❌ [GITHUB] Session expired', { error: error.message })
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
