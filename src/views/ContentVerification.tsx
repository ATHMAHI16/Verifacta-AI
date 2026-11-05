import React, { useState, useEffect } from 'react';
import {
  FileSearch,
  ShieldCheck,
  History,
  BookOpen,
  ArrowUpRight,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useVerifacta } from '../context/VerifactaContext';
import { SAMPLE_CONTENT_DRAFTS } from '../data/mockData';
import { VerificationFinding, VerificationState, AuditRecord } from '../types';
import { FourStateIndicator, PolicyStatusIndicator } from '../components/StatusIndicators';

export const ContentVerification: React.FC = () => {
  const {
    policies,
    preselectedVerifyPolicyId,
    setPreselectedVerifyPolicyId,
    runDeterministicVerification,
    setSelectedAuditIdForDetail,
    setSelectedPolicyIdForDetail,
    setActiveTab,
  } = useVerifacta();

  const defaultDraft = SAMPLE_CONTENT_DRAFTS[0];

  const [selectedDraftId, setSelectedDraftId] = useState<string>(defaultDraft.id);
  const [contentTitle, setContentTitle] = useState<string>(defaultDraft.title);
  const [contentRevision, setContentRevision] = useState<string>(defaultDraft.revision);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(defaultDraft.policyId);
  const [contentBody, setContentBody] = useState<string>(defaultDraft.content);
  const [validationError, setValidationError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const [findings, setFindings] = useState<VerificationFinding[]>(() =>
    defaultDraft.presetFindings.map((f, idx) => ({ ...f, id: `init-find-${idx}` }))
  );
  const [evaluatedPolicySummary, setEvaluatedPolicySummary] = useState<{
    name: string;
    version: string;
    ruleCount: number;
  }>(() => {
    const initialPol = policies.find((p) => p.id === defaultDraft.policyId) || policies[0];
    return {
      name: initialPol?.name || 'Environmental & Sustainability Claims Policy',
      version: initialPol?.version || 'v3.2.0',
      ruleCount: initialPol?.rules.length || 4,
    };
  });
  const [latestAuditRecord, setLatestAuditRecord] = useState<AuditRecord | null>(null);
  const [stateFilter, setStateFilter] = useState<'All' | VerificationState>('All');

  useEffect(() => {
    if (preselectedVerifyPolicyId) {
      setSelectedPolicyId(preselectedVerifyPolicyId);
      setValidationError('');
      const matchingDraft = SAMPLE_CONTENT_DRAFTS.find(
        (d) => d.policyId === preselectedVerifyPolicyId
      );
      if (matchingDraft) {
        setSelectedDraftId(matchingDraft.id);
        setContentTitle(matchingDraft.title);
        setContentRevision(matchingDraft.revision);
        setContentBody(matchingDraft.content);
        const pol = policies.find((p) => p.id === preselectedVerifyPolicyId);
        if (pol && pol.status === 'Active') {
          setFindings(
            matchingDraft.presetFindings.map((f, idx) => ({
              ...f,
              id: `preset-find-${idx}`,
            }))
          );
          setEvaluatedPolicySummary({
            name: pol.name,
            version: pol.version,
            ruleCount: pol.rules.length,
          });
        }
      }
      setPreselectedVerifyPolicyId(null);
    }
  }, [preselectedVerifyPolicyId, setPreselectedVerifyPolicyId, policies]);

  const handleSelectDraft = (draftId: string) => {
    const draft = SAMPLE_CONTENT_DRAFTS.find((d) => d.id === draftId);
    if (!draft) return;
    setSelectedDraftId(draft.id);
    setContentTitle(draft.title);
    setContentRevision(draft.revision);
    setSelectedPolicyId(draft.policyId);
    setContentBody(draft.content);
    setValidationError('');
    const targetPol = policies.find((p) => p.id === draft.policyId);
    if (targetPol && targetPol.status === 'Active') {
      setFindings(
        draft.presetFindings.map((f, idx) => ({
          ...f,
          id: `draft-find-${Date.now()}-${idx}`,
        }))
      );
      setEvaluatedPolicySummary({
        name: targetPol.name,
        version: targetPol.version,
        ruleCount: targetPol.rules.length,
      });
    }
  };

  const handleVerifyContent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentTitle.trim() || !contentBody.trim()) {
      setValidationError('Please provide both a content title and marketing copy to verify.');
      return;
    }

    setValidationError('');
    setIsVerifying(true);

    setTimeout(() => {
      const result = runDeterministicVerification(
        contentTitle,
        contentRevision,
        contentBody,
        selectedPolicyId
      );
      if (result.error) {
        setValidationError(result.error);
        setFindings([]);
      } else {
        setFindings(result.findings);
        const chosenPol = policies.find((p) => p.id === selectedPolicyId);
        if (chosenPol) {
          setEvaluatedPolicySummary({
            name: chosenPol.name,
            version: chosenPol.version,
            ruleCount: chosenPol.rules.length,
          });
        }
        if (result.auditRecord) {
          setLatestAuditRecord(result.auditRecord);
        }
        setStateFilter('All');
      }
      setIsVerifying(false);
    }, 260);
  };

  // Exact lookup without fallback
  const selectedPolicy = policies.find((p) => p.id === selectedPolicyId) || null;

  const counts = {
    Supported: findings.filter((f) => f.state === 'Supported').length,
    Contradicted: findings.filter((f) => f.state === 'Contradicted').length,
    Unverified: findings.filter((f) => f.state === 'Unverified').length,
    Ambiguous: findings.filter((f) => f.state === 'Ambiguous').length,
  };

  const filteredFindings = findings.filter(
    (f) => stateFilter === 'All' || f.state === stateFilter
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-700 font-medium mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              Strict Active Published Policy Enforcement · Zero Silent Policy Substitution
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Evidence-Grounded Content Verification
          </h2>
          <p className="text-sm text-slate-600 mt-0.5 max-w-3xl">
            Evaluate draft marketing copy against a selected policy. Verification strictly requires
            an Active published policy version—requests targeting Draft, Archived, or nonexistent
            policies are rejected without substituting another policy.
          </p>
        </div>

        {latestAuditRecord && (
          <button
            onClick={() => {
              setSelectedAuditIdForDetail(latestAuditRecord.id);
              setActiveTab('audit-trail');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
          >
            <History className="w-3.5 h-3.5" />
            <span>
              View Logged Audit ({latestAuditRecord.id} · {latestAuditRecord.policyVersion})
            </span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Content Submission Form */}
        <form
          onSubmit={handleVerifyContent}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900">
              1. Content Submission
            </h3>
            <span className="text-xs text-slate-500">Load sample or enter custom copy</span>
          </div>

          {validationError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-red-900">Verification Rejected</p>
                <p className="leading-relaxed">{validationError}</p>
              </div>
            </div>
          )}

          {/* Sample Draft Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Preset Sample Drafts
            </label>
            <select
              value={selectedDraftId}
              onChange={(e) => handleSelectDraft(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
            >
              {SAMPLE_CONTENT_DRAFTS.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {draft.title}
                </option>
              ))}
              {selectedDraftId === 'custom' && (
                <option value="custom">Custom Marketing Copy</option>
              )}
            </select>
          </div>

          {/* Content Title & Revision */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Content Title *
              </label>
              <input
                type="text"
                value={contentTitle}
                onChange={(e) => {
                  setContentTitle(e.target.value);
                  setSelectedDraftId('custom');
                }}
                placeholder="e.g., Q4 Sustainability Product Launch"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Revision</label>
              <input
                type="text"
                value={contentRevision}
                onChange={(e) => setContentRevision(e.target.value)}
                placeholder="rev-1.0"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Governing Policy Selection (All Policies Shown with Status & Version) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Governing Policy Selection *
              </label>
              {selectedPolicy && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPolicyIdForDetail(selectedPolicy.id);
                    setActiveTab('policy-library');
                  }}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Inspect in Library</span>
                </button>
              )}
            </div>
            <select
              value={selectedPolicyId}
              onChange={(e) => {
                setSelectedPolicyId(e.target.value);
                setValidationError('');
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {policies.map((pol) => (
                <option key={pol.id} value={pol.id}>
                  {pol.name} — {pol.version} [{pol.status}]
                </option>
              ))}
              <option value="pol-nonexistent-999">
                [Governance Test] Nonexistent Policy ID (pol-nonexistent-999)
              </option>
            </select>

            {/* Pre-Verification Selected Policy Target Summary Box */}
            <div
              className={`mt-2.5 p-3 rounded-lg border text-xs ${
                !selectedPolicy
                  ? 'bg-red-50/70 border-red-200 text-red-900'
                  : selectedPolicy.status === 'Active'
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}
            >
              {selectedPolicy ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 truncate">
                      {selectedPolicy.name}
                    </span>
                    <PolicyStatusIndicator status={selectedPolicy.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <span>
                      Published Version:{' '}
                      <strong className="font-mono text-slate-900">
                        {selectedPolicy.status === 'Draft' &&
                        (selectedPolicy.versionHistory?.length || 0) === 0
                          ? `${selectedPolicy.version} (Unpublished Draft)`
                          : selectedPolicy.version}
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">
                      {selectedPolicy.rules.length} active published clause(s)
                    </span>
                  </div>
                  {selectedPolicy.status !== 'Active' && (
                    <p className="text-[11px] font-medium text-amber-800 pt-1 flex items-center gap-1">
                      <Lock className="w-3 h-3 shrink-0" />
                      <span>
                        This policy is {selectedPolicy.status}. Submitting verification will be
                        rejected without substituting another policy.
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    Selected Policy ID <strong className="font-mono">{selectedPolicyId}</strong>{' '}
                    does not exist. Verification will be rejected without fallback.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content Body Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Marketing Copy / Communication Text *
              </label>
              <button
                type="button"
                onClick={() => {
                  setContentBody('');
                  setSelectedDraftId('custom');
                }}
                className="text-[11px] text-slate-500 hover:text-slate-800"
              >
                Clear copy
              </button>
            </div>
            <textarea
              rows={11}
              value={contentBody}
              onChange={(e) => {
                setContentBody(e.target.value);
                setSelectedDraftId('custom');
              }}
              placeholder="Enter press release, website copy, email campaign, or sales collateral text to verify against selected policy clauses..."
              className="w-full p-3 text-xs leading-relaxed bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <FileSearch className="w-4 h-4" />
            <span>
              {isVerifying
                ? 'Evaluating Against Selected Policy...'
                : selectedPolicy
                ? `Verify Content Against ${selectedPolicy.name} (${selectedPolicy.version})`
                : `Attempt Verification (${selectedPolicyId})`}
            </span>
          </button>
        </form>

        {/* Right Column: Verification Results Panel */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  2. Verification Results Panel ({findings.length} Findings)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evaluated against{' '}
                  <span className="font-medium text-slate-700">{evaluatedPolicySummary.name}</span>{' '}
                  · Published Version{' '}
                  <span className="font-mono font-semibold text-blue-700">
                    {evaluatedPolicySummary.version}
                  </span>{' '}
                  ({evaluatedPolicySummary.ruleCount} active clauses)
                </p>
              </div>
              <span className="text-[11px] text-slate-500">
                Simulated deterministic clause findings
              </span>
            </div>

            {/* Four-State Summary Filter Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit">
              <button
                onClick={() => setStateFilter('All')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  stateFilter === 'All'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({findings.length})
              </button>
              <button
                onClick={() => setStateFilter('Supported')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  stateFilter === 'Supported'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Supported ({counts.Supported})
              </button>
              <button
                onClick={() => setStateFilter('Contradicted')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  stateFilter === 'Contradicted'
                    ? 'bg-white text-red-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Contradicted ({counts.Contradicted})
              </button>
              <button
                onClick={() => setStateFilter('Unverified')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  stateFilter === 'Unverified'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unverified ({counts.Unverified})
              </button>
              <button
                onClick={() => setStateFilter('Ambiguous')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  stateFilter === 'Ambiguous'
                    ? 'bg-white text-violet-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ambiguous ({counts.Ambiguous})
              </button>
            </div>
          </div>

          {/* Findings List */}
          {isVerifying ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-4 border border-slate-200 rounded-lg animate-pulse space-y-2.5"
                >
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-4/5" />
                </div>
              ))}
            </div>
          ) : validationError ? (
            <div className="p-12 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-900">
                Verification Blocked by Policy Governance Gate
              </p>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {validationError}
              </p>
            </div>
          ) : filteredFindings.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No findings in the &ldquo;{stateFilter}&rdquo; classification state
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Select &ldquo;All&rdquo; above to view all clause evaluations for this content.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="p-6 space-y-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <FourStateIndicator state={finding.state} />
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-mono font-bold text-slate-800 tabular-nums">
                        {finding.ruleCode}
                      </span>
                      <span className="font-semibold text-slate-700">{finding.ruleClause}</span>
                    </div>

                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      Confidence: {finding.confidence}%
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-lg text-xs text-slate-800">
                    <span className="font-semibold text-slate-500 block mb-0.5 text-[11px]">
                      Evaluated Content Excerpt:
                    </span>
                    <p className="italic leading-relaxed">{finding.excerpt}</p>
                  </div>

                  <div className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-900">Verification Assessment: </span>
                    <span>{finding.explanation}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div>
                      <span className="font-semibold text-slate-700">Evidence Reference: </span>
                      <span className="font-mono text-[11px] text-slate-700">
                        {finding.evidenceReference}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
