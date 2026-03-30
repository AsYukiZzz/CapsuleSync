import { base64UrlDecodeToBytes, base64UrlEncode, bytesToBase64, bytesToUtf8, utf8ToBytes } from './encoding'

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource)
  const bytes = new Uint8Array(digest)
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += bytes[i]!.toString(16).padStart(2, '0')
  return out
}

export async function pbkdf2Hash(password: string, saltBytes: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', utf8ToBytes(password) as unknown as BufferSource, 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  )
  return new Uint8Array(bits)
}

type JwtHeader = { alg: 'HS256'; typ: 'JWT' }
type JwtPayload = Record<string, unknown> & { exp: number }

export async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' }
  const encHeader = base64UrlEncode(utf8ToBytes(JSON.stringify(header)))
  const encPayload = base64UrlEncode(utf8ToBytes(JSON.stringify(payload)))
  const data = utf8ToBytes(`${encHeader}.${encPayload}`)
  const key = await crypto.subtle.importKey('raw', utf8ToBytes(secret) as unknown as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, data as unknown as BufferSource)
  const encSig = base64UrlEncode(new Uint8Array(sig))
  return `${encHeader}.${encPayload}.${encSig}`
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [encHeader, encPayload, encSig] = parts
  const data = utf8ToBytes(`${encHeader}.${encPayload}`)
  const key = await crypto.subtle.importKey('raw', utf8ToBytes(secret) as unknown as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify('HMAC', key, base64UrlDecodeToBytes(encSig!) as unknown as BufferSource, data as unknown as BufferSource)
  if (!ok) return null
  const payload = JSON.parse(bytesToUtf8(base64UrlDecodeToBytes(encPayload!))) as JwtPayload
  if (!payload || typeof payload.exp !== 'number') return null
  if (Date.now() / 1000 >= payload.exp) return null
  return payload
}

export function randomSaltBase64(bytes = 16): string {
  const b = new Uint8Array(bytes)
  crypto.getRandomValues(b)
  return bytesToBase64(b)
}
