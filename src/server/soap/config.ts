/**
 * SOAP Connection Configuration
 *
 * Configuration for PeopleSoft SOAP Component Interface requests.
 * Server connection settings come from environment variables.
 * User credentials are provided at runtime via API calls.
 */

import type { PeopleSoftConfig } from '../../types/soap.js';

/* ==============================================
   Timeouts & Retry Settings
   ============================================== */

export const SOAP_TIMEOUTS = {
  /** HTTP request timeout in milliseconds */
  REQUEST: 30000,
  /** Connection timeout */
  CONNECT: 10000,
};

export const SOAP_RETRY = {
  /** Maximum retry attempts for failed requests */
  MAX_ATTEMPTS: 3,
  /** Initial delay between retries in ms (doubles each retry) */
  BASE_DELAY: 1000,
};

/* ==============================================
   Default Configuration
   ============================================== */

/**
 * Default configuration values
 * These are overridden by environment variables
 */
export const DEFAULT_CONFIG: Omit<PeopleSoftConfig, 'server' | 'siteName' | 'portal' | 'node'> = {
  protocol: 'https',
  port: 443,
  languageCode: 'ENG',
  blockingFactor: 40,
  errorThreshold: 100000,
  debug: true,
  preserveBlanks: true,
  optionalKeys: true,
};

/* ==============================================
   Configuration Builder
   ============================================== */

/**
 * Build PeopleSoft configuration from environment variables
 *
 * Environment variables (all prefixed with VITE_ for Vite compatibility):
 * - VITE_PS_PROTOCOL: http or https (default: https)
 * - VITE_PS_SERVER: PeopleSoft web server hostname (required)
 * - VITE_PS_PORT: Web server port (default: 443)
 * - VITE_PS_SITE_NAME: PeopleSoft site name (required)
 * - VITE_PS_PORTAL: Portal name (required)
 * - VITE_PS_NODE: Node name (required, usually PT_LOCAL)
 * - VITE_PS_LANGUAGE_CODE: Language code (default: ENG)
 * - VITE_SOAP_BLOCKING_FACTOR: Records per batch (default: 40)
 *
 * @param env - Environment variables object
 * @returns Fully populated config or null if required vars are missing
 */
export function buildSoapConfig(env: Record<string, string>): PeopleSoftConfig | null {
  const server = env['VITE_PS_SERVER'];
  const siteName = env['VITE_PS_SITE_NAME'];
  const portal = env['VITE_PS_PORTAL'];
  const node = env['VITE_PS_NODE'];

  // Check required fields
  if (!server || !siteName || !portal || !node) {
    console.warn('[SOAP] Missing required environment variables:');
    if (!server) console.warn('  - VITE_PS_SERVER');
    if (!siteName) console.warn('  - VITE_PS_SITE_NAME');
    if (!portal) console.warn('  - VITE_PS_PORTAL');
    if (!node) console.warn('  - VITE_PS_NODE');
    return null;
  }

  // Parse protocol with fallback (env var may be undefined at runtime despite Record<string, string> typing)
  const protocolRaw = env['VITE_PS_PROTOCOL'] ?? '';
  const protocol: 'http' | 'https' =
    protocolRaw.toLowerCase() === 'http' ? 'http' : 'https';

  // Parse numeric values
  const port = parseInt(env['VITE_PS_PORT'] ?? '', 10) || DEFAULT_CONFIG.port;
  const blockingFactor = parseInt(env['VITE_SOAP_BLOCKING_FACTOR'] ?? '', 10) || DEFAULT_CONFIG.blockingFactor;

  return {
    ...DEFAULT_CONFIG,
    protocol,
    server,
    port,
    siteName,
    portal,
    node,
    languageCode: env['VITE_PS_LANGUAGE_CODE'] || DEFAULT_CONFIG.languageCode,
    blockingFactor,
  };
}

/* ==============================================
   HTTPS Validation
   ============================================== */

/**
 * Security validation result
 */
export interface ProtocolValidationResult {
  isSecure: boolean;
  protocol: 'http' | 'https';
  warning?: string;
  error?: string;
}

/**
 * Validate that the SOAP configuration uses a secure protocol
 *
 * SECURITY CRITICAL: PeopleSoft SOAP authentication sends credentials
 * in custom HTTP headers (userid, pwd). These are transmitted in plain
 * text and visible to anyone who can observe network traffic.
 *
 * Over HTTP:
 * - Credentials are visible to network sniffers (Wireshark, etc.)
 * - Man-in-the-middle attacks can steal credentials
 * - Proxy servers and load balancers often log headers
 *
 * Over HTTPS:
 * - TLS encryption protects credentials in transit
 * - Certificate validation prevents MITM attacks
 * - Headers are encrypted along with body content
 *
 * @param config - PeopleSoft configuration
 * @param isDevelopment - Whether running in development mode
 * @returns Validation result with security assessment
 */
export function validateProtocolSecurity(
  config: PeopleSoftConfig,
  isDevelopment: boolean
): ProtocolValidationResult {
  if (config.protocol === 'https') {
    return {
      isSecure: true,
      protocol: 'https',
    };
  }

  // HTTP protocol detected
  if (isDevelopment) {
    // Allow HTTP in development with strong warning
    return {
      isSecure: false,
      protocol: 'http',
      warning:
        'WARNING: Using HTTP for SOAP connection. Credentials will be sent in plain text! ' +
        'This is only allowed in development mode. Use HTTPS in production.',
    };
  }

  // Block HTTP in production
  return {
    isSecure: false,
    protocol: 'http',
    error:
      'SECURITY ERROR: Cannot use HTTP for SOAP connections in production. ' +
      'PeopleSoft credentials are sent in HTTP headers and would be exposed in plain text. ' +
      'Configure VITE_PS_PROTOCOL=https to use a secure connection.',
  };
}

/* ==============================================
   URL Building
   ============================================== */

/**
 * Build the SOAP endpoint URL from configuration
 *
 * Format: {protocol}://{server}:{port}/psc/{siteName}/{portal}/{node}/s/WEBLIB_SOAPTOCI.SOAPTOCI.FieldFormula.IScript_SOAPToCI?languageCd={lang}&disconnect=y&postDataBin=y
 */
export function buildEndpointURL(config: PeopleSoftConfig): string {
  const { protocol, server, port, siteName, portal, node, languageCode } = config;

  const base = `${protocol}://${server}:${String(port)}/psc/${siteName}/${portal}/${node}`;
  const endpoint = '/s/WEBLIB_SOAPTOCI.SOAPTOCI.FieldFormula.IScript_SOAPToCI';
  const params = `?languageCd=${languageCode}&disconnect=y&postDataBin=y`;

  return `${base}${endpoint}${params}`;
}
