# Roadmap: AI-First OS

## Overview

Build a productized AI transformation service for one Brazilian vertical niche. The journey starts without a niche and ends with a recurring revenue business: niche selected, commercial model defined, sales system operational, full technical stack deployed on VPS, first client onboarded, and recurring value delivery locked in. Every technical decision is niche-specific, so methodology phases (1-3) come before technical phases (4-8). The "sell first, build later" model requires a working sandbox prototype before the first sales call — not after signing. Phase order is non-negotiable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Niche Validation** - Identify and validate the one niche to build this business in
- [ ] **Phase 2: Revenue Model & Offer** - Define the commercial structure before any sales or technical work
- [ ] **Phase 3: Sales System** - Build the full sales capability to acquire the first client
- [ ] **Phase 4: Technical Infrastructure** - Stand up the VPS foundation that all client modules run on
- [ ] **Phase 5: WhatsApp AI Chatbot** - Build and test the primary client-facing AI module
- [ ] **Phase 6: Follow-up & CRM Automation** - Complete the lead nurturing and pipeline automation layer
- [ ] **Phase 7: Dashboard & KPIs** - Give the client real-time visibility into AI-driven results
- [ ] **Phase 8: Client Onboarding & Delivery** - Operationalize the end-to-end client acquisition-to-delivery process

## Phase Details

### Phase 1: Niche Validation
**Goal**: One niche chosen with documented evidence it passes the 3-filter buying readiness test
**Depends on**: Nothing (first phase)
**Requirements**: NICH-01, NICH-02, NICH-03, NICH-04, NICH-05
**Success Criteria** (what must be TRUE):
  1. User can score 3+ candidate niches against the 5 validated evaluation criteria (payment capacity, process repetition, growth potential, visible bottleneck, entry barriers) and produce a ranked comparison
  2. User has a documented niche profile with real size data from IBGE, Google Trends, LinkedIn, or Apollo — not assumptions
  3. User can map the customer journey for the chosen niche and name 3+ specific friction points where AI creates measurable value
  4. User has identified at least 2 real gaps in the chosen niche (offer gap, result gap, or experience gap) with supporting evidence
  5. User has validated demand with at least 5 real conversations with decision-makers in the niche before committing
**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — Candidate generation + Go/No-go gate scoring (6-8 niches down to 3 survivors)
- [ ] 01-02-PLAN.md — Deep research on 3 survivors (IBGE data, journey maps, gap analysis) + 2x2 matrix ranking
- [ ] 01-03-PLAN.md — Demand validation (5 real conversations with decision-makers) + final niche declaration

### Phase 2: Revenue Model & Offer
**Goal**: Commercial structure fully defined — pricing, recurring value proposition, and contract terms exist before the first sales conversation
**Depends on**: Phase 1
**Requirements**: RECV-01, RECV-02, RECV-03
**Success Criteria** (what must be TRUE):
  1. User has a defined pricing structure for the niche with specific setup fee range and monthly recurring fee — not a range, an actual number to quote
  2. Monthly recurring value is tied to visible client deliverables (performance report, new automation) — not "maintenance" or "support"
  3. A contract template exists with scope, SLA, and recurring terms that can be sent to a prospect without editing from scratch
**Plans**: TBD

### Phase 3: Sales System
**Goal**: User can reliably acquire leads, run a structured diagnostic call, and present a personalized proposal with ROI justification
**Depends on**: Phase 2
**Requirements**: SALE-01, SALE-02, SALE-03, SALE-04, SALE-05
**Success Criteria** (what must be TRUE):
  1. User can run a 45-60 minute diagnostic call using a structured roteiro that maps the prospect's operational bottlenecks to specific AI solutions — without improvising
  2. User can generate a proposal with embedded ROI calculation showing specific economic gain/savings for the prospect's situation within 24 hours of the diagnostic call
  3. User can execute the 6-stage consultative pitch (abertura, diagnostico, apresentacao, encaixe, proposta, CTA) from memory or a one-page reference
  4. User has a lead acquisition funnel running — at minimum a targeted campaign to the niche offering a free diagnostic, with a working landing page and scheduling link
**Plans**: TBD

### Phase 4: Technical Infrastructure
**Goal**: A production-ready VPS exists with the full Docker Compose stack running, and a second client instance can be deployed in under 1 hour
**Depends on**: Phase 1
**Requirements**: INFR-01, INFR-02, INFR-03
**Success Criteria** (what must be TRUE):
  1. n8n, Evolution API, Typebot, and Supabase are all running on a single Hetzner VPS via Docker Compose with auto-SSL via Caddy (dashboards built com Python, deployed separadamente)
  2. User (or Claude Code following documented steps) can spin up a new client instance — new Evolution API instance, new Typebot workspace, new Supabase schema with RLS — in under 60 minutes
  3. Basic health monitoring is active: user receives an alert (email or Telegram) if any service goes down
**Plans**: TBD

### Phase 5: WhatsApp AI Chatbot
**Goal**: A working chatbot runs in a sandbox environment — it handles inbound messages, qualifies leads, answers FAQs, and escalates to a human when needed
**Depends on**: Phase 4
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Success Criteria** (what must be TRUE):
  1. A WhatsApp number connected to the sandbox responds to inbound messages 24/7 using an LLM with niche-specific context injected — no manual intervention needed for standard inquiries
  2. The chatbot asks 3-5 qualifying questions and classifies the lead based on niche-specific criteria before any human involvement
  3. When the chatbot detects a hot lead signal or an out-of-scope situation, it stops the automated flow and notifies a human (via WhatsApp group, CRM task, or Chatwoot) within 60 seconds
  4. The chatbot answers at least 80% of the niche's most common questions correctly using a trained knowledge base — this is demoed live in the sales call
**Plans**: TBD

### Phase 6: Follow-up & CRM Automation
**Goal**: Leads that don't respond are automatically followed up, and every qualified lead lands in the CRM pipeline with a score, a priority, and a next-action task
**Depends on**: Phase 5
**Requirements**: FOLL-01, FOLL-02, FOLL-03, CRM-01, CRM-02, CRM-03
**Success Criteria** (what must be TRUE):
  1. A lead that goes silent after initial contact receives an automated WhatsApp follow-up sequence — at least 3 touches — without any manual action from the client's team
  2. Each follow-up message references the specific context of the previous conversation — not a generic re-engagement blast
  3. Client's team can configure the timing and number of follow-up attempts per sequence in n8n without touching code
  4. Every lead that interacts with the chatbot appears automatically in the CRM pipeline within 5 minutes, tagged and scored
  5. The CRM pipeline automatically classifies and re-prioritizes leads based on engagement score — hot leads move to the top without manual sorting
  6. When a follow-up sequence ends or a lead reaches a threshold, a task is automatically created and assigned to the client's team in the CRM
**Plans**: TBD

### Phase 7: Dashboard & KPIs
**Goal**: The client's business owner can open a custom dashboard (built com Python + IA) and see, in real time, what the AI system is doing — and whether it is delivering the ROI that was promised
**Depends on**: Phase 6
**Requirements**: DASH-01, DASH-02, DASH-03
**Success Criteria** (what must be TRUE):
  1. A custom Python dashboard (Streamlit/Dash) is live showing real-time counts: total leads captured, conversations active, conversions, and average response time — all from the current day
  2. The dashboard includes a before/after comparison panel — baseline metrics from onboarding vs. current period — making the ROI of the AI implementation visible without any spreadsheet work
  3. If a key metric (lead capture rate, response rate, conversion rate) drops below a configured threshold, the client's owner receives an automatic alert via WhatsApp or email
**Plans**: TBD

### Phase 8: Client Onboarding & Delivery
**Goal**: The process from signed contract to a fully live client system is documented, repeatable, and completes within the committed timeline
**Depends on**: Phase 3, Phase 7
**Requirements**: ONBD-01, ONBD-02, ONBD-03
**Success Criteria** (what must be TRUE):
  1. A signed client can be walked through a structured onboarding checklist that collects all required data — FAQs, services, prices, hours, team contacts — in a single 90-minute session
  2. All business data collected in onboarding is fed into the chatbot knowledge base using a documented process that Claude Code can execute — no manual copy-paste of content
  3. The chatbot is trained on the client's specific data and live on the client's WhatsApp number within the contracted delivery window — verifiable by the client before go-live sign-off
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
Note: Phase 4 depends on Phase 1 (not Phase 3) — infrastructure setup can begin in parallel with Phase 2-3 methodology work once niche is locked.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Niche Validation | 0/3 | Planning complete | - |
| 2. Revenue Model & Offer | 0/TBD | Not started | - |
| 3. Sales System | 0/TBD | Not started | - |
| 4. Technical Infrastructure | 0/TBD | Not started | - |
| 5. WhatsApp AI Chatbot | 0/TBD | Not started | - |
| 6. Follow-up & CRM Automation | 0/TBD | Not started | - |
| 7. Dashboard & KPIs | 0/TBD | Not started | - |
| 8. Client Onboarding & Delivery | 0/TBD | Not started | - |
