# Phase 1: Niche Validation - Research

**Researched:** 2026-03-10
**Domain:** Niche selection methodology, B2B market research (Brazil), demand validation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Candidate Selection**
- Start from zero — no pre-selected niches, research identifies candidates
- Shortlist of exactly 3 niches to compare before deciding
- Primary filter for initial candidates: capacity to pay (R$5k-38k setup + recurring)
- No exclusions — any niche is fair game as long as it passes the gate criteria
- Geographic scope: Brazil-wide (remote delivery via WhatsApp + Zoom)

**Evaluation Method**
- Two-stage evaluation: Go/No-go gate first, then matrix ranking for survivors
- Go/No-go gate criteria (ALL must pass):
  - Capacity to pay setup + recurring fees
  - Visible operational bottleneck that AI resolves
  - Repetitive processes that can be automated
  - Niche already uses WhatsApp as primary communication channel
  - Additional criteria at Claude's discretion based on business model
- Ranking method: Visual 2x2 matrix
  - X-axis: Growth/revenue potential
  - Y-axis: Ease of entry (access, complexity, competition)
  - Ideal niche: top-right quadrant (high potential + easy entry)
- Single output document with gate results, matrix, and final ranking

**Market Research**
- Deep research level: 2-3 days per niche candidate
- All available sources: Google Trends, IBGE/government data, LinkedIn, Apollo
- AI executes the research autonomously; user reviews results and makes final decision
- Research covers: volume of businesses (CNAE), average revenue, competition landscape, WhatsApp usage patterns, operational pain points

**Demand Validation**
- Find decision-makers through personal network first
- Objective: validate the pain — confirm the bottleneck is real and worth paying to solve
- Structured script with 8-10 key questions mapping pain, current process, and willingness to pay
- Format: video calls (Zoom/Google Meet), 30-45 minutes each
- Validation threshold: 3 out of 5 decision-makers confirm the pain = niche validated
- If fewer than 3 confirm: niche fails validation, move to next candidate

### Claude's Discretion
- Additional Go/No-go gate criteria beyond the 4 user-specified ones
- Specific research methodology and data aggregation approach
- Script question design for validation conversations
- How to structure the final comparison document
- Criteria weighting within the matrix dimensions

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NICH-01 | User can evaluate niches against criterios validados (capacidade de pagamento, repeticao de processos, potencial de crescimento, gargalo visivel, barreiras de entrada) | Go/No-go gate + 2x2 matrix methodology documented in Architecture Patterns section |
| NICH-02 | User can pesquisar volume e dimensao do nicho usando ferramentas gratuitas (IBGE, Google Trends, LinkedIn, Apollo) | Data source guide documented in Standard Stack section — free tiers confirmed |
| NICH-03 | User can mapear a jornada do cliente do nicho identificando pontos de friccao e potencial para IA | Customer journey mapping pattern and friction taxonomy in Architecture Patterns |
| NICH-04 | User can identificar gaps reais do nicho (gap de oferta, gap de resultado, gap de experiencia) | Three-gap framework documented in Architecture Patterns with detection methods |
| NICH-05 | User can validar demanda com 5 conversas reais com decisores | Full validation script template and success criteria in Code Examples section |
</phase_requirements>

---

## Summary

Phase 1 is a pure methodology + market research phase — no code, no technical stack. The goal is to produce one validated niche with documented evidence across five dimensions: evaluation criteria scoring, market size data, customer journey friction map, gap analysis, and 5 real decision-maker conversations. The "sell first, build later" model means this phase doubles as early intelligence for Phases 2 (Revenue Model) and 3 (Sales System).

Brazil is the world's largest WhatsApp market with approximately 10 million businesses using WhatsApp Business and 92% population penetration. This makes the WhatsApp adoption filter highly discriminating: nearly any B2B service sector in Brazil passes it, so it should be treated as a baseline, not a differentiator. The real filters are payment capacity and operational bottleneck visibility.

The most promising niche clusters for the AI-First OS model in Brazil (based on research) are: healthcare/aesthetic clinics, law firms, real estate agencies, and accounting firms. These four sectors share the same profile: process-heavy operations, high volume of repetitive client communication, decision-makers accessible via personal networks, and established willingness to pay for software/service solutions. The planner should structure tasks to research all candidate clusters before the user makes the Go/No-go call.

**Primary recommendation:** Build the phase as three sequential waves — (1) candidate identification and Go/No-go gate, (2) deep-dive research + matrix ranking for survivors, (3) demand validation conversations. Each wave has a clear decision gate before the next wave starts.

---

## Standard Stack

### Research Tools (Free Tier)

| Tool | Access | Purpose | Data Available |
|------|--------|---------|----------------|
| IBGE CEMPRE/SIDRA | Free at sidra.ibge.gov.br | Company volume by CNAE sector | Count of firms, employees, revenue by sector |
| IBGE Pesquisa Anual de Servicos | Free at ibge.gov.br | Revenue benchmarks by service sector | Average revenue, cost structure per CNAE |
| Google Trends | Free at trends.google.com.br | Demand trend signals | Search interest over time by region, category |
| Apollo.io | Free tier: 10 export credits/month | Decision-maker prospecting, company data | Contact info, company size, industry, revenue |
| LinkedIn free | Free (personal account) | Niche size estimation, decision-maker access | Professional profiles, company pages, job postings |
| LinkedIn Sales Navigator | 30-day free trial | Advanced prospecting filters | Role-based filters, company size, industry |

### Supporting References

| Source | Purpose | Access |
|--------|---------|--------|
| CNAE lookup (concla.ibge.gov.br) | Map niche to CNAE code for IBGE queries | Free |
| SEBRAE sector reports | SMB context, barriers, average revenue | Free (sebrae.com.br) |
| Google Maps + Reviews | Niche density in target cities, operational pain signals | Free |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Apollo.io free | Hunter.io free | Hunter focuses on email finder; Apollo has richer company data |
| IBGE SIDRA | Receita Federal CNPJ API | CNPJ API gives raw counts but less structured by sector |
| LinkedIn organic | ZoomInfo | ZoomInfo costs money; LinkedIn + Apollo free covers 80% of need |

---

## Architecture Patterns

### Recommended Phase Structure

```
Wave 1: Candidate Identification + Go/No-go Gate
├── Task 1.1: Initial candidate generation (AI + user input)
├── Task 1.2: Go/No-go gate scoring for each candidate
└── Task 1.3: Gate decision — select 3 survivors to rank

Wave 2: Deep Research + Matrix Ranking
├── Task 2.1: IBGE/CNAE market size research per niche
├── Task 2.2: Google Trends + LinkedIn competition analysis per niche
├── Task 2.3: Apollo prospecting — map decision-maker landscape per niche
├── Task 2.4: Customer journey mapping + friction identification per niche
├── Task 2.5: Three-gap analysis per niche
└── Task 2.6: 2x2 matrix ranking — produce comparison document + recommendation

Wave 3: Demand Validation
├── Task 3.1: Build validation conversation list (personal network first)
├── Task 3.2: Execute 5 validation calls using structured script
├── Task 3.3: Score results against 3/5 threshold
└── Task 3.4: Final niche declaration + evidence document
```

### Pattern 1: Go/No-go Gate (5-Criteria Binary Filter)

**What:** Each candidate niche must pass ALL five criteria to advance. Any NO = eliminated.

**When to use:** Before investing 2-3 days of deep research per niche.

**Gate criteria (all must be YES):**
```
1. Payment capacity: Does a typical business in this niche realistically pay R$5k-38k setup + R$1-3k/month?
   Evidence: Look at software they already pay for (e.g., clinics pay R$500-2k/mo for clinic management software)

2. Visible operational bottleneck: Is there a named, recurring problem that insiders complain about publicly?
   Evidence: Forum posts, LinkedIn comments, Google review patterns mentioning wait times/errors/manual work

3. Process repetition: Are there at least 3 daily/weekly processes that follow the same steps?
   Evidence: List the processes — scheduling, follow-up, intake, billing, reporting, etc.

4. WhatsApp as primary channel: Do businesses in this niche already use WhatsApp to talk to clients?
   Evidence: Google "whatsapp [niche] atendimento" — how many results show it as standard?

5. (Claude's discretion) Accessible decision-makers: Can you reach the owner/manager directly?
   Evidence: LinkedIn search shows owners with direct profiles, not gated by assistants
```

### Pattern 2: 2x2 Matrix Ranking

**What:** Visual comparison of 3 niche survivors on two axes. Forces a clear top-right winner.

**Axes:**
- X-axis (horizontal): Revenue/growth potential (market size × average ticket × replication ease)
- Y-axis (vertical): Ease of entry (personal network access, competition density, decision-maker approachability)

**Scoring per axis (1-5 scale):**
```
Revenue potential score = (market size points) + (avg ticket points) + (replication points)
  - Market size: >100k firms = 5, 50-100k = 4, 20-50k = 3, 10-20k = 2, <10k = 1
  - Avg ticket potential: R$38k setup possible = 5, R$20-38k = 4, R$10-20k = 3, R$5-10k = 2
  - Replication ease: Same playbook works for 100s = 5, needs heavy customization = 1

Ease of entry score = (network access) + (competition density) + (decision-maker approachability)
  - Network access: User has 5+ contacts = 5, 2-4 = 3, 0-1 = 1
  - Competition: Few AI-First competitors = 5, many = 1
  - Decision-maker: Owner decides alone = 5, committee needed = 1
```

**Output:** Named quadrant positions + recommendation for top-right candidate.

### Pattern 3: Customer Journey Map (3-Column Format)

**What:** Maps the niche customer experience from first contact to result — identifies friction points where AI creates measurable value.

**Format:**
```
Stage → Current Process → Friction Point → AI Opportunity

Example (clinic):
Scheduling    | Patient calls or WhatsApp manually | 30-60 min/day staff time, missed calls | 24/7 automated scheduling bot
First contact | Manual qualification call | High no-show rate (30-40%) for unqualified | AI pre-qualification script
Follow-up     | Manual WhatsApp message | Irregular, forgotten, no tracking | Automated sequence based on appointment status
Billing       | Manual invoice + chase | Late payment, staff time | Automated reminder sequence
```

**Minimum output:** 3+ friction points where the problem is measurable (time wasted, revenue lost, complaints visible).

### Pattern 4: Three-Gap Analysis

**What:** Maps the space between what the niche currently has and what it needs. Gaps justify the offer.

| Gap Type | Definition | Detection Method | Evidence Standard |
|----------|-----------|------------------|-------------------|
| Offer Gap | No solution exists that does X for this niche | Search "[problem] solucao [nicho] brasil" — few/no results | 3+ searches with weak results |
| Result Gap | Solutions exist but don't deliver the promised result | Google reviews of competitors, LinkedIn complaints, forum posts | 5+ negative reviews mentioning unmet expectations |
| Experience Gap | Solutions work but the experience is painful | NPS data, app store reviews, user forum posts | Pattern of "it works but..." complaints |

**Output:** 2+ identified gaps with supporting evidence (screenshots, review quotes, search result summaries).

### Pattern 5: Validation Conversation Structure

**What:** 30-45 minute Zoom/Meet call with a real decision-maker. Goal: confirm pain is real, current process is broken, and they would pay to fix it.

**Stage structure:**
```
Opening (5 min): Context, permission to ask questions, no sales agenda
Current state (10 min): Walk me through how you handle [process X] today
Pain exploration (10 min): What breaks down? What costs you most time/money?
Impact quantification (5 min): What does this cost you per month in [time/revenue/stress]?
Prior attempts (5 min): Have you tried to solve this? What happened?
Closing (5 min): If you could fix this, what would ideal look like?
```

**Scoring per conversation:**
```
CONFIRMS (counts toward 3/5):
- Unprompted names the bottleneck you identified in research
- Quantifies the cost (time or money) without being prompted
- Has tried to solve it before (shows urgency)

DOES NOT CONFIRM:
- Vague acknowledgment ("yeah that could be better")
- No personal experience with the problem
- Problem exists but owner does not care ("my staff handles it")
```

### Anti-Patterns to Avoid

- **Confirmation bias research:** Searching for evidence a niche is good rather than evidence it passes the gate. Force yourself to find a reason to REJECT each candidate first.
- **Sample size shortcuts:** One enthusiastic conversation is not validation. Three of five must confirm, not three of three.
- **Proxy pain instead of real pain:** Decision-maker says "my team is overwhelmed" but the decision-maker personally does not feel the pain — this is weak validation.
- **Skipping market size:** Going straight to validation conversations without checking if the niche has enough businesses to build a recurring business (need 200+ total addressable clients in Brazil minimum).
- **Niche too broad:** "Saude" is not a niche. "Clinicas de estetica com 2-10 profissionais" is a niche.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Company volume by sector | Manual counting / web scraping | IBGE SIDRA + CEMPRE | IBGE has structured CNAE counts for every sector; free and authoritative |
| Demand trend analysis | Manual search aggregation | Google Trends export + CSV | Trends gives normalized interest over time; exportable to CSV for comparison |
| Decision-maker prospecting | Manual LinkedIn searching | Apollo.io free (10 exports/month) | Apollo aggregates LinkedIn + web data; filters by role, industry, company size |
| Competitor landscape | Manual search | Apollo company search + Google | Apollo shows who's funded, what software they buy; supplement with Google |
| Validation script | Generic questions | Structured JTBD-based script (provided in Code Examples) | Generic questions get generic answers; JTBD script pulls out jobs-to-be-done and pain specificity |

**Key insight:** Every research tool needed for this phase has a free tier that covers the volume required (3 niches × 2-3 days research). Don't pay for tools until after the niche is validated and the first client is secured.

---

## Common Pitfalls

### Pitfall 1: Researching Niches You Already Like

**What goes wrong:** Confirmation bias leads to selecting a niche that "feels right" rather than one that passes the gate. Evidence is cherry-picked to support the pre-conclusion.

**Why it happens:** The decision-maker (user) often has prior exposure to certain sectors and unconsciously favors them.

**How to avoid:** Run the Go/No-go gate before any ranking. Apply the gate scoring to ALL candidates equally, including favorites. The gate is binary — if it fails one criterion, it's out regardless of how good it looks on other dimensions.

**Warning signs:** Research produces only positive findings; competitor analysis is skipped or thin.

### Pitfall 2: Mistaking WhatsApp Usage for WhatsApp Pain

**What goes wrong:** "They use WhatsApp" is treated as a pain point rather than a baseline. The real question is: "Is their current WhatsApp workflow broken?"

**Why it happens:** WhatsApp adoption in Brazil is near-universal among SMBs (80%+), so it's an easy box to check without depth.

**How to avoid:** Qualify not just "do they use WhatsApp" but "how much staff time goes into managing WhatsApp daily, and what breaks?"

**Warning signs:** Gate passes on WhatsApp criterion with no evidence of broken workflow.

### Pitfall 3: Validation Conversations That Confirm Nothing

**What goes wrong:** 5 conversations happen, all are "positive," but none confirm the specific bottleneck. User counts them as validation.

**Why it happens:** Decision-makers are polite. They agree with most statements. "Yes, that could be better" feels like confirmation but is not.

**How to avoid:** Apply the scoring rubric strictly (see Pattern 5 above). Count only conversations where the bottleneck is named UNPROMPTED or where the pain is quantified without being prompted. Polite agreement does not count.

**Warning signs:** All 5 conversations are described as "great" but notes show no specific pain data.

### Pitfall 4: IBGE Data Misuse

**What goes wrong:** IBGE CEMPRE data shows company counts but researcher confuses legal entities with real operating businesses in the niche. A CNAE code may include holding companies, dormant firms, or micro-entrepreneurs.

**Why it happens:** IBGE CEMPRE counts all registered firms; many are inactive or too small to be target clients.

**How to avoid:** When pulling CNAE company counts, filter by: size (Pessoal Ocupado >= 5), segment carefully (avoid broad CNAE codes). Cross-reference with SEBRAE sector data for "effective addressable market" estimates.

**Warning signs:** CNAE search returns implausibly large numbers (e.g., "500k clinics in Brazil").

### Pitfall 5: Market Research Without Buyer Profile Clarity

**What goes wrong:** Research confirms "large market" but doesn't identify WHO the buyer is, HOW the buying decision is made, or WHAT their budget cycle looks like.

**Why it happens:** Volume research (how many firms) is easier than buyer profile research.

**How to avoid:** For every niche, document: typical firm size (employees/revenue), who decides (owner vs. manager vs. committee), how they buy software/services (B2B vs. direct), and typical monthly spend on operational tools.

**Warning signs:** Research document has company count but no buyer profile section.

---

## Code Examples

### Validation Conversation Script (8-10 Questions)

```
PRE-CALL SETUP
- Inform the contact: "I'm researching how [niche] businesses handle [process X].
  30 minutes, I have a few questions, no sales pitch."

OPENING (questions 1-2)
Q1: "Walk me through a typical week in your business — what takes up most of your and your team's time?"
  → Listen for: process names, staff time mentions, recurring frustrations

Q2: "When you think about [specific process identified in research], how does that work today?"
  → Forces them to describe the process in their own words

PAIN EXPLORATION (questions 3-5)
Q3: "What part of that process causes the most headaches?"
  → Listen for: the specific bottleneck. If they name it unprompted = strong signal.

Q4: "How much time does your team spend on [named process] per week, roughly?"
  → Forces quantification. Even rough estimates are valuable.

Q5: "Has this ever cost you a client or caused a complaint? What happened?"
  → Specific incidents reveal severity of the pain.

PRIOR ATTEMPTS (questions 6-7)
Q6: "Have you tried any tools or solutions to improve this? What happened?"
  → If they've tried and failed = very high urgency. If they haven't tried = low urgency.

Q7: "Why didn't that work?"
  → Reveals what a better solution needs to do differently.

IMPACT + OPPORTUNITY (questions 8-10)
Q8: "If you could solve this completely, what would change in your business?"
  → Reveals the valued outcome — use this as the basis for the pitch in Phase 3.

Q9: "What would it be worth to you to have that fixed — in time saved, revenue, or peace of mind?"
  → Willingness to pay probe. Don't anchor with a number first.

Q10: "Who else in your network deals with this same challenge?"
  → Warm referrals for the other 4 conversations.

SCORING AFTER CALL:
- Named bottleneck unprompted? YES/NO
- Quantified cost (time or money)? YES/NO
- Prior failed attempt? YES/NO
- If 2+ of 3 = CONFIRMS. If 1 or 0 = DOES NOT CONFIRM.
```

### Go/No-go Gate Scoring Sheet

```
NICHE: [name]
Date evaluated: [date]
Evaluated by: [who]

CRITERION 1 — Payment capacity
Evidence: [what software/services they already pay for + estimated monthly spend]
Verdict: PASS / FAIL
Notes:

CRITERION 2 — Visible operational bottleneck
Evidence: [source URL + quote or summary]
Verdict: PASS / FAIL
Notes:

CRITERION 3 — Repetitive processes (list at least 3)
Process 1:
Process 2:
Process 3:
Verdict: PASS / FAIL

CRITERION 4 — WhatsApp as primary channel
Evidence: [search result or known fact]
Broken workflow evidence: [how it breaks down]
Verdict: PASS / FAIL

CRITERION 5 — Accessible decision-makers
Evidence: [LinkedIn search result: X owners with direct profiles in this niche]
Personal network contacts: [number]
Verdict: PASS / FAIL

GATE RESULT: ADVANCE / ELIMINATE
(Any FAIL = ELIMINATE)
```

### IBGE Market Size Research Template

```
NICHE: [name]
CNAE CODE(S): [code] — [description]
Source: IBGE SIDRA / CEMPRE

Raw data pulled:
- Total registered firms: [number]
- Firms with 5+ employees: [number]  ← target addressable market
- Firms with 10+ employees: [number] ← ideal client profile
- States with highest concentration: [list top 3]

Revenue benchmark:
- Source: IBGE Pesquisa Anual de Servicos OR SEBRAE report
- Average annual revenue range: R$[X] to R$[Y]
- Estimated average monthly revenue: R$[Z]

Capacity to pay estimate:
- Current software spend (typical): R$[X]/month
  (source: known tools in this niche, e.g., clinic management = R$500-2k/mo)
- Implied budget for new solutions: R$[X-Y]/month
- Setup budget capacity: R$[X-Y] (one-time)
```

### 2x2 Matrix Scoring Template

```
NICHE COMPARISON — 2x2 MATRIX

                    │ LOW ENTRY EASE    │ HIGH ENTRY EASE
────────────────────┼───────────────────┼──────────────────
HIGH REVENUE        │   HARD WINS       │   IDEAL TARGETS  ←
POTENTIAL           │ (investigate)     │ (pursue these)
────────────────────┼───────────────────┼──────────────────
LOW REVENUE         │   AVOID           │   QUICK STARTS
POTENTIAL           │                   │ (fallback only)

SCORING PER NICHE:

Niche A: [name]
  Revenue potential: [1-5] — reasoning: [...]
  Ease of entry: [1-5] — reasoning: [...]
  Quadrant: [name]

Niche B: [name]
  Revenue potential: [1-5] — reasoning: [...]
  Ease of entry: [1-5] — reasoning: [...]
  Quadrant: [name]

Niche C: [name]
  Revenue potential: [1-5] — reasoning: [...]
  Ease of entry: [1-5] — reasoning: [...]
  Quadrant: [name]

RECOMMENDATION: Niche [X] — top-right quadrant with score [X/10]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Market research = surveys | Conversational validation (5 real calls) | Lean Startup era (2011-now) | Eliminates false positives from survey bias |
| Validate with ads (R$100-200) | Validate with conversations first, then ads if needed | ~2018 in B2B context | Ad validation works for B2C; B2B validation is conversation-first |
| Niche = demographic segment | Niche = specific operational problem in a sector | Jobs-to-be-Done framework | Tighter problem = stronger positioning = easier sales |
| Research then decide | Decide gate criteria first, then research | Lean/scientific method | Prevents post-hoc rationalization |

**Note on NICH-05:** The original requirement mentions "validar demanda com anuncio de R$100-200 e 5 conversas reais." The CONTEXT.md (locked decision) specifies conversations only (no ad spend). The ad option is available as a fallback if conversation access proves impossible, but is not the primary method. The planner should plan for conversations as the default, noting the ad option as a branch path.

---

## Open Questions

1. **Personal network reach in chosen niche**
   - What we know: User should start with personal network first (locked decision)
   - What's unclear: User's network coverage across the 4 candidate niche clusters (clinics, law firms, real estate, accounting) is unknown
   - Recommendation: Include a pre-task in Wave 1 that maps personal network contacts by niche before committing to the shortlist of 3. If network is thin in one niche, that reduces Ease of Entry score significantly.

2. **Optimal candidate niches to research**
   - What we know: Research identifies that clinics, law firms, real estate, and accounting firms all match the profile; multiple B2R sources confirm these as high-AI-opportunity sectors in Brazil 2025
   - What's unclear: Which 3 of the ~4-6 viable candidates should form the shortlist before Go/No-go gate
   - Recommendation: The planner should include a candidate generation task (Task 1.1) before the gate. Claude generates ~6-8 candidates with brief reasoning; user reviews and picks the 3-5 to gate. This preserves user agency while using AI for the initial scan.

3. **Validation call scheduling velocity**
   - What we know: 5 calls needed, 30-45 min each, personal network first
   - What's unclear: How quickly 5 qualified contacts can be scheduled varies by user's network and niche
   - Recommendation: Wave 3 tasks should include a fallback path — if 5 calls cannot be scheduled within 7 days from personal network, expand to cold outreach via LinkedIn/Apollo.

---

## Validation Architecture

### Test Framework (for this phase)

This phase produces no code — there is no automated test suite. "Validation" here means human verification that the methodology was followed correctly.

| Property | Value |
|----------|-------|
| Framework | Manual checklist review |
| Config file | none |
| Quick check | Review Gate Scoring Sheet completeness for each niche |
| Full suite | Review all 4 artifacts: gate sheets, IBGE data, gap analysis, conversation notes |

### Phase Requirements → Verification Map

| Req ID | Behavior | Verification Type | Command / Method | Artifact Exists? |
|--------|----------|-------------------|------------------|-----------------|
| NICH-01 | 3 niches scored on 5 criteria with pass/fail | Manual review | Check gate scoring sheet has all 5 criteria with evidence | Wave 1 output |
| NICH-02 | Market size from IBGE, Google Trends, LinkedIn, Apollo | Manual review | Check research doc has data from at least 3 of 4 sources per niche | Wave 2 output |
| NICH-03 | Customer journey mapped with 3+ friction points | Manual review | Check journey map has 3+ rows with measurable friction | Wave 2 output |
| NICH-04 | 2+ gaps identified with evidence | Manual review | Check gap analysis has 2+ entries with source citations | Wave 2 output |
| NICH-05 | 5 real conversations, 3+ confirm pain | Manual review | Check call notes and scoring — count CONFIRMS vs NOT CONFIRMS | Wave 3 output |

### Wave 0 Gaps (setup before work begins)

- [ ] Create output folder `.planning/phases/01-niche-validation/outputs/` to store all artifacts
- [ ] Prepare gate scoring sheet template (see Code Examples) as a reusable file
- [ ] Prepare validation conversation script as a reference file
- [ ] Map user's personal network contacts by sector (input to Task 1.1)

None — no code infrastructure needed. All gaps are document templates to be created in Wave 0 of the plan.

---

## Sources

### Primary (HIGH confidence)
- IBGE CEMPRE — empresa counts by CNAE, data structure verified at sidra.ibge.gov.br
- IBGE Pesquisa Anual de Servicos — revenue benchmarks by sector, verified at ibge.gov.br
- Apollo.io official — free tier features confirmed (10 export credits/month, unlimited email credits)
- WhatsApp Business Statistics 2025 (WAPIkit) — Brazil 10M businesses, 92% penetration confirmed

### Secondary (MEDIUM confidence)
- ChatGPT Brasil article (April 2025) — 5 urgent AI automation niches in Brazil; corroborated by multiple independent sources naming same sectors
- Aurora Inbox (March 2026) — Latin America WhatsApp Business adoption by country; Brazil as leader confirmed by multiple sources
- Lean B2B Book (leanb2bbook.com) — B2B validation methodology; Willingness to Pay testing methodology
- Educacional Web — confirms clinics/health/real estate as active WhatsApp AI automation buyers in Brazil

### Tertiary (LOW confidence)
- Individual sector revenue figures (R$5k-38k setup range) — derived from A360/Kelvin framework referenced in CONTEXT.md; not independently verified with public data; treat as hypothesis to be tested in validation calls

---

## Metadata

**Confidence breakdown:**
- Standard stack (research tools): HIGH — all tools verified, free tiers confirmed
- Architecture patterns (methodology): HIGH — based on established lean validation + JTBD frameworks
- Candidate niches (clinics, law, real estate, accounting): MEDIUM — multiple corroborating sources but not exhaustive; planner should not pre-lock to these 4
- Pricing capacity (R$5k-38k): LOW — sourced from framework reference in CONTEXT.md; must be confirmed in validation calls

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (Brazilian market data is stable; methodology is evergreen)
