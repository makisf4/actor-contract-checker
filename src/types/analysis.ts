import { z } from 'zod';

/**
 * v1 analysis summary is a key-value record by SummaryFieldId.
 * Value can be string or null (unknown/missing).
 */
export const SummaryRecordSchema = z.record(
  z.string(),
  z.union([z.string(), z.null()])
);

export type SummaryRecord = z.infer<typeof SummaryRecordSchema>;
