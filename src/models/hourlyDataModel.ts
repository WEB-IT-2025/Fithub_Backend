import { RowDataPacket } from 'mysql2'
import db from '~/config/database'

interface HourlyDataRow extends RowDataPacket {
    user_id: string
    timestamp: string | Date // Can be either DATETIME string or Date object
    steps: number
}

interface ChartDataPoint {
    time: string // 表示用フォーマット (00:00, 02:00, など)
    timeValue: number // チャートライブラリ用の数値
    steps: number // 2時間間隔のステップ数
    totalSteps: number // 00:00からの累積ステップ数
    timestamp: string // 元のタイムスタンプ
}

export const hourlyDataModel = {
    /**
     * データベースから今日の時間別ステップデータを取得
     */
    async getTodayHourlySteps(userId: string): Promise<HourlyDataRow[]> {
        const [rows] = await db.query<HourlyDataRow[]>(
            `SELECT user_id, CONVERT_TZ(timestamp, '+00:00', 'Asia/Tokyo') as timestamp, steps FROM EXERCISE_DATE 
             WHERE user_id = ? AND DATE(CONVERT_TZ(timestamp, '+00:00', 'Asia/Tokyo')) = DATE(CONVERT_TZ(NOW(), '+00:00', 'Asia/Tokyo'))
             ORDER BY timestamp ASC`,
            [userId]
        )

        // Filter future hours in application (adjust for JST)
        const now = new Date()
        const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000) // Add 9 hours for JST

        const filteredRows = rows.filter((row) => {
            const timestamp = typeof row.timestamp === 'string' ? new Date(row.timestamp) : row.timestamp
            // Database timestamp is already JST, so compare with JST now
            return timestamp <= jstNow
        })

        return filteredRows
    },

    /**
     * チャート用の整形された時間別データを取得
     */
    async getFormattedHourlyData(userId: string): Promise<{
        hourly_data: ChartDataPoint[]
        total_steps: number
        data_points: number
    }> {
        const hourlyData = await this.getTodayHourlySteps(userId) // データベースのステップは累積値なので、間隔ステップを計算する必要がある
        // steps = 間隔ステップ（2時間間隔）、totalSteps = 累積ステップ（00:00から）
        const chartData = hourlyData.map((data, index) => {
            // タイムスタンプの処理 - MySQL CONVERT_TZはJST時間をUTC Dateオブジェクトとして返す
            let hour: number
            let timestampStr: string

            if (data.timestamp instanceof Date) {
                // MySQL CONVERT_TZはJST時間をUTC Dateオブジェクトとして返すため
                // getUTCHours()で正しいJST時間を取得
                hour = data.timestamp.getUTCHours()

                // JST文字列としてフォーマット（UTC時間がJST時間）
                const year = data.timestamp.getUTCFullYear()
                const month = String(data.timestamp.getUTCMonth() + 1).padStart(2, '0')
                const day = String(data.timestamp.getUTCDate()).padStart(2, '0')
                const hours = String(data.timestamp.getUTCHours()).padStart(2, '0')
                const minutes = String(data.timestamp.getUTCMinutes()).padStart(2, '0')
                const seconds = String(data.timestamp.getUTCSeconds()).padStart(2, '0')

                timestampStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
            } else {
                // 既に文字列の場合（CONVERT_TZからのJSTフォーマット）
                const timePart = data.timestamp.split(' ')[1] || '00:00:00'
                hour = parseInt(timePart.split(':')[0])
                timestampStr = data.timestamp
            }

            // データベースは累積データを保存しているため、間隔ステップを計算する
            const intervalSteps = index === 0 ? data.steps : Math.max(0, data.steps - hourlyData[index - 1].steps)

            return {
                time: `${hour.toString().padStart(2, '0')}:00`, // 表示用フォーマット (00:00, 02:00, など)
                timeValue: hour, // チャートライブラリ用の数値
                steps: intervalSteps, // 2時間間隔のステップ数（累積から計算）
                totalSteps: data.steps, // 00:00からの累積ステップ数（データベースから直接）
                timestamp: timestampStr,
            }
        })

        // 総ステップ数は最高累積値（最後のエントリ）
        const totalSteps = hourlyData.length > 0 ? Math.max(...hourlyData.map((d) => d.steps)) : 0

        return {
            hourly_data: chartData,
            total_steps: totalSteps,
            data_points: hourlyData.length,
        }
    },
}
