/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VerifactaProvider, useVerifacta } from './context/VerifactaContext';
import { AppShell } from './components/AppShell';
import { OverviewDashboard } from './views/OverviewDashboard';
import { PolicyLibrary } from './views/PolicyLibrary';
import { PolicyCompiler } from './views/PolicyCompiler';
import { ContentVerification } from './views/ContentVerification';
import { PolicyRedTeam } from './views/PolicyRedTeam';
import { AuditTrail } from './views/AuditTrail';
import { SettingsView } from './views/SettingsView';

const WorkspaceRouter: React.FC = () => {
  const { activeTab } = useVerifacta();

  switch (activeTab) {
    case 'overview':
      return <OverviewDashboard />;
    case 'policy-library':
      return <PolicyLibrary />;
    case 'policy-compiler':
      return <PolicyCompiler />;
    case 'content-verification':
      return <ContentVerification />;
    case 'red-team':
      return <PolicyRedTeam />;
    case 'audit-trail':
      return <AuditTrail />;
    case 'settings':
      return <SettingsView />;
    default:
      return <OverviewDashboard />;
  }
};

export default function App() {
  return (
    <VerifactaProvider>
      <AppShell>
        <WorkspaceRouter />
      </AppShell>
    </VerifactaProvider>
  );
}
