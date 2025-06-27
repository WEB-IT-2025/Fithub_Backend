import { RequestHandler } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { AUTH_MESSAGES } from '~/constants/messages'

const JWT_SECRET = process.env.JWT_SECRET!

interface CompletePayload extends JwtPayload {
    user_id: string
    user_name: string
    step?: string
}

export const requireCompleteUser: RequestHandler = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: AUTH_MESSAGES.TOKEN_NOT_FOUND })
        return
    }

    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as CompletePayload

        if (decoded.step !== 'complete') {
            res.status(403).json({ success: false, message: AUTH_MESSAGES.SESSION_TOKEN_INVALID })
            return
        }

        req.user = { user_id: decoded.user_id, user_name: decoded.user_name }
        next()
    } catch {
        res.status(403).json({ success: false, message: AUTH_MESSAGES.SESSION_TOKEN_INVALID })
        return
    }
}
