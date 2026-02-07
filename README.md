# madeinoz-voice-server

A local-first Text-to-Speech (TTS) voice server using Kokoro-82M and Qwen TTS models. Drop-in replacement for ElevenLabs with zero API costs, rate limits, or network dependencies.

## Features

- 🎙️ **Local TTS** - All audio generation happens on your machine
- 💰 **Cost-Free** - No per-character or per-minute charges
- 🔒 **Private** - No data sent to external services
- 🔊 **41 Built-in Voices** - Numeric voice IDs for easy configuration
- ⚡ **Fast Streaming** - Smooth real-time audio playback (RTF ~1.0x)
- 🌍 **Multi-language** - English, British, Japanese, Chinese voices
- 📱 **macOS Integration** - Native notifications and audio playback

## Quick Start

```bash
# Install dependencies
bun install

# Install MLX-audio (for Kokoro TTS)
uv tool install mlx-audio

# Run development server with Kokoro backend
TTS_BACKEND=mlx PORT=8889 bun run dev

# Test the server
curl http://localhost:8889/health
```

## Voice Configuration

The server uses **numeric voice IDs** (1-41) for easy configuration:

```bash
# Test voice ID 1 (warm, friendly)
curl -X POST http://localhost:8889/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "voice_id": "1"}'

# Test voice ID 12 (professional male)
curl -X POST http://localhost:8889/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "voice_id": "12"}'

# Test voice ID 21 (sophisticated British)
curl -X POST http://localhost:8889/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "voice_id": "21"}'
```

**See [docs/VOICE_GUIDE.md](docs/VOICE_GUIDE.md)** for complete voice documentation.

## API Endpoints

### POST /notify

Send a notification with text-to-speech.

```bash
curl -X POST http://localhost:8889/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hello",
    "message": "This is a test notification",
    "voice_id": "1",
    "volume": 1.0
  }'
```

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ | Notification title |
| `message` | string | ✅ | Text to speak |
| `voice_id` | string | ❌ | Numeric voice ID 1-41 (default: "1") |
| `voice_settings` | object | ❌ | Voice configuration |
| `volume` | number | ❌ | Volume 0.0-1.0 (default: 1.0) |
| `voice_enabled` | boolean | ❌ | Enable TTS (default: true) |

**Response:**
```json
{
  "status": "success",
  "message": "Notification sent"
}
```

### POST /pai

PAI-specific notification endpoint with default voice settings.

```bash
curl -X POST http://localhost:8889/pai \
  -H "Content-Type: application/json" \
  -d '{
    "title": "PAI Alert",
    "message": "Task completed successfully"
  }'
```

### GET /health

Health check endpoint with server status.

```bash
curl http://localhost:8889/health
```

**Response:**
```json
{
  "status": "healthy",
  "port": 8889,
  "voice_system": "Kokoro-82M",
  "default_voice_id": "1",
  "model_loaded": true,
  "available_voices": ["1", "2", "3", "..."]
}
```

### POST /upload-voice

Upload a custom voice for TTS.

```bash
curl -X POST http://localhost:8889/upload-voice \
  -F "audio=@reference.wav" \
  -F "name=My Custom Voice" \
  -F "description=A custom voice"
```

**Requirements:**
- Audio format: WAV
- Duration: 3-10 seconds
- Sample rate: 16-48 kHz (24 kHz recommended)

### GET /voices

List all available custom voices.

```bash
curl http://localhost:8889/voices
```

### DELETE /voices/:id

Delete a custom voice.

```bash
curl -X DELETE http://localhost:8889/voices/{voice_id}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8888 | Server port |
| `TTS_BACKEND` | qwen | TTS backend: `mlx` (Kokoro) or `qwen` |
| `DEFAULT_VOICE_ID` | 1 | Default voice ID (1-41 for Kokoro) |
| `MLX_MODEL` | mlx-community/Kokoro-82M-bf16 | MLX model to use |
| `MLX_STREAMING_INTERVAL` | 0.3 | Streaming chunk size (seconds) |
| `ENABLE_MACOS_NOTIFICATIONS` | true | Enable macOS notifications |

### Voice Configuration

Voices are configured in `AGENTPERSONALITIES.md`:

```markdown
## marrvin

**Description:** Default voice for DAIV

**Prosody:** speak with moderate consistency, speak in a neutral tone, speak at a normal pace

**Speed:** 1.0
```

### Pronunciation Rules

Add custom pronunciations in `~/.claude/pronunciations.json`:

```json
{
  "DAIV": "DAY-vee",
  "PAI": "PIE",
  "Qwen": "CHwen"
}
```

## Project Structure

```
.
├── src/
│   ├── py/                    # Python TTS server (FastAPI)
│   │   └── qwen_tts_server.py
│   └── ts/                    # TypeScript main server
│       ├── models/            # Type definitions
│       ├── services/          # Business logic
│       ├── utils/             # Utilities
│       ├── middleware/        # HTTP middleware
│       └── server.ts          # Main server
├── tests/
│   ├── py/                    # Python tests
│   └── ts/                    # TypeScript tests
├── scripts/                   # Utility scripts
│   └── generate-reference.ts  # ElevenLabs reference generator
├── docs/
│   ├── VOICE_GUIDE.md         # User voice configuration guide
│   ├── VOICE_QUICK_REF.md     # Quick reference for all 41 voices
│   ├── KOKORO_VOICES.md       # Technical voice documentation
│   └── MIGRATION.md           # ElevenLabs migration guide
├── specs/                     # Feature specifications
├── AGENTPERSONALITIES.md      # Voice configurations
└── pyproject.toml             # Python project config
```

## Development

```bash
# Install Bun dependencies
bun install

# Install Python dependencies
uv pip install -r requirements.txt

# Run development server (port 8889)
PORT=8889 bun run dev

# Run tests
bun test

# Type checking
bun run typecheck

# Linting
bun run lint

# Build for production
bun run build
```

## Available Voices

The server includes **41 built-in Kokoro voices** accessible via numeric IDs:

### Popular Voices

| ID | Voice | Description |
|----|-------|-------------|
| **1** | af_heart | Warm, friendly (default) |
| **4** | af_sky | Bright, energetic |
| **12** | am_michael | Professional male |
| **13** | am_adam | Youthful, energetic |
| **21** | bf_emma | Sophisticated British |

### Quick Reference

| Category | IDs | Examples |
|----------|-----|----------|
| American Female | 1-11 | af_heart, af_sky, af_bella |
| American Male | 12-20 | am_michael, am_adam, am_eric |
| British Female | 21-24 | bf_emma, bf_isabella |
| British Male | 25-28 | bm_george, bm_lewis |
| Japanese | 29-33 | jf_alpha, jm_kumo |
| Chinese | 34-41 | zf_xiaoxiao, zm_yunjian |

**See [docs/VOICE_QUICK_REF.md](docs/VOICE_QUICK_REF.md)** for complete voice listings.

### Custom Voices

You can still upload custom voices via `/upload-voice` (Qwen backend only).

## Scripts

### Generate Reference Voice

Generate a reference audio file using ElevenLabs:

```bash
ELEVENLABS_API_KEY=your-key bun scripts/generate-reference.ts <voice_id>
```

Creates `~/.claude/voices/<voice_id>.reference.wav`.

## Requirements

- **Runtime**: Bun >= 1.0
- **Python**: 3.10+ (for TTS subprocess)
- **Platform**: macOS (afplay support)
- **Memory**: ~2GB for model loading

## Architecture

The server uses a hybrid TypeScript/Python architecture:

1. **TypeScript Main Server** (Bun)
   - HTTP API endpoints
   - Request routing and validation
   - Voice configuration management
   - macOS notification integration

2. **Python TTS Subprocess** (FastAPI)
   - Qwen TTS model inference
   - Audio synthesis
   - Voice processing

## Migration from ElevenLabs

See [docs/MIGRATION.md](docs/MIGRATION.md) for detailed migration instructions.

**TL;DR:** No code changes required - the API is drop-in compatible.

## Troubleshooting

### Server won't start

```bash
# Check if port is in use
lsof -i :8889

# Kill existing process
pkill -f "bun run src/ts/server.ts"
```

### Python subprocess fails

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
```

## License

MIT

## Attribution

This server is inspired by [ValyrianTech/Qwen3-TTS_server](https://github.com/ValyrianTech/Qwen3-TTS_server) for the TTS inference patterns and FastAPI structure.

**Key Differences:**
- API contract designed as drop-in replacement for ElevenLabs
- macOS-first with pyttsx3 fallback
- JSON POST requests
- Subprocess architecture managed by TypeScript host
- CPU-based inference for local development
