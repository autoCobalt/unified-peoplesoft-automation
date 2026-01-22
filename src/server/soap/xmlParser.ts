/**
 * SOAP XML Parser
 *
 * Parses SOAP response XML from PeopleSoft into typed response objects.
 * Uses xml2js for XML parsing with PeopleSoft-specific handling.
 */

import { parseStringPromise } from 'xml2js';
import type { SOAPResponse, Transaction, TransactionType } from '../../types/soap.js';

/* ==============================================
   Valid Transaction Types
   ============================================== */

const VALID_TRANSACTION_TYPES: readonly TransactionType[] = [
  'OK',
  'Warning',
  'Error',
  'Unknown',
];

/**
 * Type guard to check if a string is a valid TransactionType
 */
function isValidTransactionType(type: string): type is TransactionType {
  return VALID_TRANSACTION_TYPES.includes(type as TransactionType);
}

/* ==============================================
   Envelope Extraction Helpers
   ============================================== */

/**
 * Find the SOAP envelope in parsed XML
 *
 * Different SOAP implementations use different namespace prefixes:
 * - Envelope
 * - SOAP-ENV:Envelope
 * - soapenv:Envelope
 */
function findEnvelope(parsed: Record<string, unknown>): Record<string, unknown> | null {
  // Try common envelope keys
  const envelopeKeys = ['Envelope', 'SOAP-ENV:Envelope', 'soapenv:Envelope'];

  for (const key of envelopeKeys) {
    if (parsed[key]) {
      return parsed[key] as Record<string, unknown>;
    }
  }

  // Try to find any key containing 'envelope' (case-insensitive)
  const keys = Object.keys(parsed);
  const envKey = keys.find(k => k.toLowerCase().includes('envelope'));

  if (envKey) {
    return parsed[envKey] as Record<string, unknown>;
  }

  return null;
}

/**
 * Find the SOAP body within an envelope
 */
function findBody(envelope: Record<string, unknown>): Record<string, unknown> | null {
  const bodyKeys = ['Body', 'SOAP-ENV:Body', 'soapenv:Body'];

  for (const key of bodyKeys) {
    if (envelope[key]) {
      return envelope[key] as Record<string, unknown>;
    }
  }

  return null;
}

/**
 * Find SOAP fault in body
 */
function findFault(body: Record<string, unknown>): Record<string, unknown> | null {
  const faultKeys = ['Fault', 'SOAP-ENV:Fault', 'soapenv:Fault'];

  for (const key of faultKeys) {
    if (body[key]) {
      return body[key] as Record<string, unknown>;
    }
  }

  return null;
}

/* ==============================================
   Transaction Parsing
   ============================================== */

/**
 * Parse transaction elements from SOAP response
 */
function parseTransactions(transactionData: unknown): Transaction[] {
  if (!transactionData) {
    return [];
  }

  // Ensure we have an array
  const txArray = Array.isArray(transactionData) ? transactionData : [transactionData];

  return txArray.map((tx): Transaction => {
    if (typeof tx !== 'object' || tx === null) {
      return { type: 'Unknown', message: String(tx) };
    }

    const txRecord = tx as Record<string, unknown>;

    // Extract type
    const rawType = typeof txRecord.type === 'string' ? txRecord.type : 'Unknown';
    const type: TransactionType = isValidTransactionType(rawType) ? rawType : 'Unknown';

    // Extract message (try multiple field names)
    const message =
      (txRecord.messagetext as string) ||
      (txRecord.message as string) ||
      (txRecord.MESSAGETEXT as string) ||
      '';

    return { type, message };
  });
}

/* ==============================================
   Main Parser
   ============================================== */

/**
 * Parse SOAP response XML string into typed SOAPResponse
 *
 * PeopleSoft SOAP responses have this structure:
 * - notification: '0' (failure) or '1' (success)
 * - detail: contains transaction elements
 * - transaction: array of { type, messagetext } objects
 *
 * @param xmlString - Raw XML response string
 * @returns Parsed SOAPResponse object
 * @throws Error on parse failure or SOAP fault
 */
export async function parseSOAPResponse(xmlString: string): Promise<SOAPResponse> {
  try {
    /*
     * TYPE ASSERTION JUSTIFICATION: `as unknown`
     *
     * The xml2js library's parseStringPromise returns Promise<any> because XML
     * parsing is inherently dynamic - the structure is determined by the XML
     * content at runtime, not at compile time. This is a fundamental limitation
     * of XML parsing libraries that cannot be resolved without rewriting the
     * library itself or creating a schema-based parser.
     *
     * We cast to `unknown` (not a specific type) because:
     * 1. `unknown` is TypeScript's type-safe alternative to `any` - it requires
     *    explicit type narrowing before the value can be used
     * 2. This cast is at the library boundary where we interface with untyped code
     * 3. All subsequent usage passes through validation functions (findEnvelope,
     *    findBody, findFault) that check structure at runtime before accessing
     *
     * This follows the recommended pattern for safely consuming untyped APIs:
     * acknowledge the type boundary, cast to unknown, then validate before use.
     */
    const result = await parseStringPromise(xmlString, {
      explicitArray: false,
      ignoreAttrs: false,
      // Remove namespace prefixes from tag names
      tagNameProcessors: [(name) => name.replace(/^.*:/, '')],
    }) as unknown;

    // Validate result is an object before proceeding
    if (result === null || typeof result !== 'object' || Array.isArray(result)) {
      throw new Error('Invalid SOAP response: XML parser did not return an object');
    }

    // Find envelope (result is now validated as Record<string, unknown>)
    const envelope = findEnvelope(result as Record<string, unknown>);
    if (!envelope) {
      throw new Error('Invalid SOAP response: No envelope found');
    }

    // Find body
    const body = findBody(envelope);
    if (!body) {
      throw new Error('Invalid SOAP response: No body found');
    }

    // Check for SOAP fault
    const fault = findFault(body);
    if (fault) {
      const faultString =
        (fault.faultstring as string) ||
        (fault.faultString as string) ||
        'Unknown SOAP Fault';
      throw new Error(`SOAP Fault: ${faultString}`);
    }

    // Extract notification (success indicator)
    const notification = (body.notification as string) || '0';
    const isSuccess = notification === '1';

    // Extract detail and transactions
    const detail = (body.detail as Record<string, unknown> | undefined) ?? {};
    const transactionData = detail.transaction;
    const transactions = parseTransactions(transactionData);

    // Categorize transactions
    const errors = transactions.filter(t => t.type === 'Error');
    const warnings = transactions.filter(t => t.type === 'Warning');

    return {
      success: isSuccess,
      notification,
      transactions,
      errors,
      warnings,
      rawXml: xmlString,
    };

  } catch (error) {
    // Re-throw SOAP faults as-is
    if ((error as Error).message.includes('SOAP Fault')) {
      throw error;
    }

    // Wrap other errors
    throw new Error(`XML Parse Error: ${(error as Error).message}`);
  }
}

/* ==============================================
   Authentication Detection
   ============================================== */

/**
 * Check if response indicates authentication failure
 *
 * PeopleSoft doesn't always return proper HTTP 401 for auth failures.
 * Sometimes the error is embedded in the response body.
 */
export function isAuthenticationError(responseText: string): boolean {
  const lowerResponse = responseText.toLowerCase();

  return (
    lowerResponse.includes('invalid user') ||
    lowerResponse.includes('not authorized') ||
    lowerResponse.includes('authentication failed') ||
    lowerResponse.includes('access denied') ||
    lowerResponse.includes('invalid password') ||
    lowerResponse.includes('signon denied')
  );
}

/**
 * Check if response contains a SOAP fault
 */
export function hasSOAPFault(responseText: string): boolean {
  const lowerResponse = responseText.toLowerCase();

  return (
    lowerResponse.includes('soap:fault') ||
    lowerResponse.includes('soap-env:fault') ||
    lowerResponse.includes('soapenv:fault') ||
    lowerResponse.includes('<fault>')
  );
}

/**
 * Extract fault message from SOAP fault response
 */
export function extractFaultMessage(responseText: string): string | null {
  // Try to extract faultstring with regex
  const faultMatch = responseText.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);

  if (faultMatch?.[1]) {
    return faultMatch[1];
  }

  return null;
}
