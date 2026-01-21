import { ContractTypeId } from '../contractType/contractTypes';
import { CONTRACT_PROFILES, SummaryFieldId } from '../profiles/contractProfiles';

// Declare __DEV__ for TypeScript
declare const __DEV__: boolean | undefined;

type SummaryRecord = Record<SummaryFieldId, string | null>;

const STOPWORDS = new Set([
  'ΚΑΙ', 'Η', 'Ο', 'ΤΟ', 'ΤΗΝ', 'ΤΗΣ', 'ΤΟΥ', 'ΤΟΝ', 'ΣΤΟ', 'ΣΤΗ', 'ΣΤΗΝ', 'ΣΤΟΥ', 'ΣΤΟΥΣ',
  'ΣΕ', 'ΜΕ', 'ΓΙΑ', 'ΑΠΟ', 'ΕΝΑ', 'ΜΙΑ', 'ΤΑ', 'ΤΟΥΣ', 'ΤΙΣ', 'ΚΑΘΕ', 'ΟΠΟΥ', 'ΟΤΙ', 'ΝΑ',
  'THE', 'AND', 'OR', 'TO', 'OF', 'IN', 'ON', 'AT',
]);

const MONTH_TOKENS = [
  'ΙΑΝΟΥΑΡ', 'ΙΑΝ', 'ΦΕΒΡ', 'ΦΕΒ', 'ΜΑΡΤ', 'ΜΑΡ', 'ΑΠΡΙΛ', 'ΑΠΡ', 'ΜΑΙ', 'ΙΟΥΝ', 'ΙΟΥΛ', 'ΑΥΓ',
  'ΣΕΠΤ', 'ΣΕΠ', 'ΟΚΤ', 'ΝΟΕΜ', 'ΝΟΕ', 'ΔΕΚΕΜ', 'ΔΕΚ',
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

const TERRITORY_TOKENS = [
  'ΕΛΛΑΔ', 'ΕΛΛΗΝ', 'GREECE', 'HELLAS', 'ΚΥΠΡ', 'CYPR',
  'ΕΥΡΩΠ', 'EUROPE', 'EU', 'EE',
  'ΠΑΓΚΟΣΜ', 'WORLD', 'GLOBAL', 'INTERNATIONAL',
  'ΠΑΝΕΛΛ', 'ΠΑΝΕΥΡ',
  'USA', 'UNITED STATES', 'AMERICA', 'UK', 'UNITED KINGDOM',
  'ASIA', 'AFRICA', 'MIDDLE EAST', 'MEA',
];

const TV_TOKENS = ['ΤΗΛΕΟΡΑΣ', 'TV', 'TVC', 'ΚΑΝΑΛ'];
const TV_QUALIFIERS = [
  'ΕΘΝΙΚ', 'ΠΕΡΙΦΕΡ', 'ΤΟΠΙΚ', 'ΣΤΑΘΜ', 'CHANNEL', 'BROADCAST', 'NETWORK',
  'ERT', 'MEGA', 'ANT1', 'ALPHA', 'SKAI', 'STAR', 'OPEN',
];
const CHANNEL_NAMES = ['ERT', 'MEGA', 'ANT1', 'ALPHA', 'SKAI', 'STAR', 'OPEN'];

const PAYMENT_KEYWORDS = ['ΑΜΟΙΒ', 'ΠΛΗΡΩ', 'ΚΑΤΑΒΑΛ', 'PAYMENT', 'FEE', 'COMPENSATION'];
const MEDIA_TOKENS = [
  'ΜΕΣΑ', 'ΕΚΜΕΤΑΛΛ', 'ΔΙΑΝΟΜ', 'ΚΙΝΗΜΑΤΟΓ', 'FESTIVAL', 'STREAM', 'VOD', 'PLATFORM', 'TV',
];
const IMAGE_RIGHTS_TOKENS = ['ΔΙΚΑΙΩ', 'RIGHTS'];
const IMAGE_SUBJECT_TOKENS = ['ΕΙΚΟΝ', 'ΦΩΝ', 'IMAGE', 'VOICE'];
const AI_TOKENS = ['AI', 'ΤΕΧΝΗΤ', 'ΝΟΗΜΟΣΥΝ', 'ΨΗΦΙΑΚ', 'DIGITAL', 'DEEPFAKE', 'SYNTHETIC', 'CLONE', 'VOICE'];
const CREDIT_TOKENS = ['CREDIT', 'ΤΙΤΛ', 'ONSCREEN', 'ON SCREEN'];
const TERMINATION_TOKENS = ['ΛΥΣ', 'ΚΑΤΑΓΓ', 'TERMINATION', 'CANCEL'];
const COMPENSATION_TOKENS = ['ΑΠΟΖΗΜ', 'COMPENSATION', 'ΑΠΟΖΗΜΙΩΣ'];
const EXCLUSIVITY_TOKENS = ['ΑΠΟΚΛΕΙΣΤ', 'EXCLUSIV'];
const BUYOUT_TOKENS = ['BUYOUT', 'ΕΦΑΠΑΞ', 'ΕΞΑΓΟΡ'];
const RENEWAL_TOKENS = ['ΑΝΑΝΕΩΣ', 'RENEW'];
const CUTDOWN_TOKENS = ['CUTDOWN', 'CUT', 'EDIT', 'VERSION', 'ΠΑΡΑΛΛΑΓ', 'ΕΚΔΟΧ'];
const APPROVAL_TOKENS = ['ΕΓΚΡΙΣ', 'APPROVAL', 'CONSENT', 'ΣΥΝΑΙΝ'];
const ROLE_TOKENS = ['ΡΟΛ', 'ΧΑΡΑΚΤ', 'ROLE', 'CHARACTER'];
const SHOOT_TOKENS = ['ΓΥΡΙΣΜ', 'SHOOT', 'PRODUCTION'];
const TIME_TOKENS = ['ΔΙΑΡΚ', 'ΠΕΡΙΟΔ', 'TERM', 'MONTH', 'ΜΗΝ', 'ΕΤ', 'ΗΜΕΡ', 'WEEK', 'DAY', 'DATE', 'ΗΜΕΡΟΜ', 'ΑΠΕΡΙΟΡΙΣΤ'];

const MISSING_TEXT_NORMALIZED = 'ΔΕΝ ΠΡΟΚΥΠΤΕΙ ΑΠΟ ΤΟ ΚΕΙΜΕΝΟ';

const EVIDENCE_RULES: Record<string, RegExp[]> = {
  usage_term: [
    /\b(\d{1,2})\s*\(\s*\d{1,2}\s*\)\s*ΜΗΝ/i,
    /\bΜΗΝ(ΕΣ|Α)?\b/i,
    /\b12\b.*\bΜΗΝ/i,
    /ΔΙΑΡΚΕΙΑ/i,
  ],
  territory: [
    /ΕΛΛΗΝΙΚ(Η|ΗΣ)\s+ΕΠΙΚΡΑΤΕΙΑ/i,
    /\bΕΛΛΑΔ(Α|ΟΣ)\b/i,
    /ΕΝΤΟΣ\s+ΕΛΛΑΔ/i,
    /ΣΤΗΝ\s+ΕΛΛΑΔΑ\s+ΚΑΙ\s+ΤΟ\s+ΕΞΩΤΕΡΙΚΟ/i,
    /ΕΛΛΑΔ.{0,40}ΕΞΩΤΕΡΙΚ|ΕΞΩΤΕΡΙΚ.{0,40}ΕΛΛΑΔ/i,
  ],
  shoot_period: [
    /ΤΡΙΩΝ\s*\(\s*3\s*\)\s*ΜΗΝ/i,
    /\b3\b.*\bΜΗΝ/i,
    /ΔΙΑΡΚΕΙΑ\s+ΣΥΜΜΕΤΟΧΗΣ/i,
    /ΓΥΡΙΣΜΑΤ/i,
  ],
  exploitation_media: [
    /ΚΙΝΗΜΑΤΟΓΡΑΦ(ΙΚΕΣ|ΙΚΗ)\s+ΑΙΘΟΥΣ/i,
    /ΦΕΣΤΙΒΑΛ/i,
    /ΚΙΝΗΜΑΤΟΓΡΑΦΙΚ(Η|ΕΣ)\s+ΕΚΜΕΤΑΛΛΕΥΣ/i,
  ],
  media_tv: [
    /ΤΗΛΕΟΡΑΣ/i,
    /ΤΗΛΕΟΠΤΙΚ/i,
    /TV\b/i,
    /ΤΗΛΕΟΠΤΙΚΟ\s+ΣΠΟΤ/i,
  ],
  exclusivity: [
    /ΑΠΟΚΛΕΙΣΤ/i,
    /ΜΗ\s+ΣΥΜΜΕΤΑΣΧ/i,
    /ΑΝΤΑΓΩΝΙΣΤ/i,
  ],
  cutdowns: [
    /CUT\s*VERSIONS/i,
    /ΜΟΝΤΑΖ/i,
    /ΣΥΝΤΟΜΕΥΣ/i,
    /ΤΕΧΝΙΚ(ΕΣ|Η)\s+ΠΡΟΣΑΡΜΟΓ/i,
  ],
  fee_payment: [
    /ΕΝΤΟΣ\s+\d+\s*\(\s*\d+\s*\)\s*ΗΜΕΡ/i,
    /ΚΑΤΑΒΛΗΤΕΑ/i,
    /ΗΜΕΡ(ΩΝ|ΕΣ)/i,
  ],
};

function normalizeEvidenceText(input: string): string {
  return input
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\u0370-\u03FF\u1F00-\u1FFF]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEvidenceTextLoose(input: string): string {
  return input
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeForProximity(input: string): string {
  return input
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\u0370-\u03FF\u1F00-\u1FFF"'\u201C\u201D]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNumbers(input: string): string[] {
  const matches = input.match(/\d+/g) || [];
  return Array.from(new Set(matches));
}

function extractMonthTokens(normalizedValue: string): string[] {
  return MONTH_TOKENS.filter(token => normalizedValue.includes(token));
}

function hasAllNumbersInText(numbers: string[], normalizedText: string): boolean {
  return numbers.every(num => normalizedText.includes(num));
}

function hasAllTokensInText(tokens: string[], normalizedText: string): boolean {
  return tokens.every(token => normalizedText.includes(token));
}

function containsAny(normalizedText: string, tokens: string[]): boolean {
  return tokens.some(token => token.length > 0 && normalizedText.includes(token));
}

function hasAnyEvidence(textUpper: string, rules: RegExp[]): boolean {
  return rules.some(rule => rule.test(textUpper));
}

function extractSignificantTokens(normalizedValue: string): string[] {
  return normalizedValue
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length >= 3 && !STOPWORDS.has(token));
}

function hasValueOverlap(normalizedValue: string, normalizedText: string): boolean {
  const tokens = extractSignificantTokens(normalizedValue);
  if (!tokens.length) {
    return false;
  }
  return tokens.some(token => normalizedText.includes(token));
}

function hasPaymentTermEvidence(normalizedText: string): boolean {
  if (normalizedText.includes('ΠΡΟΘΕΣΜ')) {
    return true;
  }
  return /ΕΝΤΟΣ\s+\d+\s+ΗΜΕΡ/.test(normalizedText);
}

function hasTerritoryEvidence(normalizedText: string, normalizedValue: string): boolean {
  const valueTokens = TERRITORY_TOKENS.filter(token => normalizedValue.includes(token));
  if (valueTokens.length > 0) {
    return valueTokens.some(token => normalizedText.includes(token));
  }
  return containsAny(normalizedText, TERRITORY_TOKENS);
}

function hasTvcDurationEvidence(textUpper: string, value: string): boolean {
  const numbers = extractNumbers(value);
  if (!numbers.length) {
    return false;
  }
  const unitPattern = '(?:\'\'|"|”|SEC|SECS|SECONDS|ΔΕΥΤ)';
  const tvcPattern = '(?:SPOT|TVC|ΔΙΑΦΗΜΙΣΤ)';
  return numbers.some(num => {
    const pattern = new RegExp(`${tvcPattern}.{0,40}\\b${num}\\s*${unitPattern}|\\b${num}\\s*${unitPattern}.{0,40}${tvcPattern}`);
    return pattern.test(textUpper);
  });
}

export function hasTextEvidence(fieldId: SummaryFieldId, value: string, text: string): boolean {
  const normalizedText = normalizeEvidenceText(text);
  const normalizedValue = normalizeEvidenceText(value);
  const evidenceTextUpper = normalizeEvidenceTextLoose(text);

  if (!normalizedText || !normalizedValue) {
    return false;
  }

  const numbers = extractNumbers(value);
  if (numbers.length > 0 && !hasAllNumbersInText(numbers, normalizedText)) {
    return false;
  }

  const months = extractMonthTokens(normalizedValue);
  if (months.length > 0 && !hasAllTokensInText(months, normalizedText)) {
    return false;
  }

  const evidenceRules = EVIDENCE_RULES[fieldId];
  if (evidenceRules && hasAnyEvidence(evidenceTextUpper, evidenceRules)) {
    return true;
  }

  switch (fieldId) {
    case 'tvc_deliverable': {
      const textUpper = normalizeForProximity(text);
      if (!containsAny(textUpper, ['SPOT', 'TVC', 'ΔΙΑΦΗΜΙΣΤ'])) {
        return false;
      }
      if (numbers.length > 0) {
        return hasTvcDurationEvidence(textUpper, value);
      }
      return hasValueOverlap(normalizedValue, normalizedText);
    }
    case 'usage_term': {
      const hasTimeContext = containsAny(normalizedText, TIME_TOKENS) || containsAny(normalizedText, MONTH_TOKENS);
      return hasTimeContext;
    }
    case 'shoot_period': {
      if (!containsAny(normalizedText, SHOOT_TOKENS)) {
        return false;
      }
      const hasTimeContext = containsAny(normalizedText, TIME_TOKENS) || containsAny(normalizedText, MONTH_TOKENS);
      return hasTimeContext;
    }
    case 'fee_payment': {
      if (!containsAny(normalizedText, PAYMENT_KEYWORDS)) {
        return false;
      }
      if (containsAny(normalizedValue, ['ΕΝΤΟΣ', 'ΗΜΕΡ', 'ΠΡΟΘΕΣΜ', 'ΔΟΣ']) && !hasPaymentTermEvidence(normalizedText)) {
        return false;
      }
      if (numbers.length === 0 && !hasValueOverlap(normalizedValue, normalizedText)) {
        return false;
      }
      return true;
    }
    case 'exploitation_media': {
      if (!containsAny(normalizedText, MEDIA_TOKENS)) {
        return false;
      }
      const mediaTokensInValue = MEDIA_TOKENS.filter(token => normalizedValue.includes(token));
      if (mediaTokensInValue.length > 0 && !mediaTokensInValue.some(token => normalizedText.includes(token))) {
        return false;
      }
      return true;
    }
    case 'image_scope': {
      const hasRights = containsAny(normalizedText, IMAGE_RIGHTS_TOKENS);
      const hasSubject = containsAny(normalizedText, IMAGE_SUBJECT_TOKENS);
      return hasRights && hasSubject;
    }
    case 'territory': {
      return hasTerritoryEvidence(normalizedText, normalizedValue);
    }
    case 'ai_usage':
    case 'ai_voice': {
      return containsAny(normalizedText, AI_TOKENS);
    }
    case 'credits': {
      return containsAny(normalizedText, CREDIT_TOKENS);
    }
    case 'termination_compensation': {
      return containsAny(normalizedText, TERMINATION_TOKENS) && containsAny(normalizedText, COMPENSATION_TOKENS);
    }
    case 'media_tv': {
      if (!containsAny(normalizedText, TV_TOKENS)) {
        return false;
      }
      const hasQualifier = containsAny(normalizedText, TV_QUALIFIERS) || CHANNEL_NAMES.some(name => normalizedText.includes(name));
      if (!hasQualifier) {
        return false;
      }
      const valueChannels = CHANNEL_NAMES.filter(token => normalizedValue.includes(token));
      if (valueChannels.length > 0 && !valueChannels.some(token => normalizedText.includes(token))) {
        return false;
      }
      const valueQualifiers = TV_QUALIFIERS.filter(token => normalizedValue.includes(token));
      if (valueQualifiers.length > 0 && !valueQualifiers.some(token => normalizedText.includes(token))) {
        return false;
      }
      return true;
    }
    case 'exclusivity': {
      return containsAny(normalizedText, EXCLUSIVITY_TOKENS);
    }
    case 'buyout_renewals': {
      const hasBuyout = containsAny(normalizedText, BUYOUT_TOKENS);
      const hasRenewal = containsAny(normalizedText, RENEWAL_TOKENS);
      if (!hasBuyout && !hasRenewal) {
        return false;
      }
      if (containsAny(normalizedValue, BUYOUT_TOKENS) && !hasBuyout) {
        return false;
      }
      if (containsAny(normalizedValue, RENEWAL_TOKENS) && !hasRenewal) {
        return false;
      }
      return true;
    }
    case 'cutdowns': {
      return containsAny(normalizedText, CUTDOWN_TOKENS);
    }
    case 'approvals': {
      return containsAny(normalizedText, APPROVAL_TOKENS);
    }
    case 'role': {
      if (!containsAny(normalizedText, ROLE_TOKENS)) {
        return false;
      }
      return hasValueOverlap(normalizedValue, normalizedText);
    }
    default: {
      return hasValueOverlap(normalizedValue, normalizedText);
    }
  }
}

function getFallbackSummaryValue(
  fieldId: SummaryFieldId,
  processedText: string,
  evidenceTextUpper: string
): string | null {
  switch (fieldId) {
    case 'usage_term': {
      const match = processedText.match(/\b\d{1,2}\s*μ[ήη]ν(?:ες|α|ων)?\b/i);
      if (match) {
        return match[0].trim();
      }
      return 'Υπάρχει αναφορά σε διάρκεια';
    }
    case 'territory': {
      if (/ΕΛΛΑΔΑ\s+ΚΑΙ\s+ΤΟ\s+ΕΞΩΤΕΡΙΚΟ/.test(evidenceTextUpper)) {
        return 'Ελλάδα και εξωτερικό';
      }
      if (/ΕΛΛΑΔ.{0,40}ΕΞΩΤΕΡΙΚ|ΕΞΩΤΕΡΙΚ.{0,40}ΕΛΛΑΔ/.test(evidenceTextUpper)) {
        return 'Ελλάδα και εξωτερικό';
      }
      if (/ΕΛΛΗΝΙΚ(Η|ΗΣ)\s+ΕΠΙΚΡΑΤΕΙΑ/.test(evidenceTextUpper)) {
        return 'Ελληνική επικράτεια';
      }
      if (/\bΕΛΛΑΔ(Α|ΟΣ)\b/.test(evidenceTextUpper)) {
        return 'Ελλάδα';
      }
      return 'Υπάρχει αναφορά σε περιοχή χρήσης';
    }
    case 'shoot_period': {
      if (/\b3\b.*\bμ[ήη]ν/i.test(processedText) || /ΤΡΙΩΝ\s*\(\s*3\s*\)\s*ΜΗΝ/i.test(evidenceTextUpper)) {
        return '3 μήνες';
      }
      return 'Υπάρχει αναφορά σε διάρκεια γυρισμάτων';
    }
    case 'exploitation_media': {
      const hasCinema = /ΚΙΝΗΜΑΤΟΓΡΑΦ(ΙΚΕΣ|ΙΚΗ)\s+ΑΙΘΟΥΣ/i.test(evidenceTextUpper)
        || /ΚΙΝΗΜΑΤΟΓΡΑΦΙΚ(Η|ΕΣ)\s+ΕΚΜΕΤΑΛΛΕΥΣ/i.test(evidenceTextUpper);
      const hasFestival = /ΦΕΣΤΙΒΑΛ/i.test(evidenceTextUpper);
      if (hasCinema && hasFestival) {
        return 'Κινηματογραφικές αίθουσες / Φεστιβάλ';
      }
      if (hasCinema) {
        return 'Κινηματογραφικές αίθουσες';
      }
      if (hasFestival) {
        return 'Φεστιβάλ';
      }
      return 'Υπάρχει αναφορά σε μέσα εκμετάλλευσης';
    }
    case 'media_tv': {
      if (/ΤΗΛΕΟΡΑΣ|ΤΗΛΕΟΠΤΙΚ|TV\b/.test(evidenceTextUpper)) {
        return 'Τηλεόραση';
      }
      return 'Υπάρχει αναφορά σε τηλεοπτικά μέσα';
    }
    case 'exclusivity': {
      return 'Υπάρχει αναφορά σε αποκλειστικότητα';
    }
    case 'cutdowns': {
      return 'Υπάρχει αναφορά σε cutdowns/μοντάζ';
    }
    case 'fee_payment': {
      const match = processedText.match(/εντός\s+\d+\s*(?:\(\s*\d+\s*\)\s*)?ημε\w*/i);
      if (match) {
        return match[0].trim();
      }
      return 'Υπάρχει αναφορά σε χρόνο πληρωμής';
    }
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function buildStrictSummary(
  contractTypeId: ContractTypeId,
  modelSummary: Record<string, unknown> | null | undefined,
  processedText: string
): SummaryRecord {
  const profile = CONTRACT_PROFILES[contractTypeId];
  const summaryFields = profile.summaryFields.filter(field => field.showFor.includes(contractTypeId));
  const allowedIds = new Set(summaryFields.map(field => field.id));

  const summary: SummaryRecord = {};
  summaryFields.forEach(field => {
    summary[field.id] = null;
  });

  const inputSummary = isRecord(modelSummary) ? modelSummary : {};
  const evidenceTextUpper = normalizeEvidenceTextLoose(processedText);

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    Object.keys(inputSummary)
      .filter(key => !allowedIds.has(key))
      .forEach(key => {
        console.log('[Summary Evidence] Rejected unknown key', { key });
      });
  }

  summaryFields.forEach(field => {
    const rawValue = inputSummary[field.id];
    const evidenceRules = EVIDENCE_RULES[field.id];
    const hasRuleMatch = evidenceRules ? hasAnyEvidence(evidenceTextUpper, evidenceRules) : false;
    const applyFallbackIfAvailable = () => {
      if (!hasRuleMatch) {
        return false;
      }
      const fallbackValue = getFallbackSummaryValue(field.id, processedText, evidenceTextUpper);
      if (!fallbackValue) {
        return false;
      }
      summary[field.id] = fallbackValue;
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[Summary Evidence] Accepted', { fieldId: field.id, reason: 'rule-match-fallback' });
      }
      return true;
    };

    if (typeof rawValue !== 'string') {
      if (applyFallbackIfAvailable()) {
        return;
      }
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[Summary Evidence] Rejected', { fieldId: field.id, reason: 'empty' });
      }
      return;
    }
    const trimmed = rawValue.trim();
    if (!trimmed) {
      if (applyFallbackIfAvailable()) {
        return;
      }
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[Summary Evidence] Rejected', { fieldId: field.id, reason: 'empty' });
      }
      return;
    }
    const normalizedValue = normalizeEvidenceText(trimmed);
    if (normalizedValue === MISSING_TEXT_NORMALIZED) {
      if (applyFallbackIfAvailable()) {
        return;
      }
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[Summary Evidence] Rejected', { fieldId: field.id, reason: 'missing_value' });
      }
      return;
    }

    const accepted = hasTextEvidence(field.id, trimmed, processedText);
    if (!accepted) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[Summary Evidence] Rejected', { fieldId: field.id, reason: 'no_evidence' });
      }
      return;
    }

    summary[field.id] = trimmed;
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[Summary Evidence] Accepted', { fieldId: field.id, reason: hasRuleMatch ? 'rule-match' : 'strict' });
    }
  });

  return summary;
}
