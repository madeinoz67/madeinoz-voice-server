/**
 * Qwen TTS Voice Server
 * Main Bun HTTP server with /notify, /pai, /health endpoints
 */

import type { NotificationRequest, PaiNotificationRequest } from "@/models/notification.js";
import type { HealthStatus } from "@/models/health.js";
import type { SuccessResponse, ErrorResponse } from "@/models/notification.js";
import type { ProsodySettings } from "@/models/voice-config.js";
import type {
  VoiceUploadResponse,
  VoiceListResponse,
  VoiceDeleteResponse,
} from "@/models/voice-upload.js";
import { createDefaultHealthStatus } from "@/models/health.js";
import { sanitizeTitle, sanitizeMessage } from "@/utils/text-sanitizer.js";
import { logger } from "@/utils/logger.js";
import { translateProsody, DEFAULT_PROSODY } from "@/services/prosody-translator.js";
import { applyPronunciations, loadPAIPronunciations } from "@/services/pronunciation.js";
import { getTTSClient } from "@/services/tts-client.js";
import { getMLXTTSClient, type MLXTTSClientConfig } from "@/services/mlx-tts-client.js";
import { getSubprocessManager, type SubprocessStatus } from "@/services/subprocess-manager.js";
import { getVoiceLoader } from "@/services/voice-loader.js";
import { saveVoice, listVoices, deleteVoice, getVoice as getStoredVoice } from "@/services/voice-storage.js";
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
  /** TTS backend: "qwen" (Python server) or "mlx" (MLX-audio CLI) */
  ttsBackend: "qwen" | "mlx";
  /** MLX-audio configuration (only used when ttsBackend is "mlx") */
  mlxConfig?: Partial<MLXTTSClientConfig>;
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
  ttsBackend: (process.env.TTS_BACKEND === "mlx" ? "mlx" : "qwen"),
  mlxConfig: process.env.TTS_BACKEND === "mlx" ? {
    // Use Kokoro-82M for smooth streaming (RTF ~1.0x)
    // Voices resolved via numeric ID (1-54) in voice loader
    model: process.env.MLX_MODEL || "mlx-community/Kokoro-82M-bf16",
    instruct: process.env.MLX_INSTRUCT,
    langCode: "en",
    speed: 1.0,
    streamingInterval: parseFloat(process.env.MLX_STREAMING_INTERVAL || "0.3"),
  } : undefined,
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
 * Play streaming audio - accumulates chunks, converts to WAV, and plays using afplay
 */
async function playStreamingAudio(
  audioStream: AsyncGenerator<Uint8Array>,
  volume: number = 1.0
): Promise<void> {
  const pcmFile = `/tmp/qwen_tts_${Date.now()}.pcm`;
  const wavFile = `/tmp/qwen_tts_${Date.now()}.wav`;

  try {
    let firstChunk = true;
    let chunkCount = 0;
    let totalBytes = 0;
    const startTime = Date.now();

    // Accumulate all chunks to a PCM file
    const chunks: Uint8Array[] = [];

    for await (const chunk of audioStream) {
      totalBytes += chunk.length;
      chunks.push(chunk);

      if (firstChunk) {
        const elapsed = Date.now() - startTime;
        logger.info(`✓ First audio chunk received after ${elapsed}ms`);
        firstChunk = false;
      }
    }

    // Write all chunks to PCM file
    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    await Bun.write(pcmFile, combined);
    const duration = Date.now() - startTime;
    logger.info(`✓ All chunks received: ${chunkCount} chunks, ${totalBytes} bytes in ${duration}ms`);

    // Convert PCM to WAV using ffmpeg
    const sampleRate = 24000;
    const channels = 1;
    const bitsPerSample = 16;

    logger.info(`Converting PCM to WAV and playing...`);

    // Use ffmpeg to convert and play in one go
    const proc = Bun.spawn(["ffmpeg",
      "-f", "s16le",           // Input format: PCM signed 16-bit little-endian
      "-ar", sampleRate.toString(),   // Sample rate
      "-ac", channels.toString(),    // Channels
      "-i", pcmFile,           // Input file
      "-f", "wav",             // Output format: WAV
      "-vn",                   // No video
      "-",
      // Output to stdout, pipe to afplay
    ], {
      stdout: "pipe",
      stderr: "pipe",
    });

    // Get ffmpeg output and play it
    const wavData = await Bun.readableStreamToBytes(proc.stdout as ReadableStream);
    await Bun.write(wavFile, wavData);

    // Play with afplay
    const volumeArg = volume > 0 && volume < 1 ? `--volume=${Math.floor(volume * 255)}` : "";
    logger.info(`Playing WAV with afplay (${wavData.length} bytes)`);

    await $`afplay ${volumeArg} ${wavFile}`;

    logger.info("✓ Playback complete");

  } finally {
    // Clean up temp files
    try {
      unlinkSync(pcmFile);
      unlinkSync(wavFile);
    } catch {
      // Ignore cleanup errors
    }
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
 * Check if voice is a custom uploaded voice
 * Returns voice metadata if found, null otherwise
 */
async function getCustomVoice(voiceId: string): Promise<{
  metadata: { id: string; name: string; file_path: string };
} | null> {
  try {
    const metadata = getStoredVoice(voiceId);
    if (metadata) {
      return {
        metadata: {
          id: metadata.id,
          name: metadata.name,
          file_path: metadata.file_path,
        },
      };
    }
  } catch {
    // Voice not found in custom storage
  }
  return null;
}

/**
 * Process TTS with custom voice support
 * Checks for custom uploaded voices first, falls back to built-in voices
 */
async function processTTSWithCustomVoice(
  text: string,
  voiceId: string,
  prosody: ProsodySettings,
  volume: number
): Promise<void> {
  // First check if it's a custom uploaded voice
  const customVoice = await getCustomVoice(voiceId);

  if (customVoice) {
    logger.info("Using custom uploaded voice", {
      voiceId,
      voiceName: customVoice.metadata.name,
    });

    // For custom voices, we would use the reference audio for cloning
    // TODO: When Qwen3-TTS VoiceDesign is integrated, use the reference audio
    // For now, fall through to built-in voice processing
    logger.info("Custom voice processing not yet fully implemented, using built-in fallback");
  }

  // Use standard TTS processing
  await processTTSWithCustomVoice(text, voiceId, prosody, volume);
}

/**
 * Process TTS request with MLX-audio backend
 */
async function processTTSWithMLX(
  text: string,
  voiceId: string,
  prosody: ProsodySettings,
  volume: number
): Promise<void> {
  const mlxClient = getMLXTTSClient(serverState.config.mlxConfig);
  const prosodyInstruction = translateProsody(prosody);

  // Apply pronunciation rules
  const processedText = applyPronunciations(text);

  logger.info("Processing TTS with MLX-audio streaming", {
    text: processedText.substring(0, 50),
    model: serverState.config.mlxConfig?.model,
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
    ); // Enable streaming

    logger.info("MLX-audio streaming playback complete");
  } catch (error) {
    logger.warn("MLX-audio TTS synthesis failed, falling back to macOS say", {
      error: (error as Error).message,
    });
    await fallbackToMacOSSay(text, voiceId);
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
  const useMLX = serverState.config.ttsBackend === "mlx";

  if (useMLX) {
    // Use MLX-audio backend (ultra-fast)
    logger.debug("Using MLX-audio TTS backend");
    return await processTTSWithMLX(text, voiceId, prosody, volume);
  } else {
    // Use Qwen TTS HTTP server backend
    logger.debug("Using Qwen TTS HTTP backend");
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
      // Try Qwen TTS via subprocess with streaming
      const audioStream = ttsClient.synthesizeStream({
        text: processedText,
        voice: voiceId,
        prosody_instruction: prosodyInstruction,
        speed: prosody.speed,
        output_format: "wav",
      });

      await playStreamingAudio(audioStream, volume);
    } catch (error) {
      logger.warn("TTS synthesis failed, falling back to macOS say", {
        error: (error as Error).message,
      });
      await fallbackToMacOSSay(text, voiceId);
    }
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
    await processTTSWithCustomVoice(message, voiceId, voiceSettings, volume);

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

  // Determine voice system based on backend
  let voiceSystem: HealthStatus["voice_system"] = "Unavailable";
  let modelLoaded = false;

  if (serverState.config.ttsBackend === "mlx") {
    // MLX-audio backend
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
  } else if (serverState.subprocessStatus.state === "running") {
    // Qwen TTS HTTP backend
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

  // Get available voices (built-in + custom)
  let availableVoices: string[] = [];
  try {
    const voiceLoader = getVoiceLoader();
    availableVoices = await voiceLoader.getAvailableVoices();
  } catch (error) {
    logger.warn("Failed to get built-in voices", { error: (error as Error).message });
  }

  // Add custom uploaded voices
  try {
    const customVoices = listVoices();
    for (const voice of customVoices) {
      if (!availableVoices.includes(voice.id)) {
        availableVoices.push(voice.id);
      }
    }
  } catch (error) {
    logger.warn("Failed to get custom voices", { error: (error as Error).message });
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
 * Handle POST /upload-voice endpoint
 * Upload a custom voice with reference audio
 */
async function handleUploadVoice(req: Request): Promise<VoiceUploadResponse> {
  try {
    logger.info("Received /upload-voice request");

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const name = formData.get("name") as string | null;
    const description = formData.get("description") as string | null || undefined;

    // Validate required fields
    if (!audioFile) {
      return {
        status: "error",
        message: "Missing required field: audio file",
      };
    }

    if (!name) {
      return {
        status: "error",
        message: "Missing required field: name",
      };
    }

    // Save uploaded file to temp location
    const tempDir = "/tmp";
    const tempFilePath = `${tempDir}/voice_upload_${Date.now()}.wav`;

    try {
      const buffer = await audioFile.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      await Bun.write(tempFilePath, uint8Array);

      // Save voice to storage
      const voiceMetadata = saveVoice(tempFilePath, { name, description });

      if (!voiceMetadata) {
        return {
          status: "error",
          message: "Failed to save voice - audio validation failed",
        };
      }

      logger.info("Voice uploaded successfully", {
        id: voiceMetadata.id,
        name: voiceMetadata.name,
      });

      return {
        status: "success",
        message: "Voice uploaded successfully",
        voice: voiceMetadata,
      };
    } finally {
      // Clean up temp file
      try {
        unlinkSync(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  } catch (error) {
    logger.error("Error handling /upload-voice", error as Error);
    return {
      status: "error",
      message: "Internal server error",
    };
  }
}

/**
 * Handle GET /voices endpoint
 * List all available custom voices
 */
async function handleListVoices(): Promise<VoiceListResponse> {
  try {
    const voices = listVoices();

    logger.debug(`Listed ${voices.length} voices`);

    return {
      status: "success",
      voices,
    };
  } catch (error) {
    logger.error("Error handling /voices", error as Error);
    return {
      status: "error",
      message: "Internal server error",
    };
  }
}

/**
 * Handle DELETE /voices/:id endpoint
 * Delete a custom voice
 */
async function handleDeleteVoice(voiceId: string): Promise<VoiceDeleteResponse> {
  try {
    logger.info("Received DELETE /voices request", { voiceId });

    if (!voiceId) {
      return {
        status: "error",
        message: "Missing voice ID",
      };
    }

    const deleted = deleteVoice(voiceId);

    if (!deleted) {
      return {
        status: "error",
        message: "Voice not found",
      };
    }

    return {
      status: "success",
      message: "Voice deleted successfully",
    };
  } catch (error) {
    logger.error("Error handling DELETE /voices", error as Error);
    return {
      status: "error",
      message: "Internal server error",
    };
  }
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

  logger.info(`Starting Voice Server on ${serverUrl}`);
  logger.info(`TTS Backend: ${finalConfig.ttsBackend.toUpperCase()}`, {
    backend: finalConfig.ttsBackend,
    model: finalConfig.mlxConfig?.model || "N/A",
  });

  // Initialize MLX-audio client if using MLX backend
  if (finalConfig.ttsBackend === "mlx") {
    try {
      const mlxClient = getMLXTTSClient(finalConfig.mlxConfig);
      const healthy = await mlxClient.healthCheck();
      if (!healthy) {
        throw new Error("MLX-audio CLI not available");
      }
      logger.info("MLX-audio TTS backend initialized successfully");
    } catch (error) {
      logger.warn("Failed to initialize MLX-audio, falling back to Qwen TTS", {
        error: (error as Error).message,
      });
      finalConfig.ttsBackend = "qwen";
    }
  }

  // Start Python subprocess if enabled (only for Qwen backend)
  if (finalConfig.ttsBackend === "qwen" && finalConfig.enableSubprocess) {
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
        // POST /upload-voice
        else if (path === "/upload-voice" && req.method === "POST") {
          responseData = await handleUploadVoice(req);
        }
        // GET /voices
        else if (path === "/voices" && req.method === "GET") {
          responseData = await handleListVoices();
        }
        // DELETE /voices/:id
        else if (path.startsWith("/voices/") && req.method === "DELETE") {
          const voiceId = path.split("/").pop() || "";
          responseData = await handleDeleteVoice(voiceId);
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
