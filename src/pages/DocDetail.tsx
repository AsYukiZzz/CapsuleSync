import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import TopNav from '@/components/TopNav'
import { useAuthStore } from '@/stores/authStore'
import { apiFetch, apiFetchRaw } from '@/lib/api'
import DiffView from '@/components/DiffView'
import type { DiffPart, Doc, DocVersion, DocVersionRow } from '@/types'

export default function DocDetail() {
  const { id } = useParams()
  const userEmail = useAuthStore((s) => s.user?.email ?? null)
  const signOut = useAuthStore((s) => s.logout)

  const docId = id || ''

  const [doc, setDoc] = useState<Pick<Doc, 'id' | 'title' | 'description'> | null>(null)
  const [versions, setVersions] = useState<DocVersionRow[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [selectedA, setSelectedA] = useState<string | null>(null)
  const [selectedB, setSelectedB] = useState<string | null>(null)

  const [content, setContent] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [diffParts, setDiffParts] = useState<DiffPart[] | null>(null)
  const [diffError, setDiffError] = useState<string | null>(null)

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadNote, setUploadNote] = useState('')
  const [uploading, setUploading] = useState(false)

  const latestTextVersion = useMemo(() => {
    const v = versions.find((x) => x.has_text === 1)
    return v ? v : null
  }, [versions])

  const refresh = useCallback(async () => {
    if (!docId) return
    const r1 = await apiFetch<{ doc: Doc }>(`/api/docs/${docId}`)
    const r2 = await apiFetch<{ versions: DocVersionRow[] }>(`/api/docs/${docId}/versions`)
    setDoc({ id: r1.doc.id, title: r1.doc.title, description: r1.doc.description ?? null })
    setVersions(r2.versions)
  }, [docId])

  useEffect(() => {
    let alive = true
    refresh()
      .then(() => {
        if (!alive) return
        setError(null)
      })
      .catch((e: unknown) => {
        if (!alive) return
        const msg = typeof (e as { message?: unknown })?.message === 'string' ? ((e as { message: string }).message) : '加载失败'
        setError(msg)
      })
    return () => {
      alive = false
    }
  }, [docId, refresh])

  useEffect(() => {
    if (!selectedVersionId) return
    apiFetch<{ version: DocVersion }>(`/api/versions/${selectedVersionId}`)
      .then((r) => {
        if (typeof r.version.content_text === 'string') setContent(r.version.content_text)
      })
      .catch(() => {})
  }, [selectedVersionId])

  useEffect(() => {
    if (!latestTextVersion) return
    if (selectedVersionId) return
    setSelectedVersionId(latestTextVersion.id)
  }, [latestTextVersion, selectedVersionId])

  useEffect(() => {
    if (!selectedA || !selectedB) return
    if (selectedA === selectedB) return
    setDiffError(null)
    apiFetch<{ diff: DiffPart[] }>(`/api/docs/${docId}/diff?a=${selectedA}&b=${selectedB}`)
      .then((r) => setDiffParts(r.diff))
      .catch((e: unknown) => {
        setDiffParts(null)
        const msg = typeof (e as { message?: unknown })?.message === 'string' ? ((e as { message: string }).message) : 'Diff 失败'
        setDiffError(msg)
      })
  }, [docId, selectedA, selectedB])

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <TopNav userEmail={userEmail} onSignOut={signOut} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{doc?.title || '文件详情'}</div>
            <div className="mt-1 text-sm text-zinc-600">{doc?.description || '—'}</div>
          </div>
          <Link to="/" className="rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50">
            返回工作台
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="text-sm font-semibold">加载失败</div>
            <div className="mt-2 text-sm text-zinc-600">{error}</div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium text-zinc-700">编辑器</div>
                <div className="text-xs text-zinc-500">保存会创建新版本并记录审计</div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="mt-3 h-64 w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm outline-none ring-indigo-500 focus:ring-2"
                placeholder="仅当版本为文本内容时可编辑。"
              />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-3 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
                placeholder="备注（可选）"
              />
              <button
                type="button"
                disabled={saving}
                className="mt-3 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                onClick={async () => {
                  if (!docId) return
                  setSaving(true)
                  setError(null)
                  try {
                    await apiFetch(`/api/docs/${docId}/versions`, {
                      method: 'POST',
                      body: JSON.stringify({ contentText: content, note: note || null, fileName: doc?.title ? `${doc.title}.txt` : 'content.txt' }),
                    })
                    setNote('')
                    await refresh()
                  } catch (e: unknown) {
                    const msg = typeof (e as { message?: unknown })?.message === 'string' ? ((e as { message: string }).message) : '保存失败'
                    setError(msg)
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                {saving ? '保存中…' : '保存并创建新版本'}
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-xs font-medium text-zinc-700">版本历史</div>
              <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-zinc-200">
                {versions.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-zinc-500">暂无版本</div>
                ) : (
                  versions.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`w-full border-b border-zinc-200 px-3 py-2 text-left text-sm hover:bg-zinc-50 ${selectedVersionId === v.id ? 'bg-zinc-50' : ''}`}
                      onClick={() => setSelectedVersionId(v.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-zinc-900">v{v.version_no}</div>
                        <div className="text-xs text-zinc-500">{new Date(v.created_at).toLocaleString()}</div>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 text-xs text-zinc-600">
                        <div className="truncate">{v.file_name}</div>
                        <div className="shrink-0">{v.size_bytes}B</div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200 p-3">
                <div className="text-xs font-medium text-zinc-700">上传新版本</div>
                <input
                  type="file"
                  className="mt-2 w-full text-sm"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
                <input
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                  className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
                  placeholder="备注（可选）"
                />
                <button
                  type="button"
                  disabled={!uploadFile || uploading}
                  className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                  onClick={async () => {
                    if (!uploadFile) return
                    setUploading(true)
                    try {
                      const fd = new FormData()
                      fd.append('file', uploadFile)
                      if (uploadNote) fd.append('note', uploadNote)
                      await apiFetchRaw(`/api/docs/${docId}/upload`, { method: 'POST', body: fd })
                      setUploadFile(null)
                      setUploadNote('')
                      await refresh()
                    } catch (e: unknown) {
                      const msg = typeof (e as { message?: unknown })?.message === 'string' ? ((e as { message: string }).message) : '上传失败'
                      setError(msg)
                    } finally {
                      setUploading(false)
                    }
                  }}
                >
                  {uploading ? '上传中…' : '上传并创建版本'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="text-xs font-medium text-zinc-700">两版本 Diff</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <select
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
              value={selectedA ?? ''}
              onChange={(e) => setSelectedA(e.target.value || null)}
            >
              <option value="">选择 A 版本</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_no} {v.has_text === 1 ? '' : '(非文本)'}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
              value={selectedB ?? ''}
              onChange={(e) => setSelectedB(e.target.value || null)}
            >
              <option value="">选择 B 版本</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_no} {v.has_text === 1 ? '' : '(非文本)'}
                </option>
              ))}
            </select>
          </div>
          {diffError ? <div className="mt-3 text-sm text-red-600">{diffError}</div> : null}
          {diffParts ? <div className="mt-3"><DiffView parts={diffParts} /></div> : null}
        </div>
      </main>
    </div>
  )
}
