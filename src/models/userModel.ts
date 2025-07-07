// src/models/userModel.ts
import { RowDataPacket } from 'mysql2'
import db from '~/config/database'

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

export interface UserCreationData {
    email: string
    name: string
    picture: string
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
    async checkGithubIdExists(githubId: string): Promise<boolean> {
        const [rows] = await db.query<RowDataPacket[]>('SELECT user_id FROM USERS WHERE github_user_id = ?', [githubId])
        return rows.length > 0
    },

    async checkEmailExists(email: string): Promise<boolean> {
        const [rows] = await db.query<RowDataPacket[]>('SELECT user_id FROM USERS WHERE email = ?', [email])
        return rows.length > 0
    },

    async findByGithubId(githubId: string): Promise<CompleteUser | null> {
        const [rows] = await db.query<UserRow[]>('SELECT * FROM USERS WHERE github_user_id = ?', [githubId])

        if (rows.length === 0) {
            return null
        }

        return rows[0]
    },

    // Find user by email
    async findByEmail(email: string): Promise<CompleteUser | null> {
        const [rows] = await db.query<UserRow[]>('SELECT * FROM USERS WHERE email = ?', [email])

        if (rows.length === 0) {
            return null
        }

        return rows[0]
    },

    // Create user with Google and GitHub OAuth data
    async createUserFromGoogleOAuth(userData: UserCreationData): Promise<string> {
        const { email, name, picture, google_oauth, github_oauth } = userData

        // Generate unique user ID
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Calculate Google token expiry
        const googleExpiresAt = new Date(Date.now() + google_oauth.expires_in * 1000)

        await db.query(
            `INSERT INTO USERS 
            (user_id, user_name, user_icon, email, point, 
             google_access_token, google_refresh_token, google_token_expires_at,
             github_access_token, github_refresh_token, github_user_id, github_username) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                name,
                picture,
                email,
                0, // initial points
                google_oauth.access_token,
                google_oauth.refresh_token || '',
                googleExpiresAt,
                github_oauth.access_token,
                '', // GitHub OAuth usually doesn't provide refresh_token
                github_oauth.github_user_id.toString(),
                github_oauth.github_username,
            ]
        )

        console.log('✅ [DB] User created successfully:', {
            user_id: userId,
            user_name: name,
            email: email,
        })

        return userId
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
}
