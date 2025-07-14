// src/routes/groups.ts
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
import { handleValidationErrors } from '~/middlewares/validation'
import {
    requireAdmin,
    validateGroupCreation,
    validateGroupDelete,
    validateGroupUpdate,
} from '~/middlewares/validation/groupValidation'

const router = express.Router()

// グループ基本操作（bodyで受け取る形式）
router.post('/create', validateGroupCreation, handleValidationErrors, createGroup)
router.put('/update', validateGroupUpdate, handleValidationErrors, updateGroup)
router.delete('/delete', validateGroupDelete, handleValidationErrors, deleteGroup)
router.delete('/admin-delete', requireAdmin, validateGroupDelete, handleValidationErrors, adminDeleteGroup)

// 所属グループ一覧取得
router.get('/member/userlist', getUserGroups)

// グループメンバー操作（bodyで受け取る形式）
router.post('/members/join', addGroupMember) // メンバー追加
router.get('/members/list', getGroupMembers) // メンバー一覧取得
router.delete('/members/remove', removeGroupMember) // メンバー削除 or 退出

export default router
