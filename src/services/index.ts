/**
 * Services barrel export
 *
 * Note: Oracle and SOAP APIs export as service objects (oracleApi, soapApi)
 * to avoid name conflicts between their methods.
 */

export * from './workflows';
export { oracleApi } from './oracle';
export { soapApi } from './soap';
