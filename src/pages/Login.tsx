import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { ApiError } from '@/lib/api'

type Mode = 'login' | 'signup'

export default function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)

  const title = useMemo(() => (mode === 'login' ? '登录' : '注册'), [mode])

  useEffect(() => {
    if (user) navigate('/')
  }, [navigate, user])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-2xl">
          <div className="mb-6">
            <div className="text-sm font-semibold text-zinc-100">CapsuleSync</div>
            <div className="mt-1 text-xs text-zinc-400">强制版本控制 · 文本 Diff · 严格审计</div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-zinc-950/50 p-1">
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm ${mode === 'login' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
              onClick={() => {
                setError(null)
                setMode('login')
              }}
            >
              登录
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm ${mode === 'signup' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
              onClick={() => {
                setError(null)
                setMode('signup')
              }}
            >
              注册
            </button>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              setError(null)
              try {
                if (mode === 'signup') await register(email, password)
                else await login(email, password)
                navigate('/')
              } catch (err: unknown) {
                const e = err as ApiError
                setError(typeof e?.message === 'string' ? e.message : '操作失败')
              } finally {
                setBusy(false)
              }
            }}
          >
            <div>
              <label className="block text-xs text-zinc-400">邮箱</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-500 focus:ring-2"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400">密码</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-500 focus:ring-2"
                placeholder="至少 8 位"
              />
            </div>

            {error ? <div className="text-sm text-red-400">{error}</div> : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {busy ? '处理中…' : title}
            </button>

            <div className="text-xs text-zinc-500">
              登录后将进入工作台；所有内容变更都将创建新版本并写入审计。
            </div>
          </form>

          <div className="mt-6 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
            <div>没有账号时，请切到“注册”。</div>
          </div>
        </div>
      </div>
    </div>
  )
}
