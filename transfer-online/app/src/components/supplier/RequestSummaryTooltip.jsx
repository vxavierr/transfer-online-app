import React from 'react';
import { ArrowDown, Car, Phone, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/ui/StatusBadge';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(value || 0);

const getTripTypeLabel = (request) => {
  if (request.type === 'platform') return 'Corporativa';
  if (request.type === 'own') return 'Própria';
  if (request.type === 'direct_booking') return 'Particular';
  if (request.type === 'event_trip') return 'Evento';
  return '-';
};

export default function RequestSummaryTooltip({ request }) {
  const amount = request.value_display ?? request.chosen_supplier_cost ?? request.price ?? 0;

  return (
    <div className="flex flex-col gap-2 text-sm text-gray-700 max-w-sm">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2 gap-3">
        <span className="font-bold text-base text-gray-900">{request.request_number}</span>
        {request.driver_name ? (
          <StatusBadge status={request.driver_trip_status || request.driver_current_status || 'aguardando'} type="trip" className="text-[10px]" />
        ) : request.type === 'direct_booking' ? (
          <StatusBadge status={request.unified_status} type="booking" className="text-[10px]" />
        ) : (
          <StatusBadge status={request.unified_status || request.supplier_response_status} type="request" className="text-[10px]" />
        )}
      </div>

      <div className="grid grid-cols-[76px_1fr] gap-1">
        <span className="font-semibold text-gray-500">Passageiro:</span>
        <span className="font-medium text-gray-900 truncate">{request.passenger_name || '-'}</span>

        <span className="font-semibold text-gray-500">Cliente:</span>
        <span className="truncate">{request.client_name_display || '-'}</span>

        <span className="font-semibold text-gray-500">Data:</span>
        <span>{request.date ? request.date.split('-').reverse().join('/') : '-'} às {request.time || '-'}</span>

        <span className="font-semibold text-gray-500">Tipo:</span>
        <span>{getTripTypeLabel(request)}</span>

        <span className="font-semibold text-gray-500">Valor:</span>
        <span className="font-semibold text-green-600">{formatCurrency(amount)}</span>

        <span className="font-semibold text-gray-500">Rota:</span>
        <div className="flex flex-col">
          <span className="truncate text-xs text-gray-600">{request.origin || '-'}</span>
          <ArrowDown className="w-3 h-3 my-0.5 text-gray-300" />
          <span className="truncate text-xs text-gray-600">{request.destination || '-'}</span>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100 bg-gray-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="font-semibold text-xs text-gray-500 flex items-center gap-1">
            <User className="w-3 h-3" /> MOTORISTA
          </div>
          <Badge variant="outline" className="text-[10px] h-5">{request.passengers || 0} pax</Badge>
        </div>

        {request.driver_name ? (
          <>
            <div className="font-medium text-gray-900">{request.driver_name}</div>
            {(request.vehicle_model || request.vehicle_plate) && (
              <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                <Car className="w-3 h-3" />
                <span>{request.vehicle_model || 'Veículo'}</span>
                {request.vehicle_plate && <span className="bg-gray-200 px-1 rounded">{request.vehicle_plate}</span>}
              </div>
            )}
            {request.driver_phone && (
              <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> {request.driver_phone}
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-gray-500">Motorista ainda não atribuído.</div>
        )}
      </div>
    </div>
  );
}