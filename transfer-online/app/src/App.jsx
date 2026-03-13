import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
// ARCH-EXCEPTION: App.jsx importa Capacitor diretamente para bootstrap do router em nível de módulo.
// Esta é a única exceção permitida — a seleção do Router (MemoryRouter vs BrowserRouter) precisa
// ocorrer antes da montagem da árvore React, tornando inviável usar src/native como intermediário.
// Todos os outros componentes DEVEM importar via '@/native'.
import { Capacitor } from '@capacitor/core';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { useEffect, useRef } from 'react';
import { appParams } from '@/lib/app-params';

// Use MemoryRouter on native platforms (Capacitor) — BrowserRouter requires HTML5 history API
// which is not available under capacitor:// or https://localhost WebView schemes.
// On web, BrowserRouter is kept for normal browser navigation and deep link support.
const isNative = Capacitor.isNativePlatform();

/**
 * Extracts the path from a from_url query parameter.
 * The Base44 SDK passes from_url after OAuth login so the app can restore
 * the intended destination. In a WebView the full URL is capacitor://localhost/SomePage,
 * so we only need the pathname part for MemoryRouter.
 *
 * Returns '/' if no valid from_url is found.
 */
function getNativeInitialEntry() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('from_url');
    if (fromUrl) {
      const decoded = decodeURIComponent(fromUrl);
      const url = new URL(decoded, window.location.origin);
      // Only use the pathname so MemoryRouter gets a valid relative path
      return url.pathname || '/';
    }
  } catch (_) {
    // Malformed URL — fall through to default
  }
  return '/';
}

const nativeInitialEntry = isNative ? getNativeInitialEntry() : '/';

const Router = isNative
  ? (props) => <MemoryRouter initialEntries={[nativeInitialEntry]} {...props} />
  : BrowserRouter;

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

/**
 * PostLoginNavigator — runs inside the Router tree so it can call useNavigate().
 *
 * Problem: In Capacitor, the Base44 SDK redirects to login via window.location.href,
 * passing from_url = window.location.href (e.g. "capacitor://localhost/").
 * After a successful login the server redirects back to that URL with ?access_token=...
 * The MemoryRouter starts at nativeInitialEntry which is "/" → renders NovaReserva.
 * The Layout's role-based redirect logic only fires when currentPageName is one of
 * 'Home'/'Index'/'Inicio', so it never triggers on NovaReserva.
 *
 * Fix: When on native AND the app just completed a login (access_token was present in
 * the URL query string) AND we ended up at "/" (no specific from_url was encoded),
 * navigate to "/Index" so the Layout's redirect logic can route the user to the
 * correct dashboard based on their role (admin → AdminDashboard, driver → DashboardMotoristaV2, etc.).
 *
 * This component is a no-op on web (BrowserRouter handles navigation natively).
 */
const PostLoginNavigator = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (!isNative) return;
    if (isLoadingAuth) return;
    if (handled.current) return;

    // appParams.token is non-null only when an access_token was present in the URL at startup
    // (app-params.js removes it from the URL via replaceState during module initialization).
    // This means: token in appParams = app was opened via an OAuth redirect (post-login).
    const cameFromLogin = Boolean(appParams.token);

    // Only redirect when: just finished a login flow AND ended up at root (no specific from_url)
    if (isAuthenticated && cameFromLogin && nativeInitialEntry === '/') {
      handled.current = true;
      // Navigate to Index so Layout's role-based redirect fires correctly
      navigate('/Index', { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  return null;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

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
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
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
          <PostLoginNavigator />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
