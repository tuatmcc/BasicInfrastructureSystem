import { OpenAPIHono } from '@hono/zod-openapi'
import type { AppContext } from '../../core/types'
import {
  approveMemberRoute,
  getAdminMemberRoute,
  getDirectoryRoute,
  getMemberRoute,
  joinMemberRoute,
  listAdminMembersRoute,
  rejectMemberRoute,
  updateAdminMemberRoute,
  updateMemberRoute,
} from './schema'
import {
  approveMemberService,
  getAdminMemberService,
  getDirectoryService,
  getMemberService,
  joinMemberService,
  listAdminMembersService,
  rejectMemberService,
  updateAdminMemberService,
  updateMemberService,
} from './service'

export const userRouter = new OpenAPIHono<AppContext>()
  .openapi(getDirectoryRoute, getDirectoryService)
  .openapi(getMemberRoute, getMemberService)
  .openapi(updateMemberRoute, updateMemberService)
  .openapi(joinMemberRoute, joinMemberService)
  .openapi(listAdminMembersRoute, listAdminMembersService)
  .openapi(approveMemberRoute, approveMemberService)
  .openapi(rejectMemberRoute, rejectMemberService)
  .openapi(updateAdminMemberRoute, updateAdminMemberService)
  .openapi(getAdminMemberRoute, getAdminMemberService)
