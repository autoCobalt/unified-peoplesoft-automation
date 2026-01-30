/**
 * CI Duplicate Detection
 *
 * Detects duplicate records in CI preview tables where all fields except
 * transactionNbr are identical. The first occurrence is kept; subsequent
 * duplicates are identified for exclusion from display, Excel export,
 * and SOAP submission.
 */

import type { ParsedCIRecordBase, CITemplateField } from '../server/ci-definitions/types';

/** Unit Separator — control character that won't collide with PeopleSoft field values */
const FINGERPRINT_DELIMITER = '\x1F';

/**
 * Build a fingerprint string from a parsed CI record.
 * Combines action + ciName + all template field values in order.
 */
function buildFingerprint(
  record: ParsedCIRecordBase,
  templateFields: readonly CITemplateField[],
): string {
  const parts = [record.action, record.ciName];
  const rec = record as unknown as Record<string, string | number | null>;
  for (const field of templateFields) {
    const value = rec[field.name];
    parts.push(value == null ? '' : String(value));
  }
  return parts.join(FINGERPRINT_DELIMITER);
}

/**
 * Find duplicate CI records by fingerprinting all fields except transactionNbr.
 *
 * Returns a Set of transactionNbr values for duplicate records (NOT including
 * the first occurrence of each fingerprint).
 */
export function findCIDuplicates(
  records: ParsedCIRecordBase[],
  templateFields: readonly CITemplateField[],
): Set<string> {
  const seen = new Map<string, string>();
  const duplicates = new Set<string>();

  for (const record of records) {
    const fingerprint = buildFingerprint(record, templateFields);
    if (seen.has(fingerprint)) {
      duplicates.add(record.transactionNbr);
    } else {
      seen.set(fingerprint, record.transactionNbr);
    }
  }

  return duplicates;
}

/**
 * Filter out duplicate CI records, keeping only the first occurrence
 * of each unique fingerprint.
 *
 * Convenience wrapper for Excel export and SOAP submission paths.
 */
export function filterCIDuplicates<T extends ParsedCIRecordBase>(
  records: T[],
  templateFields: readonly CITemplateField[],
): T[] {
  const duplicates = findCIDuplicates(records, templateFields);
  return records.filter(r => !duplicates.has(r.transactionNbr));
}
