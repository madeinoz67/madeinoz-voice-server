/**
 * Voice upload and storage types
 */

/**
 * Voice metadata stored with each uploaded voice
 */
export interface VoiceMetadata {
  /** Unique voice identifier (UUID or custom name) */
  id: string;
  /** Display name for the voice */
  name: string;
  /** Optional description of the voice */
  description?: string;
  /** Audio file format (wav, mp3) */
  format: "wav" | "mp3";
  /** Duration in seconds */
  duration_seconds: number;
  /** Sample rate in Hz */
  sample_rate: number;
  /** File size in bytes */
  file_size_bytes: number;
  /** Timestamp when voice was uploaded */
  created_at: string;
  /** Path to the audio file */
  file_path: string;
  /** Path to the metadata JSON file */
  metadata_path: string;
}

/**
 * Voice upload request
 */
export interface VoiceUploadRequest {
  /** Display name for the voice */
  name: string;
  /** Optional description */
  description?: string;
}

/**
 * Voice upload response
 */
export interface VoiceUploadResponse {
  status: "success" | "error";
  message: string;
  voice?: VoiceMetadata;
}

/**
 * Voice list item (returned by GET /voices)
 */
export interface VoiceListItem {
  id: string;
  name: string;
  description?: string;
  format: "wav" | "mp3";
  duration_seconds: number;
  created_at: string;
}

/**
 * Voice list response
 */
export interface VoiceListResponse {
  status: "success" | "error";
  voices?: VoiceListItem[];
  message?: string;
}

/**
 * Voice delete response
 */
export interface VoiceDeleteResponse {
  status: "success" | "error";
  message: string;
}
