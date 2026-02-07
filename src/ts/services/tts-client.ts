/**
 * TTS HTTP client
 * Communicates with Python Qwen TTS server
 */

import type { TTSRequest, TTSResponse } from "@/models/tts.js";
import { logger } from "@/utils/logger.js";
import { writeFileSync } from "fs";
import { tmpdir } from "os";

/**
 * TTS client configuration
 */
export interface TTSClientConfig {
  /** Base URL of Python TTS server */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum retries */
  maxRetries: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TTSClientConfig = {
  baseUrl: "http://127.0.0.1:7860",
  timeout: 30000, // 30 seconds - Qwen TTS can take 12-20 seconds
  maxRetries: 1, // Reduce retries since longer timeout reduces likelihood of timeout
  retryDelay: 1000, // 1 second
};

/**
 * TTS client class
 */
export class TTSClient {
  private config: TTSClientConfig;

  constructor(config: Partial<TTSClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Send TTS request to Python server
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const url = `${this.config.baseUrl}/synthesize`;

    logger.debug("Sending TTS request", {
      text: request.text.substring(0, 50),
      voice: request.voice,
    });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`TTS server returned ${response.status}: ${errorText}`);
        }

        const data = (await response.json()) as TTSResponse;

        logger.info("TTS synthesis complete", {
          duration_ms: data.duration_ms,
          format: data.format,
        });

        return data;
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.maxRetries) {
          logger.warn(`TTS request failed, retrying (${attempt + 1}/${this.config.maxRetries})`, {
            error_message: (error as Error).message,
          });
          await this.delay(this.config.retryDelay);
        }
      }
    }

    logger.error("TTS request failed after all retries", lastError || undefined);

    throw new Error(`TTS synthesis failed: ${lastError?.message || "Unknown error"}`);
  }

  /**
   * Check if TTS server is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const healthy = response.ok;
      logger.debug("TTS server health check", { healthy });
      return healthy;
    } catch {
      logger.warn("TTS server health check failed");
      return false;
    }
  }

  /**
   * Get TTS server health status
   */
  async getHealthStatus(): Promise<{ status: string; model_loaded: boolean } | null> {
    try {
      const url = `${this.config.baseUrl}/health`;
      const response = await fetch(url);

      if (response.ok) {
        return await response.json() as { status: string; model_loaded: boolean };
      }
    } catch {
      // Server unavailable
    }
    return null;
  }

  /**
   * Delay for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Stream TTS request - returns audio as it's generated
   * Yields audio chunks for real-time playback
   */
  async *synthesizeStream(request: TTSRequest): AsyncGenerator<Uint8Array> {
    const url = `${this.config.baseUrl}/synthesize_stream`;

    logger.debug("Starting TTS stream", {
      text: request.text.substring(0, 50),
      voice: request.voice,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS server returned ${response.status}: ${errorText}`);
      }

      // Stream the audio chunks
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      logger.debug("Receiving audio stream...");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        logger.debug(`Received audio chunk: ${value.length} bytes`);
        yield value;
      }

      logger.debug("Audio stream complete");

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error("TTS stream error", errorObj);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  setConfig(newConfig: Partial<TTSClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): TTSClientConfig {
    return { ...this.config };
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
    const tempFile = `${tmpdir()}/qwen_tts_${Date.now()}.wav`;
    writeFileSync(tempFile, bytes);

    logger.debug("Saved audio to temporary file", { path: tempFile });

    return tempFile;
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
}

// Singleton instance
let client: TTSClient | null = null;

/**
 * Get or create TTS client singleton
 */
export function getTTSClient(config?: Partial<TTSClientConfig>): TTSClient {
  if (!client) {
    client = new TTSClient(config);
  }
  return client;
}

/**
 * Reset TTS client (for testing)
 */
export function resetTTSClient(): void {
  client = null;
}
