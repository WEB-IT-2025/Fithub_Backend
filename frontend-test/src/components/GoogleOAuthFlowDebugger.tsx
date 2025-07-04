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

export default function GoogleOAuthFlowDebugger() {
    const [steps, setSteps] = useState<FlowStep[]>([
        { step: 1, title: 'Initiate Google OAuth', status: 'pending' },
        { step: 2, title: 'Google OAuth Callback', status: 'pending' },
        { step: 3, title: 'GitHub OAuth', status: 'pending' },
        { step: 4, title: 'Account Creation', status: 'pending' },
    ])
    const [isRunning, setIsRunning] = useState(false)
    const [finalResult, setFinalResult] = useState<AuthResult | null>(null)

    const updateStep = (stepNumber: number, updates: Partial<FlowStep>) => {
        setSteps((prev) => prev.map((step) => (step.step === stepNumber ? { ...step, ...updates } : step)))
    }

    const resetFlow = () => {
        setSteps([
            { step: 1, title: 'Initiate Google OAuth', status: 'pending' },
            { step: 2, title: 'Google OAuth Callback', status: 'pending' },
            { step: 3, title: 'GitHub OAuth', status: 'pending' },
            { step: 4, title: 'Account Creation', status: 'pending' },
        ])
        setFinalResult(null)
    }

    const startFlow = async () => {
        setIsRunning(true)
        resetFlow()

        try {
            // Step 1: Initiate Google OAuth
            updateStep(1, { status: 'loading', message: 'Getting Google OAuth URL...' })

            const response = await fetch('http://localhost:3000/api/auth/google', {
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

            const popup = window.open(
                data.google_oauth_url,
                'google-oauth',
                'width=500,height=600,scrollbars=yes,resizable=yes'
            )

            if (!popup) {
                throw new Error('Popup blocked! Please allow popups for this site.')
            }

            // Monitor popup
            const result = await new Promise<AuthResult>((resolve, reject) => {
                const pollPopup = () => {
                    try {
                        if (popup.closed) {
                            reject(new Error('Popup closed by user'))
                            return
                        }

                        const popupUrl = popup.location.href

                        // Check for successful completion
                        if (popupUrl.includes('/auth/callback') && popupUrl.includes('success=true')) {
                            const urlParams = new URLSearchParams(popup.location.search)

                            const success = urlParams.get('success') === 'true'
                            const message = decodeURIComponent(urlParams.get('message') || '')
                            const sessionToken = urlParams.get('session_token') || ''
                            const userData = urlParams.get('user_data')
                            const oauthData = urlParams.get('oauth_data')

                            popup.close()

                            resolve({
                                success,
                                message,
                                session_token: sessionToken,
                                user: userData ? JSON.parse(decodeURIComponent(userData)) : undefined,
                                oauth_data: oauthData ? JSON.parse(decodeURIComponent(oauthData)) : undefined,
                            })
                            return
                        }

                        // Continue polling
                        setTimeout(pollPopup, 1000)
                    } catch {
                        // Expected when popup is on different domain
                        setTimeout(pollPopup, 1000)
                    }
                }

                pollPopup()

                // Timeout after 5 minutes
                setTimeout(() => {
                    if (!popup.closed) {
                        popup.close()
                    }
                    reject(new Error('Authentication timeout'))
                }, 300000)
            })

            // Steps 2, 3, 4 completed in the popup flow
            updateStep(2, {
                status: 'success',
                message: 'Google OAuth completed successfully',
                data: {
                    hasRefreshToken: result.oauth_data?.google?.has_refresh_token || false,
                    email: result.oauth_data?.google?.email,
                },
            })

            updateStep(3, {
                status: 'success',
                message: 'GitHub OAuth completed successfully',
                data: {
                    username: result.oauth_data?.github?.username,
                    repos: result.oauth_data?.github?.public_repos,
                },
            })

            updateStep(4, {
                status: 'success',
                message: 'Account created successfully',
                data: {
                    userId: result.user?.user_id,
                    userName: result.user?.user_name,
                    email: result.user?.email,
                },
            })

            setFinalResult(result)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

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
        <div className='p-6'>
            <div className='flex justify-between items-center mb-6'>
                <h2 className='text-2xl font-bold'>🚀 Google OAuth Flow Debugger</h2>
                <div className='space-x-2'>
                    <button
                        onClick={resetFlow}
                        disabled={isRunning}
                        className='px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50'
                    >
                        Reset
                    </button>
                    <button
                        onClick={startFlow}
                        disabled={isRunning}
                        className='px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50'
                    >
                        {isRunning ? '🔄 Running...' : '▶️ Start Flow'}
                    </button>
                </div>
            </div>

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
                            <strong>Email:</strong> {finalResult.user?.email}
                        </div>
                        <div>
                            <strong>Google Refresh Token:</strong>{' '}
                            {finalResult.oauth_data?.google?.has_refresh_token ? '✅ Available' : '❌ Missing'}
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
        </div>
    )
}
