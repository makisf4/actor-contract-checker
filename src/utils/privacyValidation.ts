import { DetectedEntity } from './redaction';

/**
 * Normalizes text for comparison by:
 * - Trimming whitespace
 * - Collapsing multiple spaces
 * - Converting to lowercase
 * - Removing surrounding quotes and punctuation
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/^[«»"'`]+|[«»"'`]+$/g, '')
    .replace(/^[.,;:!?]+|[.,;:!?]+$/g, '');
}

/**
 * Strips all placeholders from text to check for unredacted content
 */
function stripPlaceholders(text: string): string {
  // Remove neutral placeholders: XXXXXX or longer merged masks
  let stripped = text.replace(/X{6,}/g, '');
  
  return stripped;
}

/**
 * Checks if a detected entity's raw value still exists in the redacted text
 */
function isEntityValueStillPresent(
  entity: DetectedEntity,
  redactedText: string,
  originalText: string
): boolean {
  const extractedRaw = originalText.substring(entity.startIndex, entity.endIndex);
  const normalizedRaw = normalizeText(extractedRaw);
  if (normalizedRaw.length < 2) {
    return false;
  }
  
  // Strip placeholders from redacted text
  const strippedRedacted = stripPlaceholders(redactedText);
  
  // Normalize the stripped redacted text
  const normalizedRedacted = normalizeText(strippedRedacted);
  
  // Check if the normalized raw value exists in normalized redacted text
  // Use word boundaries to avoid partial matches
  const escapedValue = normalizedRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escapedValue}\\b`, 'i');
  
  if (pattern.test(normalizedRedacted)) {
    return true;
  }

  return normalizedRedacted.includes(normalizedRaw);
}

/**
 * Validates if there are unredacted company names in the redacted text
 * 
 * @param originalText - The original contract text
 * @param redactedText - The redacted text with placeholders
 * @param detectedEntities - List of detected entities from the detection step
 * @returns true if unredacted company names are found, false otherwise
 */
export function shouldWarnUnredactedCompany(
  originalText: string,
  redactedText: string,
  detectedEntities: DetectedEntity[]
): boolean {
  // Get all COMPANY entities
  const companyEntities = detectedEntities.filter(e => e.type === 'COMPANY');
  
  // If no companies detected, no warning needed
  if (companyEntities.length === 0) {
    return false;
  }
  
  // Check each detected company entity
  for (const entity of companyEntities) {
    if (isEntityValueStillPresent(entity, redactedText, originalText)) {
      return true; // Found unredacted company name
    }
  }
  
  // All detected companies were properly redacted
  return false;
}

/**
 * Hard privacy gate: checks all detected entity types for unredacted values
 */
export function hasAnyUnredactedEntities(
  originalText: string,
  redactedText: string,
  detectedEntities: DetectedEntity[]
): { ok: boolean; offendingTypes: string[] } {
  const offendingTypes = new Set<string>();

  for (const entity of detectedEntities) {
    if (isEntityValueStillPresent(entity, redactedText, originalText)) {
      offendingTypes.add(entity.type);
    }
  }

  return { ok: offendingTypes.size === 0, offendingTypes: Array.from(offendingTypes) };
}

/**
 * Collects issues with unredacted content (for debugging/logging)
 */
export function collectUnredactedIssues(
  originalText: string,
  redactedText: string,
  detectedEntities: DetectedEntity[]
): Array<{ type: string; rawValue: string; reason: string }> {
  const issues: Array<{ type: string; rawValue: string; reason: string }> = [];
  
  for (const entity of detectedEntities) {
    const rawValue = originalText.substring(entity.startIndex, entity.endIndex);
    
    if (isEntityValueStillPresent(entity, redactedText, originalText)) {
      issues.push({
        type: entity.type,
        rawValue: rawValue,
        reason: 'Detected entity value still present in redacted text',
      });
    }
  }
  
  return issues;
}
