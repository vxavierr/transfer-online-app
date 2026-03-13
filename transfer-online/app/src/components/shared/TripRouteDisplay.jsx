import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Clock, Plane } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TripRouteDisplay({ 
  origin, 
  destination, 
  date, 
  time, 
  returnDate, 
  returnTime, 
  stops = [],
  flightNumber,
  serviceType,
  distance,
  duration
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    // Simple parsing to avoid timezone issues with YYYY-MM-DD
    const [year, month, day] = dateStr.split('-');
    const d = new Date(year, month - 1, day);
    return format(d, "dd 'de' MMMM, yyyy", { locale: ptBR });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-600" />
          Rota e Horários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ida */}
        <div className="relative pl-4 border-l-2 border-green-200 space-y-4">
          <div className="relative">
            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
            <p className="text-xs text-gray-500 font-medium">Origem</p>
            <p className="text-sm font-semibold">{origin}</p>
            <div className="flex gap-3 mt-1 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {formatDate(date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {time}
              </span>
            </div>
          </div>

          {stops && stops.length > 0 && stops.map((stop, idx) => (
            <div key={idx} className="relative">
              <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-yellow-500 border-2 border-white" />
              <p className="text-xs text-gray-500 font-medium">Parada {idx + 1}</p>
              <p className="text-sm">{stop.address}</p>
            </div>
          ))}

          <div className="relative">
            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
            <p className="text-xs text-gray-500 font-medium">Destino</p>
            <p className="text-sm font-semibold">{destination}</p>
          </div>
        </div>

        {/* Retorno (se houver) */}
        {serviceType === 'round_trip' && returnDate && (
           <div className="pt-4 border-t border-gray-100">
             <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" /> Retorno
             </p>
             <div className="text-xs text-gray-600 flex gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {formatDate(returnDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {returnTime}
                </span>
             </div>
           </div>
        )}

        {/* Informações Adicionais */}
        <div className="flex flex-wrap gap-3 pt-2 text-xs text-gray-500">
          {flightNumber && (
            <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
              <Plane className="w-3 h-3" /> Voo: {flightNumber}
            </span>
          )}
          {distance && (
            <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
              📏 Distância: {distance} km
            </span>
          )}
          {duration && (
            <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
              ⏱️ Duração: {duration} min
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}