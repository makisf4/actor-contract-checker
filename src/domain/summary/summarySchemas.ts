import { ContractTypeId, isAdvertisingType } from '../contractType/contractTypes';

export type SummarySchemaId = "film" | "tv_series" | "tv_commercial";

/**
 * Maps contract type to appropriate summary schema ID
 * 
 * @param type - Contract type
 * @returns Schema ID to use for summary generation
 */
export function schemaForContractType(type: ContractTypeId): SummarySchemaId {
  if (isAdvertisingType(type)) {
    return "tv_commercial";
  }

  if (type === "series") {
    return "tv_series";
  }

  return "film";
}
