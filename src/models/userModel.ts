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

export interface GoogleOAuthData {
    access_token: string
    refresh_token?: string
    expires_in: number
}

export interface GitHubOAuthData {
    access_token: string
    github_user_id: number
    github_username: string
}

export interface CompleteUserCreationData {
    firebase_uid: string
    user_name: string
    user_icon: string
    email?: string
    google_oauth: GoogleOAuthData
    github_oauth: GitHubOAuthData
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
        const [rows] = await db.query<RowDataPacket[]>('SELECT user_id FROM USERS WHERE github_user_id = ?', [githubId])
        return rows.length > 0
    },

    // Create complete user with all OAuth data
    async createCompleteUser(userData: CompleteUserCreationData): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { firebase_uid, user_name, user_icon, email, google_oauth, github_oauth } = userData

        // Calculate Google token expiry
        const googleExpiresAt = new Date(Date.now() + google_oauth.expires_in * 1000)

        await db.query(
            `INSERT INTO USERS 
            (user_id, user_name, user_icon, point, 
             google_access_token, google_refresh_token, google_token_expires_at,
             github_access_token, github_user_id, github_username) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                firebase_uid, // user_id = firebase_uid
                user_name,
                user_icon,
                0, // initial points
                google_oauth.access_token,
                google_oauth.refresh_token || null,
                googleExpiresAt,
                github_oauth.access_token,
                github_oauth.github_user_id.toString(),
                github_oauth.github_username,
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
        const [rows] = await db.query<UserRow[]>('SELECT * FROM USERS WHERE github_user_id = ?', [githubId])

        if (rows.length === 0) {
            return null
        }

        return rows[0]
    },

    // Update Google OAuth tokens for existing user
    async updateGoogleOAuthTokens(userId: string, googleData: GoogleOAuthData): Promise<void> {
        const expiresAt = new Date(Date.now() + googleData.expires_in * 1000)

        await db.query(
            `UPDATE USERS 
             SET google_access_token = ?, google_refresh_token = ?, google_token_expires_at = ?
             WHERE user_id = ?`,
            [googleData.access_token, googleData.refresh_token || null, expiresAt, userId]
        )
    },

    // Update GitHub OAuth tokens for existing user
    async updateGitHubOAuthTokens(userId: string, githubData: GitHubOAuthData): Promise<void> {
        await db.query(
            `UPDATE USERS 
             SET github_access_token = ?, github_user_id = ?, github_username = ?
             WHERE user_id = ?`,
            [githubData.access_token, githubData.github_user_id.toString(), githubData.github_username, userId]
        )
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
