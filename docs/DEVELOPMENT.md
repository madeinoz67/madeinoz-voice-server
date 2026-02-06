# Development Configuration

This document explains the development setup for the Qwen TTS Voice Server.

## Environment Variables

### Development Mode
When running in development mode (`NODE_ENV=development`), the server automatically loads `.env.development` which includes:

- **PORT=8889** - Development server port (differs from production port 8888)
- **QWEN_SERVER_PORT=7861** - Python TTS server port (differs from production 7860)
- **LOG_LEVEL=debug** - Verbose logging for debugging

### Starting the Server in Development Mode

```bash
# Start development server (uses .env.development automatically)
NODE_ENV=development bun run dev
```

This will start the server on port **8889** instead of 8888, avoiding conflicts with the production PAI voice server.

### Python Development Server

```bash
# Start Python TTS server in development mode (port 7861)
uv run uvicorn src.py.qwen_tts_server:app --port 7861 --reload
```

The `--reload` flag enables auto-reload during development.

## Model Caching

### Model Information

**Recommended Model**: `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign`

This model is chosen because:
- Supports **text-to-voice creation** from natural language descriptions
- Creates distinct voices for different agent personalities without audio samples
- Enables unlimited scalability for multi-agent systems
- Provides instruction-based emotional control
- Cross-language consistency (10 languages supported)

### Cache Location

Models are automatically cached to:
```
~/.cache/huggingface/hub/models--Qwen--Qwen3-TTS-12Hz-1.7B-VoiceDesign/
```

### Model Download Behavior

On first startup, if the model is not found in cache:
1. The server will log: `✗ Model not found in cache: [path]`
2. It will log: `Would download model 'Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice' on first use`
3. The model will be downloaded and cached automatically
4. On subsequent startups: `✓ Found cached model in HuggingFace cache: [path]`

### Current Implementation

Currently using **pyttsx3** (macOS system TTS) as fallback:
- No download required
- Immediately available
- Limited voice options
- Used until Qwen3-TTS VoiceDesign model is fully implemented

### Voice Design for Agent Personalities

The VoiceDesign model allows creating distinct voices via natural language descriptions:

```python
# Example agent voice profiles
agent_voices = {
    "analyst": "Female, 40s, crisp academic voice, neutral delivery with precise articulation",
    "creative": "Male, 20s, energetic variable pitch, fast-paced with dramatic pauses",
    "mentor": "Male, 50s, warm deep voice, measured pace with authoritative yet supportive tone"
}
```

### Checking Cache Status

To check if the model is already cached:

```bash
ls ~/.cache/huggingface/hub/ | grep Qwen
```

Or check server logs on startup:
```
✓ Found cached model in HuggingFace cache: /Users/username/.cache/huggingface/hub/models--Qwen--Qwen3-TTS-12Hz-1.7B-CustomVoice/
  Using cached model (no download required)
```

## Port Configuration

| Environment | Main Server | Python TTS Server |
|-------------|--------------|-------------------|
| **Development** | 8889 | 7861 |
| **Production** | 8888 | 7860 |

This separation allows development and production servers to run simultaneously without conflicts.
