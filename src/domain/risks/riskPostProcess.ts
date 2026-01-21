import { ContractTypeId } from '../contractType/contractTypes';
import { Severity } from '../analysis/analysisSchema';
import { RiskId } from './riskMetadata';

// Declare __DEV__ for TypeScript
declare const __DEV__: boolean | undefined;

type RiskItem = {
  id: RiskId;
  severity: Severity;
  title: string;
  why?: string;
  clauseRef?: string;
};

type PostProcessArgs = {
  contractTypeId: ContractTypeId;
  processedText: string;
  risks: RiskItem[];
};

const EXCLUSIVITY_EVIDENCE = [
  /ΑΠΟΚΛΕΙΣΤ/i,
  /ΜΗ\s+ΣΥΜΜΕΤΑΣΧ/i,
  /ΑΝΤΑΓΩΝΙΣΤ/i,
];
const CUTDOWNS_EVIDENCE = [
  /CUT\s*VERSIONS/i,
  /CUTDOWNS?/i,
  /ΜΟΝΤΑΖ/i,
  /ΣΥΝΤΟΜΕΥΣ/i,
  /ΤΕΧΝΙΚ(ΕΣ|Η)\s+ΠΡΟΣΑΡΜΟΓ/i,
  /EDIT/i,
];
const TERMINATION_EVIDENCE = [
  /ΛΥΣΗ\s+ΤΗΣ\s+ΣΥΜΒΑΣΗΣ/i,
  /ΚΑΤΑΓΓΕΛ/i,
  /ΑΝΩΤΕΡΑ\s+ΒΙΑ/i,
  /ΧΩΡΙΣ\s+ΠΕΡΑΙΤΕΡΩ\s+ΑΞΙΩΣ/i,
];
const IMAGE_RIGHTS_EVIDENCE = [
  /ΔΙΚΑΙΩΜΑ\s+ΧΡΗΣΗΣ/i,
  /ΕΙΚΟΝ(Α|ΑΣ)/i,
  /ΦΩΝ(Η|ΗΣ)/i,
];
const AI_EVIDENCE = [
  /(^|\s)AI(\s|$)/i,
  /ΨΗΦΙΑΚ(Ο|Η)\s+ΑΝΤΙΓΡΑΦ/i,
  /VOICE\s+CLON/i,
  /DIGITAL\s+DOUBLE/i,
];
const BUYOUT_ONLY_EVIDENCE = [
  /BUYOUT/i,
  /ΑΓΟΡΑ\s+ΔΙΚΑΙΩΜ/i,
  /ΕΦΑΠΑΞ/i,
  /ΕΞΑΓΟΡ/i,
];
const RENEWAL_EVIDENCE = [
  /ΑΝΑΝΕΩΣ/i,
  /ΠΑΡΑΤΑΣ/i,
];
const BUYOUT_EVIDENCE = [...BUYOUT_ONLY_EVIDENCE, ...RENEWAL_EVIDENCE];
const VOICE_CLONING_EVIDENCE = [
  /VOICE\s+CLON/i,
  /CLONING/i,
  /CLONE/i,
  /ΚΛΩΝ/i,
];

const RISK_EVIDENCE_BY_ID: Record<string, RegExp[]> = {
  exclusivity: EXCLUSIVITY_EVIDENCE,
  termination: TERMINATION_EVIDENCE,
  cut_versions_reuse: CUTDOWNS_EVIDENCE,
};

const UNLIMITED_KEYWORDS = [
  'ΑΠΕΡΙΟΡΙΣΤ',
  'ΑΙΩΝΙ',
  'ΠΑΓΚΟΣΜ',
  'ΓΙΑ ΚΑΘΕ ΜΕΣΟ',
  'ANY MEDIA',
  'ALL MEDIA',
  'ΜΕΤΑΒΙΒΑΖ',
  'ΕΚΧΩΡ',
];

const STREAMING_KEYWORDS = [
  'STREAM',
  'VOD',
  'PLATFORM',
  'PR',
  'ΔΙΑΔΙΚΤΥ',
  'INTERNET',
  'SOCIAL',
  'ΠΡΟΩΘ',
  'ΔΙΑΦΗΜ',
];

const LIMITED_SCOPE_KEYWORDS = [
  'ΜΟΝΟ',
  'ΑΠΟΚΛΕΙΣΤΙΚ',
  'ΣΤΟ ΕΡΓΟ',
  'ΣΤΗΝ ΤΑΙΝΙΑ',
  'ΣΤΗ ΣΕΙΡΑ',
  'ΓΙΑ ΤΗΝ ΠΑΡΑΓΩΓΗ',
];

const COMPENSATION_KEYWORDS = ['ΑΜΟΙΒ', 'ΑΝΤΙΤΙΜ', 'ΑΠΟΖΗΜ', 'ΑΝΤΑΛΛΑΓ'];

function normalizeText(input: string): string {
  return input
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\u0370-\u03FF\u1F00-\u1FFF]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(text: string, tokens: string[]): boolean {
  return tokens.some(token => token.length > 0 && text.includes(token));
}

function includesAll(text: string, tokens: string[]): boolean {
  return tokens.every(token => token.length > 0 && text.includes(token));
}

function hasAny(text: string, patterns: Array<string | RegExp>): boolean {
  return patterns.some(pattern => (
    typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text)
  ));
}

function hasEvidenceForRiskId(riskId: string, textUpper: string): boolean {
  const rules = RISK_EVIDENCE_BY_ID[riskId];
  if (!rules) {
    return true;
  }
  return rules.some(rule => rule.test(textUpper));
}

const SEVERITY_ORDER: Severity[] = ['moderate', 'important', 'critical'];

function clampSeverity(original: Severity, proposed: Severity): Severity {
  const originalIndex = SEVERITY_ORDER.indexOf(original);
  const proposedIndex = SEVERITY_ORDER.indexOf(proposed);
  if (originalIndex === -1 || proposedIndex === -1) {
    return original;
  }
  return proposedIndex > originalIndex ? original : proposed;
}

function hasDurationAtLeastMonths(text: string, months: number): boolean {
  const monthMatches = text.match(/(\d{1,2})\s*(ΜΗΝ|ΜΗΝΕΣ|MONTH|MONTHS)/g) || [];
  for (const match of monthMatches) {
    const numberMatch = match.match(/\d{1,2}/);
    if (numberMatch && Number(numberMatch[0]) >= months) {
      return true;
    }
  }
  if (text.includes('ΕΤΗ') || text.includes('ΕΤΟΣ') || text.includes('ΧΡΟΝ') || text.includes('YEAR')) {
    return true;
  }
  return false;
}

function logDrop(id: RiskId, reason: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[Risk PostProcess] Dropped', { id, reason });
  }
}

function logKeep(id: RiskId, reason: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[Risk PostProcess] Kept', { id, reason });
  }
}

function logSeverity(id: RiskId, from: Severity, to: Severity, reason: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && from !== to) {
    console.log('[Risk PostProcess] Severity changed', { id, from, to, reason });
  }
}

function resolveBuyout(text: string, severity: Severity): { include: boolean; severity: Severity; reason: string } {
  const hasEvidence = hasAny(text, BUYOUT_EVIDENCE);
  if (!hasEvidence) {
    return { include: false, severity, reason: 'no-evidence' };
  }
  const hasBuyout = hasAny(text, BUYOUT_ONLY_EVIDENCE);
  const hasRenewal = hasAny(text, RENEWAL_EVIDENCE);
  const criticalTerms = [
    'ΧΩΡΙΣ ΠΡΟΣΘΕΤΗ ΑΜΟΙΒ',
    'ΧΩΡΙΣ ΕΠΙΠΛΕΟΝ ΑΜΟΙΒ',
    'ΓΙΑ ΚΑΘΕ ΧΡΗΣ',
    'ΑΠΕΡΙΟΡΙΣΤ',
  ];
  let nextSeverity: Severity = hasRenewal && !hasBuyout ? 'moderate' : 'important';
  if (includesAny(text, criticalTerms) && hasBuyout) {
    nextSeverity = 'critical';
  }
  return { include: true, severity: nextSeverity, reason: 'evidence-match' };
}

function resolveCutdowns(text: string, severity: Severity): { include: boolean; severity: Severity; reason: string } {
  if (!hasAny(text, CUTDOWNS_EVIDENCE)) {
    return { include: false, severity, reason: 'no-evidence' };
  }
  const withoutApproval = text.includes('ΧΩΡΙΣ ΕΓΚΡΙΣ') || text.includes('ΧΩΡΙΣ ΣΥΝΑΙΝ');
  const nextSeverity = withoutApproval ? 'important' : 'moderate';
  return { include: true, severity: nextSeverity, reason: 'evidence-match' };
}

function resolveAi(text: string, severity: Severity): { include: boolean; severity: Severity; reason: string } {
  if (!hasAny(text, AI_EVIDENCE)) {
    return { include: false, severity, reason: 'no-evidence' };
  }
  const explicitProhibition = text.includes('ΑΠΑΓΟΡΕΥΕΤ') || text.includes('ΔΕΝ ΕΠΙΤΡΕΠ');
  if (explicitProhibition) {
    return { include: false, severity, reason: 'ai_explicitly_prohibited' };
  }
  const hasWrittenConsent = (text.includes('ΣΥΝΑΙΝ') || text.includes('ΑΔΕΙΑ')) && (text.includes('ΓΡΑΠΤ') || text.includes('ΕΓΓΡΑΦ'));
  const withoutConsent = text.includes('ΧΩΡΙΣ ΣΥΝΑΙΝ');
  const broadLicense = includesAny(text, UNLIMITED_KEYWORDS) || text.includes('ΟΠΟΙΟΔΗΠΟΤ');
  if (withoutConsent || broadLicense) {
    return { include: true, severity: 'critical', reason: 'evidence-match' };
  }
  const hasCompensation = includesAny(text, COMPENSATION_KEYWORDS);
  if (hasWrittenConsent) {
    return { include: true, severity: 'moderate', reason: 'evidence-match' };
  }
  if (!hasCompensation) {
    return { include: true, severity: 'important', reason: 'evidence-match' };
  }
  return { include: true, severity: 'moderate', reason: 'evidence-match' };
}

function resolveVoiceCloning(text: string, severity: Severity): { include: boolean; severity: Severity; reason: string } {
  if (!hasAny(text, VOICE_CLONING_EVIDENCE)) {
    return { include: false, severity, reason: 'no-evidence' };
  }
  const withoutConsent = text.includes('ΧΩΡΙΣ ΣΥΝΑΙΝ');
  const nextSeverity = withoutConsent ? 'important' : 'moderate';
  return { include: true, severity: nextSeverity, reason: 'evidence-match' };
}

function resolveExclusivity(text: string, severity: Severity): { include: boolean; severity: Severity; reason: string } {
  if (!hasAny(text, EXCLUSIVITY_EVIDENCE)) {
    return { include: false, severity, reason: 'no-evidence' };
  }
  const broadCategory = text.includes('ΟΠΟΙΟΔΗΠΟΤ') || text.includes('ΟΠΟΙΟΝΔΗΠΟΤ') || text.includes('ANY CATEGORY');
  const longDuration = hasDurationAtLeastMonths(text, 12);
  const nextSeverity = (broadCategory || longDuration) ? 'critical' : 'important';
  return { include: true, severity: nextSeverity, reason: 'evidence-match' };
}

function resolveImageRights(text: string, severity: Severity): { include: boolean; severity: Severity; reason: string } {
  if (!hasAny(text, IMAGE_RIGHTS_EVIDENCE)) {
    return { include: false, severity, reason: 'no-evidence' };
  }
  if (includesAny(text, UNLIMITED_KEYWORDS) || text.includes('ΠΑΝΤΟΣ ΧΡΟΝΟΥ')) {
    return { include: true, severity: 'critical', reason: 'evidence-match' };
  }
  const limitedScope = includesAny(text, LIMITED_SCOPE_KEYWORDS);
  if (limitedScope) {
    return { include: true, severity: 'moderate', reason: 'evidence-match' };
  }
  if (includesAny(text, STREAMING_KEYWORDS)) {
    return { include: true, severity: 'important', reason: 'evidence-match' };
  }
  return { include: true, severity: 'moderate', reason: 'evidence-match' };
}

function resolveTermination(text: string, severity: Severity): { include: boolean; severity: Severity; reason: string } {
  if (!hasAny(text, TERMINATION_EVIDENCE)) {
    return { include: false, severity, reason: 'no-evidence' };
  }
  const withoutCompensation = text.includes('ΧΩΡΙΣ ΑΠΟΖΗΜ') || text.includes('ΑΖΗΜΙΩΣ') || text.includes('ΧΩΡΙΣ ΠΕΡΑΙΤΕΡΩ ΑΞΙΩΣ');
  const critical = text.includes('ΟΠΟΙΟΔΗΠΟΤ') || text.includes('ΑΝΑΙΤΙΩΣ') || text.includes('ΧΩΡΙΣ ΠΡΟΕΙΔΟΠΟΙ');
  const nextSeverity = critical || withoutCompensation ? 'important' : 'moderate';
  return { include: true, severity: nextSeverity, reason: 'evidence-match' };
}

export function postProcessRisks(args: PostProcessArgs): RiskItem[] {
  const { contractTypeId, processedText, risks } = args;
  const textUpper = (processedText || '').toUpperCase();
  const normalizedText = normalizeText(textUpper);

  if (!normalizedText) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[Risk PostProcess] Dropped all risks due to empty processed text');
    }
    return [];
  }

  const result: RiskItem[] = [];

  for (const risk of risks) {
    const originalSeverity = risk.severity;
    let include = true;
    let nextSeverity = risk.severity;
    let reason = 'unchanged';

    if (!hasEvidenceForRiskId(risk.id, textUpper)) {
      logDrop(risk.id, 'no-evidence');
      continue;
    }

    switch (risk.id) {
      case 'buyout': {
        const decision = resolveBuyout(normalizedText, risk.severity);
        include = decision.include;
        nextSeverity = decision.severity;
        reason = decision.reason;
        break;
      }
      case 'cut_versions_reuse': {
        const decision = resolveCutdowns(normalizedText, risk.severity);
        include = decision.include;
        nextSeverity = decision.severity;
        reason = decision.reason;
        break;
      }
      case 'ai_digital_double': {
        const decision = resolveAi(normalizedText, risk.severity);
        include = decision.include;
        nextSeverity = decision.severity;
        reason = decision.reason;
        break;
      }
      case 'voice_cloning': {
        const decision = resolveVoiceCloning(normalizedText, risk.severity);
        include = decision.include;
        nextSeverity = decision.severity;
        reason = decision.reason;
        break;
      }
      case 'exclusivity': {
        const decision = resolveExclusivity(normalizedText, risk.severity);
        include = decision.include;
        nextSeverity = decision.severity;
        reason = decision.reason;
        break;
      }
      case 'image_rights': {
        const decision = resolveImageRights(normalizedText, risk.severity);
        include = decision.include;
        nextSeverity = decision.severity;
        reason = decision.reason;
        break;
      }
      case 'termination': {
        const decision = resolveTermination(normalizedText, risk.severity);
        include = decision.include;
        nextSeverity = decision.severity;
        reason = decision.reason;
        break;
      }
      default:
        break;
    }

    if (!include) {
      logDrop(risk.id, reason);
      continue;
    }

    nextSeverity = clampSeverity(originalSeverity, nextSeverity);

    if (nextSeverity !== originalSeverity) {
      logSeverity(risk.id, originalSeverity, nextSeverity, reason);
    }
    if (reason === 'evidence-match') {
      logKeep(risk.id, reason);
    }

    result.push({ ...risk, severity: nextSeverity });
  }

  return result;
}
