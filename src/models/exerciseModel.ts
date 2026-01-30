import { RowDataPacket } from 'mysql2'
import db from '~/config/database'

interface ExerciseRow extends RowDataPacket {
    user_id: string
    day: string // TIMESTAMP型（ISO文字列）
    exercise_quantity: number
}

export const exerciseModel = {
    /**
     * 歩数データを加算（同一時刻は上書きではなく加算）
     */
    async upsertExercise(userId: string, day: string, quantity: number): Promise<void> {
        await db.query(
            `INSERT INTO EXERCISE (user_id, day, exercise_quantity)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE exercise_quantity = exercise_quantity + ?`,
            [userId, day, quantity, quantity]
        )
    },

    async getExercise(userId: string, day: string): Promise<ExerciseRow | null> {
        const [rows] = await db.query<ExerciseRow[]>(`SELECT * FROM EXERCISE WHERE user_id = ? AND day = ?`, [
            userId,
            day,
        ])
        return rows.length > 0 ? rows[0] : null
    },

    async getHourlySummary(userId: string, date: string): Promise<{ hour: number; steps: number }[]> {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT HOUR(day) AS hour, SUM(exercise_quantity) AS steps
             FROM EXERCISE
             WHERE user_id = ? AND DATE(day) = ?
             GROUP BY hour
             ORDER BY hour`,
            [userId, date]
        )
        return rows.map((row) => ({
            hour: Number(row.hour),
            steps: Number(row.steps),
        }))
    },

    async getDailySummary(
        userId: string,
        startDate: string,
        endDate: string
    ): Promise<{ date: string; steps: number }[]> {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT DATE(day) AS date, SUM(exercise_quantity) AS steps
             FROM EXERCISE
             WHERE user_id = ? AND DATE(day) BETWEEN ? AND ?
             GROUP BY date
             ORDER BY date`,
            [userId, startDate, endDate]
        )
        return rows.map((row) => ({
            date: String(row.date),
            steps: Number(row.steps),
        }))
    },

    /**
     * Get user's exercise data for a specific period (in days)
     */
    async getExerciseData(userId: string, days: number): Promise<ExerciseRow[]> {
        const [rows] = await db.query<ExerciseRow[]>(
            `SELECT day, exercise_quantity FROM EXERCISE 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL ? DAY)
             ORDER BY day DESC`,
            [userId, days]
        )
        return rows
    },

    /**
     * Get total steps for a specific period
     */
    async getTotalSteps(userId: string, days: number): Promise<number> {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT SUM(exercise_quantity) as total_steps
             FROM EXERCISE 
             WHERE user_id = ? AND day >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [userId, days]
        )
        return rows[0]?.total_steps || 0
    },

    /**
     * Get exercise data with total for specific period
     */
    async getExerciseDataWithTotal(
        userId: string,
        days: number,
        period: string
    ): Promise<{
        recent_exercise: ExerciseRow[]
        total_steps: number
        period: string
    }> {
        const [recent_exercise, total_steps] = await Promise.all([
            this.getExerciseData(userId, days),
            this.getTotalSteps(userId, days),
        ])

        return {
            recent_exercise,
            total_steps,
            period,
        }
    },
}
