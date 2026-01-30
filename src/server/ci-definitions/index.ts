/**
 * CI Definitions Module
 *
 * Central export for the Component Interface definitions system:
 *
 * - Types: Shape, template, custom template, and parser type definitions
 * - Shapes: PeopleSoft CI structure definitions (JSON files parsed from GetCIShape)
 * - Templates: Application-specific CI usage templates per tab
 * - Parser: Delimited string → typed record converter
 * - Shape Parser: GetCIShape XML → JSON parser
 *
 * Architecture:
 *   shapes/           → Shared PeopleSoft CI definitions (tab-agnostic)
 *   templates/         → Hard-coded system templates organized by tab
 *     smartform/       → SmartForm tab's 4 CI templates
 *   custom-templates/  → User-created template JSON files (runtime, shared)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { CIShapeDefinition } from './types.js';

/* ==============================================
   Shape Loader
   ============================================== */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHAPES_DIR = path.join(__dirname, 'shapes');

/**
 * Load a CI shape definition by CI name.
 *
 * Reads from the JSON files in the shapes/ directory.
 * Returns null if the shape file doesn't exist.
 *
 * @param ciName - Component Interface name (e.g., 'CI_POSITION_DATA')
 * @returns The parsed shape definition, or null if not found
 */
export function loadCIShape(ciName: string): CIShapeDefinition | null {
  const filePath = path.join(SHAPES_DIR, `${ciName}.json`);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as CIShapeDefinition;
  } catch {
    return null;
  }
}

/**
 * List all available CI shape names.
 *
 * Scans the shapes/ directory for .json files and returns their names
 * (without extension), which correspond to CI names.
 *
 * @returns Array of CI names (e.g., ['CI_POSITION_DATA', 'CI_JOB_DATA', 'DEPARTMENT_TBL'])
 */
export function listCIShapes(): string[] {
  try {
    return fs.readdirSync(SHAPES_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}

/**
 * Save a CI shape definition to the shapes/ directory.
 *
 * @param shape - The shape definition to save
 */
export function saveCIShape(shape: CIShapeDefinition): void {
  const filePath = path.join(SHAPES_DIR, `${shape.ciName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(shape, null, 2));
}

/* ==============================================
   Re-exports
   ============================================== */

// Types
export type {
  CIShapeFieldType,
  CIShapeField,
  CIShapeCollection,
  CIShapeDefinition,
  DBFieldType,
  CITemplateField,
  CIUsageTemplate,
  CustomTemplateField,
  CustomCITemplate,
  CustomTemplateMetadata,
  ParsedCIRecordBase,
  PositionCreateRecord,
  PositionUpdateRecord,
  JobUpdateRecord,
  DeptCoUpdateRecord,
  ParsedCIData,
  ValidationResult,
} from './types.js';

export { EMPTY_PARSED_CI_DATA, CI_SHAPE_FIELD_TYPE_LABELS } from './types.js';

// SmartForm template registry
export {
  CI_TEMPLATE_REGISTRY,
  CI_FIELD_NAMES,
  POSITION_CREATE_CI_TEMPLATE,
  POSITION_UPDATE_CI_TEMPLATE,
  JOB_UPDATE_CI_TEMPLATE,
  DEPT_CO_UPDATE_CI_TEMPLATE,
} from './templates/smartform/index.js';

export type { CIFieldName } from './templates/smartform/index.js';

// Parser
export { parseCIDataFromRecords, buildSOAPPayload } from './parser.js';

// Shape parser
export { parseCIShapeXML } from './ciShapeParser.js';

// Label computation
export { computeFieldLabels } from './computeFieldLabels.js';
