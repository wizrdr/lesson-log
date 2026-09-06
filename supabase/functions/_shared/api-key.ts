export const API_KEY_PREFIX = 'llk_'
export const API_KEY_HEX_LENGTH = 40
export const API_KEY_PREFIX_LENGTH = 8

const API_KEY_RE = new RegExp(`^${API_KEY_PREFIX}[0-9a-f]{${API_KEY_HEX_LENGTH}}$`)

export function isApiKey(token: string): boolean {
  return API_KEY_RE.test(token)
}

export function keyPrefix(key: string): string {
  return key.slice(API_KEY_PREFIX.length, API_KEY_PREFIX.length + API_KEY_PREFIX_LENGTH)
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return toHex(new Uint8Array(digest))
}
