# voice-server

Welcome to the voice-server documentation.

## Overview

voice-server is a local-first Text-to-Speech (TTS) service built with Bun. It supports multiple backends including MLX-audio (Kokoro-82M) for fast local TTS on Apple Silicon, and Qwen TTS for custom voice cloning.

## Features

- 🎙️ **Local TTS** - All audio generation happens on your machine
- 💰 **Cost-Free** - No per-character or per-minute charges
- 🔒 **Private** - No data sent to external services
- 🔊 **41 Built-in Voices** - Numeric voice IDs for easy configuration
- ⚡ **Fast Streaming** - Smooth real-time audio playback (RTF ~1.0x)
- 🌍 **Multi-language** - English, British, Japanese, Chinese voices
- 📱 **macOS Integration** - Native notifications and audio playback

## Quick Installation

### Prerequisites

```bash
# Install Bun (TypeScript runtime)
curl -fsSL https://bun.sh/install | bash

# Install uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install ffmpeg (for audio conversion)
brew install ffmpeg
```

### Install and Run

```bash
# Clone and navigate to project
cd voice-server

# Install dependencies
bun install
uv tool install mlx-audio

# Run the server
TTS_BACKEND=mlx PORT=8888 bun run dev

# Test
curl http://localhost:8888/health
```

For complete installation instructions, API documentation, and configuration options, see the [README](../README.md).

## Documentation

- [README](../README.md) - Main documentation with installation, API reference, and configuration
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development setup and configuration
- [VOICE_GUIDE.md](VOICE_GUIDE.md) - User voice configuration guide
- [VOICE_QUICK_REF.md](VOICE_QUICK_REF.md) - Quick reference for all 41 voices
- [KOKORO_VOICES.md](KOKORO_VOICES.md) - Technical voice documentation
- [MIGRATION.md](MIGRATION.md) - ElevenLabs migration guide
