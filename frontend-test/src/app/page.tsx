'use client'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'

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

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL}/auth`

export default function AuthPage() {
    const { isAuthenticated, login } = useAuth()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [currentStep, setCurrentStep] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'register' | 'login'>('register')
    const [authCompleted, setAuthCompleted] = useState(false)

    // Redirect to hello if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.push('/hello')
        }
    }, [isAuthenticated, router])

    const clearError = () => {
        setError(null)
    }

    const handleAuthSuccess = (result: AuthResult) => {
        if (result.success && result.session_token && result.user && result.oauth_data) {
            // Show message to user if available
            if (result.message) {
                console.log('📢 [AUTH_SUCCESS] Backend message:', result.message)
            }

            login(result.session_token, result.user, result.oauth_data)
            router.push('/hello')
        } else {
            console.error('❌ [AUTH_SUCCESS] Missing required auth data:', {
                success: result?.success,
                sessionToken: result?.session_token ? 'present' : 'missing',
                user: result?.user ? 'present' : 'missing',
                oauthData: result?.oauth_data ? 'present' : 'missing',
                message: result?.message,
            })
        }
    }

    // Registration flow - same as before
    const startRegistration = async () => {
        try {
            setIsLoading(true)
            setError(null)
            setAuthCompleted(false) // Reset auth completed flag
            setCurrentStep('Connecting to Google...')

            // Fetch Google OAuth URL from backend
            const response = await fetch(`${API_BASE_URL}/google`)
            const data = await response.json()

            if (!data.success) {
                throw new Error(data.message || 'Failed to get Google OAuth URL')
            }

            // Open Google OAuth popup with URL from backend
            const popup = window.open(
                data.google_oauth_url,
                'google-oauth',
                'width=500,height=600,scrollbars=yes,resizable=yes'
            )

            if (!popup) {
                throw new Error('Popup was blocked. Please allow popups and try again.')
            }

            // Listen for popup messages
            const handleMessage = async (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return

                if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
                    setCurrentStep('Google login successful, connecting to GitHub...')
                    clearInterval(checkClosed) // Clear interval first
                    popup.close()

                    // Start GitHub OAuth with temp_token
                    const githubPopup = window.open(
                        event.data.github_oauth_url,
                        'github-oauth',
                        'width=500,height=600,scrollbars=yes,resizable=yes'
                    )

                    if (!githubPopup) {
                        setError('GitHub popup was blocked. Please allow popups and try again.')
                        return
                    }

                    const handleGitHubMessage = async (gitHubEvent: MessageEvent) => {
                        if (gitHubEvent.origin !== window.location.origin) return

                        if (gitHubEvent.data.type === 'GITHUB_OAUTH_SUCCESS') {
                            setCurrentStep('Creating your account...')
                            setAuthCompleted(true) // Mark auth as completed
                            clearInterval(checkGitHubClosed) // Clear interval first
                            githubPopup.close()
                            handleAuthSuccess(gitHubEvent.data.result)
                            window.removeEventListener('message', handleGitHubMessage)
                        } else if (gitHubEvent.data.type === 'GITHUB_OAUTH_ERROR') {
                            clearInterval(checkGitHubClosed)
                            githubPopup.close()
                            setError(gitHubEvent.data.error || 'GitHub authentication failed')
                            window.removeEventListener('message', handleGitHubMessage)
                        }
                    }

                    window.addEventListener('message', handleGitHubMessage)

                    // Check if GitHub popup was closed manually
                    const checkGitHubClosed = setInterval(() => {
                        if (githubPopup.closed) {
                            clearInterval(checkGitHubClosed)
                            window.removeEventListener('message', handleGitHubMessage)
                            if (!authCompleted && !error) {
                                setError('GitHub authentication was cancelled')
                                setIsLoading(false)
                                setCurrentStep(null)
                            }
                        }
                    }, 2000)
                } else if (event.data.type === 'GOOGLE_EXISTING_USER') {
                    setCurrentStep('Account already exists - logged in automatically!')
                    setAuthCompleted(true) // Mark auth as completed
                    clearInterval(checkClosed) // Clear interval first
                    popup.close()
                    handleAuthSuccess(event.data.result)
                    window.removeEventListener('message', handleMessage)
                } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
                    clearInterval(checkClosed)
                    popup.close()
                    setError(event.data.error || 'Google authentication failed')
                }

                window.removeEventListener('message', handleMessage)
            }

            window.addEventListener('message', handleMessage) // Check if popup was closed manually
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed)
                    window.removeEventListener('message', handleMessage)
                    if (!authCompleted && !error) {
                        setError('Authentication was cancelled')
                        setIsLoading(false)
                        setCurrentStep(null)
                    }
                }
            }, 2000)
        } catch (err) {
            console.error('❌ [REGISTRATION] Registration error:', err)
            setError(err instanceof Error ? err.message : 'Registration failed')
        } finally {
            setIsLoading(false)
            setCurrentStep(null)
        }
    }

    // Login with Google
    const loginWithGoogle = async () => {
        try {
            setIsLoading(true)
            setError(null)
            setAuthCompleted(false) // Reset auth completed flag
            setCurrentStep('Logging in with Google...')

            // Get Google login URL
            const response = await fetch(`${API_BASE_URL}/login/google`)
            const data = await response.json()

            if (!data.success) {
                throw new Error(data.message || 'Failed to get Google login URL')
            }

            // Open Google OAuth popup for login
            const popup = window.open(
                data.google_oauth_url,
                'google-login',
                'width=500,height=600,scrollbars=yes,resizable=yes'
            )

            if (!popup) {
                throw new Error('Popup was blocked. Please allow popups and try again.')
            }

            // Listen for callback
            const handleMessage = async (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return

                if (event.data.type === 'GOOGLE_LOGIN_SUCCESS') {
                    setCurrentStep('Login successful!')
                    setAuthCompleted(true) // Mark auth as completed
                    popup.close()
                    handleAuthSuccess(event.data.result)
                    window.removeEventListener('message', handleMessage)
                } else if (event.data.type === 'GOOGLE_EXISTING_USER') {
                    setCurrentStep('Account already exists - logged in automatically!')
                    setAuthCompleted(true) // Mark auth as completed
                    popup.close()
                    handleAuthSuccess(event.data.result)
                    window.removeEventListener('message', handleMessage)
                } else if (event.data.type === 'AUTH_SUCCESS') {
                    // Generic auth success handler
                    setCurrentStep('Login successful!')
                    setAuthCompleted(true) // Mark auth as completed
                    popup.close()
                    handleAuthSuccess(event.data.result)
                    window.removeEventListener('message', handleMessage)
                } else if (event.data.type === 'GOOGLE_LOGIN_ERROR') {
                    popup.close()
                    setError(event.data.error || 'Google login failed')
                    window.removeEventListener('message', handleMessage)
                }
            }

            window.addEventListener('message', handleMessage)

            // Check if popup was closed manually
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed)
                    window.removeEventListener('message', handleMessage)
                    // Only show error if we haven't processed a success message
                    if (!authCompleted && !error) {
                        setError('Login was cancelled')
                        setIsLoading(false)
                        setCurrentStep(null)
                    }
                }
            }, 2000) // Increased from 1000ms to 2000ms
        } catch (err) {
            console.error('❌ [LOGIN] Google login error:', err)
            setError(err instanceof Error ? err.message : 'Google login failed')
        } finally {
            setIsLoading(false)
            setCurrentStep(null)
        }
    }

    // Login with GitHub
    const loginWithGitHub = async () => {
        try {
            setIsLoading(true)
            setError(null)
            setAuthCompleted(false) // Reset auth completed flag
            setCurrentStep('Logging in with GitHub...')

            // Get GitHub login URL
            const response = await fetch(`${API_BASE_URL}/login/github`)
            const data = await response.json()

            if (!data.success) {
                throw new Error(data.message || 'Failed to get GitHub login URL')
            }

            // Open GitHub OAuth popup for login
            const popup = window.open(
                data.github_oauth_url,
                'github-login',
                'width=500,height=600,scrollbars=yes,resizable=yes'
            )

            if (!popup) {
                throw new Error('Popup was blocked. Please allow popups and try again.')
            }

            // Listen for callback
            const handleMessage = async (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return

                if (event.data.type === 'GITHUB_LOGIN_SUCCESS') {
                    setCurrentStep('Login successful!')
                    setAuthCompleted(true) // Mark auth as completed
                    popup.close()
                    handleAuthSuccess(event.data.result)
                    window.removeEventListener('message', handleMessage)
                } else if (event.data.type === 'GITHUB_EXISTING_USER') {
                    setCurrentStep('Account already exists - logged in automatically!')
                    setAuthCompleted(true) // Mark auth as completed
                    popup.close()
                    handleAuthSuccess(event.data.result)
                    window.removeEventListener('message', handleMessage)
                } else if (event.data.type === 'AUTH_SUCCESS') {
                    // Generic auth success handler
                    setCurrentStep('Login successful!')
                    setAuthCompleted(true) // Mark auth as completed
                    popup.close()
                    handleAuthSuccess(event.data.result)
                    window.removeEventListener('message', handleMessage)
                } else if (event.data.type === 'GITHUB_LOGIN_ERROR') {
                    popup.close()
                    setError(event.data.error || 'GitHub login failed')
                    window.removeEventListener('message', handleMessage)
                }
            }

            window.addEventListener('message', handleMessage)

            // Check if popup was closed manually
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed)
                    window.removeEventListener('message', handleMessage)
                    // Only show error if we haven't processed a success message
                    if (!authCompleted && !error) {
                        setError('Login was cancelled')
                        setIsLoading(false)
                        setCurrentStep(null)
                    }
                }
            }, 2000) // Increased from 1000ms to 2000ms
        } catch (err) {
            console.error('❌ [LOGIN] GitHub login error:', err)
            setError(err instanceof Error ? err.message : 'GitHub login failed')
        } finally {
            setIsLoading(false)
            setCurrentStep(null)
        }
    }

    if (isAuthenticated) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4'>
            <div className='max-w-md w-full'>
                {/* Logo and Title */}
                <div className='text-center mb-8'>
                    <div className='text-6xl mb-4'>🏃‍♂️</div>
                    <h1 className='text-3xl font-bold text-gray-900 mb-2'>Welcome to Fithub</h1>
                    <p className='text-gray-600'>Connect your accounts to get started</p>
                </div>

                {/* Tab Navigation */}
                <div className='bg-white rounded-lg shadow-lg overflow-hidden'>
                    <div className='flex'>
                        <button
                            onClick={() => {
                                setActiveTab('register')
                                clearError()
                            }}
                            className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                                activeTab === 'register' ? 'bg-blue-600 text-white' : (
                                    'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                )
                            }`}
                        >
                            Register
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('login')
                                clearError()
                            }}
                            className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                                activeTab === 'login' ? 'bg-blue-600 text-white' : (
                                    'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                )
                            }`}
                        >
                            Login
                        </button>
                    </div>

                    <div className='p-8'>
                        {/* Error Message */}
                        {error && (
                            <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center'>
                                        <span className='text-red-600 text-xl mr-2'>❌</span>
                                        <span className='text-red-800 font-medium'>Error</span>
                                    </div>
                                    <button
                                        onClick={clearError}
                                        className='text-red-600 hover:text-red-800'
                                    >
                                        ✕
                                    </button>
                                </div>
                                <p className='text-red-700 mt-2'>{error}</p>
                            </div>
                        )}

                        {/* Current Step */}
                        {currentStep && (
                            <div className='mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                                <div className='flex items-center'>
                                    <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3'></div>
                                    <span className='text-blue-800 font-medium'>{currentStep}</span>
                                </div>
                            </div>
                        )}

                        {/* Register Tab */}
                        {activeTab === 'register' && (
                            <div>
                                <h3 className='text-lg font-semibold text-gray-900 mb-4'>Create New Account</h3>
                                <p className='text-gray-600 mb-6'>
                                    Connect both Google and GitHub to create your Fithub account
                                </p>

                                <button
                                    onClick={startRegistration}
                                    disabled={isLoading}
                                    className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
                                        isLoading ?
                                            'bg-gray-400 cursor-not-allowed'
                                        :   'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
                                    }`}
                                >
                                    {isLoading ?
                                        <div className='flex items-center justify-center'>
                                            <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                                            Creating Account...
                                        </div>
                                    :   <div className='flex items-center justify-center'>
                                            <span className='text-xl mr-2'>🚀</span>
                                            Register with Google & GitHub
                                        </div>
                                    }
                                </button>

                                <div className='mt-6 pt-4 border-t border-gray-200'>
                                    <h4 className='text-sm font-semibold text-gray-700 mb-3'>Registration Process:</h4>
                                    <div className='space-y-2 text-sm text-gray-600'>
                                        <div className='flex items-center'>
                                            <span className='text-green-500 mr-2'>1.</span>
                                            Connect your Google account
                                        </div>
                                        <div className='flex items-center'>
                                            <span className='text-green-500 mr-2'>2.</span>
                                            Connect your GitHub account
                                        </div>
                                        <div className='flex items-center'>
                                            <span className='text-green-500 mr-2'>3.</span>
                                            Your Fithub account is created
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Login Tab */}
                        {activeTab === 'login' && (
                            <div>
                                <h3 className='text-lg font-semibold text-gray-900 mb-4'>Login to Existing Account</h3>
                                <p className='text-gray-600 mb-6'>Use either your Google or GitHub account to login</p>

                                <div className='space-y-4'>
                                    <button
                                        onClick={loginWithGoogle}
                                        disabled={isLoading}
                                        className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
                                            isLoading ?
                                                'bg-gray-400 cursor-not-allowed'
                                            :   'bg-red-600 hover:bg-red-700 hover:shadow-lg transform hover:-translate-y-0.5'
                                        }`}
                                    >
                                        {isLoading ?
                                            <div className='flex items-center justify-center'>
                                                <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                                                Logging in...
                                            </div>
                                        :   <div className='flex items-center justify-center'>
                                                <span className='text-xl mr-2'>🔗</span>
                                                Login with Google
                                            </div>
                                        }
                                    </button>

                                    <div className='text-center text-gray-500'>
                                        <span className='px-3 bg-white'>or</span>
                                    </div>

                                    <button
                                        onClick={loginWithGitHub}
                                        disabled={isLoading}
                                        className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
                                            isLoading ?
                                                'bg-gray-400 cursor-not-allowed'
                                            :   'bg-gray-800 hover:bg-gray-900 hover:shadow-lg transform hover:-translate-y-0.5'
                                        }`}
                                    >
                                        {isLoading ?
                                            <div className='flex items-center justify-center'>
                                                <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                                                Logging in...
                                            </div>
                                        :   <div className='flex items-center justify-center'>
                                                <span className='text-xl mr-2'>🐙</span>
                                                Login with GitHub
                                            </div>
                                        }
                                    </button>
                                </div>

                                <div className='mt-6 pt-4 border-t border-gray-200'>
                                    <p className='text-sm text-gray-600'>
                                        <span className='font-medium'>Note:</span> You can login with either Google or
                                        GitHub. If you don&apos;t have an account yet, switch to the Register tab.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Note about popups */}
                        <div className='mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
                            <p className='text-sm text-yellow-800'>
                                <span className='font-medium'>Note:</span> Please allow popups in your browser for the
                                authentication process to work properly.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className='text-center mt-8 text-sm text-gray-500'>
                    <p>Secure authentication powered by Google and GitHub</p>
                </div>
            </div>
        </div>
    )
}
