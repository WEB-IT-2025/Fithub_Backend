'use client'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'

interface MissionStatus {
    mission_id: string
    mission_goal: number
    current_status: number
    clear_status: boolean
    clear_time: string | null
}

export default function MissionPage() {
    const { user, sessionToken, isAuthenticated } = useAuth()
    const router = useRouter()
    const [missions, setMissions] = useState<MissionStatus[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/')
            return
        }

        const fetchMissions = async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/missions/status?user_id=${user?.user_id}`, {
                headers: {
                    Authorization: `Bearer ${sessionToken}`,
                },
            })

            const data = await res.json()
            setMissions(Array.isArray(data) ? data : [])
            setLoading(false)
        }

        fetchMissions()
    }, [isAuthenticated, user, sessionToken, router])

    return (
        <div className='min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 py-8 px-4'>
            <div className='max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md'>
                <h1 className='text-2xl font-bold mb-4 text-purple-800'>🎯 あなたのミッション</h1>
                {loading ?
                    <p>読み込み中...</p>
                : missions.length === 0 ?
                    <p>ミッションがありません。</p>
                :   <ul className='space-y-4'>
                        {missions.map((mission) => (
                            <li
                                key={mission.mission_id}
                                className={`border rounded-md p-4 ${
                                    mission.clear_status ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
                                }`}
                            >
                                <div className='flex justify-between items-center'>
                                    <span className='font-semibold'>{mission.mission_id}</span>
                                    <span
                                        className={`text-sm font-bold ${
                                            mission.clear_status ? 'text-green-600' : 'text-gray-500'
                                        }`}
                                    >
                                        {mission.clear_status ? '✅ 達成' : '⏳ 未達成'}
                                    </span>
                                </div>
                                <div className='text-sm mt-2 text-gray-600'>
                                    目標: {mission.mission_goal} / 現在: {mission.current_status}
                                </div>
                                {mission.clear_time && (
                                    <div className='text-xs text-gray-400'>
                                        達成日: {new Date(mission.clear_time).toLocaleString()}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                }
            </div>
        </div>
    )
}
