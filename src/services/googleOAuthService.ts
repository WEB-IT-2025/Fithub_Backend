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

    // Get Google Fit activity data for the last 7 days (FOR LEGACY/TESTING - use getUserWeeklySteps instead)
    async getFitnessData(accessToken: string): Promise<GoogleFitnessData> {
        try {
            // ⚠️ NOTE: This function gets 7 DAYS of data, not just today!
            // For today's data only, use getUserStepsToday()
            // For weekly data, use getUserWeeklySteps()
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
    }, // Get user's steps for today specifically (Japan timezone)
    async getUserStepsToday(accessToken: string): Promise<number> {
        try {
            // Get start and end time for today in Japan timezone
            const now = new Date()
            const japanDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })

            // Create Japan timezone start of day (00:00:00 JST)
            const todayJapan = new Date(japanDateStr + 'T00:00:00')
            const startTime = todayJapan.getTime() - 9 * 60 * 60 * 1000 // Convert JST to UTC

            // Create Japan timezone end of day (23:59:59 JST)
            const endOfTodayJapan = new Date(japanDateStr + 'T23:59:59')
            const endTime = endOfTodayJapan.getTime() - 9 * 60 * 60 * 1000 // Convert JST to UTC

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

            const fitnessData = response.data
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

    // Get user's steps for a specific date
    async getUserStepsForDate(accessToken: string, date: Date): Promise<number> {
        try {
            // Get start and end time for the specific date
            const startOfDay = new Date(date)
            startOfDay.setHours(0, 0, 0, 0)
            const startTime = startOfDay.getTime()

            const endOfDay = new Date(date)
            endOfDay.setHours(23, 59, 59, 999)
            const endTime = endOfDay.getTime()

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

            const fitnessData = response.data
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
            console.error(`Failed to get user steps for ${date.toDateString()}:`, error)
            return 0
        }
    },

    // Get user's steps for today with hourly intervals (for daily tracking)
    async getUserStepsTodayByHours(accessToken: string): Promise<{ timestamp: string; steps: number }[]> {
        try {
            console.log('🕐 [Google Fit] Getting hourly steps data (will merge odd hours to even hours)')

            // Get start and end time for today in Japan timezone
            const now = new Date()
            const japanDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })

            // Create Japan timezone start of day (00:00:00 JST)
            const todayJapan = new Date(japanDateStr + 'T00:00:00')
            const startTime = todayJapan.getTime() - 9 * 60 * 60 * 1000 // Convert JST to UTC

            // Create Japan timezone end of day (23:59:59 JST)
            const endOfTodayJapan = new Date(japanDateStr + 'T23:59:59')
            const endTime = endOfTodayJapan.getTime() - 9 * 60 * 60 * 1000 // Convert JST to UTC

            const response = await axios.post(
                'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
                {
                    aggregateBy: [
                        {
                            dataTypeName: 'com.google.step_count.delta',
                            dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
                        },
                    ],
                    bucketByTime: { durationMillis: 60 * 60 * 1000 }, // 1 hour buckets for detailed data
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

            const fitnessData = response.data
            const hourlyData: { timestamp: string; steps: number }[] = []

            // Create a map for all 24 hours (0-23)
            const hourlyStepsMap = new Map<number, number>()
            for (let hour = 0; hour < 24; hour++) {
                hourlyStepsMap.set(hour, 0)
            }

            if (fitnessData.bucket && fitnessData.bucket.length > 0) {
                console.log(`📊 [Google Fit] Found ${fitnessData.bucket.length} hourly buckets`)

                for (const bucket of fitnessData.bucket) {
                    const bucketDate = new Date(parseInt(bucket.startTimeMillis))
                    let bucketSteps = 0

                    if (bucket.dataset && bucket.dataset.length > 0) {
                        for (const dataset of bucket.dataset) {
                            if (dataset.point && dataset.point.length > 0) {
                                for (const point of dataset.point) {
                                    if (point.value && point.value.length > 0) {
                                        bucketSteps += point.value[0].intVal || 0
                                    }
                                }
                            }
                        }
                    }

                    // Convert back to Japan timezone
                    const japanTime = new Date(bucketDate.getTime() + 9 * 60 * 60 * 1000)
                    const hour = japanTime.getHours()

                    // Only include data for the current day in Japan timezone
                    const bucketDateStr = japanTime.toLocaleDateString('en-CA')
                    if (bucketDateStr === japanDateStr && hour >= 0 && hour < 24) {
                        hourlyStepsMap.set(hour, bucketSteps)
                        console.log(`⏰ [Google Fit] Hour ${hour}: ${bucketSteps} steps`)
                    }
                }
            } else {
                console.log('⚠️ [Google Fit] No hourly data buckets found')
            }

            // Calculate cumulative steps for 2-hour intervals
            const cumulativeStepsMap = new Map<number, number>()

            // First, calculate cumulative sum up to each even hour
            for (let hour = 0; hour <= 22; hour += 2) {
                let cumulativeSteps = 0

                // Sum all steps from hour 0 to current hour + 1 (inclusive)
                for (let h = 0; h <= hour + 1 && h < 24; h++) {
                    cumulativeSteps += hourlyStepsMap.get(h) || 0
                }

                cumulativeStepsMap.set(hour, cumulativeSteps)

                if (cumulativeSteps > 0) {
                    console.log(`🔢 [Google Fit] Cumulative up to ${hour + 1}:59 = ${cumulativeSteps} steps`)
                }
            }

            // Generate 2-hour cumulative data for 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22 hours
            for (let hour = 0; hour <= 22; hour += 2) {
                const steps = cumulativeStepsMap.get(hour) || 0
                const timeString = `${hour.toString().padStart(2, '0')}:00`

                hourlyData.push({
                    timestamp: `${japanDateStr} ${timeString}:00`,
                    steps: steps,
                })

                if (steps > 0) {
                    console.log(`✅ [Google Fit] Cumulative at ${hour}:00 = ${steps} steps`)
                }
            }

            console.log(`✅ [Google Fit] Generated ${hourlyData.length} 2-hour interval data points`)
            return hourlyData
        } catch (error) {
            console.error('Failed to get user steps by hours:', error)
            return []
        }
    },

    // Get user's detailed steps data with finer granularity (30-minute intervals)
    async getUserDetailedStepsToday(accessToken: string): Promise<{ timestamp: string; steps: number }[]> {
        try {
            // Get start and end time for today in Japan timezone
            const now = new Date()
            const japanDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })

            // Create Japan timezone start of day (00:00:00 JST)
            const todayJapan = new Date(japanDateStr + 'T00:00:00')
            const startTime = todayJapan.getTime() - 9 * 60 * 60 * 1000 // Convert JST to UTC

            // Create Japan timezone end of day (23:59:59 JST)
            const endOfTodayJapan = new Date(japanDateStr + 'T23:59:59')
            const endTime = endOfTodayJapan.getTime() - 9 * 60 * 60 * 1000 // Convert JST to UTC

            const response = await axios.post(
                'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
                {
                    aggregateBy: [
                        {
                            dataTypeName: 'com.google.step_count.delta',
                            dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
                        },
                    ],
                    bucketByTime: { durationMillis: 30 * 60 * 1000 }, // 30 minute buckets for detailed data
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

            const fitnessData = response.data
            const detailedData: { timestamp: string; steps: number }[] = []

            if (fitnessData.bucket && fitnessData.bucket.length > 0) {
                for (const bucket of fitnessData.bucket) {
                    const bucketDate = new Date(parseInt(bucket.startTimeMillis))
                    let bucketSteps = 0

                    if (bucket.dataset && bucket.dataset.length > 0) {
                        for (const dataset of bucket.dataset) {
                            if (dataset.point && dataset.point.length > 0) {
                                for (const point of dataset.point) {
                                    if (point.value && point.value.length > 0) {
                                        bucketSteps += point.value[0].intVal || 0
                                    }
                                }
                            }
                        }
                    }

                    // Convert back to Japan timezone
                    const japanTime = new Date(bucketDate.getTime() + 9 * 60 * 60 * 1000)

                    // Only include data for the current day in Japan timezone
                    const bucketDateStr = japanTime.toLocaleDateString('en-CA')
                    if (bucketDateStr === japanDateStr && bucketSteps > 0) {
                        detailedData.push({
                            timestamp: japanTime.toISOString().replace('T', ' ').substring(0, 19),
                            steps: bucketSteps,
                        })
                    }
                }
            }

            return detailedData
        } catch (error) {
            console.error('Failed to get detailed user steps:', error)
            return []
        }
    },

    // Get user's weekly steps (last 7 days including today)
    async getUserWeeklySteps(accessToken: string): Promise<{ date: string; steps: number }[]> {
        try {
            // Get start and end time for the last 7 days
            const endTime = new Date()
            endTime.setHours(23, 59, 59, 999)

            const startTime = new Date()
            startTime.setDate(startTime.getDate() - 6) // 7 days including today
            startTime.setHours(0, 0, 0, 0)

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
                    startTimeMillis: startTime.getTime(),
                    endTimeMillis: endTime.getTime(),
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            )

            const fitnessData = response.data
            const weeklyData: { date: string; steps: number }[] = []

            if (fitnessData.bucket && fitnessData.bucket.length > 0) {
                for (const bucket of fitnessData.bucket) {
                    const bucketDate = new Date(parseInt(bucket.startTimeMillis))
                    let dailySteps = 0

                    if (bucket.dataset && bucket.dataset.length > 0) {
                        for (const dataset of bucket.dataset) {
                            if (dataset.point && dataset.point.length > 0) {
                                for (const point of dataset.point) {
                                    if (point.value && point.value.length > 0) {
                                        dailySteps += point.value[0].intVal || 0
                                    }
                                }
                            }
                        }
                    }

                    weeklyData.push({
                        date: bucketDate.toISOString().split('T')[0], // YYYY-MM-DD format
                        steps: dailySteps,
                    })
                }
            }

            return weeklyData
        } catch (error) {
            console.error('Failed to get user weekly steps:', error)
            return []
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
