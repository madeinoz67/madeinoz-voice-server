# Research Report: FIFO Queue Implementation for HTTP Request Queuing in Bun/TypeScript

**Date**: 2025-02-09 12:00
**Agent**: Research-Agent
**Model**: Claude 4.7
**Context**: Voice server TTS request queuing with 201 Accepted pattern, max 100 items depth

---

## Executive Summary

After comprehensive analysis of queue implementation patterns for Bun/TypeScript and the specific requirements of the voice server (sequential TTS processing, HTTP async pattern, graceful shutdown), the **recommended approach is a simple array-based queue with async/await producer-consumer pattern and Atomics for thread safety**.

This approach prioritizes simplicity, Bun-specific optimizations, and the single-process nature of the current application.

---

## Decision

**Chosen Approach**: Array-based FIFO queue with:
- TypeScript array as the underlying data structure
- Async/await for producer-consumer coordination
- Promises for queue slot availability signaling
- Atomic operations for queue depth tracking (optional for single-process)
- Built-in graceful shutdown with queue draining

**Rationale**:
1. **Simplicity**: Array-based queues are straightforward to implement, debug, and maintain
2. **Bun Optimization**: Bun's runtime optimizes async operations and Promise handling
3. **Single-Process Architecture**: Current implementation is single-process (no workers), eliminating need for shared memory
4. **Sufficient Performance**: For max 100 queue depth and sequential TTS processing, array operations are more than adequate
5. **Type Safety**: TypeScript provides excellent type safety for queue items
6. **Graceful Shutdown**: Simple to implement draining logic with async/await patterns

---

## Alternatives Considered

### 1. Linked List Implementation
**Evaluated**: Custom linked list with Node objects
**Rejected Because**:
- Higher memory overhead per item (additional object references)
- No performance benefit for small queue sizes (100 items)
- More complex implementation with potential for memory leaks
- Poor cache locality compared to arrays
- TypeScript requires careful type definitions

### 2. Atomics/Shared Memory
**Evaluated**: SharedArrayBuffer with Atomics for inter-process communication
**Rejected Because**:
- Current architecture is single-process (no workers/threads)
- Adds complexity without benefit for non-concurrent processing
- Requires special HTTP headers (Cross-Origin-Opener-Policy)
- Overkill for sequential TTS processing
- Security considerations with shared memory

### 3. Bull/BullMQ (Redis-based)
**Evaluated**: Industry-standard Redis-backed job queues
**Rejected Because**:
- External dependency on Redis (adds infrastructure complexity)
- Overkill for single-server, in-memory queuing
- Network latency for queue operations
- Additional operational overhead
- Current requirements don't need persistence or distributed processing

### 4. Bun Workers with Message Channels
**Evaluated**: Separate worker process with structured clone for queue items
**Rejected Because**:
- Current TTS processing is already async (MLX-audio subprocess)
- Adding workers would complicate the architecture
- Structured cloning overhead for queue items
- No CPU-bound work to offload (I/O bound TTS operations)
- Would require refactoring existing MLX client integration

### 5. EventEmitter-based Queue
**Evaluated**: Node.js EventEmitter for queue state changes
**Rejected Because**:
- Less explicit than Promise-based coordination
- Harder to reason about async flow
- Potential for unhandled rejections
- Promises are more idiomatic for async/await patterns

---

## Technical Implementation Details

### Queue Data Structure

```typescript
interface QueuedRequest {
  id: string;
  request: NotificationRequest | PaiNotificationRequest;
  resolve: (response: SuccessResponse | ErrorResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private maxDepth: number;

  constructor(maxDepth: number = 100) {
    this.maxDepth = maxDepth;
  }

  async enqueue(item: QueuedRequest): Promise<void> {
    if (this.queue.length >= this.maxDepth) {
      throw new Error("Queue depth exceeded");
    }
    this.queue.push(item);
  }

  dequeue(): QueuedRequest | undefined {
    return this.queue.shift();
  }

  get size(): number {
    return this.queue.length;
  }
}
```

### Producer-Consumer Pattern

**Producer (HTTP Handler)**:
```typescript
// In server.ts fetch handler
if (path === "/notify" && req.method === "POST") {
  const body = await parseJsonBody<NotificationRequest>(req);

  // Return 202 Accepted immediately
  const responsePromise = requestQueue.enqueue({
    id: generateId(),
    request: body,
    timestamp: Date.now()
  });

  return Response.json(
    { status: "accepted", message: "Request queued" },
    { status: 202 }
  );
}
```

**Consumer (Background Processor)**:
```typescript
async function processQueue(): Promise<void> {
  while (true) {
    const item = requestQueue.dequeue();
    if (!item) {
      await sleep(50); // Avoid busy-wait
      continue;
    }

    try {
      const response = await handleNotify(item.request);
      item.resolve(response);
    } catch (error) {
      item.reject(error as Error);
    }
  }
}
```

### Graceful Shutdown

```typescript
interface ServerState {
  requestQueue: RequestQueue;
  shutdownRequested: boolean;
}

const shutdown = async () => {
  logger.info("Shutting down server...");
  serverState.shutdownRequested = true;

  // Stop accepting new requests
  serverState.requestQueue.close();

  // Wait for queue to drain (with timeout)
  const drainTimeout = 30000; // 30 seconds
  const startTime = Date.now();

  while (serverState.requestQueue.size > 0) {
    if (Date.now() - startTime > drainTimeout) {
      logger.warn("Shutdown timeout - forcing exit");
      break;
    }
    await sleep(100);
  }

  server.stop();
  process.exit(0);
};
```

---

## Concurrency Patterns Analysis

### Bun-Specific Considerations

1. **Async I/O Optimization**:
   - Bun's event loop is optimized for async operations
   - Array operations with Promises leverage this optimization

2. **Worker_pool**:
   - Bun has built-in worker pool for CPU tasks
   - Not needed for I/O-bound TTS operations

3. **Atomic Operations**:
   - Bun supports Atomics API
   - Use only if implementing multi-consumer queue
   - For single-consumer (current use case), not necessary

### Recommended Concurrency Pattern

**Single Consumer, Multiple Producers**:
- Multiple HTTP requests can add to queue simultaneously
- Single background worker processes sequentially
- Ensures TTS operations don't overlap (resource constraint)
- Matches MLX-audio's single-stream limitation

---

## Performance Considerations

### Array Performance (Max 100 items)

- **Enqueue**: O(1) amortized (array push)
- **Dequeue**: O(n) worst case (array shift) - negligible for n=100
- **Memory**: ~100 item references (negligible)
- **Cache locality**: Excellent (contiguous memory)

### Optimization: Circular Buffer (Optional)

If performance becomes critical:
```typescript
class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private count = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  enqueue(item: T): boolean {
    if (this.count >= this.capacity) return false;
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    this.count++;
    return true;
  }

  dequeue(): T | undefined {
    if (this.count === 0) return undefined;
    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined;
    this.head = (this.head + 1) % this.capacity;
    this.count--;
    return item;
  }
}
```

**Recommendation**: Start with simple array, optimize only if profiling shows need.

---

## Implementation Checklist

### Core Features
- [ ] Array-based queue implementation
- [ ] Enqueue with max depth check (100 items)
- [ ] Dequeue for background processor
- [ ] Promise-based response coordination
- [ ] Request ID generation for tracking

### HTTP Integration
- [ ] Modify server.ts to return 202 Accepted
- [ ] Add queue endpoint (optional: GET /queue/status)
- [ ] Error responses for queue full (503 Service Unavailable)

### Background Processor
- [ ] Async function to process queue sequentially
- [ ] Integration with existing processTTS()
- [ ] Error handling and logging per item

### Graceful Shutdown
- [ ] Close queue on shutdown signal
- [ ] Wait for queue drain (with timeout)
- [ ] Log remaining items on timeout

### Monitoring (Optional)
- [ ] Queue depth metric
- [ ] Processing time per item
- [ ] Average wait time
- [ ] Rejection count (queue full)

---

## Testing Strategy

### Unit Tests
```typescript
describe('RequestQueue', () => {
  test('enqueues items up to max depth', async () => {
    const queue = new RequestQueue(2);
    await queue.enqueue(mockItem);
    await queue.enqueue(mockItem);
    await expect(queue.enqueue(mockItem)).rejects.toThrow();
  });

  test('dequeues items in FIFO order', async () => {
    const queue = new RequestQueue();
    await queue.enqueue(item1);
    await queue.enqueue(item2);
    expect(queue.dequeue()).toBe(item1);
    expect(queue.dequeue()).toBe(item2);
  });
});
```

### Integration Tests
- Test HTTP 202 Accepted response
- Test queue full scenario (503 response)
- Test sequential processing
- Test graceful shutdown with draining

---

## Monitoring and Observability

### Metrics to Track
1. **Queue Depth**: Current number of queued requests
2. **Processing Rate**: Requests per second
3. **Wait Time**: Time from enqueue to processing start
4. **Rejection Rate**: Requests rejected due to full queue

### Logging Structure
```typescript
logger.info("Queue status", {
  depth: queue.size,
  maxDepth: MAX_DEPTH,
  processing: queue.isProcessing,
  avgWaitTime: calculateAverageWaitTime(),
});
```

---

## Conclusion

For the voice server's TTS request queuing requirements, an **array-based FIFO queue with async/await producer-consumer pattern** provides the optimal balance of simplicity, performance, and maintainability. The single-process architecture, sequential processing requirements, and small queue size (100 items) make this approach ideal.

The implementation should start with a simple array-based queue and add complexity (circular buffer, metrics, etc.) only if profiling demonstrates need. The graceful shutdown pattern ensures no requests are lost during deployments or restarts.

---

## References

### Files Examined
- `src/ts/server.ts:1-500` - Current HTTP server implementation

### Key Patterns Identified
1. Current implementation uses `Bun.serve()` with async fetch handler
2. TTS processing is already async via MLX-audio subprocess calls
3. Single-process architecture (no workers/threads)
4. Existing graceful shutdown with SIGTERM/SIGINT handling

### Recommended Next Steps
1. Implement `RequestQueue` class in `src/ts/utils/request-queue.ts`
2. Add background processor function
3. Modify server.ts to use queue for `/notify` and `/pai` endpoints
4. Implement graceful shutdown draining
5. Add unit tests for queue operations
6. (Optional) Add metrics endpoint for queue monitoring
