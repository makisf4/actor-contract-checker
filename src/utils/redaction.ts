/**
 * PRIVACY GUARANTEE:
 * - All entity detection happens LOCALLY on device
 * - Raw entity values are kept in-memory ONLY for redaction mapping
 * - Raw values are NEVER sent over the network
 * - Only placeholders like XXXXXX are sent to API
 */

export type EntityType = 'PERSON' | 'COMPANY' | 'TAX_ID' | 'ADDRESS' | 'ADDRESS_NUMBER' | 'EMAIL' | 'PHONE' | 'AMOUNT' | 'IBAN';

export interface DetectedEntity {
  type: EntityType;
  value: string; // Raw value - kept in-memory ONLY, never displayed or sent
  startIndex: number;
  endIndex: number;
}

// Standard entity patterns
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const IBAN_REGEX = /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g;
const TAX_ID_REGEX = /\b\d{2}[-.\s]?\d{7}[-.\s]?\d{1}\b|\b\d{9}\b/g;

// Euro amounts with Greek/European punctuation: 1.500€, 2.000,00 €, 1.234,56€
const AMOUNT_REGEX = /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\s*(?:USD|EUR|GBP|€|£|ΕΥΡΩ)/gi;

// English company keywords
const COMPANY_KEYWORDS_EN = [
  'Inc.', 'LLC', 'Ltd.', 'Corp.', 'Corporation', 'Company', 'Co.', 'LLP',
  'Partners', 'Group', 'Holdings', 'Enterprises', 'Industries', 'Services'
];

// Greek company formats: Α.Ε. (Anonymi Etaireia), ΕΠΕ (Eterorithmi Perifereiaki Etaireia), ΙΚΕ (Idiotiki Kefalaiouhiki Etaireia)
const COMPANY_KEYWORDS_GR = [
  'Α.Ε.', 'ΑΕ', 'Ε.Π.Ε.', 'ΕΠΕ', 'Ι.Κ.Ε.', 'ΙΚΕ', 'Ο.Ε.', 'ΟΕ', 'Ε.Ε.', 'ΕΕ', 'Α.Β.Ε.Ε.',
  'Ανώνυμη Εταιρεία', 'Εταιρεία', 'Μονοπρόσωπη', 'Υποκατάστημα',
  'Brand', 'Επωνυμία', 'Διακριτικός τίτλος', 'διακριτικό τίτλο', 'διακριτικός τίτλος'
];

const COMPANY_KEYWORDS = [...COMPANY_KEYWORDS_EN, ...COMPANY_KEYWORDS_GR];

// Person name patterns (English)
const PERSON_NAME_PATTERNS_EN = [
  /(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g,
  /[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g,
];

// Greek names: Capital Greek letters (Α-Ω) followed by lowercase Greek letters
// Pattern: First name (capital) + Last name (capital) - e.g., "Γιάννης Παπαδόπουλος"
const GREEK_NAME_PATTERN = /[Α-ΩΆΈΉΊΌΎΏ][α-ωάέήίόύώ]+(?:\s+[Α-ΩΆΈΉΊΌΎΏ][α-ωάέήίόύώ]+)+/g;

const PERSON_NAME_PATTERNS = [...PERSON_NAME_PATTERNS_EN, GREEK_NAME_PATTERN];

export function detectEntities(text: string): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  // Email
  let match;
  while ((match = EMAIL_REGEX.exec(text)) !== null) {
    entities.push({
      type: 'EMAIL',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Phone
  PHONE_REGEX.lastIndex = 0;
  while ((match = PHONE_REGEX.exec(text)) !== null) {
    entities.push({
      type: 'PHONE',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // IBAN
  IBAN_REGEX.lastIndex = 0;
  while ((match = IBAN_REGEX.exec(text)) !== null) {
    entities.push({
      type: 'IBAN',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Tax ID
  TAX_ID_REGEX.lastIndex = 0;
  while ((match = TAX_ID_REGEX.exec(text)) !== null) {
    entities.push({
      type: 'TAX_ID',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Amount
  AMOUNT_REGEX.lastIndex = 0;
  while ((match = AMOUNT_REGEX.exec(text)) !== null) {
    entities.push({
      type: 'AMOUNT',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Address patterns (English)
  const addressPatternEN = /\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Parkway|Pkwy))[,\s]+[A-Z][a-z]+[,\s]+[A-Z]{2}\s+\d{5}/g;
  addressPatternEN.lastIndex = 0;
  while ((match = addressPatternEN.exec(text)) !== null) {
    entities.push({
      type: 'ADDRESS',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Greek addresses: Οδός/Οδ. (street), Λ. (avenue), αριθμός/αρ. (number)
  // Pattern: Street name with Greek words + number + city/postal code
  const addressPatternGR = /(?:Οδός|Οδ\.|Λεωφόρος|Λ\.)\s+[Α-ΩΆΈΉΊΌΎΏ][α-ωάέήίόύώ\s]+(?:\s+αρ\.?\s*\d+)?[,\s]+[Α-ΩΆΈΉΊΌΎΏ][α-ωάέήίόύώ\s]+(?:\s+\d{5})?/g;
  addressPatternGR.lastIndex = 0;
  while ((match = addressPatternGR.exec(text)) !== null) {
    entities.push({
      type: 'ADDRESS',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Address numbers: αρ. 12, αρ. 12A, , 10 (when following street name)
  // Pattern 1: "αρ." or "αρ" followed by number and optional letter
  const addressNumberPattern1 = /αρ\.\s*\d+[A-Za-zΑ-Ωα-ω]?/gi;
  addressNumberPattern1.lastIndex = 0;
  while ((match = addressNumberPattern1.exec(text)) !== null) {
    entities.push({
      type: 'ADDRESS_NUMBER',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Pattern 2: Comma followed by number (only when following street-related words)
  const streetContextPattern = /(?:Οδός|Οδ\.|Λεωφόρος|Λ\.|Street|St|Avenue|Ave|Road|Rd)\s+[Α-ΩA-Z][α-ωa-z\s]*,\s*(\d+[A-Za-zΑ-Ωα-ω]?)/g;
  streetContextPattern.lastIndex = 0;
  while ((match = streetContextPattern.exec(text)) !== null) {
    // Only capture the number part after comma
    const numberMatch = match[1];
    const numberStart = match.index + match[0].indexOf(numberMatch);
    entities.push({
      type: 'ADDRESS_NUMBER',
      value: numberMatch,
      startIndex: numberStart,
      endIndex: numberStart + numberMatch.length,
    });
  }

  // Company names (English: capitalized words followed by company keywords)
  const companyPatternEN = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc\.|LLC|Ltd\.|Corp\.|Corporation|Company|Co\.|LLP|Partners|Group|Holdings|Enterprises|Industries|Services)/g;
  companyPatternEN.lastIndex = 0;
  while ((match = companyPatternEN.exec(text)) !== null) {
    entities.push({
      type: 'COMPANY',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Layer 1: Greek company names with corporate markers (high precision)
  // Pattern 1: Quoted company names with corporate markers: «CORAL Α.Ε.»
  const quotedCompanyPattern = /«[Α-ΩA-Z][Α-ΩA-Z0-9\s]+»\s*(?:Α\.Ε\.|ΑΕ|Ε\.Π\.Ε\.|ΕΠΕ|Ι\.Κ\.Ε\.|ΙΚΕ|Ο\.Ε\.|ΟΕ|Ε\.Ε\.|ΕΕ|Ανώνυμη Εταιρεία|Εταιρεία)/g;
  quotedCompanyPattern.lastIndex = 0;
  while ((match = quotedCompanyPattern.exec(text)) !== null) {
    entities.push({
      type: 'COMPANY',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Pattern 2: Company names with Greek corporate format
  const companyPatternGR = /[Α-ΩΆΈΉΊΌΎΏ][α-ωάέήίόύώ\s]+(?:Α\.Ε\.|ΑΕ|Ε\.Π\.Ε\.|ΕΠΕ|Ι\.Κ\.Ε\.|ΙΚΕ|Ο\.Ε\.|ΟΕ|Ε\.Ε\.|ΕΕ|Α\.Β\.Ε\.Ε\.|Ανώνυμη Εταιρεία|Εταιρεία)/g;
  companyPatternGR.lastIndex = 0;
  while ((match = companyPatternGR.exec(text)) !== null) {
    entities.push({
      type: 'COMPANY',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Pattern 3: Brand names in quotes with "διακριτικός τίτλος" or "επωνυμία"
  const brandPattern = /(?:διακριτικό τίτλο|διακριτικός τίτλος|επωνυμία|Επωνυμία)\s*[«"']([Α-ΩA-Z][Α-ΩA-Z0-9\s]+)[»"']/g;
  brandPattern.lastIndex = 0;
  while ((match = brandPattern.exec(text)) !== null) {
    // Include the context phrase + quoted brand
    const fullMatch = match[0];
    entities.push({
      type: 'COMPANY',
      value: fullMatch,
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
    });
  }

  // Pattern 4: Standalone quoted names that appear near corporate context
  const standaloneQuoted = /«([Α-ΩA-Z][Α-ΩA-Z0-9\s]{2,})»/g;
  standaloneQuoted.lastIndex = 0;
  while ((match = standaloneQuoted.exec(text)) !== null) {
    // Check if it's near corporate keywords (within 50 chars)
    const beforeContext = text.substring(Math.max(0, match.index - 50), match.index);
    const afterContext = text.substring(match.index + match[0].length, Math.min(text.length, match.index + match[0].length + 50));
    const context = beforeContext + afterContext;
    
    if (COMPANY_KEYWORDS.some(kw => context.includes(kw))) {
      entities.push({
        type: 'COMPANY',
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // Layer 2: All-caps sequences near corporate markers (medium precision)
  const allCapsPattern = /\b[A-ZΑ-Ω]{2,}(?:\s+[A-ZΑ-Ω]{2,}){1,}\b/g;
  allCapsPattern.lastIndex = 0;
  while ((match = allCapsPattern.exec(text)) !== null) {
    const matchedText = match[0];
    // Check context around the match
    const beforeContext = text.substring(Math.max(0, match.index - 30), match.index);
    const afterContext = text.substring(match.index + matchedText.length, Math.min(text.length, match.index + matchedText.length + 30));
    const context = beforeContext + afterContext;
    
    // Only if near corporate keywords or quotes
    if (COMPANY_KEYWORDS.some(kw => context.includes(kw)) || 
        context.includes('«') || context.includes('"') || context.includes("'")) {
      // Avoid matching if it's already detected or if it's too short
      const isOverlap = entities.some(e => 
        match.index < e.endIndex && match.index + matchedText.length > e.startIndex
      );
      if (!isOverlap && matchedText.length >= 4) {
        entities.push({
          type: 'COMPANY',
          value: matchedText,
          startIndex: match.index,
          endIndex: match.index + matchedText.length,
        });
      }
    }
  }

  // Person names (heuristic: title + name or capitalized first + last name patterns)
  // Includes both English and Greek name patterns
  for (const pattern of PERSON_NAME_PATTERNS) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const matchedText = match[0];
      // Skip if it's likely a company or address (contains numbers or company keywords)
      // Avoid over-redacting: skip common words that match pattern but aren't names
      const isCommonWord = matchedText.length < 4 || 
        ['The', 'This', 'That', 'These', 'Those'].some(word => matchedText.startsWith(word));
      
      // Skip if it's a protected legal phrase
      const isLegalPhrase = PROTECTED_LEGAL_PHRASES.some(phrase => 
        matchedText.toLowerCase().includes(phrase.toLowerCase())
      );
      
      // Skip if it's all lowercase Greek (likely a verb, not a name)
      const isAllLowercaseGreek = /^[α-ωάέήίόύώ\s]+$/.test(matchedText);
      
      if (!isCommonWord &&
          !isLegalPhrase &&
          !isAllLowercaseGreek &&
          !COMPANY_KEYWORDS.some(kw => matchedText.includes(kw)) && 
          !matchedText.match(/\d/)) {
        entities.push({
          type: 'PERSON',
          value: matchedText,
          startIndex: match.index,
          endIndex: match.index + matchedText.length,
        });
      }
    }
  }
  
  // Additional detection: Creator names after "του/της" with work context
  // Pattern: του/της + capitalized name, with work context in same sentence
  const creatorPattern = /(?:^|\.|!|\?)\s*(?:του|της)\s+([Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+(?:\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+)+)/g;
  let creatorMatch;
  creatorPattern.lastIndex = 0;
  while ((creatorMatch = creatorPattern.exec(text)) !== null) {
    const creatorName = creatorMatch[1];
    const matchStart = creatorMatch.index;
    const matchEnd = matchStart + creatorMatch[0].length;
    
    // Check for work context within 200 characters (same sentence)
    const contextStart = Math.max(0, matchStart - 100);
    const contextEnd = Math.min(text.length, matchEnd + 100);
    const context = text.substring(contextStart, contextEnd);
    
    const hasWorkContext = WORK_CONTEXT_KEYWORDS.some(keyword => 
      context.includes(keyword)
    );
    
    // Skip if it's a protected legal phrase or all lowercase
    const isLegalPhrase = PROTECTED_LEGAL_PHRASES.some(phrase => 
      creatorName.toLowerCase().includes(phrase.toLowerCase())
    );
    const isAllLowercaseGreek = /^[α-ωάέήίόύώ\s]+$/.test(creatorName);
    
    if (hasWorkContext && !isLegalPhrase && !isAllLowercaseGreek) {
      // Check if not already detected
      const isAlreadyDetected = entities.some(e => 
        creatorMatch.index + creatorMatch[0].indexOf(creatorName) >= e.startIndex &&
        creatorMatch.index + creatorMatch[0].indexOf(creatorName) + creatorName.length <= e.endIndex
      );
      
      if (!isAlreadyDetected) {
        const nameStart = creatorMatch.index + creatorMatch[0].indexOf(creatorName);
        entities.push({
          type: 'PERSON',
          value: creatorName,
          startIndex: nameStart,
          endIndex: nameStart + creatorName.length,
        });
      }
    }
  }

  // Layer 3: Brand token repetition detection
  // If we detected a company name, look for repeated brand tokens (e.g., "CORAL" appearing multiple times)
  const detectedCompanyNames = entities
    .filter(e => e.type === 'COMPANY')
    .map(e => {
      // Extract potential brand token (first word, remove quotes/markers)
      const cleaned = e.value.replace(/[«»"']/g, '').trim();
      const words = cleaned.split(/\s+/);
      // Get first significant word (all caps or capitalized, at least 3 chars)
      const brandToken = words.find(w => /^[A-ZΑ-Ω]/.test(w) && w.length >= 3 && !COMPANY_KEYWORDS.includes(w));
      return brandToken;
    })
    .filter((token): token is string => token !== undefined && token.length >= 3);

  // Find repeated brand tokens that weren't already detected
  for (const brandToken of detectedCompanyNames) {
    if (!brandToken) continue;
    
    // Escape special regex characters in brand token
    const escapedToken = brandToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Look for standalone occurrences of this brand token (case-insensitive)
    const brandPattern = new RegExp(`\\b${escapedToken}\\b`, 'gi');
    brandPattern.lastIndex = 0;
    
    while ((match = brandPattern.exec(text)) !== null) {
      // Check if this position is already covered by a detected entity
      const isCovered = entities.some(e => 
        match.index >= e.startIndex && match.index < e.endIndex
      );
      
      // Only add if not covered and if it's a standalone word (not part of a larger phrase)
      if (!isCovered) {
        entities.push({
          type: 'COMPANY',
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Sort by start index
  entities.sort((a, b) => a.startIndex - b.startIndex);

  // Remove overlaps (keep first occurrence)
  const filtered: DetectedEntity[] = [];
  for (const entity of entities) {
    const overlaps = filtered.some(
      e => entity.startIndex < e.endIndex && entity.endIndex > e.startIndex
    );
    if (!overlaps) {
      filtered.push(entity);
    }
  }

  return filtered;
}

// All entities are replaced with the same neutral placeholder
const REDACTION_PLACEHOLDER = 'XXXXXX';
// Merged mask for glued placeholders (10 X's for stability)
const MERGED_MASK = 'XXXXXXXXXX';
// Full entity mask for complete redaction (same as MERGED_MASK for consistency)
const FULL_ENTITY_MASK = 'XXXXXXXXXX';

// Labels that must NEVER be redacted
const PROTECTED_LABELS = [
  'Πρόβες',
  'Παραστάσεων',
  'Παραστάσεις',
  'Ημέρες Παραστάσεων',
  'Προβών',
];

// Legal verbs/phrases that must NEVER be redacted
const PROTECTED_LEGAL_PHRASES = [
  'εκπροσωπείται',
  'εξουσιοδοτείται',
  'νομίμως',
  'υπογράφει',
  'εκπροσωπεί',
  'εξουσιοδοτεί',
  'νομίμως',
  'υπογράφει',
  'νομίμως',
];

// Work context keywords for creator detection
const WORK_CONTEXT_KEYWORDS = [
  'Παράστασης',
  'Έργου',
  'Ταινίας',
  'Καμπάνιας',
  'παράστασης',
  'έργου',
  'ταινίας',
  'καμπάνιας',
];

/**
 * Protects structural labels from redaction by temporarily wrapping them
 * 
 * @param text - Original text
 * @returns Object with protected text and mapping for restoration
 */
function protectLabels(text: string): { protectedText: string; labelMap: Map<string, string> } {
  let protectedText = text;
  const labelMap = new Map<string, string>();
  let markerCounter = 0;
  
  for (const label of PROTECTED_LABELS) {
    // Create unique marker for this label
    const marker = `__KEEP__LABEL__${markerCounter}__`;
    markerCounter++;
    
    // Replace label with marker (case-insensitive, whole word)
    const labelPattern = new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    protectedText = protectedText.replace(labelPattern, (match) => {
      labelMap.set(marker, match); // Store original (preserve case)
      return marker;
    });
  }
  
  return { protectedText, labelMap };
}

/**
 * Restores protected labels after redaction
 * 
 * @param text - Redacted text with markers
 * @param labelMap - Mapping of markers to original labels
 * @returns Text with labels restored
 */
function restoreLabels(text: string, labelMap: Map<string, string>): string {
  let restored = text;
  
  for (const [marker, originalLabel] of labelMap.entries()) {
    restored = restored.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), originalLabel);
  }
  
  return restored;
}

/**
 * HIGH-PRIORITY: Redacts full postal addresses (street + number)
 * Replaces entire address phrases with FULL_ENTITY_MASK
 * 
 * @param text - Text that may contain addresses
 * @returns Text with full addresses redacted
 */
function redactFullAddresses(text: string): string {
  let redacted = text;
  
  // Address triggers (Greek and English)
  const addressTriggers = [
    // Greek
    /οδός/gi,
    /οδου/gi,
    /οδ\./gi,
    /αρ\./gi,
    /αριθμός/gi,
    /κατοίκου/gi,
    /κατοικεί/gi,
    /εδρεύει/gi,
    /Λεωφόρος/gi,
    /Λ\./gi,
    // English
    /street/gi,
    /st\./gi,
    /road/gi,
    /rd\./gi,
    /avenue/gi,
    /ave\./gi,
  ];
  
  // Pattern 1: Address in parentheses: "(οδός Νικομάχου αρ. 51)"
  // Matches: ( + address trigger + street name (up to 6 words) + optional "αρ." + number + )
  const addressInParensPattern = /\([^)]*(?:οδός|οδου|οδ\.|αρ\.|αριθμός|street|st\.|road|rd\.|avenue|ave\.|Λεωφόρος|Λ\.)\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+(?:\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+){0,5}(?:\s+(?:αρ\.|αριθμός)\s*\d+[A-Za-zΑ-Ωα-ω]?)?[^)]*\)/gi;
  
  // Pattern 2: Address with context: "εδρεύει στην [city] (οδός [street] αρ. [number])"
  // Matches: context word + city + ( + address )
  const addressWithContextPattern = /(?:εδρεύει|κατοικεί|κατοίκου)\s+(?:στην|στον|στη|στο)\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+(?:\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+)?\s*\([^)]*(?:οδός|οδ\.|αρ\.|αριθμός)\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z\s]{2,40}(?:\s+(?:αρ\.|αριθμός)\s*\d+[A-Za-zΑ-Ωα-ω]?)?[^)]*\)/gi;
  
  // Pattern 3: Address with trigger + street name + "αρ." + number
  // Matches: trigger + street name (1-6 words) + "αρ." + number
  // More flexible: allows for variations in spacing
  const addressWithArPattern = /(?:οδός|οδου|οδ\.|street|st\.|road|rd\.|avenue|ave\.|Λεωφόρος|Λ\.)\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+(?:\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+){0,5}\s+(?:αρ\.|αριθμός)\s*\d+[A-Za-zΑ-Ωα-ω]?/gi;
  
  // Pattern 4: Address with trigger + street name + number (without "αρ.")
  // Matches: trigger + street name (1-6 words) + number
  // More flexible: allows for variations
  const addressWithNumberPattern = /(?:οδός|οδου|οδ\.|street|st\.|road|rd\.|avenue|ave\.|Λεωφόρος|Λ\.)\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+(?:\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+){0,5}\s+\d+[A-Za-zΑ-Ωα-ω]?/gi;
  
  // Pattern 5: Address with context prefix: "κατοίκου [city], οδός [street] [number]"
  // Matches: context + city + comma + address
  const addressWithContextPrefixPattern = /(?:κατοίκου|εδρεύει|κατοικεί)\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+(?:\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+)?\s*,\s*(?:οδός|οδ\.|αρ\.|αριθμός)\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+(?:\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+){0,5}(?:\s+(?:αρ\.|αριθμός)\s*)?\d+[A-Za-zΑ-Ωα-ω]?/gi;
  
  // Pattern 6: General address pattern - catch-all for addresses with trigger
  // Matches: any address trigger followed by words and ending with a number
  // Uses a simpler approach: match trigger + words (greedy) + number
  const generalAddressPattern = /(?:οδός|οδου|οδ\.|street|st\.|road|rd\.|avenue|ave\.|Λεωφόρος|Λ\.)\s+[^\d]{3,50}(?:\s+(?:αρ\.|αριθμός)\s*)?\d+/gi;
  
  // Pattern 7: Standalone street names (without numbers)
  // Matches: street trigger + street name (1-6 words)
  // Uses simpler pattern: match trigger + any non-digit text until punctuation/end
  // Exclude closing parenthesis from match
  const standaloneStreetPattern = /(?:οδός|οδου|οδ\.|street|st\.|road|rd\.|avenue|ave\.|Λεωφόρος|Λ\.)\s+[^\d\(\)]{3,40}(?=\s|$|[.,;:!?\)])/gi;
  
  // Pattern 8: City names after prepositions (standalone, not after verbs)
  // Matches: preposition + city name (1-3 words)
  // Prepositions: στην, στον, στη, στο, σε, εκ, από
  // Note: Pattern 9 (city after verbs) is tested first to avoid double matching
  const cityAfterPrepositionPattern = /(?:στην|στον|στη|στο|σε|εκ|από)\s+[Α-ΩA-Z][^\d\s]{2,30}(?=\s|$|[.,;:!?\)])/gi;
  
  // Pattern 9: City names after verbs (higher priority - match full phrase)
  // Matches: verb + preposition + city name
  // Verbs: εδρεύει, εδρεύουν, κατοίκου, κατοικεί
  const cityAfterVerbPattern = /(?:εδρεύει|εδρεύουν|κατοίκου|κατοικεί)\s+(?:στην|στον|στη|στο|σε)\s+[Α-ΩA-Z][^\d\s]{2,30}(?=\s|$|[.,;:!?\)])/gi;
  
  // Pattern 10: City names in genitive after comma (e.g., "Ηλιούπολης,")
  // Matches: city name in genitive (ending in -ης, -εως, etc.) after comma
  const cityGenitivePattern = /,\s+[Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+(?:ης|εως|ας)(?=\s|$|[.,;:!?\)])/gi;
  
  // Pattern 11: Δ.Ο.Υ. pattern - keep Δ.Ο.Υ., redact city
  // Matches: Δ.Ο.Υ. + city name (greedy to capture full city name)
  // Use simpler pattern: match any word characters after Δ.Ο.Υ. until punctuation/end
  const doyPattern = /Δ\.Ο\.Υ\.\s+([Α-ΩA-Z][^\s,.;:!?\)]{3,40})/gi;
  
  // Countries to preserve (do not redact)
  const preservedCountries = ['Ελλάδα', 'Greece', 'Ευρώπη', 'Europe'];
  
  // Collect all matches first to avoid index shifting
  const matches: Array<{ index: number; length: number; text: string }> = [];
  
  // Test Pattern 1: Address in parentheses
  let match;
  addressInParensPattern.lastIndex = 0;
  while ((match = addressInParensPattern.exec(redacted)) !== null) {
    const matchText = match[0];
    // Skip if it looks like a date or percentage
    if (!/^\d{4}$/.test(matchText) && !/%/.test(matchText)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
      });
    }
  }
  
  // Test Pattern 2: Address with context
  addressWithContextPattern.lastIndex = 0;
  while ((match = addressWithContextPattern.exec(redacted)) !== null) {
    const matchText = match[0];
    // Skip if already matched by Pattern 1 or if it's a date/percentage
    const isOverlap = matches.some(m => 
      match.index >= m.index && match.index < m.index + m.length
    );
    if (!isOverlap && !/^\d{4}$/.test(matchText) && !/%/.test(matchText)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
      });
    }
  }
  
  // Test Pattern 3: Address with "αρ." + number
  addressWithArPattern.lastIndex = 0;
  while ((match = addressWithArPattern.exec(redacted)) !== null) {
    const matchText = match[0];
    // Skip if already matched
    const isOverlap = matches.some(m => 
      match.index >= m.index && match.index < m.index + m.length
    );
    if (!isOverlap && !/^\d{4}$/.test(matchText) && !/%/.test(matchText)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
      });
    }
  }
  
  // Test Pattern 4: Address with number (without "αρ.")
  addressWithNumberPattern.lastIndex = 0;
  while ((match = addressWithNumberPattern.exec(redacted)) !== null) {
    const matchText = match[0];
    // Skip if already matched
    const isOverlap = matches.some(m => 
      match.index >= m.index && match.index < m.index + m.length
    );
    if (!isOverlap && !/^\d{4}$/.test(matchText) && !/%/.test(matchText)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
      });
    }
  }
  
  // Test Pattern 5: Address with context prefix
  addressWithContextPrefixPattern.lastIndex = 0;
  while ((match = addressWithContextPrefixPattern.exec(redacted)) !== null) {
    const matchText = match[0];
    // Skip if already matched
    const isOverlap = matches.some(m => 
      match.index >= m.index && match.index < m.index + m.length
    );
    if (!isOverlap && !/^\d{4}$/.test(matchText) && !/%/.test(matchText)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
      });
    }
  }
  
  // Test Pattern 6: General address pattern (catch-all)
  generalAddressPattern.lastIndex = 0;
  while ((match = generalAddressPattern.exec(redacted)) !== null) {
    const matchText = match[0];
    // Skip if already matched
    const isOverlap = matches.some(m => 
      match.index >= m.index && match.index < m.index + m.length
    );
    if (!isOverlap && !/^\d{4}$/.test(matchText) && !/%/.test(matchText)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
      });
    }
  }
  
  // Test Pattern 7: Standalone street names (without numbers)
  standaloneStreetPattern.lastIndex = 0;
  while ((match = standaloneStreetPattern.exec(redacted)) !== null) {
    const matchText = match[0];
    // Skip if already matched
    const isOverlap = matches.some(m => 
      match.index >= m.index && match.index < m.index + m.length
    );
    if (!isOverlap && !/^\d{4}$/.test(matchText) && !/%/.test(matchText)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
      });
    }
  }
  
  // Test Pattern 9: City names after verbs (test BEFORE Pattern 8 to avoid double matching)
  cityAfterVerbPattern.lastIndex = 0;
  while ((match = cityAfterVerbPattern.exec(redacted)) !== null) {
    const matchText = match[0];
    // Extract city name (after verb + preposition)
    const cityMatch = matchText.match(/(?:εδρεύει|εδρεύουν|κατοίκου|κατοικεί)\s+(?:στην|στον|στη|στο|σε)\s+([Α-ΩA-Z][^\d\s]{2,30})/);
    if (cityMatch) {
      const cityName = cityMatch[1].trim();
      // Skip if it's a preserved country
      const isPreserved = preservedCountries.some(country => 
        cityName.toLowerCase().includes(country.toLowerCase()) || 
        country.toLowerCase().includes(cityName.toLowerCase())
      );
      if (!isPreserved) {
        // Skip if already matched
        const isOverlap = matches.some(m => 
          match.index >= m.index && match.index < m.index + m.length
        );
        if (!isOverlap) {
          matches.push({
            index: match.index,
            length: match[0].length,
            text: match[0],
          });
        }
      }
    }
  }
  
  // Test Pattern 8: City names after prepositions (test AFTER Pattern 9 to avoid double matching)
  cityAfterPrepositionPattern.lastIndex = 0;
  while ((match = cityAfterPrepositionPattern.exec(redacted)) !== null) {
    const matchText = match[0];
    // Extract city name (after preposition)
    const cityMatch = matchText.match(/(?:στην|στον|στη|στο|σε|εκ|από)\s+([Α-ΩA-Z][^\d\s]{2,30})/);
    if (cityMatch) {
      const cityName = cityMatch[1].trim();
      // Skip if it's a preserved country
      const isPreserved = preservedCountries.some(country => 
        cityName.toLowerCase().includes(country.toLowerCase()) || 
        country.toLowerCase().includes(cityName.toLowerCase())
      );
      if (!isPreserved) {
        // Skip if already matched (especially by Pattern 9)
        const isOverlap = matches.some(m => 
          match.index >= m.index && match.index < m.index + m.length
        );
        if (!isOverlap) {
          matches.push({
            index: match.index,
            length: match[0].length,
            text: match[0],
          });
        }
      }
    }
  }
  
  // Test Pattern 10: City names in genitive after comma
  cityGenitivePattern.lastIndex = 0;
  while ((match = cityGenitivePattern.exec(redacted)) !== null) {
    const matchText = match[0];
    // Extract city name (after comma)
    const cityMatch = matchText.match(/,\s+([Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]+(?:ης|εως|ας))/);
    if (cityMatch) {
      const cityName = cityMatch[1].trim();
      // Skip if it's a preserved country
      const isPreserved = preservedCountries.some(country => 
        cityName.toLowerCase().includes(country.toLowerCase()) || 
        country.toLowerCase().includes(cityName.toLowerCase())
      );
      if (!isPreserved) {
        // Skip if already matched
        const isOverlap = matches.some(m => 
          match.index >= m.index && match.index < m.index + m.length
        );
        if (!isOverlap) {
          matches.push({
            index: match.index,
            length: match[0].length,
            text: match[0],
          });
        }
      }
    }
  }
  
  // Test Pattern 11: Δ.Ο.Υ. pattern (special handling - keep Δ.Ο.Υ., redact city)
  doyPattern.lastIndex = 0;
  while ((match = doyPattern.exec(redacted)) !== null) {
    const cityName = match[1];
    // Skip if it's a preserved country
    const isPreserved = preservedCountries.some(country => 
      cityName.toLowerCase().includes(country.toLowerCase()) || 
      country.toLowerCase().includes(cityName.toLowerCase())
    );
    if (!isPreserved) {
      // Find the city name position in the match (after "Δ.Ο.Υ. ")
      const doyPrefix = 'Δ.Ο.Υ. ';
      const cityStart = match.index + doyPrefix.length;
      const cityEnd = cityStart + cityName.length;
      // Skip if already matched
      const isOverlap = matches.some(m => 
        cityStart >= m.index && cityStart < m.index + m.length
      );
      if (!isOverlap) {
        // Only redact the city name part, not the whole match
        matches.push({
          index: cityStart,
          length: cityName.length,
          text: cityName,
        });
      }
    }
  }
  
  // Remove duplicates and sort by index (reverse for replacement)
  const uniqueMatches = matches.filter((m, i, arr) => 
    arr.findIndex(n => n.index === m.index && n.length === m.length) === i
  );
  uniqueMatches.sort((a, b) => b.index - a.index);
  
  // Replace matches in reverse order
  for (const match of uniqueMatches) {
    // Check if this is a Δ.Ο.Υ. pattern (only city name should be redacted)
    const beforeText = redacted.substring(Math.max(0, match.index - 10), match.index);
    const isDOYPattern = /Δ\.Ο\.Υ\.\s*$/.test(beforeText);
    
    if (isDOYPattern) {
      // For Δ.Ο.Υ., only replace the city name, keep "Δ.Ο.Υ. "
      redacted = redacted.slice(0, match.index) + FULL_ENTITY_MASK + redacted.slice(match.index + match.length);
    } else {
      // Preserve parentheses if present
      const hasParens = match.text.startsWith('(') && match.text.endsWith(')');
      if (hasParens) {
        redacted = redacted.slice(0, match.index) + `(${FULL_ENTITY_MASK})` + redacted.slice(match.index + match.length);
      } else {
        // For city names after verbs, keep the verb, redact "preposition + city"
        const isCityAfterVerb = /^(?:εδρεύει|εδρεύουν|κατοίκου|κατοικεί)\s+(?:στην|στον|στη|στο|σε)\s+/.test(match.text);
        
        if (isCityAfterVerb) {
          // Keep verb, redact "preposition + city"
          const verbMatch = match.text.match(/^((?:εδρεύει|εδρεύουν|κατοίκου|κατοικεί)\s+)/);
          if (verbMatch) {
            const verb = verbMatch[1];
            // Find where the preposition starts in the match
            const prepositionStart = verb.length;
            const prepositionAndCity = match.text.substring(prepositionStart);
            redacted = redacted.slice(0, match.index + prepositionStart) + FULL_ENTITY_MASK + redacted.slice(match.index + match.length);
          } else {
            // Full replacement
            redacted = redacted.slice(0, match.index) + FULL_ENTITY_MASK + redacted.slice(match.index + match.length);
          }
        } else {
          // For city names after prepositions (standalone), redact entire "preposition + city"
          // Full replacement
          redacted = redacted.slice(0, match.index) + FULL_ENTITY_MASK + redacted.slice(match.index + match.length);
        }
      }
    }
  }
  
  return redacted;
}

/**
 * HIGH-PRIORITY: Redacts quoted company names after legal triggers
 * Fixes cases like "υπό την επωνυμία «ΕΥΘΥΜΙΟΣ XXXXXXXX»" -> "υπό την επωνυμία «XXXXXXXXXX»"
 * 
 * @param text - Text that may contain quoted company names
 * @returns Text with quoted company names fully redacted
 */
function redactQuotedCompanyNames(text: string): string {
  let redacted = text;
  
  // Legal triggers for company names (Greek)
  const legalTriggers = [
    /υπό\s+την\s+επωνυμία/gi,
    /με\s+την\s+επωνυμία/gi,
    /της\s+εταιρείας/gi,
    /της\s+ανώνυμης\s+εταιρείας/gi,
    /επωνυμία/gi,
    /διακριτικό\s+τίτλο/gi,
  ];
  
  // Quoted content patterns: «...», "...", '...'
  const quotedPatterns = [
    /«[^»]+»/g,  // Greek quotes «...»
    /"[^"]+"/g,  // Double quotes "..."
    /'[^']+'/g,  // Single quotes '...'
  ];
  
  // For each legal trigger, find quoted content that follows it
  for (const trigger of legalTriggers) {
    let match;
    trigger.lastIndex = 0;
    while ((match = trigger.exec(redacted)) !== null) {
      const triggerEnd = match.index + match[0].length;
      // Look for quoted content within 150 characters after trigger
      const searchStart = triggerEnd;
      const searchEnd = Math.min(redacted.length, searchStart + 150);
      const searchText = redacted.substring(searchStart, searchEnd);
      
      // Find first quoted content after trigger
      for (const quotePattern of quotedPatterns) {
        quotePattern.lastIndex = 0;
        const quoteMatch = quotePattern.exec(searchText);
        if (quoteMatch) {
          const quoteStart = searchStart + quoteMatch.index;
          const quoteEnd = quoteStart + quoteMatch[0].length;
          // Replace ENTIRE quoted content (including any partial redactions inside) with FULL_ENTITY_MASK
          redacted = redacted.slice(0, quoteStart) + FULL_ENTITY_MASK + redacted.slice(quoteEnd);
          // Reset trigger regex to continue searching from beginning
          trigger.lastIndex = 0;
          break;
        }
      }
    }
  }
  
  return redacted;
}

/**
 * Collapses adjacent name fragments to ensure complete redaction
 * Fixes cases like "ΕΥΘΥΜΙΟΣ XXXXXXXX" or "του XXXXX του Αγγελου" -> "XXXXXXXXXX"
 * 
 * @param text - Text that may contain partial redactions
 * @returns Text with adjacent name fragments collapsed
 */
function collapseAdjacentNameFragments(text: string): string {
  let redacted = text;
  
  // Pattern for any placeholder (6 or more X's)
  const placeholderPattern = /X{6,}/;
  
  // Pattern 1: Capitalized word (Greek or Latin) followed by placeholder (6+ X's)
  // Greek capitals: Α-Ω, Latin: A-Z
  // Greek lowercase: α-ω, Latin: a-z
  // Match word + whitespace + placeholder (with word boundary)
  const pattern1 = /([Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]{2,})\s+(X{6,})(?=\s|$|[.,;:!?])/g;
  
  // Pattern 2: Placeholder (6+ X's) followed by capitalized word
  const pattern2 = /(X{6,})\s+([Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]{2,})(?=\s|$|[.,;:!?])/g;
  
  // Pattern 3: "του/της" + placeholder + "του/της" + capitalized word
  // Common Greek articles/prepositions before names
  // Also matches: "του" + placeholder + "του" + word (genitive case)
  const pattern3 = /(?:του|της|των|στον|στη|στο)\s+(X{6,})\s+(?:του|της|των|στον|στη|στο)\s+([Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]{2,})(?=\s|$|[.,;:!?])/gi;
  
  // Pattern 4: Capitalized word + "του/της" + placeholder
  const pattern4 = /([Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]{2,})\s+(?:του|της|των)\s+(X{6,})(?=\s|$|[.,;:!?])/gi;
  
  // Pattern 5: Placeholder + "του/της" + capitalized word
  const pattern5 = /(X{6,})\s+(?:του|της|των)\s+([Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]{2,})(?=\s|$|[.,;:!?])/gi;
  
  // Pattern 6: "του" + capitalized word + placeholder (genitive case)
  const pattern6 = /(?:του|της|των)\s+([Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]{2,})\s+(X{6,})(?=\s|$|[.,;:!?])/gi;
  
  // Pattern 7: Placeholder + "του/της" + capitalized word (common in Greek genitive)
  // Matches: "XXXXX του Αγγελου" -> "XXXXXXXXXX"
  const pattern7 = /(X{5,})\s+(?:του|της|των)\s+([Α-ΩA-Z][α-ωa-zΑ-ΩA-Z]{2,})(?=\s|$|[.,;:!?])/gi;
  
  // Words to preserve (roles, legal terms)
  const preserveWords = [
    'Ηθοποιός', 'Παραγωγός', 'Σκηνοθέτης', 'Σενάριο', 'Σκηνογραφία',
    'Actor', 'Producer', 'Director', 'Script', 'Production',
    'Εταιρεία', 'Επωνυμία', 'Συμβόλαιο', 'Ρήτρα',
  ];
  
  function shouldPreserve(word: string): boolean {
    const normalized = word.trim();
    // Check if it's a role or legal term
    if (preserveWords.some(p => normalized.includes(p) || p.includes(normalized))) {
      return true;
    }
    // Check if it's a date (YYYY) or number
    if (/^\d{4}$/.test(normalized) || /^\d+$/.test(normalized)) {
      return true;
    }
    // Check if it's too short (likely not a name)
    if (normalized.length < 3) {
      return true;
    }
    return false;
  }
  
  // Apply patterns in order, collecting matches first to avoid index shifting
  const matches: Array<{ index: number; length: number }> = [];
  
  // Pattern 1: Word + XXXXXX
  let match;
  pattern1.lastIndex = 0;
  while ((match = pattern1.exec(redacted)) !== null) {
    const word = match[1];
    if (!shouldPreserve(word)) {
      matches.push({
        index: match.index,
        length: match[0].length,
      });
    }
  }
  
  // Pattern 2: XXXXXX + Word
  pattern2.lastIndex = 0;
  while ((match = pattern2.exec(redacted)) !== null) {
    const word = match[2];
    if (!shouldPreserve(word)) {
      matches.push({
        index: match.index,
        length: match[0].length,
      });
    }
  }
  
  // Pattern 3: του XXXXX του Word
  pattern3.lastIndex = 0;
  while ((match = pattern3.exec(redacted)) !== null) {
    const word = match[2];
    if (!shouldPreserve(word)) {
      matches.push({
        index: match.index,
        length: match[0].length,
      });
    }
  }
  
  // Pattern 4: Word + του + XXXXXX
  pattern4.lastIndex = 0;
  while ((match = pattern4.exec(redacted)) !== null) {
    const word = match[1];
    if (!shouldPreserve(word)) {
      matches.push({
        index: match.index,
        length: match[0].length,
      });
    }
  }
  
  // Pattern 5: XXXXXX + του + Word
  pattern5.lastIndex = 0;
  while ((match = pattern5.exec(redacted)) !== null) {
    const word = match[2];
    if (!shouldPreserve(word)) {
      matches.push({
        index: match.index,
        length: match[0].length,
      });
    }
  }
  
  // Pattern 6: του + Word + XXXXXX
  pattern6.lastIndex = 0;
  while ((match = pattern6.exec(redacted)) !== null) {
    const word = match[1];
    if (!shouldPreserve(word)) {
      matches.push({
        index: match.index,
        length: match[0].length,
      });
    }
  }
  
  // Pattern 7: XXXXXX + του + Word
  pattern7.lastIndex = 0;
  while ((match = pattern7.exec(redacted)) !== null) {
    const word = match[2];
    if (!shouldPreserve(word)) {
      matches.push({
        index: match.index,
        length: match[0].length,
      });
    }
  }
  
  // Remove duplicates and sort by index (reverse for replacement)
  const uniqueMatches = matches.filter((m, i, arr) => 
    arr.findIndex(n => n.index === m.index && n.length === m.length) === i
  );
  uniqueMatches.sort((a, b) => b.index - a.index);
  
  // Replace matches in reverse order
  for (const match of uniqueMatches) {
    // Check if this range contains a placeholder (X{6,})
    const textAtMatch = redacted.substring(match.index, match.index + match.length);
    if (!placeholderPattern.test(textAtMatch)) {
      continue; // Skip if no placeholder found
    }
    redacted = redacted.slice(0, match.index) + FULL_ENTITY_MASK + redacted.slice(match.index + match.length);
  }
  
  return redacted;
}

/**
 * Redacts titles of works (theatre, film, ads) in quoted form
 * Supports grammatical forms with adjectives (e.g., "θεατρικής Παράστασης")
 * 
 * @param text - Text that may contain work titles
 * @returns Text with quoted titles replaced by MERGED_MASK
 */
function redactTitles(text: string): string {
  let redacted = text;
  
  // Work type triggers with optional adjectives (grammatical forms)
  // Pattern: [adjective] + [noun] + quoted title
  // Examples:
  // - θεατρικής Παράστασης «...»
  // - κινηματογραφικής Ταινίας "..."
  // - διαφημιστικής Καμπάνιας '...'
  
  // Greek work type patterns (with optional adjectives)
  const titleTriggers = [
    // Theatre patterns
    /θεατρικής\s+Παράστασ(ης|η|εις|εων)?/gi,
    /θεατρικό\s+Έργο/gi,
    /παράσταση/gi,
    // Film patterns
    /κινηματογραφικής\s+Ταινίας?/gi,
    /κινηματογραφικό\s+Έργο/gi,
    /ταινίας?/gi,
    /μικρού\s+μήκους/gi,
    // Ad patterns
    /διαφημιστικής\s+Καμπάνιας?/gi,
    /διαφήμισης?/gi,
    /σποτ/gi,
    // Generic
    /έργου/gi,
  ];
  
  // Quoted title patterns: «...», "...", '...'
  const quotedTitlePatterns = [
    /«[^»]+»/g,  // Greek quotes «...»
    /"[^"]+"/g,  // Double quotes "..."
    /'[^']+'/g,  // Single quotes '...'
  ];
  
  // For each trigger, find quoted titles that follow it (within reasonable distance)
  for (const trigger of titleTriggers) {
    let match;
    while ((match = trigger.exec(redacted)) !== null) {
      const triggerEnd = match.index + match[0].length;
      // Look for quoted title within 200 characters after trigger
      const searchStart = triggerEnd;
      const searchEnd = Math.min(redacted.length, searchStart + 200);
      const searchText = redacted.substring(searchStart, searchEnd);
      
      // Find first quoted title after trigger
      for (const quotePattern of quotedTitlePatterns) {
        quotePattern.lastIndex = 0;
        const quoteMatch = quotePattern.exec(searchText);
        if (quoteMatch) {
          const titleStart = searchStart + quoteMatch.index;
          const titleEnd = titleStart + quoteMatch[0].length;
          // Replace quoted title with MERGED_MASK
          redacted = redacted.slice(0, titleStart) + MERGED_MASK + redacted.slice(titleEnd);
          // Reset trigger regex to continue searching
          trigger.lastIndex = 0;
          break;
        }
      }
    }
  }
  
  return redacted;
}

/**
 * Redacts performance venues and locations
 * Detects venue names after labels or as standalone ALL CAPS words
 * 
 * @param text - Text that may contain venue names
 * @returns Text with venue names replaced by MERGED_MASK
 */
function redactVenues(text: string): string {
  let redacted = text;
  
  // Venue label patterns (Greek and English)
  const venueLabels = [
    /Χώρος\s*:/gi,
    /Θέατρο\s*:/gi,
    /Venue\s*:/gi,
    /Location\s*:/gi,
    /Σκηνή\s*:/gi,
    /Theatre\s*:/gi,
    /Cinema\s*:/gi,
  ];
  
  // First, redact venues after labels
  for (const labelPattern of venueLabels) {
    let match;
    // Reset regex for each label pattern
    labelPattern.lastIndex = 0;
    while ((match = labelPattern.exec(redacted)) !== null) {
      const labelEnd = match.index + match[0].length;
      // Look for venue name within 100 characters after label
      const searchStart = labelEnd;
      const searchEnd = Math.min(redacted.length, searchStart + 100);
      const searchText = redacted.substring(searchStart, searchEnd);
      
      // Match venue name (ALL CAPS Latin, 4-40 chars, possibly with spaces)
      // Pattern: optional whitespace + venue name (ALL CAPS, 4-40 chars, may have spaces)
      const venueAfterLabelPattern = /(\s*)([A-Z][A-Z\s]{3,39})\b/;
      const venueMatch = venueAfterLabelPattern.exec(searchText);
      
      if (venueMatch) {
        const venueText = venueMatch[2].trim();
        // Skip if it looks like a date, percentage, or number
        if (
          !/^\d{4}$/.test(venueText) &&
          !/%/.test(venueText) &&
          !/^\d+$/.test(venueText) &&
          /^[A-Z\s]+$/.test(venueText) && // Only ALL CAPS Latin
          venueText.length >= 4 &&
          venueText.length <= 40
        ) {
          const venueStart = searchStart + venueMatch.index + venueMatch[1].length; // Start after whitespace
          const venueEnd = venueStart + venueMatch[2].length; // End of venue name only
          // Preserve the whitespace, only replace the venue name
          redacted = redacted.slice(0, venueStart) + MERGED_MASK + redacted.slice(venueEnd);
          // Reset label regex to continue searching from beginning
          labelPattern.lastIndex = 0;
          break; // Process one venue per label occurrence
        }
      }
    }
  }
  
  // Second, redact standalone ALL CAPS venue names (not after labels, not dates/percentages)
  // Pattern: word boundary + ALL CAPS (4-40 chars, may have spaces) + word boundary
  const allCapsVenuePattern = /\b([A-Z][A-Z\s]{3,39})\b/g;
  const matches: Array<{ index: number; text: string; length: number }> = [];
  
  // Collect all potential matches first (to avoid index shifting issues)
  let allCapsMatch;
  allCapsVenuePattern.lastIndex = 0;
  while ((allCapsMatch = allCapsVenuePattern.exec(redacted)) !== null) {
    const venueText = allCapsMatch[1].trim();
    const beforeContext = redacted.substring(Math.max(0, allCapsMatch.index - 30), allCapsMatch.index);
    const isAfterLabel = /(?:Χώρος|Θέατρο|Venue|Location|Σκηνή|Theatre|Cinema)\s*:\s*$/i.test(beforeContext);
    
    // Skip if already redacted
    if (redacted.substring(allCapsMatch.index, allCapsMatch.index + allCapsMatch[0].length).includes(MERGED_MASK)) {
      continue;
    }
    
    if (
      !isAfterLabel &&
      !/^\d{4}$/.test(venueText) &&
      !/%/.test(venueText) &&
      !/^\d+$/.test(venueText) &&
      venueText.length >= 4 &&
      venueText.length <= 40 &&
      /^[A-Z\s]+$/.test(venueText) // Only ALL CAPS Latin
    ) {
      matches.push({
        index: allCapsMatch.index,
        text: allCapsMatch[0],
        length: allCapsMatch[0].length,
      });
    }
  }
  
  // Replace matches in reverse order to maintain indices
  matches.sort((a, b) => b.index - a.index);
  for (const match of matches) {
    redacted = redacted.slice(0, match.index) + MERGED_MASK + redacted.slice(match.index + match.length);
  }
  
  return redacted;
}

/**
 * Post-processes redacted text to merge glued placeholders
 * When XXXXXX is adjacent to letters/digits, replace the whole chunk with MERGED_MASK
 * 
 * @param redacted - Text with XXXXXX placeholders
 * @returns Normalized text with glued placeholders merged
 */
function normalizeGluedPlaceholders(redacted: string): string {
  // Token class: Greek, Latin, digits, and common separators
  // Greek: \u0370-\u03FF (Greek and Coptic), \u1F00-\u1FFF (Greek Extended)
  // Latin: A-Za-z
  // Digits: 0-9
  // Separators: _ . -
  // Using regex literals with Unicode ranges directly
  // The 'u' flag enables Unicode property escapes and proper Unicode matching
  
  let normalized = redacted;
  
  // Order matters: middle first (both sides), then prefix (before), then suffix (after)
  // This prevents double-replacement
  
  // Pattern 1: XXXXXX in the middle of a token (letters/digits on both sides)
  // Match: [token chars]XXXXXX[token chars]
  const middlePattern = /[\w\u0370-\u03FF\u1F00-\u1FFF._-]+XXXXXX[\w\u0370-\u03FF\u1F00-\u1FFF._-]+/g;
  normalized = normalized.replace(middlePattern, MERGED_MASK);
  
  // Pattern 2: Letters/digits followed by XXXXXX (prefix)
  // Match: [token chars]XXXXXX
  const prefixPattern = /[\w\u0370-\u03FF\u1F00-\u1FFF._-]+XXXXXX/g;
  normalized = normalized.replace(prefixPattern, MERGED_MASK);
  
  // Pattern 3: XXXXXX followed by letters/digits (suffix)
  // Match: XXXXXX[token chars]
  const suffixPattern = /XXXXXX[\w\u0370-\u03FF\u1F00-\u1FFF._-]+/g;
  normalized = normalized.replace(suffixPattern, MERGED_MASK);
  
  return normalized;
}

/**
 * PRIVACY GUARANTEE:
 * This function replaces all detected sensitive entities with placeholders.
 * The redacted text (with placeholders) is the ONLY text sent over the network.
 * Original text with raw values NEVER leaves the device.
 * 
 * @param text - Original text (never sent over network)
 * @param entities - Detected entities (raw values kept in-memory only)
 * @returns Redacted text with neutral placeholder XXXXXX - this is what gets sent
 */
export function redactText(text: string, entities: DetectedEntity[]): string {
  // STEP 1: Protect labels from redaction
  const { protectedText, labelMap } = protectLabels(text);
  let redacted = protectedText;
  
  // STEP 2: HIGH-PRIORITY: Redact full addresses (street + number) BEFORE entity redaction
  // This ensures entire addresses are redacted, not just numbers
  redacted = redactFullAddresses(redacted);
  
  // STEP 3: HIGH-PRIORITY: Redact quoted company names after legal triggers (before entity redaction)
  // This ensures quoted company names are fully redacted even if partially detected
  redacted = redactQuotedCompanyNames(redacted);
  
  // STEP 3: Process entities in reverse to maintain indices
  // Find entities in protected text by searching for their values
  const sortedEntities = [...entities].sort((a, b) => b.startIndex - a.startIndex);
  
  for (const entity of sortedEntities) {
    const entityValue = text.substring(entity.startIndex, entity.endIndex);
    // Search for entity value in protected text, starting from approximate position
    const searchStart = Math.max(0, entity.startIndex - 200);
    const searchEnd = Math.min(redacted.length, entity.endIndex + 200);
    const searchText = redacted.substring(searchStart, searchEnd);
    const entityIndexInSearch = searchText.indexOf(entityValue);
    
    if (entityIndexInSearch !== -1) {
      const entityStartInProtected = searchStart + entityIndexInSearch;
      const entityEndInProtected = entityStartInProtected + entityValue.length;
      // Replace raw value with neutral placeholder - ONLY placeholders are sent to API
      redacted = redacted.slice(0, entityStartInProtected) + REDACTION_PLACEHOLDER + redacted.slice(entityEndInProtected);
    } else {
      // Fallback: use original indices (may be slightly off if labels were protected, but should be rare)
      redacted = redacted.slice(0, entity.startIndex) + REDACTION_PLACEHOLDER + redacted.slice(entity.endIndex);
    }
  }
  
  // STEP 4: Post-process: collapse adjacent name fragments (after entity redaction, before other post-processing)
  // This fixes cases like "ΕΥΘΥΜΙΟΣ XXXXXXXX" or "του XXXXX του Αγγελου"
  redacted = collapseAdjacentNameFragments(redacted);
  
  // STEP 5: Post-process: redact titles of works (after name fragment collapse)
  redacted = redactTitles(redacted);
  
  // STEP 6: Post-process: redact venues/locations (after title redaction)
  redacted = redactVenues(redacted);
  
  // STEP 7: Post-process: merge glued placeholders (final step)
  redacted = normalizeGluedPlaceholders(redacted);
  
  // STEP 8: Restore protected labels
  redacted = restoreLabels(redacted, labelMap);
  
  return redacted;
}
