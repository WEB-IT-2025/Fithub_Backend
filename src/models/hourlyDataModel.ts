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
            `SELECT user_id, CONVERT_TZ(timestamp, '+00:00', 'Asia/Tokyo') as timestamp, steps FROM EXERCISE_DATE 
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

        // Since steps in database are now cumulative, we don't need to calculate totalSteps
        // totalSteps = steps (same value)
        const chartData = hourlyData.map((data) => {
            // Handle timestamp - MySQL CONVERT_TZ returns JST time as UTC Date object
            let hour: number
            let timestampStr: string

            if (data.timestamp instanceof Date) {
                // MySQL CONVERT_TZ returns JST time but as UTC Date object
                // So getUTCHours() gives us the correct JST hour
                hour = data.timestamp.getUTCHours()

                // Format as JST string (the UTC time IS the JST time)
                const year = data.timestamp.getUTCFullYear()
                const month = String(data.timestamp.getUTCMonth() + 1).padStart(2, '0')
                const day = String(data.timestamp.getUTCDate()).padStart(2, '0')
                const hours = String(data.timestamp.getUTCHours()).padStart(2, '0')
                const minutes = String(data.timestamp.getUTCMinutes()).padStart(2, '0')
                const seconds = String(data.timestamp.getUTCSeconds()).padStart(2, '0')

                timestampStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
            } else {
                // If it's already a string (JST format from CONVERT_TZ)
                const timePart = data.timestamp.split(' ')[1] || '00:00:00'
                hour = parseInt(timePart.split(':')[0])
                timestampStr = data.timestamp
            }

            return {
                time: `${hour.toString().padStart(2, '0')}:00`, // User-friendly format (00:00, 02:00, etc.)
                timeValue: hour, // Numeric value for chart libraries
                steps: data.steps, // This is now the cumulative steps for this 2-hour interval
                totalSteps: data.steps, // Same as steps since it's already cumulative
                timestamp: timestampStr,
            }
        })

        // Total steps is the highest cumulative value (last entry)
        const totalSteps = hourlyData.length > 0 ? Math.max(...hourlyData.map((d) => d.steps)) : 0

        return {
            hourly_data: chartData,
            total_steps: totalSteps,
            data_points: hourlyData.length,
        }
    },
}
