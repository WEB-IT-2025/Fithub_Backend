// src/middlewares/requireGroupLeader.ts
import { NextFunction, Request, Response } from 'express'
import { groupModel } from '~/models/groupModel'
import { UserPayload } from '~/types/UserPayload'

export async function requireGroupLeader(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = req.user as UserPayload | undefined
    const { group_id } = req.body

    console.log('[requireGroupLeader] user:', user)
    console.log('[requireGroupLeader] group_id:', group_id)

    if (!user?.user_id) {
        console.warn('[requireGroupLeader] ❌ No user found')
        res.status(401).json({ message: '認証が必要です' })
        return
    }

    if (!group_id) {
        console.warn('[requireGroupLeader] ❌ No group_id provided')
        res.status(400).json({ message: 'group_idが必要です' })
        return
    }

    try {
        const isLeader = await groupModel.isGroupLeader(group_id, user.user_id)

        if (isLeader) {
            console.log('[requireGroupLeader] ✅ Group leader access granted')
            return next()
        }

        console.warn('[requireGroupLeader] ❌ Access denied. User is not group leader')
        res.status(403).json({ message: 'この操作はグループリーダーのみ実行できます' })
    } catch (error) {
        console.error('[requireGroupLeader] Error checking group leader:', error)
        res.status(500).json({ message: 'サーバーエラーが発生しました' })
    }
}
