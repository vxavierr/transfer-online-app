import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BookingSummary({ 
  tripDetails, 
  selectedVehicle, 
  onContinue,
  serviceType 
}) {
  const formatPrice = (price) => {
    if (!price || price === 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      return dateString;
    }
  };

  const totalPrice = selectedVehicle?.calculated_price || 0;

  return (
    <Card className="mt-8 shadow-xl border-2 border-blue-200">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl md:text-2xl">Cotação</CardTitle>
          {serviceType === 'round_trip' && (
            <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full">
              Ida e Volta
            </span>
          )}
          {serviceType === 'hourly' && (
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
              Por Hora
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Detalhes da viagem */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 mb-3">Detalhes da Viagem</h4>
            
            {/* Origem */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Origem</div>
                <div className="text-sm font-medium text-gray-900">{tripDetails.origin}</div>
              </div>
            </div>

            {/* Destino */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">Destino</div>
                <div className="text-sm font-medium text-gray-900">
                  {tripDetails.destination || tripDetails.origin}
                </div>
              </div>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-500">Data</div>
                  <div className="text-sm font-medium text-gray-900">{formatDate(tripDetails.date)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-500">Horário</div>
                  <div className="text-sm font-medium text-gray-900">{tripDetails.time || '-'}</div>
                </div>
              </div>
            </div>

            {/* Horas (para serviço por hora) */}
            {serviceType === 'hourly' && tripDetails.hours && (
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-xs text-gray-500">Duração</div>
                  <div className="text-sm font-medium text-gray-900">{tripDetails.hours} hora(s)</div>
                </div>
              </div>
            )}
          </div>

          {/* Veículo Selecionado */}
          {selectedVehicle && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-2">Veículo Selecionado</h4>
              <div className="text-sm text-gray-700">{selectedVehicle.name}</div>
            </div>
          )}

          {/* Preços */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-base text-gray-600">Preço:</span>
              <span className="text-xl font-semibold text-yellow-500">
                {formatPrice(totalPrice)}
              </span>
            </div>
            
            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-lg font-semibold text-gray-900">Total:</span>
              <span className="text-3xl font-bold text-yellow-500">
                {formatPrice(totalPrice)}
              </span>
            </div>
          </div>

          {/* Botão de Continuar */}
          <Button
            onClick={onContinue}
            disabled={!selectedVehicle}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedVehicle ? (
              <>
                Continuar para Pagamento
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            ) : (
              'Selecione um veículo para continuar'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}