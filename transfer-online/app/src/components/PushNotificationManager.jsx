import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PushNotificationManager() {
  const [permission, setPermission] = useState(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Diagnóstico inicial para iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
      
      if (isIOS && isStandalone) {
         // Tentar registrar SW proativamente no iOS Standalone para garantir que PushManager fique disponível
         if ('serviceWorker' in navigator) {
            try {
               // Unregister any old SW
               const registrations = await navigator.serviceWorker.getRegistrations();
               for(let registration of registrations) {
                 await registration.unregister();
               }
               await navigator.serviceWorker.register('/functions/push-sw', { scope: '/' });
            } catch (e) {
               console.error('Erro ao registrar SW no init:', e);
            }
         }
      }

      await checkSubscription();

      // Tentar atualizar o Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
            console.log('Service Worker updated');
          }
        } catch (e) {
          console.warn('Failed to update SW:', e);
        }
      }
    };
    init();
  }, []);

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push messaging is not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      if (typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const subscribeUser = async () => {
    setIsLoading(true);
    try {
      // 1. Get Public Key
      const response = await base44.functions.invoke('getVapidPublicKey');
      const publicKey = response.data?.publicKey;

      if (!publicKey) {
        throw new Error('Chave pública VAPID não encontrada.');
      }

      // 2. Register Service Worker (With Diagnostics)
      // Usando endpoint sw-v8.js (tentativa v8 - binary response)
      const swUrl = `/functions/sw-v8?v=8&t=${Date.now()}`; 
      
      console.log('[Push] Iniciando registro do SW (v8):', swUrl);

      // Diagnóstico prévio: Tentar baixar o script manualmente para ver se está acessível
      try {
        const checkResponse = await fetch(swUrl);
        console.log('[Push] Status do script SW:', checkResponse.status, checkResponse.statusText);
        console.log('[Push] Tipo de conteúdo:', checkResponse.headers.get('content-type'));
        
        if (!checkResponse.ok) {
           throw new Error(`O script do Service Worker retornou erro ${checkResponse.status}`);
        }
        
        const contentType = checkResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('javascript')) {
           console.warn('[Push] ALERTA: Content-Type incorreto:', contentType);
        }
      } catch (fetchErr) {
        console.error('[Push] Falha ao baixar script SW:', fetchErr);
        // Não paramos aqui, deixamos o navegador tentar registrar, mas logamos o erro
      }

      try {
        // Unregister existing SWs
        const existingRegistrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of existingRegistrations) {
          console.log('[Push] Removendo SW antigo:', registration.scope);
          await registration.unregister();
        }
        
        const registration = await navigator.serviceWorker.register(swUrl, { 
           scope: '/'
        });
        
        if (registration.installing) {
            console.log('[Push] SW Instalando...');
        } else if (registration.waiting) {
            console.log('[Push] SW Aguardando...');
        } else if (registration.active) {
            console.log('[Push] SW Ativo!');
        }

        await navigator.serviceWorker.ready;
        console.log('SW Registered successfully:', registration);
      } catch (e) {
        console.error('SW Registration Failed:', e);
        // Tentar capturar mensagem detalhada
        throw new Error(`Falha no registro do SW: ${e.message || e.name}. Verifique o console.`);
      }

      // 3. Subscribe
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
         throw new Error('Service Worker not registered');
      }

      if (!registration.pushManager) {
         throw new Error('PushManager não disponível neste navegador/modo. No iOS, certifique-se de usar o App instalado na Tela de Início (PWA).');
      }

      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // 4. Save subscription to backend
      await base44.functions.invoke('savePushSubscription', {
        subscription: subscription,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        }
      });

      setIsSubscribed(true);
      if (typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
      toast.success('Notificações ativadas com sucesso!');

    } catch (error) {
      console.error('Failed to subscribe:', error);
      toast.error('Erro ao ativar notificações: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeUser = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      if (typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
      toast.success('Notificações desativadas.');
    } catch (error) {
      console.error('Error unsubscribing', error);
      toast.error('Erro ao desativar notificações.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificação aprimorada de suporte
  const hasSW = 'serviceWorker' in navigator;
  
  // NOTE: Relaxing the check for PushManager to allow button to appear 
  // even if detection is flaky or browser requires interaction first.
  // const hasPush = 'PushManager' in window; 

  if (!hasSW) {
    return null;
  }

  // Check for iOS to show specific "Add to Home Screen" hint if needed, 
  // BUT still render the button so user can try (or if they are already in PWA but detection failed).
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

  if (isIOS && !isStandalone) {
     // Show banner but allow button below (or return button with banner)
     // Actually, if on iOS and NOT standalone, Push is usually impossible.
     // But user claimed they saw the button before. 
     // We will show the "Add to Home Screen" message, but ALSO the button (disabled or enabled).
     // Let's return the standard view but with a warning banner on top if needed.
     // For now, to revert to previous behavior where they saw the button, we'll just render the button.
     // We can add a small warning text near the button.
  }

  if (permission === 'denied') {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <BellOff className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-red-900">Notificações Bloqueadas</p>
            <p className="text-xs text-red-700">Ative nas configurações do navegador.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isSubscribed) {
    return (
      <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-green-900">Notificações Ativas</p>
            <p className="text-xs text-green-700">Você receberá alertas de novas viagens.</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-green-700 hover:text-green-800 hover:bg-green-100"
          onClick={unsubscribeUser}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Desativar"}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 animate-pulse">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-blue-900">Ativar Notificações</p>
          <p className="text-xs text-blue-700">Receba alertas instantâneos de viagens.</p>
        </div>
      </div>
      <Button 
        size="sm" 
        onClick={subscribeUser}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
      >
        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Ativar"}
      </Button>
    </div>
  );
}