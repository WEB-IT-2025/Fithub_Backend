// src/models/shopModel.ts
import { ResultSetHeader, RowDataPacket } from 'mysql2'
import db from '~/config/database'

export interface ShopItem {
    item_id: string
    item_name: string
    item_point: number
    sold_count: number
    item_image_folder: string
    item_create_day: Date
    item_delete_day: Date
    item_details: string
    item_category: string
    pet_category?: string
    pet_type?: string
}

export interface ShopItemInput {
    item_id: string
    item_name: string
    item_point: number
    item_image_folder: string
    item_create_day: string
    item_delete_day: string
    item_details: string
    item_category: string
    pet_type?: string
    pet_category?: string
}

interface ShopItemRow extends RowDataPacket {
    item_id: string
    item_name: string
    item_point: number
    sold_count: number
    item_image_folder: string
    item_create_day: Date
    item_delete_day: Date
    item_details: string
    item_category: string
    pet_category?: string
    pet_type?: string
}

export const shopModel = {
    // ショップアイテム一覧を取得
    async getAllItems(category?: string): Promise<ShopItem[]> {
        let query = `
            SELECT 
                i.item_id,
                i.item_name,
                i.item_point,
                i.sold_count,
                i.item_image_folder,
                i.item_create_day,
                i.item_delete_day,
                i.item_details,
                i.item_category,
                p.pet_type,
                CASE 
                    WHEN p.item_id IS NOT NULL THEN 'pet'
                    ELSE 'item'
                END as pet_category
            FROM ITEMS i
            LEFT JOIN PETS p ON i.item_id = p.item_id
            WHERE i.item_delete_day > NOW()
        `

        const params: string[] = []

        if (category) {
            query += ` AND p.pet_type = ?`
            params.push(category)
        }

        query += ` ORDER BY i.item_create_day DESC`

        const [rows] = await db.execute<ShopItemRow[]>(query, params)
        return rows
    },

    // 特定のアイテム詳細を取得
    async getItemById(itemId: string): Promise<ShopItem | null> {
        const query = `
            SELECT 
                i.item_id,
                i.item_name,
                i.item_point,
                i.sold_count,
                i.item_image_folder,
                i.item_create_day,
                i.item_delete_day,
                i.item_details,
                i.item_category,
                p.pet_type,
                CASE 
                    WHEN p.item_id IS NOT NULL THEN 'pet'
                    ELSE 'item'
                END as pet_category
            FROM ITEMS i
            LEFT JOIN PETS p ON i.item_id = p.item_id
            WHERE i.item_id = ? AND i.item_delete_day > NOW()
        `

        const [rows] = await db.execute<ShopItemRow[]>(query, [itemId])
        return rows[0] || null
    },

    // 新しいアイテムを作成
    async createItem(itemData: ShopItemInput): Promise<ShopItem> {
        const connection = await db.getConnection()

        try {
            await connection.beginTransaction()

            // ITEMSテーブルに挿入
            const insertItemQuery = `
                INSERT INTO ITEMS (
                    item_id, item_name, item_point, sold_count, 
                    item_image_folder, item_create_day, item_delete_day, 
                    item_details, item_category
                ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)
            `

            await connection.execute<ResultSetHeader>(insertItemQuery, [
                itemData.item_id,
                itemData.item_name,
                itemData.item_point,
                itemData.item_image_folder,
                itemData.item_create_day,
                itemData.item_delete_day,
                itemData.item_details,
                itemData.item_category,
            ])

            // ペットの場合はPETSテーブルにも挿入
            if (itemData.item_category === 'pet' && itemData.pet_type) {
                const insertPetQuery = `
                    INSERT INTO PETS (item_id, pet_name, pet_image_folder, pet_type, pet_category)
                    VALUES (?, ?, ?, ?, 'pet')
                `

                await connection.execute<ResultSetHeader>(insertPetQuery, [
                    itemData.item_id,
                    itemData.item_name,
                    itemData.item_image_folder,
                    itemData.pet_type,
                ])
            }

            await connection.commit()

            // 作成されたアイテムを取得して返す
            const createdItem = await this.getItemById(itemData.item_id)
            return createdItem!
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    },

    // アイテム購入処理（sold_countをインクリメント）
    async purchaseItem(itemId: string, userId: string): Promise<boolean> {
        const connection = await db.getConnection()

        try {
            await connection.beginTransaction()

            // アイテム情報を取得
            const item = await this.getItemById(itemId)
            if (!item) {
                throw new Error('アイテムが見つかりません')
            }

            // ユーザーのポイントを確認
            const [userRows] = await connection.execute<RowDataPacket[]>('SELECT point FROM USERS WHERE user_id = ?', [
                userId,
            ])

            if (userRows.length === 0) {
                throw new Error('ユーザーが見つかりません')
            }

            const userPoint = userRows[0].point
            if (userPoint < item.item_point) {
                throw new Error('ポイントが不足しています')
            }

            // ペットの場合、既に購入済みかチェック
            if (item.pet_category === 'pet') {
                const [purchaseRows] = await connection.execute<RowDataPacket[]>(
                    'SELECT * FROM PURCHASES WHERE user_id = ? AND item_id = ?',
                    [userId, itemId]
                )

                if (purchaseRows.length > 0) {
                    throw new Error('このペットは既に購入済みです')
                }
            }

            // ユーザーのポイントを減算
            await connection.execute<ResultSetHeader>('UPDATE USERS SET point = point - ? WHERE user_id = ?', [
                item.item_point,
                userId,
            ])

            // sold_countをインクリメント
            await connection.execute<ResultSetHeader>(
                'UPDATE ITEMS SET sold_count = sold_count + 1 WHERE item_id = ?',
                [itemId]
            )

            // 購入記録を作成
            await connection.execute<ResultSetHeader>(
                'INSERT INTO PURCHASES (purchase_id, user_id, item_id, quantity, purchase_time) VALUES (?, ?, ?, 1, NOW())',
                [`purchase_${Date.now()}_${userId}`, userId, itemId]
            )

            // ペットの場合、USERS_PETSテーブルにも追加
            if (item.pet_category === 'pet') {
                await connection.execute<ResultSetHeader>(
                    'INSERT INTO USERS_PETS (user_id, item_id, user_main_pet, user_pet_name, user_sub_pet, pet_size, pet_states) VALUES (?, ?, false, ?, false, 1, 100)',
                    [userId, itemId, item.item_name]
                )
            } else {
                // アイテムの場合、USERS_ITEMSテーブルに追加
                const [existingItemRows] = await connection.execute<RowDataPacket[]>(
                    'SELECT * FROM USERS_ITEMS WHERE user_id = ? AND item_id = ?',
                    [userId, itemId]
                )

                if (existingItemRows.length > 0) {
                    // 既存のアイテムの場合、数量を増やす
                    await connection.execute<ResultSetHeader>(
                        'UPDATE USERS_ITEMS SET item_count = item_count + 1 WHERE user_id = ? AND item_id = ?',
                        [userId, itemId]
                    )
                } else {
                    // 新しいアイテムの場合、新規作成
                    await connection.execute<ResultSetHeader>(
                        'INSERT INTO USERS_ITEMS (user_id, item_id, item_count, category, usage_state) VALUES (?, ?, 1, ?, false)',
                        [userId, itemId, item.item_category]
                    )
                }
            }

            await connection.commit()
            return true
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    },

    // アイテム削除
    async deleteItem(itemId: string): Promise<boolean> {
        const connection = await db.getConnection()

        try {
            await connection.beginTransaction()

            // PETSテーブルから削除（外部キー制約によりITEMSから自動削除される）
            await connection.execute<ResultSetHeader>('DELETE FROM PETS WHERE item_id = ?', [itemId])

            // ITEMSテーブルから削除
            const [result] = await connection.execute<ResultSetHeader>('DELETE FROM ITEMS WHERE item_id = ?', [itemId])

            await connection.commit()
            return result.affectedRows > 0
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    },

    // ペットのカテゴリ一覧を取得
    async getPetCategories(): Promise<string[]> {
        const query = `
            SELECT DISTINCT pet_type 
            FROM PETS p
            INNER JOIN ITEMS i ON p.item_id = i.item_id
            WHERE i.item_delete_day > NOW()
            ORDER BY pet_type
        `

        const [rows] = await db.execute<RowDataPacket[]>(query)
        return rows.map((row) => row.pet_type)
    },
}
