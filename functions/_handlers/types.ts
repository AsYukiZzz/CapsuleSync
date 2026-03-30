export type Env = {
  DB: D1Database
  CONFIG: KVNamespace
  BUCKET: R2Bucket
  AUTH_SECRET: string
}

export type Ctx = { request: Request; env: Env }

export type SessionUser = { id: string; email: string; role: 'user' | 'admin' }

