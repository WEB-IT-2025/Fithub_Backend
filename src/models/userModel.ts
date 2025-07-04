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
    email?: string
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
    email?: string
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

    // Find user by email
    async findByEmail(email: string): Promise<CompleteUser | null> {
        const [rows] = await db.query<UserRow[]>('SELECT * FROM USERS WHERE email = ?', [email])

        if (rows.length === 0) {
            return null
        }

        return rows[0]
    },

    // Create complete user with all OAuth data
    async createCompleteUser(userData: CompleteUserCreationData): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { firebase_uid, user_name, user_icon, email, google_oauth, github_oauth } = userData

        // Calculate Google token expiry
        const googleExpiresAt = new Date(Date.now() + google_oauth.expires_in * 1000)

        // 🔍 DEBUG: Log data before saving to database
        console.log('💾 [DB] Creating user with data:', {
            firebase_uid,
            user_name,
            hasGoogleAccessToken: !!google_oauth.access_token,
            hasGoogleRefreshToken: !!google_oauth.refresh_token,
            googleRefreshTokenLength: google_oauth.refresh_token ? google_oauth.refresh_token.length : 0,
            googleRefreshTokenValue: google_oauth.refresh_token || 'EMPTY',
            googleExpiresAt: googleExpiresAt.toISOString(),
        })

        await db.query(
            `INSERT INTO USERS 
            (user_id, user_name, user_icon, email, point, 
             google_access_token, google_refresh_token, google_token_expires_at,
             github_access_token, github_refresh_token, github_user_id, github_username) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                firebase_uid, // user_id = firebase_uid
                user_name,
                user_icon,
                email, // Add email to the insert
                0, // initial points
                google_oauth.access_token,
                google_oauth.refresh_token || '',
                googleExpiresAt,
                github_oauth.access_token,
                '', // GitHub OAuth usually doesn't provide refresh_token, use empty string
                github_oauth.github_user_id.toString(),
                github_oauth.github_username,
            ]
        )

        // 🔍 DEBUG: Verify data was saved correctly
        const [rows] = await db.query<UserRow[]>(
            'SELECT user_name, google_refresh_token FROM USERS WHERE user_id = ?',
            [firebase_uid]
        )
        if (rows.length > 0) {
            console.log('✅ [DB] User created successfully:', {
                firebase_uid,
                user_name: rows[0].user_name,
                hasRefreshTokenInDB: !!rows[0].google_refresh_token,
                refreshTokenInDB: rows[0].google_refresh_token || 'EMPTY',
            })
        }
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
            [googleData.access_token, googleData.refresh_token || '', expiresAt, userId]
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

    // NEW: Create user from Google OAuth directly (no Firebase)
    async createUserFromGoogleOAuth(userData: {
        email: string
        name: string
        picture: string
        google_oauth: GoogleOAuthData
        github_oauth: GitHubOAuthData
    }): Promise<string> {
        // Generate a unique user ID
        const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

        // Calculate Google token expiry
        const googleExpiresAt = new Date(Date.now() + userData.google_oauth.expires_in * 1000)

        // 🔍 DEBUG: Log data before saving to database
        console.log('💾 [DB] Creating user from Google OAuth with data:', {
            userId,
            email: userData.email,
            name: userData.name,
            hasGoogleAccessToken: !!userData.google_oauth.access_token,
            hasGoogleRefreshToken: !!userData.google_oauth.refresh_token,
            googleRefreshTokenLength:
                userData.google_oauth.refresh_token ? userData.google_oauth.refresh_token.length : 0,
            googleRefreshTokenValue: userData.google_oauth.refresh_token || 'EMPTY',
            googleExpiresAt: googleExpiresAt.toISOString(),
        })

        await db.query(
            `INSERT INTO USERS 
            (user_id, user_name, user_icon, email, point, 
             google_access_token, google_refresh_token, google_token_expires_at,
             github_access_token, github_refresh_token, github_user_id, github_username) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                userData.name,
                userData.picture,
                userData.email,
                0, // initial points
                userData.google_oauth.access_token,
                userData.google_oauth.refresh_token || '',
                googleExpiresAt,
                userData.github_oauth.access_token,
                '', // GitHub OAuth usually doesn't provide refresh_token
                userData.github_oauth.github_user_id.toString(),
                userData.github_oauth.github_username,
            ]
        )

        // 🔍 DEBUG: Verify data was saved correctly
        const [rows] = await db.query<UserRow[]>(
            'SELECT user_name, email, google_refresh_token FROM USERS WHERE user_id = ?',
            [userId]
        )
        if (rows.length > 0) {
            console.log('✅ [DB] User created successfully from Google OAuth:', {
                userId,
                user_name: rows[0].user_name,
                email: rows[0].email,
                hasRefreshTokenInDB: !!rows[0].google_refresh_token,
                refreshTokenInDB: rows[0].google_refresh_token || 'EMPTY',
            })
        }

        return userId
    },
}
