// src/controllers/authController.ts
import crypto from 'crypto'
import { Request, Response } from 'express'
import { API_MESSAGES, AUTH_MESSAGES } from '~/constants/messages'
import { asyncHandler } from '~/middlewares/asyncHandler'
import { missionModel } from '~/models/missionModel'
import { userModel } from '~/models/userModel'
import { authTokenService } from '~/services/authTokenService'
import { dataSyncService } from '~/services/dataSyncService'
import { githubOAuthService } from '~/services/githubOAuthService'
import { googleOAuthService } from '~/services/googleOAuthService'
import { googleTokenRefreshService } from '~/services/googleTokenRefreshService'
import { tempOAuthStorage } from '~/services/tempOAuthStorage'

// GET /api/auth/google/callback
export const googleOAuthCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error } = req.query

    if (error) {
        console.error('❌ [GOOGLE] OAuth error received', { error })
        return res.status(400).json({
            success: false,
            message: `${AUTH_MESSAGES.OAUTH_ERROR}: ${error}`,
            error_code: 'OAUTH_ERROR',
        })
    }

    if (!code || !state) {
        console.error('❌ [GOOGLE] Missing OAuth parameters', { hasCode: !!code, hasState: !!state })
        return res.status(400).json({
            success: false,
            message: AUTH_MESSAGES.INVALID_REQUEST_PARAMETERS,
            error_code: 'MISSING_OAUTH_PARAMS',
        })
    }

    try {
        const stateValue = state as string
        const isLoginIntent = stateValue.startsWith('login_')

        const googleTokens = await googleOAuthService.exchangeCodeForTokens(code as string)
        const googleUserInfo = await googleOAuthService.getUserInfo(googleTokens.access_token)
        const existingUser = await userModel.findByEmail(googleUserInfo.email)

        if (existingUser) {
            // User exists - this is either login or duplicate registration attempt
            const sessionToken = authTokenService.generateFullSessionToken(existingUser.user_id, existingUser.user_name)

            await userModel.updateGoogleOAuthTokens(existingUser.user_id, {
                access_token: googleTokens.access_token,
                refresh_token: googleTokens.refresh_token,
                expires_in: googleTokens.expires_in,
            })

            console.log('✅ [AUTH] Google login completed', {
                user_id: existingUser.user_id,
                email: googleUserInfo.email,
                action: isLoginIntent ? 'login' : 'existing_user_registration_attempt',
            })

            // Auto-sync user data after successful login
            setTimeout(async () => {
                try {
                    await dataSyncService.syncUserData(existingUser.user_id)
                } catch (syncError) {
                    console.error('❌ [SYNC] Failed to sync user data after login:', syncError)
                }
            }, 1000) // Delay 1 second to not block the response

            const userAgent = req.headers['user-agent'] || ''
            const isWebRequest = userAgent.includes('Mozilla')

            const responseData = {
                success: true,
                message:
                    isLoginIntent ? AUTH_MESSAGES.GOOGLE_LOGIN_SUCCESS : AUTH_MESSAGES.GOOGLE_ACCOUNT_ALREADY_EXISTS,
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

            if (isWebRequest) {
                const callbackUrl = new URL('/auth/callback', process.env.FRONTEND_URL || 'http://localhost:3001')
                callbackUrl.searchParams.set('success', 'true')
                callbackUrl.searchParams.set('message', encodeURIComponent(responseData.message))
                callbackUrl.searchParams.set('session_token', sessionToken)
                callbackUrl.searchParams.set('user_data', encodeURIComponent(JSON.stringify(responseData.user)))
                callbackUrl.searchParams.set('oauth_data', encodeURIComponent(JSON.stringify(responseData.oauth_data)))

                return res.redirect(callbackUrl.toString())
            }

            return res.status(200).json(responseData)
        }

        // User not found - different behavior for login vs registration
        if (isLoginIntent) {
            // This is a login attempt but user doesn't exist
            console.error('❌ [LOGIN] Google account not found:', {
                email: googleUserInfo.email,
                message: 'このGoogleアカウントはまだ登録されていません',
            })

            const userAgent = req.headers['user-agent'] || ''
            const isWebRequest = userAgent.includes('Mozilla')

            const responseData = {
                success: false,
                message: AUTH_MESSAGES.GOOGLE_ACCOUNT_NOT_REGISTERED,
                error_code: 'ACCOUNT_NOT_FOUND',
                suggested_action: 'register',
            }

            if (isWebRequest) {
                const callbackUrl = new URL('/auth/callback', process.env.FRONTEND_URL || 'http://localhost:3001')
                callbackUrl.searchParams.set('error', 'true')
                callbackUrl.searchParams.set('message', encodeURIComponent(responseData.message))
                callbackUrl.searchParams.set('error_code', responseData.error_code)
                callbackUrl.searchParams.set('suggested_action', 'register')

                return res.redirect(callbackUrl.toString())
            }

            return res.status(404).json(responseData)
        }

        // New user registration flow
        const tempUserId = `temp_${crypto.randomBytes(16).toString('hex')}`

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

        const githubOAuthUrl = githubOAuthService.generateGitHubOAuthUrl(tempUserId)
        const userAgent = req.headers['user-agent'] || ''
        const isWebRequest = userAgent.includes('Mozilla')

        const responseData = {
            success: true,
            message: AUTH_MESSAGES.GOOGLE_REGISTRATION_START,
            is_new_user: true,
            next_step: 'redirect_to_github_oauth',
            temp_session_token: tempUserId,
            github_oauth_url: githubOAuthUrl,
            google_data: {
                google_id: googleUserInfo.id,
                name: googleUserInfo.name,
                email: googleUserInfo.email,
                picture: googleUserInfo.picture,
            },
        }

        if (isWebRequest) {
            const callbackUrl = new URL('/auth/callback', process.env.FRONTEND_URL || 'http://localhost:3001')
            callbackUrl.searchParams.set('google_success', 'true')
            callbackUrl.searchParams.set('message', encodeURIComponent(responseData.message))
            callbackUrl.searchParams.set('temp_session_token', tempUserId)
            callbackUrl.searchParams.set('github_oauth_url', encodeURIComponent(githubOAuthUrl))
            callbackUrl.searchParams.set('google_data', encodeURIComponent(JSON.stringify(responseData.google_data)))

            return res.redirect(callbackUrl.toString())
        }

        return res.status(200).json(responseData)
    } catch (error) {
        console.error('❌ [GOOGLE] OAuth callback error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : null,
        })

        return res.status(500).json({
            success: false,
            message: AUTH_MESSAGES.GOOGLE_OAUTH_PROCESSING_ERROR,
            error_code: 'OAUTH_PROCESSING_ERROR',
        })
    }
})

// GET /api/auth/github/callback
export const githubOAuthCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error } = req.query

    if (error) {
        console.error('❌ [GITHUB] OAuth error received', { error })
        return res.status(400).json({
            success: false,
            message: `${AUTH_MESSAGES.OAUTH_ERROR}: ${error}`,
            error_code: 'OAUTH_ERROR',
        })
    }

    if (!code || !state) {
        console.error('❌ [GITHUB] Missing OAuth parameters', { hasCode: !!code, hasState: !!state })
        return res.status(400).json({
            success: false,
            message: AUTH_MESSAGES.INVALID_REQUEST_PARAMETERS,
            error_code: 'MISSING_OAUTH_PARAMS',
        })
    }

    try {
        const stateValue = state as string
        const isLoginIntent = stateValue.startsWith('login_')

        const githubTokens = await githubOAuthService.exchangeCodeForTokens(code as string)
        const githubUserInfo = await githubOAuthService.getUserInfo(githubTokens.access_token)

        if (isLoginIntent) {
            // This is a GitHub login attempt
            // Find user by GitHub ID
            const existingUser = await userModel.findByGithubId(githubUserInfo.id.toString())

            if (!existingUser) {
                console.error('❌ [LOGIN] GitHub account not found:', {
                    github_id: githubUserInfo.id,
                    username: githubUserInfo.login,
                })

                const userAgent = req.headers['user-agent'] || ''
                const isWebRequest = userAgent.includes('Mozilla')

                const responseData = {
                    success: false,
                    message: AUTH_MESSAGES.GITHUB_ACCOUNT_NOT_REGISTERED,
                    error_code: 'ACCOUNT_NOT_FOUND',
                    suggested_action: 'register',
                }

                if (isWebRequest) {
                    const callbackUrl = new URL('/auth/callback', process.env.FRONTEND_URL || 'http://localhost:3001')
                    callbackUrl.searchParams.set('error', 'true')
                    callbackUrl.searchParams.set('message', encodeURIComponent(responseData.message))
                    callbackUrl.searchParams.set('error_code', responseData.error_code)
                    callbackUrl.searchParams.set('suggested_action', 'register')

                    return res.redirect(callbackUrl.toString())
                }

                return res.status(404).json(responseData)
            }

            // User found - login successful
            await userModel.updateGitHubOAuthTokens(existingUser.user_id, {
                access_token: githubTokens.access_token,
                github_user_id: githubUserInfo.id,
                github_username: githubUserInfo.login,
            })

            const sessionToken = authTokenService.generateFullSessionToken(existingUser.user_id, existingUser.user_name)

            let userEmail = githubUserInfo.email
            if (!userEmail) {
                const emails = await githubOAuthService.getUserEmails(githubTokens.access_token)
                const primaryEmail = emails.find((email) => email.primary && email.verified)
                userEmail = primaryEmail?.email || ''
            }

            console.log('✅ [AUTH] GitHub login completed', {
                user_id: existingUser.user_id,
                email: existingUser.email,
                github_username: githubUserInfo.login,
            })

            // Auto-sync user data after successful GitHub login
            setTimeout(async () => {
                try {
                    await dataSyncService.syncUserData(existingUser.user_id)
                } catch (syncError) {
                    console.error('❌ [SYNC] Failed to sync user data after GitHub login:', syncError)
                }
            }, 1000) // Delay 1 second to not block the response

            const userAgent = req.headers['user-agent'] || ''
            const isWebRequest = userAgent.includes('Mozilla')

            const responseData = {
                success: true,
                message: AUTH_MESSAGES.GITHUB_LOGIN_SUCCESS,
                session_token: sessionToken,
                user: {
                    user_id: existingUser.user_id,
                    user_name: existingUser.user_name,
                    user_icon: existingUser.user_icon,
                    email: existingUser.email,
                },
                oauth_data: {
                    google: {
                        google_id: '', // Not stored in DB, would need separate call to get
                        name: existingUser.user_name,
                        email: existingUser.email,
                        picture: existingUser.user_icon,
                        connected: !!existingUser.google_access_token,
                        has_refresh_token: !!existingUser.google_refresh_token,
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
            }

            if (isWebRequest) {
                const callbackUrl = new URL('/auth/callback', process.env.FRONTEND_URL || 'http://localhost:3001')
                callbackUrl.searchParams.set('success', 'true')
                callbackUrl.searchParams.set('message', encodeURIComponent(responseData.message))
                callbackUrl.searchParams.set('session_token', sessionToken)
                callbackUrl.searchParams.set('user_data', encodeURIComponent(JSON.stringify(responseData.user)))
                callbackUrl.searchParams.set('oauth_data', encodeURIComponent(JSON.stringify(responseData.oauth_data)))

                return res.redirect(callbackUrl.toString())
            }

            return res.status(200).json(responseData)
        }

        // Registration flow (existing logic)
        const tempUserId = stateValue

        // Check if GitHub account is already linked to another user
        const isGitHubLinked = await userModel.checkGithubIdExists(githubUserInfo.id.toString())
        if (isGitHubLinked) {
            return res.status(400).json({
                success: false,
                message:
                    'このGitHubアカウントは既に他のユーザーと連携されています。別のGitHubアカウントをお使いください。',
                error_code: 'GITHUB_ACCOUNT_ALREADY_LINKED',
            })
        }

        let userEmail = githubUserInfo.email
        if (!userEmail) {
            const emails = await githubOAuthService.getUserEmails(githubTokens.access_token)
            const primaryEmail = emails.find((email) => email.primary && email.verified)
            userEmail = primaryEmail?.email || ''
        }
        const userRepos = await githubOAuthService.getUserRepos(githubTokens.access_token, 5)
        const googleOAuthData = tempOAuthStorage.getAndRemoveGoogleOAuth(tempUserId)

        if (!googleOAuthData) {
            console.error('❌ [GITHUB] Google OAuth data not found:', {
                temp_user_id: tempUserId,
                possibleCause: 'Expired session, data already used, or state mismatch',
            })
            return res.status(400).json({
                success: false,
                message: AUTH_MESSAGES.GOOGLE_OAUTH_DATA_NOT_FOUND,
                error_code: 'GOOGLE_OAUTH_DATA_MISSING',
            })
        }

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

        await missionModel.initializeUserMissions(newUserId)

        const fullSessionToken = authTokenService.generateFullSessionToken(
            newUserId,
            googleOAuthData.google_user_info.name
        )

        console.log('✅ [AUTH] Registration completed', {
            user_id: newUserId,
            user_name: googleOAuthData.google_user_info.name,
            email: googleOAuthData.google_user_info.email,
        })

        // Auto-sync user data after successful registration
        setTimeout(async () => {
            try {
                await dataSyncService.syncUserData(newUserId)
            } catch (syncError) {
                console.error('❌ [SYNC] Failed to sync user data after registration:', syncError)
            }
        }, 1000) // Delay 1 second to not block the response

        const userAgent = req.headers['user-agent'] || ''
        const isWebRequest = userAgent.includes('Mozilla') && !userAgent.includes('Mobile')

        const responseData = {
            success: true,
            message: AUTH_MESSAGES.REGISTRATION_COMPLETE,
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
                    has_refresh_token: !!googleOAuthData.google_oauth.refresh_token,
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
            },
        }

        if (isWebRequest) {
            const callbackUrl = new URL('/auth/callback', process.env.FRONTEND_URL || 'http://localhost:3001')
            callbackUrl.searchParams.set('success', 'true')
            callbackUrl.searchParams.set('message', encodeURIComponent(responseData.message))
            callbackUrl.searchParams.set('session_token', fullSessionToken)
            callbackUrl.searchParams.set('user_data', encodeURIComponent(JSON.stringify(responseData.user)))
            callbackUrl.searchParams.set('oauth_data', encodeURIComponent(JSON.stringify(responseData.oauth_data)))

            return res.redirect(callbackUrl.toString())
        }

        return res.status(200).json(responseData)
    } catch (error) {
        console.error('❌ [AUTH] OAuth callback error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : null,
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
            message: AUTH_MESSAGES.GITHUB_OAUTH_PROCESSING_ERROR,
            error_code: 'OAUTH_PROCESSING_ERROR',
        })
    }
})

// NEW: GET /api/auth/google - Initiate Google OAuth directly
export const initiateGoogleOAuth = asyncHandler(async (req: Request, res: Response) => {
    try {
        const state = crypto.randomBytes(32).toString('hex')

        const googleOAuthUrl =
            `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback')}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent('openid email profile https://www.googleapis.com/auth/fitness.activity.read')}&` +
            `state=${state}&` +
            `access_type=offline&` +
            `prompt=consent`

        return res.status(200).json({
            success: true,
            message: API_MESSAGES.GOOGLE_OAUTH_URL_GENERATED,
            google_oauth_url: googleOAuthUrl,
            state: state,
            next_step: 'redirect_to_google_oauth',
        })
    } catch (error) {
        console.error('❌ [GOOGLE] Failed to initiate OAuth:', error)
        return res.status(500).json({
            success: false,
            message: API_MESSAGES.OAUTH_INITIATION_FAILED,
            error_code: 'OAUTH_INIT_FAILED',
        })
    }
})

export const getTokenReport = asyncHandler(async (req: Request, res: Response) => {
    try {
        const report = await googleTokenRefreshService.getTokenExpiryReport()

        return res.status(200).json({
            success: true,
            message: API_MESSAGES.TOKEN_EXPIRY_REPORT_GENERATED,
            data: report,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('❌ [ADMIN] Failed to get token report:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to generate token report',
            error_code: 'TOKEN_REPORT_FAILED',
        })
    }
})

export const refreshAllTokens = asyncHandler(async (req: Request, res: Response) => {
    try {
        const result = await googleTokenRefreshService.refreshAllTokens()

        return res.status(200).json({
            success: true,
            message: 'Manual token refresh completed',
            data: result,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('❌ [ADMIN] Failed to refresh all tokens:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to refresh tokens',
            error_code: 'TOKEN_REFRESH_FAILED',
        })
    }
})

// NEW: Login endpoints (different from registration flow)

// GET /api/auth/login/google - Google login for existing users
export const loginWithGoogle = asyncHandler(async (req: Request, res: Response) => {
    try {
        const state = crypto.randomBytes(32).toString('hex')

        // Store login intent in state to differentiate from registration
        const loginState = `login_${state}`

        const googleOAuthUrl =
            `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback')}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent('openid email profile https://www.googleapis.com/auth/fitness.activity.read')}&` +
            `state=${loginState}&` +
            `access_type=offline&` +
            `prompt=consent`

        return res.status(200).json({
            success: true,
            message: 'Google login URL generated successfully',
            google_oauth_url: googleOAuthUrl,
            state: loginState,
            intent: 'login',
        })
    } catch (error) {
        console.error('❌ [LOGIN-GOOGLE] Failed to initiate OAuth:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to initiate Google login',
            error_code: 'LOGIN_INIT_FAILED',
        })
    }
})

// GET /api/auth/login/github - GitHub login for existing users
export const loginWithGitHub = asyncHandler(async (req: Request, res: Response) => {
    try {
        const state = crypto.randomBytes(32).toString('hex')

        // Store login intent in state to differentiate from registration
        const loginState = `login_${state}`

        const githubOAuthUrl =
            `https://github.com/login/oauth/authorize?` +
            `client_id=${process.env.GITHUB_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback')}&` +
            `scope=user:email,read:user&` +
            `state=${loginState}&` +
            `allow_signup=false&` + // Prevent new registrations during login
            `_=${Date.now()}` // Cache buster to force fresh request

        return res.status(200).json({
            success: true,
            message: 'GitHub login URL generated successfully',
            github_oauth_url: githubOAuthUrl,
            state: loginState,
            intent: 'login',
        })
    } catch (error) {
        console.error('❌ [LOGIN-GITHUB] Failed to initiate OAuth:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to initiate GitHub login',
            error_code: 'LOGIN_INIT_FAILED',
        })
    }
})
