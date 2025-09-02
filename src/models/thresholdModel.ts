import { OkPacket, RowDataPacket } from 'mysql2'
import db from '~/config/database'

interface ThresholdRow extends RowDataPacket {
    steps_point_settings: number
    pet_size_logic: number
    pet_health_logic: number
    exercise_settings: number
}

export interface PetSizeStandardDTO {
    pet_size_logic: number
}

export interface PetHealthStandardDTO {
    pet_health_logic: number
}

export interface DebugPetSizeDTO {
    user_id: string
    item_id: string
    pet_size: number
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

    /**
     * ペットサイズ基準値を更新する
     */
    async updatePetSizeStandard(standards: PetSizeStandardDTO): Promise<boolean> {
        try {
            const [result] = await db.query<OkPacket>('UPDATE THRESHOLD SET pet_size_logic = ? LIMIT 1', [
                standards.pet_size_logic,
            ])
            return result.affectedRows > 0
        } catch (error) {
            console.error('Error updating pet size standards:', error)
            return false
        }
    },

    /**
     * ペット健康度基準値を更新する
     */
    async updatePetHealthStandard(standards: PetHealthStandardDTO): Promise<boolean> {
        try {
            const [result] = await db.query<OkPacket>('UPDATE THRESHOLD SET pet_health_logic = ? LIMIT 1', [
                standards.pet_health_logic,
            ])
            return result.affectedRows > 0
        } catch (error) {
            console.error('Error updating pet health standards:', error)
            return false
        }
    },

    /**
     * 全ての閾値設定を取得する
     */
    async getAllThresholds(): Promise<ThresholdRow | null> {
        try {
            const [rows] = await db.query<ThresholdRow[]>(`SELECT * FROM THRESHOLD LIMIT 1`)
            return rows[0] || null
        } catch (error) {
            console.error('Error fetching thresholds:', error)
            throw error
        }
    },

    /**
     * デバッグ用：特定ペットのサイズを直接更新する
     */
    async updatePetSizeDebug(debugData: DebugPetSizeDTO): Promise<boolean> {
        try {
            const [result] = await db.query<OkPacket>(
                'UPDATE USERS_PETS SET pet_size = ? WHERE user_id = ? AND item_id = ?',
                [debugData.pet_size, debugData.user_id, debugData.item_id]
            )
            return result.affectedRows > 0
        } catch (error) {
            console.error('Error updating pet size (debug):', error)
            return false
        }
    },

    /**
     * デバッグ用：特定ユーザーの全ペットサイズを取得する
     */
    async getUserPetSizes(
        userId: string
    ): Promise<Array<{ item_id: string; pet_size: number; user_main_pet: boolean }>> {
        try {
            const [rows] = await db.query<RowDataPacket[]>(
                'SELECT item_id, pet_size, user_main_pet FROM USERS_PETS WHERE user_id = ?',
                [userId]
            )
            return rows as Array<{ item_id: string; pet_size: number; user_main_pet: boolean }>
        } catch (error) {
            console.error('Error fetching user pet sizes:', error)
            return []
        }
    },
}
