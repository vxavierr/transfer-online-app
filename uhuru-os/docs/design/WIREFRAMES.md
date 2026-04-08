# Uhuru OS — Wireframes (ASCII/Estrutural)

> Versão 1.0 | Desktop-first (1280px+) | Todas as 10 telas MVP
> Convenção: `[ ]` = componente interativo, `---` = separador, `#` = dado dinâmico

---

## Convenções de Wireframe

```
┌─────────────────────────────────────────────┐
│ MOLDURA = área delimitada                   │
│ [Botão]    = elemento clicável              │
│ {Input}    = campo de entrada               │
│ [#métrica] = valor dinâmico                 │
│ ▲▼         = tendência (alta/queda)         │
│ ●          = status indicator               │
│ ···        = conteúdo repetido (n vezes)    │
│ [scroll]   = área com scroll                │
└─────────────────────────────────────────────┘
```

---

## TELA 1: Login / Auth

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                    │
│                          [background: dark gradient]                              │
│                                                                                    │
│                    ┌──────────────────────────────────┐                           │
│                    │ glass-card  w-96  rounded-2xl    │                           │
│                    │                                  │                           │
│                    │  [Logo Uhuru] Uhuru OS           │                           │
│                    │  "Operations Hub"                │                           │
│                    │  ────────────────────────────    │                           │
│                    │                                  │                           │
│                    │  {Email}                         │                           │
│                    │  ─────────────────────────────   │                           │
│                    │  {Senha}              [👁]       │                           │
│                    │  ─────────────────────────────   │                           │
│                    │                                  │                           │
│                    │  [Entrar →]  (btn primary full)  │                           │
│                    │                                  │                           │
│                    │  ── ou ──                        │                           │
│                    │                                  │                           │
│                    │  [G Continuar com Google]        │                           │
│                    │                                  │                           │
│                    │  Esqueceu a senha?               │                           │
│                    └──────────────────────────────────┘                           │
│                                                                                    │
│              Uhuru OS v1.0  ·  Acesso restrito à equipe Uhuru                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

**Notas:**
- Sem registro público — apenas login (equipe interna)
- Google OAuth via Supabase Auth
- Erro de autenticação: shake animation + border error no input

---

## TELA 2: Dashboard Geral (Home)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (256px)         │ TOPBAR (64px, fixed)                                         │
│                         │ {Search...}              [🔔 3] [avatar João ▼]             │
│ [logo] Uhuru OS         ├──────────────────────────────────────────────────────────────┤
│  Operations Hub         │                                                              │
│ ─────────────────────   │ Dashboard Geral                    [Período: Últimos 30d ▼]  │
│ ● Dashboard        ←    │                                                              │
│   Clientes              │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────┐│
│   Campanhas             │ │ SPEND TOTAL  │ │ ROAS MÉDIO   │ │ CLIENTES     │ │ALERTA││
│   Tarefas               │ │              │ │              │ │ ATIVOS       │ │  S   ││
│   Automações            │ │ R$ #.###     │ │ #.##x        │ │              │ │      ││
│   API Connector         │ │ ▲ +12.3%     │ │ ▼ -0.3x      │ │    ##        │ │  ##  ││
│   Importação            │ │ vs mês ant.  │ │ vs mês ant.  │ │ ativo(s)     │ │ atv  ││
│   AI Agent   [pulse●]   │ └──────────────┘ └──────────────┘ └──────────────┘ └──────┘│
│ ─────────────────────   │                                                              │
│   Configurações         │ ── Clientes ──────────────────────────────── [+ Novo] [⬍]   │
│                         │                                                              │
│ ┌───────────────────┐   │ ┌─────────────────────────────────────────────────────────┐ │
│ │ [av] João         │   │ │ CLIENTE         PLATAFORMA   SPEND     ROAS   STATUS    │ │
│ │ Owner             │   │ │ ──────────────────────────────────────────────────────  │ │
│ └───────────────────┘   │ │ [av] Cliente A  [f][G]       R$#.###   #.##x  ● ativo  │ │
│                         │ │ [av] Cliente B  [f]          R$#.###   #.##x  ● ativo  │ │
│                         │ │ [av] Cliente C  [G]          R$#.###   #.##x  ⚠ alerta │ │
│                         │ │ [av] Cliente D  [f][G]       R$#.###   #.##x  ● ativo  │ │
│                         │ │ ···                                                     │ │
│                         │ │                              ← Prev  1 2 3  Next →     │ │
│                         │ └─────────────────────────────────────────────────────────┘ │
│                         │                                                              │
│                         │ ── Alertas Ativos ──────────────────────────────────────    │
│                         │ ┌──────────────────────────────────────────────────────────┐│
│                         │ │ [!] ROAS abaixo do threshold · Cliente C · Meta Ads     ││
│                         │ │     ROAS atual: 1.2x (threshold: 2.0x)    [Ver] [Dismiss]││
│                         │ │ [!] Budget esgotando · Cliente A · Google Ads            ││
│                         │ │     Budget restante: R$150 (5% do total)  [Ver] [Dismiss]││
│                         │ └──────────────────────────────────────────────────────────┘│
│                         │                                                              │
│                         │ ── Tarefas Pendentes ─────────────────────────────────────  │
│                         │ ┌──────────────────────────────────────────────────────────┐│
│                         │ │ [ ] Criar criativos Q2 · Cliente B · Prazo: 15/04      ││
│                         │ │ [ ] Review campanha Meta · Cliente A · Alta prioridade  ││
│                         │ │ [ ] Reunião de alinhamento · Cliente D · Amanhã         ││
│                         │ │                                    [Ver todas as tarefas]││
│                         │ └──────────────────────────────────────────────────────────┘│
│                         │                                              [AI ● btn fab] │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Notas:**
- Cards de KPI: clicáveis — hover revela tooltip com breakdown
- Tabela de clientes: clique na linha abre Dashboard por Cliente
- Coluna ROAS: colorida (verde >2x, amarelo 1-2x, vermelho <1x)
- FAB do AI Agent: `fixed bottom-6 right-6`, pulse animation quando idle
- Alertas: ordenados por severidade (error → warning)

---

## TELA 3: Dashboard por Cliente

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR           │ TOPBAR                                                              │
│ (igual tela 2)    │ {Search}                    [🔔] [avatar ▼]                        │
│                   ├─────────────────────────────────────────────────────────────────────┤
│                   │ ← Clientes  /  [av] Cliente A                                      │
│                   │                                                                     │
│                   │ ┌──────────────────────────────────────────────────────────────────┐│
│                   │ │ HERO DO CLIENTE                                        [Editar] ││
│                   │ │ [logo cliente]  Nome do Cliente SA                             ││
│                   │ │ CNPJ: ##.###.###/####-##    ● Ativo    Desde: Jan/2024        ││
│                   │ │ Contas: [f] act_########  [G] #######-###                     ││
│                   │ └──────────────────────────────────────────────────────────────────┘│
│                   │                                                                     │
│                   │ [Período: Últimos 30d ▼]  [Plataforma: Todas ▼]                    │
│                   │                                                                     │
│                   │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│                   │ │ SPEND    │ │ ROAS     │ │ CPA      │ │ CTR      │ │ CLICKS   │ │
│                   │ │ R$#.###  │ │ #.##x    │ │ R$##.##  │ │ #.##%    │ │ #.###    │ │
│                   │ │ ▲ +12%   │ │ ▲ +0.3   │ │ ▼ -R$5   │ │ ▲ +0.2%  │ │ ▲ +234   │ │
│                   │ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                   │                                                                     │
│                   │ ┌──────────────────────────────────────────┐ ┌──────────────────┐ │
│                   │ │ GRÁFICO — Performance no Período         │ │ CAMPANHAS ATIVAS │ │
│                   │ │ [line chart: spend + ROAS dual-axis]     │ │                  │ │
│                   │ │                                          │ │ [f] Meta (3)     │ │
│                   │ │  ^                                       │ │ ─────────────    │ │
│                   │ │  │    ·····                              │ │ Campanha 1  ●    │ │
│                   │ │  │  ·       ·  ·                        │ │ ROAS: #.##x      │ │
│                   │ │  │·             ·                       │ │ Spend: R$###     │ │
│                   │ │  └──────────────────────→ tempo         │ │ Campanha 2  ●    │ │
│                   │ │  Jan   Fev   Mar   Abr                  │ │ ···              │ │
│                   │ └──────────────────────────────────────────┘ │                  │ │
│                   │                                              │ [G] Google (2)   │ │
│                   │ ┌──────────────────────────────────────────┐ │ ─────────────    │ │
│                   │ │ TAREFAS DO CLIENTE       [+ Nova tarefa] │ │ Campanha A  ●    │ │
│                   │ │                                          │ │ ···              │ │
│                   │ │ Em andamento (2)                         │ └──────────────────┘ │
│                   │ │  ● Criar criativos Q2    Alta · 15/04   │                      │
│                   │ │  ● Review campanha Meta  Média · 20/04  │                      │
│                   │ │ Backlog (5)              [Ver Kanban →]  │                      │
│                   │ └──────────────────────────────────────────┘                      │
│                   │                                                                    │
│                   │ ┌──────────────────────────────────────────────────────────────┐  │
│                   │ │ HISTÓRICO DO AGENTE AI                         [Expandir ▼]  │  │
│                   │ │  🤖 14/04 · "Resumo de performance do Cliente A gerado..."   │  │
│                   │ │  🤖 12/04 · "Campanha 'Verão 2024' pausada via agente..."   │  │
│                   │ └──────────────────────────────────────────────────────────────┘  │
│                   │                                              [AI ● btn fab]        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Notas:**
- Hero do cliente: glassmorphism card com gradiente sutil de teal
- Gráfico: Recharts (dual axis — spend em R$ eixo E, ROAS eixo D)
- KPI cards: clicáveis → abre drawer com série histórica detalhada
- Campanhas: lista compacta com indicador de plataforma colorido
- Histórico do agente: logs auditáveis, colapsável

---

## TELA 4: Lista de Clientes

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR           │ TOPBAR                                                              │
│                   │                                                                     │
│                   ├─────────────────────────────────────────────────────────────────────┤
│                   │ Clientes                                    [+ Novo Cliente]        │
│                   │                                                                     │
│                   │ {Buscar cliente...}  [Status: Todos ▼]  [Plataforma: Todas ▼]      │
│                   │                                                                     │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ [□]  NOME           STATUS   PLATAFORMA   SPEND   ROAS  AÇÕES│   │
│                   │ │ ────────────────────────────────────────────────────────────  │   │
│                   │ │ [□]  [av] Cliente A  ● Ativo  [f][G]  R$#.###  #.##x  [···]│   │
│                   │ │ [□]  [av] Cliente B  ● Ativo  [f]     R$#.###  #.##x  [···]│   │
│                   │ │ [□]  [av] Cliente C  ⚠ Alerta [G]     R$#.###  #.##x  [···]│   │
│                   │ │ [□]  [av] Cliente D  ● Ativo  [f][G]  R$#.###  #.##x  [···]│   │
│                   │ │ [□]  [av] Cliente E  ⏸ Pausado [f]    R$#.###  #.##x  [···]│   │
│                   │ │ ···                                                         │   │
│                   │ │                               ← Prev  1 de 3  Next →       │   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
│                   │                                                                     │
│                   │ ── Formulário: Novo Cliente (Drawer / Modal) ────────────────────   │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ Novo Cliente                                         [×]     │   │
│                   │ │ ─────────────────────────────────────────────────────────    │   │
│                   │ │ Nome *          {Nome da empresa}                           │   │
│                   │ │ CNPJ            {##.###.###/####-##}                        │   │
│                   │ │ Contato         {Nome do contato}                           │   │
│                   │ │ E-mail          {email@empresa.com}                         │   │
│                   │ │ Status          [Ativo ▼]                                   │   │
│                   │ │                                                             │   │
│                   │ │ ── Contas de Ads ─────────────────────────────────────      │   │
│                   │ │ Meta Account ID  {act_############}                         │   │
│                   │ │ Google Account   {###-###-####}                             │   │
│                   │ │                                                             │   │
│                   │ │ ── Documentos ────────────────────────────────────────      │   │
│                   │ │ [📎 Anexar contrato]  [📎 Anexar plano de mídia]           │   │
│                   │ │                                                             │   │
│                   │ │                     [Cancelar]  [Salvar Cliente]            │   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Notas:**
- Drawer desliza da direita (shadcn/ui `<Sheet>`)
- Upload de documentos: progress bar + preview do nome do arquivo
- Menu `[···]` na tabela: Ver, Editar, Pausar, Excluir
- Row click → Dashboard por Cliente

---

## TELA 5: Campanhas

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR           │ TOPBAR                                                              │
│                   │                                                                     │
│                   ├─────────────────────────────────────────────────────────────────────┤
│                   │ Campanhas                                        [↻ Sincronizar]    │
│                   │                                                                     │
│                   │ [Cliente: Todos ▼]  [Período: Últimos 30d ▼]  [Plataforma: Todas ▼]│
│                   │ [Status: Todas ▼]                                                   │
│                   │                                                                     │
│                   │ ─ Meta Ads ──────────────────────────────────────────────────────   │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ CAMPANHA        CLIENTE   SPEND     ROAS  CPA   CTR  STATUS  │   │
│                   │ │ ──────────────────────────────────────────────────────────── │   │
│                   │ │ [f] Campanha X  Cliente A R$#.###  #.##x R$##  #.#% ● ativa │   │
│                   │ │ [f] Campanha Y  Cliente B R$#.###  #.##x R$##  #.#% ● ativa │   │
│                   │ │ [f] Campanha Z  Cliente C R$#.###  ⚠1.1x R$##  #.#% ⚠ alerta│  │
│                   │ └──────────────────────────────────────────────────────────────┘   │
│                   │                                                                     │
│                   │ ─ Google Ads ────────────────────────────────────────────────────   │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ CAMPANHA        CLIENTE   SPEND     ROAS  CPA   CTR  STATUS  │   │
│                   │ │ ──────────────────────────────────────────────────────────── │   │
│                   │ │ [G] Campanha A  Cliente A R$#.###  #.##x R$##  #.#% ● ativa │   │
│                   │ │ [G] Campanha B  Cliente D R$#.###  #.##x R$##  #.#% ● ativa │   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
│                   │                                                                     │
│                   │ ── Detalhe de Campanha (click → drawer) ─────────────────────────  │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ [f] Campanha X — Cliente A                           [×]    │   │
│                   │ │ Status: ● Ativa   Período: 01/03 – 31/03   Budget: R$#.###  │   │
│                   │ │ ─────────────────────────────────────────────────────────    │   │
│                   │ │ Spend: R$#.###   ROAS: #.##x   CPA: R$##.##   CTR: #.##%   │   │
│                   │ │ Impressões: ##.###   Clicks: #.###                           │   │
│                   │ │                                                             │   │
│                   │ │ [line chart: spend diário]                                  │   │
│                   │ │                                                             │   │
│                   │ │ Ad Sets (3)                                   [Expandir ▼] │   │
│                   │ │  AdSet 1 · R$### · ROAS #.##x · ● ativa                   │   │
│                   │ │  AdSet 2 · R$### · ROAS #.##x · ● ativa                   │   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Notas:**
- ROAS com cor semântica: <1.5x vermelho, 1.5-2.5x amarelo, >2.5x verde
- Drawer de detalhe: shadcn/ui `<Sheet side="right" size="lg">`
- Sincronizar: chama API Meta/Google, spinner enquanto carrega
- Atualização de dados: badge "Atualizado há X min" no topo de cada seção

---

## TELA 6: Tarefas (Kanban)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR           │ TOPBAR                                                              │
│                   │                                                                     │
│                   ├─────────────────────────────────────────────────────────────────────┤
│                   │ Tarefas               [+ Nova Tarefa]  [Cliente: Todos ▼] [Membro ▼]│
│                   │                                                                     │
│                   │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────┐│
│                   │ │ BACKLOG (5)     │ │ EM ANDAMENTO (3)│ │ REVIEW (2)      │ │CONC ││
│                   │ │                 │ │                 │ │                 │ │(8)  ││
│                   │ │ ┌─────────────┐ │ │ ┌─────────────┐│ │ ┌─────────────┐ │ │     ││
│                   │ │ │Criar brief  │ │ │ │Criar criat..││ │ │Review camp..│ │ │ ··· ││
│                   │ │ │Cliente B    │ │ │ │Cliente A    ││ │ │Cliente C    │ │ │     ││
│                   │ │ │[av] Maria   │ │ │ │[av] Pedro   ││ │ │[av] Ana     │ │ │     ││
│                   │ │ │Média · 20/04│ │ │ │Alta · 15/04 ││ │ │Alta · 18/04 │ │ │     ││
│                   │ │ └─────────────┘ │ │ └─────────────┘│ │ └─────────────┘ │ │     ││
│                   │ │ ┌─────────────┐ │ │ ┌─────────────┐│ │ ┌─────────────┐ │ │     ││
│                   │ │ │Alinhar meta │ │ │ │Relatório Q1 ││ │ │Briefing novo│ │ │     ││
│                   │ │ │Cliente D    │ │ │ │Cliente B    ││ │ │Cliente D    │ │ │     ││
│                   │ │ │[av] João    │ │ │ │[av] Maria   ││ │ │[av] Pedro   │ │ │     ││
│                   │ │ │Baixa · —    │ │ │ │Média · 30/04││ │ │Média · 22/04│ │ │     ││
│                   │ │ └─────────────┘ │ │ └─────────────┘│ │ └─────────────┘ │ │     ││
│                   │ │ ···             │ │ ···             │ │                 │ │     ││
│                   │ │                 │ │                 │ │                 │ │     ││
│                   │ │ [+ Adicionar]   │ │ [+ Adicionar]   │ │ [+ Adicionar]   │ │     ││
│                   │ └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────┘│
│                   │                                                                      │
│                   │ ── Detalhe de Tarefa (click → drawer) ──────────────────────────   │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ Criar criativos Q2                                   [×]    │   │
│                   │ │ ─────────────────────────────────────────────────────────    │   │
│                   │ │ Status: [Em andamento ▼]   Prioridade: [Alta ▼]             │   │
│                   │ │ Cliente: [av] Cliente A     Responsável: [av] Pedro          │   │
│                   │ │ Prazo: [📅 15/04/2026]                                      │   │
│                   │ │                                                             │   │
│                   │ │ Descrição                                                   │   │
│                   │ │ {Descreva a tarefa...}                                      │   │
│                   │ │                                                             │   │
│                   │ │ ─ Comentários ────────────────────────────────────────      │   │
│                   │ │ [av] Pedro · 2h atrás                                       │   │
│                   │ │ "Criativos do carrossel prontos, aguardando aprovação"      │   │
│                   │ │                                                             │   │
│                   │ │ {Adicionar comentário...}                        [Enviar]   │   │
│                   │ │                                                             │   │
│                   │ │                              [Deletar]  [Salvar]            │   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Notas:**
- Drag-and-drop entre colunas via `@dnd-kit/sortable`
- Prioridade: ponto colorido no card (alta=vermelho, média=amarelo, baixa=cinza)
- Prazo vencido: data em vermelho
- Coluna "Concluído" colapsável para não poluir o board
- Keyboard alternative: tecla `Enter` seleciona card, setas movem entre colunas

---

## TELA 7: Automações

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR           │ TOPBAR                                                              │
│                   │                                                                     │
│                   ├─────────────────────────────────────────────────────────────────────┤
│                   │ Automações (n8n)                           [↻ Sincronizar com n8n]  │
│                   │                                                                     │
│                   │ ─ Workflows ─────────────────────────────────────── [Buscar...]    │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ NOME                      STATUS    ÚLTIMA EXEC.   AÇÕES     │   │
│                   │ │ ──────────────────────────────────────────────────────────── │   │
│                   │ │ Alerta ROAS Baixo          ● Ativo   há 2h        [▶][⏸][···]│  │
│                   │ │ Relatório Semanal          ● Ativo   ontem        [▶][⏸][···]│  │
│                   │ │ Sincronizar Budget         ⏸ Pausado há 3 dias   [▶][⏸][···]│  │
│                   │ │ Notificação Budget Baixo   ● Ativo   há 30min    [▶][⏸][···]│  │
│                   │ └──────────────────────────────────────────────────────────────┘   │
│                   │                                                                     │
│                   │ ─ Triggers Automáticos ─────────────────────────── [+ Novo Trigger]│
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ CONDIÇÃO                          AÇÃO              STATUS   │   │
│                   │ │ ──────────────────────────────────────────────────────────── │   │
│                   │ │ ROAS < 1.5x (qualquer cliente)    Alerta ROAS Baixo  ● Ativo│   │
│                   │ │ Budget < 10% do total             Notif. Budget Baixo ● Ativo│  │
│                   │ └──────────────────────────────────────────────────────────────┘   │
│                   │                                                                     │
│                   │ ─ Log de Execuções ─────────────────────────────────────────────   │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ WORKFLOW              TIMESTAMP         STATUS    DURAÇÃO     │   │
│                   │ │ ──────────────────────────────────────────────────────────── │   │
│                   │ │ Alerta ROAS Baixo      14/04 14:32      ✓ Sucesso  1.2s [▼] │   │
│                   │ │ Relatório Semanal      13/04 09:00      ✓ Sucesso  4.5s [▼] │   │
│                   │ │ Sincronizar Budget     11/04 11:00      ✗ Erro     2.1s [▼] │   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
│                   │                                                                     │
│                   │ ── Novo Trigger (Modal) ─────────────────────────────────────────  │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ Novo Trigger                                          [×]    │   │
│                   │ │ Quando: [ROAS cair abaixo de ▼]  {2.0}x                     │   │
│                   │ │ Para: [Cliente: Todos ▼]  [Plataforma: Todas ▼]             │   │
│                   │ │ Executar workflow: [Alerta ROAS Baixo ▼]                    │   │
│                   │ │                                [Cancelar]  [Criar Trigger]   │   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Notas:**
- [▶] = Executar agora (confirmar antes de executar)
- [⏸] = Pausar/Ativar toggle
- Log com [▼] expande detalhes da execução (JSON input/output colapsado)
- Linha com erro: texto em vermelho, ícone `error`

---

## TELA 8: API Connector

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR           │ TOPBAR                                                              │
│                   │                                                                     │
│                   ├─────────────────────────────────────────────────────────────────────┤
│                   │ API Connector                                   [+ Registrar API]   │
│                   │                                                                     │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ NOME              URL BASE              AUTH    STATUS AÇÕES  │   │
│                   │ │ ──────────────────────────────────────────────────────────── │   │
│                   │ │ Pipedrive CRM     https://api.pipe...  Bearer  ✓ Ok   [···] │   │
│                   │ │ ActiveCampaign    https://conta.api... API Key ✓ Ok   [···] │   │
│                   │ │ Slack Webhook     https://hooks.slac.. None    ✓ Ok   [···] │   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
│                   │                                                                     │
│                   │ ── Registrar/Editar API (Drawer) ────────────────────────────────  │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ Registrar API Externa                                [×]     │   │
│                   │ │ ─────────────────────────────────────────────────────────    │   │
│                   │ │ Nome *          {Nome da API}                               │   │
│                   │ │ URL Base *      {https://api.exemplo.com/v1}               │   │
│                   │ │ Autenticação    [Bearer Token ▼]                            │   │
│                   │ │ Token           {eyJ...}  [👁]                              │   │
│                   │ │ Headers extras  {chave: valor}  [+ Adicionar header]        │   │
│                   │ │                                                             │   │
│                   │ │ ─ Testar Conexão ─────────────────────────────────────      │   │
│                   │ │ Endpoint de teste  {/health ou /me}                         │   │
│                   │ │ Método             [GET ▼]                                  │   │
│                   │ │ [Testar agora]                                              │   │
│                   │ │                                                             │   │
│                   │ │ ┌──────────────────────────────────────────────────────┐   │   │
│                   │ │ │ Resposta: 200 OK · 142ms                             │   │   │
│                   │ │ │ { "status": "ok", "user": "johndoe@uhuru.com" }      │   │   │
│                   │ │ └──────────────────────────────────────────────────────┘   │   │
│                   │ │                                                             │   │
│                   │ │ Disponível como tool do agente: [x] Sim                    │   │
│                   │ │ Nome da tool: {uhuru_pipedrive}                            │   │
│                   │ │                     [Cancelar]  [Salvar API]               │   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Notas:**
- Token/secret: masked por padrão, olho para revelar
- Resposta do teste: syntax highlighted, scrollável
- Checkbox "tool do agente" determina se aparece no registry do agent-harness

---

## TELA 9: Importação de Dados

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR           │ TOPBAR                                                              │
│                   │                                                                     │
│                   ├─────────────────────────────────────────────────────────────────────┤
│                   │ Importação de Dados                                                 │
│                   │                                                                     │
│                   │ ─ Nova Importação ─────────────────────────────────────────────    │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ Origem:  [○ CSV/Planilha]  [○ Google Sheets]                │   │
│                   │ │                                                             │   │
│                   │ │ ┌──────────────────────────────────────────────────────┐   │   │
│                   │ │ │                                                      │   │   │
│                   │ │ │    [📁 Arraste o arquivo aqui ou clique para enviar]  │   │   │
│                   │ │ │    Formatos aceitos: CSV, XLSX, XLS · Max 10MB       │   │   │
│                   │ │ │                                                      │   │   │
│                   │ │ └──────────────────────────────────────────────────────┘   │   │
│                   │ │                                                             │   │
│                   │ │ ─ Preview (após upload) ──────────────────────────────      │   │
│                   │ │ 247 linhas detectadas · 8 colunas                           │   │
│                   │ │                                                             │   │
│                   │ │ ─ Mapeamento de Colunas ──────────────────────────────      │   │
│                   │ │ Coluna do arquivo    →   Campo no sistema                   │   │
│                   │ │ "campaign_name"      →   [Nome da Campanha ▼]              │   │
│                   │ │ "spend"              →   [Spend R$ ▼]                      │   │
│                   │ │ "date"               →   [Data ▼]                          │   │
│                   │ │ "roas"               →   [ROAS ▼]                          │   │
│                   │ │ "account_id"         →   [Conta de Ads ▼]                  │   │
│                   │ │ ───                                                        │   │
│                   │ │ "unknown_col"        →   [Ignorar ▼]                       │   │
│                   │ │                                                             │   │
│                   │ │ ─ Preview da Importação (5 linhas) ───────────────────      │   │
│                   │ │ ┌────────────────────────────────────────────────────┐     │   │
│                   │ │ │ Campanha     Spend   ROAS   Data        Conta      │     │   │
│                   │ │ │ Camp. X      R$1.234  2.3x  01/04/2026  act_###    │     │   │
│                   │ │ │ Camp. Y      R$856    1.8x  01/04/2026  act_###    │     │   │
│                   │ │ └────────────────────────────────────────────────────┘     │   │
│                   │ │                        [Cancelar]  [Importar 247 linhas]   │   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
│                   │                                                                     │
│                   │ ─ Histórico de Importações ─────────────────────────────────────   │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ ARQUIVO              DATA       LINHAS  STATUS    AÇÕES      │   │
│                   │ │ ──────────────────────────────────────────────────────────── │   │
│                   │ │ campanhas_marco.csv  01/04      247     ✓ Importado  [↓][🗑]│   │
│                   │ │ report_q1.xlsx       28/03      1.203   ✓ Importado  [↓][🗑]│   │
│                   │ │ dados_errados.csv    15/03      50      ✗ Erro       [↓][🗑]│   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Notas:**
- Drop zone: drag-and-drop nativo com `react-dropzone`
- Mapeamento: auto-detect por nome de coluna, usuário corrige manualmente
- Importação: progress bar modal, não bloqueia UI após confirmar
- Erro na linha: expandível com detalhes do erro por linha

---

## TELA 10: AI Agent (Chat Interface)

### Modo Side Panel (principal — 400px fixo à direita)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR  │ TOPBAR                                     │ AI PANEL (400px)               │
│          │                                            │                                │
│ (normal) ├────────────────────────────────────────────┤ AI Agent           [↗][×]     │
│          │                                            │ ─────────────────────────────  │
│          │ [conteúdo normal da tela atual]            │ Histórico              [+ Nova] │
│          │  visível e interativo enquanto             │                                │
│          │  chat está aberto →                        │ [scroll]                       │
│          │                                            │                                │
│          │                                            │ ┌──────────────────────────┐   │
│          │                                            │ │ [av] João                │   │
│          │                                            │ │ "Como está o ROAS do     │   │
│          │                                            │ │  Cliente A este mês?"    │   │
│          │                                            │ └──────────────────────────┘   │
│          │                                            │                                │
│          │                                            │ ┌──────────────────────────┐   │
│          │                                            │ │ 🤖 Uhuru AI              │   │
│          │                                            │ │                          │   │
│          │                                            │ │ O Cliente A teve ROAS    │   │
│          │                                            │ │ médio de 2.8x em abril,  │   │
│          │                                            │ │ acima do threshold de    │   │
│          │                                            │ │ 2.0x configurado.        │   │
│          │                                            │ │                          │   │
│          │                                            │ │ ┌────────────────────┐   │   │
│          │                                            │ │ │ tool: get_metrics  │   │   │
│          │                                            │ │ │ cliente: Cliente A │   │   │
│          │                                            │ │ │ período: abr/2026  │   │   │
│          │                                            │ │ │ ✓ executado        │   │   │
│          │                                            │ │ └────────────────────┘   │   │
│          │                                            │ └──────────────────────────┘   │
│          │                                            │                                │
│          │                                            │ ┌──────────────────────────┐   │
│          │                                            │ │ 🤖 Uhuru AI ████▌        │   │
│          │                                            │ │ (streaming em progresso) │   │
│          │                                            │ └──────────────────────────┘   │
│          │                                            │                                │
│          │                                            │ ┌────────────────────────┐     │
│          │                                            │ │ {Pergunte algo...}  [⊕]│     │
│          │                                            │ │                    [→] │     │
│          │                                            │ └────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Modo Full Screen (expandido via [↗])

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR  │ AI Agent — Modo Completo                    [Histórico ▼]     [⊡][×]        │
│          ├─────────────────────────────────────────────────────────────────────────────┤
│          │                                                                              │
│          │  [scroll de mensagens]                                                       │
│          │                                                                              │
│          │  ┌──────────────────────────────────────────────────────────────────────┐   │
│          │  │ 🤖 Uhuru AI                                                         │   │
│          │  │                                                                     │   │
│          │  │ Aqui está um resumo de todos os clientes ativos:                   │   │
│          │  │                                                                     │   │
│          │  │ ┌─────────────┬──────────┬──────────┬──────────┐                  │   │
│          │  │ │ Cliente     │ Spend    │ ROAS     │ Status   │                  │   │
│          │  │ ├─────────────┼──────────┼──────────┼──────────┤                  │   │
│          │  │ │ Cliente A   │ R$12.3k  │ 2.8x     │ ● Ativo  │                  │   │
│          │  │ │ Cliente B   │ R$8.1k   │ 1.9x     │ ● Ativo  │                  │   │
│          │  │ │ Cliente C   │ R$5.2k   │ ⚠1.1x    │ ⚠ Alerta │                  │   │
│          │  │ └─────────────┴──────────┴──────────┴──────────┘                  │   │
│          │  └──────────────────────────────────────────────────────────────────────┘   │
│          │                                                                              │
│          │  ┌──────────────────────────────────────────────────────────────────────┐   │
│          │  │ 🤖 [Confirmação — Tool Destrutiva]                                   │   │
│          │  │                                                                     │   │
│          │  │ Vou pausar a campanha "Campanha Z" do Cliente C.                   │   │
│          │  │ Essa ação é irreversível via agente (apenas via Meta Ads Manager).  │   │
│          │  │                                                                     │   │
│          │  │               [Cancelar]  [Confirmar — Pausar Campanha]            │   │
│          │  └──────────────────────────────────────────────────────────────────────┘   │
│          │                                                                              │
│          │  ┌──────────────────────────────────────────────────────────────────────┐   │
│          │  │ {O que você quer fazer?}                            [⊕]     [→ Enviar]│  │
│          │  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Notas:**
- `[⊕]`: menu de attach/contexto (selecionar cliente, período, etc.)
- `[↗]`: expande para fullscreen, `[⊡]`: volta para side panel
- Tool calls: bloco colapsável com ícone + nome + status (executando/concluído)
- Confirmação destrutiva: modal inline na conversa, não popup externo
- Streaming: texto aparece token a token, cursor piscante no final
- Histórico: lista de conversas anteriores no dropdown

---

## TELA 11: Configurações

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR           │ TOPBAR                                                              │
│                   │                                                                     │
│                   ├─────────────────────────────────────────────────────────────────────┤
│                   │ Configurações                                                       │
│                   │                                                                     │
│                   │ [Perfil] [Integrações] [Equipe] [Notificações]  ← tabs             │
│                   │ ─────────────────────────────────────────────────────────────────   │
│                   │                                                                     │
│                   │ ─ Perfil ─────────────────────────────────────────────────────────  │
│                   │ [avatar grande]  [Trocar foto]                                      │
│                   │ Nome: {João}    E-mail: joao@uhuru.com (não editável)               │
│                   │ Role: Owner                                                         │
│                   │                                        [Salvar Perfil]              │
│                   │                                                                     │
│                   │ ─ Integrações ─────────────────────────────────────────────────    │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ [f] Meta Business      ✓ Conectado · Token válido até ##/##  │   │
│                   │ │                                    [Renovar Token] [Desconect]│   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ [G] Google Ads         ✓ Conectado · OAuth ativo             │   │
│                   │ │                                    [Reconectar] [Desconectar] │   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ n8n Workflows          URL: http://72.60.9.248:5678          │   │
│                   │ │                        ● Conectado                [Editar]   │   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
│                   │                                                                     │
│                   │ ─ Equipe (apenas owner) ────────────────────────────────────────   │
│                   │ ┌──────────────────────────────────────────────────────────────┐   │
│                   │ │ [av] João          Owner      Você                           │   │
│                   │ │ [av] Pedro         Member     [Remover]                      │   │
│                   │ │ [av] Maria         Member     [Remover]                      │   │
│                   │ │                                          [Convidar Membro]   │   │
│                   │ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

*Uhuru OS Wireframes v1.0 — Uma (@ux-design-expert) — 2026-04-08*
