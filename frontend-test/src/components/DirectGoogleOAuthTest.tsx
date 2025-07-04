'use client'

import { useState } from 'react'

interface User {
    user_id: string
    user_name: string
    user_icon: string
    email: string
}

interface OAuthData {
    google: {
        google_id: string
        name: string
        email: string
        picture: string
        connected: boolean
        has_refresh_token?: boolean
    }
    github: {
        github_id: number
        username: string
        name: string
        email: string
        avatar_url: string
        public_repos: number
        followers: number
        connected: boolean
    }
}

export default function DirectGoogleOAuthTest() {
    const [isLoading, setIsLoading] = useState(false)
    const [authResult, setAuthResult] = useState<{
        success: boolean
        message: string
        session_token?: string
        user?: User
        oauth_data?: OAuthData
        is_new_user?: boolean
    } | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleDirectGoogleOAuth = async () => {
        setIsLoading(true)
        setError(null)
        setAuthResult(null)

        try {
            // Step 1: Get Google OAuth URL from backend
            const response = await fetch('http://localhost:3000/api/auth/google', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`Failed to get OAuth URL: ${response.statusText}`)
            }

            const data = await response.json()

            if (!data.success) {
                throw new Error(data.message || 'Failed to initiate Google OAuth')
            }

            console.log('🔗 [FRONTEND] Google OAuth URL received:', data.google_oauth_url)

            // Step 2: Open popup for Google OAuth
            const popup = window.open(
                data.google_oauth_url,
                'google-oauth',
                'width=500,height=600,scrollbars=yes,resizable=yes'
            )

            if (!popup) {
                throw new Error('Popup blocked! Please allow popups for this site.')
            }

            // Step 3: Listen for popup completion
            const pollPopup = () => {
                try {
                    // Check if popup is closed
                    if (popup.closed) {
                        setIsLoading(false)
                        setError('Authentication cancelled by user')
                        return
                    }

                    // Try to read popup URL (will work after OAuth redirect)
                    const popupUrl = popup.location.href

                    // Check if we're on the callback page with success
                    if (popupUrl.includes('/auth/callback') && popupUrl.includes('success=true')) {
                        const urlParams = new URLSearchParams(popup.location.search)

                        const success = urlParams.get('success') === 'true'
                        const message = decodeURIComponent(urlParams.get('message') || '')
                        const sessionToken = urlParams.get('session_token') || ''
                        const userData = urlParams.get('user_data')
                        const oauthData = urlParams.get('oauth_data')

                        popup.close()

                        const result = {
                            success,
                            message,
                            session_token: sessionToken,
                            user: userData ? JSON.parse(decodeURIComponent(userData)) : undefined,
                            oauth_data: oauthData ? JSON.parse(decodeURIComponent(oauthData)) : undefined,
                            is_new_user: true, // Since we went through the full flow
                        }

                        setAuthResult(result)
                        setIsLoading(false)

                        console.log('✅ [FRONTEND] Authentication completed:', result)
                        return
                    }

                    // Continue polling
                    setTimeout(pollPopup, 1000)
                } catch {
                    // This is expected when popup is on different domain
                    // Continue polling
                    setTimeout(pollPopup, 1000)
                }
            }

            // Start polling
            pollPopup()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred')
            setIsLoading(false)
        }
    }

    return (
        <div className='bg-white rounded-lg shadow-sm p-6'>
            <h2 className='text-xl font-semibold mb-4'>🚀 Direct Google OAuth Test</h2>
            <p className='text-gray-600 mb-4'>
                Test the new simplified authentication flow: Google OAuth → GitHub OAuth (no Firebase login)
            </p>

            <button
                onClick={handleDirectGoogleOAuth}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                    isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                }`}
            >
                {isLoading ? '🔄 Authenticating...' : '🔗 Start Direct Google OAuth'}
            </button>

            {error && (
                <div className='mt-4 p-4 bg-red-50 border border-red-200 rounded-lg'>
                    <h3 className='font-medium text-red-800'>Error</h3>
                    <p className='text-red-600 text-sm'>{error}</p>
                </div>
            )}

            {authResult && (
                <div className='mt-4 p-4 bg-green-50 border border-green-200 rounded-lg'>
                    <h3 className='font-medium text-green-800'>Authentication Result</h3>
                    <div className='mt-2 space-y-2 text-sm'>
                        <div>
                            <strong>Success:</strong> {authResult.success ? '✅ Yes' : '❌ No'}
                        </div>
                        <div>
                            <strong>Message:</strong> {authResult.message}
                        </div>
                        {authResult.is_new_user !== undefined && (
                            <div>
                                <strong>New User:</strong> {authResult.is_new_user ? '👤 Yes' : '🔄 Existing'}
                            </div>
                        )}
                        {authResult.session_token && (
                            <div>
                                <strong>Session Token:</strong>
                                <code className='ml-2 px-2 py-1 bg-gray-100 rounded text-xs'>
                                    {authResult.session_token.substring(0, 20)}...
                                </code>
                            </div>
                        )}
                        {authResult.user && (
                            <div>
                                <strong>User:</strong>
                                <pre className='mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto'>
                                    {JSON.stringify(authResult.user, null, 2)}
                                </pre>
                            </div>
                        )}
                        {authResult.oauth_data && (
                            <div>
                                <strong>OAuth Data:</strong>
                                <div className='mt-1 space-y-1'>
                                    <div className='text-xs'>
                                        <strong>Google:</strong> {authResult.oauth_data.google.connected ? '✅' : '❌'}
                                        {authResult.oauth_data.google.has_refresh_token ?
                                            ' 🔄 Has Refresh Token'
                                        :   ' ⚠️ No Refresh Token'}
                                    </div>
                                    <div className='text-xs'>
                                        <strong>GitHub:</strong> {authResult.oauth_data.github.connected ? '✅' : '❌'}(
                                        {authResult.oauth_data.github.public_repos} repos)
                                    </div>
                                </div>
                                <details className='mt-2'>
                                    <summary className='text-xs cursor-pointer'>View Full OAuth Data</summary>
                                    <pre className='mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto'>
                                        {JSON.stringify(authResult.oauth_data, null, 2)}
                                    </pre>
                                </details>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
