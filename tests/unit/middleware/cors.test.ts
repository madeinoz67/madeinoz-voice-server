/**
 * CORS middleware tests
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  CORSMiddleware,
  getCORSMiddleware,
  resetCORSMiddleware,
} from "@/middleware/cors.js";
import type { CORSConfig } from "@/middleware/cors.js";

describe("CORSMiddleware", () => {
  let middleware: CORSMiddleware;

  beforeEach(() => {
    resetCORSMiddleware();
    middleware = new CORSMiddleware();
  });

  describe("isOriginAllowed", () => {
    test("should allow localhost:8888", () => {
      expect(middleware.isOriginAllowed("http://localhost:8888")).toBe(true);
    });

    test("should allow 127.0.0.1:8888", () => {
      expect(middleware.isOriginAllowed("http://127.0.0.1:8888")).toBe(true);
    });

    test("should allow localhost:3000", () => {
      expect(middleware.isOriginAllowed("http://localhost:3000")).toBe(true);
    });

    test("should reject unknown origins", () => {
      expect(middleware.isOriginAllowed("http://evil.com")).toBe(false);
      expect(middleware.isOriginAllowed("https://example.com")).toBe(false);
    });

    test("should allow null origin (same-origin)", () => {
      expect(middleware.isOriginAllowed(null)).toBe(true);
    });
  });

  describe("getCORSHeaders", () => {
    test("should include standard CORS headers", () => {
      const headers = middleware.getCORSHeaders("http://localhost:8888");
      expect(headers["Access-Control-Allow-Methods"]).toBeDefined();
      expect(headers["Access-Control-Allow-Headers"]).toBeDefined();
      expect(headers["Access-Control-Max-Age"]).toBeDefined();
    });

    test("should include origin for allowed origins", () => {
      const headers = middleware.getCORSHeaders("http://localhost:8888");
      expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:8888");
    });

    test("should not include origin for disallowed origins", () => {
      const headers = middleware.getCORSHeaders("http://evil.com");
      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });

    test("should use wildcard for null origin", () => {
      const headers = middleware.getCORSHeaders(null);
      expect(headers["Access-Control-Allow-Origin"]).toBe("*");
    });

    test("should include credentials header when enabled", () => {
      const authMiddleware = new CORSMiddleware({ allowCredentials: true });
      const headers = authMiddleware.getCORSHeaders("http://localhost:8888");
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    });
  });

  describe("handlePreflight", () => {
    test("should return 204 status for OPTIONS request", () => {
      const response = middleware.handlePreflight("http://localhost:8888");
      expect(response.status).toBe(204);
    });

    test("should include CORS headers in preflight response", () => {
      const response = middleware.handlePreflight("http://localhost:8888");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBeDefined();
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:8888");
    });
  });

  describe("addCorsHeaders", () => {
    test("should add CORS headers to existing response", () => {
      const response = new Response("OK", { status: 200 });
      const corsResponse = middleware.addCorsHeaders(response, "http://localhost:8888");
      expect(corsResponse.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:8888");
    });
  });

  describe("createResponse", () => {
    test("should create new response with CORS headers", () => {
      const response = middleware.createResponse("Hello", {
        status: 200,
        origin: "http://localhost:8888",
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:8888");
    });
  });

  describe("setConfig", () => {
    test("should update configuration", () => {
      middleware.setConfig({ allowCredentials: true });
      const config = middleware.getConfig();
      expect(config.allowCredentials).toBe(true);
    });

    test("should merge with existing config", () => {
      middleware.setConfig({ allowCredentials: true });
      const config = middleware.getConfig();
      expect(config.allowedOrigins.length).toBeGreaterThan(0); // Defaults preserved
    });
  });

  describe("getConfig", () => {
    test("should return copy of config", () => {
      const config1 = middleware.getConfig();
      const config2 = middleware.getConfig();
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different references
    });
  });
});

describe("getCORSMiddleware", () => {
  afterEach(() => {
    resetCORSMiddleware();
  });

  test("should return singleton instance", () => {
    const middleware1 = getCORSMiddleware();
    const middleware2 = getCORSMiddleware();
    expect(middleware1).toBe(middleware2);
  });

  test("should create with custom config", () => {
    const middleware = getCORSMiddleware({ allowCredentials: true });
    const config = middleware.getConfig();
    expect(config.allowCredentials).toBe(true);
  });
});
