#!/usr/bin/env bun
/**
 * Reference Voice Generation Script
 *
 * Generates a reference audio file for a given voice_id using ElevenLabs API.
 * The generated audio file can be used as a custom voice reference for the Qwen TTS server.
 *
 * Usage:
 *   bun scripts/generate-reference.ts <voice_id>
 *
 * Environment Variables:
 *   ELEVENLABS_API_KEY - ElevenLabs API key (required)
 *
 * Output:
 *   Creates ~/.claude/voices/<voice_id>.reference.wav
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { $ } from "bun";

/**
 * Reference text for voice generation
 * Chosen to capture voice characteristics: tone, pace, pronunciation, emotion
 */
const REFERENCE_TEXT = `The algorithm requires careful consideration of multiple factors.
When approaching complex problems, break them down into smaller components.
Quality assurance is essential for delivering reliable results.`;

/**
 * ElevenLabs voice IDs mapped to agent voice names
 */
const VOICE_ID_MAP: Record<string, string> = {
  marrvin: "default", // Use ElevenLabs default or specific voice ID
  marlin: "default",
  daniel: "default",
};

/**
 * Get ElevenLabs voice ID for agent voice
 */
function getElevenLabsVoiceId(voiceId: string): string {
  // You can map specific agent voices to ElevenLabs voice IDs here
  // Example: "marrvin" -> "your-elevenlabs-voice-id"
  return VOICE_ID_MAP[voiceId] || voiceId;
}

/**
 * Generate reference audio using ElevenLabs API
 */
async function generateReference(voiceId: string): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error("Error: ELEVENLABS_API_KEY environment variable not set");
    console.error("Get your API key from: https://elevenlabs.io/app/settings/api-keys");
    process.exit(1);
  }

  const voicesDir = join(process.env.HOME || "", ".claude", "voices");
  const outputPath = join(voicesDir, `${voiceId}.reference.wav`);

  console.log(`Generating reference audio for voice: ${voiceId}`);
  console.log(`Output path: ${outputPath}`);
  console.log(`Reference text: "${REFERENCE_TEXT}"`);

  try {
    const elevenLabsVoiceId = getElevenLabsVoiceId(voiceId);

    // Call ElevenLabs TTS API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: REFERENCE_TEXT,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // Get audio data
    const audioBuffer = await response.arrayBuffer();
    const audioData = new Uint8Array(audioBuffer);

    // Save to file
    writeFileSync(outputPath, audioData);

    console.log(`✅ Reference audio saved to: ${outputPath}`);
    console.log(`   File size: ${(audioData.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error(`Error generating reference audio: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: bun scripts/generate-reference.ts <voice_id>");
    console.log("");
    console.log("Examples:");
    console.log("  bun scripts/generate-reference.ts marrvin");
    console.log("  bun scripts/generate-reference.ts daniel");
    console.log("");
    console.log("Environment variables:");
    console.log("  ELEVENLABS_API_KEY - ElevenLabs API key (required)");
    process.exit(1);
  }

  const voiceId = args[0];

  await generateReference(voiceId);
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
