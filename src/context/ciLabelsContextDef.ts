/**
 * CI Labels Context Definition
 *
 * Separated from CILabelsContext.tsx for fast refresh compatibility.
 * Contains only types and createContext - no state or hooks.
 *
 * Provides application-wide caching of CI field labels (name → label maps),
 * so any component can translate UPPER_SNAKE_CASE field names into
 * human-readable labels from PeopleSoft CI shapes.
 */

import { createContext } from 'react';

/* ==============================================
   Context Type Definition
   ============================================== */

export interface CILabelsContextType {
  /** Cached labels by CI name (e.g., { 'CI_POSITION_DATA': { 'POSITION_NBR': 'Position Number' } }) */
  labels: Record<string, Record<string, string>>;
  /** Fetch and cache labels for a CI (no-op if already cached) */
  ensureLabels: (ciName: string) => Promise<void>;
  /** Get a field label (returns fieldName as fallback if not cached) */
  getLabel: (ciName: string, fieldName: string) => string;
  /** Whether any label fetch is in progress */
  isLoading: boolean;
}

/* ==============================================
   Context Creation
   ============================================== */

export const CILabelsContext = createContext<CILabelsContextType | null>(null);
