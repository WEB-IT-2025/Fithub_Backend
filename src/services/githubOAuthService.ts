// src/services/githubOAuthService.ts
import axios from 'axios'
import { ENV } from '~/config/loadEnv'

interface GitHubTokenResponse {
    access_token: string
    token_type: string
    scope: string
}

interface GitHubUserInfo {
    id: number
    login: string
    name: string
    email: string
    avatar_url: string
    bio: string
    public_repos: number
    followers: number
    following: number
    created_at: string
}

interface GitHubContributionData {
    total_count: number
    weeks: Array<{
        w: number
        a: number
        d: number
        c: number
    }>
}

interface GitHubRepo {
    id: number
    name: string
    full_name: string
    description: string
    private: boolean
    language: string
    stargazers_count: number
    forks_count: number
    updated_at: string
    created_at: string
}

export const githubOAuthService = {
    // Generate GitHub OAuth URL
    generateGitHubOAuthUrl(tempSessionToken: string): string {
        const params = new URLSearchParams({
            client_id: ENV.GITHUB_CLIENT_ID || '',
            redirect_uri: ENV.GITHUB_CALLBACK_URL,
            scope: 'read:user user:email repo',
            state: tempSessionToken,
            prompt: 'consent', // Force fresh authorization to prevent code reuse
        })

        return `https://github.com/login/oauth/authorize?${params.toString()}`
    },

    // Exchange authorization code for access token
    async exchangeCodeForTokens(code: string): Promise<GitHubTokenResponse> {
        try {
            console.log('🔍 [GITHUB] Exchanging authorization code:', {
                codePreview: code.substring(0, 10) + '...',
                codeLength: code.length,
                timestamp: new Date().toISOString(),
            })

            const tokenUrl = 'https://github.com/login/oauth/access_token'

            const params = {
                client_id: ENV.GITHUB_CLIENT_ID!,
                client_secret: ENV.GITHUB_CLIENT_SECRET!,
                code,
            }

            const response = await axios.post(tokenUrl, params, {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            })

            console.log('🔍 [GITHUB] Token exchange response:', {
                status: response.status,
                hasAccessToken: !!response.data.access_token,
                responseKeys: Object.keys(response.data),
            })

            if (!response.data.access_token) {
                console.error('❌ [GITHUB] No access token in response:', {
                    responseData: response.data,
                    possibleError: response.data.error,
                    errorDescription: response.data.error_description,
                })
                throw new Error('No access token received from GitHub')
            }

            return response.data as GitHubTokenResponse
        } catch (error) {
            console.error('❌ [GITHUB] OAuth token exchange error:', error)
            if (axios.isAxiosError(error)) {
                console.error('❌ [GITHUB] Response details:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    headers: error.response?.headers,
                })
            }
            throw new Error('Failed to exchange authorization code for GitHub tokens')
        }
    },

    // Get user info from GitHub using access token
    async getUserInfo(accessToken: string): Promise<GitHubUserInfo> {
        try {
            const response = await axios.get('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            })

            return response.data as GitHubUserInfo
        } catch (error) {
            console.error('GitHub user info fetch error:', error)
            throw new Error('Failed to fetch user info from GitHub')
        }
    },

    // Get user's email addresses (if not public)
    async getUserEmails(accessToken: string): Promise<Array<{ email: string; primary: boolean; verified: boolean }>> {
        try {
            const response = await axios.get('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            })

            return response.data
        } catch (error) {
            console.error('GitHub user emails fetch error:', error)
            throw new Error('Failed to fetch user emails from GitHub')
        }
    },

    // Get user's contribution data (commits, repos, etc.)
    // Get user's contributions for today specifically
    async getUserContributionsToday(accessToken: string, username: string): Promise<number> {
        try {
            // Get recent events for the user
            const response = await axios.get(`https://api.github.com/users/${username}/events`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github.v3+json',
                },
                params: {
                    per_page: 100, // Get recent events
                },
            })

            // Filter events for today only
            const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
            const todayEvents = response.data.filter(
                (event: { created_at: string; type: string; payload?: { commits?: unknown[] } }) => {
                    const eventDate = new Date(event.created_at).toISOString().split('T')[0]
                    return (
                        eventDate === today &&
                        (event.type === 'PushEvent' ||
                            event.type === 'CreateEvent' ||
                            event.type === 'PullRequestEvent' ||
                            event.type === 'IssuesEvent')
                    )
                }
            )

            // Count commits from PushEvents specifically
            let todayContributions = 0
            for (const event of todayEvents) {
                if (event.type === 'PushEvent' && event.payload && event.payload.commits) {
                    todayContributions += event.payload.commits.length
                } else if (
                    event.type === 'CreateEvent' ||
                    event.type === 'PullRequestEvent' ||
                    event.type === 'IssuesEvent'
                ) {
                    todayContributions += 1
                }
            }

            return todayContributions
        } catch (error) {
            console.error('Failed to get user contributions today:', error)
            return 0 // Return 0 if error, don't throw
        }
    },

    async getUserContributions(accessToken: string, username: string): Promise<GitHubContributionData> {
        try {
            // Get user's contribution stats from GitHub API
            const response = await axios.get(
                `https://api.github.com/repos/${username}/${username}/stats/participation`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/vnd.github.v3+json',
                    },
                }
            )

            // If user doesn't have a repo with their username, get general stats
            if (response.status === 404) {
                // Fallback: get user's public repos and calculate contributions
                const reposResponse = await axios.get('https://api.github.com/user/repos', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/vnd.github.v3+json',
                    },
                    params: {
                        type: 'owner',
                        sort: 'updated',
                        per_page: 10,
                    },
                })

                // Simple contribution data based on repos
                return {
                    total_count: reposResponse.data.length,
                    weeks: [], // Would need more complex logic to get weekly data
                }
            }

            return response.data as GitHubContributionData
        } catch (error) {
            console.error('GitHub contributions fetch error:', error)
            // Return empty data instead of throwing to not break the flow
            return {
                total_count: 0,
                weeks: [],
            }
        }
    },

    // Get user's recent repositories
    async getUserRepos(accessToken: string, limit: number = 10): Promise<Array<GitHubRepo>> {
        try {
            const response = await axios.get('https://api.github.com/user/repos', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github.v3+json',
                },
                params: {
                    type: 'owner',
                    sort: 'updated',
                    per_page: limit,
                },
            })

            return response.data
        } catch (error) {
            console.error('GitHub repos fetch error:', error)
            throw new Error('Failed to fetch user repositories from GitHub')
        }
    },
}
