# Verifacta AI — Phase 1: Application Foundation

Verifacta AI is an enterprise brand governance and content compliance platform that enables organizations to compile brand guidelines into structured rules, verify marketing copy using a deterministic four-state evidence model, stress-test policies against adversarial edge cases, and maintain a comprehensive review audit trail.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and product workflow decisions were confirmed during Phase 1 alignment and govern how modules interact across the platform:

- **Compiler-to-Library Sync**: Approving extracted rules in the **Policy Compiler** promotes them directly into the target policy inside the **Policy Library**, immediately making those rules active for verification and red-team testing.
- **Verification-to-Audit Pipeline**: Running a **Content Verification** automatically logs a new review record into the **Audit Trail** with a full content snapshot, policy version reference, and four-state findings, ready for human reviewer sign-off (`Approve`, `Request Revision`, or `Escalate`).
- **State Persistence & Demo Reset**: All policies, compiled rules, verification logs, red-team runs, and workspace settings persist in `localStorage` so workflows survive browser refreshes, paired with a prominent **Reset Demo Data** control to restore the baseline dataset at any time.
- **Transparent Simulation Posture**: In accordance with Phase 1 specifications, rule extraction, content verification, red-team scenario evaluation, and audit logging operate on deterministic rule-matching engines and realistic sample datasets, with clear simulation indicators rather than unverified AI claims.

---

## 1. Overview & Core Concept

- **What It Does**: Provides legal, compliance, and brand marketing teams with a unified workspace to manage corporate communication policies, extract structured rules from raw brand guidelines, verify draft marketing assets against specific policy clauses, run red-team edge-case simulations, and inspect historical compliance decisions.
- **Target Audience / Persona**: Brand Governance Directors, Marketing Compliance Officers, Legal Reviewers, and Content Operations Leads at mid-to-large enterprises.
- **Key Value**: Replaces subjective, manual spreadsheet reviews with clause-level, evidence-grounded compliance verification using four explicit classification states (**Supported**, **Contradicted**, **Unverified**, and **Ambiguous**).

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Executive Overview & Quick Triage**: Users land on the **Overview** dashboard displaying high-level KPIs (Total Policies, Content Items Reviewed, Issues Detected, Pending Human Reviews), verification trend charts, policy status breakdowns, recent flagged content, and 1-click quick actions to create a policy or verify content.
2. **Policy Management & Rule Inspection**: In **Policy Library**, users search, filter (`Draft`, `Active`, `Archived`), create, edit, archive, and drill into detailed policy views showing structured rules, severity levels, and required evidence sources.
3. **Guideline Compilation**: In **Policy Compiler**, users paste raw brand guidelines or load sample templates, run deterministic extraction, edit extracted rule clauses, flag ambiguous wording, and approve rules to push them directly into a selected Policy Library document.
4. **Four-State Content Verification**: In **Content Verification**, users enter a content title, select an active policy, and input marketing copy (or load pre-built test drafts). Clicking **Verify Content** evaluates the copy and displays clause-by-clause findings categorized into **Supported**, **Contradicted**, **Unverified**, and **Ambiguous**, complete with excerpt highlighting, evidence references, confidence scores, and an automatic Audit Trail entry.
5. **Adversarial Red-Team Testing**: In **Red-Team Testing**, users select a policy, generate or add hypothetical edge-case scenarios, compare expected vs. simulated outcomes, and inspect identified policy coverage gaps.
6. **Audit Trail & Human Sign-Off**: In **Audit Trail**, users filter historical and newly generated reviews, open a comprehensive detail drawer/view showing the immutable content snapshot, policy version, evidence citations, and findings, and record a final human review decision.

### Visual Identity & Theme
- **Aesthetic Direction**: Utilitarian enterprise precision inspired by high-trust compliance and financial governance systems—clean architectural structure, high scannability, zero decorative clutter.
- **Color Palette & Mood (60-30-10 Discipline)**:
  - *60% Dominant Canvas*: Light neutral workspace (`#F8FAFC` / `slate-50`) with crisp white (`#FFFFFF`) primary surfaces and single-level 1px structural borders (`#E2E8F0` / `slate-200`).
  - *30% Structural Surfaces*: Deep navy/charcoal persistent sidebar (`#0F172A` / `slate-900`) with muted slate navigation text (`#94A3B8`) and crisp white active states.
  - *10% Accent & Semantic Budget*: Royal blue (`#2563EB` / `blue-600`) and deep violet (`#4F46E5` / `indigo-600`) for primary interactive controls and focus states.
  - *Four-State Semantic System (Paired with explicit icons & text labels)*:
    - **Supported**: Emerald (`#16A34A` / `emerald-700`)
    - **Contradicted**: Crimson (`#DC2626` / `red-700`)
    - **Unverified**: Amber (`#D97706` / `amber-700`)
    - **Ambiguous**: Violet (`#7C3AED` / `violet-700`)
- **Typography & Hierarchy**:
  - *Display & Navigation*: `Plus Jakarta Sans` (SemiBold/Bold 600–700) for crisp structural headings and workspace titles.
  - *Body & Dense UI*: `Public Sans` (Regular 400, Medium 500) for high legibility across policy clauses, excerpts, and tables.
  - *Metrics, Versions & IDs*: `JetBrains Mono` with `tabular-nums` for review IDs (`REV-2026-0842`), policy versions (`v2.4.0`), timestamps, and confidence percentages.
- **Component Styling & Layout**:
  - Desktop-first 1440px layout featuring a persistent `$260\text{px}$` dark sidebar (collapsible drawer on mobile/tablet), a clean top bar (current page title, global search input, notifications popover, user profile menu, and primary context action), and a single-elevation content grid.
  - Metadata (categories, versions, timestamps) rendered as clean unboxed text with middot (`·`) separators—avoiding cluttered pill sandwiches or thick left accent borders.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Deterministic Rule-Matching & Simulation Engine**
  - *Chosen Approach*: Build a deterministic client/server-ready evaluation engine that analyzes input text against the selected policy's active rules (matching trigger keywords, prohibited claims, required disclaimers, and ambiguous modifiers) while also offering rich pre-populated sample drafts.
  - *Why*: Ensures that typing custom marketing copy in Content Verification or custom guidelines in Policy Compiler produces responsive, logical four-state findings rather than static hardcoded strings, while remaining honest that AI/LLM inference is reserved for Phase 2.
- **Decision 2: Centralized Reactive Store with `localStorage` Sync**
  - *Chosen Approach*: A unified React Context store (`VerifactaContext`) backed by browser `localStorage` and seeded with comprehensive enterprise demo data (policies across Brand Voice, Sustainability Claims, Financial Promotions, and Healthcare Privacy).
  - *Why*: Guarantees instantaneous cross-module reactivity (e.g., approving a rule in Compiler immediately updates Policy Library counts and Content Verification behavior) and preserves user work across refreshes, with a 1-click reset in the top bar and Settings page.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                         VerifactaStore (React Context)                        │
│     Policies & Rules  │  Compiler Queue  │  Red-Team Suites  │  Audit Logs    │
│                     ↕ Syncs with browser localStorage                         │
└───────┬───────────────────────┬────────────────────┬──────────────────┬───────┘
        │                       │                    │                  │
┌───────▼────────┐     ┌────────▼────────┐  ┌────────▼────────┐ ┌───────▼───────┐
│  App Shell     │     │ Policy Modules  │  │ Verification &  │ │ Governance &  │
│  ┌───────────┐ │     │ ┌─────────────┐ │  │ Stress Testing  │ │ System Config │
│  │ Sidebar   │ │     │ │ Policy      │ │  │ ┌─────────────┐ │ │ ┌───────────┐ │
│  │ Nav (7x)  │ │     │ │ Library     │ │  │ │ Content     │ │ │ │ Audit     │ │
│  ├───────────┤ │     │ │ (CRUD+View) │ │  │ │ Verifier    │ │ │ │ Trail &   │ │
│  │ Top Bar   │ │     │ └──────┬──────┘ │  │ │ (4-State)   │ │ │ │ Sign-Off  │ │
│  │ Search /  │ │     │        ▲        │  │ └──────┬──────┘ │ │ └───────────┘ │
│  │ Alerts /  │ │     │ ┌──────┴──────┐ │  │        │        │ │ ┌───────────┐ │
│  │ Profile   │ │     │ │ Policy      │ │  │ ┌──────▼──────┐ │ │ │ Settings  │ │
│  └───────────┘ │     │ │ Compiler    │ │  │ │ Policy      │ │ │ │ & Reset   │ │
│  ┌───────────┐ │     │ │ (Extract &  │ │  │ │ Red-Team    │ │ │ └───────────┘ │
│  │ Overview  │ │     │ │  Promote)   │ │  │ │ Simulator   │ │ │               │
│  │ Dashboard │ │     │ └─────────────┘ │  │ └─────────────┘ │ │               │
│  └───────────┘ │     └─────────────────┘  └─────────────────┘ └───────────────┘
└────────────────┘
```

### Data Model & Core Entities
- **`Policy`**: `id`, `name`, `category`, `version`, `lastUpdated`, `status` (`Draft` | `Active` | `Archived`), `description`, `owner`, `rules: PolicyRule[]`.
- **`PolicyRule`**: `id`, `code` (e.g., `ENV-01`), `title`, `description`, `severity` (`Critical` | `High` | `Medium`), `evidenceRequired`, `keywords`, `isAmbiguous`.
- **`CompiledCandidateRule`**: `id`, `sourceExcerpt`, `extractedRule`, `category`, `confidence`, `isAmbiguous`, `ambiguityNote`, `status` (`Pending` | `Approved` | `Rejected`).
- **`VerificationFinding`**: `id`, `state` (`Supported` | `Contradicted` | `Unverified` | `Ambiguous`), `excerpt`, `ruleCode`, `ruleClause`, `explanation`, `evidenceReference`, `confidence`.
- **`AuditRecord`**: `id` (`reviewId`), `contentTitle`, `contentRevision`, `contentSnapshot`, `policyId`, `policyName`, `policyVersion`, `reviewStatus` (`Approved` | `Flagged` | `Pending Review` | `Rejected`), `reviewer`, `timestamp`, `findings: VerificationFinding[]`, `humanDecisionNote`.
- **`RedTeamScenario`**: `id`, `policyId`, `scenarioTitle`, `adversarialPrompt`, `targetRuleCode`, `expectedOutcome` (Four-State), `simulatedOutcome` (Four-State), `gapIdentified`, `gapSeverity`, `remediationSuggestion`.

### Interactive Component & State Mapping
- **Global Top Bar**: Global search filters the active workspace or surfaces quick-jump results across Policies and Audit Reviews; Notifications popover displays pending human reviews with click-through navigation; User Profile menu switches active reviewer persona and links to Settings.
- **Overview Dashboard**: Interactive Recharts bar/area visualization of 4-state verification volume and policy compliance distribution; clicking "Create Policy" or "Verify Content" navigates directly to the target workflow with pre-focused inputs; clicking any Recent Flagged Content item opens its detailed Audit Trail record.
- **Policy Library**: Search by name/category, segment filter (`All`, `Active`, `Draft`, `Archived`), modal form with validation for creating/editing policies and rules, status toggle (`Archive` / `Activate`), and a dedicated drill-down view for inspecting and managing individual policy clauses.
- **Policy Compiler**: Supports pasting custom guidelines, uploading `.txt`/`.md` files, or loading 3 realistic sample guideline documents; simulated extraction progress indicator; inline editing of extracted clauses; toggling `Ambiguous Clause` flags; and `Approve & Promote to Policy` which appends the rule to the selected Policy Library item and increments its minor version.
- **Content Verification**: Supports custom text entry or 4 preset marketing drafts (e.g., *Eco-Packaging Press Release*, *Q4 Enterprise Cloud SLA Claim*, *AI Productivity Guarantee*); runs deterministic analysis against the chosen policy; filters findings by state (`All`, `Supported`, `Contradicted`, `Unverified`, `Ambiguous`); and automatically creates a linked Audit Trail record.
- **Policy Red-Team**: Filters test suites by policy, generates additional adversarial edge-case scenarios on demand, runs batch simulations comparing Expected vs. Simulated outcomes, and lets users convert an identified Policy Gap directly into a new draft rule in the Policy Library.
- **Audit Trail & Settings**: Searchable and filterable table of all verification reviews; slide-over/detail inspection panel where reviewers can submit a human review decision (`Approve Content`, `Request Changes`, `Reject`) with audit notes; Settings view to configure simulation strictness, default reviewer profile, and full localStorage state reset.
