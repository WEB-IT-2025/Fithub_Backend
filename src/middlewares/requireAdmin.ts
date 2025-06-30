import { RequestHandler } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { AUTH_MESSAGES } from '~/constants/messages'

const JWT_SECRET = process.env.JWT_SECRET!

interface AdminPayload extends JwtPayload {
    user_id: string
    user_name: string
    role: string
}

export const requireAdmin: RequestHandler = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ message: AUTH_MESSAGES.TOKEN_NOT_FOUND })
        return
    }

    try {
        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, JWT_SECRET) as AdminPayload

        if (decoded.role !== 'admin') {
            res.status(403).json({ message: AUTH_MESSAGES.NO_PERMISSION })
            return
        }

        next()
    } catch {
        res.status(403).json({ message: AUTH_MESSAGES.SESSION_TOKEN_INVALID })
    }
}
