/**
 * Oracle Query Service
 *
 * Server-side service for executing Oracle SQL queries.
 * Manages connection state and query execution.
 *
 * Note: This service runs in Node.js (Vite middleware), not the browser.
 * The actual Oracle connection implementation will use oracledb package.
 */

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
 * TODO: Replace placeholder implementation with oracledb package
 * when ready for production. The interface will remain the same.
 */
class OracleService {
  private state: ConnectionState = {
    isConnected: false,
    connectionTime: null,
    lastQueryTime: null,
    error: null,
  };

  // Cache for loaded SQL files
  private sqlCache: Map<string, string> = new Map();

  /* ==============================================
     Connection Management
     ============================================== */

  /**
   * Connect to Oracle database
   *
   * @param connectionString - Oracle connection string
   * @param username - Database username
   * @param password - Database password
   */
  async connect(
    connectionString: string,
    username: string,
    password: string
  ): Promise<OracleApiResponse<{ message: string }>> {
    // TODO: Implement actual Oracle connection using oracledb
    // Password will be used when real connection is implemented
    void password; // Placeholder - will be used for actual Oracle connection

    console.log(`[Oracle] Connecting to database as ${username}...`);
    console.log(`[Oracle] Connection string: ${connectionString}`);

    // Simulate connection delay
    await this.delay(500);

    // Placeholder: Always succeed in development
    this.state = {
      isConnected: true,
      connectionTime: new Date(),
      lastQueryTime: null,
      error: null,
    };

    console.log('[Oracle] Connected successfully (placeholder)');

    return {
      success: true,
      data: { message: 'Connected to Oracle database' },
    };
  }

  /**
   * Disconnect from Oracle database
   */
  disconnect(): OracleApiResponse<{ message: string }> {
    // TODO: Implement actual disconnection (may need async when using oracledb)

    console.log('[Oracle] Disconnecting from database...');

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

      console.log(`[Oracle] Executing query: ${queryId}`);
      if (parameters && Object.keys(parameters).length > 0) {
        console.log(`[Oracle] Parameters:`, parameters);
      }

      // TODO: Replace with actual query execution using oracledb
      // For now, return placeholder results
      const result = await this.executePlaceholder<TRow>(sql, parameters);

      const executionTime = performance.now() - startTime;
      this.state.lastQueryTime = new Date();

      console.log(`[Oracle] Query completed in ${executionTime.toFixed(2)}ms`);

      return {
        success: true,
        data: {
          ...result,
          executionTimeMs: Math.round(executionTime),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Oracle] Query error: ${message}`);

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
      // TODO: Replace with actual execution
      const result = await this.executePlaceholder<TRow>(sql, parameters);

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
   * Placeholder query execution
   * Returns empty results until real implementation is added
   *
   * TODO: Replace with oracledb execution
   */
  private async executePlaceholder<TRow>(
    sql: string,
    parameters?: QueryParameters
  ): Promise<Omit<OracleQueryResult<TRow>, 'executionTimeMs'>> {
    // These will be used when real Oracle connection is implemented
    void sql;
    void parameters;

    // Simulate query delay
    await this.delay(100);

    // Return empty results as placeholder
    // Real implementation will execute the SQL and return actual data
    return {
      rows: [] as TRow[],
      rowCount: 0,
      columns: [],
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

  /**
   * Promise-based delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
