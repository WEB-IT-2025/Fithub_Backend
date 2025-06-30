import { RowDataPacket } from 'mysql2'
import db from '~/config/database'

interface ThresholdRow extends RowDataPacket {
    steps_point_settings: number
}

export const thresholdModel = {
    /**
     * 歩数ポイント換算設定を取得する
     * thresholdテーブルのsteps_point_settings（例：100歩ごとに1ポイント）
     */
    async getStepPointRate(): Promise<number> {
        const [rows] = await db.query<ThresholdRow[]>(`SELECT steps_point_settings FROM THRESHOLD LIMIT 1`)
        return rows[0]?.steps_point_settings || 100
    },
}
