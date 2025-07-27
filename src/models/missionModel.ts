import { OkPacket, RowDataPacket } from 'mysql2'
import db from '~/config/database'

interface MissionRow extends RowDataPacket {
    mission_id: string
    mission_name: string
    mission_content: string
    reward_content: string
    mission_type: string
}

interface MissionCleardRow extends RowDataPacket {
    user_id: string
    mission_id: string
    mission_goal: number
    current_status: number
    clear_status: boolean
    clear_time: Date | null
    reward_content: number
    mission_type: string
}

export interface MissionInsertDTO {
    mission_id: string
    mission_name: string
    mission_content: string
    reward_content: string
    mission_type: string
}

interface UserMissionDetail extends RowDataPacket {
    mission_id: string
    mission_name: string
    mission_content: string
    mission_reward: string
    mission_category: string
    mission_goal: number
    current_status: number
    clear_status: boolean
    clear_time: Date | null
    reward_content: number
    mission_type: string
    progress_percentage: number
}

interface MissionProgressData {
    isClear: boolean
    currentValue: number
    targetValue: number
    missionType: string
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

    /**
     * 新しいミッションを作成し、全ユーザーに対してMISSION_CLEARDレコードを自動生成
     */
    async insertMission(mission: MissionInsertDTO): Promise<void> {
        const conn = await db.getConnection()

        try {
            await conn.beginTransaction()

            // 1. MISSIONテーブルにミッションを挿入
            const { mission_id, mission_name, mission_content, reward_content, mission_type } = mission
            await conn.query(
                'INSERT INTO MISSION (mission_id, mission_name, mission_content, reward_content, mission_type) VALUES (?, ?, ?, ?, ?)',
                [mission_id, mission_name, mission_content, reward_content, mission_type]
            )

            // 2. 全既存ユーザーに対してMISSION_CLEARDレコードを作成
            await this.createMissionCleardForAllUsers(mission_id, mission_content, reward_content, mission_type, conn)

            await conn.commit()
        } catch (err) {
            await conn.rollback()
            throw err
        } finally {
            conn.release()
        }
    },

    async deleteMission(missionId: string): Promise<boolean> {
        const [result] = await db.query<OkPacket>('DELETE FROM MISSION WHERE mission_id = ?', [missionId])
        return result.affectedRows > 0
    },

    /**
     * 新しいユーザーが登録された時に、全ミッションに対してMISSION_CLEARDレコードを作成
     */
    async initializeUserMissions(userId: string): Promise<void> {
        const conn = await db.getConnection()

        try {
            await conn.beginTransaction()

            const missions = await this.getAllMissions()

            for (const mission of missions) {
                // mission_contentから目標値を抽出
                const goalValue = this.extractGoalFromContent(mission.mission_content)

                await conn.query(
                    `INSERT IGNORE INTO MISSION_CLEARD 
                     (user_id, mission_id, mission_goal, current_status, clear_status, clear_time, reward_content, mission_type) 
                     VALUES (?, ?, ?, 0, false, NULL, ?, ?)`,
                    [userId, mission.mission_id, goalValue, parseInt(mission.reward_content), mission.mission_type]
                )
            }

            await conn.commit()
        } catch (err) {
            await conn.rollback()
            throw err
        } finally {
            conn.release()
        }
    },

    /**
     * 全ユーザーに対して特定ミッションのMISSION_CLEARDレコードを作成
     */
    async createMissionCleardForAllUsers(
        missionId: string,
        missionContent: string,
        rewardContent: string,
        missionType: string,
        conn?: any
    ): Promise<void> {
        // 全ユーザーIDを取得
        let users: RowDataPacket[]
        if (conn) {
            const [userRows] = (await conn.query('SELECT user_id FROM USERS')) as [RowDataPacket[], any]
            users = userRows
        } else {
            const [userRows] = await db.query<RowDataPacket[]>('SELECT user_id FROM USERS')
            users = userRows
        }

        // mission_contentから目標値を抽出
        const goalValue = this.extractGoalFromContent(missionContent)

        for (const user of users) {
            if (conn) {
                await conn.query(
                    `INSERT IGNORE INTO MISSION_CLEARD 
                     (user_id, mission_id, mission_goal, current_status, clear_status, clear_time, reward_content, mission_type) 
                     VALUES (?, ?, ?, 0, false, NULL, ?, ?)`,
                    [user.user_id, missionId, goalValue, parseInt(rewardContent), missionType]
                )
            } else {
                await db.query(
                    `INSERT IGNORE INTO MISSION_CLEARD 
                     (user_id, mission_id, mission_goal, current_status, clear_status, clear_time, reward_content, mission_type) 
                     VALUES (?, ?, ?, 0, false, NULL, ?, ?)`,
                    [user.user_id, missionId, goalValue, parseInt(rewardContent), missionType]
                )
            }
        }
    },

    /**
     * ミッション内容から目標数値を抽出
     * 例：「1000歩歩く」→1000、「5個投稿する」→5
     */
    extractGoalFromContent(content: string): number {
        const match = content.match(/(\d+)/)
        return match ? parseInt(match[1]) : 1
    },

    async getUserMissionStatus(userId: string): Promise<MissionCleardRow[]> {
        const [rows] = await db.query<MissionCleardRow[]>(
            `SELECT user_id, mission_id, mission_goal, current_status, clear_status, clear_time, reward_content, mission_type
             FROM MISSION_CLEARD
             WHERE user_id = ?`,
            [userId]
        )
        return rows
    },

    /**
     * ユーザーのミッション詳細情報を取得（MISSIONテーブルと結合）
     */
    async getUserMissionDetails(userId: string): Promise<UserMissionDetail[]> {
        const [rows] = await db.query<UserMissionDetail[]>(
            `SELECT 
                m.mission_id,
                m.mission_name,
                m.mission_content,
                m.reward_content as mission_reward,
                m.mission_type as mission_category,
                mc.mission_goal,
                mc.current_status,
                mc.clear_status,
                mc.clear_time,
                mc.reward_content,
                mc.mission_type,
                CASE 
                    WHEN mc.mission_goal > 0 THEN ROUND((mc.current_status / mc.mission_goal * 100), 1)
                    ELSE 0 
                END as progress_percentage
             FROM MISSION m
             JOIN MISSION_CLEARD mc ON m.mission_id = mc.mission_id
             WHERE mc.user_id = ?
             ORDER BY mc.clear_status ASC, m.mission_type, m.mission_id`,
            [userId]
        )
        return rows
    },

    async markMissionCleared(user_id: string, mission_id: string): Promise<boolean> {
        // ミッション情報取得
        const mission = await this.getMissionById(mission_id)
        if (!mission) return false

        // mission_contentから目標値を抽出
        const mission_goal = this.extractGoalFromContent(mission.mission_content)

        // mission_cleardテーブルに保存
        await db.query(
            'INSERT INTO mission_cleard (user_id, mission_id, mission_goal, cleared_at) VALUES (?, ?, ?, NOW())',
            [user_id, mission_id, mission_goal]
        )
        return true
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

            // 2. 報酬ポイント取得（MISSION_CLEARDテーブルから）
            const [rewardRows] = await conn.query<RowDataPacket[]>(
                `SELECT reward_content FROM MISSION_CLEARD WHERE user_id = ? AND mission_id = ?`,
                [userId, missionId]
            )
            if (rewardRows.length === 0) {
                await conn.rollback()
                return false
            }
            const reward = Number(rewardRows[0].reward_content) || 0

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
    async checkMissionClearStatus(userId: string, missionId: string): Promise<MissionProgressData | null> {
        // MISSION_CLEARDから情報を取得（MISSIONテーブルと結合）
        const [missionClearRows] = await db.query<RowDataPacket[]>(
            `SELECT mc.mission_goal, mc.mission_type, m.mission_content 
             FROM MISSION_CLEARD mc
             JOIN MISSION m ON mc.mission_id = m.mission_id
             WHERE mc.user_id = ? AND mc.mission_id = ?`,
            [userId, missionId]
        )

        if (missionClearRows.length === 0) return null

        const { mission_goal: targetValue, mission_type, mission_content } = missionClearRows[0]

        // ユーザーの進捗データを取得
        const userProgress = await this.getUserProgressData(userId, mission_type as 'daily' | 'weekly')
        if (!userProgress) return null

        let currentValue = 0

        // mission_contentに基づいて参照するデータを決定
        if (mission_content.includes('歩')) {
            // 歩数系ミッション（「歩」という文字が含まれている場合）
            currentValue = userProgress.totalSteps || 0
        } else if (mission_content.includes('個') || mission_content.includes('回')) {
            // 貢献度系ミッション（「個」または「回」という文字が含まれている場合）
            currentValue = userProgress.totalContributions || 0
        } else {
            // 未対応の場合は0とする
            console.warn(`未対応のmission_content: ${mission_content}`)
            currentValue = 0
        }

        const isClear = currentValue >= targetValue

        return {
            isClear,
            currentValue,
            targetValue,
            missionType: mission_content,
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
        progressData?: MissionProgressData
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

    /**
     * 既存データの整合性チェック・修復
     * 既存のミッションに対してMISSION_CLEARDレコードが不足している場合に補完
     */
    async repairMissionCleardData(): Promise<{
        repairedUsers: number
        repairedMissions: number
    }> {
        const conn = await db.getConnection()
        let repairedUsers = 0
        let repairedMissions = 0

        try {
            await conn.beginTransaction()

            // 全ユーザーと全ミッションの組み合わせでMISSION_CLEARDに存在しないレコードを特定
            const [missingRecords] = await conn.query<RowDataPacket[]>(
                `SELECT u.user_id, m.mission_id, m.mission_content, m.reward_content, m.mission_type
                 FROM USERS u
                 CROSS JOIN MISSION m
                 LEFT JOIN MISSION_CLEARD mc ON u.user_id = mc.user_id AND m.mission_id = mc.mission_id
                 WHERE mc.user_id IS NULL`
            )

            for (const record of missingRecords) {
                const goalValue = this.extractGoalFromContent(record.mission_content)

                await conn.query(
                    `INSERT INTO MISSION_CLEARD 
                     (user_id, mission_id, mission_goal, current_status, clear_status, clear_time, reward_content, mission_type) 
                     VALUES (?, ?, ?, 0, false, NULL, ?, ?)`,
                    [record.user_id, record.mission_id, goalValue, parseInt(record.reward_content), record.mission_type]
                )

                repairedMissions++
            }

            // 修復されたユーザー数をカウント
            const uniqueUsers = [...new Set(missingRecords.map((r) => r.user_id))]
            repairedUsers = uniqueUsers.length

            await conn.commit()

            return { repairedUsers, repairedMissions }
        } catch (err) {
            await conn.rollback()
            throw err
        } finally {
            conn.release()
        }
    },
}
