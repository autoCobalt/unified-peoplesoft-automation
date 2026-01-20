/**
 * Connection Panel Container
 *
 * Displays Oracle SQL (left) and PeopleSoft SOAP (right) connection panels
 * side by side. Collapses to a single line when both are connected.
 */

import { motion } from 'framer-motion';
import { useConnection } from '../../context';
import { OracleConnection } from './OracleConnection';
import { SoapConnection } from './SoapConnection';
import { fadeIn } from '../../utils/motion';
import './ConnectionPanel.css';

export function ConnectionPanel() {
  const { isFullyConnected } = useConnection();

  return (
    <motion.section
      className={`connection-panel-container ${isFullyConnected ? 'fully-connected' : ''}`}
      {...fadeIn}
    >
      <OracleConnection />
      <SoapConnection />
    </motion.section>
  );
}
