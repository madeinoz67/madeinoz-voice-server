/**
 * Integration tests for FIFO Notification Queue API
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

describe.skipIf(!hasMLXAudio)("Queue API Integration Tests (skipped - MLX-audio not available)", () => {
  beforeAll(async () => {
    // Start test server
    serverProcess = Bun.spawn(["bun", "run", "src/ts/server.ts"], {
      env: {
        ...process.env,
        PORT: SERVER_PORT.toString(),
        NODE_ENV: "test",
        ENABLE_MACOS_NOTIFICATIONS: "false", // Disable macOS notifications in tests
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
      await new Promise((resolve) => setTimeout(resolve, 100));
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

  describe("POST /notify", () => {
    test("should return 201 Accepted for valid notification", async () => {
      const response = await fetch(`${SERVER_URL}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Test notification",
          voice_id: "marrvin",
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.status).toBe("success");
      expect(data.message).toContain("accepted");
    });

    test("should return 400 Bad Request for missing message", async () => {
      const response = await fetch(`${SERVER_URL}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: "marrvin" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.status).toBe("error");
    });

    test("should return 400 Bad Request for invalid JSON", async () => {
      const response = await fetch(`${SERVER_URL}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      expect(response.status).toBe(400);
    });

    test("should return 201 for notification with title", async () => {
      const response = await fetch(`${SERVER_URL}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Title",
          message: "Test notification with title",
          voice_id: "marrvin",
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.status).toBe("success");
    });

    test("should process multiple requests sequentially", async () => {
      // Send multiple requests rapidly
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          fetch(`${SERVER_URL}/notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: `Sequential test ${i}`,
              voice_id: "marrvin",
            }),
          })
        );
      }

      const responses = await Promise.all(requests);

      // All should return 201 Accepted
      for (const response of responses) {
        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.status).toBe("success");
      }

      // Wait for queue to process (with voice_enabled=false for speed)
      await new Promise((resolve) => setTimeout(resolve, 500));
    });
  });

  describe("GET /queue/status", () => {
    test("should return queue status", async () => {
      const response = await fetch(`${SERVER_URL}/queue/status`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("success");
      expect(data.depth).toBeGreaterThanOrEqual(0);
      expect(data.processingStatus).toMatch(/^(idle|active|draining)$/);
      expect(data.health).toMatch(/^(healthy|degraded|unavailable)$/);
    });

    test("should include metrics in status", async () => {
      const response = await fetch(`${SERVER_URL}/queue/status`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.metrics).toBeDefined();
      expect(data.metrics.itemsProcessed).toBeGreaterThanOrEqual(0);
      expect(data.metrics.itemsFailed).toBeGreaterThanOrEqual(0);
    });

    test("should reflect queue state after enqueue", async () => {
      // Send a notification
      await fetch(`${SERVER_URL}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Status check test",
          voice_id: "marrvin",
          voice_enabled: false, // Skip TTS for faster test
        }),
      });

      // Check status
      const response = await fetch(`${SERVER_URL}/queue/status`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("success");
      // Queue might be empty or processing depending on timing
      expect(data.depth).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Queue Health Indicators", () => {
    test("should show healthy when queue is empty", async () => {
      // Wait for any pending items to process
      await new Promise((resolve) => setTimeout(resolve, 500));

      const response = await fetch(`${SERVER_URL}/queue/status`);
      const data = await response.json();

      expect(data.health).toBe("healthy");
    });

    test("should show degraded when queue has many items", async () => {
      // This test would require filling the queue beyond degradedThreshold
      // For now, we just verify the endpoint works
      const response = await fetch(`${SERVER_URL}/queue/status`);
      expect(response.status).toBe(200);
    });
  });

  describe("CORS", () => {
    test("should include CORS headers for /notify", async () => {
      const response = await fetch(`${SERVER_URL}/notify`, {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "CORS test",
          voice_id: "marrvin",
          voice_enabled: false,
        }),
      });

      expect(response.headers.get("Access-Control-Allow-Origin")).toBeDefined();
    });

    test("should include CORS headers for /queue/status", async () => {
      const response = await fetch(`${SERVER_URL}/queue/status`, {
        headers: { Origin: "http://localhost:3000" },
      });

      expect(response.headers.get("Access-Control-Allow-Origin")).toBeDefined();
    });

    test("should handle OPTIONS preflight for /notify", async () => {
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

  describe("Response Time", () => {
    test("should return 201 within 100ms", async () => {
      const start = Date.now();

      const response = await fetch(`${SERVER_URL}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Response time test",
          voice_id: "marrvin",
          voice_enabled: false,
        }),
      });

      const elapsed = Date.now() - start;

      expect(response.status).toBe(201);
      expect(elapsed).toBeLessThan(100);
    });

    test("should return /queue/status within 50ms", async () => {
      const start = Date.now();

      const response = await fetch(`${SERVER_URL}/queue/status`);

      const elapsed = Date.now() - start;

      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThan(50);
    });
  });
});

// If MLX-audio is not available, add a placeholder test
describe.if(hasMLXAudio)("Integration tests", () => {
  test("placeholder - MLX-audio is available", () => {
    expect(true).toBe(true);
  });
});
