/**
 * Structured logger utility
 * Provides consistent logging across the application
 */

/**
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  includeTimestamp: boolean;
  includeContext: boolean;
}

/**
 * Current logger configuration
 */
let config: LoggerConfig = {
  level: LogLevel.INFO,
  includeTimestamp: true,
  includeContext: true,
};

/**
 * Format log level for output
 */
function formatLevel(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG:
      return "DEBUG";
    case LogLevel.INFO:
      return "INFO";
    case LogLevel.WARN:
      return "WARN";
    case LogLevel.ERROR:
      return "ERROR";
  }
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  const parts: string[] = [];

  if (config.includeTimestamp) {
    parts.push(entry.timestamp.toISOString());
  }

  parts.push(`[${formatLevel(entry.level)}]`);
  parts.push(entry.message);

  if (entry.context && config.includeContext && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context));
  }

  if (entry.error) {
    parts.push(`\n${entry.error.stack || entry.error.message}`);
  }

  return parts.join(" ");
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
  if (level < config.level) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date(),
    context,
    error,
  };

  const output = formatLogEntry(entry);

  switch (level) {
    case LogLevel.DEBUG:
    case LogLevel.INFO:
      console.log(output);
      break;
    case LogLevel.WARN:
      console.warn(output);
      break;
    case LogLevel.ERROR:
      console.error(output);
      break;
  }
}

/**
 * Logger API
 */
export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    log(LogLevel.DEBUG, message, context);
  },

  info(message: string, context?: Record<string, unknown>): void {
    log(LogLevel.INFO, message, context);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    log(LogLevel.WARN, message, context);
  },

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    log(LogLevel.ERROR, message, context, error);
  },

  setLevel(level: LogLevel): void {
    config.level = level;
  },

  configure(newConfig: Partial<LoggerConfig>): void {
    config = { ...config, ...newConfig };
  },
};

export default logger;
