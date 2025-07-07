// src/services/googleOAuthService.ts
import axios from 'axios'
import { ENV } from '~/config/loadEnv'

interface GoogleTokenResponse {
    access_token: string
    refresh_token?: string
    expires_in: number
    token_type: string
    scope: string
}

interface GoogleUserInfo {
    id: string
    email: string
    name: string
    picture: string
    given_name: string
    family_name: string
}

interface GoogleFitnessData {
    bucket: Array<{
        startTimeMillis: string
        endTimeMillis: string
        dataset: Array<{
            dataSourceId: string
            point: Array<{
                startTimeNanos: string
                endTimeNanos: string
                dataTypeName: string
                value: Array<{ intVal: number }>
            }>
        }>
    }>
}

export const googleOAuthService = {
    // Exchange authorization code for access token
    async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
        try {
            const tokenUrl = 'https://oauth2.googleapis.com/token'

            const params = {
                client_id: ENV.GOOGLE_CLIENT_ID!,
                client_secret: ENV.GOOGLE_CLIENT_SECRET!,
                code,
                grant_type: 'authorization_code',
                redirect_uri:
                    ENV.GOOGLE_CALLBACK_URL ||
                    `${ENV.HOST_NAME === 'localhost' ? 'http' : 'https'}://${ENV.HOST_NAME}:${ENV.PORT}/api/auth/google/callback`,
            }

            const response = await axios.post(tokenUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            })

            if (!response.data.access_token) {
                throw new Error('No access token received from Google')
            }

            return response.data as GoogleTokenResponse
        } catch (error) {
            console.error('Google OAuth token exchange error:', error)
            if (axios.isAxiosError(error)) {
                console.error('Response data:', error.response?.data)
                console.error('Response status:', error.response?.status)
            }
            throw new Error('Failed to exchange authorization code for tokens')
        }
    },

    // Get user info from Google using access token
    async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
        try {
            const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            return response.data as GoogleUserInfo
        } catch (error) {
            console.error('Google user info fetch error:', error)
            throw new Error('Failed to fetch user info from Google')
        }
    },

    // Get Google Fit activity data (example)
    async getFitnessData(accessToken: string): Promise<GoogleFitnessData> {
        try {
            // Example: Get step count data for the last 7 days
            const endTime = new Date().getTime()
            const startTime = endTime - 7 * 24 * 60 * 60 * 1000 // 7 days ago

            const response = await axios.post(
                'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
                {
                    aggregateBy: [
                        {
                            dataTypeName: 'com.google.step_count.delta',
                            dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
                        },
                    ],
                    bucketByTime: { durationMillis: 86400000 }, // 1 day buckets
                    startTimeMillis: startTime,
                    endTimeMillis: endTime,
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            )

            return response.data
        } catch (error) {
            console.error('Google Fit data fetch error:', error)
            throw new Error('Failed to fetch fitness data from Google')
        }
    },

    // Get user's steps for today specifically
    async getUserStepsToday(accessToken: string): Promise<number> {
        try {
            const fitnessData = await this.getFitnessData(accessToken)

            // Extract step count from the fitness data
            let totalSteps = 0

            if (fitnessData.bucket && fitnessData.bucket.length > 0) {
                for (const bucket of fitnessData.bucket) {
                    if (bucket.dataset && bucket.dataset.length > 0) {
                        for (const dataset of bucket.dataset) {
                            if (dataset.point && dataset.point.length > 0) {
                                for (const point of dataset.point) {
                                    if (point.value && point.value.length > 0) {
                                        totalSteps += point.value[0].intVal || 0
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return totalSteps
        } catch (error) {
            console.error('Failed to get user steps today:', error)
            return 0 // Return 0 if error, don't throw
        }
    },

    // Refresh access token using refresh token
    async refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
        try {
            const tokenUrl = 'https://oauth2.googleapis.com/token'

            const params = {
                client_id: ENV.GOOGLE_CLIENT_ID!,
                client_secret: ENV.GOOGLE_CLIENT_SECRET!,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }

            const response = await axios.post(tokenUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            })

            return response.data as GoogleTokenResponse
        } catch (error) {
            console.error('Google token refresh error:', error)
            throw new Error('Failed to refresh Google access token')
        }
    },
}
