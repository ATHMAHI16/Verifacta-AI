# Verifacta AI — Phase 1A.1: Critical Governance Corrections

Phase 1A.1 hardens the governance integrity of **Verifacta AI** by eliminating silent policy fallbacks during content verification, preventing false reconstruction of missing historical audit snapshots, adding concurrency and immutability locks to compilation operations, and protecting published policy version histories from metadata edits.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following confirmed governance behaviors govern this update:

- **Zero Silent Policy Fallback in Content Verification**: The policy selector in **Content Verification** lists all policies with explicit status and version labels (`Active`, `Draft`, `Archived`) and displays a pre-verification summary card showing the exact selected policy name, status, and published version. Submitting verification against a nonexistent, `Draft`, or `Archived` policy is deterministically rejected with an explicit error—never falling back to another policy.
- **Strict Historical Audit Migration (`Available` vs. `Unavailable`)**: In `migrateAudits()`, existing valid snapshots are preserved unchanged. If a migrated audit lacks a snapshot, it is only populated if the exact `policyVersion` exists in the matching policy's `versionHistory`; otherwise `snapshotStatus` is marked `'Unavailable'` with an empty snapshot, and the Audit Trail UI explicitly informs reviewers that the original historical rule snapshot is unavailable rather than substituting current live rules.
- **Metadata Editor Protection on Published Policies**: Editing an existing policy's metadata in **Policy Library** locks the published `version` string and `status` once a policy has published history, ensuring version increments and rule changes occur exclusively through immutable publication events.
- **Compilation Operation Locks & Idempotency**: A synchronous + state-backed `isPublishingSession` lock prevents concurrent or duplicate publication calls, blocks any mutation/approval/rejection on `Published` sessions, validates session status and target policy before every operation, and prevents duplicate candidate promotions or duplicate draft rules.

---

## 1. Overview of Corrections

1. **Fix Incorrect Policy Fallback During Verification (`runDeterministicVerification` & `ContentVerification.tsx`)**:
   - Remove the fallback `requestedPolicy && requestedPolicy.status === 'Active' ? requestedPolicy : activePolicies[0]`.
   - Look up `policies.find(p => p.id === policyId)` directly:
     - If `!requestedPolicy`, return an explicit error: `"Verification rejected: Selected policy ID '${policyId}' does not exist."`
     - If `requestedPolicy.status === 'Draft'`, return an explicit error: `"Verification rejected: Policy '${requestedPolicy.name}' (${requestedPolicy.version}) is in Draft status and has not been published."`
     - If `requestedPolicy.status === 'Archived'`, return an explicit error: `"Verification rejected: Policy '${requestedPolicy.name}' (${requestedPolicy.version}) is Archived and cannot be used for active compliance verification."`
   - Display a prominent **Selected Policy Target** summary box above the **Verify Content** button showing the selected policy's exact name, status indicator, and published version before verification runs.
2. **Fix Historical Audit Migration (`migrateAudits` & `AuditTrail.tsx`)**:
   - Add `snapshotStatus?: 'Available' | 'Unavailable'` to `AuditRecord`.
   - In `migrateAudits()`:
     - If `aud.policyRulesSnapshot` is already a non-empty array and `aud.snapshotStatus !== 'Unavailable'`, keep it unchanged with `snapshotStatus: 'Available'`.
     - If `aud.snapshotStatus === 'Unavailable'`, keep it `'Unavailable'` with `policyRulesSnapshot: []`.
     - Otherwise, check ONLY `matchingPolicy?.versionHistory?.find(vh => vh.version === aud.policyVersion)`. If found, copy those exact version rules and set `snapshotStatus: 'Available'`.
     - If the exact historical `policyVersion` is not found in `versionHistory`, NEVER fall back to `matchingPolicy.rules`; set `snapshotStatus: 'Unavailable'` and `policyRulesSnapshot: []`.
   - Include a legacy audit record (`REV-2025-0412` referencing `v2.0.0` where `v2.0.0` is absent from `versionHistory`) so reviewers can immediately inspect the `Unavailable` historical snapshot state in **Audit Trail**.
3. **Strengthen Compilation Operations (`VerifactaContext.tsx` & `PolicyCompiler.tsx`)**:
   - Add a `publishingLockRef` (`useRef<boolean>(false)`) alongside `isPublishing` state to guard `publishCompilationSession` against rapid double-clicks or concurrent invocations.
   - Enforce pre-operation validation across `updateCandidateRule`, `resolveCandidateAmbiguity`, `markCandidateNeedsClarification`, `approveCandidateInSession`, `rejectCandidateRule`, `saveCompilationAsDraft`, and `publishCompilationSession`:
     - Reject any operation if `session.status === 'Published'` or `isPublishing` is active.
     - Validate that the target policy exists and is not `Archived` before every candidate or session operation.
     - Check across the target policy's active `rules`, `draftRules`, and `versionHistory` to prevent duplicate promotion of the same candidate rule.
4. **Protect Policy Version History (`VerifactaContext.tsx` & `PolicyLibrary.tsx`)**:
   - Deep-clone rule arrays when creating or migrating `versionHistory` snapshots so no reference is ever shared with mutable `draftRules` or metadata fields.
   - In `updatePolicy`, strip/ignore direct mutations to `rules`, `versionHistory`, or `version` on policies that have published history, ensuring metadata edits (`name`, `category`, `owner`, `description`) never alter published rules or overwrite version snapshots.

---

## 2. Technical Architecture & Verification Matrix

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       Phase 1A.1 Governance Safeguards                       │
├──────────────────────────────────────┬───────────────────────────────────────┤
│ 1. Verification Gate                 │ 2. Historical Audit Migration         │
│  • Lookup policyId exact match       │  • Existing valid snapshot → Keep     │
│  • Missing ID → Reject (No fallback) │  • Exact version in history → Restore │
│  • Status === 'Draft' → Reject       │  • Missing historical version →       │
│  • Status === 'Archived' → Reject    │    Mark snapshotStatus: 'Unavailable' │
│  • Status === 'Active' → Evaluate    │    (Never substitute active rules)    │
├──────────────────────────────────────┼───────────────────────────────────────┤
│ 3. Compilation Session Locks         │ 4. Version History Protection         │
│  • publishingLockRef concurrency lock│  • Deep-cloned frozen rule snapshots  │
│  • Block edits/approvals/rejections  │  • Metadata editor locks version &    │
│    on Published sessions             │    preserves published rules          │
│  • Deduplicate draft & active rules  │  • Every publication appends new ver  │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

### Interactive Governance Verification Suite
In addition to standard interactive usage across all views, we will include a built-in **Governance Self-Test & Verification Runner** in the **Settings** view that executes and reports pass/fail assertions for all 10 required test scenarios (nonexistent policy rejection, Draft policy rejection, Archived policy rejection, zero silent fallback, audit migration with existing version, audit migration with missing version marked `Unavailable`, published session modification block, duplicate publication block, and version snapshot immutability).
