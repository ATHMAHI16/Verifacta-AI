export type NavTab =
  | 'overview'
  | 'policy-library'
  | 'policy-compiler'
  | 'content-verification'
  | 'red-team'
  | 'audit-trail'
  | 'settings';

export type PolicyStatus = 'Active' | 'Draft' | 'Archived';

export type RuleSeverity = 'Critical' | 'High' | 'Medium';

export type VerificationState = 'Supported' | 'Contradicted' | 'Unverified' | 'Ambiguous';

export type ReviewStatus = 'Approved' | 'Flagged' | 'Pending Review' | 'Rejected';

export type CandidateRuleStatus = 'Pending' | 'Approved' | 'Rejected';

export interface PolicyRule {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: RuleSeverity;
  evidenceRequired: string;
  keywords: string[];
  prohibitedTerms?: string[];
  ambiguousModifiers?: string[];
  isAmbiguous?: boolean;
}

export interface Policy {
  id: string;
  name: string;
  category: string;
  version: string;
  lastUpdated: string;
  status: PolicyStatus;
  description: string;
  owner: string;
  rules: PolicyRule[];
}

export interface CompiledCandidateRule {
  id: string;
  sourceExcerpt: string;
  extractedRule: string;
  suggestedCode: string;
  category: string;
  severity: RuleSeverity;
  evidenceRequired: string;
  confidence: number;
  isAmbiguous: boolean;
  ambiguityNote?: string;
  status: CandidateRuleStatus;
  promotedToPolicyId?: string;
}

export interface VerificationFinding {
  id: string;
  state: VerificationState;
  excerpt: string;
  ruleCode: string;
  ruleClause: string;
  explanation: string;
  evidenceReference: string;
  confidence: number;
}

export interface AuditRecord {
  id: string; // e.g., REV-2026-0842
  contentTitle: string;
  contentRevision: string;
  contentSnapshot: string;
  policyId: string;
  policyName: string;
  policyVersion: string;
  reviewStatus: ReviewStatus;
  reviewer: string;
  timestamp: string;
  findings: VerificationFinding[];
  humanDecisionNote?: string;
}

export interface RedTeamScenario {
  id: string;
  policyId: string;
  scenarioTitle: string;
  adversarialPrompt: string;
  targetRuleCode: string;
  expectedOutcome: VerificationState;
  simulatedOutcome: VerificationState;
  gapIdentified: string;
  gapSeverity: RuleSeverity;
  remediationSuggestion: string;
  promotedToRule?: boolean;
}

export interface SampleGuidelineTemplate {
  id: string;
  title: string;
  category: string;
  targetPolicyId: string;
  rawText: string;
  extractedCandidates: Omit<CompiledCandidateRule, 'id' | 'status'>[];
}

export interface SampleContentDraft {
  id: string;
  title: string;
  policyId: string;
  revision: string;
  content: string;
  presetFindings: Omit<VerificationFinding, 'id'>[];
}

export interface AppSettings {
  reviewerName: string;
  reviewerRole: string;
  organizationName: string;
  simulationStrictness: 'Standard' | 'Strict' | 'Advisory';
  autoCreateAuditLog: boolean;
  requireEvidenceReference: boolean;
  flagAmbiguousQuantifiers: boolean;
}
