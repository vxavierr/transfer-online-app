import './App.css'
import { useEffect, useState } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { base44 } from '@/api/base44Client';
import GerenciarManutencaoFrota from './pages/GerenciarManutencaoFrota';
import ClientAuditAccess from './pages/ClientAuditAccess';
import ApresentacaoClientesCorporativos from './pages/ApresentacaoClientesCorporativos';
import ApresentacaoFornecedores from './pages/ApresentacaoFornecedores';
import Demonstracao from './pages/Demonstracao';
import AccessPortal from './pages/AccessPortal';
import { isNativePlatform } from '@/native';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AdminOnlyRoute = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then((user) => {
        const hasAdminAccess = user?.role === 'admin' || user?.email === 'fernandotransferonline@gmail.com';
        setIsAdmin(hasAdminAccess);
        setIsChecking(false);
        if (!user) {
          const returnPath = window.location.pathname + window.location.search;
          window.location.href = `/AccessPortal?returnUrl=${encodeURIComponent(returnPath)}`;
        }
      })
      .catch(() => {
        setIsChecking(false);
        const returnPath = window.location.pathname + window.location.search;
        window.location.href = `/AccessPortal?returnUrl=${encodeURIComponent(returnPath)}`;
      });
  }, []);

  if (isChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <PageNotFound />;
  }

  return children;
};

/**
 * Registra um navegador global para autenticação nativa.
 * Quando em modo Capacitor, o AuthContext usa isso ao invés de redirectToLogin.
 */
const NativeAuthNavigator = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isNativePlatform()) {
      window.__NATIVE_NAVIGATE_TO_ACCESS_PORTAL__ = (returnUrl) => {
        const target = returnUrl ? `/AccessPortal?returnUrl=${encodeURIComponent(returnUrl)}` : '/AccessPortal';
        navigate(target, { replace: true });
      };
    }
    return () => {
      delete window.__NATIVE_NAVIGATE_TO_ACCESS_PORTAL__;
    };
  }, [navigate]);

  return null;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  useEffect(() => {
    if (isLoadingPublicSettings || isLoadingAuth || authError) return;

    const publicEntryPaths = ['/', '/NovaReserva', '/Index', '/Inicio'];
    if (!publicEntryPaths.includes(window.location.pathname)) return;

    base44.auth.me()
      .then((user) => {
        if (user?.email === 'fernandotransferonline@gmail.com') {
          window.location.replace(`/AdminDashboard${window.location.search}`);
        }
      })
      .catch(() => {});
  }, [isLoadingAuth, isLoadingPublicSettings, authError]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      // Mostrar spinner enquanto redireciona, em vez de tela branca
      return (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      );
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        isNativePlatform()
          ? <Navigate to={isAuthenticated ? "/AdminDashboard" : "/AccessPortal"} replace />
          : <LayoutWrapper currentPageName={mainPageKey}><MainPage /></LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route
        path="/GerenciarManutencaoFrota"
        element={
          <LayoutWrapper currentPageName="GerenciarManutencaoFrota">
            <GerenciarManutencaoFrota />
          </LayoutWrapper>
        }
      />
      <Route
        path="/ClientAuditAccess"
        element={
          <LayoutWrapper currentPageName="ClientAuditAccess">
            <ClientAuditAccess />
          </LayoutWrapper>
        }
      />
      <Route
        path="/ApresentacaoClientesCorporativos"
        element={
          <LayoutWrapper currentPageName="ApresentacaoClientesCorporativos">
            <AdminOnlyRoute>
              <ApresentacaoClientesCorporativos />
            </AdminOnlyRoute>
          </LayoutWrapper>
        }
      />
      <Route
        path="/ApresentacaoFornecedores"
        element={
          <LayoutWrapper currentPageName="ApresentacaoFornecedores">
            <AdminOnlyRoute>
              <ApresentacaoFornecedores />
            </AdminOnlyRoute>
          </LayoutWrapper>
        }
      />
      <Route
        path="/Demonstracao"
        element={
          <LayoutWrapper currentPageName="Demonstracao">
            <Demonstracao />
          </LayoutWrapper>
        }
      />
      <Route path="/AccessPortal" element={<AccessPortal />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <NativeAuthNavigator />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App