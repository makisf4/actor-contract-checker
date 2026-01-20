import { ContractTypeId } from './contractTypes';

export interface DetectionResult {
  detectedType: ContractTypeId;
  confidence: number; // 0..1
  evidence: {
    matchedSignals: string[];
  };
}

/**
 * Keyword buckets for contract type detection (v1: Film, TV Series, TV Commercial)
 */
const TV_COMMERCIAL_SIGNALS = [
  'σποτ', 'τηλεοπτικ', 'tv', 'television', 'spot', 'commercial', 'διαφημισ',
  'campaign', 'καμπάνια', 'media', 'broadcast', 'platform', 'social', 'digital',
  'instagram', 'tiktok', 'youtube', 'meta', 'χορηγούμενο', 'cut', 'cutdown',
  'versions', 're-use', 'επαναχρησιμοπ', 'διάρκεια χρήσης', 'δικαιώματα εικόνας',
];

const TV_SERIES_SIGNALS = [
  'σειρά', 'σειρας', 'σειρών', 'επεισόδιο', 'επεισοδιο', 'επεισόδια', 'επεισοδια',
  'season', 'episodes', 'episode', 'τηλεοπτικη σειρα', 'τηλεοπτικ', 'serial',
];

const FILM_SIGNALS = [
  'ταινία', 'ταινια', 'κινηματογραφ', 'cinema', 'film', 'movie', 'feature film',
  'short film', 'μικρού μήκους', 'μικρου μηκους', 'φεστιβάλ', 'festival',
  'γυρίσματα', 'γυρισματα', 'διανομή', 'διανομη', 'αίθουσες', 'αιθουσες',
];

function scoreSignals(normalized: string, signals: string[]): { score: number; hits: string[] } {
  const hits = signals.filter(signal => normalized.includes(signal));
  return { score: hits.length, hits: hits.slice(0, 5) };
}

/**
 * Detects contract type from redacted text using rule-based scoring
 *
 * @param redactedText - Text with placeholders (privacy-safe)
 * @returns Detection result with type, confidence, and evidence
 */
export function detectContractType(redactedText: string): DetectionResult {
  const normalized = redactedText.toLowerCase();

  const ad = scoreSignals(normalized, TV_COMMERCIAL_SIGNALS);
  const series = scoreSignals(normalized, TV_SERIES_SIGNALS);
  const film = scoreSignals(normalized, FILM_SIGNALS);

  const scores = [
    { type: 'ad' as ContractTypeId, score: ad.score, hits: ad.hits },
    { type: 'series' as ContractTypeId, score: series.score, hits: series.hits },
    { type: 'film' as ContractTypeId, score: film.score, hits: film.hits },
  ].sort((a, b) => b.score - a.score);

  const top = scores[0];
  const second = scores[1];

  // Fail-safe: if no signals, default to Film
  if (top.score === 0) {
    return {
      detectedType: 'film',
      confidence: 0,
      evidence: { matchedSignals: [] },
    };
  }

  // Confidence: (top - second) / max(1, top), capped by (top / 6)
  const scoreDiff = Math.max(0, top.score - (second?.score || 0));
  const baseConfidence = scoreDiff / Math.max(1, top.score);
  const scoreBasedConfidence = Math.min(1, top.score / 6);
  const confidence = Math.max(0, Math.min(1, Math.min(baseConfidence, scoreBasedConfidence)));

  return {
    detectedType: top.type,
    confidence,
    evidence: {
      matchedSignals: top.hits,
    },
  };
}
