/**
 * CORS middleware
 * Cross-Origin Resource Sharing configuration (localhost only)
 */

/**
 * CORS configuration
 */
export interface CORSConfig {
  /** Allowed origins (default: localhost only) */
  allowedOrigins: string[];
  /** Allowed methods */
  allowedMethods: string[];
  /** Allowed headers */
  allowedHeaders: string[];
  /** Allow credentials */
  allowCredentials: boolean;
  /** Max age for preflight (seconds) */
  maxAge: number;
}

/**
 * Default configuration (localhost only for security)
 */
const DEFAULT_CONFIG: CORSConfig = {
  allowedOrigins: [
    "http://localhost:8888",
    "http://127.0.0.1:8888",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],
  allowedMethods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  allowCredentials: false,
  maxAge: 86400, // 24 hours
};

/**
 * CORS middleware class
 */
export class CORSMiddleware {
  private config: CORSConfig;

  constructor(config: Partial<CORSConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if origin is allowed
   */
  isOriginAllowed(origin: string | null): boolean {
    if (!origin) return true; // Same-origin requests

    for (const allowed of this.config.allowedOrigins) {
      if (origin === allowed) return true;
    }

    return false;
  }

  /**
   * Handle preflight OPTIONS request
   */
  handlePreflight(origin: string | null): Response {
    const headers = this.getCORSHeaders(origin);

    return new Response(null, {
      status: 204,
      headers,
    });
  }

  /**
   * Get CORS headers for a given origin
   */
  getCORSHeaders(origin: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      "Access-Control-Allow-Methods": this.config.allowedMethods.join(", "),
      "Access-Control-Allow-Headers": this.config.allowedHeaders.join(", "),
      "Access-Control-Max-Age": this.config.maxAge.toString(),
    };

    if (this.isOriginAllowed(origin)) {
      if (origin) {
        headers["Access-Control-Allow-Origin"] = origin;
      } else {
        headers["Access-Control-Allow-Origin"] = "*";
      }
    }

    if (this.config.allowCredentials) {
      headers["Access-Control-Allow-Credentials"] = "true";
    }

    return headers;
  }

  /**
   * Add CORS headers to a response
   */
  addCorsHeaders(response: Response, origin: string | null): Response {
    const headers = this.getCORSHeaders(origin);

    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }

    return response;
  }

  /**
   * Create a new response with CORS headers
   */
  createResponse(body: string | null | ArrayBuffer, init: ResponseInit & { origin?: string | null }): Response {
    const { origin, ...rest } = init;
    const response = new Response(body, rest);
    return this.addCorsHeaders(response, origin || null);
  }

  /**
   * Update configuration
   */
  setConfig(newConfig: Partial<CORSConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): CORSConfig {
    return { ...this.config };
  }
}

// Singleton instance
let middleware: CORSMiddleware | null = null;

/**
 * Get or create CORS middleware singleton
 */
export function getCORSMiddleware(config?: Partial<CORSConfig>): CORSMiddleware {
  if (!middleware) {
    middleware = new CORSMiddleware(config);
  }
  return middleware;
}

/**
 * Reset CORS middleware (for testing)
 */
export function resetCORSMiddleware(): void {
  middleware = null;
}
