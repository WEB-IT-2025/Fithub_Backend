'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'

export default function CreateMissionPage() {
    const { sessionToken, isAuthenticated } = useAuth()
    const router = useRouter()

    const [formData, setFormData] = useState({
        mission_id: '',
        mission_name: '',
        mission_goal: 0,
        reward_content: '',
        mission_type: '',
    })

    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
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
            setMessage('✅ ミッション作成成功！')
            router.push('/list') // 作成後ミッション一覧に戻る
        } else {
            setMessage(`❌ エラー: ${result.error || result.message}`)
        }

        setLoading(false)
    }

    if (!isAuthenticated) {
        return <p>認証が必要です</p>
    }

    return (
        <div className='min-h-screen flex justify-center items-center bg-gray-100'>
            <div className='bg-white p-8 rounded-lg shadow-md w-full max-w-md'>
                <h1 className='text-2xl font-bold mb-4 text-purple-700'>📝 ミッション作成フォーム</h1>
                <form
                    onSubmit={handleSubmit}
                    className='space-y-4'
                >
                    <input
                        type='text'
                        name='mission_id'
                        placeholder='mission_id'
                        required
                        className='input'
                        onChange={handleChange}
                    />
                    <input
                        type='text'
                        name='mission_name'
                        placeholder='ミッション名'
                        required
                        className='input'
                        onChange={handleChange}
                    />
                    <input
                        type='number'
                        name='mission_goal'
                        placeholder='目標値（数値）'
                        required
                        className='input'
                        onChange={handleChange}
                    />
                    <input
                        type='text'
                        name='reward_content'
                        placeholder='報酬内容'
                        className='input'
                        onChange={handleChange}
                    />
                    <input
                        type='text'
                        name='mission_type'
                        placeholder='種類（steps/github など）'
                        required
                        className='input'
                        onChange={handleChange}
                    />
                    <button
                        type='submit'
                        disabled={loading}
                        className='w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700'
                    >
                        {loading ? '作成中...' : '作成'}
                    </button>
                </form>
                {message && <p className='mt-4 text-center text-sm text-gray-600'>{message}</p>}
            </div>
        </div>
    )
}
