// src/lib/auth.ts
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

import { auth } from './firebase'

// Types
export interface AuthUser {
    user_id: string
    user_name: string
    user_icon: string
    email: string
}

export interface AuthResponse {
    success: boolean
    is_new_user: boolean
    session_token?: string
    temp_session_token?: string
    google_oauth_url?: string
    github_oauth_url?: string
    next_step?: string
    user?: AuthUser
    firebase_data?: Record<string, unknown>
    google_data?: Record<string, unknown>
    oauth_data?: Record<string, unknown>
    initial_sync?: Record<string, unknown>
    message?: string
    error_code?: string
}

// Auth Service
export class AuthService {
    private static readonly API_BASE = process.env.NEXT_PUBLIC_API_URL

    // Firebase Google Sign-in
    static async signInWithGoogle(): Promise<{ firebaseToken: string; googleAccessToken?: string }> {
        const provider = new GoogleAuthProvider()

        // Add scopes for Google Fitness API (matching backend requirements)
        provider.addScope('https://www.googleapis.com/auth/fitness.activity.read')
        provider.addScope('openid')
        provider.addScope('email')
        provider.addScope('profile')

        // Request access token for API calls
        provider.setCustomParameters({
            access_type: 'offline',
            prompt: 'consent',
        })

        try {
            const result = await signInWithPopup(auth, provider)
            const firebaseToken = await result.user.getIdToken()

            // Get Google access token from credential
            const credential = GoogleAuthProvider.credentialFromResult(result)
            const googleAccessToken = credential?.accessToken

            return {
                firebaseToken,
                googleAccessToken,
            }
        } catch (error) {
            console.error('Google sign-in error:', error)
            throw error
        }
    }

    // Step 1: Verify Firebase token with backend
    static async verifyFirebase(firebaseToken: string, googleAccessToken?: string): Promise<AuthResponse> {
        const response = await fetch(`${this.API_BASE}/auth/verify-firebase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                firebase_id_token: firebaseToken,
                ...(googleAccessToken && { google_access_token: googleAccessToken }),
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Firebase verification failed')
        }

        return response.json()
    }

    // OAuth URL handler - opens URL in popup and waits for callback
    static async handleOAuthFlow(oauthUrl: string): Promise<AuthResponse> {
        return new Promise((resolve, reject) => {
            const popup = window.open(oauthUrl, 'oauth', 'width=500,height=600,scrollbars=yes,resizable=yes')

            // Check for popup blocked
            if (!popup) {
                reject(new Error('Popup blocked. Please allow popups and try again.'))
                return
            }

            // Listen for postMessage from popup
            const messageHandler = (event: MessageEvent) => {
                // Ensure the message is from our popup
                if (event.source !== popup) return

                if (event.data.type === 'AUTH_SUCCESS') {
                    popup.close()
                    window.removeEventListener('message', messageHandler)
                    clearTimeout(timeoutId)
                    clearInterval(pollTimer)

                    // Return the data from the callback
                    resolve(
                        event.data.data || {
                            success: true,
                            is_new_user: false,
                            message: 'OAuth completed successfully',
                        }
                    )
                } else if (event.data.type === 'AUTH_ERROR') {
                    popup.close()
                    window.removeEventListener('message', messageHandler)
                    clearTimeout(timeoutId)
                    clearInterval(pollTimer)
                    reject(new Error(event.data.error || 'OAuth failed'))
                }
            }

            window.addEventListener('message', messageHandler)

            // Fallback: Poll for popup closure
            const pollTimer = setInterval(() => {
                if (popup.closed) {
                    clearInterval(pollTimer)
                    window.removeEventListener('message', messageHandler)
                    clearTimeout(timeoutId)
                    reject(new Error('OAuth cancelled by user'))
                }
            }, 1000)

            // Timeout after 5 minutes
            const timeoutId = setTimeout(() => {
                if (!popup.closed) {
                    popup.close()
                    clearInterval(pollTimer)
                    window.removeEventListener('message', messageHandler)
                    reject(new Error('OAuth timeout'))
                }
            }, 300000)
        })
    }

    // Storage helpers
    static saveSessionToken(token: string) {
        localStorage.setItem('fithub_session_token', token)
    }

    static getSessionToken(): string | null {
        return localStorage.getItem('fithub_session_token')
    }

    static saveTempSessionToken(token: string) {
        sessionStorage.setItem('fithub_temp_session_token', token)
    }

    static getTempSessionToken(): string | null {
        return sessionStorage.getItem('fithub_temp_session_token')
    }

    static saveUserData(user: AuthUser) {
        localStorage.setItem('fithub_user_data', JSON.stringify(user))
    }

    static getUserData(): AuthUser | null {
        const data = localStorage.getItem('fithub_user_data')
        return data ? JSON.parse(data) : null
    }

    static clearAuthData() {
        localStorage.removeItem('fithub_session_token')
        localStorage.removeItem('fithub_user_data')
        sessionStorage.removeItem('fithub_temp_session_token')
    }

    // Logout
    static async logout() {
        try {
            await auth.signOut()
            this.clearAuthData()
        } catch (error) {
            console.error('Logout error:', error)
            throw error
        }
    }
}
