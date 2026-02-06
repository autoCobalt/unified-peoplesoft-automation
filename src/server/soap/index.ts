/**
 * SOAP Module
 *
 * Server-side SOAP service for PeopleSoft Component Interface operations.
 *
 * Usage:
 * - Import soapService for programmatic access
 * - Import handlers for HTTP route registration
 * - Import buildSoapConfig to create config from environment
 */

// Service singleton
export { soapService } from './soapService.js';

// Configuration
export { buildSoapConfig, buildEndpointURL, validateProtocolSecurity } from './config.js';
export type { ProtocolValidationResult } from './config.js';

// XML utilities (for advanced use cases)
export {
  escapeXML,
  buildGetCIShapeRequest,
  buildSubmitRequest,
  buildMultiRecordSubmitRequest,
} from './xmlBuilder.js';

export {
  parseSOAPResponse,
  isAuthenticationError,
  hasSOAPFault,
  extractFaultMessage,
} from './xmlParser.js';
