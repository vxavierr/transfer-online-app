import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { isNativePlatform } from '@/native';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // Verificar token via appParams OU diretamente no localStorage (fallback para login via AccessPortal)
        const storedToken = appParams.token
          || localStorage.getItem('base44_access_token')
          || localStorage.getItem('token');

        if (storedToken) {
          // Se o token veio do localStorage e não do appParams, garantir que o SDK tem o token
          if (!appParams.token && storedToken) {
            localStorage.setItem('base44_access_token', storedToken);
          }
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);

    // Limpar tokens do localStorage diretamente
    // NÃO chamar base44.auth.logout() pois ele pode fazer redirect próprio que conflita
    localStorage.removeItem('base44_access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
  };

  const refreshAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      console.error('refreshAuth failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const navigateToLogin = (returnUrl) => {
    // On native, window.location.pathname is always '/' — not useful as returnUrl.
    // Only use it as fallback on web where it reflects the actual route.
    const target = returnUrl || (!isNativePlatform() ? window.location.pathname + window.location.search : null);
    const accessPortalUrl = `/AccessPortal${target ? `?returnUrl=${encodeURIComponent(target)}` : ''}`;

    if (window.__NATIVE_NAVIGATE_TO_ACCESS_PORTAL__) {
      window.__NATIVE_NAVIGATE_TO_ACCESS_PORTAL__(target);
    } else if (isNativePlatform()) {
      // NativeAuthNavigator (in App.jsx) registers the bridge after Router mounts.
      // If it's not ready yet, queue the navigation and retry on the next tick.
      console.warn('[AuthContext] navigateToLogin called before __NATIVE_NAVIGATE_TO_ACCESS_PORTAL__ was registered — queuing retry.');
      const retryNativeNav = (attempt = 0) => {
        if (window.__NATIVE_NAVIGATE_TO_ACCESS_PORTAL__) {
          window.__NATIVE_NAVIGATE_TO_ACCESS_PORTAL__(target);
        } else if (attempt < 20) {
          setTimeout(() => retryNativeNav(attempt + 1), 50);
        } else {
          // Bridge never registered — last-resort: let the router handle a hash change
          // which avoids a full reload unlike window.location.replace().
          console.error('[AuthContext] __NATIVE_NAVIGATE_TO_ACCESS_PORTAL__ never registered after retries. Falling back to hash navigation.');
          window.location.hash = accessPortalUrl;
        }
      };
      setTimeout(() => retryNativeNav(), 0);
    } else {
      // Web fallback: full page replace is acceptable on web (no React Router state loss concern).
      window.location.replace(accessPortalUrl);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      refreshAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};