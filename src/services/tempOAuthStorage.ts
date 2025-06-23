// src/services/tempOAuthStorage.ts
// Temporary storage for OAuth data between Google and GitHub callbacks
// In production, this should be Redis or database table
import { GoogleOAuthData } from '~/models/userModel'

interface TempOAuthData {
    firebase_uid: string
    google_oauth: GoogleOAuthData
    google_user_info: {
        google_id: string
        name: string
        email: string
        picture: string
    }
    created_at: number
}

// In-memory storage (use Redis in production)
const tempStorage = new Map<string, TempOAuthData>()

// Clean up expired entries every 15 minutes
const CLEANUP_INTERVAL = 15 * 60 * 1000 // 15 minutes
const EXPIRY_TIME = 10 * 60 * 1000 // 10 minutes

setInterval(() => {
    const now = Date.now()
    for (const [key, data] of tempStorage.entries()) {
        if (now - data.created_at > EXPIRY_TIME) {
            tempStorage.delete(key)
        }
    }
}, CLEANUP_INTERVAL)

export const tempOAuthStorage = {
    // Store Google OAuth data temporarily
    storeGoogleOAuth(
        firebaseUid: string,
        googleOAuth: GoogleOAuthData,
        googleUserInfo: {
            google_id: string
            name: string
            email: string
            picture: string
        }
    ): void {
        tempStorage.set(firebaseUid, {
            firebase_uid: firebaseUid,
            google_oauth: googleOAuth,
            google_user_info: googleUserInfo,
            created_at: Date.now(),
        })
    },

    // Retrieve and remove Google OAuth data
    getAndRemoveGoogleOAuth(firebaseUid: string): TempOAuthData | null {
        const data = tempStorage.get(firebaseUid)
        if (!data) {
            return null
        }

        // Check if expired
        if (Date.now() - data.created_at > EXPIRY_TIME) {
            tempStorage.delete(firebaseUid)
            return null
        }

        // Remove from storage (one-time use)
        tempStorage.delete(firebaseUid)
        return data
    },

    // Check if data exists (for debugging)
    hasData(firebaseUid: string): boolean {
        return tempStorage.has(firebaseUid)
    },

    // Get storage size (for monitoring)
    getStorageSize(): number {
        return tempStorage.size
    },
}
