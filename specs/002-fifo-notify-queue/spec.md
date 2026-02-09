# Feature Specification: FIFO Notification Queue

**Feature Branch**: `001-fifo-notify-queue`
**Created**: 2026-02-09
**Status**: Draft
**Input**: User description: "implement queue system https://github.com/madeinoz67/madeinoz-voice-server/issues/13"
**Related Issue**: https://github.com/madeinoz67/madeinoz-voice-server/issues/13

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sequential Audio Playback (Priority: P1)

When multiple automated agents send voice notifications simultaneously (e.g., during PAI Algorithm phase transitions), the system must play them in sequence rather than overlapping, ensuring each notification is clearly audible and intelligible.

**Why this priority**: This is the core problem - overlapping audio makes notifications unintelligible, defeating the purpose of the voice feedback system. Without sequential playback, the feature provides no value.

**Independent Test**: Can be fully tested by sending multiple simultaneous `/notify` requests and verifying that audio plays one after another without overlap. Delivers clear, sequential voice notifications.

**Acceptance Scenarios**:

1. **Given** the voice server is running, **When** three simultaneous `/notify` POST requests arrive, **Then** all three notifications play sequentially in order of arrival
2. **Given** a notification is currently playing, **When** a new `/notify` request arrives, **Then** the new request is queued and plays after the current notification completes
3. **Given** the notification queue is empty, **When** a single `/notify` request arrives, **Then** the notification plays immediately with no perceptible delay

---

### User Story 2 - Immediate Response Acknowledgment (Priority: P1)

When a client sends a notification request, they receive immediate acknowledgment that the request was accepted, without waiting for audio playback to complete. This prevents timeout issues and allows clients to continue processing immediately.

**Why this priority**: Without immediate acknowledgment, clients may timeout or block waiting for audio to finish. The 201 Accepted pattern is essential for non-blocking client behavior.

**Independent Test**: Can be fully tested by sending a `/notify` request and measuring response time. Expect immediate 201 status response regardless of audio playback duration. Delivers non-blocking API behavior.

**Acceptance Scenarios**:

1. **Given** a `/notify` request is sent, **When** the request is received, **Then** a 201 Accepted status is returned within 100ms (before audio processing begins)
2. **Given** a `/notify` request with a long message, **When** the request is received, **Then** the client receives immediate 201 response and can continue processing while audio plays in background
3. **Given** a client sends multiple rapid requests, **When** each request arrives, **Then** each receives 201 Accepted immediately and queue position is maintained

---

### User Story 3 - Queue Status Monitoring (Priority: P2)

System operators can check the current depth and status of the notification queue to understand system load and identify potential bottlenecks.

**Why this priority**: Operational visibility is important for monitoring and debugging, but the core functionality works without it. Lower priority than P1 stories that deliver the primary value.

**Independent Test**: Can be tested by querying the queue status endpoint and verifying accurate queue depth is returned. Delivers operational visibility into system state.

**Acceptance Scenarios**:

1. **Given** the voice server is running, **When** a GET request to `/queue/status` is made, **Then** the response includes current queue depth, processing status, and health indicator
2. **Given** three notifications are queued, **When** `/queue/status` is queried, **Then** queue depth is reported as 3 and health indicator shows "healthy"
3. **Given** the queue is empty, **When** `/queue/status` is queried, **Then** queue depth is reported as 0
4. **Given** the TTS system is unavailable, **When** `/queue/status` is queried, **Then** health indicator shows "unavailable" while still returning 200 OK

---

### Edge Cases

- When queue exceeds maximum capacity (100 items): Return 429 Too Many Requests
- Malformed notification request (invalid JSON, missing fields): Reject immediately with 400 Bad Request, never queued
- Invalid voice_id or settings: Reject immediately with 400 Bad Request before queuing
- Audio synthesis fails for a queued item: Skip to next item, continue processing
- Server shutdown with queued notifications: Drain queue — complete all pending items before exiting

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST process voice notification requests in first-in-first-out (FIFO) order
- **FR-002**: System MUST return HTTP 201 Accepted status immediately upon receiving a valid notification request
- **FR-003**: System MUST play notification audio sequentially, with no overlap between notifications
- **FR-004**: System MUST maintain a queue of pending notification requests
- **FR-005**: System MUST limit maximum queue depth to 100 items
- **FR-006**: System MUST return 429 Too Many Requests when queue is at maximum capacity
- **FR-013**: System MUST validate request schema and voice_id immediately before queuing, returning 400 Bad Request for invalid input
- **FR-007**: System MUST skip to next queued item if audio synthesis fails for current item
- **FR-008**: System MUST log queue events (item queued, processing started, completed, failed)
- **FR-009**: System MUST provide `/queue/status` endpoint returning current queue depth and status
- **FR-010**: System MUST preserve original notification order based on arrival timestamp
- **FR-011**: System MUST drain all queued notifications before completing graceful shutdown
- **FR-012**: `/queue/status` endpoint MUST include health indicator field (healthy/degraded/unavailable)

### Key Entities

- **QueuedNotification**: Represents a notification request awaiting processing. Contains message content, voice settings, arrival timestamp, and processing status. Maintains order relative to other queued items.

- **QueueState**: Represents the current state of the notification queue. Contains current depth, processing status (idle/active), health indicator (healthy/degraded/unavailable), and optional metrics (average wait time, items processed).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Multiple simultaneous notification requests (up to 10) result in sequential audio playback with no overlap
- **SC-002**: All valid notification requests receive 201 Accepted response within 100ms of receipt
- **SC-003**: Queue status endpoint returns accurate queue depth and health indicator within 50ms
- **SC-004**: System gracefully handles queue overflow by rejecting requests with 429 status when queue contains 100 items
- **SC-005**: Invalid requests (malformed JSON, missing fields, invalid voice_id) are rejected with 400 Bad Request within 50ms

## Assumptions

1. **In-memory queue**: Queue data is stored in memory and does not persist across server restarts
2. **Single worker**: Queue processing is handled by a single background worker to maintain strict FIFO ordering
3. **Standard client behavior**: Clients are expected to handle 201 Accepted as success and not retry the request
4. **Audio duration**: Average notification duration is 3-10 seconds, informing reasonable queue depth limits
5. **PAI Algorithm usage**: Primary use case is PAI Algorithm phase transitions, which generate 2-7 rapid notifications per operation

## Clarifications

### Session 2026-02-09

- Q: When the voice server shuts down gracefully (SIGTERM/SIGINT), what should happen to notifications currently queued but not yet played? → A: Drain queue before shutdown — play all queued items, then exit
- Q: What should the `/queue/status` endpoint return when the queue service is unhealthy or the underlying TTS system is unavailable? → B: Return 200 OK with health indicator field (healthy/degraded/unavailable)
- Q: When a notification request contains invalid data (malformed JSON, missing required fields, invalid voice_id), should the system reject it immediately upon receipt (before queuing) or queue it and fail during processing? → A: Reject immediately — return 400 Bad Request before queuing

## Out of Scope

- Persistent queue storage (surviving server restarts)
- Priority queuing (all items have equal priority)
- Queue item cancellation or removal
- Distributed/clustered queue support
- WebSocket or push notifications for queue events
- Admin APIs for queue manipulation (clear, pause, resume)
