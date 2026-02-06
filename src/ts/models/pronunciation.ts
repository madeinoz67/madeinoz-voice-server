/**
 * Pronunciation rule types
 * Text substitution for TTS pronunciation
 */

/**
 * Maps a term to its custom pronunciation
 */
export interface PronunciationRule {
  /** Original term to replace */
  term: string;
  /** Replacement text for TTS */
  pronunciation: string;
}

/**
 * Collection of pronunciation rules
 */
export type PronunciationDictionary = Record<string, string>;

/**
 * Convert pronunciation rules array to dictionary
 */
export function rulesToDictionary(rules: PronunciationRule[]): PronunciationDictionary {
  const dict: PronunciationDictionary = {};
  for (const rule of rules) {
    dict[rule.term.toLowerCase()] = rule.pronunciation;
  }
  return dict;
}

/**
 * Validate pronunciation rule
 */
export function isValidPronunciationRule(rule: Partial<PronunciationRule>): boolean {
  if (!rule.term || !rule.pronunciation) return false;
  if (rule.term.trim().length === 0 || rule.pronunciation.trim().length === 0) return false;
  return true;
}
