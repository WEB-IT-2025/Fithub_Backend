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
    mission_content: string // ←修正
    reward_content: number
    mission_type: string
}

interface UserProgressData {
    totalSteps?: number
    totalContributions?: number
}

export const missionModel = {
    async getAllMissions(): Promise<MissionRow[]> {
        const [rows] = await db.query<MissionRow[]>('SELECT * FROM MISSION')
        return rows
    },

    async insertMission(mission: MissionInsertDTO): Promise<void> {
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
    /**
     * ユーザーの進捗データ（歩数、貢献度など）を取得
     * @param userId ユーザーID
     * @param missionType 'daily' または 'weekly'
     */
    async getUserProgressData(userId: string, missionType: 'daily' | 'weekly'): Promise<UserProgressData | null> {
        try {
            let stepQuery = ''
            let contributionQuery = ''

            if (missionType === 'daily') {
                // 今日のデータを取得
                stepQuery =
                    'SELECT COALESCE(SUM(exercise_quantity), 0) as steps FROM EXERCISE WHERE user_id = ? AND DATE(day) = CURDATE()'
                contributionQuery =
                    'SELECT COALESCE(SUM(CAST(count AS SIGNED)), 0) as contributions FROM CONTRIBUTIONS WHERE user_id = ? AND DATE(day) = CURDATE()'
            } else if (missionType === 'weekly') {
                // 今週のデータを取得（月曜日始まり）
                stepQuery = `SELECT COALESCE(SUM(exercise_quantity), 0) as steps FROM EXERCISE 
                            WHERE user_id = ? AND YEARWEEK(day, 1) = YEARWEEK(CURDATE(), 1)`
                contributionQuery = `SELECT COALESCE(SUM(CAST(count AS SIGNED)), 0) as contributions FROM CONTRIBUTIONS 
                                   WHERE user_id = ? AND YEARWEEK(day, 1) = YEARWEEK(CURDATE(), 1)`
            }

            // 歩数データを取得
            const [stepRows] = await db.query<RowDataPacket[]>(stepQuery, [userId])

            // 貢献度データを取得
            const [contributionRows] = await db.query<RowDataPacket[]>(contributionQuery, [userId])

            return {
                totalSteps: Number(stepRows[0]?.steps) || 0,
                totalContributions: Number(contributionRows[0]?.contributions) || 0,
            }
        } catch (error) {
            console.error('Error getting user progress data:', error)
            return null
        }
    },

    /**
     * mission_contentに基づいてクリア判定を行う
     * @param userId ユーザーID
     * @param missionId ミッションID
     * @returns クリア判定結果
     */
    async checkMissionClearStatus(
        userId: string,
        missionId: string
    ): Promise<{
        isClear: boolean
        currentValue: number
        targetValue: number
        missionType: string
    } | null> {
        // ミッション情報を取得
        const mission = await this.getMissionById(missionId)
        if (!mission) return null

        // ユーザーの進捗データを取得（mission_typeに基づいて期間を決定）
        const userProgress = await this.getUserProgressData(userId, mission.mission_type as 'daily' | 'weekly')
        if (!userProgress) return null

        // MISSION_CLEARDから目標値を取得
        const [missionClearRows] = await db.query<RowDataPacket[]>(
            'SELECT mission_goal FROM MISSION_CLEARD WHERE user_id = ? AND mission_id = ?',
            [userId, missionId]
        )

        if (missionClearRows.length === 0) return null
        const targetValue = missionClearRows[0].mission_goal

        let currentValue = 0
        const missionContent = mission.mission_content

        // mission_contentに基づいて参照するデータを決定
        if (missionContent === '歩') {
            // 歩数系ミッション
            currentValue = userProgress.totalSteps || 0
        } else if (missionContent === '個' || missionContent === '回') {
            // 貢献度系ミッション
            currentValue = userProgress.totalContributions || 0
        } else {
            // 未対応の場合は0とする
            console.warn(`未対応のmission_content: ${missionContent}`)
            currentValue = 0
        }

        const isClear = currentValue >= targetValue

        return {
            isClear,
            currentValue,
            targetValue,
            missionType: missionContent,
        }
    },

    /**
     * ミッションの現在ステータスを更新し、クリア判定も行う
     */
    async updateMissionProgress(
        userId: string,
        missionId: string
    ): Promise<{
        updated: boolean
        cleared: boolean
        progressData?: any
    }> {
        const clearStatus = await this.checkMissionClearStatus(userId, missionId)
        if (!clearStatus) {
            return { updated: false, cleared: false }
        }

        // current_statusを更新
        await this.updateCurrentStatus(userId, missionId, clearStatus.currentValue)

        // クリア判定
        if (clearStatus.isClear) {
            // まだクリアされていない場合のみクリア処理を実行
            const [existingRows] = await db.query<RowDataPacket[]>(
                'SELECT clear_status FROM MISSION_CLEARD WHERE user_id = ? AND mission_id = ?',
                [userId, missionId]
            )

            if (existingRows.length > 0 && !existingRows[0].clear_status) {
                const cleared = await this.markMissionClearedAndReward(userId, missionId)
                return {
                    updated: true,
                    cleared,
                    progressData: clearStatus,
                }
            }
        }

        return {
            updated: true,
            cleared: false,
            progressData: clearStatus,
        }
    },

    /**
     * 全ての未クリアミッションの進捗をチェックして更新
     */
    async checkAndUpdateAllMissions(userId: string): Promise<{
        checkedCount: number
        newlyCleared: string[]
    }> {
        const unclearedMissions = await this.getUnclearedMissions(userId)
        const newlyCleared: string[] = []

        for (const mission of unclearedMissions) {
            const result = await this.updateMissionProgress(userId, mission.mission_id)
            if (result.cleared) {
                newlyCleared.push(mission.mission_id)
            }
        }

        return {
            checkedCount: unclearedMissions.length,
            newlyCleared,
        }
    },
}
