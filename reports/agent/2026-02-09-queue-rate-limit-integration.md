# Research Report: FIFO Queue Integration with Rate Limiting Middleware

**Date**: 2026-02-09
**Agent**: Research-Agent-v5
**Model**: Claude Opus 4.6

## Summary

This report analyzes how the proposed FIFO notification queue should integrate with the existing rate limiting middleware in the voice-server. The key finding is that rate limiting and queue capacity are distinct concerns that should operate at different layers: rate limiting controls client request frequency, while queue capacity manages server processing capacity.

## Key Findings

### 1. Current Rate Limiter Implementation

**Location**: `src/ts/middleware/rate-limiter.ts:1-115`

The existing rate limiter uses a token bucket algorithm with the following characteristics:
- Default: 60 requests per minute per client
- Client identification via X-Forwarded-For, X-Real-IP, or fallback to localhost
- Returns 429 with message "Rate limit exceeded" when limit is hit
- NO Retry-After header currently implemented
- Cleanup runs every 60 seconds

**Current 429 Response Pattern**:
```typescript
return Response.json(
  errorResponse("Rate limit exceeded"),
  { status: 429 }
);
```

### 2. Proposed FIFO Queue Specification

**Location**: `specs/001-fifo-notify-queue/spec.md`

Key requirements:
- Maximum queue depth: 100 items (FR-005)
- Returns 429 when queue at capacity (FR-006)
- Immediate 201 Accepted for valid requests (FR-002)
- Schema validation BEFORE queuing (FR-013)
- Average audio duration: 3-10 seconds

### 3. Architectural Distinction

Rate limiting and queue capacity serve different purposes:

| Aspect | Rate Limiter | Queue Capacity |
|--------|-------------|----------------|
| **Purpose** | Prevent client abuse | Manage server processing load |
| **Scope** | Per-client (identified by IP) | Global (server-wide) |
| **Time Window** | Sliding window (60s) | Until processed |
| **Error Meaning** | "You're sending too fast" | "Server is too busy" |
| **Retry Strategy** | Wait for window to expire | Wait for queue to drain |

## Decision Framework

### Decision 1: Rate Limiting Before or After Queuing?

**Decision**: Rate limiting should apply BEFORE queuing.

**Rationale**:
1. **Client protection first**: If a client is abusing the API, they shouldn't consume queue space
2. **Queue preservation**: The queue is a shared resource - abusive clients shouldn't fill it
3. **Existing pattern**: Current rate limiter runs at the middleware layer before request handlers (`src/ts/server.ts:387-395`)
4. **Clear error semantics**: Distinguishes between "you're being rate limited" vs "queue is full"

**Evidence**: `src/ts/server.ts:387-395`
```typescript
// Rate limiting (apply to POST requests)
if (req.method === "POST") {
  const clientId = extractClientId(req);
  if (serverState.rateLimiter.isRateLimited(clientId)) {
    return Response.json(
      errorResponse("Rate limit exceeded"),
      { status: 429 }
    );
  }
}
```

### Decision 2: 429 Response Pattern Distinction

**Decision**: Use distinct error messages to differentiate rate limiting from queue overflow.

**Rationale**:
- Rate limit 429: "Rate limit exceeded" (client issue)
- Queue full 429: "Queue at capacity" (server issue)
- This allows clients to implement different retry strategies
- Operators can distinguish between abuse vs high load

**Recommended Implementation**:
```typescript
// Rate limit 429
{
  status: "error",
  message: "Rate limit exceeded",
  retry_after: <seconds_until_window_reset>
}

// Queue full 429
{
  status: "error",
  message: "Queue at capacity",
  retry_after: <estimated_seconds_until_queue_drains>
}
```

### Decision 3: Retry-After Header Strategy

**Decision**: Implement Retry-After header for both scenarios with different calculation methods.

**Rate Limiter Retry-After**:
- Calculate seconds until client's rate limit window resets
- Use `getResetTime(clientId)` from existing rate limiter
- Example: `Math.ceil((resetTime - now) / 1000)`

**Queue Full Retry-After**:
- Estimate based on average processing time (3-10s per item)
- Formula: `queue_depth * avg_processing_time`
- Add buffer for safety (e.g., +20%)
- Example: `queue.size * 8 + 2` seconds

**Evidence**: Rate limiter already tracks reset time (`src/ts/middleware/rate-limiter.ts:68-74`):
```typescript
getResetTime(clientId: string): number | null {
  const entry = this.clients.get(clientId);
  return entry ? entry.resetTime : null;
}
```

### Decision 4: Middleware Ordering

**Decision**: Establish clear middleware pipeline order.

**Recommended Pipeline**:
1. **CORS preflight** (if OPTIONS request)
2. **Rate limiting** (per-client request frequency)
3. **Schema validation** (400 if invalid)
4. **Queue capacity check** (429 if full)
5. **Queue enqueue** (returns 201 Accepted)
6. **Background processing** (non-blocking)

**Visual Flow**:
```
Request → CORS → Rate Limit → Validate → Queue Check → Enqueue → 201 Accepted
           ↓         ↓            ↓           ↓            ↓
        204 No    429 Rate     400 Bad    429 Queue    Background
        Content   Limited      Request    Full         Processing
```

## Alternatives Considered

### Alternative 1: Rate Limit After Queuing
**Description**: Accept all valid requests into queue, rate limit at processing time.

**Pros**:
- Fairer first-come-first-serve
- Simpler client retry logic

**Cons**:
- Abusive clients fill shared queue
- Queue becomes weaponizable
- No protection against queue flooding

**Rejected**: Queue capacity is a shared server resource that must be protected from abuse.

### Alternative 2: Single 429 Response
**Description**: Use same "Rate limit exceeded" message for both rate limiting and queue full.

**Pros**:
- Simpler implementation
- Fewer error cases to handle

**Cons**:
- Clients can't distinguish client vs server issues
- No way to know appropriate retry strategy
- Poor observability for operators

**Rejected**: Clear error semantics are essential for client behavior and operational visibility.

### Alternative 3: 503 Service Unavailable for Queue Full
**Description**: Use 503 instead of 429 when queue is at capacity.

**Pros**:
- Semantically correct (server unavailable)
- Standard HTTP practice for overloaded services

**Cons**:
- Spec explicitly requires 429 (FR-006)
- Clients may treat 503 as downtime rather than retryable
- Inconsistent with specification

**Rejected**: Specification compliance is mandatory.

## Conclusions

### Recommended Approach

1. **Rate limiting operates first** at middleware layer, before queue operations
2. **Queue capacity check happens after** validation but before enqueue
3. **Distinct 429 responses** with clear error messages
4. **Retry-After header** added to both 429 responses with appropriate calculation
5. **Queue status endpoint** provides visibility into current load

### Implementation Priority

1. **P0**: Implement distinct 429 responses with error message differentiation
2. **P0**: Add Retry-After header to rate limiter 429 responses
3. **P0**: Add Retry-After header to queue full 429 responses
4. **P1**: Update ErrorResponse type to include optional retry_after field
5. **P2**: Add queue capacity metrics to /health endpoint

### Code Changes Required

1. **Update ErrorResponse type** (`src/ts/models/notification.ts:43-46`):
```typescript
export interface ErrorResponse {
  status: "error";
  message: string;
  retry_after?: number; // seconds
}
```

2. **Update rate limiter** to return Retry-After header
3. **Update queue middleware** to return distinct 429 with Retry-After
4. **Update server.ts** to use new error response format

### Testing Strategy

1. Test rate limiting with concurrent requests
2. Test queue full scenario with burst > 100 requests
3. Verify Retry-After header accuracy
4. Test pipeline ordering (rate limit → validate → queue)
5. Verify distinct error messages for each failure mode

### Operational Considerations

- Rate limiter protects against abusive clients
- Queue capacity prevents server overload
- Both work together but serve different purposes
- Operators should monitor both metrics independently
- Client retry behavior differs between scenarios

---

**References**:
- Rate Limiter Implementation: `src/ts/middleware/rate-limiter.ts`
- Server Request Handler: `src/ts/server.ts:387-395`
- FIFO Queue Specification: `specs/001-fifo-notify-queue/spec.md`
- Notification Models: `src/ts/models/notification.ts`
