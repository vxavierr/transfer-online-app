import React from 'react';
import { ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TripTimeline({ 
  origin, 
  destination, 
  stops = [], 
  passengers = [],
  time 
}) {
  // Construir a timeline completa
  const timelinePoints = [
    {
      type: 'origin',
      label: 'Origem',
      address: origin,
      time: time,
      passengers: passengers.filter(p => !p.boarding_point || p.boarding_point === 'origin' || p.boarding_point === origin)
    },
    ...stops.sort((a, b) => (a.order || 0) - (b.order || 0)).map((stop, idx) => ({
      type: 'stop',
      label: `Parada ${idx + 1}`,
      address: stop.address,
      passengersBoarding: passengers.filter(p => p.boarding_point === stop.address || p.boarding_point === `stop_${idx}`),
      passengersDisembarking: passengers.filter(p => p.disembarking_point === stop.address || p.disembarking_point === `stop_${idx}`)
    })),
    {
      type: 'destination',
      label: 'Destino',
      address: destination,
      passengers: passengers.filter(p => !p.disembarking_point || p.disembarking_point === 'destination' || p.disembarking_point === destination)
    }
  ];

  return (
    <div className="relative pl-4 border-l-2 border-gray-200 space-y-6 my-4">
      {timelinePoints.map((point, idx) => (
        <div key={idx} className="relative">
          {/* Dot no timeline */}
          <div className={`absolute -left-[21px] top-1 w-4 h-4 rounded-full border-2 ${
            point.type === 'origin' ? 'bg-blue-100 border-blue-500' :
            point.type === 'destination' ? 'bg-green-100 border-green-500' :
            'bg-gray-100 border-gray-400'
          }`}></div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase ${
                point.type === 'origin' ? 'text-blue-600' :
                point.type === 'destination' ? 'text-green-600' :
                'text-gray-500'
              }`}>
                {point.label}
              </span>
              {point.time && (
                <Badge variant="outline" className="text-[10px] h-5">
                  {point.time}
                </Badge>
              )}
            </div>
            
            <div className="font-medium text-sm text-gray-800">{point.address}</div>

            {/* Passageiros neste ponto */}
            <div className="mt-2 space-y-2">
              {/* Resumo de Embarques/Desembarques (Apenas contagem) */}
              {(point.passengers || point.passengersBoarding)?.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-blue-700 font-medium">
                    <ArrowDown className="w-3 h-3 rotate-180" /> Embarque: { (point.passengers || point.passengersBoarding).length } pax
                </div>
              )}

              {(point.type !== 'origin') && (point.passengers || point.passengersDisembarking)?.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-green-700 font-medium">
                    <ArrowDown className="w-3 h-3" /> Desembarque: { (point.passengers || point.passengersDisembarking).length } pax
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}