'use client'

import Image from 'next/image'

import { useAuth } from '@/contexts/AuthContext'

import NewFlowOAuthTester from '@/components/NewFlowOAuthTester'

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

export default function HomePage() {
    const { user, oauthData, sessionToken, isAuthenticated, login, logout } = useAuth()

    const handleAuthSuccess = (result: AuthResult) => {
        if (result.success && result.session_token && result.user && result.oauth_data) {
            login(result.session_token, result.user, result.oauth_data)
        }
    }

    if (isAuthenticated && user) {
        return (
            <div className='min-h-screen bg-gray-50'>
                <div className='max-w-4xl mx-auto py-8 px-4'>
                    {/* Header */}
                    <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
                        <div className='flex justify-between items-center'>
                            <h1 className='text-3xl font-bold text-gray-900'>🎉 Welcome to Fithub!</h1>
                            <button
                                onClick={logout}
                                className='px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700'
                            >
                                Logout
                            </button>
                        </div>
                    </div>

                    {/* User Profile */}
                    <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
                        <h2 className='text-xl font-semibold mb-4'>👤 User Profile</h2>
                        <div className='flex items-center space-x-4 mb-4'>
                            <Image
                                src={user.user_icon}
                                alt={user.user_name}
                                width={64}
                                height={64}
                                className='w-16 h-16 rounded-full'
                            />
                            <div>
                                <h3 className='text-lg font-medium'>{user.user_name}</h3>
                                <p className='text-gray-600'>{user.email}</p>
                                <p className='text-sm text-gray-500'>ID: {user.user_id}</p>
                            </div>
                        </div>
                    </div>

                    {/* OAuth Connections */}
                    <div className='grid md:grid-cols-2 gap-6 mb-6'>
                        {/* Google Connection */}
                        <div className='bg-white rounded-lg shadow-sm p-6'>
                            <h3 className='text-lg font-semibold mb-4 flex items-center'>
                                <span className='text-2xl mr-2'>🔗</span>
                                Google Connection
                            </h3>
                            {oauthData?.google ?
                                <div className='space-y-2'>
                                    <p className='text-green-600'>✅ Connected</p>
                                    <p>
                                        <strong>Name:</strong> {oauthData.google.name}
                                    </p>
                                    <p>
                                        <strong>Email:</strong> {oauthData.google.email}
                                    </p>
                                    <p>
                                        <strong>Google ID:</strong> {oauthData.google.google_id}
                                    </p>
                                    <p>
                                        <strong>Refresh Token:</strong>{' '}
                                        {oauthData.google.has_refresh_token ?
                                            <span className='text-green-600'>✅ Available</span>
                                        :   <span className='text-red-600'>❌ Missing</span>}
                                    </p>
                                </div>
                            :   <p className='text-red-600'>❌ Not connected</p>}
                        </div>

                        {/* GitHub Connection */}
                        <div className='bg-white rounded-lg shadow-sm p-6'>
                            <h3 className='text-lg font-semibold mb-4 flex items-center'>
                                <span className='text-2xl mr-2'>🐙</span>
                                GitHub Connection
                            </h3>
                            {oauthData?.github ?
                                <div className='space-y-2'>
                                    <p className='text-green-600'>✅ Connected</p>
                                    <p>
                                        <strong>Username:</strong> {oauthData.github.username}
                                    </p>
                                    <p>
                                        <strong>Name:</strong> {oauthData.github.name}
                                    </p>
                                    <p>
                                        <strong>Public Repos:</strong> {oauthData.github.public_repos}
                                    </p>
                                    <p>
                                        <strong>Followers:</strong> {oauthData.github.followers}
                                    </p>
                                    <p>
                                        <strong>GitHub ID:</strong> {oauthData.github.github_id}
                                    </p>
                                </div>
                            :   <p className='text-red-600'>❌ Not connected</p>}
                        </div>
                    </div>

                    {/* Session Token */}
                    <div className='bg-white rounded-lg shadow-sm p-6'>
                        <h3 className='text-lg font-semibold mb-4'>🔐 Session Token</h3>
                        <div className='bg-gray-100 p-3 rounded font-mono text-sm break-all'>{sessionToken}</div>
                        <p className='text-sm text-gray-600 mt-2'>
                            This token is valid for 7 days and is used for API authentication.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-gray-50'>
            <div className='max-w-4xl mx-auto py-8 px-4'>
                {/* Header */}
                <div className='text-center mb-8'>
                    <h1 className='text-4xl font-bold text-gray-900 mb-4'>🏃‍♂️ Fithub Authentication Test</h1>
                    <p className='text-lg text-gray-600'>Test the new OAuth flow with Next.js 15 App Router</p>
                </div>

                {/* OAuth Tester */}
                <NewFlowOAuthTester onAuthSuccess={handleAuthSuccess} />

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
                    </ul>
                </div>
            </div>
        </div>
    )
}
