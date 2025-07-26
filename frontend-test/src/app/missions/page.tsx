'use client'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'

interface Mission {
    mission_id: string
    mission_name: string
    mission_content: number
    reward_content: string
    mission_type: string
}

export default function MissionAdminPage() {
    const { sessionToken, isAuthenticated } = useAuth()
    const [missions, setMissions] = useState<Mission[]>([])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const router = useRouter()
    const [formData, setFormData] = useState({
        mission_id: '',
        mission_name: '',
        mission_content: 0,
        reward_content: '',
        mission_type: '',
    })

    // 一覧取得
    const fetchMissions = async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mission/list`)
        const data = await res.json()
        setMissions(data || [])
    }

    useEffect(() => {
        if (isAuthenticated) {
            fetchMissions()
        }
    }, [isAuthenticated])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    // 作成
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mission/admin/mission_create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify(formData),
        })
        const result = await res.json()
        if (res.ok) {
            setMessage('✅ ミッション作成成功')
            fetchMissions()
        } else {
            setMessage(`❌ エラー: ${result.message || result.error}`)
        }
        setLoading(false)
    }

    // 削除
    // 削除
    const handleDelete = async (id: string) => {
        // パスパラメータ → クエリパラメータに変更
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mission/admin/mission_delete?mission_id=${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${sessionToken}`,
            },
        })
        const result = await res.json()
        if (res.ok) {
            setMessage('🗑️ 削除成功')
            fetchMissions()
        } else {
            setMessage(`❌ エラー: ${result.message || result.error}`)
        }
    }

    if (!isAuthenticated) return <p>🔐 管理者ログインが必要です</p>

    return (
        <div className='min-h-screen bg-gray-100 py-10 px-4'>
            <div className='max-w-3xl mx-auto bg-white p-6 rounded shadow'>
                <h1 className='text-2xl font-bold text-purple-700 mb-4'>🎮 ミッション管理パネル</h1>

                <button
                    onClick={() => router.push('/missions/statuspage')}
                    className='mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                >
                    📊 ステータスページへ移動
                </button>

                {/* 作成フォーム */}
                <form
                    onSubmit={handleCreate}
                    className='space-y-2 mb-8'
                >
                    <h2 className='text-lg font-semibold mb-2'>➕ ミッション作成</h2>
                    <input
                        type='text'
                        name='mission_id'
                        placeholder='mission_id'
                        required
                        className='input w-full'
                        onChange={handleChange}
                    />
                    <input
                        type='text'
                        name='mission_name'
                        placeholder='ミッション名'
                        required
                        className='input w-full'
                        onChange={handleChange}
                    />
                    <input
                        type='number'
                        name='mission_content'
                        placeholder='目標値'
                        required
                        className='input w-full'
                        onChange={handleChange}
                    />
                    <input
                        type='text'
                        name='reward_content'
                        placeholder='報酬内容'
                        className='input w-full'
                        onChange={handleChange}
                    />
                    <input
                        type='text'
                        name='mission_type'
                        placeholder='種類（daily/weeklyなど）'
                        required
                        className='input w-full'
                        onChange={handleChange}
                    />
                    <button
                        type='submit'
                        disabled={loading}
                        className='bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700'
                    >
                        {loading ? '作成中...' : 'ミッション作成'}
                    </button>
                </form>

                {/* 一覧と削除 */}
                <h2 className='text-lg font-semibold mb-2'>📋 登録済みミッション</h2>
                <ul className='space-y-3'>
                    {missions.map((m) => (
                        <li
                            key={m.mission_id}
                            className='border rounded p-3 bg-gray-50 flex justify-between items-center'
                        >
                            <div>
                                <p className='font-semibold'>{m.mission_name}</p>
                                <p className='text-sm text-gray-600'>
                                    ID: {m.mission_id} / Goal: {m.mission_content} / Type: {m.mission_type}
                                </p>
                            </div>
                            <button
                                className='text-sm text-red-500 border border-red-500 rounded px-2 py-1 hover:bg-red-100'
                                onClick={() => handleDelete(m.mission_id)}
                            >
                                削除
                            </button>
                        </li>
                    ))}
                </ul>

                {message && <p className='mt-4 text-center text-sm text-gray-600'>{message}</p>}
            </div>
        </div>
    )
}
