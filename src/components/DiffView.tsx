import type { DiffPart } from '@/types'

export default function DiffView({ parts }: { parts: DiffPart[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <div className="text-sm font-semibold text-zinc-900">Diff</div>
      </div>
      <pre className="max-h-[420px] overflow-auto px-4 py-4 text-xs leading-5">
        {parts.map((p, idx) => {
          const bg = p.added ? 'bg-emerald-50' : p.removed ? 'bg-red-50' : ''
          const fg = p.added ? 'text-emerald-700' : p.removed ? 'text-red-700' : 'text-zinc-700'
          const prefix = p.added ? '+ ' : p.removed ? '- ' : '  '
          const lines = p.value.split('\n')
          return (
            <span key={idx} className={`${bg} ${fg}`}>
              {lines.map((line, lineIdx) => {
                if (lineIdx === lines.length - 1 && line === '') return null
                return (
                  <span key={lineIdx}>
                    {prefix}
                    {line}
                    {'\n'}
                  </span>
                )
              })}
            </span>
          )
        })}
      </pre>
    </div>
  )
}
