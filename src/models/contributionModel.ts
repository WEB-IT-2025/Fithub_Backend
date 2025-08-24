import { RowDataPacket } from 'mysql2'
import db from '~/config/database'

interface ContributionRow extends RowDataPacket {
    user_id: string
    day: string // DATE型
    count: string // VARCHAR型（文字列として格納）
}

export const contributionModel = {
    /**
     * Get user's contribution data for a specific period
     */
    async getContributions(userId: string, days: number): Promise<ContributionRow[]> {
        const [rows] = await db.query<ContributionRow[]>(
            `SELECT day, count FROM CONTRIBUTIONS 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL ? DAY)
             ORDER BY day DESC`,
            [userId, days]
        )
        return rows
    },

    /**
     * Get total contributions for a specific period
     */
    async getTotalContributions(userId: string, days: number): Promise<number> {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT SUM(CAST(count AS UNSIGNED)) as total_contributions
             FROM CONTRIBUTIONS 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [userId, days]
        )
        return rows[0]?.total_contributions || 0
    },

    /**
     * Get contribution data with weekly and monthly totals
     */
    async getContributionsWithTotals(userId: string): Promise<{
        recent_contributions: ContributionRow[]
        weekly_total: number
        monthly_total: number
    }> {
        // Get recent contributions (30 days)
        const recent_contributions = await this.getContributions(userId, 30)

        // Get totals
        const [weeklyTotal, monthlyTotal] = await Promise.all([
            this.getTotalContributions(userId, 7),
            this.getTotalContributions(userId, 30),
        ])

        return {
            recent_contributions,
            weekly_total: weeklyTotal,
            monthly_total: monthlyTotal,
        }
    },
}
