/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AceitarConvite from './pages/AceitarConvite';
import AcompanharSolicitacoes from './pages/AcompanharSolicitacoes';
import AdminDashboard from './pages/AdminDashboard';
import AlterarSenha from './pages/AlterarSenha';
import AprovacaoMotorista from './pages/AprovacaoMotorista';
import AvaliarViagem from './pages/AvaliarViagem';
import BookingSuccessGuest from './pages/BookingSuccessGuest';
import ClientAnalytics from './pages/ClientAnalytics';
import Configuracoes from './pages/Configuracoes';
import ConsultarViagem from './pages/ConsultarViagem';
import CriarCotacaoManual from './pages/CriarCotacaoManual';
import DashboardFornecedor from './pages/DashboardFornecedor';
import DashboardMotorista from './pages/DashboardMotorista';
import DashboardMotoristaV2 from './pages/DashboardMotoristaV2';
import DetalhesViagemMotorista from './pages/DetalhesViagemMotorista';
import DetalhesViagemMotoristaV2 from './pages/DetalhesViagemMotoristaV2';
import EnviarMensagemMotoristas from './pages/EnviarMensagemMotoristas';
import EventClientDashboard from './pages/EventClientDashboard';
import EventDashboard from './pages/EventDashboard';
import EventDetails from './pages/EventDetails';
import GerenciarAcessosEventos from './pages/GerenciarAcessosEventos';
import GerenciarAprovacoes from './pages/GerenciarAprovacoes';
import GerenciarAvaliacoes from './pages/GerenciarAvaliacoes';
import GerenciarClientes from './pages/GerenciarClientes';
import GerenciarClientesProprios from './pages/GerenciarClientesProprios';
import GerenciarConvitesFuncionarios from './pages/GerenciarConvitesFuncionarios';
import GerenciarCoordenadores from './pages/GerenciarCoordenadores';
import GerenciarCotacoes from './pages/GerenciarCotacoes';
import GerenciarCupons from './pages/GerenciarCupons';
import GerenciarEventos from './pages/GerenciarEventos';
import GerenciarFaturamento from './pages/GerenciarFaturamento';
import GerenciarFornecedores from './pages/GerenciarFornecedores';
import GerenciarFuncionarios from './pages/GerenciarFuncionarios';
import GerenciarLeads from './pages/GerenciarLeads';
import GerenciarLinksCompartilhados from './pages/GerenciarLinksCompartilhados';
import GerenciarModulo3 from './pages/GerenciarModulo3';
import GerenciarNotificacoes from './pages/GerenciarNotificacoes';
import GerenciarPagamentos from './pages/GerenciarPagamentos';
import GerenciarParceiros from './pages/GerenciarParceiros';
import GerenciarPermissoesAdmin from './pages/GerenciarPermissoesAdmin';
import GerenciarPlanosModulo3 from './pages/GerenciarPlanosModulo3';
import GerenciarReceptivos from './pages/GerenciarReceptivos';
import GerenciarTagsPassageiros from './pages/GerenciarTagsPassageiros';
import GerenciarTrechosFrequentes from './pages/GerenciarTrechosFrequentes';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import GerenciarVeiculos from './pages/GerenciarVeiculos';
import GerenciarVeiculosFornecedores from './pages/GerenciarVeiculosFornecedores';
import GestaoRotas from './pages/GestaoRotas';
import Index from './pages/Index';
import LocalizacaoMotoristas from './pages/LocalizacaoMotoristas';
import MeusDados from './pages/MeusDados';
import MeusMotoristas from './pages/MeusMotoristas';
import MeusVeiculosFornecedor from './pages/MeusVeiculosFornecedor';
import MinhasSolicitacoes from './pages/MinhasSolicitacoes';
import MinhasSolicitacoesFornecedor from './pages/MinhasSolicitacoesFornecedor';
import MinhasViagens from './pages/MinhasViagens';
import MinhasViagensProprias from './pages/MinhasViagensProprias';
import MonitoramentoSistema from './pages/MonitoramentoSistema';
import NovaReserva from './pages/NovaReserva';
import PartnerDriverInfo from './pages/PartnerDriverInfo';
import PartnerQuoteResponse from './pages/PartnerQuoteResponse';
import PartnerTripView from './pages/PartnerTripView';
import PoliticaDePrivacidade from './pages/PoliticaDePrivacidade';
import PortalCorporativo from './pages/PortalCorporativo';
import PublicQuoteView from './pages/PublicQuoteView';
import PublicSharedTripListView from './pages/PublicSharedTripListView';
import ReceptiveListEventView from './pages/ReceptiveListEventView';
import ReceptiveListStatus from './pages/ReceptiveListStatus';
import RelatorioFinanceiroFornecedores from './pages/RelatorioFinanceiroFornecedores';
import RelatorioFinanceiroMotoristas from './pages/RelatorioFinanceiroMotoristas';
import RelatorioKmPercorrido from './pages/RelatorioKmPercorrido';
import RetomarCarrinho from './pages/RetomarCarrinho';
import RetomarPagamento from './pages/RetomarPagamento';
import RevisaoFaturaExterna from './pages/RevisaoFaturaExterna';
import SharedTripTimeline from './pages/SharedTripTimeline';
import SmsLogs from './pages/SmsLogs';
import SolicitarViagemCorporativa from './pages/SolicitarViagemCorporativa';
import SubcontractorQuoteResponse from './pages/SubcontractorQuoteResponse';
import Telemetria from './pages/Telemetria';
import TermoAceiteMotorista from './pages/TermoAceiteMotorista';
import TermosAceiteMotoristas from './pages/TermosAceiteMotoristas';
import checkin from './pages/checkin';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AceitarConvite": AceitarConvite,
    "AcompanharSolicitacoes": AcompanharSolicitacoes,
    "AdminDashboard": AdminDashboard,
    "AlterarSenha": AlterarSenha,
    "AprovacaoMotorista": AprovacaoMotorista,
    "AvaliarViagem": AvaliarViagem,
    "BookingSuccessGuest": BookingSuccessGuest,
    "ClientAnalytics": ClientAnalytics,
    "Configuracoes": Configuracoes,
    "ConsultarViagem": ConsultarViagem,
    "CriarCotacaoManual": CriarCotacaoManual,
    "DashboardFornecedor": DashboardFornecedor,
    "DashboardMotorista": DashboardMotorista,
    "DashboardMotoristaV2": DashboardMotoristaV2,
    "DetalhesViagemMotorista": DetalhesViagemMotorista,
    "DetalhesViagemMotoristaV2": DetalhesViagemMotoristaV2,
    "EnviarMensagemMotoristas": EnviarMensagemMotoristas,
    "EventClientDashboard": EventClientDashboard,
    "EventDashboard": EventDashboard,
    "EventDetails": EventDetails,
    "GerenciarAcessosEventos": GerenciarAcessosEventos,
    "GerenciarAprovacoes": GerenciarAprovacoes,
    "GerenciarAvaliacoes": GerenciarAvaliacoes,
    "GerenciarClientes": GerenciarClientes,
    "GerenciarClientesProprios": GerenciarClientesProprios,
    "GerenciarConvitesFuncionarios": GerenciarConvitesFuncionarios,
    "GerenciarCoordenadores": GerenciarCoordenadores,
    "GerenciarCotacoes": GerenciarCotacoes,
    "GerenciarCupons": GerenciarCupons,
    "GerenciarEventos": GerenciarEventos,
    "GerenciarFaturamento": GerenciarFaturamento,
    "GerenciarFornecedores": GerenciarFornecedores,
    "GerenciarFuncionarios": GerenciarFuncionarios,
    "GerenciarLeads": GerenciarLeads,
    "GerenciarLinksCompartilhados": GerenciarLinksCompartilhados,
    "GerenciarModulo3": GerenciarModulo3,
    "GerenciarNotificacoes": GerenciarNotificacoes,
    "GerenciarPagamentos": GerenciarPagamentos,
    "GerenciarParceiros": GerenciarParceiros,
    "GerenciarPermissoesAdmin": GerenciarPermissoesAdmin,
    "GerenciarPlanosModulo3": GerenciarPlanosModulo3,
    "GerenciarReceptivos": GerenciarReceptivos,
    "GerenciarTagsPassageiros": GerenciarTagsPassageiros,
    "GerenciarTrechosFrequentes": GerenciarTrechosFrequentes,
    "GerenciarUsuarios": GerenciarUsuarios,
    "GerenciarVeiculos": GerenciarVeiculos,
    "GerenciarVeiculosFornecedores": GerenciarVeiculosFornecedores,
    "GestaoRotas": GestaoRotas,
    "Index": Index,
    "LocalizacaoMotoristas": LocalizacaoMotoristas,
    "MeusDados": MeusDados,
    "MeusMotoristas": MeusMotoristas,
    "MeusVeiculosFornecedor": MeusVeiculosFornecedor,
    "MinhasSolicitacoes": MinhasSolicitacoes,
    "MinhasSolicitacoesFornecedor": MinhasSolicitacoesFornecedor,
    "MinhasViagens": MinhasViagens,
    "MinhasViagensProprias": MinhasViagensProprias,
    "MonitoramentoSistema": MonitoramentoSistema,
    "NovaReserva": NovaReserva,
    "PartnerDriverInfo": PartnerDriverInfo,
    "PartnerQuoteResponse": PartnerQuoteResponse,
    "PartnerTripView": PartnerTripView,
    "PoliticaDePrivacidade": PoliticaDePrivacidade,
    "PortalCorporativo": PortalCorporativo,
    "PublicQuoteView": PublicQuoteView,
    "PublicSharedTripListView": PublicSharedTripListView,
    "ReceptiveListEventView": ReceptiveListEventView,
    "ReceptiveListStatus": ReceptiveListStatus,
    "RelatorioFinanceiroFornecedores": RelatorioFinanceiroFornecedores,
    "RelatorioFinanceiroMotoristas": RelatorioFinanceiroMotoristas,
    "RelatorioKmPercorrido": RelatorioKmPercorrido,
    "RetomarCarrinho": RetomarCarrinho,
    "RetomarPagamento": RetomarPagamento,
    "RevisaoFaturaExterna": RevisaoFaturaExterna,
    "SharedTripTimeline": SharedTripTimeline,
    "SmsLogs": SmsLogs,
    "SolicitarViagemCorporativa": SolicitarViagemCorporativa,
    "SubcontractorQuoteResponse": SubcontractorQuoteResponse,
    "Telemetria": Telemetria,
    "TermoAceiteMotorista": TermoAceiteMotorista,
    "TermosAceiteMotoristas": TermosAceiteMotoristas,
    "checkin": checkin,
}

export const pagesConfig = {
    mainPage: "NovaReserva",
    Pages: PAGES,
    Layout: __Layout,
};