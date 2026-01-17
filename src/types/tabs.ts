/**
 * Tab Configuration Types
 *
 * Defines the available tabs/features in the application.
 * Each tab represents a separate automation workflow.
 */

/* ==============================================
   Tab Type Definitions
   ============================================== */

/**
 * Union type of all valid tab identifiers
 * Add new tab IDs here as features are added
 */
export type TabId =
  | 'smartform'
  | 'edw-transfers'
  | 'bulk-paf'
  | 'parking-deductions'
  | 'ci-record-entry'
  | 'mass-email-notices';

/**
 * Configuration for a single tab
 */
export interface TabConfig {
  /** Unique identifier for the tab */
  id: TabId;
  /** Display label shown in the UI */
  label: string;
  /** PeopleSoft Component Interface name (used for SOAP calls) */
  ciName: string;
  /** Brief description of what this tab does */
  description: string;
}

/* ==============================================
   Tab Configuration Data
   ============================================== */

/**
 * All available tabs in the application
 * Order determines display order in the TabNavigation component
 */
export const TABS: TabConfig[] = [
  {
    id: 'smartform',
    label: 'SmartForm',
    ciName: 'CI_SMART_FORM',
    description: 'Process pending SmartForm transactions',
  },
  {
    id: 'edw-transfers',
    label: 'EDW Transfers',
    ciName: 'CI_EDW_TRANSFER',
    description: 'Manage EDW transfer requests',
  },
  {
    id: 'bulk-paf',
    label: 'Bulk PAF',
    ciName: 'CI_BULK_PAF',
    description: 'Bulk Personnel Action Form processing',
  },
  {
    id: 'parking-deductions',
    label: 'Parking Deductions',
    ciName: 'CI_PARKING_DED',
    description: 'Manage parking deduction records',
  },
  {
    id: 'ci-record-entry',
    label: 'CI Record Entry',
    ciName: 'CI_RECORD_ENTRY',
    description: 'PeopleSoft CI record entry (Excel to CI)',
  },
  {
    id: 'mass-email-notices',
    label: 'Mass Email Notices',
    ciName: 'N/A',
    description: 'Emails sent from department accounts using templates',
  },
];

/**
 * Default tab to show on application load
 */
export const DEFAULT_TAB: TabId = 'smartform';
