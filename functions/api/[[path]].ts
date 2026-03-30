import { err } from '../_lib/http'
import type { Ctx } from '../_handlers/types'
import { authLogin, authLogout, authMe, authRegister } from '../_handlers/auth'
import { docDiff } from '../_handlers/diff'
import { docGet, docUpload, docVersionCreateFromText, docVersionsList, docsCreate, docsList } from '../_handlers/docs'
import { auditExport, auditList } from '../_handlers/audit'
import { versionBlob, versionGet } from '../_handlers/versions'

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/?/, '')
  const parts = path.split('/').filter(Boolean)
  const ctx: Ctx = { request, env }

  if (parts[0] === 'auth') {
    if (request.method === 'POST' && parts[1] === 'register') return authRegister(ctx)
    if (request.method === 'POST' && parts[1] === 'login') return authLogin(ctx)
    if (request.method === 'POST' && parts[1] === 'logout') return authLogout(ctx)
    if (request.method === 'GET' && parts[1] === 'me') return authMe(ctx)
  }

  if (parts[0] === 'docs') {
    if (request.method === 'GET' && parts.length === 1) return docsList(ctx)
    if (request.method === 'POST' && parts.length === 1) return docsCreate(ctx)
    if (parts.length >= 2) {
      const docId = parts[1]!
      if (request.method === 'GET' && parts.length === 2) return docGet(ctx, docId)
      if (request.method === 'GET' && parts[2] === 'versions') return docVersionsList(ctx, docId)
      if (request.method === 'POST' && parts[2] === 'versions') return docVersionCreateFromText(ctx, docId)
      if (request.method === 'POST' && parts[2] === 'upload') return docUpload(ctx, docId)
      if (request.method === 'GET' && parts[2] === 'diff') return docDiff(ctx, docId)
    }
  }

  if (parts[0] === 'versions' && parts.length >= 2) {
    const versionId = parts[1]!
    if (request.method === 'GET' && parts.length === 2) return versionGet(ctx, versionId)
    if (request.method === 'GET' && parts[2] === 'blob') return versionBlob(ctx, versionId)
  }

  if (parts[0] === 'audit') {
    if (request.method === 'GET' && parts.length === 1) return auditList(ctx)
    if (request.method === 'GET' && parts[1] === 'export') return auditExport(ctx)
  }

  return err(404, 'Not Found', 'not_found')
}

