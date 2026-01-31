/**
 * Submission Redirect Capture Utility
 *
 * When VITE_SUBMIT_REDIRECT=true, captures outgoing Oracle queries and SOAP
 * submissions to JSON files for format validation instead of sending them to
 * real systems.
 *
 * Follows the secureLogger.ts initialization pattern:
 * - Module-level state initialized via sync init()
 * - Called once from configureWorkflowMiddleware()
 */

import { writeFile, mkdirSync } from 'fs';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ActionType, PeopleSoftConfig } from '../../types/soap.js';
import type { QueryConfig, QueryParameters } from '../../types/oracle.js';
import { buildSoapConfig, buildEndpointURL } from '../soap/config.js';
import { buildSubmitRequest, buildMultiRecordSubmitRequest } from '../soap/xmlBuilder.js';
import { getSqlDirectory } from '../oracle/config.js';
import { logWarn, logInfo, logError } from './secureLogger.js';

/* ==============================================
   Types
   ============================================== */

interface RedirectConfig {
  enabled: boolean;
  outputDir: string;
}

interface OracleConnectionInfo {
  hostname: string;
  port: string;
  serviceName: string;
  connectionString: string;
}

interface CaptureOracleParams {
  queryId: string;
  queryConfig: QueryConfig;
  sqlText: string;
  bindParameters: QueryParameters | undefined;
  connectionInfo: OracleConnectionInfo;
}

interface CaptureSoapParams {
  ciName: string;
  action: ActionType;
  isBatch: boolean;
  data: Record<string, unknown> | Record<string, unknown>[];
}

/* ==============================================
   Module State
   ============================================== */

let config: RedirectConfig = {
  enabled: false,
  outputDir: 'submission-captures',
};

let oracleConnectionInfo: OracleConnectionInfo = {
  hostname: '',
  port: '',
  serviceName: '',
  connectionString: '',
};

let soapConfig: PeopleSoftConfig | null = null;

/** Auto-incrementing sequence number for capture files */
let sequenceNumber = 0;

/* ==============================================
   Initialization
   ============================================== */

/**
 * Initialize redirect capture with environment configuration
 *
 * Must be called once from configureWorkflowMiddleware() after
 * initializeSecureLogger(). Stores environment config and creates
 * the output directory if needed.
 *
 * @param env - Environment variables from Vite's loadEnv()
 */
export function initializeRedirectCapture(env: Record<string, string>): void {
  const enabled = env['VITE_SUBMIT_REDIRECT'] === 'true';
  const outputDir = env['VITE_SUBMIT_REDIRECT_DIR'] || 'submission-captures';

  config = { enabled, outputDir };

  if (!enabled) {
    return;
  }

  // Store Oracle connection info from environment
  const hostname = env['VITE_ORACLE_HOSTNAME'] ?? '';
  const port = env['VITE_ORACLE_PORT'] ?? '1521';
  const serviceName = env['VITE_ORACLE_SERVICE_NAME'] ?? '';

  oracleConnectionInfo = {
    hostname,
    port,
    serviceName,
    connectionString: hostname && serviceName
      ? `${hostname}:${port}/${serviceName}`
      : '',
  };

  // Store SOAP config for building envelopes
  soapConfig = buildSoapConfig(env);

  // Reset sequence number on init
  sequenceNumber = 0;

  // Ensure output directory exists
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch {
    // Directory may already exist — that's fine
  }

  // Log prominent warning banner
  logWarn('Redirect', '╔══════════════════════════════════════════════════╗');
  logWarn('Redirect', '║  SUBMISSION REDIRECT MODE ACTIVE                ║');
  logWarn('Redirect', '║  Oracle queries and SOAP submissions will be    ║');
  logWarn('Redirect', '║  captured to JSON files instead of sent to      ║');
  logWarn('Redirect', '║  real systems.                                  ║');
  logWarn('Redirect', `║  Output: ${outputDir.padEnd(40)}║`);
  logWarn('Redirect', '╚══════════════════════════════════════════════════╝');
}

/* ==============================================
   Public API
   ============================================== */

/**
 * Check if redirect mode is enabled
 */
export function isRedirectEnabled(): boolean {
  return config.enabled;
}

/**
 * Capture an Oracle query to a JSON file
 *
 * Writes the full query details (SQL text, bind parameters, connection info)
 * to a JSON file and returns the filepath. Returns a mock empty-result response.
 *
 * @param params - Oracle query parameters to capture
 * @returns Filepath where the capture was written
 */
export function captureOracleQuery(params: CaptureOracleParams): string {
  sequenceNumber++;
  const timestamp = buildWindowsSafeTimestamp();
  const descriptor = params.queryId;
  const filename = `oracle-query-${timestamp}-${descriptor}.json`;
  const filepath = join(config.outputDir, filename);

  const capture = {
    _meta: {
      capturedAt: new Date().toISOString(),
      type: 'oracle-query' as const,
      sequenceNumber,
    },
    request: {
      endpoint: '/api/oracle/query',
      method: 'POST',
      queryId: params.queryId,
      queryConfig: {
        filename: params.queryConfig.filename,
        description: params.queryConfig.description,
      },
      sqlText: params.sqlText,
      bindParameters: params.bindParameters ?? {},
      connectionInfo: params.connectionInfo,
    },
    mockResponse: {
      success: true,
      data: {
        rows: [],
        rowCount: 0,
        columns: [],
        executionTimeMs: 0,
      },
    },
  };

  writeCapture(filepath, capture);
  logInfo('Redirect', `Captured Oracle query → ${filepath}`);

  return filepath;
}

/**
 * Capture a SOAP submission to a JSON file
 *
 * Builds the full SOAP envelope (using xmlBuilder) and target URL (using
 * config.ts) so the capture shows exactly what would have been sent to
 * PeopleSoft, with passwords redacted.
 *
 * @param params - SOAP submission parameters to capture
 * @returns Filepath where the capture was written
 */
export function captureSoapSubmit(params: CaptureSoapParams): string {
  sequenceNumber++;
  const timestamp = buildWindowsSafeTimestamp();
  const descriptor = `${params.ciName}-${params.action}`;
  const filename = `soap-submit-${timestamp}-${descriptor}.json`;
  const filepath = join(config.outputDir, filename);

  // Build SOAP envelope using the real XML builders
  let soapEnvelope = '';
  let targetUrl = '';
  const headers: Record<string, string> = {
    'Content-Type': 'text/xml; charset=utf-8',
    userid: '[see credentials]',
    pwd: '[REDACTED]',
  };

  if (soapConfig) {
    targetUrl = buildEndpointURL(soapConfig);

    if (params.isBatch && Array.isArray(params.data)) {
      soapEnvelope = buildMultiRecordSubmitRequest(
        params.ciName,
        params.action,
        params.data,
        soapConfig
      );
    } else {
      const singleData = Array.isArray(params.data) ? params.data[0] : params.data;
      soapEnvelope = buildSubmitRequest(
        params.ciName,
        params.action,
        singleData,
        soapConfig
      );
    }
  }

  const recordCount = Array.isArray(params.data) ? params.data.length : 1;

  const capture = {
    _meta: {
      capturedAt: new Date().toISOString(),
      type: 'soap-submit' as const,
      sequenceNumber,
    },
    request: {
      endpoint: '/api/soap/submit',
      method: 'POST',
      ciName: params.ciName,
      action: params.action,
      isBatch: params.isBatch,
      recordCount,
      data: params.data,
      targetUrl,
      headers,
      soapEnvelope,
    },
    mockResponse: {
      success: true,
      data: {
        success: true,
        notification: '1',
        transactions: [],
        errors: [],
        warnings: [],
      },
    },
  };

  writeCapture(filepath, capture);
  logInfo('Redirect', `Captured SOAP submit → ${filepath}`);

  return filepath;
}

/**
 * Load SQL text from disk for a given query filename.
 *
 * Used by the Oracle redirect handler to include the full SQL text
 * in the capture file.
 */
export function loadSqlText(filename: string): string {
  try {
    const sqlPath = join(getSqlDirectory(), filename);
    return readFileSync(sqlPath, 'utf-8');
  } catch {
    return `[Could not load SQL file: ${filename}]`;
  }
}

/**
 * Get the stored Oracle connection info (from environment at init time)
 */
export function getStoredOracleConnectionInfo(): OracleConnectionInfo {
  return { ...oracleConnectionInfo };
}

/* ==============================================
   Internal Helpers
   ============================================== */

/**
 * Build a Windows-safe ISO timestamp (colons → hyphens)
 *
 * Windows doesn't allow colons in filenames, so we replace them.
 * Example: 2026-01-31T18-00-05.123Z
 */
function buildWindowsSafeTimestamp(): string {
  return new Date().toISOString().replace(/:/g, '-');
}

/**
 * Write a capture object to disk as formatted JSON
 *
 * Errors are caught and logged but don't propagate — the mock success
 * is still returned to the caller so the workflow continues.
 */
function writeCapture(filepath: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);

  writeFile(filepath, json, 'utf-8', (err) => {
    if (err) {
      logError('Redirect', `Failed to write capture file ${filepath}: ${err.message}`);
    }
  });
}
