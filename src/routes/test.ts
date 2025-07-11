import express, { Router, Request, Response } from 'express';
import db from '../config/database';
import jwt from 'jsonwebtoken';
import { googleTokenRefreshService } from '../services/googleTokenRefreshService'

const router: Router = express.Router();



export const User = {
    // user_idでユーザーを1件取得
    async findOne({ user_id }: { user_id: string }) {
        const [rows]: [any[], any] = await db.query('SELECT * FROM USERS WHERE user_id = ?', [user_id]);
        // rows[0]がユーザー情報（なければundefined）
        return rows[0] || null;
    }
};

// テストAPI
router.get('/hello', (req: Request, res: Response) => {
    res.send('Hello, Express + TypeScript from API!');
});

// ログイン処理
router.post('/login', async function (req: Request, res: Response): Promise<void> {
    const { user_id } = req.body;

    try {
        // アカウントを検索
        const user = await User.findOne({ user_id });
        if (!user) {
            res.status(401).json({ message: 'アカウントが見つかりません' });
            return;
        }

        // JWTトークンを生成
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '1h' }
        );

        res.status(200).json({ token });
    } catch (err) {
        res.status(500).json({ message: 'サーバーエラー', error: err });
    }
});


// Test Google token refresh service
router.get('/token-report', async (req, res) => {
    try {
        const report = await googleTokenRefreshService.getTokenExpiryReport()
        res.json({
            status: 'success',
            message: 'Token report generated',
            data: report,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('Token report error:', error)
        res.status(500).json({
            status: 'error',
            message: 'Failed to generate token report',
            error: error instanceof Error ? error.message : String(error),
        })
    }
})

// Manually trigger token refresh
router.post('/refresh-tokens', async (req, res) => {
    try {
        const result = await googleTokenRefreshService.refreshAllTokens()
        res.json({
            status: 'success',
            message: 'Token refresh completed',
            data: result,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('Token refresh error:', error)
        res.status(500).json({
            status: 'error',
            message: 'Failed to refresh tokens',
            error: error instanceof Error ? error.message : String(error),
        })
    }
})

export default router
