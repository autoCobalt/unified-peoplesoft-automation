/**
 * Config barrel export
 *
 * Central export point for application configuration.
 */

export { isDevelopment, isSoapBatchMode, soapBatchSize } from './appMode';
export { oracleConfig, soapConfig } from './connections';
export type { OracleConfig, SoapConfig } from './connections';
