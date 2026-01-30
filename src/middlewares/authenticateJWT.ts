import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { ENV } from '~/config/loadEnv'

interface JwtPayload {
    user_id: string
    user_name?: string
    iat: number
    exp: number
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'トークンが必要です' })
        return
    }

    const token = authHeader.split(' ')[1]
    try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET)
        // 型ガードでuser_idがあるか確認
        if (typeof decoded === 'string' || !('user_id' in decoded)) {
            res.status(403).json({ message: '無効なトークンです' })
            return
        }
        req.user = decoded as JwtPayload
        next()
    } catch (err) {
        console.error('[JWT Error]', err)
        res.status(403).json({ message: '無効なトークンです' })
    }
}
