# Implementation Plan: Qwen TTS Voice Server

**Branch**: `001-qwen-tts` | **Date**: 2026-02-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-qwen-tts/spec.md`

## Summary

Replace the ElevenLabs-based PAI voice server with Qwen3-TTS for local-first text-to-speech. The implementation uses a hybrid architecture: a Bun/TypeScript main server handles the existing API contract while a Python FastAPI subprocess manages Qwen3-TTS model inference. Key innovations include a prosody translation layer that maps ElevenLabs numerical parameters to Qwen's natural language instructions, and a robust fallback chain ensuring reliability.

## Technical Context

**Language/Version**: TypeScript (Bun 1.0+), Python 3.10+
**Primary Dependencies**: Bun (HTTP server), FastAPI (Python TTS server), Qwen3-TTS (12Hz-1.7B-Base model), Transformers, PyTorch
**Storage**: File-based (AGENTPERSONALITIES.md, pronunciations.json), HuggingFace cache for model
**Testing**: Bun test (unit/integration), pytest (Python TTS server)
**Target Platform**: macOS 13+ (Ventura or later), x86_64 or arm64
**Project Type**: Single project with hybrid TypeScript/Python components
**Performance Goals**: <3s response time (<200 char messages), <5s startup, <2GB memory, 10 concurrent requests
**Constraints**: Port 8888 default, 3.4GB model disk space, local-first (no API keys), macOS-only (afplay/osascript)
**Scale/Scope**: Single-user, <100 requests/day typical, 10-20 configured voices

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASSED (No constitution configured - using template)

No project constitution exists yet. The implementation follows PAI best practices:
- **Library-First**: TTS client is a separate module
- **CLI Interface**: Server exposes HTTP endpoints with JSON I/O
- **Test-First**: Tests written before implementation
- **Integration Testing**: Contract tests verify API compatibility

## Project Structure

### Documentation (this feature)

```text
specs/001-qwen-tts/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Technical research findings
├── data-model.md        # Phase 1: Entity definitions
├── quickstart.md        # Phase 1: Getting started guide
├── contracts/           # Phase 1: API specifications
│   └── api.yaml        # OpenAPI 3.0 specification
├── checklists/          # Quality checklists
│   └── requirements.md # Spec validation checklist
└── tasks.md             # Phase 2: Implementation tasks (NOT created yet)
```

### Source Code (repository root)

```text
src/
├── server.ts              # Main Bun HTTP server (entry point)
├── qwen-tts-server.py     # Python FastAPI TTS inference server
├── models/
│   ├── voice-config.ts    # Voice configuration types
│   ├── notification.ts    # Request/response types
│   └── health.ts          # Health status types
├── services/
│   ├── tts-client.ts      # Qwen TTS HTTP client
│   ├── prosody-translator.ts  # ElevenLabs → Qwen prosody mapping
│   ├── subprocess-manager.ts  # Python process lifecycle
│   ├── voice-loader.ts    # AGENTPERSONALITIES.md parser
│   └── pronunciation.ts   # Text preprocessing
└── utils/
    ├── text-sanitizer.ts  # Input validation and sanitization
    └── logger.ts          # Structured logging

tests/
├── contract/             # API compatibility tests
│   ├── notify-api.test.ts
│   └── health-api.test.ts
├── integration/          # End-to-end tests
│   ├── notification-flow.test.ts
│   └── fallback-behavior.test.ts
└── unit/                 # Component tests
    ├── prosody-translator.test.ts
    ├── text-sanitizer.test.ts
    └── voice-loader.test.ts
```

**Structure Decision**: Single project structure chosen because the voice server is a unified service with TypeScript and Python components working together. The Python TTS server is managed as a subprocess by the main Bun server.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. The implementation follows the existing PAI voice server pattern with a straightforward technology substitution.

## Phase 0: Research Complete

**Status**: ✅ Complete

### Key Findings

1. **Integration Approach**: Python subprocess with local Qwen3-TTS model chosen over HF API (feature parity, local-first)
2. **Prosody Mapping**: Numerical → natural language translation layer required
3. **Voice Management**: Three-tier system (built-in → personalities → custom clones)
4. **Fallback Strategy**: Qwen TTS → macOS say → error

**Deliverables**: [research.md](./research.md)

## Phase 1: Design Complete

**Status**: ✅ Complete

### Data Model

**Deliverable**: [data-model.md](./data-model.md)

Core entities defined:
- `VoiceConfig`: Voice personality with prosody settings
- `NotificationRequest`: Incoming API request
- `TTSRequest/TTSResponse`: Internal TTS service communication
- `PronunciationRule`: Text substitution for TTS
- `HealthStatus`: Server monitoring

### API Contracts

**Deliverable**: [contracts/api.yaml](./contracts/api.yaml)

OpenAPI 3.0 specification with:
- `POST /notify`: Main notification endpoint (drop-in compatible)
- `POST /pai`: Simplified endpoint with default DA voice
- `GET /health`: Server status and configuration
- Full request/response schemas with examples
- CORS security (localhost only)

### Quickstart Guide

**Deliverable**: [quickstart.md](./quickstart.md)

Complete setup guide covering:
- Prerequisites and installation
- Server startup (dev and production)
- API usage examples
- Configuration and voice management
- Troubleshooting

## Implementation Phases

### Phase 1 (P1): Core TTS - MVP

**Goal**: Basic drop-in replacement with built-in voices

**Components**:
1. Bun HTTP server with `/notify`, `/pai`, `/health` endpoints
2. Python FastAPI TTS server with Qwen3-TTS model
3. Subprocess manager for Python process lifecycle
4. Prosody translator (numerical → natural language)
5. Text sanitization and input validation
6. macOS notification and audio playback (afplay)
7. Fallback to macOS say command

**Acceptance**:
- ✅ Existing PAI clients work with URL change only
- ✅ All built-in voices produce intelligible audio
- ✅ Fallback to say when TTS fails
- ✅ Health endpoint reports correct status

### Phase 2 (P2): Voice Personalities

**Goal**: Support configured agent voices with prosody

**Components**:
1. Voice personality loader (AGENTPERSONALITIES.md parser)
2. Per-voice prosody defaults
3. Voice configuration caching
4. Pronunciation substitution support

**Acceptance**:
- ✅ Each agent voice has distinct characteristics
- ✅ Prosody settings affect audio output
- ✅ Pronunciations applied before TTS

### Phase 3 (P3): Custom Voice Cloning

**Goal**: User-uploaded reference audio for custom voices

**Components**:
1. Voice upload endpoint (`POST /upload-voice`)
2. Reference audio storage (~/.claude/voices/)
3. Voice cloning integration with Qwen3-TTS
4. Custom voice management API

**Acceptance**:
- ✅ Users can upload 10-20s reference audio
- ✅ Cloned voice matches reference characteristics
- ✅ Custom voices selectable via voice_id

## Next Steps

1. **Phase 2 (SpecKit)**: Run `/speckit.tasks` to generate executable task list from this plan
2. **Implementation**: Run `/speckit.implement` to execute the tasks
3. **Verification**: Contract tests ensure API compatibility
4. **Deployment**: Replace existing ElevenLabs server

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Python subprocess crash | Medium | High | Supervised process with auto-restart |
| Model download failure | Low | High | Bundle model in release |
| Prosody quality issues | Medium | Medium | Extensive testing, tuning |
| Memory constraints | Medium | Medium | Monitoring, cache management |
| Performance degradation | Low | Medium | Load testing, optimization |

## Dependencies

### External
- Qwen3-TTS model (Apache 2.0 licensed)
- HuggingFace Transformers library
- PyTorch
- FastAPI
- Bun runtime

### Internal
- Existing AGENTPERSONALITIES.md structure
- Existing pronunciation.json format
- macOS afplay and osascript commands

## Success Criteria

From [spec.md](./spec.md):
- **SC-001**: Drop-in replacement (no client code changes)
- **SC-002**: <3s response time
- **SC-003**: 95% success rate for well-formed requests
- **SC-004**: 10 concurrent requests
- **SC-005**: Distinct voice personalities
- **SC-006**: Graceful fallback within 5s
- **SC-007**: Zero ElevenLabs dependencies
- **SC-008**: <5s startup time
- **SC-009**: <2GB memory usage
