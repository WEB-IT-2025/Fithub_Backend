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
}
