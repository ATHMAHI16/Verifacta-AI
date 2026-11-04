import React, { useState, useEffect } from 'react';
import {
  FileSearch,
  ShieldCheck,
  History,
  BookOpen,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import { useVerifacta } from '../context/VerifactaContext';
import { SAMPLE_CONTENT_DRAFTS } from '../data/mockData';
import { VerificationFinding, VerificationState, AuditRecord } from '../types';
import { FourStateIndicator } from '../components/StatusIndicators';

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
  const [latestAuditRecord, setLatestAuditRecord] = useState<AuditRecord | null>(null);
  const [stateFilter, setStateFilter] = useState<'All' | VerificationState>('All');

  useEffect(() => {
    if (preselectedVerifyPolicyId) {
      setSelectedPolicyId(preselectedVerifyPolicyId);
      const matchingDraft = SAMPLE_CONTENT_DRAFTS.find(
        (d) => d.policyId === preselectedVerifyPolicyId
      );
      if (matchingDraft) {
        setSelectedDraftId(matchingDraft.id);
        setContentTitle(matchingDraft.title);
        setContentRevision(matchingDraft.revision);
        setContentBody(matchingDraft.content);
        setFindings(
          matchingDraft.presetFindings.map((f, idx) => ({
            ...f,
            id: `preset-find-${idx}`,
          }))
        );
      }
      setPreselectedVerifyPolicyId(null);
    }
  }, [preselectedVerifyPolicyId, setPreselectedVerifyPolicyId]);

  const handleSelectDraft = (draftId: string) => {
    const draft = SAMPLE_CONTENT_DRAFTS.find((d) => d.id === draftId);
    if (!draft) return;
    setSelectedDraftId(draft.id);
    setContentTitle(draft.title);
    setContentRevision(draft.revision);
    setSelectedPolicyId(draft.policyId);
    setContentBody(draft.content);
    setValidationError('');
    setFindings(
      draft.presetFindings.map((f, idx) => ({
        ...f,
        id: `draft-find-${Date.now()}-${idx}`,
      }))
    );
  };

  const handleVerifyContent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentTitle.trim() || !contentBody.trim() || !selectedPolicyId) {
      setValidationError(
        'Please provide a content title, select a target policy, and enter marketing content to verify.'
      );
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
      setFindings(result.findings);
      if (result.auditRecord) {
        setLatestAuditRecord(result.auditRecord);
      }
      setStateFilter('All');
      setIsVerifying(false);
    }, 380);
  };

  const activePolicy = policies.find((p) => p.id === selectedPolicyId) || policies[0];

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
            <span>Deterministic Mock Evaluation Engine · Four-State Classification</span>
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Evidence-Grounded Content Verification
          </h2>
          <p className="text-sm text-slate-600 mt-0.5 max-w-3xl">
            Evaluate draft marketing copy, press releases, and sales decks against versioned
            corporate policies. Every assertion is classified into one of four states: Supported,
            Contradicted, Unverified, or Ambiguous.
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
            <span>View Logged Audit ({latestAuditRecord.id})</span>
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
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
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

          {/* Target Policy Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Governing Policy Selection *
              </label>
              {activePolicy && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPolicyIdForDetail(activePolicy.id);
                    setActiveTab('policy-library');
                  }}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Inspect {activePolicy.rules.length} clauses</span>
                </button>
              )}
            </div>
            <select
              value={selectedPolicyId}
              onChange={(e) => setSelectedPolicyId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {policies.map((pol) => (
                <option key={pol.id} value={pol.id}>
                  {pol.name} ({pol.version} · {pol.status})
                </option>
              ))}
            </select>
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
              rows={12}
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
                ? 'Evaluating Against Policy Clauses...'
                : 'Verify Content & Log Audit Record'}
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
                  <span className="font-medium text-slate-700">{activePolicy?.name}</span> (
                  <span className="font-mono">{activePolicy?.version}</span>)
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
                  {/* Header Row: Four-State Classification + Matching Policy Clause + Confidence */}
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

                  {/* Relevant Content Excerpt */}
                  <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-lg text-xs text-slate-800">
                    <span className="font-semibold text-slate-500 block mb-0.5 text-[11px]">
                      Evaluated Content Excerpt:
                    </span>
                    <p className="italic leading-relaxed">{finding.excerpt}</p>
                  </div>

                  {/* Explanation */}
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-900">Verification Assessment: </span>
                    <span>{finding.explanation}</span>
                  </div>

                  {/* Evidence Reference */}
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
