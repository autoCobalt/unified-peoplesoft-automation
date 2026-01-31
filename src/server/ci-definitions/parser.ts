/**
 * CI Delimited String Parser
 *
 * Parses pipe-delimited CI strings from Oracle SQL query results into
 * typed record objects. The SQL query builds strings in this format:
 *
 *   ACTION|CI_NAME|FIELD1:VALUE1|FIELD2:VALUE2|...
 *
 * Example:
 *   CREATE|CI_POSITION_DATA|POSITION_NBR:00000000|EFFDT:25-FEB-26|EFF_STATUS:A|...
 *
 * The parser:
 * 1. Splits on pipe delimiters
 * 2. Extracts action (segment 0) and CI name (segment 1)
 * 3. Parses remaining KEY:VALUE pairs into a field map
 * 4. Converts to strongly-typed record interfaces
 *
 * Also provides batch parsing for processing all CI columns from SmartForm records.
 */

import type { ActionType } from '../../types/soap.js';
import type {
  ParsedCIData,
  PositionCreateRecord,
  PositionUpdateRecord,
  JobUpdateRecord,
  DeptCoUpdateRecord,
} from './types.js';
import { EMPTY_PARSED_CI_DATA } from './types.js';

/* ==============================================
   Generic Parsed Record
   ============================================== */

/**
 * Generic parsed CI record before type conversion.
 * Contains the action, CI name, and a field map from KEY:VALUE parsing.
 */
interface GenericParsedRecord {
  transactionNbr: string;
  action: string;
  ciName: string;
  fields: Map<string, string>;
}

/* ==============================================
   Core Parser
   ============================================== */

/** Valid SOAP action strings */
const VALID_ACTIONS = new Set<string>(['CREATE', 'UPDATE', 'UPDATEDATA']);

/**
 * Parse a pipe-delimited CI string into a generic record.
 *
 * @param ciString - The raw pipe-delimited string (e.g., "CREATE|CI_POSITION_DATA|FIELD:VALUE|...")
 * @param transactionNbr - The parent SmartFormRecord's TRANSACTION_NBR for linking
 * @returns Parsed generic record, or null if the string is empty/invalid
 */
function parseGenericCIRecord(
  ciString: string | null | undefined,
  transactionNbr: string
): GenericParsedRecord | null {
  if (!ciString || typeof ciString !== 'string' || ciString.trim() === '') {
    return null;
  }

  const segments = ciString.split('|');

  // Need at least action and CI name
  if (segments.length < 2) {
    return null;
  }

  const action = segments[0].trim();
  const ciName = segments[1].trim();

  if (!action || !ciName) {
    return null;
  }

  // Parse remaining KEY:VALUE pairs
  const fields = new Map<string, string>();
  for (let i = 2; i < segments.length; i++) {
    const segment = segments[i];
    const colonIndex = segment.indexOf(':');
    if (colonIndex > 0) {
      const key = segment.substring(0, colonIndex).trim();
      const value = segment.substring(colonIndex + 1).trim();
      fields.set(key, value);
    }
  }

  return { transactionNbr, action, ciName, fields };
}

/* ==============================================
   Helper: Extract Field Value
   ============================================== */

/** Extract a field value from the map, returning null if not present or empty */
function getField(fields: Map<string, string>, name: string): string | null {
  const val = fields.get(name);
  if (val === undefined || val === '') return null;
  return val;
}

/** Extract a required field, falling back to empty string if missing */
function getRequiredField(fields: Map<string, string>, name: string): string {
  return fields.get(name) ?? '';
}

/** Validate and cast action string to ActionType */
function toActionType(action: string): ActionType {
  if (VALID_ACTIONS.has(action)) {
    return action as ActionType;
  }
  // Default to UPDATEDATA for unrecognized actions (safest — doesn't auto-save)
  return 'UPDATEDATA';
}

/* ==============================================
   Typed Record Converters
   ============================================== */

/** Convert generic record → PositionCreateRecord */
function toPositionCreateRecord(record: GenericParsedRecord): PositionCreateRecord {
  const { fields } = record;
  return {
    transactionNbr: record.transactionNbr,
    action: toActionType(record.action),
    ciName: record.ciName,
    POSITION_NBR:     getRequiredField(fields, 'POSITION_NBR'),
    EFFDT:            getRequiredField(fields, 'EFFDT'),
    EFF_STATUS:       getRequiredField(fields, 'EFF_STATUS'),
    ACTION_REASON:    getRequiredField(fields, 'ACTION_REASON'),
    BUSINESS_UNIT:    getRequiredField(fields, 'BUSINESS_UNIT'),
    DEPTID:           getRequiredField(fields, 'DEPTID'),
    JOBCODE:          getRequiredField(fields, 'JOBCODE'),
    MAX_HEAD_COUNT:   getRequiredField(fields, 'MAX_HEAD_COUNT'),
    UPDATE_INCUMBENTS: getRequiredField(fields, 'UPDATE_INCUMBENTS'),
    REPORTS_TO:       getField(fields, 'REPORTS_TO'),
    LOCATION:         getField(fields, 'LOCATION'),
    MAIL_DROP:        getField(fields, 'MAIL_DROP'),
    COMPANY:          getRequiredField(fields, 'COMPANY'),
    STD_HOURS:        getField(fields, 'STD_HOURS'),
    UNION_CD:         getField(fields, 'UNION_CD'),
    SHIFT:            getField(fields, 'SHIFT'),
    REG_TEMP:         getField(fields, 'REG_TEMP'),
    FULL_PART_TIME:   getField(fields, 'FULL_PART_TIME'),
    INCLUDE_TITLE:    getField(fields, 'INCLUDE_TITLE'),
  };
}

/** Convert generic record → PositionUpdateRecord */
function toPositionUpdateRecord(record: GenericParsedRecord): PositionUpdateRecord {
  const { fields } = record;
  return {
    transactionNbr: record.transactionNbr,
    action: toActionType(record.action),
    ciName: record.ciName,
    POSITION_NBR:     getRequiredField(fields, 'POSITION_NBR'),
    EFFDT:            getRequiredField(fields, 'EFFDT'),
    EFF_STATUS:       getRequiredField(fields, 'EFF_STATUS'),
    ACTION_REASON:    getRequiredField(fields, 'ACTION_REASON'),
    UPDATE_INCUMBENTS: getRequiredField(fields, 'UPDATE_INCUMBENTS'),
    BUSINESS_UNIT:    getRequiredField(fields, 'BUSINESS_UNIT'),
    DEPTID:           getRequiredField(fields, 'DEPTID'),
    JOBCODE:          getRequiredField(fields, 'JOBCODE'),
    REPORTS_TO:       getField(fields, 'REPORTS_TO'),
    LOCATION:         getField(fields, 'LOCATION'),
    COMPANY:          getRequiredField(fields, 'COMPANY'),
    STD_HOURS:        getField(fields, 'STD_HOURS'),
    UNION_CD:         getField(fields, 'UNION_CD'),
    SHIFT:            getField(fields, 'SHIFT'),
    REG_TEMP:         getField(fields, 'REG_TEMP'),
    FULL_PART_TIME:   getField(fields, 'FULL_PART_TIME'),
    INCLUDE_TITLE:    getField(fields, 'INCLUDE_TITLE'),
  };
}

/** Convert generic record → JobUpdateRecord */
function toJobUpdateRecord(record: GenericParsedRecord): JobUpdateRecord {
  const { fields } = record;
  return {
    transactionNbr: record.transactionNbr,
    action: toActionType(record.action),
    ciName: record.ciName,
    KEYPROP_EMPLID:      getRequiredField(fields, 'KEYPROP_EMPLID'),
    KEYPROP_EMPL_RCD:    getRequiredField(fields, 'KEYPROP_EMPL_RCD'),
    KEYPROP_EFFDT:       getRequiredField(fields, 'KEYPROP_EFFDT'),
    KEYPROP_EFFSEQ:      getRequiredField(fields, 'KEYPROP_EFFSEQ'),
    PROP_POSITION_NBR:   getRequiredField(fields, 'PROP_POSITION_NBR'),
  };
}

/** Convert generic record → DeptCoUpdateRecord */
function toDeptCoUpdateRecord(record: GenericParsedRecord): DeptCoUpdateRecord {
  const { fields } = record;
  return {
    transactionNbr: record.transactionNbr,
    action: toActionType(record.action),
    ciName: record.ciName,
    SETID:   getRequiredField(fields, 'SETID'),
    DEPTID:  getRequiredField(fields, 'DEPTID'),
    EFFDT:   getRequiredField(fields, 'EFFDT'),
    COMPANY: getRequiredField(fields, 'COMPANY'),
  };
}

/* ==============================================
   Batch Parser
   ============================================== */

/**
 * SmartFormRecord shape expected by the parser.
 * Uses unknown values because Oracle returns dynamic columns.
 */
interface SmartFormRecordLike {
  TRANSACTION_NBR: string;
  [key: string]: unknown;
}

/**
 * Parse all CI data from an array of SmartForm records.
 *
 * Iterates each record, parses each CI column using the corresponding
 * template from CI_TEMPLATE_REGISTRY, and aggregates results into
 * typed arrays grouped by CI column.
 *
 * Records with null/empty CI columns are silently skipped (no error).
 * Each parsed record includes the transactionNbr for linking back to
 * the parent SmartFormRecord (enables checkbox-based filtering).
 *
 * @param records - SmartForm transaction records from Oracle query
 * @returns Aggregated parsed CI data with typed arrays
 */
export function parseCIDataFromRecords(records: SmartFormRecordLike[]): ParsedCIData {
  const result: ParsedCIData = {
    positionCreate: [],
    positionUpdate: [],
    jobUpdate: [],
    deptCoUpdate: [],
  };

  for (const record of records) {
    const txnNbr = record.TRANSACTION_NBR;

    // Parse POSITION_CREATE_CI
    const posCreateParsed = parseGenericCIRecord(
      record['POSITION_CREATE_CI'] as string | null | undefined,
      txnNbr
    );
    if (posCreateParsed) {
      result.positionCreate.push(toPositionCreateRecord(posCreateParsed));
    }

    // Parse POSITION_UPDATE_CI
    const posUpdateParsed = parseGenericCIRecord(
      record['POSITION_UPDATE_CI'] as string | null | undefined,
      txnNbr
    );
    if (posUpdateParsed) {
      result.positionUpdate.push(toPositionUpdateRecord(posUpdateParsed));
    }

    // Parse JOB_UPDATE_CI
    const jobUpdateParsed = parseGenericCIRecord(
      record['JOB_UPDATE_CI'] as string | null | undefined,
      txnNbr
    );
    if (jobUpdateParsed) {
      result.jobUpdate.push(toJobUpdateRecord(jobUpdateParsed));
    }

    // Parse DEPT_CO_UPDATE_CI
    const deptCoParsed = parseGenericCIRecord(
      record['DEPT_CO_UPDATE_CI'] as string | null | undefined,
      txnNbr
    );
    if (deptCoParsed) {
      result.deptCoUpdate.push(toDeptCoUpdateRecord(deptCoParsed));
    }
  }

  return result;
}

/* ==============================================
   SOAP Payload Builder
   ============================================== */

/**
 * Build a SOAP-ready payload from a parsed CI record.
 *
 * Converts a typed record's fields into a flat key-value object suitable
 * for the xmlBuilder.buildSubmitRequest() function.
 *
 * @param record - A typed parsed CI record (any of the 4 types)
 * @param templateFields - The template's field definitions
 * @returns Record suitable for SOAP XML submission
 */
export function buildSOAPPayload(
  record: object,
  templateFields: readonly { name: string }[]
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const source = record as Record<string, unknown>;

  for (const field of templateFields) {
    const value = source[field.name];
    if (value !== null && value !== undefined) {
      payload[field.name] = value;
    }
  }

  return payload;
}

/* ==============================================
   Re-exports for convenience
   ============================================== */

export { EMPTY_PARSED_CI_DATA };
