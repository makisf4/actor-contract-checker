import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalysisResponseV1 } from '../analysis/analysisSchema';

const LAST_REPORT_KEY = 'last_report_v1';

export async function getLastReport(): Promise<AnalysisResponseV1 | null> {
  const stored = await AsyncStorage.getItem(LAST_REPORT_KEY);
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored) as AnalysisResponseV1;
  } catch {
    return null;
  }
}

export async function setLastReport(report: AnalysisResponseV1): Promise<void> {
  await AsyncStorage.setItem(LAST_REPORT_KEY, JSON.stringify(report));
}

export async function clearLastReport(): Promise<void> {
  await AsyncStorage.removeItem(LAST_REPORT_KEY);
}
