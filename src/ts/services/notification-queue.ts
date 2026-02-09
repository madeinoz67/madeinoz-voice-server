/**
 * Notification Queue Service
 * FIFO queue for processing voice notifications sequentially
 */

import type {
  QueuedNotification,
  QueueState,
  QueueConfig,
  QueueHealth,
  QueueProcessingStatus,
  EnqueueResult,
  DrainResult,
  QueueMetrics,
} from "@/models/queue.js";
import type { NotificationRequest } from "@/models/notification.js";
import { isValidNotificationRequest } from "@/models/notification.js";
import { getVoiceLoader } from "@/services/voice-loader.js";
import { logger } from "@/utils/logger.js";
import { createDefaultQueueConfig } from "@/models/queue.js";

/**
 * TTS processor function type
 * Processes a notification request by synthesizing and playing audio
 */
export type TTSProcessor = (request: NotificationRequest) => Promise<void>;

/**
 * Notification Queue Service
 * Manages FIFO queue of notifications with single worker processing
 */
export class NotificationQueue {
  private queue: QueuedNotification[] = [];
  private processingStatus: QueueProcessingStatus = "idle";
  private isProcessing = false;
  private metrics: QueueMetrics = {
    itemsProcessed: 0,
    itemsFailed: 0,
    averageProcessingTimeMs: 0,
  };
  private processingTimes: number[] = [];
  private ttsHealth: QueueHealth = "healthy";
  private config: QueueConfig;
  private ttsProcessor: TTSProcessor;

  constructor(ttsProcessor: TTSProcessor, config?: Partial<QueueConfig>) {
    this.ttsProcessor = ttsProcessor;
    this.config = { ...createDefaultQueueConfig(), ...config };
    logger.info("NotificationQueue initialized", {
      maxDepth: this.config.maxDepth,
      degradedThreshold: this.config.degradedThreshold,
    });
  }

  /**
   * Enqueue a notification request
   * Returns immediately with 201 Accepted if successful
   */
  async enqueue(request: NotificationRequest): Promise<EnqueueResult> {
    // Reject if draining or stopped
    if (this.processingStatus === "draining" || this.processingStatus === "stopped") {
      return {
        success: false,
        statusCode: 503,
        message: `Queue is ${this.processingStatus}, not accepting new items`,
      };
    }

    // Validate request before queuing
    if (!isValidNotificationRequest(request)) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid notification request: missing required fields or invalid data",
      };
    }

    // Validate voice_id
    const voiceLoader = getVoiceLoader();
    try {
      const voiceInfo = voiceLoader.getVoiceInfo(request.voice_id || request.voice_name || "");
      if (!voiceInfo) {
        // Check if it's a known voice ID from the voice loader
        const availableVoices = await voiceLoader.getAvailableVoices();
        const voiceId = request.voice_id || request.voice_name || "";
        if (!availableVoices.includes(voiceId) && voiceId !== "marrvin" && voiceId !== "marlin" && voiceId !== "daniel") {
          return {
            success: false,
            statusCode: 400,
            message: `Invalid voice_id: ${voiceId}. Available voices: ${availableVoices.join(", ")}`,
          };
        }
      }
    } catch (error) {
      logger.warn("Voice validation failed, proceeding with default voice", {
        error: (error as Error).message,
      });
    }

    // Check queue depth
    if (this.queue.length >= this.config.maxDepth) {
      logger.warn("Queue is full, rejecting request", {
        depth: this.queue.length,
        maxDepth: this.config.maxDepth,
      });
      return {
        success: false,
        statusCode: 429,
        message: `Queue is full (${this.queue.length}/${this.config.maxDepth} items)`,
      };
    }

    // Create queued item
    const item: QueuedNotification = {
      id: this.generateId(),
      request: { ...request },
      status: "pending",
      arrivedAt: new Date(),
    };

    this.queue.push(item);
    logger.info("Notification queued", {
      id: item.id,
      position: this.queue.length - 1,
      depth: this.queue.length,
    });

    // Start processing if not already running
    this.processQueue().catch((error) => {
      logger.error("Error in queue processor", error);
    });

    return {
      success: true,
      statusCode: 201,
      message: "Notification accepted and queued",
      queuePosition: this.queue.length - 1,
      itemId: item.id,
    };
  }

  /**
   * Get current queue state
   */
  getQueueState(): QueueState {
    const health = this.calculateHealth();
    return {
      depth: this.queue.length,
      processingStatus: this.processingStatus,
      health,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Drain the queue (process all remaining items)
   * Called during graceful shutdown
   */
  async drain(): Promise<DrainResult> {
    if (this.processingStatus === "draining") {
      // Already draining
      return await this.waitForDrain();
    }

    logger.info("Starting queue drain", {
      itemsRemaining: this.queue.length,
      timeoutMs: this.config.drainTimeoutMs,
    });

    this.processingStatus = "draining";

    try {
      // Wait for queue to empty or timeout
      const result = await this.waitForDrain();

      if (result.timedOut) {
        logger.warn("Queue drain timed out", {
          remainingItems: result.remainingItems,
        });
      } else {
        logger.info("Queue drain complete", {
          itemsProcessed: result.itemsProcessed,
          itemsFailed: result.itemsFailed,
        });
      }

      return result;
    } finally {
      this.processingStatus = "stopped";
      this.stop();
    }
  }

  /**
   * Stop the queue (for testing or shutdown)
   */
  stop(): void {
    this.processingStatus = "stopped";
    this.isProcessing = false;
    logger.debug("NotificationQueue stopped");
  }

  /**
   * Process queue items sequentially
   */
  private async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return;
    }

    // Check if we should be processing
    if (this.processingStatus === "draining" && this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0 && this.processingStatus !== "stopped") {
        const item = this.queue[0];

        // Skip already processed items
        if (item.status !== "pending") {
          this.queue.shift();
          continue;
        }

        // Update status
        this.processingStatus = "active";
        item.status = "processing";
        item.processingStartedAt = new Date();

        logger.info("Processing queued notification", {
          id: item.id,
          position: 0,
        });

        const startTime = Date.now();

        try {
          // Process TTS
          await this.ttsProcessor(item.request);

          // Mark as completed
          item.status = "completed";
          item.completedAt = new Date();

          const processingTime = Date.now() - startTime;
          this.recordProcessingTime(processingTime);
          this.metrics.itemsProcessed++;

          logger.info("Notification processed successfully", {
            id: item.id,
            processingTimeMs: processingTime,
          });

          // Update TTS health
          this.ttsHealth = "healthy";

        } catch (error) {
          // Mark as failed but continue processing
          item.status = "failed";
          item.completedAt = new Date();
          item.error = (error as Error).message;

          this.metrics.itemsFailed++;

          logger.warn("Notification processing failed, skipping to next item", {
            id: item.id,
            error: (error as Error).message,
          });

          // Update TTS health if failing
          this.ttsHealth = "unavailable";
        }

        // Remove from queue
        this.queue.shift();
      }

      // Reset status when queue is empty
      if (this.queue.length === 0) {
        this.processingStatus = this.processingStatus === "draining" ? "draining" : "idle";
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Wait for queue to drain (process all items)
   */
  private async waitForDrain(): Promise<DrainResult> {
    const startTime = Date.now();
    const initialProcessed = this.metrics.itemsProcessed;
    const initialFailed = this.metrics.itemsFailed;

    return new Promise<DrainResult>((resolve) => {
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (this.queue.length === 0 || this.processingStatus === "stopped") {
          clearInterval(checkInterval);
          resolve({
            success: true,
            itemsProcessed: this.metrics.itemsProcessed - initialProcessed,
            itemsFailed: this.metrics.itemsFailed - initialFailed,
            timedOut: false,
          });
          return;
        }

        if (elapsed >= this.config.drainTimeoutMs) {
          clearInterval(checkInterval);
          resolve({
            success: false,
            itemsProcessed: this.metrics.itemsProcessed - initialProcessed,
            itemsFailed: this.metrics.itemsFailed - initialFailed,
            timedOut: true,
            remainingItems: this.queue.length,
          });
          return;
        }
      }, 50);
    });
  }

  /**
   * Calculate health indicator based on queue state and TTS status
   */
  private calculateHealth(): QueueHealth {
    // If TTS has been failing, report unavailable
    if (this.ttsHealth === "unavailable") {
      // Check if we've had recent successes
      const recentFailures = this.metrics.itemsFailed > 0;
      if (recentFailures && this.metrics.itemsProcessed === 0) {
        return "unavailable";
      }
    }

    // Check if queue depth exceeds degraded threshold
    if (this.queue.length >= this.config.degradedThreshold) {
      return "degraded";
    }

    return "healthy";
  }

  /**
   * Record processing time for metrics
   */
  private recordProcessingTime(timeMs: number): void {
    this.processingTimes.push(timeMs);

    // Keep only last 100 measurements
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }

    // Calculate average
    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageProcessingTimeMs = Math.round(sum / this.processingTimes.length);
  }

  /**
   * Generate unique ID for queued item
   */
  private generateId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Create a notification queue with default TTS processor
 */
export function createNotificationQueue(
  ttsProcessor: TTSProcessor,
  config?: Partial<QueueConfig>
): NotificationQueue {
  return new NotificationQueue(ttsProcessor, config);
}
