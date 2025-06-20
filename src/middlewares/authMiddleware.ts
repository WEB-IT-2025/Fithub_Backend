import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

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

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'トークンが見つかりません' })
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        if (typeof decoded === 'string') throw new Error()
        req.user = decoded as { user_id: string; user_name: string }
        next()
    } catch {
        return res.status(403).json({ success: false, message: 'トークンが無効です' })
    }
}
