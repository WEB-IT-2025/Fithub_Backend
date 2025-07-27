import { RequestHandler } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { AUTH_MESSAGES } from '~/constants/messages'

const JWT_SECRET = process.env.JWT_SECRET!

interface CompletePayload extends JwtPayload {
    user_id: string
    user_name: string
    type?: string
}

export const requireCompleteUser: RequestHandler = (req, res, next) => {
    const authHeader = req.headers.authorization
    console.log('Authorization header:', req.headers.authorization)

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: AUTH_MESSAGES.TOKEN_NOT_FOUND })
        return
    }

    try {
        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, JWT_SECRET) as CompletePayload
        console.log('Decoded token:', decoded)

        // stepの代わりにtypeをチェック
        if (decoded.type !== 'full_session') {
            console.log('Type is not full_session:', decoded.type)
            res.status(403).json({ success: false, message: AUTH_MESSAGES.SESSION_TOKEN_INVALID })
            return
        }

        req.user = { user_id: decoded.user_id, user_name: decoded.user_name }
        next()
    } catch (error) {
        console.log('JWT verify error:', error)
        res.status(403).json({ success: false, message: AUTH_MESSAGES.SESSION_TOKEN_INVALID })
        return
    }
}
