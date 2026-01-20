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

const AI_KEYWORDS = [
  'AI',
  'ΤΕΧΝΗΤ',
  'ΝΟΗΜΟΣΥΝ',
  'ΨΗΦΙΑΚ',
  'DIGITAL',
  'DEEPFAKE',
  'CLON',
];

const IMAGE_KEYWORDS = ['ΕΙΚΟΝ', 'ΕΡΜΗΝΕΙΑ', 'ΔΙΚΑΙΩ'];
const TERMINATION_KEYWORDS = ['ΛΥΣ', 'ΚΑΤΑΓΓΕΛ', 'TERMINAT'];

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

function logSeverity(id: RiskId, from: Severity, to: Severity, reason: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && from !== to) {
    console.log('[Risk PostProcess] Severity changed', { id, from, to, reason });
  }
}

function resolveBuyout(text: string, severity: Severity): { include: boolean; severity: Severity; reason: string } {
  const hasBuyout = text.includes('BUYOUT');
  const hasEfapax = text.includes('ΕΦΑΠΑΞ');
  const hasCoverage = text.includes('ΚΑΛΥΠΤ') || text.includes('ΠΑΡΑΙΤ');
  if (!(hasBuyout || (hasEfapax && hasCoverage))) {
    return { include: false, severity, reason: 'no_buyout_evidence' };
  }
  const criticalTerms = [
    'ΧΩΡΙΣ ΠΡΟΣΘΕΤΗ ΑΜΟΙΒ',
    'ΧΩΡΙΣ ΕΠΙΠΛΕΟΝ ΑΜΟΙΒ',
    'ΓΙΑ ΚΑΘΕ ΧΡΗΣ',
    'ΑΠΕΡΙΟΡΙΣΤ',
  ];
  const nextSeverity = includesAny(text, criticalTerms) ? 'critical' : 'important';
  return { include: true, severity: nextSeverity, reason: 'buyout_evidence' };
}

function resolveCutdowns(text: string, severity: Severity): { include: boolean; severity: Severity; reason: string } {
  const cutTokens = ['CUTDOWN', 'CUT', 'EDIT', 'ΕΠΕΞΕΡΓΑΣ', 'ΠΕΡΙΚΟΠ', 'ΕΝΑΛΛΑΚΤΙΚ', 'ΕΚΔΟΣ'];
  if (!includesAny(text, cutTokens)) {
    return { include: false, severity, reason: 'no_cutdown_evidence' };
  }
  const withoutApproval = text.includes('ΧΩΡΙΣ ΕΓΚΡΙΣ') || text.includes('ΧΩΡΙΣ ΣΥΝΑΙΝ');
  const nextSeverity = withoutApproval ? 'important' : 'moderate';
  return { include: true, severity: nextSeverity, reason: 'cutdown_evidence' };
}

function resolveAi(text: string, severity: Severity): { include: boolean; severity: Severity; reason: string } {
  if (!includesAny(text, AI_KEYWORDS)) {
    return { include: false, severity, reason: 'no_ai_terms' };
  }
  const explicitProhibition = text.includes('ΑΠΑΓΟΡΕΥΕΤ') || text.includes('ΔΕΝ ΕΠΙΤΡΕΠ');
  if (explicitProhibition) {
    return { include: false, severity, reason: 'ai_explicitly_prohibited' };
  }
  const hasWrittenConsent = (text.includes('ΣΥΝΑΙΝ') || text.includes('ΑΔΕΙΑ')) && (text.includes('ΓΡΑΠΤ') || text.includes('ΕΓΓΡΑΦ'));
  const withoutConsent = text.includes('ΧΩΡΙΣ ΣΥΝΑΙΝ');
  const broadLicense = includesAny(text, UNLIMITED_KEYWORDS) || text.includes('ΟΠΟΙΟΔΗΠΟΤ');
  if (withoutConsent || broadLicense) {
    return { include: true, severity: 'critical', reason: 'ai_broad_or_without_consent' };
  }
  const hasCompensation = includesAny(text, COMPENSATION_KEYWORDS);
  if (hasWrittenConsent) {
    return { include: true, severity: 'moderate', reason: 'ai_requires_consent' };
  }
  if (!hasCompensation) {
    return { include: true, severity: 'important', reason: 'ai_no_compensation' };
  }
  return { include: true, severity: 'moderate', reason: 'ai_evidence' };
}

function resolveExclusivity(text: string, severity: Severity): { include: boolean; severity: Severity; reason: string } {
  if (!includesAny(text, ['ΑΠΟΚΛΕΙΣΤ', 'ΜΗ ΑΝΤΑΓΩΝΙΣΜ', 'ΑΝΤΑΓΩΝΙΣΤ'])) {
    return { include: false, severity, reason: 'no_exclusivity_terms' };
  }
  const broadCategory = text.includes('ΟΠΟΙΟΔΗΠΟΤ') || text.includes('ΟΠΟΙΟΝΔΗΠΟΤ') || text.includes('ANY CATEGORY');
  const longDuration = hasDurationAtLeastMonths(text, 12);
  const nextSeverity = (broadCategory || longDuration) ? 'critical' : 'important';
  return { include: true, severity: nextSeverity, reason: 'exclusivity_evidence' };
}

function resolveImageRights(text: string, severity: Severity): { include: boolean; severity: Severity; reason: string } {
  if (!includesAny(text, IMAGE_KEYWORDS)) {
    return { include: false, severity, reason: 'no_image_terms' };
  }
  if (includesAny(text, UNLIMITED_KEYWORDS) || text.includes('ΠΑΝΤΟΣ ΧΡΟΝΟΥ')) {
    return { include: true, severity: 'critical', reason: 'image_rights_unlimited' };
  }
  const limitedScope = includesAny(text, LIMITED_SCOPE_KEYWORDS);
  if (limitedScope) {
    return { include: true, severity: 'moderate', reason: 'image_rights_limited' };
  }
  if (includesAny(text, STREAMING_KEYWORDS)) {
    return { include: true, severity: 'important', reason: 'image_rights_media_expansion' };
  }
  return { include: true, severity: 'moderate', reason: 'image_rights_evidence' };
}

function resolveTermination(text: string, severity: Severity): { include: boolean; severity: Severity; reason: string } {
  if (!includesAny(text, TERMINATION_KEYWORDS)) {
    return { include: false, severity, reason: 'no_termination_terms' };
  }
  const withoutCompensation = text.includes('ΧΩΡΙΣ ΑΠΟΖΗΜ') || text.includes('ΑΖΗΜΙΩΣ');
  const hasCompensation = text.includes('ΑΠΟΖΗΜ') && !withoutCompensation;
  if (hasCompensation) {
    return { include: false, severity, reason: 'termination_has_compensation' };
  }
  if (!withoutCompensation) {
    return { include: false, severity, reason: 'termination_no_without_comp' };
  }
  const critical = text.includes('ΟΠΟΙΟΔΗΠΟΤ') || text.includes('ΑΝΑΙΤΙΩΣ') || text.includes('ΧΩΡΙΣ ΠΡΟΕΙΔΟΠΟΙ');
  return { include: true, severity: critical ? 'critical' : 'important', reason: 'termination_without_comp' };
}

export function postProcessRisks(args: PostProcessArgs): RiskItem[] {
  const { contractTypeId, processedText, risks } = args;
  const normalizedText = normalizeText(processedText || '');

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

    switch (risk.id) {
      case 'buyout': {
        if (contractTypeId === 'ad') {
          const decision = resolveBuyout(normalizedText, risk.severity);
          include = decision.include;
          nextSeverity = decision.severity;
          reason = decision.reason;
        }
        break;
      }
      case 'cut_versions_reuse': {
        if (contractTypeId === 'ad') {
          const decision = resolveCutdowns(normalizedText, risk.severity);
          include = decision.include;
          nextSeverity = decision.severity;
          reason = decision.reason;
        }
        break;
      }
      case 'ai_digital_double': {
        const decision = resolveAi(normalizedText, risk.severity);
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
        if (contractTypeId === 'film' || contractTypeId === 'series') {
          const decision = resolveImageRights(normalizedText, risk.severity);
          include = decision.include;
          nextSeverity = decision.severity;
          reason = decision.reason;
        }
        break;
      }
      case 'termination': {
        if (contractTypeId === 'film' || contractTypeId === 'series') {
          const decision = resolveTermination(normalizedText, risk.severity);
          include = decision.include;
          nextSeverity = decision.severity;
          reason = decision.reason;
        }
        break;
      }
      default:
        break;
    }

    if (!include) {
      logDrop(risk.id, reason);
      continue;
    }

    if (nextSeverity !== originalSeverity) {
      logSeverity(risk.id, originalSeverity, nextSeverity, reason);
    }

    result.push({ ...risk, severity: nextSeverity });
  }

  return result;
}
