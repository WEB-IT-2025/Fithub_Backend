import { OkPacket, RowDataPacket } from 'mysql2'
import db from '~/config/database'

interface MissionRow extends RowDataPacket {
    mission_id: string
    mission_name: string
    mission_goal: string
    reward_content: number
    mission_type: string
}

interface MissionCleardRow extends RowDataPacket {
    mission_id: string
    user_id: string
    clear_status: boolean
    mission_goal: number
    current_status: number
    clear_time: Date | null
}
export interface MissionInsertDTO {
    mission_id: string
    mission_name: string
    mission_goal: string
    reward_content: number
    mission_type: string
}

export const missionModel = {
    async getAllMissions(): Promise<MissionRow[]> {
        const [rows] = await db.query<MissionRow[]>('SELECT * FROM MISSION')
        return rows
    },

    async insertMission(mission: MissionInsertDTO): Promise<void> {
        const { mission_id, mission_name, mission_goal, reward_content, mission_type } = mission
        await db.query(
            'INSERT INTO MISSION (mission_id, mission_name, mission_goal, reward_content, mission_type) VALUES (?, ?, ?, ?, ?)',
            [mission_id, mission_name, mission_goal, reward_content, mission_type]
        )
    },

    async deleteMission(missionId: string): Promise<boolean> {
        const [result] = await db.query<OkPacket>('DELETE FROM MISSION WHERE mission_id = ?', [missionId])
        return result.affectedRows > 0
    },

    async getUserMissionStatus(userId: string): Promise<MissionCleardRow[]> {
        const [rows] = await db.query<MissionCleardRow[]>(
            `SELECT mission_id, user_id, clear_status, mission_goal, current_status, clear_time
             FROM MISSION_CLEARD
             WHERE user_id = ?`,
            [userId]
        )
        return rows
    },

    async markMissionCleared(userId: string, missionId: string): Promise<boolean> {
        const [result] = await db.query<OkPacket>(
            'UPDATE MISSION_CLEARD SET clear_status = true, clear_time = NOW() WHERE user_id = ? AND mission_id = ?',
            [userId, missionId]
        )
        return result.affectedRows > 0
    },

    async revertMissionCleared(userId: string, missionId: string): Promise<boolean> {
        const [result] = await db.query<OkPacket>(
            'UPDATE MISSION_CLEARD SET clear_status = false, clear_time = NULL WHERE user_id = ? AND mission_id = ?',
            [userId, missionId]
        )
        return result.affectedRows > 0
    },
    async getMissionById(missionId: string): Promise<MissionRow | null> {
        const [rows] = await db.query<MissionRow[]>('SELECT * FROM MISSION WHERE mission_id = ?', [missionId])
        return rows.length > 0 ? rows[0] : null
    },

    /**
     * ミッションクリア状態を更新し、報酬ポイントを加算する
     * @param userId ユーザーID
     * @param missionId ミッションID
     * @returns 成功した場合はtrue、失敗した場合はfalse
     */
    async markMissionClearedAndReward(userId: string, missionId: string): Promise<boolean> {
        const conn = await db.getConnection()

        try {
            await conn.beginTransaction()

            // 1. ミッションクリア状態更新
            const [updateResult] = await conn.query<OkPacket>(
                `UPDATE MISSION_CLEARD SET clear_status = true, clear_time = NOW() WHERE user_id = ? AND mission_id = ?`,
                [userId, missionId]
            )
            if (updateResult.affectedRows === 0) {
                await conn.rollback()
                return false
            }

            // 2. 報酬ポイント取得
            const [missionRows] = await conn.query<RowDataPacket[]>(
                `SELECT reward_content FROM MISSION WHERE mission_id = ?`,
                [missionId]
            )
            if (missionRows.length === 0) {
                await conn.rollback()
                return false
            }
            const reward = Number(missionRows[0].reward_content) || 0

            // 3. ユーザーのポイント加算
            await conn.query(`UPDATE USERS SET point = point + ? WHERE user_id = ?`, [reward, userId])

            await conn.commit()
            return true
        } catch (err) {
            await conn.rollback()
            throw err
        } finally {
            conn.release()
        }
    },
    async getUnclearedMissions(userId: string): Promise<MissionRow[]> {
        const [rows] = await db.query<MissionRow[]>(
            `SELECT m.* FROM MISSION m
         JOIN MISSION_CLEARD mc ON m.mission_id = mc.mission_id
         WHERE mc.user_id = ? AND mc.clear_status = false`,
            [userId]
        )
        return rows
    },
    async updateCurrentStatus(userId: string, missionId: string, status: number): Promise<void> {
        await db.query('UPDATE MISSION_CLEARD SET current_status = ? WHERE user_id = ? AND mission_id = ?', [
            status,
            userId,
            missionId,
        ])
    },
}
