// src/models/userModel.ts
import { RowDataPacket } from 'mysql2'
import db from '~/config/database'

export interface FirebaseUserData {
    firebase_uid: string
    user_name: string
    user_icon: string
    email?: string
}

// Temporary session data for Firebase verification step
export interface FirebaseVerificationResult {
    firebase_uid: string
    user_name: string
    user_icon: string
    email?: string
    is_existing_user: boolean
}

export interface CompleteUser {
    user_id: string
    user_name: string
    user_icon: string
    point: number
    google_access_token: string | null
    google_refresh_token: string | null
    google_token_expires_at: Date | null
    github_access_token: string | null
    github_refresh_token: string | null
    github_token_expires_at: Date | null
    github_user_id: string | null
    github_username: string | null
}

interface UserRow extends RowDataPacket {
    user_id: string
    user_name: string
    user_icon: string
    point: number
    google_access_token: string | null
    google_refresh_token: string | null
    google_token_expires_at: Date | null
    github_access_token: string | null
    github_refresh_token: string | null
    github_token_expires_at: Date | null
    github_user_id: string | null
    github_username: string | null
}

export const userModel = {
    async checkFirebaseUidExists(firebaseUid: string): Promise<boolean> {
        const [rows] = await db.query<RowDataPacket[]>('SELECT user_id FROM USERS WHERE user_id = ?', [firebaseUid])
        return rows.length > 0
    },

    async checkGithubIdExists(githubId: string): Promise<boolean> {
        const [rows] = await db.query<RowDataPacket[]>('SELECT user_id FROM USERS WHERE git_id = ?', [githubId])
        return rows.length > 0
    },

    async createCompleteUser(userData: {
        firebaseUid: string
        userName: string
        userIcon: string
        githubId: string
        githubAccessToken: string
        googleAccessToken?: string
        googleRefreshToken?: string
    }): Promise<void> {
        const { firebaseUid, userName, userIcon, githubId, githubAccessToken, googleAccessToken, googleRefreshToken } =
            userData

        await db.query(
            `INSERT INTO USERS 
            (user_id, user_name, user_icon, point, git_access, git_id, google_access_token, google_refresh_token) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                firebaseUid, // user_id = firebase_uid
                userName,
                userIcon,
                0, // initial points
                githubAccessToken,
                githubId,
                googleAccessToken || null,
                googleRefreshToken || null,
            ]
        )
    },

    // Get user by Firebase UID (for login)
    async getUserByFirebaseUid(firebaseUid: string): Promise<CompleteUser | null> {
        const [rows] = await db.query<UserRow[]>('SELECT * FROM USERS WHERE user_id = ?', [firebaseUid])

        if (rows.length === 0) {
            return null
        }

        return rows[0]
    },

    // Get user by GitHub ID (for login)
    async getUserByGithubId(githubId: string): Promise<CompleteUser | null> {
        const [rows] = await db.query<UserRow[]>('SELECT * FROM USERS WHERE git_id = ?', [githubId])

        if (rows.length === 0) {
            return null
        }

        return rows[0]
    },

    // Verify Firebase user and check if already exists (for verify-firebase step)
    async verifyFirebaseUser(
        firebaseUid: string,
        userData: {
            user_name: string
            user_icon: string
            email?: string
        }
    ): Promise<FirebaseVerificationResult> {
        // Check if user already exists in database
        const existingUser = await this.getUserByFirebaseUid(firebaseUid)

        return {
            firebase_uid: firebaseUid,
            user_name: userData.user_name,
            user_icon: userData.user_icon,
            email: userData.email,
            is_existing_user: existingUser !== null,
        }
    },
}
