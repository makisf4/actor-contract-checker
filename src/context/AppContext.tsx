import React, { createContext, useContext } from 'react';
import { DetectedEntity } from '../utils/redaction';
import { ContractTypeId } from '../domain/contractType/contractTypes';
import { AnalysisResponseV1 } from '../domain/analysis/analysisSchema';

export interface AuditInfo {
  timestamp: string;
  endpoint: string;
  model: string;
  payload: string;
}

export interface AppContextType {
  originalText: string;
  setOriginalText: (text: string) => void;
  redactedText: string;
  setRedactedText: (text: string) => void;
  detectedEntities: DetectedEntity[];
  setDetectedEntities: (entities: DetectedEntity[]) => void;
  analysisResult: AnalysisResponseV1 | null;
  setAnalysisResult: (result: AnalysisResponseV1 | null) => void;
  isLastReport: boolean;
  clearLastReport: () => Promise<void>;
  credits: number;
  refreshCredits: () => Promise<number>;
  addCredits: (n: number) => Promise<number>;
  consumeCredit: () => Promise<boolean>;
  devMode: boolean;
  setDevMode: (enabled: boolean) => void;
  lastApiPayload: string;
  setLastApiPayload: (payload: string) => void;
  auditInfo: AuditInfo | null;
  setAuditInfo: (info: AuditInfo | null) => void;
  selectedContractCategory: ContractTypeId | null;
  setSelectedContractCategory: (category: ContractTypeId | null) => void;
  clearAll: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContext.Provider');
  }
  return context;
};
