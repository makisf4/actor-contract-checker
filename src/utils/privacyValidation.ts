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
  // Remove neutral placeholder: XXXXXX
  let stripped = text.replace(/XXXXXX/g, '');
  
  return stripped;
}

/**
 * Checks if a detected company entity's raw value still exists in the redacted text
 */
function isCompanyValueStillPresent(
  rawValue: string,
  redactedText: string,
  originalText: string,
  entity: DetectedEntity
): boolean {
  // Normalize the raw value
  const normalizedRaw = normalizeText(rawValue);
  
  // If normalized raw is empty or too short, skip
  if (normalizedRaw.length < 2) {
    return false;
  }
  
  // Extract raw value from original text using indices (more reliable)
  const extractedRaw = originalText.substring(entity.startIndex, entity.endIndex);
  const normalizedExtracted = normalizeText(extractedRaw);
  
  // Use the extracted value if available, otherwise use provided rawValue
  const valueToCheck = normalizedExtracted || normalizedRaw;
  
  // Strip placeholders from redacted text
  const strippedRedacted = stripPlaceholders(redactedText);
  
  // Normalize the stripped redacted text
  const normalizedRedacted = normalizeText(strippedRedacted);
  
  // Check if the normalized raw value exists in normalized redacted text
  // Use word boundaries to avoid partial matches
  const escapedValue = valueToCheck.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escapedValue}\\b`, 'i');
  
  return pattern.test(normalizedRedacted);
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
    // Extract the raw value from original text using indices
    const rawValue = originalText.substring(entity.startIndex, entity.endIndex);
    
    // Check if this raw value still exists in redacted text
    if (isCompanyValueStillPresent(rawValue, redactedText, originalText, entity)) {
      return true; // Found unredacted company name
    }
  }
  
  // All detected companies were properly redacted
  return false;
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
  
  const companyEntities = detectedEntities.filter(e => e.type === 'COMPANY');
  
  for (const entity of companyEntities) {
    const rawValue = originalText.substring(entity.startIndex, entity.endIndex);
    
    if (isCompanyValueStillPresent(rawValue, redactedText, originalText, entity)) {
      issues.push({
        type: entity.type,
        rawValue: rawValue,
        reason: 'Detected company name still present in redacted text',
      });
    }
  }
  
  return issues;
}
