import { err, json } from '../_lib/http'
import { writeAudit } from '../_lib/audit'
import { assertDocAccess, requireUser } from './shared'
import type { Ctx } from './types'

export async function versionGet(ctx: Ctx, versionId: string): Promise<Response> {
  const user = await requireUser(ctx)
  if (!user) return err(401, '未登录', 'unauthorized')
  const row = await ctx.env.DB
    .prepare('select id, doc_id, version_no, created_by, created_at, note, sha256, size_bytes, file_name, mime_type, r2_key, content_text from doc_versions where id = ?')
    .bind(versionId)
    .first<{
      id: string
      doc_id: string
      version_no: number
      created_by: string
      created_at: number
      note: string | null
      sha256: string
      size_bytes: number
      file_name: string
      mime_type: string | null
      r2_key: string
      content_text: string | null
    }>()
  if (!row) return err(404, '不存在', 'not_found')
  if (!(await assertDocAccess(ctx.env.DB, row.doc_id, user.id, user.role))) return err(403, '无权限', 'forbidden')
  await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: user.id, email: user.email, role: user.role }, eventType: 'version.read', targetType: 'version', targetId: versionId, success: true })
  return json({ version: row })
}

export async function versionBlob(ctx: Ctx, versionId: string): Promise<Response> {
  const user = await requireUser(ctx)
  if (!user) return err(401, '未登录', 'unauthorized')
  const row = await ctx.env.DB
    .prepare('select doc_id, r2_key, file_name, mime_type from doc_versions where id = ?')
    .bind(versionId)
    .first<{ doc_id: string; r2_key: string; file_name: string; mime_type: string | null }>()
  if (!row) return err(404, '不存在', 'not_found')
  if (!(await assertDocAccess(ctx.env.DB, row.doc_id, user.id, user.role))) return err(403, '无权限', 'forbidden')
  const obj = await ctx.env.BUCKET.get(row.r2_key)
  if (!obj) return err(404, '对象不存在', 'not_found')
  const headers = new Headers()
  headers.set('Content-Type', row.mime_type || 'application/octet-stream')
  headers.set('Content-Disposition', `attachment; filename="${row.file_name.replace(/"/g, '')}"`)
  await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: user.id, email: user.email, role: user.role }, eventType: 'version.download', targetType: 'version', targetId: versionId, success: true })
  return new Response(obj.body, { headers })
}

