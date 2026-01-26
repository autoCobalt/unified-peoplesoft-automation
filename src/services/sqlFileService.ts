/**
 * SQL File Service (Client-Side)
 *
 * Manages localStorage for personal SQL directory configuration
 * and cached file listings.
 *
 * This service runs in the browser, not on the server.
 */

import type { SqlFileInfo } from '../types/sqlMetadata.js';

/* ==============================================
   Storage Keys
   ============================================== */

/** localStorage key for personal SQL directory path */
const PERSONAL_PATH_KEY = 'sql_personal_path';

/** localStorage key for cached personal SQL file listing */
const PERSONAL_CACHE_KEY = 'sql_personal_cache';

/** localStorage key for cache timestamp */
const PERSONAL_CACHE_TIME_KEY = 'sql_personal_cache_time';

/* ==============================================
   Personal Path Management
   ============================================== */

/**
 * Get the configured personal SQL directory path
 *
 * @returns The stored path or null if not configured
 */
export function getPersonalSqlPath(): string | null {
  try {
    return localStorage.getItem(PERSONAL_PATH_KEY);
  } catch {
    // localStorage may not be available (SSR, privacy mode, etc.)
    return null;
  }
}

/**
 * Set the personal SQL directory path
 *
 * @param path - The directory path to store
 */
export function setPersonalSqlPath(path: string): void {
  try {
    localStorage.setItem(PERSONAL_PATH_KEY, path);
  } catch {
    console.warn('Failed to save personal SQL path to localStorage');
  }
}

/**
 * Clear the personal SQL directory path
 */
export function clearPersonalSqlPath(): void {
  try {
    localStorage.removeItem(PERSONAL_PATH_KEY);
    // Also clear the cache when path is cleared
    clearPersonalSqlCache();
  } catch {
    // Ignore errors
  }
}

/* ==============================================
   Personal File Cache
   ============================================== */

/**
 * Get cached personal SQL file listing
 *
 * @returns Cached files or null if no cache exists
 */
export function getPersonalSqlCache(): SqlFileInfo[] | null {
  try {
    const cached = localStorage.getItem(PERSONAL_CACHE_KEY);
    if (!cached) {
      return null;
    }
    return JSON.parse(cached) as SqlFileInfo[];
  } catch {
    return null;
  }
}

/**
 * Store personal SQL file listing in cache
 *
 * @param files - The file listing to cache
 */
export function setPersonalSqlCache(files: SqlFileInfo[]): void {
  try {
    localStorage.setItem(PERSONAL_CACHE_KEY, JSON.stringify(files));
    localStorage.setItem(PERSONAL_CACHE_TIME_KEY, new Date().toISOString());
  } catch {
    console.warn('Failed to cache personal SQL files');
  }
}

/**
 * Clear the personal SQL file cache
 */
export function clearPersonalSqlCache(): void {
  try {
    localStorage.removeItem(PERSONAL_CACHE_KEY);
    localStorage.removeItem(PERSONAL_CACHE_TIME_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Get the timestamp when the cache was last updated
 *
 * @returns ISO timestamp or null if no cache exists
 */
export function getPersonalSqlCacheTime(): string | null {
  try {
    return localStorage.getItem(PERSONAL_CACHE_TIME_KEY);
  } catch {
    return null;
  }
}

/**
 * Check if the cache is stale (older than specified minutes)
 *
 * @param maxAgeMinutes - Maximum age in minutes (default: 30)
 * @returns true if cache is stale or doesn't exist
 */
export function isPersonalSqlCacheStale(maxAgeMinutes = 30): boolean {
  const cacheTime = getPersonalSqlCacheTime();
  if (!cacheTime) {
    return true;
  }

  const cacheDate = new Date(cacheTime);
  const now = new Date();
  const ageMs = now.getTime() - cacheDate.getTime();
  const ageMinutes = ageMs / (1000 * 60);

  return ageMinutes > maxAgeMinutes;
}

/* ==============================================
   Convenience Functions
   ============================================== */

/**
 * Get personal SQL configuration status
 *
 * @returns Object with path and cache status
 */
export function getPersonalSqlStatus(): {
  path: string | null;
  hasCachedFiles: boolean;
  cachedFileCount: number;
  cacheTime: string | null;
  isCacheStale: boolean;
} {
  const path = getPersonalSqlPath();
  const cache = getPersonalSqlCache();

  return {
    path,
    hasCachedFiles: cache !== null && cache.length > 0,
    cachedFileCount: cache?.length ?? 0,
    cacheTime: getPersonalSqlCacheTime(),
    isCacheStale: isPersonalSqlCacheStale(),
  };
}

/**
 * Initialize personal SQL configuration with a path
 *
 * Sets the path and clears any stale cache.
 *
 * @param path - The directory path to set
 */
export function initializePersonalSql(path: string): void {
  const currentPath = getPersonalSqlPath();

  // If path changed, clear the cache
  if (currentPath !== path) {
    clearPersonalSqlCache();
  }

  setPersonalSqlPath(path);
}
