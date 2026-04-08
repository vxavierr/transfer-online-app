# Uhuru OS — Component Specification

> Versão 1.0 | Spec para @dev implementar | Stack: React 19 + shadcn/ui + Tailwind 4
> Organizado por Atomic Design: Atoms → Molecules → Organisms → Templates

---

## Estrutura de Pastas Esperada

```
apps/web/src/
├── components/
│   ├── atoms/
│   │   ├── Badge.tsx
│   │   ├── KpiCard.tsx
│   │   ├── PlatformBadge.tsx
│   │   ├── StatusDot.tsx
│   │   ├── TrendIndicator.tsx
│   │   └── SkeletonCard.tsx
│   ├── molecules/
│   │   ├── AlertItem.tsx
│   │   ├── ClientRow.tsx
│   │   ├── CampaignRow.tsx
│   │   ├── TaskCard.tsx
│   │   ├── MetricGroup.tsx
│   │   └── SearchBar.tsx
│   ├── organisms/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── AlertsPanel.tsx
│   │   ├── ClientsTable.tsx
│   │   ├── CampaignsList.tsx
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   ├── AIAgentPanel.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ToolCallBlock.tsx
│   │   └── ConfirmationBlock.tsx
│   ├── templates/
│   │   └── PageLayout.tsx
│   └── ui/                     # shadcn/ui components (não customizar, usar via cn())
│       ├── button.tsx
│       ├── input.tsx
│       ├── sheet.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── select.tsx
│       ├── badge.tsx
│       ├── toast.tsx
│       └── ...
└── lib/
    ├── cn.ts                   # clsx + tailwind-merge
    └── utils.ts
```

---

## ATOMS

### `StatusDot`

```tsx
// components/atoms/StatusDot.tsx
type StatusDotProps = {
  status: "active" | "paused" | "ended" | "alert" | "pending"
  label?: string
  size?: "sm" | "md"
}

// Renderização:
// ● Ativo   → dot verde + text-success
// ⏸ Pausado → dot amarelo + text-warning
// ✗ Encerrado → dot cinza + text-on-surface-muted
// ⚠ Alerta → dot vermelho + text-error
// ○ Pendente → dot cinza claro + text-on-variant

// Implementar como:
// <span className="flex items-center gap-1.5">
//   <span className={cn("rounded-full", sizeClass, colorClass)} />
//   {label && <span className="text-sm">{label}</span>}
// </span>
```

**Dependências:** `cn` util
**Acessibilidade:** `aria-label={status}` no dot span

---

### `TrendIndicator`

```tsx
// components/atoms/TrendIndicator.tsx
type TrendIndicatorProps = {
  value: number        // ex: 12.3 ou -5.2
  unit?: "%" | "x" | "R$"
  size?: "sm" | "md"
}

// Renderização:
// Positivo: ▲ +12.3% em text-success
// Negativo: ▼ -5.2%  em text-error
// Zero:     — 0.0%   em text-on-variant

// Ícone: material-symbols-outlined "trending_up" / "trending_down"
```

---

### `PlatformBadge`

```tsx
// components/atoms/PlatformBadge.tsx
type Platform = "meta" | "google"

type PlatformBadgeProps = {
  platform: Platform
  size?: "sm" | "md"
}

// Meta: bg-blue-500/10 text-blue-400 border-blue-500/20 → "[f] Meta"
// Google: bg-violet-500/10 text-violet-400 border-violet-500/20 → "[G] Google"
// Usar SVG inline para ícones reais das plataformas (não Material Symbols)
// svg Meta: ícone f azul simplificado
// svg Google: G colorido simplificado
```

---

### `KpiCard`

```tsx
// components/atoms/KpiCard.tsx
type KpiCardProps = {
  label: string
  value: string           // já formatado: "R$ 12.345" | "2.8x" | "247"
  subtext?: string        // "vs. mês anterior"
  trend?: number          // passado para TrendIndicator
  icon?: string           // material symbols icon name
  variant?: "default" | "primary" | "warning" | "error"
  isLoading?: boolean
  onClick?: () => void
}

// Layout:
// ┌──────────────────────────────────┐
// │ [icon]  label              trend │
// │                                  │
// │  value (display-md, font-headline)│
// │  subtext (text-xs, text-muted)   │
// └──────────────────────────────────┘

// Classes base: glass-card rounded-2xl p-6 transition-default
// variant=primary: border-primary/30 + subtle teal gradient
// variant=warning: border-warning/30
// variant=error:   border-error/30
// isLoading: renderiza SkeletonCard
// onClick: cursor-pointer + glass-card-hover
```

**Dependências:** `TrendIndicator`, `SkeletonCard`, `cn`

---

### `SkeletonCard`

```tsx
// components/atoms/SkeletonCard.tsx
type SkeletonCardProps = {
  height?: string   // ex: "h-28"
  className?: string
}

// Renderiza div com classe skeleton (shimmer animation do globals.css)
// Usado internamente pelos outros componentes durante loading state
```

---

### `Badge` (customizado sobre shadcn)

```tsx
// components/atoms/Badge.tsx
// Wrapper sobre shadcn Badge com variantes Uhuru OS

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "meta" | "google"

// Extensão do shadcn/ui Badge — não reimplementar, só adicionar variantes via cva()
```

---

## MOLECULES

### `MetricGroup`

```tsx
// components/molecules/MetricGroup.tsx
// Grupo de KpiCards em grid responsivo

type MetricGroupProps = {
  metrics: Array<{
    label: string
    value: string
    trend?: number
    icon?: string
    variant?: KpiCardProps["variant"]
  }>
  isLoading?: boolean
  columns?: 3 | 4 | 5
}

// Grid: grid gap-4
// columns=4: grid-cols-2 md:grid-cols-4
// columns=5: grid-cols-2 md:grid-cols-5
```

---

### `AlertItem`

```tsx
// components/molecules/AlertItem.tsx
type AlertItemProps = {
  type: "roas_below" | "budget_low" | "campaign_error" | "custom"
  message: string
  clientName: string
  platform?: Platform
  severity: "error" | "warning"
  onView?: () => void
  onDismiss?: () => void
  timestamp?: string
}

// Layout:
// ┌──────────────────────────────────────────────────────────┐
// │ [!icon] message                               [Ver] [×] │
// │         clientName · platform · timestamp               │
// └──────────────────────────────────────────────────────────┘
// severity=error:   border-l-4 border-error bg-error/5
// severity=warning: border-l-4 border-warning bg-warning/5
```

---

### `ClientRow`

```tsx
// components/molecules/ClientRow.tsx
type ClientRowProps = {
  client: {
    id: string
    name: string
    avatarUrl?: string
    status: StatusDotProps["status"]
    platforms: Platform[]
    spend: number
    roas: number
  }
  onClick?: () => void
  onMenuAction?: (action: "view" | "edit" | "pause" | "delete") => void
}

// Uso em tabela: <tr> com hover:bg-white/3 cursor-pointer
// Colunas: avatar+nome, status, plataformas, spend formatado, roas colorido, menu [···]
// Menu [···]: shadcn DropdownMenu com as 4 ações
// ROAS colorido: <1.5x red, 1.5-2.5x yellow, >2.5x green
```

---

### `CampaignRow`

```tsx
// components/molecules/CampaignRow.tsx
type CampaignRowProps = {
  campaign: {
    id: string
    name: string
    platform: Platform
    clientName: string
    spend: number
    roas: number
    cpa: number
    ctr: number
    status: "active" | "paused" | "ended"
  }
  onClick?: () => void
}

// Similar ao ClientRow, com colunas específicas de campanha
// Platform badge como primeira coluna (antes do nome)
```

---

### `TaskCard`

```tsx
// components/molecules/TaskCard.tsx
// Card usado no Kanban board

type TaskCardProps = {
  task: {
    id: string
    title: string
    clientName?: string
    assignee?: { name: string; avatarUrl?: string }
    priority: "high" | "medium" | "low"
    dueDate?: string         // ISO date string
    commentCount?: number
  }
  isDragging?: boolean
  onClick?: () => void
}

// Layout:
// ┌───────────────────────────────┐
// │ [priority dot] title         │
// │ [client name]                │
// │ [avatar] assignee  [📅 date] │
// └───────────────────────────────┘
// isDragging: opacity-50 + rotate-2 + scale-105
// priority dot: high=red, medium=yellow, low=slate
// dueDate vencida: text-error + bg-error/5
```

**Dependências:** `@dnd-kit/sortable` para drag behavior (aplicado no Organism, não aqui)

---

### `SearchBar`

```tsx
// components/molecules/SearchBar.tsx
type SearchBarProps = {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  className?: string
}

// Input com ícone search à esquerda
// Estilo: bg-white/5 border border-white/5 rounded-full px-4 py-2
// Focus: ring-1 ring-primary/50
// Keyboard: Cmd+K / Ctrl+K foca via global listener
```

---

## ORGANISMS

### `Sidebar`

```tsx
// components/organisms/Sidebar.tsx
// Sidebar fixa, 256px, collapsável para icon-only em <1024px

type SidebarProps = {
  currentPath: string
}

// Itens de nav: array de { label, icon, path, badge? }
// Item ativo: bg-primary/5 text-primary border-r-2 border-primary
// Item inativo: text-on-variant hover:text-on-surface hover:bg-white/5
// AI Agent item: badge "NOVO" ou pulse indicator
// Footer: user card com avatar, nome, role

// Estado colapso: localStorage key "sidebar_collapsed"
// Colapso: w-16 (só ícones), w-64 (expandido)
// Tooltip no modo colapsado: shadcn Tooltip com o label do item

const NAV_ITEMS = [
  { label: "Dashboard", icon: "dashboard", path: "/dashboard" },
  { label: "Clientes", icon: "groups", path: "/clientes" },
  { label: "Campanhas", icon: "campaign", path: "/campanhas" },
  { label: "Tarefas", icon: "task_alt", path: "/tarefas" },
  { label: "Automações", icon: "automation", path: "/automacoes" },
  { label: "API Connector", icon: "api", path: "/api-connector" },
  { label: "Importação", icon: "upload_file", path: "/importacao" },
  { label: "AI Agent", icon: "smart_toy", path: "/agent", badge: "AI" },
]
```

**Dependências:** React Router `useLocation`, shadcn Tooltip

---

### `Topbar`

```tsx
// components/organisms/Topbar.tsx
type TopbarProps = {
  title?: string             // fallback: derivado da rota
  actions?: React.ReactNode  // botões contextuais (ex: "+ Novo Cliente")
}

// Fixed top, left=256px (sidebar width), height=64px
// Conteúdo: [SearchBar 384px] + [flex-1] + [NotificationBell] + [UserMenu]
// UserMenu: shadcn DropdownMenu → Perfil, Configurações, Sair
// NotificationBell: badge com count de alertas não lidos
```

---

### `AIAgentPanel`

```tsx
// components/organisms/AIAgentPanel.tsx
// Side panel do chat do agente

type AIAgentPanelProps = {
  isOpen: boolean
  isFullscreen: boolean
  onClose: () => void
  onToggleFullscreen: () => void
}

// Estrutura:
// header: "AI Agent" + botões [expand/collapse] [close]
// body: lista scrollável de ChatMessage
// footer: ChatInput (textarea + botões)

// Estados:
// isLoading: spinner enquanto aguarda resposta
// isStreaming: texto aparece incrementalmente via SSE
// isEmpty: ilustração vazia + sugestões de prompts

// Acessibilidade:
// role="complementary" aria-label="AI Agent chat"
// Mensagens do agente com role="status" para screen readers

// Tamanho:
// Side panel: w-[400px] fixed right-0 top-16 bottom-0
// Fullscreen: position absoluta sobre content area (mantém sidebar)
```

---

### `ChatMessage`

```tsx
// components/organisms/ChatMessage.tsx
type ChatMessageProps = {
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
  toolCalls?: Array<{
    name: string
    status: "running" | "done" | "error"
    result?: unknown
  }>
  requiresConfirmation?: {
    message: string
    actionLabel: string
    onConfirm: () => void
    onCancel: () => void
  }
  timestamp: string
}

// User: bubble alinhado à direita, bg-primary/10 border border-primary/20
// Assistant: bubble alinhado à esquerda, glass-card

// Se isStreaming: cursor piscante no final do conteúdo
// Se toolCalls: renderiza ToolCallBlock para cada tool
// Se requiresConfirmation: renderiza ConfirmationBlock
```

---

### `ToolCallBlock`

```tsx
// components/organisms/ToolCallBlock.tsx
type ToolCallBlockProps = {
  toolName: string
  status: "running" | "done" | "error"
  input?: Record<string, unknown>
  result?: unknown
  isExpanded?: boolean
}

// Layout:
// ┌────────────────────────────────────┐
// │ [icon] executando tool_name... [▼] │   ← running: pulsing dot teal
// │ [icon] ✓ tool_name concluído  [▼] │   ← done: green check
// │ [icon] ✗ tool_name erro       [▼] │   ← error: red X
// └────────────────────────────────────┘
// Expandido: mostra input e result em JSON colapsado (max-h-32 overflow-y-auto)
// bg-primary/5 border border-primary/10 rounded-lg p-3 text-sm font-mono
```

---

### `ConfirmationBlock`

```tsx
// components/organisms/ConfirmationBlock.tsx
type ConfirmationBlockProps = {
  message: string
  detail?: string
  actionLabel: string
  onConfirm: () => void
  onCancel: () => void
  isDestructive?: boolean
}

// Layout inline na conversa:
// ┌──────────────────────────────────────┐
// │ ⚠ message                           │
// │   detail                            │
// │                [Cancelar] [Confirmar]│
// └──────────────────────────────────────┘
// isDestructive: border-error/30 + botão confirmar em variante error
// Não-destrutivo: border-primary/30 + botão confirmar em primary
```

---

### `KanbanBoard`

```tsx
// components/organisms/KanbanBoard.tsx
// DnD Kit integration

type KanbanBoardProps = {
  tasks: Task[]
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void
  onTaskClick: (taskId: string) => void
  onAddTask: (status: TaskStatus) => void
}

// Usa @dnd-kit/core DndContext + SortableContext
// Renderiza 4 KanbanColumn components
// Estratégia de colisão: closestCorners
// Sensor: mouse + touch + keyboard
// onDragEnd: otimistic update + PATCH API

const COLUMNS: Array<{ id: TaskStatus; label: string }> = [
  { id: "backlog",     label: "Backlog" },
  { id: "in_progress", label: "Em andamento" },
  { id: "review",      label: "Review" },
  { id: "done",        label: "Concluído" },
]
```

---

### `KanbanColumn`

```tsx
// components/organisms/KanbanColumn.tsx
type KanbanColumnProps = {
  status: TaskStatus
  label: string
  tasks: Task[]
  onAddTask: () => void
}

// Header: label + count badge
// Body: SortableContext com TaskCard para cada task
// Footer: [+ Adicionar] ghost button
// Estilo: bg-surface-mid/50 rounded-2xl p-4 min-h-[200px]
// useDroppable do @dnd-kit
```

---

## TEMPLATES

### `PageLayout`

```tsx
// components/templates/PageLayout.tsx
// OBRIGATÓRIO: Todas as páginas devem usar este template

type PageLayoutProps = {
  children: React.ReactNode
  title?: string
  actions?: React.ReactNode       // botões do topbar (ex: [+ Novo Cliente])
  className?: string
}

// Estrutura:
// <div className="flex h-screen overflow-hidden bg-background">
//   <Sidebar currentPath={pathname} />
//   <div className="flex flex-col flex-1 overflow-hidden ml-64">
//     <Topbar title={title} actions={actions} />
//     <main className="flex-1 overflow-y-auto px-8 py-6">
//       {children}
//     </main>
//   </div>
//   <AIAgentPanel ... />  {/* global, sempre presente */}
// </div>

// Exemplo de uso:
// <PageLayout title="Clientes" actions={<Button>+ Novo Cliente</Button>}>
//   <ClientsTable />
// </PageLayout>
```

---

## PÁGINAS (usando PageLayout)

### `DashboardPage` — `/dashboard`

```tsx
// pages/Dashboard.tsx
// Componentes usados:
// MetricGroup (4 cards: Spend, ROAS médio, Clientes ativos, Alertas)
// AlertsPanel (organism)
// ClientsTable (organism — versão compacta)
// TasksPreview (lista das 3 tarefas mais urgentes)
```

### `ClientDashboardPage` — `/clientes/:id`

```tsx
// pages/ClientDashboard.tsx
// Componentes usados:
// ClientHeroCard (organism — hero com info do cliente)
// MetricGroup (5 cards: Spend, ROAS, CPA, CTR, Clicks)
// PerformanceChart (recharts LineChart dual-axis)
// CampaignsList (agrupado por plataforma)
// TasksList (tarefas do cliente)
// AgentHistoryList (histórico de actions do agente)
```

### `KanbanPage` — `/tarefas`

```tsx
// pages/Kanban.tsx
// Componentes usados:
// FilterBar (cliente, responsável — molecules)
// KanbanBoard (organism — o mais complexo da página)
// TaskDetailSheet (shadcn Sheet com detalhes da tarefa)
```

### `AgentPage` — `/agent` (fullscreen)

```tsx
// pages/Agent.tsx
// Layout diferente: sem PageLayout padrão
// Sidebar (256px) + ChatArea (flex-1)
// Sem topbar padrão — header customizado do chat
```

---

## Dependências NPM Necessárias

| Pacote | Versão | Uso |
|--------|--------|-----|
| `@dnd-kit/core` | ^6 | Drag-and-drop do Kanban |
| `@dnd-kit/sortable` | ^8 | Sortable lists dentro de colunas |
| `@dnd-kit/utilities` | ^3 | CSS transform utils |
| `recharts` | ^2.x | Gráficos de performance |
| `react-dropzone` | ^14 | Drop zone de upload de arquivos |
| `papaparse` | ^5 | Parse de CSV no frontend |
| `date-fns` | ^3 | Formatação de datas |
| `clsx` | ^2 | Conditional classes |
| `tailwind-merge` | ^2 | Merge de classes Tailwind sem conflitos |
| `lucide-react` | ^0.4 | Ícones fallback (além de Material Symbols) |

**shadcn/ui components a instalar:**
```bash
npx shadcn@latest add button input sheet dialog dropdown-menu select badge
npx shadcn@latest add toast sonner avatar skeleton separator tabs
npx shadcn@latest add form label textarea switch checkbox
```

---

## Convenções de Implementação

### `cn` utility (obrigatório em todo componente)

```ts
// lib/cn.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Formatação de valores

```ts
// lib/utils.ts

// Spend: "R$ 12.345" ou "R$ 1,2M"
export function formatCurrency(value: number): string { ... }

// ROAS: "2.8x"
export function formatRoas(value: number): string {
  return `${value.toFixed(2)}x`
}

// CTR: "3.42%"
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

// Data relativa: "há 2h", "ontem", "14/04"
export function formatRelativeDate(date: string): string { ... }
```

### Skeleton loading pattern

```tsx
// Em qualquer componente com dados async:
if (isLoading) {
  return <SkeletonCard height="h-28" className="rounded-2xl" />
}

// Não usar spinners centralizados — skeleton inline no lugar do dado
```

### Error state pattern

```tsx
// Toast para erros de API (não blocks de UI)
// shadcn sonner para toasts
import { toast } from "sonner"

// Sucesso: toast.success("Cliente criado com sucesso")
// Erro:    toast.error("Erro ao salvar. Tente novamente.")
// Info:    toast.info("Sincronizando com Meta Ads...")
```

---

## Acessibilidade — Checklist por Componente

| Componente | Requisito |
|------------|-----------|
| Todos os icon buttons | `aria-label` obrigatório |
| Inputs sem label visível | `aria-label` ou `aria-labelledby` |
| Status dots | `aria-label={status}` |
| Modais/Sheets | `aria-modal="true"`, focus trap, Esc para fechar |
| Drag-and-drop | Alternativa por teclado (Enter seleciona, setas movem) |
| Streaming do chat | `role="status"` para anunciar novo conteúdo |
| Tabelas | `<thead>`, `<th scope="col">`, `<caption>` |
| Alertas | `role="alert"` para anúncio imediato |
| Loading | `aria-busy="true"` no container |
| Gráficos | `aria-label` descritivo + dados em tabela oculta (`sr-only`) |

---

## Ordem de Implementação Sugerida (para @dev)

1. **Atoms**: StatusDot, TrendIndicator, PlatformBadge, SkeletonCard, Badge
2. **Template**: PageLayout (desbloqueio todas as páginas)
3. **Organisms base**: Sidebar, Topbar
4. **Dashboard Geral**: KpiCard, MetricGroup, AlertItem, ClientRow + ClientsTable
5. **Clientes**: ClientRow, Sheet de criação/edição
6. **Dashboard por Cliente**: PerformanceChart (Recharts), CampaignsList
7. **Kanban**: TaskCard, KanbanColumn, KanbanBoard (mais complexo — @dnd-kit)
8. **AI Agent Panel**: ChatMessage, ToolCallBlock, ConfirmationBlock, AIAgentPanel
9. **Automações, API Connector, Importação**: tabelas e forms simples
10. **Refinamento**: animações, skeleton states, error states, acessibilidade

---

*Uhuru OS Component Spec v1.0 — Uma (@ux-design-expert) — 2026-04-08*
