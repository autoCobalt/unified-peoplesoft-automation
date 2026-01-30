/**
 * useCILabels Hook
 *
 * Provides access to the CILabelsContext for looking up
 * human-readable labels for CI field names.
 */

import { use } from 'react';
import { CILabelsContext, type CILabelsContextType } from './ciLabelsContextDef';

export function useCILabels(): CILabelsContextType {
  const context = use(CILabelsContext);
  if (!context) {
    throw new Error('useCILabels must be used within a CILabelsProvider');
  }
  return context;
}
