/**
 * Qwen TTS Voice Server
 * Main Bun HTTP server with /notify, /pai, /health endpoints
 */

import type { NotificationRequest, PaiNotificationRequest } from "@/models/notification.js";
import type { HealthStatus } from "@/models/health.js";
import type { SuccessResponse, ErrorResponse } from "@/models/notification.js";
import type { ProsodySettings } from "@/models/voice-config.js";
import { createDefaultHealthStatus } from "@/models/health.js";
import { sanitizeTitle, sanitizeMessage } from "@/utils/text-sanitizer.js";
import { logger } from "@/utils/logger.js";
import { translateProsody, DEFAULT_PROSODY } from "@/services/prosody-translator.js";
import { applyPronunciations, loadPAIPronunciations } from "@/services/pronunciation.js";
import { getTTSClient } from "@/services/tts-client.js";
import { getSubprocessManager, type SubprocessStatus } from "@/services/subprocess-manager.js";
import { getVoiceLoader } from "@/services/voice-loader.js";
import { getRateLimiter, extractClientId } from "@/middleware/rate-limiter.js";
import { getCORSMiddleware } from "@/middleware/cors.js";
import { unlinkSync } from "fs";
import { $ } from "bun";

/**
 * Server configuration
 */
interface ServerConfig {
  port: number;
  host: string;
  defaultVoiceId: string;
  enableSubprocess: boolean;
  enableMacOSNotifications: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ServerConfig = {
  port: parseInt(process.env.PORT || "8888", 10),
  host: "127.0.0.1",
  defaultVoiceId: process.env.DEFAULT_VOICE_ID || "marrvin",
  enableSubprocess: process.env.ENABLE_SUBPROCESS !== "false",
  enableMacOSNotifications: process.env.ENABLE_MACOS_NOTIFICATIONS !== "false",
};

/**
 * Server state
 */
interface ServerState {
  healthStatus: HealthStatus;
  config: ServerConfig;
  subprocessStatus: SubprocessStatus;
  cors: ReturnType<typeof getCORSMiddleware>;
  rateLimiter: ReturnType<typeof getRateLimiter>;
}

let serverState: ServerState;

/**
 * Create success response
 */
function successResponse(message: string = "Notification sent"): SuccessResponse {
  return {
    status: "success",
    message,
  };
}

/**
 * Create error response
 */
function errorResponse(message: string): ErrorResponse {
  return {
    status: "error",
    message,
  };
}

/**
 * Display macOS notification using osascript
 */
async function displayMacOSNotification(title: string, message: string): Promise<void> {
  try {
    // Escape quotes for AppleScript
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedMessage = message.replace(/"/g, '\\"');

    const script = `display notification "${escapedMessage}" with title "${escapedTitle}"`;
    await $`osascript -e '${script}'`;

    logger.debug("Displayed macOS notification", { title });
  } catch (error) {
    logger.warn("Failed to display macOS notification", { error: (error as Error).message });
  }
}

/**
 * Play audio file using afplay
 */
async function playAudioFile(filePath: string, volume: number = 1.0): Promise<void> {
  try {
    // afplay volume is 0-255, convert from 0.0-1.0
    const volumeArg = volume > 0 && volume < 1 ? `--volume=${Math.floor(volume * 255)}` : "";

    logger.debug("Playing audio file", { filePath, volume });

    await $`afplay ${volumeArg} ${filePath}`;

    // Clean up temporary file
    unlinkSync(filePath);
  } catch (error) {
    logger.warn("Failed to play audio file", { error: (error as Error).message });
    // Clean up temporary file on error too
    try {
      unlinkSync(filePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Fallback to macOS say command
 */
async function fallbackToMacOSSay(text: string, voiceId?: string): Promise<void> {
  try {
    logger.info("Using macOS say command as fallback");

    // Map voice IDs to macOS voices
    const voiceMap: Record<string, string> = {
      marrvin: "Alex",
      marlin: "Fred",
      daniel: "Daniel",
    };

    const voice = voiceId ? voiceMap[voiceId] || "Alex" : "Alex";
    await $`say -v ${voice} ${text}`;
  } catch (error) {
    logger.error("macOS say command failed", error as Error);
    throw error;
  }
}

/**
 * Process TTS request with fallback chain
 */
async function processTTS(
  text: string,
  voiceId: string,
  prosody: ProsodySettings,
  volume: number
): Promise<void> {
  const ttsClient = getTTSClient();
  const prosodyInstruction = translateProsody(prosody);

  // Apply pronunciation rules
  const processedText = applyPronunciations(text);

  logger.info("Processing TTS", {
    text: processedText.substring(0, 50),
    voice: voiceId,
    prosody: prosodyInstruction,
  });

  try {
    // Try Qwen TTS via subprocess
    const { filePath } = await ttsClient.synthesizeToFile({
      text: processedText,
      voice: voiceId,
      prosody_instruction: prosodyInstruction,
      speed: prosody.speed,
      output_format: "wav",
    });

    await playAudioFile(filePath, volume);
  } catch (error) {
    logger.warn("TTS synthesis failed, falling back to macOS say", {
      error: (error as Error).message,
    });
    await fallbackToMacOSSay(text, voiceId);
  }
}

/**
 * Handle POST /notify endpoint
 */
async function handleNotify(request: NotificationRequest): Promise<SuccessResponse | ErrorResponse> {
  try {
    logger.info("Received /notify request", { title: request.title });

    // Validate request
    if (!request.title || !request.message) {
      return errorResponse("Missing required fields: title and message");
    }

    // Sanitize input
    const title = sanitizeTitle(request.title);
    const message = sanitizeMessage(request.message);

    if (!title || !message) {
      return errorResponse("Invalid input after sanitization");
    }

    // Determine voice settings
    const voiceId = request.voice_id || request.voice_name || serverState.config.defaultVoiceId;
    const voiceSettings = request.voice_settings || DEFAULT_PROSODY;
    const volume = request.volume ?? voiceSettings.volume ?? 1.0;

    // Display macOS notification
    if (serverState.config.enableMacOSNotifications) {
      await displayMacOSNotification(title, message);
    }

    // Process TTS if enabled
    if (request.voice_enabled !== false) {
      await processTTS(message, voiceId, voiceSettings, volume);
    }

    return successResponse();
  } catch (error) {
    logger.error("Error handling /notify", error as Error);
    return errorResponse("Internal server error");
  }
}

/**
 * Handle POST /pai endpoint
 */
async function handlePai(request: PaiNotificationRequest): Promise<SuccessResponse | ErrorResponse> {
  try {
    logger.info("Received /pai request", { title: request.title });

    // Validate request
    if (!request.title || !request.message) {
      return errorResponse("Missing required fields: title and message");
    }

    // Sanitize input
    const title = sanitizeTitle(request.title);
    const message = sanitizeMessage(request.message);

    // Use default DA voice settings
    const voiceId = serverState.config.defaultVoiceId;
    const voiceSettings = DEFAULT_PROSODY;
    const volume = 1.0;

    // Display macOS notification
    if (serverState.config.enableMacOSNotifications) {
      await displayMacOSNotification(title, message);
    }

    // Process TTS
    await processTTS(message, voiceId, voiceSettings, volume);

    return successResponse("PAI notification sent");
  } catch (error) {
    logger.error("Error handling /pai", error as Error);
    return errorResponse("Internal server error");
  }
}

/**
 * Handle GET /health endpoint
 */
async function handleHealth(): Promise<HealthStatus> {
  // Update subprocess status
  const subprocessManager = getSubprocessManager();
  serverState.subprocessStatus = subprocessManager.getStatus();

  // Determine voice system
  let voiceSystem: HealthStatus["voice_system"] = "Unavailable";
  let modelLoaded = false;

  if (serverState.subprocessStatus.state === "running") {
    const ttsClient = getTTSClient();
    const health = await ttsClient.getHealthStatus();
    if (health) {
      voiceSystem = "Qwen TTS";
      modelLoaded = health.model_loaded;
    }
  }

  // Fallback always available on macOS
  if (voiceSystem === "Unavailable") {
    voiceSystem = "macOS Say";
  }

  // Get available voices
  let availableVoices: string[] = [];
  try {
    const voiceLoader = getVoiceLoader();
    availableVoices = await voiceLoader.getAvailableVoices();
  } catch (error) {
    logger.warn("Failed to get available voices", { error: (error as Error).message });
  }

  // Update health status
  serverState.healthStatus = {
    status: serverState.subprocessStatus.state === "running" ? "healthy" : "degraded",
    port: serverState.config.port,
    voice_system: voiceSystem,
    default_voice_id: serverState.config.defaultVoiceId,
    model_loaded: modelLoaded,
    api_key_configured: false,
    python_subprocess: serverState.subprocessStatus.state as "running" | "stopped" | "crashed",
    available_voices: availableVoices.length > 0 ? availableVoices : undefined,
  };

  return serverState.healthStatus;
}

/**
 * Parse JSON body from request
 */
async function parseJsonBody<T>(req: Request): Promise<T> {
  const text = await req.text();
  if (!text) {
    throw new Error("Empty request body");
  }
  return JSON.parse(text) as T;
}

/**
 * Main Bun HTTP server
 */
export async function startServer(config: Partial<ServerConfig> = {}): Promise<void> {
  // Initialize server state
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  serverState = {
    healthStatus: createDefaultHealthStatus(),
    config: finalConfig,
    subprocessStatus: {
      state: "stopped",
      pid: null,
      port: 7860,
      uptime: 0,
    },
    cors: getCORSMiddleware(),
    rateLimiter: getRateLimiter(),
  };

  const { port, host } = finalConfig;
  const serverUrl = `http://${host}:${port}`;

  logger.info(`Starting Qwen TTS Voice Server on ${serverUrl}`);

  // Start Python subprocess if enabled
  if (finalConfig.enableSubprocess) {
    try {
      const subprocessManager = getSubprocessManager();
      await subprocessManager.start();
      logger.info("Python TTS subprocess started");
    } catch (error) {
      logger.warn("Failed to start Python subprocess, will use fallback", {
        error: (error as Error).message,
      });
    }
  }

  // Load voice configurations
  try {
    const voiceLoader = getVoiceLoader();
    const voices = await voiceLoader.loadVoices();
    logger.info(`Loaded ${voices.size} voice configurations`);
  } catch (error) {
    logger.warn("Failed to load voice configurations", {
      error: (error as Error).message,
    });
  }

  // Load pronunciation rules
  try {
    const pronunciations = loadPAIPronunciations();
    if (pronunciations.length > 0) {
      logger.info(`Loaded ${pronunciations.length} pronunciation rules`);
    }
  } catch (error) {
    logger.warn("Failed to load pronunciation rules", {
      error: (error as Error).message,
    });
  }

  const server = Bun.serve({
    hostname: host,
    port,
    async fetch(req): Promise<Response> {
      const url = new URL(req.url);
      const path = url.pathname;
      const origin = req.headers.get("Origin");

      logger.debug("Incoming request", { method: req.method, path });

      try {
        // CORS preflight
        if (req.method === "OPTIONS") {
          return serverState.cors.handlePreflight(origin);
        }

        // Rate limiting (apply to POST requests)
        if (req.method === "POST") {
          const clientId = extractClientId(req);
          if (serverState.rateLimiter.isRateLimited(clientId)) {
            return Response.json(
              errorResponse("Rate limit exceeded"),
              { status: 429 }
            );
          }
        }

        let responseData: unknown;

        // POST /notify
        if (path === "/notify" && req.method === "POST") {
          const body = await parseJsonBody<NotificationRequest>(req);
          responseData = await handleNotify(body);
        }
        // POST /pai
        else if (path === "/pai" && req.method === "POST") {
          const body = await parseJsonBody<PaiNotificationRequest>(req);
          responseData = await handlePai(body);
        }
        // GET /health
        else if (path === "/health" && req.method === "GET") {
          responseData = await handleHealth();
        }
        // 404 Not Found
        else {
          return Response.json(
            errorResponse("Not found"),
            { status: 404 }
          );
        }

        // Add CORS headers to response
        const response = Response.json(responseData);
        return serverState.cors.addCorsHeaders(response, origin);
      } catch (error) {
        logger.error("Request handler error", error as Error, { path });

        const errorResp = Response.json(
          errorResponse("Internal server error"),
          { status: 500 }
        );
        return serverState.cors.addCorsHeaders(errorResp, origin);
      }
    },
  });

  logger.info(`Server listening on ${serverUrl}`);

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down server...");

    // Stop Python subprocess
    if (finalConfig.enableSubprocess) {
      const subprocessManager = getSubprocessManager();
      await subprocessManager.stop();
    }

    // Stop rate limiter
    serverState.rateLimiter.stop();

    server.stop();
    logger.info("Server stopped");
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

// Start server if this file is run directly
if (import.meta.main) {
  startServer().catch((error) => {
    logger.error("Failed to start server", error);
    process.exit(1);
  });
}
