# Verifacta AI — Phase 1A: Policy Governance & Synchronization Upgrade

Phase 1A upgrades the **Policy Compiler → Policy Library → Content Verification** governance pipeline by introducing structured **Compilation Sessions**, strict ambiguity gates, a two-stage **Review Compilation & Publish Policy** workflow, immutable **Policy Version History**, and historical rule snapshots on **Audit Trail** records.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following governance rules were confirmed during Phase 1A planning and define the compilation, publication, and versioning boundaries:

- **Strict Session Completion Gate**: A Compilation Session can only be published once **every** candidate rule in that session has been explicitly reviewed (`Approved` or `Rejected`), with zero rules remaining in `Pending` or `Needs Clarification`, and at least one `Approved` rule. Incomplete sessions can be saved as drafts at any time.
- **Append-Based Rule Merging & Immutable Snapshots**: Publishing a Compilation Session to an existing policy appends the newly approved session rules to the policy's existing active rule set, increments the policy's semantic version, and stores an immutable snapshot of the previous published version in `versionHistory` without ever overwriting historical versions.
- **Integrated Version History & Switcher**: Inside the **Policy Library** detail view, users can switch between the **Active Rules**, **Draft Rules**, and **Version History** tabs, inspect the full rule snapshot and changelog of any historical version, and promote draft changes only through explicit publication.
- **Active-Only Verification & Immutable Audit Snapshots**: **Content Verification** evaluates content exclusively against `Active` published policies and embeds an immutable `ruleSnapshot` inside each generated **Audit Trail** record so subsequent policy publications never alter historical reviews.

---

## 1. Overview & Core Concept

- **What It Does**: Replaces immediate single-rule promotion with an enterprise-grade two-stage compilation lifecycle. Compliance engineers extract candidate rules into a uniquely identified **Compilation Session** (`CS-2026-XXXX`), resolve ambiguous wording before approval, save incomplete work as drafts, review the full session summary on a dedicated **Review Compilation** screen, and explicitly publish a new immutable version to the **Policy Library**.
- **Key Governance Guarantees**:
  1. **No Unresolved Ambiguity**: Rules flagged as ambiguous or `Needs Clarification` cannot be approved or published until their wording is edited/clarified and marked resolved.
  2. **No Accidental Live Mutation**: Approving an individual rule stages it inside the Compilation Session (`approvedBy`, `approvedAt`) rather than mutating the live active policy mid-review.
  3. **Idempotent Publication**: Each Compilation Session and candidate rule tracks publication state (`status: 'Published'`, `publishedVersion`), preventing duplicate promotion of the same candidate or double-publishing of a session.
  4. **Non-Destructive Storage Migration**: Existing `localStorage` data from Phase 1 is automatically migrated on startup to add `versionHistory`, compilation sessions, and audit rule snapshots without erasing user changes.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Compilation Session Management (`Policy Compiler`)**:
   - Starting an extraction creates a new **Compilation Session** with a unique ID (e.g., `CS-2026-0102`), timestamp, source guideline title/text, target policy, and session status (`In Review` | `Draft Saved` | `Published`).
   - Users can switch between active/saved Compilation Sessions via a session selector bar.
   - Each candidate rule displays its source excerpt, suggested code, and one of four states: **Pending**, **Approved** (with `approvedBy` and `approvedAt` metadata), **Rejected**, or **Needs Clarification**.
   - Attempting to approve an ambiguous or `Needs Clarification` rule triggers an inline governance block instructing the user to edit the rule text and click **Resolve Ambiguity** first.
2. **Review Compilation & Publish Modal/Screen (`Policy Compiler`)**:
   - Clicking **Save as Draft** preserves the current session and candidate states as a draft session and syncs staged draft rules to the target policy's draft workspace without altering its active version.
   - Clicking **Review Compilation** switches to the dedicated **Review Compilation** screen summarizing counts and tables of Approved, Rejected, Pending, and Needs Clarification rules, target policy version bump preview (`v3.2.0 → v3.3.0`), and release notes input.
   - Once all rules are reviewed (`Pending === 0` and `Needs Clarification === 0`) and confirmed by the user, clicking **Confirm & Publish Policy Version** publishes the new policy version, records the immutable snapshot in `versionHistory`, and locks the session against duplicate publication.
3. **Policy Version History & Draft Separation (`Policy Library`)**:
   - The Policy Detail view features three sub-views:
     - **Active Published Rules**: Shows the currently active version (`vX.Y.Z`) used by Content Verification.
     - **Draft Workspace**: Shows staged draft rules from saved draft compilations or manual draft edits, kept strictly isolated from the active published rules.
     - **Version History**: Displays a chronological timeline of all published versions (`v3.1.0`, `v3.2.0`, `v3.3.0`) with publication dates, authors, change summaries, and an **Inspect Version Snapshot** drawer/view to browse the exact rule set of any historical version.
4. **Version-Locked Verification & Audit Trail (`Content Verification` & `Audit Trail`)**:
   - The policy selector in **Content Verification** lists only `Active` published policies and displays the active version badge.
   - Every new **AuditRecord** stores `policyVersion` alongside `policyRulesSnapshot: PolicyRule[]`, and the **Audit Trail** detail view allows reviewers to inspect the exact historical rule snapshot that governed that verification run.

---

## 3. Technical Architecture & Data Strategy

### Architecture & State Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     VerifactaContext (with Safe v1 → v1A Migration)              │
│  CompilationSessions[]  │  Policies (Active + Draft + VersionHistory[])  │ Audits│
└────────────┬────────────────────────────────────┬───────────────────────────┬────┘
             │                                    │                           │
┌────────────▼─────────────┐        ┌─────────────▼─────────────┐ ┌───────────▼────┐
│     Policy Compiler      │        │      Policy Library       │ │ Verification & │
│ ┌──────────────────────┐ │        │ ┌───────────────────────┐ │ │  Audit Trail   │
│ │ 1. Session Workspace │ │        │ │ Active Published View │ │ │ ┌────────────┐ │
│ │  • Pending           │ │        │ ├───────────────────────┤ │ │ │ Active-Only│ │
│ │  • Needs Clarif.     │ │        │ │ Draft Rules Workspace │ │ │ │ Policy     │ │
│ │  • Approved (Who/When│ │        │ ├───────────────────────┤ │ │ │ Selector   │ │
│ │  • Rejected          │ │        │ │ Version History Tab   │ │ │ └─────┬──────┘ │
│ └──────────┬───────────┘ │        │ │  • v3.3.0 (Current)   │ │ │       │        │
│            ▼             │        │ │  • v3.2.0 (Snapshot)  │ │ │ ┌─────▼──────┐ │
│ ┌──────────────────────┐ │Publish │ │  • v3.1.0 (Snapshot)  │ │ │ │ Immutable  │ │
│ │ 2. Review Compilation├─┼────────┼─► Immutable Append      │ │ │ │ Audit Rule │ │
│ │  • Save as Draft     │ │        │ └───────────────────────┘ │ │ │ Snapshot   │ │
│ │  • Confirm & Publish │ │        │                           │ │ └────────────┘ │
│ └──────────────────────┘ │        └───────────────────────────┘ └────────────────┘
└──────────────────────────┘
```

### Updated Data Model Entities
- **`CandidateRuleStatus`**: `'Pending' | 'Approved' | 'Rejected' | 'Needs Clarification'`
- **`CompiledCandidateRule`**:
  - Preserves `sourceExcerpt`, `extractedRule`, `suggestedCode`, `category`, `severity`, `evidenceRequired`, `confidence`, `isAmbiguous`, `ambiguityNote`, `status`.
  - Adds `sessionId: string`, `ambiguityResolved?: boolean`, `resolutionNote?: string`, `approvedBy?: string`, `approvedAt?: string`, `rejectedBy?: string`, `rejectedAt?: string`, `promotedToPolicyId?: string`, `publishedVersion?: string`.
- **`CompilationSession`**:
  - `id: string` (e.g., `CS-2026-0101`)
  - `title: string`
  - `sourceText: string`
  - `targetPolicyId: string`
  - `createdAt: string`
  - `updatedAt: string`
  - `status: 'In Review' | 'Draft Saved' | 'Published'`
  - `publishedVersion?: string`
  - `publishedAt?: string`
  - `publishedBy?: string`
  - `candidates: CompiledCandidateRule[]`
- **`PolicyVersionSnapshot`**:
  - `version: string`
  - `publishedAt: string`
  - `publishedBy: string`
  - `changeSummary: string`
  - `sourceSessionId?: string`
  - `rules: PolicyRule[]` (complete immutable snapshot of all rules in that version)
- **`Policy`**:
  - Retains `id`, `name`, `category`, `version`, `lastUpdated`, `status`, `description`, `owner`, `rules` (currently active published rules).
  - Adds `draftRules?: PolicyRule[]` (staged draft rules kept separate from active `rules`) and `versionHistory: PolicyVersionSnapshot[]`.
- **`AuditRecord`**:
  - Retains all existing fields and adds `policyRulesSnapshot: PolicyRule[]` so historical audit reviews always retain the exact clauses evaluated at the moment of verification.
