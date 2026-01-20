type ExportRiskFlag = {
  title: string;
  severity: 'critical' | 'important' | 'moderate';
  why?: string;
  clauseRef?: string;
};

type ExportMissingClause = {
  title: string;
  why: string;
  ask: string;
};

type ExportNegotiation = {
  title: string;
  why: string;
  proposed: string;
};

type ExportSummaryField = {
  id: string;
  label: string;
};

const MISSING_TEXT = 'Δεν προκύπτει από το κείμενο';

const SEVERITY_LABELS: Record<ExportRiskFlag['severity'], string> = {
  critical: 'ΚΡΙΣΙΜΟ',
  important: 'ΣΗΜΑΝΤΙΚΟ',
  moderate: 'ΜΕΤΡΙΟ',
};

function formatSection(title: string, items: string[]): string[] {
  const lines: string[] = [title];
  if (items.length > 0) {
    lines.push(...items);
  }
  lines.push('');
  return lines;
}

export function exportReportText(args: {
  contractTypeLabel: string;
  summary: Record<string, string | null>;
  summaryFieldOrder: ExportSummaryField[];
  riskFlags: ExportRiskFlag[];
  missingClauses: ExportMissingClause[];
  questions: string[];
  negotiation: ExportNegotiation[];
}): string {
  const lines: string[] = [];

  lines.push('ΑΝΑΦΟΡΑ ΕΛΕΓΧΟΥ ΣΥΜΒΟΛΑΙΟΥ');
  lines.push(`Τύπος: ${args.contractTypeLabel}`);
  lines.push('');

  const summaryLines = args.summaryFieldOrder
    .map(field => {
      const value = args.summary[field.id];
      if (value === null || value === undefined) {
        return null;
      }
      const trimmed = value.trim();
      if (!trimmed || trimmed === MISSING_TEXT) {
        return null;
      }
      return `- ${field.label}: ${trimmed}`;
    })
    .filter((line): line is string => !!line);

  lines.push(...formatSection('ΠΕΡΙΛΗΨΗ ΒΑΣΙΚΩΝ ΟΡΩΝ', summaryLines));

  const riskLines = args.riskFlags.map(flag => {
    const severity = SEVERITY_LABELS[flag.severity] || flag.severity.toUpperCase();
    let line = `- [${severity}] ${flag.title}`;
    const why = flag.why?.trim();
    if (why) {
      line += ` — ${why}`;
    }
    const clauseRef = flag.clauseRef?.trim();
    if (clauseRef) {
      line += ` (Ρήτρα: ${clauseRef})`;
    }
    return line;
  });

  lines.push(...formatSection('ΣΗΜΕΙΑ ΠΡΟΣΟΧΗΣ', riskLines));

  const missingLines = args.missingClauses.map(item => {
    return `- ${item.title}\n  Γιατί: ${item.why}\n  Ζήτα: ${item.ask}`;
  });

  lines.push(...formatSection('ΡΗΤΡΕΣ ΠΟΥ ΑΠΟΥΣΙΑΖΟΥΝ', missingLines));

  const questionLines = args.questions
    .map(question => question.trim())
    .filter(Boolean)
    .map(question => `- ${question}`);

  lines.push(...formatSection('ΕΡΩΤΗΣΕΙΣ ΠΡΟΣ ΥΠΟΒΟΛΗ', questionLines));

  const negotiationLines = args.negotiation.map(item => {
    return `- ${item.title}\n  Γιατί: ${item.why}\n  Πρόταση: ${item.proposed}`;
  });

  lines.push(...formatSection('ΠΡΟΤΑΣΕΙΣ ΠΡΟΣ ΔΙΑΠΡΑΓΜΑΤΕΥΣΗ', negotiationLines));

  lines.push('Σημείωση: Το εργαλείο παρέχει ενημερωτική υποστήριξη και δεν αποτελεί νομική συμβουλή.');

  return lines.join('\n').trim();
}
