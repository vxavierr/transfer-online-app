# Technology Stack

**Project:** AI-First OS — Business Transformation Service
**Researched:** 2026-03-10
**Context:** Non-technical founder using Claude Code + AIOX as dev team. Delivers chatbots, automations, dashboards, and CRM integrations to SMBs in Brazil. "Sell first, build later" model. Budget: near-zero until first client pays.

---

## Recommended Stack

### Layer 1: Automation Engine (The Core)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **n8n** | 2.0+ (self-hosted) | Workflow automation, AI agents, integrations | Open-source, self-hostable, 400+ integrations, native AI agent nodes, PostgreSQL-backed, runs on a $5/mo VPS. n8n 2.0 (released Dec 2025) hardened security and enterprise-grade stability. No per-execution limits on self-hosted. The entire automation layer — WhatsApp triggers, CRM syncs, email follow-ups, AI responses — lives here. |

**Why n8n over Make:** Make charges per operation (new "Credits" model as of Aug 2025). With heavy client workflows, costs spike unpredictably. n8n community edition is free on self-hosted — critical for a service business with tight margins. Make is better for non-technical people who won't touch a VPS, but AIOX + Claude Code removes that barrier.

**Why n8n over Zapier:** Zapier is 3-5x more expensive and doesn't have native AI agent nodes. n8n's AI nodes (70+ as of v1.113+) enable RAG, LLM calls, and multi-step agents inside workflows — no glue code needed.

**Confidence: HIGH** — Verified via official n8n docs, GitHub releases, and multiple independent comparisons.

---

### Layer 2: WhatsApp Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Evolution API** | v2.x (self-hosted) | WhatsApp connection layer | Open-source, free, Docker-native, connects to WhatsApp Web protocol via Baileys library. Brazilian-born tool with massive traction in 2025-2026. Integrates natively with n8n, Typebot, and Chatwoot. Single server can power multiple client instances. |
| **Meta WhatsApp Cloud API** | Current | Official API for high-volume clients | For clients that need official Meta compliance (first 1,000 service conversations/month free). Required if client volume is high or needs verified Business account badge. More expensive but more stable. |

**Decision rule:**
- First clients / MVP → Evolution API (free, fast to deploy, zero Meta dependency)
- Client with >1,000 conversations/month or requiring official compliance → Meta Cloud API

**Warning on Evolution API:** Uses WhatsApp Web reverse-engineering (Baileys). WhatsApp periodically bans numbers that behave like bots. Mitigate with: normal phone number behavior, gradual ramp-up, dedicated number per client. Not suitable for high-volume broadcast campaigns.

**Confidence: HIGH** — Evolution API GitHub has 10k+ stars, documented integration with n8n confirmed.

---

### Layer 3: Chatbot Builder

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Typebot** | v3.x (self-hosted or cloud) | Visual chatbot flows — WhatsApp, web widget | Open-source no-code flow builder. Drag-and-drop interface, zero code required. Deploys to WhatsApp via native integration (Meta Cloud API) or via Evolution API + n8n webhook bridge. Free plan: unlimited bots, 200 chats/mo. Self-hosted: unlimited everything. Produces professional conversation flows that a non-technical founder can edit. |

**Why Typebot over Botpress:** Botpress is developer-oriented and heavier. Typebot is genuinely no-code — a founder can modify a conversation flow without Claude Code assistance. It produces a reusable blueprint per niche.

**Why Typebot over Flowise:** Flowise was acquired by Workday (Aug 2025) and is pivoting to enterprise HR/finance. Community trajectory is uncertain. Typebot has a clearer SMB roadmap.

**Confidence: HIGH** — Official docs confirm WhatsApp integration, GitHub active, pricing verified.

---

### Layer 4: CRM

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Kommo** (formerly amoCRM) | Current cloud | Sales pipeline + WhatsApp CRM | Official Meta partner. WhatsApp-native CRM — every conversation thread links to a deal card. Used widely in Brazilian SMBs. Deep n8n integration available. Base plan ~$15/user/mo. Kommo is the standard for Brazilian service businesses that live in WhatsApp. |
| **HubSpot** | Free/Starter tier | Alternative for clients who already use it | Better for content-heavy businesses (blog, email marketing). WhatsApp requires third-party integration (paid). Use only when client insists or their team already has it. |

**Default recommendation: Kommo** for new clients. It's built around the WhatsApp-first sales motion that dominates Brazil.

**When to use HubSpot instead:** Client already has HubSpot and refuses to migrate. Or client's primary channel is email, not WhatsApp.

**Avoid Bitrix24 for first deployments:** Free plan is attractive but the UX is dense and onboarding friction is high. Slows down time-to-value for clients.

**Confidence: MEDIUM** — Kommo's Brazil positioning confirmed via multiple sources, pricing from official site. WhatsApp integration details based on search results; verify current pricing before quoting clients.

---

### Layer 5: Database & Backend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Supabase** | Current (Pro plan for production) | PostgreSQL database, auth, storage, real-time | Production-ready PostgreSQL with built-in auth and row-level security. Native integration with n8n (Supabase node), Lovable, and Typebot. Free tier for development only — projects pause after 7 days of inactivity. Pro plan ($25/mo) required for any client-facing deployment. |

**Critical:** Do NOT use Supabase free tier for client production environments. Projects pause after 7 days of inactivity — your client's system goes offline. Budget $25/mo per production client OR share one Pro project across clients (viable for early stage with tenant isolation via RLS).

**Confidence: HIGH** — Supabase docs and pricing page verified directly.

---

### Layer 6: Dashboard / Business Intelligence

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Metabase** | Community Edition (self-hosted) | Client-facing dashboards — KPIs, operational metrics | Open-source, free forever self-hosted, connects directly to PostgreSQL/Supabase via standard connection string. Non-technical clients can view dashboards without touching code. Zero dashboard-building code required — SQL or point-and-click query builder. AI-assisted SQL generation built-in. |

**Why Metabase over Grafana:** Grafana excels at real-time infrastructure monitoring with time-series data. Metabase excels at business intelligence — sales funnels, conversion rates, revenue by period. SMB clients need business metrics, not infrastructure observability.

**Why Metabase over Retool:** Retool builds write-back internal tools (admin panels, ops dashboards that trigger actions). Metabase is read-only BI. For the first version — read-only dashboards showing the client their AI ROI — Metabase is simpler and free.

**Confidence: HIGH** — Supabase official docs confirm Metabase PostgreSQL integration. Self-hosting confirmed via Docker.

---

### Layer 7: Frontend / Client Portals (when needed)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Lovable** | Current | Build custom web interfaces, landing pages, client portals with AI | Non-technical founder can build full-stack apps via natural language. Native Supabase integration. Generates React + Tailwind + Supabase backend. Deploys to Lovable Cloud automatically. When a niche needs something beyond Typebot flows + Metabase dashboards, Lovable builds the custom UI without needing Dex (@dev). |

**Constraint:** Lovable generates code that AIOX/Claude Code can then maintain and extend. It is NOT a long-term no-touch solution — someone (Claude Code) needs to manage changes.

**Confidence: MEDIUM** — Lovable's production capabilities are confirmed ($200M ARR, Series B). Specific limits on generated-app maintenance cycle are LOW confidence.

---

### Layer 8: Omnichannel Inbox / Support Desk

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Chatwoot** | Community (self-hosted) | Unified inbox for WhatsApp + email + web chat + Instagram | Open-source, MIT license, free self-hosted. Connects to Evolution API for WhatsApp. Clients get a single dashboard where the team manages all conversations. Deploy on same VPS as n8n + Evolution API. |

**When to include Chatwoot:** Client has a support team of 2+ people who need to share WhatsApp conversations. For solo-operator clients, the Kommo inbox is sufficient.

**Confidence: HIGH** — GitHub 22k+ stars, active development, Docker deployment confirmed.

---

### Layer 9: Infrastructure / Hosting

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Hetzner Cloud** | CX22 (2 vCPU, 4GB RAM) | VPS for all self-hosted services | ~€5-6/mo per server. Best price-performance for the stack. Runs n8n + Evolution API + Typebot + Chatwoot + Metabase on a single CX22 instance with Docker Compose. Official n8n docs reference Hetzner as preferred self-hosting option. |
| **Caddy** | v2 | Reverse proxy + automatic HTTPS | Zero-config SSL. Handles all subdomains for each service on the VPS. Pairs with Docker Compose. |
| **Docker Compose** | v2.x | Container orchestration on single VPS | All services defined as containers in one `docker-compose.yml`. AIOX + Claude Code can spin up any service from a template. |

**Hosting architecture per client:** One shared VPS runs all services. Isolate clients via:
- Different Evolution API instances (one per client number)
- Different Typebot workspace per client
- Different Supabase schemas / RLS policies

**Confidence: HIGH** — Hetzner pricing verified, n8n official docs confirm CX22 recommendation.

---

## What NOT to Use

| Tool | Why Not |
|------|---------|
| **Zapier** | 3-5x more expensive than n8n cloud, no AI agent nodes, no self-hosting |
| **Twilio** | Good for SMS but expensive for WhatsApp in Brazil; Evolution API is free |
| **Salesforce** | Enterprise complexity and pricing — kills SMB onboarding speed |
| **Bitrix24** | Dense UX, high onboarding friction, kills time-to-value for first clients |
| **Grafana** | Built for DevOps time-series monitoring, not business metrics |
| **Flowise** | Acquired by Workday Aug 2025, enterprise pivot underway, community uncertain |
| **Firebase** | No native SQL/PostgreSQL; n8n and Metabase assume relational DB |
| **Retool** | Overkill for read-only dashboards; adds dev complexity |
| **Botpress** | Developer-oriented, requires code changes for flow modifications; non-technical founder can't maintain |
| **Make.com** | Viable alternative but operation-based billing is unpredictable at scale; reserve for clients who refuse n8n |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Automation | n8n 2.0 self-hosted | Make.com | Unpredictable billing per operation; n8n free on VPS |
| Automation | n8n 2.0 self-hosted | Zapier | 3-5x cost, no AI nodes |
| WhatsApp | Evolution API | Meta Cloud API | Requires Meta Business verification; free alternative sufficient for MVP |
| Chatbot | Typebot | Botpress | Botpress requires dev to modify flows; Typebot is truly no-code |
| Chatbot | Typebot | Flowise | Workday acquisition Aug 2025, pivoting enterprise |
| CRM | Kommo | HubSpot Free | HubSpot's WhatsApp integration requires paid add-on; Kommo is WhatsApp-native |
| CRM | Kommo | Bitrix24 | Dense UX, high friction for SMB onboarding |
| Dashboard | Metabase | Grafana | Wrong use case (infra monitoring vs business metrics) |
| Dashboard | Metabase | Retool | Retool needs a developer for meaningful customization |
| Frontend | Lovable | Bolt.new | Lovable has cleaner full-stack generation + Supabase integration |
| Database | Supabase Pro | Supabase Free | Free tier pauses projects after 7 days — unusable for client production |
| Hosting | Hetzner CX22 | Railway/Render | Railway costs spike with usage; Render's ephemeral filesystem breaks n8n |

---

## Full Stack Blueprint (per client deployment)

```
VPS: Hetzner CX22 (~€6/mo)
├── Docker Compose
│   ├── n8n 2.0           → Automation engine + AI agents
│   ├── Evolution API v2  → WhatsApp connection layer
│   ├── Typebot v3        → Chatbot flows (web + WhatsApp)
│   ├── Chatwoot          → Omnichannel inbox (if client has team)
│   ├── Metabase CE       → Business dashboards
│   └── Caddy             → Reverse proxy + SSL

Cloud
├── Supabase Pro ($25/mo) → PostgreSQL + auth + storage
├── Kommo (per user)      → CRM + pipeline
└── Lovable               → Custom interfaces (if needed)
```

**Estimated monthly infrastructure cost per client:**
- Hetzner CX22: ~€6
- Supabase Pro (shared across first 3 clients): $25 / 3 = ~$9
- Kommo Base plan: ~$15/user
- Lovable (if needed): ~$25/mo
- **Total: ~$55-70/mo infrastructure per client**

This is margin-positive against a R$1,500-3,000/mo recurring service fee.

---

## Installation (Reference Order)

```bash
# 1. Provision Hetzner CX22, install Docker + Caddy
# 2. Clone stack template (AIOX can generate this)
docker compose up -d n8n evolution-api typebot

# 3. Configure Evolution API — connect WhatsApp number
# 4. Connect Typebot to Evolution API via webhook
# 5. Connect n8n to: Evolution API, Typebot, Supabase, Kommo

# Supabase (cloud)
# Create project at supabase.com (Pro plan for production)

# Metabase
docker compose up -d metabase
# Connect to Supabase via Session Pooler connection string
```

---

## Sources

- [n8n 2.0 announcement — blog.n8n.io](https://blog.n8n.io/introducing-n8n-2-0/)
- [n8n vs Make comparison — softailed.com](https://softailed.com/blog/n8n-vs-make)
- [n8n AI agents capabilities — latenode.com](https://latenode.com/blog/low-code-no-code-platforms/n8n-setup-workflows-self-hosting-templates/n8n-ai-agents-2025-complete-capabilities-review-implementation-reality-check)
- [Evolution API GitHub](https://github.com/EvolutionAPI/evolution-api)
- [Typebot WhatsApp integration docs](https://docs.typebot.io/deploy/whatsapp/overview)
- [Top WhatsApp API tools Brazil — wati.io](https://www.wati.io/en/blog/top-5-whatsapp-business-api-tools-brazil/)
- [Kommo WhatsApp CRM guide](https://www.kommo.com/blog/whatsapp-crm/)
- [Supabase pricing — official](https://supabase.com/pricing)
- [Supabase + Metabase integration — supabase.com](https://supabase.com/blog/visualizing-supabase-data-using-metabase)
- [Hetzner n8n self-hosting — n8n docs](https://docs.n8n.io/hosting/installation/server-setups/hetzner/)
- [Cheapest n8n self-hosting 2026 — dev.to](https://dev.to/vikasprogrammer/the-cheapest-way-to-self-host-n8n-in-2026-8ac)
- [Lovable production capabilities — nocode.mba](https://www.nocode.mba/articles/lovable-ai-app-builder)
- [Chatwoot GitHub](https://github.com/chatwoot/chatwoot)
- [Best CRM LATAM 2025 — aurorainbox.com](https://www.aurorainbox.com/en/2026/01/28/best-crm-for-smes-in-latam/)
- [Flowise acquisition by Workday — typebot.io research](https://typebot.io/blog/flowise-alternatives)
