export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(init?.headers ?? {}) },
  })
}

export function err(status: number, message: string, code?: string): Response {
  return json({ message, code }, { status })
}

export async function readJson<T>(req: Request): Promise<T> {
  const ct = req.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) throw new Error('invalid_content_type')
  return (await req.json()) as T
}

export function getCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie')
  if (!raw) return null
  const parts = raw.split(';')
  for (const p of parts) {
    const [k, ...rest] = p.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

export function setCookie(headers: Headers, cookie: string): void {
  headers.append('Set-Cookie', cookie)
}

export function buildCookie(name: string, value: string, opts: { maxAge?: number; secure?: boolean } = {}): string {
  const base = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax`
  const parts = [base]
  if (typeof opts.maxAge === 'number') parts.push(`Max-Age=${opts.maxAge}`)
  if (opts.secure) parts.push('Secure')
  return parts.join('; ')
}

