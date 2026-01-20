import { ContractTypeId } from '../contractType/contractTypes';
import { RiskId, RISK_IDS } from '../risks/riskMetadata';
import { CONTRACT_PROFILES } from '../profiles/contractProfiles';

export type Severity = 'critical' | 'important' | 'moderate';

export interface AnalysisResponseV1 {
  version: 'v1';
  contractTypeId: ContractTypeId;
  summary: Record<string, string | null>;
  riskFlags: Array<{
    id: RiskId;
    severity: Severity;
    why?: string;
    clauseRef?: string;
  }>;
  missingClauses: Array<{ id: RiskId }>;
  questions: string[];
  negotiation: Array<{
    title: string;
    current?: string;
    proposed: string;
    why: string;
  }>;
}

const SEVERITIES: Set<Severity> = new Set(['critical', 'important', 'moderate']);
const RISK_ID_SET = new Set<RiskId>(RISK_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function validateAnalysisResponse(
  input: unknown,
  expectedType: ContractTypeId
): { ok: true; value: AnalysisResponseV1 } | { ok: false; error: string } {
  if (!isRecord(input)) {
    return { ok: false, error: 'Response is not an object' };
  }

  if (input.version !== 'v1') {
    return { ok: false, error: 'Invalid version' };
  }

  if (input.contractTypeId !== expectedType) {
    return { ok: false, error: 'Contract type mismatch' };
  }

  if (!isRecord(input.summary)) {
    return { ok: false, error: 'Summary must be an object' };
  }

  if (!Array.isArray(input.riskFlags)) {
    return { ok: false, error: 'riskFlags must be an array' };
  }

  if (!Array.isArray(input.missingClauses)) {
    return { ok: false, error: 'missingClauses must be an array' };
  }

  if (!Array.isArray(input.questions)) {
    return { ok: false, error: 'questions must be an array' };
  }

  if (!Array.isArray(input.negotiation)) {
    return { ok: false, error: 'negotiation must be an array' };
  }

  const summary: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(input.summary)) {
    if (typeof value === 'string') {
      summary[key] = value;
    } else if (value === null) {
      summary[key] = null;
    }
  }

  const allowedRiskIds = new Set<RiskId>(CONTRACT_PROFILES[expectedType].allowedRiskIds);
  const riskFlags = input.riskFlags
    .filter((item: unknown) => isRecord(item))
    .map(item => {
      const id = item.id;
      const severity = item.severity;
      if (!isString(id) || !RISK_ID_SET.has(id as RiskId) || !allowedRiskIds.has(id as RiskId)) {
        return null;
      }
      if (!isString(severity) || !SEVERITIES.has(severity as Severity)) {
        return null;
      }
      const why = isString(item.why) ? item.why : undefined;
      const clauseRef = isString(item.clauseRef) ? item.clauseRef : undefined;
      return {
        id: id as RiskId,
        severity: severity as Severity,
        why,
        clauseRef,
      };
    })
    .filter((item): item is AnalysisResponseV1['riskFlags'][number] => !!item);

  const missingClauses = input.missingClauses
    .filter((item: unknown) => isRecord(item))
    .map(item => {
      const id = item.id;
      if (!isString(id) || !RISK_ID_SET.has(id as RiskId) || !allowedRiskIds.has(id as RiskId)) {
        return null;
      }
      return { id: id as RiskId };
    })
    .filter((item): item is AnalysisResponseV1['missingClauses'][number] => !!item);

  const questions = input.questions.filter(isString);

  const negotiation = input.negotiation
    .filter((item: unknown) => isRecord(item))
    .map(item => {
      if (!isString(item.title) || !isString(item.proposed) || !isString(item.why)) {
        return null;
      }
      return {
        title: item.title,
        proposed: item.proposed,
        why: item.why,
        current: isString(item.current) ? item.current : undefined,
      };
    })
    .filter((item): item is AnalysisResponseV1['negotiation'][number] => !!item);

  return {
    ok: true,
    value: {
      version: 'v1',
      contractTypeId: expectedType,
      summary,
      riskFlags,
      missingClauses,
      questions,
      negotiation,
    },
  };
}
