import { Link, useNavigate } from 'react-router-dom'
import { LogOut, ScrollText } from 'lucide-react'

type TopNavProps = {
  userEmail?: string | null
  onSignOut?: () => Promise<void> | void
}

export default function TopNav({ userEmail, onSignOut }: TopNavProps) {
  const navigate = useNavigate()

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white">
            <ScrollText className="h-4 w-4" />
          </span>
          CapsuleSync
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/audit"
            className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            审计日志
          </Link>
          <div className="hidden max-w-[320px] truncate text-sm text-zinc-600 md:block">{userEmail}</div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={async () => {
              await onSignOut?.()
              navigate('/login')
            }}
          >
            <LogOut className="h-4 w-4" />
            退出
          </button>
        </div>
      </div>
    </header>
  )
}
