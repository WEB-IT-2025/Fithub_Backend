// ===== models/profileModel.ts =====
import { RowDataPacket } from 'mysql2'
import db from '~/config/database'

// インターフェース定義
interface ProfileUserRow extends RowDataPacket {
    user_id: string
    user_name: string
    user_icon?: string
    email: string
    point: number
    github_username: string
}

interface ExerciseRow extends RowDataPacket {
    user_id: string
    day: Date
    exercise_quantity: number
}

interface ContributionRow extends RowDataPacket {
    user_id: string
    day: Date
    count: string
}

export interface HourlyStep {
    timeRange: string
    steps: number
}

export interface WeeklyStats {
    steps: number
    contributions: number
}

export interface MonthlyStats {
    steps: number
    contributions: number
}

export interface ProfileResponse {
    user_id: string
    user_name: string
    github_username: string
    user_icon: string
    point: number
    todaySteps: HourlyStep[]
    weeklyStats: WeeklyStats
    monthlyStats: MonthlyStats
}

export interface ProfilesResponse {
    self: ProfileResponse
    partner: ProfileResponse
}

export const profileModel = {
    // ユーザー情報取得
    async getUserById(userId: string): Promise<ProfileUserRow | null> {
        const [rows] = await db.query<ProfileUserRow[]>(
            'SELECT user_id, user_name, user_icon, email, point, github_username FROM USERS WHERE user_id = ?',
            [userId]
        )
        return rows.length > 0 ? rows[0] : null
    },

    // パートナー情報取得（GROUP_MEMBERテーブルから同じグループの他のメンバーを取得）
    async getPartnerByUserId(userId: string): Promise<ProfileUserRow | null> {
        const [rows] = await db.query<ProfileUserRow[]>(
            `SELECT DISTINCT u.user_id, u.user_name, u.user_icon, u.email, u.point, u.github_username
             FROM USERS u
             INNER JOIN GROUP_MEMBER gm1 ON u.user_id = gm1.user_id
             INNER JOIN GROUP_MEMBER gm2 ON gm1.group_id = gm2.group_id
             WHERE gm2.user_id = ? AND u.user_id != ?
             LIMIT 1`,
            [userId, userId]
        )
        return rows.length > 0 ? rows[0] : null
    },

    // 今日の運動データ取得（歩数）
    async getTodayExercise(userId: string): Promise<ExerciseRow[]> {
        const [rows] = await db.query<ExerciseRow[]>(
            `SELECT user_id, day, exercise_quantity
             FROM EXERCISE
             WHERE user_id = ? AND DATE(day) = CURDATE()
             ORDER BY day ASC`,
            [userId]
        )
        return rows
    },

    // 週間歩数取得
    async getWeeklySteps(userId: string): Promise<number> {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(exercise_quantity), 0) as total_steps
             FROM EXERCISE
             WHERE user_id = ? AND day >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
            [userId]
        )
        return Number(rows[0]?.total_steps) || 0
    },

    // 月間歩数取得
    async getMonthlySteps(userId: string): Promise<number> {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(exercise_quantity), 0) as total_steps
             FROM EXERCISE
             WHERE user_id = ? AND day >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
            [userId]
        )
        return Number(rows[0]?.total_steps) || 0
    },

    // 週間コントリビューション取得
    async getWeeklyContributions(userId: string): Promise<number> {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(CAST(count AS SIGNED)), 0) as total_contributions
             FROM CONTRIBUTIONS
             WHERE user_id = ? AND day >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
            [userId]
        )
        return Number(rows[0]?.total_contributions) || 0
    },

    // GitHub APIからコントリビューション取得（バックアップ用）
    async fetchGithubContributions(githubUsername: string): Promise<number> {
        try {
            const response = await fetch(`https://api.github.com/users/${githubUsername}/events`)
            if (!response.ok) return 0

            const events = await response.json()
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

            const contributions = events.filter((event: any) => {
                const eventDate = new Date(event.created_at)
                return eventDate >= oneWeekAgo && ['PushEvent', 'PullRequestEvent', 'IssuesEvent'].includes(event.type)
            })

            return contributions.length
        } catch (error) {
            console.error('GitHub API error:', error)
            return 0
        }
    },

    // プロフィール更新
    async updateProfile(userId: string, data: Partial<ProfileUserRow>): Promise<ProfileUserRow | null> {
        const fields = []
        const values = []

        if (data.user_name) {
            fields.push('user_name = ?')
            values.push(data.user_name)
        }
        if (data.user_icon) {
            fields.push('user_icon = ?')
            values.push(data.user_icon)
        }
        if (data.github_username) {
            fields.push('github_username = ?')
            values.push(data.github_username)
        }

        if (fields.length === 0) return null

        values.push(userId)

        const [result] = await db.query(`UPDATE USERS SET ${fields.join(', ')} WHERE user_id = ?`, values)

        // 更新後のデータを取得して返す
        return await this.getUserById(userId)
    },

    // 0-2時間ごとの歩数データを処理（内部処理でJSON形式）
    processHourlySteps(exerciseData: ExerciseRow[]): HourlyStep[] {
        const hourlySteps: HourlyStep[] = []

        // 2時間刻みで24時間分を作成
        for (let hour = 0; hour < 24; hour += 2) {
            const startHour = hour
            const endHour = hour + 2
            const timeRange = `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`

            // 該当時間帯の歩数を合計（簡単な例として均等分散）
            const totalSteps = exerciseData.reduce((total, exercise) => total + exercise.exercise_quantity, 0)
            const stepsInRange = Math.floor(totalSteps / 12) // 24時間を2時間ずつ12分割

            hourlySteps.push({
                timeRange,
                steps: stepsInRange,
            })
        }

        return hourlySteps
    },

    // プロフィール一括取得用のヘルパー関数
    async buildProfileResponse(user: ProfileUserRow): Promise<ProfileResponse> {
        const [todayExercise, weeklySteps, monthlySteps, weeklyContributions] = await Promise.all([
            this.getTodayExercise(user.user_id),
            this.getWeeklySteps(user.user_id),
            this.getMonthlySteps(user.user_id),
            this.getWeeklyContributions(user.user_id),
        ])

        return {
            user_id: user.user_id,
            user_name: user.user_name,
            github_username: user.github_username,
            user_icon: user.user_icon || `https://github.com/${user.github_username}.png`,
            point: user.point,
            todaySteps: this.processHourlySteps(todayExercise),
            weeklyStats: {
                steps: weeklySteps,
                contributions: weeklyContributions,
            },
            monthlyStats: {
                steps: monthlySteps,
                contributions: weeklyContributions, // 1週間分のみ
            },
        }
    },

    // プロフィール一括取得（自分 + パートナー）
    async getProfilesWithPartner(userId: string): Promise<ProfilesResponse | null> {
        // ユーザーとパートナーの情報を並行取得
        const [user, partner] = await Promise.all([this.getUserById(userId), this.getPartnerByUserId(userId)])

        if (!user || !partner) {
            return null
        }

        // プロフィールレスポンスを構築
        const [selfProfile, partnerProfile] = await Promise.all([
            this.buildProfileResponse(user),
            this.buildProfileResponse(partner),
        ])

        return {
            self: selfProfile,
            partner: partnerProfile,
        }
    },
}
