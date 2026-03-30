export type UploadConfig = {
  max_file_size_bytes: number
  allowed_extensions: string[]
  text_editable_extensions: string[]
  text_editable_max_bytes: number
}

export async function readUploadConfig(kv: KVNamespace): Promise<UploadConfig> {
  const raw = await kv.get('upload_config', { type: 'json' })
  const def: UploadConfig = {
    max_file_size_bytes: 5 * 1024 * 1024,
    allowed_extensions: ['txt', 'json', 'md', 'csv', 'log', 'png', 'jpg', 'jpeg', 'pdf'],
    text_editable_extensions: ['txt', 'json', 'md', 'csv', 'log'],
    text_editable_max_bytes: 512 * 1024,
  }
  if (!raw || typeof raw !== 'object') return def
  const o = raw as Record<string, unknown>
  const num = (k: string, fallback: number) => (typeof o[k] === 'number' && Number.isFinite(o[k] as number) ? (o[k] as number) : fallback)
  const arr = (k: string, fallback: string[]) =>
    Array.isArray(o[k]) ? (o[k] as unknown[]).filter((x): x is string => typeof x === 'string') : fallback
  return {
    max_file_size_bytes: num('max_file_size_bytes', def.max_file_size_bytes),
    allowed_extensions: arr('allowed_extensions', def.allowed_extensions),
    text_editable_extensions: arr('text_editable_extensions', def.text_editable_extensions),
    text_editable_max_bytes: num('text_editable_max_bytes', def.text_editable_max_bytes),
  }
}

