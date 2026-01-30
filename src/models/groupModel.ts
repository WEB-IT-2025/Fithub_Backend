// src/models/groupModel.ts
import { OkPacket, RowDataPacket } from 'mysql2'
import db from '~/config/database'

export interface GroupRow extends RowDataPacket {
    group_id: string
    admin_id: string // グループリーダーのID
    group_name: string
    max_person: number
    back_image: string
    invite_code?: string
}

export interface GroupMember extends RowDataPacket {
    user_id: string
    user_name: string
    user_icon: string
}

export interface GroupMemberWithPet extends RowDataPacket {
    user_id: string
    user_name: string
    user_icon: string
    main_pet_name?: string
    main_pet_item_id?: string
    pet_size?: number
    pet_intimacy?: number
    pet_image?: string
}

export const groupModel = {
    // グループ作成（作成者が自動的にグループリーダーになる）
    async createGroup(
        group_id: string,
        admin_id: string,
        group_name: string,
        max_person: number,
        back_image: string,
        group_public: boolean
    ): Promise<string> {
        await db.query(
            'INSERT INTO GROUP_INFO (group_id, admin_id, group_name, max_person, back_image, group_public) VALUES (?, ?, ?, ?, ?, ?)',
            [group_id, admin_id, group_name, max_person, back_image, group_public]
        )
        return group_id
    },

    // groupModel.ts に追加
    async getNextGroupId(): Promise<string> {
        const [rows] = await db.query<RowDataPacket[]>(
            "SELECT group_id FROM GROUP_INFO WHERE group_id LIKE 'g%' ORDER BY group_id DESC LIMIT 1"
        )

        if (rows.length === 0) return 'g0000001'

        const lastId = rows[0].group_id // 例: 'g0000123'
        const num = parseInt(lastId.slice(1)) + 1 // '0000123' → 124
        const newId = `g${String(num).padStart(7, '0')}` // → 'g0000124'
        return newId
    },

    // グループメンバー追加
    async addGroupMember(group_id: string, user_id: string): Promise<void> {
        await db.query('INSERT IGNORE INTO GROUP_MEMBER (group_id, user_id) VALUES (?, ?)', [group_id, user_id])
    },

    // グループIDでグループ取得
    async getGroupById(group_id: string): Promise<GroupRow | null> {
        const [rows] = await db.query<GroupRow[]>('SELECT * FROM GROUP_INFO WHERE group_id = ?', [group_id])
        return rows.length > 0 ? rows[0] : null
    },

    // グループ情報更新（グループリーダーのみ）
    async updateGroup(group_id: string, group_name: string, max_person: number, back_image: string): Promise<boolean> {
        const [result] = await db.query<OkPacket>(
            'UPDATE GROUP_INFO SET group_name = ?, max_person = ?, back_image = ? WHERE group_id = ?',
            [group_name, max_person, back_image, group_id]
        )
        return result.affectedRows > 0
    },

    // グループ削除（グループリーダーのみ）
    async deleteGroup(group_id: string): Promise<boolean> {
        const [result] = await db.query<OkPacket>('DELETE FROM GROUP_INFO WHERE group_id = ?', [group_id])
        return result.affectedRows > 0
    },

    // ユーザーが所属するグループ一覧取得
    async getGroupsByUserId(user_id: string): Promise<GroupRow[]> {
        const [rows] = await db.query(
            `SELECT 
                gi.group_id,
                gi.group_name,
                gi.max_person,
                gi.back_image,
                gi.admin_id,
                (SELECT COUNT(*) FROM GROUP_MEMBER gm2 WHERE gm2.group_id = gi.group_id) AS current_count
            FROM GROUP_MEMBER gm
            JOIN GROUP_INFO gi ON gm.group_id = gi.group_id
            WHERE gm.user_id = ?`,
            [user_id]
        )
        return rows as GroupRow[]
    },

    // グループメンバー一覧取得（メインペット情報含む）
    async getGroupMembersWithPets(group_id: string): Promise<GroupMemberWithPet[]> {
        const [rows] = await db.query<GroupMemberWithPet[]>(
            `SELECT 
                u.user_id, 
                u.user_name, 
                u.user_icon,
                up.user_pet_name as main_pet_name,
                up.item_id as main_pet_item_id,
                up.pet_size,
                up.pet_intimacy,
                i.item_image_url as pet_image
            FROM GROUP_MEMBER gm 
            JOIN USERS u ON gm.user_id = u.user_id 
            LEFT JOIN USERS_PETS up ON u.user_id = up.user_id AND up.user_main_pet = true
            LEFT JOIN ITEMS i ON up.item_id = i.item_id
            WHERE gm.group_id = ?`,
            [group_id]
        )
        return rows
    },

    // グループメンバー一覧取得（従来版）
    async getGroupMembers(group_id: string): Promise<GroupMember[]> {
        const [rows] = await db.query<GroupMember[]>(
            `SELECT u.user_id, u.user_name, u.user_icon
            FROM GROUP_MEMBER gm 
            JOIN USERS u ON gm.user_id = u.user_id 
            WHERE gm.group_id = ?`,
            [group_id]
        )
        return rows
    },

    // グループメンバー削除（グループリーダーのみ）
    async removeGroupMember(group_id: string, user_id: string): Promise<void> {
        await db.query('DELETE FROM GROUP_MEMBER WHERE group_id = ? AND user_id = ?', [group_id, user_id])
    },

    // グループリーダー確認（重要な権限チェック）
    async isGroupLeader(group_id: string, user_id: string): Promise<boolean> {
        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT admin_id FROM GROUP_INFO WHERE group_id = ? AND admin_id = ?',
            [group_id, user_id]
        )
        return rows.length > 0
    },

    // ユーザーがグループメンバーかどうか確認
    async isGroupMember(group_id: string, user_id: string): Promise<boolean> {
        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT * FROM GROUP_MEMBER WHERE group_id = ? AND user_id = ?',
            [group_id, user_id]
        )
        return rows.length > 0
    },

    // グループの現在のメンバー数取得
    async getGroupMemberCount(group_id: string): Promise<number> {
        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM GROUP_MEMBER WHERE group_id = ?',
            [group_id]
        )
        return rows[0].count
    },

    // グループリーダー変更（システム管理者または現在のリーダーのみ）
    async changeGroupLeader(group_id: string, new_admin_id: string): Promise<boolean> {
        const [result] = await db.query<OkPacket>('UPDATE GROUP_INFO SET admin_id = ? WHERE group_id = ?', [
            new_admin_id,
            group_id,
        ])
        return result.affectedRows > 0
    },

    // 公開グループ検索
    async searchPublicGroups(search?: string, limit: number = 20): Promise<GroupRow[]> {
        let query = `
            SELECT 
                gi.group_id,
                gi.group_name,
                gi.max_person,
                gi.back_image,
                gi.admin_id,
                (SELECT COUNT(*) FROM GROUP_MEMBER gm2 WHERE gm2.group_id = gi.group_id) AS current_count
            FROM GROUP_INFO gi
            WHERE gi.group_public = true
        `
        const params: (string | number)[] = []

        if (search) {
            query += ' AND gi.group_name LIKE ?'
            params.push(`%${search}%`)
        }

        query += ' ORDER BY gi.group_name LIMIT ?'
        params.push(limit)

        const [rows] = await db.query(query, params)
        return rows as GroupRow[]
    },

    // ユーザー存在確認
    async getUserById(user_id: string): Promise<{ user_id: string; user_name: string } | null> {
        const [rows] = await db.query<RowDataPacket[]>('SELECT user_id, user_name FROM USERS WHERE user_id = ?', [
            user_id,
        ])
        return rows.length > 0 ? (rows[0] as { user_id: string; user_name: string }) : null
    },

    // 招待コード生成（8桁のランダム文字列）
    generateInviteCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let result = ''
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    },

    // 招待コード設定
    async setInviteCode(group_id: string, invite_code: string): Promise<boolean> {
        const [result] = await db.query<OkPacket>('UPDATE GROUP_INFO SET invite_code = ? WHERE group_id = ?', [
            invite_code,
            group_id,
        ])
        return result.affectedRows > 0
    },

    // 招待コードでグループ取得
    async getGroupByInviteCode(invite_code: string): Promise<GroupRow | null> {
        const [rows] = await db.query<GroupRow[]>('SELECT * FROM GROUP_INFO WHERE invite_code = ?', [invite_code])
        return rows.length > 0 ? rows[0] : null
    },

    // 招待コード重複チェック
    async isInviteCodeExists(invite_code: string): Promise<boolean> {
        const [rows] = await db.query<RowDataPacket[]>('SELECT invite_code FROM GROUP_INFO WHERE invite_code = ?', [
            invite_code,
        ])
        return rows.length > 0
    },
}
