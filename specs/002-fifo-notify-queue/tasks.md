# Implementation Tasks: FIFO Notification Queue

**Feature**: FIFO Notification Queue
**Branch**: 002-fifo-notify-queue
**Date**: 2026-02-09
**Status**: In Progress

## Task Legend

- `[ ]` - Pending task
- `[X]` - Completed task
- `[P]` - Parallel task (can run concurrently with other [P] tasks)
- `[→ N]` - Depends on task N completing first

---

## Phase 1: Setup

### 1.1 Project Structure
- [ ] 1.1.1 Verify `.gitignore` contains TypeScript patterns (`node_modules/`, `dist/`, `*.log`)
- [ ] 1.1.2 Create `src/ts/models/queue.ts` file
- [ ] 1.1.3 Create `src/ts/services/notification-queue.ts` file
- [ ] 1.1.4 Create `tests/unit/services/` directory
- [ ] 1.1.5 Create `tests/integration/` directory

---

## Phase 2: Core Types

### 2.1 Queue Models
- [ ] 2.1.1 Define `QueuedNotification` interface with id, message, voice_id, status, arrived_at
- [ ] 2.1.2 Define `QueueState` interface with depth, processing_status, health, metrics
- [ ] 2.1.3 Define `QueueConfig` interface with maxDepth, drainTimeoutMs, degradedThreshold
- [ ] 2.1.4 Export all types from `src/ts/models/queue.ts`

---

## Phase 3: Queue Service

### 3.1 NotificationQueue Class
- [ ] 3.1.1 Implement `NotificationQueue` class constructor
- [ ] 3.1.2 Implement `enqueue()` method with maxDepth validation
- [ ] 3.1.3 Implement `processQueue()` private method with sequential processing
- [ ] 3.1.4 Implement `getQueueState()` method for status monitoring
- [ ] 3.1.5 Implement `drain()` method for graceful shutdown
- [ ] 3.1.6 Add queue event logging (item queued, processing, completed, failed)

### 3.2 Queue Processing Logic
- [ ] 3.2.1 Implement TTS synthesis with error handling (skip on failure)
- [ ] 3.2.2 Implement processing flag to prevent concurrent processing
- [ ] 3.2.3 Implement health indicator logic (healthy/degraded/unavailable)

---

## Phase 4: Server Integration

### 4.1 Notify Endpoint Updates
- [ ] 4.1.1 Create NotificationQueue instance in server state
- [ ] 4.1.2 Update `handleNotify()` to use queue instead of direct TTS call
- [ ] 4.1.3 Return 201 Accepted immediately on successful enqueue
- [ ] 4.1.4 Return 400 Bad Request for invalid input (before queue)
- [ ] 4.1.5 Return 429 Too Many Requests when queue is full

### 4.2 Queue Status Endpoint
- [ ] 4.2.1 Add `handleQueueStatus()` function
- [ ] 4.2.2 Add GET `/queue/status` route to Bun.serve handler
- [ ] 4.2.3 Return QueueStateResponse with depth, status, health, metrics

### 4.3 Graceful Shutdown
- [ ] 4.3.1 Update shutdown handler to call `queue.drain()`
- [ ] 4.3.2 Implement drain timeout (30 seconds)
- [ ] 4.3.3 Log remaining items on timeout

---

## Phase 5: Tests

### 5.1 Unit Tests [P]
- [ ] 5.1.1 Test `enqueue()` adds items to queue
- [ ] 5.1.2 Test `enqueue()` rejects when maxDepth exceeded
- [ ] 5.1.3 Test FIFO ordering with multiple items
- [ ] 5.1.4 Test `processQueue()` processes items sequentially
- [ ] 5.1.5 Test `processQueue()` skips failed items
- [ ] 5.1.6 Test `getQueueState()` returns correct state
- [ ] 5.1.7 Test `drain()` completes within timeout
- [ ] 5.1.8 Test queue event logging

### 5.2 Integration Tests [P]
- [ ] 5.2.1 Test POST /notify returns 201 Accepted
- [ ] 5.2.2 Test multiple requests process sequentially
- [ ] 5.2.3 Test queue overflow returns 429
- [ ] 5.2.4 Test invalid requests return 400
- [ ] 5.2.5 Test GET /queue/status returns correct state
- [ ] 5.2.6 Test health indicator reflects TTS availability

---

## Phase 6: Validation

### 6.1 Code Quality
- [ ] 6.1.1 Run `bun run typecheck` - zero errors
- [ ] 6.1.2 Run `bun run lint` - zero warnings
- [ ] 6.1.3 Run `bun test` - all tests pass
- [ ] 6.1.4 Verify Codanna index is updated

### 6.2 Documentation
- [ ] 6.2.1 Verify JSDoc comments on all public methods
- [ ] 6.2.2 Verify quickstart.md examples are accurate
- [ ] 6.2.3 Verify API contracts match implementation

---

## Execution Notes

- **TDD Approach**: Write tests before implementation (Phase 5 before Phase 3-4)
- **File Coordination**: Tasks in Phase 3 affect `notification-queue.ts`, must run sequentially
- **Parallel Tasks**: Phase 5.1 and 5.2 marked [P] can run concurrently after test setup
- **Dependencies**: Each phase must complete before the next phase begins

---

## Progress Tracking

| Phase | Tasks | Completed | Status |
|-------|-------|------------|--------|
| 1. Setup | 5 | 0 | Pending |
| 2. Core Types | 4 | 0 | Pending |
| 3. Queue Service | 9 | 0 | Pending |
| 4. Server Integration | 8 | 0 | Pending |
| 5. Tests | 14 | 0 | Pending |
| 6. Validation | 7 | 0 | Pending |
| **Total** | **47** | **0** | **0%** |

---

**Next Steps**: Begin with Phase 1 (Setup) to establish project structure.
