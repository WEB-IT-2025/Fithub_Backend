'use client'

import { useEffect } from 'react'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'

export default function HelloPage() {
    const { user, oauthData, sessionToken, isAuthenticated, logout } = useAuth()
    const router = useRouter()

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/')
        }
    }, [isAuthenticated, router])

    if (!isAuthenticated || !user) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
            <div className='max-w-4xl mx-auto py-8 px-4'>
                {/* Header */}
                <div className='bg-white rounded-lg shadow-lg p-6 mb-8'>
                    <div className='flex justify-between items-center'>
                        <h1 className='text-3xl font-bold text-gray-900 flex items-center'>
                            🎉 Welcome to Fithub, {user.user_name}!
                        </h1>
                        <button
                            onClick={logout}
                            className='px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors'
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* User Profile */}
                <div className='bg-white rounded-lg shadow-lg p-6 mb-8'>
                    <h2 className='text-xl font-semibold mb-4 text-gray-800'>👤 Your Profile</h2>
                    <div className='flex items-center space-x-4 mb-4'>
                        <Image
                            src={user.user_icon}
                            alt={user.user_name}
                            width={80}
                            height={80}
                            className='w-20 h-20 rounded-full shadow-md'
                        />
                        <div>
                            <h3 className='text-xl font-medium text-gray-900'>{user.user_name}</h3>
                            <p className='text-gray-600'>{user.email}</p>
                            <p className='text-sm text-gray-500'>User ID: {user.user_id}</p>
                        </div>
                    </div>
                </div>

                {/* OAuth Connections */}
                <div className='grid md:grid-cols-2 gap-6 mb-8'>
                    {/* Google Connection */}
                    <div className='bg-white rounded-lg shadow-lg p-6'>
                        <h3 className='text-lg font-semibold mb-4 flex items-center text-gray-800'>
                            <span className='text-2xl mr-3'>🔗</span>
                            Google Connection
                        </h3>
                        {oauthData?.google ?
                            <div className='space-y-3'>
                                <div className='flex items-center'>
                                    <span className='text-green-600 text-xl mr-2'>✅</span>
                                    <span className='font-medium text-green-700'>Connected</span>
                                </div>
                                <div className='space-y-2 text-sm'>
                                    <p>
                                        <strong>Name:</strong> {oauthData.google.name}
                                    </p>
                                    <p>
                                        <strong>Email:</strong> {oauthData.google.email}
                                    </p>
                                    <p>
                                        <strong>Google ID:</strong> {oauthData.google.google_id}
                                    </p>
                                    <div className='flex items-center'>
                                        <strong className='mr-2'>Refresh Token:</strong>
                                        {oauthData.google.has_refresh_token ?
                                            <span className='text-green-600 flex items-center'>
                                                <span className='mr-1'>✅</span>
                                                Available
                                            </span>
                                        :   <span className='text-red-600 flex items-center'>
                                                <span className='mr-1'>❌</span>
                                                Missing
                                            </span>
                                        }
                                    </div>
                                </div>
                            </div>
                        :   <div className='flex items-center'>
                                <span className='text-red-600 text-xl mr-2'>❌</span>
                                <span className='text-red-700'>Not connected</span>
                            </div>
                        }
                    </div>

                    {/* GitHub Connection */}
                    <div className='bg-white rounded-lg shadow-lg p-6'>
                        <h3 className='text-lg font-semibold mb-4 flex items-center text-gray-800'>
                            <span className='text-2xl mr-3'>🐙</span>
                            GitHub Connection
                        </h3>
                        {oauthData?.github ?
                            <div className='space-y-3'>
                                <div className='flex items-center'>
                                    <span className='text-green-600 text-xl mr-2'>✅</span>
                                    <span className='font-medium text-green-700'>Connected</span>
                                </div>
                                <div className='space-y-2 text-sm'>
                                    <p>
                                        <strong>Username:</strong> @{oauthData.github.username}
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
                            </div>
                        :   <div className='flex items-center'>
                                <span className='text-red-600 text-xl mr-2'>❌</span>
                                <span className='text-red-700'>Not connected</span>
                            </div>
                        }
                    </div>
                </div>

                {/* Session Token */}
                <div className='bg-white rounded-lg shadow-lg p-6'>
                    <h3 className='text-lg font-semibold mb-4 text-gray-800'>🔐 Session Token</h3>
                    <div className='bg-gray-100 p-4 rounded-lg font-mono text-sm break-all border'>{sessionToken}</div>
                    <p className='text-sm text-gray-600 mt-3'>
                        This token is valid for 7 days and is used for API authentication.
                    </p>
                </div>

                {/* Success Message */}
                <div className='mt-8 bg-green-50 border border-green-200 rounded-lg p-6'>
                    <h3 className='font-semibold text-green-800 mb-2 flex items-center'>🎊 Registration Successful!</h3>
                    <p className='text-green-700'>
                        Your Fithub account has been created successfully. You are now logged in and ready to use all
                        features.
                    </p>
                </div>
            </div>
        </div>
    )
}
