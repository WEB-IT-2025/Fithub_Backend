'use client'

import { useEffect, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'

export default function MissionStatusPage() {
    const { sessionToken, isAuthenticated, user } = useAuth()
    const [message, setMessage] = useState('Loading...')
    const [data, setData] = useState<[]>([])

    // デバッグ用ログ
    console.log('=== 認証デバッグ ===')
    console.log('isAuthenticated:', isAuthenticated)
    console.log('sessionToken exists:', !!sessionToken)
    console.log('sessionToken length:', sessionToken?.length)
    console.log('user object:', user)
    console.log('user_id:', user?.user_id)

    useEffect(() => {
        if (isAuthenticated && sessionToken && user?.user_id) {
            // 実際のユーザーIDを使用
            const userId = user.user_id

            console.log('API呼び出し開始 - userId:', userId)

            fetch(`${process.env.NEXT_PUBLIC_API_URL}/mission/status?user_id=${userId}`, {
                headers: {
                    Authorization: `Bearer ${sessionToken}`,
                },
            })
                .then((res) => {
                    console.log('Response status:', res.status)
                    console.log('Response headers:', res.headers)

                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
                    }
                    return res.json()
                })
                .then((json) => {
                    console.log('Fetched status:', json)
                    setData(json)
                    setMessage('✅ 取得成功')
                })
                .catch((err) => {
                    console.error('API Error:', err)
                    setMessage(`❌ エラー: ${err.message}`)
                })
        } else {
            // より詳細なエラーメッセージ
            let reason = '未認証の理由: '
            if (!isAuthenticated) reason += '認証されていない '
            if (!sessionToken) reason += 'セッショントークンなし '
            if (!user?.user_id) reason += 'ユーザーIDなし '

            console.log(reason)
            setMessage(reason)
        }
    }, [isAuthenticated, sessionToken, user]) // userも依存配列に追加

    // フロントエンドに追加（デバッグ用）
    useEffect(() => {
        if (sessionToken) {
            try {
                // JWTトークンをデコード（署名検証なし）
                const payload = JSON.parse(atob(sessionToken.split('.')[1]))
                console.log('JWT payload:', payload)
                console.log('step value:', payload.step)
            } catch (e) {
                console.error('Token decode error:', e)
            }
        }
    }, [sessionToken])

    return (
        <div className='p-4'>
            <h1 className='text-xl font-bold mb-4'>🧪 ステータスデバッグ</h1>
            <p>{message}</p>

            {/* デバッグ情報表示 */}
            <div className='bg-yellow-100 p-3 mt-4 rounded text-sm'>
                <h3 className='font-semibold'>認証状態:</h3>
                <p>認証済み: {isAuthenticated ? '✅' : '❌'}</p>
                <p>トークン: {sessionToken ? '✅' : '❌'}</p>
                <p>ユーザーID: {user?.user_id || '❌'}</p>
            </div>

            <pre className='bg-gray-100 p-2 mt-4 rounded text-xs whitespace-pre-wrap'>
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    )
}
