import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Função para converter para horário de Brasília
const toBrasiliaTime = (dateString) => {
  const date = new Date(dateString);
  const brasiliaString = date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  return new Date(brasiliaString);
};

// Função para obter "agora" em Brasília
const getBrasiliaTime = () => {
  const now = new Date();
  const brasiliaString = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  return new Date(brasiliaString);
};

export default function ResponseTimer({ 
  requestSentAt, 
  responseDeadline, 
  responseStatus,
  compact = false 
}) {
  const [timeInfo, setTimeInfo] = useState(null);

  useEffect(() => {
    const calculateTime = () => {
      // USAR HORÁRIO DE BRASÍLIA (GMT-3)
      const now = getBrasiliaTime();
      const sentAt = toBrasiliaTime(requestSentAt);
      const deadline = responseDeadline ? toBrasiliaTime(responseDeadline) : null;

      // Calcular tempo decorrido
      const elapsedMs = now - sentAt;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const elapsedHours = Math.floor(elapsedMinutes / 60);
      const elapsedMins = elapsedMinutes % 60;

      let elapsedText = '';
      if (elapsedHours > 0) {
        elapsedText = `${elapsedHours}h ${elapsedMins}min`;
      } else {
        elapsedText = `${elapsedMins}min`;
      }

      // Calcular tempo restante até o deadline
      let remainingText = '';
      let status = 'ok'; // ok, warning, danger, expired
      
      if (deadline) {
        const remainingMs = deadline - now;
        const remainingMinutes = Math.floor(remainingMs / 60000);
        
        if (remainingMinutes <= 0) {
          remainingText = 'Prazo expirado';
          status = 'expired';
        } else {
          const remainingHours = Math.floor(remainingMinutes / 60);
          const remainingMins = remainingMinutes % 60;
          
          if (remainingHours > 0) {
            remainingText = `${remainingHours}h ${remainingMins}min restantes`;
          } else {
            remainingText = `${remainingMins}min restantes`;
          }

          // Definir status baseado no tempo restante
          if (remainingMinutes <= 15) {
            status = 'danger';
          } else if (remainingMinutes <= 30) {
            status = 'warning';
          } else {
            status = 'ok';
          }
        }
      }

      setTimeInfo({
        elapsedText,
        remainingText,
        status,
        elapsedMinutes
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000); // Atualizar a cada 1 minuto

    return () => clearInterval(interval);
  }, [requestSentAt, responseDeadline]);

  if (!timeInfo) return null;

  // Se já foi respondido, não mostrar timer
  if (responseStatus && !['aguardando_resposta', 'aguardando_escolha'].includes(responseStatus)) {
    return null;
  }

  const getStatusColor = () => {
    switch (timeInfo.status) {
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'danger':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getIcon = () => {
    switch (timeInfo.status) {
      case 'expired':
        return <AlertTriangle className="w-3 h-3" />;
      case 'danger':
        return <AlertTriangle className="w-3 h-3" />;
      case 'warning':
        return <Clock className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  if (compact) {
    return (
      <Badge className={`${getStatusColor()} border text-xs flex items-center gap-1`}>
        {getIcon()}
        {timeInfo.elapsedText}
      </Badge>
    );
  }

  return (
    <div className={`${getStatusColor()} border rounded-lg p-3`}>
      <div className="flex items-center gap-2 mb-1">
        {getIcon()}
        <span className="text-xs font-semibold">
          {timeInfo.status === 'expired' ? '⏰ Prazo Expirado' : '⏱️ Aguardando Resposta'}
        </span>
      </div>
      <div className="text-sm font-bold">{timeInfo.elapsedText} aguardando</div>
      {timeInfo.remainingText && (
        <div className="text-xs mt-1 opacity-90">{timeInfo.remainingText}</div>
      )}
    </div>
  );
}

// Componente para exibir apenas o tempo decorrido (para histórico)
export function ElapsedTimeDisplay({ requestSentAt, responseAt }) {
  if (!requestSentAt || !responseAt) return null;

  // USAR HORÁRIO DE BRASÍLIA (GMT-3) PARA CÁLCULO CORRETO
  const sentAt = toBrasiliaTime(requestSentAt);
  const responded = toBrasiliaTime(responseAt);
  
  const elapsedMs = responded - sentAt;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const elapsedMins = elapsedMinutes % 60;

  let elapsedText = '';
  if (elapsedHours > 0) {
    elapsedText = `${elapsedHours}h ${elapsedMins}min`;
  } else {
    elapsedText = `${elapsedMins}min`;
  }

  return (
    <Badge className="bg-gray-100 text-gray-800 border-gray-300 border text-xs flex items-center gap-1">
      <CheckCircle className="w-3 h-3" />
      Respondido em {elapsedText}
    </Badge>
  );
}