import { ContractTypeId, ALL_CONTRACT_TYPES } from './contractTypes';
import { detectContractType, DetectionResult } from './detectContractType';

export interface FinalContractTypeResult {
  finalType: ContractTypeId;
  detectedType: ContractTypeId;
  confidence: number;
  shouldSuggestSwitch: boolean;
  evidence: {
    matchedSignals: string[];
  };
}

/**
 * Determines the final contract type based on user selection and auto-detection
 * 
 * @param userSelectedType - User-selected contract type (from dropdown)
 * @param redactedText - Redacted contract text for detection
 * @returns Final type decision with detection metadata
 */
export function getFinalContractType(
  userSelectedType: ContractTypeId | null,
  redactedText: string
): FinalContractTypeResult {
  // Run detection
  const detection: DetectionResult = detectContractType(redactedText);
  const safeDetectedType = ALL_CONTRACT_TYPES.includes(detection.detectedType)
    ? detection.detectedType
    : 'film';
  
  // If user selected a valid type, use it
  if (userSelectedType && ALL_CONTRACT_TYPES.includes(userSelectedType)) {
    const shouldSuggestSwitch =
      detection.detectedType !== userSelectedType &&
      detection.confidence >= 0.6;
    
    return {
      finalType: userSelectedType,
      detectedType: safeDetectedType,
      confidence: detection.confidence,
      shouldSuggestSwitch,
      evidence: detection.evidence,
    };
  }
  
  // Otherwise use detected type (fail-safe to Film)
  return {
    finalType: safeDetectedType,
    detectedType: safeDetectedType,
    confidence: detection.confidence,
    shouldSuggestSwitch: false,
    evidence: detection.evidence,
  };
}
