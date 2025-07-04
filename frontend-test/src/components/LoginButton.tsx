'use client'

import { useState } from 'react'

import Image from 'next/image'

import { useAuth } from '@/contexts/AuthContext'

export default function LoginButton() {
    const { login, isLoading, isAuthenticated, fithubUser, logout } = useAuth()
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async () => {
        try {
            setError(null)
            await login()
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Login failed')
        }
    }

    const handleLogout = async () => {
        try {
            setError(null)
            await logout()
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Logout failed')
        }
    }

    if (isAuthenticated && fithubUser) {
        return (
            <div className='flex flex-col items-center gap-4 p-6 bg-green-50 border border-green-200 rounded-lg'>
                <div className='flex items-center gap-3'>
                    {fithubUser.user_icon && (
                        <Image
                            src={fithubUser.user_icon}
                            alt='Profile'
                            width={48}
                            height={48}
                            className='w-12 h-12 rounded-full'
                        />
                    )}
                    <div>
                        <h3 className='font-semibold text-green-800'>{fithubUser.user_name}</h3>
                        <p className='text-sm text-green-600'>{fithubUser.email}</p>
                    </div>
                </div>
                <p className='text-sm text-green-700 text-center'>✅ Successfully authenticated with Fithub!</p>
                <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50'
                >
                    {isLoading ? 'Signing out...' : 'Sign Out'}
                </button>
                {error && <p className='text-red-500 text-sm'>{error}</p>}
            </div>
        )
    }

    return (
        <div className='flex flex-col items-center gap-4 p-6 bg-gray-50 border border-gray-200 rounded-lg'>
            <h3 className='text-lg font-semibold'>Fithub Authentication Test</h3>
            <p className='text-sm text-gray-600 text-center'>
                Click below to test the complete auth flow:
                <br />
                Firebase → Google OAuth → GitHub OAuth
            </p>

            <button
                onClick={handleLogin}
                disabled={isLoading}
                className='px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2'
            >
                {isLoading ?
                    <>
                        <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                        Authenticating...
                    </>
                :   <>
                        <svg
                            className='w-5 h-5'
                            viewBox='0 0 24 24'
                        >
                            <path
                                fill='currentColor'
                                d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                            />
                            <path
                                fill='currentColor'
                                d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                            />
                            <path
                                fill='currentColor'
                                d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                            />
                            <path
                                fill='currentColor'
                                d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                            />
                        </svg>
                        Sign in with Google
                    </>
                }
            </button>

            {error && (
                <div className='p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm'>
                    <strong>Error:</strong> {error}
                </div>
            )}
        </div>
    )
}
