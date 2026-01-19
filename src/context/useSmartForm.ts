/**
 * useSmartForm Hook
 *
 * Provides access to the SmartFormContext for managing
 * SmartForm state, query execution, and workflow actions.
 */

import { use } from 'react';
import { SmartFormContext, type SmartFormContextType } from './smartFormContextDef';

export function useSmartForm(): SmartFormContextType {
  const context = use(SmartFormContext);
  if (!context) {
    throw new Error('useSmartForm must be used within a SmartFormProvider');
  }
  return context;
}
