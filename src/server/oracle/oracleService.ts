/**
 * Oracle Query Service
 *
 * Server-side service for executing Oracle SQL queries.
 * Manages connection state and query execution.
 *
 * Note: This service runs in Node.js (Vite middleware), not the browser.
 * Uses oracledb in Thin Mode (v6.0+) - no Oracle Client installation required!
 *
 * Thin Mode Limitations (acceptable for basic SQL queries):
 * - Requires Oracle Database 12.1 or later
 * - No Oracle Wallet/certificate authentication
 * - No Advanced Queuing, Continuous Query Notification
 * - No scrollable cursors or two-phase commit
 */

import oracledb from 'oracledb';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type {
  OracleQueryId,
  OracleQueryResult,
  OracleQueryError,
  OracleApiResponse,
  QueryParameters,
  QueryResultRow,
} from '../../types/oracle.js';
import { getQueryConfig } from '../sql/index.js';
import { getSqlDirectory } from './config.js';
import {
  logConnectionAttempt,
  logConnectionSuccess,
  logDebug,
  logInfo,
  logWarn,
  logError,
  redactConnectionString,
} from '../utils/index.js';

/* ==============================================
   Types
   ============================================== */

interface ConnectionState {
  isConnected: boolean;
  connectionTime: Date | null;
  lastQueryTime: Date | null;
  error: string | null;
}

/* ==============================================
   Oracle Service Class
   ============================================== */

/**
 * Singleton service for Oracle database operations
 *
 * Uses oracledb Thin Mode for connections.
 * Single connection pattern (not pooled) - suitable for single-user desktop app.
 */
class OracleService {
  private state: ConnectionState = {
    isConnected: false,
    connectionTime: null,
    lastQueryTime: null,
    error: null,
  };

  // Active Oracle connection (single connection, not pooled)
  private connection: oracledb.Connection | null = null;

  // Cache for loaded SQL files
  private sqlCache: Map<string, string> = new Map();

  /* ==============================================
     Connection Management
     ============================================== */

  /**
   * Connect to Oracle database
   *
   * @param connectionString - Oracle connection string (e.g., "hostname:port/service_name")
   * @param username - Database username
   * @param password - Database password
   */
  async connect(
    connectionString: string,
    username: string,
    password: string
  ): Promise<OracleApiResponse<{ message: string }>> {
    // Use secure logging - redacts sensitive values in production
    logConnectionAttempt('Oracle', username, redactConnectionString(connectionString));

    try {
      // Close any existing connection first
      if (this.connection) {
        try {
          await this.connection.close();
        } catch (e) {
          logWarn('Oracle', `Error closing existing connection: ${String(e)}`);
        }
        this.connection = null;
      }

      // Create new connection using Thin Mode (default in v6.0+)
      this.connection = await oracledb.getConnection({
        user: username,
        password: password,
        connectString: connectionString,
      });

      // Test the connection with a simple query
      await this.connection.execute('SELECT 1 FROM DUAL');

      this.state = {
        isConnected: true,
        connectionTime: new Date(),
        lastQueryTime: null,
        error: null,
      };

      logConnectionSuccess('Oracle', username);

      return {
        success: true,
        data: { message: 'Connected to Oracle database' },
      };

    } catch (error) {
      const message = this.formatOracleError(error);
      logError('Oracle', `Connection failed: ${message}`);

      this.state = {
        isConnected: false,
        connectionTime: null,
        lastQueryTime: null,
        error: message,
      };

      return {
        success: false,
        error: { code: 'CONNECTION_LOST', message },
      };
    }
  }

  /**
   * Format Oracle errors into user-friendly messages
   */
  private formatOracleError(error: unknown): string {
    const msg = error instanceof Error ? error.message : String(error);

    // Map common Oracle errors to friendly messages
    if (msg.includes('ORA-01017')) return 'Invalid username/password';
    if (msg.includes('ORA-12154')) return 'TNS: could not resolve connect identifier - check hostname and service name';
    if (msg.includes('ORA-12541')) return 'TNS: no listener - check that Oracle server is running and port is correct';
    if (msg.includes('ORA-12170')) return 'Connection timeout - check network connectivity and firewall';
    if (msg.includes('ORA-12514')) return 'TNS: listener does not know of service - check service name';
    if (msg.includes('ORA-28000')) return 'Account is locked - contact your DBA';
    if (msg.includes('ORA-28001')) return 'Password has expired';
    if (msg.includes('NJS-')) return msg; // Return node-oracledb errors as-is

    return msg;
  }

  /**
   * Disconnect from Oracle database
   */
  async disconnect(): Promise<OracleApiResponse<{ message: string }>> {
    logInfo('Oracle', 'Disconnecting from database...');

    if (this.connection) {
      try {
        await this.connection.close();
        logInfo('Oracle', 'Connection closed');
      } catch (e) {
        logWarn('Oracle', `Error closing connection: ${String(e)}`);
      }
      this.connection = null;
    }

    this.state = {
      isConnected: false,
      connectionTime: null,
      lastQueryTime: null,
      error: null,
    };

    this.sqlCache.clear();

    return {
      success: true,
      data: { message: 'Disconnected from Oracle database' },
    };
  }

  /**
   * Check if connected to Oracle
   */
  isConnected(): boolean {
    return this.state.isConnected;
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /* ==============================================
     Query Execution
     ============================================== */

  /**
   * Execute a registered query by ID
   *
   * @param queryId - The query identifier from the registry
   * @param parameters - Optional query parameters
   */
  async executeQuery<TRow = QueryResultRow>(
    queryId: OracleQueryId,
    parameters?: QueryParameters
  ): Promise<OracleApiResponse<OracleQueryResult<TRow>>> {
    const startTime = performance.now();

    // Validate connection
    if (!this.state.isConnected) {
      return this.createError('NOT_CONNECTED', 'Not connected to Oracle database');
    }

    // Get query configuration
    const config = getQueryConfig(queryId);
    if (!config) {
      return this.createError('QUERY_NOT_FOUND', `Query configuration not found: ${queryId}`);
    }

    try {
      // Load SQL file
      const sql = await this.loadSqlFile(config.filename);

      logInfo('Oracle', `Executing query: ${queryId}`);
      if (parameters && Object.keys(parameters).length > 0) {
        // Log parameters only in debug mode (development only)
        logDebug('Oracle', `Parameters: ${JSON.stringify(parameters)}`);
      }

      // Execute query using real oracledb connection
      const result = await this.executeReal<TRow>(sql, parameters);

      const executionTime = performance.now() - startTime;
      this.state.lastQueryTime = new Date();

      logInfo('Oracle', `Query completed in ${executionTime.toFixed(2)}ms`);

      return {
        success: true,
        data: {
          ...result,
          executionTimeMs: Math.round(executionTime),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logError('Oracle', `Query error: ${message}`);

      return this.createError('QUERY_EXECUTION_ERROR', `Query execution failed: ${message}`);
    }
  }

  /**
   * Execute raw SQL (for advanced use cases)
   * Use with caution - prefer registered queries for safety
   */
  async executeRawSql<TRow = QueryResultRow>(
    sql: string,
    parameters?: QueryParameters
  ): Promise<OracleApiResponse<OracleQueryResult<TRow>>> {
    if (!this.state.isConnected) {
      return this.createError('NOT_CONNECTED', 'Not connected to Oracle database');
    }

    const startTime = performance.now();

    try {
      // Execute raw SQL using real oracledb connection
      const result = await this.executeReal<TRow>(sql, parameters);

      return {
        success: true,
        data: {
          ...result,
          executionTimeMs: Math.round(performance.now() - startTime),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.createError('QUERY_EXECUTION_ERROR', message);
    }
  }

  /* ==============================================
     Private Helpers
     ============================================== */

  /**
   * Load SQL file from disk with caching
   */
  private async loadSqlFile(filename: string): Promise<string> {
    // Check cache first
    const cached = this.sqlCache.get(filename);
    if (cached) {
      return cached;
    }

    // Load from disk
    const sqlPath = join(getSqlDirectory(), filename);
    const sql = await readFile(sqlPath, 'utf-8');

    // Cache for future use
    this.sqlCache.set(filename, sql);

    return sql;
  }

  /**
   * Execute SQL using the active oracledb connection
   *
   * @param sql - SQL statement to execute
   * @param parameters - Named bind parameters
   */
  private async executeReal<TRow>(
    sql: string,
    parameters?: QueryParameters
  ): Promise<Omit<OracleQueryResult<TRow>, 'executionTimeMs'>> {
    if (!this.connection) {
      throw new Error('No active Oracle connection');
    }

    // Convert QueryParameters to oracledb bind format
    // Note: oracledb doesn't accept boolean directly, convert to number
    const bindParams: oracledb.BindParameters = {};
    if (parameters) {
      for (const [key, value] of Object.entries(parameters)) {
        if (typeof value === 'boolean') {
          bindParams[key] = value ? 1 : 0;
        } else {
          bindParams[key] = value;
        }
      }
    }

    const result = await this.connection.execute<TRow[]>(sql, bindParams, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchArraySize: 1000,
    });

    // Extract column names from metadata
    const columns = result.metaData?.map((col: { name: string }) => col.name) ?? [];

    return {
      rows: (result.rows ?? []) as TRow[],
      rowCount: result.rows?.length ?? 0,
      columns,
    };
  }

  /**
   * Create an error response
   */
  private createError(
    code: OracleQueryError['code'],
    message: string,
    details?: string
  ): OracleApiResponse<never> {
    return {
      success: false,
      error: { code, message, details },
    };
  }
}

/* ==============================================
   Singleton Export
   ============================================== */

/**
 * Singleton instance of the Oracle service
 * Use this throughout the application
 */
export const oracleService = new OracleService();
