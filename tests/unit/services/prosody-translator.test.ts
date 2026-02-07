/**
 * Prosody translator service tests
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  translateProsody,
  createProsodyInstruction,
  DEFAULT_PROSODY,
  getDefaultProsodyInstruction,
} from "@/services/prosody-translator.js";
import type { ProsodySettings } from "@/models/voice-config.js";

describe("translateProsody", () => {
  test("should translate stability to description", () => {
    const result = translateProsody({ stability: 0.2 });
    expect(result).toContain("speak with variation and emotion");
  });

  test("should translate medium stability", () => {
    const result = translateProsody({ stability: 0.5 });
    expect(result).toContain("speak with moderate consistency");
  });

  test("should translate high stability", () => {
    const result = translateProsody({ stability: 0.8 });
    expect(result).toContain("speak in a very consistent and stable manner");
  });

  test("should translate style to description", () => {
    const result = translateProsody({ style: 0.1 });
    expect(result).toContain("speak in a neutral tone");
  });

  test("should translate low style", () => {
    const result = translateProsody({ style: 0.3 });
    expect(result).toContain("speak with slight expressiveness");
  });

  test("should translate medium style", () => {
    const result = translateProsody({ style: 0.6 });
    expect(result).toContain("speak with moderate emotion and expression");
  });

  test("should translate high style", () => {
    const result = translateProsody({ style: 0.9 });
    expect(result).toContain("speak with high expressiveness and emotion");
  });

  test("should translate very slow speed", () => {
    const result = translateProsody({ speed: 0.3 });
    expect(result).toContain("speak very slowly");
  });

  test("should translate slow speed", () => {
    const result = translateProsody({ speed: 0.6 });
    expect(result).toContain("speak slowly");
  });

  test("should translate normal speed", () => {
    const result = translateProsody({ speed: 1.0 });
    expect(result).toContain("speak at a normal pace");
  });

  test("should translate fast speed", () => {
    const result = translateProsody({ speed: 1.4 });
    expect(result).toContain("speak quickly");
  });

  test("should translate very fast speed", () => {
    const result = translateProsody({ speed: 2.0 });
    expect(result).toContain("speak very quickly");
  });

  test("should combine multiple prosody settings", () => {
    const result = translateProsody({
      stability: 0.8,
      style: 0.3,
      speed: 1.4,
    });
    expect(result).toContain("speak in a very consistent and stable manner");
    expect(result).toContain("speak with slight expressiveness");
    expect(result).toContain("speak quickly");
  });

  test("should handle empty settings", () => {
    const result = translateProsody({});
    expect(result).toBe("");
  });

  test("should handle undefined values", () => {
    const settings: ProsodySettings = {
      stability: undefined,
      style: undefined,
      speed: undefined,
      similarity_boost: undefined,
      use_speaker_boost: undefined,
    };
    const result = translateProsody(settings);
    expect(result).toBe("");
  });
});

describe("createProsodyInstruction", () => {
  test("should add voice context to prosody instruction", () => {
    const result = createProsodyInstruction(
      { stability: 0.5 },
      "using a deep voice"
    );
    expect(result).toContain("speak with moderate consistency");
    expect(result).toContain("using a deep voice");
  });

  test("should work without voice context", () => {
    const result = createProsodyInstruction({ stability: 0.5 });
    expect(result).toBe("speak with moderate consistency");
  });

  test("should work with empty prosody and context", () => {
    const result = createProsodyInstruction({}, "using a deep voice");
    expect(result).toBe(", using a deep voice");
  });
});

describe("DEFAULT_PROSODY", () => {
  test("should have sensible defaults", () => {
    expect(DEFAULT_PROSODY.stability).toBe(0.5);
    expect(DEFAULT_PROSODY.similarity_boost).toBe(0.75);
    expect(DEFAULT_PROSODY.style).toBe(0.0);
    expect(DEFAULT_PROSODY.speed).toBe(1.0);
    expect(DEFAULT_PROSODY.use_speaker_boost).toBe(true);
  });
});

describe("getDefaultProsodyInstruction", () => {
  test("should return instruction with default settings", () => {
    const result = getDefaultProsodyInstruction();
    expect(result).toContain("speak with moderate consistency");
    expect(result).toContain("speak in a neutral tone");
    expect(result).toContain("speak at a normal pace");
  });
});
