# Migration Guide: ElevenLabs to Qwen TTS

This guide helps you migrate from the ElevenLabs voice server to the Qwen TTS voice server.

## Overview

The Qwen TTS Voice Server is a drop-in replacement for ElevenLabs with these benefits:

- **Local-first**: No API calls, no rate limits, no network dependency
- **Cost-free**: No per-character or per-minute costs
- **Privacy**: All audio generation happens on your machine
- **Customizable**: Support for custom voice uploads and cloning

## API Compatibility

The Qwen TTS server implements the same API contract as the ElevenLabs voice server:

### Endpoints

| ElevenLabs | Qwen TTS | Notes |
|------------|----------|-------|
| `POST /notify` | `POST /notify` | Drop-in compatible |
| `POST /pai` | `POST /pai` | PAI-specific endpoint |
| `GET /health` | `GET /health` | Extended with `available_voices` |

### Request Format

Both servers accept the same JSON format:

```json
{
  "title": "Notification Title",
  "message": "Text to speak",
  "voice_id": "marrvin",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "speed": 1.0
  },
  "volume": 1.0,
  "voice_enabled": true
}
```

### Response Format

Both servers return the same response format:

```json
{
  "status": "success",
  "message": "Notification sent"
}
```

## Voice Mapping

| ElevenLabs Voice | Qwen TTS Voice |
|------------------|----------------|
| Any voice_id | `marrvin` (default) |
| - | `marlin` |
| - | `daniel` |
| Custom uploaded | Custom uploaded |

## Configuration Changes

### Environment Variables

| ElevenLabs | Qwen TTS |
|------------|----------|
| `ELEVENLABS_API_KEY` | `QWEN_MODEL_PATH` (optional) |
| - | `PORT` (default: 8888) |
| - | `ENABLE_SUBPROCESS` (default: true) |

### Voice Configuration

ElevenLabs uses voice IDs from their service. Qwen TTS uses:

1. **Built-in voices** defined in `AGENTPERSONALITIES.md`
2. **Custom voices** uploaded via `POST /upload-voice`

## Step-by-Step Migration

### 1. Install Dependencies

```bash
# Install Python dependencies
uv pip install -r requirements.txt

# Install Bun dependencies
bun install
```

### 2. Configure Voices

Edit `AGENTPERSONALITIES.md` to define your voice configurations:

```markdown
## marrvin

**Description:** Default voice for DAIV

**Prosody:** speak with moderate consistency, speak in a neutral tone, speak at a normal pace

**Speed:** 1.0
```

### 3. Update Client Code

**No changes required!** The API is drop-in compatible.

If you have hardcoded voice IDs, update them:

```typescript
// Before (ElevenLabs)
const voiceId = "your-elevenlabs-voice-id";

// After (Qwen TTS)
const voiceId = "marrvin"; // or "marlin", "daniel", or custom voice
```

### 4. Optional: Upload Custom Voices

Generate reference audio using ElevenLabs, then upload:

```bash
# Generate reference using ElevenLabs
ELEVENLABS_API_KEY=your-key bun scripts/generate-reference.ts my-voice

# Upload to Qwen TTS server
curl -X POST http://localhost:8889/upload-voice \
  -F "audio=@/Users/seaton/.claude/voices/my-voice.reference.wav" \
  -F "name=My Custom Voice"
```

### 5. Start the Server

```bash
# Development
bun run dev

# Production
bun run build
bun start
```

### 6. Verify Migration

```bash
# Health check
curl http://localhost:8889/health

# Test notification
curl -X POST http://localhost:8889/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Hello world"}'
```

## Feature Comparison

| Feature | ElevenLabs | Qwen TTS |
|---------|------------|----------|
| Text-to-Speech | ✅ | ✅ |
| Voice Selection | ✅ | ✅ |
| Speed Control | ✅ | ✅ |
| Volume Control | ✅ | ✅ |
| Custom Voices | ✅ | ✅ (upload) |
| Voice Cloning | ✅ | 🚧 (planned) |
| macOS Notifications | ❌ | ✅ |
| Local Processing | ❌ | ✅ |
| API Rate Limits | ✅ | ❌ |
| Cost | Per-character | Free |

## Known Limitations

1. **Voice Cloning**: Not yet implemented. Planned for Qwen3-TTS VoiceDesign integration.
2. **Voice Quality**: Qwen TTS quality differs from ElevenLabs. Test with your use case.
3. **Platform**: Currently macOS-only (for afplay fallback). Linux support planned.

## Troubleshooting

### Server won't start

```bash
# Check if port is in use
lsof -i :8889

# Kill existing process
pkill -f "bun run src/ts/server.ts"
```

### Python subprocess not starting

```bash
# Check Python dependencies
uv pip list

# Verify Python server
python3 src/py/qwen_tts_server.py
```

### Audio not playing

```bash
# Test afplay directly
afplay /path/to/audio.wav

# Check volume settings
curl -X POST http://localhost:8889/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Test","volume":0.5}'
```

## Rollback

If you need to rollback to ElevenLabs:

1. Restore your previous server code
2. Set `ELEVENLABS_API_KEY` environment variable
3. No client code changes needed

## Support

For issues or questions:
- Check logs in `/tmp/dev-server.log`
- Run `bun run typecheck` to verify code
- Run `bun test` to run tests

## Next Steps

- Explore custom voice uploads via `/upload-voice`
- Configure voices in `AGENTPERSONALITIES.md`
- Add pronunciation rules in `~/.claude/pronunciations.json`
