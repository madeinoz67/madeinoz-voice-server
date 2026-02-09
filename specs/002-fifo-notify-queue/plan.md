# Implementation Plan: FIFO Notification Queue

**Branch**: `002-fifo-notify-queue` | **Date**: 2026-02-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-fifo-notify-queue/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a FIFO (first-in-first-out) queue for the voice server's `/notify` endpoint to prevent audio overlap when multiple agents send notifications simultaneously. The queue accepts requests immediately with a 201 Accepted response, then processes notifications sequentially in the background. Includes a `/queue/status` monitoring endpoint and graceful shutdown with queue draining.

**Key Requirements**:
- FIFO ordering for all notifications
- 201 Accepted response within 100ms
- Max 100 item queue depth with 429 on overflow
- Invalid requests rejected immediately (400 Bad Request)
- Graceful shutdown drains queue before exit

## Technical Context

**Language/Version**: TypeScript 5.x (Bun runtime)
**Primary Dependencies**: Bun native APIs, MLX-audio CLI (existing)
**Storage**: In-memory array (no persistence per spec)
**Testing**: Bun test runner (built-in)
**Target Platform**: macOS only (Constitution Principle IV)
**Project Type**: Single (monorepo with server code in `src/ts/`)
**Performance Goals**:
- 201 Accepted response < 100ms
- Queue status response < 50ms
- Max 100 queued items
- Sequential audio playback (no overlap)
**Constraints**:
- In-memory queue only (no persistence)
- Single worker for FIFO ordering
- Queue depth ≤ 100 items
- Shutdown drain timeout ≤ 30 seconds
**Scale/Scope**:
- Local voice server (single instance)
- 2-7 rapid notifications per PAI Algorithm operation
- Average 3-10 second TTS processing time per notification

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Drop-in Compatibility
✅ **PASS** - `/notify` endpoint maintains exact contract. 201 Accepted is compatible with existing PAI system expectations. No breaking changes to request/response formats.

### Principle II: Local-First Architecture
✅ **PASS** - Queue is in-memory, no external API dependencies. MLX-audio remains primary TTS backend.

### Principle III: Graceful Degradation
✅ **PASS** - Queue skip-on-failure pattern continues processing even when individual items fail. Existing fallback to macOS `say` preserved.

### Principle IV: Platform Honesty
✅ **PASS** - No cross-platform abstractions. Uses macOS-native commands (`afplay`, `osascript`) directly.

### Principle V: Test-First Validation
✅ **PASS** - Unit and integration tests planned for all queue operations, API endpoints, and error conditions. TDD approach followed.

### Principle VI: Codanna Workflow
✅ **PASS** - All new TypeScript files in `src/ts/services/` and `src/ts/models/` will be indexed. Codanna used for symbol lookup and impact analysis.

### Principle VII: Documentation Standards
✅ **PASS** - This plan follows Markdown formatting requirements. API documentation in OpenAPI format. Code will have JSDoc comments.

**Overall Gate Status**: ✅ **PASS** - All constitutional principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/002-fifo-notify-queue/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api.yaml         # OpenAPI specification
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/ts/
├── services/
│   ├── notification-queue.ts     # NEW: Queue implementation
│   ├── mlx-tts-client.ts         # EXISTING: No changes needed
│   ├── pronunciation.ts          # EXISTING: No changes needed
│   ├── prosody-translator.ts     # EXISTING: No changes needed
│   └── voice-loader.ts           # EXISTING: No changes needed
├── models/
│   ├── queue.ts                  # NEW: Queue types
│   ├── notification.ts           # EXISTING: No changes needed
│   ├── health.ts                 # EXISTING: Extended with queue fields
│   ├── tts.ts                    # EXISTING: No changes needed
│   └── voice-config.ts           # EXISTING: No changes needed
├── middleware/
│   ├── cors.ts                   # EXISTING: No changes needed
│   └── rate-limiter.ts           # EXISTING: No changes needed
├── utils/
│   ├── logger.ts                 # EXISTING: No changes needed
│   └── text-sanitizer.ts         # EXISTING: No changes needed
└── server.ts                     # MODIFY: Add queue integration, /queue/status endpoint

tests/
├── unit/
│   └── services/
│       └── notification-queue.test.ts   # NEW: Queue unit tests
└── integration/
    └── queue-api.test.ts                 # NEW: Queue API integration tests
```

**Structure Decision**: Single project structure (Option 1). This is a backend service with HTTP API, no frontend component. All code resides in `src/ts/` following existing patterns.

---

## Phase 0: Research ✓ Complete

**Status**: Complete

**Research Output**: [research.md](./research.md)

**Key Decisions**:
1. **Queue Implementation**: Array-based in-memory queue with async/await processing
2. **Concurrency**: Single async worker with Promise-based processing
3. **Graceful Shutdown**: Await queue drain with 30-second timeout
4. **Error Handling**: Skip failed items, continue processing
5. **Health Monitoring**: Extend existing HealthStatus model with queue fields
6. **Rate Limiting**: Apply before queue admission, separate 429 for queue full

**Open Questions Resolved**:
- ✅ Shutdown behavior: Drain queue before exit (30s timeout)
- ✅ Queue status returns: 200 OK with health indicator
- ✅ Invalid requests: Reject immediately (400) before queuing

---

## Phase 1: Design & Contracts ✓ Complete

**Status**: Complete

### Data Model

**Output**: [data-model.md](./data-model.md)

**Entities Defined**:
- `QueuedNotification` - Queued item with message, voice settings, status
- `QueueState` - Current queue depth, processing status, health indicator
- `QueueConfig` - Configuration for max depth, drain timeout, degraded threshold

**Type Dependencies**:
- Uses existing `NotificationRequest`, `ProsodySettings` from `models/notification.ts` and `models/voice-config.ts`
- Extends `HealthStatus` from `models/health.ts` with queue fields

### API Contracts

**Output**: [contracts/api.yaml](./contracts/api.yaml)

**Endpoints Specified**:
1. `POST /notify` - Queue notification (201/400/429/500)
2. `GET /queue/status` - Get queue state (200 always)

**Request/Response Schemas**:
- `NotificationRequest` - Queue request body
- `SuccessResponse` - Success response
- `ErrorResponse` - Error response
- `QueueStateResponse` - Queue status response

### Quickstart Guide

**Output**: [quickstart.md](./quickstart.md)

**Covers**:
- Development setup
- API usage examples
- Testing queue behavior
- Troubleshooting
- Configuration options

---

## Phase 2: Tasks (NOT CREATED YET)

**Status**: Pending `/speckit.tasks` command

**Note**: Run `/speckit.tasks` to generate `tasks.md` with dependency-ordered implementation tasks.

---

## Testing Strategy (Per Constitution Principle V)

### Unit Tests

**File**: `tests/unit/services/notification-queue.test.ts`

Coverage:
- Queue enqueue/dequeue operations
- FIFO ordering verification
- Max depth enforcement
- Processing state management
- Error handling (skip failed items)
- Graceful shutdown with drain

### Integration Tests

**File**: `tests/integration/queue-api.test.ts`

Coverage:
- `POST /notify` returns 201 Accepted
- Multiple requests process sequentially (no audio overlap)
- Queue overflow returns 429
- Invalid requests return 400
- `GET /queue/status` returns correct state
- Health indicator reflects TTS availability

### Test Doubles

- Mock `processTTS()` function for unit tests
- Mock MLX TTS client for integration tests
- Fake timers for timing-sensitive tests

---

## Constitution Re-Check (Post-Design)

*Re-evaluated after Phase 1 design*

✅ **All Principles Pass** - No violations, no complexity tracking required.

Design decisions uphold all constitutional principles:
- Drop-in compatibility maintained (201 Accepted is standard HTTP pattern)
- Local-first architecture (in-memory queue)
- Graceful degradation (skip-on-failure)
- Platform honesty (macOS-only)
- Test-first validation (comprehensive tests planned)
- Codanna workflow (new files will be indexed)
- Documentation standards (OpenAPI, JSDoc, Markdown)

---

## Implementation Notes

### Queue Processing Flow

```
HTTP Request → Validate → Enqueue → Return 201
                                      ↓
                               Background Worker
                                      ↓
                         Process TTS → Play Audio
                                      ↓
                              Next Item (if any)
```

### Graceful Shutdown Flow

```
SIGTERM/SIGINT → Set draining flag → Stop accepting requests
                                          ↓
                                  Wait for queue empty (30s timeout)
                                          ↓
                                    Exit process
```

### Error Handling Flow

```
TTS Failure → Log error → Skip to next item → Continue processing
Queue Full → Return 429 → Client may retry
Invalid Request → Return 400 → Never queued
```

---

## Dependencies

### Internal Dependencies

- `src/ts/models/notification.ts` - Request/response types
- `src/ts/models/voice-config.ts` - ProsodySettings type
- `src/ts/models/health.ts` - HealthStatus extension
- `src/ts/services/mlx-tts-client.ts` - TTS synthesis
- `src/ts/utils/logger.ts` - Logging
- `src/ts/utils/text-sanitizer.ts` - Input validation
- `src/ts/services/voice-loader.ts` - Voice ID validation

### External Dependencies

- Bun runtime (native Promise, Array, crypto APIs)
- MLX-audio CLI (existing TTS backend)

---

## Success Criteria Verification

**From Spec**:

| Criterion | Verification |
|-----------|--------------|
| SC-001: Sequential playback | Integration test sends 10 concurrent requests, verifies no audio overlap |
| SC-002: 201 in < 100ms | Unit test measures response time for enqueue operation |
| SC-003: Status < 50ms | Unit test measures `/queue/status` response time |
| SC-004: 429 on overflow | Integration test fills queue to 100, verifies 429 on 101st request |
| SC-005: 400 on invalid | Unit tests for each validation failure scenario |

---

## Next Steps

1. **Run `/speckit.tasks`** - Generate implementation task list
2. **Update agent context** - Run `.specify/scripts/bash/update-agent-context.sh claude`
3. **Begin implementation** - Follow tasks in dependency order
4. **Update Codanna index** - After adding new TypeScript files

---

**Plan Status**: ✅ Phase 0 & 1 Complete | Phase 2 Pending `/speckit.tasks`
