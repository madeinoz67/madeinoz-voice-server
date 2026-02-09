# Data Model: FIFO Notification Queue

**Feature**: FIFO Notification Queue
**Date**: 2026-02-09
**Status**: Draft

## Overview

This document defines the data structures and entities for the FIFO notification queue system.

---

## Core Entities

### QueuedNotification

Represents a single notification request awaiting or undergoing processing.

```typescript
interface QueuedNotification {
  /** Unique identifier for this queued item */
  id: string;

  /** Notification title (optional) */
  title?: string;

  /** Text message to synthesize (required) */
  message: string;

  /** Voice identifier to use */
  voice_id: string;

  /** Voice prosody settings (optional) */
  voice_settings?: ProsodySettings;

  /** Playback volume (0.0-1.0) */
  volume: number;

  /** Timestamp when request was received (ms since epoch) */
  arrived_at: number;

  /** Current processing status */
  status: QueuedNotificationStatus;
}

type QueuedNotificationStatus =
  | "pending"     // Awaiting processing
  | "processing"  // Currently being synthesized
  | "completed"   // Successfully played
  | "failed";     // Failed during synthesis/playback
```

**Relationships**: None (standalone entity)

**Lifecycle**: `pending` → `processing` → `completed` OR `failed`

**Validation Rules**:
- `id`: Non-empty string, UUID format
- `message`: 1-500 characters after sanitization
- `voice_id`: Must match available voice or use default
- `volume`: 0.0-1.0 inclusive

---

### QueueState

Represents the current state of the notification queue for monitoring.

```typescript
interface QueueState {
  /** Current number of items in queue */
  depth: number;

  /** Whether queue is actively processing */
  processing_status: ProcessingStatus;

  /** Overall system health indicator */
  health: HealthIndicator;

  /** Optional metrics for monitoring */
  metrics?: QueueMetrics;
}

type ProcessingStatus = "idle" | "active";

type HealthIndicator = "healthy" | "degraded" | "unavailable";

interface QueueMetrics {
  /** Average wait time for queued items (milliseconds) */
  average_wait_time_ms: number;

  /** Total items processed since server start */
  items_processed: number;

  /** Total items that failed since server start */
  items_failed: number;
}
```

**Relationships**: References `QueuedNotification` (aggregate)

**State Transitions**:
- `processing_status`: `idle` ↔ `active` based on whether worker is running
- `health`: Determined by TTS availability and queue depth

**Health Determination Logic**:
```
if (TTS unavailable) → unavailable
else if (queue depth >= 80) → degraded
else → healthy
```

---

### QueueConfig

Configuration for queue behavior.

```typescript
interface QueueConfig {
  /** Maximum number of items allowed in queue */
  maxDepth: number;

  /** Timeout for queue drain during shutdown (milliseconds) */
  drainTimeoutMs: number;

  /** Threshold for degraded health status (percentage of maxDepth) */
  degradedThreshold: number;
}
```

**Default Values**:
- `maxDepth`: 100
- `drainTimeoutMs`: 30000 (30 seconds)
- `degradedThreshold`: 0.8 (80%)

---

## Data Flow

### Request → Queue → Processing Flow

```
┌─────────────┐
│ HTTP Request│
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Input Validation│ (schema, voice_id, sanitization)
└──────┬──────────┘
       │
       ▼ (if valid)
┌─────────────┐
│ Enqueue     │ (add to queue array)
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Return 201      │ (immediate, async processing)
└─────────────────┘
       │
       ▼ (background)
┌─────────────────┐
│ Queue Worker    │ (process items sequentially)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ TTS Synthesis   │ (processTTS function)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Audio Playback  │
└─────────────────┘
```

---

## State Management

### Queue Processing State

The queue maintains a processing flag to prevent concurrent processing:

```typescript
class NotificationQueue {
  private queue: QueuedNotification[] = [];
  private processing = false;  // Single worker flag

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        // Process item...
      }
    } finally {
      this.processing = false;
    }
  }
}
```

### Graceful Shutdown State

During shutdown, the queue enters a draining state:

```typescript
interface QueueState {
  draining: boolean;  // true during shutdown
}
```

Shutdown sequence:
1. Set `draining = true`
2. Stop accepting new requests
3. Wait for queue to empty (with timeout)
4. Exit process

---

## Error State Transitions

### Item Failure

When TTS synthesis fails for a queued item:

```
pending → processing → failed
```

Behavior:
- Log error with item ID
- Skip to next item
- Increment `items_failed` metric
- Continue processing remaining items

### Queue Overflow

When enqueue would exceed `maxDepth`:

```
HTTP Request → 429 Too Many Requests
```

Behavior:
- Return 429 immediately
- Do not add item to queue
- Client may retry later

---

## Persistence Strategy

### In-Memory Only (Per Spec)

- Queue data stored in JavaScript array
- No persistence to disk or database
- Server restart = queue cleared
- Queue depth limit (100) prevents memory issues

### Rationale

- Voice notifications are transient (3-10s playback)
- Local voice server (not distributed)
- Persistence would add complexity without significant benefit
- Server restarts are infrequent

---

## Type Dependencies

### Existing Types Used

From `src/ts/models/notification.ts`:
- `NotificationRequest`
- `PaiNotificationRequest`
- `SuccessResponse`
- `ErrorResponse`

From `src/ts/models/voice-config.ts`:
- `ProsodySettings`

From `src/ts/models/health.ts`:
- `HealthStatus` (extended with queue fields)

### New Types Defined

- `QueuedNotification`
- `QueuedNotificationStatus`
- `QueueState`
- `ProcessingStatus`
- `HealthIndicator`
- `QueueMetrics`
- `QueueConfig`

---

## Indexes and Ordering

### FIFO Ordering

Queue maintains strict FIFO ordering:
- Items added with `push()` to end of array
- Items removed with `shift()` from beginning of array
- `arrived_at` timestamp preserves order for debugging

### No Indexes Required

- In-memory array access is O(1) for push
- O(n) shift is acceptable for n ≤ 100
- No lookup by ID required
- No sorting or reordering needed

---

## Memory Considerations

### Per-Item Memory

Approximate memory per `QueuedNotification`:
- `id`: 36 bytes (UUID string)
- `message`: ~100 bytes average
- `voice_id`: 20 bytes
- `voice_settings`: ~50 bytes
- Metadata: ~50 bytes
- **Total**: ~250 bytes per item

### Total Memory

- 100 items × 250 bytes = ~25 KB
- Negligible impact on server memory
- Well under 2GB memory limit (Constitution)

---

## Concurrency Model

### Single-Threaded Event Loop

Bun/JavaScript is single-threaded:
- No mutex needed for queue operations
- Array operations are atomic
- `processing` flag prevents race conditions

### Multiple Producers

Multiple HTTP requests can call `enqueue()` concurrently:
- Each request is handled by event loop
- `enqueue()` returns immediately after array push
- `processQueue()` is idempotent (checks `processing` flag)

### Single Consumer

Background worker processes items sequentially:
- Only one `processQueue()` runs at a time
- Ensures strict FIFO ordering
- Prevents audio overlap

---

## Validation Rules Summary

| Field | Validation | Error Response |
|-------|-----------|----------------|
| `message` | 1-500 chars, not empty after sanitization | 400 Bad Request |
| `voice_id` | Valid voice from available list | 400 Bad Request |
| `volume` | 0.0-1.0 inclusive | 400 Bad Request |
| Queue depth | < maxDepth (100) | 429 Too Many Requests |

---

## Next Steps

Proceed to API contract generation in `/contracts/` directory.
