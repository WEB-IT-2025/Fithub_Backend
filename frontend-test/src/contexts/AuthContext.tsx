'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

import { User, onAuthStateChanged } from 'firebase/auth'

import { AuthService, AuthUser } from '@/lib/auth'
import { auth } from '@/lib/firebase'

interface AuthContextType {
    firebaseUser: User | null
    fithubUser: AuthUser | null
    isLoading: boolean
    sessionToken: string | null
    login: () => Promise<void>
    logout: () => Promise<void>
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
    const [fithubUser, setFithubUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [sessionToken, setSessionToken] = useState<string | null>(null)

    useEffect(() => {
        // Listen to Firebase auth state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user)
            setIsLoading(false)
        })

        // Load saved session data
        const savedToken = AuthService.getSessionToken()
        const savedUser = AuthService.getUserData()

        if (savedToken && savedUser) {
            setSessionToken(savedToken)
            setFithubUser(savedUser)
        }

        return () => unsubscribe()
    }, [])

    const login = async () => {
        try {
            setIsLoading(true)

            // Step 1: Firebase Google Sign-in
            const { firebaseToken, googleAccessToken } = await AuthService.signInWithGoogle()

            // Step 2: Verify with backend
            const response = await AuthService.verifyFirebase(firebaseToken, googleAccessToken)

            if (!response.success) {
                throw new Error(response.message || 'Authentication failed')
            }

            // Handle existing user (login complete)
            if (!response.is_new_user && response.session_token && response.user) {
                AuthService.saveSessionToken(response.session_token)
                AuthService.saveUserData(response.user)
                setSessionToken(response.session_token)
                setFithubUser(response.user)
                return
            }

            // Handle new user - need OAuth flow
            if (response.is_new_user && response.temp_session_token) {
                AuthService.saveTempSessionToken(response.temp_session_token)

                // Determine next step
                const oauthUrl = response.google_oauth_url || response.github_oauth_url

                if (oauthUrl) {
                    // Open OAuth flow
                    await AuthService.handleOAuthFlow(oauthUrl)

                    // After OAuth completes, you might want to refresh or redirect
                    // For now, we'll just show a success message
                    console.log('OAuth flow completed')
                }
            }
        } catch (error) {
            console.error('Login error:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const logout = async () => {
        try {
            await AuthService.logout()
            setFirebaseUser(null)
            setFithubUser(null)
            setSessionToken(null)
        } catch (error) {
            console.error('Logout error:', error)
            throw error
        }
    }

    const isAuthenticated = !!(firebaseUser && sessionToken && fithubUser)

    const value: AuthContextType = {
        firebaseUser,
        fithubUser,
        isLoading,
        sessionToken,
        login,
        logout,
        isAuthenticated,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
