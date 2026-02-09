/**
 * Queue model types
 * FIFO notification queue for voice server
 */

import type { NotificationRequest } from "@/models/notification.js";

/**
 * Processing status of a queued notification
 */
export type QueuedItemStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Queued notification item
 */
export interface QueuedNotification {
  /** Unique identifier for this queued item */
  id: string;
  /** Original notification request */
  request: NotificationRequest;
  /** Current status */
  status: QueuedItemStatus;
  /** Timestamp when item was enqueued */
  arrivedAt: Date;
  /** Timestamp when processing started (if applicable) */
  processingStartedAt?: Date;
  /** Timestamp when processing completed (if applicable) */
  completedAt?: Date;
  /** Error message if processing failed */
  error?: string;
}

/**
 * Processing status of the queue
 */
export type QueueProcessingStatus = "idle" | "active" | "draining" | "stopped";

/**
 * Health indicator for the queue
 */
export type QueueHealth = "healthy" | "degraded" | "unavailable";

/**
 * Queue metrics
 */
export interface QueueMetrics {
  /** Total number of items processed successfully */
  itemsProcessed: number;
  /** Total number of items that failed */
  itemsFailed: number;
  /** Average processing time in milliseconds */
  averageProcessingTimeMs: number;
  /** Current processing time of active item (if any) */
  currentProcessingTimeMs?: number;
}

/**
 * Current state of the notification queue
 */
export interface QueueState {
  /** Current number of items in the queue */
  depth: number;
  /** Current processing status */
  processingStatus: QueueProcessingStatus;
  /** Health indicator */
  health: QueueHealth;
  /** Optional metrics */
  metrics?: QueueMetrics;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  /** Maximum number of items allowed in the queue */
  maxDepth: number;
  /** Maximum time to wait for queue drain during shutdown (ms) */
  drainTimeoutMs: number;
  /** Queue depth threshold for degraded health status */
  degradedThreshold: number;
}

/**
 * Result of an enqueue operation
 */
export interface EnqueueResult {
  /** Whether the item was successfully enqueued */
  success: boolean;
  /** HTTP status code */
  statusCode: number;
  /** Human-readable message */
  message: string;
  /** Position in queue (0-indexed) if successful */
  queuePosition?: number;
  /** Item ID if successful */
  itemId?: string;
}

/**
 * Result of a drain operation
 */
export interface DrainResult {
  /** Whether drain completed successfully */
  success: boolean;
  /** Number of items processed during drain */
  itemsProcessed: number;
  /** Number of items that failed during drain */
  itemsFailed: number;
  /** Whether drain timed out */
  timedOut: boolean;
  /** Remaining items when timed out */
  remainingItems?: number;
}

/**
 * Create a default queue configuration
 */
export function createDefaultQueueConfig(): QueueConfig {
  return {
    maxDepth: 100,
    drainTimeoutMs: 30000, // 30 seconds
    degradedThreshold: 50,
  };
}

/**
 * Create an empty queue state
 */
export function createEmptyQueueState(): QueueState {
  return {
    depth: 0,
    processingStatus: "idle",
    health: "healthy",
    metrics: {
      itemsProcessed: 0,
      itemsFailed: 0,
      averageProcessingTimeMs: 0,
    },
  };
}
