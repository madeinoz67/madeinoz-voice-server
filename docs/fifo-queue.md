# FIFO Notification Queue

The voice server implements a FIFO (First-In-First-Out) queue for processing voice notifications sequentially, preventing audio overlap when multiple agents send notifications simultaneously.

## Overview

### What Problem Does It Solve?

When multiple agents or processes send voice notifications simultaneously:
- **Before**: Audio would overlap, making notifications unintelligible
- **After**: Notifications are queued and played sequentially in order

### Key Features

- **FIFO Processing**: Notifications processed in the order they arrive
- **Immediate Acknowledgment**: Returns `201 Accepted` within 100ms
- **Queue Monitoring**: `GET /queue/status` endpoint for real-time status
- **Graceful Shutdown**: Queue drains before server exits
- **Health Tracking**: Monitors queue depth, processing status, and TTS health

## Usage

### Sending Notifications

Send a POST request to `/notify`:

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Notification",
    "message": "Your notification text here",
    "voice_id": "marrvin"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Notification accepted and queued",
  "queuePosition": 0,
  "itemId": "queue_1234567890_abc123"
}
```

### Queue Status Monitoring

Check queue status in real-time:

```bash
curl http://localhost:8888/queue/status
```

**Response:**
```json
{
  "status": "success",
  "depth": 3,
  "processingStatus": "active",
  "health": "healthy",
  "metrics": {
    "itemsProcessed": 42,
    "itemsFailed": 0,
    "averageProcessingTimeMs": 7100
  }
}
```

### Status Values

**Queue Depth (`depth`)**
- Current number of notifications waiting to be processed
- Maximum: 100 items

**Processing Status (`processingStatus`)**
- `idle`: Queue is empty, not processing
- `active`: Currently processing a notification
- `draining`: Processing remaining items (shutdown mode)
- `stopped`: Queue not accepting new items

**Health Indicator (`health`)**
- `healthy`: Queue operating normally
- `degraded`: Queue depth above threshold (50 items)
- `unavailable`: TTS service failing

## Response Codes

| Code | Meaning | When Returned |
|------|---------|---------------|
| 201 | Accepted | Notification queued successfully |
| 400 | Bad Request | Invalid request (missing fields, invalid data) |
| 429 | Too Many Requests | Queue is full (100 items max) |
| 500 | Internal Error | Server error occurred |

## Configuration

Queue behavior can be configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `QUEUE_MAX_DEPTH` | 100 | Maximum queue depth |
| `QUEUE_DRAIN_TIMEOUT_MS` | 30000 | Shutdown drain timeout (milliseconds) |
| `QUEUE_DEGRADED_THRESHOLD` | 50 | Depth threshold for degraded health status |

## Graceful Shutdown

When the server receives a shutdown signal:
1. Sets status to "draining"
2. Stops accepting new notifications (returns 503)
3. Processes all remaining queued items
4. Waits up to 30 seconds for queue to drain
5. Logs remaining items if timeout occurs

## Error Handling

The queue uses a **skip-on-failure** pattern:
- Failed notifications are marked as failed
- Processing continues with next item
- Failed items don't block the queue
- Errors are logged for troubleshooting

## Performance

- **201 Response Time**: < 100ms (accepts request immediately)
- **Queue Status Response**: < 50ms
- **Processing Time**: ~7 seconds per notification (includes TTS generation + playback)

## Examples

### Single Notification

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Task completed", "voice_id": "marrvin"}'
```

### Multiple Rapid Notifications

```bash
# Send 3 notifications rapidly
for i in {1..3}; do
  curl -X POST http://localhost:8888/notify \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Notification $i\", \"voice_id\": \"marrvin\"}"
done
```

### Check Queue Status

```bash
# Watch queue status in real-time
watch -n 1 'curl -s http://localhost:8888/queue/status | jq .'
```

## Troubleshooting

### Queue Not Processing

1. Check queue status: `curl http://localhost:8888/queue/status`
2. Verify `processingStatus` is not "stopped"
3. Check server logs for errors

### Notifications Not Playing

1. Check TTS health status
2. Verify voice_id is valid
3. Check audio output device

### Queue Full (429 Response)

1. Wait for current queue to drain
2. Check if notifications are completing slowly
3. Consider increasing `QUEUE_MAX_DEPTH` if needed
