/**
 * Panel Registry
 *
 * Maps tab IDs to their panel components. This is the single source of truth
 * for which component renders for each tab.
 *
 * When adding a new tab:
 * 1. Add the tab entry to TABS in src/types/tabs.ts
 * 2. Create the panel component in src/components/panels/
 * 3. Add the mapping here
 *
 * TypeScript will error if a tab ID is missing from this registry.
 */

import type { TabId } from '../../types';

// Panel component imports
import { SmartFormPanel } from './smartform';
import { EdwTransfersPanel } from './edw-transfers';
import { BulkPafPanel } from './bulk-paf';
import { ParkingDeductionsPanel } from './parking-deductions';
import { CiRecordEntryPanel } from './ci-record-entry';
import { MassEmailNoticesPanel } from './mass-email-notices';

/**
 * Registry mapping each tab ID to its panel component.
 * Using Record<TabId, ...> ensures all tabs have an entry.
 */
export const PANEL_REGISTRY: Record<TabId, React.ComponentType> = {
  'smartform': SmartFormPanel,
  'edw-transfers': EdwTransfersPanel,
  'bulk-paf': BulkPafPanel,
  'parking-deductions': ParkingDeductionsPanel,
  'ci-record-entry': CiRecordEntryPanel,
  'mass-email-notices': MassEmailNoticesPanel,
};
