'use client'

import { useState } from 'react'

interface FlowStep {
    step: number
    title: string
    status: 'pending' | 'loading' | 'success' | 'error'
    message?: string
    data?: Record<string, unknown>
}

interface AuthResult {
    success: boolean
    message: string
    session_token?: string
    user?: {
        user_id: string
        user_name: string
        user_icon: string
        email: string
    }
    oauth_data?: {
        google?: {
            google_id: string
            name: string
            email: string
            picture: string
            connected: boolean
            has_refresh_token?: boolean
        }
        github?: {
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
}

const API_BASE_URL = 'http://localhost:3000/api/auth'

export default function NewFlowOAuthTester({ onAuthSuccess }: { onAuthSuccess?: (result: AuthResult) => void }) {
    const [steps, setSteps] = useState<FlowStep[]>([
        { step: 1, title: 'Initiate Google OAuth', status: 'pending' },
        { step: 2, title: 'Google OAuth Callback', status: 'pending' },
        { step: 3, title: 'GitHub OAuth & Account Creation', status: 'pending' },
    ])
    const [isRunning, setIsRunning] = useState(false)
    const [finalResult, setFinalResult] = useState<AuthResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    const updateStep = (stepNumber: number, updates: Partial<FlowStep>) => {
        setSteps((prev) => prev.map((step) => (step.step === stepNumber ? { ...step, ...updates } : step)))
    }

    const resetFlow = () => {
        setSteps([
            { step: 1, title: 'Initiate Google OAuth', status: 'pending' },
            { step: 2, title: 'Google OAuth Callback', status: 'pending' },
            { step: 3, title: 'GitHub OAuth & Account Creation', status: 'pending' },
        ])
        setFinalResult(null)
        setError(null)
    }

    const testBackendConnection = async () => {
        try {
            console.log('🔍 [TEST] Testing backend connection...')
            const response = await fetch(`${API_BASE_URL}/google`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            })

            const data = await response.json()
            console.log('✅ [TEST] Backend response:', data)

            if (data.success) {
                alert('✅ Backend connection successful!')
            } else {
                alert('❌ Backend returned error: ' + data.message)
            }
        } catch (error) {
            console.error('❌ [TEST] Backend connection failed:', error)
            alert('❌ Backend connection failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
    }

    const startNewFlow = async () => {
        setIsRunning(true)
        setError(null)
        resetFlow()

        try {
            // Step 1: Initiate Google OAuth
            updateStep(1, { status: 'loading', message: 'Getting Google OAuth URL...' })

            const response = await fetch(`${API_BASE_URL}/google`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            })

            if (!response.ok) {
                throw new Error(`Failed to get OAuth URL: ${response.statusText}`)
            }

            const data = await response.json()

            if (!data.success) {
                throw new Error(data.message || 'Failed to initiate Google OAuth')
            }

            updateStep(1, {
                status: 'success',
                message: 'Google OAuth URL generated successfully',
                data: {
                    url: data.google_oauth_url.substring(0, 100) + '...',
                    state: data.state?.substring(0, 8) + '...',
                },
            })

            // Step 2: Open Google OAuth popup
            updateStep(2, { status: 'loading', message: 'Opening Google OAuth popup...' })

            console.log('🚀 [TESTER] About to open popup with URL:', data.google_oauth_url.substring(0, 150) + '...')

            const popup = window.open(
                data.google_oauth_url,
                'google-oauth',
                'width=500,height=600,scrollbars=yes,resizable=yes'
            )

            if (!popup) {
                throw new Error('Popup blocked! Please allow popups for this site.')
            }

            console.log('✅ [TESTER] Popup opened successfully, starting to monitor...')

            // Debug: Monitor popup URL changes
            let urlCheckCount = 0
            const monitorPopupUrl = () => {
                try {
                    urlCheckCount++
                    if (popup.closed) {
                        console.log('🔒 [TESTER] Popup was closed by user')
                        return
                    }

                    // Try to access popup URL (will throw error for cross-origin)
                    const popupUrl = popup.location?.href
                    console.log(`🔍 [TESTER] URL check #${urlCheckCount}: ${popupUrl?.substring(0, 100)}...`)
                } catch (e) {
                    // Expected for cross-origin URLs
                    if (urlCheckCount % 5 === 0) {
                        // Log every 5th check to reduce noise
                        console.log(`🔍 [TESTER] URL check #${urlCheckCount}: cross-origin (normal)`)
                    }
                }

                if (!popup.closed) {
                    setTimeout(monitorPopupUrl, 1000)
                }
            }

            monitorPopupUrl()

            // Monitor popup for Google OAuth result
            const googleResult = await new Promise<{
                success: boolean
                message: string
                is_new_user?: boolean
                next_step?: string
                github_oauth_url?: string
                temp_session_token?: string
                google_data?: {
                    google_id: string
                    name: string
                    email: string
                    picture: string
                }
                // Final result if existing user
                session_token?: string
                user?: {
                    user_id: string
                    user_name: string
                    user_icon: string
                    email: string
                }
                oauth_data?: {
                    google?: {
                        google_id: string
                        name: string
                        email: string
                        picture: string
                        connected: boolean
                        has_refresh_token?: boolean
                    }
                    github?: {
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
            }>((resolve, reject) => {
                // Listen for postMessage from popup (primary method)
                const messageHandler = (event: MessageEvent) => {
                    console.log('🔔 [POPUP] Message event received:', {
                        source: event.source === popup ? 'matching popup' : 'other source',
                        origin: event.origin,
                        type: event.data?.type,
                        data: event.data,
                    })

                    if (event.source !== popup) {
                        console.log('🚫 [POPUP] Ignoring message from non-matching source')
                        return
                    }

                    console.log('✅ [POPUP] Processing message from popup:', event.data)

                    if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
                        console.log('🎯 [POPUP] Received GOOGLE_OAUTH_SUCCESS')
                        window.removeEventListener('message', messageHandler)
                        popup.close()
                        resolve(event.data.data)
                    } else if (event.data.type === 'AUTH_SUCCESS') {
                        // Final auth success (existing user)
                        console.log('🎯 [POPUP] Received AUTH_SUCCESS')
                        window.removeEventListener('message', messageHandler)
                        popup.close()
                        resolve(event.data.data)
                    } else if (event.data.type === 'AUTH_ERROR') {
                        console.log('🎯 [POPUP] Received AUTH_ERROR')
                        window.removeEventListener('message', messageHandler)
                        popup.close()
                        reject(new Error(event.data.error))
                    } else {
                        console.log('❓ [POPUP] Unknown message type:', event.data.type)
                    }
                }

                window.addEventListener('message', messageHandler)

                // Fallback: URL polling (in case postMessage fails)
                const pollPopup = () => {
                    try {
                        if (popup.closed) {
                            window.removeEventListener('message', messageHandler)
                            reject(new Error('Popup closed by user'))
                            return
                        }

                        // Continue polling (cross-origin will cause exception, which is expected)
                        setTimeout(pollPopup, 1000)
                    } catch {
                        // Expected when popup is on different domain
                        setTimeout(pollPopup, 1000)
                    }
                }

                pollPopup()

                // Timeout after 5 minutes
                setTimeout(() => {
                    window.removeEventListener('message', messageHandler)
                    if (!popup.closed) {
                        popup.close()
                    }
                    reject(new Error('Google OAuth timeout'))
                }, 300000)
            })

            console.log('🔍 [DEBUG] Google OAuth result:', googleResult)

            // Check if this is existing user (has final session_token) or new user (needs GitHub OAuth)
            if (googleResult.session_token && googleResult.user && googleResult.oauth_data) {
                // Existing user - complete flow
                updateStep(2, {
                    status: 'success',
                    message: 'Existing user login completed',
                    data: {
                        email: googleResult.user.email,
                        userId: googleResult.user.user_id,
                        hasGoogleRefresh: googleResult.oauth_data.google?.has_refresh_token,
                        isExistingUser: true,
                    },
                })

                updateStep(3, {
                    status: 'success',
                    message: 'Login completed successfully',
                    data: {
                        skipGitHub: 'User already exists',
                        totalSteps: 2,
                    },
                })

                setFinalResult(googleResult as AuthResult)

                // Call success callback if provided
                if (onAuthSuccess) {
                    onAuthSuccess(googleResult as AuthResult)
                }
                return
            }

            // New user flow - continue with GitHub OAuth
            console.log('🔍 [DEBUG] Checking if new user needs GitHub OAuth:', {
                is_new_user: googleResult.is_new_user,
                has_github_url: !!googleResult.github_oauth_url,
                github_oauth_url: googleResult.github_oauth_url?.substring(0, 100) + '...',
                next_step: googleResult.next_step,
                temp_session_token: googleResult.temp_session_token?.substring(0, 15) + '...',
            })

            // Check if we have github_oauth_url (which indicates new user needs GitHub OAuth)
            if (!googleResult.github_oauth_url) {
                console.error('❌ [ERROR] Invalid Google OAuth response - missing github_oauth_url:', googleResult)
                throw new Error(
                    `Google OAuth completed but missing github_oauth_url for new user. Response: ${JSON.stringify({
                        is_new_user: googleResult.is_new_user,
                        next_step: googleResult.next_step,
                        has_github_url: !!googleResult.github_oauth_url,
                        message: googleResult.message,
                    })}`
                )
            }

            updateStep(2, {
                status: 'success',
                message: 'Google OAuth completed - redirecting to GitHub',
                data: {
                    email: googleResult.google_data?.email,
                    name: googleResult.google_data?.name,
                    tempToken: googleResult.temp_session_token?.substring(0, 15) + '...',
                    nextStep: 'GitHub OAuth',
                    githubUrl: googleResult.github_oauth_url.substring(0, 80) + '...',
                },
            })

            // Small delay to let UI update before opening GitHub popup
            await new Promise((resolve) => setTimeout(resolve, 500))

            // Step 3: GitHub OAuth
            updateStep(3, { status: 'loading', message: 'Opening GitHub OAuth popup...' })

            console.log('🔗 [DEBUG] About to open GitHub OAuth popup:', {
                url: googleResult.github_oauth_url,
                urlLength: googleResult.github_oauth_url.length,
                windowFeatures: 'width=500,height=600,scrollbars=yes,resizable=yes',
            })

            const githubPopup = window.open(
                googleResult.github_oauth_url,
                'github-oauth',
                'width=500,height=600,scrollbars=yes,resizable=yes'
            )

            if (!githubPopup) {
                console.error('❌ [ERROR] GitHub popup was blocked')
                throw new Error('GitHub popup blocked! Please allow popups for this site.')
            }

            console.log('✅ [DEBUG] GitHub popup opened successfully')

            // Monitor GitHub popup for final result
            const finalResult = await new Promise<AuthResult>((resolve, reject) => {
                // Listen for postMessage from popup (primary method)
                const messageHandler = (event: MessageEvent) => {
                    if (event.source !== githubPopup) return

                    console.log('🔔 [GITHUB] Received message:', event.data)

                    if (event.data.type === 'AUTH_SUCCESS') {
                        window.removeEventListener('message', messageHandler)
                        githubPopup.close()
                        resolve(event.data.data)
                    } else if (event.data.type === 'AUTH_ERROR') {
                        window.removeEventListener('message', messageHandler)
                        githubPopup.close()
                        reject(new Error(event.data.error))
                    }
                }

                window.addEventListener('message', messageHandler)

                // Fallback: URL polling (in case postMessage fails)
                const pollGithubPopup = () => {
                    try {
                        if (githubPopup.closed) {
                            window.removeEventListener('message', messageHandler)
                            reject(new Error('GitHub popup closed by user'))
                            return
                        }

                        // Continue polling (cross-origin will cause exception, which is expected)
                        setTimeout(pollGithubPopup, 1000)
                    } catch {
                        // Expected when popup is on different domain
                        setTimeout(pollGithubPopup, 1000)
                    }
                }

                pollGithubPopup()

                // Timeout after 5 minutes
                setTimeout(() => {
                    window.removeEventListener('message', messageHandler)
                    if (!githubPopup.closed) {
                        githubPopup.close()
                    }
                    reject(new Error('GitHub OAuth timeout'))
                }, 300000)
            })

            console.log('🎉 [DEBUG] GitHub OAuth final result:', finalResult)

            // Final step completed
            updateStep(3, {
                status: 'success',
                message: 'Account created successfully',
                data: {
                    userId: finalResult.user?.user_id,
                    userName: finalResult.user?.user_name,
                    email: finalResult.user?.email,
                    githubUsername: finalResult.oauth_data?.github?.username,
                    githubRepos: finalResult.oauth_data?.github?.public_repos,
                    hasGoogleRefresh: finalResult.oauth_data?.google?.has_refresh_token,
                    totalSteps: 3,
                },
            })

            setFinalResult(finalResult)

            // Call success callback if provided
            if (onAuthSuccess) {
                onAuthSuccess(finalResult)
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            setError(errorMessage)

            // Find the current step and mark it as error
            const currentStep = steps.find((s) => s.status === 'loading')?.step || 1
            updateStep(currentStep, {
                status: 'error',
                message: errorMessage,
            })
        } finally {
            setIsRunning(false)
        }
    }

    const testPostMessage = () => {
        console.log('🧪 [TEST] Testing postMessage functionality')

        // Test with a simple popup
        const testPopup = window.open(
            'data:text/html,<h1>Test Popup</h1><script>setTimeout(() => { window.opener && window.opener.postMessage({type: "TEST_MESSAGE", data: "Hello from popup"}, "*"); }, 1000);</script>',
            'test-popup',
            'width=400,height=300'
        )

        if (!testPopup) {
            alert('Popup blocked!')
            return
        }

        const testMessageHandler = (event: MessageEvent) => {
            console.log('🧪 [TEST] Received test message:', event.data)
            if (event.data.type === 'TEST_MESSAGE') {
                window.removeEventListener('message', testMessageHandler)
                testPopup.close()
                alert('✅ PostMessage test successful!')
            }
        }

        window.addEventListener('message', testMessageHandler)

        setTimeout(() => {
            window.removeEventListener('message', testMessageHandler)
            if (!testPopup.closed) {
                testPopup.close()
            }
            console.log('🧪 [TEST] PostMessage test timeout')
        }, 5000)
    }

    const getStepIcon = (status: FlowStep['status']) => {
        switch (status) {
            case 'pending':
                return '⏳'
            case 'loading':
                return '🔄'
            case 'success':
                return '✅'
            case 'error':
                return '❌'
        }
    }

    const getStepColor = (status: FlowStep['status']) => {
        switch (status) {
            case 'pending':
                return 'text-gray-500'
            case 'loading':
                return 'text-blue-600'
            case 'success':
                return 'text-green-600'
            case 'error':
                return 'text-red-600'
        }
    }

    return (
        <div className='p-6 max-w-4xl mx-auto'>
            <div className='flex justify-between items-center mb-6'>
                <h2 className='text-2xl font-bold'>🚀 New Flow OAuth Tester (Next.js 15)</h2>
                <div className='space-x-2'>
                    <button
                        onClick={testBackendConnection}
                        disabled={isRunning}
                        className='px-4 py-2 text-blue-600 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50'
                    >
                        Test Backend
                    </button>
                    <button
                        onClick={testPostMessage}
                        disabled={isRunning}
                        className='px-4 py-2 text-purple-600 border border-purple-300 rounded hover:bg-purple-50 disabled:opacity-50'
                    >
                        Test PostMessage
                    </button>
                    <button
                        onClick={resetFlow}
                        disabled={isRunning}
                        className='px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50'
                    >
                        Reset
                    </button>
                    <button
                        onClick={startNewFlow}
                        disabled={isRunning}
                        className='px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50'
                    >
                        {isRunning ? '🔄 Running...' : '▶️ Start New Flow'}
                    </button>
                </div>
            </div>

            {/* Flow Description */}
            <div className='mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                <h3 className='font-semibold text-blue-800 mb-2'>🔥 New Flow Overview</h3>
                <ol className='list-decimal list-inside text-sm text-blue-700 space-y-1'>
                    <li>GET /api/auth/google → Google OAuth URL取得</li>
                    <li>Google OAuth popup → GitHub OAuth URL取得</li>
                    <li>GitHub OAuth popup → アカウント作成完了 + final session token</li>
                </ol>
                <p className='mt-2 text-xs text-blue-600'>✨ Direct OAuth Flow: Firebase不要、GoogleとGitHubのみ</p>
            </div>

            {/* Error Display */}
            {error && (
                <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
                    <h3 className='font-semibold text-red-800 mb-2'>❌ Error</h3>
                    <p className='text-red-700'>{error}</p>
                </div>
            )}

            {/* Steps */}
            <div className='space-y-4'>
                {steps.map((step) => (
                    <div
                        key={step.step}
                        className='border rounded-lg p-4'
                    >
                        <div className='flex items-center space-x-3'>
                            <span className='text-2xl'>{getStepIcon(step.status)}</span>
                            <div className='flex-1'>
                                <h3 className={`font-semibold ${getStepColor(step.status)}`}>
                                    Step {step.step}: {step.title}
                                </h3>
                                {step.message && <p className='text-sm text-gray-600 mt-1'>{step.message}</p>}
                                {step.data && (
                                    <div className='mt-2 p-2 bg-gray-50 rounded text-xs'>
                                        <pre>{JSON.stringify(step.data, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Final Result */}
            {finalResult && (
                <div className='mt-6 p-4 bg-green-50 border border-green-200 rounded-lg'>
                    <h3 className='font-semibold text-green-800 mb-2'>🎉 Final Result</h3>
                    <div className='space-y-2 text-sm'>
                        <div>
                            <strong>Success:</strong> {finalResult.success ? '✅ Yes' : '❌ No'}
                        </div>
                        <div>
                            <strong>User ID:</strong> {finalResult.user?.user_id}
                        </div>
                        <div>
                            <strong>User Name:</strong> {finalResult.user?.user_name}
                        </div>
                        <div>
                            <strong>Email:</strong> {finalResult.user?.email}
                        </div>
                        <div>
                            <strong>Google Refresh Token:</strong>{' '}
                            {finalResult.oauth_data?.google?.has_refresh_token ? '✅ Available' : '❌ Missing'}
                        </div>
                        <div>
                            <strong>GitHub Username:</strong> {finalResult.oauth_data?.github?.username}
                        </div>
                        <div>
                            <strong>GitHub Repos:</strong> {finalResult.oauth_data?.github?.public_repos}
                        </div>
                        <div>
                            <strong>Session Token:</strong>
                            <code className='ml-2 px-2 py-1 bg-gray-100 rounded text-xs'>
                                {finalResult.session_token?.substring(0, 20)}...
                            </code>
                        </div>
                        <details className='mt-2'>
                            <summary className='cursor-pointer font-medium'>View Full Result</summary>
                            <pre className='mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto'>
                                {JSON.stringify(finalResult, null, 2)}
                            </pre>
                        </details>
                    </div>
                </div>
            )}
            {/* Info */}
            <div className='mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6'>
                <h3 className='font-semibold text-blue-800 mb-2'>ℹ️ Test Information</h3>
                <ul className='text-sm text-blue-700 space-y-1'>
                    <li>
                        • Backend running on: <code>http://localhost:3000</code>
                    </li>
                    <li>
                        • Frontend running on: <code>http://localhost:3001</code>
                    </li>
                    <li>• Flow: Direct Google OAuth → GitHub OAuth → Account Creation</li>
                    <li>• This test uses popup windows for OAuth authentication</li>
                    <li>• Make sure to allow popups in your browser</li>
                    <li>• Check browser console for detailed debug logs</li>
                </ul>

                <div className='mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded'>
                    <h4 className='font-medium text-yellow-800 mb-1'>🔧 Debug Tips:</h4>
                    <ul className='text-xs text-yellow-700 space-y-1'>
                        <li>• Press F12 to open Developer Tools</li>
                        <li>• Check Console tab for detailed logs</li>
                        <li>• If popup doesn&apos;t open, allow popups for this site</li>
                        <li>• If authentication fails, check Network tab for API errors</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
