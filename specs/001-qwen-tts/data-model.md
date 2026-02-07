# Data Model: Qwen TTS Voice Server

**Feature**: Qwen TTS Voice Server (001-qwen-tts)
**Date**: 2026-02-06

## Overview

This document defines the data entities and their relationships for the Qwen TTS voice server. The server maintains API compatibility with the existing ElevenLabs-based implementation while using Qwen3-TTS for speech synthesis.

## Core Entities

### VoiceConfig

Represents a voice personality with prosody settings.

**Fields**:
- `voice_id` (string, required): Unique identifier for the voice
- `voice_name` (string, required): Human-readable name
- `description` (string, required): Description of the voice characteristics
- `type` (string, required): Voice type ("built-in" | "custom" | "cloned")
- `stability` (number, 0.0-1.0): Speaking stability (higher = more consistent)
- `similarity_boost` (number, 0.0-1.0): Voice cloning fidelity (custom voices only)
- `style` (number, 0.0-1.0): Expressiveness level
- `speed` (number, 0.1-2.0): Speaking rate multiplier
- `use_speaker_boost` (boolean): Enhance voice clarity
- `prosody` (ProsodySettings, optional): Nested prosody configuration
- `volume` (number, 0.0-1.0, optional): Playback volume level

**Validation Rules**:
- `voice_id` must be non-empty alphanumeric with hyphens/underscores
- `stability`, `similarity_boost`, `style` must be in range [0.0, 1.0]
- `speed` must be in range [0.1, 2.0]
- `volume` must be in range [0.0, 1.0] if provided

**State Transitions**: None (configuration is static)

---

### ProsodySettings

Nested object for voice prosody configuration.

**Fields**:
- `stability` (number, 0.0-1.0): Speaking consistency
- `similarity_boost` (number, 0.0-1.0): Cloning fidelity
- `style` (number, 0.0-1.0): Expressiveness
- `speed` (number, 0.1-2.0): Speaking rate
- `use_speaker_boost` (boolean): Clarity enhancement
- `volume` (number, 0.0-1.0, optional): Playback volume

**Relationships**: Used by VoiceConfig, NotificationRequest

---

### NotificationRequest

Incoming request for voice notification.

**Fields**:
- `title` (string, required): Notification title (max 100 chars)
- `message` (string, required): Text to synthesize (max 500 chars)
- `voice_enabled` (boolean, default: true): Whether to play audio
- `voice_id` (string, optional): Voice identifier to use
- `voice_name` (string, optional): Alias for voice_id
- `voice_settings` (ProsodySettings, optional): Override voice prosody
- `volume` (number, 0.0-1.0, optional): Override playback volume

**Validation Rules**:
- `title` and `message` must pass sanitization (no script tags, shell metacharacters)
- `message` length after sanitization must be > 0
- Only one of `voice_id` or `voice_name` should be specified
- If both `voice_settings` and `volume` provided, `volume` takes precedence

**Relationships**: References VoiceConfig via `voice_id`

---

### TTSRequest

Internal request to Qwen TTS inference service.

**Fields**:
- `text` (string, required): Sanitized text to synthesize
- `voice` (string, required): Qwen voice identifier or reference label
- `prosody_instruction` (string, required): Natural language prosody description
- `speed` (number, required): Speed multiplier
- `output_format` (string, default: "wav"): Audio output format

**Validation Rules**:
- `text` must be non-empty after pronunciation substitution
- `prosody_instruction` must be valid natural language
- `speed` must be in range [0.5, 2.0]

**Relationships**: Derived from NotificationRequest + VoiceConfig

---

### TTSResponse

Response from Qwen TTS inference service.

**Fields**:
- `audio_data` (buffer, required): Raw audio bytes
- `duration_ms` (number, required): Audio duration in milliseconds
- `sample_rate` (number, required): Audio sample rate (typically 24000 Hz)
- `format` (string, required): Audio format ("wav" | "mp3")

**Validation Rules**:
- `audio_data` must be non-empty
- `duration_ms` must be positive

---

### PronunciationRule

Maps a term to its custom pronunciation.

**Fields**:
- `term` (string, required): Original term to replace
- `pronunciation` (string, required): Replacement text for TTS

**Validation Rules**:
- Both fields must be non-empty
- `term` should be lowercase for case-insensitive matching

**Relationships**: Used by text preprocessing before TTS

---

### HealthStatus

Server health and configuration status.

**Fields**:
- `status` (string): "healthy" | "degraded" | "unhealthy"
- `port` (number): Server port number
- `voice_system` (string): "Qwen TTS" | "macOS Say" | "Unavailable"
- `default_voice_id` (string): Configured default voice
- `model_loaded` (boolean): Whether Qwen model is loaded
- `api_key_configured` (boolean): Whether API key exists (for compatibility, always false)
- `python_subprocess` (string): "running" | "stopped" | "crashed"

**Relationships**: Aggregate status, no dependencies

---

## Entity Relationships

```
NotificationRequest
    ├── references ──> VoiceConfig (via voice_id)
    ├── contains ────> ProsodySettings (voice_settings override)
    │
    V
TTSRequest (derived)
    ├── uses ───────> PronunciationRule (text preprocessing)
    │
    V
TTSResponse
    └── played via ──> afplay (macOS audio player)

VoiceConfig
    └── contains ───> ProsodySettings
```

## Data Flow

1. Client sends `NotificationRequest` to `/notify`
2. Server loads `VoiceConfig` from AGENTPERSONALITIES.md
3. Server merges request `voice_settings` with config `prosody`
4. Server applies `PronunciationRule` substitutions to message text
5. Server translates prosody to natural language instruction
6. Server creates `TTSRequest` for Python subprocess
7. Python subprocess returns `TTSResponse` with audio
8. Server plays audio via afplay with volume from config/request
9. Server displays macOS notification with title/message

## Storage Locations

| Entity | Storage Location | Format |
|--------|-----------------|---------|
| VoiceConfig | `~/.claude/skills/CORE/SYSTEM/AGENTPERSONALITIES.md` | JSON in markdown |
| PronunciationRule | `~/.claude/skills/CORE/USER/pronunciations.json` | JSON |
| Custom voice samples | `~/.claude/voices/` (P3) | Audio files |
| Model cache | `~/.cache/huggingface/hub/` | PyTorch checkpoints |

## Default Values

| Field | Default |
|-------|---------|
| voice_enabled | true |
| stability | 0.5 |
| similarity_boost | 0.75 |
| style | 0.0 |
| speed | 1.0 |
| use_speaker_boost | true |
| volume | 1.0 |
