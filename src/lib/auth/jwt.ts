import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose'
import type { SessionUser } from './types'
import type { JWTPayload } from './types'

function getJWTSecret(): Uint8Array {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in environment variables')
  }
  return new TextEncoder().encode(process.env.JWT_SECRET)
}

function getJWTExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '7d'
}

/**
 * Create a JWT token for a user
 */
export async function createToken(user: SessionUser): Promise<string> {
  const payload: JoseJWTPayload & JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(getJWTExpiresIn())
    .sign(getJWTSecret())

  return token
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret())
    // Validate that the payload has our custom fields
    if (
      typeof payload.userId === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.role === 'string'
    ) {
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role as JWTPayload['role'],
        iat: payload.iat,
        exp: payload.exp,
      }
    }
    return null
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

/**
 * Extract JWT token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}
