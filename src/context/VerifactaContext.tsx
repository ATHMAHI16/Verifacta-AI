import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  NavTab,
  Policy,
  PolicyRule,
  PolicyStatus,
  PolicyVersionSnapshot,
  CompiledCandidateRule,
  CompilationSession,
  AuditRecord,
  RedTeamScenario,
  VerificationFinding,
  ReviewStatus,
  AppSettings,
} from '../types';
import {
  INITIAL_POLICIES,
  INITIAL_CANDIDATE_RULES,
  INITIAL_COMPILATION_SESSIONS,
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

interface ActionResult {
  ok: boolean;
  message: string;
  publishedVersion?: string;
}

interface VerifactaContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  policies: Policy[];
  compilationSessions: CompilationSession[];
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
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
  addRuleToPolicy: (policyId: string, rule: Omit<PolicyRule, 'id'>, asDraft?: boolean) => void;
  publishPolicyDraftRules: (policyId: string, releaseNotes?: string) => ActionResult;

  // Compilation Session & Candidate Governance Actions
  createCompilationSession: (
    title: string,
    sourceText: string,
    targetPolicyId: string,
    extractedCandidates: Omit<CompiledCandidateRule, 'id' | 'status' | 'sessionId'>[]
  ) => CompilationSession;
  setSessionTargetPolicy: (sessionId: string, targetPolicyId: string) => void;
  updateCandidateRule: (id: string, updates: Partial<CompiledCandidateRule>) => void;
  resolveCandidateAmbiguity: (
    candidateId: string,
    clarifiedRuleText: string,
    resolutionNote: string,
    suggestedCode?: string,
    evidenceRequired?: string
  ) => ActionResult;
  markCandidateNeedsClarification: (candidateId: string, note?: string) => void;
  approveCandidateInSession: (candidateId: string, targetPolicyId?: string) => ActionResult;
  rejectCandidateRule: (candidateId: string) => ActionResult;
  saveCompilationAsDraft: (sessionId: string) => ActionResult;
  publishCompilationSession: (sessionId: string, releaseNotes?: string) => ActionResult;

  // Legacy / Direct helper kept for compatibility
  setCandidateRulesList: (rules: CompiledCandidateRule[]) => void;
  approveAndPromoteCandidateRule: (candidateId: string, targetPolicyId: string) => void;

  // Content Verification & Audit Actions
  runDeterministicVerification: (
    contentTitle: string,
    contentRevision: string,
    contentBody: string,
    policyId: string
  ) => { findings: VerificationFinding[]; auditRecord?: AuditRecord; error?: string };
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
  SESSIONS: 'verifacta_v1_sessions',
  CANDIDATES: 'verifacta_v1_candidates',
  AUDITS: 'verifacta_v1_audits',
  RED_TEAM: 'verifacta_v1_redteam',
  SETTINGS: 'verifacta_v1_settings',
};

const VerifactaContext = createContext<VerifactaContextType | undefined>(undefined);

function getNextUniqueVersion(currentVersion: string, existingVersions: string[]): string {
  const match = currentVersion.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  let major = match ? parseInt(match[1], 10) : 1;
  let minor = match ? parseInt(match[2], 10) + 1 : 1;
  let candidate = `v${major}.${minor}.0`;

  const versionSet = new Set(existingVersions);
  while (versionSet.has(candidate)) {
    minor += 1;
    candidate = `v${major}.${minor}.0`;
  }
  return candidate;
}

function nowUtcTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function migratePolicies(rawPolicies: Policy[]): Policy[] {
  return rawPolicies.map((pol) => {
    const initialMatch = INITIAL_POLICIES.find((ip) => ip.id === pol.id);
    const hasHistory = Array.isArray(pol.versionHistory) && pol.versionHistory.length > 0;

    let versionHistory: PolicyVersionSnapshot[] = hasHistory
      ? pol.versionHistory!
      : initialMatch?.versionHistory
      ? [...initialMatch.versionHistory]
      : pol.status === 'Active' || pol.status === 'Archived'
      ? [
          {
            version: pol.version || 'v1.0.0',
            publishedAt: `${pol.lastUpdated || '2026-10-28'} 12:00 UTC`,
            publishedBy: pol.owner?.split('·')[0]?.trim() || 'Compliance Admin',
            changeSummary: 'Initial migrated policy version snapshot.',
            rules: Array.isArray(pol.rules) ? [...pol.rules] : [],
          },
        ]
      : [];

    // Ensure current active version exists in versionHistory if policy is Active
    if (
      pol.status === 'Active' &&
      !versionHistory.some((vh) => vh.version === pol.version)
    ) {
      versionHistory = [
        {
          version: pol.version,
          publishedAt: `${pol.lastUpdated || '2026-11-03'} 12:00 UTC`,
          publishedBy: pol.owner?.split('·')[0]?.trim() || 'Compliance Admin',
          changeSummary: `Migrated active rule set for ${pol.version}.`,
          rules: Array.isArray(pol.rules) ? [...pol.rules] : [],
        },
        ...versionHistory,
      ];
    }

    const draftRules = Array.isArray(pol.draftRules)
      ? pol.draftRules
      : pol.status === 'Draft' && (!hasHistory || versionHistory.length === 0)
      ? Array.isArray(pol.rules)
        ? [...pol.rules]
        : []
      : [];

    return {
      ...pol,
      rules:
        pol.status === 'Draft' && versionHistory.length === 0
          ? []
          : Array.isArray(pol.rules)
          ? pol.rules
          : [],
      draftRules,
      versionHistory,
    };
  });
}

function migrateSessions(
  savedSessionsRaw: string | null,
  savedCandidatesRaw: string | null
): CompilationSession[] {
  if (savedSessionsRaw) {
    try {
      const parsed: CompilationSession[] = JSON.parse(savedSessionsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((session) => ({
          ...session,
          candidates: (session.candidates || []).map((c) => ({
            ...c,
            sessionId: session.id,
            status:
              c.isAmbiguous && !c.ambiguityResolved && c.status === 'Pending'
                ? 'Needs Clarification'
                : c.status,
          })),
        }));
      }
    } catch {
      // Fallback below
    }
  }

  // If user had Phase 1 candidates in localStorage but no sessions yet, migrate them cleanly
  if (savedCandidatesRaw) {
    try {
      const legacyCandidates: CompiledCandidateRule[] = JSON.parse(savedCandidatesRaw);
      if (Array.isArray(legacyCandidates) && legacyCandidates.length > 0) {
        const migratedSessionId = 'CS-2026-0101';
        const migratedCandidates: CompiledCandidateRule[] = legacyCandidates.map((c) => ({
          ...c,
          sessionId: migratedSessionId,
          status:
            c.isAmbiguous && !c.ambiguityResolved && c.status === 'Pending'
              ? 'Needs Clarification'
              : c.status,
        }));
        return [
          {
            id: migratedSessionId,
            title: '2026 Global Packaging & Net-Zero Communications Directive',
            sourceText: INITIAL_COMPILATION_SESSIONS[0].sourceText,
            targetPolicyId: 'pol-env-001',
            createdAt: '2026-11-03 15:10 UTC',
            updatedAt: nowUtcTimestamp(),
            status: 'In Review',
            candidates: migratedCandidates,
          },
          ...INITIAL_COMPILATION_SESSIONS.slice(1),
        ];
      }
    } catch {
      // Fallback to initial
    }
  }

  return INITIAL_COMPILATION_SESSIONS;
}

function migrateAudits(rawAudits: AuditRecord[], migratedPolicies: Policy[]): AuditRecord[] {
  return rawAudits.map((aud) => {
    if (Array.isArray(aud.policyRulesSnapshot) && aud.policyRulesSnapshot.length > 0) {
      return aud;
    }
    const matchingPolicy = migratedPolicies.find((p) => p.id === aud.policyId);
    const matchingVersionSnapshot = matchingPolicy?.versionHistory?.find(
      (vh) => vh.version === aud.policyVersion
    );
    return {
      ...aud,
      policyRulesSnapshot: matchingVersionSnapshot
        ? [...matchingVersionSnapshot.rules]
        : matchingPolicy
        ? [...matchingPolicy.rules]
        : [],
    };
  });
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
      const parsed = saved ? JSON.parse(saved) : INITIAL_POLICIES;
      return migratePolicies(parsed);
    } catch {
      return INITIAL_POLICIES;
    }
  });

  const [compilationSessions, setCompilationSessions] = useState<CompilationSession[]>(() => {
    try {
      const savedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      const savedCandidates = localStorage.getItem(STORAGE_KEYS.CANDIDATES);
      return migrateSessions(savedSessions, savedCandidates);
    } catch {
      return INITIAL_COMPILATION_SESSIONS;
    }
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return compilationSessions[0]?.id || 'CS-2026-0101';
  });

  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDITS);
      const parsed = saved ? JSON.parse(saved) : INITIAL_AUDIT_RECORDS;
      return migrateAudits(parsed, policies);
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

  // Active session's candidates exposed as candidateRules for backwards compatibility
  const activeSession =
    compilationSessions.find((s) => s.id === activeSessionId) || compilationSessions[0];
  const candidateRules = activeSession ? activeSession.candidates : INITIAL_CANDIDATE_RULES;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(policies));
    } catch {
      // Ignore storage quota errors
    }
  }, [policies]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(compilationSessions));
      if (activeSession) {
        localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(activeSession.candidates));
      }
    } catch {
      // Ignore
    }
  }, [compilationSessions, activeSession]);

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
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const createPolicy = (policyData: Omit<Policy, 'id' | 'lastUpdated'>): Policy => {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = nowUtcTimestamp();
    const isInitialActive = policyData.status === 'Active';

    const initialRules = policyData.rules || [];
    const newPolicy: Policy = {
      ...policyData,
      id: `pol-${Date.now().toString(36)}`,
      lastUpdated: today,
      rules: isInitialActive ? initialRules : [],
      draftRules: isInitialActive ? [] : initialRules,
      versionHistory: isInitialActive
        ? [
            {
              version: policyData.version || 'v1.0.0',
              publishedAt: timestamp,
              publishedBy: settings.reviewerName,
              changeSummary: 'Initial published policy version.',
              rules: initialRules.map((r) => ({ ...r })),
            },
          ]
        : [],
    };
    setPolicies((prev) => [newPolicy, ...prev]);
    addToast(
      'Policy Created',
      `${newPolicy.name} (${newPolicy.version} · ${newPolicy.status}) added to Policy Library.`
    );
    return newPolicy;
  };

  const updatePolicy = (id: string, updated: Partial<Policy>) => {
    const today = new Date().toISOString().split('T')[0];
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated, lastUpdated: today } : p))
    );
    addToast('Policy Metadata Updated', 'Changes saved to Policy Library.');
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

  // Adds a rule to draftRules by default so active version is never overwritten without explicit publication
  const addRuleToPolicy = (
    policyId: string,
    rule: Omit<PolicyRule, 'id'>,
    asDraft: boolean = true
  ) => {
    const today = new Date().toISOString().split('T')[0];
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.id !== policyId) return p;
        const newRule: PolicyRule = {
          ...rule,
          id: `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          approvedBy: settings.reviewerName,
          approvedAt: nowUtcTimestamp(),
        };

        if (asDraft) {
          const currentDrafts = p.draftRules || [];
          // Prevent duplicate rule code in draftRules
          if (currentDrafts.some((dr) => dr.code === newRule.code && dr.title === newRule.title)) {
            return p;
          }
          return {
            ...p,
            lastUpdated: today,
            draftRules: [...currentDrafts, newRule],
          };
        }

        // If explicitly publishing directly
        const existingVersions = (p.versionHistory || []).map((vh) => vh.version);
        const nextVer = getNextUniqueVersion(p.version, existingVersions);
        const mergedRules = [...p.rules, newRule];
        const snapshot: PolicyVersionSnapshot = {
          version: nextVer,
          publishedAt: nowUtcTimestamp(),
          publishedBy: settings.reviewerName,
          changeSummary: `Added clause ${newRule.code}: ${newRule.title}`,
          rules: mergedRules.map((r) => ({ ...r })),
        };

        return {
          ...p,
          status: 'Active',
          version: nextVer,
          lastUpdated: today,
          rules: mergedRules,
          versionHistory: [snapshot, ...(p.versionHistory || [])],
        };
      })
    );
  };

  const publishPolicyDraftRules = (policyId: string, releaseNotes?: string): ActionResult => {
    const policy = policies.find((p) => p.id === policyId);
    if (!policy) {
      return { ok: false, message: 'Target policy not found.' };
    }
    const drafts = policy.draftRules || [];
    if (drafts.length === 0) {
      return { ok: false, message: 'No staged draft rules to publish for this policy.' };
    }

    const existingVersions = [
      policy.version,
      ...(policy.versionHistory || []).map((vh) => vh.version),
    ];
    const nextVersion =
      policy.status === 'Draft' && (policy.versionHistory || []).length === 0
        ? policy.version
        : getNextUniqueVersion(policy.version, existingVersions);

    const mergedRules: PolicyRule[] = [...policy.rules];
    drafts.forEach((dr) => {
      const isDuplicate = mergedRules.some(
        (er) => er.code === dr.code && er.description.trim() === dr.description.trim()
      );
      if (!isDuplicate) {
        mergedRules.push({ ...dr });
      }
    });

    const timestamp = nowUtcTimestamp();
    const today = new Date().toISOString().split('T')[0];
    const newSnapshot: PolicyVersionSnapshot = {
      version: nextVersion,
      publishedAt: timestamp,
      publishedBy: settings.reviewerName,
      changeSummary:
        releaseNotes?.trim() ||
        `Published ${drafts.length} staged draft clause(s) (${drafts
          .map((d) => d.code)
          .join(', ')}).`,
      rules: mergedRules.map((r) => ({ ...r })),
    };

    setPolicies((prev) =>
      prev.map((p) =>
        p.id === policyId
          ? {
              ...p,
              status: 'Active',
              version: nextVersion,
              lastUpdated: today,
              rules: mergedRules,
              draftRules: [],
              versionHistory: [newSnapshot, ...(p.versionHistory || [])],
            }
          : p
      )
    );

    addToast(
      'New Policy Version Published',
      `${policy.name} is now active at ${nextVersion} (${mergedRules.length} total rules).`
    );

    return {
      ok: true,
      message: `Published ${policy.name} ${nextVersion}.`,
      publishedVersion: nextVersion,
    };
  };

  // Compilation Session & Candidate Governance Actions
  const createCompilationSession = (
    title: string,
    sourceText: string,
    targetPolicyId: string,
    extractedCandidates: Omit<CompiledCandidateRule, 'id' | 'status' | 'sessionId'>[]
  ): CompilationSession => {
    const nextNum = 101 + compilationSessions.length;
    const sessionId = `CS-2026-0${nextNum}`;
    const timestamp = nowUtcTimestamp();

    const candidates: CompiledCandidateRule[] = extractedCandidates.map((c, idx) => ({
      ...c,
      id: `cand-${sessionId.toLowerCase()}-${idx + 1}`,
      sessionId,
      status: c.isAmbiguous ? 'Needs Clarification' : 'Pending',
      ambiguityResolved: false,
    }));

    const newSession: CompilationSession = {
      id: sessionId,
      title: title.trim() || `Compilation Session ${sessionId}`,
      sourceText,
      targetPolicyId,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'In Review',
      candidates,
    };

    setCompilationSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(sessionId);
    return newSession;
  };

  const setSessionTargetPolicy = (sessionId: string, targetPolicyId: string) => {
    setCompilationSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, targetPolicyId, updatedAt: nowUtcTimestamp() }
          : s
      )
    );
  };

  const updateCandidateRule = (id: string, updates: Partial<CompiledCandidateRule>) => {
    const timestamp = nowUtcTimestamp();
    setCompilationSessions((prev) =>
      prev.map((session) => {
        if (!session.candidates.some((c) => c.id === id)) return session;
        return {
          ...session,
          updatedAt: timestamp,
          candidates: session.candidates.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        };
      })
    );
  };

  const resolveCandidateAmbiguity = (
    candidateId: string,
    clarifiedRuleText: string,
    resolutionNote: string,
    suggestedCode?: string,
    evidenceRequired?: string
  ): ActionResult => {
    if (!clarifiedRuleText.trim()) {
      return { ok: false, message: 'Clarified rule specification cannot be empty.' };
    }
    if (!resolutionNote.trim()) {
      return {
        ok: false,
        message: 'Please provide an ambiguity resolution note explaining how the clause was clarified.',
      };
    }

    const timestamp = nowUtcTimestamp();
    setCompilationSessions((prev) =>
      prev.map((session) => {
        if (!session.candidates.some((c) => c.id === candidateId)) return session;
        if (session.status === 'Published') return session;

        return {
          ...session,
          updatedAt: timestamp,
          candidates: session.candidates.map((c) => {
            if (c.id !== candidateId) return c;
            return {
              ...c,
              extractedRule: clarifiedRuleText.trim(),
              suggestedCode: suggestedCode?.trim() || c.suggestedCode,
              evidenceRequired: evidenceRequired?.trim() || c.evidenceRequired,
              isAmbiguous: false,
              ambiguityResolved: true,
              resolutionNote: resolutionNote.trim(),
              status: c.status === 'Needs Clarification' ? 'Pending' : c.status,
            };
          }),
        };
      })
    );

    addToast(
      'Ambiguity Resolved',
      'Clause clarified and moved to Pending so it can now be approved.'
    );
    return { ok: true, message: 'Ambiguity resolved.' };
  };

  const markCandidateNeedsClarification = (candidateId: string, note?: string) => {
    const timestamp = nowUtcTimestamp();
    setCompilationSessions((prev) =>
      prev.map((session) => {
        if (!session.candidates.some((c) => c.id === candidateId)) return session;
        if (session.status === 'Published') return session;

        return {
          ...session,
          updatedAt: timestamp,
          candidates: session.candidates.map((c) => {
            if (c.id !== candidateId) return c;
            const flagging = !(c.isAmbiguous || c.status === 'Needs Clarification');
            if (flagging) {
              return {
                ...c,
                isAmbiguous: true,
                ambiguityResolved: false,
                status: 'Needs Clarification',
                approvedBy: undefined,
                approvedAt: undefined,
                ambiguityNote:
                  note?.trim() ||
                  c.ambiguityNote ||
                  'Flagged as requiring lexical clarification before approval.',
              };
            } else {
              return {
                ...c,
                isAmbiguous: false,
                ambiguityResolved: true,
                resolutionNote: 'Manually cleared ambiguity flag after review.',
                status: 'Pending',
              };
            }
          }),
        };
      })
    );
  };

  const approveCandidateInSession = (
    candidateId: string,
    targetPolicyId?: string
  ): ActionResult => {
    const session = compilationSessions.find((s) =>
      s.candidates.some((c) => c.id === candidateId)
    );
    if (!session) {
      return { ok: false, message: 'Compilation session not found.' };
    }
    if (session.status === 'Published') {
      return {
        ok: false,
        message: `Session ${session.id} has already been published (${session.publishedVersion}). Duplicate promotion is blocked.`,
      };
    }

    const candidate = session.candidates.find((c) => c.id === candidateId)!;

    // Validate target policy
    const effectivePolicyId = targetPolicyId || session.targetPolicyId;
    const targetPolicy = policies.find((p) => p.id === effectivePolicyId);
    if (!targetPolicy) {
      addToast('Invalid Target Policy', 'Select a valid target policy before approving.', 'warning');
      return { ok: false, message: 'Target policy does not exist.' };
    }
    if (targetPolicy.status === 'Archived') {
      addToast(
        'Target Policy Archived',
        `Cannot approve rules for archived policy "${targetPolicy.name}". Restore it first.`,
        'warning'
      );
      return {
        ok: false,
        message: `Target policy "${targetPolicy.name}" is Archived and cannot accept rule approvals.`,
      };
    }

    // Prevent ambiguous / Needs Clarification rules from being approved until resolved
    if (
      (candidate.isAmbiguous && !candidate.ambiguityResolved) ||
      candidate.status === 'Needs Clarification'
    ) {
      addToast(
        'Ambiguity Resolution Required',
        `Clause ${candidate.suggestedCode} is flagged as ambiguous. Edit and resolve ambiguity before approving.`,
        'warning'
      );
      return {
        ok: false,
        message: `Cannot approve ${candidate.suggestedCode}: Ambiguous clauses must be clarified and resolved before approval.`,
      };
    }

    // Prevent duplicate promotion if already published
    if (candidate.publishedVersion) {
      addToast(
        'Duplicate Promotion Blocked',
        `Clause ${candidate.suggestedCode} was already published in ${candidate.publishedVersion}.`,
        'warning'
      );
      return {
        ok: false,
        message: `Clause ${candidate.suggestedCode} has already been promoted.`,
      };
    }

    // Check if already approved in current session
    if (candidate.status === 'Approved') {
      addToast(
        'Already Approved in Session',
        `Clause ${candidate.suggestedCode} is already approved by ${candidate.approvedBy}.`,
        'info'
      );
      return { ok: false, message: 'Candidate rule is already approved in this session.' };
    }

    const timestamp = nowUtcTimestamp();
    setCompilationSessions((prev) =>
      prev.map((s) => {
        if (s.id !== session.id) return s;
        return {
          ...s,
          targetPolicyId: effectivePolicyId,
          updatedAt: timestamp,
          candidates: s.candidates.map((c) =>
            c.id === candidateId
              ? {
                  ...c,
                  status: 'Approved',
                  approvedBy: settings.reviewerName,
                  approvedAt: timestamp,
                  rejectedBy: undefined,
                  rejectedAt: undefined,
                }
              : c
          ),
        };
      })
    );

    addToast(
      'Rule Approved in Session',
      `${candidate.suggestedCode} approved by ${settings.reviewerName}. Open "Review Compilation" to publish.`
    );
    return { ok: true, message: `Approved ${candidate.suggestedCode} in session ${session.id}.` };
  };

  const rejectCandidateRule = (candidateId: string): ActionResult => {
    const session = compilationSessions.find((s) =>
      s.candidates.some((c) => c.id === candidateId)
    );
    if (!session) return { ok: false, message: 'Session not found.' };
    if (session.status === 'Published') {
      addToast(
        'Session Locked',
        `Session ${session.id} is already published and cannot be modified.`,
        'warning'
      );
      return { ok: false, message: 'Session is already published.' };
    }

    const timestamp = nowUtcTimestamp();
    setCompilationSessions((prev) =>
      prev.map((s) => {
        if (s.id !== session.id) return s;
        return {
          ...s,
          updatedAt: timestamp,
          candidates: s.candidates.map((c) =>
            c.id === candidateId
              ? {
                  ...c,
                  status: 'Rejected',
                  rejectedBy: settings.reviewerName,
                  rejectedAt: timestamp,
                  approvedBy: undefined,
                  approvedAt: undefined,
                }
              : c
          ),
        };
      })
    );

    addToast(
      'Candidate Rule Rejected',
      'Marked as Rejected in compilation session; excluded from publication.',
      'info'
    );
    return { ok: true, message: 'Candidate rule rejected.' };
  };

  const saveCompilationAsDraft = (sessionId: string): ActionResult => {
    const session = compilationSessions.find((s) => s.id === sessionId);
    if (!session) return { ok: false, message: 'Compilation session not found.' };
    if (session.status === 'Published') {
      addToast(
        'Already Published',
        `Session ${session.id} is already published (${session.publishedVersion}).`,
        'warning'
      );
      return { ok: false, message: 'Cannot save a published session as draft.' };
    }

    const targetPolicy = policies.find((p) => p.id === session.targetPolicyId);
    if (!targetPolicy) {
      return { ok: false, message: 'Target policy not found.' };
    }

    const approvedCandidates = session.candidates.filter((c) => c.status === 'Approved');
    const timestamp = nowUtcTimestamp();
    const today = new Date().toISOString().split('T')[0];

    // Stage approved rules into the target policy's draftRules (without touching active rules!)
    if (approvedCandidates.length > 0) {
      setPolicies((prev) =>
        prev.map((pol) => {
          if (pol.id !== targetPolicy.id) return pol;
          const existingDrafts = pol.draftRules || [];
          const nextDrafts = [...existingDrafts];

          approvedCandidates.forEach((cand) => {
            const alreadyInDraft = nextDrafts.some(
              (dr) =>
                dr.code === cand.suggestedCode &&
                dr.description.trim() === cand.extractedRule.trim()
            );
            const alreadyInActive = pol.rules.some(
              (ar) =>
                ar.code === cand.suggestedCode &&
                ar.description.trim() === cand.extractedRule.trim()
            );

            if (!alreadyInDraft && !alreadyInActive) {
              const extractedWords = cand.extractedRule
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .split(/\s+/)
                .filter((w) => w.length > 4)
                .slice(0, 6);

              nextDrafts.push({
                id: `draft-${session.id.toLowerCase()}-${cand.id}`,
                code: cand.suggestedCode,
                title:
                  cand.extractedRule.length > 68
                    ? `${cand.extractedRule.slice(0, 65)}...`
                    : cand.extractedRule,
                description: cand.extractedRule,
                severity: cand.severity,
                evidenceRequired: cand.evidenceRequired,
                keywords: extractedWords.length > 0 ? extractedWords : ['compliance', 'disclosure'],
                sourceExcerpt: cand.sourceExcerpt,
                approvedBy: cand.approvedBy || settings.reviewerName,
                approvedAt: cand.approvedAt || timestamp,
              });
            }
          });

          return {
            ...pol,
            lastUpdated: today,
            draftRules: nextDrafts,
          };
        })
      );
    }

    setCompilationSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, status: 'Draft Saved', updatedAt: timestamp } : s
      )
    );

    addToast(
      'Compilation Saved as Draft',
      `Session ${session.id} saved (${approvedCandidates.length} approved rule(s) staged in ${targetPolicy.name} draft workspace; active policy unchanged).`
    );

    return {
      ok: true,
      message: `Session ${session.id} saved as draft.`,
    };
  };

  const publishCompilationSession = (
    sessionId: string,
    releaseNotes?: string
  ): ActionResult => {
    const session = compilationSessions.find((s) => s.id === sessionId);
    if (!session) {
      return { ok: false, message: 'Compilation session not found.' };
    }

    // Prevent duplicate publication of the same session
    if (session.status === 'Published') {
      addToast(
        'Duplicate Publication Blocked',
        `Compilation session ${session.id} was already published as ${session.publishedVersion}.`,
        'warning'
      );
      return {
        ok: false,
        message: `Compilation session ${session.id} has already been published (${session.publishedVersion}).`,
      };
    }

    const targetPolicy = policies.find((p) => p.id === session.targetPolicyId);
    if (!targetPolicy) {
      return { ok: false, message: 'Selected target policy does not exist.' };
    }
    if (targetPolicy.status === 'Archived') {
      return {
        ok: false,
        message: `Target policy "${targetPolicy.name}" is Archived. Restore it before publishing.`,
      };
    }

    const pendingRules = session.candidates.filter((c) => c.status === 'Pending');
    const unresolvedRules = session.candidates.filter(
      (c) =>
        c.status === 'Needs Clarification' || (c.isAmbiguous && !c.ambiguityResolved)
    );
    const approvedRules = session.candidates.filter(
      (c) => c.status === 'Approved' && !c.isAmbiguous
    );

    if (unresolvedRules.length > 0) {
      return {
        ok: false,
        message: `Cannot publish: ${unresolvedRules.length} rule(s) still require ambiguity resolution.`,
      };
    }

    if (pendingRules.length > 0) {
      return {
        ok: false,
        message: `Cannot publish: ${pendingRules.length} rule(s) are still Pending review. Approve or reject all candidate rules first, or click "Save as Draft".`,
      };
    }

    if (approvedRules.length === 0) {
      return {
        ok: false,
        message: 'Cannot publish: At least one candidate rule must be Approved.',
      };
    }

    const existingVersions = [
      targetPolicy.version,
      ...(targetPolicy.versionHistory || []).map((vh) => vh.version),
    ];
    const nextVersion =
      targetPolicy.status === 'Draft' && (targetPolicy.versionHistory || []).length === 0
        ? targetPolicy.version
        : getNextUniqueVersion(targetPolicy.version, existingVersions);

    const timestamp = nowUtcTimestamp();
    const today = new Date().toISOString().split('T')[0];

    // Build newly promoted PolicyRules, preventing duplicates against existing active rules
    const baseActiveRules: PolicyRule[] =
      targetPolicy.status === 'Draft' &&
      targetPolicy.rules.length === 0 &&
      (targetPolicy.draftRules || []).length > 0
        ? [...(targetPolicy.draftRules || [])]
        : [...targetPolicy.rules];

    const newlyAddedCodes: string[] = [];

    approvedRules.forEach((cand) => {
      const alreadyExists = baseActiveRules.some(
        (r) =>
          r.code === cand.suggestedCode &&
          r.description.trim() === cand.extractedRule.trim()
      );
      if (!alreadyExists) {
        const extractedWords = cand.extractedRule
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 4)
          .slice(0, 6);

        baseActiveRules.push({
          id: `rule-${session.id.toLowerCase()}-${cand.id}`,
          code: cand.suggestedCode || `RULE-${baseActiveRules.length + 101}`,
          title:
            cand.extractedRule.length > 68
              ? `${cand.extractedRule.slice(0, 65)}...`
              : cand.extractedRule,
          description: cand.extractedRule,
          severity: cand.severity,
          evidenceRequired: cand.evidenceRequired,
          keywords: extractedWords.length > 0 ? extractedWords : ['compliance', 'disclosure'],
          isAmbiguous: false,
          sourceExcerpt: cand.sourceExcerpt,
          approvedBy: cand.approvedBy || settings.reviewerName,
          approvedAt: cand.approvedAt || timestamp,
        });
        newlyAddedCodes.push(cand.suggestedCode);
      }
    });

    const summaryNote =
      releaseNotes?.trim() ||
      `Published compilation session ${session.id}: added ${
        newlyAddedCodes.length > 0 ? newlyAddedCodes.join(', ') : `${approvedRules.length} rule(s)`
      }.`;

    const newVersionSnapshot: PolicyVersionSnapshot = {
      version: nextVersion,
      publishedAt: timestamp,
      publishedBy: settings.reviewerName,
      changeSummary: summaryNote,
      sourceSessionId: session.id,
      rules: baseActiveRules.map((r) => ({ ...r })),
    };

    // Update Policy with new version, active rules, cleared staged drafts from this session, and preserved versionHistory
    setPolicies((prev) =>
      prev.map((pol) => {
        if (pol.id !== targetPolicy.id) return pol;
        const remainingDrafts = (pol.draftRules || []).filter(
          (dr) => !approvedRules.some((ar) => ar.suggestedCode === dr.code)
        );
        return {
          ...pol,
          status: 'Active',
          version: nextVersion,
          lastUpdated: today,
          rules: baseActiveRules,
          draftRules: remainingDrafts,
          versionHistory: [newVersionSnapshot, ...(pol.versionHistory || [])],
        };
      })
    );

    // Lock Compilation Session as Published
    setCompilationSessions((prev) =>
      prev.map((s) =>
        s.id === session.id
          ? {
              ...s,
              status: 'Published',
              updatedAt: timestamp,
              publishedVersion: nextVersion,
              publishedAt: timestamp,
              publishedBy: settings.reviewerName,
              releaseNotes: summaryNote,
              candidates: s.candidates.map((c) =>
                c.status === 'Approved'
                  ? {
                      ...c,
                      promotedToPolicyId: targetPolicy.id,
                      publishedVersion: nextVersion,
                    }
                  : c
              ),
            }
          : s
      )
    );

    addToast(
      'Policy Version Published',
      `${targetPolicy.name} published as ${nextVersion} from session ${session.id}.`
    );

    return {
      ok: true,
      message: `Successfully published ${targetPolicy.name} (${nextVersion}).`,
      publishedVersion: nextVersion,
    };
  };

  const setCandidateRulesList = (rules: CompiledCandidateRule[]) => {
    setCompilationSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, candidates: rules, updatedAt: nowUtcTimestamp() }
          : s
      )
    );
  };

  const approveAndPromoteCandidateRule = (candidateId: string, targetPolicyId: string) => {
    approveCandidateInSession(candidateId, targetPolicyId);
  };

  const runDeterministicVerification = (
    contentTitle: string,
    contentRevision: string,
    contentBody: string,
    policyId: string
  ): { findings: VerificationFinding[]; auditRecord?: AuditRecord; error?: string } => {
    // Verification Integration: Must use ONLY currently active published version
    const requestedPolicy = policies.find((p) => p.id === policyId);
    const activePolicies = policies.filter((p) => p.status === 'Active');
    const policy =
      requestedPolicy && requestedPolicy.status === 'Active'
        ? requestedPolicy
        : activePolicies[0];

    if (!policy || policy.status !== 'Active') {
      addToast(
        'Active Published Policy Required',
        'Content Verification only evaluates against Active published policy versions.',
        'warning'
      );
      return {
        findings: [],
        error: 'Selected policy is not an Active published version.',
      };
    }

    // Active published rules snapshot
    const activeRulesSnapshot: PolicyRule[] = policy.rules.map((r) => ({ ...r }));

    const matchingSample = SAMPLE_CONTENT_DRAFTS.find(
      (d) => d.content.trim() === contentBody.trim() && d.policyId === policy.id
    );

    let findings: VerificationFinding[] = [];

    if (matchingSample) {
      findings = matchingSample.presetFindings.map((f, index) => ({
        ...f,
        id: `find-${Date.now()}-${index}`,
      }));

      // If the active policy has had new rules published beyond the initial baseline (e.g., ENV-105+, SEC-204+, FIN-303+),
      // evaluate those newly published rules deterministically as well so publishing a new version is immediately reflected!
      const baselineCodes = new Set(matchingSample.presetFindings.map((pf) => pf.ruleCode));
      const newlyPublishedRules = activeRulesSnapshot.filter((r) => !baselineCodes.has(r.code));

      newlyPublishedRules.forEach((newRule, nIdx) => {
        const lowerBody = contentBody.toLowerCase();
        const matchesKeyword = newRule.keywords.some((kw) =>
          lowerBody.includes(kw.toLowerCase())
        );
        const hasCertRef =
          lowerBody.includes('grs') ||
          lowerBody.includes('dpa') ||
          lowerBody.includes('benchmark') ||
          lowerBody.includes('iso');

        findings.push({
          id: `find-${Date.now()}-new-${nIdx}`,
          state: matchesKeyword && hasCertRef ? 'Supported' : 'Unverified',
          excerpt: `"${contentBody.split(/\n+/)[0].slice(0, 120)}..."`,
          ruleCode: newRule.code,
          ruleClause: newRule.title,
          explanation:
            matchesKeyword && hasCertRef
              ? `Evaluated under newly published clause ${newRule.code} (${policy.version}): substantiation citation detected in draft.`
              : `Evaluated under newly published clause ${newRule.code} (${policy.version}): no explicit citation found for "${newRule.evidenceRequired}".`,
          evidenceReference: newRule.evidenceRequired,
          confidence: 92,
        });
      });
    } else {
      const paragraphs = contentBody
        .split(/\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 12);

      const segments = paragraphs.length > 0 ? paragraphs : [contentBody.trim()];
      const rules =
        activeRulesSnapshot.length > 0 ? activeRulesSnapshot : INITIAL_POLICIES[0].rules;

      segments.forEach((segment, idx) => {
        const lower = segment.toLowerCase();
        const rule = rules[idx % rules.length];

        const hasProhibited =
          (rule.prohibitedTerms || []).some((t) => lower.includes(t.toLowerCase())) ||
          /\b(100%|zero impact|zero downtime|never fails|guaranteed|unhackable|risk-free|completely free of|water-positive)\b/i.test(
            segment
          );

        const hasEvidenceCitation =
          /\b(iso|soc\s*2|grs|fsc|astm|dpa|msa|ref|#\w+|section\s+\d|n\s*=\s*\d+|study|audit|report|aws)\b/i.test(
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
      const nowStr = nowUtcTimestamp();

      // Store exact policyVersion and immutable policyRulesSnapshot
      createdAudit = {
        id: `REV-2026-0${nextNum}`,
        contentTitle: contentTitle.trim() || 'Untitled Marketing Asset',
        contentRevision: contentRevision.trim() || 'rev-1.0',
        contentSnapshot: contentBody,
        policyId: policy.id,
        policyName: policy.name,
        policyVersion: policy.version,
        policyRulesSnapshot: activeRulesSnapshot,
        reviewStatus: initialStatus,
        reviewer: `${settings.reviewerName} (Pending Sign-Off)`,
        timestamp: nowStr,
        findings,
      };

      setAuditRecords((prev) => [createdAudit!, ...prev]);
      addToast(
        'Verification Logged to Audit Trail',
        `Review ${createdAudit.id} recorded against ${policy.name} (${policy.version}).`
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
    if (!scenario || scenario.promotedToRule) return;
    const policy = policies.find((p) => p.id === scenario.policyId);
    if (!policy) return;

    const newRuleCode = `${scenario.targetRuleCode.split(' ')[0]}-RT${
      policy.rules.length + (policy.draftRules?.length || 0) + 1
    }`;
    addRuleToPolicy(
      policy.id,
      {
        code: newRuleCode,
        title: `Red-Team Remediation: ${scenario.scenarioTitle}`,
        description: scenario.remediationSuggestion,
        severity: scenario.gapSeverity,
        evidenceRequired: 'Updated Compliance Verification Checklist',
        keywords: ['remediation', 'edge-case', 'disclosure'],
      },
      true
    );

    setRedTeamScenarios((prev) =>
      prev.map((s) => (s.id === scenarioId ? { ...s, promotedToRule: true } : s))
    );

    addToast(
      'Remediation Staged in Policy Drafts',
      `Added clause ${newRuleCode} to "${policy.name}" draft workspace for review & publication.`
    );
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    addToast('Settings Saved', 'Workspace governance preferences updated.');
  };

  const resetDemoData = () => {
    localStorage.removeItem(STORAGE_KEYS.POLICIES);
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.CANDIDATES);
    localStorage.removeItem(STORAGE_KEYS.AUDITS);
    localStorage.removeItem(STORAGE_KEYS.RED_TEAM);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);

    setPolicies(INITIAL_POLICIES);
    setCompilationSessions(INITIAL_COMPILATION_SESSIONS);
    setActiveSessionId(INITIAL_COMPILATION_SESSIONS[0].id);
    setAuditRecords(INITIAL_AUDIT_RECORDS);
    setRedTeamScenarios(INITIAL_RED_TEAM_SCENARIOS);
    setSettings(INITIAL_SETTINGS);
    setSelectedPolicyIdForDetail(null);
    setSelectedAuditIdForDetail(null);

    addToast(
      'Demo Dataset Restored',
      'All policies, compilation sessions, version histories, and audit records reset to baseline.',
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
        compilationSessions,
        activeSessionId,
        setActiveSessionId,
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
        publishPolicyDraftRules,
        createCompilationSession,
        setSessionTargetPolicy,
        updateCandidateRule,
        resolveCandidateAmbiguity,
        markCandidateNeedsClarification,
        approveCandidateInSession,
        rejectCandidateRule,
        saveCompilationAsDraft,
        publishCompilationSession,
        setCandidateRulesList,
        approveAndPromoteCandidateRule,
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
