export type ApiError = {
  message: string
  code?: string
}

async function readApiError(res: Response): Promise<ApiError> {
  try {
    const data = (await res.json()) as unknown
    if (data && typeof data === 'object' && 'message' in data) {
      const msg = (data as { message?: unknown }).message
      const code = (data as { code?: unknown }).code
      return { message: typeof msg === 'string' ? msg : '请求失败', code: typeof code === 'string' ? code : undefined }
    }
  } catch {
    return { message: `请求失败（${res.status}）` }
  }
  return { message: `请求失败（${res.status}）` }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  if (!res.ok) throw await readApiError(res)
  return (await res.json()) as T
}

export async function apiFetchRaw(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if (!res.ok) throw await readApiError(res)
  return res
}
