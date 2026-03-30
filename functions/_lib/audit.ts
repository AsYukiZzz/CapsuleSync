import { sha256Hex } from './crypto'

export type Actor = {
  userId: string | null
  email: string | null
  role: 'user' | 'admin' | null
}

export async function writeAudit(args: {
  db: D1Database
  req: Request
  actor: Actor
  eventType: string
  targetType: string
  targetId: string | null
  success: boolean
  errorCode?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const ip = args.req.headers.get('cf-connecting-ip') ?? null
  const ua = args.req.headers.get('user-agent') ?? null
  const id = crypto.randomUUID()
  const createdAt = Date.now()
  const metadataJson = JSON.stringify(args.metadata ?? {})
  await args.db
    .prepare(
      'insert into audit_logs (id, actor_user_id, actor_email, actor_role, event_type, target_type, target_id, success, error_code, metadata_json, ip, user_agent, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      id,
      args.actor.userId,
      args.actor.email,
      args.actor.role,
      args.eventType,
      args.targetType,
      args.targetId,
      args.success ? 1 : 0,
      args.errorCode ?? null,
      metadataJson,
      ip,
      ua,
      createdAt,
    )
    .run()
}

export async function sha256ForAuditEvent(input: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(input))
}

