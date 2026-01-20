/**
 * Smart Preamble Skipping
 * 
 * Removes identity-heavy preamble (names/addresses/titles) and starts analysis
 * from the first real TERMS section across many Greek contract formats.
 */

// Declare __DEV__ for TypeScript
declare const __DEV__: boolean | undefined;

export interface SkipPreambleResult {
  text: string;
  skipped: boolean;
  startReason?: string;
}

// Negative headings (identity/preamble zone) - skip past these
const NEGATIVE_HEADINGS = [
  'ΣΥΜΒΑΛΛΟΜΕΝΑ ΜΕΡΗ',
  'ΣΥΜΒΑΛΛΟΜΕΝΟΙ',
  'ΜΕΤΑΞΥ ΤΩΝ ΚΑΤΩΘΙ ΣΥΜΒΑΛΛΟΜΕΝΩΝ',
  'ΙΔΙΩΤΙΚΟ ΣΥΜΦΩΝΗΤΙΚΟ',
  'ΕΙΣΑΓΩΓΙΚΑ',
  'ΕΙΣΑΓΩΓΗ',
  'ΠΡΟΟΙΜΙΟ',
  'ΠΡΟΟΙΜΙΟ – ΔΗΛΩΣΕΙΣ',
  'ΔΗΛΩΣΕΙΣ ΚΑΙ ΒΕΒΑΙΩΣΕΙΣ ΤΩΝ ΜΕΡΩΝ',
  'ΟΡΙΣΜΟΙ',
  'ΥΠΟΓΡΑΦΕΣ',
];

// Core start headings (high confidence - terms zone)
const CORE_START_HEADINGS = [
  'ΣΚΟΠΟΣ ΤΗΣ ΣΥΜΒΑΣΗΣ',
  'ΑΝΤΙΚΕΙΜΕΝΟ ΤΟΥ ΣΥΜΦΩΝΗΤΙΚΟΥ',
  'ΑΝΤΙΚΕΙΜΕΝΟ',
  'ΕΙΔΙΚΟΙ ΟΡΟΙ',
  'ΟΡΟΙ ΚΑΙ ΠΡΟΫΠΟΘΕΣΕΙΣ',
  'ΥΠΟΧΡΕΩΣΕΙΣ ΤΩΝ ΜΕΡΩΝ',
  'ΔΙΚΑΙΩΜΑΤΑ ΤΩΝ ΜΕΡΩΝ',
  'ΑΝΤΙΠΑΡΟΧΗ',
  'ΑΜΟΙΒΗ',
  'ΑΝΤΙΠΑΡΟΧΗ / ΑΜΟΙΒΗ',
  'ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ',
  'ΔΙΑΡΚΕΙΑ',
  'ΛΥΣΗ',
  'ΚΑΤΑΓΓΕΛΙΑ',
  'ΤΡΟΠΟΠΟΙΗΣΗ ΣΥΜΒΑΣΗΣ',
  'ΕΥΘΥΝΗ',
  'ΠΕΡΙΟΡΙΣΜΟΣ ΕΥΘΥΝΗΣ',
  'ΑΝΩΤΕΡΑ ΒΙΑ',
  'ΕΜΠΙΣΤΕΥΤΙΚΟΤΗΤΑ',
  'ΠΡΟΣΤΑΣΙΑ ΔΕΔΟΜΕΝΩΝ',
  'ΕΚΧΩΡΗΣΗ',
  'ΥΠΕΡΓΟΛΑΒΙΑ',
  'ΤΡΙΤΟΙ',
  'ΜΗ ΑΝΤΑΓΩΝΙΣΜΟΣ',
  'ΡΗΤΡΕΣ',
  'ΠΟΙΝΙΚΗ ΡΗΤΡΑ',
  'ΤΕΛΙΚΕΣ ΔΙΑΤΑΞΕΙΣ',
  'ΛΟΙΠΟΙ ΟΡΟΙ',
  'ΔΙΑΦΟΡΕΣ',
  'ΕΦΑΡΜΟΣΤΕΟ ΔΙΚΑΙΟ',
  'ΑΡΜΟΔΙΟΤΗΤΑ ΔΙΚΑΣΤΗΡΙΩΝ',
  'ΟΛΟΚΛΗΡΗ Η ΣΥΜΒΑΣΗ',
  'ΑΚΥΡΟΤΗΤΑ ΟΡΟΥ',
  'ΠΑΡΑΙΤΗΣΗ ΔΙΚΑΙΩΜΑΤΩΝ',
  'ΕΙΔΟΠΟΙΗΣΕΙΣ',
];

// Semantic anchors (mid confidence, for contracts without headings)
const SEMANTIC_ANCHORS = [
  'ΟΙ ΣΥΜΒΑΛΛΟΜΕΝΟΙ ΣΥΜΦΩΝΟΥΝ',
  'ΣΥΜΦΩΝΟΥΝ ΚΑΙ ΣΥΝΟΜΟΛΟΓΟΥΝ',
  'Η ΠΑΡΟΥΣΑ ΣΥΜΒΑΣΗ',
  'ΑΝΤΙΚΕΙΜΕΝΟ ΤΗΣ ΠΑΡΟΥΣΑΣ',
  'Η ΑΜΟΙΒΗ',
  'Η ΔΙΑΡΚΕΙΑ',
  'ΤΑ ΔΙΚΑΙΩΜΑΤΑ',
  'ΟΙ ΥΠΟΧΡΕΩΣΕΙΣ',
  'ΟΙ ΥΠΟΧΡΡΕΩΣΕΙΣ', // common misspacing
];

// Greek number words
const GREEK_NUMBER_WORDS = [
  'ΠΡΩΤΟ', 'ΔΕΥΤΕΡΟ', 'ΤΡΙΤΟ', 'ΤΕΤΑΡΤΟ', 'ΠΕΜΠΤΟ',
  'ΕΚΤΟ', 'ΕΒΔΟΜΟ', 'ΟΓΔΟΟ', 'ΕΝΑΤΟ', 'ΔΕΚΑΤΟ',
];

// Numbering patterns (as regex strings for dynamic compilation)
const NUMBERING_PATTERNS: Array<RegExp> = [
  /^ΑΡΘΡΟ\s+\d+/i, // Άρθρο 1
  new RegExp(`^ΑΡΘΡΟ\\s+(${GREEK_NUMBER_WORDS.join('|')})`, 'i'), // Άρθρο Πρώτο
  /^[IVX]+\.?-?\s*/i, // I, II, III, IV with optional . or .-
  /^\d+\.-?\s*/, // 1., 1.-
  /^\d+\.\d+\.?\d*\.?\s*/, // 1.1, 1.2.1
  /^[Α-Ω]\.\s*/, // Α., Β.
  /^[α-ω]\)\s*/, // α), β)
  /^\([ivx]+\)\s*/i, // (i), (ii)
];

/**
 * Normalizes text for matching (uppercase, collapse whitespace, keep newlines)
 */
function normalizeForMatch(text: string): string {
  return text
    .toUpperCase()
    .replace(/[ \t]+/g, ' ') // Collapse spaces/tabs to single space
    .trim();
}

/**
 * Checks if a normalized line matches a heading, accounting for numbering prefixes
 */
function isHeadingLine(lineNorm: string, heading: string): boolean {
  // Exact match
  if (lineNorm.trim() === heading) {
    return true;
  }
  
  // Check if line contains the heading after a numbering prefix
  for (const pattern of NUMBERING_PATTERNS) {
    const match = lineNorm.match(pattern);
    if (match) {
      const afterPrefix = lineNorm.substring(match[0].length).trim();
      // Check if remaining text matches heading (with optional separator like "–", ":", "-")
      const headingPattern = new RegExp(`^[-–:]?\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'i');
      if (headingPattern.test(afterPrefix)) {
        return true;
      }
      // Also check if heading is contained in remaining text (as whole word/phrase)
      const headingWords = heading.split(/\s+/);
      if (headingWords.length > 0 && afterPrefix.includes(heading)) {
        // Verify it's not just a partial match
        const headingIndex = afterPrefix.indexOf(heading);
        const before = headingIndex > 0 ? afterPrefix[headingIndex - 1] : ' ';
        const after = headingIndex + heading.length < afterPrefix.length 
          ? afterPrefix[headingIndex + heading.length] 
          : ' ';
        // Should be surrounded by spaces/punctuation or at start/end
        if (/[\s\-–:]/.test(before) && /[\s\-–:.,;!?]/.test(after)) {
          return true;
        }
      }
    }
  }
  
  // Check if line contains heading with optional separator (not after numbering)
  const headingPattern = new RegExp(`(?:^|\\s)[-–:]?\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'i');
  if (headingPattern.test(lineNorm)) {
    return true;
  }
  
  return false;
}

/**
 * Checks if a line contains any semantic anchor phrase
 */
function containsSemanticAnchor(lineNorm: string): boolean {
  return SEMANTIC_ANCHORS.some(anchor => lineNorm.includes(anchor));
}

/**
 * Smart preamble skipping - removes identity-heavy preamble and starts from terms
 */
export function smartSkipPreamble(text: string): SkipPreambleResult {
  if (!text || text.trim().length === 0) {
    return { text, skipped: false };
  }
  
  // Split text into lines with original indices
  const lines: Array<{ text: string; originalIndex: number; normalized: string }> = [];
  const lineEndings = text.split(/\r?\n/);
  let currentIndex = 0;
  
  for (let i = 0; i < lineEndings.length; i++) {
    const lineText = lineEndings[i];
    const normalized = normalizeForMatch(lineText);
    lines.push({
      text: lineText,
      originalIndex: currentIndex,
      normalized,
    });
    // Move to next line start (current line + newline char(s))
    currentIndex += lineText.length;
    // Check if there's a newline after this line
    if (currentIndex < text.length) {
      if (text[currentIndex] === '\r' && currentIndex + 1 < text.length && text[currentIndex + 1] === '\n') {
        currentIndex += 2; // \r\n
      } else if (text[currentIndex] === '\n') {
        currentIndex += 1; // \n
      }
    }
  }
  
  // Find best start candidate
  let bestCandidate: { index: number; score: number; reason: string } | null = null;
  let seenNegativeHeading = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines
    if (!line.normalized.trim()) {
      continue;
    }
    
    // Check for negative headings (preamble indicators)
    const isNegativeHeading = NEGATIVE_HEADINGS.some(heading => 
      isHeadingLine(line.normalized, heading)
    );
    
    if (isNegativeHeading) {
      seenNegativeHeading = true;
      // Never start on a negative heading line
      continue;
    }
    
    // Check for core start headings (score 3)
    for (const heading of CORE_START_HEADINGS) {
      if (isHeadingLine(line.normalized, heading)) {
        // Prefer if we've seen negative headings (means we're leaving preamble)
        const score = seenNegativeHeading ? 3 : 2.5;
        if (!bestCandidate || score > bestCandidate.score) {
          bestCandidate = {
            index: line.originalIndex,
            score,
            reason: `Found heading: ${heading}`,
          };
        }
        break; // Found a match, no need to check other headings
      }
    }
    
    // Check for semantic anchors (score 2) - only if no core heading found yet
    if (!bestCandidate || bestCandidate.score < 3) {
      if (containsSemanticAnchor(line.normalized)) {
        const score = seenNegativeHeading ? 2 : 1.5;
        if (!bestCandidate || score > bestCandidate.score) {
          bestCandidate = {
            index: line.originalIndex,
            score,
            reason: 'Found semantic anchor',
          };
        }
      }
    }
  }
  
  // Apply cut if candidate found
  if (bestCandidate && bestCandidate.score >= 2) {
    const cutText = text.substring(bestCandidate.index);
    const preambleNote = '[ΑΦΑΙΡΕΘΗΚΕ ΤΜΗΜΑ ΤΑΥΤΟΠΟΙΗΣΗΣ – ΑΚΟΛΟΥΘΟΥΝ ΟΙ ΟΡΟΙ ΤΗΣ ΣΥΜΒΑΣΗΣ]\n\n';
    const resultText = preambleNote + cutText;
    
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[Smart Preamble Skip]', {
        skipped: true,
        startReason: bestCandidate.reason,
        originalLength: text.length,
        resultLength: resultText.length,
        skippedChars: bestCandidate.index,
      });
    }
    
    return {
      text: resultText,
      skipped: true,
      startReason: bestCandidate.reason,
    };
  }
  
  // No reliable anchor found - return original text
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[Smart Preamble Skip]', {
      skipped: false,
      reason: 'No reliable anchor found',
    });
  }
  
  return {
    text,
    skipped: false,
  };
}
