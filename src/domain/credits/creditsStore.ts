import AsyncStorage from '@react-native-async-storage/async-storage';

const CREDITS_KEY = 'credits_v1';
const DEFAULT_CREDITS = 0;

function toNumber(value: string | null): number {
  if (!value) {
    return DEFAULT_CREDITS;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? DEFAULT_CREDITS : parsed;
}

async function setCreditsValue(value: number): Promise<void> {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : DEFAULT_CREDITS;
  await AsyncStorage.setItem(CREDITS_KEY, String(safeValue));
}

export async function getCredits(): Promise<number> {
  const stored = await AsyncStorage.getItem(CREDITS_KEY);
  return toNumber(stored);
}

export async function addCredits(n: number): Promise<number> {
  const current = await getCredits();
  const next = current + Math.max(0, Math.floor(n));
  await setCreditsValue(next);
  return next;
}

export async function consumeCredit(): Promise<boolean> {
  const current = await getCredits();
  if (current <= 0) {
    return false;
  }
  await setCreditsValue(current - 1);
  return true;
}
