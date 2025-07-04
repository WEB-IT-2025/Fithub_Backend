'use client'

import { ReactNode, createContext, useContext, useEffect, useState } from 'react'

interface User {
    user_id: string
    user_name: string
    user_icon: string
    email: string
}

interface OAuthData {
    google?: {
        google_id: string
        name: string
        email: string
        picture: string
        connected: boolean
        has_refresh_token?: boolean
    }
    github?: {
        github_id: number
        username: string
        name: string
        email: string
        avatar_url: string
        public_repos: number
        followers: number
        connected: boolean
    }
}

interface AuthContextType {
    user: User | null
    oauthData: OAuthData | null
    sessionToken: string | null
    isAuthenticated: boolean
    login: (sessionToken: string, user: User, oauthData: OAuthData) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [oauthData, setOauthData] = useState<OAuthData | null>(null)
    const [sessionToken, setSessionToken] = useState<string | null>(null)

    // Load auth data from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('session_token')
        const savedUser = localStorage.getItem('user_data')
        const savedOAuthData = localStorage.getItem('oauth_data')

        if (savedToken && savedUser && savedOAuthData) {
            try {
                setSessionToken(savedToken)
                setUser(JSON.parse(savedUser))
                setOauthData(JSON.parse(savedOAuthData))
            } catch (error) {
                console.error('Error loading auth data:', error)
                // Clear corrupted data
                localStorage.removeItem('session_token')
                localStorage.removeItem('user_data')
                localStorage.removeItem('oauth_data')
            }
        }
    }, [])

    const login = (token: string, userData: User, oauthDataParam: OAuthData) => {
        setSessionToken(token)
        setUser(userData)
        setOauthData(oauthDataParam)

        // Save to localStorage
        localStorage.setItem('session_token', token)
        localStorage.setItem('user_data', JSON.stringify(userData))
        localStorage.setItem('oauth_data', JSON.stringify(oauthDataParam))
    }

    const logout = () => {
        setSessionToken(null)
        setUser(null)
        setOauthData(null)

        // Clear localStorage
        localStorage.removeItem('session_token')
        localStorage.removeItem('user_data')
        localStorage.removeItem('oauth_data')
    }

    const isAuthenticated = !!(sessionToken && user)

    return (
        <AuthContext.Provider
            value={{
                user,
                oauthData,
                sessionToken,
                isAuthenticated,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
