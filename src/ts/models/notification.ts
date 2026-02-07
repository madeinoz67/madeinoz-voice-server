/**
 * Notification request/response types
 * API contract for voice notification endpoints
 */

import type { ProsodySettings } from "@/models/voice-config.js";

/**
 * Incoming request for voice notification
 */
export interface NotificationRequest {
  /** Notification title (max 100 chars) - optional for backward compatibility */
  title?: string;
  /** Text to synthesize (max 500 chars) */
  message: string;
  /** Whether to play audio (default: true) */
  voice_enabled?: boolean;
  /** Voice identifier to use */
  voice_id?: string;
  /** Alias for voice_id */
  voice_name?: string;
  /** Override voice prosody */
  voice_settings?: ProsodySettings;
  /** Override playback volume (0.0-1.0) */
  volume?: number;
}

/**
 * Simplified PAI notification request
 */
export interface PaiNotificationRequest {
  /** Notification title (max 100 chars) */
  title: string;
  /** Text to synthesize (max 500 chars) */
  message: string;
}

/**
 * Success response
 */
export interface SuccessResponse {
  status: "success";
  message: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
  status: "error";
  message: string;
}

/**
 * Validate notification request
 */
export function isValidNotificationRequest(request: Partial<NotificationRequest>): boolean {
  // Required fields (title is optional for backward compatibility)
  if (!request.message) return false;

  // Length validation
  if (request.title && request.title.length > 100) return false;
  if (request.message.length > 500) return false;

  // Can only specify one of voice_id or voice_name
  if (request.voice_id && request.voice_name) return false;

  return true;
}
