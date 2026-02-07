/**
 * Text sanitization utility
 * Input validation and sanitization for TTS text
 */

/**
 * Sanitization options
 */
export interface SanitizeOptions {
  /** Maximum length (default: 500) */
  maxLength?: number;
  /** Remove HTML tags (default: true) */
  stripHtml?: boolean;
  /** Remove shell metacharacters (default: true) */
  stripShellChars?: boolean;
  /** Normalize whitespace (default: true) */
  normalizeWhitespace?: boolean;
}

/**
 * Default sanitization options
 */
const DEFAULT_OPTIONS: SanitizeOptions = {
  maxLength: 500,
  stripHtml: true,
  stripShellChars: true,
  normalizeWhitespace: true,
};

/**
 * HTML tag patterns to remove
 */
const HTML_TAG_PATTERN = /<[^>]*>/g;

/**
 * Shell metacharacter patterns to remove
 */
const SHELL_CHARS_PATTERN = /[\$`'"\\;|&()<>]/g;

/**
 * Whitespace normalization pattern
 */
const WHITESPACE_PATTERN = /\s+/g;

/**
 * Script tag detection (more aggressive)
 */
const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

/**
 * Sanitize text for TTS input
 *
 * Removes potentially dangerous content and normalizes text
 */
export function sanitizeText(text: string, options: SanitizeOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let result = text;

  // Check for script tags first (security)
  if (opts.stripHtml && SCRIPT_PATTERN.test(result)) {
    throw new Error("Text contains script tags and was rejected");
  }

  // Remove HTML tags
  if (opts.stripHtml) {
    result = result.replace(HTML_TAG_PATTERN, "");
  }

  // Remove shell metacharacters
  if (opts.stripShellChars) {
    result = result.replace(SHELL_CHARS_PATTERN, "");
  }

  // Normalize whitespace
  if (opts.normalizeWhitespace) {
    result = result.replace(WHITESPACE_PATTERN, " ").trim();
  }

  // Enforce max length
  if (opts.maxLength && result.length > opts.maxLength) {
    result = result.substring(0, opts.maxLength).trim();
  }

  return result;
}

/**
 * Validate text is safe for TTS
 */
export function isValidText(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  // Check for dangerous patterns
  if (SCRIPT_PATTERN.test(text)) return false;

  return true;
}

/**
 * Sanitize title for macOS notification
 */
export function sanitizeTitle(title: string): string {
  return sanitizeText(title, { maxLength: 100 });
}

/**
 * Sanitize message for TTS
 */
export function sanitizeMessage(message: string): string {
  return sanitizeText(message, { maxLength: 500 });
}
