# madeinoz-voice-server

A local-first Text-to-Speech (TTS) voice server for PAI (Personal AI Infrastructure). Uses MLX-audio with Kokoro-82M model and an ElevenLabs-compatible API for PAI agent voices. Zero API costs, rate limits, or external network dependencies.

## Features

- Local TTS - All audio generation happens on your machine
- Cost-Free - No per-character or per-minute charges
- Private - No data sent to external services
- 41 Built-in Voices - Numeric voice IDs for easy configuration
- Fast Streaming - Smooth real-time audio playback (RTF ~1.0x)
- Multi-language - English, British, Japanese, Chinese voices
- macOS Integration - Native notifications and audio playback

## Requirements

### Platform
- **macOS 13+ (Ventura or later)** - Required for native `afplay` audio
- **Apple Silicon (M1/M2/M3/M4)** - Required for MLX-audio backend

### Required Tools

| Tool | Version | Purpose | Install |
|------|---------|---------|--------|
| **Bun** | >= 1.0 | TypeScript runtime | `curl -fsSL https://bun.sh/install \| bash` |
| **uv** | >= 0.1 | Python package manager | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **ffmpeg** | any | Audio conversion | `brew install ffmpeg` |

### TTS Backend

| Backend | Requirements | Use Case |
|---------|--------------|----------|
| **MLX-audio** | Apple Silicon only | Fast local TTS, 41 built-in voices |

## Quick Start

### Option 1: Install via Homebrew (Recommended)

```bash
# Tap the repository
brew tap madeinoz67/tap

# Install the voice server
brew install madeinoz67/tap/madeinoz-voice-server

# Install MLX-audio backend
uv tool install mlx-audio

# Start as a service
brew services start voice-server

# Or run directly
voice-server
```

**Note:** After Homebrew installation, the MLX-audio backend needs to be installed separately:
```bash
uv tool install mlx-audio
```

### Option 2: Manual Installation

#### 1. Install Prerequisites

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install ffmpeg (for audio conversion)
brew install ffmpeg
```

### 2. Install Project Dependencies

```bash
# Clone and navigate to project
cd madeinoz-voice-server

# Install TypeScript dependencies
bun install

# Install MLX-audio for Kokoro TTS backend
uv tool install mlx-audio
```

### 3. Run the Server

```bash
# Production mode
PORT=8888 bun run dev

# Development mode (uses port 8889 to avoid conflicts)
NODE_ENV=development PORT=8889 bun run dev
```

### 4. Test the Server

```bash
# Health check
curl http://localhost:8888/health

# Test TTS notification
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from Kokoro TTS!", "voice_id": "1"}'
```

## Voice Configuration

The server uses **numeric voice IDs** (1-41) for easy configuration:

```bash
# Test voice ID 1 (warm, friendly)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "voice_id": "1"}'

# Test voice ID 12 (professional male)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "voice_id": "12"}'

# Test voice ID 21 (sophisticated British)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "voice_id": "21"}'
```

**See [docs/VOICE_GUIDE.md](docs/VOICE_GUIDE.md)** for complete voice documentation.

## API Endpoints

### POST /notify

Send a notification with text-to-speech.

```bash
curl -X POST http://localhost:8888/notify \
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
| `title` | string | No | Notification title (default: "Notification") |
| `message` | string | Yes | Text to speak |
| `voice_id` | string | No | Numeric voice ID 1-41 (default: "1") |
| `voice_settings` | object | No | Voice configuration |
| `volume` | number | No | Volume 0.0-1.0 (default: 1.0) |
| `voice_enabled` | boolean | No | Enable TTS (default: true) |

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
curl -X POST http://localhost:8888/pai \
  -H "Content-Type: application/json" \
  -d '{
    "title": "PAI Alert",
    "message": "Task completed successfully"
  }'
```

### GET /health

Health check endpoint with server status.

```bash
curl http://localhost:8888/health
```

**Response:**
```json
{
  "status": "healthy",
  "port": 8888,
  "voice_system": "Kokoro-82M",
  "default_voice_id": "1",
  "model_loaded": true,
  "available_voices": ["1", "2", "3", "..."]
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8888 | Server port |
| `DEFAULT_VOICE_ID` | 1 | Default voice ID (1-41 for Kokoro) |
| `MLX_MODEL` | mlx-community/Kokoro-82M-bf16 | MLX model to use |
| `MLX_STREAMING_INTERVAL` | 0.3 | Streaming chunk size (seconds) |
| `ENABLE_MACOS_NOTIFICATIONS` | true | Enable macOS notifications |

### Voice Configuration

Voices are configured in `docs/agent-voices.md`:

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
  "Kokoro": "ko-KO-ro"
}
```

## Project Structure

```
.
├── src/
│   └── ts/                    # TypeScript main server
│       ├── models/            # Type definitions
│       ├── services/          # Business logic
│       ├── utils/             # Utilities
│       ├── middleware/        # HTTP middleware
│       └── server.ts          # Main server
├── tests/
│   └── ts/                    # TypeScript tests
├── scripts/                   # Utility scripts
│   └── generate-reference.ts  # ElevenLabs reference generator
├── docs/
│   ├── VOICE_GUIDE.md         # User voice configuration guide
│   ├── VOICE_QUICK_REF.md     # Quick reference for all 41 voices
│   ├── KOKORO_VOICES.md       # Technical voice documentation
│   └── MIGRATION.md           # ElevenLabs migration guide
├── specs/                     # Feature specifications
└── AGENTPERSONALITIES.md      # Voice configurations
```

## Development

```bash
# Install all dependencies
bun install              # TypeScript/Bun dependencies
uv tool install mlx-audio  # MLX-audio backend

# Run development server
# Production: PORT=8888
# Development (to avoid conflict): NODE_ENV=development PORT=8889
PORT=8888 bun run dev

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

## Scripts

### Generate Reference Voice

Generate a reference audio file using ElevenLabs:

```bash
ELEVENLABS_API_KEY=your-key bun scripts/generate-reference.ts <voice_id>
```

Creates `~/.claude/voices/<voice_id>.reference.wav`.

## TTS Backend

### MLX-audio

Fast local TTS optimized for Apple Silicon using the Kokoro-82M model.

```bash
# Install MLX-audio
uv tool install mlx-audio

# Run server (production port 8888)
PORT=8888 bun run dev

# Development mode (port 8889 to avoid conflicts)
NODE_ENV=development PORT=8889 bun run dev
```

**Features:**
- 41 built-in voices
- Ultra-fast streaming on Apple Silicon (~1.0x RTF)
- Supports English, British, Japanese, Chinese

## Architecture

The server uses a modular TypeScript architecture:

1. **TypeScript Main Server** (Bun)
   - HTTP API endpoints (`/notify`, `/pai`, `/health`)
   - Request routing and validation
   - Voice configuration management
   - macOS notification integration

2. **MLX-audio Backend**
   - Direct CLI integration for Apple Silicon
   - Kokoro-82M model for high-quality TTS
   - 41 built-in voices across multiple languages

## Migration from ElevenLabs

See [docs/MIGRATION.md](docs/MIGRATION.md) for detailed migration instructions.

**TL;DR:** No code changes required - the API is drop-in compatible.

## Troubleshooting

### Server won't start

```bash
# Check if port is in use
lsof -i :8888

# Kill existing process
pkill -f "bun run src/ts/server.ts"

# Check Bun is installed
bun --version

# Verify dependencies
bun install
```

### MLX-audio backend issues

```bash
# Check MLX-audio is installed
uv tool list

# Reinstall MLX-audio if needed
uv tool uninstall mlx-audio
uv tool install mlx-audio

# Verify MLX-audio works directly
mlx-audio --help

# Check Apple Silicon compatibility
uname -m  # Should show arm64
```

### Audio not playing

```bash
# Test afplay directly
afplay /System/Library/Sounds/Ping.aiff

# Check system volume
osascript -e 'get volume settings'

# Verify ffmpeg is installed
ffmpeg -version
```

## License

MIT

## Attribution

This server uses MLX-audio with the Kokoro-82M model for high-quality text-to-speech.
