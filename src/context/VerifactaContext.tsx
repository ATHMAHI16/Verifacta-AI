import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  NavTab,
  Policy,
  PolicyRule,
  PolicyStatus,
  CompiledCandidateRule,
  AuditRecord,
  RedTeamScenario,
  VerificationFinding,
  ReviewStatus,
  AppSettings,
} from '../types';
import {
  INITIAL_POLICIES,
  INITIAL_CANDIDATE_RULES,
  INITIAL_AUDIT_RECORDS,
  INITIAL_RED_TEAM_SCENARIOS,
  INITIAL_SETTINGS,
  SAMPLE_CONTENT_DRAFTS,
} from '../data/mockData';

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'warning';
}

interface VerifactaContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  policies: Policy[];
  candidateRules: CompiledCandidateRule[];
  auditRecords: AuditRecord[];
  redTeamScenarios: RedTeamScenario[];
  settings: AppSettings;
  selectedPolicyIdForDetail: string | null;
  setSelectedPolicyIdForDetail: (id: string | null) => void;
  selectedAuditIdForDetail: string | null;
  setSelectedAuditIdForDetail: (id: string | null) => void;
  preselectedVerifyPolicyId: string | null;
  setPreselectedVerifyPolicyId: (id: string | null) => void;
  openCreatePolicyModalOnMount: boolean;
  setOpenCreatePolicyModalOnMount: (open: boolean) => void;
  toasts: ToastMessage[];
  addToast: (title: string, description?: string, type?: 'success' | 'info' | 'warning') => void;
  dismissToast: (id: string) => void;

  // Policy Actions
  createPolicy: (policyData: Omit<Policy, 'id' | 'lastUpdated'>) => Policy;
  updatePolicy: (id: string, updated: Partial<Policy>) => void;
  toggleArchivePolicy: (id: string) => void;
  addRuleToPolicy: (policyId: string, rule: Omit<PolicyRule, 'id'>) => void;

  // Policy Compiler Actions
  setCandidateRulesList: (rules: CompiledCandidateRule[]) => void;
  updateCandidateRule: (id: string, updates: Partial<CompiledCandidateRule>) => void;
  approveAndPromoteCandidateRule: (candidateId: string, targetPolicyId: string) => void;
  rejectCandidateRule: (candidateId: string) => void;

  // Content Verification & Audit Actions
  runDeterministicVerification: (
    contentTitle: string,
    contentRevision: string,
    contentBody: string,
    policyId: string
  ) => { findings: VerificationFinding[]; auditRecord?: AuditRecord };
  updateAuditDecision: (auditId: string, status: ReviewStatus, note: string) => void;

  // Red-Team Actions
  addRedTeamScenario: (scenario: Omit<RedTeamScenario, 'id'>) => void;
  promoteGapToPolicyRule: (scenarioId: string) => void;

  // Settings & Demo Reset
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetDemoData: () => void;
}

const STORAGE_KEYS = {
  POLICIES: 'verifacta_v1_policies',
  CANDIDATES: 'verifacta_v1_candidates',
  AUDITS: 'verifacta_v1_audits',
  RED_TEAM: 'verifacta_v1_redteam',
  SETTINGS: 'verifacta_v1_settings',
};

const VerifactaContext = createContext<VerifactaContextType | undefined>(undefined);

function incrementMinorVersion(version: string): string {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return 'v1.1.0';
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10) + 1;
  return `v${major}.${minor}.0`;
}

export const VerifactaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedPolicyIdForDetail, setSelectedPolicyIdForDetail] = useState<string | null>(null);
  const [selectedAuditIdForDetail, setSelectedAuditIdForDetail] = useState<string | null>(null);
  const [preselectedVerifyPolicyId, setPreselectedVerifyPolicyId] = useState<string | null>(null);
  const [openCreatePolicyModalOnMount, setOpenCreatePolicyModalOnMount] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [policies, setPolicies] = useState<Policy[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.POLICIES);
      return saved ? JSON.parse(saved) : INITIAL_POLICIES;
    } catch {
      return INITIAL_POLICIES;
    }
  });

  const [candidateRules, setCandidateRules] = useState<CompiledCandidateRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CANDIDATES);
      return saved ? JSON.parse(saved) : INITIAL_CANDIDATE_RULES;
    } catch {
      return INITIAL_CANDIDATE_RULES;
    }
  });

  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDITS);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_RECORDS;
    } catch {
      return INITIAL_AUDIT_RECORDS;
    }
  });

  const [redTeamScenarios, setRedTeamScenarios] = useState<RedTeamScenario[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RED_TEAM);
      return saved ? JSON.parse(saved) : INITIAL_RED_TEAM_SCENARIOS;
    } catch {
      return INITIAL_RED_TEAM_SCENARIOS;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(policies));
    } catch {
      // Ignore quota errors
    }
  }, [policies]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidateRules));
    } catch {
      // Ignore
    }
  }, [candidateRules]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDITS, JSON.stringify(auditRecords));
    } catch {
      // Ignore
    }
  }, [auditRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RED_TEAM, JSON.stringify(redTeamScenarios));
    } catch {
      // Ignore
    }
  }, [redTeamScenarios]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }, [settings]);

  const addToast = (
    title: string,
    description?: string,
    type: 'success' | 'info' | 'warning' = 'success'
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const createPolicy = (policyData: Omit<Policy, 'id' | 'lastUpdated'>): Policy => {
    const today = new Date().toISOString().split('T')[0];
    const newPolicy: Policy = {
      ...policyData,
      id: `pol-${Date.now().toString(36)}`,
      lastUpdated: today,
    };
    setPolicies((prev) => [newPolicy, ...prev]);
    addToast('Policy Created', `${newPolicy.name} (${newPolicy.version}) added to Policy Library.`);
    return newPolicy;
  };

  const updatePolicy = (id: string, updated: Partial<Policy>) => {
    const today = new Date().toISOString().split('T')[0];
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated, lastUpdated: today } : p))
    );
    addToast('Policy Updated', 'Changes saved to Policy Library.');
  };

  const toggleArchivePolicy = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextStatus: PolicyStatus = p.status === 'Archived' ? 'Active' : 'Archived';
        addToast(
          nextStatus === 'Archived' ? 'Policy Archived' : 'Policy Restored',
          `${p.name} is now ${nextStatus}.`,
          'info'
        );
        return { ...p, status: nextStatus, lastUpdated: today };
      })
    );
  };

  const addRuleToPolicy = (policyId: string, rule: Omit<PolicyRule, 'id'>) => {
    const today = new Date().toISOString().split('T')[0];
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.id !== policyId) return p;
        const newRule: PolicyRule = {
          ...rule,
          id: `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        };
        return {
          ...p,
          version: incrementMinorVersion(p.version),
          lastUpdated: today,
          rules: [...p.rules, newRule],
        };
      })
    );
  };

  const setCandidateRulesList = (rules: CompiledCandidateRule[]) => {
    setCandidateRules(rules);
  };

  const updateCandidateRule = (id: string, updates: Partial<CompiledCandidateRule>) => {
    setCandidateRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const approveAndPromoteCandidateRule = (candidateId: string, targetPolicyId: string) => {
    const candidate = candidateRules.find((c) => c.id === candidateId);
    const targetPolicy = policies.find((p) => p.id === targetPolicyId);
    if (!candidate || !targetPolicy) return;

    setCandidateRules((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? { ...c, status: 'Approved', promotedToPolicyId: targetPolicyId }
          : c
      )
    );

    const extractedWords = candidate.extractedRule
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 6);

    addRuleToPolicy(targetPolicyId, {
      code: candidate.suggestedCode || `RULE-${targetPolicy.rules.length + 101}`,
      title:
        candidate.extractedRule.length > 68
          ? `${candidate.extractedRule.slice(0, 65)}...`
          : candidate.extractedRule,
      description: candidate.extractedRule,
      severity: candidate.severity,
      evidenceRequired: candidate.evidenceRequired,
      keywords: extractedWords.length > 0 ? extractedWords : ['compliance', 'disclosure'],
      isAmbiguous: candidate.isAmbiguous,
    });

    addToast(
      'Rule Promoted to Policy Library',
      `Clause ${candidate.suggestedCode} synced into "${targetPolicy.name}".`
    );
  };

  const rejectCandidateRule = (candidateId: string) => {
    setCandidateRules((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, status: 'Rejected' } : c))
    );
    addToast('Candidate Rule Rejected', 'Marked as rejected in compiler queue.', 'info');
  };

  const runDeterministicVerification = (
    contentTitle: string,
    contentRevision: string,
    contentBody: string,
    policyId: string
  ): { findings: VerificationFinding[]; auditRecord?: AuditRecord } => {
    const policy = policies.find((p) => p.id === policyId) || policies[0];
    const matchingSample = SAMPLE_CONTENT_DRAFTS.find(
      (d) => d.content.trim() === contentBody.trim() && d.policyId === policy.id
    );

    let findings: VerificationFinding[] = [];

    if (matchingSample) {
      findings = matchingSample.presetFindings.map((f, index) => ({
        ...f,
        id: `find-${Date.now()}-${index}`,
      }));
    } else {
      // Deterministic sentence/paragraph analysis against active policy rules
      const paragraphs = contentBody
        .split(/\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 12);

      const segments = paragraphs.length > 0 ? paragraphs : [contentBody.trim()];
      const rules = policy.rules.length > 0 ? policy.rules : INITIAL_POLICIES[0].rules;

      segments.forEach((segment, idx) => {
        const lower = segment.toLowerCase();
        const rule = rules[idx % rules.length];

        const hasProhibited =
          (rule.prohibitedTerms || []).some((t) => lower.includes(t.toLowerCase())) ||
          /\b(100%|zero impact|zero downtime|never fails|guaranteed|unhackable|risk-free|completely free of)\b/i.test(
            segment
          );

        const hasEvidenceCitation =
          /\b(iso|soc\s*2|grs|fsc|astm|dpa|msa|ref|#\w+|section\s+\d|n\s*=\s*\d+|study|audit|report)\b/i.test(
            segment
          );

        const hasAmbiguous =
          (rule.ambiguousModifiers || []).some((m) => lower.includes(m.toLowerCase())) ||
          /\b(eco-friendly|planet-friendly|earth-degradable|military-grade|effortless|typical|naturally|best-in-class|seamless)\b/i.test(
            segment
          );

        const hasUnverifiedQuant =
          /\b(\d+%|\d+x|\$\d+|\d+\s*(hours|days|weeks|months|million))\b/i.test(segment) &&
          !hasEvidenceCitation;

        if (hasProhibited) {
          findings.push({
            id: `find-${Date.now()}-${idx}-c`,
            state: 'Contradicted',
            excerpt: `"${segment}"`,
            ruleCode: rule.code,
            ruleClause: rule.title,
            explanation: `Contains prohibited unqualified or absolute representation in violation of ${rule.code} (${rule.title}).`,
            evidenceReference: `Contradicts ${rule.evidenceRequired}`,
            confidence: 96,
          });
        } else if (hasAmbiguous && settings.flagAmbiguousQuantifiers) {
          findings.push({
            id: `find-${Date.now()}-${idx}-a`,
            state: 'Ambiguous',
            excerpt: `"${segment}"`,
            ruleCode: rule.code,
            ruleClause: rule.title,
            explanation: `Uses subjective or unquantified modifier phrasing without defined operational boundaries under ${rule.code}.`,
            evidenceReference: `Requires lexical qualification per ${rule.evidenceRequired}`,
            confidence: 86,
          });
        } else if (hasUnverifiedQuant) {
          findings.push({
            id: `find-${Date.now()}-${idx}-u`,
            state: 'Unverified',
            excerpt: `"${segment}"`,
            ruleCode: rule.code,
            ruleClause: rule.title,
            explanation: `Quantitative or performance assertion lacks an attached audit identifier or primary source citation required by ${rule.code}.`,
            evidenceReference: `Missing Evidence: ${rule.evidenceRequired}`,
            confidence: 91,
          });
        } else if (hasEvidenceCitation) {
          findings.push({
            id: `find-${Date.now()}-${idx}-s`,
            state: 'Supported',
            excerpt: `"${segment}"`,
            ruleCode: rule.code,
            ruleClause: rule.title,
            explanation: `Assertion includes explicit qualification and references verifiable documentation aligned with ${rule.code}.`,
            evidenceReference: rule.evidenceRequired,
            confidence: 95,
          });
        } else {
          // Ensure all 4 states are represented if segment count permits or classify as Unverified/Ambiguous
          const fallbackStates: Array<'Unverified' | 'Ambiguous' | 'Supported'> = [
            'Unverified',
            'Ambiguous',
            'Supported',
          ];
          const chosenState = fallbackStates[idx % fallbackStates.length];
          findings.push({
            id: `find-${Date.now()}-${idx}-f`,
            state: chosenState,
            excerpt: `"${segment}"`,
            ruleCode: rule.code,
            ruleClause: rule.title,
            explanation:
              chosenState === 'Supported'
                ? `Statement aligns with baseline editorial framing permitted under ${rule.code}.`
                : chosenState === 'Ambiguous'
                ? `Wording may be interpreted broadly by external regulators; clarify scope under ${rule.code}.`
                : `Statement makes a substantive product or brand claim without citing ${rule.evidenceRequired}.`,
            evidenceReference: rule.evidenceRequired,
            confidence: 84,
          });
        }
      });
    }

    let createdAudit: AuditRecord | undefined;
    if (settings.autoCreateAuditLog) {
      const hasContradicted = findings.some((f) => f.state === 'Contradicted');
      const hasUnverifiedOrAmbiguous = findings.some(
        (f) => f.state === 'Unverified' || f.state === 'Ambiguous'
      );

      const initialStatus: ReviewStatus = hasContradicted
        ? 'Flagged'
        : hasUnverifiedOrAmbiguous
        ? 'Pending Review'
        : 'Approved';

      const nextNum = 850 + auditRecords.length;
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

      createdAudit = {
        id: `REV-2026-0${nextNum}`,
        contentTitle: contentTitle.trim() || 'Untitled Marketing Asset',
        contentRevision: contentRevision.trim() || 'rev-1.0',
        contentSnapshot: contentBody,
        policyId: policy.id,
        policyName: policy.name,
        policyVersion: policy.version,
        reviewStatus: initialStatus,
        reviewer: `${settings.reviewerName} (Pending Sign-Off)`,
        timestamp: nowStr,
        findings,
      };

      setAuditRecords((prev) => [createdAudit!, ...prev]);
      addToast(
        'Verification Logged to Audit Trail',
        `Review ${createdAudit.id} recorded (${findings.length} clause findings).`
      );
    }

    return { findings, auditRecord: createdAudit };
  };

  const updateAuditDecision = (auditId: string, status: ReviewStatus, note: string) => {
    setAuditRecords((prev) =>
      prev.map((rec) =>
        rec.id === auditId
          ? {
              ...rec,
              reviewStatus: status,
              reviewer: settings.reviewerName,
              humanDecisionNote: note,
            }
          : rec
      )
    );
    addToast('Human Review Recorded', `Audit record ${auditId} marked as ${status}.`);
  };

  const addRedTeamScenario = (scenario: Omit<RedTeamScenario, 'id'>) => {
    const newScenario: RedTeamScenario = {
      ...scenario,
      id: `rt-${Date.now().toString(36)}`,
    };
    setRedTeamScenarios((prev) => [newScenario, ...prev]);
    addToast('Red-Team Scenario Added', `Edge-case "${newScenario.scenarioTitle}" generated.`);
  };

  const promoteGapToPolicyRule = (scenarioId: string) => {
    const scenario = redTeamScenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;
    const policy = policies.find((p) => p.id === scenario.policyId);
    if (!policy) return;

    const newRuleCode = `${scenario.targetRuleCode.split(' ')[0]}-RT${policy.rules.length + 1}`;
    addRuleToPolicy(policy.id, {
      code: newRuleCode,
      title: `Red-Team Remediation: ${scenario.scenarioTitle}`,
      description: scenario.remediationSuggestion,
      severity: scenario.gapSeverity,
      evidenceRequired: 'Updated Compliance Verification Checklist',
      keywords: ['remediation', 'edge-case', 'disclosure'],
    });

    setRedTeamScenarios((prev) =>
      prev.map((s) => (s.id === scenarioId ? { ...s, promotedToRule: true } : s))
    );

    addToast(
      'Policy Gap Converted to Rule',
      `Added clause ${newRuleCode} to "${policy.name}".`
    );
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    addToast('Settings Saved', 'Workspace governance preferences updated.');
  };

  const resetDemoData = () => {
    localStorage.removeItem(STORAGE_KEYS.POLICIES);
    localStorage.removeItem(STORAGE_KEYS.CANDIDATES);
    localStorage.removeItem(STORAGE_KEYS.AUDITS);
    localStorage.removeItem(STORAGE_KEYS.RED_TEAM);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);

    setPolicies(INITIAL_POLICIES);
    setCandidateRules(INITIAL_CANDIDATE_RULES);
    setAuditRecords(INITIAL_AUDIT_RECORDS);
    setRedTeamScenarios(INITIAL_RED_TEAM_SCENARIOS);
    setSettings(INITIAL_SETTINGS);
    setSelectedPolicyIdForDetail(null);
    setSelectedAuditIdForDetail(null);

    addToast(
      'Demo Dataset Restored',
      'All policies, extracted rules, and audit records reset to baseline.',
      'info'
    );
  };

  return (
    <VerifactaContext.Provider
      value={{
        activeTab,
        setActiveTab,
        globalSearch,
        setGlobalSearch,
        policies,
        candidateRules,
        auditRecords,
        redTeamScenarios,
        settings,
        selectedPolicyIdForDetail,
        setSelectedPolicyIdForDetail,
        selectedAuditIdForDetail,
        setSelectedAuditIdForDetail,
        preselectedVerifyPolicyId,
        setPreselectedVerifyPolicyId,
        openCreatePolicyModalOnMount,
        setOpenCreatePolicyModalOnMount,
        toasts,
        addToast,
        dismissToast,
        createPolicy,
        updatePolicy,
        toggleArchivePolicy,
        addRuleToPolicy,
        setCandidateRulesList,
        updateCandidateRule,
        approveAndPromoteCandidateRule,
        rejectCandidateRule,
        runDeterministicVerification,
        updateAuditDecision,
        addRedTeamScenario,
        promoteGapToPolicyRule,
        updateSettings,
        resetDemoData,
      }}
    >
      {children}
    </VerifactaContext.Provider>
  );
};

export const useVerifacta = (): VerifactaContextType => {
  const context = useContext(VerifactaContext);
  if (!context) {
    throw new Error('useVerifacta must be used within a VerifactaProvider');
  }
  return context;
};
