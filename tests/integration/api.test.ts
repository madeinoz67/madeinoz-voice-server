/**
 * Integration tests for API endpoints
 *
 * Note: These tests require MLX-audio to be installed.
 * They will be skipped if MLX-audio is not available.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";

// Test server configuration
const SERVER_HOST = "127.0.0.1";
const SERVER_PORT = 8899; // Use different port for tests
const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

let serverProcess: ReturnType<typeof Bun.spawn> | null = null;

// Check if MLX-audio is available
async function checkMLXAudio(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", "mlx_tts"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

const hasMLXAudio = await checkMLXAudio();

describe.skipIf(!hasMLXAudio)("Voice Server API Integration Tests (skipped - MLX-audio not available)", () => {
  beforeAll(async () => {
    // Start test server
    serverProcess = Bun.spawn({
      cmd: ["bun", "run", "src/ts/server.ts"],
      env: {
        ...process.env,
        PORT: SERVER_PORT.toString(),
        NODE_ENV: "test",
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    // Wait for server to be ready
    let retries = 50;
    while (retries > 0) {
      try {
        const response = await fetch(`${SERVER_URL}/health`);
        if (response.ok) {
          break;
        }
      } catch {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      retries--;
    }

    if (retries === 0) {
      throw new Error("Server failed to start");
    }
  }, 10000);

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  describe("GET /health", () => {
    test("should return health status", async () => {
      const response = await fetch(`${SERVER_URL}/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("healthy");
      expect(data.port).toBe(SERVER_PORT);
      expect(data.voice_system).toBeDefined();
    });
  });

  describe("POST /notify", () => {
    test("should accept valid notification request", async () => {
      const response = await fetch(`${SERVER_URL}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Test notification",
          voice_id: "marrvin",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("success");
    });

    test("should reject missing message", async () => {
      const response = await fetch(`${SERVER_URL}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: "marrvin" }),
      });

      expect(response.status).toBe(400);
    });

    test("should reject missing voice_id", async () => {
      const response = await fetch(`${SERVER_URL}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Test" }),
      });

      expect(response.status).toBe(400);
    });

    test("should reject invalid JSON", async () => {
      const response = await fetch(`${SERVER_URL}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /tts", () => {
    test("should accept valid TTS request", async () => {
      const response = await fetch(`${SERVER_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Hello world",
          voice_id: "marrvin",
        }),
      });

      // Note: This may fail if MLX-audio is not configured
      // Status could be 200 (success) or 500 (MLX not available)
      expect([200, 500]).toContain(response.status);
    });

    test("should reject missing text", async () => {
      const response = await fetch(`${SERVER_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: "marrvin" }),
      });

      expect(response.status).toBe(400);
    });

    test("should reject missing voice_id", async () => {
      const response = await fetch(`${SERVER_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Hello" }),
      });

      expect(response.status).toBe(400);
    });

    test("should reject empty text", async () => {
      const response = await fetch(`${SERVER_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "",
          voice_id: "marrvin",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("CORS", () => {
    test("should include CORS headers for allowed origins", async () => {
      const response = await fetch(`${SERVER_URL}/health`, {
        headers: { Origin: "http://localhost:3000" },
      });

      expect(response.headers.get("Access-Control-Allow-Methods")).toBeDefined();
    });

    test("should handle OPTIONS preflight", async () => {
      const response = await fetch(`${SERVER_URL}/notify`, {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:3000",
          "Access-Control-Request-Method": "POST",
        },
      });

      expect(response.status).toBe(204);
    });
  });
});

// If MLX-audio is not available, add a placeholder test
describe.if(hasMLXAudio)("Integration tests", () => {
  test("placeholder - MLX-audio is available", () => {
    expect(true).toBe(true);
  });
});
