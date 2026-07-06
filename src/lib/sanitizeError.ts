const SENSITIVE_PATTERNS = [
  /['"]?api[_-]?key['"]?\s*[:=]\s*['"][^'"]+['"]/gi,
  /['"]?x-goog-api-key['"]?\s*[:=]\s*['"][^'"]+['"]/gi,
  /x-goog-api-key[:\s]+[A-Za-z0-9\-_]+/gi,
  /['"]?x-api-key['"]?\s*[:=]\s*['"][^'"]+['"]/gi,
  /['"]?authorization['"]?\s*[:=]\s*['"][^'"]+['"]/gi,
  /['"]?Authorization['"]?\s*[:=]\s*['"][^'"]+['"]/gi,
  /Bearer\s+[A-Za-z0-9\-._~+/]+/gi,
  /bearer\s+[A-Za-z0-9\-._~+/]+/gi,
]

export function sanitizeMessage(message: string): string {
  let sanitized = message
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      const separator = match.includes('":"') ? '":"' : match.includes("': '") ? "': '" : match.includes('=') ? '=' : ': '
      const parts = separator === '=' ? match.split('=') : match.split(separator)
      if (parts.length < 2) return match
      const prefix = parts[0] + separator
      return prefix + '***REDACTED***'
    })
  }
  return sanitized
}

export function sanitizeError(error: unknown): string {
  if (error == null) return ''

  const seen = new WeakSet()

  function deepSanitize(value: unknown, depth = 0): string {
    if (depth > 5) return '[max depth]'
    if (typeof value === 'string') return sanitizeMessage(value)
    if (typeof value !== 'object' || value === null) return String(value)

    if (seen.has(value as object)) return '[circular]'
    seen.add(value as object)

    if (Array.isArray(value)) {
      return '[' + value.map(v => deepSanitize(v, depth + 1)).join(', ') + ']'
    }

    const entries = Object.entries(value as Record<string, unknown>)
    return (
      '{' +
      entries
        .map(([k, v]) => `${k}: ${deepSanitize(v, depth + 1)}`)
        .join(', ') +
      '}'
    )
  }

  if (error instanceof Error) {
    const message = sanitizeMessage(error.message)
    const cause = error.cause ? `, cause: ${deepSanitize(error.cause)}` : ''
    return `${error.name}: ${message}${cause}`
  }

  return deepSanitize(error)
}
