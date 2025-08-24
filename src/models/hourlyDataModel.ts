import { RowDataPacket } from 'mysql2'
import db from '~/config/database'

interface HourlyDataRow extends RowDataPacket {
    user_id: string
    timestamp: string | Date // Can be either DATETIME string or Date object
    steps: number
}

interface ChartDataPoint {
    time: string // User-friendly format (00:00, 02:00, etc.)
    timeValue: number // Numeric value for chart libraries
    steps: number // Steps for this interval
    totalSteps: number // Cumulative steps
    timestamp: string // Original timestamp
}

export const hourlyDataModel = {
    /**
     * Get today's hourly step data from database
     */
    async getTodayHourlySteps(userId: string): Promise<HourlyDataRow[]> {
        const [rows] = await db.query<HourlyDataRow[]>(
            `SELECT user_id, timestamp, steps FROM EXERCISE_DATE 
             WHERE user_id = ? AND DATE(CONVERT_TZ(timestamp, '+00:00', 'Asia/Tokyo')) = DATE(CONVERT_TZ(NOW(), '+00:00', 'Asia/Tokyo'))
             ORDER BY timestamp ASC`,
            [userId]
        )
        return rows
    },

    /**
     * Get formatted hourly data for charts
     */
    async getFormattedHourlyData(userId: string): Promise<{
        hourly_data: ChartDataPoint[]
        total_steps: number
        data_points: number
    }> {
        const hourlyData = await this.getTodayHourlySteps(userId)

        // Calculate cumulative steps for charting with user-friendly time format
        let cumulativeSteps = 0
        const chartData = hourlyData.map((data) => {
            cumulativeSteps += data.steps

            // Handle timestamp - it could be a Date object or string
            let hour: number
            let timestampStr: string

            if (data.timestamp instanceof Date) {
                hour = data.timestamp.getHours()
                timestampStr = data.timestamp.toISOString().replace('T', ' ').substring(0, 19)
            } else {
                // If it's already a string
                hour = parseInt(data.timestamp.split(' ')[1].split(':')[0])
                timestampStr = data.timestamp
            }

            return {
                time: `${hour.toString().padStart(2, '0')}:00`, // User-friendly format (00:00, 02:00, etc.)
                timeValue: hour, // Numeric value for chart libraries
                steps: data.steps,
                totalSteps: cumulativeSteps,
                timestamp: timestampStr,
            }
        })

        return {
            hourly_data: chartData,
            total_steps: cumulativeSteps,
            data_points: hourlyData.length,
        }
    },
}
