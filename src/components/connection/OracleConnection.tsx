/**
 * Oracle Connection Panel
 *
 * Displays Oracle SQL connection form with credentials.
 * Collapses to a minimal view when connected, showing a green border
 * and expandable connection info.
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { oracleConfig } from '../../config';
import { useConnectionStore } from '../../stores';
import { SlideIn, FadeIn } from '../motion';
import {
  InfoRow,
  CredentialsForm,
  ConnectionInfoPanel,
  ConnectedHeader,
} from './shared';

export function OracleConnection() {
  const oracleState = useConnectionStore(s => s.oracleState);
  const oracleCredentials = useConnectionStore(s => s.oracleCredentials);
  const connectOracle = useConnectionStore(s => s.connectOracle);
  const oracleHintActive = useConnectionStore(s => s.oracleHintActive);

  const [showInfo, setShowInfo] = useState(false);

  const displayUsername = oracleCredentials?.username ?? '';

  // Build class list - only apply hint when not connected
  const panelClasses = [
    'connection-panel',
    'oracle-panel',
    oracleState.isConnected ? 'connected' : '',
    oracleHintActive && !oracleState.isConnected ? 'hint-active' : '',
  ].filter(Boolean).join(' ');

  const handleConnect = (credentials: { username: string; password: string }) => {
    void connectOracle(credentials);
  };

  const toggleInfo = () => { setShowInfo(!showInfo); };

  return (
    <SlideIn
      direction="left"
      delay={0.1}
      className={panelClasses}
    >
      <AnimatePresence mode="wait">
        {oracleState.isConnected ? (
          <ConnectedHeader
            title="Oracle"
            subtitle={<span className="connected-service-name">{oracleConfig.serviceName}</span>}
            username={displayUsername}
            showInfo={showInfo}
            onToggleInfo={toggleInfo}
          >
            <InfoRow label="Hostname" value={oracleConfig.hostname} />
            <InfoRow label="Port" value={oracleConfig.port} />
            <InfoRow label="Service Name" value={oracleConfig.serviceName} valueClassName="service-name" />
          </ConnectedHeader>
        ) : (
          <FadeIn key="disconnected" withExit duration={0.2}>
            <div className="panel-header">
              <h2>Oracle SQL Connection</h2>
            </div>

            <CredentialsForm
              idPrefix="oracle"
              placeholders={{
                username: 'Enter Oracle username',
                password: 'Enter Oracle password',
              }}
              submitLabel="Test Connection"
              loadingLabel="Testing..."
              isSubmitting={oracleState.isConnecting}
              error={oracleState.error}
              onSubmit={handleConnect}
            />

            <ConnectionInfoPanel
              isOpen={showInfo}
              onToggle={toggleInfo}
              badge={<>Service Name: {oracleConfig.serviceName}</>}
            >
              <InfoRow label="Database Type" value="Oracle" />
              <InfoRow label="Role" value="default" />
              <InfoRow label="Auth Type" value="Default" />
              <InfoRow label="Connection" value="Basic" />
              <InfoRow label="Hostname" value={oracleConfig.hostname} highlight />
              <InfoRow label="Port" value={oracleConfig.port} />
              <InfoRow label="Service Name" value={oracleConfig.serviceName} valueClassName="service-name" />
            </ConnectionInfoPanel>
          </FadeIn>
        )}
      </AnimatePresence>
    </SlideIn>
  );
}
