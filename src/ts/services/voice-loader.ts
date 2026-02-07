/**
 * Voice Configuration Loader
 * Parses AGENTPERSONALITIES.md and caches voice configurations
 * Supports numeric voice IDs (1-54) mapped to Kokoro voices
 */

import type { VoiceConfig } from "@/models/voice-config.js";
import { logger } from "@/utils/logger.js";
import { getKokoroVoice, getVoiceInfo, type KokoroVoice } from "@/constants/KOKORO_VOICES.js";

/**
 * Voice registry entry from AGENTPERSONALITIES.md
 */
interface VoiceRegistryEntry {
  name: string;
  voice_id: string;
  characteristics: string[];
  description: string;
  prosody?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    speed?: number;
    use_speaker_boost?: boolean;
  };
}

/**
 * Parsed AGENTPERSONALITIES.md structure
 */
interface AgentPersonalities {
  voice_mappings: {
    voice_registry: Record<string, VoiceRegistryEntry>;
    default: string;
    default_voice_id: string;
  };
}

/**
 * Voice loader cache
 */
interface VoiceCache {
  voices: Map<string, VoiceConfig>;
  defaultVoiceId: string;
  lastLoaded: number;
}

/**
 * Voice loader service
 * Loads and caches voice configurations from AGENTPERSONALITIES.md
 * Supports numeric voice IDs (1-54) for Kokoro voices
 */
class VoiceLoaderService {
  private cache: VoiceCache | null = null;
  private cachePath: string;
  private personalitiesPath: string;

  constructor() {
    // Path to AGENTPERSONALITIES.md in PAI skills
    this.personalitiesPath = `${process.env.HOME}/.claude/skills/Agents/AgentPersonalities.md`;
    this.cachePath = `${process.env.HOME}/.claude/skills/Agents/Data/Traits.yaml`;
  }

  /**
   * Resolve voice_id to Kokoro voice name
   * @param voiceId - Numeric voice ID (1-54) or string identifier
   * @returns Kokoro voice preset name (e.g., "af_heart")
   */
  resolveKokoroVoice(voiceId: string): string {
    return getKokoroVoice(voiceId);
  }

  /**
   * Get voice information for a numeric ID
   * @param voiceId - Numeric voice ID (1-54)
   * @returns Voice info or undefined
   */
  getVoiceInfo(voiceId: string): KokoroVoice | undefined {
    return getVoiceInfo(voiceId);
  }

  /**
   * Get all available Kokoro voices
   * @returns Array of all Kokoro voice information
   */
  getAllKokoroVoices(): readonly KokoroVoice[] {
    const { KOKORO_VOICES } = require("@/constants/KOKORO_VOICES.js");
    return KOKORO_VOICES;
  }

  /**
   * Load voice configurations from AGENTPERSONALITIES.md
   */
  async loadVoices(): Promise<Map<string, VoiceConfig>> {
    // Return cached voices if available and recent (< 5 minutes old)
    if (this.cache && Date.now() - this.cache.lastLoaded < 300000) {
      logger.debug("Using cached voice configurations");
      return this.cache.voices;
    }

    logger.info("Loading voice configurations from AGENTPERSONALITIES.md");

    try {
      // For now, return a basic voice mapping
      // TODO: Implement full AGENTPERSONALITIES.md parser
      const voices = new Map<string, VoiceConfig>();

      // Default voices based on Traits.yaml
      voices.set("marrvin", {
        voice_id: "marrvin",
        voice_name: "Default",
        description: "Default voice",
        type: "built-in",
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        speed: 1.0,
        use_speaker_boost: true,
      });

      voices.set("marlin", {
        voice_id: "marlin",
        voice_name: "Marlin",
        description: "Alternative voice",
        type: "built-in",
        stability: 0.6,
        similarity_boost: 0.75,
        style: 0.1,
        speed: 1.0,
        use_speaker_boost: true,
      });

      voices.set("daniel", {
        voice_id: "daniel",
        voice_name: "Daniel",
        description: "Daniel voice",
        type: "built-in",
        stability: 0.7,
        similarity_boost: 0.85,
        style: 0.1,
        speed: 0.95,
        use_speaker_boost: true,
      });

      // Cache the voices
      this.cache = {
        voices,
        defaultVoiceId: "marrvin",
        lastLoaded: Date.now(),
      };

      logger.info(`Loaded ${voices.size} voice configurations`);
      return voices;
    } catch (error) {
      logger.error("Failed to load voice configurations", error as Error);
      // Return empty map on error
      return new Map();
    }
  }

  /**
   * Get a specific voice configuration by ID
   */
  async getVoice(voiceId: string): Promise<VoiceConfig | undefined> {
    const voices = await this.loadVoices();
    return voices.get(voiceId);
  }

  /**
   * Get the default voice ID
   */
  async getDefaultVoiceId(): Promise<string> {
    if (!this.cache) {
      await this.loadVoices();
    }
    return this.cache?.defaultVoiceId || "marrvin";
  }

  /**
   * Get all available voice IDs
   */
  async getAvailableVoices(): Promise<string[]> {
    const voices = await this.loadVoices();
    return Array.from(voices.keys());
  }

  /**
   * Clear the voice cache (force reload on next access)
   */
  clearCache(): void {
    logger.debug("Clearing voice cache");
    this.cache = null;
  }
}

/**
 * Global voice loader instance
 */
let voiceLoaderInstance: VoiceLoaderService | null = null;

/**
 * Get the voice loader service instance
 */
export function getVoiceLoader(): VoiceLoaderService {
  if (!voiceLoaderInstance) {
    voiceLoaderInstance = new VoiceLoaderService();
  }
  return voiceLoaderInstance;
}

/**
 * Export types for use in other modules
 */
export type { VoiceRegistryEntry, AgentPersonalities, VoiceCache };
