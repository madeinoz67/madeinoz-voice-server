/**
 * Model validation tests
 */

import { describe, test, expect } from "bun:test";
import { isValidNotificationRequest } from "@/models/notification.js";
import { isValidTTSRequest } from "@/models/tts.js";
import {
  isValidVoiceConfig,
  isValidProsody,
} from "@/models/voice-config.js";
import { isValidPronunciationRule } from "@/models/pronunciation.js";
import type { NotificationRequest } from "@/models/notification.js";
import type { TTSRequest } from "@/models/tts.js";
import type { VoiceConfig, ProsodySettings } from "@/models/voice-config.js";
import type { PronunciationRule } from "@/models/pronunciation.js";

describe("NotificationRequest validation", () => {
  describe("isValidNotificationRequest", () => {
    test("should validate correct request", () => {
      const request: NotificationRequest = {
        message: "Test notification",
        voice_id: "marrvin",
      };
      expect(isValidNotificationRequest(request)).toBe(true);
    });

    test("should validate request with just message (minimal)", () => {
      const request: NotificationRequest = {
        message: "Test notification",
      };
      expect(isValidNotificationRequest(request)).toBe(true);
    });

    test("should require message", () => {
      const request = { voice_id: "marrvin" } as Partial<NotificationRequest>;
      expect(isValidNotificationRequest(request as NotificationRequest)).toBe(false);
    });

    test("should allow optional title", () => {
      const request: NotificationRequest = {
        message: "Test",
        title: "Test Title",
      };
      expect(isValidNotificationRequest(request)).toBe(true);
    });

    test("should reject title over 100 chars", () => {
      const request: NotificationRequest = {
        message: "Test",
        title: "a".repeat(101),
      };
      expect(isValidNotificationRequest(request)).toBe(false);
    });

    test("should reject message over 500 chars", () => {
      const request: NotificationRequest = {
        message: "a".repeat(501),
      };
      expect(isValidNotificationRequest(request)).toBe(false);
    });

    test("should reject both voice_id and voice_name specified", () => {
      const request: NotificationRequest = {
        message: "Test",
        voice_id: "marrvin",
        voice_name: "marvin",
      };
      expect(isValidNotificationRequest(request)).toBe(false);
    });

    test("should allow voice_id alone", () => {
      const request: NotificationRequest = {
        message: "Test",
        voice_id: "marrvin",
      };
      expect(isValidNotificationRequest(request)).toBe(true);
    });

    test("should allow voice_name alone", () => {
      const request: NotificationRequest = {
        message: "Test",
        voice_name: "marvin",
      };
      expect(isValidNotificationRequest(request)).toBe(true);
    });
  });
});

describe("TTSRequest validation", () => {
  describe("isValidTTSRequest", () => {
    test("should validate correct request", () => {
      const request: TTSRequest = {
        text: "Hello world",
        voice: "marrvin",
        prosody_instruction: "speak normally",
        speed: 1.0,
      };
      expect(isValidTTSRequest(request)).toBe(true);
    });

    test("should require text", () => {
      const request = {
        voice: "marrvin",
        prosody_instruction: "speak normally",
      } as Partial<TTSRequest>;
      expect(isValidTTSRequest(request as TTSRequest)).toBe(false);
    });

    test("should require voice", () => {
      const request = {
        text: "Hello",
        prosody_instruction: "speak normally",
      } as Partial<TTSRequest>;
      expect(isValidTTSRequest(request as TTSRequest)).toBe(false);
    });

    test("should require prosody_instruction", () => {
      const request = {
        text: "Hello",
        voice: "marrvin",
      } as Partial<TTSRequest>;
      expect(isValidTTSRequest(request as TTSRequest)).toBe(false);
    });

    test("should reject empty text", () => {
      const request: TTSRequest = {
        text: "",
        voice: "marrvin",
        prosody_instruction: "speak normally",
      };
      expect(isValidTTSRequest(request)).toBe(false);
    });

    test("should reject whitespace-only text", () => {
      const request: TTSRequest = {
        text: "   ",
        voice: "marrvin",
        prosody_instruction: "speak normally",
      };
      expect(isValidTTSRequest(request)).toBe(false);
    });

    test("should allow optional output_format", () => {
      const request: TTSRequest = {
        text: "Hello",
        voice: "marrvin",
        prosody_instruction: "speak normally",
        output_format: "wav",
      };
      expect(isValidTTSRequest(request)).toBe(true);
    });

    test("should reject speed below 0.5", () => {
      const request: TTSRequest = {
        text: "Hello",
        voice: "marrvin",
        prosody_instruction: "speak normally",
        speed: 0.4,
      };
      expect(isValidTTSRequest(request)).toBe(false);
    });

    test("should reject speed above 2.0", () => {
      const request: TTSRequest = {
        text: "Hello",
        voice: "marrvin",
        prosody_instruction: "speak normally",
        speed: 2.1,
      };
      expect(isValidTTSRequest(request)).toBe(false);
    });
  });
});

describe("ProsodySettings validation", () => {
  describe("isValidProsody", () => {
    test("should validate correct settings", () => {
      const settings: ProsodySettings = {
        stability: 0.5,
        style: 0.3,
        speed: 1.0,
        similarity_boost: 0.75,
        use_speaker_boost: true,
      };
      expect(isValidProsody(settings)).toBe(true);
    });

    test("should allow partial settings", () => {
      const settings = { stability: 0.5 };
      expect(isValidProsody(settings as ProsodySettings)).toBe(true);
    });

    test("should allow empty settings", () => {
      const settings = {};
      expect(isValidProsody(settings as ProsodySettings)).toBe(true);
    });

    test("should reject stability out of range", () => {
      const settings = { stability: -0.1 };
      expect(isValidProsody(settings as ProsodySettings)).toBe(false);

      const settings2 = { stability: 1.1 };
      expect(isValidProsody(settings2 as ProsodySettings)).toBe(false);
    });

    test("should reject speed out of range", () => {
      const settings = { speed: 0.05 };
      expect(isValidProsody(settings as ProsodySettings)).toBe(false);

      const settings2 = { speed: 2.5 };
      expect(isValidProsody(settings2 as ProsodySettings)).toBe(false);
    });

    test("should reject volume out of range", () => {
      const settings = { volume: -0.1 };
      expect(isValidProsody(settings as ProsodySettings)).toBe(false);

      const settings2 = { volume: 1.5 };
      expect(isValidProsody(settings2 as ProsodySettings)).toBe(false);
    });
  });
});

describe("VoiceConfig validation", () => {
  describe("isValidVoiceConfig", () => {
    test("should validate correct config", () => {
      const config: VoiceConfig = {
        voice_id: "marrvin",
        voice_name: "Marvin",
        description: "A test voice",
        type: "built-in",
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        speed: 1.0,
        use_speaker_boost: true,
      };
      expect(isValidVoiceConfig(config)).toBe(true);
    });

    test("should require voice_id", () => {
      const config = { voice_name: "Test" } as Partial<VoiceConfig>;
      expect(isValidVoiceConfig(config as VoiceConfig)).toBe(false);
    });

    test("should require voice_name", () => {
      const config = { voice_id: "test" } as Partial<VoiceConfig>;
      expect(isValidVoiceConfig(config as VoiceConfig)).toBe(false);
    });

    test("should reject invalid voice_id format", () => {
      const config: Partial<VoiceConfig> = {
        voice_id: "invalid id!",
        voice_name: "Test",
      };
      expect(isValidVoiceConfig(config)).toBe(false);
    });

    test("should reject stability out of range", () => {
      const config: Partial<VoiceConfig> = {
        voice_id: "test",
        voice_name: "Test",
        stability: 1.5,
      };
      expect(isValidVoiceConfig(config)).toBe(false);
    });

    test("should reject speed out of range", () => {
      const config: Partial<VoiceConfig> = {
        voice_id: "test",
        voice_name: "Test",
        speed: 3.0,
      };
      expect(isValidVoiceConfig(config)).toBe(false);
    });
  });
});

describe("PronunciationRule validation", () => {
  describe("isValidPronunciationRule", () => {
    test("should validate correct rule", () => {
      const rule: PronunciationRule = {
        term: "API",
        pronunciation: "A P I",
      };
      expect(isValidPronunciationRule(rule)).toBe(true);
    });

    test("should require term", () => {
      const rule = { pronunciation: "test" } as Partial<PronunciationRule>;
      expect(isValidPronunciationRule(rule as PronunciationRule)).toBe(false);
    });

    test("should require pronunciation", () => {
      const rule = { term: "test" } as Partial<PronunciationRule>;
      expect(isValidPronunciationRule(rule as PronunciationRule)).toBe(false);
    });

    test("should reject empty term", () => {
      const rule: PronunciationRule = {
        term: "",
        pronunciation: "test",
      };
      expect(isValidPronunciationRule(rule)).toBe(false);
    });

    test("should reject whitespace-only term", () => {
      const rule: PronunciationRule = {
        term: "   ",
        pronunciation: "test",
      };
      expect(isValidPronunciationRule(rule)).toBe(false);
    });

    test("should reject empty pronunciation", () => {
      const rule: PronunciationRule = {
        term: "test",
        pronunciation: "",
      };
      expect(isValidPronunciationRule(rule)).toBe(false);
    });

    test("should reject whitespace-only pronunciation", () => {
      const rule: PronunciationRule = {
        term: "test",
        pronunciation: "   ",
      };
      expect(isValidPronunciationRule(rule)).toBe(false);
    });
  });
});
