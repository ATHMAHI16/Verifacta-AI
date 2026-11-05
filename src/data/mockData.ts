import {
  Policy,
  CompiledCandidateRule,
  CompilationSession,
  AuditRecord,
  RedTeamScenario,
  SampleGuidelineTemplate,
  SampleContentDraft,
  AppSettings,
} from '../types';

const ENV_V3_1_RULES = [
  {
    id: 'rule-env-1',
    code: 'ENV-101',
    title: 'Prohibition of Unqualified "Net-Zero" or "100% Eco-Friendly" Claims',
    description:
      'Marketing materials must never state that a product is "100% eco-friendly", "zero-impact", or "completely carbon neutral" without specifying the exact lifecycle boundary (cradle-to-gate vs. cradle-to-grave) and third-party verification registry ID.',
    severity: 'Critical' as const,
    evidenceRequired: 'ISO 14064 Lifecycle Assessment (LCA) Report ID',
    keywords: ['carbon', 'neutral', 'net-zero', 'eco-friendly', 'emissions', 'footprint'],
    prohibitedTerms: ['100% eco-friendly', 'zero environmental impact', 'carbon free'],
    ambiguousModifiers: ['planet-friendly', 'greenest', 'naturally sustainable'],
  },
  {
    id: 'rule-env-2',
    code: 'ENV-102',
    title: 'Post-Consumer Recycled (PCR) Material Percentage Disclosure',
    description:
      'Any claim referencing recycled packaging or materials must state the exact minimum percentage by weight of Post-Consumer Recycled (PCR) content verified by supplier chain-of-custody certificates.',
    severity: 'High' as const,
    evidenceRequired: 'Supplier Chain-of-Custody Audit Ref (FSC / GRS)',
    keywords: ['recycled', 'packaging', 'pcr', 'plastic', 'cardboard', 'materials'],
    prohibitedTerms: ['all-recycled'],
    ambiguousModifiers: ['mostly recycled', 'made with recycled materials'],
  },
  {
    id: 'rule-env-3',
    code: 'ENV-103',
    title: 'Carbon Offset vs. Direct Operational Reduction Separation',
    description:
      'Communications referencing carbon reductions must explicitly distinguish between direct Scope 1/2 operational reductions and purchased voluntary carbon offsets.',
    severity: 'High' as const,
    evidenceRequired: 'Annual Sustainability Accounting Ledger (GHG Protocol)',
    keywords: ['offset', 'reduction', 'scope 1', 'scope 2', 'decarbonization', 'credits'],
  },
];

const ENV_V3_2_RULES = [
  ...ENV_V3_1_RULES,
  {
    id: 'rule-env-4',
    code: 'ENV-104',
    title: 'Compostability Infrastructure Qualification',
    description:
      'Claims that packaging is "compostable" or "biodegradable" must specify whether industrial composting facilities are required and disclose local availability limitations.',
    severity: 'Medium' as const,
    evidenceRequired: 'ASTM D6400 / EN 13432 Certification Document',
    keywords: ['compostable', 'biodegradable', 'degrade', 'home compost'],
    ambiguousModifiers: ['breaks down naturally', 'earth-degradable'],
  },
];

const SEC_V2_3_RULES = [
  {
    id: 'rule-sec-1',
    code: 'SEC-201',
    title: 'SLA Uptime Percentage & Credit Exclusions',
    description:
      'Public materials may cite up to 99.99% uptime for Enterprise Tier clusters only when paired with a reference to the Master Services Agreement SLA schedule. Claims of "100% uninterrupted uptime" or "zero downtime ever" are strictly prohibited.',
    severity: 'Critical' as const,
    evidenceRequired: 'Production Telemetry Audit Q3-2026 & MSA Schedule B',
    keywords: ['uptime', 'sla', 'availability', 'downtime', '99.99%', 'outage'],
    prohibitedTerms: ['100% uptime', 'zero downtime guaranteed', 'never goes down'],
  },
  {
    id: 'rule-sec-2',
    code: 'SEC-202',
    title: 'Encryption-at-Rest and In-Transit Specification',
    description:
      'Security statements must specify AES-256 for data at rest and TLS 1.3 for data in transit. Vague phrases like "military-grade unhackable encryption" are disallowed.',
    severity: 'High' as const,
    evidenceRequired: 'SOC 2 Type II Report Section 4.2 (Cryptography)',
    keywords: ['encryption', 'aes-256', 'tls', 'security', 'cryptographic'],
    prohibitedTerms: ['unhackable', 'breach-proof'],
    ambiguousModifiers: ['military-grade security', 'bank-level protection'],
  },
];

const SEC_V2_4_RULES = [
  ...SEC_V2_3_RULES,
  {
    id: 'rule-sec-3',
    code: 'SEC-203',
    title: 'Zero Data Retention & Model Training Isolation',
    description:
      'Statements asserting customer prompts or payloads are excluded from foundation model training must cite the Enterprise Data Processing Addendum (DPA) Section 7.1.',
    severity: 'Critical' as const,
    evidenceRequired: 'Enterprise DPA v4.1 & Isolation Architecture Attestation',
    keywords: ['training', 'retention', 'customer data', 'zero-retention', 'privacy'],
  },
];

const FIN_V1_9_RULES = [
  {
    id: 'rule-fin-1',
    code: 'FIN-301',
    title: 'Cohort Sample Size & Timeframe for ROI Multipliers',
    description:
      'Any quantitative ROI or productivity claim (e.g., "3.4x faster workflow" or "$1.2M saved") must specify the customer cohort size (n >= 25), measurement window, and baseline methodology.',
    severity: 'Critical' as const,
    evidenceRequired: 'Verified Customer Benchmark Study (Forrester TEI / Internal Telemetry)',
    keywords: ['roi', 'saved', 'faster', 'productivity', 'reduction', 'cost', 'hours'],
    ambiguousModifiers: ['effortless ROI', 'instant payback', 'unlimited savings'],
  },
  {
    id: 'rule-fin-2',
    code: 'FIN-302',
    title: 'Forward-Looking Financial Projection Disclaimer',
    description:
      'Case studies highlighting top-decile customer outcomes must include a clear disclosure that results vary based on deployment scale and baseline operational maturity.',
    severity: 'Medium' as const,
    evidenceRequired: 'Standard Legal Footnote FN-ROI-2026',
    keywords: ['projection', 'guaranteed savings', 'typical results', 'payback'],
    prohibitedTerms: ['guaranteed payback in 7 days', 'risk-free returns'],
  },
];

export const INITIAL_POLICIES: Policy[] = [
  {
    id: 'pol-env-001',
    name: 'Environmental & Sustainability Claims Policy',
    category: 'ESG & Sustainability',
    version: 'v3.2.0',
    lastUpdated: '2026-10-28',
    status: 'Active',
    owner: 'Elena Rostova · VP Brand Governance',
    description:
      'Governs all environmental, carbon-neutrality, recyclability, and lifecycle emissions claims in external marketing, packaging, and investor communications in accordance with FTC Green Guides and EU Green Claims Directive standards.',
    rules: ENV_V3_2_RULES,
    draftRules: [],
    versionHistory: [
      {
        version: 'v3.2.0',
        publishedAt: '2026-10-28 16:30 UTC',
        publishedBy: 'Elena Rostova',
        changeSummary:
          'Added ENV-104 (Compostability Infrastructure Qualification) requiring ASTM D6400 / EN 13432 industrial composting facility disclosures.',
        sourceSessionId: 'CS-2026-0098',
        rules: ENV_V3_2_RULES,
      },
      {
        version: 'v3.1.0',
        publishedAt: '2026-09-12 10:15 UTC',
        publishedBy: 'Elena Rostova',
        changeSummary:
          'Baseline FY2026 ESG policy release establishing ENV-101 through ENV-103 lifecycle and PCR substantiation rules.',
        sourceSessionId: 'CS-2026-0081',
        rules: ENV_V3_1_RULES,
      },
    ],
  },
  {
    id: 'pol-sec-002',
    name: 'Enterprise Cloud Security & SLA Representations',
    category: 'Technical & Product Claims',
    version: 'v2.4.0',
    lastUpdated: '2026-10-31',
    status: 'Active',
    owner: 'Marcus Vance · Chief Information Security Counsel',
    description:
      'Establishes mandatory verification criteria for uptime guarantees, encryption standards, zero-data-retention assurances, and regulatory compliance certifications in B2B sales collateral.',
    rules: SEC_V2_4_RULES,
    draftRules: [],
    versionHistory: [
      {
        version: 'v2.4.0',
        publishedAt: '2026-10-31 14:10 UTC',
        publishedBy: 'Marcus Vance',
        changeSummary:
          'Published SEC-203 enforcing Enterprise DPA v4.1 Section 7.1 citations for foundation model zero-retention claims.',
        sourceSessionId: 'CS-2026-0099',
        rules: SEC_V2_4_RULES,
      },
      {
        version: 'v2.3.0',
        publishedAt: '2026-08-20 09:00 UTC',
        publishedBy: 'Marcus Vance',
        changeSummary:
          'Initial Enterprise Cloud Security SLA and cryptographic specification baseline (SEC-201, SEC-202).',
        sourceSessionId: 'CS-2026-0074',
        rules: SEC_V2_3_RULES,
      },
    ],
  },
  {
    id: 'pol-fin-003',
    name: 'Financial Performance & ROI Substantiation Standard',
    category: 'Financial & ROI Marketing',
    version: 'v1.9.0',
    lastUpdated: '2026-10-19',
    status: 'Active',
    owner: 'Claire Sterling · Director of Legal Compliance',
    description:
      'Regulates productivity multiplier claims, customer cost-savings metrics, payback period projections, and benchmark comparisons in case studies and launch campaigns.',
    rules: FIN_V1_9_RULES,
    draftRules: [],
    versionHistory: [
      {
        version: 'v1.9.0',
        publishedAt: '2026-10-19 11:45 UTC',
        publishedBy: 'Claire Sterling',
        changeSummary:
          'Established minimum n >= 25 enterprise cohort requirement (FIN-301) and forward-looking variance disclaimer (FIN-302).',
        sourceSessionId: 'CS-2026-0092',
        rules: FIN_V1_9_RULES,
      },
    ],
  },
  {
    id: 'pol-med-004',
    name: 'Healthcare & Life Sciences Clinical Communication Policy',
    category: 'Regulated Industries',
    version: 'v1.1.0',
    lastUpdated: '2026-11-01',
    status: 'Draft',
    owner: 'Dr. Aris Thorne · Medical Affairs Compliance',
    description:
      'Draft governance framework for healthcare workflow software communications, ensuring HIPAA compliance representations and distinguishing administrative decision support from clinical diagnostics.',
    rules: [],
    draftRules: [
      {
        id: 'rule-med-1',
        code: 'MED-401',
        title: 'Non-Diagnostic Decision Support Clarification',
        description:
          'Communications targeting healthcare providers must clarify that workflow summaries are administrative documentation aids and not FDA-cleared primary diagnostic instruments.',
        severity: 'Critical',
        evidenceRequired: 'Regulatory Classification Memo REG-2026-11',
        keywords: ['clinical', 'diagnostic', 'patient', 'hipaa', 'physician', 'medical'],
        prohibitedTerms: ['replaces physician diagnosis', 'autonomous clinical diagnosis'],
      },
      {
        id: 'rule-med-2',
        code: 'MED-402',
        title: 'HIPAA Business Associate Agreement (BAA) Qualification',
        description:
          'Claims of HIPAA compliance must state that covered entities must execute a signed Business Associate Agreement (BAA) and configure dedicated tenant logging.',
        severity: 'High',
        evidenceRequired: 'HIPAA Security Rule Attestation 2026',
        keywords: ['hipaa', 'phi', 'baa', 'protected health information'],
      },
    ],
    versionHistory: [],
  },
  {
    id: 'pol-brd-005',
    name: 'Legacy Brand Tone & Competitor Comparison Guidelines (2024)',
    category: 'Brand Voice & Editorial',
    version: 'v1.0.4',
    lastUpdated: '2025-08-14',
    status: 'Archived',
    owner: 'Elena Rostova · VP Brand Governance',
    description:
      'Superseded editorial policy governing comparative advertising tables and superlative brand positioning statements.',
    rules: [
      {
        id: 'rule-brd-1',
        code: 'BRD-501',
        title: 'Named Competitor Feature Matrix Verification',
        description:
          'Any side-by-side comparison naming a direct competitor must cite public documentation dated within the last 90 days.',
        severity: 'Medium',
        evidenceRequired: 'Competitive Intelligence Archive Snapshot',
        keywords: ['competitor', 'versus', 'compared to', 'market leader'],
      },
    ],
    draftRules: [],
    versionHistory: [
      {
        version: 'v1.0.4',
        publishedAt: '2025-08-14 15:00 UTC',
        publishedBy: 'Elena Rostova',
        changeSummary: 'Final archived release prior to 2026 policy consolidation.',
        rules: [
          {
            id: 'rule-brd-1',
            code: 'BRD-501',
            title: 'Named Competitor Feature Matrix Verification',
            description:
              'Any side-by-side comparison naming a direct competitor must cite public documentation dated within the last 90 days.',
            severity: 'Medium',
            evidenceRequired: 'Competitive Intelligence Archive Snapshot',
            keywords: ['competitor', 'versus', 'compared to', 'market leader'],
          },
        ],
      },
    ],
  },
];

export const SAMPLE_GUIDELINE_TEMPLATES: SampleGuidelineTemplate[] = [
  {
    id: 'tpl-esg-2026',
    title: '2026 Global Packaging & Net-Zero Communications Directive',
    category: 'ESG & Sustainability',
    targetPolicyId: 'pol-env-001',
    rawText: `SECTION 4: ENVIRONMENTAL CLAIMS & PACKAGING GOVERNANCE (2026 UPDATE)

4.1 Recycled Content & Ocean-Bound Plastics
All marketing claims referencing ocean-bound plastics or post-consumer recycled (PCR) resins must state the exact weight percentage certified by Global Recycled Standard (GRS 4.0) audits. Phrases such as "made with ocean plastic" without a verified percentage breakdown are non-compliant.

4.2 Renewable Energy & Supply Chain Claims
When referencing clean energy in manufacturing, communications may state "Manufactured in facilities powered by 85% certified wind and solar energy (2025 REC Registry #8841-EU)". Marketing copy should strive to use forward-thinking, eco-conscious language without sounding overly technical or making unreasonable promises about future renewable transitions.

4.3 Water Stewardship Assertions
Any statement claiming "water-positive manufacturing" is prohibited unless accompanied by an independent watershed restoration audit verifying net-positive basin replenishment in the exact operating region.`,
    extractedCandidates: [
      {
        sourceExcerpt:
          '"All marketing claims referencing ocean-bound plastics or post-consumer recycled (PCR) resins must state the exact weight percentage certified by Global Recycled Standard (GRS 4.0) audits."',
        extractedRule:
          'Mandate exact weight-percentage disclosure and GRS 4.0 audit citation for all ocean-bound plastic or PCR resin claims.',
        suggestedCode: 'ENV-105',
        category: 'ESG & Sustainability',
        severity: 'High',
        evidenceRequired: 'GRS 4.0 Audit Certificate Ref',
        confidence: 96,
        isAmbiguous: false,
      },
      {
        sourceExcerpt:
          '"Marketing copy should strive to use forward-thinking, eco-conscious language without sounding overly technical or making unreasonable promises about future renewable transitions."',
        extractedRule:
          'Require renewable energy transition messaging to cite verified REC registry numbers and avoid unquantified future transition pledges.',
        suggestedCode: 'ENV-106',
        category: 'ESG & Sustainability',
        severity: 'Medium',
        evidenceRequired: '2025 REC Registry #8841-EU Attestation',
        confidence: 69,
        isAmbiguous: true,
        ambiguityNote:
          'Subjective terms ("overly technical", "unreasonable promises") require concrete lexical boundaries before this rule can be approved.',
      },
      {
        sourceExcerpt:
          '"Any statement claiming water-positive manufacturing is prohibited unless accompanied by an independent watershed restoration audit verifying net-positive basin replenishment in the exact operating region."',
        extractedRule:
          'Prohibit "water-positive manufacturing" claims without a region-specific independent watershed restoration audit citation.',
        suggestedCode: 'ENV-107',
        category: 'ESG & Sustainability',
        severity: 'Critical',
        evidenceRequired: 'AWS (Alliance for Water Stewardship) Basin Audit Report',
        confidence: 95,
        isAmbiguous: false,
      },
    ],
  },
  {
    id: 'tpl-sec-ai',
    title: 'Enterprise AI Security, Zero-Retention & Uptime Addendum',
    category: 'Technical & Product Claims',
    targetPolicyId: 'pol-sec-002',
    rawText: `SECTION 2: CLOUD & AI SECURITY REPRESENTATIONS

2.1 Zero-Downtime & High-Availability Messaging
Zero-downtime migration claims are strictly forbidden unless qualified as near-zero downtime (< 30 seconds connection drain) backed by multi-region failover logs. Outbound campaigns must never promise 100% immunity from cloud provider outages.

2.2 Customer Payload Isolation & Sub-Processor Transparency
All enterprise sales decks stating that customer prompts are isolated from foundation model training must reference Enterprise DPA Section 7.1 and link to the current Sub-Processor Trust Registry.

2.3 Quantum-Resistant & Next-Gen Cryptography Claims
Copywriters should highlight our strong security posture using reassuring enterprise terminology, avoiding premature claims of full post-quantum cryptographic readiness across legacy storage tiers.`,
    extractedCandidates: [
      {
        sourceExcerpt:
          '"Zero-downtime migration claims are strictly forbidden unless qualified as near-zero downtime (< 30 seconds connection drain) backed by multi-region failover logs."',
        extractedRule:
          'Forbid unqualified "zero-downtime migration" claims; require "< 30s connection drain" qualifier and multi-region failover log reference.',
        suggestedCode: 'SEC-204',
        category: 'Technical & Product Claims',
        severity: 'Critical',
        evidenceRequired: 'Multi-Region Failover Benchmark Report',
        confidence: 94,
        isAmbiguous: false,
      },
      {
        sourceExcerpt:
          '"All enterprise sales decks stating that customer prompts are isolated from foundation model training must reference Enterprise DPA Section 7.1 and link to the current Sub-Processor Trust Registry."',
        extractedRule:
          'Require Enterprise DPA Section 7.1 and Sub-Processor Trust Registry citations on all model training isolation claims.',
        suggestedCode: 'SEC-205',
        category: 'Technical & Product Claims',
        severity: 'High',
        evidenceRequired: 'Enterprise DPA Section 7.1 & Trust Registry URL',
        confidence: 97,
        isAmbiguous: false,
      },
      {
        sourceExcerpt:
          '"Copywriters should highlight our strong security posture using reassuring enterprise terminology, avoiding premature claims of full post-quantum cryptographic readiness..."',
        extractedRule:
          'Prohibit claims of full post-quantum cryptographic readiness on legacy storage tiers; define approved cryptographic descriptors.',
        suggestedCode: 'SEC-206',
        category: 'Technical & Product Claims',
        severity: 'Medium',
        evidenceRequired: 'NIST PQC Migration Architecture Spec',
        confidence: 71,
        isAmbiguous: true,
        ambiguityNote:
          'Phrase "reassuring enterprise terminology" is non-deterministic and must be replaced with an explicit list of approved security ciphers before approval.',
      },
    ],
  },
  {
    id: 'tpl-fin-roi',
    title: 'B2B Financial Promotions & Benchmark Substantiation Guide',
    category: 'Financial & ROI Marketing',
    targetPolicyId: 'pol-fin-003',
    rawText: `SECTION 1: QUANTITATIVE ROI & BENCHMARK SUBSTANTIATION

1.1 Customer Productivity & Time-Savings Multipliers
Every headline claiming a percentage reduction in review cycle time must cite the Q3-2026 Enterprise Benchmark Study (n = 64 enterprise compliance teams, 90-day observation window).

1.2 Payback Period & Cost Reduction Disclaimers
Customer ROI testimonials featuring enterprise cost reductions must reflect typical deployment outcomes and avoid cherry-picking outlier performance. Claims of guaranteed payback under 30 days are prohibited.`,
    extractedCandidates: [
      {
        sourceExcerpt:
          '"Every headline claiming a percentage reduction in review cycle time must cite the Q3-2026 Enterprise Benchmark Study (n = 64 enterprise compliance teams, 90-day observation window)."',
        extractedRule:
          'Require Q3-2026 Enterprise Benchmark Study citation (n = 64, 90-day window) for all review cycle time reduction claims.',
        suggestedCode: 'FIN-303',
        category: 'Financial & ROI Marketing',
        severity: 'High',
        evidenceRequired: 'Q3-2026 Enterprise Benchmark Study Report',
        confidence: 98,
        isAmbiguous: false,
      },
      {
        sourceExcerpt:
          '"Customer ROI testimonials featuring enterprise cost reductions must reflect typical deployment outcomes and avoid cherry-picking outlier performance."',
        extractedRule:
          'Restrict cost-reduction claims to median cohort outcomes; forbid single-account outlier claims without full distribution disclosure.',
        suggestedCode: 'FIN-304',
        category: 'Financial & ROI Marketing',
        severity: 'High',
        evidenceRequired: 'Cohort Statistical Summary (Median & IQR)',
        confidence: 73,
        isAmbiguous: true,
        ambiguityNote:
          '"Typical deployment outcomes" is open to interpretation until anchored to median or 25th-75th percentile cohort metrics.',
      },
    ],
  },
];

export const INITIAL_CANDIDATE_RULES: CompiledCandidateRule[] = [
  {
    id: 'cand-101',
    sessionId: 'CS-2026-0101',
    sourceExcerpt:
      '"All marketing claims referencing ocean-bound plastics or post-consumer recycled (PCR) resins must state the exact weight percentage certified by Global Recycled Standard (GRS 4.0) audits."',
    extractedRule:
      'Mandate exact weight-percentage disclosure and GRS 4.0 audit citation for all ocean-bound plastic or PCR resin claims.',
    suggestedCode: 'ENV-105',
    category: 'ESG & Sustainability',
    severity: 'High',
    evidenceRequired: 'GRS 4.0 Audit Certificate Ref',
    confidence: 96,
    isAmbiguous: false,
    status: 'Pending',
  },
  {
    id: 'cand-102',
    sessionId: 'CS-2026-0101',
    sourceExcerpt:
      '"Marketing copy should strive to use forward-thinking, eco-conscious language without sounding overly technical or making unreasonable promises about future renewable transitions."',
    extractedRule:
      'Require renewable energy transition messaging to cite verified REC registry numbers and avoid unquantified future transition pledges.',
    suggestedCode: 'ENV-106',
    category: 'ESG & Sustainability',
    severity: 'Medium',
    evidenceRequired: '2025 REC Registry #8841-EU Attestation',
    confidence: 69,
    isAmbiguous: true,
    ambiguityNote:
      'Subjective terms ("overly technical", "unreasonable promises") require concrete lexical boundaries before this rule can be approved.',
    status: 'Needs Clarification',
  },
  {
    id: 'cand-103',
    sessionId: 'CS-2026-0101',
    sourceExcerpt:
      '"Any statement claiming water-positive manufacturing is prohibited unless accompanied by an independent watershed restoration audit verifying net-positive basin replenishment in the exact operating region."',
    extractedRule:
      'Prohibit "water-positive manufacturing" claims without a region-specific independent watershed restoration audit citation.',
    suggestedCode: 'ENV-107',
    category: 'ESG & Sustainability',
    severity: 'Critical',
    evidenceRequired: 'AWS (Alliance for Water Stewardship) Basin Audit Report',
    confidence: 95,
    isAmbiguous: false,
    status: 'Pending',
  },
];

export const INITIAL_COMPILATION_SESSIONS: CompilationSession[] = [
  {
    id: 'CS-2026-0101',
    title: '2026 Global Packaging & Net-Zero Communications Directive',
    sourceText: SAMPLE_GUIDELINE_TEMPLATES[0].rawText,
    targetPolicyId: 'pol-env-001',
    createdAt: '2026-11-03 15:10 UTC',
    updatedAt: '2026-11-03 15:10 UTC',
    status: 'In Review',
    candidates: INITIAL_CANDIDATE_RULES,
  },
  {
    id: 'CS-2026-0099',
    title: 'Q3 Enterprise DPA Zero-Retention Clause Extraction',
    sourceText: SAMPLE_GUIDELINE_TEMPLATES[1].rawText,
    targetPolicyId: 'pol-sec-002',
    createdAt: '2026-10-31 13:45 UTC',
    updatedAt: '2026-10-31 14:10 UTC',
    status: 'Published',
    publishedVersion: 'v2.4.0',
    publishedAt: '2026-10-31 14:10 UTC',
    publishedBy: 'Marcus Vance',
    releaseNotes: 'Published SEC-203 model training isolation clause into Enterprise Cloud Security Policy.',
    candidates: [
      {
        id: 'cand-hist-99-1',
        sessionId: 'CS-2026-0099',
        sourceExcerpt:
          '"All enterprise sales decks stating that customer prompts are isolated from foundation model training must reference Enterprise DPA Section 7.1 and link to the current Sub-Processor Trust Registry."',
        extractedRule:
          'Statements asserting customer prompts or payloads are excluded from foundation model training must cite the Enterprise Data Processing Addendum (DPA) Section 7.1.',
        suggestedCode: 'SEC-203',
        category: 'Technical & Product Claims',
        severity: 'Critical',
        evidenceRequired: 'Enterprise DPA v4.1 & Isolation Architecture Attestation',
        confidence: 97,
        isAmbiguous: false,
        status: 'Approved',
        approvedBy: 'Marcus Vance',
        approvedAt: '2026-10-31 14:05 UTC',
        promotedToPolicyId: 'pol-sec-002',
        publishedVersion: 'v2.4.0',
      },
    ],
  },
];

export const SAMPLE_CONTENT_DRAFTS: SampleContentDraft[] = [
  {
    id: 'draft-eco-packaging',
    title: 'Q4 Press Release: TerraPack Next-Gen Sustainable Mailer Launch',
    policyId: 'pol-env-001',
    revision: 'rev-1.4',
    content: `FOR IMMEDIATE RELEASE: Introducing TerraPack Horizon Mailers

Our new TerraPack Horizon shipping mailers are 100% eco-friendly and deliver zero environmental impact across global supply chains.

Each mailer is manufactured using 85% Post-Consumer Recycled (PCR) resin verified under Global Recycled Standard (GRS) Chain-of-Custody Audit Ref #GRS-2026-9941.

Furthermore, our fulfillment network achieved a 42% reduction in Scope 1 and Scope 2 operational emissions in FY2026 (verified under ISO 14064 LCA Report #LCA-882), completely separate from our voluntary reforestation carbon offsets.

Finally, TerraPack Horizon mailers are earth-degradable and break down naturally in any backyard environment within weeks.`,
    presetFindings: [
      {
        state: 'Contradicted',
        excerpt:
          '"Our new TerraPack Horizon shipping mailers are 100% eco-friendly and deliver zero environmental impact across global supply chains."',
        ruleCode: 'ENV-101',
        ruleClause: 'Prohibition of Unqualified "Net-Zero" or "100% Eco-Friendly" Claims',
        explanation:
          'Direct violation of ENV-101. Absolute claims of "100% eco-friendly" and "zero environmental impact" are explicitly prohibited because all physical packaging incurs lifecycle manufacturing and transport emissions.',
        evidenceReference: 'ISO 14064 Lifecycle Assessment (LCA) Report #LCA-882 (Shows 48g CO2e per unit)',
        confidence: 98,
      },
      {
        state: 'Supported',
        excerpt:
          '"Each mailer is manufactured using 85% Post-Consumer Recycled (PCR) resin verified under Global Recycled Standard (GRS) Chain-of-Custody Audit Ref #GRS-2026-9941."',
        ruleCode: 'ENV-102',
        ruleClause: 'Post-Consumer Recycled (PCR) Material Percentage Disclosure',
        explanation:
          'Complies with ENV-102 by stating the exact minimum weight percentage (85% PCR) and citing an active third-party chain-of-custody verification identifier.',
        evidenceReference: 'Supplier Chain-of-Custody Audit Ref #GRS-2026-9941',
        confidence: 96,
      },
      {
        state: 'Supported',
        excerpt:
          '"...achieved a 42% reduction in Scope 1 and Scope 2 operational emissions in FY2026 (verified under ISO 14064 LCA Report #LCA-882), completely separate from our voluntary reforestation carbon offsets."',
        ruleCode: 'ENV-103',
        ruleClause: 'Carbon Offset vs. Direct Operational Reduction Separation',
        explanation:
          'Explicitly separates direct Scope 1 & 2 operational emissions reductions from voluntary carbon offset purchases and cites the primary LCA ledger.',
        evidenceReference: 'Annual Sustainability Accounting Ledger & ISO 14064 #LCA-882',
        confidence: 95,
      },
      {
        state: 'Ambiguous',
        excerpt:
          '"Finally, TerraPack Horizon mailers are earth-degradable and break down naturally in any backyard environment..."',
        ruleCode: 'ENV-104',
        ruleClause: 'Compostability Infrastructure Qualification',
        explanation:
          'Uses vague, non-standard modifier "earth-degradable" without specifying ASTM D6400 industrial composting temperature requirements or municipal facility access limitations.',
        evidenceReference: 'ASTM D6400 / EN 13432 Certification Document (Requires 58°C Industrial Facility)',
        confidence: 87,
      },
      {
        state: 'Unverified',
        excerpt: '"...break down naturally in any backyard environment within weeks."',
        ruleCode: 'ENV-104',
        ruleClause: 'Compostability Infrastructure Qualification',
        explanation:
          'No laboratory evidence or TÜV OK Compost HOME certification exists in the repository to substantiate ambient backyard degradation "within weeks".',
        evidenceReference: 'Missing Evidence: Home Composting Degradation Timeframe Study',
        confidence: 91,
      },
    ],
  },
  {
    id: 'draft-cloud-sla',
    title: 'Enterprise Sales Deck: AegisCloud Zero-Trust Platform Overview',
    policyId: 'pol-sec-002',
    revision: 'rev-2.1',
    content: `AegisCloud Enterprise Infrastructure Overview

1. Reliability & Availability: AegisCloud delivers 100% uptime with zero downtime guaranteed across all customer tiers, ensuring your mission-critical workloads never experience an interruption.

2. Cryptographic Posture: All customer payloads are protected at rest using AES-256 encryption and in transit via TLS 1.3 (verified in our 2026 SOC 2 Type II Report, Section 4.2), reinforced by military-grade unhackable perimeter shields.

3. AI Data Governance: Customer prompts and proprietary documents submitted to AegisCloud are strictly excluded from foundation model training under Enterprise DPA v4.1 Section 7.1. Furthermore, our upcoming Sovereign Enclave tier reduces regional failover latency by 78%.`,
    presetFindings: [
      {
        state: 'Contradicted',
        excerpt:
          '"AegisCloud delivers 100% uptime with zero downtime guaranteed across all customer tiers..."',
        ruleCode: 'SEC-201',
        ruleClause: 'SLA Uptime Percentage & Credit Exclusions',
        explanation:
          'Contradicts SEC-201, which caps public availability representations at 99.99% for Enterprise Tier clusters and strictly prohibits claims of "100% uptime" or "zero downtime guaranteed".',
        evidenceReference: 'MSA Schedule B & Production Telemetry Audit Q3-2026 (99.992% actual)',
        confidence: 99,
      },
      {
        state: 'Supported',
        excerpt:
          '"All customer payloads are protected at rest using AES-256 encryption and in transit via TLS 1.3 (verified in our 2026 SOC 2 Type II Report, Section 4.2)..."',
        ruleCode: 'SEC-202',
        ruleClause: 'Encryption-at-Rest and In-Transit Specification',
        explanation:
          'Accurately states AES-256 at rest and TLS 1.3 in transit with a verifiable citation to SOC 2 Type II Report Section 4.2.',
        evidenceReference: 'SOC 2 Type II Report Section 4.2 (Cryptography)',
        confidence: 97,
      },
      {
        state: 'Ambiguous',
        excerpt: '"...reinforced by military-grade unhackable perimeter shields."',
        ruleCode: 'SEC-202',
        ruleClause: 'Encryption-at-Rest and In-Transit Specification',
        explanation:
          'Contains non-standard marketing hyperbole ("military-grade") alongside prohibited absolute security phrasing ("unhackable") that lacks technical cryptographic definition.',
        evidenceReference: 'SOC 2 Type II Control Matrix (Disallows absolute security guarantees)',
        confidence: 92,
      },
      {
        state: 'Supported',
        excerpt:
          '"Customer prompts and proprietary documents submitted to AegisCloud are strictly excluded from foundation model training under Enterprise DPA v4.1 Section 7.1."',
        ruleCode: 'SEC-203',
        ruleClause: 'Zero Data Retention & Model Training Isolation',
        explanation:
          'Directly satisfies SEC-203 by citing Enterprise DPA v4.1 Section 7.1 when asserting model training isolation.',
        evidenceReference: 'Enterprise DPA v4.1 Section 7.1 & Isolation Architecture Attestation',
        confidence: 98,
      },
      {
        state: 'Unverified',
        excerpt:
          '"Furthermore, our upcoming Sovereign Enclave tier reduces regional failover latency by 78%."',
        ruleCode: 'SEC-201',
        ruleClause: 'SLA Uptime Percentage & Credit Exclusions',
        explanation:
          'No production telemetry or benchmark study is linked to substantiate the 78% regional failover latency reduction for the unreleased Sovereign Enclave tier.',
        evidenceReference: 'Missing Evidence: Sovereign Enclave Latency Benchmark Report',
        confidence: 89,
      },
    ],
  },
  {
    id: 'draft-fin-roi',
    title: 'Website Landing Copy: Autonomous Compliance ROI Campaign',
    policyId: 'pol-fin-003',
    revision: 'rev-1.0',
    content: `Accelerate Enterprise Governance with Verifacta Workflows

Across our Q3-2026 Enterprise Cohort Study (n = 48 global enterprises over a 6-month production window), teams achieved a 3.2x faster policy review cycle and reduced external legal review spend by $410,000 annually.

Deploy today for effortless ROI and guaranteed payback in 7 days across every department, with typical savings exceeding $2.5M in your first quarter.

Note: Individual financial outcomes vary based on organizational deployment scale, baseline compliance maturity, and review volume (Legal Reference FN-ROI-2026).`,
    presetFindings: [
      {
        state: 'Supported',
        excerpt:
          '"Across our Q3-2026 Enterprise Cohort Study (n = 48 global enterprises over a 6-month production window), teams achieved a 3.2x faster policy review cycle and reduced external legal review spend by $410,000 annually."',
        ruleCode: 'FIN-301',
        ruleClause: 'Cohort Sample Size & Timeframe for ROI Multipliers',
        explanation:
          'Meets FIN-301 requirements by explicitly stating a qualifying sample size (n = 48 >= 25), measurement window (6 months), and concrete multiplier metrics.',
        evidenceReference: 'Verified Customer Benchmark Study Q3-2026 (n = 48)',
        confidence: 96,
      },
      {
        state: 'Contradicted',
        excerpt: '"Deploy today for effortless ROI and guaranteed payback in 7 days across every department..."',
        ruleCode: 'FIN-302',
        ruleClause: 'Forward-Looking Financial Projection Disclaimer',
        explanation:
          'Violates FIN-302, which explicitly prohibits claims of "guaranteed payback in 7 days" and unqualified forward-looking financial guarantees.',
        evidenceReference: 'Standard Legal Policy FIN-302 (Prohibited Guarantee Clause)',
        confidence: 98,
      },
      {
        state: 'Ambiguous',
        excerpt: '"Deploy today for effortless ROI..."',
        ruleCode: 'FIN-301',
        ruleClause: 'Cohort Sample Size & Timeframe for ROI Multipliers',
        explanation:
          'Phrase "effortless ROI" is flagged as an ambiguous modifier under FIN-301 because implementation requires policy onboarding and reviewer configuration.',
        evidenceReference: 'Implementation Onboarding Telemetry (Median 14-day setup)',
        confidence: 84,
      },
      {
        state: 'Unverified',
        excerpt: '"...with typical savings exceeding $2.5M in your first quarter."',
        ruleCode: 'FIN-301',
        ruleClause: 'Cohort Sample Size & Timeframe for ROI Multipliers',
        explanation:
          'The "$2.5M in your first quarter" figure is not present in the Q3-2026 Enterprise Cohort Study (which recorded $410,000 annual savings).',
        evidenceReference: 'Unverified Metric: No supporting cohort table for $2.5M Q1 savings',
        confidence: 94,
      },
      {
        state: 'Supported',
        excerpt:
          '"Note: Individual financial outcomes vary based on organizational deployment scale, baseline compliance maturity, and review volume (Legal Reference FN-ROI-2026)."',
        ruleCode: 'FIN-302',
        ruleClause: 'Forward-Looking Financial Projection Disclaimer',
        explanation:
          'Includes the mandatory variance disclosure and references Legal Footnote FN-ROI-2026.',
        evidenceReference: 'Standard Legal Footnote FN-ROI-2026',
        confidence: 97,
      },
    ],
  },
];

export const INITIAL_AUDIT_RECORDS: AuditRecord[] = [
  {
    id: 'REV-2026-0849',
    contentTitle: 'Q4 Press Release: TerraPack Next-Gen Sustainable Mailer Launch',
    contentRevision: 'rev-1.4',
    contentSnapshot: SAMPLE_CONTENT_DRAFTS[0].content,
    policyId: 'pol-env-001',
    policyName: 'Environmental & Sustainability Claims Policy',
    policyVersion: 'v3.2.0',
    policyRulesSnapshot: ENV_V3_2_RULES,
    reviewStatus: 'Flagged',
    reviewer: 'Elena Rostova',
    timestamp: '2026-11-03 14:22 UTC',
    findings: SAMPLE_CONTENT_DRAFTS[0].presetFindings.map((f, i) => ({
      ...f,
      id: `find-init-849-${i}`,
    })),
    humanDecisionNote:
      'Blocked release pending removal of "100% eco-friendly" in paragraph 1 and addition of ASTM D6400 industrial composting disclaimer in paragraph 4.',
  },
  {
    id: 'REV-2026-0848',
    contentTitle: 'Enterprise Sales Deck: AegisCloud Zero-Trust Platform Overview',
    contentRevision: 'rev-2.1',
    contentSnapshot: SAMPLE_CONTENT_DRAFTS[1].content,
    policyId: 'pol-sec-002',
    policyName: 'Enterprise Cloud Security & SLA Representations',
    policyVersion: 'v2.4.0',
    policyRulesSnapshot: SEC_V2_4_RULES,
    reviewStatus: 'Pending Review',
    reviewer: 'Unassigned (Queue)',
    timestamp: '2026-11-03 11:05 UTC',
    findings: SAMPLE_CONTENT_DRAFTS[1].presetFindings.map((f, i) => ({
      ...f,
      id: `find-init-848-${i}`,
    })),
  },
  {
    id: 'REV-2026-0847',
    contentTitle: 'EMEA Annual Sustainability Executive Summary (Final Revised)',
    contentRevision: 'rev-3.0',
    contentSnapshot: `In FY2026, our European fulfillment centers achieved a 38% reduction in direct Scope 1 and Scope 2 emissions compared to our 2022 baseline, verified under ISO 14064 Report #LCA-2026-EU4. All corrugated transit boxes contain a minimum of 90% Post-Consumer Recycled (PCR) fiber certified under FSC Chain-of-Custody #FSC-C148291.`,
    policyId: 'pol-env-001',
    policyName: 'Environmental & Sustainability Claims Policy',
    policyVersion: 'v3.1.0',
    policyRulesSnapshot: ENV_V3_1_RULES,
    reviewStatus: 'Approved',
    reviewer: 'Marcus Vance',
    timestamp: '2026-10-15 17:40 UTC',
    findings: [
      {
        id: 'find-init-847-1',
        state: 'Supported',
        excerpt:
          '"...achieved a 38% reduction in direct Scope 1 and Scope 2 emissions compared to our 2022 baseline, verified under ISO 14064 Report #LCA-2026-EU4."',
        ruleCode: 'ENV-103',
        ruleClause: 'Carbon Offset vs. Direct Operational Reduction Separation',
        explanation:
          'Clearly specifies direct Scope 1 and Scope 2 operational reductions against a 2022 baseline with an ISO 14064 report citation.',
        evidenceReference: 'ISO 14064 Report #LCA-2026-EU4',
        confidence: 98,
      },
      {
        id: 'find-init-847-2',
        state: 'Supported',
        excerpt:
          '"All corrugated transit boxes contain a minimum of 90% Post-Consumer Recycled (PCR) fiber certified under FSC Chain-of-Custody #FSC-C148291."',
        ruleCode: 'ENV-102',
        ruleClause: 'Post-Consumer Recycled (PCR) Material Percentage Disclosure',
        explanation:
          'States exact minimum weight percentage (90% PCR) and provides verifiable FSC Chain-of-Custody reference.',
        evidenceReference: 'FSC Chain-of-Custody #FSC-C148291',
        confidence: 99,
      },
    ],
    humanDecisionNote:
      'Evaluated under v3.1.0 prior to ENV-104 addition. All environmental assertions are properly bounded and backed by audited FY2026 certificates.',
  },
  {
    id: 'REV-2026-0846',
    contentTitle: 'Website Landing Copy: Autonomous Compliance ROI Campaign',
    contentRevision: 'rev-1.0',
    contentSnapshot: SAMPLE_CONTENT_DRAFTS[2].content,
    policyId: 'pol-fin-003',
    policyName: 'Financial Performance & ROI Substantiation Standard',
    policyVersion: 'v1.9.0',
    policyRulesSnapshot: FIN_V1_9_RULES,
    reviewStatus: 'Rejected',
    reviewer: 'Claire Sterling',
    timestamp: '2026-11-01 16:15 UTC',
    findings: SAMPLE_CONTENT_DRAFTS[2].presetFindings.map((f, i) => ({
      ...f,
      id: `find-init-846-${i}`,
    })),
    humanDecisionNote:
      'Rejected due to unsubstantiated "$2.5M Q1 savings" claim and prohibited "7-day guaranteed payback" language. Return to Demand Gen team.',
  },
  {
    id: 'REV-2026-0845',
    contentTitle: 'Series D Investor Deck: Security & Privacy Architecture Slide',
    contentRevision: 'rev-4.2',
    contentSnapshot: `Customer data is encrypted at rest using AES-256 and in transit via TLS 1.3 (SOC 2 Type II Section 4.2). Enterprise tier workloads operate under a 99.99% availability SLA (MSA Schedule B), and customer payloads are strictly excluded from foundation model training under Enterprise DPA v4.1 Section 7.1.`,
    policyId: 'pol-sec-002',
    policyName: 'Enterprise Cloud Security & SLA Representations',
    policyVersion: 'v2.3.0',
    snapshotStatus: 'Available',
    policyRulesSnapshot: SEC_V2_3_RULES,
    reviewStatus: 'Approved',
    reviewer: 'Marcus Vance',
    timestamp: '2026-09-30 09:50 UTC',
    findings: [
      {
        id: 'find-init-845-1',
        state: 'Supported',
        excerpt:
          '"Customer data is encrypted at rest using AES-256 and in transit via TLS 1.3 (SOC 2 Type II Section 4.2)."',
        ruleCode: 'SEC-202',
        ruleClause: 'Encryption-at-Rest and In-Transit Specification',
        explanation: 'Cites approved cryptographic standards and SOC 2 Type II report section.',
        evidenceReference: 'SOC 2 Type II Report Section 4.2',
        confidence: 99,
      },
      {
        id: 'find-init-845-2',
        state: 'Supported',
        excerpt:
          '"Enterprise tier workloads operate under a 99.99% availability SLA (MSA Schedule B)..."',
        ruleCode: 'SEC-201',
        ruleClause: 'SLA Uptime Percentage & Credit Exclusions',
        explanation: 'Properly scopes 99.99% SLA to Enterprise tier and references MSA Schedule B.',
        evidenceReference: 'MSA Schedule B',
        confidence: 98,
      },
    ],
    humanDecisionNote: 'Verified against v2.3.0 SOC 2 attestation and MSA schedule. Approved.',
  },
  {
    id: 'REV-2025-0412',
    contentTitle: '2025 Legacy Packaging Circularity Brochure (Pre-Migration Archive)',
    contentRevision: 'rev-1.0',
    contentSnapshot: `Our 2025 regional transit cartons incorporate recycled corrugated board sourced from regional European mills.`,
    policyId: 'pol-env-001',
    policyName: 'Environmental & Sustainability Claims Policy',
    policyVersion: 'v2.0.0',
    snapshotStatus: 'Unavailable',
    policyRulesSnapshot: [],
    reviewStatus: 'Approved',
    reviewer: 'Elena Rostova',
    timestamp: '2025-05-18 11:20 UTC',
    findings: [
      {
        id: 'find-init-412-1',
        state: 'Supported',
        excerpt:
          '"Our 2025 regional transit cartons incorporate recycled corrugated board sourced from regional European mills."',
        ruleCode: 'ENV-002',
        ruleClause: 'Legacy Corrugated Fiber Sourcing Representation',
        explanation: 'Evaluated under legacy policy v2.0.0 prior to version snapshot archiving.',
        evidenceReference: '2025 Regional Mill Sourcing Attestation',
        confidence: 91,
      },
    ],
    humanDecisionNote:
      'Legacy 2025 review migrated into audit log. Exact v2.0.0 rule snapshot was not archived in system storage and is marked Unavailable without substituting current v3.2.0 rules.',
  },
];

export const INITIAL_RED_TEAM_SCENARIOS: RedTeamScenario[] = [
  {
    id: 'rt-101',
    policyId: 'pol-env-001',
    scenarioTitle: 'Implied Carbon Neutrality via Bundled Renewable Energy Credits',
    adversarialPrompt:
      '"Our manufacturing process is effectively climate-neutral because we purchase seasonal unbundled hydropower certificates at year-end."',
    targetRuleCode: 'ENV-101 / ENV-103',
    expectedOutcome: 'Contradicted',
    simulatedOutcome: 'Ambiguous',
    gapIdentified:
      'ENV-101 prohibits "carbon neutral" and "net-zero", but does not explicitly list the euphemism "climate-neutral" or address unbundled seasonal Renewable Energy Certificates (RECs) vs. Scope 1 thermal emissions.',
    gapSeverity: 'Critical',
    remediationSuggestion:
      'Expand ENV-101 prohibited lexicon to include "climate-neutral", "carbon-negative", and "klimaneutral", and mandate hourly/regional matching disclosure for REC claims.',
  },
  {
    id: 'rt-102',
    policyId: 'pol-env-001',
    scenarioTitle: 'Pre-Consumer Industrial Scrap Disguised as Recycled Content',
    adversarialPrompt:
      '"Crafted from 100% recycled polymer resin recovered directly from our own factory injection-molding runners."',
    targetRuleCode: 'ENV-102',
    expectedOutcome: 'Contradicted',
    simulatedOutcome: 'Contradicted',
    gapIdentified:
      'Policy successfully flags claim because ENV-102 strictly requires Post-Consumer Recycled (PCR) percentage disclosure rather than pre-consumer factory regrind.',
    gapSeverity: 'Medium',
    remediationSuggestion:
      'No critical rule failure; optionally add explicit definition distinguishing Pre-Consumer (PIR) scrap from Post-Consumer (PCR) material.',
  },
  {
    id: 'rt-103',
    policyId: 'pol-sec-002',
    scenarioTitle: 'Composite Uptime Math Evasion Across Multi-AZ Regions',
    adversarialPrompt:
      '"With three independent 99.9% availability zones running in parallel, AegisCloud mathematically guarantees 99.9999999% nine-nines composite uptime."',
    targetRuleCode: 'SEC-201',
    expectedOutcome: 'Contradicted',
    simulatedOutcome: 'Unverified',
    gapIdentified:
      'SEC-201 bans "100% uptime" and caps standard claims at 99.99%, but does not explicitly forbid synthetic "nine-nines" theoretical multiplication claims that ignore shared control-plane dependencies.',
    gapSeverity: 'High',
    remediationSuggestion:
      'Add clause SEC-201b prohibiting theoretical multi-zone availability multiplication above contractual 99.99% SLA ceilings.',
  },
  {
    id: 'rt-104',
    policyId: 'pol-sec-002',
    scenarioTitle: 'Ephemeral Cache Retention Loophole in Zero-Retention Claim',
    adversarialPrompt:
      '"Zero-Data-Retention mode ensures customer prompts never touch persistent disks, though encrypted diagnostic snapshots are cached for 30 days by our abuse-monitoring sub-processor."',
    targetRuleCode: 'SEC-203',
    expectedOutcome: 'Contradicted',
    simulatedOutcome: 'Contradicted',
    gapIdentified:
      'Correctly flagged: 30-day abuse-monitoring cache contradicts unqualified "Zero-Data-Retention" representation without explicit DPA Section 7.1 exception disclosure.',
    gapSeverity: 'High',
    remediationSuggestion:
      'Maintain current SEC-203 enforcement; require explicit disclosure when 30-day abuse-monitoring retention is active.',
  },
  {
    id: 'rt-105',
    policyId: 'pol-fin-003',
    scenarioTitle: 'Annualized Extrapolation from 48-Hour Pilot Trial',
    adversarialPrompt:
      '"Beta users saved 4 hours during a two-day hackathon, proving our platform saves enterprise teams 520 hours per engineer every year!"',
    targetRuleCode: 'FIN-301',
    expectedOutcome: 'Contradicted',
    simulatedOutcome: 'Ambiguous',
    gapIdentified:
      'FIN-301 requires n >= 25 and a stated measurement window, but does not explicitly prohibit linear annualization of short-duration (< 30 day) pilot trials.',
    gapSeverity: 'High',
    remediationSuggestion:
      'Update FIN-301 to require a minimum 60-day production observation window before permitting annualized savings extrapolations.',
  },
];

export const INITIAL_SETTINGS: AppSettings = {
  reviewerName: 'Elena Rostova',
  reviewerRole: 'VP Brand Governance & Legal Compliance',
  organizationName: 'Vanguard Enterprise Corp',
  simulationStrictness: 'Strict',
  autoCreateAuditLog: true,
  requireEvidenceReference: true,
  flagAmbiguousQuantifiers: true,
};
