/**
 * Components barrel export
 *
 * Allows importing multiple components from a single path:
 * import { Header, ModeBanner, TabNavigation } from './components';
 */

export { ConnectionPanel } from './connection';
export { Footer } from './Footer';
export { Header } from './Header';
export { ModeBanner } from './ModeBanner';
export { ResponsiveText } from './ResponsiveText';
export { TabNavigation } from './TabNavigation';

// Tab content (manages panels internally)
export { TabContent } from './panels';

// Motion components (reusable animation wrappers)
export * from './motion';
