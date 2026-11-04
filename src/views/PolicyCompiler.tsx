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
  XCircle,
  ArrowUpRight,
} from 'lucide-react';
import { useVerifacta } from '../context/VerifactaContext';
import { SAMPLE_GUIDELINE_TEMPLATES } from '../data/mockData';
import { CompiledCandidateRule, RuleSeverity } from '../types';
import { SeverityText } from '../components/StatusIndicators';

export const PolicyCompiler: React.FC = () => {
  const {
    policies,
    candidateRules,
    setCandidateRulesList,
    updateCandidateRule,
    approveAndPromoteCandidateRule,
    rejectCandidateRule,
    setSelectedPolicyIdForDetail,
    setActiveTab,
    addToast,
  } = useVerifacta();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    SAMPLE_GUIDELINE_TEMPLATES[0].id
  );
  const [targetPolicyId, setTargetPolicyId] = useState<string>(
    SAMPLE_GUIDELINE_TEMPLATES[0].targetPolicyId
  );
  const [guidelineInput, setGuidelineInput] = useState<string>(
    SAMPLE_GUIDELINE_TEMPLATES[0].rawText
  );
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleText, setEditRuleText] = useState<string>('');
  const [editCodeText, setEditCodeText] = useState<string>('');
  const [editEvidenceText, setEditEvidenceText] = useState<string>('');
  const [editAmbiguityNote, setEditAmbiguityNote] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>(
    'All'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadTemplate = (templateId: string) => {
    const tpl = SAMPLE_GUIDELINE_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(tpl.id);
    setTargetPolicyId(tpl.targetPolicyId);
    setGuidelineInput(tpl.rawText);
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

    setTimeout(() => {
      const matchingTemplate = SAMPLE_GUIDELINE_TEMPLATES.find(
        (t) => t.rawText.trim() === guidelineInput.trim()
      );

      let newCandidates: CompiledCandidateRule[] = [];

      if (matchingTemplate) {
        newCandidates = matchingTemplate.extractedCandidates.map((c, idx) => ({
          ...c,
          id: `cand-${Date.now()}-${idx}`,
          status: 'Pending',
        }));
      } else {
        // Deterministic extraction from custom uploaded/pasted paragraphs
        const targetPolicy = policies.find((p) => p.id === targetPolicyId) || policies[0];
        const paragraphs = guidelineInput
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 25);

        const sourceBlocks = paragraphs.length > 0 ? paragraphs : [guidelineInput.trim()];

        newCandidates = sourceBlocks.slice(0, 6).map((block, idx) => {
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

          const prefix =
            targetPolicy.category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'POL';

          return {
            id: `cand-${Date.now()}-${idx}`,
            sourceExcerpt: `"${cleanExcerpt.slice(0, 220)}${cleanExcerpt.length > 220 ? '...' : ''}"`,
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
              ? 'Contains subjective or non-quantified phrasing that requires an explicit threshold for deterministic verification.'
              : undefined,
            status: 'Pending',
          };
        });
      }

      setCandidateRulesList(newCandidates);
      setIsExtracting(false);
      setStatusFilter('All');
      addToast(
        'Simulated Extraction Complete',
        `Extracted ${newCandidates.length} candidate rules (${
          newCandidates.filter((c) => c.isAmbiguous).length
        } flagged as ambiguous).`
      );
    }, 450);
  };

  const startEditingRule = (rule: CompiledCandidateRule) => {
    setEditingRuleId(rule.id);
    setEditRuleText(rule.extractedRule);
    setEditCodeText(rule.suggestedCode);
    setEditEvidenceText(rule.evidenceRequired);
    setEditAmbiguityNote(rule.ambiguityNote || '');
  };

  const saveEditedRule = (id: string) => {
    if (!editRuleText.trim()) return;
    updateCandidateRule(id, {
      extractedRule: editRuleText.trim(),
      suggestedCode: editCodeText.trim() || 'RULE-101',
      evidenceRequired: editEvidenceText.trim() || 'Primary Audit Attestation',
      ambiguityNote: editAmbiguityNote.trim() || undefined,
    });
    setEditingRuleId(null);
    addToast('Candidate Clause Updated', 'Saved inline edits to extracted rule.');
  };

  const toggleAmbiguousFlag = (rule: CompiledCandidateRule) => {
    const nextAmbiguous = !rule.isAmbiguous;
    updateCandidateRule(rule.id, {
      isAmbiguous: nextAmbiguous,
      ambiguityNote: nextAmbiguous
        ? rule.ambiguityNote ||
          'Manually flagged by reviewer as containing subjective or ambiguous terminology.'
        : undefined,
    });
  };

  const filteredCandidates = candidateRules.filter(
    (c) => statusFilter === 'All' || c.status === statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Simulation Transparency Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-indigo-700 font-medium mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>Simulated Rule Extraction Engine · Phase 1 Demonstration</span>
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Policy Compiler & Clause Extractor
          </h2>
          <p className="text-sm text-slate-600 mt-0.5 max-w-3xl">
            Transform unstructured brand guidelines and legal directives into structured,
            enforceable policy clauses. Review extracted rules, flag ambiguous language, and promote
            approved clauses directly into your Policy Library.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload .TXT / .MD</span>
          </button>
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

          {/* Target Policy for Promotion */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Policy for Approved Rules
            </label>
            <select
              value={targetPolicyId}
              onChange={(e) => setTargetPolicyId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
            >
              {policies.map((pol) => (
                <option key={pol.id} value={pol.id}>
                  {pol.name} ({pol.version})
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
              rows={13}
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
                ? 'Running Simulated Clause Extraction...'
                : 'Start Policy Extraction (Simulated)'}
            </span>
          </button>
        </div>

        {/* Right Column: Extracted Candidate Rules */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                2. Extracted Candidate Clauses ({candidateRules.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect, refine, or flag ambiguous clauses before promoting to Policy Library
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    statusFilter === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
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
                No extracted rules in this view
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Switch filter tabs or click &ldquo;Start Policy Extraction&rdquo; on the left.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredCandidates.map((rule) => {
                const isEditing = editingRuleId === rule.id;
                const promotedPolicy = policies.find((p) => p.id === rule.promotedToPolicyId);

                return (
                  <div key={rule.id} className="p-6 space-y-3 hover:bg-slate-50/40 transition-colors">
                    {/* Top Metadata Line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
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
                          {rule.confidence}% match confidence
                        </span>
                      </div>

                      {/* Candidate Status */}
                      <div className="flex items-center gap-2">
                        {rule.status === 'Approved' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Promoted</span>
                          </span>
                        )}
                        {rule.status === 'Rejected' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>Rejected</span>
                          </span>
                        )}
                        {rule.status === 'Pending' && (
                          <span className="text-xs font-medium text-amber-700">
                            Pending Review
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Source Excerpt Box */}
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-600">
                      <span className="font-semibold text-slate-700 not-italic block mb-0.5">
                        Source Guideline Clause:
                      </span>
                      <span className="italic">{rule.sourceExcerpt}</span>
                    </div>

                    {/* Extracted Rule Content or Edit Form */}
                    {isEditing ? (
                      <div className="p-4 bg-slate-50 border border-blue-200 rounded-lg space-y-3 text-xs">
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
                            Extracted Enforceable Rule Statement
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
                            Ambiguity Resolution Note (Optional)
                          </label>
                          <input
                            type="text"
                            value={editAmbiguityNote}
                            onChange={(e) => setEditAmbiguityNote(e.target.value)}
                            placeholder="Explain why this clause is ambiguous or how it was clarified..."
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingRuleId(null)}
                            className="px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-900"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEditedRule(rule.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-white bg-blue-600 rounded hover:bg-blue-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Rule Edits</span>
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

                    {/* Ambiguity Alert Box if flagged */}
                    {rule.isAmbiguous && (
                      <div className="p-3 bg-violet-50/70 border border-violet-200 rounded-lg flex items-start gap-2.5 text-xs text-violet-900">
                        <HelpCircle className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Ambiguous Clause Flagged: </span>
                          <span>
                            {rule.ambiguityNote ||
                              'Contains subjective modifiers that may require numerical thresholds.'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditingRule(rule)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit Clause</span>
                        </button>

                        <button
                          onClick={() => toggleAmbiguousFlag(rule)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            rule.isAmbiguous
                              ? 'text-violet-700 bg-violet-50 hover:bg-violet-100'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>
                            {rule.isAmbiguous ? 'Unmark Ambiguous' : 'Mark Ambiguous Clause'}
                          </span>
                        </button>
                      </div>

                      {rule.status === 'Approved' && promotedPolicy ? (
                        <button
                          onClick={() => {
                            setSelectedPolicyIdForDetail(promotedPolicy.id);
                            setActiveTab('policy-library');
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          <span>View in {promotedPolicy.name}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => rejectCandidateRule(rule.id)}
                            disabled={rule.status === 'Rejected'}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 rounded-lg border border-slate-200 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() =>
                              approveAndPromoteCandidateRule(rule.id, targetPolicyId)
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Sync to Policy</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
