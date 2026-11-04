import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  UserCheck,
  Sliders,
  Database,
} from 'lucide-react';
import { useVerifacta } from '../context/VerifactaContext';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetDemoData,
    policies,
    auditRecords,
    candidateRules,
    redTeamScenarios,
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
          automation, and local demonstration data persistence.
        </p>
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
              Phase 1 Local State & Demo Dataset Reset
            </h3>
          </div>
          <span className="font-mono text-xs text-slate-500">Browser localStorage</span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          All policies ({policies.length}), compiled candidate rules ({candidateRules.length}),
          red-team scenarios ({redTeamScenarios.length}), and audit trail reviews (
          {auditRecords.length}) are persisted locally in your browser so your edits survive page
          refreshes. You can restore the factory demonstration dataset at any time.
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
