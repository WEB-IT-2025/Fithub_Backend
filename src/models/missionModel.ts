import { OkPacket, RowDataPacket } from 'mysql2'
import db from '~/config/database'

interface MissionRow extends RowDataPacket {
    mission_id: string
    mission_name: string
    mission_content: string
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

export const missionModel = {
    async getAllMissions(): Promise<MissionRow[]> {
        const [rows] = await db.query<MissionRow[]>('SELECT * FROM MISSION')
        return rows
    },

    async insertMission(mission: MissionRow): Promise<void> {
        const { mission_id, mission_name, mission_content, reward_content, mission_type } = mission
        await db.query(
            'INSERT INTO MISSION (mission_id, mission_name, mission_content, reward_content, mission_type) VALUES (?, ?, ?, ?, ?)',
            [mission_id, mission_name, mission_content, reward_content, mission_type]
        )
    },

    async deleteMission(missionId: string): Promise<boolean> {
        const [result] = await db.query<OkPacket>('DELETE FROM MISSION WHERE mission_id = ?', [missionId])
        return result.affectedRows > 0
    },

    async getUserMissionStatus(userId: string): Promise<MissionCleardRow[]> {
        const [rows] = await db.query<MissionCleardRow[]>(
            `SELECT mc.mission_id, mc.user_id, mc.clear_status, mc.mission_goal, mc.current_status, mc.clear_time
             FROM MISSION_CLEARD mc
             WHERE mc.user_id = ?`,
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
            'UPDATE mission_CLEARD SET clear_status = false, clear_time = NULL WHERE user_id = ? AND mission_id = ?',
            [userId, missionId]
        )
        return result.affectedRows > 0
    },
}
