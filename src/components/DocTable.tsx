import { Link } from 'react-router-dom'

export type DocRow = {
  id: string
  title: string
  description: string | null
  updated_at: number
}

export default function DocTable({ docs }: { docs: DocRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div className="text-sm font-semibold text-zinc-900">文件</div>
        <div className="text-xs text-zinc-500">强制版本控制</div>
      </div>
      <div className="divide-y divide-zinc-200">
        {docs.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-500">暂无文件</div>
        ) : (
          docs.map((d) => (
            <Link
              key={d.id}
              to={`/docs/${d.id}`}
              className="block px-4 py-3 hover:bg-zinc-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">{d.title}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-zinc-600">{d.description || '—'}</div>
                </div>
                <div className="shrink-0 text-right text-xs text-zinc-500">
                  <div>更新</div>
                  <div className="mt-1">{new Date(d.updated_at).toLocaleString()}</div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

