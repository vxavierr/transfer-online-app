import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { 
        Home, Calendar, LayoutDashboard, MapPin, LogOut, Settings, Car, Lock, Package, 
        MessageSquare, Menu, User, Ticket, Users, DollarSign, Building2, CheckCircle, 
        Receipt, BarChart3, Plane, FileText, Briefcase, Shield, HelpCircle, 
        ChevronLeft, ChevronRight, Plus, Activity, Link2, UserCheck, Search, ArrowDown
        } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import LanguageSelector from './components/LanguageSelector';
import WhatsAppButton from './components/WhatsAppButton';
import DriverMessageFloatingAlert from './components/driver/DriverMessageFloatingAlert';
import { ADMIN_PAGES_CONFIG, ADMIN_MENU_STRUCTURE } from './components/adminPagesConfig';
import { Download } from 'lucide-react';
import { Toaster } from 'sonner';
import MetaTags from '@/components/seo/MetaTags';

const MANIFEST_DATA = {
  name: "TransferOnline - Transporte Executivo",
  short_name: "TransferOnline",
  description: "Serviço de transporte executivo de luxo e corporativo.",
  start_url: "/PortalCorporativo",
  display: "standalone",
  orientation: "portrait",
  background_color: "#ffffff",
  theme_color: "#2563eb",
  categories: ["travel", "transportation", "productivity", "business"],
  icons: [
    {
      src: "https://cdn-icons-png.flaticon.com/512/1048/1048315.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable"
    },
    {
      src: "https://cdn-icons-png.flaticon.com/512/1048/1048315.png",
      sizes: "192x192",
      type: "image/png"
    }
  ],
  shortcuts: [
    {
      name: "Nova Reserva",
      short_name: "Reservar",
      description: "Fazer uma nova reserva de transfer",
      url: "/NovaReserva",
      icons: [{ src: "https://cdn-icons-png.flaticon.com/512/1048/1048315.png", sizes: "192x192" }]
    },
    {
      name: "Minhas Viagens",
      short_name: "Viagens",
      description: "Ver histórico de viagens",
      url: "/MinhasViagens",
      icons: [{ src: "https://cdn-icons-png.flaticon.com/512/1048/1048315.png", sizes: "192x192" }]
    }
  ],
  related_applications: [],
  prefer_related_applications: false
};

const MANIFEST_URL = `data:application/manifest+json;base64,${btoa(JSON.stringify(MANIFEST_DATA))}`;

function LayoutContent({ children, currentPageName }) {
  const [installPrompt, setInstallPrompt] = React.useState(null);
  const [pullStart, setPullStart] = React.useState(0);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const scrollRef = React.useRef(null);

  const handleTouchStart = (e) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      setPullStart(e.targetTouches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (pullStart > 0 && scrollRef.current && scrollRef.current.scrollTop === 0) {
      const touchY = e.targetTouches[0].clientY;
      const diff = touchY - pullStart;
      if (diff > 0) {
        // Add resistance
        setPullDistance(Math.min(diff * 0.5, 100)); 
        // Prevent default only if pulling down to avoid scrolling body
        if (e.cancelable && diff > 10) e.preventDefault(); 
      }
    }
  };

  const queryClient = useQueryClient();

  const handleTouchEnd = async () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      try {
        // Try to refetch all active queries first
        await queryClient.refetchQueries({ type: 'active' });
        
        // Success feedback
        setTimeout(() => {
          setIsRefreshing(false);
          setPullStart(0);
          setPullDistance(0);
        }, 300);
      } catch (error) {
        // If refetch fails, fall back to page reload
        console.warn('Query refetch failed, reloading page:', error);
        window.location.reload();
      }
    } else {
      setPullStart(0);
      setPullDistance(0);
    }
  };

  // Auto-reload on chunk load errors (404 on old js files)
  React.useEffect(() => {
    const reloadApp = () => {
        console.warn('Chunk load error detected (likely old version cached), reloading...');
        const lastReload = sessionStorage.getItem('chunk_reload_ts');
        const now = Date.now();
        // Evita loop de reload se o erro persistir (aguarda 5s entre reloads)
        if (!lastReload || now - parseInt(lastReload) > 5000) {
            sessionStorage.setItem('chunk_reload_ts', String(now));
            window.location.reload();
        }
    };

    const handleChunkError = (event) => {
      const isChunkError = event?.message?.includes('Loading chunk') || 
                           event?.message?.includes('Importing a module script failed') ||
                           (event?.target?.tagName === 'SCRIPT' && event?.type === 'error');

      if (isChunkError) {
        reloadApp();
      }
    };

    const handlePromiseRejection = (event) => {
      if (event?.reason?.message?.includes('Loading chunk') || event?.reason?.message?.includes('Importing a module script failed')) {
           reloadApp();
      }
      // Tratamento global para erros 401 (Não autorizado)
      if (event?.reason?.response?.status === 401 || event?.reason?.message?.includes('401')) {
          console.warn('[Layout] Sessão expirada detectada (401). Redirecionando para login...');
          base44.auth.logout();
      }
    };

    const handleVitePreloadError = (event) => {
      reloadApp();
    };

    window.addEventListener('error', handleChunkError, true);
    window.addEventListener('unhandledrejection', handlePromiseRejection);
    window.addEventListener('vite:preloadError', handleVitePreloadError);

    return () => {
        window.removeEventListener('error', handleChunkError, true);
        window.removeEventListener('unhandledrejection', handlePromiseRejection);
        window.removeEventListener('vite:preloadError', handleVitePreloadError);
    };
    }, []);

  React.useEffect(() => {
    const linkManifest = document.createElement('link');
    linkManifest.rel = 'manifest';
    linkManifest.href = MANIFEST_URL;
    document.head.appendChild(linkManifest);

    const metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    metaTheme.content = '#2563eb';
    document.head.appendChild(metaTheme);

    const metaMobile = document.createElement('meta');
    metaMobile.name = 'mobile-web-app-capable';
    metaMobile.content = 'yes';
    document.head.appendChild(metaMobile);

    const metaApple = document.createElement('meta');
    metaApple.name = 'apple-mobile-web-app-capable';
    metaApple.content = 'yes';
    document.head.appendChild(metaApple);

    const metaAppleStatus = document.createElement('meta');
    metaAppleStatus.name = 'apple-mobile-web-app-status-bar-style';
    metaAppleStatus.content = 'black-translucent';
    document.head.appendChild(metaAppleStatus);

    const metaAppleTitle = document.createElement('meta');
    metaAppleTitle.name = 'apple-mobile-web-app-title';
    metaAppleTitle.content = 'TransferOnline';
    document.head.appendChild(metaAppleTitle);

    const linkAppleIcon = document.createElement('link');
    linkAppleIcon.rel = 'apple-touch-icon';
    linkAppleIcon.href = "https://cdn-icons-png.flaticon.com/512/1048/1048315.png";
    document.head.appendChild(linkAppleIcon);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      // Wait for window load to not block initial page load
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/functions/serviceWorker', { scope: '/' })
          .then(registration => {
            console.log('SW registered: ', registration);
            
            // Check for updates periodically
            setInterval(() => {
                registration.update();
            }, 60 * 60 * 1000); // 1 hour
          })
          .catch(registrationError => {
            console.warn('SW registration failed (non-critical):', registrationError);
          });
      });
    }

    const handleInstallPrompt = (e) => {
      try {
        e.preventDefault();
        setInstallPrompt(e);
      } catch (error) {
        console.warn('beforeinstallprompt error (non-critical):', error);
      }
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      document.head.removeChild(linkManifest);
      document.head.removeChild(metaTheme);
      document.head.removeChild(metaApple);
      document.head.removeChild(metaMobile);
      document.head.removeChild(linkAppleIcon);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choiceResult = await installPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      } catch (error) {
        console.warn('Install prompt error (non-critical):', error);
        setInstallPrompt(null);
      }
    }
  };

  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [supplierData, setSupplierData] = React.useState(null);
  const [driverAlertsCount, setDriverAlertsCount] = React.useState(0);
  const { t } = useLanguage();

  // Fetch active seasonal theme
  const { data: activeTheme } = useQuery({
    queryKey: ['activeSeasonalTheme'],
    queryFn: async () => {
      // Fetch all active themes
      const themes = await base44.entities.SeasonalConfig.filter({ is_active: true });
      if (!themes || themes.length === 0) return null;
      
      // Find the one that matches current date
      const now = new Date();
      const currentTheme = themes.find(t => {
        const start = new Date(t.start_date);
        const end = new Date(t.end_date);
        // Reset hours to compare dates only or include full timestamp
        end.setHours(23, 59, 59, 999);
        return now >= start && now <= end;
      });
      
      return currentTheme;
    },
    staleTime: 1000 * 60 * 60 // Cache for 1 hour
  });

  const isBookingPage = currentPageName === 'NovaReserva';
  const isPublicQuoteView = currentPageName === 'PublicQuoteView' || currentPageName === 'PublicSharedTripListView' || currentPageName === 'Demonstracao' || currentPageName === 'SharedTripTimeline' || currentPageName === 'Inicio' || currentPageName === 'Index';
  
  const rootPages = [
    'NovaReserva', 'Inicio', 'Index', 'AdminDashboard', 'DashboardMotoristaV2', 
    'MinhasSolicitacoesFornecedor', 'MinhasViagens', 'MeusDados', 
    'SolicitarViagemCorporativa', 'PortalCorporativo', 'EventDashboard', 
    'ConsultarViagem'
  ];
  const isRootPage = rootPages.includes(currentPageName);

  const isSuperAdminEmail = user?.email === 'fernandotransferonline@gmail.com';
  const isAdmin = user?.role === 'admin' || isSuperAdminEmail;
  const isDriver = !isAdmin && user?.is_driver === true && user?.driver_id;
  const isSupplier = !isAdmin && !isDriver && user?.supplier_id;
  const isCorporateUser = !isAdmin && !isSupplier && !isDriver && user?.client_id;
  const isEventManager = !isAdmin && user?.event_access_active === true;
  const isClientAdmin = isCorporateUser && (user?.client_role === 'admin' || user?.client_corporate_role === 'admin_client');
  
  const supplierPages = React.useMemo(() => {
    const pages = ['MinhasSolicitacoesFornecedor', 'GerenciarFaturamento', 'GerenciarPagamentos', 'MeusVeiculosFornecedor', 'MeusMotoristas', 'GerenciarFuncionarios', 'GerenciarReceptivos', 'ReceptivosRealizadosFornecedor', 'MeusDados', 'GerenciarClientesProprios', 'MinhasViagensProprias', 'EnviarMensagemMotoristas', 'CriarCotacaoManual', 'GerenciarCotacoes', 'GerenciarEventos', 'EventDetails', 'GerenciarLinksCompartilhados', 'PortalCorporativo', 'SolicitarViagemCorporativa', 'MinhasSolicitacoes', 'ClientAnalytics', 'GerenciarFuncionarios', 'RelatorioFinanceiroFornecedores', 'GerenciarCoordenadores'];
    if (supplierData?.features?.event_dashboard_access) pages.push('EventDashboard');
    if (supplierData?.features?.driver_tracking_access) pages.push('LocalizacaoMotoristas');
    if (supplierData?.features?.can_subcontract) pages.push('GerenciarParceiros');
    return pages;
    }, [supplierData]);
  const corporatePages = ['SolicitarViagemCorporativa', 'MinhasSolicitacoes', 'GerenciarFuncionarios', 'MeusDados', 'ClientAnalytics'];
  const driverPages = ['DashboardMotoristaV2', 'DetalhesViagemMotorista', 'DetalhesViagemMotoristaV2', 'MeusPagamentosMotorista', 'MeusDocumentosMotorista', 'MeusDados'];
  const eventManagerPages = ['GerenciarEventos', 'EventDetails', 'EventDashboard', 'MeusDados'];

  React.useEffect(() => {
    if (!document.getElementById('ga4-script')) {
      const script = document.createElement('script');
      script.id = 'ga4-script';
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=G-1BK55ZX1GT";
      document.head.appendChild(script);

      const inlineScript = document.createElement('script');
      inlineScript.id = 'ga4-inline-script';
      inlineScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-1BK55ZX1GT');
      `;
      document.head.appendChild(inlineScript);
    }
  }, []);

  React.useEffect(() => {
    if (!document.getElementById('gtm-script')) {
      const script = document.createElement('script');
      script.id = 'gtm-script';
      script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-T4KWZVFK');`;
      document.head.appendChild(script);
    }
  }, []);

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        try {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
          
          if (currentUser?.supplier_id) {
            try {
              const supplier = await base44.entities.Supplier.get(currentUser.supplier_id);
              setSupplierData(supplier);
            } catch (e) {
              console.warn('[Layout] Aviso ao buscar fornecedor:', e.message || e);
            }
          }

          // Sincronização automática de solicitações de "Solicitante Frequente"
          // Executa em background sem bloquear a UI
          base44.functions.invoke('syncFrequentRequesterData')
            .then(res => {
              if (res?.data?.updated_count > 0) {
                console.log(`[Layout] Sincronização: ${res.data.updated_count} solicitações vinculadas.`);
              }
            })
            .catch(err => console.warn('[Layout] Erro na sincronização de solicitante:', err));
        } catch (authError) {
          setUser(null);
        }
      } catch (error) {
      console.error('[Layout] Erro ao inicializar:', error);
      setUser(null);
      } finally {
      setIsLoading(false);
      }
      };

      initializeApp();
      }, []);

      // Verificar alertas de documentos para fornecedores
      React.useEffect(() => {
      if (user && !isAdmin && !isDriver && user.supplier_id) {
      const checkAlerts = async () => {
      try {
      const response = await base44.functions.invoke('checkSupplierDocumentAlerts');
      if (response && response.count !== undefined) {
        setDriverAlertsCount(response.count);
      }
      } catch (error) {
      console.error('Erro ao verificar alertas de documentos:', error);
      }
      };

      checkAlerts();
      // Verificar periodicamente (ex: a cada 10 min)
      const interval = setInterval(checkAlerts, 600000);
      return () => clearInterval(interval);
      }
      }, [user, isAdmin, isDriver]);

  const requiresAuth = [
  'AdminDashboard', 'GestaoRotas', 'GerenciarVeiculos', 'Configuracoes', 'MeusDados',
  'MinhasViagens', 'GerenciarCotacoes', 'GerenciarCupons', 'GerenciarFornecedores',
  'RelatorioFinanceiroFornecedores', 'GerenciarUsuarios', 'CriarCotacaoManual',
  'GerenciarClientes', 'GerenciarVeiculosFornecedores', 'AcompanharSolicitacoes',
  'SolicitarViagemCorporativa', 'MinhasSolicitacoes', 'GerenciarAprovacoes', 'ClientAnalytics',
  'GerenciarPermissoesAdmin', 'TermosAceiteMotoristas', 'GerenciarModulo3', 'GerenciarPlanosModulo3',
  'DashboardFornecedor', 'MinhasSolicitacoesFornecedor', 'MeusVeiculosFornecedor', 'MeusMotoristas', 'GerenciarFuncionarios', 'GerenciarFaturamento', 'GerenciarReceptivos', 'ReceptivosRealizadosFornecedor', 'GerenciarPagamentosPrestadores', 'GerenciarPagamentosParceiros', 'GerenciarClientesProprios', 'MinhasViagensProprias', 'GerenciarParceiros',
  'GerenciarFuncionarios',
  'DashboardMotorista', 'MeusPagamentosMotorista', 'MeusDocumentosMotorista',
  'GerenciarEventos', 'Telemetria', 'EventDetails',
  'EnviarMensagemMotoristas', 'GerenciarLinksCompartilhados', 'PortalCorporativo',
  'LocalizacaoMotoristas', 'GerenciarCoordenadores', 'EventDashboard',
  'GerenciarAcessosEventos', 'RelatorioKmPercorrido',
  'RelatorioFinanceiroMotoristas', 'GerenciarLeads', 'GerenciarAvaliacoes',
  'SmsLogs', 'GerenciarTemas', 'GerenciarTagsPassageiros', 'MonitoramentoSistema', 'GerenciarNotificacoes'
  ];
  const isProtectedPage = requiresAuth.includes(currentPageName);

  React.useEffect(() => {
    const hostname = window.location.hostname;
    const isHome = currentPageName === 'Inicio' || currentPageName === 'Index' || currentPageName === 'Home';

    if (isHome) {
      console.log('[Layout] Checking redirect for hostname:', hostname);

      // Se é admin, vai para AdminDashboard (Prioridade Máxima)
      if (isAdmin && !isLoading) {
        console.log('[Layout] Admin detected on home page, redirecting to AdminDashboard');
        navigate(createPageUrl('AdminDashboard') + location.search, { replace: true });
        return;
      }

      // Se não é admin e é domínio do APP, vai para NovaReserva
      if (hostname === 'www.app.transferonline.com.br' || hostname === 'app.transferonline.com.br') {
         console.log('[Layout] Redirecting app domain to NovaReserva');
         navigate(createPageUrl('NovaReserva') + location.search, { replace: true });
         return;
      }
    }

    // Safety check: If root URL loads AceitarConvite (router issue), redirect to NovaReserva
    if (location.pathname === '/' && currentPageName === 'AceitarConvite') {
       console.log('[Layout] Root loaded AceitarConvite, forcing redirect to NovaReserva');
       navigate(createPageUrl('NovaReserva') + location.search, { replace: true });
    }
  }, [currentPageName, navigate, location.search, isAdmin, isLoading, location.pathname]);

  React.useEffect(() => {
    if (!isLoading && !user && isProtectedPage) {
      base44.auth.redirectToLogin(createPageUrl(currentPageName) + location.search);
    }
  }, [isLoading, user, isProtectedPage, currentPageName, location.search]);

  const allAdminPages = ADMIN_PAGES_CONFIG.map(page => ({
    title: page.name,
    url: createPageUrl(page.id),
    icon: page.icon,
    page: page.id
  }));

  React.useEffect(() => {
    const checkDriverTerms = async () => {
      if (!isLoading && user && isDriver) {
        try {
          const driverData = await base44.entities.Driver.get(user.driver_id);

          if (!driverData.terms_accepted_at && currentPageName !== 'TermoAceiteMotorista') {
            console.log('[Layout] Motorista não aceitou os termos, redirecionando...');
            navigate(createPageUrl('TermoAceiteMotorista') + location.search, { replace: true });
            return;
          }

          if (driverData.terms_accepted_at && !driverPages.includes(currentPageName) && currentPageName !== 'TermoAceiteMotorista') {
          console.log('[Layout] Redirecionando motorista para DashboardMotoristaV2');
          navigate(createPageUrl('DashboardMotoristaV2') + location.search, { replace: true });
          }
        } catch (error) {
          console.error('[Layout] Erro ao verificar termos do motorista:', error);
        }
      }
    };

    checkDriverTerms();
  }, [isLoading, user, isDriver, currentPageName, navigate, location.search]);

  React.useEffect(() => {
    if (!isLoading && user && isSupplier) {
      if (!supplierPages.includes(currentPageName)) {
        console.log('[Layout] Redirecionando fornecedor para MinhasSolicitacoesFornecedor (Centro de Comando)');
        navigate(createPageUrl('MinhasSolicitacoesFornecedor') + location.search, { replace: true });
      }
    }
  }, [isLoading, user, isSupplier, currentPageName, navigate, location.search]);

  React.useEffect(() => {
    if (!isLoading && user && isCorporateUser) {
      const isPublicPage = currentPageName === 'CadastroInteresse';

      if (!corporatePages.includes(currentPageName) && !isPublicPage) {
        console.log('[Layout] Redirecionando usuário corporativo para SolicitarViagemCorporativa');
        navigate(createPageUrl('SolicitarViagemCorporativa') + location.search, { replace: true });
      }
    }
  }, [isLoading, user, isCorporateUser, currentPageName, navigate, location.search]);

  React.useEffect(() => {
    if (!isLoading && user && isAdmin) {
      // Admin redirect logic
      const adminPagesList = allAdminPages.map(p => p.page);
      const isAdminPage = adminPagesList.includes(currentPageName);
      const isPublicPage = currentPageName === 'NovaReserva' || currentPageName === 'CadastroInteresse';
      const isSharedPage = currentPageName === 'MeusDados';
      const isEventDetailsPage = currentPageName === 'EventDetails';
      const isHomePage = currentPageName === 'Inicio' || currentPageName === 'Index' || currentPageName === 'Home';

      if (!isAdminPage && !isPublicPage && !isSharedPage && !isEventDetailsPage) {
        console.log('[Layout] Redirecionando admin para AdminDashboard');
        navigate(createPageUrl('AdminDashboard') + location.search, { replace: true });
      } else if (isHomePage) {
        console.log('[Layout] Admin na página inicial, redirecionando para AdminDashboard');
        navigate(createPageUrl('AdminDashboard') + location.search, { replace: true });
      }
    }
  }, [isLoading, user, isAdmin, currentPageName, navigate, allAdminPages, location.search]);

  React.useEffect(() => {
    let title = "TransferOnline - Sistema de Reservas de Transfer";

    if (currentPageName === 'NovaReserva') {
      title = "Reserve Transfer Aeroporto | TransferOnline - Conforto e Segurança";
    } else if (currentPageName === 'Index' || currentPageName === 'Inicio') {
      title = "TransferOnline - Transporte Executivo de Alto Padrão";
    } else if (currentPageName === 'AdminDashboard') {
      title = "Painel Administrativo | Gestão de Reservas - TransferOnline";
    } else if (currentPageName === 'DashboardMotoristaV2') {
      title = "Minhas Viagens | Motorista - TransferOnline";
    } else if (currentPageName === 'DetalhesViagemMotorista') {
      title = "Detalhes da Viagem | Motorista - TransferOnline";
    } else if (currentPageName === 'MeusPagamentosMotorista') {
      title = "Meus Pagamentos | Motorista - TransferOnline";
    } else if (currentPageName === 'MeusDocumentosMotorista') {
      title = "Meus Documentos | Motorista - TransferOnline";
    } else if (currentPageName === 'GestaoRotas') {
      title = "Gestão de Rotas e Tarifas | Admin - TransferOnline";
    } else if (currentPageName === 'GerenciarVeiculos') {
      title = "Gestão de Tipos de Veículos | Admin - TransferOnline";
    } else if (currentPageName === 'Configuracoes') {
      title = "Configurações do Sistema | Admin - TransferOnline";
    } else if (currentPageName === 'MeusDados') {
      title = "Meus Dados | Minha Conta - TransferOnline";
    } else if (currentPageName === 'MinhasViagens') {
      title = "Minhas Viagens | Histórico de Reservas - TransferOnline";
    } else if (currentPageName === 'GerenciarCotacoes') {
      title = "Gerenciar Cotações | Admin - TransferOnline";
    } else if (currentPageName === 'CriarCotacaoManual') {
      title = "Criar Cotação Manual | Admin - TransferOnline";
    } else if (currentPageName === 'GerenciarCupons') {
      title = "Gerenciar Cupons | Admin - TransferOnline";
    } else if (currentPageName === 'GerenciarFornecedores') {
      title = "Gerenciar Fornecedores | Admin - TransferOnline";
    } else if (currentPageName === 'GerenciarAprovacoes') {
      title = "Gerenciar Aprovações | Admin - TransferOnline";
    } else if (currentPageName === 'RelatorioFinanceiroFornecedores') {
      title = "Relatório Financeiro | Admin - TransferOnline";
    } else if (currentPageName === 'GerenciarUsuarios') {
      title = "Gerenciar Usuários | Admin - TransferOnline";
    } else if (currentPageName === 'GerenciarPermissoesAdmin') {
      title = "Gerenciar Permissões Admin | Admin - TransferOnline";
    } else if (currentPageName === 'GerenciarClientes') {
      title = "Gerenciar Clientes | Admin - TransferOnline";
    } else if (currentPageName === 'GerenciarVeiculosFornecedores') {
      title = "Gerenciar Veículos de Fornecedores | Admin - TransferOnline";
    } else if (currentPageName === 'AcompanharSolicitacoes') {
      title = "Acompanhar Solicitações Corporativas | Admin - TransferOnline";
    } else if (currentPageName === 'SolicitarViagemCorporativa') {
      title = "Solicitar Viagem Corporativa | TransferOnline";
    } else if (currentPageName === 'MinhasSolicitacoes') {
      title = "Minhas Solicitações Corporativas | TransferOnline";
    } else if (currentPageName === 'ClientAnalytics') {
      title = "Análise de Viagens | TransferOnline";
    } else if (currentPageName === 'DashboardFornecedor') {
      title = "Dashboard do Fornecedor | TransferOnline";
    } else if (currentPageName === 'MinhasSolicitacoesFornecedor') {
      title = "Minhas Solicitações (Fornecedor) | TransferOnline";
    } else if (currentPageName === 'MeusVeiculosFornecedor') {
      title = "Meus Veículos (Fornecedor) | TransferOnline";
    } else if (currentPageName === 'MeusMotoristas') {
      title = "Meus Motoristas (Fornecedor) | TransferOnline";
    } else if (currentPageName === 'GerenciarFuncionarios') {
      title = "Gerenciar Funcionários | TransferOnline";
    } else if (currentPageName === 'GerenciarFaturamento') {
      title = "Gerenciar Faturamento (Fornecedor) | TransferOnline";
    } else if (currentPageName === 'GerenciarPagamentos') {
      title = "Gerenciar Pagamentos (Fornecedor) | TransferOnline";
    } else if (currentPageName === 'GerenciarReceptivos') {
      title = "Gerenciar Receptivos (Fornecedor) | TransferOnline";
    } else if (currentPageName === 'GerenciarParceiros') {
      title = "Meus Parceiros (Fornecedor) | TransferOnline";
    }

    document.title = title;
  }, [currentPageName, t]);

  const publicPages = [
    {
      title: t('common.makeBooking'),
      url: createPageUrl('NovaReserva'),
      icon: Calendar,
    },
    {
      title: 'Consultar Viagem',
      url: createPageUrl('ConsultarViagem'),
      icon: Search,
    }
  ];

  const userPages = [
    {
      title: t('common.makeBooking'),
      url: createPageUrl('NovaReserva'),
      icon: Calendar,
    },
    {
      title: 'Consultar Viagem',
      url: createPageUrl('ConsultarViagem'),
      icon: Search,
    },
    {
      title: 'Minhas Viagens',
      url: createPageUrl('MinhasViagens'),
      icon: Package,
    },
    {
      title: 'Meus Dados',
      url: createPageUrl('MeusDados'),
      icon: User,
    }
  ];

  const eventManagerPagesMenu = [
    {
      title: t('common.makeBooking'),
      url: createPageUrl('NovaReserva'),
      icon: Ticket,
    },
    {
      title: 'Minhas Viagens',
      url: createPageUrl('MinhasViagens'),
      icon: Package,
    },
    {
      title: 'Meus Eventos',
      url: createPageUrl('GerenciarEventos'),
      icon: Calendar,
    },
    {
      title: 'Meus Dados',
      url: createPageUrl('MeusDados'),
      icon: User,
    }
  ];

  const corporateUserPages = [
    {
      group: 'Viagens',
      items: [
        { title: 'Solicitar Viagem', url: createPageUrl('SolicitarViagemCorporativa'), icon: Calendar },
        { title: 'Minhas Solicitações', url: createPageUrl('MinhasSolicitacoes'), icon: Package },
        { title: 'Análise de Viagens', url: createPageUrl('ClientAnalytics'), icon: BarChart3 },
      ]
    },
    {
      group: 'Gerenciamento',
      items: [
        ...(isClientAdmin ? [{ title: 'Gerenciar Funcionários', url: createPageUrl('GerenciarFuncionarios'), icon: Users }] : []),
      ]
    },
    {
      group: 'Minha Conta',
      items: [
        { title: 'Meus Dados', url: createPageUrl('MeusDados'), icon: User },
      ]
    },
    {
      group: 'Suporte',
      items: [
        { title: 'Ajuda / Tour', url: createPageUrl('SolicitarViagemCorporativa') + '?tutorial=true', icon: HelpCircle },
      ]
    }
  ].filter(group => group.items.length > 0);

  const supplierPagesMenu = [
    {
      group: 'Visão Geral',
      items: [
        { title: 'Dashboard Operacional', url: createPageUrl('MinhasSolicitacoesFornecedor'), icon: LayoutDashboard },
      ]
    },
    {
      group: 'Gestão Financeira',
      items: [
        { title: 'Gerenciar Faturamento', url: createPageUrl('GerenciarFaturamento'), icon: Receipt },
        { title: 'Pagamentos', url: createPageUrl('GerenciarPagamentos'), icon: DollarSign },
        { title: 'Relatório Financeiro', url: createPageUrl('RelatorioFinanceiroFornecedores'), icon: BarChart3 },
      ]
    },
    {
      group: 'Operação e Frota',
      items: [
        ...(supplierData?.features?.can_subcontract ? [
          { title: 'Meus Parceiros', url: createPageUrl('GerenciarParceiros'), icon: Users }
        ] : []),
        { title: 'Meus Veículos', url: createPageUrl('MeusVeiculosFornecedor'), icon: Car },
        { title: 'Meus Motoristas', url: createPageUrl('MeusMotoristas'), icon: Users, badge: driverAlertsCount > 0 ? driverAlertsCount : null, badgeColor: 'bg-red-500' },
        { title: 'Coordenadores', url: createPageUrl('GerenciarCoordenadores'), icon: UserCheck },
        ...(supplierData?.features?.receptive_management ? [
          { title: 'Gerenciar Receptivos', url: createPageUrl('GerenciarReceptivos'), icon: Plane },
        ] : []),
        ...(supplierData?.features?.driver_tracking_access ? [
          { title: 'Mapa em Tempo Real', url: createPageUrl('LocalizacaoMotoristas'), icon: MapPin }
        ] : []),
      ]
    },
    {
      group: 'Eventos e Logística',
      items: [
        { title: 'Gestão de Eventos', url: createPageUrl('GerenciarEventos'), icon: Calendar },
        { title: 'Links Compartilhados', url: createPageUrl('GerenciarLinksCompartilhados'), icon: Link2 },
        ...(supplierData?.features?.event_dashboard_access ? [
          { title: 'Dashboard do Evento', url: createPageUrl('EventDashboard'), icon: Activity }
        ] : []),
      ]
    },
    {
      group: 'Cotações e Clientes',
      items: [
        ...(supplierData?.features?.can_manage_quotes ? [
          { title: 'Gerenciar Cotações', url: createPageUrl('GerenciarCotacoes'), icon: FileText }
        ] : []),
        ...(supplierData?.features?.driver_messaging ? [
          { title: 'Enviar Mensagens', url: createPageUrl('EnviarMensagemMotoristas'), icon: MessageSquare }
        ] : []),
        ...(supplierData?.module3_enabled && supplierData?.module3_subscription_level >= 2 ? [
          { title: 'Meus Clientes', url: createPageUrl('GerenciarClientesProprios'), icon: Building2 }
        ] : []),
      ]
    },
    {
      group: 'Minha Empresa',
      items: [
        { title: 'Meus Funcionários', url: createPageUrl('GerenciarFuncionarios'), icon: Users },
        { title: 'Meus Dados', url: createPageUrl('MeusDados'), icon: User },
      ]
    },
    {
      group: 'Suporte',
      items: [
        { title: 'Ajuda / Tour', url: createPageUrl('IndicadoresFornecedor') + '?tutorial=true', icon: HelpCircle }
      ]
    }
  ].filter(group => group.items.length > 0);

  const driverPagesMenu = [
    {
      title: 'Minhas Viagens',
      url: createPageUrl('DashboardMotoristaV2'),
      icon: Package,
    },
    {
      title: 'Meus Pagamentos',
      url: createPageUrl('MeusDados') + '?tab=payments',
      icon: DollarSign,
    },
    {
      title: 'Meus Documentos',
      url: createPageUrl('MeusDados') + '?tab=documents',
      icon: FileText,
    },
    {
      title: 'Meus Dados',
      url: createPageUrl('MeusDados'),
      icon: User,
    },
    {
      title: 'Ajuda / Tour',
      url: createPageUrl('DashboardMotoristaV2') + '?tutorial=true',
      icon: HelpCircle,
    }
    ];

  const adminPagesMenu = React.useMemo(() => {
    if (!isAdmin || !user) return [];

    return ADMIN_MENU_STRUCTURE.map(group => ({
      group: group.group,
      items: group.items
        .filter(item => {
          if (!user.admin_page_permissions || user.admin_page_permissions.length === 0) return true;
          return user.admin_page_permissions.includes(item.id);
        })
        .map(item => ({
          title: item.name,
          url: createPageUrl(item.id),
          icon: item.icon,
          page: item.id
        }))
    })).filter(group => group.items.length > 0);
  }, [isAdmin, user]);

  React.useEffect(() => {
    if (!isLoading && user && isAdmin && currentPageName) {
      const protectedPages = allAdminPages.map(p => p.page);

      if (protectedPages.includes(currentPageName)) {
        if (user.admin_page_permissions && user.admin_page_permissions.length > 0) {
          if (!user.admin_page_permissions.includes(currentPageName)) {
            alert('Você não tem permissão para acessar esta página.');
            navigate(createPageUrl('AdminDashboard') + location.search, { replace: true });
          }
        }
      }
    }
  }, [isLoading, user, isAdmin, currentPageName, navigate, allAdminPages]);

  const shouldRedirect = React.useMemo(() => {
    if (isLoading || !user) return false;

    // Admin Redirect Check
    if (isAdmin) {
      const adminPagesList = allAdminPages.map(p => p.page);
      const isAdminPage = adminPagesList.includes(currentPageName);
      const isPublicPage = currentPageName === 'NovaReserva' || currentPageName === 'CadastroInteresse';
      const isSharedPage = currentPageName === 'MeusDados';
      const isEventDetailsPage = currentPageName === 'EventDetails';

      if (!isAdminPage && !isPublicPage && !isSharedPage && !isEventDetailsPage) return true;
    }

    // Driver Redirect Check
    if (isDriver) {
       if (!driverPages.includes(currentPageName) && currentPageName !== 'TermoAceiteMotorista') return true;
    }

    // Supplier Redirect Check
    if (isSupplier) {
      if (!supplierPages.includes(currentPageName)) return true;
    }

    // Corporate User Redirect Check
    if (isCorporateUser) {
      const isPublicPage = currentPageName === 'CadastroInteresse';
      if (!corporatePages.includes(currentPageName) && !isPublicPage) return true;
    }

    return false;
  }, [isLoading, user, currentPageName, isAdmin, isDriver, isSupplier, isCorporateUser, allAdminPages, driverPages, supplierPages, corporatePages]);

  let navigationItems = [];

  if (isAdmin) {
    navigationItems = adminPagesMenu;
  } else if (isDriver) {
    navigationItems = driverPagesMenu;
  } else if (isSupplier) {
    navigationItems = supplierPagesMenu;
  } else if (isCorporateUser) {
    navigationItems = corporateUserPages;
  } else if (isEventManager) {
    navigationItems = eventManagerPagesMenu;
  } else if (user) {
    navigationItems = userPages;
  } else {
    navigationItems = publicPages;
  }

  if ((isLoading && isProtectedPage) || shouldRedirect) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isBookingPage) {
    return (
      <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  // Calculate background styles based on theme
  const getBackgroundStyle = () => {
    if (!activeTheme?.theme_data) return {};

    const { background_image_url, primary_color, secondary_color, background_overlay_color } = activeTheme.theme_data;
    
    // Convert hex to rgba for gradient transparency if overlay color isn't explicit
    const hexToRgba = (hex, alpha) => {
      if (!hex || !hex.startsWith('#')) return hex;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    if (background_image_url) {
      // If image exists, use gradient overlay + image
      const gradientFrom = background_overlay_color || hexToRgba(primary_color || '#2563eb', 0.85);
      const gradientTo = background_overlay_color || hexToRgba(secondary_color || '#1e40af', 0.85);
      
      return {
        backgroundImage: `linear-gradient(to bottom right, ${gradientFrom}, ${gradientTo}), url('${background_image_url}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    } else if (primary_color && secondary_color) {
      // If no image but colors exist, use strong gradient
      return {
        background: `linear-gradient(135deg, ${primary_color} 0%, #ffffff 50%, ${secondary_color} 100%)`
      };
    }
    
    return {};
  };

  const themeStyle = getBackgroundStyle();
  const hasCustomTheme = Object.keys(themeStyle).length > 0;

  return (
    <div 
      className={`h-screen flex w-full ${hasCustomTheme ? '' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'} dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-50 relative overflow-hidden transition-all duration-500`}
      style={themeStyle}
    >
      <style>{`
        :root {
            --sat: env(safe-area-inset-top);
            --sab: env(safe-area-inset-bottom);
            --sal: env(safe-area-inset-left);
            --sar: env(safe-area-inset-right);
        }
        body {
            overscroll-behavior-y: none;
        }
        button, a, [role="button"], .clickable {
            user-select: none;
            -webkit-user-select: none;
            -webkit-tap-highlight-color: transparent;
        }
      `}</style>
      <noscript>
        <iframe 
          src="https://www.googletagmanager.com/ns.html?id=GTM-T4KWZVFK"
          height="0" 
          width="0" 
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
      <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-blue-300/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-green-200/25 to-blue-200/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-gradient-to-br from-purple-200/20 to-blue-300/25 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {!isPublicQuoteView && (
      <aside className={`hidden lg:flex lg:flex-col ${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 relative z-10 transition-all duration-300`}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-9 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:bg-gray-50 transition-colors z-50 text-gray-500 hover:text-blue-600"
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className="border-b border-gray-200 p-4">
          <div className={`flex items-center gap-3 mb-6 px-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 flex items-center justify-center shadow-lg rounded-xl overflow-hidden flex-shrink-0">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68effdb75fcac474f3f66b8f/57204d3c2_logo-icone.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 overflow-hidden">
                <h2 className="font-bold text-lg text-gray-900 truncate">TransferOnline</h2>
                <p className="text-[10px] text-gray-500 truncate">
                  {isSupplier ? 'Portal Fornecedor' : 
                   isCorporateUser ? 'Portal Corporativo' :
                   isDriver ? 'Portal Motorista' :
                   isAdmin ? 'Administração' : 'Sistema de Reservas'}
                </p>
              </div>
            )}
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors outline-none border border-transparent hover:border-gray-200 ${isCollapsed ? 'justify-center' : ''}`}>
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 font-semibold text-sm">
                      {user.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium text-gray-900 text-sm truncate">{user.full_name}</p>
                        <div className="flex items-center gap-1">
                          {isAdmin && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Admin</span>}
                          {isSupplier && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Forn.</span>}
                          {isCorporateUser && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Corp</span>}
                          {isDriver && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">Mot.</span>}
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuItem className="text-xs text-gray-500 pt-0 pb-2 font-normal truncate">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(createPageUrl('MeusDados'))}>
                  <User className="w-4 h-4 mr-2" />
                  Meus Dados
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('common.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className={`space-y-2 w-full ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
              <Button
                onClick={() => base44.auth.redirectToLogin()}
                variant="outline"
                className={`w-full ${isCollapsed ? 'px-0' : ''}`}
                title={isCollapsed ? "Login" : ""}
              >
                {isCollapsed ? <User className="w-4 h-4" /> : "Login / Criar Conta"}
              </Button>
              {!isDriver && !isSupplier && (
                <WhatsAppButton 
                  variant="sidebar" 
                  showText={!isCollapsed} 
                  className={`w-full border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 ${isCollapsed ? 'px-0 justify-center' : ''}`} 
                />
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <nav className="space-y-1">
            {navigationItems.map((itemOrGroup, index) => {
              // Se for um grupo (Fornecedor)
              if (itemOrGroup.group) {
                return (
                  <div key={index} className="mb-4 last:mb-0">
                    {!isCollapsed && (
                      <h3 className="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                        {itemOrGroup.group}
                      </h3>
                    )}
                    {isCollapsed && index > 0 && (
                      <div className="border-t border-gray-100 my-2 mx-3" />
                    )}
                    <div className="space-y-1">
                      {itemOrGroup.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.url;
                        return (
                          <Link
                            key={item.title}
                            to={item.url}
                            title={isCollapsed ? item.title : ""}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                            } ${isCollapsed ? 'justify-center' : ''}`}
                          >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {!isCollapsed && (
                              <div className="flex-1 flex justify-between items-center min-w-0">
                                <span className="truncate text-sm">{item.title}</span>
                                {item.badge && (
                                  <span className={`ml-2 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-red-500'}`}>
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            )}
                            {isCollapsed && item.badge && (
                              <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-white ${item.badgeColor || 'bg-red-500'}`} />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Se for item plano (Admin, Driver, etc)
              const item = itemOrGroup;
              const Icon = item.icon;
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  title={isCollapsed ? item.title : ""}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <div className="flex-1 flex justify-between items-center min-w-0">
                      <span className="truncate">{item.title}</span>
                      {item.badge && (
                        <span className={`ml-2 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-red-500'}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                  {isCollapsed && item.badge && (
                    <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-white ${item.badgeColor || 'bg-red-500'}`} />
                  )}
                </Link>
              );
            })}
            {!isDriver && !isSupplier && <WhatsAppButton variant="sidebar" showText={!isCollapsed} />}
            </nav>
            </div>

        <div className={`border-t border-gray-200 p-4 space-y-3 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {installPrompt && (
            <Button
              onClick={handleInstallClick}
              className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md mb-2 ${isCollapsed ? 'px-0 justify-center' : ''}`}
              title={isCollapsed ? "Instalar App" : ""}
            >
              <Download className={`w-4 h-4 ${isCollapsed ? '' : 'mr-2'}`} />
              {!isCollapsed && "Instalar App"}
            </Button>
          )}
          <LanguageSelector isCollapsed={isCollapsed} />
        </div>
      </aside>
      )}

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {user && isDriver && user.driver_id && (
          <DriverMessageFloatingAlert driverId={user.driver_id} />
        )}

        {!isPublicQuoteView && (
        <header className="flex lg:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] shadow-sm sticky top-0 z-50">
          <div className="flex items-center justify-between w-full">
            {!isRootPage ? (
              <Button variant="ghost" size="icon" className="-ml-2 mr-2" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-6 h-6 dark:text-white" />
              </Button>
            ) : (
              <div 
                className={`flex items-center gap-2 ${isDriver ? 'cursor-pointer' : ''}`}
                onClick={() => isDriver && navigate(createPageUrl('DashboardMotoristaV2'))}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                  <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68effdb75fcac474f3f66b8f/57204d3c2_logo-icone.jpg" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-gray-900 dark:text-white leading-none">TransferOnline</span>
                </div>
              </div>
            )}

              {!isDriver && !isSupplier && !isCorporateUser && <WhatsAppButton variant="sidebar" showText={false} className="text-green-600 p-2" />}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] p-0">
                <SheetTitle className="hidden">Menu de Navegação</SheetTitle>
                <SheetDescription className="hidden">Menu principal do sistema</SheetDescription>
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68effdb75fcac474f3f66b8f/57204d3c2_logo-icone.jpg" alt="Logo" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg">TransferOnline</h2>
                        <p className="text-xs text-gray-500">
                          {isSupplier ? 'Portal Fornecedor' : 
                           isCorporateUser ? 'Portal Corporativo' :
                           isDriver ? 'Portal Motorista' :
                           isAdmin ? 'Administração' : 'Sistema de Reservas'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <nav className="space-y-2">
                      {navigationItems.map((itemOrGroup, index) => {
                        if (itemOrGroup.group) {
                          return (
                            <div key={index} className="mb-6 last:mb-0">
                              <h3 className="px-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                {itemOrGroup.group}
                              </h3>
                              <div className="space-y-1">
                                {itemOrGroup.items.map((item) => {
                                  const Icon = item.icon;
                                  const isActive = location.pathname === item.url;
                                  return (
                                    <Link
                                      key={item.title}
                                      to={item.url}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                                        isActive
                                          ? 'bg-blue-50 text-blue-700 font-semibold'
                                          : 'text-gray-700 hover:bg-gray-100'
                                      }`}
                                    >
                                      <Icon className="w-5 h-5" />
                                      <div className="flex-1 flex justify-between items-center">
                                        <span className="text-sm">{item.title}</span>
                                        {item.badge && (
                                          <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-red-500'}`}>
                                            {item.badge}
                                          </span>
                                        )}
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        const item = itemOrGroup;
                        const Icon = item.icon;
                        const isActive = location.pathname === item.url;
                        return (
                          <Link
                            key={item.title}
                            to={item.url}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <div className="flex-1 flex justify-between items-center">
                              <span>{item.title}</span>
                              {item.badge && (
                                <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-red-500'}`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                        <div onClick={() => setIsMobileMenuOpen(false)} className="mt-4">
                            {!isDriver && !isSupplier && <WhatsAppButton variant="sidebar" className="px-4" />}
                        </div>
                    </nav>
                  </div>

                  <div className="border-t p-4 space-y-3">
                    {installPrompt && (
                      <Button
                        onClick={handleInstallClick}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md mb-2"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Instalar App
                      </Button>
                    )}
                    <LanguageSelector />

                    {user ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 px-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-700 font-semibold text-sm">
                              {user.full_name?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{user.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            {isAdmin && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                Administrador
                              </span>
                            )}
                            {isSupplier && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                Fornecedor
                              </span>
                            )}
                            {isCorporateUser && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                Corporativo
                              </span>
                            )}
                            {isClientAdmin && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full ml-1">
                                Admin
                              </span>
                            )}
                            {isDriver && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full ml-1">
                                Motorista
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            base44.auth.logout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          {t('common.logout')}
                        </button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          base44.auth.redirectToLogin();
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Login / Criar Conta
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>
        )}

        <div 
          ref={scrollRef}
          className="flex-1 overflow-auto relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {pullDistance > 0 && (
            <div 
              className="absolute top-0 left-0 w-full flex items-center justify-center pointer-events-none z-50 transition-all duration-200"
              style={{ height: `${pullDistance}px`, opacity: pullDistance / 60 }}
            >
              <div className="bg-white dark:bg-slate-800 rounded-full p-2 shadow-lg">
                {isRefreshing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                ) : (
                  <ArrowDown className="w-5 h-5 text-blue-600 dark:text-blue-400" style={{ transform: `rotate(${pullDistance * 2}deg)` }} />
                )}
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {!isDriver && !isSupplier && <WhatsAppButton className="mb-[calc(4rem+env(safe-area-inset-bottom))] lg:mb-0" />}

      {/* Mobile Bottom Navigation */}
      {!isPublicQuoteView && currentPageName !== 'ReceptiveListEventView' && (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] z-50 flex justify-around items-center h-[calc(3.5rem+env(safe-area-inset-bottom))]">
        <Link 
            to={
                isDriver ? createPageUrl('DashboardMotoristaV2') : 
                isSupplier ? createPageUrl('MinhasSolicitacoesFornecedor') : 
                isAdmin ? createPageUrl('AdminDashboard') : 
                createPageUrl('NovaReserva')
            } 
            onClick={(e) => {
              const targetUrl = isDriver ? createPageUrl('DashboardMotoristaV2') : 
                               isSupplier ? createPageUrl('MinhasSolicitacoesFornecedor') : 
                               isAdmin ? createPageUrl('AdminDashboard') : 
                               createPageUrl('NovaReserva');
              if (location.pathname === targetUrl && scrollRef.current) {
                e.preventDefault();
                scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname.endsWith('NovaReserva') || location.pathname.includes('Dashboard') || location.pathname.includes('Solicitacoes') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
        >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Início</span>
        </Link>
        <Link 
            to={
                isDriver ? createPageUrl('DashboardMotoristaV2') : 
                isSupplier ? createPageUrl('MinhasSolicitacoesFornecedor') : 
                createPageUrl('MinhasViagens')
            } 
            onClick={(e) => {
              const targetUrl = isDriver ? createPageUrl('DashboardMotoristaV2') : 
                               isSupplier ? createPageUrl('MinhasSolicitacoesFornecedor') : 
                               createPageUrl('MinhasViagens');
              if (location.pathname === targetUrl && scrollRef.current) {
                e.preventDefault();
                scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname.includes('MinhasViagens') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
        >
            <Package className="w-5 h-5" />
            <span className="text-[10px]">Viagens</span>
        </Link>
        <Link 
            to={createPageUrl('MeusDados')} 
            onClick={(e) => {
              const targetUrl = createPageUrl('MeusDados');
              if (location.pathname === targetUrl && scrollRef.current) {
                e.preventDefault();
                scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname.includes('MeusDados') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
        >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Perfil</span>
        </Link>
      </div>
      )}

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 20s infinite ease-in-out;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <LanguageProvider>
      <Toaster position="top-center" richColors closeButton />
      <MetaTags />
      <LayoutContent children={children} currentPageName={currentPageName} />
      </LanguageProvider>
      );
      }