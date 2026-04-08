# Uhuru OS — UX Flows

> Versão 1.0 | Fluxos de usuário por módulo — baseados nas personas João (owner) e Membro da equipe
> Formato: steps numerados + decision points + estados de UI

---

## Personas de Referência

| Persona | Papel | Objetivo principal | Uso do agente |
|---------|-------|-------------------|---------------|
| **João** | Owner | Visão consolidada, alertas, controle total | "Como está o cliente X?", relatórios, automações |
| **Membro** | Gestor de tráfego | Campanhas dos clientes sob sua responsabilidade, tarefas | Métricas rápidas, criar tarefas |

---

## FLOW 1: Primeiro Acesso / Login

```
[INÍCIO]
    │
    ▼
[Tela de Login]
    │
    ├─ Usuário preenche email + senha
    │   └─ [Entrar] → Supabase Auth → JWT gerado
    │       ├─ Sucesso → Redirect para /dashboard
    │       └─ Erro → Shake animation + mensagem de erro inline
    │
    ├─ Usuário clica [Continuar com Google]
    │   └─ OAuth Google flow → JWT gerado
    │       ├─ Conta autorizada → /dashboard
    │       └─ Conta não autorizada → Mensagem: "Acesso restrito à equipe Uhuru"
    │
    └─ "Esqueceu a senha?" → Email de reset enviado → Mensagem de confirmação
```

**Estado pós-login:**
- Session persistida no localStorage via Supabase
- Role carregado (owner | member) → determina o que é visível
- Redirect para `/dashboard`

---

## FLOW 2: Visão Geral do Dashboard (João, início do dia)

```
[João abre Uhuru OS → /dashboard]
    │
    ▼
[Dashboard Geral carrega]
    ├─ Skeleton loading nos KPI cards (< 200ms)
    ├─ API Hono → busca dados agregados de todos os clientes
    │   └─ Dados de Meta + Google (do cache de 15-30min)
    │
    ├─ KPI cards renderizam: Spend Total, ROAS Médio, Clientes Ativos, Alertas
    ├─ Tabela de clientes ordenada por spend (desc)
    └─ Alertas ativos exibidos no painel de alertas
    │
    ▼
[João vê alerta: "ROAS abaixo do threshold · Cliente C"]
    │
    ├─ Clica [Ver] no alerta → Dashboard por Cliente C abre
    │   └─ Drill-down: ver campanhas, ROAS por campanha, histórico
    │       ├─ Identifica campanha problemática
    │       └─ Abre AI Panel → pergunta "Por que o ROAS do Cliente C caiu?"
    │
    └─ Clica [Dismiss] → Alerta marcado como visto, some da lista
```

**Critérios de sucesso:**
- KPI cards carregam em < 2s (dados de API externa)
- Alertas sempre na parte superior, ordenados por severidade
- Transição Dashboard Geral → Cliente: animação de slide (< 300ms)

---

## FLOW 3: Criar Novo Cliente

```
[João está em /clientes]
    │
    ▼
[Clica + Novo Cliente]
    │
    ▼
[Sheet/Drawer desliza da direita]
    │
    ├─ João preenche: Nome, CNPJ, Contato, E-mail
    ├─ Status: Ativo (padrão)
    ├─ Meta Account ID: digita act_#############
    ├─ Google Account: digita ###-###-####
    │
    ├─ [Opcional] Anexar documentos:
    │   ├─ Clica [Anexar contrato]
    │   ├─ File picker abre → seleciona PDF
    │   └─ Upload para Supabase Storage → progress bar
    │
    ▼
[Salvar Cliente]
    ├─ Validação Zod no frontend
    │   ├─ Erro → campo com border vermelho + mensagem inline
    │   └─ Válido → POST para /api/clientes
    │
    ├─ POST com JWT → Supabase Auth verifica → RLS verifica role
    │   ├─ Sucesso → Cliente criado, drawer fecha, toast "Cliente criado com sucesso"
    │   │           → Tabela atualiza com novo cliente no topo
    │   └─ Erro → Toast de erro com mensagem
    │
    └─ [AUTO-DECISION] Redirecionar para Dashboard do cliente novo → sim, melhora DX e confirma criação
```

---

## FLOW 4: Consultar Campanhas de um Cliente

```
[Usuário está em /campanhas]
    │
    ▼
[Filtros: Cliente = "Cliente A", Período = "Últimos 30d"]
    │
    ▼
[Tabela carrega campanhas filtradas]
    ├─ Meta Ads (3 campanhas)
    └─ Google Ads (2 campanhas)
    │
    ▼
[Clica em Campanha X (Meta)]
    │
    ▼
[Sheet drawer abre → Detalhe da campanha]
    ├─ KPIs: Spend, ROAS, CPA, CTR, Impressões, Clicks
    ├─ Gráfico: spend diário (Recharts line chart)
    └─ Ad Sets expandíveis
    │
    ▼
[Usuário nota ROAS abaixo de 1.5x em um ad set]
    │
    ├─ Opção A: Abre AI Agent → "Pause o ad set X da Campanha X"
    │   └─ Agente confirma → Confirmação destrutiva inline → Executa
    │
    └─ Opção B: Anota tarefa → [+ Nova Tarefa] no contexto do cliente
```

---

## FLOW 5: Criar e Mover Tarefa no Kanban

```
[Usuário em /tarefas]
    │
    ▼
[Clica + Nova Tarefa]
    │
    ▼
[Modal/Sheet de criação]
    ├─ Título: "Criar criativos Q2 para Campanha X"
    ├─ Cliente: [dropdown] Cliente A
    ├─ Responsável: [dropdown] Pedro
    ├─ Prioridade: Alta
    ├─ Prazo: 15/04/2026
    └─ [Salvar] → tarefa criada em Backlog
    │
    ▼
[Board Kanban atualiza com nova tarefa em Backlog]
    │
    ▼
[Pedro (membro) drag-and-dropa para "Em andamento"]
    ├─ PATCH /api/tarefas/:id status = "in_progress"
    └─ Board atualiza optimisticamente (sem esperar resposta)
    │
    ▼
[Pedro adiciona comentário no detalhe]
    ├─ "Criativos prontos, aguardando aprovação"
    └─ POST /api/tarefas/:id/comentarios
    │
    ▼
[Pedro move para "Review"]
    │
    ▼
[João revisa → move para "Concluído"]
    └─ Tarefa some do board (ou permanece colapsada na coluna Concluído)
```

**Otimistic updates:**
- Drag-and-drop: atualiza UI imediatamente, sincroniza com API em background
- Se API falhar: reverter com animação + toast de erro

---

## FLOW 6: Conversar com o AI Agent

### Sub-flow A: Consulta simples (read-only)

```
[João clica no FAB do AI Agent (canto inferior direito)]
    │
    ▼
[Side Panel do AI Agent abre (slide-in da direita)]
    │
    ▼
[João digita: "Como está o ROAS do Cliente A este mês?"]
    │
    ▼
[Enter / Clica Enviar]
    ├─ Mensagem aparece no chat (bubble direita)
    ├─ Indicador de "pensando" (3 dots animados)
    │
    ▼
[Agente inicia streaming SSE]
    ├─ Tool call: get_client_metrics(client_id, period)
    │   └─ Badge inline: "executando get_client_metrics..." (teal/10)
    ├─ Tool retorna dados → Badge: "✓ concluído"
    └─ Agente escreve resposta com dados reais (texto aparece token a token)
    │
    ▼
[João lê resposta: "ROAS médio de 2.8x em abril, acima do threshold de 2.0x"]
    │
    └─ Conversa continua ou João fecha o painel [×]
```

### Sub-flow B: Ação destrutiva (com confirmação)

```
[João digita: "Pause a campanha 'Black Friday 2024' do Cliente A"]
    │
    ▼
[Agente processa]
    ├─ Tool: pause_campaign (isDestructive: true)
    │
    ▼
[Agente exibe confirmação INLINE na conversa]
    ├─ "Vou pausar 'Black Friday 2024' no Meta Ads Manager."
    ├─ "Esta ação pausará a campanha — você pode reativar manualmente."
    └─ Botões: [Cancelar] [Confirmar — Pausar Campanha]
    │
    ├─ João clica [Cancelar] → Agente: "Operação cancelada."
    │
    └─ João clica [Confirmar]
        ├─ Badge: "executando pause_campaign..."
        ├─ API Meta recebe request
        ├─ Log de auditoria criado (tool, input, output, timestamp, user_id)
        └─ Agente: "Campanha pausada com sucesso ✓"
```

### Sub-flow C: Modo full screen

```
[João clica [↗] no AI Panel]
    │
    ▼
[Panel expande para full screen (main area)]
    ├─ Sidebar permanece visível
    ├─ Mensagens em coluna centralizada (max-w-3xl mx-auto)
    └─ Tabelas de dados renderizadas full-width
    │
    ▼
[João clica [⊡] → volta para side panel]
```

---

## FLOW 7: Configurar Automação (Trigger)

```
[João em /automacoes]
    │
    ▼
[Clica + Novo Trigger]
    │
    ▼
[Modal de criação]
    ├─ Condição: "ROAS cair abaixo de" → campo numérico: 1.5
    ├─ Para: [Todos os clientes ▼]
    ├─ Plataforma: [Meta Ads ▼]
    └─ Executar workflow: [Alerta ROAS Baixo ▼]
    │
    ▼
[Clica Criar Trigger]
    ├─ POST /api/triggers → salvo no Supabase
    └─ Aparece na lista de triggers
    │
    ▼
[Trigger avaliado pelo sistema a cada ciclo de dados]
    └─ Quando condição é verdadeira → executa workflow n8n via API REST
```

---

## FLOW 8: Importar Dados via CSV

```
[Usuário em /importacao]
    │
    ▼
[Seleciona origem: CSV/Planilha]
    │
    ▼
[Dropa arquivo na drop zone]
    ├─ Arquivo parseado no frontend (Papa Parse)
    ├─ "247 linhas detectadas · 8 colunas"
    └─ Tabela de mapeamento renderiza com auto-detect
    │
    ▼
[Usuário revisa mapeamento]
    ├─ "campaign_name" → Nome da Campanha (auto-detectado, correto)
    ├─ "spend" → Spend R$ (auto-detectado, correto)
    ├─ "unknown_col" → usuário seleciona [Ignorar] no dropdown
    │
    ▼
[Preview das primeiras 5 linhas]
    └─ Usuário confirma que os dados estão corretos
    │
    ▼
[Clica Importar 247 linhas]
    ├─ Modal de progresso: "Importando... 0/247"
    ├─ POST em batch para /api/importacao
    └─ Conclusão: "247 linhas importadas com sucesso"
    │
    └─ Aparece no histórico de importações
```

---

## FLOW 9: Gerenciar Equipe (João, owner)

```
[João em /configuracoes → aba Equipe]
    │
    ▼
[Lista de membros: João (owner), Pedro (member), Maria (member)]
    │
    ▼
[Clica Convidar Membro]
    │
    ▼
[Modal: email do novo membro]
    ├─ {pedro@uhuru.com}
    └─ [Enviar convite]
    │
    ▼
[Email enviado via Supabase Auth]
    └─ Novo membro aparece como "Pendente" na lista
    │
    └─ Membro aceita convite → status vira "Member"
```

---

## FLOW 10: Registrar API Externa

```
[Usuário em /api-connector]
    │
    ▼
[Clica + Registrar API]
    │
    ▼
[Drawer de registro]
    ├─ Nome: "Pipedrive CRM"
    ├─ URL Base: "https://api.pipedrive.com/v1"
    ├─ Auth: Bearer Token
    ├─ Token: eyJ... (mascarado)
    │
    ▼
[Clica Testar agora]
    ├─ GET /api/connector/test → Hono testa a API externa
    ├─ Resposta: 200 OK · 142ms
    └─ JSON renderizado com syntax highlight
    │
    ▼
[Marca "Disponível como tool do agente": ✓]
    └─ Nome da tool: "uhuru_pipedrive"
    │
    ▼
[Salvar API]
    ├─ POST /api/connectors → salvo com credencial criptografada no Vault
    └─ API disponível no registry do agent-harness na próxima reinicialização
```

---

## Estados de UI Transversais

| Situação | Comportamento |
|----------|--------------|
| Carregando dados de API externa | Skeleton shimmer nos cards |
| API externa indisponível (Meta/Google) | Banner warning + dados cacheados com timestamp |
| n8n indisponível | Módulo de Automações mostra "n8n desconectado" |
| Agente AI sem resposta em 30s | Timeout + mensagem + botão [Tentar novamente] |
| Sessão expirada | Toast "Sessão expirada" + redirect para login |
| Erro de RLS (403) | Toast "Sem permissão para esta operação" |
| Rate limit do agente (30msg/min) | Mensagem inline no chat: "Limite atingido. Aguarde 60s." |

---

## Navegação Principal — Mapa

```
/login
└─ /dashboard (home)
   ├─ /clientes
   │   └─ /clientes/:id (dashboard por cliente)
   ├─ /campanhas
   │   └─ /campanhas/:id (drawer, não rota separada)
   ├─ /tarefas
   ├─ /automacoes
   ├─ /api-connector
   ├─ /importacao
   ├─ /agent (rota do chat fullscreen)
   └─ /configuracoes
      ├─ ?tab=perfil
      ├─ ?tab=integracoes
      ├─ ?tab=equipe
      └─ ?tab=notificacoes
```

**Rota protegida:** Todas as rotas exceto `/login` requerem sessão ativa.
**Guard de role:** Aba Equipe visível apenas para `owner`. Outras abas: `owner + member`.

---

*Uhuru OS UX Flows v1.0 — Uma (@ux-design-expert) — 2026-04-08*
