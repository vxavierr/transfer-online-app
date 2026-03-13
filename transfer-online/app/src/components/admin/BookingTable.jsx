
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

export default function BookingTable({ bookings, onViewDetails }) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getStatusColor = (status) => {
    const colors = {
      pendente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      confirmada: 'bg-green-100 text-green-800 border-green-300',
      cancelada: 'bg-red-100 text-red-800 border-red-300',
      concluida: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      aguardando: 'bg-orange-100 text-orange-800 border-orange-300',
      pago: 'bg-green-100 text-green-800 border-green-300',
      reembolsado: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Nº Reserva</TableHead>
            <TableHead className="font-semibold">Cliente</TableHead>
            <TableHead className="font-semibold">Rota</TableHead>
            <TableHead className="font-semibold">Data/Hora</TableHead>
            <TableHead className="font-semibold">Passageiros</TableHead>
            <TableHead className="font-semibold">Valor</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Pagamento</TableHead>
            <TableHead className="font-semibold">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                Nenhuma reserva encontrada
              </TableCell>
            </TableRow>
          ) : (
            bookings.map((booking) => (
              <TableRow key={booking.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="font-mono font-semibold text-blue-600">
                    {booking.booking_number || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">{booking.customer_name}</div>
                    <div className="text-sm text-gray-500">{booking.customer_email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{booking.origin}</div>
                    <div className="text-gray-500">→ {booking.destination}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{format(new Date(booking.date), "dd/MM/yyyy", { locale: ptBR })}</div>
                    <div className="text-gray-500">{booking.time}</div>
                  </div>
                </TableCell>
                <TableCell className="text-center">{booking.passengers}</TableCell>
                <TableCell className="font-semibold text-blue-600">
                  {formatPrice(booking.total_price)}
                </TableCell>
                <TableCell>
                  <Badge className={`${getStatusColor(booking.status)} border`}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={`${getPaymentStatusColor(booking.payment_status)} border`}>
                    {booking.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(booking)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
