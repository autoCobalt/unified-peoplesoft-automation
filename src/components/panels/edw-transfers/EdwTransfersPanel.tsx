/**
 * EdwTransfersPanel Component
 *
 * Main panel for the EDW Transfers feature.
 * Handles Enterprise Data Warehouse transfer operations.
 */

import { PlaceholderSection } from '../shared';
import './EdwTransfersPanel.css';

export function EdwTransfersPanel() {
  return (
    <section className="feature-panel edw-transfers-panel">
      <PlaceholderSection
        icon="🔄"
        title="EDW Transfers"
        description="Manage Enterprise Data Warehouse transfers"
      />
    </section>
  );
}
