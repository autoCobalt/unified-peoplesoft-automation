/**
 * Test Site Route Handlers
 *
 * Serves a mock PeopleSoft-like transaction page for testing Playwright automation.
 * Uses Cheerio for server-side template rendering with query parameter injection.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { load } from 'cheerio';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sendJson } from '../utils/index.js';

/* ==============================================
   Template Loading
   ============================================== */

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, 'template.html');
const stylesPath = join(__dirname, 'styles.css');

// Load template at startup for performance
let transactionTemplate: string;
let stylesContent: string;

try {
  transactionTemplate = readFileSync(templatePath, 'utf-8');
  stylesContent = readFileSync(stylesPath, 'utf-8');
} catch (error) {
  console.error('[Test Site] Failed to load template files:', error);
  transactionTemplate = '<html><body>Template not found</body></html>';
  stylesContent = '';
}

/* ==============================================
   Template Rendering
   ============================================== */

/**
 * Render the transaction template with provided variables
 * Uses data-var attributes to identify elements for variable injection
 * Supports data-template for embedding values within surrounding text
 */
function renderTemplate(variables: Record<string, string>): string {
  const $ = load(transactionTemplate);

  // Find all elements with data-var attribute
  $('[data-var]').each((_index, element) => {
    const $el = $(element);
    const varName = $el.attr('data-var');
    const template = $el.attr('data-template');

    if (varName && Object.hasOwn(variables, varName)) {
      const value = variables[varName];
      if (template) {
        // Replace {value} placeholder in template string
        $el.text(template.replace('{value}', value));
      } else {
        // Direct value injection
        $el.text(value);
      }
    }
  });

  return $.html();
}

/* ==============================================
   Response Helpers
   ============================================== */

function sendHtml(res: ServerResponse, html: string): void {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}

function sendCss(res: ServerResponse, css: string): void {
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.end(css);
}

function send404(res: ServerResponse, message: string): void {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end(message);
}

/* ==============================================
   URL Parsing Helper
   ============================================== */

function parseQueryString(url: string): Record<string, string> {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return {};

  const queryString = url.slice(queryStart + 1);
  const params: Record<string, string> = {};

  for (const pair of queryString.split('&')) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) {
      // Key only, no value
      params[decodeURIComponent(pair)] = '';
    } else {
      const key = pair.slice(0, eqIndex);
      const value = pair.slice(eqIndex + 1);
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }

  return params;
}

/* ==============================================
   Route Handlers
   ============================================== */

/**
 * GET /test-site or /test-site?TRANSACTION_NBR=xxx
 * Renders the transaction page with the provided transaction number
 */
export function handleTransactionPage(
  req: IncomingMessage,
  res: ServerResponse
): void {
  const url = req.url ?? '/test-site';
  const params = parseQueryString(url);
  const transactionNumber = params['TRANSACTION_NBR'] ?? 'No Transaction';

  const html = renderTemplate({ TRANSACTION_NBR: transactionNumber });
  sendHtml(res, html);
}

/**
 * GET /test-site/css/styles.css
 * Serves the test site stylesheet
 */
export function handleStyles(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  sendCss(res, stylesContent);
}

/**
 * GET /test-site/health
 * Health check endpoint
 */
export function handleHealth(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  sendJson(res, 200, { status: 'ok', service: 'test-site' });
}

/* ==============================================
   Route Matching
   ============================================== */

/**
 * Handle incoming test-site requests
 * Returns true if the request was handled, false otherwise
 */
export function handleTestSiteRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  const url = req.url ?? '';
  const method = req.method ?? 'GET';

  // Only handle GET requests
  if (method !== 'GET') {
    return false;
  }

  // Extract path without query string
  const pathEnd = url.indexOf('?');
  const path = pathEnd === -1 ? url : url.slice(0, pathEnd);

  // Route matching
  if (path === '/test-site' || path === '/test-site/') {
    handleTransactionPage(req, res);
    return true;
  }

  if (path === '/test-site/css/styles.css') {
    handleStyles(req, res);
    return true;
  }

  if (path === '/test-site/health') {
    handleHealth(req, res);
    return true;
  }

  // Unknown test-site route
  if (path.startsWith('/test-site')) {
    send404(res, `Test site route not found: ${path}`);
    return true;
  }

  return false;
}
