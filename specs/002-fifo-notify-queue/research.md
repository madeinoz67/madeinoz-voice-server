# Research: FIFO Notification Queue

**Feature**: FIFO Notification Queue
**Date**: 2026-02-09
**Status**: Complete

## Overview

This document consolidates research findings for implementing a FIFO queue for the voice server's `/notify` endpoint. The queue must handle concurrent requests, process them sequentially, and return 201 Accepted immediately.

---

## Queue Implementation Strategy

### Decision: Array-based In-Memory Queue with Async/Await Processing

**Rationale**:
- Bun/TypeScript has native support for async/await and Promise-based patterns
- Array operations are fast for queue sizes ≤ 100 items
- No external dependencies required
- Simple to implement and maintain
- Preserves FIFO ordering naturally (shift/push operations)

**Alternatives Considered**:
- **Linked List**: More complex to implement in TypeScript, no performance benefit for small queues
- **Bun Atomics**: Overkill for single-worker scenario, adds complexity
- **Bun Workers**: Unnecessary overhead for single-threaded queue processing
- **External Queue Libraries** (bull, bee-queue): Too heavy for local voice server use case

**Implementation Pattern**:
```typescript
interface QueuedNotification {
  id: string;
  message: string;
  title?: string;
  voice_id: string;
  voice_settings?: ProsodySettings;
  volume: number;
  arrived_at: number;
  status: "pending" | "processing" | "completed" | "failed";
}

class NotificationQueue {
  private queue: QueuedNotification[] = [];
  private processing = false;
  private maxDepth = 100;

  async enqueue(request: NotificationRequest): Promise<boolean> {
    if (this.queue.length >= this.maxDepth) return false;
    this.queue.push({ ...request, id: crypto.randomUUID(), arrived_at: Date.now(), status: "pending" });
    this.processQueue().catch(() => {});
    return true;
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        await processTTS(item.message, item.voice_id, item.voice_settings || {}, item.volume);
      } catch (error) {
        logger.warn("TTS processing failed for queued item", { id: item.id, error });
      }
    }

    this.processing = false;
  }
}
```

---

## Concurrency & Producer-Consumer Pattern

### Decision: Single Async Worker with Promise-Based Queue Processing

**Rationale**:
- Single worker maintains strict FIFO ordering (no concurrent processing)
- Async/await naturally handles the producer-consumer pattern
- Multiple producers (HTTP requests) can call `enqueue()` concurrently
- Queue is protected by JavaScript's single-threaded event loop
- `processing` flag prevents concurrent queue processing

**Alternatives Considered**:
- **Bun Workers**: Adds complexity with message passing, unnecessary for TTS bottleneck
- **Mutex/Semaphore**: JavaScript is single-threaded, atomic operations not needed
- **Concurrent Processing**: Would violate FIFO requirement and cause audio overlap

**Flow**:
1. HTTP request arrives → `enqueue()` adds to array
2. `enqueue()` triggers `processQueue()` if not already processing
3. `processQueue()` marks processing flag, processes items sequentially
4. Each item: `processTTS()` (await) → next item
5. Queue empty → processing flag cleared

---

## Graceful Shutdown Strategy

### Decision: Await Queue Drain with Timeout

**Rationale**:
- Ensures all queued notifications are played before exit
- Local voice server with short notifications (3-10s) makes this practical
- Users expect voice feedback to complete even during shutdown
- Timeout prevents indefinite hangs on errors

**Alternatives Considered**:
- **Immediate Shutdown**: Loses queued notifications, poor UX
- **Best-Effort Drain**: Same as chosen approach with explicit timeout
- **Persist Queue**: Out of scope per assumptions

**Implementation Pattern**:
```typescript
const shutdown = async () => {
  logger.info("Shutting down server...");

  // Stop accepting new requests
  server.stop();

  // Drain queue with timeout
  const drainTimeout = 30000; // 30 seconds
  const startTime = Date.now();

  while (queue.length > 0 && Date.now() - startTime < drainTimeout) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (queue.length > 0) {
    logger.warn("Queue drain timeout, exiting with pending items", { remaining: queue.length });
  }

  logger.info("Server stopped");
  process.exit(0);
};
```

---

## Error Handling Strategy

### Decision: Skip Failed Items, Continue Processing

**Rationale**:
- Single TTS failure shouldn't block entire queue
- Users want to hear remaining notifications
- Logging provides visibility into failures
- Graceful degradation aligns with Constitution Principle III

**Alternatives Considered**:
- **Stop on First Error**: Blocks remaining items, poor UX
- **Retry Failed Items**: Adds complexity, could cause indefinite loops
- **Dead Letter Queue**: Overkill for local voice server

**Validation Timing**:
- **Schema Validation**: Immediate (before enqueue) — return 400 Bad Request
- **Voice ID Validation**: Immediate (before enqueue) — return 400 Bad Request
- **TTS Synthesis Failure**: Deferred (during processing) — skip to next item

---

## Health Monitoring Strategy

### Decision: Extend Existing HealthStatus Model with Queue Fields

**Rationale**:
- Existing `/health` endpoint infrastructure already in place
- Consistent with current monitoring patterns
- Simple addition of queue-related fields
- Health indicator (healthy/degraded/unavailable) aligns with existing status values

**Alternatives Considered**:
- **Separate `/queue/status` Endpoint**: Creates separate API surface, but required by spec
- **Circuit Breaker Pattern**: Overkill for local server
- **Push Notifications**: Out of scope per spec

**QueueState Model**:
```typescript
interface QueueState {
  depth: number;
  processing_status: "idle" | "active";
  health: "healthy" | "degraded" | "unavailable";
  metrics?: {
    average_wait_time_ms: number;
    items_processed: number;
    items_failed: number;
  };
}
```

**Health Determination**:
- `healthy`: TTS available, queue < 80% capacity
- `degraded`: TTS available but queue ≥ 80% capacity
- `unavailable`: TTS health check failed

---

## Rate Limiting Integration

### Decision: Apply Rate Limits Before Queue Admission

**Rationale**:
- Existing rate limiter middleware applies to POST requests
- Rate limiting prevents abuse regardless of queue state
- Queue overflow (429) is separate from rate limit (429)
- Both protections apply at different layers

**Distinction**:
- **Rate Limit 429**: Too many requests from this client (time-window based)
- **Queue Full 429**: Server queue at capacity (depth-based)

**Response Codes**:
- Rate limit exceeded: `429 Too Many Requests` with existing rate limiter message
- Queue full: `429 Too Many Requests` with queue-specific message
- Both use same status code but different error messages

**No Retry-After Header**: Spec doesn't require it, can be added later if needed

---

## Dependencies & Integration Points

### Existing Components Used

1. **MLX TTS Client** (`src/ts/services/mlx-tts-client.ts`)
   - Already has `synthesize()` method with streaming support
   - Health check method available
   - Used by existing `processTTS()` function

2. **Logger** (`src/ts/utils/logger.ts`)
   - Existing logging infrastructure
   - Use for queue event logging (FR-008)

3. **Text Sanitizer** (`src/ts/utils/text-sanitizer.ts`)
   - Input validation before queuing
   - Returns empty string for invalid input

4. **Voice Loader** (`src/ts/services/voice-loader.ts`)
   - Validate voice_id against available voices
   - Returns list of available voices

5. **Rate Limiter** (`src/ts/middleware/rate-limiter.ts`)
   - Existing middleware, applies before queue check
   - No changes needed

### New Components Required

1. **NotificationQueue Class** (`src/ts/services/notification-queue.ts`)
   - Queue management
   - Enqueue/dequeue operations
   - Graceful shutdown support

2. **QueueState Type** (`src/ts/models/queue.ts`)
   - Type definitions for queue state
   - Status response types

3. **Queue Status Handler** (`src/ts/server.ts`)
   - GET `/queue/status` endpoint handler

---

## Testing Strategy

### Decision: Test-First with TDD Approach (Constitution Principle V)

**Unit Tests** (`tests/unit/services/notification-queue.test.ts`):
- Queue enqueue/dequeue operations
- FIFO ordering verification
- Max depth enforcement
- Processing state management
- Error handling (skip failed items)

**Integration Tests** (`tests/integration/queue-api.test.ts`):
- POST `/notify` returns 201 Accepted
- Multiple requests process sequentially
- Queue overflow returns 429
- Invalid requests return 400
- GET `/queue/status` returns correct state

**Test Doubles**:
- Mock `processTTS()` for unit tests
- Mock MLX TTS client for integration tests
- Fake timers for timing-sensitive tests

---

## Performance Considerations

### Queue Operations

- **Enqueue**: O(1) array push
- **Dequeue**: O(n) array shift, but n ≤ 100 so negligible
- **Memory**: ~1KB per queued item (100 items = ~100KB max)

### Response Times

- **201 Accepted**: < 10ms (validation + array push)
- **Queue Status**: < 5ms (array length + status check)
- **Processing**: 3-10s per item (TTS synthesis time)

### Bottlenecks

- **TTS Synthesis**: Primary bottleneck, queue doesn't solve this
- **Sequential Processing**: By design (FIFO requirement)
- **Queue Depth**: Limited to 100 items prevents memory issues

---

## Security Considerations

### Input Validation (Before Queue)

1. **JSON Parse**: Handle malformed JSON, return 400
2. **Schema Validation**: Required fields present, return 400
3. **Type Validation**: String types, length limits, return 400
4. **Voice ID Validation**: Against available voices, return 400
5. **Text Sanitization**: Remove dangerous characters, return 400 if empty

### Rate Limiting (Before Queue)

- Existing rate limiter applies (10 req/min per client)
- Prevents queue flooding from abusive clients

### Queue Isolation

- In-memory queue = per-server instance
- No cross-client pollution
- Server restart = queue cleared

---

## Documentation Requirements

### API Documentation (OpenAPI/Swagger)

**POST /notify**:
- Request body schema
- 201 Accepted response
- 400 Bad Request response (validation failure)
- 429 Too Many Requests response (queue full)

**GET /queue/status**:
- Response schema with queue depth, status, health
- 200 OK response (always, even when TTS unavailable)

### Code Documentation

- JSDoc comments for `NotificationQueue` class
- Type definitions with documentation
- Inline comments for non-obvious logic

---

## Open Questions Resolved

All questions from spec clarification have been addressed:

1. ✅ **Shutdown Behavior**: Drain queue before exit with 30s timeout
2. ✅ **Queue Status Returns**: 200 OK with health indicator field
3. ✅ **Invalid Request Handling**: Reject immediately (400) before queuing

---

## Next Steps

Proceed to Phase 1: Design & Contracts
- Generate `data-model.md` with entity definitions
- Generate API contracts in `/contracts/`
- Generate `quickstart.md` with development setup
- Update agent context with queue-specific information
