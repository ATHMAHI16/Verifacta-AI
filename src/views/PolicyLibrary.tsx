import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Eye,
  Edit3,
  Archive,
  RotateCcw,
  ArrowLeft,
  FileSearch,
  ShieldAlert,
  X,
  Check,
} from 'lucide-react';
import { useVerifacta } from '../context/VerifactaContext';
import { Policy, PolicyStatus, RuleSeverity } from '../types';
import { PolicyStatusIndicator, SeverityText } from '../components/StatusIndicators';

export const PolicyLibrary: React.FC = () => {
  const {
    policies,
    selectedPolicyIdForDetail,
    setSelectedPolicyIdForDetail,
    openCreatePolicyModalOnMount,
    setOpenCreatePolicyModalOnMount,
    createPolicy,
    updatePolicy,
    toggleArchivePolicy,
    addRuleToPolicy,
    setPreselectedVerifyPolicyId,
    setActiveTab,
  } = useVerifacta();

  const [statusFilter, setStatusFilter] = useState<'All' | PolicyStatus>('All');
  const [localSearch, setLocalSearch] = useState('');

  // Create / Edit Policy Modal State
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('ESG & Sustainability');
  const [formVersion, setFormVersion] = useState('v1.0.0');
  const [formStatus, setFormStatus] = useState<PolicyStatus>('Draft');
  const [formOwner, setFormOwner] = useState('Elena Rostova · VP Brand Governance');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');

  // Add Rule Modal inside Detail View
  const [addRuleModalOpen, setAddRuleModalOpen] = useState(false);
  const [ruleCode, setRuleCode] = useState('');
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [ruleSeverity, setRuleSeverity] = useState<RuleSeverity>('High');
  const [ruleEvidence, setRuleEvidence] = useState('');
  const [ruleKeywords, setRuleKeywords] = useState('');
  const [ruleFormError, setRuleFormError] = useState('');

  useEffect(() => {
    if (openCreatePolicyModalOnMount) {
      handleOpenCreateModal();
      setOpenCreatePolicyModalOnMount(false);
    }
  }, [openCreatePolicyModalOnMount, setOpenCreatePolicyModalOnMount]);

  const handleOpenCreateModal = () => {
    setEditingPolicy(null);
    setFormName('');
    setFormCategory('ESG & Sustainability');
    setFormVersion('v1.0.0');
    setFormStatus('Draft');
    setFormOwner('Elena Rostova · VP Brand Governance');
    setFormDescription('');
    setFormError('');
    setPolicyModalOpen(true);
  };

  const handleOpenEditModal = (policy: Policy) => {
    setEditingPolicy(policy);
    setFormName(policy.name);
    setFormCategory(policy.category);
    setFormVersion(policy.version);
    setFormStatus(policy.status);
    setFormOwner(policy.owner);
    setFormDescription(policy.description);
    setFormError('');
    setPolicyModalOpen(true);
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCategory.trim() || !formVersion.trim() || !formDescription.trim()) {
      setFormError('Policy name, category, version, and description are required.');
      return;
    }

    if (editingPolicy) {
      updatePolicy(editingPolicy.id, {
        name: formName.trim(),
        category: formCategory.trim(),
        version: formVersion.trim(),
        status: formStatus,
        owner: formOwner.trim() || 'Compliance Team',
        description: formDescription.trim(),
      });
    } else {
      const created = createPolicy({
        name: formName.trim(),
        category: formCategory.trim(),
        version: formVersion.trim(),
        status: formStatus,
        owner: formOwner.trim() || 'Compliance Team',
        description: formDescription.trim(),
        rules: [
          {
            id: `rule-${Date.now()}`,
            code: 'GEN-101',
            title: 'Primary Substantiation & Audit Citation Requirement',
            description:
              'All quantitative performance or compliance assertions under this policy must reference a verified internal audit document or third-party certification.',
            severity: 'High',
            evidenceRequired: 'Verified Compliance Substantiation Dossier',
            keywords: ['certified', 'verified', 'guaranteed', 'compliance'],
          },
        ],
      });
      setSelectedPolicyIdForDetail(created.id);
    }

    setPolicyModalOpen(false);
  };

  const handleSaveRule = (e: React.FormEvent, policyId: string) => {
    e.preventDefault();
    if (!ruleCode.trim() || !ruleTitle.trim() || !ruleDesc.trim() || !ruleEvidence.trim()) {
      setRuleFormError('Rule code, title, description, and required evidence are mandatory.');
      return;
    }

    addRuleToPolicy(policyId, {
      code: ruleCode.trim().toUpperCase(),
      title: ruleTitle.trim(),
      description: ruleDesc.trim(),
      severity: ruleSeverity,
      evidenceRequired: ruleEvidence.trim(),
      keywords: ruleKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    });

    setAddRuleModalOpen(false);
    setRuleCode('');
    setRuleTitle('');
    setRuleDesc('');
    setRuleEvidence('');
    setRuleKeywords('');
    setRuleFormError('');
  };

  const selectedPolicy = policies.find((p) => p.id === selectedPolicyIdForDetail) || null;

  const filteredPolicies = policies.filter((pol) => {
    const matchesStatus = statusFilter === 'All' || pol.status === statusFilter;
    const q = localSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      pol.name.toLowerCase().includes(q) ||
      pol.category.toLowerCase().includes(q) ||
      pol.version.toLowerCase().includes(q) ||
      pol.rules.some(
        (r) => r.code.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)
      );
    return matchesStatus && matchesSearch;
  });

  // Detail View if a policy is selected
  if (selectedPolicy) {
    return (
      <div className="space-y-6">
        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            onClick={() => setSelectedPolicyIdForDetail(null)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Policy Library</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenEditModal(selectedPolicy)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Metadata</span>
            </button>
            <button
              onClick={() => toggleArchivePolicy(selectedPolicy.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {selectedPolicy.status === 'Archived' ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Policy</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Policy</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setPreselectedVerifyPolicyId(selectedPolicy.id);
                setActiveTab('content-verification');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Verify Content Against Policy</span>
            </button>
          </div>
        </div>

        {/* Policy Header Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
                <span>{selectedPolicy.category}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-semibold text-slate-700 tabular-nums">
                  {selectedPolicy.version}
                </span>
                <span aria-hidden="true">·</span>
                <span>Updated {selectedPolicy.lastUpdated}</span>
                <span aria-hidden="true">·</span>
                <span>Owner: {selectedPolicy.owner}</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                {selectedPolicy.name}
              </h2>
              <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
                {selectedPolicy.description}
              </p>
            </div>
            <div className="shrink-0">
              <PolicyStatusIndicator status={selectedPolicy.status} />
            </div>
          </div>
        </div>

        {/* Policy Rules List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Enforceable Policy Clauses ({selectedPolicy.rules.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Structured verification clauses evaluated during Content Verification and Red-Team
                testing
              </p>
            </div>
            <button
              onClick={() => {
                setRuleCode(`RULE-${selectedPolicy.rules.length + 101}`);
                setAddRuleModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap w-fit"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Policy Rule</span>
            </button>
          </div>

          <div className="divide-y divide-slate-200">
            {selectedPolicy.rules.map((rule) => (
              <div key={rule.id} className="p-6 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-blue-700 tabular-nums">
                      {rule.code}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <h4 className="font-display text-sm font-bold text-slate-900">{rule.title}</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    {rule.isAmbiguous && (
                      <span className="text-xs font-medium text-violet-700">
                        Flagged Ambiguous Wording
                      </span>
                    )}
                    <SeverityText severity={rule.severity} />
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed max-w-4xl">
                  {rule.description}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                  <div>
                    <span className="font-medium text-slate-700">Required Evidence: </span>
                    <span>{rule.evidenceRequired}</span>
                  </div>
                  {rule.keywords.length > 0 && (
                    <div>
                      <span className="font-medium text-slate-700">Monitored Lexicon: </span>
                      <span className="font-mono text-[11px]">{rule.keywords.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Rule Modal */}
        {addRuleModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Add Rule to {selectedPolicy.name}
                </h3>
                <button
                  onClick={() => setAddRuleModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={(e) => handleSaveRule(e, selectedPolicy.id)}
                className="p-6 space-y-4 text-xs"
              >
                {ruleFormError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium">
                    {ruleFormError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Clause Code *
                    </label>
                    <input
                      type="text"
                      value={ruleCode}
                      onChange={(e) => setRuleCode(e.target.value)}
                      placeholder="e.g., ENV-105"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Severity *</label>
                    <select
                      value={ruleSeverity}
                      onChange={(e) => setRuleSeverity(e.target.value as RuleSeverity)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Clause Title *</label>
                  <input
                    type="text"
                    value={ruleTitle}
                    onChange={(e) => setRuleTitle(e.target.value)}
                    placeholder="e.g., Scope 3 Supply Chain Emission Boundary"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Rule Specification & Verification Criteria *
                  </label>
                  <textarea
                    rows={3}
                    value={ruleDesc}
                    onChange={(e) => setRuleDesc(e.target.value)}
                    placeholder="Specify what claims are permitted, prohibited, or require qualification..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Required Evidence Reference *
                  </label>
                  <input
                    type="text"
                    value={ruleEvidence}
                    onChange={(e) => setRuleEvidence(e.target.value)}
                    placeholder="e.g., ISO 14064 Audit Report or Supplier Certificate"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Trigger Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={ruleKeywords}
                    onChange={(e) => setRuleKeywords(e.target.value)}
                    placeholder="e.g., scope 3, supply chain, emissions"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddRuleModalOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Clause</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Policy Edit Modal (reused when editing from detail view) */}
        {policyModalOpen && (
          <PolicyFormModal
            editingPolicy={editingPolicy}
            formName={formName}
            setFormName={setFormName}
            formCategory={formCategory}
            setFormCategory={setFormCategory}
            formVersion={formVersion}
            setFormVersion={setFormVersion}
            formStatus={formStatus}
            setFormStatus={setFormStatus}
            formOwner={formOwner}
            setFormOwner={setFormOwner}
            formDescription={formDescription}
            setFormDescription={setFormDescription}
            formError={formError}
            onClose={() => setPolicyModalOpen(false)}
            onSave={handleSavePolicy}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Corporate Policy & Brand Guideline Repository
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Manage versioned compliance policies, inspect enforceable rule clauses, and control
            publication lifecycle status.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs whitespace-nowrap shrink-0 w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Create Policy</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Interactive Status Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
          {(['All', 'Active', 'Draft', 'Archived'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Table Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Filter by policy name, category, or code..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Policies Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredPolicies.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-900">
              No policies match your current filter
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Try clearing your search query or creating a new compliance policy.
            </p>
            <button
              onClick={() => {
                setStatusFilter('All');
                setLocalSearch('');
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Policy Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Clauses</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <button
                        onClick={() => setSelectedPolicyIdForDetail(policy.id)}
                        className="font-semibold text-slate-900 hover:text-blue-600 text-left block"
                      >
                        {policy.name}
                      </button>
                      <span className="text-[11px] text-slate-500 block mt-0.5 line-clamp-1 max-w-md">
                        {policy.description}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {policy.category}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800 whitespace-nowrap tabular-nums">
                      {policy.version}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                      {policy.rules.length} rules
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                      {policy.lastUpdated}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PolicyStatusIndicator status={policy.status} />
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedPolicyIdForDetail(policy.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="View policy clauses"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(policy)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                          title="Edit policy"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => toggleArchivePolicy(policy.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                          title={
                            policy.status === 'Archived' ? 'Restore policy' : 'Archive policy'
                          }
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>{policy.status === 'Archived' ? 'Restore' : 'Archive'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Policy Modal */}
      {policyModalOpen && (
        <PolicyFormModal
          editingPolicy={editingPolicy}
          formName={formName}
          setFormName={setFormName}
          formCategory={formCategory}
          setFormCategory={setFormCategory}
          formVersion={formVersion}
          setFormVersion={setFormVersion}
          formStatus={formStatus}
          setFormStatus={setFormStatus}
          formOwner={formOwner}
          setFormOwner={setFormOwner}
          formDescription={formDescription}
          setFormDescription={setFormDescription}
          formError={formError}
          onClose={() => setPolicyModalOpen(false)}
          onSave={handleSavePolicy}
        />
      )}
    </div>
  );
};

interface PolicyFormModalProps {
  editingPolicy: Policy | null;
  formName: string;
  setFormName: (v: string) => void;
  formCategory: string;
  setFormCategory: (v: string) => void;
  formVersion: string;
  setFormVersion: (v: string) => void;
  formStatus: PolicyStatus;
  setFormStatus: (v: PolicyStatus) => void;
  formOwner: string;
  setFormOwner: (v: string) => void;
  formDescription: string;
  setFormDescription: (v: string) => void;
  formError: string;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

const PolicyFormModal: React.FC<PolicyFormModalProps> = ({
  editingPolicy,
  formName,
  setFormName,
  formCategory,
  setFormCategory,
  formVersion,
  setFormVersion,
  formStatus,
  setFormStatus,
  formOwner,
  setFormOwner,
  formDescription,
  setFormDescription,
  formError,
  onClose,
  onSave,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-slate-900">
            {editingPolicy ? 'Edit Compliance Policy' : 'Create New Compliance Policy'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="p-6 space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Policy Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Global AI Product Claims & Transparency Policy"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category *</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="ESG & Sustainability">ESG & Sustainability</option>
                <option value="Technical & Product Claims">Technical & Product Claims</option>
                <option value="Financial & ROI Marketing">Financial & ROI Marketing</option>
                <option value="Regulated Industries">Regulated Industries</option>
                <option value="Brand Voice & Editorial">Brand Voice & Editorial</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Version *</label>
              <input
                type="text"
                value={formVersion}
                onChange={(e) => setFormVersion(e.target.value)}
                placeholder="v1.0.0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status *</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as PolicyStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Policy Owner</label>
            <input
              type="text"
              value={formOwner}
              onChange={(e) => setFormOwner(e.target.value)}
              placeholder="e.g., Elena Rostova · VP Brand Governance"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Scope & Governance Description *
            </label>
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe the communication channels, regulatory standards, and substantiation scope governed by this policy..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingPolicy ? 'Save Changes' : 'Create Policy'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
