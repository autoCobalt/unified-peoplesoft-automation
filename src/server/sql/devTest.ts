/**
 * SQL Metadata Parser Development Test
 *
 * Runs at server startup in development mode to verify:
 * - Parser correctly extracts metadata from example file
 * - Validator identifies issues appropriately
 *
 * This provides immediate feedback during development.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseSqlMetadata, validateSqlMetadata } from './parser/index.js';
import { SQL_DIRECTORIES } from '../oracle/config.js';
import { logInfo } from '../utils/index.js';

/**
 * Run the SQL metadata parser test
 *
 * Parses the example-dual-query.sql file and logs results.
 * Only runs in development mode.
 */
export async function runSqlMetadataTest(): Promise<void> {
  console.log('\n[DEV] SQL Metadata Parser & Validator Test');
  console.log('============================================');

  try {
    // Load the example file
    const examplePath = join(SQL_DIRECTORIES.examples, 'example-dual-query.sql');
    const content = await readFile(examplePath, 'utf-8');
    const filename = 'example-dual-query.sql';

    // Parse metadata
    const metadata = parseSqlMetadata(content, filename);

    console.log('\n📄 PARSED METADATA:');
    console.log(`  File: ${filename}`);
    console.log(`  Name: ${metadata.name}`);
    console.log(`  Description: ${metadata.description}`);
    console.log(`  Category: ${metadata.category ?? '(none)'}`);
    console.log(`  Version: ${metadata.version ?? '(none)'}`);
    console.log(`  Author: ${metadata.author ?? '(none)'}`);
    console.log(`  Returns: ${String(metadata.returns?.length ?? 0)} columns`);

    if (metadata.returns && metadata.returns.length > 0) {
      for (const col of metadata.returns) {
        const desc = col.description ? ` — ${col.description}` : '';
        console.log(`    - ${col.name}: ${col.type}${desc}`);
      }
    }

    console.log(`  Parameters: ${String(metadata.params?.length ?? 0)}`);

    if (metadata.params && metadata.params.length > 0) {
      for (const param of metadata.params) {
        const req = param.required ? 'required' : 'optional';
        console.log(`    - ${param.name}: ${param.type} (${req})`);
      }
    }

    console.log(`  Tags: ${metadata.tags?.join(', ') ?? '(none)'}`);

    // Validate the metadata
    const validation = validateSqlMetadata(content, filename, metadata);

    console.log('\n🔍 VALIDATION RESULT:');
    console.log(`  Valid: ${validation.isValid ? '✅ Yes' : '❌ No'}`);
    console.log(`  Summary: ${String(validation.summary.errors)} errors, ${String(validation.summary.warnings)} warnings, ${String(validation.summary.info)} info`);

    if (validation.issues.length > 0) {
      console.log('\n  Issues:');
      for (const issue of validation.issues) {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`    ${icon} [${issue.code}] ${issue.message}`);
        if (issue.suggestion) {
          console.log(`       💡 ${issue.suggestion}`);
        }
      }
    }

    if (validation.recommendations.length > 0) {
      console.log('\n  Recommendations:');
      for (const rec of validation.recommendations) {
        console.log(`    → ${rec}`);
      }
    }

    console.log('\n============================================\n');

    logInfo('SQL', 'Metadata parser test completed successfully');

  } catch (error) {
    console.error('\n❌ SQL Metadata Test Failed:');
    console.error(error instanceof Error ? error.message : String(error));
    console.log('\n============================================\n');
  }
}
