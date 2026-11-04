import React, { useState } from 'react';
import {
  History,
  Search,
  Eye,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  BookOpen,
} from 'lucide-react';
import { useVerifacta } from '../context/VerifactaContext';
import { ReviewStatus } from '../types';
import { ReviewStatusIndicator, FourStateIndicator } from '../components/StatusIndicators';

export const AuditTrail: React.FC = () => {
  const {
    auditRecords,
    selectedAuditIdForDetail,
    setSelectedAuditIdForDetail,
    updateAuditDecision,
    setSelectedPolicyIdForDetail,
    setActiveTab,
    settings,
  } = useVerifacta();

  const [statusFilter, setStatusFilter] = useState<'All' | ReviewStatus>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Human Decision Form inside Detail View
  const [decisionNote, setDecisionNote] = useState<string>('');

  const selectedRecord = auditRecords.find((r) => r.id === selectedAuditIdForDetail) || null;

  const filteredRecords = auditRecords.filter((rec) => {
    const matchesStatus = statusFilter === 'All' || rec.reviewStatus === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      rec.id.toLowerCase().includes(q) ||
      rec.contentTitle.toLowerCase().includes(q) ||
      rec.policyName.toLowerCase().includes(q) ||
      rec.reviewer.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // Detail View if an Audit Record is selected
  if (selectedRecord) {
    const uniqueEvidenceRefs = Array.from(
      new Set(selectedRecord.findings.map((f) => f.evidenceReference))
    );

    const handleRecordDecision = (newStatus: ReviewStatus) => {
      const note =
        decisionNote.trim() ||
        (newStatus === 'Approved'
          ? `Approved by ${settings.reviewerName} after reviewing all clause evidence references.`
          : newStatus === 'Flagged'
          ? `Flagged by ${settings.reviewerName} for mandatory marketing copy revision.`
          : `Rejected by ${settings.reviewerName} due to policy contradictions.`);

      updateAuditDecision(selectedRecord.id, newStatus, note);
      setDecisionNote('');
    };

    return (
      <div className="space-y-6">
        {/* Top Navigation Back Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            onClick={() => setSelectedAuditIdForDetail(null)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Audit Trail Table</span>
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Demonstration Audit Record</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-semibold text-slate-800">{selectedRecord.id}</span>
          </div>
        </div>

        {/* Review Header Summary Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
                <span className="font-mono font-bold text-blue-700 tabular-nums">
                  {selectedRecord.id}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Revision {selectedRecord.contentRevision}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{selectedRecord.timestamp}</span>
                <span aria-hidden="true">·</span>
                <span>Reviewer: {selectedRecord.reviewer}</span>
              </div>

              <h2 className="font-display text-2xl font-bold text-slate-900">
                {selectedRecord.contentTitle}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span>Evaluated against Policy:</span>
                <button
                  onClick={() => {
                    setSelectedPolicyIdForDetail(selectedRecord.policyId);
                    setActiveTab('policy-library');
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>
                    {selectedRecord.policyName} ({selectedRecord.policyVersion})
                  </span>
                </button>
              </div>
            </div>

            <div className="shrink-0">
              <ReviewStatusIndicator status={selectedRecord.reviewStatus} />
            </div>
          </div>
        </div>

        {/* Split Detail Grid: Content Snapshot + Evidence References + Human Decision */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Content Snapshot & Evidence References */}
          <div className="lg:col-span-5 space-y-6">
            {/* Content Snapshot */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Reviewed Content Snapshot</span>
                </h3>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {selectedRecord.contentRevision}
                </span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {selectedRecord.contentSnapshot}
              </div>
            </div>

            {/* Evidence References Summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-display text-sm font-bold text-slate-900 mb-1">
                Linked Evidence References ({uniqueEvidenceRefs.length})
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Substantiation artifacts and policy schedules referenced during verification
              </p>
              <ul className="divide-y divide-slate-100 text-xs">
                {uniqueEvidenceRefs.map((ref, idx) => (
                  <li key={idx} className="py-2.5 font-mono text-slate-700 flex items-start gap-2">
                    <span className="text-slate-400 select-none tabular-nums">0{idx + 1}.</span>
                    <span>{ref}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Human Review Sign-Off Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Human Review Decision & Sign-Off
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record an authoritative human compliance decision for this content revision.
                </p>
              </div>

              {selectedRecord.humanDecisionNote && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="font-semibold text-slate-800 block mb-0.5">
                    Logged Reviewer Note ({selectedRecord.reviewer}):
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedRecord.humanDecisionNote}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Decision Rationale / Audit Note
                </label>
                <textarea
                  rows={3}
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="Enter sign-off rationale, required legal disclaimers, or remediation instructions..."
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleRecordDecision('Approved')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Content</span>
                </button>
                <button
                  onClick={() => handleRecordDecision('Flagged')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Flag for Revision</span>
                </button>
                <button
                  onClick={() => handleRecordDecision('Rejected')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Release</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Clause-by-Clause Findings */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Recorded Verification Findings ({selectedRecord.findings.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clause-level four-state classification at time of review
                </p>
              </div>
              <span className="font-mono text-xs text-slate-500">
                Policy {selectedRecord.policyVersion}
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {selectedRecord.findings.map((finding) => (
                <div key={finding.id} className="p-6 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <FourStateIndicator state={finding.state} />
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-mono font-bold text-slate-800">{finding.ruleCode}</span>
                      <span className="font-semibold text-slate-700">{finding.ruleClause}</span>
                    </div>
                    <span className="font-mono text-slate-500 tabular-nums">
                      Confidence: {finding.confidence}%
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-800 italic">
                    {finding.excerpt}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{finding.explanation}</p>

                  <div className="text-xs text-slate-500 pt-1">
                    <span className="font-semibold text-slate-700">Evidence Reference: </span>
                    <span className="font-mono text-[11px]">{finding.evidenceReference}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>Demonstration Audit Interface · Local State Persistence</span>
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Compliance Review & Proof-Carrying Audit Trail
          </h2>
          <p className="text-sm text-slate-600 mt-0.5 max-w-3xl">
            Inspect historical content verifications, policy versions, evidence references, and
            human reviewer decisions across all marketing communications.
          </p>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
          {(['All', 'Approved', 'Flagged', 'Pending Review', 'Rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Review ID, content title, reviewer..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-900">
              No audit records match your current filter
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Clear your search filter or run a new Content Verification to generate an audit entry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Review ID</th>
                  <th className="py-3 px-4">Content Title</th>
                  <th className="py-3 px-4">Content Revision</th>
                  <th className="py-3 px-4">Policy Version</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => setSelectedAuditIdForDetail(rec.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-5 font-mono font-semibold text-blue-600 whitespace-nowrap tabular-nums">
                      {rec.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      {rec.contentTitle}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                      {rec.contentRevision}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-slate-700 font-medium">{rec.policyName}</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {rec.policyVersion}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <ReviewStatusIndicator status={rec.reviewStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">{rec.reviewer}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                      {rec.timestamp}
                    </td>
                    <td
                      className="py-3.5 px-5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setSelectedAuditIdForDetail(rec.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
