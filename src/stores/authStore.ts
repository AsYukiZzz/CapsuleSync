import { create } from 'zustand'
import { apiFetch } from '@/lib/api'
import type { AuthUser } from '@/types'

type AuthState = {
  initialized: boolean
  user: AuthUser | null
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  user: null,
  init: async () => {
    if (get().initialized) return
    try {
      const data = await apiFetch<{ user: AuthUser | null }>('/api/auth/me')
      set({ user: data.user, initialized: true })
    } catch {
      set({ user: null, initialized: true })
    }
  },
  login: async (email, password) => {
    const data = await apiFetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    set({ user: data.user, initialized: true })
  },
  register: async (email, password) => {
    const data = await apiFetch<{ user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    set({ user: data.user, initialized: true })
  },
  logout: async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    set({ user: null, initialized: true })
  },
}))
