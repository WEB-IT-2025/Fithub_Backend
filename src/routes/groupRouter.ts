// src/routes/groupRouter.ts（ミドルウェア保護版）
import express from 'express'
import {
    addGroupMember,
    adminDeleteGroup,
    createGroup,
    deleteGroup,
    getGroupMembers,
    getUserGroups,
    removeGroupMember,
    updateGroup,
} from '~/controllers/groupController'
import { requireAdmin } from '~/middlewares/requireAdmin'
import { requireGroupLeader } from '~/middlewares/requireGroupLeader'
import {
    handleValidationErrors,
    validateGroupCreation,
    validateGroupDelete,
    validateGroupUpdate,
    validateMemberOperation,
} from '~/middlewares/validation/groupValidation'

const router = express.Router()

// グループ基本操作（グループリーダー限定）
router.post('/create', validateGroupCreation, handleValidationErrors, createGroup)

router.put(
    '/update',
    validateGroupUpdate,
    handleValidationErrors,
    requireGroupLeader, // グループリーダー権限チェック
    updateGroup
)

router.delete(
    '/delete',
    validateGroupDelete,
    handleValidationErrors,
    requireGroupLeader, // グループリーダー権限チェック
    deleteGroup
)

// システム管理者専用操作
router.delete(
    '/admin-delete',
    validateGroupDelete,
    handleValidationErrors,
    requireAdmin, // システム管理者権限チェック
    adminDeleteGroup
)

// 所属グループ一覧取得
router.get('/member/userlist/:user_id', getUserGroups)

// グループメンバー操作
router.post('/members/join', validateMemberOperation, handleValidationErrors, addGroupMember)

router.get('/members/list/:group_id', getGroupMembers)

router.delete(
    '/members/remove',
    validateMemberOperation,
    handleValidationErrors,
    requireGroupLeader, // グループリーダー権限チェック
    removeGroupMember
)

export default router
