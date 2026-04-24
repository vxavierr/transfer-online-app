import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  TrendingUp,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DriverPayments({ user }) {
  const [driver, setDriver] = useState(null);

  useEffect(() => {
    const fetchDriver = async () => {
      if (user?.driver_id) {
        try {
          const driverData = await base44.entities.Driver.get(user.driver_id);
          setDriver(driverData);
        } catch (err) {
          console.error("Erro ao buscar motorista:", err);
        }
      }
    };
    fetchDriver();
  }, [user]);

  // Busca diretamente por driver_id nas 3 entidades — mesma fonte de verdade do GerenciarPagamentos
  const { data: allTrips = [], isLoading } = useQuery({
    queryKey: ['driverPaymentTrips', driver?.id],
    queryFn: async () => {
      const driverId = driver.id;

      const [requests, ownBookings, eventTrips] = await Promise.all([
        base44.entities.ServiceRequest.filter({ driver_id: driverId }),
        base44.entities.SupplierOwnBooking.filter({ driver_id: driverId }),
        base44.entities.EventTrip.filter({ driver_id: driverId })
      ]);

      // Normalizar todos para formato uniforme com os campos de pagamento
      const normalizedRequests = requests
        .filter(r => r.driver_payout_amount > 0)
        .map(r => ({
          id: r.id,
          type: 'service_request',
          date: r.date,
          request_number: r.request_number,
          origin: r.origin,
          destination: r.destination,
          driver_payout_amount: r.driver_payout_amount || 0,
          driver_payout_status: r.driver_payout_status || 'pendente',
          driver_payout_date: r.driver_payout_date,
        }));

      const normalizedOwnBookings = ownBookings
        .filter(b => (b.driver_payout_amount || 0) > 0)
        .map(b => ({
          id: b.id,
          type: 'supplier_own_booking',
          date: b.date,
          request_number: b.booking_number,
          origin: b.origin,
          destination: b.destination,
          driver_payout_amount: b.driver_payout_amount || 0,
          driver_payout_status: b.driver_payout_status || 'pendente',
          driver_payout_date: b.driver_payout_date,
        }));

      const normalizedEventTrips = eventTrips
        .filter(e => (e.driver_payout_amount || 0) > 0)
        .map(e => ({
          id: e.id,
          type: 'event_trip',
          date: e.date,
          request_number: e.trip_code || e.name || 'EVT-' + e.id.substr(0, 8),
          origin: e.origin,
          destination: e.destination,
          driver_payout_amount: e.driver_payout_amount || 0,
          driver_payout_status: e.driver_payout_status || 'pendente',
          driver_payout_date: e.driver_payout_date,
        }));

      const all = [...normalizedRequests, ...normalizedOwnBookings, ...normalizedEventTrips];

      // Ordenar por data (mais recente primeiro)
      all.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      });

      return all;
    },
    enabled: !!driver?.id,
    refetchInterval: 30000,
    initialData: []
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  const parseLocalDate = (dateString) => {
    if (!dateString) return null;
    if (dateString.includes('T')) return new Date(dateString);
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const totalPending = allTrips
    .filter(t => t.driver_payout_status === 'pendente')
    .reduce((sum, t) => sum + (t.driver_payout_amount || 0), 0);

  const totalPaid = allTrips
    .filter(t => t.driver_payout_status === 'pago')
    .reduce((sum, t) => sum + (t.driver_payout_amount || 0), 0);

  const pendingPayments = allTrips.filter(t => t.driver_payout_status === 'pendente');
  const paidPayments = allTrips.filter(t => t.driver_payout_status === 'pago');

  if (!driver) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card de Resumo Financeiro */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">💰 Valores a Receber</p>
                <p className="text-4xl font-bold">{formatPrice(totalPending)}</p>
                <p className="text-orange-100 text-xs mt-2">
                  {pendingPayments.length} {pendingPayments.length === 1 ? 'viagem pendente' : 'viagens pendentes'}
                </p>
              </div>
              <Clock className="w-16 h-16 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pagamentos Pendentes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <Clock className="w-6 h-6" />
            Pagamentos Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Carregando pagamentos...</p>
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhum pagamento pendente</p>
            </div>
          ) : (
            <PaymentTable payments={pendingPayments} formatPrice={formatPrice} parseLocalDate={parseLocalDate} variant="pending" />
          )}
        </CardContent>
      </Card>

    </div>
  );
}

function PaymentTable({ payments, formatPrice, parseLocalDate, variant }) {
  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>Data da Viagem</TableHead>
            <TableHead>Solicitação</TableHead>
            <TableHead>Rota</TableHead>
            {variant === 'paid' && <TableHead>Data do Pagamento</TableHead>}
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((trip) => {
            const tripDate = trip.date ? parseLocalDate(trip.date) : null;
            return (
              <TableRow key={trip.id} className={variant === 'paid' ? 'hover:bg-green-50' : 'hover:bg-orange-50'}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">
                      {tripDate ? format(tripDate, "dd/MM/yyyy", { locale: ptBR }) : '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono font-semibold text-blue-600">
                    {trip.request_number}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="font-medium truncate max-w-[150px]">{trip.origin}</span>
                    </div>
                    <div className="text-gray-500 ml-4 truncate max-w-[150px]">→ {trip.destination}</div>
                  </div>
                </TableCell>
                {variant === 'paid' && (
                  <TableCell>
                    {trip.driver_payout_date && (
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        {format(new Date(trip.driver_payout_date), "dd/MM/yyyy", { locale: ptBR })}
                      </Badge>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <span className={`font-bold text-lg ${variant === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                    {formatPrice(trip.driver_payout_amount)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}