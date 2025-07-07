// src/middlewares/asyncHandler.ts
import { NextFunction, Request, Response } from 'express'

import { AuthenticatedRequest } from './authMiddleware'

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next)
    }
}

export const authAsyncHandler = (
    fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<unknown>
) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next)
    }
}
