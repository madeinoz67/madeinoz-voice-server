# Quickstart: Qwen TTS Voice Server

**Feature**: Qwen TTS Voice Server (001-qwen-tts)
**Branch**: `001-qwen-tts`

## Prerequisites

- macOS 13+ (Ventura or later)
- 8GB+ RAM recommended
- 4GB+ free disk space (for Qwen3-TTS model)
- Bun runtime
- Python 3.10+
- (Optional) NVIDIA GPU with CUDA support for faster inference

## Installation

### 1. Clone and Setup

```bash
# Navigate to project directory
cd madeinoz-voice-server

# Install Bun dependencies
bun install

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Download Qwen3-TTS Model

The model will be downloaded automatically on first run, or you can pre-download:

```bash
# Optional: Pre-download model
python -c "from transformers import AutoModel; AutoModel.from_pretrained('Qwen/Qwen3-TTS-12Hz-1.7B-Base')"
```

Model location: `~/.cache/huggingface/hub/models--Qwen--Qwen3-TTS-12Hz-1.7B-Base/`

### 3. Configure Voice Personalities

Edit `~/.claude/skills/CORE/SYSTEM/AGENTPERSONALITIES.md` to define voices:

```json
{
  "voices": {
    "marrvin": {
      "voice_id": "marrvin",
      "voice_name": "Marvin",
      "type": "built-in",
      "description": "Friendly AI assistant",
      "stability": 0.5,
      "similarity_boost": 0.75,
      "style": 0.3,
      "speed": 1.0,
      "use_speaker_boost": true,
      "prosody": {
        "stability": 0.5,
        "similarity_boost": 0.75,
        "style": 0.3,
        "speed": 1.0,
        "use_speaker_boost": true
      }
    }
  }
}
```

## Running the Server

### Development Mode

```bash
# Terminal 1: Start Python TTS backend
python src/qwen-tts-server.py

# Terminal 2: Start Bun main server
bun run dev
```

### Production Mode

```bash
# Start both servers (Bun manages Python subprocess)
bun start
```

Server runs on `http://localhost:8888`

## API Usage

### Basic Notification

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hello",
    "message": "This is a test notification"
  }'
```

### With Custom Voice

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "PAI Alert",
    "message": "Task completed successfully",
    "voice_id": "marrvin"
  }'
```

### With Prosody Override

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Urgent",
    "message": "This is an important announcement",
    "voice_id": "marrvin",
    "voice_settings": {
      "stability": 0.8,
      "speed": 1.2,
      "style": 0.5
    },
    "volume": 0.8
  }'
```

### PAI Endpoint (Default DA Voice)

```bash
curl -X POST http://localhost:8888/pai \
  -H "Content-Type: application/json" \
  -d '{
    "title": "PAI Assistant",
    "message": "Analysis complete"
  }'
```

### Health Check

```bash
curl http://localhost:8888/health
```

Response:
```json
{
  "status": "healthy",
  "port": 8888,
  "voice_system": "Qwen TTS",
  "default_voice_id": "marrvin",
  "model_loaded": true,
  "api_key_configured": false,
  "python_subprocess": "running"
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8888 | Server port |
| `QWEN_MODEL_PATH` | auto | Path to Qwen model |
| `QWEN_SERVER_PORT` | 7860 | Python TTS server port |
| `DISABLE_FALLBACK` | false | Disable macOS say fallback |

### Pronunciation Customization

Create `~/.claude/skills/CORE/USER/pronunciations.json`:

```json
{
  "PAI": "Pai",
  "DAIV": "David",
  "TTS": "Text To Speech"
}
```

## Voice Management

### Built-in Voices

Qwen3-TTS provides several built-in timbres (loaded from model):

- `default`: Standard English voice
- `demo_speaker0`: Reference male voice
- Additional timbres available via model

### Custom Voice Cloning (Phase 3)

Upload reference audio for voice cloning:

```bash
curl -X POST http://localhost:8888/upload-voice \
  -F "audio_file_label=my_custom_voice" \
  -F "file=@/path/to/reference_audio.wav"
```

Use cloned voice:

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "message": "Testing custom voice",
    "voice_id": "my_custom_voice"
  }'
```

## Troubleshooting

### Python Subprocess Not Starting

```bash
# Check Python server is running
curl http://localhost:7860/health

# View Python server logs
# Logs output to terminal where it was started
```

### Model Not Loading

```bash
# Check model cache
ls ~/.cache/huggingface/hub/ | grep Qwen

# Clear cache and re-download
rm -rf ~/.cache/huggingface/hub/models--Qwen--*
```

### Falling Back to macOS Say

Check health endpoint for `python_subprocess` status. If `crashed`, restart server.

### Audio Not Playing

```bash
# Test afplay directly
afplay /System/Library/Sounds/Ping.aiff

# Check volume is not 0.0
curl http://localhost:8888/health | grep volume
```

## Development

### Running Tests

```bash
# Unit tests
bun test

# Integration tests
bun test:integration

# Contract tests (API compatibility)
bun test:contract
```

### Project Structure

```
src/
├── server.ts              # Main Bun server
├── qwen-tts-server.py     # Python TTS inference server
├── models/
│   └── voice-config.ts    # Voice configuration loader
├── services/
│   ├── tts-client.ts      # Qwen TTS HTTP client
│   ├── prosody-translator.ts  # Prosody parameter mapping
│   └── subprocess-manager.ts  # Python process management
└── utils/
    ├── text-sanitizer.ts  # Input sanitization
    └── pronunciation.ts   # Pronunciation substitution
```

## Migration from ElevenLabs

No code changes required! The API is fully compatible:

1. Update `~/.claude/.env` to remove `ELEVENLABS_API_KEY`
2. Start the new Qwen TTS server
3. All existing clients work unchanged

## Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Response time | <3s | For messages <200 chars |
| Startup time | <5s | Including model load |
| Memory usage | <2GB | System RAM (during operation) |
| Concurrent requests | 10 | No degradation |

## License

Qwen3-TTS is licensed under Apache 2.0. Commercial use permitted.
