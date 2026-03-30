import { err } from '../_lib/http'
import { writeAudit } from '../_lib/audit'
import { requireUser } from './shared'
import type { Ctx } from './types'

type AuditRow = {
  id: string
  actor_user_id: string | null
  actor_email: string | null
  actor_role: string | null
  event_type: string
  target_type: string
  target_id: string | null
  success: number
  error_code: string | null
  metadata_json: string
  ip: string | null
  user_agent: string | null
  created_at: number
}

export async function auditList(ctx: Ctx): Promise<Response> {
  const user = await requireUser(ctx)
  if (!user) return err(401, '未登录', 'unauthorized')

  const url = new URL(ctx.request.url)
  const eventType = url.searchParams.get('event_type')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const limitRaw = url.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitRaw || '100', 10) || 100, 1), 500)

  const cond: string[] = []
  const binds: unknown[] = []
  if (user.role !== 'admin') {
    cond.push('actor_user_id = ?')
    binds.push(user.id)
  }
  if (eventType) {
    cond.push('event_type = ?')
    binds.push(eventType)
  }
  if (from) {
    cond.push('created_at >= ?')
    binds.push(parseInt(from, 10))
  }
  if (to) {
    cond.push('created_at <= ?')
    binds.push(parseInt(to, 10))
  }

  const where = cond.length ? `where ${cond.join(' and ')}` : ''
  const sql = `select id, actor_user_id, actor_email, actor_role, event_type, target_type, target_id, success, error_code, metadata_json, ip, user_agent, created_at from audit_logs ${where} order by created_at desc limit ${limit}`
  const rows = await ctx.env.DB.prepare(sql).bind(...binds).all<AuditRow>()
  await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: user.id, email: user.email, role: user.role }, eventType: 'audit.list', targetType: 'audit', targetId: null, success: true, metadata: { returned: rows.results.length } })
  return new Response(JSON.stringify({ logs: rows.results }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}

function toCsvCell(s: string): string {
  const v = s.replace(/\r?\n/g, ' ')
  if (/[",]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

export async function auditExport(ctx: Ctx): Promise<Response> {
  const user = await requireUser(ctx)
  if (!user) return err(401, '未登录', 'unauthorized')

  const url = new URL(ctx.request.url)
  const format = url.searchParams.get('format') || 'csv'
  if (format !== 'csv') return err(400, '仅支持 csv', 'invalid_input')

  const listRes = await auditList(ctx)
  if (!listRes.ok) return listRes
  const data = (await listRes.json()) as { logs: AuditRow[] }

  const header: (keyof AuditRow)[] = [
    'created_at',
    'event_type',
    'target_type',
    'target_id',
    'success',
    'error_code',
    'actor_user_id',
    'actor_email',
    'actor_role',
    'ip',
    'user_agent',
    'metadata_json',
  ]
  const lines = [header.join(',')]
  for (const r of data.logs) {
    const row = header.map((k) => toCsvCell(String(r[k] ?? ''))).join(',')
    lines.push(row)
  }
  await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: user.id, email: user.email, role: user.role }, eventType: 'audit.export', targetType: 'audit', targetId: null, success: true, metadata: { count: data.logs.length } })
  const csv = lines.join('\n')
  const headers = new Headers({ 'Content-Type': 'text/csv; charset=utf-8' })
  headers.set('Content-Disposition', 'attachment; filename="audit.csv"')
  return new Response(csv, { headers })
}
