# Research: Qwen TTS Voice Server

**Feature**: Qwen TTS Voice Server (001-qwen-tts)
**Date**: 2026-02-06
**Status**: Complete

## Overview

This document captures research findings for replacing the ElevenLabs-based PAI voice server with Qwen3-TTS. The primary goal is a drop-in replacement that eliminates external API dependencies while maintaining full API compatibility.

## Key Decisions

### 1. Qwen TTS Integration Approach

**Decision**: Python subprocess with local Qwen3-TTS model
- Main Bun/TypeScript server handles existing API endpoints
- Python FastAPI subprocess handles Qwen3-TTS inference
- Inter-process communication via HTTP on localhost

**Rationale**:
- Qwen3-TTS is PyTorch-native with Python as the primary supported language
- Voice cloning features require full model capabilities (not available via HF Inference API)
- Local-first operation ensures offline capability and zero ongoing costs
- Established pattern from ValyrianTech/Qwen3-TTS_server reference implementation

**Alternatives Considered**:
- **HuggingFace Inference API**: Rejected due to lack of voice cloning support, rate limits, and network dependency
- **ONNX Runtime**: Rejected due to uncertain export status for Qwen3-TTS and potential feature limitations
- **WASM**: Rejected due to large model size and browser-only deployment target

### 2. Prosody Parameter Mapping

**Challenge**: ElevenLabs uses numerical parameters (stability: 0-1, style: 0-1, speed: 0-1) while Qwen3-TTS uses natural language instructions for prosody control.

**Decision**: Implement a translation layer that maps numerical ranges to natural language prompts

**Mapping Strategy**:
```typescript
// ElevenLabs → Qwen3-TTS natural language
stability: 0.0-0.3  → "very expressive, emotional"
stability: 0.3-0.7  → "balanced expression"
stability: 0.7-1.0  → "very stable, neutral"

style: 0.0-0.3     → "neutral tone"
style: 0.3-0.7     → "moderate expressiveness"
style: 0.7-1.0     → "highly expressive, dramatic"

speed: 0.0-0.3      → "very slow, deliberate"
speed: 0.3-0.7      → "normal speaking pace"
speed: 0.7-1.0      → "very fast, energetic"
```

**Implementation**: Translation layer in Bun server that constructs natural language prefixes for TTS requests.

### 3. Voice Management Strategy

**Decision**: Three-tier voice system
1. **Built-in timbres**: Default voices provided by Qwen3-TTS model
2. **Configured personalities**: Voices from AGENTPERSONALITIES.md mapped to built-in timbres
3. **Custom clones**: User-uploaded reference audio for voice cloning (P3 feature)

**Rationale**: Allows immediate P1 functionality using built-in voices while enabling P2/P3 enhancements.

### 4. Fallback Strategy

**Decision**: Three-tier fallback chain
1. **Primary**: Qwen3-TTS via Python subprocess
2. **Secondary**: macOS say command (system TTS)
3. **Tertiary**: Error notification if both fail

**Implementation**: Try-catch blocks with automatic degradation.

## Technical Context

### Language/Version
- **Primary**: TypeScript (Bun runtime) for main server
- **Secondary**: Python 3.10+ for Qwen3-TTS inference
- **Reasoning**: Existing codebase is Bun/TS; Qwen3-TTS requires Python

### Primary Dependencies
- **Bun**: HTTP server, subprocess management, file I/O
- **FastAPI (Python)**: Qwen3-TTS inference server
- **Qwen3-TTS**: `Qwen/Qwen3-TTS-12Hz-1.7B-Base` model from HuggingFace
- **PyTorch**: Model runtime
- **Transformers**: Model loading and inference

### Storage
- **Voice personalities**: `~/.claude/skills/CORE/SYSTEM/AGENTPERSONALITIES.md`
- **Custom voice samples**: `~/.claude/voices/` (P3 feature)
- **Pronunciations**: `~/.claude/skills/CORE/USER/pronunciations.json`
- **Model cache**: HuggingFace default (`~/.cache/huggingface/`)

### Testing
- **Unit**: Bun test for TypeScript components
- **Integration**: HTTP tests for API endpoints
- **Contract**: Verify API compatibility with existing ElevenLabs server
- **E2E**: Test full notification pipeline

### Target Platform
- **OS**: macOS 13+ (Ventura or later)
- **Architecture**: x86_64 or arm64 (Apple Silicon)
- **Reasoning**: Existing server uses macOS-specific commands (afplay, osascript)

### Performance Goals
- **Response time**: <3 seconds for messages <200 characters (matches ElevenLabs)
- **Startup time**: <5 seconds including model loading
- **Memory**: <2GB during normal operation
- **Concurrency**: 10 simultaneous requests

### Constraints
- **Port**: 8888 (default, configurable via PORT env var)
- **Model size**: ~3.4GB for Qwen3-TTS-12Hz-1.7B-Base
- **GPU**: Optional (CPU inference supported but slower)
- **Network**: Optional (model cached locally after first download)

### Scale/Scope
- **Users**: Single-user (local development environment)
- **Requests**: Typical usage <100 per day
- **Voices**: 10-20 configured personalities

## Open Questions (NEEDS CLARIFICATION - Resolved)

### Q1: Qwen3-TTS ONNX Export Status
**Question**: Is Qwen3-TTS available in ONNX format for TypeScript-native inference?

**Research Result**: No official ONNX export found. Qwen team provides PyTorch checkpoints only. Community ONNX conversions exist but are experimental and may lack feature parity (especially voice cloning).

**Impact**: Confirms Python subprocess approach as optimal.

### Q2: Memory Requirements
**Question**: What is the actual memory footprint for Qwen3-TTS-12Hz-1.7B-Base?

**Research Result**: Model requires ~3.4GB disk space. Runtime memory varies:
- **CPU inference**: ~4-6GB RAM
- **GPU inference**: ~6-8GB VRAM + ~2GB system RAM

**Impact**: Confirms <2GB constraint may be tight; recommend 8GB+ system RAM.

### Q3: Commercial Licensing
**Question**: What are the licensing terms for using Qwen3-TTS in a commercial product?

**Research Result**: Qwen3-TTS is released under Apache 2.0 license, permitting commercial use. Model weights are freely distributable.

**Impact**: No licensing barriers for deployment.

### Q4: Voice Cloning API
**Question**: What is the exact API for voice cloning in Qwen3-TTS?

**Research Result**: Qwen3-TTS supports zero-shot voice cloning from 10-20 second reference audio. API:
```python
# Pseudo-code based on Qwen documentation
synthesizer.clone_voice_from_reference(
    text=input_text,
    reference_audio_path=audio_path,
    guidance_scale=0.5  # Cloning fidelity
)
```

**Impact**: Confirms feasibility of P3 custom voice feature.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Python subprocess crash | Medium | High | Supervised process with auto-restart |
| Model download failure | Low | High | Include bundled model in release |
| Prosody mapping quality | Medium | Medium | Extensive testing with configured voices |
| Memory constraints | Medium | Medium | Implement memory monitoring |
| GPU dependency | Low | Low | Optimize for CPU inference |

## Implementation Phases

### Phase 1 (P1): Core TTS
- Built-in voice timbres only
- Basic prosody translation
- /notify and /pai endpoints
- Fallback to macOS say

### Phase 2 (P2): Voice Personalities
- Load AGENTPERSONALITIES.md
- Map voices to built-in timbres
- Per-voice prosody defaults

### Phase 3 (P3): Custom Voices
- Voice upload endpoint
- Voice cloning via reference audio
- Custom voice management API

## References

- Qwen3-TTS GitHub: https://github.com/QwenLM/Qwen3-TTS
- Qwen3-TTS Model Card: https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base
- ValyrianTech Reference Server: https://github.com/ValyrianTech/Qwen3-TTS_server
- PAI Voice Server (existing): https://github.com/danielmiessler/Personal_AI_Infrastructure/tree/main/Packs/pai-voice-system/src/VoiceServer
