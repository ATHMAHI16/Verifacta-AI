import React, { useState, useRef } from 'react';
import {
  Cpu,
  Upload,
  Check,
  X,
  Edit3,
  AlertCircle,
  FileText,
  HelpCircle,
  CheckCircle2,
  ArrowUpRight,
  Bookmark,
  ClipboardCheck,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Lock,
} from 'lucide-react';
import { useVerifacta } from '../context/VerifactaContext';
import { SAMPLE_GUIDELINE_TEMPLATES } from '../data/mockData';
import { CompiledCandidateRule, CandidateRuleStatus, RuleSeverity } from '../types';
import { SeverityText, CandidateStatusIndicator } from '../components/StatusIndicators';

export const PolicyCompiler: React.FC = () => {
  const {
    policies,
    compilationSessions,
    activeSessionId,
    setActiveSessionId,
    createCompilationSession,
    setSessionTargetPolicy,
    updateCandidateRule,
    resolveCandidateAmbiguity,
    markCandidateNeedsClarification,
    approveCandidateInSession,
    rejectCandidateRule,
    saveCompilationAsDraft,
    publishCompilationSession,
    setSelectedPolicyIdForDetail,
    setActiveTab,
    addToast,
  } = useVerifacta();

  const activeSession =
    compilationSessions.find((s) => s.id === activeSessionId) || compilationSessions[0];

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    SAMPLE_GUIDELINE_TEMPLATES[0].id
  );
  const [guidelineInput, setGuidelineInput] = useState<string>(
    activeSession?.sourceText || SAMPLE_GUIDELINE_TEMPLATES[0].rawText
  );
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  // View Mode: 'workspace' vs 'review' (Review Compilation screen)
  const [viewMode, setViewMode] = useState<'workspace' | 'review'>('workspace');

  // Inline Editor / Ambiguity Resolution State
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleText, setEditRuleText] = useState<string>('');
  const [editCodeText, setEditCodeText] = useState<string>('');
  const [editEvidenceText, setEditEvidenceText] = useState<string>('');
  const [editResolutionNote, setEditResolutionNote] = useState<string>('');
  const [inlineErrorId, setInlineErrorId] = useState<string | null>(null);
  const [inlineErrorMessage, setInlineErrorMessage] = useState<string>('');

  // Filter Tabs
  const [statusFilter, setStatusFilter] = useState<'All' | CandidateRuleStatus>('All');

  // Review Compilation & Publish Confirmation State
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [confirmPublishChecked, setConfirmPublishChecked] = useState<boolean>(false);
  const [publishFeedbackError, setPublishFeedbackError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetPolicyId = activeSession?.targetPolicyId || policies[0]?.id || 'pol-env-001';
  const targetPolicy = policies.find((p) => p.id === targetPolicyId) || policies[0];
  const sessionCandidates = activeSession?.candidates || [];

  const counts = {
    All: sessionCandidates.length,
    Pending: sessionCandidates.filter((c) => c.status === 'Pending').length,
    Approved: sessionCandidates.filter((c) => c.status === 'Approved').length,
    Rejected: sessionCandidates.filter((c) => c.status === 'Rejected').length,
    'Needs Clarification': sessionCandidates.filter((c) => c.status === 'Needs Clarification')
      .length,
  };

  const isSessionPublished = activeSession?.status === 'Published';
  const canPublishSession =
    !isSessionPublished &&
    counts.Pending === 0 &&
    counts['Needs Clarification'] === 0 &&
    counts.Approved > 0 &&
    targetPolicy?.status !== 'Archived';

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    const found = compilationSessions.find((s) => s.id === sessionId);
    if (found) {
      setGuidelineInput(found.sourceText);
    }
    setEditingRuleId(null);
    setInlineErrorId(null);
    setPublishFeedbackError('');
    setConfirmPublishChecked(false);
  };

  const handleLoadTemplate = (templateId: string) => {
    const tpl = SAMPLE_GUIDELINE_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(tpl.id);
    setGuidelineInput(tpl.rawText);
    if (activeSession && activeSession.status !== 'Published') {
      setSessionTargetPolicy(activeSession.id, tpl.targetPolicyId);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        setGuidelineInput(content);
        setSelectedTemplateId('custom');
        addToast('Document Loaded', `Imported "${file.name}" into Policy Compiler.`);
      }
    };
    reader.readAsText(file);
  };

  const handleStartExtraction = () => {
    if (!guidelineInput.trim()) {
      addToast('Input Required', 'Please enter or upload brand guidelines first.', 'warning');
      return;
    }

    setIsExtracting(true);
    setEditingRuleId(null);
    setInlineErrorId(null);

    setTimeout(() => {
      const matchingTemplate = SAMPLE_GUIDELINE_TEMPLATES.find(
        (t) => t.rawText.trim() === guidelineInput.trim()
      );

      let extractedPayloads: Omit<CompiledCandidateRule, 'id' | 'status' | 'sessionId'>[] = [];
      let sessionTitle = 'Custom Brand Guideline Extraction';
      let chosenPolicyId = targetPolicyId;

      if (matchingTemplate) {
        extractedPayloads = matchingTemplate.extractedCandidates;
        sessionTitle = matchingTemplate.title;
        chosenPolicyId = matchingTemplate.targetPolicyId;
      } else {
        const paragraphs = guidelineInput
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 25);

        const sourceBlocks = paragraphs.length > 0 ? paragraphs : [guidelineInput.trim()];
        const firstLine = guidelineInput.split('\n')[0]?.trim().slice(0, 56);
        if (firstLine) {
          sessionTitle = firstLine;
        }

        const prefix =
          targetPolicy.category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'POL';

        extractedPayloads = sourceBlocks.slice(0, 6).map((block, idx) => {
          const cleanExcerpt = block.replace(/^[0-9.]+\s*[A-Z\s&-]+\n?/i, '').trim() || block;
          const hasAmbiguous =
            /\b(should strive|reasonable|appropriate|overly|typical|wherever possible|eco-conscious|reassuring|best-effort)\b/i.test(
              cleanExcerpt
            );
          const isCritical =
            /\b(strictly forbidden|prohibited|never|must not|mandatory|zero-downtime)\b/i.test(
              cleanExcerpt
            );

          const severity: RuleSeverity = isCritical
            ? 'Critical'
            : hasAmbiguous
            ? 'Medium'
            : 'High';

          return {
            sourceExcerpt: `"${cleanExcerpt.slice(0, 220)}${
              cleanExcerpt.length > 220 ? '...' : ''
            }"`,
            extractedRule: `Enforce compliance requirement: ${cleanExcerpt.slice(0, 160)}${
              cleanExcerpt.length > 160 ? '...' : ''
            }`,
            suggestedCode: `${prefix}-${targetPolicy.rules.length + 101 + idx}`,
            category: targetPolicy.category,
            severity,
            evidenceRequired: 'Verified Compliance Substantiation Record',
            confidence: hasAmbiguous ? 71 : 93,
            isAmbiguous: hasAmbiguous,
            ambiguityNote: hasAmbiguous
              ? 'Contains subjective or non-quantified phrasing that requires an explicit threshold before approval.'
              : undefined,
          };
        });
      }

      const createdSession = createCompilationSession(
        sessionTitle,
        guidelineInput,
        chosenPolicyId,
        extractedPayloads
      );

      setIsExtracting(false);
      setStatusFilter('All');
      setViewMode('workspace');
      addToast(
        `Compilation Session ${createdSession.id} Created`,
        `Extracted ${createdSession.candidates.length} candidate rules (${
          createdSession.candidates.filter((c) => c.status === 'Needs Clarification').length
        } flagged as Needs Clarification).`
      );
    }, 350);
  };

  const startEditingRule = (rule: CompiledCandidateRule) => {
    setEditingRuleId(rule.id);
    setEditRuleText(rule.extractedRule);
    setEditCodeText(rule.suggestedCode);
    setEditEvidenceText(rule.evidenceRequired);
    setEditResolutionNote(
      rule.resolutionNote ||
        (rule.isAmbiguous
          ? 'Replaced subjective phrasing with verifiable quantitative compliance thresholds.'
          : '')
    );
    setInlineErrorId(null);
  };

  const handleSaveRuleEditsOnly = (rule: CompiledCandidateRule) => {
    if (!editRuleText.trim()) return;
    updateCandidateRule(rule.id, {
      extractedRule: editRuleText.trim(),
      suggestedCode: editCodeText.trim() || rule.suggestedCode,
      evidenceRequired: editEvidenceText.trim() || rule.evidenceRequired,
    });
    setEditingRuleId(null);
    addToast('Candidate Clause Updated', 'Saved inline edits to extracted rule.');
  };

  const handleResolveAmbiguitySubmit = (rule: CompiledCandidateRule) => {
    const res = resolveCandidateAmbiguity(
      rule.id,
      editRuleText,
      editResolutionNote,
      editCodeText,
      editEvidenceText
    );
    if (!res.ok) {
      setInlineErrorId(rule.id);
      setInlineErrorMessage(res.message);
      return;
    }
    setEditingRuleId(null);
    setInlineErrorId(null);
  };

  const handleApproveClick = (rule: CompiledCandidateRule) => {
    const res = approveCandidateInSession(rule.id, targetPolicyId);
    if (!res.ok) {
      setInlineErrorId(rule.id);
      setInlineErrorMessage(res.message);
    } else {
      setInlineErrorId(null);
    }
  };

  const handleRejectClick = (rule: CompiledCandidateRule) => {
    setInlineErrorId(null);
    rejectCandidateRule(rule.id);
  };

  const handlePublishSessionClick = () => {
    if (!activeSession) return;
    if (!confirmPublishChecked) {
      setPublishFeedbackError(
        'Please check the confirmation box to verify that all approved clauses are ready for publication.'
      );
      return;
    }
    const res = publishCompilationSession(activeSession.id, releaseNotes);
    if (!res.ok) {
      setPublishFeedbackError(res.message);
    } else {
      setPublishFeedbackError('');
      setConfirmPublishChecked(false);
    }
  };

  const filteredCandidates = sessionCandidates.filter(
    (c) => statusFilter === 'All' || c.status === statusFilter
  );

  // REVIEW COMPILATION SCREEN
  if (viewMode === 'review' && activeSession) {
    return (
      <div className="space-y-6">
        {/* Top Navigation Back Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            onClick={() => {
              setViewMode('workspace');
              setPublishFeedbackError('');
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Policy Compiler Workspace</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono font-bold text-indigo-700">{activeSession.id}</span>
            <span aria-hidden="true">·</span>
            <span>Session Status: {activeSession.status}</span>
          </div>
        </div>

        {/* Review Compilation Summary Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-indigo-700 font-semibold mb-1">
                <ClipboardCheck className="w-4 h-4" />
                <span>Review Compilation & Pre-Publication Gate</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                {activeSession.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Session ID: <span className="font-mono text-slate-700">{activeSession.id}</span> ·
                Target Policy:{' '}
                <span className="font-semibold text-slate-800">{targetPolicy?.name}</span> (Current
                Active Version: <span className="font-mono">{targetPolicy?.version}</span>)
              </p>
            </div>

            {isSessionPublished ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold block">
                    Published as {activeSession.publishedVersion}
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    By {activeSession.publishedBy} on {activeSession.publishedAt}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => saveCompilationAsDraft(activeSession.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                  <span>Save Compilation as Draft</span>
                </button>
              </div>
            )}
          </div>

          {/* 4-Column Session Breakdown Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200">
              <span className="text-xs font-semibold text-emerald-800 block">
                Approved for Publication
              </span>
              <span className="font-mono text-2xl font-bold text-emerald-700 tabular-nums mt-1 block">
                {counts.Approved}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-700 block">
                Rejected (Excluded)
              </span>
              <span className="font-mono text-2xl font-bold text-slate-700 tabular-nums mt-1 block">
                {counts.Rejected}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-200">
              <span className="text-xs font-semibold text-amber-800 block">
                Pending Decision
              </span>
              <span className="font-mono text-2xl font-bold text-amber-700 tabular-nums mt-1 block">
                {counts.Pending}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-violet-50/60 border border-violet-200">
              <span className="text-xs font-semibold text-violet-800 block">
                Needs Clarification
              </span>
              <span className="font-mono text-2xl font-bold text-violet-700 tabular-nums mt-1 block">
                {counts['Needs Clarification']}
              </span>
            </div>
          </div>
        </div>

        {/* All Candidate Rules Table in Session */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Session Candidate Rules Audit ({sessionCandidates.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every candidate rule must be Approved or Rejected with zero unresolved ambiguities
                before publishing a new policy version.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {sessionCandidates.map((cand) => (
              <div key={cand.id} className="p-5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-700 tabular-nums">
                      {cand.suggestedCode}
                    </span>
                    <span aria-hidden="true">·</span>
                    <SeverityText severity={cand.severity} />
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-500">Evidence: {cand.evidenceRequired}</span>
                  </div>
                  <CandidateStatusIndicator status={cand.status} />
                </div>

                <p className="text-sm font-medium text-slate-900">{cand.extractedRule}</p>

                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded text-xs text-slate-600 italic">
                  Source Excerpt: {cand.sourceExcerpt}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                  <div>
                    {cand.approvedBy && (
                      <span className="text-emerald-700 font-medium">
                        Approved by {cand.approvedBy} at {cand.approvedAt}
                      </span>
                    )}
                    {cand.rejectedBy && (
                      <span className="text-slate-500">
                        Rejected by {cand.rejectedBy} at {cand.rejectedAt}
                      </span>
                    )}
                    {cand.ambiguityResolved && cand.resolutionNote && (
                      <span className="ml-2 text-indigo-700">
                        · Ambiguity resolved: &ldquo;{cand.resolutionNote}&rdquo;
                      </span>
                    )}
                  </div>

                  {!isSessionPublished &&
                    (cand.status === 'Pending' || cand.status === 'Needs Clarification') && (
                      <button
                        onClick={() => {
                          setViewMode('workspace');
                          if (cand.status === 'Needs Clarification' || cand.isAmbiguous) {
                            startEditingRule(cand);
                          }
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Resolve / Review in Workspace →
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Publication Gate & Explicit Confirmation Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Publish Policy Version
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Publishing appends the {counts.Approved} approved rule(s) to{' '}
                <strong className="text-slate-700">{targetPolicy?.name}</strong> and creates an
                immutable version snapshot in Version History.
              </p>
            </div>
          </div>

          {publishFeedbackError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{publishFeedbackError}</span>
            </div>
          )}

          {!isSessionPublished && !canPublishSession && (
            <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pre-Publication Governance Requirements Not Yet Met:</span>
              </p>
              <ul className="list-disc list-inside pl-5 space-y-0.5 text-amber-800">
                {counts['Needs Clarification'] > 0 && (
                  <li>
                    {counts['Needs Clarification']} rule(s) are marked{' '}
                    <strong>Needs Clarification</strong>. Resolve their ambiguity before publishing.
                  </li>
                )}
                {counts.Pending > 0 && (
                  <li>
                    {counts.Pending} rule(s) are still <strong>Pending</strong>. Approve or reject
                    all candidate rules in the session, or save this incomplete compilation as a
                    draft.
                  </li>
                )}
                {counts.Approved === 0 && (
                  <li>At least 1 rule must be Approved before publishing a policy version.</li>
                )}
              </ul>
            </div>
          )}

          {!isSessionPublished && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Version Release Notes / Change Summary
                </label>
                <input
                  type="text"
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder={`e.g., Added ${counts.Approved} verified clause(s) from session ${activeSession.id}`}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={confirmPublishChecked}
                  onChange={(e) => setConfirmPublishChecked(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">
                  I confirm that all candidate clauses in session{' '}
                  <strong className="font-mono">{activeSession.id}</strong> have been reviewed,
                  ambiguous language has been resolved, and I authorize publishing a new active
                  version of <strong>{targetPolicy?.name}</strong>.
                </span>
              </label>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => saveCompilationAsDraft(activeSession.id)}
              disabled={isSessionPublished}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save Incomplete Compilation as Draft</span>
            </button>

            <div className="flex items-center gap-3">
              {isSessionPublished && (
                <button
                  onClick={() => {
                    setSelectedPolicyIdForDetail(targetPolicy.id);
                    setActiveTab('policy-library');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <span>Inspect {activeSession.publishedVersion} in Policy Library</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={handlePublishSessionClick}
                disabled={!canPublishSession && !isSessionPublished}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg transition-colors shadow-xs ${
                  isSessionPublished
                    ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                    : canPublishSession
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isSessionPublished
                    ? `Already Published (${activeSession.publishedVersion})`
                    : 'Publish Policy Version'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Session Governance & Review Compilation CTA */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-700 font-medium mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>Simulated Rule Extraction Engine · Session-Based Governance</span>
            {activeSession && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-bold">Session {activeSession.id}</span>
                <span aria-hidden="true">·</span>
                <span>Status: {activeSession.status}</span>
              </>
            )}
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Policy Compiler & Session Governance
          </h2>
          <p className="text-sm text-slate-600 mt-0.5 max-w-3xl">
            Extract candidate clauses into a tracked compilation session, resolve ambiguous rules,
            record reviewer approvals, save incomplete work as drafts, and publish completed
            compilations as versioned policies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload .TXT / .MD</span>
          </button>

          {activeSession && !isSessionPublished && (
            <button
              onClick={() => saveCompilationAsDraft(activeSession.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Bookmark className="w-3.5 h-3.5 text-slate-500" />
              <span>Save as Draft</span>
            </button>
          )}

          {activeSession && (
            <button
              onClick={() => {
                setPublishFeedbackError('');
                setViewMode('review');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs whitespace-nowrap"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>
                Review Compilation ({counts.Approved}/{counts.All} Approved)
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Active Compilation Session Switcher Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-700">Compilation Session:</span>
          <select
            value={activeSession?.id || ''}
            onChange={(e) => handleSelectSession(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:border-blue-600"
          >
            {compilationSessions.map((sess) => (
              <option key={sess.id} value={sess.id}>
                {sess.id} — {sess.title} ({sess.status}
                {sess.publishedVersion ? ` · ${sess.publishedVersion}` : ''})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-slate-500">
          <span>
            Approved: <strong className="font-mono text-emerald-700">{counts.Approved}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Rejected: <strong className="font-mono text-slate-700">{counts.Rejected}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Pending: <strong className="font-mono text-amber-700">{counts.Pending}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Needs Clarification:{' '}
            <strong className="font-mono text-violet-700">{counts['Needs Clarification']}</strong>
          </span>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Guideline Input & Extraction Controls */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900">
              1. Source Brand Guidelines
            </h3>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {guidelineInput.length} chars
            </span>
          </div>

          {/* Preset Guideline Templates */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Load Sample Guideline Document
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleLoadTemplate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
            >
              {SAMPLE_GUIDELINE_TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.title} ({tpl.category})
                </option>
              ))}
              {selectedTemplateId === 'custom' && (
                <option value="custom">Custom Uploaded / Edited Guidelines</option>
              )}
            </select>
          </div>

          {/* Target Policy for Session */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Policy for Session Publication
            </label>
            <select
              value={targetPolicyId}
              disabled={isSessionPublished}
              onChange={(e) => {
                if (activeSession) {
                  setSessionTargetPolicy(activeSession.id, e.target.value);
                }
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 disabled:opacity-60"
            >
              {policies.map((pol) => (
                <option key={pol.id} value={pol.id}>
                  {pol.name} ({pol.version} · {pol.status})
                </option>
              ))}
            </select>
          </div>

          {/* Raw Guideline Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Guideline Text / Policy Prose
              </label>
              <button
                onClick={() => setGuidelineInput('')}
                className="text-[11px] text-slate-500 hover:text-slate-800"
              >
                Clear text
              </button>
            </div>
            <textarea
              rows={12}
              value={guidelineInput}
              onChange={(e) => {
                setGuidelineInput(e.target.value);
                setSelectedTemplateId('custom');
              }}
              placeholder="Paste raw brand guidelines, regulatory bulletins, or legal policies here..."
              className="w-full p-3 text-xs font-mono leading-relaxed bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <button
            onClick={handleStartExtraction}
            disabled={isExtracting}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <Cpu className="w-4 h-4" />
            <span>
              {isExtracting
                ? 'Creating New Compilation Session...'
                : 'Start New Policy Extraction Session'}
            </span>
          </button>
        </div>

        {/* Right Column: Session Candidate Rules */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  2. Session Candidate Rules ({sessionCandidates.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Session <span className="font-mono font-semibold">{activeSession?.id}</span> ·
                  Target: <span className="font-medium text-slate-700">{targetPolicy?.name}</span>
                </p>
              </div>

              {isSessionPublished && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Published ({activeSession.publishedVersion})</span>
                </span>
              )}
            </div>

            {/* 4-State Filter Bar */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
              {(
                ['All', 'Pending', 'Needs Clarification', 'Approved', 'Rejected'] as const
              ).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    statusFilter === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab} ({counts[tab]})
                </button>
              ))}
            </div>
          </div>

          {isExtracting ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="p-4 border border-slate-200 rounded-lg animate-pulse space-y-3"
                >
                  <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-5/6" />
                </div>
              ))}
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900">
                No candidate rules in the &ldquo;{statusFilter}&rdquo; state
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Switch filter tabs above or start a new extraction session on the left.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredCandidates.map((rule) => {
                const isEditing = editingRuleId === rule.id;
                const hasUnresolvedAmbiguity =
                  (rule.isAmbiguous && !rule.ambiguityResolved) ||
                  rule.status === 'Needs Clarification';

                return (
                  <div
                    key={rule.id}
                    className="p-6 space-y-3 hover:bg-slate-50/40 transition-colors"
                  >
                    {/* Top Metadata Line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-indigo-700 tabular-nums">
                          {rule.suggestedCode}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="text-slate-600">{rule.category}</span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <SeverityText severity={rule.severity} />
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="font-mono text-slate-500 tabular-nums">
                          {rule.confidence}% confidence
                        </span>
                      </div>

                      <CandidateStatusIndicator status={rule.status} />
                    </div>

                    {/* Preserved Original Guideline Source Excerpt */}
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-600">
                      <span className="font-semibold text-slate-700 not-italic block mb-0.5">
                        Original Guideline Source Excerpt (Session {rule.sessionId}):
                      </span>
                      <span className="italic">{rule.sourceExcerpt}</span>
                    </div>

                    {/* Inline Governance Block Alert if user attempted invalid approval */}
                    {inlineErrorId === rule.id && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-2 text-xs text-red-800">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <span>{inlineErrorMessage}</span>
                        </div>
                        <button
                          onClick={() => startEditingRule(rule)}
                          className="font-semibold text-red-700 underline whitespace-nowrap shrink-0"
                        >
                          Resolve Now
                        </button>
                      </div>
                    )}

                    {/* Extracted Rule Content or Edit / Resolve Ambiguity Form */}
                    {isEditing ? (
                      <div className="p-4 bg-slate-50 border border-indigo-200 rounded-lg space-y-3 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="font-semibold text-slate-900">
                            Edit Clause & Resolve Ambiguity ({rule.suggestedCode})
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Suggested Rule Code
                            </label>
                            <input
                              type="text"
                              value={editCodeText}
                              onChange={(e) => setEditCodeText(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Required Evidence Reference
                            </label>
                            <input
                              type="text"
                              value={editEvidenceText}
                              onChange={(e) => setEditEvidenceText(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Clarified Enforceable Rule Specification *
                          </label>
                          <textarea
                            rows={2}
                            value={editRuleText}
                            onChange={(e) => setEditRuleText(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Ambiguity Resolution Note *
                          </label>
                          <input
                            type="text"
                            value={editResolutionNote}
                            onChange={(e) => setEditResolutionNote(e.target.value)}
                            placeholder="Document how subjective modifiers were replaced with verifiable criteria..."
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => setEditingRuleId(null)}
                            className="px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-900"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveRuleEditsOnly(rule)}
                            className="px-3 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
                          >
                            Save Edits Only
                          </button>
                          <button
                            onClick={() => handleResolveAmbiguitySubmit(rule)}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Resolve Ambiguity & Mark Ready</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-0.5">
                          Compiled Verification Rule:
                        </p>
                        <p className="text-sm font-medium text-slate-900 leading-relaxed">
                          {rule.extractedRule}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="font-medium text-slate-700">Evidence Required:</span>{' '}
                          {rule.evidenceRequired}
                        </p>
                      </div>
                    )}

                    {/* Ambiguity Alert Box if unresolved */}
                    {hasUnresolvedAmbiguity && (
                      <div className="p-3 bg-violet-50/80 border border-violet-200 rounded-lg flex items-start justify-between gap-3 text-xs text-violet-900">
                        <div className="flex items-start gap-2.5">
                          <HelpCircle className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">
                              Ambiguous Clause (Approval Blocked Until Resolved):{' '}
                            </span>
                            <span>
                              {rule.ambiguityNote ||
                                'Contains subjective modifiers that require numerical or lexical boundaries.'}
                            </span>
                          </div>
                        </div>
                        {!isEditing && !isSessionPublished && (
                          <button
                            onClick={() => startEditingRule(rule)}
                            className="px-2.5 py-1 font-semibold text-violet-800 bg-violet-100 hover:bg-violet-200 rounded shrink-0 whitespace-nowrap"
                          >
                            Clarify & Resolve
                          </button>
                        )}
                      </div>
                    )}

                    {/* Ambiguity Resolved Confirmation Box */}
                    {rule.ambiguityResolved && rule.resolutionNote && (
                      <div className="p-2.5 bg-indigo-50/60 border border-indigo-200/80 rounded-lg text-xs text-indigo-900 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>
                          <strong>Ambiguity Resolved:</strong> {rule.resolutionNote}
                        </span>
                      </div>
                    )}

                    {/* Audit Attribution Metadata (Who approved/rejected and when) */}
                    {(rule.approvedBy || rule.rejectedBy) && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {rule.status === 'Approved' && rule.approvedBy && (
                          <span>
                            Approved by{' '}
                            <strong className="text-slate-700">{rule.approvedBy}</strong> on{' '}
                            <span className="font-mono">{rule.approvedAt}</span>
                            {rule.publishedVersion && (
                              <span className="ml-1 text-emerald-700 font-semibold">
                                · Published in {rule.publishedVersion}
                              </span>
                            )}
                          </span>
                        )}
                        {rule.status === 'Rejected' && rule.rejectedBy && (
                          <span>
                            Rejected by{' '}
                            <strong className="text-slate-700">{rule.rejectedBy}</strong> on{' '}
                            <span className="font-mono">{rule.rejectedAt}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditingRule(rule)}
                          disabled={isSessionPublished}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 rounded-md transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{hasUnresolvedAmbiguity ? 'Edit & Resolve' : 'Edit Clause'}</span>
                        </button>

                        <button
                          onClick={() => markCandidateNeedsClarification(rule.id)}
                          disabled={isSessionPublished}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md disabled:opacity-40 transition-colors ${
                            hasUnresolvedAmbiguity
                              ? 'text-violet-700 bg-violet-50 hover:bg-violet-100'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>
                            {hasUnresolvedAmbiguity
                              ? 'Clear Clarification Flag'
                              : 'Flag Needs Clarification'}
                          </span>
                        </button>
                      </div>

                      {isSessionPublished ? (
                        <button
                          onClick={() => {
                            setSelectedPolicyIdForDetail(targetPolicy.id);
                            setActiveTab('policy-library');
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          <span>
                            Inspect {activeSession.publishedVersion} in {targetPolicy.name}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRejectClick(rule)}
                            disabled={rule.status === 'Rejected'}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 rounded-lg border border-slate-200 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{rule.status === 'Rejected' ? 'Rejected' : 'Reject'}</span>
                          </button>

                          <button
                            onClick={() => handleApproveClick(rule)}
                            disabled={rule.status === 'Approved'}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-xs ${
                              rule.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                : hasUnresolvedAmbiguity
                                ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              {rule.status === 'Approved'
                                ? 'Approved in Session'
                                : 'Approve Rule'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Session Summary Footer */}
          {activeSession && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="text-slate-600">
                <span>
                  Individual approvals stage rules in session{' '}
                  <strong className="font-mono">{activeSession.id}</strong> without modifying the
                  live policy until publication.
                </span>
              </div>
              <button
                onClick={() => {
                  setPublishFeedbackError('');
                  setViewMode('review');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Proceed to Review & Publish →</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
