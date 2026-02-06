/**
 * Voice storage service tests
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { validateAudioFile } from "@/utils/audio-validator.js";
import { saveVoice, listVoices, deleteVoice, getVoice } from "@/services/voice-storage.js";
import type { VoiceMetadata } from "@/models/voice-upload.js";

// Test voices directory
const TEST_VOICES_DIR = "/tmp/test_voices";
const TEST_WAV_FILE = "/tmp/test_voice.wav";

// Helper: Create a minimal valid WAV file (4 seconds, 24kHz)
function createTestWavFile(filePath: string): void {
  const sampleRate = 24000;
  const duration = 4; // seconds
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = sampleRate * duration;
  const dataSize = numSamples * numChannels * bytesPerSample;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4); // file size
  buffer.write("WAVE", 8);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20); // audio format (PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // byte rate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // block align
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write silence
  writeFileSync(filePath, buffer);
}

// Helper: Create invalid WAV file (too short)
function createShortWavFile(filePath: string): void {
  const sampleRate = 24000;
  const duration = 1; // Too short
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = sampleRate * duration;
  const dataSize = numSamples * numChannels * bytesPerSample;

  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  writeFileSync(filePath, buffer);
}

// Helper: Create invalid file (not WAV)
function createInvalidFile(filePath: string): void {
  writeFileSync(filePath, "This is not a WAV file");
}

describe("validateAudioFile", () => {
  afterEach(() => {
    // Clean up test files
    if (existsSync(TEST_WAV_FILE)) unlinkSync(TEST_WAV_FILE);
  });

  test("should validate a correct WAV file", () => {
    createTestWavFile(TEST_WAV_FILE);
    const result = validateAudioFile(TEST_WAV_FILE);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.metadata?.format).toBe("wav");
    expect(result.metadata?.duration_seconds).toBe(4);
    expect(result.metadata?.sample_rate).toBe(24000);
  });

  test("should reject a file that is too short", () => {
    createShortWavFile(TEST_WAV_FILE);
    const result = validateAudioFile(TEST_WAV_FILE);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("too short"))).toBe(true);
  });

  test("should reject an invalid file format", () => {
    createInvalidFile(TEST_WAV_FILE);
    const result = validateAudioFile(TEST_WAV_FILE);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("Invalid WAV"))).toBe(true);
  });
});

describe("voice storage", () => {
  // Note: These tests use the actual ~/.claude/voices directory
  // This is intentional to test the real implementation
  // In production, you might want to mock the filesystem

  test("should save and retrieve a voice", () => {
    createTestWavFile(TEST_WAV_FILE);

    const voice = saveVoice(TEST_WAV_FILE, {
      name: "Test Voice",
      description: "A test voice",
    });

    expect(voice).toBeDefined();
    expect(voice?.name).toBe("Test Voice");
    expect(voice?.description).toBe("A test voice");
    expect(voice?.duration_seconds).toBe(4);

    // Clean up
    if (voice) {
      deleteVoice(voice.id);
    }
  });

  test("should list voices", () => {
    // Create a test voice
    createTestWavFile(TEST_WAV_FILE);
    const voice = saveVoice(TEST_WAV_FILE, {
      name: "List Test Voice",
    });

    const voices = listVoices();
    expect(voices.length).toBeGreaterThan(0);
    expect(voices.some(v => v.name === "List Test Voice")).toBe(true);

    // Clean up
    if (voice) {
      deleteVoice(voice.id);
    }
  });

  test("should delete a voice", () => {
    // Create a test voice
    createTestWavFile(TEST_WAV_FILE);
    const voice = saveVoice(TEST_WAV_FILE, {
      name: "Delete Test Voice",
    });

    expect(voice).toBeDefined();

    // Delete it
    const deleted = deleteVoice(voice!.id);
    expect(deleted).toBe(true);

    // Verify it's gone
    const retrieved = getVoice(voice!.id);
    expect(retrieved).toBeNull();
  });

  test("should reject invalid voice uploads", () => {
    // Create an invalid file
    createShortWavFile(TEST_WAV_FILE);

    const voice = saveVoice(TEST_WAV_FILE, {
      name: "Invalid Voice",
    });

    expect(voice).toBeNull();
  });

  afterEach(() => {
    // Clean up test file
    if (existsSync(TEST_WAV_FILE)) {
      unlinkSync(TEST_WAV_FILE);
    }
  });
});
