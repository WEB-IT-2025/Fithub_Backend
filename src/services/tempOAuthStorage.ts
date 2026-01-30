// src/services/tempOAuthStorage.ts
// Temporary storage for OAuth data between Google and GitHub callbacks
// In production, this should be Redis or database table
import { GoogleOAuthData } from '~/models/userModel'

interface TempOAuthData {
    temp_id: string
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
        tempId: string,
        googleOAuth: GoogleOAuthData,
        googleUserInfo: {
            google_id: string
            name: string
            email: string
            picture: string
        }
    ): void {
        tempStorage.set(tempId, {
            temp_id: tempId,
            google_oauth: googleOAuth,
            google_user_info: googleUserInfo,
            created_at: Date.now(),
        })
    },

    // Retrieve and remove Google OAuth data
    getAndRemoveGoogleOAuth(tempId: string): TempOAuthData | null {
        const data = tempStorage.get(tempId)
        if (!data) {
            return null
        }

        // Check if expired
        if (Date.now() - data.created_at > EXPIRY_TIME) {
            tempStorage.delete(tempId)
            return null
        }

        // Remove from storage (one-time use)
        tempStorage.delete(tempId)
        return data
    },

    // Check if data exists (for debugging)
    hasData(tempId: string): boolean {
        return tempStorage.has(tempId)
    },

    // Get storage size (for monitoring)
    getStorageSize(): number {
        return tempStorage.size
    },
}
