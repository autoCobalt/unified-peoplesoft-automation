/**
 * Oracle Services barrel export
 */

export {
  oracleApi,
  getStatus,
  getAvailableQueries,
  connect,
  disconnect,
  executeQuery,
  querySmartFormTransactions,
} from './oracleApi.js';

export type {
  OracleConnectionStatus,
  OracleConnectParams,
} from './oracleApi.js';
