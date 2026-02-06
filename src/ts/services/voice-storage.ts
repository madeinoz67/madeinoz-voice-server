/**
 * Voice storage service
 * Manages custom voice uploads in ~/.claude/voices/
 */

import type {
  VoiceMetadata,
  VoiceListItem,
  VoiceUploadRequest,
} from "@/models/voice-upload.js";
import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { validateAudioFile } from "@/utils/audio-validator.js";
import { logger } from "@/utils/logger.js";

/**
 * Voice storage configuration
 */
const VOICES_DIR = join(process.env.HOME || "", ".claude", "voices");
const METADATA_SUFFIX = ".metadata.json";

/**
 * Ensure voices directory exists
 */
function ensureVoicesDirectory(): void {
  try {
    mkdirSync(VOICES_DIR, { recursive: true });
  } catch (error) {
    logger.warn("Failed to create voices directory", {
      error: (error as Error).message,
    });
  }
}

/**
 * Get all voices from storage
 */
export function listVoices(): VoiceListItem[] {
  ensureVoicesDirectory();

  const voices: VoiceListItem[] = [];

  try {
    const files = readdirSync(VOICES_DIR);
    const metadataFiles = files.filter((f) => f.endsWith(METADATA_SUFFIX));

    for (const metadataFile of metadataFiles) {
      try {
        const metadataPath = join(VOICES_DIR, metadataFile);
        const content = readFileSync(metadataPath, "utf-8");
        const metadata = JSON.parse(content) as VoiceMetadata;

        voices.push({
          id: metadata.id,
          name: metadata.name,
          description: metadata.description,
          format: metadata.format,
          duration_seconds: metadata.duration_seconds,
          created_at: metadata.created_at,
        });
      } catch (error) {
        logger.warn("Failed to read voice metadata", {
          file: metadataFile,
          error: (error as Error).message,
        });
      }
    }

    logger.debug(`Listed ${voices.length} voices from storage`);
  } catch (error) {
    logger.error("Failed to list voices", error as Error);
  }

  return voices;
}

/**
 * Get voice metadata by ID
 */
export function getVoice(voiceId: string): VoiceMetadata | null {
  ensureVoicesDirectory();

  try {
    const metadataPath = join(VOICES_DIR, `${voiceId}${METADATA_SUFFIX}`);
    const content = readFileSync(metadataPath, "utf-8");
    return JSON.parse(content) as VoiceMetadata;
  } catch {
    logger.warn("Voice not found", { voiceId });
    return null;
  }
}

/**
 * Save uploaded voice to storage
 *
 * Process:
 * 1. Validate audio file
 * 2. Generate unique ID
 * 3. Save audio file with ID as filename
 * 4. Save metadata JSON
 *
 * @param audioFilePath Path to uploaded audio file
 * @param request Voice upload request
 * @returns Saved voice metadata or null if validation failed
 */
export function saveVoice(
  audioFilePath: string,
  request: VoiceUploadRequest
): VoiceMetadata | null {
  ensureVoicesDirectory();

  // Validate audio file
  const validation = validateAudioFile(audioFilePath);

  if (!validation.valid) {
    logger.warn("Voice upload validation failed", {
      errors: validation.errors,
      warnings: validation.warnings,
    });
    return null;
  }

  if (!validation.metadata) {
    logger.error("Validation metadata missing");
    return null;
  }

  const { format, duration_seconds, sample_rate, file_size_bytes } = validation.metadata;

  // Generate unique ID
  const voiceId = randomUUID();
  const audioFileName = `${voiceId}.${format}`;
  const audioFilePathDest = join(VOICES_DIR, audioFileName);
  const metadataFileName = `${voiceId}${METADATA_SUFFIX}`;
  const metadataFilePath = join(VOICES_DIR, metadataFileName);

  // Create metadata
  const metadata: VoiceMetadata = {
    id: voiceId,
    name: request.name,
    description: request.description,
    format,
    duration_seconds,
    sample_rate,
    file_size_bytes,
    created_at: new Date().toISOString(),
    file_path: audioFilePathDest,
    metadata_path: metadataFilePath,
  };

  try {
    // Copy audio file to destination
    const audioData = readFileSync(audioFilePath);
    writeFileSync(audioFilePathDest, audioData);

    // Save metadata
    writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));

    logger.info("Voice saved successfully", {
      id: voiceId,
      name: metadata.name,
      duration: duration_seconds,
    });

    return metadata;
  } catch (error) {
    logger.error("Failed to save voice", error as Error);

    // Clean up on error
    try {
      unlinkSync(audioFilePathDest);
    } catch {}
    try {
      unlinkSync(metadataFilePath);
    } catch {}

    return null;
  }
}

/**
 * Delete voice from storage
 *
 * Removes both audio file and metadata file.
 *
 * @param voiceId Voice ID to delete
 * @returns true if deleted, false if not found or error
 */
export function deleteVoice(voiceId: string): boolean {
  ensureVoicesDirectory();

  try {
    const metadata = getVoice(voiceId);
    if (!metadata) {
      logger.warn("Voice not found for deletion", { voiceId });
      return false;
    }

    // Delete audio file
    unlinkSync(metadata.file_path);

    // Delete metadata file
    unlinkSync(metadata.metadata_path);

    logger.info("Voice deleted successfully", { voiceId, name: metadata.name });
    return true;
  } catch (error) {
    logger.error("Failed to delete voice", error as Error, { voiceId });
    return false;
  }
}
