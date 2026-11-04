import React from 'react';
import {
  Plus,
  FileSearch,
  ArrowRight,
  BookOpen,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useVerifacta } from '../context/VerifactaContext';
import {
  PolicyStatusIndicator,
  ReviewStatusIndicator,
  FourStateIndicator,
} from '../components/StatusIndicators';

export const OverviewDashboard: React.FC = () => {
  const {
    policies,
    auditRecords,
    candidateRules,
    setActiveTab,
    setSelectedPolicyIdForDetail,
    setSelectedAuditIdForDetail,
    setOpenCreatePolicyModalOnMount,
  } = useVerifacta();

  const totalPolicies = policies.length;
  const activePoliciesCount = policies.filter((p) => p.status === 'Active').length;
  const draftPoliciesCount = policies.filter((p) => p.status === 'Draft').length;
  const archivedPoliciesCount = policies.filter((p) => p.status === 'Archived').length;

  const contentItemsReviewed = auditRecords.length;

  const allFindings = auditRecords.flatMap((r) => r.findings);
  const issuesDetected = allFindings.filter(
    (f) => f.state === 'Contradicted' || f.state === 'Unverified' || f.state === 'Ambiguous'
  ).length;

  const pendingHumanReviews = auditRecords.filter(
    (r) => r.reviewStatus === 'Pending Review' || r.reviewStatus === 'Flagged'
  ).length;

  const flaggedRecords = auditRecords.filter(
    (r) => r.reviewStatus === 'Flagged' || r.reviewStatus === 'Pending Review' || r.reviewStatus === 'Rejected'
  );

  // Aggregate Four-State distribution across Audit Records for Recharts
  const stateCounts = {
    Supported: allFindings.filter((f) => f.state === 'Supported').length,
    Contradicted: allFindings.filter((f) => f.state === 'Contradicted').length,
    Unverified: allFindings.filter((f) => f.state === 'Unverified').length,
    Ambiguous: allFindings.filter((f) => f.state === 'Ambiguous').length,
  };

  const chartData = [
    { state: 'Supported', count: stateCounts.Supported, fill: '#16a34a' },
    { state: 'Contradicted', count: stateCounts.Contradicted, fill: '#dc2626' },
    { state: 'Unverified', count: stateCounts.Unverified, fill: '#d97706' },
    { state: 'Ambiguous', count: stateCounts.Ambiguous, fill: '#7c3aed' },
  ];

  const handleQuickCreatePolicy = () => {
    setOpenCreatePolicyModalOnMount(true);
    setActiveTab('policy-library');
  };

  const handleQuickVerifyContent = () => {
    setActiveTab('content-verification');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Demo Dataset Context & Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Enterprise Brand Governance Workspace</span>
            <span aria-hidden="true">·</span>
            <span>Simulated Demo Dataset Active</span>
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Compliance & Verification Command Center
          </h2>
          <p className="text-sm text-slate-600 mt-0.5 max-w-2xl">
            Monitor active brand policies, inspect four-state clause verifications, and resolve
            flagged marketing communications before external release.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleQuickCreatePolicy}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>Create Policy</span>
          </button>
          <button
            onClick={handleQuickVerifyContent}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs whitespace-nowrap shrink-0"
          >
            <FileSearch className="w-4 h-4" />
            <span>Verify Content</span>
          </button>
        </div>
      </div>

      {/* 4 Core KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Policies</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
              {totalPolicies}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              {activePoliciesCount} Active · {draftPoliciesCount} Draft
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Content Items Reviewed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
              {contentItemsReviewed}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              {allFindings.length} clause checks
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Issues Detected</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
              {issuesDetected}
            </span>
            <span className="text-xs text-red-700 font-medium tabular-nums">
              {stateCounts.Contradicted} Contradicted
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pending Human Reviews</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
              {pendingHumanReviews}
            </span>
            <button
              onClick={() => setActiveTab('audit-trail')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Review queue →
            </button>
          </div>
        </div>
      </div>

      {/* Middle Row: Four-State Classification Breakdown + Policy Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Four-State Findings Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-1">
              <h3 className="font-display text-base font-bold text-slate-900">
                Four-State Verification Distribution
              </h3>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                n = {allFindings.length} findings
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Clause-level classification across all reviewed marketing drafts in the workspace.
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="state"
                  tick={{ fontSize: 12, fill: '#475569' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <FourStateIndicator state="Supported" />
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {stateCounts.Supported}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <FourStateIndicator state="Contradicted" />
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {stateCounts.Contradicted}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <FourStateIndicator state="Unverified" />
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {stateCounts.Unverified}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <FourStateIndicator state="Ambiguous" />
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {stateCounts.Ambiguous}
              </span>
            </div>
          </div>
        </div>

        {/* Policy Status Overview */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-base font-bold text-slate-900">
                Policy Status Overview
              </h3>
              <button
                onClick={() => setActiveTab('policy-library')}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <span>View Library</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Active governance frameworks · {activePoliciesCount} Active · {draftPoliciesCount}{' '}
              Draft · {archivedPoliciesCount} Archived
            </p>

            <div className="divide-y divide-slate-100">
              {policies.slice(0, 4).map((pol) => (
                <div
                  key={pol.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 -mx-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <button
                      onClick={() => {
                        setSelectedPolicyIdForDetail(pol.id);
                        setActiveTab('policy-library');
                      }}
                      className="text-xs font-semibold text-slate-900 hover:text-blue-600 text-left truncate block max-w-full"
                    >
                      {pol.name}
                    </button>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                      <span>{pol.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{pol.version}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{pol.rules.length} rules</span>
                    </div>
                  </div>
                  <PolicyStatusIndicator status={pol.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 inline-flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {candidateRules.filter((c) => c.status === 'Pending').length} extracted rules
                awaiting approval
              </span>
            </span>
            <button
              onClick={() => setActiveTab('policy-compiler')}
              className="font-medium text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
            >
              Open Compiler →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Verification Activity & Recent Flagged Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Verification Activity */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Recent Verification Activity
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest content submissions evaluated against brand and legal policies
              </p>
            </div>
            <button
              onClick={() => setActiveTab('audit-trail')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              Full Audit Trail →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">Review ID</th>
                  <th className="py-2.5 px-4">Content Title</th>
                  <th className="py-2.5 px-4">Policy</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {auditRecords.slice(0, 5).map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => {
                      setSelectedAuditIdForDetail(rec.id);
                      setActiveTab('audit-trail');
                    }}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-blue-600 whitespace-nowrap tabular-nums">
                      {rec.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-[220px] truncate">
                      {rec.contentTitle}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-mono tabular-nums">
                      {rec.policyVersion}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <ReviewStatusIndicator status={rec.reviewStatus} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500 whitespace-nowrap tabular-nums">
                      {rec.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Flagged Content */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Recent Flagged Content
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assets with Contradicted or Unverified policy clauses
                </p>
              </div>
              <span className="font-mono text-xs text-red-700 font-semibold tabular-nums">
                {flaggedRecords.length} items
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {flaggedRecords.slice(0, 3).map((rec) => {
                const topIssue =
                  rec.findings.find((f) => f.state === 'Contradicted') ||
                  rec.findings.find((f) => f.state === 'Unverified') ||
                  rec.findings[0];
                return (
                  <div key={rec.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => {
                          setSelectedAuditIdForDetail(rec.id);
                          setActiveTab('audit-trail');
                        }}
                        className="text-xs font-semibold text-slate-900 hover:text-blue-600 text-left"
                      >
                        {rec.contentTitle}
                      </button>
                      <ReviewStatusIndicator status={rec.reviewStatus} />
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span className="font-mono tabular-nums">{rec.id}</span>
                      <span aria-hidden="true">·</span>
                      <span>{rec.policyName}</span>
                    </div>

                    {topIssue && (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <FourStateIndicator state={topIssue.state} />
                          <span className="font-mono text-[11px] text-slate-500">
                            Clause {topIssue.ruleCode}
                          </span>
                        </div>
                        <p className="text-slate-700 text-[11px] line-clamp-2 italic">
                          {topIssue.excerpt}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Need to test new marketing copy?</span>
            <button
              onClick={handleQuickVerifyContent}
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Launch Verifier →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
