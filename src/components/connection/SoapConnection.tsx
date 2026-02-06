/**
 * SOAP Connection Panel
 *
 * Displays PeopleSoft ExcelToCI connection form and configuration info.
 * Collapses to a minimal view when connected, showing a green border
 * and expandable connection info.
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { soapConfig } from '../../config';
import { useConnectionStore } from '../../stores';
import { SlideIn, FadeIn } from '../motion';
import {
  InfoRow,
  CredentialsForm,
  ConnectionInfoPanel,
  ConnectedHeader,
} from './shared';

export function SoapConnection() {
  const soapState = useConnectionStore(s => s.soapState);
  const soapCredentials = useConnectionStore(s => s.soapCredentials);
  const connectSoap = useConnectionStore(s => s.connectSoap);
  const soapHintActive = useConnectionStore(s => s.soapHintActive);

  const [showInfo, setShowInfo] = useState(false);

  const displayUsername = soapCredentials?.username ?? '';

  // Build class list - only apply hint when not connected
  const panelClasses = [
    'connection-panel',
    'soap-panel',
    soapState.isConnected ? 'connected' : '',
    soapHintActive && !soapState.isConnected ? 'hint-active' : '',
  ].filter(Boolean).join(' ');

  const handleConnect = (credentials: { username: string; password: string }) => {
    void connectSoap(credentials);
  };

  const toggleInfo = () => { setShowInfo(!showInfo); };

  return (
    <SlideIn
      direction="right"
      delay={0.2}
      className={panelClasses}
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
          <FadeIn key="disconnected" withExit duration={0.2}>
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
          </FadeIn>
        )}
      </AnimatePresence>
    </SlideIn>
  );
}
