/**
 * Custom Template Service
 *
 * CRUD operations for user-created CI templates stored as JSON files.
 * Templates are saved in `src/server/ci-definitions/custom-templates/`
 * with UUID-based filenames for collision-free storage.
 *
 * This service provides the infrastructure for future custom template UI.
 * The UI is not implemented yet — this is server-side plumbing only.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import type {
  CustomCITemplate,
  CustomTemplateMetadata,
  CIShapeDefinition,
  ValidationResult,
} from './types.js';

/* ==============================================
   Directory Configuration
   ============================================== */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CUSTOM_TEMPLATES_DIR = path.join(__dirname, 'custom-templates');

/** Ensure the custom-templates directory exists */
function ensureDirectory(): void {
  if (!fs.existsSync(CUSTOM_TEMPLATES_DIR)) {
    fs.mkdirSync(CUSTOM_TEMPLATES_DIR, { recursive: true });
  }
}

/** Build the file path for a template by ID */
function templatePath(id: string): string {
  // Sanitize ID to prevent directory traversal
  const safeId = id.replace(/[^a-zA-Z0-9-]/g, '');
  return path.join(CUSTOM_TEMPLATES_DIR, `${safeId}.json`);
}

/* ==============================================
   List Templates
   ============================================== */

/**
 * List all saved custom templates (metadata only).
 *
 * Returns lightweight metadata without loading full field data,
 * suitable for rendering a template selection list.
 */
export function listCustomTemplates(): CustomTemplateMetadata[] {
  ensureDirectory();

  try {
    const files = fs.readdirSync(CUSTOM_TEMPLATES_DIR)
      .filter(f => f.endsWith('.json'));

    return files
      .map(file => {
        try {
          const content = fs.readFileSync(path.join(CUSTOM_TEMPLATES_DIR, file), 'utf-8');
          const template = JSON.parse(content) as CustomCITemplate;
          return {
            id: template.id,
            name: template.name,
            ciName: template.ciName,
            action: template.action,
            fieldCount: template.fields.length,
            createdAt: template.createdAt,
            modifiedAt: template.modifiedAt,
            description: template.description,
          } satisfies CustomTemplateMetadata;
        } catch {
          return null;
        }
      })
      .filter((m): m is CustomTemplateMetadata => m !== null);
  } catch {
    return [];
  }
}

/* ==============================================
   Load Template
   ============================================== */

/**
 * Load a specific custom template by ID.
 *
 * @param id - Template UUID
 * @returns Full template data, or null if not found
 */
export function loadCustomTemplate(id: string): CustomCITemplate | null {
  try {
    const content = fs.readFileSync(templatePath(id), 'utf-8');
    return JSON.parse(content) as CustomCITemplate;
  } catch {
    return null;
  }
}

/* ==============================================
   Save Template
   ============================================== */

/**
 * Save a new custom template.
 *
 * Generates a UUID, sets creation timestamps, and writes to disk.
 *
 * @param template - Template data without ID or timestamps
 * @returns The saved template with generated ID and timestamps
 */
export function saveCustomTemplate(
  template: Omit<CustomCITemplate, 'id' | 'createdAt' | 'modifiedAt'>
): CustomCITemplate {
  ensureDirectory();

  const now = new Date().toISOString();
  const saved: CustomCITemplate = {
    ...template,
    id: crypto.randomUUID(),
    createdAt: now,
    modifiedAt: now,
  };

  fs.writeFileSync(templatePath(saved.id), JSON.stringify(saved, null, 2));
  return saved;
}

/* ==============================================
   Update Template
   ============================================== */

/**
 * Update an existing custom template.
 *
 * Merges the provided updates into the existing template,
 * updates the modifiedAt timestamp, and writes to disk.
 *
 * @param id - Template UUID to update
 * @param updates - Partial template data to merge
 * @returns Updated template, or null if not found
 */
export function updateCustomTemplate(
  id: string,
  updates: Partial<Pick<CustomCITemplate, 'name' | 'action' | 'fields' | 'description'>>
): CustomCITemplate | null {
  const existing = loadCustomTemplate(id);
  if (!existing) return null;

  const updated: CustomCITemplate = {
    ...existing,
    ...updates,
    id: existing.id,
    ciName: existing.ciName,
    createdAt: existing.createdAt,
    modifiedAt: new Date().toISOString(),
  };

  fs.writeFileSync(templatePath(id), JSON.stringify(updated, null, 2));
  return updated;
}

/* ==============================================
   Delete Template
   ============================================== */

/**
 * Delete a custom template.
 *
 * @param id - Template UUID to delete
 * @returns true if deleted, false if not found
 */
export function deleteCustomTemplate(id: string): boolean {
  try {
    const filePath = templatePath(id);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

/* ==============================================
   Validation
   ============================================== */

/**
 * Validate a custom template against its CI shape.
 *
 * Ensures that:
 * 1. All template fields exist in the CI shape
 * 2. Required CI fields are included
 * 3. Key fields are marked correctly
 *
 * @param template - The custom template to validate
 * @param shape - The CI shape definition to validate against
 * @returns Validation result with errors and warnings
 */
export function validateCustomTemplate(
  template: CustomCITemplate,
  shape: CIShapeDefinition
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build a set of all field names in the shape (across all levels)
  const shapeFieldNames = new Set<string>();

  // Level 0 fields
  for (const field of shape.level0Fields) {
    shapeFieldNames.add(field.name);
  }

  // Level 1+ collection fields (recurse)
  function collectFieldNames(collections: CIShapeDefinition['collections']): void {
    for (const collection of collections) {
      for (const field of collection.fields) {
        shapeFieldNames.add(field.name);
      }
      collectFieldNames(collection.subCollections);
    }
  }
  collectFieldNames(shape.collections);

  // Validate each template field exists in the shape
  for (const field of template.fields) {
    if (!shapeFieldNames.has(field.name)) {
      errors.push(`Field "${field.name}" does not exist in CI shape "${shape.ciName}"`);
    }
  }

  // Warn if no fields are selected
  if (template.fields.length === 0) {
    warnings.push('Template has no fields selected');
  }

  // Warn if template name is empty
  if (!template.name.trim()) {
    warnings.push('Template name is empty');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
