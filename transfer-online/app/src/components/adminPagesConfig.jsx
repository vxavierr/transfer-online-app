import { 
  LayoutDashboard, 
  Briefcase, 
  MessageSquare, 
  Users, 
  CheckCircle, 
  DollarSign, 
  Shield, 
  Building2, 
  Car, 
  FileText, 
  Package, 
  Ticket, 
  MapPin, 
  Settings,
  Palette,
  TrendingUp,
  Star,
  Activity,
  Link2,
  Calendar,
  Globe,
  Bell
} from 'lucide-react';

// Estrutura agrupada do menu administrativo
export const ADMIN_MENU_STRUCTURE = [
  {
    group: 'Visão Geral',
    items: [
      { id: 'AdminDashboard', name: 'Dashboard Principal', icon: LayoutDashboard },
      { id: 'EventDashboard', name: 'Dashboard de Eventos', icon: Activity },
    ]
  },
  {
    group: 'Gestão de Eventos',
    items: [
      { id: 'GerenciarEventos', name: 'Gerenciar Eventos', icon: Calendar },
      { id: 'GerenciarAcessosEventos', name: 'Acessos Temporários a Eventos', icon: Users },
      { id: 'GerenciarLinksCompartilhados', name: 'Links Compartilhados', icon: Link2 },
    ]
  },
  {
    group: 'Gestão de Viagens',
    items: [
      { id: 'SolicitarViagemCorporativa', name: 'Solicitar Viagem (Master)', icon: Briefcase },
      { id: 'LocalizacaoMotoristas', name: 'Localização em Tempo Real', icon: MapPin },
      { id: 'RelatorioKmPercorrido', name: 'Relatório Km Percorrido', icon: FileText },
      { id: 'Telemetria', name: 'Telemetria', icon: Activity },
    ]
  },
  {
    group: 'Cotações',
    items: [
      { id: 'GerenciarCotacoes', name: 'Gerenciar Cotações', icon: MessageSquare },
      { id: 'CriarCotacaoManual', name: 'Criar Cotação Manual', icon: MessageSquare },
      { id: 'GerenciarTrechosFrequentes', name: 'Trechos Frequentes', icon: MapPin },
    ]
  },
  {
    group: 'Rede de Fornecedores',
    items: [
      { id: 'GerenciarFornecedores', name: 'Gerenciar Fornecedores', icon: Users },
      { id: 'GerenciarAprovacoes', name: 'Gerenciar Aprovações', icon: CheckCircle },
      { id: 'GerenciarVeiculosFornecedores', name: 'Veículos Fornecedores', icon: Car },
      { id: 'GerenciarModulo3', name: 'Gerenciar Módulo 3', icon: Package },
      { id: 'GerenciarPlanosModulo3', name: 'Planos Módulo 3', icon: DollarSign },
    ]
  },
  {
    group: 'Clientes e Usuários',
    items: [
      { id: 'GerenciarClientes', name: 'Gerenciar Clientes', icon: Building2 },
      { id: 'GerenciarUsuarios', name: 'Gerenciar Usuários', icon: Users },
      { id: 'GerenciarPermissoesAdmin', name: 'Gerenciar Permissões Admin', icon: Shield },
      { id: 'GerenciarTagsPassageiros', name: 'Tags de Passageiros', icon: Star },
    ]
  },
  {
    group: 'Financeiro',
    items: [
      { id: 'RelatorioFinanceiroFornecedores', name: 'Relatório Fornecedores', icon: DollarSign },
      { id: 'RelatorioFinanceiroMotoristas', name: 'Lucratividade Motoristas', icon: TrendingUp },
    ]
  },
  {
    group: 'Marketing e Qualidade',
    items: [
      { id: 'GerenciarLeads', name: 'Gerenciar Leads', icon: TrendingUp },
      { id: 'GerenciarCupons', name: 'Gerenciar Cupons', icon: Ticket },
      { id: 'GerenciarAvaliacoes', name: 'Gestão de Avaliações', icon: Star },
      { id: 'GerenciarSEO', name: 'Gerenciar SEO', icon: Globe },
    ]
  },
  {
    group: 'Apresentações',
    items: [
      { id: 'ApresentacaoClientesCorporativos', name: 'Apresentação Clientes Corporativos', icon: Building2 },
      { id: 'ApresentacaoFornecedores', name: 'Apresentação Fornecedores', icon: Briefcase },
    ]
  },
  {
    group: 'Configurações',
    items: [
      { id: 'Configuracoes', name: 'Configurações do Sistema', icon: Settings },
      { id: 'ManualArquitetonico', name: 'Manual do Usuário', icon: FileText },
      { id: 'SmsLogs', name: 'Logs de SMS (Zenvia)', icon: MessageSquare },
      { id: 'GerenciarTemas', name: 'Temas Sazonais', icon: Palette },
      { id: 'GerenciarNotificacoes', name: 'Templates de Notificação', icon: Bell },
      { id: 'GestaoRotas', name: 'Gestão de Rotas', icon: MapPin },
      { id: 'GerenciarVeiculos', name: 'Tipos de Veículos', icon: Car },
      { id: 'TermosAceiteMotoristas', name: 'Termos de Aceite', icon: FileText },
      { id: 'MonitoramentoSistema', name: 'Monitoramento de Sistema', icon: Activity },
    ]
  }
];

// Flattened configuration for backward compatibility and easier lookup
export const ADMIN_PAGES_CONFIG = ADMIN_MENU_STRUCTURE.flatMap(group => 
  group.items.map(item => ({
    ...item,
    category: group.group
  }))
);