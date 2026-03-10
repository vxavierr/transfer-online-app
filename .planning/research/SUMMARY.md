# Project Research Summary

**Project:** AI-First OS — Business Transformation Service (mindo-gsd)
**Domain:** AI Automation Agency / Productized Service Business for Brazilian SMBs
**Researched:** 2026-03-10
**Confidence:** HIGH

## Executive Summary

This is a productized service business — not a SaaS product, not a consulting firm. The model is: pick one vertical niche, build a replicable AI automation blueprint for that niche, sell setup engagements (R$5k-38k), and convert them to recurring retainers. The non-technical founder uses AIOX + Claude Code as the dev team, which fundamentally changes the economics. The entire automation stack runs on a Hetzner VPS (~€6/mo) using Docker Compose: n8n 2.0 as the automation engine, Evolution API for WhatsApp, Typebot for chatbot flows, and Metabase for client-facing dashboards. Cloud costs (Supabase Pro + Kommo CRM) add ~$55-70/mo per client — margin-positive against any R$1,500+ monthly retainer.

The recommended approach is ruthlessly sequential: niche first, then sandbox build, then first sale. The "sell first, build later" model only works if the founder has a working prototype before the sales call — not after signing. The methodology track (how you sell and onboard) and the technical delivery track (what you actually build) must be developed in parallel. Neglecting either collapses the model. The MVP combination — WhatsApp AI chatbot + lead qualification automation + KPI dashboard + human handoff protocol — is sufficient to close the first deal and deliver it within 30 days.

The biggest risk is not technical: it is strategic drift. Three pitfalls destroy the business before it gains momentum — picking a niche with curiosity but not buying readiness, customizing the delivery for each client instead of replicating a blueprint, and building recurrence on maintenance fees instead of visible monthly value delivery. The technical infrastructure is straightforward and well-documented. The business model discipline is what separates agencies that scale from those that collapse after 3 clients.

---

## Key Findings

### Recommended Stack

The stack is organized in 9 layers, all designed for a non-technical founder operating with near-zero budget until the first client pays. The core principle: self-hosted open-source tools on a single VPS, with cloud services only where self-hosting creates unacceptable operational risk.

See full details: `.planning/research/STACK.md`

**Core technologies:**
- **n8n 2.0 (self-hosted, Hetzner VPS):** Automation engine — all workflows, AI agent nodes, integrations. Free on self-hosted. 400+ integrations, native AI agent nodes. No per-execution billing.
- **Evolution API v2 (self-hosted):** WhatsApp connection layer — free, Docker-native, Brazilian-born, integrates natively with n8n. Use for all clients until volume exceeds 1,000 conversations/month or Meta compliance is required.
- **Typebot v3 (self-hosted):** No-code chatbot flows for WhatsApp and web. Founder can modify flows without Claude Code assistance — critical for operational independence.
- **Supabase Pro ($25/mo):** PostgreSQL database + auth + storage. CRITICAL: never use free tier for client production (projects pause after 7 days of inactivity). Share one Pro project across first 3 clients via RLS.
- **Kommo (cloud, per user):** WhatsApp-native CRM. Default for Brazilian SMBs. Official Meta partner. Deep n8n integration.
- **Metabase CE (self-hosted):** Client-facing business dashboards. Free forever. Connects directly to Supabase. Non-technical clients can view KPIs without touching code.
- **Chatwoot (self-hosted):** Omnichannel inbox for clients with 2+ person support teams. Deploy on same VPS.
- **Hetzner CX22 (~€6/mo):** VPS hosting all self-hosted services via Docker Compose + Caddy (auto-SSL).
- **Lovable (cloud, when needed):** Custom web interfaces and client portals. AI-generated React + Supabase apps. Use only when niche requires something beyond Typebot + Metabase.

**Do not use:** Zapier (3-5x cost), Make.com (unpredictable billing), Twilio (expensive for BR WhatsApp), Flowise (Workday acquisition, enterprise pivot), Botpress (developer-only), Bitrix24 (high UX friction).

---

### Expected Features

This business has two parallel feature tracks. Both must be built. See full details: `.planning/research/FEATURES.md`

**Must have — Methodology Track (before first sale):**
- Niche selection with 3-filter buying readiness validation
- Operational bottleneck diagnostic call script (niche-specific)
- High-ticket setup offer (R$5k-38k) with defined scope, deliverables, and timeline
- ROI calculator (even a Google Sheet) — prospects need to justify the investment
- Proposal template (not built from scratch each time)
- Client onboarding process with 48-hour kickoff checklist

**Must have — Technical Delivery Track (deliverable after first sale):**
- WhatsApp AI chatbot (customer service + lead qualification via n8n + Evolution API + LLM)
- Automated follow-up sequences (WhatsApp + email, triggered by CRM events)
- KPI reporting dashboard (Metabase connected to Supabase — leads, conversions, response times)
- Human handoff protocol (keyword/sentiment-triggered escalation to WhatsApp group or CRM task)

**Should have — Phase 2 differentiators:**
- Paid diagnostic "AI Audit" as standalone product (R$5k-15k) — converts discovery from cost to revenue
- Appointment/scheduling automation (Cal.com or Calendly integration — add if niche requires it)
- Vertical-specific knowledge base (niche-trained LLM context — reusable across clients in same vertical)
- Multi-channel automation (WhatsApp + email + SMS — add as upsell after v1 success)
- Monthly recurring value report (what the AI saved this month — retention mechanism)

**Defer to Phase 3+:**
- Revenue recovery automation (abandoned deals, unpaid invoices)
- Predictive analytics (requires 3+ months of data accumulation)
- AI-powered internal sales assistant for client's team
- Client-facing portal (SaaS-level complexity, out of scope until 5+ clients)
- Custom CRM from scratch (integrate with existing tools instead)

**Anti-features to avoid permanently:**
- Custom mobile app
- Multi-platform chatbot at v1 (WhatsApp only in Brazil — 99% penetration)
- Fully autonomous AI agents without human oversight (SMBs not ready, liability risk)
- Custom ML model training (use LLM APIs with context injection instead)

---

### Architecture Approach

Note: ARCHITECTURE.md was not produced. Architecture inferred from STACK.md and FEATURES.md.

The architecture is a hub-and-spoke model centered on n8n as the orchestration layer. n8n receives events (WhatsApp messages, CRM updates, form submissions), routes them through AI processing nodes, and triggers outputs (responses, CRM updates, dashboard data writes). Each client is isolated by instance-level separation (dedicated Evolution API instance per client number) and data-level separation (Supabase RLS policies per tenant).

**Major components:**
1. **Trigger layer** — Evolution API receives WhatsApp messages, webhooks receive form/CRM events
2. **Orchestration layer** — n8n 2.0 processes all events, applies AI logic, routes to correct output
3. **AI layer** — LLM API calls (Claude/GPT-4) with vertical-specific knowledge base injected as context
4. **Conversation layer** — Typebot manages structured conversation flows; Chatwoot manages human agent inbox
5. **Data layer** — Supabase stores all structured data (leads, conversations, metrics) with RLS per tenant
6. **Visibility layer** — Metabase connects to Supabase and renders client KPI dashboards
7. **CRM layer** — Kommo (or client's existing CRM) receives qualified leads and deal updates via n8n

The deployment unit is a single `docker-compose.yml` per VPS. Adding a new client means: provisioning a new Evolution API instance, creating a new Typebot workspace, adding a new Supabase schema/RLS policy, and cloning the n8n workflow template for that niche.

---

### Critical Pitfalls

Top 5 from research. Full details: `.planning/research/PITFALLS.md`

1. **Niche with curiosity, not buying readiness** — Validate with the 3-filter test BEFORE any marketing or build investment: (1) 3 specific problems costing real money weekly, (2) business already spends R$2k-5k/mo on other services, (3) owner can sign without committee approval. Niches that fail 2 of 3 are dealbreakers.

2. **Selling before building a prototype** — The "sell first, build later" model requires a working sandbox demo before the first real sales call. Not a slide deck — a working chatbot flow. This validates delivery time, de-risks the first client, and gives a concrete demo that closes faster. 30% of AI projects are canceled at POC stage due to escalating costs and unclear timelines.

3. **The custom development trap** — Define the productized blueprint for the niche BEFORE the first call. Every client customization is either "that's in our next tier" or "custom engagement at 3x." One divergence creates technical debt; four divergences create four incompatible systems with no shared maintenance path.

4. **Recurrence built on maintenance, not visible value** — "Ongoing support" as the recurring value proposition leads to 30-40% churn within 6 months. Design recurrence around three things: (1) monthly AI performance report showing what was saved, (2) one small optimization or new automation per month, (3) genuine integration depth that makes the system hard to abandon.

5. **AI-generated code with no human oversight** — Every module must be walked through end-to-end before client go-live. Use n8n's built-in execution logs. Test against edge cases (empty data, API timeout, auth failure). Apply the circuit breaker rule: regression in one session = new session with clean context from scratch. AI-generated code has 2.74x more security vulnerabilities than human-written code (CodeRabbit analysis, 470 PRs).

---

## Implications for Roadmap

Feature dependency chain drives the phase order: Niche → Blueprint → Sales Materials → Technical Sandbox → First Sale → Delivery → Recurrence → Playbook Maturation.

### Phase 1: Niche Validation and Business Blueprint

**Rationale:** Nothing else is buildable until the niche is locked. Every technical component, sales script, and onboarding process is niche-specific. Building before this decision means rebuilding everything. This is the #1 pitfall prevention gate.
**Delivers:** Chosen niche with documented 3-filter validation, niche bottleneck profile, competitive landscape, initial pricing hypothesis
**Addresses:** Niche selection (methodology table stakes), buying readiness validation
**Avoids:** Pitfall 4 (wrong niche), Pitfall 11 (building before niche), Pitfall 13 (premature multi-niche)
**Research flag:** LOW — niche scoring frameworks are well-documented; no deeper research needed

---

### Phase 2: Offer Design and Sales System

**Rationale:** Offer must exist before technical build begins — the blueprint defines what needs to be built. Sales materials must exist before outbound contact. This phase is pure methodology track, zero code.
**Delivers:** High-ticket setup offer (scope + deliverables + price), ROI calculator, proposal template, discovery call script with bottleneck diagnostic, LinkedIn/professional presence minimum viable
**Addresses:** High-ticket offer, ROI calculator, sales script, pitch deck (methodology table stakes)
**Avoids:** Pitfall 5 (weak recurrence), Pitfall 6 (over-promising autonomy), Pitfall 9 (competing on price), Pitfall 12 (no professional presence)
**Research flag:** LOW — productized service offer design is well-documented; use market pricing benchmarks from FEATURES.md

---

### Phase 3: Technical Sandbox Build

**Rationale:** Must exist before first sales call, not after first signed contract. Build the minimum deliverable set for the niche in a sandbox environment. Validates delivery time. Creates a live demo. De-risks the first client relationship.
**Delivers:** Working WhatsApp chatbot + lead qualification flow + basic follow-up sequence + Metabase dashboard — all wired together on a test VPS with n8n + Evolution API + Typebot + Supabase
**Uses:** Full stack blueprint from STACK.md (Hetzner + Docker Compose + n8n + Evolution API + Typebot + Supabase + Metabase)
**Avoids:** Pitfall 2 (selling before building), Pitfall 3 (AI code with no oversight), Pitfall 10 (single-point-of-failure dependency)
**Research flag:** MEDIUM — WhatsApp API integration (Evolution API + n8n) needs hands-on testing; rate limits and number behavior are known risk areas; verify current Typebot-to-Evolution API webhook bridge setup

---

### Phase 4: First Client Acquisition and Delivery

**Rationale:** First client is a learning event, not just a revenue event. Every decision in this phase should be documented for playbook inclusion. The onboarding process and scope boundary rules must be defined before this phase starts — not invented on the fly.
**Delivers:** First paying client signed, onboarded, and delivered. KPI baseline established. First case study artifact collected.
**Addresses:** Client onboarding process, KPI reporting dashboard, human handoff protocol, post-delivery check-in (technical delivery table stakes)
**Avoids:** Pitfall 1 (custom dev trap), Pitfall 7 (data quality crisis), Pitfall 8 (scope creep / endless support)
**Research flag:** LOW — standard client delivery process; data readiness audit is a mandatory onboarding step (PITFALLS.md, Pitfall 7)

---

### Phase 5: Recurring Revenue System and Playbook V1

**Rationale:** After first delivery, the recurring model must be locked. This is the moment to convert the delivery experience into a repeatable blueprint and define what recurrence actually means for the client. Without this phase, the second client costs as much as the first.
**Delivers:** Defined monthly recurring offer (visible deliverables, not just maintenance), client #1 on retainer, niche playbook v1 (documented from delivery experience), post-delivery 30/60/90 check-in templates
**Addresses:** Monthly recurring offer, post-delivery check-ins, niche playbook (methodology differentiators)
**Avoids:** Pitfall 5 (weak recurrence), Pitfall 14 (no learning capture loop)
**Research flag:** LOW — standard MSP/retainer model; value-based recurring design documented in FEATURES.md

---

### Phase 6: Scale Within Niche (Clients 2-5)

**Rationale:** With playbook v1 in hand, the goal is to reduce delivery time with each client. This is where the economics of the model begin to compound. Stay strictly in one niche. Add Phase 2 differentiators only after proving they accelerate sales (paid audit, scheduling automation, vertical knowledge base).
**Delivers:** 2-5 clients in same niche, delivery time decreasing with each, case study library, playbook v2+, potential introduction of paid AI Audit as standalone offer
**Addresses:** Vertical-specific knowledge base, paid diagnostic offer, appointment scheduling (methodology + technical delivery differentiators)
**Avoids:** Pitfall 13 (premature multi-niche), Pitfall 1 (custom dev trap)
**Research flag:** MEDIUM — paid audit pricing and structure ($5k-15k range) needs validation against Brazilian market willingness-to-pay; verify Kommo integration depth and per-user costs at scale

---

### Phase Ordering Rationale

- Phases 1-2 are pure strategy and methodology — they must precede any technical work because every technical decision is niche-specific
- Phase 3 is a technical prerequisite for Phase 4 — the "sell before you build" model requires "build in sandbox before you sell"
- Phase 4 and 5 are tightly coupled — the recurring system must be designed before delivery completes, not after the client is already live
- Phase 6 begins only after the delivery time has been compressed enough that one person can manage multiple concurrent clients
- Architecture is not a separate phase — it is locked by the stack decision in STACK.md and built progressively through Phases 3-6

---

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 3 (Technical Sandbox):** Evolution API + n8n integration has documented rate limit risks and WhatsApp number banning behavior. Needs hands-on test of the Typebot-to-Evolution API webhook bridge. Verify current n8n community nodes for WhatsApp are maintained. Also validate Supabase Pro shared-tenant RLS setup before first client.
- **Phase 6 (Scale):** Kommo pricing at scale (per-user model) needs validation. The paid AI Audit offer structure ($5k-15k BR market pricing) needs market testing with actual prospects before being built into the sales system.

Phases with standard patterns (no research-phase needed):

- **Phase 1:** Niche validation frameworks are established. 3-filter test is sufficient.
- **Phase 2:** Productized offer design is well-documented. Use FEATURES.md pricing benchmarks directly.
- **Phase 4:** Client delivery process follows standard patterns. Data readiness audit is the only non-obvious step.
- **Phase 5:** Retainer/recurring model design is well-documented in agency literature.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core tools (n8n, Evolution API, Typebot, Supabase, Metabase) verified via official docs, GitHub, and multiple independent comparisons. Pricing verified on official sites. |
| Features | HIGH | Methodology table stakes and technical delivery must-haves verified across multiple AI agency market sources. Brazilian WhatsApp dominance well-documented. |
| Architecture | MEDIUM | No ARCHITECTURE.md produced. Architecture inferred from STACK.md component descriptions and integration patterns. Tenant isolation strategy (RLS + Evolution API instances) is sound but needs validation in sandbox. |
| Pitfalls | HIGH | Multiple converging sources. AI code failure data from real incident reports. Brazilian SMB data (93.2% without integrated systems) from CNDL. Custom dev trap documented across service business literature. |

**Overall confidence:** HIGH

---

### Gaps to Address

- **ARCHITECTURE.md missing:** No dedicated architecture research was completed. The component architecture inferred here should be validated during Phase 3 sandbox build. Pay particular attention to: multi-tenant isolation via Supabase RLS, Evolution API instance management per client, and n8n workflow versioning strategy.

- **Niche not yet selected:** All roadmap phases assume a niche will be selected in Phase 1. Until the niche is locked, specific technical requirements (knowledge base content, CRM field mappings, workflow logic) cannot be finalized. Phase 3 sandbox build will be generic until niche is confirmed.

- **Kommo pricing at scale:** Kommo pricing verified at base plan (~$15/user/mo). At scale (multiple clients each with Kommo teams), total cost needs validation before it becomes a pricing constraint.

- **Brazilian WhatsApp number banning risk:** Evolution API uses WhatsApp Web protocol (Baileys). Practical risk mitigation (number behavior, ramp-up patterns, dedicated numbers) needs validation in Phase 3 sandbox before any client number is connected.

- **First-sale timeline assumption:** FEATURES.md assumes 30-day first sale is achievable. This is market-consensus but highly dependent on niche selection quality and founder's existing network. Treat as a target, not a guarantee.

---

## Sources

### Primary (HIGH confidence)
- n8n 2.0 official blog + self-hosting docs — stack validation, Hetzner CX22 recommendation
- Supabase official pricing page — Pro plan requirement for production confirmed
- Evolution API GitHub (10k+ stars) — WhatsApp integration capabilities
- Typebot official docs — WhatsApp integration architecture confirmed
- Chatwoot GitHub (22k+ stars) — deployment and Evolution API integration
- Metabase + Supabase official integration guide — dashboard setup path

### Secondary (MEDIUM confidence)
- Multiple AI agency market reports (AIFire, Hakuna Matata Tech, Latenode) — feature landscape
- Brazilian SMB data: CNDL (70% not using AI), BM&C News (93.2% without integrated systems) — market context
- Digital Agency Network pricing guide — high-ticket offer benchmarks
- Kommo blog + aurorainbox.com LATAM CRM guide — Kommo Brazil positioning

### Tertiary (LOW confidence — needs field validation)
- Paid AI Audit pricing ($5k-15k): derived from US market data; Brazil-specific willingness-to-pay unconfirmed
- Lovable production maintenance cycle: capabilities confirmed ($200M ARR), long-term maintenance limits unclear
- Recurrence churn rate estimates (30-40%): derived from general SaaS/MSP data; AI service-specific Brazil data unavailable

---

*Research completed: 2026-03-10*
*Note: ARCHITECTURE.md was not produced — architecture section inferred from STACK.md*
*Ready for roadmap: yes*
