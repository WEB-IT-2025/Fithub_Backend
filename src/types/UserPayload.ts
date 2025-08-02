// types/UserPayload.ts
import { JwtPayload } from 'jsonwebtoken'

export interface UserPayload extends JwtPayload {
    user_id: string
    user_name?: string
    iat?: number
    exp?: number
}
