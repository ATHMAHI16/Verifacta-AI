import React, { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  Play,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useVerifacta } from '../context/VerifactaContext';
import { VerificationState, RuleSeverity } from '../types';
import { FourStateIndicator, SeverityText } from '../components/StatusIndicators';

const GENERATED_EDGE_CASE_POOL = [
  {
    scenarioTitle: 'Regional Subsidiary Scope Exclusion in Net-Zero Headline',
    adversarialPrompt:
      '"Our North American headquarters operates at 100% net-zero carbon emissions (excluding outsourced LATAM manufacturing and freight logistics)."',
    targetRuleCode: 'ENV-101',
    expectedOutcome: 'Contradicted' as VerificationState,
    simulatedOutcome: 'Ambiguous' as VerificationState,
    gapIdentified:
      'ENV-101 requires lifecycle boundary disclosure (cradle-to-gate vs. cradle-to-grave) but does not explicitly forbid parent-entity geographic carving that omits high-emission manufacturing subsidiaries.',
    gapSeverity: 'Critical' as RuleSeverity,
    remediationSuggestion:
      'Amend ENV-101 to require consolidated corporate group boundary reporting and prohibit geographic carve-outs in headline net-zero assertions.',
  },
  {
    scenarioTitle: 'Sub-Processor Fourth-Party Inference Passthrough',
    adversarialPrompt:
      '"Your enterprise data is never used to train our internal models, and is only routed to external partner inference APIs under standard commercial terms."',
    targetRuleCode: 'SEC-203',
    expectedOutcome: 'Contradicted' as VerificationState,
    simulatedOutcome: 'Unverified' as VerificationState,
    gapIdentified:
      'SEC-203 covers first-party foundation model training isolation, but fails to flag fourth-party inference routing where partner APIs may retain telemetry under "standard commercial terms".',
    gapSeverity: 'Critical' as RuleSeverity,
    remediationSuggestion:
      'Update SEC-203 to mandate flow-down Zero-Data-Retention (ZDR) attestations across all downstream sub-processor inference endpoints.',
  },
  {
    scenarioTitle: 'Gross vs. Net Cost Savings Omission in ROI Headline',
    adversarialPrompt:
      '"Enterprise customers saved $850,000 in annual compliance labor costs (prior to factoring in annual platform licensing and onboarding fees)."',
    targetRuleCode: 'FIN-301',
    expectedOutcome: 'Contradicted' as VerificationState,
    simulatedOutcome: 'Supported' as VerificationState,
    gapIdentified:
      'FIN-301 verifies sample size (n >= 25) and timeframe, but does not distinguish between gross labor savings and net ROI after deducting software subscription costs.',
    gapSeverity: 'High' as RuleSeverity,
    remediationSuggestion:
      'Require all FIN-301 dollar-savings headlines to report Net Total Economic Impact (net of licensing and implementation costs).',
  },
];

export const PolicyRedTeam: React.FC = () => {
  const {
    policies,
    redTeamScenarios,
    addRedTeamScenario,
    promoteGapToPolicyRule,
    setSelectedPolicyIdForDetail,
    setActiveTab,
  } = useVerifacta();

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('ALL');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [poolIndex, setPoolIndex] = useState<number>(0);

  // Custom Edge-Case Modal
  const [showCustomForm, setShowCustomForm] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customPolicyId, setCustomPolicyId] = useState<string>(policies[0]?.id || 'pol-env-001');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [customRuleCode, setCustomRuleCode] = useState<string>('ENV-101');
  const [customExpected, setCustomExpected] = useState<VerificationState>('Contradicted');
  const [customSimulated, setCustomSimulated] = useState<VerificationState>('Ambiguous');
  const [customGap, setCustomGap] = useState<string>('');
  const [customRemediation, setCustomRemediation] = useState<string>('');

  const filteredScenarios = redTeamScenarios.filter(
    (s) => selectedPolicyId === 'ALL' || s.policyId === selectedPolicyId
  );

  const gapsCount = filteredScenarios.filter(
    (s) => s.expectedOutcome !== s.simulatedOutcome
  ).length;

  const handleGenerateHypotheticalEdgeCase = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const template = GENERATED_EDGE_CASE_POOL[poolIndex % GENERATED_EDGE_CASE_POOL.length];
      const targetPolId =
        selectedPolicyId !== 'ALL'
          ? selectedPolicyId
          : template.targetRuleCode.startsWith('ENV')
          ? 'pol-env-001'
          : template.targetRuleCode.startsWith('SEC')
          ? 'pol-sec-002'
          : 'pol-fin-003';

      addRedTeamScenario({
        policyId: targetPolId,
        scenarioTitle: template.scenarioTitle,
        adversarialPrompt: template.adversarialPrompt,
        targetRuleCode: template.targetRuleCode,
        expectedOutcome: template.expectedOutcome,
        simulatedOutcome: template.simulatedOutcome,
        gapIdentified: template.gapIdentified,
        gapSeverity: template.gapSeverity,
        remediationSuggestion: template.remediationSuggestion,
      });

      setPoolIndex((prev) => prev + 1);
      setIsGenerating(false);
    }, 420);
  };

  const handleAddCustomScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customPrompt.trim() || !customGap.trim()) return;

    addRedTeamScenario({
      policyId: customPolicyId,
      scenarioTitle: customTitle.trim(),
      adversarialPrompt: `"${customPrompt.trim().replace(/^"|"$/g, '')}"`,
      targetRuleCode: customRuleCode.trim() || 'RULE-101',
      expectedOutcome: customExpected,
      simulatedOutcome: customSimulated,
      gapIdentified: customGap.trim(),
      gapSeverity: 'High',
      remediationSuggestion:
        customRemediation.trim() ||
        'Add explicit lexical constraint to close this adversarial phrasing loophole.',
    });

    setShowCustomForm(false);
    setCustomTitle('');
    setCustomPrompt('');
    setCustomGap('');
    setCustomRemediation('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-violet-700 font-medium mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Simulated Adversarial Policy Stress-Testing · Phase 1</span>
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Policy Red-Team & Gap Discovery
          </h2>
          <p className="text-sm text-slate-600 mt-0.5 max-w-3xl">
            Probe active policies with adversarial marketing claims, euphemisms, and boundary
            loopholes. Compare expected compliance outcomes against simulated rule classifications
            to uncover and remediate policy blind spots.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowCustomForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Custom Scenario</span>
          </button>
          <button
            onClick={handleGenerateHypotheticalEdgeCase}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-colors shadow-xs whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {isGenerating
                ? 'Generating Simulated Edge Case...'
                : 'Generate Hypothetical Edge Case'}
            </span>
          </button>
        </div>
      </div>

      {/* Custom Scenario Inline Builder */}
      {showCustomForm && (
        <form
          onSubmit={handleAddCustomScenario}
          className="bg-white border border-indigo-200 rounded-xl p-6 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-display text-sm font-bold text-slate-900">
              Create Custom Adversarial Test Scenario (Simulated)
            </h3>
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              className="text-slate-400 hover:text-slate-600 font-semibold"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Scenario Title *</label>
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g., Unbundled Carbon Credit Euphemism"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Policy *</label>
              <select
                value={customPolicyId}
                onChange={(e) => setCustomPolicyId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {policies.map((pol) => (
                  <option key={pol.id} value={pol.id}>
                    {pol.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Clause Code</label>
              <input
                type="text"
                value={customRuleCode}
                onChange={(e) => setCustomRuleCode(e.target.value)}
                placeholder="e.g., ENV-101"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Hypothetical Adversarial Claim / Copy *
            </label>
            <textarea
              rows={2}
              required
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Enter a borderline or evasive marketing statement designed to bypass current wording..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Expected Policy Outcome
              </label>
              <select
                value={customExpected}
                onChange={(e) => setCustomExpected(e.target.value as VerificationState)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Contradicted">Contradicted</option>
                <option value="Unverified">Unverified</option>
                <option value="Ambiguous">Ambiguous</option>
                <option value="Supported">Supported</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Simulated Current Policy Outcome
              </label>
              <select
                value={customSimulated}
                onChange={(e) => setCustomSimulated(e.target.value as VerificationState)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Ambiguous">Ambiguous</option>
                <option value="Unverified">Unverified</option>
                <option value="Supported">Supported</option>
                <option value="Contradicted">Contradicted</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Identified Policy Gap Analysis *
              </label>
              <input
                type="text"
                required
                value={customGap}
                onChange={(e) => setCustomGap(e.target.value)}
                placeholder="Explain why current policy rules miss or misclassify this scenario..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Recommended Clause Remediation
              </label>
              <input
                type="text"
                value={customRemediation}
                onChange={(e) => setCustomRemediation(e.target.value)}
                placeholder="Specify the rule amendment to close this loophole..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              className="px-4 py-2 font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              Add Test Scenario
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar & Summary Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            Filter by Policy:
          </label>
          <select
            value={selectedPolicyId}
            onChange={(e) => setSelectedPolicyId(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
          >
            <option value="ALL">All Policies ({redTeamScenarios.length} scenarios)</option>
            {policies.map((pol) => (
              <option key={pol.id} value={pol.id}>
                {pol.name} ({pol.version})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span>
            Total Scenarios:{' '}
            <strong className="font-mono text-slate-900 tabular-nums">
              {filteredScenarios.length}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Policy Coverage Gaps Detected:{' '}
            <strong className="font-mono text-red-700 tabular-nums">{gapsCount}</strong>
          </span>
        </div>
      </div>

      {/* Scenarios List */}
      <div className="space-y-4">
        {filteredScenarios.map((scenario) => {
          const policy = policies.find((p) => p.id === scenario.policyId);
          const isDivergent = scenario.expectedOutcome !== scenario.simulatedOutcome;

          return (
            <div
              key={scenario.id}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              {/* Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                    <span className="font-mono font-bold text-slate-800">
                      Clause {scenario.targetRuleCode}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{policy?.name || 'Corporate Policy'}</span>
                    <span aria-hidden="true">·</span>
                    <SeverityText severity={scenario.gapSeverity} />
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    {scenario.scenarioTitle}
                  </h3>
                </div>

                <div>
                  {isDivergent ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>Policy Gap Identified (Outcome Mismatch)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Policy Resilient (Expected Match)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Adversarial Test Input */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="font-semibold text-slate-500 block mb-1 text-[11px]">
                  Simulated Adversarial Marketing Copy:
                </span>
                <p className="text-slate-900 font-medium italic leading-relaxed">
                  {scenario.adversarialPrompt}
                </p>
              </div>

              {/* Expected vs Simulated Outcome Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
                <div className="md:col-span-3 p-3.5 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[11px] text-slate-500 block mb-1.5">
                    Expected Policy Outcome
                  </span>
                  <FourStateIndicator state={scenario.expectedOutcome} />
                </div>

                <div className="md:col-span-3 p-3.5 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[11px] text-slate-500 block mb-1.5">
                    Simulated Current Outcome
                  </span>
                  <FourStateIndicator state={scenario.simulatedOutcome} />
                </div>

                <div className="md:col-span-6 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Gap & Vulnerability Analysis:
                  </span>
                  <p className="text-slate-600 leading-relaxed">{scenario.gapIdentified}</p>
                </div>
              </div>

              {/* Remediation & Action Bar */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="text-slate-600">
                  <span className="font-semibold text-slate-800">Recommended Remediation: </span>
                  <span>{scenario.remediationSuggestion}</span>
                </div>

                {scenario.promotedToRule && policy ? (
                  <button
                    onClick={() => {
                      setSelectedPolicyIdForDetail(policy.id);
                      setActiveTab('policy-library');
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Remediation Added to Policy</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  isDivergent && (
                    <button
                      onClick={() => promoteGapToPolicyRule(scenario.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Promote Remediation to Policy Rule</span>
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
