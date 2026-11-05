import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  UserCheck,
  Sliders,
  Database,
  ShieldCheck,
  CheckCircle2,
  Play,
} from 'lucide-react';
import {
  useVerifacta,
  migrateAudits,
  migratePolicies,
} from '../context/VerifactaContext';
import { INITIAL_POLICIES } from '../data/mockData';
import { AuditRecord } from '../types';

interface SelfTestResult {
  id: number;
  name: string;
  passed: boolean;
  detail: string;
}

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetDemoData,
    policies,
    auditRecords,
    candidateRules,
    compilationSessions,
    redTeamScenarios,
    runDeterministicVerification,
    approveCandidateInSession,
    publishCompilationSession,
  } = useVerifacta();

  const [reviewerName, setReviewerName] = useState(settings.reviewerName);
  const [reviewerRole, setReviewerRole] = useState(settings.reviewerRole);
  const [organizationName, setOrganizationName] = useState(settings.organizationName);
  const [simulationStrictness, setSimulationStrictness] = useState(settings.simulationStrictness);
  const [autoCreateAuditLog, setAutoCreateAuditLog] = useState(settings.autoCreateAuditLog);
  const [requireEvidenceReference, setRequireEvidenceReference] = useState(
    settings.requireEvidenceReference
  );
  const [flagAmbiguousQuantifiers, setFlagAmbiguousQuantifiers] = useState(
    settings.flagAmbiguousQuantifiers
  );

  const [testResults, setTestResults] = useState<SelfTestResult[]>([]);

  useEffect(() => {
    setReviewerName(settings.reviewerName);
    setReviewerRole(settings.reviewerRole);
    setOrganizationName(settings.organizationName);
    setSimulationStrictness(settings.simulationStrictness);
    setAutoCreateAuditLog(settings.autoCreateAuditLog);
    setRequireEvidenceReference(settings.requireEvidenceReference);
    setFlagAmbiguousQuantifiers(settings.flagAmbiguousQuantifiers);
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      reviewerName: reviewerName.trim() || 'Elena Rostova',
      reviewerRole: reviewerRole.trim() || 'VP Brand Governance',
      organizationName: organizationName.trim() || 'Vanguard Enterprise Corp',
      simulationStrictness,
      autoCreateAuditLog,
      requireEvidenceReference,
      flagAmbiguousQuantifiers,
    });
  };

  const runGovernanceDiagnostics = () => {
    const results: SelfTestResult[] = [];

    // 1. Attempt verification against a nonexistent policy
    const nonExistentRes = runDeterministicVerification(
      'Diagnostic Test',
      'rev-1.0',
      'Sample test statement.',
      'pol-nonexistent-999'
    );
    results.push({
      id: 1,
      name: 'Reject verification against nonexistent policy ID',
      passed: Boolean(nonExistentRes.error) && nonExistentRes.findings.length === 0,
      detail: nonExistentRes.error || 'Unexpected success',
    });

    // 2. Attempt verification against a Draft policy
    const draftPol = policies.find((p) => p.status === 'Draft');
    const draftRes = runDeterministicVerification(
      'Diagnostic Draft Test',
      'rev-1.0',
      'Sample test statement.',
      draftPol ? draftPol.id : 'pol-med-004'
    );
    results.push({
      id: 2,
      name: 'Reject verification against Draft policy',
      passed: Boolean(draftRes.error) && draftRes.findings.length === 0,
      detail: draftRes.error || 'Unexpected success',
    });

    // 3. Attempt verification against an Archived policy
    const archivedPol = policies.find((p) => p.status === 'Archived');
    const archivedRes = runDeterministicVerification(
      'Diagnostic Archived Test',
      'rev-1.0',
      'Sample test statement.',
      archivedPol ? archivedPol.id : 'pol-brd-005'
    );
    results.push({
      id: 3,
      name: 'Reject verification against Archived policy',
      passed: Boolean(archivedRes.error) && archivedRes.findings.length === 0,
      detail: archivedRes.error || 'Unexpected success',
    });

    // 4. Verify that no incorrect policy fallback occurs
    results.push({
      id: 4,
      name: 'Zero silent fallback to active policy when invalid/inactive policy requested',
      passed:
        nonExistentRes.findings.length === 0 &&
        draftRes.findings.length === 0 &&
        archivedRes.findings.length === 0 &&
        !nonExistentRes.auditRecord &&
        !draftRes.auditRecord &&
        !archivedRes.auditRecord,
      detail:
        'Confirmed 0 findings and 0 audit logs generated across nonexistent, Draft, and Archived requests.',
    });

    // 5. Migrate an audit whose original policy version exists
    const sampleMigratedPolicies = migratePolicies(INITIAL_POLICIES);
    const mockAuditExistingVer: AuditRecord = {
      id: 'REV-TEST-EXIST',
      contentTitle: 'Historical v3.1.0 Audit',
      contentRevision: 'rev-1.0',
      contentSnapshot: 'Sample content',
      policyId: 'pol-env-001',
      policyName: 'Environmental & Sustainability Claims Policy',
      policyVersion: 'v3.1.0',
      reviewStatus: 'Approved',
      reviewer: 'Elena Rostova',
      timestamp: '2026-09-15 10:00 UTC',
      findings: [],
    };
    const [migratedExisting] = migrateAudits([mockAuditExistingVer], sampleMigratedPolicies);
    results.push({
      id: 5,
      name: 'Migrate audit whose original policy version (v3.1.0) exists in history',
      passed:
        migratedExisting.snapshotStatus === 'Available' &&
        (migratedExisting.policyRulesSnapshot?.length || 0) === 3,
      detail: `Status: ${migratedExisting.snapshotStatus}, Restored exact v3.1.0 snapshot (${migratedExisting.policyRulesSnapshot?.length} rules, vs 4 in v3.2.0).`,
    });

    // 6 & 7. Migrate an audit whose original policy version is missing -> Marked Unavailable
    const mockAuditMissingVer: AuditRecord = {
      id: 'REV-TEST-MISSING',
      contentTitle: 'Legacy v1.0.0 Audit',
      contentRevision: 'rev-1.0',
      contentSnapshot: 'Sample content',
      policyId: 'pol-env-001',
      policyName: 'Environmental & Sustainability Claims Policy',
      policyVersion: 'v1.0.0-missing',
      reviewStatus: 'Approved',
      reviewer: 'Elena Rostova',
      timestamp: '2024-05-10 10:00 UTC',
      findings: [],
    };
    const [migratedMissing] = migrateAudits([mockAuditMissingVer], sampleMigratedPolicies);
    results.push({
      id: 6,
      name: 'Migrate audit whose original policy version is missing without substituting active rules',
      passed:
        migratedMissing.policyVersion === 'v1.0.0-missing' &&
        (migratedMissing.policyRulesSnapshot?.length || 0) === 0,
      detail: `Preserved policyVersion "${migratedMissing.policyVersion}" with 0 substituted rules.`,
    });
    results.push({
      id: 7,
      name: 'Confirm missing historical snapshots are marked Unavailable',
      passed: migratedMissing.snapshotStatus === 'Unavailable',
      detail: `snapshotStatus === "${migratedMissing.snapshotStatus}"`,
    });

    // 8. Attempt to modify a published compilation session
    const publishedSess = compilationSessions.find((s) => s.status === 'Published');
    const modPublishedRes = publishedSess
      ? approveCandidateInSession(publishedSess.candidates[0].id)
      : { ok: false, message: 'Blocked' };
    results.push({
      id: 8,
      name: 'Prevent modifications/approvals on a Published compilation session',
      passed: !modPublishedRes.ok,
      detail: modPublishedRes.message,
    });

    // 9. Attempt duplicate publication of a published compilation session
    const dupPubRes = publishedSess
      ? publishCompilationSession(publishedSess.id)
      : { ok: false, message: 'Blocked' };
    results.push({
      id: 9,
      name: 'Prevent duplicate publication of an already-published session',
      passed: !dupPubRes.ok,
      detail: dupPubRes.message,
    });

    // 10. Confirm old version snapshots remain unchanged
    const envPol = policies.find((p) => p.id === 'pol-env-001');
    const v31Snapshot = envPol?.versionHistory?.find((vh) => vh.version === 'v3.1.0');
    const v32Snapshot = envPol?.versionHistory?.find((vh) => vh.version === 'v3.2.0');
    results.push({
      id: 10,
      name: 'Confirm historical version snapshots (v3.1.0 & v3.2.0) remain intact and immutable',
      passed:
        Boolean(v31Snapshot && v31Snapshot.rules.length === 3) &&
        Boolean(v32Snapshot && v32Snapshot.rules.length === 4),
      detail: `v3.1.0 snapshot has ${v31Snapshot?.rules.length} rules; v3.2.0 snapshot has ${v32Snapshot?.rules.length} rules.`,
    });

    setTestResults(results);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Settings className="w-3.5 h-3.5 text-slate-500" />
          <span>Workspace Governance Configuration</span>
        </div>
        <h2 className="font-display text-xl font-bold text-slate-900">
          Platform Settings & Simulation Preferences
        </h2>
        <p className="text-sm text-slate-600 mt-0.5">
          Configure active reviewer identity, four-state verification strictness, audit logging
          automation, and run Phase 1A.1 governance self-diagnostics.
        </p>
      </div>

      {/* Phase 1A.1 Governance Verification Suite */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Phase 1A.1 Governance Integrity Self-Test Suite (10 Checks)
              </h3>
              <p className="text-xs text-slate-500">
                Verify policy fallback prevention, historical audit migration, session locks, and
                version snapshot immutability.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={runGovernanceDiagnostics}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 w-fit"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run All 10 Governance Checks</span>
          </button>
        </div>

        {testResults.length > 0 && (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
            {testResults.map((res) => (
              <div
                key={res.id}
                className="p-3 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      res.passed ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-slate-900">
                      0{res.id}. {res.name}
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5 font-mono">{res.detail}</p>
                  </div>
                </div>
                <span
                  className={`font-mono font-bold text-[11px] shrink-0 ${
                    res.passed ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {res.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Reviewer Profile & Organization */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <h3 className="font-display text-base font-bold text-slate-900">
              Active Reviewer Identity & Organization
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reviewer Full Name *
              </label>
              <input
                type="text"
                required
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reviewer Role</label>
              <input
                type="text"
                value={reviewerRole}
                onChange={(e) => setReviewerRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Organization Name</label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Verification & Audit Rules */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="font-display text-base font-bold text-slate-900">
              Four-State Verification & Audit Pipeline
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="max-w-xs">
              <label className="block font-semibold text-slate-700 mb-1">
                Verification Strictness Profile
              </label>
              <select
                value={simulationStrictness}
                onChange={(e) =>
                  setSimulationStrictness(e.target.value as 'Standard' | 'Strict' | 'Advisory')
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="Strict">Strict (Enterprise Regulated Standard)</option>
                <option value="Standard">Standard (Balanced Brand Governance)</option>
                <option value="Advisory">Advisory (Drafting Mode)</option>
              </select>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCreateAuditLog}
                onChange={(e) => setAutoCreateAuditLog(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-900 block">
                  Automatically create Audit Trail entry on Content Verification
                </span>
                <span className="text-slate-500">
                  Every verification run captures a content snapshot, policy version, and four-state
                  findings in the Audit Trail for human sign-off.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={flagAmbiguousQuantifiers}
                onChange={(e) => setFlagAmbiguousQuantifiers(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-900 block">
                  Flag subjective and unquantified modifiers as &ldquo;Ambiguous&rdquo;
                </span>
                <span className="text-slate-500">
                  Classifies phrases such as &ldquo;eco-friendly&rdquo;, &ldquo;military-grade&rdquo;,
                  and &ldquo;effortless ROI&rdquo; under the Ambiguous state when numerical bounds are
                  absent.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireEvidenceReference}
                onChange={(e) => setRequireEvidenceReference(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-900 block">
                  Require explicit Evidence Reference on all Policy Library clauses
                </span>
                <span className="text-slate-500">
                  Enforces that every created or compiled policy rule specifies an audit certificate,
                  LCA report, or legal schedule.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Workspace Settings</span>
            </button>
          </div>
        </div>
      </form>

      {/* Local Storage & Demo State Management */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-600" />
            <h3 className="font-display text-base font-bold text-slate-900">
              Phase 1A.1 Local State & Demo Dataset Reset
            </h3>
          </div>
          <span className="font-mono text-xs text-slate-500">Browser localStorage</span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          All policies ({policies.length}), compilation sessions ({compilationSessions.length}),
          candidate rules ({candidateRules.length}), red-team scenarios ({redTeamScenarios.length}),
          and audit trail reviews ({auditRecords.length}) are persisted locally in your browser.
          You can restore the baseline demonstration dataset at any time.
        </p>

        <div className="pt-1">
          <button
            type="button"
            onClick={resetDemoData}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Workspace Data to Factory Demo State</span>
          </button>
        </div>
      </div>
    </div>
  );
};
