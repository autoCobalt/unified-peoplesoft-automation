/**
 * CI Shape XML Parser
 *
 * Converts GetCIShape SOAP response XML into structured CIShapeDefinition JSON.
 *
 * PeopleSoft GetCIShape responses use a hierarchical XML structure:
 *   <Level0-Collection>
 *     <FIELD_NAME display="True" edit="True" ... />     ← self-closing field elements
 *     <Level1-Collection name="RECORD" RecordTypeIdentifier="1-0-0">
 *       <FIELD_NAME ... />                               ← collection fields
 *       <Level2-Collection name="SUB_RECORD" RecordTypeIdentifier="1-1-0">
 *         ...                                            ← nested sub-collections
 *       </Level2-Collection>
 *     </Level1-Collection>
 *   </Level0-Collection>
 *
 * The parser distinguishes field elements (self-closing tags with known attributes
 * like 'fieldtype') from collection elements (tags starting with 'Level').
 *
 * Uses xml2js which is already a project dependency for SOAP response parsing.
 */

import { parseStringPromise, type ParserOptions } from 'xml2js';
import type {
  CIShapeDefinition,
  CIShapeField,
  CIShapeFieldType,
  CIShapeCollection,
} from './types.js';
import { computeFieldLabels } from './computeFieldLabels.js';

/* ==============================================
   XML Parser Configuration
   ============================================== */

const XML2JS_OPTIONS: ParserOptions = {
  explicitArray: false,
  mergeAttrs: false,
  trim: true,
  normalizeTags: false,
};

/* ==============================================
   Field Parsing
   ============================================== */

/** Attribute names that identify a field element (vs. a collection) */
const FIELD_INDICATOR_ATTRS = ['fieldtype', 'fieldlength', 'display', 'edit'];

/**
 * Check if a parsed XML element represents a CI field.
 * Fields are self-closing tags with attributes like fieldtype, fieldlength, etc.
 * Collections are nested elements starting with "Level".
 */
function isFieldElement(key: string, value: unknown): boolean {
  if (key.startsWith('Level')) return false;
  if (typeof value !== 'object' || value === null) return false;

  // Handle arrays (duplicate field names like two POSITION_NBR entries) — check first element
  const target = Array.isArray(value) ? (value[0] as unknown) : value;
  if (typeof target !== 'object' || target === null) return false;

  // Field elements have a $ (attributes) property from xml2js
  const attrs = (target as Record<string, unknown>)['$'] as Record<string, unknown> | undefined;
  if (!attrs) return false;

  return FIELD_INDICATOR_ATTRS.some(attr => attr in attrs);
}

/**
 * Parse a single field element's attributes into a CIShapeField.
 *
 * xml2js with mergeAttrs=false puts attributes under a '$' key:
 * { $: { display: "True", edit: "False", fieldlength: "8", fieldtype: "0", ... } }
 */
function parseField(name: string, attrs: Record<string, string>): CIShapeField {
  return {
    name,
    display: attrs['display'] === 'True',
    edit: attrs['edit'] === 'True',
    fieldLength: attrs['fieldlength'] ?? '0',
    fieldType: Number(attrs['fieldtype'] ?? '0') as CIShapeFieldType,
    key: attrs['key'] === 'True',
    label: attrs['label'] ?? name,
    readOnly: attrs['readonly'] === 'True',
    required: attrs['required'] === 'True',
  };
}

/* ==============================================
   Collection Parsing
   ============================================== */

/**
 * Parse a Level collection element into a CIShapeCollection.
 *
 * Collections contain a mix of field elements and nested sub-collections.
 * The parser recurses for any nested Level*-Collection elements.
 */
function parseCollection(element: Record<string, unknown>): CIShapeCollection {
  const attrs = (element['$'] ?? {}) as Record<string, string>;
  const name = attrs['name'] ?? '';
  const recordTypeIdentifier = attrs['RecordTypeIdentifier'] ?? '';

  const fields: CIShapeField[] = [];
  const subCollections: CIShapeCollection[] = [];

  for (const [key, value] of Object.entries(element)) {
    if (key === '$') continue;

    if (key.startsWith('Level')) {
      // This is a sub-collection — handle single or array
      const items = Array.isArray(value) ? value : [value];
      for (const item of items) {
        if (typeof item === 'object' && item !== null) {
          subCollections.push(parseCollection(item as Record<string, unknown>));
        }
      }
    } else if (isFieldElement(key, value)) {
      // This is a field element — handle duplicates (some CIs have duplicate field names)
      const items = Array.isArray(value) ? value : [value];
      for (const item of items) {
        const fieldAttrs = (item as Record<string, unknown>)['$'] as Record<string, string> | undefined;
        if (fieldAttrs) {
          fields.push(parseField(key, fieldAttrs));
        }
      }
    }
  }

  return { name, recordTypeIdentifier, fields, subCollections };
}

/* ==============================================
   Main Parser
   ============================================== */

/**
 * Extract the actual SOAP XML from a response that may have comment headers.
 *
 * Response files from docs/SOAP_Exploration/ have comment headers before the XML:
 *   <?xml version="1.0" encoding="UTF-8"?>
 *   <!-- comments -->
 *   <?xml version="1.0"?>
 *   <SOAP-ENV:Envelope>...
 *
 * We need to extract starting from the SOAP envelope.
 */
function extractSoapXml(rawContent: string): string {
  const envelopeStart = rawContent.indexOf('<SOAP-ENV:Envelope');
  if (envelopeStart === -1) {
    // Try lowercase variant
    const lowercaseStart = rawContent.indexOf('<soap-env:Envelope');
    if (lowercaseStart === -1) {
      throw new Error('No SOAP Envelope found in XML content');
    }
    return rawContent.substring(lowercaseStart);
  }
  return rawContent.substring(envelopeStart);
}

/**
 * Parse a GetCIShape XML response into a structured CIShapeDefinition.
 *
 * Accepts either:
 * - Raw SOAP XML (from a live GetCIShape response)
 * - File content with comment headers (from docs/SOAP_Exploration/ .txt files)
 *
 * @param xmlString - Full XML content (may include comment headers)
 * @param source - How this shape was obtained ('manual' for file parsing, 'soap' for live fetch)
 * @returns Structured CI shape definition
 */
export async function parseCIShapeXML(
  xmlString: string,
  source: 'manual' | 'soap' = 'manual'
): Promise<CIShapeDefinition> {
  // Extract the SOAP XML portion
  const soapXml = extractSoapXml(xmlString);

  // Parse XML to JavaScript object
  const parsed = await parseStringPromise(soapXml, XML2JS_OPTIONS) as Record<string, unknown>;

  // Navigate to the response body
  const envelope = parsed['SOAP-ENV:Envelope'] as Record<string, unknown> | undefined;
  if (!envelope) {
    throw new Error('Missing SOAP-ENV:Envelope element');
  }

  const body = envelope['SOAP-ENV:Body'] as Record<string, unknown> | undefined;
  if (!body) {
    throw new Error('Missing SOAP-ENV:Body element');
  }

  // Find the GetCIShape response element (dynamic key based on CI name)
  // Pattern: Getcishape__CompIntfc__[CI_NAME]Response
  const responseKey = Object.keys(body).find(k =>
    k.startsWith('Getcishape__CompIntfc__') && k.endsWith('Response')
  );

  if (!responseKey) {
    throw new Error('No GetCIShape response element found in SOAP body');
  }

  const response = body[responseKey] as Record<string, unknown>;

  // Extract top-level metadata (xml2js may return strings or empty objects for empty elements)
  const rawName = response['name'];
  const rawDesc = response['description'];
  const rawAction = response['action'];
  const ciName = typeof rawName === 'string' ? rawName : '';
  const description = typeof rawDesc === 'string' ? rawDesc : '';
  const defaultAction = typeof rawAction === 'string' ? rawAction : 'CREATE';

  // Parse Level0-Collection
  const level0 = response['Level0-Collection'] as Record<string, unknown> | undefined;
  if (!level0) {
    throw new Error('No Level0-Collection found in response');
  }

  const level0Fields: CIShapeField[] = [];
  const collections: CIShapeCollection[] = [];

  for (const [key, value] of Object.entries(level0)) {
    if (key === '$') continue;

    if (key.startsWith('Level')) {
      // Level1+ collection
      const items = Array.isArray(value) ? value : [value];
      for (const item of items) {
        if (typeof item === 'object' && item !== null) {
          collections.push(parseCollection(item as Record<string, unknown>));
        }
      }
    } else if (isFieldElement(key, value)) {
      // Root-level field
      const items = Array.isArray(value) ? value : [value];
      for (const item of items) {
        const fieldAttrs = (item as Record<string, unknown>)['$'] as Record<string, string> | undefined;
        if (fieldAttrs) {
          level0Fields.push(parseField(key, fieldAttrs));
        }
      }
    }
  }

  const shapeWithoutLabels = {
    ciName,
    description,
    defaultAction,
    fetchedAt: new Date().toISOString(),
    source,
    level0Fields,
    collections,
  };

  return {
    ...shapeWithoutLabels,
    fieldLabels: computeFieldLabels(shapeWithoutLabels),
  };
}
