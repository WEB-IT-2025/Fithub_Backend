'use client'

import { useEffect, useState } from 'react'

import { useSearchParams } from 'next/navigation'

interface User {
    id: string
    username: string
    email: string
    display_name?: string
    profile_image?: string
    [key: string]: string | number | boolean | undefined | null | object
}

export default function AuthCallbackPage() {
    const searchParams = useSearchParams()
    const [result, setResult] = useState<{
        success: boolean
        message: string
        session_token?: string
        user?: User // Changed from any to User interface
        oauth_data?: string
        // Google OAuth intermediate result fields
        is_new_user?: boolean
        next_step?: string
        temp_session_token?: string
        github_oauth_url?: string
        google_data?: {
            google_id: string
            name: string
            email: string
            picture: string
        }
        // Error cases
        error_code?: string
        suggested_action?: string
    } | null>(null)

    useEffect(() => {
        try {
            // Get URL parameters
            const success = searchParams.get('success') === 'true'
            const error = searchParams.get('error') === 'true'
            const googleSuccess = searchParams.get('google_success') === 'true'
            const message = searchParams.get('message') ? decodeURIComponent(searchParams.get('message')!) : ''
            const sessionToken = searchParams.get('session_token')
            const userData = searchParams.get('user_data')
            const oauthData = searchParams.get('oauth_data')

            // Google OAuth intermediate result (new user)
            const tempSessionToken = searchParams.get('temp_session_token')
            const githubOAuthUrl = searchParams.get('github_oauth_url')
            const googleData = searchParams.get('google_data')

            // Error cases
            const errorCode = searchParams.get('error_code')
            const suggestedAction = searchParams.get('suggested_action')

            let result
            let messageType = 'AUTH_ERROR'

            if (googleSuccess && tempSessionToken && githubOAuthUrl) {
                messageType = 'GOOGLE_OAUTH_SUCCESS'
                result = {
                    success: true,
                    message,
                    is_new_user: true,
                    next_step: 'redirect_to_github_oauth',
                    temp_session_token: tempSessionToken,
                    github_oauth_url: decodeURIComponent(githubOAuthUrl),
                    google_data: googleData ? JSON.parse(decodeURIComponent(googleData)) : undefined,
                }
            } else if (success && sessionToken && userData && oauthData) {
                // This is final result (login or registration complete)
                let parsedUserData, parsedOAuthData
                try {
                    parsedUserData = JSON.parse(decodeURIComponent(userData))
                    parsedOAuthData = JSON.parse(decodeURIComponent(oauthData))
                } catch (parseError) {
                    console.error('❌ [CALLBACK] Failed to parse user/oauth data:', parseError)
                    return
                }

                // Determine if this was Google or GitHub login/registration
                const isNewUser = message.includes('アカウント作成') || message.includes('ようこそ')
                const isExistingUser =
                    message.includes('既に登録されています') || message.includes('自動的にログインしました')
                const isGoogleAuth = message.includes('Google')
                const isGitHubAuth = message.includes('GitHub') || message.includes('GitHubアカウント')

                if (isNewUser) {
                    messageType = 'GITHUB_OAUTH_SUCCESS' // Registration completion after GitHub
                } else if (isExistingUser && isGoogleAuth) {
                    messageType = 'GOOGLE_EXISTING_USER' // Existing user tried to register
                } else if (isExistingUser && isGitHubAuth) {
                    messageType = 'GITHUB_EXISTING_USER' // Existing user tried to register
                } else if (isGoogleAuth) {
                    messageType = 'GOOGLE_LOGIN_SUCCESS'
                } else if (isGitHubAuth) {
                    messageType = 'GITHUB_LOGIN_SUCCESS'
                } else {
                    messageType = 'AUTH_SUCCESS' // Generic success
                }

                result = {
                    success,
                    message,
                    session_token: sessionToken,
                    user: parsedUserData, // Change from user_data to user
                    oauth_data: parsedOAuthData,
                }
            } else if (error || !success) {
                // Error case
                messageType = 'AUTH_ERROR'

                // Determine specific error type
                if (message.includes('Google')) {
                    messageType = 'GOOGLE_OAUTH_ERROR'
                } else if (message.includes('GitHub')) {
                    messageType = 'GITHUB_OAUTH_ERROR'
                }

                result = {
                    success: false,
                    message,
                    error_code: errorCode || undefined,
                    suggested_action: suggestedAction || undefined,
                }
            } else {
                // Unknown case
                result = {
                    success: false,
                    message: message || 'Unknown authentication result',
                }
            }

            setResult(result)

            // Post message to parent window (popup opener)
            if (window.opener) {
                if (messageType === 'GOOGLE_OAUTH_SUCCESS') {
                    // Google OAuth intermediate result - pass data for GitHub redirect
                    window.opener.postMessage(
                        {
                            type: 'GOOGLE_OAUTH_SUCCESS',
                            temp_token: result.temp_session_token,
                            github_oauth_url: result.github_oauth_url,
                            google_data: result.google_data,
                        },
                        '*'
                    )
                } else if (messageType === 'GITHUB_OAUTH_SUCCESS') {
                    // Registration complete
                    window.opener.postMessage(
                        {
                            type: 'GITHUB_OAUTH_SUCCESS',
                            result: result,
                        },
                        '*'
                    )
                } else if (messageType === 'GOOGLE_LOGIN_SUCCESS') {
                    // Google login complete
                    window.opener.postMessage(
                        {
                            type: 'GOOGLE_LOGIN_SUCCESS',
                            result: result,
                        },
                        '*'
                    )
                } else if (messageType === 'GITHUB_LOGIN_SUCCESS') {
                    // GitHub login complete
                    window.opener.postMessage(
                        {
                            type: 'GITHUB_LOGIN_SUCCESS',
                            result: result,
                        },
                        '*'
                    )
                } else if (messageType === 'GOOGLE_EXISTING_USER') {
                    // Google existing user auto-login
                    window.opener.postMessage(
                        {
                            type: 'GOOGLE_EXISTING_USER',
                            result: result,
                        },
                        '*'
                    )
                } else if (messageType === 'GITHUB_EXISTING_USER') {
                    // GitHub existing user auto-login
                    window.opener.postMessage(
                        {
                            type: 'GITHUB_EXISTING_USER',
                            result: result,
                        },
                        '*'
                    )
                } else if (messageType.includes('ERROR')) {
                    // Error cases
                    window.opener.postMessage(
                        {
                            type: messageType,
                            error: result.message,
                            error_code: result.error_code,
                            suggested_action: result.suggested_action,
                        },
                        '*'
                    )
                } else {
                    // Fallback
                    window.opener.postMessage(
                        {
                            type: 'AUTH_ERROR',
                            error: result.message || 'Unknown error',
                        },
                        '*'
                    )
                }

                // Auto-close popup after posting message
                setTimeout(() => {
                    window.close()
                }, 1500)
            } else {
                console.error('❌ [CALLBACK] No window.opener found - cannot send message to parent')
            }
        } catch (callbackError) {
            console.error('❌ [CALLBACK] Error in callback processing:', callbackError)
            console.error(
                '❌ [CALLBACK] Error stack:',
                callbackError instanceof Error ? callbackError.stack : 'No stack trace'
            )

            // Try to send error message to parent if possible
            if (window.opener) {
                try {
                    window.opener.postMessage(
                        {
                            type: 'AUTH_ERROR',
                            error:
                                'Callback processing error: ' +
                                (callbackError instanceof Error ? callbackError.message : String(callbackError)),
                        },
                        '*'
                    )
                } catch (postMessageError) {
                    console.error('❌ [CALLBACK] Failed to send error message to parent:', postMessageError)
                }
            }
        }
    }, [searchParams])

    if (!result) {
        return (
            <div className='min-h-screen flex items-center justify-center bg-gray-50'>
                <div className='text-center'>
                    <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto'></div>
                    <p className='mt-4 text-lg text-gray-600'>Processing authentication...</p>
                </div>
            </div>
        )
    }

    return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50'>
            <div className='max-w-md w-full bg-white rounded-lg shadow-md p-6'>
                <div className='text-center'>
                    {result.success ?
                        <div>
                            <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100'>
                                <svg
                                    className='h-6 w-6 text-green-600'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth='2'
                                        d='M5 13l4 4L19 7'
                                    />
                                </svg>
                            </div>
                            <h3 className='mt-4 text-lg font-medium text-gray-900'>Authentication Successful!</h3>
                            <p className='mt-2 text-sm text-gray-600'>{result.message}</p>
                            {result.is_new_user && (
                                <p className='mt-2 text-xs text-blue-600'>Redirecting to GitHub for account setup...</p>
                            )}
                        </div>
                    :   <div>
                            <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100'>
                                <svg
                                    className='h-6 w-6 text-red-600'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth='2'
                                        d='M6 18L18 6M6 6l12 12'
                                    />
                                </svg>
                            </div>
                            <h3 className='mt-4 text-lg font-medium text-gray-900'>Authentication Failed</h3>
                            <p className='mt-2 text-sm text-gray-600'>{result.message}</p>
                        </div>
                    }

                    <p className='mt-4 text-xs text-gray-500'>This window will close automatically...</p>
                </div>
            </div>
        </div>
    )
}
