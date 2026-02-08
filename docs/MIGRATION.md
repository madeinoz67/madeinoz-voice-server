# Migration Guide: ElevenLabs → Kokoro TTS

This guide helps you migrate from ElevenLabs to the local MLX-audio Kokoro TTS backend.

## Quick Summary

**The API is drop-in compatible.** No code changes required!

Just replace the ElevenLabs API endpoint with your local voice server.

## What Changes

| Aspect | ElevenLabs | Kokoro Voice Server |
|--------|-----------|---------------------|
| **Endpoint** | `api.elevenlabs.io` | `localhost:8888` |
| **Cost** | $0.30/1K chars | Free |
| **Latency** | 200-500ms | ~100ms (local) |
| **Voices** | 90+ custom voices | 41 built-in voices |
| **Privacy** | Cloud processing | 100% local |
| **Network** | Required | Not required |

## Voice ID Mapping

The voice server uses **numeric voice IDs** instead of ElevenLabs voice names.

### Popular Mappings

| Use Case | ElevenLabs Voice | Kokoro ID | Kokoro Voice |
|----------|-----------------|-----------|--------------|
| Default assistant | `eleven_multilingual_v2` | **1** | af_heart |
| Professional male | `Josh` | **12** | am_michael |
| Energetic female | `Bella` | **4** | af_sky |
| British female | `Charlotte` | **21** | bf_emma |
| Youthful male | `Adam` | **13** | am_adam |

See [VOICE_QUICK_REF.md](VOICE_QUICK_REF.md) for all 41 voices.

## Step-by-Step Migration

### 1. Install MLX-audio Backend

```bash
pipx install mlx-audio
```

### 2. Install Voice Server

#### Option A: Homebrew
```bash
brew tap madeinoz67/tap
brew install madeinoz67/tap/voice-server
```

#### Option B: npm/bun
```bash
bun install -g voice-server
# or
npm install -g voice-server
```

### 3. Start the Server

```bash
# Terminal 1: Start voice server
PORT=8888 voice-server
```

### 4. Update Your Application

**Before (ElevenLabs):**
```typescript
const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/your-voice-id', {
  method: 'POST',
  headers: {
    'xi-api-key': process.env.ELEVENLABS_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Hello world',
    model_id: 'eleven_multilingual_v2',
  }),
});
```

**After (Kokoro Voice Server):**
```typescript
const response = await fetch('http://localhost:8888/notify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Hello world',
    voice_id: '1',
  }),
});
```

### 5. Remove ElevenLabs Credentials

```bash
# Remove from environment
rm ~/.env  # or delete ELEVENLABS_API_KEY line

# Or unset in current session
unset ELEVENLABS_API_KEY
```

## PAI Integration

For PAI users using the `/notify` endpoint, **no changes needed**!

Just ensure the voice server is running:

```bash
# Test PAI notification
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "PAI is working!", "voice_id": "1"}'
```

## Voice Configuration

### Setting Default Voice

Update `~/.claude/skills/Agents/AgentPersonalities.md`:

```yaml
# Before
voices:
  DAIV:
    voice_id: "eleven_multilingual_v2"
    elevenlabs_model: "eleven_multilingual_v2"

# After
voices:
  DAIV:
    voice_id: "1"  # af_heart - warm, friendly
```

### Testing Different Voices

```bash
# Test voice 1 (warm female)
curl -X POST http://localhost:8888/notify \
  -d '{"message": "This is voice 1", "voice_id": "1"}'

# Test voice 12 (professional male)
curl -X POST http://localhost:8888/notify \
  -d '{"message": "This is voice 12", "voice_id": "12"}'

# Test voice 21 (British female)
curl -X POST http://localhost:8888/notify \
  -d '{"message": "This is voice 21", "voice_id": "21"}'
```

## Advanced Features

### Pronunciation Rules

Create `~/.claude/pronunciations.json`:

```json
{
  "DAIV": "DAY-vee",
  "PAI": "PIE",
  "Kokoro": "ko-KO-ro",
  "MLX": "M-L-X"
}
```

### Speed Adjustment

```typescript
const response = await fetch('http://localhost:8888/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Hello world',
    voice_id: '1',
    voice_settings: {
      speed: 1.2  // 20% faster
    }
  }),
});
```

## Troubleshooting

### "Connection refused" Error

**Problem:** Can't connect to localhost:8888

**Solution:** Start the voice server
```bash
voice-server
```

### "mlx-audio not found"

**Problem:** MLX-audio backend not installed

**Solution:** Install MLX-audio
```bash
pipx install mlx-audio
```

### Voice sounds different

**Problem:** Kokoro voices sound different from ElevenLabs

**Solution:** Try different voice IDs to find your preferred voice
```bash
# Browse all 41 voices
curl -X POST http://localhost:8888/notify -d '{"message": "Testing", "voice_id": "N"}'
# Replace N with 1-41
```

### No audio output

**Problem:** Text processed but no sound

**Solution:** Check macOS audio
```bash
# Test system audio
afplay /System/Library/Sounds/Ping.aiff

# Check volume
osascript -e 'get volume settings'
```

## Feature Comparison

| Feature | ElevenLabs | Kokoro Voice Server |
|---------|-----------|---------------------|
| **Text-to-Speech** | ✅ | ✅ |
| **Multiple Voices** | ✅ 90+ | ✅ 41 |
| **Voice Cloning** | ✅ | ❌ |
| **SSML Support** | ✅ | ❌ |
| **Streaming** | ✅ | ✅ |
| **Local Processing** | ❌ | ✅ |
| **Zero Cost** | ❌ | ✅ |
| **Privacy** | Cloud | Local |
| **Multi-language** | ✅ 29 | ✅ 4 (EN, JP, CN, BR) |

## Rollback

If you need to rollback to ElevenLabs:

1. Stop voice server: `pkill -f voice-server`
2. Restore ElevenLabs API key to environment
3. Update application endpoints back to `api.elevenlabs.io`
4. Restore voice IDs to ElevenLabs voice names

## Next Steps

1. **Choose your voices** - Browse [VOICE_QUICK_REF.md](VOICE_QUICK_REF.md)
2. **Configure agents** - Update `AGENTPERSONALITIES.md`
3. **Test thoroughly** - Verify all agents sound good
4. **Remove ElevenLabs costs** - Cancel subscription if desired

## Support

For issues or questions:
- Check [README.md](../README.md) troubleshooting section
- Review [VOICE_GUIDE.md](VOICE_GUIDE.md) for voice configuration
- Test with `/health` endpoint: `curl http://localhost:8888/health`
