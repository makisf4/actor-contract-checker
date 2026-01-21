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
 * Fail-closed suspicious pattern detection for redacted text.
 * Blocks remote analysis if high-risk patterns remain unredacted.
 */
export function detectSuspiciousUnredactedPatterns(
  redactedText: string
): { ok: boolean; reasons: string[] } {
  if (!redactedText) {
    return { ok: true, reasons: [] };
  }

  const reasons = new Set<string>();
  const placeholderPattern = /X{6,}/g;
  const lines = redactedText.split(/\r?\n/);
  const preambleIndex = redactedText.search(/^\s*ΑΡΘΡΟ\s+1\b/im);

  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const ibanPattern = /\bGR\d{2}[A-Z0-9]{11,30}\b/i;
  const phonePattern = /\b69\d{8}\b|\b2\d{9}\b/;
  const afmPattern = /(?:ΑΦΜ.{0,10}\b\d{9}\b|\b\d{9}\b.{0,10}ΑΦΜ)/i;

  if (emailPattern.test(redactedText) || ibanPattern.test(redactedText) || phonePattern.test(redactedText)) {
    reasons.add('ΠΙΘΑΝΟ EMAIL/IBAN/ΤΗΛΕΦΩΝΟ');
  }
  if (afmPattern.test(redactedText)) {
    reasons.add('ΠΙΘΑΝΟ ΑΦΜ');
  }

  const companySuffixPattern = /\b(Α\.Ε\.|ΑΕ|ΕΠΕ|ΙΚΕ|ΟΕ|ΕΕ|LTD|LLC|INC|S\.A\.|SA)\b/i;
  const addressCuePattern = /\b(ΟΔΟΣ|ΟΔ\.|ΤΚ|Τ\.Κ\.|ΑΡΙΘΜ|ΑΡ\.|ΛΕΩΦ)\b[^0-9]{0,10}\d{1,4}\b/i;
  const titleCaseWord = '[Α-ΩΆΈΉΊΌΎΏA-Z][α-ωάέήίόύώa-z]+';
  const titleCaseNamePattern = new RegExp(`\\b${titleCaseWord}(?:\\s+${titleCaseWord}){1,2}\\b`, 'g');
  const titleCaseCompanyPattern = new RegExp(`\\b${titleCaseWord}(?:\\s+${titleCaseWord}){1,4}\\b`, 'g');
  const titleCaseCuePattern = /(ηθοποι|καλλιτεχν|ερμηνευτ|παραγωγ|εταιρε|μεταξυ|\bτου\b|\bτης\b)/i;
  const companyKeywordPattern = /\b(Α\.Ε\.|ΑΕ|ΕΠΕ|ΙΚΕ|ΟΕ|ΕΕ|LTD|LLC|INC|S\.A\.|SA|PRODUCTIONS|STUDIOS|MEDIA)\b/i;

  const allowedTitlePhrases = new Set([
    'ευρωπαϊκη ενωση',
    'ευρωπαϊκης ενωσης',
    'ελληνικη δημοκρατια',
    'ελληνικης δημοκρατιας',
  ]);

  const normalizeForAllowlist = (value: string) => (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\u0370-\u03FF\u1F00-\u1FFF\s]+/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  );

  let searchFrom = 0;
  for (const line of lines) {
    const lineIndex = redactedText.indexOf(line, searchFrom);
    if (lineIndex !== -1) {
      searchFrom = lineIndex + line.length;
    }
    const isPreamble = preambleIndex !== -1 && lineIndex !== -1 && lineIndex < preambleIndex;
    const lineForScan = line.replace(placeholderPattern, '');
    if (!lineForScan.trim()) {
      continue;
    }
    if (companySuffixPattern.test(lineForScan)) {
      reasons.add('ΠΙΘΑΝΗ ΕΤΑΙΡΕΙΑ');
    }
    if (addressCuePattern.test(lineForScan)) {
      reasons.add('ΠΙΘΑΝΗ ΔΙΕΥΘΥΝΣΗ');
    }

    titleCaseNamePattern.lastIndex = 0;
    let nameMatch;
    while ((nameMatch = titleCaseNamePattern.exec(lineForScan)) !== null) {
      const normalized = normalizeForAllowlist(nameMatch[0]);
      if (allowedTitlePhrases.has(normalized)) {
        continue;
      }
      const windowStart = Math.max(0, nameMatch.index - 80);
      const windowEnd = Math.min(lineForScan.length, nameMatch.index + nameMatch[0].length + 80);
      const window = lineForScan.slice(windowStart, windowEnd);
      const hasCue = titleCaseCuePattern.test(window);
      if (isPreamble || hasCue) {
        reasons.add('ΠΙΘΑΝΟ ΟΝΟΜΑ');
        break;
      }
    }

    if (!reasons.has('ΠΙΘΑΝΗ ΕΤΑΙΡΕΙΑ') && companyKeywordPattern.test(lineForScan)) {
      titleCaseCompanyPattern.lastIndex = 0;
      let companyMatch;
      while ((companyMatch = titleCaseCompanyPattern.exec(lineForScan)) !== null) {
        const normalized = normalizeForAllowlist(companyMatch[0]);
        if (allowedTitlePhrases.has(normalized)) {
          continue;
        }
        reasons.add('ΠΙΘΑΝΗ ΕΤΑΙΡΕΙΑ');
        break;
      }
    }
  }

  const uppercaseSequencePattern = /\b[Α-ΩΆΈΉΊΌΎΏA-Z]{2,}(?:\s+[Α-ΩΆΈΉΊΌΎΏA-Z]{2,}){1,2}\b/g;
  const headingTerms = new Set([
    'ΑΡΘΡΟ', 'ΚΕΦΑΛΑΙΟ', 'ΠΑΡΑΡΤΗΜΑ', 'ΣΥΜΒΑΣΗ', 'ΣΥΜΒΑΣΗΣ', 'ΣΥΜΦΩΝΙΑ',
    'ΟΡΟΙ', 'ΟΡΟΣ', 'ΑΝΤΙΚΕΙΜΕΝΟ', 'ΔΙΑΡΚΕΙΑ', 'ΑΜΟΙΒΗ', 'ΠΛΗΡΩΜΗ',
    'ΛΥΣΗ', 'ΚΑΤΑΓΓΕΛΙΑ', 'ΥΠΟΧΡΕΩΣΕΙΣ', 'ΔΙΚΑΙΩΜΑΤΑ', 'ΠΡΟΟΙΜΙΟ',
    'ΤΕΛΙΚΕΣ', 'ΔΙΑΤΑΞΕΙΣ', 'ΕΜΠΙΣΤΕΥΤΙΚΟΤΗΤΑ', 'ΠΡΟΣΤΑΣΙΑ', 'ΔΕΔΟΜΕΝΩΝ',
    'ΡΗΤΡΑ', 'ΡΗΤΡΕΣ', 'ΥΠΟΓΡΑΦΕΣ', 'ΟΡΙΣΜΟΙ', 'ΣΚΟΠΟΣ', 'ΕΥΘΥΝΗ',
    'ΔΙΑΦΟΡΕΣ', 'ΕΦΑΡΜΟΣΤΕΟ', 'ΔΙΚΑΙΟ', 'ΠΑΡΑΔΟΣΗ', 'ΕΝΑΡΞΗ',
    'ARTICLE', 'TERMS', 'AGREEMENT', 'CONTRACT', 'CHAPTER', 'APPENDIX',
    'SIGNATURES', 'SCOPE', 'DURATION', 'PAYMENT', 'TERMINATION',
  ]);

  for (const line of lines) {
    const lineForScan = line.replace(placeholderPattern, '');
    if (!lineForScan.trim()) {
      continue;
    }
    uppercaseSequencePattern.lastIndex = 0;
    let match;
    while ((match = uppercaseSequencePattern.exec(lineForScan)) !== null) {
      const words = match[0].split(/\s+/);
      const normalized = normalizeForAllowlist(match[0]);
      if (allowedTitlePhrases.has(normalized)) {
        continue;
      }
      if (words.some(word => headingTerms.has(word))) {
        continue;
      }
      reasons.add('ΠΙΘΑΝΟ ΟΝΟΜΑ');
      break;
    }
    if (reasons.has('ΠΙΘΑΝΟ ΟΝΟΜΑ')) {
      break;
    }
  }

  return { ok: reasons.size === 0, reasons: Array.from(reasons) };
}

/**
 * Authoritative residual check: compares original vs final text
 * and blocks if probable personal/company phrases remain unredacted.
 */
export function hasUnredactedResiduals(
  originalText: string,
  finalText: string
): { ok: boolean; reasons: string[] } {
  if (!originalText || !finalText) {
    return { ok: true, reasons: [] };
  }

  const reasons = new Set<string>();
  const candidates = new Map<string, string>();

  const normalizeForSearch = (value: string) => (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\u0370-\u03FF\u1F00-\u1FFF\s]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );

  const normalizedFinal = normalizeForSearch(finalText);
  const placeholderPattern = /X{6,}/g;
  const preambleIndex = originalText.search(/^\s*ΑΡΘΡΟ\s+1\b/im);

  const allowedPhrases = new Set([
    'ελλαδα',
    'αθηνα',
    'ευρωπαϊκη ενωση',
    'ευρωπαϊκης ενωσης',
    'ελληνικη δημοκρατια',
    'ελληνικης δημοκρατιας',
  ]);

  const headingTerms = new Set([
    'ΑΡΘΡΟ', 'ΚΕΦΑΛΑΙΟ', 'ΠΑΡΑΡΤΗΜΑ', 'ΣΥΜΒΑΣΗ', 'ΣΥΜΒΑΣΗΣ', 'ΣΥΜΦΩΝΙΑ',
    'ΟΡΟΙ', 'ΟΡΟΣ', 'ΑΝΤΙΚΕΙΜΕΝΟ', 'ΔΙΑΡΚΕΙΑ', 'ΑΜΟΙΒΗ', 'ΠΛΗΡΩΜΗ',
    'ΛΥΣΗ', 'ΚΑΤΑΓΓΕΛΙΑ', 'ΥΠΟΧΡΕΩΣΕΙΣ', 'ΔΙΚΑΙΩΜΑΤΑ', 'ΠΡΟΟΙΜΙΟ',
    'ΤΕΛΙΚΕΣ', 'ΔΙΑΤΑΞΕΙΣ', 'ΕΜΠΙΣΤΕΥΤΙΚΟΤΗΤΑ', 'ΠΡΟΣΤΑΣΙΑ', 'ΔΕΔΟΜΕΝΩΝ',
    'ΡΗΤΡΑ', 'ΡΗΤΡΕΣ', 'ΥΠΟΓΡΑΦΕΣ', 'ΟΡΙΣΜΟΙ', 'ΣΚΟΠΟΣ', 'ΕΥΘΥΝΗ',
    'ΔΙΑΦΟΡΕΣ', 'ΕΦΑΡΜΟΣΤΕΟ', 'ΔΙΚΑΙΟ', 'ΠΑΡΑΔΟΣΗ', 'ΕΝΑΡΞΗ',
    'ARTICLE', 'TERMS', 'AGREEMENT', 'CONTRACT', 'CHAPTER', 'APPENDIX',
    'SIGNATURES', 'SCOPE', 'DURATION', 'PAYMENT', 'TERMINATION',
  ]);

  const titleCaseWord = '[Α-ΩΆΈΉΊΌΎΏA-Z][α-ωάέήίόύώa-z]+';
  const titleCasePattern = new RegExp(`\\b${titleCaseWord}(?:\\s+${titleCaseWord}){1,3}\\b`, 'g');
  const allCapsPattern = /\b[Α-ΩΆΈΉΊΌΎΏA-Z]{2,}(?:\s+[Α-ΩΆΈΉΊΌΎΏA-Z]{2,}){1,4}\b/g;
  const companySuffixPattern = /\b((?:[Α-ΩΆΈΉΊΌΎΏA-Z][\wΆΈΉΊΌΎΏάέήίόύώ.\-']+(?:\s+[Α-ΩΆΈΉΊΌΎΏA-Z][\wΆΈΉΊΌΎΏάέήίόύώ.\-']+){0,4})\s+(Α\.Ε\.|ΑΕ|ΕΠΕ|ΙΚΕ|ΟΕ|ΕΕ|LTD|LLC|INC|S\.A\.|SA))\b/gi;
  const cuePattern = /(ηθοποι|καλλιτεχν|ερμηνευτ|παραγωγ|εταιρε|μεταξυ|\bτου\b|\bτης\b)/i;

  const addCandidate = (raw: string, reason: string) => {
    if (!raw || placeholderPattern.test(raw)) {
      return;
    }
    const normalized = normalizeForSearch(raw);
    if (!normalized) {
      return;
    }
    if (allowedPhrases.has(normalized)) {
      return;
    }
    if (normalized.split(' ').length < 2) {
      return;
    }
    candidates.set(normalized, reason);
  };

  // Title-Case sequences (2-4 words) with cue or in preamble
  titleCasePattern.lastIndex = 0;
  let match;
  while ((match = titleCasePattern.exec(originalText)) !== null) {
    const raw = match[0];
    const windowStart = Math.max(0, match.index - 80);
    const windowEnd = Math.min(originalText.length, match.index + raw.length + 80);
    const window = originalText.slice(windowStart, windowEnd);
    const isPreamble = preambleIndex !== -1 && match.index < preambleIndex;
    if (isPreamble || cuePattern.test(window)) {
      addCandidate(raw, 'ΠΙΘΑΝΟ ΟΝΟΜΑ');
    }
  }

  // ALL-CAPS sequences (2-5 words) with cue or in preamble
  allCapsPattern.lastIndex = 0;
  while ((match = allCapsPattern.exec(originalText)) !== null) {
    const raw = match[0];
    const words = raw.split(/\s+/);
    if (words.some(word => headingTerms.has(word))) {
      continue;
    }
    const windowStart = Math.max(0, match.index - 80);
    const windowEnd = Math.min(originalText.length, match.index + raw.length + 80);
    const window = originalText.slice(windowStart, windowEnd);
    const isPreamble = preambleIndex !== -1 && match.index < preambleIndex;
    if (isPreamble || cuePattern.test(window)) {
      addCandidate(raw, 'ΠΙΘΑΝΟ ΟΝΟΜΑ');
    }
  }

  // Company suffix sequences (1-5 words + suffix)
  companySuffixPattern.lastIndex = 0;
  while ((match = companySuffixPattern.exec(originalText)) !== null) {
    const raw = match[0];
    addCandidate(raw, 'ΠΙΘΑΝΗ ΕΤΑΙΡΕΙΑ');
  }

  for (const [candidate, reason] of candidates.entries()) {
    if (!candidate) {
      continue;
    }
    if (normalizedFinal.includes(candidate)) {
      reasons.add(reason);
    }
  }

  return { ok: reasons.size === 0, reasons: Array.from(reasons) };
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
