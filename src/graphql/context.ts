import type { SessionUser } from '@/lib/auth/types'

export interface GraphQLContext {
  user: SessionUser | null
  userId?: string
  userEmail?: string
  userRole?: string
}
