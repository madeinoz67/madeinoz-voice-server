/**
 * Audio file validation utilities
 */

import { readFileSync } from "fs";
import { logger } from "@/utils/logger.js";

/**
 * WAV file header constants
 */
const WAV_RIFF_HEADER = "RIFF";
const WAV_WAVE_HEADER = "WAVE";
const WAV_FMT_CHUNK = "fmt ";
const WAV_DATA_CHUNK = "data";

/**
 * Validation constraints
 */
export const AUDIO_CONSTRAINTS = {
  /** Minimum duration in seconds */
  MIN_DURATION_SECONDS: 3,
  /** Maximum duration in seconds */
  MAX_DURATION_SECONDS: 10,
  /** Target sample rate in Hz */
  TARGET_SAMPLE_RATE: 24000,
  /** Acceptable sample rate range */
  MIN_SAMPLE_RATE: 16000,
  MAX_SAMPLE_RATE: 48000,
  /** Maximum file size in bytes (10 MB) */
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
} as const;

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    format: "wav" | "mp3";
    duration_seconds: number;
    sample_rate: number;
    file_size_bytes: number;
  };
}

/**
 * Parse WAV file header to extract metadata
 */
function parseWavHeader(buffer: Buffer): {
  sample_rate: number;
  duration_seconds: number;
} | null {
  try {
    // Check RIFF header
    if (buffer.slice(0, 4).toString("ascii") !== WAV_RIFF_HEADER) {
      return null;
    }

    // Check WAVE format
    if (buffer.slice(8, 12).toString("ascii") !== WAV_WAVE_HEADER) {
      return null;
    }

    // Find fmt chunk
    let offset = 12;
    let sample_rate = 0;
    let num_channels = 0;
    let bits_per_sample = 0;
    let data_chunk_size = 0;

    while (offset < buffer.length - 8) {
      const chunkId = buffer.slice(offset, offset + 4).toString("ascii");
      const chunkSize = buffer.readUInt32LE(offset + 4);

      if (chunkId === WAV_FMT_CHUNK) {
        // Read format chunk
        sample_rate = buffer.readUInt32LE(offset + 12);
        num_channels = buffer.readUInt16LE(offset + 8);
        bits_per_sample = buffer.readUInt16LE(offset + 22);
      } else if (chunkId === WAV_DATA_CHUNK) {
        data_chunk_size = chunkSize;
        break;
      }

      // Move to next chunk (align to 2-byte boundary)
      offset += 8 + chunkSize;
      if (chunkSize % 2 !== 0) {
        offset += 1;
      }
    }

    if (sample_rate === 0 || data_chunk_size === 0) {
      return null;
    }

    // Calculate duration
    const bytes_per_sample = (bits_per_sample / 8) * num_channels;
    const num_samples = data_chunk_size / bytes_per_sample;
    const duration_seconds = num_samples / sample_rate;

    return { sample_rate, duration_seconds };
  } catch (error) {
    logger.warn("Error parsing WAV header", { error: (error as Error).message });
    return null;
  }
}

/**
 * Validate audio file for voice upload
 *
 * Checks:
 * - File format (WAV required)
 * - Duration (3-10 seconds)
 * - Sample rate (target 24kHz, acceptable 16-48kHz)
 * - File size (max 10MB)
 */
export function validateAudioFile(filePath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Read file
    const buffer = readFileSync(filePath);
    const file_size_bytes = buffer.length;

    // Check file size
    if (file_size_bytes > AUDIO_CONSTRAINTS.MAX_FILE_SIZE_BYTES) {
      errors.push(
        `File too large: ${(file_size_bytes / 1024 / 1024).toFixed(2)} MB exceeds maximum of ${
          AUDIO_CONSTRAINTS.MAX_FILE_SIZE_BYTES / 1024 / 1024
        } MB`
      );
    }

    // Check WAV format
    const wavMetadata = parseWavHeader(buffer);
    if (!wavMetadata) {
      errors.push("Invalid WAV file format");
      return {
        valid: false,
        errors,
        warnings,
        metadata: {
          format: "wav",
          duration_seconds: 0,
          sample_rate: 0,
          file_size_bytes,
        },
      };
    }

    const { sample_rate, duration_seconds } = wavMetadata;

    // Check duration
    if (duration_seconds < AUDIO_CONSTRAINTS.MIN_DURATION_SECONDS) {
      errors.push(
        `Audio too short: ${duration_seconds.toFixed(2)}s (minimum ${AUDIO_CONSTRAINTS.MIN_DURATION_SECONDS}s)`
      );
    } else if (duration_seconds > AUDIO_CONSTRAINTS.MAX_DURATION_SECONDS) {
      errors.push(
        `Audio too long: ${duration_seconds.toFixed(2)}s (maximum ${AUDIO_CONSTRAINTS.MAX_DURATION_SECONDS}s)`
      );
    }

    // Check sample rate
    if (sample_rate < AUDIO_CONSTRAINTS.MIN_SAMPLE_RATE || sample_rate > AUDIO_CONSTRAINTS.MAX_SAMPLE_RATE) {
      errors.push(
        `Sample rate out of range: ${sample_rate} Hz (acceptable ${AUDIO_CONSTRAINTS.MIN_SAMPLE_RATE}-${AUDIO_CONSTRAINTS.MAX_SAMPLE_RATE} Hz)`
      );
    } else if (sample_rate !== AUDIO_CONSTRAINTS.TARGET_SAMPLE_RATE) {
      warnings.push(
        `Sample rate ${sample_rate} Hz differs from target ${AUDIO_CONSTRAINTS.TARGET_SAMPLE_RATE} Hz (may affect quality)`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        format: "wav",
        duration_seconds,
        sample_rate,
        file_size_bytes,
      },
    };
  } catch (error) {
    errors.push(`Failed to read audio file: ${(error as Error).message}`);
    return { valid: false, errors, warnings };
  }
}
