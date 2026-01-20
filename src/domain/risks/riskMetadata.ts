/**
 * Risk metadata - defines which risks are allowed for which contract types
 */

import { ContractTypeId, coerceContractTypeId } from '../contractType/contractTypes';

// Declare __DEV__ for TypeScript
declare const __DEV__: boolean | undefined;

export type RiskId =
  | 'image_rights'
  | 'ai_digital_double'
  | 'voice_cloning'
  | 'buyout'
  | 'cut_versions_reuse'
  | 'advertising_reuse'
  | 'reuse'
  | 'exclusivity'
  | 'duration'
  | 'payment_terms'
  | 'termination'
  | 'reputation_moral';

export interface RiskMetadata {
  id: RiskId;
  title: string; // Human-readable label in Greek
  allowedContractTypes: ContractTypeId[];
  requiresExplicitMention?: boolean; // If true, only show if explicitly mentioned in contract
}

const FILM: ContractTypeId[] = ['film'];
const TV_SERIES: ContractTypeId[] = ['series'];
const TV_COMMERCIAL: ContractTypeId[] = ['ad'];
const ALL_TYPES: ContractTypeId[] = [...FILM, ...TV_SERIES, ...TV_COMMERCIAL];

/**
 * Risk metadata keyed by canonical RiskId
 */
const RISK_METADATA: Record<RiskId, RiskMetadata> = {
  // Common risks (all v1 types)
  duration: {
    id: 'duration',
    title: 'Διάρκεια',
    allowedContractTypes: ALL_TYPES,
  },
  exclusivity: {
    id: 'exclusivity',
    title: 'Αποκλειστικότητα',
    allowedContractTypes: ALL_TYPES,
  },
  payment_terms: {
    id: 'payment_terms',
    title: 'Πληρωμή / Όροι Πληρωμής',
    allowedContractTypes: ALL_TYPES,
  },
  termination: {
    id: 'termination',
    title: 'Λύση / Καταγγελία',
    allowedContractTypes: ALL_TYPES,
  },
  reputation_moral: {
    id: 'reputation_moral',
    title: 'Φήμη / Ηθικά Δικαιώματα',
    allowedContractTypes: ALL_TYPES,
  },

  // Film & TV series
  image_rights: {
    id: 'image_rights',
    title: 'Δικαιώματα Εικόνας',
    allowedContractTypes: [...FILM, ...TV_SERIES, ...TV_COMMERCIAL],
  },
  ai_digital_double: {
    id: 'ai_digital_double',
    title: 'AI και Ψηφιακό Αντίγραφο',
    allowedContractTypes: [...FILM, ...TV_SERIES, ...TV_COMMERCIAL],
    requiresExplicitMention: true,
  },
  voice_cloning: {
    id: 'voice_cloning',
    title: 'Voice Cloning',
    allowedContractTypes: TV_COMMERCIAL,
    requiresExplicitMention: true,
  },
  buyout: {
    id: 'buyout',
    title: 'Buyout',
    allowedContractTypes: [...FILM, ...TV_SERIES, ...TV_COMMERCIAL],
    requiresExplicitMention: true,
  },
  cut_versions_reuse: {
    id: 'cut_versions_reuse',
    title: 'Cut Versions / Edits',
    allowedContractTypes: TV_COMMERCIAL,
    requiresExplicitMention: true,
  },
  advertising_reuse: {
    id: 'advertising_reuse',
    title: 'Διαφημιστική Επαναχρησιμοποίηση',
    allowedContractTypes: TV_COMMERCIAL,
    requiresExplicitMention: true,
  },
  reuse: {
    id: 'reuse',
    title: 'Επαναχρησιμοποίηση',
    allowedContractTypes: [...FILM, ...TV_SERIES, ...TV_COMMERCIAL],
  },
};

const EXPLICIT_MENTION_KEYWORDS: Record<RiskId, string[]> = {
  ai_digital_double: [
    'AI',
    'ΤΕΧΝΗΤΗ ΝΟΗΜΟΣΥΝΗ',
    'ΨΗΦΙΑΚΟ',
    'ΨΗΦΙΑΚΟ ΑΝΤΙΓΡΑΦΟ',
    'DIGITAL DOUBLE',
    'VOICE CLONING',
    'CLONING',
    'SYNTHETIC',
    'DEEPFAKE',
  ],
  voice_cloning: [
    'VOICE CLONING',
    'CLONING',
    'VOICE',
    'ΦΩΝΗ',
    'ΚΛΩΝΟ',
    'CLONE',
  ],
  buyout: ['BUYOUT', 'ΕΦΑΠΑΞ', 'ΕΦΑΠΑΞ ΑΜΟΙΒΗ', 'ΕΞΑΓΟΡΑ'],
  cut_versions_reuse: [
    'CUT VERSION',
    'CUTDOWN',
    'CUT',
    'EDIT',
    'EDITS',
    'VERSIONS',
    'RE-USE',
    'REUSE',
    'ΕΠΑΝΑΧΡΗΣΙΜΟΠ',
    'ΠΑΡΑΛΛΑΓ',
    'ΕΚΔΟΧ',
  ],
  advertising_reuse: [
    'MEDIA',
    'PLATFORM',
    'PLATFORMS',
    'SOCIAL',
    'BROADCAST',
    'CAMPAIGN',
    'SPOT',
    'ΔΙΑΦΗΜΙΣ',
    'ΚΑΜΠΑΝΙΑ',
    'ΜΕΣΑ',
  ],
  image_rights: [],
  reuse: [],
  exclusivity: [],
  duration: [],
  payment_terms: [],
  termination: [],
  reputation_moral: [],
};

export const RISK_IDS = Object.keys(RISK_METADATA) as RiskId[];

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0370-\u03FF\u1F00-\u1FFF]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize a risk label or id into a canonical RiskId
 */
export function normalizeRiskId(input: string): RiskId | null {
  if (!input) {
    return null;
  }

  const normalized = normalizeText(input);
  if (!normalized) {
    return null;
  }

  // Direct id match
  if ((RISK_METADATA as Record<string, RiskMetadata>)[normalized]) {
    return normalized as RiskId;
  }

  // Image/voice rights
  if (
    (normalized.includes('δικαιωματα') && (normalized.includes('εικονας') || normalized.includes('φωνης')))
    || normalized.includes('image rights')
    || (normalized.includes('image') && normalized.includes('rights'))
  ) {
    return 'image_rights';
  }

  // AI / digital double
  if (
    normalized.includes('ai')
    || normalized.includes('τεχνητη νοημοσυνη')
    || normalized.includes('ψηφιακο αντιγραφο')
    || normalized.includes('digital double')
    || normalized.includes('deepfake')
    || normalized.includes('synthetic')
  ) {
    return 'ai_digital_double';
  }

  // Voice cloning
  if (
    normalized.includes('voice cloning')
    || (normalized.includes('voice') && normalized.includes('clon'))
    || (normalized.includes('φων') && normalized.includes('κλων'))
  ) {
    return 'voice_cloning';
  }

  // Buyout
  if (
    normalized.includes('buyout')
    || normalized.includes('εφαπαξ')
    || normalized.includes('εξαγορα')
  ) {
    return 'buyout';
  }

  // Cut versions / edits
  if (
    normalized.includes('cut version')
    || normalized.includes('cutdown')
    || normalized.includes('cut')
    || normalized.includes('edit')
    || normalized.includes('version')
    || normalized.includes('παραλλαγ')
    || normalized.includes('εκδοχ')
  ) {
    return 'cut_versions_reuse';
  }

  // Advertising reuse
  if (
    (normalized.includes('διαφημισ') || normalized.includes('καμπανια') || normalized.includes('campaign') || normalized.includes('spot'))
    && (normalized.includes('χρησ') || normalized.includes('media') || normalized.includes('platform') || normalized.includes('social') || normalized.includes('broadcast'))
  ) {
    return 'advertising_reuse';
  }

  // Reuse
  if (
    normalized.includes('επαναχρησιμοπ')
    || normalized.includes('reuse')
    || normalized.includes('re use')
    || normalized.includes('re-use')
    || normalized.includes('επανεκμεταλλευ')
  ) {
    return 'reuse';
  }

  // Exclusivity
  if (normalized.includes('αποκλειστικ') || normalized.includes('exclusiv')) {
    return 'exclusivity';
  }

  // Duration
  if (normalized.includes('διαρκεια') || normalized.includes('duration')) {
    return 'duration';
  }

  // Payment terms
  if (
    normalized.includes('πληρωμ')
    || normalized.includes('αμοιβ')
    || normalized.includes('payment')
    || normalized.includes('fee')
    || normalized.includes('compensation')
  ) {
    return 'payment_terms';
  }

  // Termination / cancellation
  if (
    normalized.includes('λυση')
    || normalized.includes('καταγγελια')
    || normalized.includes('καταργηση')
    || normalized.includes('termination')
    || normalized.includes('cancel')
  ) {
    return 'termination';
  }

  // Reputation / moral rights
  if (
    normalized.includes('φημη')
    || normalized.includes('ηθικ')
    || normalized.includes('reputation')
    || normalized.includes('moral rights')
  ) {
    return 'reputation_moral';
  }

  return null;
}

export function normalizeMissingClauseToRiskId(clauseText: string): RiskId | null {
  return normalizeRiskId(clauseText);
}

function hasExplicitMention(riskId: RiskId, contractText: string): boolean {
  const keywords = EXPLICIT_MENTION_KEYWORDS[riskId] || [];
  if (!keywords.length) {
    return false;
  }

  const normalizedText = normalizeText(contractText);
  return keywords.some(keyword => {
    const normalizedKeyword = normalizeText(keyword);
    return normalizedKeyword.length > 0 && normalizedText.includes(normalizedKeyword);
  });
}

/**
 * Checks if a risk category is allowed for the given contract type
 * Fail-closed for unknown risk ids
 */
export function isRiskAllowedForContractType(
  riskIdOrLabel: string,
  contractType: ContractTypeId | null,
  contractText?: string
): boolean {
  const riskId = normalizeRiskId(riskIdOrLabel);
  if (!riskId || !RISK_METADATA[riskId]) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[Risk Filter] Dropped unknown risk label:', riskIdOrLabel);
    }
    return false;
  }

  // Fail-safe: coerce unknown/legacy type to Film
  const safeType = coerceContractTypeId(contractType);

  const metadata = RISK_METADATA[riskId];
  const allowedByType = metadata.allowedContractTypes.includes(safeType);

  if (allowedByType) {
    if (metadata.requiresExplicitMention) {
      return !!contractText && hasExplicitMention(riskId, contractText);
    }
    return true;
  }

  // If not allowed by type, allow only if explicitly mentioned and required
  if (metadata.requiresExplicitMention) {
    return !!contractText && hasExplicitMention(riskId, contractText);
  }

  return false;
}

/**
 * Filters risk flags or missing clauses based on contract type
 */
export function filterRisksByContractType<T extends { category?: string; clause?: string; id?: string; categoryId?: string }>(
  risks: T[],
  contractType: ContractTypeId | null,
  contractText?: string
): T[] {
  const filtered = risks.filter(risk => {
    const rawLabel = risk.categoryId || risk.id || risk.category || risk.clause || '';
    const resolvedId = normalizeRiskId(rawLabel) || normalizeMissingClauseToRiskId(rawLabel);

    if (!resolvedId) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[Risk Filter] Dropped unknown risk label:', rawLabel);
      }
      return false;
    }

    return isRiskAllowedForContractType(resolvedId, contractType, contractText);
  });

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const riskIds = risks.map(r => r.categoryId || r.id || r.category || r.clause || 'unknown');
    const filteredIds = filtered.map(r => r.categoryId || r.id || r.category || r.clause || 'unknown');
    console.log('[Risk Filter]', {
      contractType,
      originalCount: risks.length,
      filteredCount: filtered.length,
      originalRisks: riskIds,
      filteredRisks: filteredIds,
      excluded: riskIds.filter(id => !filteredIds.includes(id)),
    });
  }

  return filtered;
}

export function getRiskTitle(riskId: RiskId): string {
  return RISK_METADATA[riskId]?.title || riskId;
}
