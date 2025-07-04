// src/controllers/authController.ts
import crypto from 'crypto'
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
        userAgent: req.headers['user-agent']?.substring(0, 150) || 'NO_USER_AGENT',
        queryParams: JSON.stringify(req.query),
        headers: {
            host: req.headers.host,
            referer: req.headers.referer,
            origin: req.headers.origin,
        },
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
        // NEW FLOW: Direct Google OAuth (no Firebase verification needed)
        // The state parameter is just for CSRF protection, not a temp session token

        // Exchange authorization code for tokens
        const googleTokens = await googleOAuthService.exchangeCodeForTokens(code as string)

        // 🔍 DEBUG: Log token details
        console.log('🔍 [GOOGLE] OAuth tokens received:', {
            hasAccessToken: !!googleTokens.access_token,
            hasRefreshToken: !!googleTokens.refresh_token,
            refreshTokenLength: googleTokens.refresh_token ? googleTokens.refresh_token.length : 0,
            expiresIn: googleTokens.expires_in,
            tokenType: googleTokens.token_type,
            scope: googleTokens.scope,
            refreshTokenPreview:
                googleTokens.refresh_token ? googleTokens.refresh_token.substring(0, 10) + '...' : 'NONE',
        })

        // Get Google user info
        const googleUserInfo = await googleOAuthService.getUserInfo(googleTokens.access_token)

        // Check if user already exists
        const existingUser = await userModel.findByEmail(googleUserInfo.email)

        if (existingUser) {
            // User already exists, generate session token and return
            const sessionToken = firebaseAuthService.generateFullSessionToken(
                existingUser.user_id,
                existingUser.user_name
            )

            // Update user's Google tokens in database
            await userModel.updateGoogleOAuthTokens(existingUser.user_id, {
                access_token: googleTokens.access_token,
                refresh_token: googleTokens.refresh_token,
                expires_in: googleTokens.expires_in,
            })

            console.log('✅ [GOOGLE] Existing user logged in', {
                user_id: existingUser.user_id,
                email: googleUserInfo.email,
                hasRefreshToken: !!googleTokens.refresh_token,
            })

            // Detect if this is a web browser request
            const userAgent = req.headers['user-agent'] || ''
            const isWebRequest = userAgent.includes('Mozilla') // All modern browsers include Mozilla in User-Agent

            console.log('🔍 [GOOGLE] Existing user request detection:', {
                userAgent: userAgent.substring(0, 100),
                isWebRequest,
                willRedirect: isWebRequest ? 'YES' : 'NO - will return JSON',
            })

            const responseData = {
                success: true,
                message: 'Login successful',
                is_new_user: false,
                session_token: sessionToken,
                user: {
                    user_id: existingUser.user_id,
                    user_name: existingUser.user_name,
                    user_icon: existingUser.user_icon,
                    email: existingUser.email,
                },
                oauth_data: {
                    google: {
                        google_id: googleUserInfo.id,
                        name: googleUserInfo.name,
                        email: googleUserInfo.email,
                        picture: googleUserInfo.picture,
                        connected: true,
                        has_refresh_token: !!googleTokens.refresh_token,
                    },
                    github: {
                        github_id: parseInt(existingUser.github_user_id || '0'),
                        username: existingUser.github_username || '',
                        connected: !!existingUser.github_access_token,
                    },
                },
            }

            // For web requests (popup), redirect to callback page with data
            if (isWebRequest) {
                const callbackUrl = new URL('/auth/callback', process.env.FRONTEND_URL || 'http://localhost:3000')
                callbackUrl.searchParams.set('success', 'true')
                callbackUrl.searchParams.set('message', encodeURIComponent(responseData.message))
                callbackUrl.searchParams.set('session_token', sessionToken)
                callbackUrl.searchParams.set('user_data', encodeURIComponent(JSON.stringify(responseData.user)))
                callbackUrl.searchParams.set('oauth_data', encodeURIComponent(JSON.stringify(responseData.oauth_data)))

                return res.redirect(callbackUrl.toString())
            }

            // For mobile/API requests, return JSON
            return res.status(200).json(responseData)
        }

        // New user - generate a temporary user ID and store OAuth data for GitHub step
        const tempUserId = `temp_${crypto.randomBytes(16).toString('hex')}`

        // Store Google OAuth data temporarily for GitHub callback
        tempOAuthStorage.storeGoogleOAuth(
            tempUserId,
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

        // 🔍 DEBUG: Log storage details
        console.log('💾 [GOOGLE] OAuth data stored temporarily:', {
            temp_user_id: tempUserId,
            hasRefreshToken: !!googleTokens.refresh_token,
            refreshTokenStored: googleTokens.refresh_token ? 'YES' : 'NO',
        })

        // Generate GitHub OAuth URL for next step
        const githubOAuthUrl = githubOAuthService.generateGitHubOAuthUrl(tempUserId)

        console.log('🔗 [GOOGLE] GitHub OAuth URL generated', {
            temp_user_id: tempUserId,
            totalDuration: Date.now() - startTime + 'ms',
        })

        // Detect if this is a web browser request
        const userAgent = req.headers['user-agent'] || ''
        const isWebRequest = userAgent.includes('Mozilla') // All modern browsers include Mozilla in User-Agent

        console.log('🔍 [GOOGLE] Request detection:', {
            userAgent: userAgent.substring(0, 100),
            isWebRequest,
            willRedirect: isWebRequest ? 'YES' : 'NO - will return JSON',
        })

        const responseData = {
            success: true,
            message: 'Google OAuth 認証成功。GitHub認証を開始してください。',
            is_new_user: true,
            next_step: 'redirect_to_github_oauth',
            temp_session_token: tempUserId, // Use temp user ID as session token
            github_oauth_url: githubOAuthUrl,
            google_data: {
                google_id: googleUserInfo.id,
                name: googleUserInfo.name,
                email: googleUserInfo.email,
                picture: googleUserInfo.picture,
            },
        }

        // For web requests (popup), redirect to callback page with data for new user
        if (isWebRequest) {
            const callbackUrl = new URL('/auth/callback', process.env.FRONTEND_URL || 'http://localhost:3001')
            callbackUrl.searchParams.set('google_success', 'true')
            callbackUrl.searchParams.set('message', encodeURIComponent(responseData.message))
            callbackUrl.searchParams.set('temp_session_token', tempUserId)
            callbackUrl.searchParams.set('github_oauth_url', encodeURIComponent(githubOAuthUrl))
            callbackUrl.searchParams.set('google_data', encodeURIComponent(JSON.stringify(responseData.google_data)))

            return res.redirect(callbackUrl.toString())
        }

        // For mobile/API requests, return JSON
        return res.status(200).json(responseData)
    } catch (error) {
        console.error('❌ [GOOGLE] OAuth callback error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : null,
            state: req.query.state ? 'present' : 'missing',
            duration: Date.now() - startTime + 'ms',
        })

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
        // NEW FLOW: state contains temp user ID (not Firebase session token)
        const tempUserId = state as string

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
        const googleOAuthData = tempOAuthStorage.getAndRemoveGoogleOAuth(tempUserId)
        if (!googleOAuthData) {
            return res.status(400).json({
                success: false,
                message: 'Google OAuth データが見つかりません。最初からやり直してください。',
                error_code: 'GOOGLE_OAUTH_DATA_MISSING',
            })
        }

        // 🔍 DEBUG: Log retrieved Google OAuth data
        console.log('📥 [GITHUB] Retrieved Google OAuth data:', {
            temp_user_id: tempUserId,
            hasRefreshToken: !!googleOAuthData.google_oauth.refresh_token,
            refreshTokenLength:
                googleOAuthData.google_oauth.refresh_token ? googleOAuthData.google_oauth.refresh_token.length : 0,
            refreshTokenValue: googleOAuthData.google_oauth.refresh_token || 'EMPTY',
        })

        // Create complete user account with all OAuth data using new method
        const newUserId = await userModel.createUserFromGoogleOAuth({
            email: googleOAuthData.google_user_info.email,
            name: googleOAuthData.google_user_info.name,
            picture: googleOAuthData.google_user_info.picture,
            google_oauth: googleOAuthData.google_oauth,
            github_oauth: {
                access_token: githubTokens.access_token,
                github_user_id: githubUserInfo.id,
                github_username: githubUserInfo.login,
            },
        })

        // Generate full session token for complete account
        const fullSessionToken = firebaseAuthService.generateFullSessionToken(
            newUserId,
            googleOAuthData.google_user_info.name
        )

        // 🎉 Log successful user creation
        console.log('🎉 [AUTH] User account created successfully', {
            user_id: newUserId,
            user_name: googleOAuthData.google_user_info.name,
            email: googleOAuthData.google_user_info.email,
            google_id: googleOAuthData.google_user_info.google_id,
            github_id: githubUserInfo.id,
            github_username: githubUserInfo.login,
            github_repos: userRepos.length,
            hasGoogleRefreshToken: !!googleOAuthData.google_oauth.refresh_token,
        })

        // Detect if this is a web request (popup) or mobile app request
        const userAgent = req.headers['user-agent'] || ''
        const isWebRequest = userAgent.includes('Mozilla') && !userAgent.includes('Mobile')

        const responseData = {
            success: true,
            message: 'アカウント作成が完了しました！Fithubへようこそ！',
            session_token: fullSessionToken,
            user: {
                user_id: newUserId,
                user_name: googleOAuthData.google_user_info.name,
                user_icon: googleOAuthData.google_user_info.picture,
                email: googleOAuthData.google_user_info.email,
            },
            oauth_data: {
                google: {
                    google_id: googleOAuthData.google_user_info.google_id,
                    name: googleOAuthData.google_user_info.name,
                    email: googleOAuthData.google_user_info.email,
                    picture: googleOAuthData.google_user_info.picture,
                    connected: true,
                    has_refresh_token: !!googleOAuthData.google_oauth.refresh_token, // Important debug info
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

// NEW: GET /api/auth/google - Initiate Google OAuth directly
export const initiateGoogleOAuth = asyncHandler(async (req: Request, res: Response) => {
    try {
        // Generate a secure state parameter for CSRF protection
        const state = crypto.randomBytes(32).toString('hex')

        // Store state temporarily (you might want to use Redis in production)
        // For now, we'll use a simple in-memory store or include it in the response

        // Generate Google OAuth URL with proper parameters to ensure refresh token
        const googleOAuthUrl =
            `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback')}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent('openid email profile https://www.googleapis.com/auth/fitness.activity.read')}&` +
            `state=${state}&` +
            `access_type=offline&` + // Essential for refresh token
            `prompt=consent` // Force consent to ensure refresh token

        console.log('🔗 [GOOGLE] OAuth URL generated:', {
            timestamp: new Date().toISOString(),
            state: state.substring(0, 8) + '...',
            url: googleOAuthUrl.substring(0, 100) + '...',
        })

        return res.status(200).json({
            success: true,
            message: 'Google OAuth URL generated successfully',
            google_oauth_url: googleOAuthUrl,
            state: state, // Frontend should store this to verify callback
            next_step: 'redirect_to_google_oauth',
        })
    } catch (error) {
        console.error('❌ [GOOGLE] Failed to initiate OAuth:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to initiate Google OAuth',
            error_code: 'OAUTH_INIT_FAILED',
        })
    }
})
