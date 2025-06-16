// src/utils/createCustomToken.ts
import admin from 'firebase-admin'

export const createCustomToken = async (uid: string) => {
    try {
        const customToken = await admin.auth().createCustomToken(uid)
        return customToken
    } catch (error) {
        console.error('カスタムトークン生成エラー:', error)
        throw error
    }
}
