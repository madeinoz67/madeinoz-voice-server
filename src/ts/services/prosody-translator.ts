/**
 * Prosody translator service
 * Maps ElevenLabs numerical parameters to Qwen natural language instructions
 */

import type { ProsodySettings } from "@/models/voice-config.js";
import { logger } from "@/utils/logger.js";

/**
 * Stability level descriptions
 */
const STABILITY_DESCRIPTIONS: Record<string, string> = {
  low: "speak with variation and emotion",
  medium: "speak with moderate consistency",
  high: "speak in a very consistent and stable manner",
};

/**
 * Style level descriptions
 */
const STYLE_DESCRIPTIONS: Record<string, string> = {
  none: "speak in a neutral tone",
  low: "speak with slight expressiveness",
  medium: "speak with moderate emotion and expression",
  high: "speak with high expressiveness and emotion",
};

/**
 * Speed descriptions
 */
const SPEED_DESCRIPTIONS: Record<string, string> = {
  very_slow: "speak very slowly",
  slow: "speak slowly",
  normal: "speak at a normal pace",
  fast: "speak quickly",
  very_fast: "speak very quickly",
};

/**
 * Get stability description from numerical value
 */
function getStabilityDescription(stability: number): string {
  if (stability < 0.3) return STABILITY_DESCRIPTIONS.low;
  if (stability < 0.7) return STABILITY_DESCRIPTIONS.medium;
  return STABILITY_DESCRIPTIONS.high;
}

/**
 * Get style description from numerical value
 */
function getStyleDescription(style: number): string {
  if (style < 0.2) return STYLE_DESCRIPTIONS.none;
  if (style < 0.5) return STYLE_DESCRIPTIONS.low;
  if (style < 0.8) return STYLE_DESCRIPTIONS.medium;
  return STYLE_DESCRIPTIONS.high;
}

/**
 * Get speed description from numerical value
 */
function getSpeedDescription(speed: number): string {
  if (speed < 0.5) return SPEED_DESCRIPTIONS.very_slow;
  if (speed < 0.8) return SPEED_DESCRIPTIONS.slow;
  if (speed < 1.2) return SPEED_DESCRIPTIONS.normal;
  if (speed < 1.6) return SPEED_DESCRIPTIONS.fast;
  return SPEED_DESCRIPTIONS.very_fast;
}

/**
 * Translate numerical prosody settings to natural language instruction
 */
export function translateProsody(prosody: ProsodySettings): string {
  const parts: string[] = [];

  // Add stability
  if (prosody.stability !== undefined) {
    parts.push(getStabilityDescription(prosody.stability));
  }

  // Add style
  if (prosody.style !== undefined) {
    parts.push(getStyleDescription(prosody.style));
  }

  // Add speed (last, as it affects pacing)
  if (prosody.speed !== undefined) {
    parts.push(getSpeedDescription(prosody.speed));
  }

  // Combine into instruction
  const instruction = parts.join(", ");

  logger.debug("Translated prosody", {
    input: prosody,
    output: instruction,
  });

  return instruction;
}

/**
 * Create prosody instruction with voice context
 */
export function createProsodyInstruction(prosody: ProsodySettings, voiceContext?: string): string {
  let instruction = translateProsody(prosody);

  if (voiceContext) {
    instruction = `${instruction}, ${voiceContext}`;
  }

  return instruction;
}

/**
 * Default prosody settings
 */
export const DEFAULT_PROSODY: ProsodySettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  speed: 1.0,
  use_speaker_boost: true,
};

/**
 * Get default prosody instruction
 */
export function getDefaultProsodyInstruction(): string {
  return translateProsody(DEFAULT_PROSODY);
}
