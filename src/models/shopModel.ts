import { RowDataPacket } from 'mysql2'
import db from '~/config/database'

// ショップアイテムの型定義（新しいDBテーブル構造に合わせて修正）
export interface ShopItem extends RowDataPacket {
    item_id: string
    item_name: string
    item_point: number
    item_image_url: string
    item_create_day: string
    item_details: string
    item_category: string
    pet_type?: string // PETSテーブルからのデータ（PETカテゴリのみ）
}

// 購入履歴の型定義（DBテーブル構造に合わせて修正）
export interface PurchaseHistory extends RowDataPacket {
    purchase_id: string
    user_id: string
    item_id: string
    item_name: string
    item_point: number
    quantity: number
    purchase_time: string
}

export const shopModel = {
    // 全ショップアイテム取得
    getAllItems: async (): Promise<ShopItem[]> => {
        const query = `
            SELECT 
                i.item_id,
                i.item_name,
                i.item_point,
                i.item_image_url,
                i.item_create_day,
                i.item_details,
                i.item_category,
                p.pet_type
            FROM ITEMS i
            LEFT JOIN PETS p ON i.item_id = p.item_id
            ORDER BY i.item_create_day DESC
        `
        const [rows] = await db.query<ShopItem[]>(query)
        return rows
    },

    // カテゴリ別アイテム取得
    getItemsByCategory: async (category: string): Promise<ShopItem[]> => {
        const query = `
            SELECT 
                i.item_id,
                i.item_name,
                i.item_point,
                i.item_image_url,
                i.item_create_day,
                i.item_details,
                i.item_category,
                p.pet_type
            FROM ITEMS i
            LEFT JOIN PETS p ON i.item_id = p.item_id
            WHERE i.item_category = ?
            ORDER BY i.item_create_day DESC
        `
        const [rows] = await db.query<ShopItem[]>(query, [category])
        return rows
    },

    // 単一アイテム取得
    getItemById: async (itemId: string): Promise<ShopItem | null> => {
        const query = `
            SELECT 
                i.item_id,
                i.item_name,
                i.item_point,
                i.item_image_url,
                i.item_create_day,
                i.item_details,
                i.item_category,
                p.pet_type
            FROM ITEMS i
            LEFT JOIN PETS p ON i.item_id = p.item_id
            WHERE i.item_id = ?
        `
        const [rows] = await db.query<ShopItem[]>(query, [itemId])
        return rows.length > 0 ? rows[0] : null
    },

    // アイテム購入
    purchaseItem: async (userId: string, itemId: string): Promise<{ success: boolean; message: string }> => {
        try {
            // アイテムが存在するかチェック
            const item = await shopModel.getItemById(itemId)
            if (!item) {
                return { success: false, message: 'アイテムが見つかりません' }
            }

            // ユーザーのポイントチェック
            const [userRows] = await db.query<RowDataPacket[]>('SELECT point FROM USERS WHERE user_id = ?', [userId])

            if (userRows.length === 0) {
                return { success: false, message: 'ユーザーが見つかりません' }
            }

            const userPoint = userRows[0].point as number
            if (userPoint < item.item_point) {
                return { success: false, message: 'ポイントが不足しています' }
            }

            // トランザクション開始
            await db.query('START TRANSACTION')

            try {
                // 購入記録を挿入
                const purchaseId = `purchase_${Date.now()}_${userId}`
                const purchaseTime = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).replace(' ', 'T')

                await db.query(
                    'INSERT INTO PURCHASES (purchase_id, user_id, item_id, quantity, purchase_time) VALUES (?, ?, ?, ?, ?)',
                    [purchaseId, userId, itemId, 1, purchaseTime]
                )

                // ユーザーのポイント減算
                await db.query('UPDATE USERS SET point = point - ? WHERE user_id = ?', [item.item_point, userId])

                // カテゴリに応じてユーザーの所有アイテムに追加
                if (item.item_category === 'PET') {
                    // PETカテゴリの場合：USERS_PETSテーブルに追加
                    await db.query(
                        `INSERT INTO USERS_PETS (user_id, item_id, user_main_pet, user_pet_name, pet_size, pet_intimacy) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [userId, itemId, false, item.item_name, 1, 0]
                    )
                } else {
                    // その他のカテゴリ（SKIN等）：USERS_ITEMSテーブルに追加
                    // 既に持っているかチェック
                    const [existingItems] = await db.query<RowDataPacket[]>(
                        'SELECT item_count FROM USERS_ITEMS WHERE user_id = ? AND item_id = ?',
                        [userId, itemId]
                    )

                    if (existingItems.length > 0) {
                        // 既に持っている場合は数量を増加
                        await db.query(
                            'UPDATE USERS_ITEMS SET item_count = item_count + 1 WHERE user_id = ? AND item_id = ?',
                            [userId, itemId]
                        )
                    } else {
                        // 新規追加
                        await db.query(
                            'INSERT INTO USERS_ITEMS (user_id, item_id, item_count, usage_intimacy) VALUES (?, ?, ?, ?)',
                            [userId, itemId, 1, false]
                        )
                    }
                }

                await db.query('COMMIT')
                return { success: true, message: '購入が完了しました' }
            } catch (error) {
                await db.query('ROLLBACK')
                console.error('購入処理エラー:', error)
                return { success: false, message: '購入処理中にエラーが発生しました' }
            }
        } catch (error) {
            console.error('購入処理エラー:', error)
            return { success: false, message: 'サーバーエラーが発生しました' }
        }
    },

    // ユーザーの購入履歴取得
    getPurchaseHistory: async (userId: string): Promise<PurchaseHistory[]> => {
        const query = `
            SELECT 
                p.purchase_id,
                p.user_id,
                p.item_id,
                i.item_name,
                i.item_point,
                p.quantity,
                p.purchase_time
            FROM PURCHASES p
            JOIN ITEMS i ON p.item_id = i.item_id
            WHERE p.user_id = ?
            ORDER BY p.purchase_time DESC
        `
        const [rows] = await db.query<PurchaseHistory[]>(query, [userId])
        return rows
    },
}
