import TopNav from '@/components/TopNav'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useMemo, useState } from 'react'
import DocTable, { DocRow } from '@/components/DocTable'
import Modal from '@/components/Modal'
import { apiFetch } from '@/lib/api'

export default function Home() {
  const userEmail = useAuthStore((s) => s.user?.email ?? null)
  const signOut = useAuthStore((s) => s.logout)

  const [docs, setDocs] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentText, setContentText] = useState('')
  const [busy, setBusy] = useState(false)

  const canCreate = useMemo(() => title.trim().length > 0 && !busy, [busy, title])

  useEffect(() => {
    let alive = true
    apiFetch<{ docs: DocRow[] }>('/api/docs')
      .then((r) => {
        if (!alive) return
        setDocs(r.docs)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!alive) return
        const msg = typeof (e as { message?: unknown })?.message === 'string' ? ((e as { message: string }).message) : '加载失败'
        setError(msg)
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <TopNav userEmail={userEmail} onSignOut={signOut} />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">工作台</div>
            <div className="mt-1 text-sm text-zinc-600">所有内容变更都会创建新版本并记录审计。</div>
          </div>
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            onClick={() => setCreateOpen(true)}
          >
            创建文件
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
            <div className="mt-3 h-3 w-64 animate-pulse rounded bg-zinc-100" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="text-sm font-semibold text-zinc-900">加载失败</div>
            <div className="mt-2 text-sm text-zinc-600">{error}</div>
          </div>
        ) : (
          <DocTable docs={docs} />
        )}

        <Modal
          open={createOpen}
          title="创建文件（会生成初始版本）"
          onClose={() => {
            if (busy) return
            setCreateOpen(false)
          }}
        >
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!canCreate) return
              setBusy(true)
              try {
                const res = await apiFetch<{ doc: { id: string } }>('/api/docs', {
                  method: 'POST',
                  body: JSON.stringify({ title, description: description || null, contentText, note: null }),
                })
                setCreateOpen(false)
                window.location.href = `/docs/${res.doc.id}`
              } catch (e: unknown) {
                const msg = typeof (e as { message?: unknown })?.message === 'string' ? ((e as { message: string }).message) : '创建失败'
                setError(msg)
              } finally {
                setBusy(false)
              }
            }}
          >
            <div>
              <label className="block text-xs text-zinc-600">名称</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
                placeholder="例如：接口契约" 
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600">描述</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
                placeholder="用途、背景等"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600">初始内容</label>
              <textarea
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                className="mt-2 h-40 w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm outline-none ring-indigo-500 focus:ring-2"
                placeholder="创建后可继续编辑，保存会生成新版本"
              />
            </div>
            <button
              type="submit"
              disabled={!canCreate}
              className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {busy ? '创建中…' : '创建并进入'}
            </button>
          </form>
        </Modal>
      </div>
    </div>
  )
}
