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
import './ConnectionPanel.css';

export function ConnectionPanel() {
  const { isFullyConnected } = useConnection();

  return (
    <motion.section
      className={`connection-panel-container ${isFullyConnected ? 'fully-connected' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <OracleConnection />
      <SoapConnection />
    </motion.section>
  );
}
