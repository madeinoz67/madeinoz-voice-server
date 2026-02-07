/**
 * Rate limiting middleware
 * Protects endpoints from abuse with token bucket algorithm
 */

import { logger } from "@/utils/logger.js";

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Rate limit entry for a client
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 60, // 60 requests
  windowMs: 60000, // per minute
};

/**
 * Rate limiter class
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private clients: Map<string, RateLimitEntry>;
  private cleanupInterval: Timer | null = null;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.clients = new Map();

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if request should be rate limited
   */
  isRateLimited(clientId: string): boolean {
    const now = Date.now();
    let entry = this.clients.get(clientId);

    // Reset if window expired
    if (entry && now >= entry.resetTime) {
      this.clients.delete(clientId);
      entry = undefined;
    }

    // Create new entry if needed
    if (!entry) {
      entry = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      this.clients.set(clientId, entry);
      return false;
    }

    // Check limit
    if (entry.count >= this.config.maxRequests) {
      logger.warn("Rate limit exceeded", { clientId });
      return true;
    }

    // Increment counter
    entry.count++;
    return false;
  }

  /**
   * Get remaining requests for client
   */
  getRemaining(clientId: string): number {
    const entry = this.clients.get(clientId);
    if (!entry) return this.config.maxRequests;
    return Math.max(0, this.config.maxRequests - entry.count);
  }

  /**
   * Get reset time for client
   */
  getResetTime(clientId: string): number | null {
    const entry = this.clients.get(clientId);
    return entry ? entry.resetTime : null;
  }

  /**
   * Reset client's rate limit
   */
  reset(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.clients.clear();
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [clientId, entry] of this.clients.entries()) {
        if (now >= entry.resetTime) {
          this.clients.delete(clientId);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop cleanup interval
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): { totalClients: number; activeClients: number } {
    const now = Date.now();
    let activeClients = 0;

    for (const entry of this.clients.values()) {
      if (now < entry.resetTime) {
        activeClients++;
      }
    }

    return {
      totalClients: this.clients.size,
      activeClients,
    };
  }
}

/**
 * Extract client ID from request
 */
export function extractClientId(req: Request): string {
  // Try to get real IP from headers (for proxied requests)
  const forwardedFor = req.headers.get("X-Forwarded-For");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("X-Real-IP");
  if (realIp) {
    return realIp;
  }

  // Fall back to remote address
  // Note: Bun doesn't expose remote address in Request, using a default
  return "localhost";
}

// Singleton instance
let limiter: RateLimiter | null = null;

/**
 * Get or create rate limiter singleton
 */
export function getRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter {
  if (!limiter) {
    limiter = new RateLimiter(config);
  }
  return limiter;
}

/**
 * Reset rate limiter (for testing)
 */
export function resetRateLimiter(): void {
  if (limiter) {
    limiter.stop();
  }
  limiter = null;
}
