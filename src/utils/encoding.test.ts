import { describe, expect, it } from 'vitest'
import { base64UrlDecodeToBytes, base64UrlEncode, bytesToUtf8, utf8ToBytes } from '../../functions/_lib/encoding'

describe('base64url', () => {
  it('roundtrips utf8', () => {
    const input = 'CapsuleSync-中文-123'
    const bytes = utf8ToBytes(input)
    const enc = base64UrlEncode(bytes)
    const dec = base64UrlDecodeToBytes(enc)
    expect(bytesToUtf8(dec)).toBe(input)
  })
})
