/**
 * Connection Panel Container
 *
 * Displays Oracle SQL (left) and PeopleSoft SOAP (right) connection panels
 * side by side. Collapses to a single line when both are connected.
 */

import { useConnection } from '../../context';
import { FadeIn } from '../motion';
import { OracleConnection } from './OracleConnection';
import { SoapConnection } from './SoapConnection';
import './ConnectionPanel.css';

export function ConnectionPanel() {
  const { isFullyConnected } = useConnection();

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
