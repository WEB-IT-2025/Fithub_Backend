import { NextFunction, Request, Response } from 'express'
import { ENV } from '~/config/loadEnv'
import { UserPayload } from '~/types/UserPayload'
import { isAdmin } from '~/utils/admin'

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    const user = req.user as UserPayload | undefined
    console.log('[requireAdmin] user:', user)
    console.log('[requireAdmin] ADMIN_USER_IDS:', ENV.ADMIN_USER_IDS)

    if (user?.user_id && isAdmin(user)) {
        console.log('[requireAdmin] ✅ Access granted')
        return next()
    }

    console.warn('[requireAdmin] ❌ Access denied. user:', user)
    res.status(403).json({ message: 'この操作を行う権限がありません' })
}
