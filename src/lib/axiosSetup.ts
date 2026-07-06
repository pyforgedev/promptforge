import axios from 'axios'
import { sanitizeMessage } from './sanitizeError'

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.config) {
      const sanitizedConfig = { ...error.config }
      if (sanitizedConfig.headers) {
        const sensitiveHeaders = ['authorization', 'x-goog-api-key', 'api-key', 'x-api-key']
        for (const key of sensitiveHeaders) {
          const header = sanitizedConfig.headers[key] as string | undefined
          if (header && header.length > 0) {
            const redacted = header.length > 8
              ? header.slice(0, 4) + '***REDACTED***' + header.slice(-4)
              : '***REDACTED***'
            ;(sanitizedConfig.headers as Record<string, string>)[key] = redacted
          }
        }
      }

      const sanitizedError = new Error(
        sanitizeMessage(error.message || 'API request failed')
      ) as Error & { status?: number; config?: unknown }
      sanitizedError.name = error.name
      sanitizedError.status = error.response?.status
      sanitizedError.config = sanitizedConfig

      throw sanitizedError
    }
    throw error
  }
)
