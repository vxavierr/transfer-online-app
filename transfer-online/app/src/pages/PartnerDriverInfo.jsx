import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, MapPin, Calendar, Users, Car } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PartnerDriverInfo() {
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [partner, setPartner] = useState(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBookingData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const bookingId = urlParams.get('b');
        const token = urlParams.get('t');

        if (!bookingId || !token) {
          setError('Link inválido. Verifique se copiou corretamente o link enviado.');
          setLoading(false);
          return;
        }

        // Buscar reserva
        const bookings = await base44.entities.Booking.list();
        const foundBooking = bookings.find(b => b.id === bookingId && b.partner_driver_info_token === token);

        if (!foundBooking) {
          setError('Reserva não encontrada ou link expirado.');
          setLoading(false);
          return;
        }

        // Verificar se já foi preenchida
        if (foundBooking.driver_name && foundBooking.driver_phone && foundBooking.vehicle_model && foundBooking.vehicle_plate) {
          // Preencher com dados existentes
          setDriverName(foundBooking.driver_name);
          setDriverPhone(foundBooking.driver_phone);
          setVehicleModel(foundBooking.vehicle_model);
          setVehiclePlate(foundBooking.vehicle_plate);
          setVehicleColor(foundBooking.vehicle_color || '');
        }

        // Buscar dados do parceiro
        const partners = await base44.entities.Partner.list();
        const foundPartner = partners.find(p => p.id === foundBooking.partner_id);

        setBooking(foundBooking);
        setPartner(foundPartner);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar reserva:', err);
        setError('Erro ao carregar dados da reserva. Tente novamente mais tarde.');
        setLoading(false);
      }
    };

    loadBookingData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!driverName || !driverPhone || !vehicleModel || !vehiclePlate || !vehicleColor) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const bookingId = urlParams.get('b');
      const token = urlParams.get('t');

      const response = await base44.functions.invoke('submitPartnerDriverInfo', {
        bookingId,
        token,
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        vehicleModel: vehicleModel.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        vehicleColor: vehicleColor.trim()
      });

      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data.error || 'Erro ao enviar informações.');
      }
    } catch (err) {
      console.error('Erro ao enviar dados do motorista:', err);
      setError('Erro ao enviar informações. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando reserva...</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Informações Enviadas!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Os dados do motorista e veículo foram enviados com sucesso! O cliente será notificado em breve.
              </AlertDescription>
            </Alert>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Motorista:</span>
                <span className="font-medium">{driverName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Telefone:</span>
                <span className="font-medium">{driverPhone}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Veículo:</span>
                <span className="font-medium">{vehicleModel} ({vehicleColor})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Placa:</span>
                <span className="font-medium">{vehiclePlate}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Você pode fechar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Informações do Motorista
          </h1>
          <p className="text-gray-600">Informe os dados do motorista e veículo para esta viagem</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">
              Olá, {partner?.name}!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <div className="text-sm text-gray-600">Reserva:</div>
              <div className="text-2xl font-bold text-green-600">{booking.booking_number}</div>
              <div className="text-sm text-gray-600 mt-2">Status: <span className="font-medium text-green-700">Confirmada e Paga</span></div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Rota</div>
                  <div className="font-medium">{booking.origin}</div>
                  <div className="text-gray-500">→ {booking.destination}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Data e Horário</div>
                  <div className="font-medium">{formatDate(booking.date)} às {booking.time}</div>
                  {booking.has_return && booking.return_date && (
                    <div className="text-sm text-gray-500 mt-1">
                      Retorno: {formatDate(booking.return_date)} às {booking.return_time}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Cliente e Passageiros</div>
                  <div className="font-medium">{booking.customer_name}</div>
                  <div className="text-sm text-gray-600">{booking.customer_phone}</div>
                  <div className="text-sm text-gray-600">Passageiros: {booking.passengers || 1}</div>
                </div>
              </div>

              {booking.partner_cost && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Valor Acordado:</div>
                  <div className="text-2xl font-bold text-blue-600">{formatPrice(booking.partner_cost)}</div>
                </div>
              )}

              {booking.notes && (
                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="text-sm font-semibold text-amber-800 mb-1">Observações do Cliente:</div>
                  <div className="text-sm text-amber-900">{booking.notes}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-6 h-6" />
              Dados do Motorista e Veículo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="driverName">Nome do Motorista *</Label>
                <Input
                  id="driverName"
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="João da Silva"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driverPhone">Telefone do Motorista *</Label>
                <Input
                  id="driverPhone"
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
                <p className="text-xs text-gray-500">
                  Número para contato direto com o cliente
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleModel">Modelo do Veículo *</Label>
                <Input
                  id="vehicleModel"
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Toyota Corolla 2023 Prata"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleColor">Cor do Veículo *</Label>
                <Input
                  id="vehicleColor"
                  type="text"
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                  placeholder="Preto, Prata, Branco..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehiclePlate">Placa do Veículo *</Label>
                <Input
                  id="vehiclePlate"
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="ABC-1234"
                  maxLength={8}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Enviar Informações
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-500">
          <p>TransferOnline - Sistema de Reservas de Transfer</p>
        </div>
      </div>
    </div>
  );
}