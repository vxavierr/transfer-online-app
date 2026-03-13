import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Navigation, 
  MapPin, 
  Users, 
  CheckCircle,
  AlertCircle,
  PauseCircle,
  Timer
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Função helper para converter timestamp ISO para horário de Brasília
const parseTimestamp = (timestamp) => {
  if (!timestamp) return new Date();
  
  // Se o timestamp já está em formato ISO, parsear diretamente
  // O backend salva em horário de Brasília mas a string é ISO UTC
  // Precisamos forçar a interpretação como horário local de Brasília
  const date = new Date(timestamp);
  
  // Ajustar para horário de Brasília (GMT-3)
  // Como o backend salva em Brasília mas formato UTC, precisamos adicionar 3 horas
  const brasiliaDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
  
  return brasiliaDate;
};

export default function TripTimelineView({ 
  serviceRequest, 
  statusLogs = [], 
  showETA = false,
  compact = false 
}) {
  const getStatusConfig = (status) => {
    const configs = {
      aguardando: { label: 'Aguardando Início', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: Clock, step: 0 },
      a_caminho: { label: 'A Caminho da Origem', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Navigation, step: 1 },
      chegou_origem: { label: 'Chegou na Origem', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: MapPin, step: 2 },
      passageiro_embarcou: { label: 'Passageiro Embarcou', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Users, step: 3 },
      parada_adicional: { label: 'Parada Adicional', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: PauseCircle, step: 3 },
      a_caminho_destino: { label: 'A Caminho do Destino', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: Navigation, step: 3 },
      chegou_destino: { label: 'Chegou no Destino', color: 'bg-green-100 text-green-800 border-green-300', icon: MapPin, step: 4 },
      finalizada: { label: 'Finalizada', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle, step: 5 },
      no_show: { label: 'Não Compareceu', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle, step: 5 },
      cancelada_motorista: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle, step: 5 }
    };
    return configs[status] || configs.aguardando;
  };

  const currentStatus = serviceRequest?.driver_trip_status || 'aguardando';
  const currentConfig = getStatusConfig(currentStatus);
  const CurrentIcon = currentConfig.icon;

  const timelineSteps = [
    { label: 'Aguardando', step: 0, status: 'aguardando' },
    { label: 'A Caminho', step: 1, status: 'a_caminho' },
    { label: 'Na Origem', step: 2, status: 'chegou_origem' },
    { label: 'Em Viagem', step: 3, status: 'passageiro_embarcou' },
    { label: 'No Destino', step: 4, status: 'chegou_destino' },
    { label: 'Finalizada', step: 5, status: 'finalizada' }
  ];

  // Filtrar logs para mostrar apenas mudanças de status (não atualizações de GPS)
  const filteredLogs = statusLogs.filter(log => {
    // Manter apenas logs que têm notes diferentes ou são mudanças reais de status
    return !log.notes || !log.notes.toLowerCase().includes('atualização automática');
  });

  // Remover logs duplicados de mesmo status em sequência
  const uniqueLogs = filteredLogs.filter((log, index, arr) => {
    if (index === 0) return true;
    return log.status !== arr[index - 1].status;
  });

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Status Atual Compacto */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
              <CurrentIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-semibold">STATUS ATUAL</div>
              <Badge className={`${currentConfig.color} border font-semibold`}>
                {currentConfig.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Timeline Horizontal Simplificada */}
        <div className="relative">
          <div className="flex items-center justify-between">
            {timelineSteps.map((step, index) => (
              <div key={index} className="flex flex-col items-center flex-1 relative">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs z-10 ${
                  currentConfig.step >= step.step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {currentConfig.step >= step.step ? '✓' : step.step + 1}
                </div>
                <div className={`text-[9px] mt-1 font-semibold text-center ${
                  currentConfig.step >= step.step ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {step.label}
                </div>
                {index < timelineSteps.length - 1 && (
                  <div 
                    className={`absolute top-3 h-0.5 ${
                      currentConfig.step > step.step ? 'bg-blue-600' : 'bg-gray-200'
                    }`} 
                    style={{ 
                      width: '100%',
                      left: '50%'
                    }} 
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Atual Grande */}
      <Card className="border-4 border-blue-300 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                <CurrentIcon className="w-9 h-9 text-white" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-bold mb-1">STATUS ATUAL DA VIAGEM</div>
                <div className="text-2xl font-bold text-gray-900">{currentConfig.label}</div>
              </div>
            </div>
            <Badge className={`${currentConfig.color} border text-lg px-4 py-2`}>
              Etapa {currentConfig.step + 1}/6
            </Badge>
          </div>

          {serviceRequest?.driver_trip_status_updated_at && (
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Última atualização: {format(parseTimestamp(serviceRequest.driver_trip_status_updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ETA - Tempo Estimado de Chegada */}
      {showETA && serviceRequest?.current_eta_minutes && 
       (serviceRequest?.driver_trip_status === 'passageiro_embarcou' || serviceRequest?.driver_trip_status === 'a_caminho') && (
        <Card className={`border-4 ${
          serviceRequest.driver_trip_status === 'a_caminho' ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-white' : 'border-green-300 bg-gradient-to-br from-green-50 to-white'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                serviceRequest.driver_trip_status === 'a_caminho' ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-green-600 to-green-700'
              }`}>
                <Timer className="w-9 h-9 text-white" />
              </div>
              <div className="flex-1">
                <div className={`text-xs font-bold mb-1 ${
                  serviceRequest.driver_trip_status === 'a_caminho' ? 'text-blue-700' : 'text-green-700'
                }`}>
                  {serviceRequest.driver_trip_status === 'a_caminho' ? '⏱️ MOTORISTA CHEGA EM' : '⏱️ CHEGADA AO DESTINO'}
                </div>
                <div className={`text-4xl font-bold ${
                  serviceRequest.driver_trip_status === 'a_caminho' ? 'text-blue-700' : 'text-green-700'
                }`}>
                  {serviceRequest.current_eta_minutes} min
                </div>
                <div className={`text-sm mt-1 ${
                  serviceRequest.driver_trip_status === 'a_caminho' ? 'text-blue-600' : 'text-green-600'
                }`}>
                  Previsão: {format(new Date(Date.now() + serviceRequest.current_eta_minutes * 60000), "HH:mm", { locale: ptBR })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Vertical Detalhada */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            Timeline da Viagem
          </h3>

          <div className="relative">
            {/* Linha Vertical */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-6">
              {uniqueLogs.length > 0 ? (
                uniqueLogs.map((log, index) => {
                  const config = getStatusConfig(log.status);
                  const LogIcon = config.icon;
                  
                  return (
                    <div key={index} className="relative pl-14">
                      {/* Ícone */}
                      <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        config.color.replace('100', '200')
                      } border-4 border-white shadow-md`}>
                        <LogIcon className="w-5 h-5" />
                      </div>

                      {/* Conteúdo */}
                      <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <Badge className={`${config.color} border`}>
                            {config.label}
                          </Badge>
                          <div className="text-xs text-gray-500 font-semibold">
                            {format(parseTimestamp(log.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                        
                        {log.notes && (
                          <p className="text-sm text-gray-700 mt-2 bg-white p-2 rounded border border-gray-200">
                            {log.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>Aguardando início da viagem...</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paradas Adicionais */}
      {serviceRequest?.additional_stops && serviceRequest.additional_stops.length > 0 && (
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
              <PauseCircle className="w-5 h-5" />
              Paradas Adicionais Registradas ({serviceRequest.additional_stops.length})
            </h3>
            
            <div className="space-y-3">
              {serviceRequest.additional_stops.map((stop, index) => (
                <div key={index} className="bg-white border-2 border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-orange-100 text-orange-800">
                      Parada {index + 1}
                    </Badge>
                    <div className="text-xs text-gray-500 font-semibold">
                      {format(parseTimestamp(stop.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{stop.notes}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}