import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plane, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from 'date-fns';

export default function FlightStatusChecker({ 
  flightNumber, 
  date, 
  onFlightVerified, 
  className = "",
  expectedOrigin,
  expectedDestination,
  checkType = 'any' // 'arrival', 'departure', or 'any'
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [flightData, setFlightData] = useState(null);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [routeMismatch, setRouteMismatch] = useState(null);

  const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const checkRouteMatch = (flight) => {
    if (!expectedOrigin && !expectedDestination) return null;

    const flightOriginIata = normalizeText(flight.departure?.iata);
    const flightOriginName = normalizeText(flight.departure?.airport);
    const flightDestIata = normalizeText(flight.arrival?.iata);
    const flightDestName = normalizeText(flight.arrival?.airport);

    const expOrigin = normalizeText(expectedOrigin);
    const expDest = normalizeText(expectedDestination);

    // Helper to check if A matches B (A contains B or B contains A)
    // For airports, we usually check if the IATA is in the address string or the city/name is in the address string
    const isMatch = (flightStr, userStr) => {
      if (!flightStr || !userStr) return false;
      // Simple includes check
      return userStr.includes(flightStr) || flightStr.includes(userStr);
    };

    let mismatch = null;

    // Logic:
    // If checkType is 'arrival' (Transfer FROM Airport), we expect the flight to ARRIVE at the Trip Origin.
    // We don't necessarily care where it departs from, unless specified.
    
    // If checkType is 'departure' (Transfer TO Airport), we expect the flight to DEPART from the Trip Destination.

    if (checkType === 'arrival' && expectedOrigin) {
      // Flight Arrival should match Trip Origin
      const matchIata = isMatch(flightDestIata, expOrigin);
      const matchName = isMatch(flightDestName, expOrigin);
      
      // Also check if expectedOrigin contains "aeroporto" or city names that might match
      // This is a fuzzy heuristic.
      // If NO match found
      if (!matchIata && !matchName) {
        mismatch = `O voo chega em ${flight.arrival.iata} (${flight.arrival.airport}), mas sua origem é ${expectedOrigin}.`;
      }
    } else if (checkType === 'departure' && expectedDestination) {
      // Flight Departure should match Trip Destination
      const matchIata = isMatch(flightOriginIata, expDest);
      const matchName = isMatch(flightOriginName, expDest);

      if (!matchIata && !matchName) {
        mismatch = `O voo sai de ${flight.departure.iata} (${flight.departure.airport}), mas seu destino é ${expectedDestination}.`;
      }
    } else {
      // Generic check (e.g. user provided both leg info?)
      // If we just have general expected route (e.g. user said "MIA x GRU")
      // But here we are validating against addresses.
    }

    return mismatch;
  };

  const checkStatus = async () => {
    if (!flightNumber) return;

    setIsLoading(true);
    setError(null);
    setFlightData(null);
    setIsOpen(true);

    try {
      const response = await base44.functions.invoke('checkFlightStatus', {
        flightNumber: flightNumber,
        date: date
      });

      if (response.data && response.data.found) {
        setFlightData(response.data);
        const mismatch = checkRouteMatch(response.data);
        setRouteMismatch(mismatch);
        
        if (onFlightVerified) {
          onFlightVerified(response.data);
        }
      } else {
        setError(response.data?.message || 'Voo não encontrado');
      }
    } catch (err) {
      console.error('Erro ao verificar voo:', err);
      setError('Erro ao conectar com serviço de voos');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return format(new Date(isoString), 'HH:mm');
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'scheduled': return 'text-blue-600 bg-blue-50';
      case 'landed': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      case 'incident':
      case 'diverted': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const translateStatus = (status) => {
    const map = {
      'scheduled': 'Agendado',
      'active': 'Em voo',
      'landed': 'Aterrissou',
      'cancelled': 'Cancelado',
      'incident': 'Incidente',
      'diverted': 'Desviado'
    };
    return map[status?.toLowerCase()] || status;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={checkStatus}
            disabled={!flightNumber || isLoading}
            className="h-8 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plane className="w-3 h-3 mr-1" />}
            Verificar Voo
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 shadow-xl" align="start">
          {isLoading ? (
            <div className="p-6 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-600" />
              <p className="text-sm">Consultando AviationStack...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 text-sm flex items-start gap-2 rounded-md">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Não foi possível verificar</p>
                <p>{error}</p>
              </div>
            </div>
          ) : flightData ? (
            <div className="bg-white rounded-md overflow-hidden">
              {routeMismatch && (
                <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100 text-yellow-800 text-xs">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-yellow-600" />
                    <span className="font-medium">Atenção: Rota divergente</span>
                  </div>
                  <p className="mt-1 ml-6 leading-relaxed">
                    {routeMismatch}
                  </p>
                </div>
              )}
              <div className={`px-4 py-2 border-b flex justify-between items-center ${getStatusColor(flightData.status)}`}>
                <span className="font-bold text-sm flex items-center gap-2">
                  <Plane className="w-4 h-4" />
                  {flightData.airline} {flightData.flight.iata}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/50 uppercase">
                  {translateStatus(flightData.status)}
                </span>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Partida */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mb-1"></div>
                    <div className="w-0.5 flex-1 bg-gray-200"></div>
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Partida</p>
                    <div className="flex justify-between items-baseline">
                      <p className="font-bold text-gray-900">{flightData.departure.iata}</p>
                      <p className="text-sm font-mono">{formatTime(flightData.departure.estimated || flightData.departure.scheduled)}</p>
                    </div>
                    <p className="text-xs text-gray-600 truncate max-w-[200px]" title={flightData.departure.airport}>{flightData.departure.airport}</p>
                    {(flightData.departure.terminal || flightData.departure.gate) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Term: {flightData.departure.terminal || '-'} • Portão: {flightData.departure.gate || '-'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Chegada */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-2 bg-gray-200 mb-1"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Chegada</p>
                    <div className="flex justify-between items-baseline">
                      <p className="font-bold text-gray-900">{flightData.arrival.iata}</p>
                      <p className="text-sm font-mono">{formatTime(flightData.arrival.estimated || flightData.arrival.scheduled)}</p>
                    </div>
                    <p className="text-xs text-gray-600 truncate max-w-[200px]" title={flightData.arrival.airport}>{flightData.arrival.airport}</p>
                    {(flightData.arrival.terminal || flightData.arrival.gate) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Term: {flightData.arrival.terminal || '-'} • Portão: {flightData.arrival.gate || '-'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="px-4 py-2 bg-gray-50 border-t text-[10px] text-gray-400 flex justify-between">
                <span>Data: {flightData.flight_date}</span>
                <span>Fonte: AviationStack</span>
              </div>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}