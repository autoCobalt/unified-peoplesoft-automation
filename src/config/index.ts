/**
 * Config barrel export
 *
 * Central export point for application configuration.
 */

export { isDevelopment } from './appMode';
export { oracleConfig, soapConfig } from './connections';
export type { OracleConfig, SoapConfig } from './connections';
