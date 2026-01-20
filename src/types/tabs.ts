/**
 * Tab Configuration Types
 *
 * Defines the available tabs/features in the application.
 * Each tab represents a separate automation workflow.
 */

/* ==============================================
   Tab Base Type (for validation)
   ============================================== */

/**
 * Base configuration shape for a single tab
 * Used to validate TABS entries while allowing literal type inference
 */
interface TabConfigBase {
  /** Unique identifier for the tab */
  id: string;
  /** Display label shown in the UI */
  label: string;
  /** PeopleSoft Component Interface name (used for SOAP calls) */
  ciName: string;
  /** Brief description of what this tab does */
  description: string;
}

/* ==============================================
   Tab Configuration Data (Source of Truth)
   ============================================== */

/**
 * All available tabs in the application
 * Order determines display order in the TabNavigation component
 *
 * NOTE: This array is the single source of truth.
 * The TabId type is automatically derived from this data.
 */
export const TABS = [
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
] as const satisfies readonly TabConfigBase[];

/* ==============================================
   Derived Types
   ============================================== */

/**
 * Union type of all valid tab identifiers
 * Automatically derived from TABS array - no manual maintenance needed
 */
export type TabId = (typeof TABS)[number]['id'];

/* ==============================================
   Default Tab Configuration
   ============================================== */

/**
 * Index of the default tab to show on application load
 * Change this number to set a different default tab
 */
export const DEFAULT_TAB_INDEX = 0;

/**
 * Default tab ID derived from the index
 * This ensures the default always references a valid tab
 */
export const DEFAULT_TAB: TabId = TABS[DEFAULT_TAB_INDEX].id;
