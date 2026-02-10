import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import { verifyToken, extractTokenFromHeader } from './lib/auth/jwt'
import type { SessionData, SessionUser } from './lib/auth/types'

// Protected routes that require authentication
const protectedRoutes = [
  '/api/graphql', // GraphQL endpoint
  '/[lang]/dashboard', // Employee dashboard (any language)
  '/[lang]/mypage', // User mypage (any language)
  '/api/api-keys', // API key management
  '/api/blog-generator', // Blog generation
  '/api/blog-layout', // Blog layout template management
  '/api/writing-style', // Writing style management
  '/api/auth/update-profile', // User profile update
]

// Admin-only routes
const adminRoutes = [
  '/api/crewai/generate', // CrewAI blog generation (legacy)
  '/api/admin', // Admin management APIs
]

// Routes that require ADMIN or EMPLOYEE role
const privilegedRoutes = [
  '/api/writing-style/profiles', // Writing style profile management (ADMIN + EMPLOYEE)
  '/api/writing-style/samples', // Writing sample management (ADMIN + EMPLOYEE)
]

const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'radiant_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  },
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if the route is protected
  const isProtected = protectedRoutes.some(route => {
    if (route.includes('[lang]')) {
      // Handle dynamic language routes like /[lang]/dashboard
      const pattern = route.replace('[lang]', '(ko|en)')
      const regex = new RegExp(`^${pattern}`)
      return regex.test(pathname)
    }
    return pathname.startsWith(route)
  })

  const isAdmin = adminRoutes.some(route => pathname.startsWith(route))
  const isPrivileged = privilegedRoutes.some(route => pathname.startsWith(route))

  if (!isProtected && !isAdmin && !isPrivileged) {
    return NextResponse.next()
  }

  let user: SessionUser | null = null

  // Strategy 1: Try cookie-based session first
  try {
    const response = NextResponse.next()
    const session = await getIronSession<SessionData>(request, response, sessionOptions)
    
    if (session.isLoggedIn && session.user) {
      user = session.user
    }
  } catch (error) {
    console.error('Session check failed:', error)
  }

  // Strategy 2: Fallback to JWT token from Authorization header
  if (!user) {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (token) {
      const payload = await verifyToken(token)
      if (payload) {
        user = {
          id: payload.userId,
          email: payload.email,
          name: payload.email.split('@')[0], // Fallback name
          role: payload.role,
          emailVerified: true, // JWT tokens are issued after login, assume verified
        }
      }
    }
  }

  // If no authentication method succeeded, return 401
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    } else {
      // Redirect to login page for browser requests
      const loginUrl = new URL('/ko/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Check admin access for admin-only routes
  if (isAdmin && user.role !== 'ADMIN') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      )
    } else {
      return NextResponse.redirect(new URL('/ko/403', request.url))
    }
  }

  // Check privileged access (ADMIN or EMPLOYEE)
  if (isPrivileged && user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 }
      )
    } else {
      return NextResponse.redirect(new URL('/ko/403', request.url))
    }
  }

  // Add user info to headers for downstream handlers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', user.id)
  requestHeaders.set('x-user-email', user.email)
  requestHeaders.set('x-user-role', user.role)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
