import { OkPacket, RowDataPacket } from 'mysql2'
import db from '~/config/database'

interface MissionRow extends RowDataPacket {
    mission_id: string
    mission_name: string
    mission_content: string
    reward_content: string
    mission_type: 'step' | 'contribution'
    mission_category: 'daily' | 'weekly'
}

interface MissionCleardRow extends RowDataPacket {
    user_id: string
    mission_id: string
    mission_goal: number
    current_status: number
    clear_status: boolean
    clear_time: Date | null // クリア時刻（NULLなら未クリア）
    reward_content: number
    mission_type: 'step' | 'contribution'
    mission_category: 'daily' | 'weekly'
}

export interface MissionInsertDTO {
    mission_id: string
    mission_name: string
    mission_content: string
    reward_content: string
    mission_type: 'step' | 'contribution'
    mission_category: 'daily' | 'weekly'
}

interface UserMissionDetail extends RowDataPacket {
    mission_id: string
    mission_name: string
    mission_content: string
    mission_reward: string
    mission_category: 'daily' | 'weekly'
    mission_goal: number
    current_status: number
    clear_status: boolean
    clear_time: Date | null
    reward_content: number
    mission_type: 'step' | 'contribution'
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
            const { mission_id, mission_name, mission_content, reward_content, mission_type, mission_category } =
                mission
            await conn.query(
                'INSERT INTO MISSION (mission_id, mission_name, mission_content, reward_content, mission_type, mission_category) VALUES (?, ?, ?, ?, ?, ?)',
                [mission_id, mission_name, mission_content, reward_content, mission_type, mission_category]
            )

            // 2. 全既存ユーザーに対してMISSION_CLEARDレコードを作成
            await this.createMissionCleardForAllUsers(
                mission_id,
                mission_content,
                reward_content,
                mission_type,
                mission_category,
                conn
            )

            await conn.commit()
        } catch (err) {
            await conn.rollback()
            throw err
        } finally {
            conn.release()
        }
    },

    async getAllUserIds(): Promise<{ user_id: string }[]> {
        const [rows] = await db.query<RowDataPacket[]>('SELECT user_id FROM USERS')
        return rows as { user_id: string }[]
    },
    async deleteMission(missionId: string): Promise<boolean> {
        const [result] = await db.query<OkPacket>('DELETE FROM MISSION WHERE mission_id = ?', [missionId])
        return result.affectedRows > 0
    },
    async resetDailyMissions(): Promise<void> {
        await db.query(
            `UPDATE MISSION_CLEARD 
         SET current_status = 0, clear_status = false, clear_time = NULL 
         WHERE mission_category = 'daily'`
        )
    },
    async resetWeeklyMissions(): Promise<void> {
        await db.query(
            `UPDATE MISSION_CLEARD 
         SET current_status = 0, clear_status = false, clear_time = NULL 
         WHERE mission_category = 'weekly'`
        )
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
     (user_id, mission_id, mission_goal, current_status, clear_status, clear_time, reward_content, mission_type, mission_category) 
     VALUES (?, ?, ?, 0, false, NULL, ?, ?, ?)`,
                    [
                        userId,
                        mission.mission_id,
                        goalValue,
                        parseInt(mission.reward_content),
                        mission.mission_type,
                        mission.mission_category,
                    ]
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
        missionCategory: string,
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
                        (user_id, mission_id, mission_goal, current_status, clear_status, clear_time, reward_content, mission_type, mission_category) 
                        VALUES (?, ?, ?, 0, false, NULL, ?, ?, ?)`,
                    [user.user_id, missionId, goalValue, parseInt(rewardContent), missionType, missionCategory] // ← 必要に応じて 'weekly' に
                )
            } else {
                await db.query(
                    `INSERT IGNORE INTO MISSION_CLEARD 
                     (user_id, mission_id, mission_goal, current_status, clear_status, clear_time, reward_content, mission_type, mission_category) 
                     VALUES (?, ?, ?, 0, false, NULL, ?, ?, ?)`,
                    [user.user_id, missionId, goalValue, parseInt(rewardContent), missionType, missionCategory] // ← 必要に応じて 'weekly' に
                )
            }
        }
    },

    /**
     * ミッション内容から目標数値を抽出
     * 例：「1000歩歩く」→1000、「5個投稿する」→5
     */
    extractGoalFromContent(content: string): number {
        return parseInt(content, 10) || 1
    },

    async getUserMissionStatus(userId: string): Promise<MissionCleardRow[]> {
        const [rows] = await db.query<MissionCleardRow[]>(
            `SELECT user_id, mission_id, mission_goal, current_status, clear_status, clear_time, reward_content, mission_type, mission_category
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
        console.log('=== getUserMissionDetails Model Debug ===')
        console.log('userId:', userId)

        const [rows] = await db.query<UserMissionDetail[]>(
            `SELECT
                m.mission_id,
                m.mission_name,
                m.mission_content,
                m.reward_content AS mission_reward,
                m.mission_type  AS mission_type,
                m.mission_category AS mission_category,
                mc.mission_goal,
                mc.current_status AS current_status,
                mc.clear_status,
                mc.clear_time,
                mc.reward_content,
                CASE
                    WHEN mc.clear_status = true THEN 100.0
                    WHEN mc.mission_goal > 0 THEN ROUND(mc.current_status / mc.mission_goal * 100, 1)
                    ELSE 0
                END AS progress_percentage
                FROM MISSION m
                JOIN (
                    SELECT 
                        user_id, 
                        mission_id, 
                        mission_goal, 
                        current_status, 
                        clear_status, 
                        clear_time, 
                        reward_content, 
                        mission_type, 
                        mission_category,
                        ROW_NUMBER() OVER (PARTITION BY mission_id ORDER BY clear_time DESC, clear_status DESC) as rn
                    FROM MISSION_CLEARD 
                    WHERE user_id = ?
                ) mc ON m.mission_id = mc.mission_id AND mc.rn = 1
                ORDER BY mc.clear_status ASC, m.mission_type, m.mission_id`,
            [userId]
        )

        console.log('DB結果の行数:', rows.length)
        console.log(
            'DB結果詳細:',
            rows.map((r) => ({
                mission_id: r.mission_id,
                clear_status: r.clear_status,
                mission_category: r.mission_category,
            }))
        )

        return rows
    },

    async markMissionCleared(user_id: string, mission_id: string): Promise<boolean> {
        try {
            // MISSION_CLEARDテーブルの該当レコードを更新
            const [result] = await db.query<OkPacket>(
                'UPDATE MISSION_CLEARD SET clear_status = true, clear_time = NOW() WHERE user_id = ? AND mission_id = ?',
                [user_id, mission_id]
            )
            return result.affectedRows > 0
        } catch (error) {
            console.error('Error marking mission as cleared:', error)
            return false
        }
    },
    async claimAllClearedMissions(userId: string): Promise<{
        claimedCount: number
        totalReward: number
    }> {
        const conn = await db.getConnection()

        try {
            await conn.beginTransaction()

            // 1. 報酬を受け取る対象ミッションを取得
            const [missions] = await conn.query<RowDataPacket[]>(
                `SELECT mission_id, reward_content 
                FROM MISSION_CLEARD 
                WHERE user_id = ? AND clear_status = true AND clear_time IS NULL`,
                [userId]
            )

            if (missions.length === 0) {
                await conn.rollback()
                return { claimedCount: 0, totalReward: 0 }
            }

            // 2. 合計報酬を計算
            const totalReward = missions.reduce((sum, m) => sum + (Number(m.reward_content) || 0), 0)

            // 3. ユーザーに報酬を加算
            await conn.query(`UPDATE USERS SET point = point + ? WHERE user_id = ?`, [totalReward, userId])

            // 4. 各ミッションの clear_time を更新（受領済みフラグとして）
            await conn.query(
                `UPDATE MISSION_CLEARD 
       SET clear_time = NOW() 
       WHERE user_id = ? AND clear_status = true AND clear_time IS NULL`,
                [userId]
            )

            await conn.commit()
            return {
                claimedCount: missions.length,
                totalReward,
            }
        } catch (err) {
            await conn.rollback()
            throw err
        } finally {
            conn.release()
        }
    },

    async revertMissionCleared(userId: string, missionId: string): Promise<boolean> {
        const conn = await db.getConnection()

        try {
            await conn.beginTransaction()

            // 1. 現在の状態を確認
            const [currentRows] = await conn.query<RowDataPacket[]>(
                `SELECT clear_status, clear_time, reward_content 
                 FROM MISSION_CLEARD 
                 WHERE user_id = ? AND mission_id = ?`,
                [userId, missionId]
            )

            if (currentRows.length === 0) {
                await conn.rollback()
                return false
            }

            const { clear_status, clear_time, reward_content } = currentRows[0]

            // 2. 報酬が既に受け取られている場合、ポイントを差し引く
            if (clear_status && clear_time !== null) {
                const rewardAmount = Number(reward_content) || 0
                await conn.query(`UPDATE USERS SET user_point = GREATEST(0, user_point - ?) WHERE user_id = ?`, [
                    rewardAmount,
                    userId,
                ])
            }

            // 3. ミッションクリア状態をリセット
            const [result] = await conn.query<OkPacket>(
                'UPDATE MISSION_CLEARD SET clear_status = false, clear_time = NULL, current_status = 0 WHERE user_id = ? AND mission_id = ?',
                [userId, missionId]
            )

            await conn.commit()
            return result.affectedRows > 0
        } catch (err) {
            await conn.rollback()
            throw err
        } finally {
            conn.release()
        }
    },

    async getMissionById(missionId: string): Promise<MissionRow | null> {
        const [rows] = await db.query<MissionRow[]>('SELECT * FROM MISSION WHERE mission_id = ?', [missionId])
        return rows.length > 0 ? rows[0] : null
    },

    /**
     * ミッションクリア状態を更新（報酬は即座に付与しない）
     * @param userId ユーザーID
     * @param missionId ミッションID
     * @returns 成功した場合はtrue、失敗した場合はfalse
     */
    async markMissionClearedAndReward(userId: string, missionId: string): Promise<boolean> {
        const conn = await db.getConnection()

        try {
            await conn.beginTransaction()

            // 0. 既にクリア済みかチェック
            const [existingRows] = await conn.query<RowDataPacket[]>(
                `SELECT clear_status FROM MISSION_CLEARD WHERE user_id = ? AND mission_id = ?`,
                [userId, missionId]
            )

            if (existingRows.length > 0 && existingRows[0].clear_status) {
                // 既にクリア済みの場合は何もしない
                await conn.rollback()
                return false
            }

            // 1. 現在の進捗値を取得してからクリア処理
            const progressData = await this.checkMissionClearStatus(userId, missionId)
            if (!progressData || !progressData.isClear) {
                await conn.rollback()
                return false
            }

            console.log(`=== クリア処理 Debug ===`)
            console.log(`userId: ${userId}, missionId: ${missionId}`)
            console.log(`現在の進捗値: ${progressData.currentValue}`)
            console.log(`目標値: ${progressData.targetValue}`)
            console.log(`クリア時刻: ${new Date().toISOString()}`)

            const [updateResult] = await conn.query<OkPacket>(
                `UPDATE MISSION_CLEARD 
                 SET clear_status = true, clear_time = NOW(), current_status = ?
                 WHERE user_id = ? AND mission_id = ? AND clear_status = false`,
                [progressData.currentValue, userId, missionId]
            )

            console.log(`更新された行数: ${updateResult.affectedRows}`)

            if (updateResult.affectedRows === 0) {
                await conn.rollback()
                return false
            }

            // 注意: 報酬ポイントは即座に付与せず、別途受け取り処理が必要
            // clear_time = クリア時刻
            // current_status = 歩数やコントリビューション数などの進捗値

            // デバッグ: 更新後の状態を確認
            const [verifyRows] = await conn.query<RowDataPacket[]>(
                `SELECT clear_status, current_status, clear_time FROM MISSION_CLEARD 
                 WHERE user_id = ? AND mission_id = ?`,
                [userId, missionId]
            )
            if (verifyRows.length > 0) {
                const row = verifyRows[0]
                console.log(`更新後の状態:`)
                console.log(`- clear_status: ${row.clear_status}`)
                console.log(`- current_status: ${row.current_status}`)
                console.log(`- clear_time: ${row.clear_time}`)
            }

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
        // クリア済みのミッションの場合でもcurrent_statusを更新する
        // (current_statusには歩数やコントリビューション数などの進捗値が記録される)
        await db.query(
            'UPDATE MISSION_CLEARD SET current_status = ? WHERE user_id = ? AND mission_id = ? AND clear_status = false',
            [status, userId, missionId]
        )
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
        // MISSION_CLEARD から必要情報を取得
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT 
       mc.mission_goal, 
       mc.mission_type, 
       mc.mission_category 
     FROM MISSION_CLEARD mc
     WHERE mc.user_id = ? AND mc.mission_id = ?`,
            [userId, missionId]
        )
        if (rows.length === 0) return null

        const { mission_goal: targetValue, mission_type, mission_category } = rows[0]

        // 指定周期のユーザーデータを取得
        const userProgress = await this.getUserProgressData(userId, mission_category as 'daily' | 'weekly')
        if (!userProgress) return null

        // mission_type によって currentValue を決定
        let currentValue = 0
        if (mission_type === 'step') {
            currentValue = userProgress.totalSteps || 0
        } else if (mission_type === 'contribution') {
            currentValue = userProgress.totalContributions || 0
        } else {
            console.warn(`未対応の mission_type: ${mission_type}`)
        }

        const isClear = currentValue >= targetValue

        return {
            isClear,
            currentValue,
            targetValue,
            missionType: mission_type,
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
        // まず現在のクリア状態をチェック
        const [existingRows] = await db.query<RowDataPacket[]>(
            'SELECT clear_status FROM MISSION_CLEARD WHERE user_id = ? AND mission_id = ?',
            [userId, missionId]
        )

        if (existingRows.length > 0 && existingRows[0].clear_status) {
            // 既にクリア済みの場合は進捗更新をスキップ
            const clearStatus = await this.checkMissionClearStatus(userId, missionId)
            return {
                updated: false, // 更新しない
                cleared: false, // 新規クリアではない
                progressData: clearStatus || undefined,
            }
        }

        const clearStatus = await this.checkMissionClearStatus(userId, missionId)
        if (!clearStatus) {
            return { updated: false, cleared: false }
        }

        // current_statusを更新（未クリアの場合のみ）
        await this.updateCurrentStatus(userId, missionId, clearStatus.currentValue)

        // クリア判定
        if (clearStatus.isClear) {
            const cleared = await this.markMissionClearedAndReward(userId, missionId)
            return {
                updated: true,
                cleared,
                progressData: clearStatus,
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
                        (user_id, mission_id, mission_goal, current_status, clear_status, clear_time, reward_content, mission_type, mission_category) 
                        VALUES (?, ?, ?, 0, false, NULL, ?, ?, ?)`,
                    [
                        record.user_id,
                        record.mission_id,
                        goalValue,
                        parseInt(record.reward_content),
                        record.mission_type,
                        'daily',
                    ]
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
    // 受け取り可能な報酬一覧取得（クリア24時間後で、まだ受け取っていないもの）
    async getUnclaimedRewards(user_id: string): Promise<MissionCleardRow[]> {
        const [rows] = await db.query<MissionCleardRow[]>(
            `SELECT mission_id, reward_content, current_status
             FROM MISSION_CLEARD
             WHERE user_id = ? 
             AND clear_status = true 
             AND clear_time IS NOT NULL
             AND (UNIX_TIMESTAMP() - UNIX_TIMESTAMP(clear_time)) >= 86400`,
            [user_id]
        )
        return rows
    },

    // ユーザーの報酬状況を詳しく取得
    async getRewardStatusSummary(user_id: string): Promise<{
        alreadyClaimed: number
        waitingForCooldown: number
        claimable: number
        totalCleared: number
    }> {
        // 受け取り済み報酬数（報酬受け取り処理で別管理が必要）
        const [claimedRows] = await db.query<RowDataPacket[]>(
            `SELECT COUNT(*) as count FROM MISSION_CLEARD 
             WHERE user_id = ? AND clear_status = true 
             AND clear_time IS NOT NULL 
             AND (UNIX_TIMESTAMP() - UNIX_TIMESTAMP(clear_time)) < 86400`,
            [user_id]
        )

        // クールダウン中（クリア済みだが24時間未経過）
        const [cooldownRows] = await db.query<RowDataPacket[]>(
            `SELECT COUNT(*) as count FROM MISSION_CLEARD 
             WHERE user_id = ? AND clear_status = true 
             AND clear_time IS NOT NULL 
             AND (UNIX_TIMESTAMP() - UNIX_TIMESTAMP(clear_time)) < 86400`,
            [user_id]
        )

        // 受け取り可能
        const [claimableRows] = await db.query<RowDataPacket[]>(
            `SELECT COUNT(*) as count FROM MISSION_CLEARD 
             WHERE user_id = ? AND clear_status = true 
             AND clear_time IS NOT NULL 
             AND (UNIX_TIMESTAMP() - UNIX_TIMESTAMP(clear_time)) >= 86400`,
            [user_id]
        )

        // 総クリア数
        const [totalRows] = await db.query<RowDataPacket[]>(
            `SELECT COUNT(*) as count FROM MISSION_CLEARD 
             WHERE user_id = ? AND clear_status = true`,
            [user_id]
        )

        return {
            alreadyClaimed: 0, // 別途報酬受け取り管理テーブルが必要
            waitingForCooldown: Number(cooldownRows[0]?.count) || 0,
            claimable: Number(claimableRows[0]?.count) || 0,
            totalCleared: Number(totalRows[0]?.count) || 0,
        }
    },
    // 報酬受け取り済みにする（clear_timeを設定して受け取り済みフラグとする）
    async markRewardReceived(user_id: string, mission_id: string): Promise<void> {
        await db.query(
            `UPDATE MISSION_CLEARD 
             SET clear_time = NOW() 
             WHERE user_id = ? AND mission_id = ? AND clear_time IS NULL`,
            [user_id, mission_id]
        )
    },

    // ユーザーのポイント加算
    async addUserPoints(user_id: string, points: number): Promise<void> {
        await db.query(`UPDATE USERS SET user_point = user_point + ? WHERE user_id = ?`, [points, user_id])
    },
}
