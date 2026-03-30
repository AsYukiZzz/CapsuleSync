import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function AuthGate() {
  const initialized = useAuthStore((s) => s.initialized)
  const user = useAuthStore((s) => s.user)

  if (!initialized) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
            <div className="mt-3 h-3 w-64 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
