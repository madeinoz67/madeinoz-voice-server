/**
 * Subprocess manager for Python TTS server
 * Manages lifecycle of Python FastAPI subprocess
 */

import { logger } from "@/utils/logger.js";

/**
 * Subprocess state
 */
export type SubprocessState = "stopped" | "starting" | "running" | "stopping" | "crashed";

/**
 * Subprocess manager configuration
 */
export interface SubprocessManagerConfig {
  /** Command to start Python server */
  command: string;
  /** Arguments for Python command */
  args: string[];
  /** Port to check for health */
  healthCheckPort: number;
  /** Health check path */
  healthCheckPath: string;
  /** Startup timeout in milliseconds */
  startupTimeout: number;
  /** Shutdown timeout in milliseconds */
  shutdownTimeout: number;
}

/**
 * Subprocess status
 */
export interface SubprocessStatus {
  state: SubprocessState;
  pid: number | null;
  port: number;
  uptime: number; // seconds
  lastError?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SubprocessManagerConfig = {
  command: "uv",
  args: ["run", "python3", "src/py/qwen_tts_server.py"],
  healthCheckPort: 7860,
  healthCheckPath: "/health",
  startupTimeout: 180000, // 180 seconds (3 minutes) - allow time for model download
  shutdownTimeout: 5000, // 5 seconds
};

/**
 * Subprocess manager class
 */
export class SubprocessManager {
  private config: SubprocessManagerConfig;
  private process: ReturnType<typeof Bun.spawn> | null = null;
  private state: SubprocessState = "stopped";
  private startTime: Date | null = null;
  private healthCheckInterval: Timer | null = null;

  constructor(config: Partial<SubprocessManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current status
   */
  getStatus(): SubprocessStatus {
    return {
      state: this.state,
      pid: this.process?.pid || null,
      port: this.config.healthCheckPort,
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime.getTime()) / 1000) : 0,
      lastError: undefined,
    };
  }

  /**
   * Start the subprocess
   */
  async start(): Promise<void> {
    if (this.state === "running" || this.state === "starting") {
      logger.warn("Subprocess already running or starting");
      return;
    }

    this.state = "starting";
    logger.info(`Starting Python TTS server: ${this.config.command} ${this.config.args.join(" ")}`);

    try {
      // Get the project root directory
      // When running via "bun run src/ts/server.ts", import.meta.dir is src/ts/services
      // Need to go up to project root
      const projectRoot = import.meta.dir.replace("/src/ts/services", "");
      logger.info(`Project root: ${projectRoot}`);

      // Start the subprocess
      this.process = Bun.spawn({
        cmd: [this.config.command, ...this.config.args],
        cwd: projectRoot,
        stdout: "inherit",
        stderr: "inherit",
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          QWEN_SERVER_PORT: this.config.healthCheckPort.toString(),
        },
      });

      // Handle process exit
      this.process.ref();

      // Wait for health check
      await this.waitForHealthCheck();

      this.state = "running";
      this.startTime = new Date();
      logger.info(`Python TTS server started on port ${this.config.healthCheckPort}`, {
        pid: this.process.pid,
      });

      // Start health check monitoring
      this.startHealthCheckMonitoring();
    } catch (error) {
      this.state = "crashed";
      logger.error("Failed to start Python TTS server", error as Error);
      throw error;
    }
  }

  /**
   * Stop the subprocess
   */
  async stop(): Promise<void> {
    if (this.state === "stopped") {
      return;
    }

    this.state = "stopping";
    logger.info("Stopping Python TTS server");

    // Stop health check monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.process) {
      // Try graceful shutdown first
      this.process.kill(15); // SIGTERM

      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // Force kill if still running
          if (this.process) {
            this.process.kill(9); // SIGKILL
          }
          resolve();
        }, this.config.shutdownTimeout);

        this.process?.exited.then(() => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.process = null;
    }

    this.state = "stopped";
    this.startTime = null;
    logger.info("Python TTS server stopped");
  }

  /**
   * Restart the subprocess
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Wait for health check to pass
   */
  private async waitForHealthCheck(): Promise<void> {
    const startTime = Date.now();
    const url = `http://localhost:${this.config.healthCheckPort}${this.config.healthCheckPath}`;

    while (Date.now() - startTime < this.config.startupTimeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return;
        }
      } catch {
        // Server not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error("Health check timeout: Python TTS server did not start in time");
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      const url = `http://localhost:${this.config.healthCheckPort}${this.config.healthCheckPath}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          logger.warn("Health check failed");
        }
      } catch (error) {
        logger.warn("Health check error", { error: (error as Error).message });
        // Could trigger restart here
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Check if process is running
   */
  isRunning(): boolean {
    return this.state === "running" && this.process !== null;
  }
}

// Singleton instance
let manager: SubprocessManager | null = null;

/**
 * Get or create subprocess manager singleton
 */
export function getSubprocessManager(config?: Partial<SubprocessManagerConfig>): SubprocessManager {
  if (!manager) {
    manager = new SubprocessManager(config);
  }
  return manager;
}

/**
 * Reset subprocess manager (for testing)
 */
export function resetSubprocessManager(): void {
  manager = null;
}
