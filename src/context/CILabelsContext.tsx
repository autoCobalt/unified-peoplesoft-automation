/**
 * CI Labels Context Provider
 *
 * Caches CI field labels (name → label maps) application-wide.
 * Labels are fetched on-demand via /api/ci-shapes/labels?name=X
 * and cached in memory for the session lifetime.
 *
 * Uses useRef for in-flight dedup to prevent concurrent fetches
 * for the same CI name.
 */

import { useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { CILabelsContext, type CILabelsContextType } from './ciLabelsContextDef';
import { getSessionHeaders } from '../services/session';

/* ==============================================
   Provider Props
   ============================================== */

interface CILabelsProviderProps {
  children: ReactNode;
}

/* ==============================================
   Provider Implementation
   ============================================== */

export function CILabelsProvider({ children }: CILabelsProviderProps) {
  const [labels, setLabels] = useState<Partial<Record<string, Record<string, string>>>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Track in-flight fetches to prevent duplicate requests
  const inFlightRef = useRef<Set<string>>(new Set());

  const ensureLabels = useCallback(async (ciName: string) => {
    // Already cached or in-flight — skip
    if (ciName in labels || inFlightRef.current.has(ciName)) return;

    inFlightRef.current.add(ciName);
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/ci-shapes/labels?name=${encodeURIComponent(ciName)}`,
        { headers: getSessionHeaders() }
      );

      if (response.ok) {
        const json = await response.json() as { success: boolean; data: Record<string, string> };
        if (json.success) {
          setLabels(prev => ({ ...prev, [ciName]: json.data }));
        }
      }
    } catch {
      // Silently fail — getLabel returns fieldName as fallback
    } finally {
      inFlightRef.current.delete(ciName);
      setIsLoading(false);
    }
  }, [labels]);

  const getLabel = useCallback((ciName: string, fieldName: string): string => {
    return labels[ciName]?.[fieldName] ?? fieldName;
  }, [labels]);

  // Cast to the context type's expected shape (consumers don't need Partial)
  const contextValue: CILabelsContextType = useMemo(
    () => ({
      labels: labels as Record<string, Record<string, string>>,
      ensureLabels,
      getLabel,
      isLoading,
    }),
    [labels, ensureLabels, getLabel, isLoading]
  );

  return (
    <CILabelsContext value={contextValue}>
      {children}
    </CILabelsContext>
  );
}
