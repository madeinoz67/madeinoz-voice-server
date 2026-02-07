/**
 * Mock utilities for testing
 */

import { mockDeep } from "bun:test";

/**
 * Mock MLX-audio TTS process
 */
export interface MockMLXProcess {
  stdout: { readonly: () => ReadableStream<Uint8Array> };
  stderr: { readonly: () => ReadableStream<Uint8Array> };
  killed: boolean;
  kill(): void;
}

/**
 * Create a mock MLX TTS process
 */
export function createMockMLXProcess(options: {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}): MockMLXProcess {
  const stdoutStream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (options.stdout) {
        controller.enqueue(new TextEncoder().encode(options.stdout));
      }
      controller.close();
    },
  });

  const stderrStream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (options.stderr) {
        controller.enqueue(new TextEncoder().encode(options.stderr));
      }
      controller.close();
    },
  });

  return {
    stdout: { readonly: () => stdoutStream },
    stderr: { readonly: () => stderrStream },
    killed: false,
    kill() {
      this.killed = true;
    },
  };
}

/**
 * Mock file system operations
 */
export const mockFS = {
  existsSync: (path: string): boolean => {
    const mockExists: Record<string, boolean> = {
      "/tmp/test.wav": true,
      "/tmp/test.mp3": true,
      `${process.env.HOME}/.claude/VoiceServer/voices/pronunciations.json`: false,
    };
    return mockExists[path] || false;
  },
  readFileSync: (path: string, encoding: string): string => {
    const mockFiles: Record<string, string> = {
      "/tmp/pronunciations.json": JSON.stringify({
        pronunciations: [
          { term: "TEST", pronunciation: "test pronunciation" },
        ],
      }),
    };
    return mockFiles[path] || "";
  },
  writeFileSync: (): void => {},
  unlinkSync: (): void => {},
  mkdirSync: (): void => {},
};

/**
 * Mock subprocess for Bun.spawn
 */
export function mockSpawn(cmd: string, args: string[]): MockMLXProcess {
  if (cmd.endsWith("mlx_tts") || cmd.includes("python")) {
    return createMockMLXProcess({
      stdout: "",
      stderr: "",
    });
  }
  throw new Error(`Unknown mock command: ${cmd}`);
}

/**
 * Test fixtures
 */
export const fixtures = {
  validWAVFile: Buffer.from([
    // RIFF header
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x24, 0x08, 0x00, 0x00, // file size
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    // fmt chunk
    0x66, 0x6D, 0x74, 0x20, // "fmt "
    0x10, 0x00, 0x00, 0x00, // chunk size
    0x01, 0x00, 0x01, 0x00, // audio format, channels
    0x40, 0x1F, 0x00, 0x00, // sample rate (8000)
    0x40, 0x1F, 0x00, 0x00, // byte rate
    0x01, 0x00, 0x08, 0x00, // block align, bits per sample
    // data chunk
    0x64, 0x61, 0x74, 0x61, // "data"
    0x00, 0x08, 0x00, 0x00, // data size
    // 1 second of silence at 8000Hz
    ...Array(2048).fill(0x00),
  ]),

  validTTSRequest: {
    text: "Hello world",
    voice_id: "marrvin",
  },

  validNotificationRequest: {
    message: "Test notification",
    voice_id: "marrvin",
  },

  validProsodySettings: {
    stability: 0.5,
    style: 0.0,
    speed: 1.0,
    similarity_boost: 0.75,
    use_speaker_boost: true,
  },

  validVoiceConfig: {
    voice_id: "marrvin",
    name: "Marvin",
    language: "en",
    gender: "male",
  },
};

/**
 * Mock logger that doesn't output to console
 */
export const mockLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
