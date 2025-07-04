'use client'

import { useEffect, useState } from 'react'

import { useSearchParams } from 'next/navigation'

export default function AuthCallbackPage() {
    const searchParams = useSearchParams()
    const [result, setResult] = useState<{
        success: boolean
        message: string
        session_token?: string
        user_data?: string
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
    } | null>(null)

    useEffect(() => {
        // Get URL parameters
        const success = searchParams.get('success') === 'true'
        const googleSuccess = searchParams.get('google_success') === 'true'
        const message = searchParams.get('message') ? decodeURIComponent(searchParams.get('message')!) : ''
        const sessionToken = searchParams.get('session_token')
        const userData = searchParams.get('user_data')
        const oauthData = searchParams.get('oauth_data')

        // Google OAuth intermediate result (new user)
        const tempSessionToken = searchParams.get('temp_session_token')
        const githubOAuthUrl = searchParams.get('github_oauth_url')
        const googleData = searchParams.get('google_data')

        // 🔍 DEBUG: Log all parameters
        console.log('🔔 [CALLBACK] Processing callback with parameters:', {
            success,
            googleSuccess,
            message,
            sessionToken: sessionToken ? sessionToken.substring(0, 15) + '...' : null,
            userData: userData ? 'present' : null,
            oauthData: oauthData ? 'present' : null,
            tempSessionToken: tempSessionToken ? tempSessionToken.substring(0, 15) + '...' : null,
            githubOAuthUrl: githubOAuthUrl ? githubOAuthUrl.substring(0, 50) + '...' : null,
            googleData: googleData ? 'present' : null,
        })

        let result

        if (googleSuccess && tempSessionToken && githubOAuthUrl) {
            // This is Google OAuth success for new user - need to continue with GitHub
            console.log('🎯 [CALLBACK] Detected Google OAuth success for new user')
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
            // This is final result (existing user login or new user account creation)
            result = {
                success,
                message,
                session_token: sessionToken,
                user_data: userData,
                oauth_data: oauthData,
            }
        } else if (success) {
            // Success but missing some data - might be an error case
            result = {
                success,
                message,
                session_token: sessionToken || undefined,
                user_data: userData || undefined,
                oauth_data: oauthData || undefined,
            }
        } else {
            // Error case
            result = {
                success: false,
                message: message || 'Authentication failed',
            }
        }

        setResult(result)

        // Post message to parent window (popup opener)
        if (window.opener) {
            console.log('🔔 [CALLBACK] Posting message to parent window:', {
                hasOpener: !!window.opener,
                googleSuccess,
                success,
                messageType:
                    googleSuccess ? 'GOOGLE_OAUTH_SUCCESS'
                    : success ? 'AUTH_SUCCESS'
                    : 'AUTH_ERROR',
            })

            if (googleSuccess) {
                // Google OAuth intermediate result
                console.log('📤 [CALLBACK] Sending GOOGLE_OAUTH_SUCCESS message:', result)
                window.opener.postMessage(
                    {
                        type: 'GOOGLE_OAUTH_SUCCESS',
                        data: result,
                    },
                    '*'
                )
            } else {
                // Final auth result
                console.log('📤 [CALLBACK] Sending AUTH result message:', result)
                window.opener.postMessage(
                    {
                        type: success ? 'AUTH_SUCCESS' : 'AUTH_ERROR',
                        data: result,
                        error: success ? null : message,
                    },
                    '*'
                )
            }

            // Auto-close popup after posting message
            setTimeout(() => {
                console.log('🔒 [CALLBACK] Auto-closing popup window')
                window.close()
            }, 1000)
        } else {
            console.error('❌ [CALLBACK] No window.opener found - cannot send message to parent')
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
                        <>
                            <div className='text-6xl mb-4'>🎉</div>
                            <h1 className='text-2xl font-bold text-green-600 mb-2'>Authentication Successful!</h1>
                            <p className='text-gray-600 mb-4'>{result.message}</p>
                            <div className='text-sm text-gray-500'>
                                <p>This window will close automatically...</p>
                                <p>If not, you can close it manually.</p>
                            </div>
                        </>
                    :   <>
                            <div className='text-6xl mb-4'>❌</div>
                            <h1 className='text-2xl font-bold text-red-600 mb-2'>Authentication Failed</h1>
                            <p className='text-gray-600 mb-4'>{result.message}</p>
                            <button
                                onClick={() => window.close()}
                                className='px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700'
                            >
                                Close Window
                            </button>
                        </>
                    }
                </div>

                {/* Debug Information */}
                <details className='mt-6'>
                    <summary className='cursor-pointer text-sm text-gray-500'>Debug Information</summary>
                    <pre className='mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto'>
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </details>
            </div>
        </div>
    )
}
