/**
 * MLX-audio TTS client
 * Communicates with MLX-audio CLI for ultra-fast TTS on Apple Silicon
 */

import type { TTSRequest, TTSResponse } from "@/models/tts.js";
import { logger } from "@/utils/logger.js";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { $ } from "bun";
import { getVoiceLoader } from "@/services/voice-loader.js";

/**
 * MLX-audio TTS client configuration
 */
export interface MLXTTSClientConfig {
  /** MLX-audio model to use */
  model: string;
  /** Voice instruction (for Qwen3-TTS VoiceDesign) */
  instruct?: string;
  /** Language code */
  langCode?: string;
  /** Speed factor (1.0 = normal) */
  speed?: number;
  /** Streaming interval in seconds (0.5-2.0, default 1.0 for smooth playback) */
  streamingInterval?: number;
  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * Default configuration using Kokoro-82M (fastest)
 * Voice is now resolved via numeric ID from voice loader
 */
const DEFAULT_CONFIG: MLXTTSClientConfig = {
  model: "mlx-community/Kokoro-82M-bf16",
  langCode: "en",
  speed: 1.0,
  streamingInterval: 0.3, // 0.3 second chunks for ultra-smooth streaming (< 0.5s)
  timeout: 10000, // 10 seconds (MLX-audio is much faster)
};

/**
 * MLX-audio TTS client class
 */
export class MLXTTSClient {
  private config: MLXTTSClientConfig;

  constructor(config: Partial<MLXTTSClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info("MLX-audio TTS client initialized", {
      model: this.config.model,
    });
  }

  /**
   * Send TTS request to MLX-audio CLI
   * @param stream - Enable streaming playback (plays directly via sounddevice)
   */
  async synthesize(request: TTSRequest, stream: boolean = false): Promise<TTSResponse> {
    const startTime = Date.now();

    // Resolve numeric voice ID to Kokoro voice name
    const voiceLoader = getVoiceLoader();
    const kokoroVoice = voiceLoader.resolveKokoroVoice(request.voice);
    const voiceInfo = voiceLoader.getVoiceInfo(request.voice);

    logger.debug("Sending MLX-audio TTS request", {
      text: request.text.substring(0, 50),
      model: this.config.model,
      voice: request.voice,
      kokoro_voice: kokoroVoice,
      voice_info: voiceInfo ? `${voiceInfo.gender} ${voiceInfo.accent} - ${voiceInfo.description}` : undefined,
    });

    try {
      // Generate unique file prefix for this request
      const filePrefix = `${tmpdir()}/mlx_tts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Build MLX-audio CLI command
      const args = [
        "mlx_audio.tts.generate",
        "--model", this.config.model,
        "--text", request.text,
        "--file_prefix", filePrefix,
      ];

      // Add voice/instruct based on model type
      // Use resolved Kokoro voice name instead of config voice
      if (this.config.instruct) {
        args.push("--instruct", this.config.instruct);
      } else {
        args.push("--voice", kokoroVoice);
      }

      // Add optional parameters
      if (this.config.langCode) {
        args.push("--lang_code", this.config.langCode);
      }
      if (this.config.speed && this.config.speed !== 1.0) {
        args.push("--speed", this.config.speed.toString());
      }

      // For streaming, use smaller interval for smoother playback (< 0.5s)
      const streamingInterval = stream ? (this.config.streamingInterval || 0.3) : 2.0;
      args.push("--streaming_interval", streamingInterval.toString());

      // Add --play flag for streaming mode to enable audio playback
      if (stream) {
        args.push("--play");
      }

      logger.debug("Executing MLX-audio command", { args: args.join(" ") });

      // For streaming mode, MLX-audio plays audio directly via sounddevice
      // We just need to wait for completion and return minimal response
      if (stream) {
        logger.info("MLX-audio streaming mode - audio will play directly via sounddevice");

        // Set ESPEAK_DATA_PATH for Kokoro model
        const env = {
          ...process.env,
          ESPEAK_DATA_PATH: "/opt/homebrew/Cellar/espeak-ng/1.52.0/share/espeak-ng-data",
        };

        // Use inherit for stderr so sounddevice can access audio device properly
        // and we can see any error messages
        const proc = Bun.spawn(args, {
          stdout: "inherit",
          stderr: "inherit",
          env,
        });

        // Wait for streaming to complete
        const exitCode = await proc.exited;

        if (exitCode !== 0) {
          throw new Error(`MLX-audio streaming failed with exit code ${exitCode}`);
        }

        const processingTimeMs = Date.now() - startTime;

        logger.info("MLX-audio streaming complete", {
          processing_time_ms: processingTimeMs,
        });

        // Return minimal response for streaming (audio played directly)
        return {
          audio_data: "", // No audio data returned when streaming
          duration_ms: 0,  // Duration unknown for streaming
          format: "streaming",
          sample_rate: 24000,
        };
      }

      // Non-streaming mode: generate file and return audio data
      // Set ESPEAK_DATA_PATH for Kokoro model
      const env = {
        ...process.env,
        ESPEAK_DATA_PATH: "/opt/homebrew/Cellar/espeak-ng/1.52.0/share/espeak-ng-data",
      };

      const proc = Bun.spawn(args, {
        stdout: "pipe",
        stderr: "pipe",
        env,
      });

      // Wait for completion with timeout
      const timeoutId = setTimeout(() => {
        proc.kill();
      }, this.config.timeout);

      const stderr = await new Promise<string>((resolve) => {
        const reader = proc.stderr!.getReader();
        const chunks: Buffer[] = [];

        const read = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              resolve(Buffer.concat(chunks).toString());
              return;
            }
            if (value) {
              chunks.push(value as Buffer);
            }
            read();
          });
        };
        read();
      });

      const exitCode = await proc.exited;
      clearTimeout(timeoutId);

      if (exitCode !== 0) {
        throw new Error(`MLX-audio CLI exited with code ${exitCode}: ${stderr}`);
      }

      // Find the generated audio file
      const audioFile = `${filePrefix}_000.wav`;
      if (!existsSync(audioFile)) {
        throw new Error(`MLX-audio did not generate expected audio file: ${audioFile}`);
      }

      // Read the audio file
      const audioBuffer = await Bun.file(audioFile).arrayBuffer();
      const audioBytes = new Uint8Array(audioBuffer);

      // Convert to base64 using binary string approach
      let binaryString = "";
      for (let i = 0; i < audioBytes.byteLength; i++) {
        binaryString += String.fromCharCode(audioBytes[i]);
      }
      const base64Audio = btoa(binaryString);

      // Clean up temp file
      try {
        unlinkSync(audioFile);
      } catch {
        logger.warn("Failed to clean up temp file", { path: audioFile });
      }

      const processingTimeMs = Date.now() - startTime;
      const durationMs = Math.round((audioBytes.length / 48000) * 1000); // Approximate for 24kHz mono

      logger.info("MLX-audio TTS synthesis complete", {
        duration_ms: durationMs,
        processing_time_ms: processingTimeMs,
        audio_size_bytes: audioBytes.length,
      });

      return {
        audio_data: base64Audio,
        duration_ms: durationMs,
        format: "wav",
        sample_rate: 24000,
      };

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error("MLX-audio TTS request failed", errorObj);
      throw new Error(`MLX-audio synthesis failed: ${errorObj.message}`);
    }
  }

  /**
   * Check if MLX-audio CLI is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const proc = Bun.spawn(["mlx_audio.tts.generate", "--help"], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;
      const healthy = exitCode === 0;

      logger.debug("MLX-audio CLI health check", { healthy });
      return healthy;
    } catch {
      logger.warn("MLX-audio CLI health check failed");
      return false;
    }
  }

  /**
   * Update configuration
   */
  setConfig(newConfig: Partial<MLXTTSClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info("MLX-audio TTS client config updated", {
      model: this.config.model,
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): MLXTTSClientConfig {
    return { ...this.config };
  }

  /**
   * Synthesize and save audio to file
   * Returns the file path for playback
   */
  async synthesizeToFile(request: TTSRequest): Promise<{ filePath: string; durationMs: number }> {
    const response = await this.synthesize(request);
    const filePath = await this.saveAudioToFile(response.audio_data);
    return {
      filePath,
      durationMs: response.duration_ms,
    };
  }

  /**
   * Decode base64 audio data and save to temporary file
   * Returns the file path for playback
   */
  async saveAudioToFile(audioData: string): Promise<string> {
    // Decode base64
    const binaryString = atob(audioData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create temporary file
    const tempFile = `${tmpdir()}/mlx_tts_${Date.now()}.wav`;
    writeFileSync(tempFile, bytes);

    logger.debug("Saved audio to temporary file", { path: tempFile });

    return tempFile;
  }
}

// Singleton instance
let client: MLXTTSClient | null = null;

/**
 * Get or create MLX-audio TTS client singleton
 */
export function getMLXTTSClient(config?: Partial<MLXTTSClientConfig>): MLXTTSClient {
  if (!client) {
    client = new MLXTTSClient(config);
  }
  return client;
}

/**
 * Reset MLX-audio TTS client (for testing)
 */
export function resetMLXTTSClient(): void {
  client = null;
}
