# FIFO Notification Queue - Quickstart

**Feature**: FIFO Notification Queue
**Branch**: `001-fifo-notify-queue`
**Last Updated**: 2026-02-09

## Overview

This quickstart guide helps you set up and work with the FIFO notification queue feature locally.

---

## Prerequisites

- Bun runtime installed
- macOS (platform requirement per Constitution)
- MLX-audio CLI installed and configured
- Kokoro-82M voice model available

---

## Development Setup

### 1. Start the Voice Server

```bash
# From repository root
bun run dev
```

Server starts on `http://127.0.0.1:8888`

### 2. Verify Queue Status

```bash
curl http://127.0.0.1:8888/queue/status
```

Expected response (empty queue):
```json
{
  "depth": 0,
  "processing_status": "idle",
  "health": "healthy"
}
```

---

## API Usage

### Queue a Notification

```bash
curl -X POST http://127.0.0.1:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "This is a test notification"
  }'
```

Expected response:
```json
{
  "status": "success",
  "message": "Notification queued"
}
```

**HTTP Status**: `201 Created`

### Queue Multiple Notifications (Test FIFO)

```bash
# Send 3 rapid requests
for i in 1 2 3; do
  curl -X POST http://127.0.0.1:8888/notify \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Notification $i\"}"
done
```

All three return `201 Created` immediately, audio plays sequentially.

### Check Queue Status During Processing

```bash
curl http://127.0.0.1:8888/queue/status
```

Example response:
```json
{
  "depth": 2,
  "processing_status": "active",
  "health": "healthy",
  "metrics": {
    "average_wait_time_ms": 5000,
    "items_processed": 5,
    "items_failed": 0
  }
}
```

---

## Testing Queue Behavior

### Test Sequential Playback

1. Start server: `bun run dev`
2. In another terminal, send multiple requests:
   ```bash
   for i in {1..5}; do
     curl -X POST http://127.0.0.1:8888/notify \
       -H "Content-Type: application/json" \
       -d "{\"message\": \"Test notification $i\"}"
     sleep 0.5
   done
   ```
3. **Expected**: Audio plays 1, 2, 3, 4, 5 in order with no overlap

### Test Queue Overflow

```bash
# Fill queue to capacity (100 items)
for i in {1..100}; do
  curl -X POST http://127.0.0.1:8888/notify \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Fill queue $i\"}" &
done
wait

# Next request should fail
curl -X POST http://127.0.0.1:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "This should fail"}'
```

Expected response:
```json
{
  "status": "error",
  "message": "Queue is full (100 items)"
}
```

**HTTP Status**: `429 Too Many Requests`

### Test Invalid Request Rejection

```bash
# Missing message field
curl -X POST http://127.0.0.1:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"title": "No message"}'
```

Expected response:
```json
{
  "status": "error",
  "message": "Missing required field: message"
}
```

**HTTP Status**: `400 Bad Request`

### Test Graceful Shutdown

1. Queue several notifications
2. Send SIGTERM: `kill -TERM <pid>`
3. **Expected**: All queued notifications play before server exits

---

## Running Tests

### Unit Tests

```bash
bun test tests/unit/services/notification-queue.test.ts
```

### Integration Tests

```bash
bun test tests/integration/queue-api.test.ts
```

### All Tests

```bash
bun test
```

---

## Development Workflow

### Code Structure

```
src/ts/
├── services/
│   └── notification-queue.ts    # Queue implementation
├── models/
│   └── queue.ts                  # Queue types
└── server.ts                     # Updated with queue handlers

tests/
├── unit/
│   └── services/
│       └── notification-queue.test.ts
└── integration/
    └── queue-api.test.ts
```

### Implementation Checklist

- [ ] Create `NotificationQueue` class
- [ ] Add `/queue/status` endpoint handler
- [ ] Update `/notify` to use queue
- [ ] Implement graceful shutdown with queue drain
- [ ] Add queue event logging
- [ ] Write unit tests for queue operations
- [ ] Write integration tests for API endpoints
- [ ] Update Codanna index

---

## Troubleshooting

### Audio Not Playing

1. Check queue status: `curl http://127.0.0.1:8888/queue/status`
2. Check health: `curl http://127.0.0.1:8888/health`
3. Verify TTS system: Ensure MLX-audio CLI is working
4. Check logs: Server logs show queue events

### Requests Immediately Return 429

- Cause: Queue is at capacity (100 items)
- Solution: Wait for queue to drain, or increase `maxDepth` in config

### Invalid voice_id Errors

- Check available voices: `curl http://127.0.0.1:8888/health | jq '.available_voices'`
- Use valid voice_id from list
- Or omit voice_id to use default

---

## Configuration

Queue behavior is configured via environment variables and code defaults:

| Setting | Default | Description |
|---------|---------|-------------|
| `QUEUE_MAX_DEPTH` | 100 | Maximum queue depth |
| `QUEUE_DRAIN_TIMEOUT_MS` | 30000 | Shutdown drain timeout |
| `QUEUE_DEGRADED_THRESHOLD` | 0.8 | Health degraded threshold |

---

## Next Steps

After implementing:

1. Run tests: `bun test`
2. Type check: `bun run typecheck`
3. Lint: `bun run lint`
4. Create PR for review
