import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { isNativePlatform } from '@/native';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68effdb75fcac474f3f66b8f/57204d3c2_logo-icone.jpg';

const translations = {
  'pt-BR': {
    title: 'Acesse sua conta',
    subtitle: 'TransferOnline — Transporte Executivo',
    email: 'E-mail',
    emailPlaceholder: 'seu@email.com',
    password: 'Senha',
    passwordPlaceholder: 'Digite sua senha',
    submit: 'Entrar',
    forgot: 'Esqueci minha senha',
    google: 'Entrar com Google',
    forgotTitle: 'Recuperar senha',
    forgotDescription: 'Digite seu e-mail para receber o link de recuperação.',
    forgotSubmit: 'Enviar link',
    forgotBack: 'Voltar ao acesso',
    forgotSuccess: 'E-mail de recuperação enviado! Verifique sua caixa de entrada.',
    errInvalidCredentials: 'E-mail ou senha inválidos.',
    errUserNotFound: 'Usuário não encontrado.',
    errNetwork: 'Erro de conexão. Verifique sua internet.',
    errGeneric: 'Ocorreu um erro. Tente novamente.',
    errEmailRequired: 'Informe seu e-mail.',
    errPasswordRequired: 'Informe sua senha.',
  },
  en: {
    title: 'Access your account',
    subtitle: 'TransferOnline — Executive Transport',
    email: 'Email',
    emailPlaceholder: 'your@email.com',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    submit: 'Sign In',
    forgot: 'Forgot password',
    google: 'Sign in with Google',
    forgotTitle: 'Reset password',
    forgotDescription: 'Enter your email to receive a recovery link.',
    forgotSubmit: 'Send link',
    forgotBack: 'Back to sign in',
    forgotSuccess: 'Recovery email sent! Check your inbox.',
    errInvalidCredentials: 'Invalid email or password.',
    errUserNotFound: 'User not found.',
    errNetwork: 'Connection error. Check your internet.',
    errGeneric: 'An error occurred. Please try again.',
    errEmailRequired: 'Please enter your email.',
    errPasswordRequired: 'Please enter your password.',
  },
  es: {
    title: 'Accede a tu cuenta',
    subtitle: 'TransferOnline — Transporte Ejecutivo',
    email: 'Correo electrónico',
    emailPlaceholder: 'tu@email.com',
    password: 'Contraseña',
    passwordPlaceholder: 'Ingresa tu contraseña',
    submit: 'Ingresar',
    forgot: 'Olvidé mi contraseña',
    google: 'Ingresar con Google',
    forgotTitle: 'Recuperar contraseña',
    forgotDescription: 'Ingresa tu correo para recibir el enlace de recuperación.',
    forgotSubmit: 'Enviar enlace',
    forgotBack: 'Volver al acceso',
    forgotSuccess: '¡Correo de recuperación enviado! Revisa tu bandeja.',
    errInvalidCredentials: 'Correo o contraseña inválidos.',
    errUserNotFound: 'Usuario no encontrado.',
    errNetwork: 'Error de conexión. Verifica tu internet.',
    errGeneric: 'Ocurrió un error. Intenta de nuevo.',
    errEmailRequired: 'Ingresa tu correo.',
    errPasswordRequired: 'Ingresa tu contraseña.',
  },
};

function getLanguage() {
  try {
    const stored = localStorage.getItem('preferredLanguage');
    if (stored && translations[stored]) return stored;
  } catch { /* ignore */ }
  const nav = navigator.language || 'pt-BR';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('en')) return 'en';
  return 'pt-BR';
}

export default function AccessPortal() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const t = translations[getLanguage()];

  // Capturar returnUrl dos query params
  const urlParams = new URLSearchParams(window.location.search);
  const returnUrl = urlParams.get('returnUrl') || (isNativePlatform() ? '/AdminDashboard' : '/');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleAuthentication = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error(t.errEmailRequired);
      return;
    }
    if (!password.trim()) {
      toast.error(t.errPasswordRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);

      // Garantir token no localStorage
      const token = localStorage.getItem('base44_access_token')
        || localStorage.getItem('token')
        || localStorage.getItem('access_token');
      if (token) {
        localStorage.setItem('base44_access_token', token);
      }

      // Atualizar estado de auth no contexto (sem reload)
      await refreshAuth();

      // Navegar para destino via React Router (instantâneo)
      navigate(returnUrl, { replace: true });
    } catch (error) {
      const status = error?.response?.status || error?.status;
      const message = error?.response?.data?.message || error?.message || '';

      if (status === 401 || message.toLowerCase().includes('invalid')) {
        toast.error(t.errInvalidCredentials);
      } else if (status === 404 || message.toLowerCase().includes('not found')) {
        toast.error(t.errUserNotFound);
      } else if (!navigator.onLine || message.toLowerCase().includes('network')) {
        toast.error(t.errNetwork);
      } else {
        toast.error(t.errGeneric);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error(t.errEmailRequired);
      return;
    }

    setIsSendingReset(true);
    try {
      await base44.auth.resetPasswordRequest(email.trim());
      toast.success(t.forgotSuccess);
      setIsForgotMode(false);
    } catch {
      toast.error(t.errGeneric);
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleGoogleAuth = () => {
    base44.auth.loginWithProvider('google');
  };

  const isNative = isNativePlatform();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="flex flex-col items-center gap-3 pb-2 pt-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
            <img src={LOGO_URL} alt="TransferOnline" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">
              {isForgotMode ? t.forgotTitle : t.title}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isForgotMode ? t.forgotDescription : t.subtitle}
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          {isForgotMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">{t.email}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSendingReset}>
                {isSendingReset && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.forgotSubmit}
              </Button>

              <button
                type="button"
                onClick={() => setIsForgotMode(false)}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                {t.forgotBack}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuthentication} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auth-email">{t.email}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-password">{t.password}</Label>
                <div className="relative">
                  <Input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.submit}
              </Button>

              <button
                type="button"
                onClick={() => setIsForgotMode(true)}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                {t.forgot}
              </button>


            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}