import TopNav from '@/components/TopNav'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import type { AuditLog } from '@/types'

export default function Audit() {
  const userEmail = useAuthStore((s) => s.user?.email ?? null)
  const signOut = useAuthStore((s) => s.logout)

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [eventType, setEventType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(() => {
    const sp = new URLSearchParams()
    if (eventType) sp.set('event_type', eventType)
    sp.set('limit', '200')
    const qs = sp.toString()
    return qs ? `/api/audit?${qs}` : '/api/audit'
  }, [eventType])

  useEffect(() => {
    let alive = true
    setLoading(true)
    apiFetch<{ logs: AuditLog[] }>(query)
      .then((r) => {
        if (!alive) return
        setLogs(r.logs)
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
  }, [query])

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <TopNav userEmail={userEmail} onSignOut={signOut} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">审计日志</div>
            <div className="mt-1 text-sm text-zinc-600">关键操作全部记录，可筛选并导出。</div>
          </div>
          <a
            href={`/api/audit/export?format=csv${eventType ? `&event_type=${encodeURIComponent(eventType)}` : ''}`}
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
          >
            导出 CSV
          </a>
        </div>

        <div className="mb-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <label className="block text-xs text-zinc-600">事件类型过滤</label>
          <input
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            placeholder="例如：auth.login / doc.create / version.create / diff.view / upload"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <div className="text-sm font-semibold text-zinc-900">记录</div>
          </div>
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">加载中…</div>
          ) : error ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">{error}</div>
          ) : logs.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">暂无记录</div>
          ) : (
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-zinc-200 text-xs text-zinc-500">
                    <th className="px-4 py-2">时间</th>
                    <th className="px-4 py-2">事件</th>
                    <th className="px-4 py-2">对象</th>
                    <th className="px-4 py-2">结果</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="px-4 py-2 text-xs text-zinc-600">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2 font-medium text-zinc-900">{r.event_type}</td>
                      <td className="px-4 py-2 text-xs text-zinc-600">{r.target_type}:{r.target_id || '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs ${r.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {r.success ? '成功' : '失败'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
