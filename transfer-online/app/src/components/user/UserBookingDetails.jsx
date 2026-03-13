import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Clock, Users, Phone, MessageSquare, PlaneIcon, ArrowLeftRight, AlertCircle, CreditCard, Car, User, Share2, Loader2, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useState } from 'react';

export default function UserBookingDetails({ booking, open, onClose }) {
  const [showShareRating, setShowShareRating] = useState(false);
  const [passengerEmail, setPassengerEmail] = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSentSuccess, setLinkSentSuccess] = useState(false);

  if (!booking) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatItemPrice = (item) => {
    return formatPrice(item.price);
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
      reembolsado: 'bg-gray-100 text-gray-800 border-gray-300',
      falhou: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Verificar se tem informações do motorista
  const hasDriverInfo = booking.driver_name && booking.driver_phone && booking.vehicle_model && booking.vehicle_plate;

  const handleSendRatingLink = async () => {
    if (!passengerEmail) return;
    setSendingLink(true);
    try {
      const res = await base44.functions.invoke('generateAndSendRatingLink', {
        serviceRequestId: booking.id,
        recipientEmail: passengerEmail
      });
      if (res.data.success) {
        setLinkSentSuccess(true);
        setTimeout(() => {
          setLinkSentSuccess(false);
          setShowShareRating(false);
          setPassengerEmail('');
        }, 3000);
      } else {
        alert(res.data.error || 'Erro ao enviar link');
      }
    } catch (error) {
      alert('Erro ao enviar link');
    } finally {
      setSendingLink(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            Detalhes da Viagem
            {booking.booking_number && (
              <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
                {booking.booking_number}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="flex flex-wrap gap-3">
            <Badge className={`${getStatusColor(booking.status)} border text-base px-3 py-1`}>
              Status: {booking.status}
            </Badge>
            <Badge className={`${getPaymentStatusColor(booking.payment_status)} border text-base px-3 py-1`}>
              Pagamento: {booking.payment_status}
            </Badge>
            {booking.service_type === 'round_trip' && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-300 border text-base px-3 py-1">
                Ida e Volta
              </Badge>
            )}
          </div>

          {/* Alerta para pagamento pendente */}
          {booking.payment_status === 'aguardando' && (
            <Alert className="bg-orange-50 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Atenção:</strong> O pagamento desta reserva ainda está pendente. 
                Verifique seu e-mail para concluir o pagamento.
              </AlertDescription>
            </Alert>
          )}

          {/* Alerta para reembolso */}
          {booking.payment_status === 'reembolsado' && (
            <Alert className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Esta reserva foi cancelada e o valor foi reembolsado.
                {booking.refund_reason && (
                  <p className="mt-2"><strong>Motivo:</strong> {booking.refund_reason}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* SEÇÃO: Informações do Motorista e Veículo */}
          {hasDriverInfo && booking.status === 'confirmada' && booking.payment_status === 'pago' && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-900">Seu Motorista e Veículo</h3>
                  <p className="text-sm text-green-700">Informações para sua viagem</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <User className="w-4 h-4" />
                      <span>Motorista</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 ml-6">{booking.driver_name}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Phone className="w-4 h-4" />
                      <span>Telefone</span>
                    </div>
                    <a 
                      href={`tel:${booking.driver_phone}`}
                      className="text-lg font-semibold text-blue-600 hover:text-blue-700 ml-6 block"
                    >
                      {booking.driver_phone}
                    </a>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Car className="w-4 h-4" />
                        <span>Veículo</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 ml-6">{booking.vehicle_model}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <CreditCard className="w-4 h-4" />
                        <span>Placa</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 ml-6 uppercase">{booking.vehicle_plate}</p>
                    </div>
                  </div>
                </div>
              </div>

              {booking.driver_info_shared_at && (
                <p className="text-xs text-gray-600 text-center mt-3">
                  Informações compartilhadas em: {format(new Date(booking.driver_info_shared_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          )}

          {/* Rota IDA */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Rota de Ida</span>
            </div>
            <div className="ml-7 text-lg">
              <span className="font-semibold">{booking.origin}</span>
              <span className="mx-2 text-gray-500">→</span>
              <span className="font-semibold">{booking.destination}</span>
            </div>
            {booking.origin_flight_number && (
              <div className="ml-7 mt-2 flex items-center gap-2 text-sm bg-white p-2 rounded border border-blue-200">
                <PlaneIcon className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">Voo de Origem:</span>
                <span className="font-semibold text-blue-900">{booking.origin_flight_number}</span>
              </div>
            )}
            {booking.destination_flight_number && (
              <div className="ml-7 mt-2 flex items-center gap-2 text-sm bg-white p-2 rounded border border-blue-200">
                <PlaneIcon className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">Voo de Destino:</span>
                <span className="font-semibold text-blue-900">{booking.destination_flight_number}</span>
              </div>
            )}
          </div>

          {/* Rota RETORNO */}
          {booking.has_return && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeftRight className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-900">Rota de Retorno</span>
              </div>
              <div className="ml-7 text-lg">
                <span className="font-semibold">{booking.return_origin || booking.destination}</span>
                <span className="mx-2 text-gray-500">→</span>
                <span className="font-semibold">{booking.return_destination || booking.origin}</span>
              </div>
              {booking.return_origin_flight_number && (
                <div className="ml-7 mt-2 flex items-center gap-2 text-sm bg-white p-2 rounded border border-green-200">
                  <PlaneIcon className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">Voo de Origem (Volta):</span>
                  <span className="font-semibold text-green-900">{booking.return_origin_flight_number}</span>
                </div>
              )}
              {booking.return_destination_flight_number && (
                <div className="ml-7 mt-2 flex items-center gap-2 text-sm bg-white p-2 rounded border border-green-200">
                  <PlaneIcon className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">Voo de Destino (Volta):</span>
                  <span className="font-semibold text-green-900">{booking.return_destination_flight_number}</span>
                </div>
              )}
            </div>
          )}

          {/* Data e Hora */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Data (Ida)</div>
                <div className="font-semibold">
                  {format(new Date(booking.date), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Horário (Ida)</div>
                <div className="font-semibold">{booking.time}</div>
              </div>
            </div>
          </div>

          {/* Data e Hora RETORNO */}
          {booking.has_return && (
            <div className="grid md:grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-500">Data (Retorno)</div>
                  <div className="font-semibold">
                    {format(new Date(booking.return_date), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-500">Horário (Retorno)</div>
                  <div className="font-semibold">{booking.return_time}</div>
                </div>
              </div>
            </div>
          )}

          {/* Veículo */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-900">Veículo</span>
            </div>
            <p className="ml-7 text-lg font-medium text-purple-900">
              {booking.vehicle_type_name}
            </p>
          </div>

          {/* Idioma do Motorista */}
          {booking.driver_language && (
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold text-gray-900">Idioma do Motorista</span>
              </div>
              <p className="ml-7 text-lg font-medium text-indigo-900">
                {booking.driver_language === 'pt' ? 'Português' :
                 booking.driver_language === 'en' ? 'English' :
                 booking.driver_language === 'es' ? 'Español' :
                 booking.driver_language}
              </p>
            </div>
          )}

          {/* Passageiros e Valor */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Passageiros</div>
                <div className="font-semibold">{booking.passengers}</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Valor Total</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(booking.total_price)}
              </div>
            </div>
          </div>

          {/* Observações */}
          {booking.notes && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-gray-400" />
                <span className="font-semibold">Observações</span>
              </div>
              <p className="text-gray-700 ml-7">{booking.notes}</p>
            </div>
          )}

          {/* Compartilhar Avaliação - Apenas para viagens concluídas */}
          {booking.status === 'concluida' && !booking.rating_submitted && (
            <div className="border-t pt-4">
              {!showShareRating ? (
                <Button 
                  variant="outline" 
                  className="w-full border-dashed border-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => setShowShareRating(true)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Enviar Avaliação para o Passageiro
                </Button>
              ) : (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Enviar Link de Avaliação
                  </h4>
                  
                  {linkSentSuccess ? (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Link enviado com sucesso!
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-blue-800">
                        Insira o e-mail do passageiro para que ele possa avaliar esta viagem.
                      </p>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label htmlFor="passenger-email" className="sr-only">Email do Passageiro</Label>
                          <Input
                            id="passenger-email"
                            type="email"
                            placeholder="E-mail do passageiro"
                            value={passengerEmail}
                            onChange={(e) => setPassengerEmail(e.target.value)}
                            className="bg-white"
                          />
                        </div>
                        <Button onClick={handleSendRatingLink} disabled={!passengerEmail || sendingLink}>
                          {sendingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowShareRating(false)}
                        className="text-xs text-gray-500"
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end border-t pt-4">
            <Button onClick={onClose} variant="outline">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}