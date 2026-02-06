/**
 * TTS request/response types
 * Internal communication with Qwen TTS service
 */

/**
 * Internal request to Qwen TTS inference service
 */
export interface TTSRequest {
  /** Sanitized text to synthesize */
  text: string;
  /** Qwen voice identifier or reference label */
  voice: string;
  /** Natural language prosody description */
  prosody_instruction: string;
  /** Speed multiplier */
  speed: number;
  /** Audio output format */
  output_format?: "wav" | "mp3";
}

/**
 * Response from Qwen TTS inference service
 */
export interface TTSResponse {
  /** Raw audio bytes (base64 encoded in JSON) */
  audio_data: string;
  /** Audio duration in milliseconds */
  duration_ms: number;
  /** Audio sample rate (typically 24000 Hz) */
  sample_rate: number;
  /** Audio format */
  format: "wav" | "mp3";
}

/**
 * TTS error response
 */
export interface TTSErrorResponse {
  status: "error";
  message: string;
  error_code?: string;
}

/**
 * Validate TTS request
 */
export function isValidTTSRequest(request: Partial<TTSRequest>): boolean {
  if (!request.text || request.text.trim().length === 0) return false;
  if (!request.voice) return false;
  if (!request.prosody_instruction) return false;
  if (request.speed !== undefined && (request.speed < 0.5 || request.speed > 2)) return false;
  return true;
}
