/**
 * AppProviders Component
 *
 * Composes all application context providers into a single component.
 * Uses the reduce pattern to avoid deep nesting as providers scale.
 *
 * To add a new provider:
 * 1. Import the provider
 * 2. Add it to the PROVIDERS array (order matters for dependencies)
 *
 * Provider order: Earlier providers wrap later ones, so if ProviderB
 * depends on ProviderA, ProviderA should come first in the array.
 */

import type { ComponentType, ReactNode } from 'react';
import { ConnectionProvider } from './ConnectionContext';
import { CILabelsProvider } from './CILabelsContext';
import { SmartFormProvider } from './SmartFormContext';

/* ==============================================
   Provider Type
   ============================================== */

type ProviderComponent = ComponentType<{ children: ReactNode }>;

/* ==============================================
   Provider Registry
   ============================================== */

/**
 * Array of all context providers.
 * Order matters: providers are composed from first to last,
 * meaning earlier providers wrap later ones.
 *
 * Example: [A, B, C] results in <A><B><C>{children}</C></B></A>
 */
const PROVIDERS: ProviderComponent[] = [
  ConnectionProvider,
  CILabelsProvider,
  SmartFormProvider,
  // Add future tab providers here:
  // EDWTransferProvider,
  // PositionManagementProvider,
  // etc.
];

/* ==============================================
   AppProviders Component
   ============================================== */

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Composes all providers using reduceRight.
 *
 * reduceRight is used so that the first provider in the array
 * becomes the outermost wrapper (matching visual order).
 */
export function AppProviders({ children }: AppProvidersProps) {
  return PROVIDERS.reduceRight<ReactNode>(
    (acc, Provider) => <Provider>{acc}</Provider>,
    children
  );
}
