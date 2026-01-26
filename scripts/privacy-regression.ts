import fs from 'node:fs';
import path from 'node:path';

import { detectEntities, redactText } from '../src/utils/redaction';
import { smartSkipPreamble } from '../src/domain/redaction/smartSkipPreamble';
import {
  detectSuspiciousUnredactedPatterns,
  getUnredactedEntityCounts,
  hasAnyUnredactedEntities,
} from '../src/utils/privacyValidation';
import { buildAnalysisRequestBodyPretty } from '../src/utils/llmAdapter';

type CheckResult = {
  file: string;
  ok: boolean;
  entitiesDetected: number;
  suspiciousPatternDetected: boolean;
  unredactedEntityDetected: boolean;
  offendingTypes: string[];
  offendingCounts: Record<string, number>;
};

function readUtf8(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function checkFile(relativePath: string): CheckResult {
  const absPath = path.join(process.cwd(), relativePath);
  const originalText = readUtf8(absPath);

  const entities = detectEntities(originalText);
  let redacted = redactText(originalText, entities);
  redacted = smartSkipPreamble(redacted).text;

  const suspicious = detectSuspiciousUnredactedPatterns(redacted);
  const unredacted = hasAnyUnredactedEntities(originalText, redacted, entities);
  const offendingCounts = getUnredactedEntityCounts(originalText, redacted, entities);

  const suspiciousPatternDetected = !suspicious.ok;
  const unredactedEntityDetected = !unredacted.ok;
  const offendingTypes = unredacted.offendingTypes;

  // Build the outbound request body (pretty) exactly like the app would (no network call)
  // NOTE: Do not print this body (it may contain sensitive fragments if a regression exists).
  const bodyPretty = buildAnalysisRequestBodyPretty(redacted, 'series');

  // Extra guard: ensure none of the raw entity values appear in the payload body.
  // Do NOT log values; only use for boolean checks.
  const rawEntityLeakedIntoPayload = entities.some(e => {
    const v = (e.value || '').trim();
    return v.length > 0 && bodyPretty.includes(v);
  });

  const ok = !suspiciousPatternDetected && !unredactedEntityDetected && !rawEntityLeakedIntoPayload;

  return {
    file: relativePath,
    ok,
    entitiesDetected: entities.length,
    suspiciousPatternDetected,
    unredactedEntityDetected: unredactedEntityDetected || rawEntityLeakedIntoPayload,
    offendingTypes,
    offendingCounts,
  };
}

function main(): void {
  const targets = [
    'demo/series-demo-contract-el.txt',
    'demo/series-privacy-test-A2.txt',
  ];

  const results = targets.map(checkFile);

  for (const r of results) {
    const status = r.ok ? 'PASS' : 'FAIL';
    // IMPORTANT: No raw content or entity values are printed.
    const types = r.offendingTypes.length > 0 ? `, offendingTypes: ${r.offendingTypes.join(',')}` : '';
    const counts = Object.entries(r.offendingCounts)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k}=${n}`)
      .join(', ');
    const countsText = counts ? `, offendingCounts: ${counts}` : '';
    console.log(`${status} ${r.file} (entities: ${r.entitiesDetected}, suspiciousPatterns: ${r.suspiciousPatternDetected ? 'yes' : 'no'}, unredactedLeak: ${r.unredactedEntityDetected ? 'yes' : 'no'}${types}${countsText})`);
  }

  const failed = results.filter(r => !r.ok);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
