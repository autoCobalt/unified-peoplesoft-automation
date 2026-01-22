/**
 * PeopleSoft SOAP Service
 *
 * Singleton service for PeopleSoft Component Interface SOAP operations.
 * Handles authentication, request building, retry logic, and response parsing.
 *
 * IMPORTANT: PeopleSoft uses non-standard authentication via custom headers
 * (userid, pwd) instead of HTTP Basic Auth!
 */

import type {
  PeopleSoftConfig,
  SOAPResponse,
  SOAPServiceState,
  SOAPApiResponse,
  ActionType,
} from '../../types/soap.js';
import type { SoapCredentials } from '../../types/connection.js';
import { buildEndpointURL, SOAP_RETRY, SOAP_TIMEOUTS } from './config.js';
import {
  buildGetCIShapeRequest,
  buildSubmitRequest,
  buildMultiRecordSubmitRequest,
} from './xmlBuilder.js';
import {
  parseSOAPResponse,
  isAuthenticationError,
  hasSOAPFault,
  extractFaultMessage,
} from './xmlParser.js';

/* ==============================================
   SOAP Service Class
   ============================================== */

/**
 * Singleton service for PeopleSoft SOAP operations
 */
class SOAPService {
  private config: PeopleSoftConfig | null = null;
  private credentials: SoapCredentials | null = null;
  private state: SOAPServiceState = {
    hasCredentials: false,
    lastConnectionTime: null,
    error: null,
  };

  /* ==============================================
     Initialization
     ============================================== */

  /**
   * Initialize the SOAP service with configuration
   *
   * @param config - PeopleSoft configuration from environment
   */
  initialize(config: PeopleSoftConfig | null): void {
    this.config = config;

    if (config) {
      console.log('[SOAP] Service initialized');
      console.log(`[SOAP] Server: ${config.protocol}://${config.server}:${String(config.port)}`);
      console.log(`[SOAP] Site: ${config.siteName}/${config.portal}/${config.node}`);
    } else {
      console.warn('[SOAP] Service not configured - missing environment variables');
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.config !== null;
  }

  /**
   * Get current service state
   */
  getState(): SOAPServiceState {
    return { ...this.state };
  }

  /* ==============================================
     Credential Management
     ============================================== */

  /**
   * Store credentials for subsequent requests
   *
   * Note: Credentials are stored in memory only.
   * They need to be re-provided after server restart.
   */
  setCredentials(credentials: SoapCredentials): void {
    this.credentials = credentials;
    this.state.hasCredentials = true;
    this.state.error = null;
    console.log(`[SOAP] Credentials set for user: ${credentials.username}`);
  }

  /**
   * Clear stored credentials
   */
  clearCredentials(): void {
    this.credentials = null;
    this.state = {
      hasCredentials: false,
      lastConnectionTime: null,
      error: null,
    };
    console.log('[SOAP] Credentials cleared');
  }

  /**
   * Check if credentials are available
   */
  hasCredentials(): boolean {
    return this.credentials !== null;
  }

  /* ==============================================
     HTTP Request Helpers
     ============================================== */

  /**
   * Build HTTP headers for PeopleSoft SOAP request
   *
   * IMPORTANT: PeopleSoft uses custom headers for auth, NOT Basic Auth!
   */
  private buildHeaders(credentials: SoapCredentials): Record<string, string> {
    return {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/xml, text/html',
      'Accept-Charset': 'utf-8, iso_8859-1',
      // Non-standard PeopleSoft authentication
      'userid': credentials.username,
      'pwd': credentials.password,
    };
  }

  /**
   * Send HTTP request with retry logic
   *
   * PeopleSoft IScript endpoints have cold-start issues.
   * Retry with exponential backoff handles transient failures.
   */
  private async sendRequestWithRetry(
    url: string,
    headers: Record<string, string>,
    body: string
  ): Promise<SOAPResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= SOAP_RETRY.MAX_ATTEMPTS; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => { controller.abort(); },
          SOAP_TIMEOUTS.REQUEST
        );

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check HTTP status
        if (!response.ok) {
          throw new Error(`HTTP ${String(response.status)}: ${response.statusText}`);
        }

        // Parse response
        const responseText = await response.text();
        return await parseSOAPResponse(responseText);

      } catch (error) {
        lastError = error as Error;
        console.warn(
          `[SOAP] Attempt ${String(attempt)}/${String(SOAP_RETRY.MAX_ATTEMPTS)} failed:`,
          lastError.message
        );

        // Wait before retry (exponential backoff)
        if (attempt < SOAP_RETRY.MAX_ATTEMPTS) {
          const delay = SOAP_RETRY.BASE_DELAY * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }

  /* ==============================================
     Connection Testing
     ============================================== */

  /**
   * Test SOAP connection with provided credentials
   *
   * Makes a lightweight GetCIShape request to validate credentials.
   * Uses CI_JOB_DATA as the test CI (common, read-only).
   *
   * @param credentials - User credentials to test
   * @returns Success/failure with message
   */
  async testConnection(
    credentials: SoapCredentials
  ): Promise<SOAPApiResponse<{ message: string; server?: string }>> {
    if (!this.config) {
      return {
        success: false,
        error: {
          code: 'NOT_CONFIGURED',
          message: 'SOAP service not configured. Check environment variables.',
        },
      };
    }

    const url = buildEndpointURL(this.config);
    const headers = this.buildHeaders(credentials);
    const body = buildGetCIShapeRequest('CI_JOB_DATA', this.config.debug);

    console.log(`[SOAP] Testing connection to: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      // Check HTTP-level auth failures
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid username or password',
          },
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: `HTTP ${String(response.status)}: ${response.statusText}`,
          },
        };
      }

      const responseText = await response.text();

      // Check for auth failure in body
      if (isAuthenticationError(responseText)) {
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Authentication failed - invalid credentials',
          },
        };
      }

      // Check for SOAP fault
      if (hasSOAPFault(responseText)) {
        const faultMessage = extractFaultMessage(responseText) ?? 'SOAP request failed';
        return {
          success: false,
          error: {
            code: 'SOAP_FAULT',
            message: faultMessage,
          },
        };
      }

      // Success - store credentials
      this.setCredentials(credentials);
      this.state.lastConnectionTime = new Date();

      console.log('[SOAP] Connection test successful');

      return {
        success: true,
        data: {
          message: 'Connection successful',
          server: `${this.config.server}:${String(this.config.port)}`,
        },
      };

    } catch (error) {
      const err = error as Error;
      console.error('[SOAP] Connection test failed:', err.message);

      // Map common network errors to friendly messages
      let message = err.message;

      if (message.includes('ECONNREFUSED')) {
        message = 'Connection refused - server may be down or unreachable';
      } else if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
        message = 'Connection timed out - check network connectivity';
      } else if (message.includes('ENOTFOUND')) {
        message = 'Server not found - check hostname configuration';
      } else if (message.includes('certificate')) {
        message = 'SSL certificate error - server may use self-signed certificate';
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message,
        },
      };
    }
  }

  /* ==============================================
     CI Operations
     ============================================== */

  /**
   * Get Component Interface structure (GetCIShape)
   *
   * @param ciName - Component Interface name
   * @param credentials - Optional credentials (uses stored if not provided)
   */
  async getCIShape(
    ciName: string,
    credentials?: SoapCredentials
  ): Promise<SOAPApiResponse<SOAPResponse>> {
    const creds = credentials ?? this.credentials;

    if (!this.config) {
      return {
        success: false,
        error: { code: 'NOT_CONFIGURED', message: 'SOAP service not configured' },
      };
    }

    if (!creds) {
      return {
        success: false,
        error: { code: 'AUTHENTICATION_FAILED', message: 'No credentials provided' },
      };
    }

    const url = buildEndpointURL(this.config);
    const headers = this.buildHeaders(creds);
    const body = buildGetCIShapeRequest(ciName, this.config.debug);

    console.log(`[SOAP] GetCIShape request for: ${ciName}`);

    try {
      const result = await this.sendRequestWithRetry(url, headers, body);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SOAP_FAULT',
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Submit data to Component Interface
   *
   * @param ciName - Component Interface name
   * @param action - Action type (CREATE, UPDATE, UPDATEDATA)
   * @param data - Data object to submit
   * @param credentials - Optional credentials
   */
  async submitData(
    ciName: string,
    action: ActionType,
    data: Record<string, unknown>,
    credentials?: SoapCredentials
  ): Promise<SOAPApiResponse<SOAPResponse>> {
    const creds = credentials ?? this.credentials;

    if (!this.config) {
      return {
        success: false,
        error: { code: 'NOT_CONFIGURED', message: 'SOAP service not configured' },
      };
    }

    if (!creds) {
      return {
        success: false,
        error: { code: 'AUTHENTICATION_FAILED', message: 'No credentials provided' },
      };
    }

    const url = buildEndpointURL(this.config);
    const headers = this.buildHeaders(creds);
    const body = buildSubmitRequest(ciName, action, data, this.config);

    console.log(`[SOAP] SubmitToDB: ${action} on ${ciName}`);

    try {
      const result = await this.sendRequestWithRetry(url, headers, body);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SOAP_FAULT',
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Submit multiple records in a batch
   *
   * @param ciName - Component Interface name
   * @param action - Action type
   * @param records - Array of data objects
   * @param credentials - Optional credentials
   */
  async submitBatch(
    ciName: string,
    action: ActionType,
    records: Record<string, unknown>[],
    credentials?: SoapCredentials
  ): Promise<SOAPApiResponse<SOAPResponse>> {
    const creds = credentials ?? this.credentials;

    if (!this.config) {
      return {
        success: false,
        error: { code: 'NOT_CONFIGURED', message: 'SOAP service not configured' },
      };
    }

    if (!creds) {
      return {
        success: false,
        error: { code: 'AUTHENTICATION_FAILED', message: 'No credentials provided' },
      };
    }

    const url = buildEndpointURL(this.config);
    const headers = this.buildHeaders(creds);
    const body = buildMultiRecordSubmitRequest(ciName, action, records, this.config);

    console.log(`[SOAP] Batch submit: ${String(records.length)} records, ${action} on ${ciName}`);

    try {
      const result = await this.sendRequestWithRetry(url, headers, body);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SOAP_FAULT',
          message: (error as Error).message,
        },
      };
    }
  }
}

/* ==============================================
   Singleton Export
   ============================================== */

/**
 * Singleton instance of the SOAP service
 * Use this throughout the application
 */
export const soapService = new SOAPService();
