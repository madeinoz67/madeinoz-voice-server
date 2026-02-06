/**
 * Voice configuration types
 * Defines voice personality with prosody settings
 */

/**
 * Prosody settings for voice control
 * Maps numerical parameters to voice characteristics
 */
export interface ProsodySettings {
  /** Speaking consistency (0.0-1.0, higher = more stable) */
  stability: number;
  /** Voice cloning fidelity (0.0-1.0, custom voices only) */
  similarity_boost: number;
  /** Expressiveness level (0.0-1.0) */
  style: number;
  /** Speaking rate multiplier (0.1-2.0) */
  speed: number;
  /** Enhance voice clarity */
  use_speaker_boost: boolean;
  /** Playback volume level (0.0-1.0, optional) */
  volume?: number;
}

/**
 * Voice configuration with personality and prosody
 */
export interface VoiceConfig {
  /** Unique identifier for the voice */
  voice_id: string;
  /** Human-readable name */
  voice_name: string;
  /** Description of the voice characteristics */
  description: string;
  /** Voice type */
  type: "built-in" | "custom" | "cloned";
  /** Speaking stability (0.0-1.0) */
  stability: number;
  /** Voice cloning fidelity (0.0-1.0, custom voices only) */
  similarity_boost: number;
  /** Expressiveness level (0.0-1.0) */
  style: number;
  /** Speaking rate multiplier (0.1-2.0) */
  speed: number;
  /** Enhance voice clarity */
  use_speaker_boost: boolean;
  /** Nested prosody configuration (optional) */
  prosody?: ProsodySettings;
  /** Playback volume level (0.0-1.0, optional) */
  volume?: number;
}

/**
 * Validate voice configuration
 */
export function isValidVoiceConfig(config: Partial<VoiceConfig>): boolean {
  if (!config.voice_id || !config.voice_name) return false;

  // Validate ID format
  if (!/^[a-zA-Z0-9_-]+$/.test(config.voice_id)) return false;

  // Validate numeric ranges
  if (config.stability !== undefined && (config.stability < 0 || config.stability > 1)) return false;
  if (config.similarity_boost !== undefined && (config.similarity_boost < 0 || config.similarity_boost > 1)) return false;
  if (config.style !== undefined && (config.style < 0 || config.style > 1)) return false;
  if (config.speed !== undefined && (config.speed < 0.1 || config.speed > 2)) return false;
  if (config.volume !== undefined && (config.volume < 0 || config.volume > 1)) return false;

  return true;
}

/**
 * Validate prosody settings
 */
export function isValidProsody(settings: Partial<ProsodySettings>): boolean {
  if (settings.stability !== undefined && (settings.stability < 0 || settings.stability > 1)) return false;
  if (settings.similarity_boost !== undefined && (settings.similarity_boost < 0 || settings.similarity_boost > 1)) return false;
  if (settings.style !== undefined && (settings.style < 0 || settings.style > 1)) return false;
  if (settings.speed !== undefined && (settings.speed < 0.1 || settings.speed > 2)) return false;
  if (settings.volume !== undefined && (settings.volume < 0 || settings.volume > 1)) return false;
  return true;
}
