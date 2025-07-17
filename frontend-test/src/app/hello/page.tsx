'use client'

import { useCallback, useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'

interface UserData {
    user_id: string
    today: {
        date: string
        steps: number
        contributions: number
    }
    recent_exercise: Array<{ day: string; exercise_quantity: number }>
    recent_contributions: Array<{ day: string; count: string }>
    last_updated: string
}

interface UserStats {
    user_id: string
    weekly: {
        total_steps: number
        total_contributions: number
        active_days: number
    }
    monthly: {
        total_steps: number
        total_contributions: number
        active_days: number
    }
    last_updated: string
}

export default function HelloPage() {
    const { user, oauthData, sessionToken, isAuthenticated, logout } = useAuth()
    const router = useRouter()
    const [userData, setUserData] = useState<UserData | null>(null)
    const [userStats, setUserStats] = useState<UserStats | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

    // Fetch user data from backend
    const fetchUserData = useCallback(async () => {
        if (!sessionToken) return

        try {
            setIsLoading(true)
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/data/user`, {
                headers: {
                    Authorization: `Bearer ${sessionToken}`,
                    'Content-Type': 'application/json',
                },
            })

            if (response.ok) {
                const result = await response.json()
                if (result.success) {
                    setUserData(result.data)
                } else {
                    console.error('Failed to fetch user data:', result.message)
                }
            } else {
                console.error('Failed to fetch user data:', response.statusText)
            }
        } catch (error) {
            console.error('Error fetching user data:', error)
        } finally {
            setIsLoading(false)
        }
    }, [sessionToken])

    // Fetch user stats from backend
    const fetchUserStats = useCallback(async () => {
        if (!sessionToken) return

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/data/stats`, {
                headers: {
                    Authorization: `Bearer ${sessionToken}`,
                    'Content-Type': 'application/json',
                },
            })

            if (response.ok) {
                const result = await response.json()
                if (result.success) {
                    setUserStats(result.data)
                } else {
                    console.error('Failed to fetch user stats:', result.message)
                }
            } else {
                console.error('Failed to fetch user stats:', response.statusText)
            }
        } catch (error) {
            console.error('Error fetching user stats:', error)
        }
    }, [sessionToken])

    // Manual sync function
    const handleManualSync = async () => {
        if (!sessionToken || isSyncing) return

        try {
            setIsSyncing(true)
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/data/sync`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${sessionToken}`,
                    'Content-Type': 'application/json',
                },
            })

            if (response.ok) {
                const result = await response.json()
                if (result.success) {
                    setLastSyncTime(new Date().toISOString())
                    // Refresh data after sync
                    await fetchUserData()
                    await fetchUserStats()
                    console.log('Manual sync successful:', result.data)
                } else {
                    console.error('Manual sync failed:', result.message)
                }
            } else {
                console.error('Manual sync failed:', response.statusText)
            }
        } catch (error) {
            console.error('Error during manual sync:', error)
        } finally {
            setIsSyncing(false)
        }
    }

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/')
        }
    }, [isAuthenticated, router])

    // Fetch data when authenticated and sessionToken is available
    useEffect(() => {
        if (isAuthenticated && sessionToken) {
            fetchUserData()
            fetchUserStats()
        }
    }, [isAuthenticated, sessionToken, fetchUserData, fetchUserStats])
    useEffect(() => {
        console.log('🐛 sessionToken =', sessionToken)
    }, [sessionToken])

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

                {/* Fitness Data Section */}
                <div className='bg-white rounded-lg shadow-lg p-6 mb-8'>
                    <div className='flex justify-between items-center mb-4'>
                        <h2 className='text-xl font-semibold text-gray-800'>📊 Your Fitness Data</h2>
                        <button
                            onClick={handleManualSync}
                            disabled={isSyncing}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                isSyncing ?
                                    'bg-gray-400 text-white cursor-not-allowed'
                                :   'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            {isSyncing ? '🔄 Syncing...' : '🔄 Manual Sync'}
                        </button>
                    </div>

                    {isLoading ?
                        <div className='flex items-center justify-center py-8'>
                            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
                            <span className='ml-2 text-gray-600'>Loading fitness data...</span>
                        </div>
                    :   <>
                            {/* Today's Data */}
                            {userData && (
                                <div className='grid md:grid-cols-2 gap-4 mb-6'>
                                    <div className='bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200'>
                                        <h3 className='font-semibold text-green-800 mb-2 flex items-center'>
                                            👟 Today&apos;s Steps
                                        </h3>
                                        <p className='text-2xl font-bold text-green-700'>
                                            {userData.today.steps.toLocaleString()}
                                        </p>
                                        <p className='text-sm text-green-600'>{userData.today.date}</p>
                                    </div>
                                    <div className='bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200'>
                                        <h3 className='font-semibold text-purple-800 mb-2 flex items-center'>
                                            💻 Today&apos;s GitHub Contributions
                                        </h3>
                                        <p className='text-2xl font-bold text-purple-700'>
                                            {userData.today.contributions}
                                        </p>
                                        <p className='text-sm text-purple-600'>{userData.today.date}</p>
                                    </div>
                                </div>
                            )}

                            {/* Weekly/Monthly Stats */}
                            {userStats && (
                                <div className='grid md:grid-cols-2 gap-6 mb-6'>
                                    <div className='bg-blue-50 p-4 rounded-lg border border-blue-200'>
                                        <h3 className='font-semibold text-blue-800 mb-3'>📅 Weekly Summary</h3>
                                        <div className='space-y-2 text-sm'>
                                            <div className='flex justify-between'>
                                                <span className='text-blue-600'>Total Steps:</span>
                                                <span className='font-medium text-blue-800'>
                                                    {userStats.weekly.total_steps.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className='flex justify-between'>
                                                <span className='text-blue-600'>GitHub Contributions:</span>
                                                <span className='font-medium text-blue-800'>
                                                    {userStats.weekly.total_contributions}
                                                </span>
                                            </div>
                                            <div className='flex justify-between'>
                                                <span className='text-blue-600'>Active Days:</span>
                                                <span className='font-medium text-blue-800'>
                                                    {userStats.weekly.active_days}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='bg-orange-50 p-4 rounded-lg border border-orange-200'>
                                        <h3 className='font-semibold text-orange-800 mb-3'>📅 Monthly Summary</h3>
                                        <div className='space-y-2 text-sm'>
                                            <div className='flex justify-between'>
                                                <span className='text-orange-600'>Total Steps:</span>
                                                <span className='font-medium text-orange-800'>
                                                    {userStats.monthly.total_steps.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className='flex justify-between'>
                                                <span className='text-orange-600'>GitHub Contributions:</span>
                                                <span className='font-medium text-orange-800'>
                                                    {userStats.monthly.total_contributions}
                                                </span>
                                            </div>
                                            <div className='flex justify-between'>
                                                <span className='text-orange-600'>Active Days:</span>
                                                <span className='font-medium text-orange-800'>
                                                    {userStats.monthly.active_days}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Last Updated/Sync Info */}
                            <div className='text-sm text-gray-600 border-t pt-4'>
                                {userData && (
                                    <p>Data last updated: {new Date(userData.last_updated).toLocaleString()}</p>
                                )}
                                {lastSyncTime && <p>Last manual sync: {new Date(lastSyncTime).toLocaleString()}</p>}
                                <p className='text-xs mt-2 text-gray-500'>
                                    💡 Data is automatically synced every 15 minutes. Use manual sync to get the latest
                                    data immediately.
                                </p>
                            </div>
                        </>
                    }
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

                <div className='bg-white rounded-lg shadow-lg p-6 mb-8'>
                    <h2 className='text-xl font-semibold mb-4 text-gray-800'>🧩 その他の機能</h2>
                    <Link href='/missions'>
                        <button className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'>
                            🎯 ミッションを確認する
                        </button>
                    </Link>
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
