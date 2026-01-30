/**
 * CI Field Labels Computation
 *
 * Recursively flattens all field name → label pairs from a CI shape hierarchy.
 * Used to produce the `fieldLabels` summary on CIShapeDefinition, enabling
 * O(1) label lookups without traversing the full shape tree.
 */

import type { CIShapeDefinition, CIShapeCollection } from './types.js';

/**
 * Compute a flat name → label map from a CI shape's hierarchical structure.
 *
 * Traverses level0Fields and all nested collections/sub-collections.
 * First occurrence wins — if a field name appears at multiple levels
 * (common in PeopleSoft CIs), the first-encountered label is used.
 *
 * @param shape - CI shape definition (without fieldLabels populated)
 * @returns Flat map of field names to their display labels
 */
export function computeFieldLabels(
  shape: Omit<CIShapeDefinition, 'fieldLabels'>
): Record<string, string> {
  const labels: Record<string, string> = {};

  for (const field of shape.level0Fields) {
    if (!(field.name in labels)) {
      labels[field.name] = field.label;
    }
  }

  function addCollection(collection: CIShapeCollection): void {
    for (const field of collection.fields) {
      if (!(field.name in labels)) {
        labels[field.name] = field.label;
      }
    }
    for (const sub of collection.subCollections) {
      addCollection(sub);
    }
  }

  for (const collection of shape.collections) {
    addCollection(collection);
  }

  return labels;
}
