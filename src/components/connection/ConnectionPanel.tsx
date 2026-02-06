/**
 * Connection Panel Container
 *
 * Displays Oracle SQL (left) and PeopleSoft SOAP (right) connection panels
 * side by side. Collapses to a single line when both are connected.
 */

import { useConnectionStore } from '../../stores';
import { FadeIn } from '../motion';
import { OracleConnection } from './OracleConnection';
import { SoapConnection } from './SoapConnection';
import './ConnectionPanel.css';

export function ConnectionPanel() {
  const isFullyConnected = useConnectionStore(s => s.isFullyConnected);

  return (
    <FadeIn
      as="section"
      className={`connection-panel-container ${isFullyConnected ? 'fully-connected' : ''}`}
    >
      <OracleConnection />
      <SoapConnection />
    </FadeIn>
  );
}
