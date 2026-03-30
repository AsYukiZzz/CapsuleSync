export type Role = 'user' | 'admin'

export type AuthUser = {
  id: string
  email: string
  role: Role
}

export type Doc = {
  id: string
  owner_user_id: string
  title: string
  description: string | null
  created_at: number
  updated_at: number
}

export type DocVersionRow = {
  id: string
  doc_id: string
  version_no: number
  created_by: string
  created_at: number
  note: string | null
  sha256: string
  size_bytes: number
  file_name: string
  mime_type: string | null
  r2_key: string
  has_text: 0 | 1
}

export type DocVersion = {
  id: string
  doc_id: string
  version_no: number
  created_by: string
  created_at: number
  note: string | null
  sha256: string
  size_bytes: number
  file_name: string
  mime_type: string | null
  r2_key: string
  content_text: string | null
}

export type DiffPart = {
  added?: boolean
  removed?: boolean
  value: string
}

export type AuditLog = {
  id: string
  actor_user_id: string | null
  actor_email: string | null
  actor_role: string | null
  event_type: string
  target_type: string
  target_id: string | null
  success: number
  error_code: string | null
  metadata_json: string
  ip: string | null
  user_agent: string | null
  created_at: number
}

