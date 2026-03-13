import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Estado global compartilhado entre todas as instâncias do hook
let isLoadingScript = false;
let isScriptLoaded = false;
let loadError = null;
const loadCallbacks = [];

// Função para verificar se o Google Maps está realmente disponível
const isGoogleMapsReady = () => {
  return !!(
    window.google &&
    window.google.maps &&
    window.google.maps.places &&
    window.google.maps.places.Autocomplete
  );
};

export function useGoogleMapsScript() {
  const [isLoaded, setIsLoaded] = useState(isScriptLoaded);
  const [error, setError] = useState(loadError);

  useEffect(() => {
    // Se já está carregado e pronto
    if (isScriptLoaded && isGoogleMapsReady()) {
      setIsLoaded(true);
      return;
    }

    // Se já está carregando, adiciona callback
    if (isLoadingScript) {
      const callback = { setIsLoaded, setError };
      loadCallbacks.push(callback);
      
      return () => {
        const index = loadCallbacks.indexOf(callback);
        if (index > -1) {
          loadCallbacks.splice(index, 1);
        }
      };
    }

    // Verificar se já existe no DOM
    if (isGoogleMapsReady()) {
      isScriptLoaded = true;
      setIsLoaded(true);
      return;
    }

    // Verificar se já existe um script sendo carregado
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      isLoadingScript = true;
      
      const checkReady = setInterval(() => {
        if (isGoogleMapsReady()) {
          clearInterval(checkReady);
          isScriptLoaded = true;
          isLoadingScript = false;
          setIsLoaded(true);
          loadCallbacks.forEach(cb => cb.setIsLoaded(true));
          loadCallbacks.length = 0;
        }
      }, 100);

      return () => clearInterval(checkReady);
    }

    // Iniciar carregamento
    const loadScript = async () => {
      try {
        isLoadingScript = true;
        
        // Buscar chave da API
        const response = await base44.functions.invoke('getPublicConfig');
        const apiKey = response?.data?.googleMapsApiKey;

        if (!apiKey) {
          throw new Error('Google Maps API Key não encontrada');
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=pt-BR&loading=async`;
        script.async = true;
        script.defer = true;

        const handleLoad = () => {
          // Aguardar um pouco para garantir que window.google está completamente inicializado
          const checkReady = setInterval(() => {
            if (isGoogleMapsReady()) {
              clearInterval(checkReady);
              isScriptLoaded = true;
              isLoadingScript = false;
              setIsLoaded(true);
              loadCallbacks.forEach(cb => cb.setIsLoaded(true));
              loadCallbacks.length = 0;
            }
          }, 50);

          // Timeout de segurança
          setTimeout(() => {
            clearInterval(checkReady);
            if (!isScriptLoaded) {
              const errorMsg = 'Timeout ao carregar Google Maps API';
              loadError = errorMsg;
              isLoadingScript = false;
              setError(errorMsg);
              loadCallbacks.forEach(cb => cb.setError(errorMsg));
              loadCallbacks.length = 0;
            }
          }, 10000);
        };

        const handleError = () => {
          const errorMsg = 'Erro ao carregar Google Maps API';
          loadError = errorMsg;
          isLoadingScript = false;
          setError(errorMsg);
          loadCallbacks.forEach(cb => cb.setError(errorMsg));
          loadCallbacks.length = 0;
        };

        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);

        document.head.appendChild(script);
      } catch (err) {
        console.error('Erro ao carregar Google Maps:', err);
        const errorMsg = err.message || 'Erro ao inicializar mapa';
        loadError = errorMsg;
        isLoadingScript = false;
        setError(errorMsg);
        loadCallbacks.forEach(cb => cb.setError(errorMsg));
        loadCallbacks.length = 0;
      }
    };

    loadScript();

    return () => {
      // Cleanup se necessário
    };
  }, []);

  return { isLoaded, error };
}

// Hook alternativo para componentes que precisam esperar de forma garantida
export function useGoogleMapsReady() {
  const [isReady, setIsReady] = useState(false);
  const { isLoaded, error } = useGoogleMapsScript();

  useEffect(() => {
    if (error) {
      setIsReady(false);
      return;
    }

    if (isLoaded) {
      // Verificação adicional
      if (isGoogleMapsReady()) {
        setIsReady(true);
      } else {
        // Aguardar até estar realmente pronto
        const checkInterval = setInterval(() => {
          if (isGoogleMapsReady()) {
            clearInterval(checkInterval);
            setIsReady(true);
          }
        }, 100);

        return () => clearInterval(checkInterval);
      }
    }
  }, [isLoaded, error]);

  return { isReady, error };
}