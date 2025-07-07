// src/services/authTokenService.ts
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

// Payload for full session token
interface FullSessionTokenPayload {
    user_id: string
    user_name: string
    type: 'full_session'
    iat: number
    exp?: number // Optional, will be set by JWT library
}

// Payload for temporary token
interface TempTokenPayload {
    temp_id: string
    type: 'temp_session'
    iat: number
    exp?: number // Optional, will be set by JWT library
}

export const authTokenService = {
    // Generate full session token (valid for 7 days)
    generateFullSessionToken(userId: string, userName: string): string {
        const payload: FullSessionTokenPayload = {
            user_id: userId,
            user_name: userName,
            type: 'full_session',
            iat: Math.floor(Date.now() / 1000),
        }

        return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
            algorithm: 'HS256',
            expiresIn: '7d',
        })
    },

    // Generate temporary token (valid for 1 hour)
    generateTempToken(): string {
        const tempId = crypto.randomBytes(32).toString('hex')

        const payload: TempTokenPayload = {
            temp_id: tempId,
            type: 'temp_session',
            iat: Math.floor(Date.now() / 1000),
        }

        return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
            algorithm: 'HS256',
            expiresIn: '1h',
        })
    },

    // Verify and decode token
    verifyToken(token: string): FullSessionTokenPayload | TempTokenPayload | null {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as
                | FullSessionTokenPayload
                | TempTokenPayload
            return decoded
        } catch (error) {
            console.error('Token verification failed:', error)
            return null
        }
    },

    // Check if token is expired
    isTokenExpired(token: string): boolean {
        try {
            const decoded = this.verifyToken(token)
            if (!decoded || !decoded.exp) return true

            const currentTime = Math.floor(Date.now() / 1000)
            return decoded.exp < currentTime
        } catch {
            return true
        }
    },
}
