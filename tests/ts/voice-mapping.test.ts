/**
 * Voice mapping tests — persona IDs must resolve to the Kokoro voices
 * documented in AGENTPERSONALITIES.md, not silently fall back to af_heart.
 */

import { describe, test, expect } from "bun:test";
import { getKokoroVoice, getVoiceInfo } from "../../src/ts/constants/KOKORO_VOICES.js";

describe("runtime persona IDs", () => {
  test("resolve to documented Kokoro voices", () => {
    expect(getKokoroVoice("marrvin")).toBe("am_michael"); // DAIV default persona
    expect(getKokoroVoice("marlin")).toBe("am_eric"); // alternative voice, male
    expect(getKokoroVoice("daniel")).toBe("bf_emma"); // AGENTPERSONALITIES.md id 21
  });
});

describe("documented persona names", () => {
  test("resolve to their documented Kokoro voices", () => {
    expect(getKokoroVoice("daiv")).toBe("am_michael");
    expect(getKokoroVoice("jeremy")).toBe("af_sky");
    expect(getKokoroVoice("aria")).toBe("af_nova");
    expect(getKokoroVoice("marcus")).toBe("am_michael");
    expect(getKokoroVoice("rachel")).toBe("af_heart");
    expect(getKokoroVoice("Daniel")).toBe("bf_emma"); // case-insensitive
  });
});

describe("existing resolution keeps working", () => {
  test("Kokoro names pass through unchanged", () => {
    expect(getKokoroVoice("am_michael")).toBe("am_michael");
    expect(getKokoroVoice("bf_emma")).toBe("bf_emma");
    expect(getKokoroVoice("af_heart")).toBe("af_heart");
  });

  test("numeric IDs still resolve", () => {
    expect(getKokoroVoice(21)).toBe("bf_emma");
    expect(getKokoroVoice("12")).toBe("am_michael");
  });

  test("unknown values fall back to the default", () => {
    expect(getKokoroVoice("zzz")).toBe("af_heart");
    expect(getKokoroVoice(999)).toBe("af_heart");
    expect(getKokoroVoice("")).toBe("af_heart");
  });
});

describe("voice info", () => {
  test("resolves through the same mapping", () => {
    expect(getVoiceInfo("daniel")?.name).toBe("bf_emma");
    expect(getVoiceInfo("marrvin")?.gender).toBe("male");
  });
});
