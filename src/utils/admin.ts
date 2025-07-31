// utils/Admin.ts
import { ENV } from '~/config/loadEnv'

export function isAdmin(user: { user_id: string }): boolean {
    return ENV.ADMIN_USER_IDS.includes(user.user_id)
}
