import { sha256Hex } from '../_lib/crypto'
import { readUploadConfig } from '../_lib/config'
import { err, json, readJson } from '../_lib/http'
import { writeAudit } from '../_lib/audit'
import { bytesToUtf8, utf8ToBytes } from '../_lib/encoding'
import { assertDocAccess, extOf, nextVersionNo, requireUser } from './shared'
import type { Ctx } from './types'

async function insertDoc(db: D1Database, userId: string, title: string, description: string | null): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()
  await db
    .prepare('insert into docs (id, owner_user_id, title, description, created_at, updated_at) values (?, ?, ?, ?, ?, ?)')
    .bind(id, userId, title, description, now, now)
    .run()
  return id
}

async function insertDocVersion(args: {
  db: D1Database
  docId: string
  versionNo: number
  createdBy: string
  note: string | null
  sha256: string
  sizeBytes: number
  fileName: string
  mimeType: string | null
  r2Key: string
  contentText: string | null
}): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()
  await args.db
    .prepare(
      'insert into doc_versions (id, doc_id, version_no, created_by, created_at, note, sha256, size_bytes, file_name, mime_type, r2_key, content_text) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      id,
      args.docId,
      args.versionNo,
      args.createdBy,
      now,
      args.note,
      args.sha256,
      args.sizeBytes,
      args.fileName,
      args.mimeType,
      args.r2Key,
      args.contentText,
    )
    .run()
  await args.db.prepare('update docs set updated_at = ? where id = ?').bind(now, args.docId).run()
  return id
}

export async function docsList(ctx: Ctx): Promise<Response> {
  const user = await requireUser(ctx)
  if (!user) return err(401, '未登录', 'unauthorized')

  const stmt =
    user.role === 'admin'
      ? ctx.env.DB.prepare('select id, owner_user_id, title, description, created_at, updated_at from docs order by updated_at desc')
      : ctx.env.DB.prepare('select id, owner_user_id, title, description, created_at, updated_at from docs where owner_user_id = ? order by updated_at desc').bind(user.id)

  const rows = await stmt.all()
  await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: user.id, email: user.email, role: user.role }, eventType: 'doc.list', targetType: 'doc', targetId: null, success: true })
  return json({ docs: rows.results })
}

export async function docsCreate(ctx: Ctx): Promise<Response> {
  const user = await requireUser(ctx)
  if (!user) return err(401, '未登录', 'unauthorized')

  try {
    const body = await readJson<{ title: string; description?: string | null; contentText: string; note?: string | null }>(ctx.request)
    const title = body.title?.trim()
    const description = body.description ?? null
    const contentText = body.contentText ?? ''
    const note = body.note ?? null
    if (!title) return err(400, '标题不能为空', 'invalid_input')

    const docId = await insertDoc(ctx.env.DB, user.id, title, description)
    const bytes = utf8ToBytes(contentText)
    const sha256 = await sha256Hex(bytes)
    const versionNo = 1
    const r2Key = `${docId}/${versionNo}/${encodeURIComponent(`${title}.txt`)}`
    await ctx.env.BUCKET.put(r2Key, bytes, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } })
    const versionId = await insertDocVersion({
      db: ctx.env.DB,
      docId,
      versionNo,
      createdBy: user.id,
      note,
      sha256,
      sizeBytes: bytes.byteLength,
      fileName: `${title}.txt`,
      mimeType: 'text/plain; charset=utf-8',
      r2Key,
      contentText,
    })
    await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: user.id, email: user.email, role: user.role }, eventType: 'doc.create', targetType: 'doc', targetId: docId, success: true, metadata: { version_id: versionId } })
    return json({ doc: { id: docId, title, description }, initialVersion: { id: versionId, version_no: 1, sha256 } })
  } catch {
    await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: user.id, email: user.email, role: user.role }, eventType: 'doc.create', targetType: 'doc', targetId: null, success: false, errorCode: 'server_error' })
    return err(500, '服务错误', 'server_error')
  }
}

export async function docGet(ctx: Ctx, docId: string): Promise<Response> {
  const user = await requireUser(ctx)
  if (!user) return err(401, '未登录', 'unauthorized')
  if (!(await assertDocAccess(ctx.env.DB, docId, user.id, user.role))) return err(403, '无权限', 'forbidden')
  const doc = await ctx.env.DB.prepare('select id, owner_user_id, title, description, created_at, updated_at from docs where id = ?').bind(docId).first()
  if (!doc) return err(404, '不存在', 'not_found')
  await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: user.id, email: user.email, role: user.role }, eventType: 'doc.read', targetType: 'doc', targetId: docId, success: true })
  return json({ doc })
}

export async function docVersionsList(ctx: Ctx, docId: string): Promise<Response> {
  const user = await requireUser(ctx)
  if (!user) return err(401, '未登录', 'unauthorized')
  if (!(await assertDocAccess(ctx.env.DB, docId, user.id, user.role))) return err(403, '无权限', 'forbidden')
  const rows = await ctx.env.DB
    .prepare(
      'select id, doc_id, version_no, created_by, created_at, note, sha256, size_bytes, file_name, mime_type, r2_key, case when content_text is null then 0 else 1 end as has_text from doc_versions where doc_id = ? order by version_no desc',
    )
    .bind(docId)
    .all()
  return json({ versions: rows.results })
}

export async function docVersionCreateFromText(ctx: Ctx, docId: string): Promise<Response> {
  const user = await requireUser(ctx)
  if (!user) return err(401, '未登录', 'unauthorized')
  if (!(await assertDocAccess(ctx.env.DB, docId, user.id, user.role))) return err(403, '无权限', 'forbidden')

  try {
    const body = await readJson<{ contentText: string; note?: string | null; fileName?: string | null; mimeType?: string | null }>(ctx.request)
    const contentText = body.contentText ?? ''
    const note = body.note ?? null
    const fileName = body.fileName?.trim() || 'content.txt'
    const mimeType = body.mimeType?.trim() || 'text/plain; charset=utf-8'
    const bytes = utf8ToBytes(contentText)
    const sha256 = await sha256Hex(bytes)
    const versionNo = await nextVersionNo(ctx.env.DB, docId)
    const r2Key = `${docId}/${versionNo}/${encodeURIComponent(fileName)}`
    await ctx.env.BUCKET.put(r2Key, bytes, { httpMetadata: { contentType: mimeType } })
    const versionId = await insertDocVersion({
      db: ctx.env.DB,
      docId,
      versionNo,
      createdBy: user.id,
      note,
      sha256,
      sizeBytes: bytes.byteLength,
      fileName,
      mimeType,
      r2Key,
      contentText,
    })
    await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: user.id, email: user.email, role: user.role }, eventType: 'version.create', targetType: 'version', targetId: versionId, success: true, metadata: { doc_id: docId, version_no: versionNo } })
    return json({ version: { id: versionId, doc_id: docId, version_no: versionNo, sha256 } })
  } catch {
    await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: user.id, email: user.email, role: user.role }, eventType: 'version.create', targetType: 'doc', targetId: docId, success: false, errorCode: 'server_error' })
    return err(500, '服务错误', 'server_error')
  }
}

export async function docUpload(ctx: Ctx, docId: string): Promise<Response> {
  const user = await requireUser(ctx)
  if (!user) return err(401, '未登录', 'unauthorized')
  if (!(await assertDocAccess(ctx.env.DB, docId, user.id, user.role))) return err(403, '无权限', 'forbidden')

  const config = await readUploadConfig(ctx.env.CONFIG)
  const form = await ctx.request.formData()
  const file = form.get('file')
  const note = (form.get('note') as string | null) ?? null
  if (!(file instanceof File)) return err(400, '缺少文件', 'invalid_input')
  if (file.size > config.max_file_size_bytes) return err(413, '文件过大', 'file_too_large')

  const ext = extOf(file.name)
  if (ext && config.allowed_extensions.length > 0 && !config.allowed_extensions.includes(ext)) return err(415, '不允许的扩展名', 'invalid_extension')

  const buf = new Uint8Array(await file.arrayBuffer())
  const sha256 = await sha256Hex(buf)
  const versionNo = await nextVersionNo(ctx.env.DB, docId)
  const r2Key = `${docId}/${versionNo}/${encodeURIComponent(file.name)}`
  const mimeType = file.type || null
  await ctx.env.BUCKET.put(r2Key, buf, { httpMetadata: mimeType ? { contentType: mimeType } : undefined })

  let contentText: string | null = null
  const isTextEditable = ext && config.text_editable_extensions.includes(ext)
  if (isTextEditable && file.size <= config.text_editable_max_bytes) {
    contentText = bytesToUtf8(buf)
  }

  const versionId = await insertDocVersion({
    db: ctx.env.DB,
    docId,
    versionNo,
    createdBy: user.id,
    note,
    sha256,
    sizeBytes: file.size,
    fileName: file.name,
    mimeType,
    r2Key,
    contentText,
  })
  await writeAudit({ db: ctx.env.DB, req: ctx.request, actor: { userId: user.id, email: user.email, role: user.role }, eventType: 'upload', targetType: 'version', targetId: versionId, success: true, metadata: { doc_id: docId, version_no: versionNo, file_name: file.name, size_bytes: file.size } })
  return json({ version: { id: versionId, doc_id: docId, version_no: versionNo, sha256 } })
}

