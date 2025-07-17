import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { AUTH_MESSAGES } from '~/constants/messages'

const JWT_SECRET = process.env.JWT_SECRET!

// ✅ 型をここに直接定義
export interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string
        user_name: string
    }
}
export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    console.log('🔐 [verifyToken] Authorization header:', authHeader)

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('⛔ [verifyToken] Missing or malformed Authorization header')
        return res.status(401).json({ success: false, message: AUTH_MESSAGES.TOKEN_NOT_FOUND })
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        console.log('✅ [verifyToken] JWT decoded:', decoded)

        if (typeof decoded === 'string') {
            console.error('❌ [verifyToken] JWT payload is string (should be object)')
            throw new Error()
        }

        req.user = decoded as { user_id: string; user_name: string }
        next()
    } catch (err) {
        console.error('❌ [verifyToken] JWT verification failed:', err)
        return res.status(403).json({ success: false, message: AUTH_MESSAGES.SESSION_TOKEN_INVALID })
    }
}
