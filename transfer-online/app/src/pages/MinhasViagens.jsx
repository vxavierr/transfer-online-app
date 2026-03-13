import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, Eye, Loader2, Package } from 'lucide-react';

import UserBookingDetails from '../components/user/UserBookingDetails';

export default function MinhasViagens() {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['myBookings', user?.email],
    queryFn: () => base44.entities.Booking.filter({ customer_email: user.email }, '-created_date'),
    enabled: !!user,
  });

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
      reembolsado: 'bg-gray-100 text-gray-800 border-gray-300',
      falhou: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const upcomingBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    return bookingDate >= new Date() && b.status !== 'cancelada' && b.status !== 'concluida';
  });

  const pastBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    return bookingDate < new Date() || b.status === 'cancelada' || b.status === 'concluida';
  });

  const renderBookingCard = (booking) => (
    <Card key={booking.id} className="mb-4 hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  {booking.booking_number || `Reserva #${booking.id.slice(-6)}`}
                </h3>
                <p className="text-sm text-gray-500">{booking.vehicle_type_name}</p>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-medium text-gray-700">De:</span>{' '}
                  <span className="text-gray-600">{booking.origin}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Para:</span>{' '}
                  <span className="text-gray-600">{booking.destination}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {/* Exibir data diretamente da string para evitar problemas de fuso horário */}
                  {booking.date ? booking.date.split('-').reverse().join('/') : '-'} às {booking.time}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={`${getStatusColor(booking.status)} border`}>
                {booking.status}
              </Badge>
              <Badge className={`${getPaymentStatusColor(booking.payment_status)} border`}>
                {booking.payment_status}
              </Badge>
              {booking.service_type === 'round_trip' && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-300 border">
                  Ida e Volta
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 md:pl-4 md:border-l">
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Valor Total</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(booking.total_price)}
              </div>
            </div>
            <Button
              onClick={() => setSelectedBooking(booking)}
              variant="outline"
              className="w-full md:w-auto"
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver Detalhes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 relative overflow-hidden">
      {/* Formas Abstratas Animadas - Apenas Desktop */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-purple-200/15 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-gradient-to-br from-green-200/15 to-blue-300/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Minhas Viagens</h1>
          </div>
          <p className="text-gray-600">Acompanhe suas reservas e histórico</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando suas viagens...</p>
          </div>
        ) : bookings.length === 0 ? (
          <Card className="shadow-xl">
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhuma viagem encontrada
              </h3>
              <p className="text-gray-600 mb-6">
                Você ainda não fez nenhuma reserva
              </p>
              <Button
                onClick={() => window.location.href = '/NovaReserva'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Fazer Primeira Reserva
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="upcoming" className="text-base">
                Próximas Viagens ({upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="text-base">
                Histórico ({pastBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              {upcomingBookings.length === 0 ? (
                <Card className="shadow-xl">
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">Nenhuma viagem programada</p>
                  </CardContent>
                </Card>
              ) : (
                upcomingBookings.map(renderBookingCard)
              )}
            </TabsContent>

            <TabsContent value="past">
              {pastBookings.length === 0 ? (
                <Card className="shadow-xl">
                  <CardContent className="p-8 text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">Nenhuma viagem anterior</p>
                  </CardContent>
                </Card>
              ) : (
                pastBookings.map(renderBookingCard)
              )}
            </TabsContent>
          </Tabs>
        )}

        {selectedBooking && (
          <UserBookingDetails
            booking={selectedBooking}
            open={!!selectedBooking}
            onClose={() => setSelectedBooking(null)}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 20s infinite ease-in-out;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}