import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { ENV } from '~/config/loadEnv'

interface JwtPayload {
    user_id: string
    user_name?: string
    iat: number
    exp: number
}

/**
 * オプショナル認証ミドルウェア
 * トークンがあれば認証情報をreq.userに設定し、なければそのまま次に進む
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization

    // トークンがない場合はそのまま次に進む
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next()
        return
    }

    const token = authHeader.split(' ')[1]
    try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET)
        // 型ガードでuser_idがあるか確認
        if (typeof decoded === 'string' || !('user_id' in decoded)) {
            // 無効なトークンでもエラーを返さず、認証なしで続行
            next()
            return
        }
        req.user = decoded as JwtPayload
        next()
    } catch (err) {
        console.error('[Optional JWT Error]', err)
        // トークンが無効でもエラーを返さず、認証なしで続行
        next()
    }
}
