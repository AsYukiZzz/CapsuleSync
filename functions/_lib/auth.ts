import { base64ToBytes, bytesToBase64 } from './encoding'
import { pbkdf2Hash, randomSaltBase64, signJwt, verifyJwt } from './crypto'
import { buildCookie, getCookie } from './http'

export type SessionUser = { id: string; email: string; role: 'user' | 'admin' }

export async function hashPassword(password: string): Promise<{ saltBase64: string; hashBase64: string; iterations: number }> {
  const iterations = 120000
  const saltBase64 = randomSaltBase64(16)
  const hashBytes = await pbkdf2Hash(password, base64ToBytes(saltBase64), iterations)
  return { saltBase64, hashBase64: bytesToBase64(hashBytes), iterations }
}

export async function verifyPassword(password: string, saltBase64: string, expectedHashBase64: string): Promise<boolean> {
  const iterations = 120000
  const hashBytes = await pbkdf2Hash(password, base64ToBytes(saltBase64), iterations)
  return bytesToBase64(hashBytes) === expectedHashBase64
}

export async function issueSessionCookie(user: SessionUser, secret: string, secure: boolean): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  const token = await signJwt({ sub: user.id, email: user.email, role: user.role, exp }, secret)
  return buildCookie('session', token, { maxAge: 60 * 60 * 24 * 7, secure })
}

export function clearSessionCookie(secure: boolean): string {
  return buildCookie('session', '', { maxAge: 0, secure })
}

export async function readSession(req: Request, secret: string): Promise<SessionUser | null> {
  const token = getCookie(req, 'session')
  if (!token) return null
  const payload = await verifyJwt(token, secret)
  if (!payload) return null
  const sub = payload.sub
  const email = payload.email
  const role = payload.role
  if (typeof sub !== 'string' || typeof email !== 'string') return null
  if (role !== 'user' && role !== 'admin') return null
  return { id: sub, email, role }
}

