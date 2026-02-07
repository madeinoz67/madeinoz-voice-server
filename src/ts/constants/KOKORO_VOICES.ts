/**
 * Kokoro-82M Voice Index
 * Numeric voice IDs for easy agent configuration
 *
 * Usage: Set voice_id to any number 1-54 in agent config
 * Example: voice_id: "1" = af_heart (American Female, Warm)
 *
 * Voice Naming Convention:
 * - af_XX = American Female
 * - am_XX = American Male
 * - bf_XX = British Female
 * - bm_XX = British Male
 * - jf_XX/jm_XX = Japanese Female/Male
 * - zf_XX/zm_XX = Chinese Female/Male
 */

export interface KokoroVoice {
  id: number;
  name: string;
  gender: "male" | "female";
  accent: "american" | "british" | "japanese" | "chinese";
  description: string;
}

/**
 * Complete Kokoro-82M voice index (54 voices)
 * Ordered by language and gender for easy navigation
 */
export const KOKORO_VOICES: readonly KokoroVoice[] = [
  // ===== AMERICAN FEMALE (1-11) =====
  { id: 1, name: "af_heart", gender: "female", accent: "american", description: "Warm, friendly" },
  { id: 2, name: "af_bella", gender: "female", accent: "american", description: "Elegant, refined" },
  { id: 3, name: "af_nicole", gender: "female", accent: "american", description: "Professional" },
  { id: 4, name: "af_sky", gender: "female", accent: "american", description: "Bright, energetic" },
  { id: 5, name: "af_sarah", gender: "female", accent: "american", description: "Clear, articulate" },
  { id: 6, name: "af_jessica", gender: "female", accent: "american", description: "Expressive" },
  { id: 7, name: "af_kore", gender: "female", accent: "american", description: "Soft, gentle" },
  { id: 8, name: "af_nova", gender: "female", accent: "american", description: "Artistic, dreamy" },
  { id: 9, name: "af_alloy", gender: "female", accent: "american", description: "Modern, crisp" },
  { id: 10, name: "af_aoede", gender: "female", accent: "american", description: "Musical, lyrical" },
  { id: 11, name: "af_river", gender: "female", accent: "american", description: "Flowing, calm" },

  // ===== AMERICAN MALE (12-20) =====
  { id: 12, name: "am_michael", gender: "male", accent: "american", description: "Professional, grounded" },
  { id: 13, name: "am_adam", gender: "male", accent: "american", description: "Youthful, energetic" },
  { id: 14, name: "am_eric", gender: "male", accent: "american", description: "Friendly, warm" },
  { id: 15, name: "am_liam", gender: "male", accent: "american", description: "Clear, confident" },
  { id: 16, name: "am_fenrir", gender: "male", accent: "american", description: "Deep, authoritative" },
  { id: 17, name: "am_echo", gender: "male", accent: "american", description: "Resonant" },
  { id: 18, name: "am_onyx", gender: "male", accent: "american", description: "Bold, strong" },
  { id: 19, name: "am_puck", gender: "male", accent: "american", description: "Playful" },
  { id: 20, name: "am_santa", gender: "male", accent: "american", description: "Jolly, warm" },

  // ===== BRITISH FEMALE (21-24) =====
  { id: 21, name: "bf_emma", gender: "female", accent: "british", description: "Sophisticated, RP accent" },
  { id: 22, name: "bf_isabella", gender: "female", accent: "british", description: "Elegant, proper" },
  { id: 23, name: "bf_alice", gender: "female", accent: "british", description: "Clear, educated" },
  { id: 24, name: "bf_lily", gender: "female", accent: "british", description: "Soft, gentle" },

  // ===== BRITISH MALE (25-28) =====
  { id: 25, name: "bm_george", gender: "male", accent: "british", description: "Authoritative, RP" },
  { id: 26, name: "bm_lewis", gender: "male", accent: "british", description: "Confident, articulate" },
  { id: 27, name: "bm_daniel", gender: "male", accent: "british", description: "Professional, clear" },
  { id: 28, name: "bm_fable", gender: "male", accent: "british", description: "Storyteller, warm" },

  // ===== JAPANESE FEMALE (29-32) =====
  { id: 29, name: "jf_alpha", gender: "female", accent: "japanese", description: "Standard Japanese female" },
  { id: 30, name: "jf_gongitsune", gender: "female", accent: "japanese", description: "Character voice" },
  { id: 31, name: "jf_nezumi", gender: "female", accent: "japanese", description: "Character voice" },
  { id: 32, name: "jf_tebukuro", gender: "female", accent: "japanese", description: "Character voice" },

  // ===== JAPANESE MALE (33) =====
  { id: 33, name: "jm_kumo", gender: "male", accent: "japanese", description: "Standard Japanese male" },

  // ===== CHINESE FEMALE (34-41) =====
  { id: 34, name: "zf_xiaoxiao", gender: "female", accent: "chinese", description: "Standard Chinese female" },
  { id: 35, name: "zf_xiaobei", gender: "female", accent: "chinese", description: "Soft, gentle" },
  { id: 36, name: "zf_xiaoni", gender: "female", accent: "chinese", description: "Young, bright" },
  { id: 37, name: "zf_xiaoyi", gender: "female", accent: "chinese", description: "Clear, articulate" },
  { id: 38, name: "zm_yunjian", gender: "male", accent: "chinese", description: "Standard Chinese male" },
  { id: 39, name: "zm_yunxi", gender: "male", accent: "chinese", description: "Warm, friendly" },
  { id: 40, name: "zm_yunxia", gender: "male", accent: "chinese", description: "Gentle" },
  { id: 41, name: "zm_yunyang", gender: "male", accent: "chinese", description: "Energetic" },
] as const;

/**
 * Map numeric voice ID to Kokoro voice name
 * @param voiceId - Numeric voice ID (1-54)
 * @returns Kokoro voice name or default "af_heart"
 */
export function getKokoroVoice(voiceId: string | number): string {
  const id = typeof voiceId === "string" ? parseInt(voiceId, 10) : voiceId;

  if (isNaN(id) || id < 1 || id > KOKORO_VOICES.length) {
    return KOKORO_VOICES[0].name; // Default to af_heart (ID 1)
  }

  // Array is 0-indexed, voice IDs start at 1
  return KOKORO_VOICES[id - 1].name;
}

/**
 * Get voice info by numeric ID
 * @param voiceId - Numeric voice ID (1-54)
 * @returns Voice info or undefined
 */
export function getVoiceInfo(voiceId: string | number): KokoroVoice | undefined {
  const id = typeof voiceId === "string" ? parseInt(voiceId, 10) : voiceId;

  if (isNaN(id) || id < 1 || id > KOKORO_VOICES.length) {
    return undefined;
  }

  return KOKORO_VOICES[id - 1];
}

/**
 * Get all available voices
 */
export function getAllVoices(): readonly KokoroVoice[] {
  return KOKORO_VOICES;
}

/**
 * Get voices by filter criteria
 */
export function filterVoices(criteria: {
  gender?: "male" | "female";
  accent?: "american" | "british" | "japanese" | "chinese";
}): readonly KokoroVoice[] {
  return KOKORO_VOICES.filter((voice) => {
    if (criteria.gender && voice.gender !== criteria.gender) return false;
    if (criteria.accent && voice.accent !== criteria.accent) return false;
    return true;
  });
}

/**
 * Default voice ID (af_heart - warm, friendly American female)
 */
export const DEFAULT_VOICE_ID = 1;
