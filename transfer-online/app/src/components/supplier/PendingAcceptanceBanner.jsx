import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, MapPin, Users, ChevronDown, ChevronUp, CheckCircle, XCircle, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInMinutes, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function TimeCountdown({ sentAt, deadlineAt }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calc = () => {
      if (!deadlineAt) { setTimeLeft(''); return; }
      const now = new Date();
      const deadline = new Date(deadlineAt);
      const diffMs = deadline - now;

      if (diffMs <= 0) {
        setTimeLeft('Expirado');
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m restantes`);
      } else {
        setTimeLeft(`${mins}m restantes`);
      }
      setIsUrgent(diffMs < 30 * 60 * 1000); // menos de 30min
    };

    calc();
    const interval = setInterval(calc, 30000); // atualiza a cada 30s
    return () => clearInterval(interval);
  }, [deadlineAt]);

  if (!timeLeft) return null;

  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUrgent ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-amber-100 text-amber-700'}`}>
      <Clock className="w-3 h-3 inline mr-1" />
      {timeLeft}
    </span>
  );
}

function PendingTripCard({ trip, onAccept, onReject, onViewDetails, formatPrice }) {
  const sentAt = trip.supplier_request_sent_at;
  const deadlineAt = trip.supplier_response_deadline;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white border-2 border-amber-300 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        {/* Info Principal */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-blue-700 text-sm">{trip.request_number || trip.display_id}</span>
            <TimeCountdown sentAt={sentAt} deadlineAt={deadlineAt} />
            {trip.chosen_vehicle_type_name && (
              <Badge variant="outline" className="text-xs gap-1">
                <Car className="w-3 h-3" />
                {trip.chosen_vehicle_type_name}
              </Badge>
            )}
          </div>

          <div className="flex items-start gap-1.5 text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="truncate">{trip.origin}</span>
          </div>
          <div className="flex items-start gap-1.5 text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="truncate">{trip.destination}</span>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {trip.date ? format(parseISO(trip.date), 'dd/MM/yyyy', { locale: ptBR }) : '-'} às {trip.time || '-'}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {trip.passengers || 1} pax
            </span>
            {trip.passenger_name && (
              <span className="font-medium text-gray-600">
                {trip.passenger_name}
              </span>
            )}
          </div>

          {trip.chosen_supplier_cost > 0 && (
            <div className="text-sm font-bold text-green-700 mt-1">
              Valor: {formatPrice(trip.chosen_supplier_cost)}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex sm:flex-col gap-2 flex-shrink-0">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white gap-1 flex-1 sm:flex-none"
            onClick={() => onAccept(trip)}
          >
            <CheckCircle className="w-4 h-4" />
            Aceitar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50 gap-1 flex-1 sm:flex-none"
            onClick={() => onReject(trip)}
          >
            <XCircle className="w-4 h-4" />
            Recusar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-500 gap-1 flex-1 sm:flex-none"
            onClick={() => onViewDetails(trip)}
          >
            Detalhes
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function PendingAcceptanceBanner({ trips, onAccept, onReject, onViewDetails, formatPrice }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!trips || trips.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Header do Banner */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-xl px-4 py-3 hover:from-amber-600 hover:to-orange-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <AlertTriangle className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {trips.length}
            </span>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-base sm:text-lg">
              {trips.length === 1 ? '1 Viagem Aguardando Aceite' : `${trips.length} Viagens Aguardando Aceite`}
            </h3>
            <p className="text-amber-100 text-xs sm:text-sm">Responda o mais rápido possível para garantir a viagem</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {/* Lista de Viagens Pendentes */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-amber-50 border-2 border-t-0 border-amber-300 rounded-b-xl"
          >
            <div className="p-3 sm:p-4 space-y-3">
              {trips.map(trip => (
                <PendingTripCard
                  key={trip.id}
                  trip={trip}
                  onAccept={onAccept}
                  onReject={onReject}
                  onViewDetails={onViewDetails}
                  formatPrice={formatPrice}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}