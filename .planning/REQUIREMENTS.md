# Requirements: AI-First OS

**Defined:** 2026-03-10
**Core Value:** Gerar receita vendendo transformacao AI-First para empresas de um nicho, usando IA como equipe tecnica

## v1 Requirements

Requirements for initial release (first client in 30 days).

### Niche Selection (NICH)

- [ ] **NICH-01**: User can evaluate niches against criterios validados (capacidade de pagamento, repeticao de processos, potencial de crescimento, gargalo visivel, barreiras de entrada)
- [ ] **NICH-02**: User can pesquisar volume e dimensao do nicho usando ferramentas gratuitas (IBGE, Google Trends, LinkedIn, Apollo)
- [ ] **NICH-03**: User can mapear a jornada do cliente do nicho identificando pontos de friccao e potencial para IA
- [ ] **NICH-04**: User can identificar gaps reais do nicho (gap de oferta, gap de resultado, gap de experiencia)
- [ ] **NICH-05**: User can validar demanda com anuncio de R$100-200 e 5 conversas reais com decisores

### Sales Methodology (SALE)

- [ ] **SALE-01**: User can executar diagnostico gratuito com roteiro estruturado de perguntas que mapeia gargalos operacionais do cliente
- [ ] **SALE-02**: User can apresentar proposta com calculo de ROI embutido mostrando economia/ganho esperado
- [ ] **SALE-03**: User can executar pitch consultivo em 6 etapas (abertura, diagnostico, apresentacao AI-First OS, encaixe personalizado, proposta, CTA)
- [ ] **SALE-04**: User can gerar proposta personalizada com escopo claro, preco de setup e valor de recorrencia
- [ ] **SALE-05**: User can rodar funil de aquisicao de leads com campanha direcionada ao nicho oferecendo diagnostico gratuito

### WhatsApp AI Chatbot (CHAT)

- [ ] **CHAT-01**: Cliente do user recebe atendimento automatizado via WhatsApp 24/7 com IA conversacional
- [ ] **CHAT-02**: Chatbot qualifica leads automaticamente com perguntas configuradas por nicho
- [ ] **CHAT-03**: Chatbot faz handoff para humano quando detecta lead quente ou situacao complexa
- [ ] **CHAT-04**: Chatbot responde FAQs do negocio com base em knowledge base treinada

### Follow-up Automation (FOLL)

- [ ] **FOLL-01**: Leads que nao responderam recebem sequencia automatica de follow-up via WhatsApp
- [ ] **FOLL-02**: Follow-ups sao personalizados com base no contexto da conversa anterior
- [ ] **FOLL-03**: User pode configurar timing e quantidade de follow-ups por sequencia

### Dashboard & KPIs (DASH)

- [ ] **DASH-01**: Dono do negocio (cliente) ve dashboard com metricas em tempo real (leads, conversoes, atendimentos)
- [ ] **DASH-02**: Dashboard mostra ROI da implementacao de IA (antes vs depois)
- [ ] **DASH-03**: Alertas automaticos quando metricas caem abaixo de thresholds

### CRM Automation (CRM)

- [ ] **CRM-01**: Leads entram automaticamente no pipeline de vendas ao interagir com chatbot
- [ ] **CRM-02**: Pipeline classifica e prioriza leads automaticamente com base em score
- [ ] **CRM-03**: Tarefas de follow-up sao criadas automaticamente para a equipe do cliente

### Infrastructure (INFR)

- [ ] **INFR-01**: Stack completa roda em VPS com Docker Compose (n8n + Evolution API + Typebot + Metabase + Supabase)
- [ ] **INFR-02**: Setup automatizado permite subir nova instancia para novo cliente em menos de 1 hora
- [ ] **INFR-03**: Monitoramento basico de saude dos servicos com alertas

### Client Onboarding (ONBD)

- [ ] **ONBD-01**: Processo estruturado de onboarding com checklist de setup pro cliente
- [ ] **ONBD-02**: Coleta automatizada de dados do negocio (FAQs, servicos, precos, horarios)
- [ ] **ONBD-03**: Treinamento do chatbot com dados especificos do cliente

### Revenue Model (RECV)

- [ ] **RECV-01**: Modelo de precificacao definido com setup + recorrencia por nicho
- [ ] **RECV-02**: Recorrencia baseada em valor visivel mensal (relatorio de impacto, nao "manutencao")
- [ ] **RECV-03**: Template de contrato com escopo, SLA e termos de recorrencia

## v2 Requirements

### Niche Playbook

- **PLAY-01**: Blueprint documentado por nicho emerge dos primeiros 3 clientes
- **PLAY-02**: Template replicavel reduz tempo de implementacao de 45 para 25 dias

### Advanced Modules

- **ADVN-01**: Agendamento inteligente integrado ao chatbot
- **ADVN-02**: Analise preditiva com IA (previsao de churn, demanda)
- **ADVN-03**: Portal do cliente self-service
- **ADVN-04**: Multi-channel (Instagram DM, email, SMS)

### Business OS

- **BSOS-01**: Adaptar arquitetura AIOX para operacoes de negocio (agentes de vendas, atendimento, operacoes)
- **BSOS-02**: Dashboard unificado multi-cliente para o operador

## Out of Scope

| Feature | Reason |
|---------|--------|
| Plataforma SaaS propria | v1 e servico + implementacao, produto vem depois |
| Multiplos nichos simultaneos | Foco em UM nicho ate ter blueprint validado |
| App mobile | Web-first, WhatsApp e a interface |
| Diagnostico pago | Diagnostico gratuito como porta de entrada |
| CRM proprio | Usar Kommo ou existente do cliente |
| Agentes totalmente autonomos | Sempre com handoff humano em v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NICH-01 | Phase 1 | Pending |
| NICH-02 | Phase 1 | Pending |
| NICH-03 | Phase 1 | Pending |
| NICH-04 | Phase 1 | Pending |
| NICH-05 | Phase 1 | Pending |
| RECV-01 | Phase 2 | Pending |
| RECV-02 | Phase 2 | Pending |
| RECV-03 | Phase 2 | Pending |
| SALE-01 | Phase 3 | Pending |
| SALE-02 | Phase 3 | Pending |
| SALE-03 | Phase 3 | Pending |
| SALE-04 | Phase 3 | Pending |
| SALE-05 | Phase 3 | Pending |
| INFR-01 | Phase 4 | Pending |
| INFR-02 | Phase 4 | Pending |
| INFR-03 | Phase 4 | Pending |
| CHAT-01 | Phase 5 | Pending |
| CHAT-02 | Phase 5 | Pending |
| CHAT-03 | Phase 5 | Pending |
| CHAT-04 | Phase 5 | Pending |
| FOLL-01 | Phase 6 | Pending |
| FOLL-02 | Phase 6 | Pending |
| FOLL-03 | Phase 6 | Pending |
| CRM-01 | Phase 6 | Pending |
| CRM-02 | Phase 6 | Pending |
| CRM-03 | Phase 6 | Pending |
| DASH-01 | Phase 7 | Pending |
| DASH-02 | Phase 7 | Pending |
| DASH-03 | Phase 7 | Pending |
| ONBD-01 | Phase 8 | Pending |
| ONBD-02 | Phase 8 | Pending |
| ONBD-03 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 32 total (note: file initially stated 27, actual count is 32 — 9 categories x 3-5 reqs each)
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 — traceability populated after roadmap creation*
