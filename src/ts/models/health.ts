/**
 * Health status types
 * Server health and configuration monitoring
 */

/**
 * Python subprocess status
 */
export type SubprocessStatus = "running" | "stopped" | "crashed";

/**
 * Voice system type
 */
export type VoiceSystemType = "Qwen TTS" | "macOS Say" | "Unavailable";

/**
 * Overall server health status
 */
export type HealthStatusValue = "healthy" | "degraded" | "unhealthy";

/**
 * Server health and configuration status
 */
export interface HealthStatus {
  /** Overall health status */
  status: HealthStatusValue;
  /** Server port number */
  port: number;
  /** Voice system type */
  voice_system: VoiceSystemType;
  /** Configured default voice */
  default_voice_id: string;
  /** Whether Qwen model is loaded */
  model_loaded: boolean;
  /** Whether API key exists (for compatibility, always false) */
  api_key_configured: boolean;
  /** Python subprocess status */
  python_subprocess: SubprocessStatus;
  /** Available voice IDs (optional) */
  available_voices?: string[];
}

/**
 * Create default health status
 */
export function createDefaultHealthStatus(): HealthStatus {
  return {
    status: "healthy",
    port: 8888,
    voice_system: "Unavailable",
    default_voice_id: "marrvin",
    model_loaded: false,
    api_key_configured: false,
    python_subprocess: "stopped",
  };
}
