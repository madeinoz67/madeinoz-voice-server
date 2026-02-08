/**
 * Qwen TTS Voice Server
 * Main Bun HTTP server with /notify, /pai, /health endpoints
 * MLX-audio only - Python backend removed
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
import { getMLXTTSClient, type MLXTTSClientConfig } from "@/services/mlx-tts-client.js";
import { getVoiceLoader } from "@/services/voice-loader.js";
import { getRateLimiter, extractClientId } from "@/middleware/rate-limiter.js";
import { getCORSMiddleware } from "@/middleware/cors.js";
import { $ } from "bun";

/**
 * Server configuration
 */
interface ServerConfig {
  port: number;
  host: string;
  defaultVoiceId: string;
  enableMacOSNotifications: boolean;
  /** MLX-audio configuration */
  mlxConfig: MLXTTSClientConfig;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ServerConfig = {
  port: parseInt(process.env.PORT || "8888", 10),
  host: "127.0.0.1",
  defaultVoiceId: process.env.DEFAULT_VOICE_ID || "marrvin",
  enableMacOSNotifications: process.env.ENABLE_MACOS_NOTIFICATIONS !== "false",
  mlxConfig: {
    // Use Kokoro-82M for smooth streaming (RTF ~1.0x)
    // Voices resolved via numeric ID (1-54) in voice loader
    model: process.env.MLX_MODEL || "mlx-community/Kokoro-82M-bf16",
    instruct: process.env.MLX_INSTRUCT,
    langCode: "en",
    speed: 1.0,
    streamingInterval: parseFloat(process.env.MLX_STREAMING_INTERVAL || "0.3"),
    timeout: 10000,
  },
};

/**
 * Server state
 */
interface ServerState {
  healthStatus: HealthStatus;
  config: ServerConfig;
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
 * Escape a string for safe use inside a double-quoted AppleScript string literal.
 *
 * AppleScript does not use backslash escapes; embed quotes by doubling them.
 */
function escapeForAppleScriptString(input: string): string {
  return input.replace(/"/g, `""`);
}

/**
 * Display macOS notification using osascript
 */
async function displayMacOSNotification(title: string, message: string): Promise<void> {
  try {
    // Escape backslashes and quotes for AppleScript
    const escapedTitle = escapeForAppleScriptString(title);
    const escapedMessage = escapeForAppleScriptString(message);

    const script = `display notification "${escapedMessage}" with title "${escapedTitle}"`;
    await $`osascript -e ${script}`;

    logger.debug("Displayed macOS notification", { title });
  } catch (error) {
    logger.warn("Failed to display macOS notification", { error: (error as Error).message });
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
 * Process TTS request with MLX-audio backend
 */
async function processTTS(
  text: string,
  voiceId: string,
  prosody: ProsodySettings,
  _volume: number
): Promise<void> {
  const mlxClient = getMLXTTSClient(serverState.config.mlxConfig);
  const prosodyInstruction = translateProsody(prosody);

  // Apply pronunciation rules
  const processedText = applyPronunciations(text);

  logger.info("Processing TTS with MLX-audio streaming", {
    text: processedText.substring(0, 50),
    model: serverState.config.mlxConfig.model,
  });

  try {
    // Use streaming mode - MLX-audio plays directly via sounddevice
    // This provides lower latency and smoother playback
    await mlxClient.synthesize(
      {
        text: processedText,
        voice: voiceId,
        prosody_instruction: prosodyInstruction,
        speed: prosody.speed,
        output_format: "wav",
      },
      true // stream = true
    );

    logger.info("MLX-audio streaming playback complete");
  } catch (error) {
    logger.warn("MLX-audio TTS synthesis failed, falling back to macOS say", {
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
    logger.info("Received /notify request", { title: request.title || "Notification" });

    // Validate request (title is optional for backward compatibility)
    if (!request.message) {
      return errorResponse("Missing required field: message");
    }

    // Sanitize input - use default title if not provided
    const title = sanitizeTitle(request.title || "Notification");
    const message = sanitizeMessage(request.message);

    if (!message) {
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
  // Determine voice system status
  let voiceSystem: HealthStatus["voice_system"] = "Unavailable";
  let modelLoaded = false;

  try {
    const mlxClient = getMLXTTSClient(serverState.config.mlxConfig);
    const healthy = await mlxClient.healthCheck();
    if (healthy) {
      voiceSystem = "MLX-audio";
      modelLoaded = true;
    }
  } catch {
    voiceSystem = "Unavailable";
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
    status: modelLoaded ? "healthy" : "degraded",
    port: serverState.config.port,
    voice_system: voiceSystem,
    default_voice_id: serverState.config.defaultVoiceId,
    model_loaded: modelLoaded,
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
    cors: getCORSMiddleware(),
    rateLimiter: getRateLimiter(),
  };

  const { port, host } = finalConfig;
  const serverUrl = `http://${host}:${port}`;

  logger.info(`Starting Voice Server on ${serverUrl}`);
  logger.info(`TTS Backend: MLX-audio`, {
    model: finalConfig.mlxConfig.model,
  });

  // Initialize MLX-audio client
  try {
    const mlxClient = getMLXTTSClient(finalConfig.mlxConfig);
    const healthy = await mlxClient.healthCheck();
    if (!healthy) {
      throw new Error("MLX-audio CLI not available");
    }
    logger.info("MLX-audio TTS backend initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize MLX-audio", error as Error);
    throw error;
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
