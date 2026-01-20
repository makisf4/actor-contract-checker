/**
 * Contract type definitions (internal ids + UI labels)
 */

export type ContractTypeId = 'film' | 'series' | 'ad';

export const CONTRACT_TYPE_LABELS: Record<ContractTypeId, string> = {
  film: 'Ταινία',
  series: 'Σειρά',
  ad: 'Διαφήμιση',
};

export const ALL_CONTRACT_TYPES: ContractTypeId[] = ['film', 'series', 'ad'];

export function getContractTypeLabel(type: ContractTypeId): string {
  return CONTRACT_TYPE_LABELS[type];
}

/**
 * Checks if a contract type is an advertising-related type
 */
export function isAdvertisingType(type: ContractTypeId): boolean {
  return type === 'ad';
}

/**
 * Coerce any unknown/legacy value to a safe default (film)
 */
export function coerceContractTypeId(type: string | null | undefined): ContractTypeId {
  if (type === 'film' || type === 'series' || type === 'ad') {
    return type;
  }
  return 'film';
}
