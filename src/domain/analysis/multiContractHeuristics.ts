export type MultiContractLikelihood = {
  score: number;
  reasons: string[];
};

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0370-\u03FF\u1F00-\u1FFF]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countOccurrences(text: string, term: string): number {
  if (!term) {
    return 0;
  }
  return text.split(term).length - 1;
}

export function detectMultiContractLikelihood(text: string): MultiContractLikelihood {
  const normalized = normalizeText(text || '');
  if (!normalized) {
    return { score: 0, reasons: [] };
  }

  let score = 0;
  const reasons: string[] = [];

  const contractMentions =
    countOccurrences(normalized, 'συμβαση') + countOccurrences(normalized, 'συμφωνητικ');
  if (contractMentions >= 2) {
    score += 0.4;
    reasons.push('Πολλαπλές αναφορές σε σύμβαση/συμφωνητικό');
  }

  const hasPartA = normalized.includes('μερος α') || normalized.includes('τμημα α');
  const hasPartB = normalized.includes('μερος β') || normalized.includes('τμημα β');
  if (hasPartA && hasPartB) {
    score += 0.25;
    reasons.push('Ενδείξεις για περισσότερα από ένα μέρη/τμήματα');
  }

  const annexMentions = countOccurrences(normalized, 'παραρτημα');
  if (annexMentions >= 2) {
    score += 0.2;
    reasons.push('Πολλαπλές αναφορές σε παραρτήματα');
  }

  if (normalized.includes('εναρξη ορων') && countOccurrences(normalized, 'εναρξη ορων') > 1) {
    score += 0.2;
    reasons.push('Περισσότερες από μία ενότητες όρων');
  }

  if (normalized.length > 15000) {
    score += 0.15;
    reasons.push('Μεγάλο μήκος κειμένου για μία σύμβαση');
  }

  score = Math.min(1, score);
  return { score, reasons };
}
