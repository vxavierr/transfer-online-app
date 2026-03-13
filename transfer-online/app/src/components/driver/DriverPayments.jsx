import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  DollarSign,
  AlertCircle,
  CheckCircle,
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

  const { data: allTrips = [], isLoading } = useQuery({
    queryKey: ['driverTrips', driver?.id],
    queryFn: async () => {
      const [requests, ownBookings] = await Promise.all([
        base44.entities.ServiceRequest.filter({
          driver_access_token: { $ne: null }
        }),
        base44.entities.SupplierOwnBooking.filter({
          driver_access_token: { $ne: null }
        })
      ]);
      
      const filteredRequests = requests.filter(r => 
        r.driver_phone === driver.phone_number || 
        r.driver_name === driver.name
      );

      const filteredOwnBookings = ownBookings.filter(r => 
        r.driver_phone === driver.phone_number || 
        r.driver_name === driver.name
      );

      return [...filteredRequests, ...filteredOwnBookings];
    },
    enabled: !!driver,
    initialData: []
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  const totalPending = allTrips
    .filter(t => t.driver_payout_status === 'pendente' && t.driver_payout_amount)
    .reduce((sum, t) => sum + (t.driver_payout_amount || 0), 0);

  const totalPaid = allTrips
    .filter(t => t.driver_payout_status === 'pago' && t.driver_payout_amount)
    .reduce((sum, t) => sum + (t.driver_payout_amount || 0), 0);

  const pendingPayments = allTrips.filter(t => 
    t.driver_payout_status === 'pendente' && t.driver_payout_amount > 0
  );

  const paidPayments = allTrips.filter(t => 
    t.driver_payout_status === 'pago' && t.driver_payout_amount > 0
  );

  if (!driver) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">✅ Valores Recebidos</p>
                <p className="text-4xl font-bold">{formatPrice(totalPaid)}</p>
                <p className="text-green-100 text-xs mt-2">
                  {paidPayments.length} {paidPayments.length === 1 ? 'pagamento recebido' : 'pagamentos recebidos'}
                </p>
              </div>
              <TrendingUp className="w-16 h-16 text-green-200" />
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
            <div className="rounded-lg border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Data da Viagem</TableHead>
                    <TableHead>Solicitação</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map((trip) => (
                    <TableRow key={trip.id} className="hover:bg-orange-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {trip.date ? format(new Date(trip.date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
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
                            <span className="font-medium">{trip.origin}</span>
                          </div>
                          <div className="text-gray-500 ml-4">→ {trip.destination}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-orange-600 text-lg">
                          {formatPrice(trip.driver_payout_amount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagamentos Recebidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-6 h-6" />
            Pagamentos Recebidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Carregando...</p>
            </div>
          ) : paidPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhum pagamento recebido ainda</p>
            </div>
          ) : (
            <div className="rounded-lg border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Data da Viagem</TableHead>
                    <TableHead>Solicitação</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead>Data do Pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidPayments.map((trip) => (
                    <TableRow key={trip.id} className="hover:bg-green-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {trip.date ? format(new Date(trip.date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
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
                            <span className="font-medium">{trip.origin}</span>
                          </div>
                          <div className="text-gray-500 ml-4">→ {trip.destination}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {trip.driver_payout_date && (
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            {format(new Date(trip.driver_payout_date), "dd/MM/yyyy", { locale: ptBR })}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-green-600 text-lg">
                          {formatPrice(trip.driver_payout_amount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}