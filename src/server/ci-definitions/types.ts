/**
 * CI Definitions Type System
 *
 * Types for the two-layer Component Interface system:
 *
 * Layer 1 — CI Shapes: PeopleSoft-defined field structures from GetCIShape.
 *   These are permanent reference data capturing the full CI hierarchy.
 *
 * Layer 2 — CI Usage Templates: Application-specific field subsets that map
 *   SQL query columns to CI submission payloads. Each template selects only
 *   the fields relevant to a particular operation.
 *
 * Additionally defines types for:
 * - Custom templates (user-created CI configurations saved as JSON)
 * - Parsed CI records (output from the delimited string parser)
 */

import type { ActionType } from '../../types/soap.js';

/* ==============================================
   Layer 1: CI Shape Types (PeopleSoft Definitions)
   ============================================== */

/**
 * PeopleSoft field type codes from GetCIShape responses.
 *
 * These numeric codes map to PeopleSoft's internal field type system:
 * - 0: Character (fixed-length string)
 * - 1: Long character (variable-length text, e.g., DESCRLONG)
 * - 2: Numeric (integer or decimal, fieldlength like "4.2" = 4 digits, 2 decimal)
 * - 3: Currency (decimal with precision, e.g., "15.3")
 * - 4: Date (always fieldlength=10, format DD-MMM-YYYY in Oracle)
 * - 5: Time
 * - 6: DateTime
 */
export type CIShapeFieldType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Human-readable labels for CI shape field types */
export const CI_SHAPE_FIELD_TYPE_LABELS: Record<CIShapeFieldType, string> = {
  0: 'Character',
  1: 'LongString',
  2: 'Numeric',
  3: 'Currency',
  4: 'Date',
  5: 'Time',
  6: 'DateTime',
} as const;

/**
 * Single field from a GetCIShape response.
 *
 * Each field element in the XML response is a self-closing tag with attributes:
 * <FIELD_NAME display="True" edit="True" fieldlength="10" fieldtype="0" ... />
 */
export interface CIShapeField {
  /** Field name (UPPER_SNAKE_CASE, e.g., "POSITION_NBR") */
  name: string;
  /** Whether field appears in the CI component UI */
  display: boolean;
  /** Whether field is editable via CI */
  edit: boolean;
  /** Maximum field length (string like "4.2" for numeric precision) */
  fieldLength: string;
  /** PeopleSoft field type code */
  fieldType: CIShapeFieldType;
  /** Whether this field is a key property */
  key: boolean;
  /** UI label from PeopleSoft (e.g., "Position Number") */
  label: string;
  /** Whether field is read-only */
  readOnly: boolean;
  /** Whether field is required for CI operations */
  required: boolean;
}

/**
 * A collection level in the CI hierarchy.
 *
 * PeopleSoft CIs organize data in hierarchical collections:
 * - Level 0: Root fields (key properties)
 * - Level 1: Primary effective-dated collections (e.g., POSITION_DATA)
 * - Level 2+: Sub-collections (e.g., DEPT_SUBCOM_BEL under DEPT_TBL)
 *
 * RecordTypeIdentifier encodes the level path, e.g.:
 * - "1-0-0" = first Level1 collection
 * - "1-1-0" = first Level2 under the first Level1
 */
export interface CIShapeCollection {
  /** Collection name (e.g., "POSITION_DATA", "DEPT_TBL") */
  name: string;
  /** Hierarchical identifier (e.g., "1-0-0", "1-1-0") */
  recordTypeIdentifier: string;
  /** Fields belonging to this collection level */
  fields: CIShapeField[];
  /** Nested sub-collections (Level 2+) */
  subCollections: CIShapeCollection[];
}

/**
 * Complete CI Shape definition — the full hierarchical structure
 * captured from a GetCIShape SOAP response.
 *
 * Stored as JSON files in `src/server/ci-definitions/shapes/`.
 */
export interface CIShapeDefinition {
  /** Component Interface name (e.g., "CI_POSITION_DATA") */
  ciName: string;
  /** Flat map of all field names → labels (computed from level0Fields + collections) */
  fieldLabels: Record<string, string>;
  /** CI description from PeopleSoft (may be empty) */
  description: string;
  /** Default action from the <action> element (e.g., "CREATE", "UPDATE") */
  defaultAction: string;
  /** ISO timestamp of when this shape was fetched/parsed */
  fetchedAt: string;
  /** How this shape was obtained */
  source: 'manual' | 'soap';
  /** Level 0 fields (root key/property fields) */
  level0Fields: CIShapeField[];
  /** Level 1+ hierarchical collections */
  collections: CIShapeCollection[];
}

/* ==============================================
   Layer 2: CI Usage Template Types
   ============================================== */

/** Oracle database storage type for field reference */
export type DBFieldType = 'VARCHAR2' | 'NUMBER' | 'DATE';

/**
 * Individual field in a CI usage template.
 *
 * Templates select a subset of the full CI shape fields and add
 * application-specific metadata like Oracle DB types and default values.
 */
export interface CITemplateField {
  /** Field name as it appears in the pipe-delimited string (e.g., "POSITION_NBR") */
  name: string;
  /** Oracle database storage type */
  dbType: DBFieldType;
  /** Max length (VARCHAR2) or precision (NUMBER) */
  maxLength: number;
  /** Whether this field is a key property in the CI */
  isKey: boolean;
  /** Whether this field always has data when the CI column is non-null */
  isRequired: boolean;
  /**
   * Fixed value if always the same (e.g., '00000000', 'A', 'NEW').
   * null if the value is dynamic (comes from the SQL query).
   */
  defaultValue: string | null;
}

/**
 * Complete CI usage template definition.
 *
 * Maps a SQL query column (e.g., 'POSITION_CREATE_CI') to a PeopleSoft CI,
 * specifying which fields are included and how they map to SOAP submissions.
 *
 * Each template is fully self-contained — no shared field arrays between
 * templates, even when field names overlap between CREATE and UPDATE.
 */
export interface CIUsageTemplate {
  /** SQL query column name (e.g., 'POSITION_CREATE_CI') */
  queryFieldName: string;
  /** PeopleSoft Component Interface name (e.g., 'CI_POSITION_DATA') */
  ciName: string;
  /** Allowed SOAP actions for this usage */
  allowedActions: readonly ActionType[];
  /** Default action when fixed (e.g., 'CREATE' for position creation) */
  defaultAction: ActionType;
  /** Whether the action is always the same for this template */
  actionIsFixed: boolean;
  /** Application-relevant fields (ordered as they appear in the delimited string) */
  fields: readonly CITemplateField[];
  /** Human-readable description of this template's purpose */
  description: string;
}

/* ==============================================
   Custom Template Types (User-Created)
   ============================================== */

/**
 * A field selected for a custom template.
 *
 * Custom templates allow users to pick fields from a CI shape
 * and configure them for their own submission workflows.
 */
export interface CustomTemplateField {
  /** Field name from the CI shape */
  name: string;
  /** PeopleSoft field type (from CI shape) */
  fieldType: CIShapeFieldType;
  /** Field length from CI shape */
  fieldLength: string;
  /** Display label (from CI shape or user-overridden) */
  label: string;
  /** Whether this field is a key in the CI */
  isKey: boolean;
  /** Whether this field is required in the CI */
  isRequired: boolean;
  /** Optional default value set by the user */
  defaultValue: string | null;
  /** Column display order in the editable table */
  displayOrder: number;
}

/**
 * A user-created custom template based on a Component Interface.
 *
 * Saved as individual JSON files in `src/server/ci-definitions/custom-templates/`.
 * File name is the template's UUID for collision-free storage.
 */
export interface CustomCITemplate {
  /** Unique identifier (UUID) */
  id: string;
  /** User-defined template name (e.g., "Quick Position Create") */
  name: string;
  /** PeopleSoft Component Interface name this template is based on */
  ciName: string;
  /** SOAP action type for this template */
  action: ActionType;
  /** Selected fields from the CI shape (user's field selection) */
  fields: CustomTemplateField[];
  /** When this template was first created (ISO timestamp) */
  createdAt: string;
  /** When this template was last modified (ISO timestamp) */
  modifiedAt: string;
  /** Optional description */
  description: string;
}

/** Lightweight metadata for listing custom templates without loading full field data */
export interface CustomTemplateMetadata {
  id: string;
  name: string;
  ciName: string;
  action: ActionType;
  fieldCount: number;
  createdAt: string;
  modifiedAt: string;
  description: string;
}

/* ==============================================
   Parser Types (Delimited String → Typed Records)
   ============================================== */

/**
 * Base interface for all parsed CI records.
 *
 * Every parsed record carries:
 * - transactionNbr: Links back to the parent SmartFormRecord
 * - action: The SOAP action extracted from the delimited string
 * - ciName: The CI name extracted from the delimited string
 */
export interface ParsedCIRecordBase {
  /** Links to the parent SmartFormRecord's TRANSACTION_NBR */
  transactionNbr: string;
  /** SOAP action extracted from the first pipe segment */
  action: ActionType;
  /** CI name extracted from the second pipe segment */
  ciName: string;
}

/** Parsed record from POSITION_CREATE_CI column (19 fields) */
export interface PositionCreateRecord extends ParsedCIRecordBase {
  POSITION_NBR: string;
  EFFDT: string;
  EFF_STATUS: string;
  ACTION_REASON: string;
  BUSINESS_UNIT: string;
  DEPTID: string;
  JOBCODE: string;
  MAX_HEAD_COUNT: string;
  UPDATE_INCUMBENTS: string;
  REPORTS_TO: string | null;
  LOCATION: string | null;
  MAIL_DROP: string | null;
  COMPANY: string;
  STD_HOURS: string | null;
  UNION_CD: string | null;
  SHIFT: string | null;
  REG_TEMP: string | null;
  FULL_PART_TIME: string | null;
  INCLUDE_TITLE: string | null;
}

/** Parsed record from POSITION_UPDATE_CI column (17 fields) */
export interface PositionUpdateRecord extends ParsedCIRecordBase {
  POSITION_NBR: string;
  EFFDT: string;
  EFF_STATUS: string;
  ACTION_REASON: string;
  UPDATE_INCUMBENTS: string;
  BUSINESS_UNIT: string;
  DEPTID: string;
  JOBCODE: string;
  REPORTS_TO: string | null;
  LOCATION: string | null;
  COMPANY: string;
  STD_HOURS: string | null;
  UNION_CD: string | null;
  SHIFT: string | null;
  REG_TEMP: string | null;
  FULL_PART_TIME: string | null;
  INCLUDE_TITLE: string | null;
}

/** Parsed record from JOB_UPDATE_CI column (5 fields) */
export interface JobUpdateRecord extends ParsedCIRecordBase {
  KEYPROP_EMPLID: string;
  KEYPROP_EMPL_RCD: string;
  KEYPROP_EFFDT: string;
  KEYPROP_EFFSEQ: string;
  PROP_POSITION_NBR: string;
}

/** Parsed record from DEPT_CO_UPDATE_CI column (4 fields) */
export interface DeptCoUpdateRecord extends ParsedCIRecordBase {
  SETID: string;
  DEPTID: string;
  EFFDT: string;
  COMPANY: string;
}

/**
 * Aggregated parsed CI data from all SmartForm records.
 *
 * Each array contains parsed records from the corresponding SQL column.
 * Records with null/empty CI columns are not included.
 */
export interface ParsedCIData {
  positionCreate: PositionCreateRecord[];
  positionUpdate: PositionUpdateRecord[];
  jobUpdate: JobUpdateRecord[];
  deptCoUpdate: DeptCoUpdateRecord[];
}

/** Empty ParsedCIData for initial state */
export const EMPTY_PARSED_CI_DATA: ParsedCIData = {
  positionCreate: [],
  positionUpdate: [],
  jobUpdate: [],
  deptCoUpdate: [],
} as const;

/* ==============================================
   Validation Types
   ============================================== */

/** Result from validating a custom template against its CI shape */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
