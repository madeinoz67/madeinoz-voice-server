/**
 * Pronunciation service
 * Text preprocessing with custom pronunciation rules
 */

import type { PronunciationRule, PronunciationDictionary } from "@/models/pronunciation.js";
import { logger } from "@/utils/logger.js";
import { readFileSync } from "fs";
import { existsSync } from "fs";

/**
 * Default pronunciation rules
 * Common technical terms and abbreviations
 */
const DEFAULT_RULES: PronunciationRule[] = [
  { term: "API", pronunciation: "A P I" },
  { term: "CLI", pronunciation: "C L I" },
  { term: "GUI", pronunciation: "G U I" },
  { term: "TTS", pronunciation: "T T S" },
  { term: "JSON", pronunciation: "J son" },
  { term: "HTTP", pronunciation: "H T T P" },
  { term: "HTTPS", pronunciation: "H T T P S" },
  { term: "URL", pronunciation: "U R L" },
  { term: "SQL", pronunciation: "S Q L" },
  { term: "iOS", pronunciation: "I O S" },
  { term: "GitHub", pronunciation: "Git Hub" },
  { term: "YouTube", pronunciation: "You Tube" },
  { term: "AI", pronunciation: "A I" },
  { term: "LLM", pronunciation: "L L M" },
  { term: "PAI", pronunciation: "P A I" },
];

/**
 * Pronunciation service class
 */
export class PronunciationService {
  private dictionary: PronunciationDictionary;

  constructor(customRules: PronunciationRule[] = [], loadFromPath?: string) {
    let rules = customRules;

    // Load rules from file if path provided
    if (loadFromPath) {
      const fileRules = PronunciationService.loadFromFile(loadFromPath);
      rules = [...rules, ...fileRules];
      logger.info("Loaded pronunciation rules from file", {
        path: loadFromPath,
        count: fileRules.length,
      });
    }

    this.dictionary = this.buildDictionary(rules);
  }

  /**
   * Load pronunciation rules from a JSON file
   */
  static loadFromFile(filePath: string): PronunciationRule[] {
    if (!existsSync(filePath)) {
      logger.warn("Pronunciation file not found, using defaults", { filePath });
      return [];
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);

      // Handle both array and object formats
      if (Array.isArray(data)) {
        return data;
      } else if (data.pronunciations && Array.isArray(data.pronunciations)) {
        return data.pronunciations;
      }

      logger.warn("Invalid pronunciation file format", { filePath });
      return [];
    } catch (error) {
      logger.error("Failed to load pronunciation file", error as Error, { filePath });
      return [];
    }
  }

  /**
   * Build pronunciation dictionary from rules
   */
  private buildDictionary(customRules: PronunciationRule[]): PronunciationDictionary {
    const dict: PronunciationDictionary = {};

    // Add default rules
    for (const rule of DEFAULT_RULES) {
      dict[rule.term.toLowerCase()] = rule.pronunciation;
    }

    // Add custom rules (override defaults)
    for (const rule of customRules) {
      dict[rule.term.toLowerCase()] = rule.pronunciation;
    }

    logger.debug("Built pronunciation dictionary", {
      entries: Object.keys(dict).length,
    });

    return dict;
  }

  /**
   * Apply pronunciation rules to text
   */
  apply(text: string): string {
    let result = text;

    // Sort keys by length (longest first) to handle multi-word terms
    const sortedKeys = Object.keys(this.dictionary).sort((a, b) => b.length - a.length);

    for (const term of sortedKeys) {
      // Create case-insensitive regex with word boundaries
      const regex = new RegExp(`\\b${term}\\b`, "gi");
      const pronunciation = this.dictionary[term];

      result = result.replace(regex, pronunciation);
    }

    if (result !== text) {
      logger.debug("Applied pronunciation rules", { original: text, result });
    }

    return result;
  }

  /**
   * Add a custom pronunciation rule
   */
  addRule(rule: PronunciationRule): void {
    this.dictionary[rule.term.toLowerCase()] = rule.pronunciation;
    logger.debug("Added pronunciation rule", { term: rule.term, pronunciation: rule.pronunciation });
  }

  /**
   * Remove a pronunciation rule (revert to default if exists)
   */
  removeRule(term: string): void {
    const lowerTerm = term.toLowerCase();
    if (this.dictionary[lowerTerm]) {
      delete this.dictionary[lowerTerm];
      logger.debug("Removed pronunciation rule", { term });
    }
  }

  /**
   * Get all pronunciation rules
   */
  getRules(): PronunciationRule[] {
    return Object.entries(this.dictionary).map(([term, pronunciation]) => ({
      term,
      pronunciation,
    }));
  }

  /**
   * Clear all custom rules (reset to defaults)
   */
  reset(): void {
    this.dictionary = this.buildDictionary([]);
    logger.debug("Reset pronunciation rules to defaults");
  }
}

// Singleton instance
let service: PronunciationService | null = null;

/**
 * Get or create pronunciation service singleton
 */
export function getPronunciationService(customRules?: PronunciationRule[], loadFromPath?: string): PronunciationService {
  if (!service) {
    service = new PronunciationService(customRules || [], loadFromPath);
  }
  return service;
}

/**
 * Load pronunciation rules from the standard PAI pronunciation file
 */
export function loadPAIPronunciations(): PronunciationRule[] {
  const pronunciationsPath = `${process.env.HOME}/.claude/VoiceServer/voices/pronunciations.json`;

  if (existsSync(pronunciationsPath)) {
    const rules = PronunciationService.loadFromFile(pronunciationsPath);
    logger.info("Loaded PAI pronunciation rules", { count: rules.length });
    return rules;
  }

  return [];
}

/**
 * Reset pronunciation service (for testing)
 */
export function resetPronunciationService(): void {
  service = null;
}

/**
 * Apply pronunciation rules to text (convenience function)
 */
export function applyPronunciations(text: string, customRules?: PronunciationRule[]): string {
  const svc = getPronunciationService(customRules);
  return svc.apply(text);
}
