export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'USER'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface SessionData {
  user?: SessionUser
  isLoggedIn: boolean
}

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

export interface AuthContext {
  user: SessionUser | null
  isAuthenticated: boolean
}
