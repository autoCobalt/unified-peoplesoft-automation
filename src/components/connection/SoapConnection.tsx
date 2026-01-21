/**
 * SOAP Connection Panel
 *
 * Displays PeopleSoft ExcelToCI connection form and configuration info.
 * Collapses to a minimal view when connected, showing a green border
 * and expandable connection info.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soapConfig } from '../../config';
import { useConnection } from '../../context';
import { slideRightFadeStagger, fadeInOut } from '../../utils/motion';
import {
  InfoRow,
  CredentialsForm,
  ConnectionInfoPanel,
  ConnectedHeader,
} from './shared';

export function SoapConnection() {
  const {
    soapState,
    soapCredentials,
    connectSoap,
  } = useConnection();

  const [showInfo, setShowInfo] = useState(false);

  const displayUsername = soapCredentials?.username ?? '';

  const handleConnect = (credentials: { username: string; password: string }) => {
    void connectSoap(credentials);
  };

  const toggleInfo = () => { setShowInfo(!showInfo); };

  return (
    <motion.div
      className={`connection-panel soap-panel ${soapState.isConnected ? 'connected' : ''}`}
      {...slideRightFadeStagger}
    >
      <AnimatePresence mode="wait">
        {soapState.isConnected ? (
          <ConnectedHeader
            title="PeopleSoft"
            username={displayUsername}
            showInfo={showInfo}
            onToggleInfo={toggleInfo}
          >
            <InfoRow label="Server" value={`${soapConfig.server}:${soapConfig.port}`} />
            <InfoRow label="Site" value={soapConfig.siteName} />
            <InfoRow label="Node" value={soapConfig.node} />
          </ConnectedHeader>
        ) : (
          <motion.div key="disconnected" {...fadeInOut}>
            <div className="panel-header">
              <h2>PeopleSoft CI Connection</h2>
            </div>

            <CredentialsForm
              idPrefix="soap"
              placeholders={{
                username: 'Enter PeopleSoft username',
                password: 'Enter PeopleSoft password',
              }}
              submitLabel="Connect to SOAP"
              loadingLabel="Connecting..."
              isSubmitting={soapState.isConnecting}
              error={soapState.error}
              onSubmit={handleConnect}
            />

            <ConnectionInfoPanel
              isOpen={showInfo}
              onToggle={toggleInfo}
            >
              <InfoRow label="Server" value={`${soapConfig.server}:${soapConfig.port}`} />
              <InfoRow label="Site" value={soapConfig.siteName} />
              <InfoRow label="Portal" value={soapConfig.portal} />
              <InfoRow label="Node" value={soapConfig.node} />
            </ConnectionInfoPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
