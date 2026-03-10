# Phase 1: Niche Validation - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Identify and validate ONE niche to build the AI-First OS business in. Output: a single niche chosen with documented evidence it passes the buying readiness test (5 criteria). No technical work — this is pure methodology and research.

</domain>

<decisions>
## Implementation Decisions

### Candidate Selection
- Start from zero — no pre-selected niches, research identifies candidates
- Shortlist of exactly 3 niches to compare before deciding
- Primary filter for initial candidates: capacity to pay (R$5k-38k setup + recurring)
- No exclusions — any niche is fair game as long as it passes the gate criteria
- Geographic scope: Brazil-wide (remote delivery via WhatsApp + Zoom)

### Evaluation Method
- Two-stage evaluation: Go/No-go gate first, then matrix ranking for survivors
- **Go/No-go gate criteria (ALL must pass):**
  - Capacity to pay setup + recurring fees
  - Visible operational bottleneck that AI resolves
  - Repetitive processes that can be automated
  - Niche already uses WhatsApp as primary communication channel
  - Additional criteria at Claude's discretion based on business model
- **Ranking method:** Visual 2x2 matrix
  - X-axis: Growth/revenue potential
  - Y-axis: Ease of entry (access, complexity, competition)
  - Ideal niche: top-right quadrant (high potential + easy entry)
- Single output document with gate results, matrix, and final ranking

### Market Research
- Deep research level: 2-3 days per niche candidate
- All available sources: Google Trends, IBGE/government data, LinkedIn, Apollo
- AI executes the research autonomously; user reviews results and makes final decision
- Research covers: volume of businesses (CNAE), average revenue, competition landscape, WhatsApp usage patterns, operational pain points

### Demand Validation
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

</decisions>

<specifics>
## Specific Ideas

- Model inspired by A360/Accelera360 (Kelvin) — ecosystem of 300+ entrepreneurs building vertical AI infrastructures
- Reference Miro board "Webinar 12h - AI First OS" has the complete framework for niche selection, gap analysis, offer, funnel, implementation, recurrence
- "Sell first, build later" — validation conversations double as early market sensing for Phase 2 (Revenue Model) and Phase 3 (Sales System)
- User profile: strong in business/sales, non-technical, learns by doing — research outputs must be actionable, not academic

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- No codebase exists yet — this is Phase 1 of a greenfield project
- AIOX Framework available at D:\workspace\ for agent orchestration during research

### Established Patterns
- No established patterns — first phase

### Integration Points
- Research outputs feed directly into Phase 2 (Revenue Model) — niche profile determines pricing structure
- Validation conversations inform Phase 3 (Sales System) — pain points become pitch ammunition
- Niche choice determines ALL technical work in Phases 4-8 (chatbot logic, CRM fields, n8n workflows, dashboard KPIs)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-niche-validation*
*Context gathered: 2026-03-10*
