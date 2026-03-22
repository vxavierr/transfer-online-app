export const manualMeta = {
  title: 'Manual Arquitetônico da Plataforma',
  version: '1.3',
  owner: 'Gestão / Operações / Tecnologia',
  updateDateLabel: '15/03/2026',
  purpose: 'Documento executivo para consulta recorrente da estrutura funcional, técnica e operacional da plataforma.'
};

export const architectureLayers = [
  {
    title: 'Experiência e Operação',
    description: 'Camada de páginas, dashboards, formulários, tabelas operacionais e fluxos de atendimento para admin, clientes, fornecedores, motoristas e eventos.'
  },
  {
    title: 'Regras de Negócio',
    description: 'Funções de cálculo, aprovação, alocação, notificações, roteirização, controle de status, faturamento e orquestração das jornadas.'
  },
  {
    title: 'Dados e Persistência',
    description: 'Entidades centralizam clientes, viagens, solicitações, usuários, fornecedores, motoristas, faturamento, eventos, comunicações e histórico.'
  },
  {
    title: 'Integrações e Serviços Externos',
    description: 'Conectores e funções para mapas, pagamentos, envio de mensagens, email, arquivos, IA, tracking e rotinas automatizadas.'
  }
];

export const businessModules = [
  ['Reservas Particulares', 'Fluxo ponta a ponta para cotação, pagamento, confirmação e acompanhamento de reservas diretas.'],
  ['Solicitações Corporativas', 'Jornada master/corporativa com rateio por centro de custo, faturamento e comparação de fornecedores.'],
  ['Operação de Fornecedores', 'Portal para solicitações, frota, motoristas, faturamento, clientes próprios e viagens próprias.'],
  ['Manutenção de Frota', 'Controle da frota real do fornecedor com planos preventivos, registros executados, oficinas e acompanhamento de vencimentos por data e quilometragem.'],
  ['Operação de Motoristas', 'Painel para aceite, dados da viagem, documentação, status operacional e pagamentos.'],
  ['Eventos', 'Gestão de viagens de evento, distribuição logística, links compartilhados e dashboards executivos.'],
  ['Financeiro', 'Cobrança, pagamentos, relatórios, despesas adicionais, lançamento manual de faturas, controle de margem e acompanhamento de recebíveis.'],
  ['Comunicação', 'Templates, histórico e disparos via email, SMS, WhatsApp e lembretes automáticos.'],
  ['Auditoria Externa Controlada', 'Liberação de acesso temporário por link para gestores de clientes auditarem fornecedores, documentos, veículos, motoristas, aprovações e registrar comentários.']
];

export const userProfiles = [
  ['Administrador', 'Controla operação global, cadastros, aprovações, dashboards, viagens, relatórios e parametrizações.'],
  ['Cliente Corporativo', 'Solicita viagens, acompanha histórico, define faturamento e centros de custo.'],
  ['Fornecedor', 'Gerencia solicitações, motoristas, veículos, faturamento e clientes próprios.'],
  ['Motorista', 'Visualiza agenda, atualiza status, acessa documentos e acompanha pagamentos.'],
  ['Gestor de Evento', 'Orquestra viagens de eventos, passageiros e distribuição operacional.']
];

export const keyEntities = [
  ['ServiceRequest', 'Solicitação corporativa principal, com rota, idioma, fornecedor, custos, motorista, faturamento e tracking.'],
  ['Booking', 'Reserva direta/particular com preço final, status de pagamento e execução da viagem.'],
  ['SupplierOwnBooking', 'Viagem criada pelo próprio fornecedor para clientes próprios.'],
  ['Client', 'Conta corporativa com regras de fornecedores, contatos e parâmetros operacionais.'],
  ['Supplier', 'Fornecedor parceiro com dados operacionais, comerciais e permissões de módulos.'],
  ['SupplierFleetVehicle', 'Veículos reais da frota do fornecedor usados para controle operacional e manutenção.'],
  ['FleetMaintenancePlan', 'Planos preventivos com frequência por data e/ou quilometragem.'],
  ['FleetMaintenanceRecord', 'Histórico dos serviços executados, custos e próximos vencimentos.'],
  ['FleetMaintenanceProvider', 'Cadastro de oficinas e prestadores da manutenção veicular.'],
  ['Driver', 'Motorista com vínculo operacional, documentos, disponibilidade e pagamentos.'],
  ['SupplierInvoice', 'Fatura do fornecedor, automática ou manual, com valores, vencimento, recebimentos e vínculo financeiro.'],
  ['EventTrip', 'Trecho/logística vinculada ao módulo de eventos.'],
  ['CommunicationLog', 'Histórico consolidado de comunicações enviadas.'],
  ['TripStatusLog', 'Rastro cronológico de mudanças de status da operação.'],
  ['AppConfig', 'Parâmetros globais da plataforma e configurações técnicas/operacionais.'],
  ['ClientAuditAccessLink', 'Registro do link temporário de auditoria com cliente, token, validade, escopo e rastreio de acesso.'],
  ['SupplierAuditComment', 'Comentários e solicitações registradas por gestores durante auditorias externas direcionadas ao fornecedor.']
];

export const integrations = [
  ['Google Maps / Distância / Localização', 'Base para cálculo de trajetos, endereço e apoio operacional.'],
  ['Stripe', 'Pagamentos, links de cobrança, checkout e webhooks financeiros.'],
  ['Resend', 'Emails transacionais e notificações formais.'],
  ['Zenvia / Twilio / Evolution', 'SMS, voz e WhatsApp para comunicação operacional.'],
  ['IA / LLM', 'Apoio a resumos, automações inteligentes e análise assistida quando necessário.']
];

export const governanceTopics = [
  'A plataforma depende de dados mestres consistentes: clientes, fornecedores, veículos, motoristas e centros de custo.',
  'Mudanças em integrações, entidades-chave e regras de faturamento devem gerar revisão deste manual.',
  'Operações críticas exigem monitoramento de logs, filas de comunicação, cobrança e status de viagens.',
  'Perfis administrativos com permissões customizadas devem ser revisados periodicamente para evitar excesso de acesso.',
  'Documentação deve ser tratada como artefato vivo, com dono claro e cadência de atualização.',
  'Links temporários de auditoria devem ter prazo curto, escopo definido e revisão periódica de uso e revogação.'
];

export const managerCadence = [
  ['Semanal', 'Volume de viagens, pendências operacionais, falhas de comunicação, motoristas sem atribuição e gargalos do dashboard.'],
  ['Mensal', 'Performance por cliente, fornecedor, margem, cancelamentos, SLA operacional e saúde das integrações.'],
  ['Trimestral', 'Revisão arquitetônica, segurança de acessos, entidades críticas, automações, integrações e aderência dos processos.']
];

export const consultationChecklist = [
  'Verificar indicadores de viagens pendentes, confirmadas, em andamento e canceladas.',
  'Validar se fornecedores, veículos e motoristas estão com cadastros consistentes e ativos.',
  'Conferir se regras de faturamento e centros de custo continuam aderentes ao processo atual.',
  'Revisar histórico de falhas em comunicação, tracking, pagamentos e aprovações.',
  'Atualizar este manual quando houver novos módulos, integrações ou mudanças relevantes de processo.'
];

export const manualMetaEn = {
  title: 'Platform Architecture Manual',
  version: '1.3',
  owner: 'Management / Operations / Technology',
  updateDateLabel: '03/15/2026',
  purpose: 'Executive reference document for recurring consultation of the platform\'s functional, technical, and operational structure.'
};

export const architectureLayersEn = [
  {
    title: 'Experience and Operations',
    description: 'Layer of pages, dashboards, forms, operational tables, and service flows for admins, clients, suppliers, drivers, and events.'
  },
  {
    title: 'Business Rules',
    description: 'Functions for calculations, approvals, allocations, notifications, routing, status control, billing, and journey orchestration.'
  },
  {
    title: 'Data and Persistence',
    description: 'Entities centralize clients, trips, requests, users, suppliers, drivers, billing, events, communications, and history.'
  },
  {
    title: 'Integrations and External Services',
    description: 'Connectors and functions for maps, payments, messaging, email, files, AI, tracking, and automated routines.'
  }
];

export const businessModulesEn = [
  ['Direct Bookings', 'End-to-end flow for quotation, payment, confirmation, and tracking of direct bookings.'],
  ['Corporate Requests', 'Master/corporate journey with cost center allocation, invoicing, and supplier comparison.'],
  ['Supplier Operations', 'Portal for requests, fleet, drivers, billing, own clients, and own trips.'],
  ['Fleet Maintenance', 'Management of the supplier real fleet with preventive plans, executed services, workshops, and due controls by date and mileage.'],
  ['Driver Operations', 'Panel for acceptance, trip details, documentation, operational status, and payments.'],
  ['Events', 'Management of event trips, logistics distribution, shared links, and executive dashboards.'],
  ['Finance', 'Billing, payments, reports, additional expenses, manual invoice entry, margin control, and receivables tracking.'],
  ['Communication', 'Templates, history, and dispatches via email, SMS, WhatsApp, and automated reminders.'],
  ['Controlled External Audit', 'Temporary link-based access for client managers to audit suppliers, documents, vehicles, drivers, approvals, and register comments.']
];

export const userProfilesEn = [
  ['Administrator', 'Controls global operations, records, approvals, dashboards, trips, reports, and settings.'],
  ['Corporate Client', 'Requests trips, tracks history, and defines billing and cost centers.'],
  ['Supplier', 'Manages requests, drivers, vehicles, billing, and own clients.'],
  ['Driver', 'Views schedule, updates statuses, accesses documents, and tracks payments.'],
  ['Event Manager', 'Orchestrates event trips, passengers, and operational distribution.']
];

export const keyEntitiesEn = [
  ['ServiceRequest', 'Main corporate request with route, language, supplier, costs, driver, billing, and tracking.'],
  ['Booking', 'Direct/private booking with final price, payment status, and trip execution.'],
  ['SupplierOwnBooking', 'Trip created by the supplier for its own clients.'],
  ['Client', 'Corporate account with supplier rules, contacts, and operational parameters.'],
  ['Supplier', 'Partner supplier with operational, commercial, and module permission data.'],
  ['SupplierFleetVehicle', 'Real supplier fleet vehicles used for operational and maintenance control.'],
  ['FleetMaintenancePlan', 'Preventive plans with frequency by date and/or mileage.'],
  ['FleetMaintenanceRecord', 'Executed maintenance history, costs, and next due checkpoints.'],
  ['FleetMaintenanceProvider', 'Registered workshops and maintenance providers.'],
  ['Driver', 'Driver with operational link, documents, availability, and payments.'],
  ['SupplierInvoice', 'Supplier invoice, automatic or manual, with amounts, due date, receipts, and financial linkage.'],
  ['EventTrip', 'Trip/logistics leg linked to the events module.'],
  ['CommunicationLog', 'Consolidated history of sent communications.'],
  ['TripStatusLog', 'Chronological trail of operational status changes.'],
  ['AppConfig', 'Global platform parameters and technical/operational settings.'],
  ['ClientAuditAccessLink', 'Temporary audit access record with client, token, expiry, scope, and access traceability.'],
  ['SupplierAuditComment', 'Comments and requests created by managers during external audits and routed to the supplier.']
];

export const integrationsEn = [
  ['Google Maps / Distance / Location', 'Base for route calculations, addressing, and operational support.'],
  ['Stripe', 'Payments, collection links, checkout, and financial webhooks.'],
  ['Resend', 'Transactional emails and formal notifications.'],
  ['Zenvia / Twilio / Evolution', 'SMS, voice, and WhatsApp for operational communication.'],
  ['AI / LLM', 'Support for summaries, intelligent automations, and assisted analysis when needed.']
];

export const governanceTopicsEn = [
  'The platform depends on consistent master data: clients, suppliers, vehicles, drivers, and cost centers.',
  'Changes to integrations, key entities, and billing rules should trigger a review of this manual.',
  'Critical operations require monitoring of logs, communication queues, billing, and trip statuses.',
  'Administrative profiles with custom permissions should be reviewed periodically to avoid excessive access.',
  'Documentation should be treated as a living artifact, with a clear owner and update cadence.',
  'Temporary audit links should use short validity, defined scope, and periodic review of usage and revocation.'
];

export const managerCadenceEn = [
  ['Weekly', 'Trip volume, operational pending items, communication failures, unassigned drivers, and dashboard bottlenecks.'],
  ['Monthly', 'Performance by client, supplier, margin, cancellations, operational SLA, and integration health.'],
  ['Quarterly', 'Architecture review, access security, critical entities, automations, integrations, and process adherence.']
];

export const consultationChecklistEn = [
  'Check indicators for pending, confirmed, in-progress, and cancelled trips.',
  'Validate whether suppliers, vehicles, and drivers have consistent and active records.',
  'Confirm whether billing rules and cost centers still match the current process.',
  'Review the history of failures in communication, tracking, payments, and approvals.',
  'Update this manual whenever there are new modules, integrations, or relevant process changes.'
];

export const executiveManualByLanguage = {
  pt: {
    manualMeta,
    architectureLayers,
    businessModules,
    userProfiles,
    keyEntities,
    integrations,
    governanceTopics,
    managerCadence,
    consultationChecklist
  },
  en: {
    manualMeta: manualMetaEn,
    architectureLayers: architectureLayersEn,
    businessModules: businessModulesEn,
    userProfiles: userProfilesEn,
    keyEntities: keyEntitiesEn,
    integrations: integrationsEn,
    governanceTopics: governanceTopicsEn,
    managerCadence: managerCadenceEn,
    consultationChecklist: consultationChecklistEn
  }
};