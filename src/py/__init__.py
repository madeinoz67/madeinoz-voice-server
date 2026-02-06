"""
Qwen TTS Server Package

This package provides the Python FastAPI server for Qwen3-TTS text-to-speech
inference as part of the madeinoz-voice-server project.

Architecture:
- Hybrid TypeScript/Python design
- Bun HTTP server handles main API endpoints
- Python FastAPI server handles TTS inference
- Communication via HTTP on localhost

Attribution:
    Inspired by ValyrianTech/Qwen3-TTS_server
    https://github.com/ValyrianTech/Qwen3-TTS_server

    This implementation is original, designed as a drop-in replacement
    for the ElevenLabs-based PAI voice server. Key differences:
    - ElevenLabs-compatible API contract (JSON POST requests)
    - macOS-first design with pyttsx3 fallback
    - CPU-based inference suitable for local development
    - Integrated subprocess management from TypeScript host
"""

__version__ = "0.1.0"
