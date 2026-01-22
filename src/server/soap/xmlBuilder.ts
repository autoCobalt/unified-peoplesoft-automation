/**
 * SOAP XML Builder
 *
 * Constructs SOAP request envelopes for PeopleSoft Component Interface operations.
 * Handles XML escaping, nested data structures, and CI-specific attributes.
 */

import type { ActionType, PeopleSoftConfig } from '../../types/soap.js';

/* ==============================================
   XML Escaping
   ============================================== */

/**
 * Escape special characters for XML content
 *
 * Handles:
 * - Standard XML entities (&, <, >, ", ')
 * - Semicolons (PeopleSoft-specific issue)
 * - Smart quotes (from Word copy/paste)
 */
export function escapeXML(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Handle primitive types safely; objects should not reach here
  // but if they do, stringify them for debugging
  const str = typeof value === 'object'
    ? JSON.stringify(value)
    : String(value as string | number | boolean);

  return str
    // Standard XML entities (order matters - & must be first!)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // PeopleSoft-specific: semicolons can cause parsing issues
    .replace(/;/g, '&#59;')
    // Smart quotes (curly quotes from Word)
    .replace(/\u2018/g, '&#8216;') // Left single quote
    .replace(/\u2019/g, '&#8217;') // Right single quote
    .replace(/\u201C/g, '&#8220;') // Left double quote
    .replace(/\u201D/g, '&#8221;'); // Right double quote
}

/* ==============================================
   Data to XML Conversion
   ============================================== */

/**
 * Recursively build XML from a nested data object
 *
 * Handles:
 * - Primitive values (strings, numbers, booleans)
 * - Nested objects (become child elements)
 * - Arrays (repeat the parent element for each item)
 * - Null/undefined (empty elements)
 *
 * @param data - Object to convert to XML
 * @param indent - Current indentation level
 * @returns XML string
 */
export function buildXMLFromData(
  data: Record<string, unknown>,
  indent: string = '      '
): string {
  let xml = '';

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      // Empty element for null/undefined
      xml += `${indent}<${key}></${key}>\n`;
    } else if (Array.isArray(value)) {
      // Arrays: repeat the element for each item
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          xml += `${indent}<${key}>\n`;
          xml += buildXMLFromData(item as Record<string, unknown>, indent + '  ');
          xml += `${indent}</${key}>\n`;
        } else {
          xml += `${indent}<${key}>${escapeXML(item)}</${key}>\n`;
        }
      }
    } else if (typeof value === 'object') {
      // Nested object: recurse
      xml += `${indent}<${key}>\n`;
      xml += buildXMLFromData(value as Record<string, unknown>, indent + '  ');
      xml += `${indent}</${key}>\n`;
    } else {
      // Primitive value
      xml += `${indent}<${key}>${escapeXML(value)}</${key}>\n`;
    }
  }

  return xml;
}

/* ==============================================
   CI Attribute Building
   ============================================== */

/**
 * Build Component Interface root element attributes
 *
 * @param config - PeopleSoft configuration
 * @returns Attribute string (e.g., ' debug="Y" preserveblanks="Y"')
 */
export function buildCIAttributes(config: PeopleSoftConfig): string {
  const attrs: string[] = [];

  if (config.debug) {
    attrs.push('debug="Y"');
  }
  if (config.preserveBlanks) {
    attrs.push('preserveblanks="Y"');
  }
  if (config.optionalKeys) {
    attrs.push('optionalKeys="Y"');
  }

  return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
}

/* ==============================================
   SOAP Request Builders
   ============================================== */

/**
 * Build GetCIShape SOAP request envelope
 *
 * GetCIShape retrieves the structure of a Component Interface
 * without modifying any data. Useful for:
 * - Discovering available fields
 * - Validating CI exists and is accessible
 * - Testing authentication
 *
 * @param ciName - Component Interface name (e.g., 'CI_JOB_DATA')
 * @param debug - Whether to include debug attribute
 */
export function buildGetCIShapeRequest(ciName: string, debug: boolean = true): string {
  const debugAttr = debug ? ' debug="Y"' : '';

  return `<?xml version="1.0"?>
<SOAP-ENV:Envelope
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SOAP-ENV:Body>
    <GetCIShape__CompIntfc__${ciName}${debugAttr}/>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

/**
 * Build SubmitToDB SOAP request for a single record
 *
 * @param ciName - Component Interface name
 * @param action - Action type (CREATE, UPDATE, UPDATEDATA)
 * @param data - Data object to submit
 * @param config - PeopleSoft configuration
 */
export function buildSubmitRequest(
  ciName: string,
  action: ActionType,
  data: Record<string, unknown>,
  config: PeopleSoftConfig
): string {
  const attrs = buildCIAttributes(config);
  const rootTag = `${action}__CompIntfc__${ciName}`;
  const xmlBody = buildXMLFromData(data);

  return `<?xml version="1.0"?>
<SOAP-ENV:Envelope
    xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <${rootTag}${attrs}>
${xmlBody}    </${rootTag}>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

/**
 * Build SubmitToDB SOAP request for multiple records
 *
 * PeopleSoft allows batching multiple records in a single request.
 * Each record becomes a separate root element in the body.
 *
 * @param ciName - Component Interface name
 * @param action - Action type
 * @param records - Array of data objects
 * @param config - PeopleSoft configuration
 */
export function buildMultiRecordSubmitRequest(
  ciName: string,
  action: ActionType,
  records: Record<string, unknown>[],
  config: PeopleSoftConfig
): string {
  const attrs = buildCIAttributes(config);
  const rootTag = `${action}__CompIntfc__${ciName}`;

  const recordElements = records.map(record => {
    const xmlBody = buildXMLFromData(record);
    return `    <${rootTag}${attrs}>\n${xmlBody}    </${rootTag}>`;
  }).join('\n');

  return `<?xml version="1.0"?>
<SOAP-ENV:Envelope
    xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
${recordElements}
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}
