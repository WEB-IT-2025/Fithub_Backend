'use client'

import { useState } from 'react'

import { AuthResponse, AuthService } from '@/lib/auth'

interface AuthFlowDisplayProps {
    step: number
    title: string
    status: 'pending' | 'loading' | 'success' | 'error'
    data?: AuthResponse | null
    error?: string
}

function AuthFlowStep({ step, title, status, data, error }: AuthFlowDisplayProps) {
    const getStatusIcon = () => {
        switch (status) {
            case 'loading':
                return (
                    <div className='w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin' />
                )
            case 'success':
                return (
                    <div className='w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs'>
                        ✓
                    </div>
                )
            case 'error':
                return (
                    <div className='w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs'>
                        ✗
                    </div>
                )
            default:
                return (
                    <div className='w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs'>
                        {step}
                    </div>
                )
        }
    }

    const getStatusColor = () => {
        switch (status) {
            case 'loading':
                return 'border-blue-200 bg-blue-50'
            case 'success':
                return 'border-green-200 bg-green-50'
            case 'error':
                return 'border-red-200 bg-red-50'
            default:
                return 'border-gray-200 bg-gray-50'
        }
    }

    return (
        <div className={`p-4 border rounded-lg ${getStatusColor()}`}>
            <div className='flex items-center gap-3 mb-2'>
                {getStatusIcon()}
                <h3 className='font-semibold text-black'>{title}</h3>
            </div>

            {error && (
                <div className='text-red-600 text-sm mb-2'>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {data && (
                <div className='text-sm space-y-1 text-black'>
                    <div>
                        <strong>Success:</strong> {data.success ? 'Yes' : 'No'}
                    </div>
                    <div>
                        <strong>New User:</strong> {data.is_new_user ? 'Yes' : 'No'}
                    </div>
                    {data.message && (
                        <div>
                            <strong>Message:</strong> {data.message}
                        </div>
                    )}
                    {data.next_step && (
                        <div>
                            <strong>Next Step:</strong> {data.next_step}
                        </div>
                    )}
                    {data.user && (
                        <div>
                            <strong>User:</strong> {data.user.user_name} ({data.user.email})
                        </div>
                    )}
                    {data.google_oauth_url && (
                        <div>
                            <strong>Google OAuth URL:</strong> Available
                        </div>
                    )}
                    {data.github_oauth_url && (
                        <div>
                            <strong>GitHub OAuth URL:</strong> Available
                        </div>
                    )}
                    {data.session_token && (
                        <div>
                            <strong>Session Token:</strong> {data.session_token.substring(0, 20)}...
                        </div>
                    )}
                    {data.temp_session_token && (
                        <div>
                            <strong>Temp Token:</strong> {data.temp_session_token.substring(0, 20)}...
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function AuthFlowDebugger() {
    const [currentStep, setCurrentStep] = useState(0)
    const [steps, setSteps] = useState<AuthFlowDisplayProps[]>([
        { step: 1, title: 'Firebase Authentication', status: 'pending' },
        { step: 2, title: 'Backend Verification (/api/auth/verify-firebase)', status: 'pending' },
        { step: 3, title: 'Google OAuth (if needed)', status: 'pending' },
        { step: 4, title: 'GitHub OAuth', status: 'pending' },
        { step: 5, title: 'Authentication Complete', status: 'pending' },
    ])

    const updateStep = (stepIndex: number, updates: Partial<AuthFlowDisplayProps>) => {
        setSteps((prev) => prev.map((step, index) => (index === stepIndex ? { ...step, ...updates } : step)))
    }

    const startAuthFlow = async () => {
        try {
            // Reset all steps
            setCurrentStep(0)
            setSteps((prev) => prev.map((step) => ({ ...step, status: 'pending', data: undefined, error: undefined })))

            // Step 1: Firebase Authentication
            setCurrentStep(1)
            updateStep(0, { status: 'loading' })

            let firebaseToken: string
            let googleAccessToken: string | undefined

            try {
                const authResult = await AuthService.signInWithGoogle()
                firebaseToken = authResult.firebaseToken
                googleAccessToken = authResult.googleAccessToken

                updateStep(0, {
                    status: 'success',
                    data: {
                        success: true,
                        is_new_user: false,
                        message: `Firebase token received (${firebaseToken.substring(0, 20)}...)${googleAccessToken ? ` with Google access token` : ''}`,
                    },
                })

                // Step 2: Backend Verification
                setCurrentStep(2)
                updateStep(1, { status: 'loading' })

                const response = await AuthService.verifyFirebase(firebaseToken, googleAccessToken)
                updateStep(1, { status: 'success', data: response })

                // Handle response based on documentation flow
                if (!response.is_new_user && response.session_token) {
                    // Existing user - authentication complete
                    setCurrentStep(5)
                    updateStep(2, {
                        status: 'success',
                        data: { success: true, is_new_user: false, message: 'Skipped - existing user' },
                    })
                    updateStep(3, {
                        status: 'success',
                        data: { success: true, is_new_user: false, message: 'Skipped - existing user' },
                    })
                    updateStep(4, { status: 'success', data: response })

                    // Save session token
                    if (response.session_token) {
                        AuthService.saveSessionToken(response.session_token)
                    }
                    if (response.user) {
                        AuthService.saveUserData(response.user)
                    }
                } else if (response.is_new_user) {
                    // Save temp session token
                    if (response.temp_session_token) {
                        AuthService.saveTempSessionToken(response.temp_session_token)
                    }

                    // New user - handle OAuth flow
                    if (response.google_oauth_url) {
                        // Need Google OAuth first
                        setCurrentStep(3)
                        updateStep(2, { status: 'loading' })

                        try {
                            // Open Google OAuth popup
                            const googleResult = await AuthService.handleOAuthFlow(response.google_oauth_url)
                            updateStep(2, {
                                status: 'success',
                                data: {
                                    ...googleResult,
                                    message: 'Google OAuth completed successfully',
                                },
                            })

                            // After Google OAuth, should get GitHub OAuth URL
                            if (googleResult.github_oauth_url) {
                                setCurrentStep(4)
                                updateStep(3, { status: 'loading' })

                                try {
                                    const githubResult = await AuthService.handleOAuthFlow(
                                        googleResult.github_oauth_url
                                    )
                                    updateStep(3, { status: 'success', data: githubResult })

                                    // Authentication complete
                                    setCurrentStep(5)
                                    updateStep(4, { status: 'success', data: githubResult })

                                    // Save final session token
                                    if (githubResult.session_token) {
                                        AuthService.saveSessionToken(githubResult.session_token)
                                    }
                                    if (githubResult.user) {
                                        AuthService.saveUserData(githubResult.user)
                                    }
                                } catch (error) {
                                    updateStep(3, {
                                        status: 'error',
                                        error: error instanceof Error ? error.message : 'GitHub OAuth failed',
                                    })
                                }
                            }
                        } catch (error) {
                            updateStep(2, {
                                status: 'error',
                                error: error instanceof Error ? error.message : 'Google OAuth failed',
                            })
                        }
                    } else if (response.github_oauth_url) {
                        // Google OAuth skipped - go directly to GitHub
                        setCurrentStep(4)
                        updateStep(2, {
                            status: 'success',
                            data: { success: true, is_new_user: false, message: 'Skipped - Google token provided' },
                        })
                        updateStep(3, { status: 'loading' })

                        try {
                            const githubResult = await AuthService.handleOAuthFlow(response.github_oauth_url)
                            console.log('GitHub OAuth Result:', githubResult)
                            updateStep(3, { status: 'success', data: githubResult })

                            // Authentication complete
                            setCurrentStep(5)
                            updateStep(4, { status: 'success', data: githubResult })

                            // Save final session token
                            if (githubResult.session_token) {
                                AuthService.saveSessionToken(githubResult.session_token)
                            }
                            if (githubResult.user) {
                                AuthService.saveUserData(githubResult.user)
                            }
                        } catch (error) {
                            console.error('GitHub OAuth Error:', error)
                            updateStep(3, {
                                status: 'error',
                                error: error instanceof Error ? error.message : 'GitHub OAuth failed',
                            })
                        }
                    }
                }
            } catch (error) {
                updateStep(currentStep - 1, {
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                })
            }
        } catch (error) {
            console.error('Auth flow error:', error)
            updateStep(0, {
                status: 'error',
                error: error instanceof Error ? error.message : 'Firebase authentication failed',
            })
        }
    }

    return (
        <div className='max-w-2xl mx-auto p-6'>
            <div className='mb-6'>
                <h2 className='text-black text-2xl font-bold mb-2'>Fithub Auth Flow Debugger</h2>
                <p className='text-black'>
                    This tool helps you test and debug the complete authentication flow step by step.
                </p>
            </div>

            <div className='space-y-4 mb-6'>
                {steps.map((step, index) => (
                    <AuthFlowStep
                        key={index}
                        {...step}
                    />
                ))}
            </div>

            <div className='flex gap-4'>
                <button
                    onClick={startAuthFlow}
                    className='px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                >
                    Start Auth Flow Test
                </button>

                <button
                    onClick={() => {
                        setCurrentStep(0)
                        setSteps((prev) =>
                            prev.map((step) => ({
                                ...step,
                                status: 'pending',
                                data: undefined,
                                error: undefined,
                            }))
                        )
                    }}
                    className='px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600'
                >
                    Reset
                </button>
            </div>

            <div className='mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded'>
                <h3 className='font-semibold text-yellow-800 mb-2'>Authentication Flow Info:</h3>
                <div className='text-yellow-700 text-sm space-y-1'>
                    <p>
                        <strong>Existing Users:</strong> Steps 3-4 will be skipped and authentication completes at step
                        2.
                    </p>
                    <p>
                        <strong>New Users with Google Access Token:</strong> Step 3 (Google OAuth) will be skipped.
                    </p>
                    <p>
                        <strong>New Users without Google Access Token:</strong> Both OAuth steps will be required.
                    </p>
                    <p>
                        <strong>OAuth Popups:</strong> This debugger will automatically handle OAuth popups for complete
                        flow testing.
                    </p>
                </div>
            </div>
        </div>
    )
}
