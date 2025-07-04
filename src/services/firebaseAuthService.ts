// src/services/firebaseAuthService.ts
import jwt from 'jsonwebtoken'
import admin from '~/config/firebase'
import { ENV } from '~/config/loadEnv'
import { FirebaseVerificationResult, userModel } from '~/models/userModel'

const JWT_SECRET = process.env.JWT_SECRET!
const TEMP_TOKEN_EXPIRY = '10m' // Temporary token expires in 10 minutes

// Payload for temporary session token (for Firebase verification step)
interface TempSessionPayload {
    firebase_uid: string
    user_name: string
    user_icon: string
    email?: string
    step: 'firebase_verified'
    iat?: number
    exp?: number
}

// Payload for full session token (after complete account creation)
interface FullSessionPayload {
    user_id: string
    user_name: string
    step: 'complete'
    iat?: number
    exp?: number
}

export const firebaseAuthService = {
    // Verify Firebase ID token and return user data
    async verifyFirebaseToken(idToken: string): Promise<FirebaseVerificationResult> {
        try {
            // Verify Firebase ID token
            const decodedToken = await admin.auth().verifyIdToken(idToken)

            const userData = {
                user_name: decodedToken.name || 'Anonymous User',
                user_icon: decodedToken.picture || '',
                email: decodedToken.email,
            }

            // Check if user already exists and return verification result
            const result = await userModel.verifyFirebaseUser(decodedToken.uid, userData)

            return result
        } catch (error) {
            console.error('Firebase token verification error:', error)
            throw new Error('Invalid Firebase ID token')
        }
    },

    // Generate temporary session token for Firebase verification step
    generateTempSessionToken(verificationResult: FirebaseVerificationResult): string {
        const payload: TempSessionPayload = {
            firebase_uid: verificationResult.firebase_uid,
            user_name: verificationResult.user_name,
            user_icon: verificationResult.user_icon,
            email: verificationResult.email,
            step: 'firebase_verified',
        }

        return jwt.sign(payload, JWT_SECRET, { expiresIn: TEMP_TOKEN_EXPIRY })
    },

    // Verify temporary session token
    verifyTempSessionToken(token: string): TempSessionPayload {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as TempSessionPayload

            if (decoded.step !== 'firebase_verified') {
                throw new Error('Invalid session step')
            }

            return decoded
        } catch (error) {
            console.error('Temp session token verification error:', error)
            throw new Error('Invalid or expired temporary session token')
        }
    },

    // Generate full session token (after complete account creation)
    generateFullSessionToken(userId: string, userName: string): string {
        const payload: FullSessionPayload = {
            user_id: userId,
            user_name: userName,
            step: 'complete',
        }

        return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
    },

    // Generate Google OAuth URL with Fitness scopes
    generateGoogleOAuthUrl(tempSessionToken: string): string {
        const params = new URLSearchParams({
            client_id: ENV.GOOGLE_CLIENT_ID || '',
            redirect_uri: ENV.GOOGLE_CALLBACK_URL,
            response_type: 'code',
            scope: 'openid email profile https://www.googleapis.com/auth/fitness.activity.read',
            access_type: 'offline',
            prompt: 'consent',
            state: tempSessionToken, // Pass temp token as state for security
        })

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    },
}
