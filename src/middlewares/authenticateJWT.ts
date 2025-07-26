import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { ENV } from '~/config/loadEnv'

interface JwtPayload {
    user_id: string
    user_name?: string
    iat: number
    exp: number
}

// ✅ 修正：戻り値の型を `void` から `any` にする（もしくは `Response`）
export function authenticateJWT(req: Request, res: Response, next: NextFunction): any {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
        return res.status(401).json({ message: 'トークンが必要です' })
    }

    try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload
        req.user = decoded
        next()
    } catch (err) {
        console.error('[JWT Error]', err)
        return res.status(403).json({ message: '無効なトークンです' })
    }
}
