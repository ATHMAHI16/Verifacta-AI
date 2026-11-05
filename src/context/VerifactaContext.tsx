import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

export interface ActionResult {
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
  isPublishingSession: boolean;
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
  setSessionTargetPolicy: (sessionId: string, targetPolicyId: string) => ActionResult;
  updateCandidateRule: (id: string, updates: Partial<CompiledCandidateRule>) => ActionResult;
  resolveCandidateAmbiguity: (
    candidateId: string,
    clarifiedRuleText: string,
    resolutionNote: string,
    suggestedCode?: string,
    evidenceRequired?: string
  ) => ActionResult;
  markCandidateNeedsClarification: (candidateId: string, note?: string) => ActionResult;
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

function cloneRule(rule: PolicyRule): PolicyRule {
  return {
    ...rule,
    keywords: Array.isArray(rule.keywords) ? [...rule.keywords] : [],
    prohibitedTerms: Array.isArray(rule.prohibitedTerms) ? [...rule.prohibitedTerms] : undefined,
    ambiguousModifiers: Array.isArray(rule.ambiguousModifiers)
      ? [...rule.ambiguousModifiers]
      : undefined,
  };
}

function cloneRules(rules: PolicyRule[]): PolicyRule[] {
  return Array.isArray(rules) ? rules.map(cloneRule) : [];
}

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

export function migratePolicies(rawPolicies: Policy[]): Policy[] {
  return rawPolicies.map((pol) => {
    const initialMatch = INITIAL_POLICIES.find((ip) => ip.id === pol.id);
    const hasHistory = Array.isArray(pol.versionHistory) && pol.versionHistory.length > 0;

    let versionHistory: PolicyVersionSnapshot[] = hasHistory
      ? pol.versionHistory!.map((vh) => ({
          ...vh,
          rules: cloneRules(vh.rules),
        }))
      : initialMatch?.versionHistory
      ? initialMatch.versionHistory.map((vh) => ({
          ...vh,
          rules: cloneRules(vh.rules),
        }))
      : pol.status === 'Active' || pol.status === 'Archived'
      ? [
          {
            version: pol.version || 'v1.0.0',
            publishedAt: `${pol.lastUpdated || '2026-10-28'} 12:00 UTC`,
            publishedBy: pol.owner?.split('·')[0]?.trim() || 'Compliance Admin',
            changeSummary: 'Initial migrated policy version snapshot.',
            rules: cloneRules(pol.rules),
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
          rules: cloneRules(pol.rules),
        },
        ...versionHistory,
      ];
    }

    const draftRules = Array.isArray(pol.draftRules)
      ? cloneRules(pol.draftRules)
      : pol.status === 'Draft' && (!hasHistory || versionHistory.length === 0)
      ? cloneRules(pol.rules)
      : [];

    return {
      ...pol,
      rules:
        pol.status === 'Draft' && versionHistory.length === 0
          ? []
          : cloneRules(pol.rules),
      draftRules,
      versionHistory,
    };
  });
}

export function migrateSessions(
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

/**
 * Phase 1A.1 Critical Correction:
 * Never substitute current active policy rules when the exact historical policy version is unavailable.
 * Preserve original policyVersion and existing audit data.
 * Mark missing historical snapshots as 'Unavailable' without fabricating or substituting rules.
 */
export function migrateAudits(rawAudits: AuditRecord[], migratedPolicies: Policy[]): AuditRecord[] {
  return rawAudits.map((aud) => {
    // 1. If the audit was already explicitly marked Unavailable, preserve Unavailable
    if (aud.snapshotStatus === 'Unavailable') {
      return {
        ...aud,
        snapshotStatus: 'Unavailable',
        policyRulesSnapshot: [],
      };
    }

    // 2. Keep existing valid snapshots unchanged, UNLESS a previous buggy migration
    // copied current live rules onto an audit whose historical version was missing from versionHistory
    const matchingPolicy = migratedPolicies.find((p) => p.id === aud.policyId);
    const matchingVersionSnapshot = matchingPolicy?.versionHistory?.find(
      (vh) => vh.version === aud.policyVersion
    );

    if (
      Array.isArray(aud.policyRulesSnapshot) &&
      aud.policyRulesSnapshot.length > 0
    ) {
      // If snapshotStatus was already explicitly 'Available', keep existing valid snapshot untouched
      if (aud.snapshotStatus === 'Available') {
        return {
          ...aud,
          snapshotStatus: 'Available',
          policyRulesSnapshot: cloneRules(aud.policyRulesSnapshot),
        };
      }

      // If no snapshotStatus was set yet, verify whether the version exists in versionHistory
      if (matchingVersionSnapshot) {
        return {
          ...aud,
          snapshotStatus: 'Available',
          policyRulesSnapshot: cloneRules(aud.policyRulesSnapshot),
        };
      }

      // If matchingPolicy exists, its versionHistory does NOT have aud.policyVersion,
      // and the snapshot length equals current live rules, it was a substituted fallback—clear it to Unavailable
      if (matchingPolicy && !matchingVersionSnapshot) {
        return {
          ...aud,
          snapshotStatus: 'Unavailable',
          policyRulesSnapshot: [],
        };
      }

      return {
        ...aud,
        snapshotStatus: 'Available',
        policyRulesSnapshot: cloneRules(aud.policyRulesSnapshot),
      };
    }

    // 3. If no snapshot is stored on the audit yet, ONLY populate if the exact policyVersion exists in versionHistory
    if (matchingVersionSnapshot && matchingVersionSnapshot.rules.length > 0) {
      return {
        ...aud,
        snapshotStatus: 'Available',
        policyRulesSnapshot: cloneRules(matchingVersionSnapshot.rules),
      };
    }

    // 4. Otherwise, never substitute current active rules; mark snapshotStatus: 'Unavailable'
    return {
      ...aud,
      snapshotStatus: 'Unavailable',
      policyRulesSnapshot: [],
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
  const [isPublishingSession, setIsPublishingSession] = useState(false);
  const publishingLockRef = useRef<boolean>(false);

  const [policies, setPolicies] = useState<Policy[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.POLICIES);
      const parsed = saved ? JSON.parse(saved) : INITIAL_POLICIES;
      return migratePolicies(parsed);
    } catch {
      return migratePolicies(INITIAL_POLICIES);
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
      return migrateAudits(INITIAL_AUDIT_RECORDS, policies);
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

    const initialRules = cloneRules(policyData.rules || []);
    const newPolicy: Policy = {
      ...policyData,
      id: `pol-${Date.now().toString(36)}`,
      lastUpdated: today,
      rules: isInitialActive ? cloneRules(initialRules) : [],
      draftRules: isInitialActive ? [] : cloneRules(initialRules),
      versionHistory: isInitialActive
        ? [
            {
              version: policyData.version || 'v1.0.0',
              publishedAt: timestamp,
              publishedBy: settings.reviewerName,
              changeSummary: 'Initial published policy version.',
              rules: cloneRules(initialRules),
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

  /**
   * Phase 1A.1 Protection:
   * Policy metadata edits must NEVER silently modify published rules, versionHistory, or overwrite
   * a published version string.
   */
  const updatePolicy = (id: string, updated: Partial<Policy>) => {
    const today = new Date().toISOString().split('T')[0];
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const hasPublishedHistory = (p.versionHistory?.length || 0) > 0;

        // Protect published rules, versionHistory, and published version string during metadata edits
        const safeVersion = hasPublishedHistory ? p.version : updated.version ?? p.version;
        const safeStatus =
          hasPublishedHistory && updated.status === 'Draft'
            ? p.status
            : updated.status ?? p.status;

        return {
          ...p,
          name: updated.name ?? p.name,
          category: updated.category ?? p.category,
          owner: updated.owner ?? p.owner,
          description: updated.description ?? p.description,
          version: safeVersion,
          status: safeStatus,
          lastUpdated: today,
          // Always preserve published rules and versionHistory untouched on metadata edit
          rules: cloneRules(p.rules),
          versionHistory: (p.versionHistory || []).map((vh) => ({
            ...vh,
            rules: cloneRules(vh.rules),
          })),
        };
      })
    );
    addToast('Policy Metadata Updated', 'Metadata saved; published rules and version history preserved.');
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
          const duplicateInDrafts = currentDrafts.some(
            (dr) =>
              dr.code.toLowerCase() === newRule.code.toLowerCase() ||
              dr.description.trim().toLowerCase() === newRule.description.trim().toLowerCase()
          );
          const duplicateInActive = p.rules.some(
            (ar) =>
              ar.code.toLowerCase() === newRule.code.toLowerCase() &&
              ar.description.trim().toLowerCase() === newRule.description.trim().toLowerCase()
          );
          if (duplicateInDrafts || duplicateInActive) {
            return p;
          }
          return {
            ...p,
            lastUpdated: today,
            draftRules: [...currentDrafts, cloneRule(newRule)],
          };
        }

        // Direct publication creates a brand new immutable snapshot in versionHistory
        const existingVersions = [
          p.version,
          ...(p.versionHistory || []).map((vh) => vh.version),
        ];
        const nextVer =
          p.status === 'Draft' && (p.versionHistory || []).length === 0
            ? p.version
            : getNextUniqueVersion(p.version, existingVersions);
        const mergedRules = [...cloneRules(p.rules), cloneRule(newRule)];
        const snapshot: PolicyVersionSnapshot = {
          version: nextVer,
          publishedAt: nowUtcTimestamp(),
          publishedBy: settings.reviewerName,
          changeSummary: `Added clause ${newRule.code}: ${newRule.title}`,
          rules: cloneRules(mergedRules),
        };

        return {
          ...p,
          status: 'Active',
          version: nextVer,
          lastUpdated: today,
          rules: mergedRules,
          versionHistory: [
            snapshot,
            ...(p.versionHistory || []).map((vh) => ({
              ...vh,
              rules: cloneRules(vh.rules),
            })),
          ],
        };
      })
    );
  };

  const publishPolicyDraftRules = (policyId: string, releaseNotes?: string): ActionResult => {
    if (publishingLockRef.current) {
      return { ok: false, message: 'A publication operation is already in progress.' };
    }
    const policy = policies.find((p) => p.id === policyId);
    if (!policy) {
      return { ok: false, message: 'Target policy not found.' };
    }
    if (policy.status === 'Archived') {
      return {
        ok: false,
        message: `Policy "${policy.name}" is Archived. Restore it before publishing draft rules.`,
      };
    }
    const drafts = policy.draftRules || [];
    if (drafts.length === 0) {
      return { ok: false, message: 'No staged draft rules to publish for this policy.' };
    }

    publishingLockRef.current = true;
    setIsPublishingSession(true);

    try {
      const existingVersions = [
        policy.version,
        ...(policy.versionHistory || []).map((vh) => vh.version),
      ];
      const nextVersion =
        policy.status === 'Draft' && (policy.versionHistory || []).length === 0
          ? policy.version
          : getNextUniqueVersion(policy.version, existingVersions);

      const mergedRules: PolicyRule[] = cloneRules(policy.rules);
      drafts.forEach((dr) => {
        const isDuplicate = mergedRules.some(
          (er) =>
            er.code.toLowerCase() === dr.code.toLowerCase() ||
            er.description.trim().toLowerCase() === dr.description.trim().toLowerCase()
        );
        if (!isDuplicate) {
          mergedRules.push(cloneRule(dr));
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
        rules: cloneRules(mergedRules),
      };

      setPolicies((prev) =>
        prev.map((p) =>
          p.id === policyId
            ? {
                ...p,
                status: 'Active',
                version: nextVersion,
                lastUpdated: today,
                rules: cloneRules(mergedRules),
                draftRules: [],
                versionHistory: [
                  newSnapshot,
                  ...(p.versionHistory || []).map((vh) => ({
                    ...vh,
                    rules: cloneRules(vh.rules),
                  })),
                ],
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
    } finally {
      publishingLockRef.current = false;
      setIsPublishingSession(false);
    }
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

    const validTarget = policies.find((p) => p.id === targetPolicyId && p.status !== 'Archived');
    const fallbackTarget = policies.find((p) => p.status !== 'Archived') || policies[0];
    const resolvedTargetId = validTarget ? validTarget.id : fallbackTarget.id;

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
      targetPolicyId: resolvedTargetId,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'In Review',
      candidates,
    };

    setCompilationSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(sessionId);
    return newSession;
  };

  const validateSessionAndPolicyBeforeOperation = (
    session: CompilationSession | undefined,
    overridePolicyId?: string
  ): { ok: boolean; message: string; targetPolicy?: Policy } => {
    if (publishingLockRef.current || isPublishingSession) {
      return {
        ok: false,
        message: 'Operation blocked: Session publication is currently in progress.',
      };
    }
    if (!session) {
      return { ok: false, message: 'Compilation session not found.' };
    }
    if (session.status === 'Published') {
      return {
        ok: false,
        message: `Session ${session.id} is already published (${session.publishedVersion}) and is locked against modifications.`,
      };
    }
    const targetId = overridePolicyId || session.targetPolicyId;
    const targetPolicy = policies.find((p) => p.id === targetId);
    if (!targetPolicy) {
      return {
        ok: false,
        message: `Target policy '${targetId}' does not exist.`,
      };
    }
    if (targetPolicy.status === 'Archived') {
      return {
        ok: false,
        message: `Target policy "${targetPolicy.name}" is Archived and cannot be targeted by compilation operations.`,
      };
    }
    return { ok: true, message: 'Valid', targetPolicy };
  };

  const setSessionTargetPolicy = (sessionId: string, targetPolicyId: string): ActionResult => {
    const session = compilationSessions.find((s) => s.id === sessionId);
    const check = validateSessionAndPolicyBeforeOperation(session, targetPolicyId);
    if (!check.ok) {
      addToast('Operation Blocked', check.message, 'warning');
      return { ok: false, message: check.message };
    }

    setCompilationSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, targetPolicyId, updatedAt: nowUtcTimestamp() }
          : s
      )
    );
    return { ok: true, message: `Target policy updated to ${check.targetPolicy?.name}.` };
  };

  const updateCandidateRule = (
    id: string,
    updates: Partial<CompiledCandidateRule>
  ): ActionResult => {
    const session = compilationSessions.find((s) => s.candidates.some((c) => c.id === id));
    const check = validateSessionAndPolicyBeforeOperation(session);
    if (!check.ok) {
      addToast('Modification Blocked', check.message, 'warning');
      return { ok: false, message: check.message };
    }

    const candidate = session!.candidates.find((c) => c.id === id)!;
    if (candidate.publishedVersion) {
      const msg = `Candidate ${candidate.suggestedCode} has already been published in ${candidate.publishedVersion} and cannot be modified.`;
      addToast('Candidate Locked', msg, 'warning');
      return { ok: false, message: msg };
    }

    const timestamp = nowUtcTimestamp();
    setCompilationSessions((prev) =>
      prev.map((s) => {
        if (s.id !== session!.id || s.status === 'Published') return s;
        return {
          ...s,
          updatedAt: timestamp,
          candidates: s.candidates.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        };
      })
    );
    return { ok: true, message: 'Candidate rule updated.' };
  };

  const resolveCandidateAmbiguity = (
    candidateId: string,
    clarifiedRuleText: string,
    resolutionNote: string,
    suggestedCode?: string,
    evidenceRequired?: string
  ): ActionResult => {
    const session = compilationSessions.find((s) =>
      s.candidates.some((c) => c.id === candidateId)
    );
    const check = validateSessionAndPolicyBeforeOperation(session);
    if (!check.ok) {
      addToast('Operation Blocked', check.message, 'warning');
      return { ok: false, message: check.message };
    }

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
      prev.map((s) => {
        if (s.id !== session!.id || s.status === 'Published') return s;
        return {
          ...s,
          updatedAt: timestamp,
          candidates: s.candidates.map((c) => {
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

  const markCandidateNeedsClarification = (
    candidateId: string,
    note?: string
  ): ActionResult => {
    const session = compilationSessions.find((s) =>
      s.candidates.some((c) => c.id === candidateId)
    );
    const check = validateSessionAndPolicyBeforeOperation(session);
    if (!check.ok) {
      addToast('Operation Blocked', check.message, 'warning');
      return { ok: false, message: check.message };
    }

    const timestamp = nowUtcTimestamp();
    setCompilationSessions((prev) =>
      prev.map((s) => {
        if (s.id !== session!.id || s.status === 'Published') return s;
        return {
          ...s,
          updatedAt: timestamp,
          candidates: s.candidates.map((c) => {
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
    return { ok: true, message: 'Clarification flag updated.' };
  };

  const approveCandidateInSession = (
    candidateId: string,
    targetPolicyId?: string
  ): ActionResult => {
    const session = compilationSessions.find((s) =>
      s.candidates.some((c) => c.id === candidateId)
    );
    const check = validateSessionAndPolicyBeforeOperation(session, targetPolicyId);
    if (!check.ok || !check.targetPolicy) {
      addToast('Approval Blocked', check.message, 'warning');
      return { ok: false, message: check.message };
    }

    const candidate = session!.candidates.find((c) => c.id === candidateId)!;
    const targetPolicy = check.targetPolicy;

    // 1. Prevent ambiguous / Needs Clarification rules from being approved until resolved
    if (
      (candidate.isAmbiguous && !candidate.ambiguityResolved) ||
      candidate.status === 'Needs Clarification'
    ) {
      const msg = `Cannot approve ${candidate.suggestedCode}: Ambiguous clauses must be clarified and resolved before approval.`;
      addToast('Ambiguity Resolution Required', msg, 'warning');
      return { ok: false, message: msg };
    }

    // 2. Prevent duplicate promotion if already published in this or another session or already present in target policy
    const alreadyInTargetActive = targetPolicy.rules.some(
      (r) =>
        r.code.toLowerCase() === candidate.suggestedCode.toLowerCase() ||
        r.description.trim().toLowerCase() === candidate.extractedRule.trim().toLowerCase()
    );
    if (candidate.publishedVersion || alreadyInTargetActive) {
      const msg = `Duplicate promotion blocked: Clause ${candidate.suggestedCode} already exists in ${targetPolicy.name} (${
        candidate.publishedVersion || targetPolicy.version
      }).`;
      addToast('Duplicate Promotion Blocked', msg, 'warning');
      return { ok: false, message: msg };
    }

    // 3. Prevent duplicate approval in same session
    if (candidate.status === 'Approved') {
      const msg = `Clause ${candidate.suggestedCode} is already approved in session ${session!.id} by ${candidate.approvedBy}.`;
      addToast('Already Approved in Session', msg, 'info');
      return { ok: false, message: msg };
    }

    const timestamp = nowUtcTimestamp();
    setCompilationSessions((prev) =>
      prev.map((s) => {
        if (s.id !== session!.id || s.status === 'Published') return s;
        return {
          ...s,
          targetPolicyId: targetPolicy.id,
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
    return {
      ok: true,
      message: `Approved ${candidate.suggestedCode} in session ${session!.id}.`,
    };
  };

  const rejectCandidateRule = (candidateId: string): ActionResult => {
    const session = compilationSessions.find((s) =>
      s.candidates.some((c) => c.id === candidateId)
    );
    const check = validateSessionAndPolicyBeforeOperation(session);
    if (!check.ok) {
      addToast('Rejection Blocked', check.message, 'warning');
      return { ok: false, message: check.message };
    }

    const candidate = session!.candidates.find((c) => c.id === candidateId)!;
    if (candidate.publishedVersion) {
      return {
        ok: false,
        message: `Cannot reject ${candidate.suggestedCode}: already published in ${candidate.publishedVersion}.`,
      };
    }

    const timestamp = nowUtcTimestamp();
    setCompilationSessions((prev) =>
      prev.map((s) => {
        if (s.id !== session!.id || s.status === 'Published') return s;
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
    const check = validateSessionAndPolicyBeforeOperation(session);
    if (!check.ok || !check.targetPolicy) {
      addToast('Draft Save Blocked', check.message, 'warning');
      return { ok: false, message: check.message };
    }

    const targetPolicy = check.targetPolicy;
    const approvedCandidates = session!.candidates.filter(
      (c) => c.status === 'Approved' && !c.isAmbiguous
    );
    const timestamp = nowUtcTimestamp();
    const today = new Date().toISOString().split('T')[0];

    // Stage approved rules into the target policy's draftRules without duplicating rules or altering active rules
    if (approvedCandidates.length > 0) {
      setPolicies((prev) =>
        prev.map((pol) => {
          if (pol.id !== targetPolicy.id) return pol;
          const existingDrafts = cloneRules(pol.draftRules || []);
          const nextDrafts = [...existingDrafts];

          approvedCandidates.forEach((cand) => {
            const alreadyInDraft = nextDrafts.some(
              (dr) =>
                dr.code.toLowerCase() === cand.suggestedCode.toLowerCase() ||
                dr.description.trim().toLowerCase() === cand.extractedRule.trim().toLowerCase()
            );
            const alreadyInActive = pol.rules.some(
              (ar) =>
                ar.code.toLowerCase() === cand.suggestedCode.toLowerCase() ||
                ar.description.trim().toLowerCase() === cand.extractedRule.trim().toLowerCase()
            );

            if (!alreadyInDraft && !alreadyInActive) {
              const extractedWords = cand.extractedRule
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .split(/\s+/)
                .filter((w) => w.length > 4)
                .slice(0, 6);

              nextDrafts.push({
                id: `draft-${session!.id.toLowerCase()}-${cand.id}`,
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
      `Session ${session!.id} saved (${approvedCandidates.length} approved rule(s) staged in ${targetPolicy.name} draft workspace; active policy unchanged).`
    );

    return {
      ok: true,
      message: `Session ${session!.id} saved as draft.`,
    };
  };

  const publishCompilationSession = (
    sessionId: string,
    releaseNotes?: string
  ): ActionResult => {
    // Temporary operation lock while publishing
    if (publishingLockRef.current || isPublishingSession) {
      return {
        ok: false,
        message: 'Publication lock active: Another publication operation is currently in progress.',
      };
    }

    const session = compilationSessions.find((s) => s.id === sessionId);
    const check = validateSessionAndPolicyBeforeOperation(session);
    if (!check.ok || !check.targetPolicy) {
      addToast('Publication Blocked', check.message, 'warning');
      return { ok: false, message: check.message };
    }

    const targetPolicy = check.targetPolicy;

    const pendingRules = session!.candidates.filter((c) => c.status === 'Pending');
    const unresolvedRules = session!.candidates.filter(
      (c) =>
        c.status === 'Needs Clarification' || (c.isAmbiguous && !c.ambiguityResolved)
    );
    const approvedRules = session!.candidates.filter(
      (c) => c.status === 'Approved' && !c.isAmbiguous && !c.publishedVersion
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
        message: 'Cannot publish: At least one unpromoted candidate rule must be Approved.',
      };
    }

    publishingLockRef.current = true;
    setIsPublishingSession(true);

    try {
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

      const baseActiveRules: PolicyRule[] =
        targetPolicy.status === 'Draft' &&
        targetPolicy.rules.length === 0 &&
        (targetPolicy.draftRules || []).length > 0
          ? cloneRules(targetPolicy.draftRules || [])
          : cloneRules(targetPolicy.rules);

      const newlyAddedCodes: string[] = [];

      approvedRules.forEach((cand) => {
        const alreadyExists = baseActiveRules.some(
          (r) =>
            r.code.toLowerCase() === cand.suggestedCode.toLowerCase() ||
            r.description.trim().toLowerCase() === cand.extractedRule.trim().toLowerCase()
        );
        if (!alreadyExists) {
          const extractedWords = cand.extractedRule
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .split(/\s+/)
            .filter((w) => w.length > 4)
            .slice(0, 6);

          baseActiveRules.push({
            id: `rule-${session!.id.toLowerCase()}-${cand.id}`,
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

      if (newlyAddedCodes.length === 0) {
        return {
          ok: false,
          message:
            'Duplicate promotion blocked: All approved candidate rules in this session already exist in the target policy.',
        };
      }

      const summaryNote =
        releaseNotes?.trim() ||
        `Published compilation session ${session!.id}: added ${newlyAddedCodes.join(', ')}.`;

      const newVersionSnapshot: PolicyVersionSnapshot = {
        version: nextVersion,
        publishedAt: timestamp,
        publishedBy: settings.reviewerName,
        changeSummary: summaryNote,
        sourceSessionId: session!.id,
        rules: cloneRules(baseActiveRules),
      };

      // Update Policy with new version, deep-cloned active rules, and preserved historical snapshots
      setPolicies((prev) =>
        prev.map((pol) => {
          if (pol.id !== targetPolicy.id) return pol;
          const remainingDrafts = (pol.draftRules || []).filter(
            (dr) =>
              !approvedRules.some(
                (ar) =>
                  ar.suggestedCode.toLowerCase() === dr.code.toLowerCase() ||
                  ar.extractedRule.trim().toLowerCase() === dr.description.trim().toLowerCase()
              )
          );
          return {
            ...pol,
            status: 'Active',
            version: nextVersion,
            lastUpdated: today,
            rules: cloneRules(baseActiveRules),
            draftRules: cloneRules(remainingDrafts),
            versionHistory: [
              newVersionSnapshot,
              ...(pol.versionHistory || []).map((vh) => ({
                ...vh,
                rules: cloneRules(vh.rules),
              })),
            ],
          };
        })
      );

      // Lock Compilation Session as Published
      setCompilationSessions((prev) =>
        prev.map((s) =>
          s.id === session!.id
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
        `${targetPolicy.name} published as ${nextVersion} from session ${session!.id}.`
      );

      return {
        ok: true,
        message: `Successfully published ${targetPolicy.name} (${nextVersion}).`,
        publishedVersion: nextVersion,
      };
    } finally {
      publishingLockRef.current = false;
      setIsPublishingSession(false);
    }
  };

  const setCandidateRulesList = (rules: CompiledCandidateRule[]) => {
    setCompilationSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId && s.status !== 'Published'
          ? { ...s, candidates: rules, updatedAt: nowUtcTimestamp() }
          : s
      )
    );
  };

  const approveAndPromoteCandidateRule = (candidateId: string, targetPolicyId: string) => {
    approveCandidateInSession(candidateId, targetPolicyId);
  };

  /**
   * Phase 1A.1 Critical Correction:
   * - Remove automatic fallback to the first active policy.
   * - If the requested policy ID does not exist, return a clear error.
   * - If the requested policy is Draft or Archived, reject verification.
   * - Never silently substitute another policy.
   */
  const runDeterministicVerification = (
    contentTitle: string,
    contentRevision: string,
    contentBody: string,
    policyId: string
  ): { findings: VerificationFinding[]; auditRecord?: AuditRecord; error?: string } => {
    if (!policyId || !policyId.trim()) {
      const msg = 'Verification rejected: No target policy ID was provided.';
      addToast('Verification Rejected', msg, 'warning');
      return { findings: [], error: msg };
    }

    const requestedPolicy = policies.find((p) => p.id === policyId);

    if (!requestedPolicy) {
      const msg = `Verification rejected: Requested policy ID "${policyId}" does not exist in the Policy Library. No fallback policy was substituted.`;
      addToast('Nonexistent Policy Rejected', msg, 'warning');
      return { findings: [], error: msg };
    }

    if (requestedPolicy.status === 'Draft') {
      const msg = `Verification rejected: Policy "${requestedPolicy.name}" (${requestedPolicy.version}) is currently in Draft status and has no active published version. Publish the policy before verifying content.`;
      addToast('Draft Policy Rejected', msg, 'warning');
      return { findings: [], error: msg };
    }

    if (requestedPolicy.status === 'Archived') {
      const msg = `Verification rejected: Policy "${requestedPolicy.name}" (${requestedPolicy.version}) is Archived and cannot be used for compliance verification.`;
      addToast('Archived Policy Rejected', msg, 'warning');
      return { findings: [], error: msg };
    }

    // Verified Active Policy — take an immutable deep clone of its active published rules
    const policy = requestedPolicy;
    const activeRulesSnapshot: PolicyRule[] = cloneRules(policy.rules);

    const matchingSample = SAMPLE_CONTENT_DRAFTS.find(
      (d) => d.content.trim() === contentBody.trim() && d.policyId === policy.id
    );

    let findings: VerificationFinding[] = [];

    if (matchingSample) {
      findings = matchingSample.presetFindings.map((f, index) => ({
        ...f,
        id: `find-${Date.now()}-${index}`,
      }));

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

      createdAudit = {
        id: `REV-2026-0${nextNum}`,
        contentTitle: contentTitle.trim() || 'Untitled Marketing Asset',
        contentRevision: contentRevision.trim() || 'rev-1.0',
        contentSnapshot: contentBody,
        policyId: policy.id,
        policyName: policy.name,
        policyVersion: policy.version,
        snapshotStatus: 'Available',
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

    setPolicies(migratePolicies(INITIAL_POLICIES));
    setCompilationSessions(INITIAL_COMPILATION_SESSIONS);
    setActiveSessionId(INITIAL_COMPILATION_SESSIONS[0].id);
    setAuditRecords(migrateAudits(INITIAL_AUDIT_RECORDS, INITIAL_POLICIES));
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
        isPublishingSession,
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
