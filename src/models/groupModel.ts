// src/models/groupModel.ts
import { OkPacket, RowDataPacket } from 'mysql2'
import db from '~/config/database'

export interface GroupRow extends RowDataPacket {
    group_id: number
    admin_id: string
    group_name: string
    max_person: number
    back_image: string
    group_public: boolean
}

export const groupModel = {
    async createGroup(
        admin_id: string,
        group_name: string,
        max_person: number,
        back_image: string,
        group_public: boolean
    ): Promise<number> {
        const [result] = await db.query<OkPacket>(
            'INSERT INTO GROUP_INFO (admin_id, group_name, max_person, back_image, group_public) VALUES (?, ?, ?, ?, ?)',
            [admin_id, group_name, max_person, back_image, group_public]
        )
        return result.insertId
    },

    async addGroupMember(group_id: number, user_id: string, role: string = 'MEMBER'): Promise<void> {
        await db.query('INSERT IGNORE INTO GROUP_MEMBER (group_id, user_id, role) VALUES (?, ?, ?)', [
            group_id,
            user_id,
            role,
        ])
    },

    async getGroupById(group_id: number): Promise<GroupRow | null> {
        const [rows] = await db.query<GroupRow[]>('SELECT * FROM GROUP_INFO WHERE group_id=?', [group_id])
        return rows.length > 0 ? rows[0] : null
    },

    async updateGroup(group_id: number, group_name: string, max_person: number, back_image: string): Promise<boolean> {
        const [result] = await db.query<OkPacket>(
            'UPDATE GROUP_INFO SET group_name=?, max_person=?, back_image=? WHERE group_id=?',
            [group_name, max_person, back_image, group_id]
        )
        return result.affectedRows > 0
    },

    async deleteGroup(group_id: number): Promise<boolean> {
        const [result] = await db.query<OkPacket>('DELETE FROM GROUP_INFO WHERE group_id=?', [group_id])
        return result.affectedRows > 0
    },

    async getGroupsByUserId(user_id: string): Promise<any[]> {
        const [rows] = await db.query(
            `SELECT 
         gi.group_id,
         gi.group_name,
         gi.max_person,
         gi.back_image,
         (SELECT COUNT(*) FROM GROUP_MEMBER gm2 WHERE gm2.group_id = gi.group_id) AS current_count
       FROM GROUP_MEMBER gm
       JOIN GROUP_INFO gi ON gm.group_id = gi.group_id
       WHERE gm.user_id = ?`,
            [user_id]
        )
        return rows as any[]
    },

    async getGroupMembers(group_id: number): Promise<any[]> {
        const [rows] = await db.query(
            `SELECT u.user_id, u.user_name, u.user_icon, gm.role
       FROM GROUP_MEMBER gm 
       JOIN USERS u ON gm.user_id = u.user_id 
       WHERE gm.group_id = ?`,
            [group_id]
        )
        return rows as any[]
    },

    async removeGroupMember(group_id: number, user_id: string): Promise<void> {
        await db.query('DELETE FROM GROUP_MEMBER WHERE group_id = ? AND user_id = ?', [group_id, user_id])
    },

    async isGroupAdmin(group_id: number, user_id: string): Promise<boolean> {
        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT * FROM GROUP_MEMBER WHERE group_id = ? AND user_id = ? AND role = "ADMIN"',
            [group_id, user_id]
        )
        return rows.length > 0
    },
}
