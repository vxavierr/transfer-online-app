import React from 'react';
import { Button } from '@/components/ui/button';
import { Car, AlertCircle, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function DriverDataSection({ 
  serviceRequest, 
  formData, 
  passengersDetails, 
  onManageDriver 
}) {
  // Use formData if available (edit mode), otherwise fallback to serviceRequest (view mode)
  const data = formData || serviceRequest || {};
  const trip = serviceRequest || {};

  const handleCopyTripSummary = () => {
    try {
      // Robust Date Formatting
      let dataFormatada = data.date || 'Data a definir';
      try {
        if (data.date) {
           if (data.date.includes('T')) {
             dataFormatada = format(new Date(data.date), 'dd/MM/yyyy');
           } else if (data.date.includes('-')) {
             const [y, m, d] = data.date.split('-');
             dataFormatada = `${d}/${m}/${y}`;
           }
        }
      } catch (e) {
        console.warn('Erro ao formatar data para copia:', e);
      }

      let summary = `📋 *Resumo da Viagem - ${trip.request_number || trip.booking_number || trip.display_id || ''}*\n\n`;
      summary += `📅 Data: ${dataFormatada} às ${data.time || 'Horário a definir'}\n`;
      summary += `📍 Origem: ${data.origin || 'A definir'}\n`;
      
      // Flight info (if available)
      if (data.origin_flight_number) summary += `✈️ Voo Origem: ${data.origin_flight_number}\n`;
      
      if (data.planned_stops && Array.isArray(data.planned_stops) && data.planned_stops.length > 0) {
        data.planned_stops.forEach((stop, index) => {
          if (!stop.address) return;
          let stopInfo = `➡️ Parada ${index + 1}: ${stop.address}`;
          if (stop.notes) stopInfo += ` (${stop.notes})`;
          summary += `${stopInfo}\n`;
        });
      }
      
      summary += `🏁 Destino: ${data.destination || 'A definir'}\n`;
      if (data.destination_flight_number) summary += `✈️ Voo Destino: ${data.destination_flight_number}\n`;
      
      // Passageiros
      // Handle difference between passenger_name (ServiceRequest) and customer_name (Booking)
      let mainPassenger = data.passenger_name || data.customer_name || 'Passageiro';
      
      let passengersText = mainPassenger;
      if (passengersDetails && Array.isArray(passengersDetails) && passengersDetails.length > 0) {
         const extraNames = passengersDetails
            .filter(p => p && p.name && p.name !== mainPassenger) // Avoid duplicate if main passenger is in list
            .map(p => p.name)
            .join(', ');
         
         if (extraNames) passengersText += `, ${extraNames}`;
      }
      
      summary += `👥 Passageiro(s): ${passengersText} (${data.passengers || 1} pax)\n`;
      if (data.passenger_phone || data.customer_phone) {
        summary += `📱 Contato: ${data.passenger_phone || data.customer_phone}\n`;
      }
      
      summary += `\n🚘 *Motorista e Veículo*\n`;
      summary += `👤 Motorista: ${trip.driver_name || 'A definir'} ${trip.driver_phone || ''}\n`;
      summary += `🚙 Veículo: ${trip.vehicle_model || 'A definir'} - ${trip.vehicle_plate || ''}`;

      // Detalhes adicionais se disponíveis
      if (data.notes) {
        summary += `\n\n📝 Obs: ${data.notes}`;
      }
      
      // Receptive info if needed
      if (data.is_receptive_needed) {
         summary += `\n\n🛂 Receptivo: ${data.receptive_performed_by === 'driver' ? 'Motorista (Placa)' : data.receptive_performed_by === 'contracted_company' ? 'Empresa Contratada' : 'Outros Meios'}`;
         if (data.receptive_notes) summary += ` - ${data.receptive_notes}`;
      }

      navigator.clipboard.writeText(summary);
      toast.success('Resumo da viagem copiado para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar resumo:', err);
      toast.error('Erro ao copiar resumo da viagem.');
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-blue-900 flex items-center gap-2">
            <Car className="w-5 h-5" />
            Motorista e Veículo
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyTripSummary}
            className="h-7 px-2 text-blue-700 hover:bg-blue-100 hover:text-blue-900 ml-2"
            title="Copiar Resumo da Viagem"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            <span className="text-xs">Copiar Resumo</span>
          </Button>
        </div>
        {serviceRequest.chosen_supplier_id && ['confirmada', 'em_andamento', 'concluida'].includes(serviceRequest.status) ? (
          <Button 
            type="button"
            size="sm" 
            variant="outline" 
            onClick={onManageDriver}
            className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Car className="w-4 h-4 mr-2" />
            Gerenciar
          </Button>
        ) : serviceRequest.chosen_supplier_id ? (
          <span className="text-xs font-medium text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3" />
            Aceite a viagem p/ designar motorista
          </span>
        ) : null}
      </div>
      {serviceRequest.driver_name ? (
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700 block text-xs">Motorista:</span>
            <span className="font-medium text-gray-900">{serviceRequest.driver_name}</span>
            <div className="text-gray-500 text-xs">{serviceRequest.driver_phone}</div>
          </div>
          <div>
            <span className="text-blue-700 block text-xs">Veículo:</span>
            <span className="font-medium text-gray-900">{serviceRequest.vehicle_model}</span>
            <div className="text-gray-500 text-xs">{serviceRequest.vehicle_plate}</div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-blue-800 italic flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Nenhum motorista atribuído.
        </div>
      )}
    </div>
  );
}