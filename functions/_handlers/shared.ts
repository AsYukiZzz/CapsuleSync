import { readSession } from '../_lib/auth'

export async function requireUser(ctx: { request: Request; env: { AUTH_SECRET: string } }) {
  return await readSession(ctx.request, ctx.env.AUTH_SECRET)
}

export async function assertDocAccess(db: D1Database, docId: string, userId: string, role: 'user' | 'admin'): Promise<boolean> {
  if (role === 'admin') return true
  const row = await db.prepare('select owner_user_id from docs where id = ?').bind(docId).first<{ owner_user_id: string }>()
  return row?.owner_user_id === userId
}

export async function nextVersionNo(db: D1Database, docId: string): Promise<number> {
  const row = await db
    .prepare('select coalesce(max(version_no), 0) as max_no from doc_versions where doc_id = ?')
    .bind(docId)
    .first<{ max_no: number }>()
  return (row?.max_no ?? 0) + 1
}

export function extOf(filename: string): string {
  const idx = filename.lastIndexOf('.')
  if (idx < 0) return ''
  return filename.slice(idx + 1).toLowerCase()
}

