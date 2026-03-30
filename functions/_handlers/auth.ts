import { clearSessionCookie, hashPassword, issueSessionCookie, readSession, verifyPassword } from '../_lib/auth'
import { err, json, readJson, setCookie } from '../_lib/http'
import { writeAudit } from '../_lib/audit'
import type { Ctx } from './types'

export async function authRegister(ctx: Ctx): Promise<Response> {
  const secure = ctx.request.url.startsWith('https://')
  try {
    const body = await readJson<{ email: string; password: string }>(ctx.request)
    const email = body.email?.trim().toLowerCase()
    const password = body.password
    if (!email || !password || password.length < 8) {
      await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: null, email, role: null }, eventType: 'auth.register', targetType: 'auth', targetId: null, success: false, errorCode: 'invalid_input' })
      return err(400, '邮箱或密码不合法', 'invalid_input')
    }

    const existing = await ctx.env.DB.prepare('select id from users where email = ?').bind(email).first<{ id: string }>()
    if (existing) {
      await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: null, email, role: null }, eventType: 'auth.register', targetType: 'auth', targetId: null, success: false, errorCode: 'email_exists' })
      return err(409, '邮箱已存在', 'email_exists')
    }

    const userId = crypto.randomUUID()
    const { saltBase64, hashBase64 } = await hashPassword(password)
    const createdAt = Date.now()
    await ctx.env.DB
      .prepare('insert into users (id, email, password_salt, password_hash, role, created_at) values (?, ?, ?, ?, ?, ?)')
      .bind(userId, email, saltBase64, hashBase64, 'user', createdAt)
      .run()

    const headers = new Headers()
    setCookie(headers, await issueSessionCookie({ id: userId, email, role: 'user' }, ctx.env.AUTH_SECRET, secure))
    await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId, email, role: 'user' }, eventType: 'auth.register', targetType: 'user', targetId: userId, success: true })
    return json({ user: { id: userId, email, role: 'user' } }, { headers })
  } catch {
    await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: null, email: null, role: null }, eventType: 'auth.register', targetType: 'auth', targetId: null, success: false, errorCode: 'server_error' })
    return err(500, '服务错误', 'server_error')
  }
}

export async function authLogin(ctx: Ctx): Promise<Response> {
  const secure = ctx.request.url.startsWith('https://')
  try {
    const body = await readJson<{ email: string; password: string }>(ctx.request)
    const email = body.email?.trim().toLowerCase()
    const password = body.password
    if (!email || !password) {
      await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: null, email, role: null }, eventType: 'auth.login', targetType: 'auth', targetId: null, success: false, errorCode: 'invalid_input' })
      return err(400, '邮箱或密码不合法', 'invalid_input')
    }
    const row = await ctx.env.DB
      .prepare('select id, email, password_salt, password_hash, role from users where email = ?')
      .bind(email)
      .first<{ id: string; email: string; password_salt: string; password_hash: string; role: 'user' | 'admin' }>()
    if (!row) {
      await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: null, email, role: null }, eventType: 'auth.login', targetType: 'auth', targetId: null, success: false, errorCode: 'invalid_credentials' })
      return err(401, '邮箱或密码错误', 'invalid_credentials')
    }
    const ok = await verifyPassword(password, row.password_salt, row.password_hash)
    if (!ok) {
      await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: row.id, email: row.email, role: row.role }, eventType: 'auth.login', targetType: 'auth', targetId: null, success: false, errorCode: 'invalid_credentials' })
      return err(401, '邮箱或密码错误', 'invalid_credentials')
    }
    const headers = new Headers()
    setCookie(headers, await issueSessionCookie({ id: row.id, email: row.email, role: row.role }, ctx.env.AUTH_SECRET, secure))
    await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: row.id, email: row.email, role: row.role }, eventType: 'auth.login', targetType: 'user', targetId: row.id, success: true })
    return json({ user: { id: row.id, email: row.email, role: row.role } }, { headers })
  } catch {
    await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: null, email: null, role: null }, eventType: 'auth.login', targetType: 'auth', targetId: null, success: false, errorCode: 'server_error' })
    return err(500, '服务错误', 'server_error')
  }
}

export async function authLogout(ctx: Ctx): Promise<Response> {
  const secure = ctx.request.url.startsWith('https://')
  const user = await readSession(ctx.request, ctx.env.AUTH_SECRET)
  const headers = new Headers()
  setCookie(headers, clearSessionCookie(secure))
  await writeAudit({
    db: ctx.env.DB,
    req: ctx.request,
    actor: { userId: user?.id ?? null, email: user?.email ?? null, role: user?.role ?? null },
    eventType: 'auth.logout',
    targetType: 'auth',
    targetId: null,
    success: true,
  })
  return json({ ok: true }, { headers })
}

export async function authMe(ctx: Ctx): Promise<Response> {
  const user = await readSession(ctx.request, ctx.env.AUTH_SECRET)
  return json({ user })
}
