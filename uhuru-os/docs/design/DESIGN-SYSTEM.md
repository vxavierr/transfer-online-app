# Uhuru OS — Design System

> Versão 1.1 | Dual Theme: Dark (Obsidian Glass) + Light (Uhuru Brand) | Base: shadcn/ui + Tailwind 4
> Inspirado no Nexus AI — mesmo dono, mesma stack, identidade visual derivada

---

## 1. Fundação Visual

### Filosofia: Dual Theme

O Uhuru OS suporta dois temas com a mesma linguagem de design — ambos compartilham o brand teal `#0591a1`, as fontes Montserrat e Poppins, e os tokens semânticos. O que muda é o registro de cor dos fundos e superfícies.

| Tema | Registro | Aesthetic | Quando usar |
|------|----------|-----------|-------------|
| **Dark** (`.dark`) | Fundos escuros `#1a1a1a–#2a2a2a` | Obsidian Glass — profundidade, blur, teal vibrante | Dashboard operacional, uso prolongado, preferência do usuário |
| **Light** (padrão) | Fundo branco `#ffffff`, texto `#0d0d0d` | Brand Uhuru — limpo, apresentação, alta legibilidade | Relatórios, impressão, usuários que preferem claro |

Princípios-chave compartilhados:
- **Information-dense, not cluttered** — máximo de dado útil por pixel
- **Teal como único accent primário** — `#0591a1` âncora visual em ambos os temas
- **Glass layers (dark only)** — cards com `backdrop-blur` e `border/10` criam profundidade
- **Typography hierarchy** — Montserrat para headlines e body, Poppins para valores KPI (brand real da Uhuru)

---

## 2. Paleta de Cores

### 2.1 Tokens de Cor Brutos (invariáveis)

Valores absolutos do brand Uhuru — nunca usados diretamente no código, sempre via token semântico.

```css
/* === BRAND PALETTE === */
/* Teal */
--uhuru-teal-500: #0591a1;
--uhuru-teal-600: #31818d;
--uhuru-teal-900: #0a3a40;

/* Dark surfaces */
--uhuru-dark-900: #1a1a1a;   /* bg principal dark */
--uhuru-dark-800: #222222;   /* bg alt / cards dark */
--uhuru-dark-700: #2a2a2a;   /* surface card dark */
--uhuru-dark-600: #3a3a3a;   /* bordas dark */

/* Light surfaces (brand slides Uhuru) */
--uhuru-light-50:  #ffffff;
--uhuru-light-100: #f5f5f5;
--uhuru-light-200: #e0e0e0;

/* Text dark mode */
--uhuru-ink-dark-100: #e2e4f6;
--uhuru-ink-dark-200: #a7aabb;
--uhuru-ink-dark-400: #717584;

/* Text light mode (brand Uhuru) */
--uhuru-ink-900: #0d0d0d;
--uhuru-ink-700: #434343;
--uhuru-ink-500: #595959;

/* Accent */
--uhuru-purple:  #5b38d8;
--uhuru-pink:    #ff5e78;
--uhuru-orange:  #ffa03b;
--uhuru-amber:   #f59e0b;

/* Platforms */
--uhuru-meta:    #ff8c00;
--uhuru-google:  #ff4444;

/* Semantic */
--uhuru-success: #22c55e;
--uhuru-warning: #f59e0b;
--uhuru-error:   #ef4444;
```

### 2.2 Tokens Semânticos — Light Mode (padrão)

```css
/* globals.css — light mode é :root (sem classe) */
:root {
  /* Backgrounds */
  --color-bg:              var(--uhuru-light-50);   /* #ffffff */
  --color-surface:         var(--uhuru-light-50);   /* #ffffff */
  --color-surface-low:     var(--uhuru-light-100);  /* #f5f5f5 */
  --color-surface-mid:     var(--uhuru-light-100);  /* #f5f5f5 */
  --color-surface-high:    var(--uhuru-light-50);   /* #ffffff — card elevado */
  --color-surface-highest: var(--uhuru-light-50);
  --color-surface-bright:  var(--uhuru-light-50);

  /* Text */
  --color-on-surface:         var(--uhuru-ink-900);  /* #0d0d0d */
  --color-on-surface-variant: var(--uhuru-ink-700);  /* #434343 */
  --color-on-surface-muted:   var(--uhuru-ink-500);  /* #595959 */

  /* Borders */
  --color-outline:         var(--uhuru-light-200);  /* #e0e0e0 */
  --color-outline-variant: var(--uhuru-light-200);

  /* Primary — Teal (igual em ambos os temas) */
  --color-primary:           var(--uhuru-teal-500);  /* #0591a1 */
  --color-primary-dim:       var(--uhuru-teal-600);  /* #31818d */
  --color-primary-container: #e6f7f9;                /* fundo claro de container teal */
  --color-on-primary:        #ffffff;

  /* Accent */
  --color-accent-purple: var(--uhuru-purple);  /* #5b38d8 */
  --color-alert-pink:    var(--uhuru-pink);    /* #ff5e78 */
  --color-warning-orange:var(--uhuru-orange);  /* #ffa03b */

  /* Platforms */
  --color-meta:   var(--uhuru-meta);    /* #ff8c00 */
  --color-google: var(--uhuru-google);  /* #ff4444 */

  /* Semantic */
  --color-secondary:     var(--uhuru-amber);   /* #f59e0b */
  --color-secondary-dim: #d97706;
  --color-success:  var(--uhuru-success);
  --color-warning:  var(--uhuru-warning);
  --color-error:    var(--uhuru-error);
  --color-info:     var(--uhuru-teal-500);
}
```

### 2.3 Tokens Semânticos — Dark Mode

```css
/* globals.css — dark mode via .dark no <html> */
.dark {
  /* Backgrounds */
  --color-bg:              var(--uhuru-dark-900);  /* #1a1a1a */
  --color-surface:         var(--uhuru-dark-900);  /* #1a1a1a */
  --color-surface-low:     #161616;
  --color-surface-mid:     var(--uhuru-dark-800);  /* #222222 */
  --color-surface-high:    var(--uhuru-dark-700);  /* #2a2a2a */
  --color-surface-highest: #333333;
  --color-surface-bright:  #3d3d3d;

  /* Text */
  --color-on-surface:         var(--uhuru-ink-dark-100);  /* #e2e4f6 */
  --color-on-surface-variant: var(--uhuru-ink-dark-200);  /* #a7aabb */
  --color-on-surface-muted:   var(--uhuru-ink-dark-400);  /* #717584 */

  /* Borders */
  --color-outline:         var(--uhuru-dark-600);   /* #3a3a3a */
  --color-outline-variant: var(--uhuru-dark-600);

  /* Primary — Teal (mesmo valor, comportamento diferente no contraste) */
  --color-primary:           var(--uhuru-teal-500);  /* #0591a1 */
  --color-primary-dim:       var(--uhuru-teal-600);  /* #31818d */
  --color-primary-container: var(--uhuru-teal-900);  /* #0a3a40 */
  --color-on-primary:        #ffffff;

  /* Accent — iguais em ambos os temas */
  --color-accent-purple: var(--uhuru-purple);
  --color-alert-pink:    var(--uhuru-pink);
  --color-warning-orange:var(--uhuru-orange);

  /* Platforms — iguais */
  --color-meta:   var(--uhuru-meta);
  --color-google: var(--uhuru-google);

  /* Semantic */
  --color-secondary:     var(--uhuru-amber);
  --color-secondary-dim: #d97706;
  --color-success:  var(--uhuru-success);
  --color-warning:  var(--uhuru-warning);
  --color-error:    var(--uhuru-error);
  --color-info:     var(--uhuru-teal-500);
}
```

### 2.4 Tokens Tailwind 4 — `tailwind.config.ts`

> `darkMode: 'class'` — dark ativa via `<html class="dark">`. Light é o padrão (`:root` sem classe). As cores apontam para CSS custom properties — o Tailwind nunca vê valores brutos diretamente.

```ts
export default {
  darkMode: "class",  // dark mode via .dark no <html>
  theme: {
    extend: {
      colors: {
        background: "var(--color-bg)",
        surface: {
          DEFAULT: "var(--color-surface)",
          low:     "var(--color-surface-low)",
          mid:     "var(--color-surface-mid)",
          high:    "var(--color-surface-high)",
          highest: "var(--color-surface-highest)",
          bright:  "var(--color-surface-bright)",
        },
        primary: {
          DEFAULT:   "var(--color-primary)",           // #0591a1 (ambos os temas)
          dim:       "var(--color-primary-dim)",        // #31818d
          container: "var(--color-primary-container)",  // #e6f7f9 light / #0a3a40 dark
          on:        "var(--color-on-primary)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          dim:     "var(--color-secondary-dim)",
        },
        accent: {
          purple: "var(--color-accent-purple)",   // #5b38d8
          pink:   "var(--color-alert-pink)",      // #ff5e78
          orange: "var(--color-warning-orange)",  // #ffa03b
        },
        meta:   "var(--color-meta)",    // #ff8c00 — Meta Ads
        google: "var(--color-google)",  // #ff4444 — Google Ads
        on: {
          surface: "var(--color-on-surface)",
          variant: "var(--color-on-surface-variant)",
          muted:   "var(--color-on-surface-muted)",
        },
        outline: {
          DEFAULT: "var(--color-outline)",
          variant: "var(--color-outline-variant)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error:   "var(--color-error)",
      },
      fontFamily: {
        headline: ["Montserrat", "sans-serif"],  // brand real — pesos 300/400/600/700/800
        kpi:      ["Poppins", "sans-serif"],     // números grandes, KPI values — pesos 200/400/700/800
        body:     ["Montserrat", "sans-serif"],
        label:    ["Montserrat", "sans-serif"],
        mono:     ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm:  "0.125rem",
        md:  "0.375rem",
        lg:  "0.5rem",
        xl:  "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
    },
  },
}
```

---

## 3. Tipografia

### Famílias de Fonte (reais da Uhuru)

**Google Fonts CDN:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800&family=Poppins:wght@200;400;700;800&display=swap" rel="stylesheet">
```

- **Montserrat** — fonte principal para 90% dos textos (pesos 300/400/600/700/800)
- **Poppins** — exclusiva para números grandes e valores KPI (pesos 200/400/700/800)

> Plus Jakarta Sans foi excluída — era uso exclusivo de slides de apresentação, não aplicável ao web app.

### Escala

| Token       | Família      | Peso | Tamanho | Line-height | Uso |
|-------------|--------------|------|---------|-------------|-----|
| `display-lg` | Poppins     | 700  | 2.25rem | 1.1         | Hero numbers (ROAS, spend) |
| `display-md` | Poppins     | 700  | 1.875rem | 1.2        | KPI cards primários |
| `display-sm` | Poppins     | 400  | 1.5rem  | 1.25        | Valores numéricos de seção |
| `headline`   | Montserrat  | 700  | 1.25rem | 1.3         | Card títulos, H2 |
| `title-lg`   | Montserrat  | 600  | 1.125rem | 1.4        | Subseções, labels de destaque |
| `title-md`   | Montserrat  | 600  | 1rem    | 1.5         | Tabela headers |
| `body-lg`    | Montserrat  | 400  | 1rem    | 1.5         | Corpo de texto padrão |
| `body-md`    | Montserrat  | 400  | 0.875rem | 1.5        | Labels, descrições |
| `label-lg`   | Montserrat  | 600  | 0.875rem | 1.4        | Botões, badges |
| `label-sm`   | Montserrat  | 400  | 0.75rem | 1.4         | Captions, tooltips |
| `mono-sm`    | JetBrains Mono | 400 | 0.8125rem | 1.6 | Código, IDs de campanha |

### Regras de Aplicação

- Números de KPI: sempre `font-kpi font-bold` — Poppins bold cria impacto visual em dados
- Títulos e labels: `font-headline` (Montserrat) — identidade visual da Uhuru
- Labels de eixo em gráficos: `font-mono text-xs` — legibilidade em espaços pequenos
- Mensagens do agente AI: `font-body` (Montserrat) — integração natural com o corpo

---

## 4. Espaçamento e Grid

### Grid Principal (Desktop 1280px+)

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar (256px fixed) │ Main Content (flex-1)           │
│                       │ ┌───────────────────────────┐   │
│                       │ │ Topbar (64px fixed)        │   │
│                       │ ├───────────────────────────┤   │
│                       │ │ Content Area (px-8 py-6)   │   │
│                       │ │                           │   │
│                       │ └───────────────────────────┘   │
│                       │                                 │
│ [AI Panel 400px]      │                                 │
│ (quando aberto, push) │                                 │
└─────────────────────────────────────────────────────────┘
```

### Escala de Espaçamento (Tailwind padrão, sem custom)

- `gap-4` (16px) — entre cards no grid
- `gap-6` (24px) — entre seções
- `p-4` (16px) — padding interno de cards pequenos
- `p-6` (24px) — padding interno de cards principais
- `px-8` (32px) — padding horizontal da content area
- `py-6` (24px) — padding vertical da content area

### Breakpoints

| Breakpoint | Largura | Comportamento |
|------------|---------|---------------|
| `md` | 768px  | Sidebar colapsa para icon-only |
| `lg` | 1024px | Layout completo |
| `xl` | 1280px | Layout principal alvo |
| `2xl` | 1536px | AI Panel abre sem overlap |

---

## 5. Superfícies e Efeitos

### 5.1 Dark Mode — Glass Surfaces

Os efeitos glass são exclusivos do dark mode. No light mode, as superfícies são sólidas (sem blur).

```css
/* === DARK MODE: GLASS SURFACES === */
.dark .glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.dark .glass-card-hover {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}
.dark .glass-card-hover:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(5, 145, 161, 0.3);
  box-shadow: 0 0 24px rgba(5, 145, 161, 0.12);
}

.dark .glass-sidebar {
  background: rgba(26, 26, 26, 0.7);
  backdrop-filter: blur(24px);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.dark .glass-topbar {
  background: rgba(26, 26, 26, 0.5);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.dark .glass-ai-panel {
  background: rgba(26, 26, 26, 0.85);
  backdrop-filter: blur(40px);
  border-left: 1px solid rgba(5, 145, 161, 0.2);
}

/* === DARK MODE: METRIC CARDS === */
.dark .metric-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: border-color 0.2s ease;
}
.dark .metric-card:hover {
  border-color: rgba(5, 145, 161, 0.3);
}

/* === DARK MODE: BACKGROUND === */
.dark body {
  background-color: #1a1a1a;
  background-image:
    radial-gradient(at 0% 0%, rgba(5, 145, 161, 0.05) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(49, 129, 141, 0.03) 0px, transparent 50%),
    radial-gradient(at 50% 100%, rgba(26, 26, 26, 1) 0px, transparent 50%);
  min-height: 100vh;
}

/* === DARK MODE: SCROLLBARS === */
.dark ::-webkit-scrollbar { width: 4px; height: 4px; }
.dark ::-webkit-scrollbar-track { background: transparent; }
.dark ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.dark ::-webkit-scrollbar-thumb:hover { background: rgba(5,145,161,0.4); }
```

### 5.2 Light Mode — Solid Surfaces

No light mode, sem blur. Cards com sombra sutil no lugar de glass.

```css
/* === LIGHT MODE: SOLID SURFACES === */
.glass-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
}

.glass-card-hover {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  transition: all 0.2s ease;
}
.glass-card-hover:hover {
  border-color: rgba(5, 145, 161, 0.4);
  box-shadow: 0 2px 12px rgba(5, 145, 161, 0.08);
}

.glass-sidebar {
  background: #ffffff;
  border-right: 1px solid #e0e0e0;
}

.glass-topbar {
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
}

.glass-ai-panel {
  background: #f5f5f5;
  border-left: 1px solid rgba(5, 145, 161, 0.2);
}

/* === LIGHT MODE: METRIC CARDS === */
.metric-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.metric-card:hover {
  border-color: rgba(5, 145, 161, 0.4);
  box-shadow: 0 4px 16px rgba(5, 145, 161, 0.08);
}

/* === LIGHT MODE: BACKGROUND === */
body {
  background-color: #f5f5f5;
  min-height: 100vh;
}

/* === LIGHT MODE: SCROLLBARS === */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: rgba(5,145,161,0.5); }
```

### 5.3 Gradients e Utilitários (ambos os temas)

```css
/* === GRADIENTS === */
.gradient-teal-glow {
  background: radial-gradient(at 0% 0%, rgba(5, 145, 161, 0.08) 0px, transparent 50%);
}

.text-gradient-primary {
  background: linear-gradient(135deg, #0591a1, #31818d);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## 6. Componentes Base (Atoms)

### 6.1 Badge de Status

```tsx
// Variantes: active | paused | ended | alert | success | pending
type StatusVariant = "active" | "paused" | "ended" | "alert" | "success" | "pending"

const statusStyles: Record<StatusVariant, string> = {
  active:  "bg-success/10 text-success border-success/20",
  paused:  "bg-warning/10 text-warning border-warning/20",
  ended:   "bg-on-surface-muted/10 text-on-surface-muted border-on-surface-muted/20",
  alert:   "bg-error/10 text-error border-error/20",
  success: "bg-success/10 text-success border-success/20",
  pending: "bg-secondary/10 text-secondary border-secondary/20",
}
```

### 6.2 Metric Card

Estrutura atômica de um card de KPI:

```
┌────────────────────────────────┐
│ [Icon]  Label           [Trend]│
│                                │
│  123.456                       │
│  ──────                        │
│  R$ 45.2k    ▲ +12.3%         │
└────────────────────────────────┘
```

Props: `label`, `value`, `subtext`, `trend` (number), `icon`, `variant` (default/primary/warning/error)

### 6.3 Platform Badge (Meta / Google)

```
[f] Meta      → bg laranja Meta (#ff8c00/10) + ícone Meta
[G] Google    → bg vermelho Google (#ff4444/10) + ícone Google
```

### 6.4 Botões

| Variante | Estilo Tailwind |
|----------|-----------------|
| Primary | `bg-primary text-on-primary hover:bg-primary-dim font-label-lg rounded-lg px-4 py-2` |
| Secondary | `border border-primary/30 text-primary hover:bg-primary/10 rounded-lg px-4 py-2` |
| Ghost | `text-on-variant hover:bg-white/5 rounded-lg px-3 py-1.5` |
| Destructive | `bg-error/10 text-error border-error/30 hover:bg-error/20 rounded-lg px-4 py-2` |
| Icon | `w-9 h-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-on-variant` |

### 6.5 Input

```
bg-surface-mid border border-outline/50 rounded-lg px-4 py-2.5
text-on-surface placeholder:text-on-surface-muted
focus:ring-1 focus:ring-primary/50 focus:border-primary/50
transition-all duration-200
```

### 6.6 Select / Dropdown

Mesmo estilo do Input. Usa shadcn/ui `<Select>` com override de tema.

### 6.7 Alert / Notification

```
┌───────────────────────────────────────┐
│ [!] ROAS abaixo do threshold         │
│     Cliente X — Meta Ads — ROAS 1.2x │
│                               [Ver] [×]│
└───────────────────────────────────────┘
```

Estilo: `bg-error/10 border-l-4 border-error rounded-lg p-4`

---

## 7. Ícones

Sistema: **Material Symbols Outlined** (mesmo do Nexus AI)

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1" rel="stylesheet"/>
```

Configuração padrão:
```css
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
}
```

### Mapa de Ícones por Módulo

| Módulo | Ícone |
|--------|-------|
| Dashboard Geral | `dashboard` |
| Dashboard por Cliente | `person_pin` |
| Clientes | `groups` |
| Campanhas | `campaign` |
| Tarefas | `task_alt` |
| Automações | `automation` |
| API Connector | `api` |
| Importação | `upload_file` |
| AI Agent | `smart_toy` |
| Configurações | `settings` |
| Logout | `logout` |
| Alertas | `notifications_active` |
| ROAS | `trending_up` |
| Spend | `payments` |
| CPA | `price_check` |
| CTR | `ads_click` |
| Meta Ads | `thumb_up` (placeholder — usar SVG do Meta) |
| Google Ads | `search` (placeholder — usar SVG do Google) |
| Filtros | `filter_list` |
| Ordenar | `sort` |
| Adicionar | `add` |
| Editar | `edit` |
| Deletar | `delete` |
| Ver | `visibility` |
| Fechar | `close` |
| Expandir | `expand_more` |
| Colapsar | `chevron_left` |
| Arrastar | `drag_indicator` |
| Comentário | `comment` |
| Anexo | `attach_file` |
| Calendário | `calendar_today` |
| Pesquisar | `search` |
| Copiar | `content_copy` |
| Sucesso | `check_circle` |
| Erro | `error` |
| Aviso | `warning` |
| Info | `info` |
| Exportar | `download` |
| Importar | `upload` |
| Play | `play_arrow` |
| Pause | `pause` |
| Stop | `stop` |
| Refresh | `refresh` |
| Link | `link` |
| Send (chat) | `send` |
| Attach (chat) | `attach_file` |

---

## 8. Animações e Transições

Stack de animação: **`tailwindcss-animate`** (bundled com shadcn/ui) + **primitivas Radix UI** (Dialog, Dropdown, Sheet, Accordion) com `data-state` CSS transitions.

> Nunca criar animações customizadas para o que Radix já fornece. Usar os hooks `data-state="open|closed"` das primitivas shadcn.

### 8.1 Tokens de Duração e Easing

```css
/* globals.css — animation tokens */
:root {
  /* Duração */
  --duration-fast:    100ms;  /* micro-feedback: hover, active states */
  --duration-ui:      200ms;  /* padrão UI: botões, chips, toggles */
  --duration-enter:   250ms;  /* entradas de conteúdo: fade-in, slide-in */
  --duration-exit:    150ms;  /* saídas: mais rápidas que entradas */
  --duration-overlay: 300ms;  /* modals, sheets, drawers */
  --duration-slow:    400ms;  /* animações decorativas, skeleton */

  /* Easing */
  --ease-ui:      cubic-bezier(0.16, 1, 0.3, 1);   /* snappy: ideal para entradas */
  --ease-out:     cubic-bezier(0, 0, 0.2, 1);       /* padrão saída suave */
  --ease-in-out:  cubic-bezier(0.4, 0, 0.2, 1);     /* transições de estado */
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1); /* bounce sutil (FAB, badges) */
  --ease-linear:  linear;                             /* shimmer, rotação contínua */
}
```

**Tailwind config — `tailwind.config.ts`** (adicionar em `theme.extend`):

```ts
transitionDuration: {
  fast:    "var(--duration-fast)",
  ui:      "var(--duration-ui)",
  enter:   "var(--duration-enter)",
  exit:    "var(--duration-exit)",
  overlay: "var(--duration-overlay)",
  slow:    "var(--duration-slow)",
},
transitionTimingFunction: {
  "ui":       "var(--ease-ui)",
  "spring":   "var(--ease-spring)",
},
```

---

### 8.2 Primitivas Radix — Animação via `data-state`

Shadcn/ui usa Radix UI por baixo. Todas as primitivas expõem `data-state="open|closed"` e `data-side="top|bottom|left|right"`. As animações são CSS puro — `tailwindcss-animate` fornece as keyframes via classes utilitárias.

#### Dialog / AlertDialog

```css
/* globals.css */

/* Overlay */
[data-radix-dialog-overlay][data-state="open"] {
  animation: fadeIn var(--duration-overlay) var(--ease-out);
}
[data-radix-dialog-overlay][data-state="closed"] {
  animation: fadeOut var(--duration-exit) var(--ease-out);
}

/* Content */
[data-radix-dialog-content][data-state="open"] {
  animation: dialogSlideIn var(--duration-overlay) var(--ease-ui);
}
[data-radix-dialog-content][data-state="closed"] {
  animation: dialogSlideOut var(--duration-exit) var(--ease-out);
}

@keyframes dialogSlideIn {
  from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes dialogSlideOut {
  from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  to   { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
}
```

#### Sheet (AI Agent Panel e Drawers)

```css
/* Sheet — slide da direita (AI Agent Panel) */
[data-radix-dialog-content][data-state="open"][data-side="right"] {
  animation: sheetSlideInRight var(--duration-overlay) var(--ease-ui);
}
[data-radix-dialog-content][data-state="closed"][data-side="right"] {
  animation: sheetSlideOutRight var(--duration-exit) var(--ease-out);
}

@keyframes sheetSlideInRight {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
@keyframes sheetSlideOutRight {
  from { transform: translateX(0); }
  to   { transform: translateX(100%); }
}
```

#### Dropdown / Select / Popover

```css
/* Dropdown — fade + slide sutil no eixo da âncora */
[data-radix-popper-content-wrapper] [data-state="open"] {
  animation: dropdownIn var(--duration-enter) var(--ease-ui);
}
[data-radix-popper-content-wrapper] [data-state="closed"] {
  animation: dropdownOut var(--duration-exit) var(--ease-out);
}

@keyframes dropdownIn {
  from { opacity: 0; transform: translateY(-4px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dropdownOut {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(-4px) scale(0.97); }
}
```

#### Accordion

```css
/* Accordion — expand/collapse por height */
[data-radix-accordion-content] {
  overflow: hidden;
}
[data-radix-accordion-content][data-state="open"] {
  animation: accordionDown var(--duration-ui) var(--ease-ui);
}
[data-radix-accordion-content][data-state="closed"] {
  animation: accordionUp var(--duration-exit) var(--ease-out);
}

@keyframes accordionDown {
  from { height: 0; }
  to   { height: var(--radix-accordion-content-height); }
}
@keyframes accordionUp {
  from { height: var(--radix-accordion-content-height); }
  to   { height: 0; }
}
```

**Uso no JSX (shadcn pattern):**

```tsx
// shadcn já gera isso — não adicionar classes manualmente
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Campanhas ativas</AccordionTrigger>
    <AccordionContent>
      {/* conteúdo anima automaticamente via data-state */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

### 8.3 Padrões de Enter/Exit

Classes utilitárias reutilizáveis usando `tailwindcss-animate`. Aplicar via `cn()` no componente.

```css
/* globals.css — utilitários de enter/exit */

/* === FADE === */
.animate-in-fade {
  animation: fadeIn var(--duration-enter) var(--ease-ui) forwards;
}
.animate-out-fade {
  animation: fadeOut var(--duration-exit) var(--ease-out) forwards;
}
@keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

/* === SLIDE UP (toasts, notificações bottom) === */
.animate-in-slide-up {
  animation: slideUp var(--duration-enter) var(--ease-ui) forwards;
}
.animate-out-slide-down {
  animation: slideDown var(--duration-exit) var(--ease-out) forwards;
}
@keyframes slideUp   { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(8px); } }

/* === SCALE IN (metric cards, popovers) === */
.animate-in-scale {
  animation: scaleIn var(--duration-enter) var(--ease-spring) forwards;
}
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

/* === SLIDE RIGHT (AI panel FAB → panel) === */
.animate-in-slide-right {
  animation: slideRight var(--duration-overlay) var(--ease-ui) forwards;
}
@keyframes slideRight { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
```

**Mapeamento por componente:**

| Componente | Enter | Exit |
|------------|-------|------|
| Toast / Notification | `animate-in-slide-up` | `animate-out-slide-down` |
| Modal / Dialog | `dialogSlideIn` (via Radix) | `dialogSlideOut` |
| AI Agent Panel | `sheetSlideInRight` (via Radix Sheet) | `sheetSlideOutRight` |
| Dropdown / Popover | `dropdownIn` (via Radix) | `dropdownOut` |
| Metric Card (load) | `animate-in-scale` | — |
| Alert / Badge | `animate-in-fade` | `animate-out-fade` |

---

### 8.4 Skeleton (Loading State) — Dual Theme

```css
/* globals.css — skeleton adaptado por tema */

/* Dark mode skeleton */
.dark .skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.09) 50%,
    rgba(255, 255, 255, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer var(--duration-slow) var(--ease-linear) infinite;
  border-radius: 0.375rem;
}

/* Light mode skeleton */
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.04) 25%,
    rgba(0, 0, 0, 0.09) 50%,
    rgba(0, 0, 0, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer var(--duration-slow) var(--ease-linear) infinite;
  border-radius: 0.375rem;
}

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
```

> shadcn/ui tem `<Skeleton />` que usa `animate-pulse` do Tailwind. Usar o componente shadcn por padrão — só usar `.skeleton` acima quando precisar do efeito shimmer (mais rico que pulse).

```tsx
// Preferir: shadcn <Skeleton /> com animate-pulse
<Skeleton className="h-4 w-[200px]" />

// Usar shimmer custom apenas para: KPI cards, gráficos grandes, previews de imagem
<div className="skeleton h-20 w-full" />
```

---

### 8.5 Streaming Cursor e Estados do Agente AI

```css
/* globals.css — AI Agent animations */

/* Cursor piscante no streaming de texto */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
.cursor-blink {
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: var(--color-primary);  /* teal — adapta ao tema */
  animation: blink 1s step-end infinite;
  vertical-align: text-bottom;
  margin-left: 1px;
}

/* FAB pulse — estado idle do agente */
@keyframes fabPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(5, 145, 161, 0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(5, 145, 161, 0); }
}
.fab-pulse {
  animation: fabPulse 2s ease-in-out infinite;
}

/* 3 dots — estado "pensando" */
@keyframes dotBounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40%           { transform: translateY(-4px); opacity: 1; }
}
.thinking-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--color-primary);
  animation: dotBounce 1.2s ease-in-out infinite;
}
.thinking-dot:nth-child(2) { animation-delay: 0.2s; }
.thinking-dot:nth-child(3) { animation-delay: 0.4s; }

/* Tool call badge — "executando..." pulse sutil */
@keyframes toolPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
.tool-executing {
  animation: toolPulse 1.5s ease-in-out infinite;
}
```

**Uso nos estados do agente:**

```tsx
// Estado idle — FAB com pulse
<button className="fab-pulse bg-primary rounded-full w-12 h-12">
  <span className="material-symbols-outlined text-white">smart_toy</span>
</button>

// Estado streaming — cursor piscante
<p>
  {streamedText}
  <span className="cursor-blink" aria-hidden="true" />
</p>

// Estado pensando — 3 dots
<div className="flex gap-1 items-center px-3 py-2" role="status" aria-label="Agente pensando">
  <span className="thinking-dot" />
  <span className="thinking-dot" />
  <span className="thinking-dot" />
</div>

// Tool call em execução
<span className="tool-executing inline-flex items-center gap-1 text-primary text-xs px-2 py-0.5 bg-primary/10 rounded">
  executando {toolName}...
</span>
```

---

### 8.6 Regras de Uso

| Regra | Detalhe |
|-------|---------|
| Primitivas Radix primeiro | Nunca reimplementar o que Dialog/Sheet/Accordion já animam |
| `tailwindcss-animate` para utilitários | Classes `animate-in`, `animate-out` antes de CSS custom |
| Duração máxima UI | 300ms — acima disso parece lento em dashboards |
| `prefers-reduced-motion` | Sempre respeitar |
| Skeleton: shadcn por padrão | Shimmer custom apenas para previews maiores |
| Cores de animação via token | Usar `var(--color-primary)` — adapta automaticamente ao tema |

```css
/* globals.css — respeitar preferência do usuário */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Estrutura de Layout Base

### Sidebar (256px, fixed)

```
┌──────────────────────┐
│ [Logo] Uhuru OS      │ ← Montserrat bold, teal accent
│  "Operations Hub"   │ ← caption uppercase tracking-wide
├──────────────────────┤
│                      │
│  [ico] Dashboard     │ ← item ativo: teal + bg teal/5 + border-r teal
│  [ico] Clientes      │ ← item inativo: slate-400
│  [ico] Campanhas     │
│  [ico] Tarefas       │
│  [ico] Automações    │
│  [ico] API Connector │
│  [ico] Importação    │
│  [ico] AI Agent      │ ← destaque visual (badge "BETA" ou pulse)
│                      │
├──────────────────────┤
│  [ico] Configurações │
│                      │
│ ┌──────────────────┐ │
│ │ [avatar] João    │ │ ← user card no footer
│ │ Owner            │ │
│ └──────────────────┘ │
└──────────────────────┘
```

### Topbar (64px, fixed)

```
┌──────────────────────────────────────────────────────┐
│  [search input 384px]       [alerts] [user avatar]   │
└──────────────────────────────────────────────────────┘
```

### Content Area

```
left: 256px (sidebar)
right: 0 (ou 400px quando AI panel aberto)
top: 64px (topbar)
padding: px-8 py-6
overflow-y: auto
```

### AI Agent Panel (400px, fixed right, overlay ou push)

```
┌──────────────────────┐
│ AI Agent      [×]    │ ← header com ícone e botão fechar
├──────────────────────┤
│                      │
│ [mensagens...]       │
│                      │
├──────────────────────┤
│ [input] [attach][send]│
└──────────────────────┘
```

Comportamento:
- Default: fechado (FAB flutuante no canto inferior direito)
- `>= 1536px`: abre em modo push (content area encolhe)
- `< 1536px`: abre em modo overlay (sobre o content)

---

## 10. Sistema Dual Theme

O Uhuru OS suporta **dark mode e light mode**. Light é o padrão (`:root`). Dark ativa via `class="dark"` no `<html>`.

### 10.1 Ativação

```html
<!-- Light mode (padrão — sem classe) -->
<html lang="pt-BR">

<!-- Dark mode -->
<html lang="pt-BR" class="dark">
```

### 10.2 Toggle de Tema (React)

```tsx
// hooks/useTheme.ts
import { useState, useEffect } from "react"

type Theme = "light" | "dark"

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("uhuru-theme") as Theme | null
    return stored ?? "light"
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("uhuru-theme", theme)
  }, [theme])

  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark")

  return { theme, toggle }
}
```

### 10.3 Padrão de Uso com Tailwind

Usar `dark:` prefix para sobreposições pontuais que os tokens semânticos não cobrem:

```tsx
// Preferir tokens semânticos (adaptam automaticamente):
<div className="bg-surface text-on-surface border-outline">...</div>

// dark: prefix para casos específicos sem token semântico:
<div className="shadow-sm dark:shadow-none">...</div>
<div className="bg-white dark:bg-surface-mid">...</div>
```

### 10.4 Tabela Comparativa de Tokens por Tema

| Token semântico | Light (`#`) | Dark (`#`) |
|-----------------|-------------|------------|
| `bg-background` | `#f5f5f5` | `#1a1a1a` |
| `bg-surface` | `#ffffff` | `#1a1a1a` |
| `bg-surface-mid` | `#f5f5f5` | `#222222` |
| `bg-surface-high` | `#ffffff` | `#2a2a2a` |
| `text-on-surface` | `#0d0d0d` | `#e2e4f6` |
| `text-on-variant` | `#434343` | `#a7aabb` |
| `text-on-muted` | `#595959` | `#717584` |
| `border-outline` | `#e0e0e0` | `#3a3a3a` |
| `text-primary` | `#0591a1` | `#0591a1` |
| `bg-primary-container` | `#e6f7f9` | `#0a3a40` |

---

## 11. Acessibilidade (WCAG AA)

Contraste mínimo: 4.5:1 para texto normal, 3:1 para texto large (>18px ou bold).

**Dark mode — verificações:**

| Par de cores | Ratio | Uso permitido |
|--------------|-------|---------------|
| `#0591a1` sobre `#1a1a1a` | ~3.9:1 | Texto large/bold, ícones, borders ✓ |
| `#e2e4f6` sobre `#1a1a1a` | ~13.2:1 | Texto normal ✓ |
| `#a7aabb` sobre `#1a1a1a` | ~5.8:1 | Texto normal ✓ |
| `#717584` sobre `#1a1a1a` | ~3.8:1 | Apenas decorativo/captions |

**Light mode — verificações:**

| Par de cores | Ratio | Uso permitido |
|--------------|-------|---------------|
| `#0591a1` sobre `#ffffff` | ~3.3:1 | Texto large/bold, ícones, borders ✓ |
| `#0591a1` sobre `#f5f5f5` | ~3.2:1 | Idem — nunca texto body pequeno |
| `#0d0d0d` sobre `#ffffff` | ~19.3:1 | Texto normal ✓ |
| `#434343` sobre `#ffffff` | ~8.6:1 | Texto normal ✓ |
| `#595959` sobre `#ffffff` | ~6.0:1 | Texto normal ✓ |

> **Regra crítica:** `#0591a1` (teal primário) **não passa** 4.5:1 em nenhum fundo (claro ou escuro). Nunca usar como texto body normal. Sempre usar para: icons, borders, backgrounds de badge, texto large bold, interactive indicators.
- Todos os inputs têm `label` associado (mesmo que visualmente hidden com `sr-only`)
- Focus rings visíveis: `focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background`
- Navegação por teclado: sidebar itens são `<a>` ou `<button>`, tab-order lógico
- Drag-and-drop do Kanban: alternativa por teclado (Enter para selecionar, setas para mover)
- `aria-label` obrigatório em todos os icon buttons
- `role="status"` no streaming do chat para screen readers

---

## 12. Estados Visuais do Agente AI

O chat do agente transmite estado via animação — cada situação tem sua linguagem visual. Implementações em **§ 8.5**.

| Estado | Classe / Componente | Descrição |
|--------|---------------------|-----------|
| Idle (fechado) | `.fab-pulse` | FAB com pulse suave em teal, 2s loop |
| Streaming | `.cursor-blink` | Cursor `│` piscante ao final do texto |
| Pensando | `.thinking-dot` (×3) | 3 dots com bounce em cascata |
| Tool call | `.tool-executing` | Badge "executando [tool]..." com opacity pulse |
| Tool result | `<Accordion>` shadcn | Bloco colapsável, anima via Radix `data-state` |
| Confirmação | `<AlertDialog>` shadcn | Modal com `dialogSlideIn`, borda `error` |

> Para implementação, ver **§ 8.5** (CSS) e **§ 8.2** (Radix Sheet para o painel lateral).

---

*Uhuru OS Design System v1.1 — Uma (@ux-design-expert) — 2026-04-08 | Dual Theme: Dark (Obsidian) + Light (Uhuru Brand)*
