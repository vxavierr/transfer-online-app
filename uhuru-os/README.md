# Uhuru OS

Marketing Operations Platform — AI-powered agency management system.

## Stack

- **Runtime:** Bun
- **Monorepo:** Turborepo
- **Frontend:** React 19 + Vite + Tailwind 4 + shadcn/ui
- **Backend:** Bun + Hono
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **AI:** Claude API via agent-harness package

## Project Structure

```
uhuru-os/
├── apps/
│   ├── web/          # React 19 SPA (port 5173)
│   └── api/          # Hono REST API (port 3001)
├── packages/
│   ├── shared/       # Shared TypeScript types
│   └── agent-harness/# AI agent engine (Story 8.1)
├── supabase/
│   ├── migrations/   # SQL migrations
│   └── config.toml   # Local dev config
└── turbo.json        # Turborepo pipeline
```

## Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.1
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Installation

```bash
# Clone and install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Development

```bash
# Start all apps (web + api)
bun run dev

# Or individually:
cd apps/web && bun run dev   # http://localhost:5173
cd apps/api && bun run dev   # http://localhost:3001
```

### Quality Gates

```bash
bun run typecheck   # TypeScript check (all packages)
bun run lint        # ESLint (all packages)
bun run build       # Production build (all packages)
bun run test        # Tests (all packages)
```

### API Health Check

```bash
curl http://localhost:3001/health
# { "status": "ok", "version": "0.1.0" }
```

## Environment Variables

See `.env.example` for all required variables.
