interface RateLimiterConfig {
  maxRequests: number
  windowMs: number
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxRequests: 10,
  windowMs: 60000,
}

export class RateLimiter {
  private timestamps: number[] = []
  private config: RateLimiterConfig

  constructor(config?: Partial<RateLimiterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  private prune(): void {
    const cutoff = Date.now() - this.config.windowMs
    this.timestamps = this.timestamps.filter(t => t > cutoff)
  }

  canMakeRequest(): boolean {
    this.prune()
    return this.timestamps.length < this.config.maxRequests
  }

  recordRequest(): void {
    this.timestamps.push(Date.now())
  }

  tryRequest(): boolean {
    if (!this.canMakeRequest()) return false
    this.recordRequest()
    return true
  }

  reset(): void {
    this.timestamps = []
  }

  get remainingWindow(): number {
    this.prune()
    if (this.timestamps.length === 0) return 0
    const oldest = this.timestamps[0]
    return Math.ceil(Math.max(0, this.config.windowMs - (Date.now() - oldest)))
  }
}

export const globalRateLimiter = new RateLimiter()
