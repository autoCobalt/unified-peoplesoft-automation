/**
 * CI Labels Store (Zustand)
 *
 * Application-wide cache for CI field labels (name → label maps).
 * Replaces CILabelsContext + CILabelsProvider + useCILabels.
 *
 * Labels are fetched on-demand via /api/ci-shapes/labels?name=X
 * and cached in memory for the session lifetime.
 */

import { create } from 'zustand';
import { getSessionHeaders } from '../services/session';

/* ==============================================
   Store Type
   ============================================== */

interface CILabelsState {
  /** Cached labels by CI name */
  labels: Partial<Record<string, Record<string, string>>>;
  /** Whether any label fetch is in progress */
  isLoading: boolean;
  /** Fetch and cache labels for a CI (no-op if already cached or in-flight) */
  ensureLabels: (ciName: string) => Promise<void>;
  /** Get a field label (returns fieldName as fallback if not cached) */
  getLabel: (ciName: string, fieldName: string) => string;
}

/* ==============================================
   In-Flight Tracking (module-level, not state)
   ============================================== */

const inFlight = new Set<string>();

/* ==============================================
   Store Definition
   ============================================== */

export const useCILabelsStore = create<CILabelsState>((set, get) => ({
  labels: {},
  isLoading: false,

  ensureLabels: async (ciName: string) => {
    // Already cached or in-flight — skip
    if (ciName in get().labels || inFlight.has(ciName)) return;

    inFlight.add(ciName);
    set({ isLoading: true });

    try {
      const response = await fetch(
        `/api/ci-shapes/labels?name=${encodeURIComponent(ciName)}`,
        { headers: getSessionHeaders() },
      );

      if (response.ok) {
        const json = await response.json() as { success: boolean; data: Record<string, string> };
        if (json.success) {
          set(state => ({ labels: { ...state.labels, [ciName]: json.data } }));
        }
      }
    } catch {
      // Silently fail — getLabel returns fieldName as fallback
    } finally {
      inFlight.delete(ciName);
      set({ isLoading: false });
    }
  },

  getLabel: (ciName: string, fieldName: string): string => {
    return get().labels[ciName]?.[fieldName] ?? fieldName;
  },
}));
