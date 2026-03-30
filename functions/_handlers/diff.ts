import { diffLines } from 'diff'
import { err, json } from '../_lib/http'
import { writeAudit } from '../_lib/audit'
import { assertDocAccess, requireUser } from './shared'
import type { Ctx } from './types'

export async function docDiff(ctx: Ctx, docId: string): Promise<Response> {
  const user = await requireUser(ctx)
  if (!user) return err(401, '未登录', 'unauthorized')
  if (!(await assertDocAccess(ctx.env.DB, docId, user.id, user.role))) return err(403, '无权限', 'forbidden')

  const url = new URL(ctx.request.url)
  const a = url.searchParams.get('a')
  const b = url.searchParams.get('b')
  if (!a || !b) return err(400, '缺少版本参数', 'invalid_input')

  const rows = await ctx.env.DB
    .prepare('select id, content_text from doc_versions where doc_id = ? and id in (?, ?)')
    .bind(docId, a, b)
    .all<{ id: string; content_text: string | null }>()
  const map = new Map(rows.results.map((r) => [r.id, r.content_text]))
  const aText = map.get(a) ?? null
  const bText = map.get(b) ?? null
  if (aText === null || bText === null) return err(415, '仅支持文本版本对比', 'not_text')

  const parts = diffLines(aText, bText)
  await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: user.id, email: user.email, role: user.role }, eventType: 'diff.view', targetType: 'doc', targetId: docId, success: true, metadata: { a, b } })
  return json({ diff: parts })
}

