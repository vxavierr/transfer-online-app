import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, User, Car, DollarSign, XCircle, AlertCircle, Loader2, BellRing, MessageSquare, PhoneCall, Pencil } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TripHistoryView from './TripHistoryView';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import ExpensesDialog from '@/components/supplier/ExpensesDialog';
import DriverDataSection from './DriverDataSection';

export default function SupplierOwnBookingDetailsDialog({ booking, open, onClose, onManageDriver, onEdit }) {
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [cancelError, setCancelError] = React.useState('');
  const [cancelSuccess, setCancelSuccess] = React.useState(false);
  
  // Estado para atualização manual de status
  const [manualDriverStatus, setManualDriverStatus] = React.useState('');
  const [isUpdatingDriverStatus, setIsUpdatingDriverStatus] = React.useState(false);
  const [updateStatusError, setUpdateStatusError] = React.useState('');
  const [updateStatusSuccess, setUpdateStatusSuccess] = React.useState(false);
  const [currentDriverStatus, setCurrentDriverStatus] = React.useState('');
  
  // Estados para Despesas Manuais
  const [showExpensesDialog, setShowExpensesDialog] = React.useState(false);
  const [pendingManualStatus, setPendingManualStatus] = React.useState('');
  
  const [isResendingRating, setIsResendingRating] = React.useState(false);
  const [ratingSuccess, setRatingSuccess] = React.useState('');
  const [ratingError, setRatingError] = React.useState('');

  // Estados para lembrete manual
  const [isSendingManualReminder, setIsSendingManualReminder] = React.useState(false);
  const [manualReminderStatus, setManualReminderStatus] = React.useState('');
  const [manualReminderMessage, setManualReminderMessage] = React.useState('');

  React.useEffect(() => {
    if (booking) {
      setCurrentDriverStatus(booking.driver_trip_status || 'aguardando');
    }
  }, [booking]);

  if (!booking) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  const handleDriverStatusUpdate = async (newStatus, expenseData = null) => {
    if (!newStatus) return;
    
    // Interceptar status que requerem despesas se não vierem com dados de despesa
    if (!expenseData && (newStatus === 'chegou_destino' || newStatus === 'no_show')) {
      setPendingManualStatus(newStatus);
      setShowExpensesDialog(true);
      return;
    }

    setIsUpdatingDriverStatus(true);
    setUpdateStatusError('');
    setUpdateStatusSuccess(false);

    try {
      let statusToSend = newStatus;
      
      // Se veio do diálogo de despesas e não tem despesas adicionais, finalizar direto
      if (expenseData && newStatus === 'chegou_destino' && !expenseData.hasAdditionalExpenses) {
        statusToSend = 'finalizada';
      }

      const payload = {
        serviceRequestId: booking.id,
        newStatus: statusToSend
      };

      if (expenseData) {
        payload.hasAdditionalExpenses = expenseData.hasAdditionalExpenses;
        payload.additionalExpenses = expenseData.additionalExpenses;
      }

      const response = await base44.functions.invoke('manualUpdateTripStatus', payload);

      if (response.data && response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['supplierOwnBookings'] });
        queryClient.invalidateQueries({ queryKey: ['bookings'] }); 
        setUpdateStatusSuccess(true);
        setCurrentDriverStatus(statusToSend); // Atualizar visualmente com o status enviado
        setManualDriverStatus('');
        setShowExpensesDialog(false);
        setPendingManualStatus('');
        
        setTimeout(() => setUpdateStatusSuccess(false), 3000);
      } else {
        throw new Error(response.data?.error || 'Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Erro ao atualizar status manual:', error);
      setUpdateStatusError(error.message || 'Erro ao atualizar status');
    } finally {
      setIsUpdatingDriverStatus(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      setCancelError('Por favor, informe o motivo do cancelamento.');
      return;
    }

    setIsCancelling(true);
    setCancelError('');

    try {
      await base44.entities.SupplierOwnBooking.update(booking.id, { 
        status: 'cancelada'
      });

      // Registrar histórico e notificar motorista
      try {
        const user = await base44.auth.me();
        await base44.entities.TripHistory.create({
          trip_id: booking.id,
          trip_type: 'SupplierOwnBooking',
          event_type: 'Viagem Cancelada',
          user_id: user.id,
          user_name: user.full_name,
          comment: `Viagem cancelada manualmente. Motivo: ${cancelReason}`,
          details: {
            reason: cancelReason,
            previous_status: booking.status
          }
        });

        // Notificar motorista
        await base44.functions.invoke('notifyDriverAboutCancellation', {
          tripId: booking.id,
          tripType: 'SupplierOwnBooking',
          cancelReason: cancelReason
        });
      } catch (histError) {
        console.error('Erro ao registrar histórico ou notificar:', histError);
      }

      setCancelSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['supplierOwnBookings'] }); // Para atualizar a lista se usada em contexto de fornecedor
      queryClient.invalidateQueries({ queryKey: ['bookings'] }); // Para atualizar admin dashboard

      setTimeout(() => {
        setCancelSuccess(false);
        setShowCancelDialog(false);
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Erro ao cancelar viagem:', error);
      setCancelError('Erro ao cancelar viagem: ' + error.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResendRating = async () => {
    setIsResendingRating(true);
    setRatingError('');
    setRatingSuccess('');

    try {
      const response = await base44.functions.invoke('adminManualSendRating', {
        serviceRequestId: booking.id
      });

      if (response.data && response.data.success) {
        setRatingSuccess('Link de avaliação reenviado com sucesso!');
        setTimeout(() => setRatingSuccess(''), 3000);
      } else {
        setRatingError(response.data?.error || 'Erro ao reenviar avaliação');
      }
    } catch (error) {
      console.error('Erro ao reenviar avaliação:', error);
      setRatingError('Erro ao processar solicitação');
    } finally {
      setIsResendingRating(false);
    }
  };

  const handleManualReminder = async (channel) => {
    setIsSendingManualReminder(true);
    setManualReminderStatus('loading');
    setManualReminderMessage('');

    try {
      const response = await base44.functions.invoke('manualSendDriverReminder', {
        tripId: booking.id,
        tripType: 'SupplierOwnBooking',
        channels: [channel]
      });

      if (response.data && response.data.success) {
        const res = response.data.results;
        let msg = '';
        if (channel === 'whatsapp') {
            if (res.whatsapp.sent) msg = 'WhatsApp enviado com sucesso!';
            else msg = 'Erro ao enviar WhatsApp: ' + (res.whatsapp.error || 'Desconhecido');
        } else if (channel === 'voice_call') {
            if (res.voice_call.sent) msg = 'Ligação iniciada com sucesso!';
            else msg = 'Erro ao iniciar ligação: ' + (res.voice_call.error || 'Desconhecido');
        }
        setManualReminderMessage(msg);
        setManualReminderStatus(res[channel].sent ? 'success' : 'error');
      } else {
        throw new Error(response.data?.error || 'Erro ao processar solicitação');
      }
    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
      setManualReminderStatus('error');
      setManualReminderMessage(error.message || 'Erro ao enviar lembrete');
    } finally {
      setIsSendingManualReminder(false);
      setTimeout(() => {
          if(manualReminderStatus === 'success') {
              setManualReminderMessage('');
              setManualReminderStatus('');
          }
      }, 5000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center w-full pr-8">
            <DialogTitle className="text-2xl flex items-center gap-3">
              Detalhes da Viagem (Fornecedor)
              <Badge className="text-lg px-3 py-1 bg-amber-100 text-amber-800 border-amber-200">
                {booking.booking_number}
              </Badge>
            </DialogTitle>
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onEdit(booking)}
                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Pencil className="w-4 h-4" />
                Editar Viagem
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-gray-100 text-gray-800 border border-gray-300 text-base px-3 py-1 capitalize">
              Status: {booking.status}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-base px-3 py-1">
              Tipo: {booking.service_type === 'one_way' ? 'Só Ida' : booking.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora'}
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Rota e Horário */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Dados da Viagem
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="block text-gray-500 text-xs">Data e Hora</span>
                  <span className="font-medium">
                    {booking.date ? format(new Date(booking.date), "dd/MM/yyyy", { locale: ptBR }) : '-'} às {booking.time}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-500 text-xs">Origem</span>
                  <span className="font-medium">{booking.origin}</span>
                </div>
                <div>
                  <span className="block text-gray-500 text-xs">Destino</span>
                  <span className="font-medium">{booking.destination || '-'}</span>
                </div>
                {booking.additional_stops && booking.additional_stops.length > 0 && (
                  <div>
                    <span className="block text-gray-500 text-xs">Paradas Adicionais</span>
                    <ul className="list-disc list-inside pl-1">
                      {booking.additional_stops.map((stop, idx) => (
                        <li key={idx}>{stop.address}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Passageiro e Veículo */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Passageiro e Veículo
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="block text-gray-500 text-xs">Passageiro Principal</span>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{booking.passenger_name}</span>
                  </div>
                  <div className="ml-6 text-gray-500 text-xs">{booking.passenger_phone}</div>
                </div>
                <div>
                  <span className="block text-gray-500 text-xs">Veículo Solicitado</span>
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{booking.vehicle_type_name}</span>
                  </div>
                </div>
                <div>
                  <span className="block text-gray-500 text-xs">Valor</span>
                  <div className="flex items-center gap-2 text-green-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-bold text-lg">{formatPrice(booking.price)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Motorista */}
          <DriverDataSection 
            serviceRequest={booking}
            formData={booking}
            onManageDriver={onManageDriver}
          />

          {booking.notes && (
            <div>
              <h3 className="font-semibold text-sm mb-1">Observações</h3>
              <p className="text-sm bg-gray-50 p-3 rounded text-gray-700">{booking.notes}</p>
            </div>
          )}

          {/* Controle Manual de Status */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Controle Operacional</h3>
            
            {updateStatusSuccess && (
              <Alert className="bg-green-50 border-green-200 mb-3">
                <AlertDescription className="text-green-800">Status atualizado com sucesso!</AlertDescription>
              </Alert>
            )}
            
            {updateStatusError && (
              <Alert variant="destructive" className="mb-3">
                <AlertDescription>{updateStatusError}</AlertDescription>
              </Alert>
            )}

            {ratingSuccess && (
              <Alert className="bg-green-50 border-green-200 mb-3">
                <AlertDescription className="text-green-800">{ratingSuccess}</AlertDescription>
              </Alert>
            )}

            {ratingError && (
              <Alert variant="destructive" className="mb-3">
                <AlertDescription>{ratingError}</AlertDescription>
              </Alert>
            )}

            {(booking.status === 'concluida' || currentDriverStatus === 'finalizada') && (
              <div className="mb-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-blue-900">Pesquisa de Satisfação</h4>
                    <p className="text-sm text-blue-700">Reenviar link de avaliação para o passageiro</p>
                  </div>
                  <Button 
                    onClick={handleResendRating} 
                    disabled={isResendingRating}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isResendingRating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Reenviar Avaliação'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Lembretes Manuais */}
            <div className="mb-4 bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex flex-col gap-2">
                    <div>
                        <h4 className="font-medium text-orange-900 flex items-center gap-2">
                            <BellRing className="w-4 h-4" />
                            Disparar Lembretes Manuais
                        </h4>
                        <p className="text-sm text-orange-700">Envie o alerta de "Viagem Próxima" agora</p>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <Button
                            onClick={() => handleManualReminder('whatsapp')}
                            disabled={isSendingManualReminder}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isSendingManualReminder ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <MessageSquare className="w-3 h-3 mr-1" />}
                            WhatsApp
                        </Button>
                        <Button
                            onClick={() => handleManualReminder('voice_call')}
                            disabled={isSendingManualReminder}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSendingManualReminder ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <PhoneCall className="w-3 h-3 mr-1" />}
                            Ligar Agora
                        </Button>
                    </div>
                    {manualReminderMessage && (
                        <p className={`text-xs mt-1 font-bold ${manualReminderStatus === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                            {manualReminderMessage}
                        </p>
                    )}
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-600" />
                Status do Motorista (Atualização Manual)
              </label>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Select
                    value={manualDriverStatus}
                    onValueChange={setManualDriverStatus}
                    disabled={isUpdatingDriverStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Selecionar status... (Atual: ${currentDriverStatus || 'Aguardando'})`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aguardando">Aguardando</SelectItem>
                      <SelectItem value="a_caminho">A Caminho</SelectItem>
                      <SelectItem value="chegou_origem">Chegou na Origem</SelectItem>
                      <SelectItem value="passageiro_embarcou">Em Viagem (Embarcou)</SelectItem>
                      <SelectItem value="parada_adicional">Parada Adicional</SelectItem>
                      <SelectItem value="a_caminho_destino">A Caminho do Destino</SelectItem>
                      <SelectItem value="chegou_destino">Chegou no Destino</SelectItem>
                      <SelectItem value="finalizada">Finalizada</SelectItem>
                      <SelectItem value="no_show">Não Compareceu (No Show)</SelectItem>
                      <SelectItem value="cancelada_motorista">Cancelada pelo Motorista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="button"
                  onClick={() => handleDriverStatusUpdate(manualDriverStatus)}
                  disabled={!manualDriverStatus || isUpdatingDriverStatus}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isUpdatingDriverStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar'}
                </Button>
              </div>
            </div>
          </div>

          {/* Histórico da Viagem */}
          <div className="border-t pt-4">
            <TripHistoryView tripId={booking.id} tripType="SupplierOwnBooking" />
          </div>
        </div>

        <DialogFooter className="mt-4 flex justify-between sm:justify-between w-full">
          <div>
            {booking.status !== 'cancelada' && booking.status !== 'concluida' && (
              <Button 
                variant="destructive" 
                onClick={() => setShowCancelDialog(true)}
                className="gap-2"
              >
                <XCircle className="w-4 h-4" />
                Cancelar Viagem
              </Button>
            )}
          </div>
          <Button onClick={onClose} variant="outline">Fechar</Button>
        </DialogFooter>
      </DialogContent>

      {/* Dialog de Despesas */}
      {showExpensesDialog && (
        <ExpensesDialog
          open={showExpensesDialog}
          onClose={() => {
            setShowExpensesDialog(false);
            setPendingManualStatus('');
          }}
          isUpdating={isUpdatingDriverStatus}
          onConfirm={(expenseData) => handleDriverStatusUpdate(pendingManualStatus, expenseData)}
        />
      )}

      {/* Dialog de Confirmação de Cancelamento */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="w-6 h-6" />
              Confirmar Cancelamento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta ação irá cancelar a viagem. Esta operação não pode ser desfeita.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="cancel_reason">Motivo do Cancelamento *</Label>
              <Textarea
                id="cancel_reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Cliente desistiu, erro no agendamento, etc."
                className="h-24"
              />
            </div>

            {cancelError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{cancelError}</AlertDescription>
              </Alert>
            )}

            {cancelSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">Viagem cancelada com sucesso!</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason('');
                setCancelError('');
              }}
              disabled={isCancelling || cancelSuccess}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isCancelling || !cancelReason.trim() || cancelSuccess}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Confirmar Cancelamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}