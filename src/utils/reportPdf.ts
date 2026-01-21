import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type ReportSummaryField = { id: string; label: string };
type ReportRisk = {
  title: string;
  severity: 'critical' | 'important' | 'moderate';
  why?: string;
  clauseRef?: string;
};
type ReportMissingClause = { title: string; why: string; ask: string };
type ReportNegotiation = { title: string; why: string; proposed: string };

const COUNTER_KEY = 'report_pdf_counter_v1';
const MISSING_TEXT = 'Δεν εντοπίστηκε σαφής αναφορά στο κείμενο';

const SEVERITY_LABELS: Record<ReportRisk['severity'], string> = {
  critical: 'Κρίσιμο',
  important: 'Σημαντικό',
  moderate: 'Μέτριο',
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function getNextCounter(): Promise<number> {
  const stored = await AsyncStorage.getItem(COUNTER_KEY);
  const current = stored ? Number.parseInt(stored, 10) : 0;
  const next = Number.isNaN(current) ? 1 : current + 1;
  await AsyncStorage.setItem(COUNTER_KEY, String(next));
  return next;
}

function formatCounter(value: number): string {
  return String(value).padStart(3, '0');
}

function buildSection(title: string, body: string): string {
  return `
    <div class="section">
      <h2>${escapeHtml(title)}</h2>
      ${body}
    </div>
  `;
}

export async function saveReportPdf(args: {
  contractTypeLabel: string;
  summary: Record<string, string | null>;
  summaryFieldOrder: ReportSummaryField[];
  riskFlags: ReportRisk[];
  missingClauses: ReportMissingClause[];
  questions: string[];
  negotiation: ReportNegotiation[];
}): Promise<{ uri: string; fileName: string }> {
  const summaryItems = args.summaryFieldOrder
    .map(field => {
      const value = args.summary[field.id];
      if (!value || value.trim() === '' || value.trim() === MISSING_TEXT) {
        return null;
      }
      return `<li><strong>${escapeHtml(field.label)}:</strong> ${escapeHtml(value)}</li>`;
    })
    .filter(Boolean)
    .join('');

  const summaryBody = summaryItems
    ? `<ul>${summaryItems}</ul>`
    : `<p>${escapeHtml(MISSING_TEXT)}</p>`;

  const riskItems = args.riskFlags.map(flag => {
    const severity = SEVERITY_LABELS[flag.severity] || flag.severity;
    const parts = [
      `<strong>[${escapeHtml(severity)}]</strong> ${escapeHtml(flag.title)}`,
    ];
    if (flag.why) {
      parts.push(`— ${escapeHtml(flag.why)}`);
    }
    if (flag.clauseRef) {
      parts.push(`(Ρήτρα: ${escapeHtml(flag.clauseRef)})`);
    }
    return `<li>${parts.join(' ')}</li>`;
  });
  const risksBody = riskItems.length ? `<ul>${riskItems.join('')}</ul>` : `<p>—</p>`;

  const missingItems = args.missingClauses.map(item => (
    `<li><strong>${escapeHtml(item.title)}</strong><br/>Γιατί: ${escapeHtml(item.why)}<br/>Τι να ζητήσεις: ${escapeHtml(item.ask)}</li>`
  ));
  const missingBody = missingItems.length ? `<ul>${missingItems.join('')}</ul>` : `<p>—</p>`;

  const questionItems = args.questions.map(q => `<li>${escapeHtml(q)}</li>`);
  const questionsBody = questionItems.length ? `<ul>${questionItems.join('')}</ul>` : `<p>—</p>`;

  const negotiationItems = args.negotiation.map(item => (
    `<li><strong>${escapeHtml(item.title)}</strong><br/>Γιατί: ${escapeHtml(item.why)}<br/>Πρόταση: ${escapeHtml(item.proposed)}</li>`
  ));
  const negotiationBody = negotiationItems.length ? `<ul>${negotiationItems.join('')}</ul>` : `<p>—</p>`;

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; padding: 24px; }
          h1 { font-size: 20px; margin: 0 0 8px 0; }
          h2 { font-size: 16px; margin: 20px 0 8px 0; }
          p, li { font-size: 12px; line-height: 1.5; }
          ul { padding-left: 16px; margin: 8px 0; }
          .meta { font-size: 12px; color: #444; margin-bottom: 16px; }
          .footer { margin-top: 24px; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <h1>ΑΝΑΦΟΡΑ ΕΛΕΓΧΟΥ ΣΥΜΒΟΛΑΙΟΥ</h1>
        <div class="meta">Τύπος: ${escapeHtml(args.contractTypeLabel)}</div>
        ${buildSection('ΠΕΡΙΛΗΨΗ ΒΑΣΙΚΩΝ ΟΡΩΝ', summaryBody)}
        ${buildSection('ΣΗΜΕΙΑ ΠΡΟΣΟΧΗΣ', risksBody)}
        ${buildSection('ΣΗΜΕΙΑ ΠΡΟΣ ΔΙΕΥΚΡΙΝΙΣΗ', missingBody)}
        ${buildSection('ΕΡΩΤΗΣΕΙΣ ΠΡΟΣ ΥΠΟΒΟΛΗ', questionsBody)}
        ${buildSection('ΠΡΟΤΑΣΕΙΣ ΠΡΟΣ ΔΙΑΠΡΑΓΜΑΤΕΥΣΗ', negotiationBody)}
        <div class="footer">Το παρόν έγγραφο δεν αποτελεί νομική συμβουλή.</div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  const counter = await getNextCounter();
  const fileName = `actor_contract_check_${formatCounter(counter)}.pdf`;
  const targetUri = FileSystem.cacheDirectory
    ? `${FileSystem.cacheDirectory}${fileName}`
    : uri;

  if (uri !== targetUri) {
    await FileSystem.moveAsync({ from: uri, to: targetUri });
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(targetUri, {
      UTI: 'com.adobe.pdf',
      mimeType: 'application/pdf',
      dialogTitle: 'Αποθήκευση Αναφοράς',
    });
  }

  return { uri: targetUri, fileName };
}
