'use client'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

export default function OAuthCallbackPage() {
    const router = useRouter()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('')

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get URL parameters
                const urlParams = new URLSearchParams(window.location.search)
                const success = urlParams.get('success')
                const error = urlParams.get('error')
                const message = urlParams.get('message')

                if (error) {
                    setStatus('error')
                    setMessage(decodeURIComponent(error))

                    // Send error to parent window if in popup
                    if (typeof window !== 'undefined' && window.opener) {
                        window.opener.postMessage(
                            {
                                type: 'AUTH_ERROR',
                                error: decodeURIComponent(error),
                            },
                            '*'
                        )
                        window.close()
                        return
                    }
                    return
                }

                if (success === 'true') {
                    setStatus('success')
                    setMessage(message ? decodeURIComponent(message) : 'Authentication successful!')

                    // Extract additional data from URL
                    const sessionToken = urlParams.get('session_token')
                    const tempSessionToken = urlParams.get('temp_session_token')
                    const githubOauthUrl = urlParams.get('github_oauth_url')
                    const nextStep = urlParams.get('next_step')
                    const userData = urlParams.get('user_data')
                    const oauthData = urlParams.get('oauth_data')

                    // Parse complex data
                    let parsedUserData = null
                    let parsedOauthData = null

                    try {
                        if (userData) {
                            parsedUserData = JSON.parse(decodeURIComponent(userData))
                        }
                        if (oauthData) {
                            parsedOauthData = JSON.parse(decodeURIComponent(oauthData))
                        }
                    } catch (parseError) {
                        console.error('Failed to parse URL data:', parseError)
                    }

                    // Close popup if this is running in a popup
                    if (typeof window !== 'undefined' && window.opener) {
                        const authResult = {
                            success: true,
                            message: message ? decodeURIComponent(message) : 'Authentication successful!',
                            ...(sessionToken && { session_token: sessionToken }),
                            ...(tempSessionToken && { temp_session_token: tempSessionToken }),
                            ...(githubOauthUrl && { github_oauth_url: decodeURIComponent(githubOauthUrl) }),
                            ...(nextStep && { next_step: nextStep }),
                            ...(parsedUserData && { user: parsedUserData }),
                            ...(parsedOauthData && { oauth_data: parsedOauthData }),
                        }

                        window.opener.postMessage(
                            {
                                type: 'AUTH_SUCCESS',
                                data: authResult,
                            },
                            '*'
                        )

                        // Small delay to ensure postMessage is sent before closing
                        setTimeout(() => {
                            window.close()
                        }, 100)
                        return
                    }

                    // Redirect to home page after 2 seconds
                    setTimeout(() => {
                        router.push('/')
                    }, 2000)
                } else {
                    setStatus('error')
                    setMessage('Authentication failed')

                    // Send error to parent window if in popup
                    if (typeof window !== 'undefined' && window.opener) {
                        window.opener.postMessage(
                            {
                                type: 'AUTH_ERROR',
                                error: 'Authentication failed',
                            },
                            '*'
                        )
                        window.close()
                        return
                    }
                }
            } catch (err) {
                setStatus('error')
                setMessage('An unexpected error occurred')
                console.error('OAuth callback error:', err)
            }
        }

        handleCallback()
    }, [router])

    const getStatusColor = () => {
        switch (status) {
            case 'loading':
                return 'border-blue-200 bg-blue-50 text-blue-800'
            case 'success':
                return 'border-green-200 bg-green-50 text-green-800'
            case 'error':
                return 'border-red-200 bg-red-50 text-red-800'
        }
    }

    const getStatusIcon = () => {
        switch (status) {
            case 'loading':
                return (
                    <div className='w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' />
                )
            case 'success':
                return (
                    <div className='w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-lg'>
                        ✓
                    </div>
                )
            case 'error':
                return (
                    <div className='w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-lg'>
                        ✗
                    </div>
                )
        }
    }

    return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50 p-4'>
            <div className={`max-w-md w-full p-8 border rounded-lg text-center ${getStatusColor()}`}>
                <div className='flex justify-center mb-4'>{getStatusIcon()}</div>

                <h1 className='text-xl font-semibold mb-2'>
                    {status === 'loading' && 'Processing Authentication...'}
                    {status === 'success' && 'Authentication Successful!'}
                    {status === 'error' && 'Authentication Failed'}
                </h1>

                <p className='text-sm mb-4'>{message}</p>

                {status === 'success' && typeof window !== 'undefined' && !window.opener && (
                    <p className='text-xs opacity-75'>Redirecting to home page in 2 seconds...</p>
                )}

                {status === 'error' && typeof window !== 'undefined' && !window.opener && (
                    <button
                        onClick={() => router.push('/')}
                        className='px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700'
                    >
                        Go Back Home
                    </button>
                )}

                {typeof window !== 'undefined' && window.opener && (
                    <p className='text-xs opacity-75'>You can close this window now.</p>
                )}
            </div>
        </div>
    )
}
