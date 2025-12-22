import { getIronSession, type IronSession } from 'iron-session'
import { cookies } from 'next/headers'
import type { SessionData, SessionUser } from './types'

function getSessionOptions() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set in environment variables')
  }

  return {
    password: process.env.SESSION_SECRET,
    cookieName: 'radiant_session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    },
  }
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, getSessionOptions())
}

export async function createSession(user: SessionUser): Promise<void> {
  const session = await getSession()
  session.user = user
  session.isLoggedIn = true
  await session.save()
}

export async function destroySession(): Promise<void> {
  const session = await getSession()
  session.destroy()
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSession()
  return session.user ?? null
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return session.isLoggedIn === true && session.user != null
}
