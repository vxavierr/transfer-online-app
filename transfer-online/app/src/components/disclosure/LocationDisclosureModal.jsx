import React from 'react';
import { MapPin, Route, DollarSign, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { StorageService } from '@/native';

const STORAGE_KEY = 'location_disclosure_accepted';

/**
 * Verifica se o disclosure já foi aceito.
 * Async — usa StorageService para compatibilidade nativa (Capacitor Preferences).
 */
export async function hasAcceptedLocationDisclosure() {
  try {
    const value = await StorageService.get(STORAGE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Modal de Prominent Disclosure para coleta de localização em background.
 * Requisito da Google Play para apps que usam ACCESS_BACKGROUND_LOCATION.
 *
 * Não é dismissível por clique fora, ESC, nem botão de fechar.
 * O usuário DEVE clicar em Continuar ou Não permitir.
 */
export default function LocationDisclosureModal({ onAccept }) {
  const handleAccept = async () => {
    try {
      await StorageService.set(STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('Não foi possível persistir aceite do disclosure:', e);
    }
    if (onAccept) onAccept();
  };

  const handleDeny = async () => {
    try {
      await StorageService.remove(STORAGE_KEY);
      await base44.auth.logout();
    } catch (e) {
      console.warn('Erro ao fazer logout:', e);
    } finally {
      try {
        // Tokens do SDK Base44 — exceção documentada (app-params.js)
        localStorage.removeItem('base44_access_token');
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
      } catch { /* ignore */ }
      window.location.href = '/AccessPortal';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-white dark:bg-slate-950 flex flex-col overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-disclosure-title"
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-lg mx-auto w-full">
        {/* Ícone */}
        <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-6">
          <MapPin className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Título */}
        <h1
          id="location-disclosure-title"
          className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4"
        >
          Permissão de localização
        </h1>

        {/* Texto principal */}
        <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300 text-center mb-8">
          O Transfer Online Motorista coleta sua localização durante as viagens, inclusive quando o aplicativo está em segundo plano ou com a tela bloqueada. Isso é necessário para registrar o trajeto, calcular o pagamento corretamente e permitir que a central acompanhe sua posição em tempo real. Sem essa permissão, o aplicativo não funciona.
        </p>

        {/* Lista de usos */}
        <div className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 mb-8 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Route className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-base text-gray-800 dark:text-gray-200 leading-snug pt-1">
              Registro do trajeto da viagem
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-base text-gray-800 dark:text-gray-200 leading-snug pt-1">
              Cálculo correto do pagamento
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-base text-gray-800 dark:text-gray-200 leading-snug pt-1">
              Acompanhamento em tempo real pela central
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="w-full flex flex-col gap-3">
          <Button
            onClick={handleAccept}
            className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          >
            Continuar
          </Button>
          <Button
            onClick={handleDeny}
            variant="ghost"
            className="w-full h-12 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800"
          >
            Não permitir
          </Button>
        </div>
      </div>
    </div>
  );
}