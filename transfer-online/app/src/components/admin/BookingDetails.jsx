import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Função para fazer parse correto de datas evitando problemas de timezone
const parseLocalDate = (dateString) => {
  if (!dateString) return new Date();
  // Se for ISO string com tempo (T...), usa new Date normal
  if (dateString.includes('T')) return new Date(dateString);
  
  const [year, month, day] = dateString.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Calendar, Clock, Users, Phone, Mail, MessageSquare, PlaneIcon, ArrowLeftRight, Percent, CreditCard, AlertCircle, Loader2, Car, Send, CheckCircle2, Navigation, Tag, Star, BellRing, PhoneCall, Copy } from 'lucide-react';
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TripHistoryView from './TripHistoryView';

export default function BookingDetails({ booking, open, onClose, onManageDriver }) {
  const [isRefunding, setIsRefunding] = React.useState(false);
  const [refundReason, setRefundReason] = React.useState('');
  const [showRefundDialog, setShowRefundDialog] = React.useState(false);
  const [refundError, setRefundError] = React.useState('');
  const [refundSuccess, setRefundSuccess] = React.useState(false);

  const [isResendingLink, setIsResendingLink] = React.useState(false);
  const [resendLinkError, setResendLinkError] = React.useState('');
  const [resendLinkSuccess, setResendLinkSuccess] = React.useState(false);

  // Novo estado para dados do motorista
  const [driverName, setDriverName] = React.useState('');
  const [driverPhone, setDriverPhone] = React.useState('');
  const [vehicleModel, setVehicleModel] = React.useState('');
  const [vehiclePlate, setVehiclePlate] = React.useState('');
  const [isSavingDriverInfo, setIsSavingDriverInfo] = React.useState(false);
  const [driverInfoError, setDriverInfoError] = React.useState('');
  const [driverInfoSuccess, setDriverInfoSuccess] = React.useState(false);

  // Estado para envio de notificações ao passageiro
  const [isSendingNotification, setIsSendingNotification] = React.useState(false);
  const [notificationError, setNotificationError] = React.useState('');
  const [notificationSuccess, setNotificationSuccess] = React.useState(false);

  // Novo estado para envio de dados ao motorista
  const [isSendingToDriver, setIsSendingToDriver] = React.useState(false);
  const [sendToDriverError, setSendToDriverError] = React.useState('');
  const [sendToDriverSuccess, setSendToDriverSuccess] = React.useState(false);

  // Estados para atualização de status
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [statusUpdateError, setStatusUpdateError] = React.useState('');
  const [updateStatusSuccess, setUpdateStatusSuccess] = React.useState(false);
  
  // Estado para atualização manual de status do motorista
  const [manualDriverStatus, setManualDriverStatus] = React.useState('');
  const [isUpdatingDriverStatus, setIsUpdatingDriverStatus] = React.useState(false);
  const [currentDriverStatus, setCurrentDriverStatus] = React.useState('');

  // Estado para envio manual de pesquisa
  const [isSendingRating, setIsSendingRating] = React.useState(false);
  const [ratingError, setRatingError] = React.useState('');
  const [ratingSuccess, setRatingSuccess] = React.useState(false);

  // Estados para lembrete manual
  const [isSendingManualReminder, setIsSendingManualReminder] = React.useState(false);
  const [manualReminderStatus, setManualReminderStatus] = React.useState(''); // '' | 'loading' | 'success' | 'error'
  const [manualReminderMessage, setManualReminderMessage] = React.useState('');

  React.useEffect(() => {
    if (booking) {
      setCurrentDriverStatus(booking.driver_current_status || 'aguardando');
    }
  }, [booking]);

  const queryClient = useQueryClient();

  // Buscar tags do passageiro (por email ou telefone)
  const { data: passengerTags = [] } = useQuery({
    queryKey: ['passengerTags', booking?.customer_email, booking?.customer_phone],
    queryFn: async () => {
      if (!booking) return [];
      
      // Buscar todas as tags e filtrar (estratégia mais segura sem backend search complexo)
      // Idealmente, backend suportaria filtro OR, mas aqui filtramos em memória para garantir
      const allTags = await base44.entities.PassengerTag.filter({ is_active: true });
      
      return allTags.filter(tag => {
        const identifier = tag.passenger_identifier?.toLowerCase().trim();
        const email = booking.customer_email?.toLowerCase().trim();
        const phone = booking.customer_phone?.replace(/\D/g, '') || ''; // Remove não-números para comparar
        const tagPhone = tag.passenger_identifier?.replace(/\D/g, '') || '';

        return (email && identifier === email) || (phone && tagPhone && tagPhone === phone);
      });
    },
    enabled: !!booking,
    initialData: []
  });

  const getTagStyle = (type) => {
    const styles = {
      'VIP': 'bg-purple-100 text-purple-800 border-purple-200',
      'Atencao': 'bg-amber-100 text-amber-800 border-amber-200',
      'Restricao': 'bg-red-100 text-red-800 border-red-200',
      'Preferencia': 'bg-blue-100 text-blue-800 border-blue-200',
      'Outros': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return styles[type] || styles['Outros'];
  };

  React.useEffect(() => {
    if (booking) {
      setDriverName(booking.driver_name || '');
      // Pré-preencher com +55 se estiver vazio
      setDriverPhone(booking.driver_phone || '+55');
      setVehicleModel(booking.vehicle_model || '');
      setVehiclePlate(booking.vehicle_plate || '');
    }
  }, [booking]);

  const handleDriverStatusUpdate = async (newStatus) => {
    if (!newStatus) return;
    setIsUpdatingDriverStatus(true);
    setStatusUpdateError('');

    try {
      const response = await base44.functions.invoke('manualUpdateTripStatus', {
        serviceRequestId: booking.id,
        newStatus: newStatus
      });

      if (response.data && response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        setCurrentDriverStatus(newStatus);
        setManualDriverStatus(''); // Limpar seleção
      } else {
        throw new Error(response.data?.error || 'Erro ao atualizar status do motorista');
      }
    } catch (error) {
      console.error('Erro ao atualizar status do motorista:', error);
      setStatusUpdateError(`Erro: ${error.message}`);
    } finally {
      setIsUpdatingDriverStatus(false);
    }
  };

  const handleManualRatingSend = async () => {
    setIsSendingRating(true);
    setRatingError('');
    setRatingSuccess(false);

    try {
      const response = await base44.functions.invoke('adminManualSendRating', {
        serviceRequestId: booking.id
      });

      if (response.data && response.data.success) {
        setRatingSuccess(true);
        setTimeout(() => setRatingSuccess(false), 5000);
      } else {
        throw new Error(response.data?.error || 'Erro ao enviar pesquisa');
      }
    } catch (error) {
      console.error('Erro ao enviar pesquisa:', error);
      setRatingError(error.response?.data?.error || error.message || 'Erro ao enviar pesquisa');
    } finally {
      setIsSendingRating(false);
    }
  };

  const handleManualReminder = async (channel) => {
    setIsSendingManualReminder(true);
    setManualReminderStatus('loading');
    setManualReminderMessage('');

    try {
      const response = await base44.functions.invoke('manualSendDriverReminder', {
        tripId: booking.id,
        tripType: 'Booking',
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

  const handleStatusUpdate = async (field, value) => {
    setIsUpdatingStatus(true);
    setStatusUpdateError('');

    try {
      const response = await base44.entities.Booking.update(booking.id, { [field]: value });
      
      // Registrar histórico
      try {
        const user = await base44.auth.me();
        await base44.entities.TripHistory.create({
          trip_id: booking.id,
          trip_type: 'Booking',
          event_type: 'Status Alterado',
          user_id: user.id,
          user_name: user.full_name,
          comment: `Status ${field === 'payment_status' ? 'de pagamento' : ''} alterado de ${booking[field]} para ${value}`,
          details: {
            field,
            old_value: booking[field],
            new_value: value
          }
        });
        queryClient.invalidateQueries(['tripHistory', booking.id]);
      } catch (histError) {
        console.error('Erro ao registrar histórico:', histError);
      }

      console.log('Status atualizado com sucesso:', response);
      setUpdateStatusSuccess(true);
      setTimeout(() => setUpdateStatusSuccess(false), 3000);
      
      // Se o status foi alterado para cancelada, notificar motorista
      if (field === 'status' && value === 'cancelada') {
        try {
          await base44.functions.invoke('notifyDriverAboutCancellation', {
            tripId: booking.id,
            tripType: 'Booking',
            cancelReason: 'Status alterado para Cancelada pelo administrador'
          });
        } catch (notifyError) {
          console.error('Erro ao notificar motorista sobre cancelamento:', notifyError);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setStatusUpdateError(`Erro ao atualizar status: ${error.message}`);
      
      // Limpar erro após 5 segundos
      setTimeout(() => {
        setStatusUpdateError('');
      }, 5000);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRefund = async () => {
    if (!refundReason.trim()) {
      setRefundError('Por favor, informe o motivo do cancelamento');
      return;
    }

    setIsRefunding(true);
    setRefundError('');
    setRefundSuccess(false);

    try {
      const response = await base44.functions.invoke('refundPayment', {
        bookingId: booking.id,
        refundReason: refundReason
      });

      if (response.data.success) {
        
        // Notificar motorista sobre o cancelamento/reembolso
        try {
          await base44.functions.invoke('notifyDriverAboutCancellation', {
            tripId: booking.id,
            tripType: 'Booking',
            cancelReason: refundReason
          });
        } catch (notifyError) {
          console.error('Erro ao notificar motorista sobre cancelamento:', notifyError);
        }

        setRefundSuccess(true);
        setShowRefundDialog(false);
        setRefundReason('');
        queryClient.invalidateQueries({ queryKey: ['bookings'] });

        setTimeout(() => {
          setRefundSuccess(false);
        }, 3000);
      } else {
        setRefundError(response.data.error || 'Erro ao processar reembolso');
      }
    } catch (error) {
      console.error('Erro ao processar reembolso:', error);
      setRefundError(error.response?.data?.error || error.message || 'Erro ao processar reembolso');
    } finally {
      setIsRefunding(false);
    }
  };

  const handleResendPaymentLink = async () => {
    setIsResendingLink(true);
    setResendLinkError('');
    setResendLinkSuccess(false);

    try {
      const response = await base44.functions.invoke('resendPaymentLink', {
        bookingId: booking.id
      });

      if (response.data.success) {
        setResendLinkSuccess(true);
        queryClient.invalidateQueries({ queryKey: ['bookings'] });

        setTimeout(() => {
          setResendLinkSuccess(false);
        }, 5000);
      } else {
        setResendLinkError(response.data.error || 'Erro ao reenviar link de pagamento');
      }
    } catch (error) {
      console.error('Erro ao reenviar link:', error);
      setResendLinkError(error.response?.data?.error || error.message || 'Erro ao reenviar link de pagamento');
    } finally {
      setIsResendingLink(false);
    }
  };



  const handleSaveDriverInfo = async () => {
    setIsSavingDriverInfo(true);
    setDriverInfoError('');
    setDriverInfoSuccess(false);

    // Validação básica
    if (!driverName.trim()) {
      setDriverInfoError('Por favor, informe o nome do motorista');
      setIsSavingDriverInfo(false);
      return;
    }

    if (!driverPhone.trim()) {
      setDriverInfoError('Por favor, informe o telefone do motorista');
      setIsSavingDriverInfo(false);
      return;
    }

    if (!vehicleModel.trim()) {
      setDriverInfoError('Por favor, informe o modelo do veículo');
      setIsSavingDriverInfo(false);
      return;
    }

    if (!vehiclePlate.trim()) {
      setDriverInfoError('Por favor, informe a placa do veículo');
      setIsSavingDriverInfo(false);
      return;
    }

    try {
      await base44.entities.Booking.update(booking.id, {
        driver_name: driverName,
        driver_phone: driverPhone,
        vehicle_model: vehicleModel,
        vehicle_plate: vehiclePlate,
        driver_reminder_1h_sent_at: null // Resetar lembrete ao alterar motorista
      });

      // Registrar histórico
      try {
        const user = await base44.auth.me();
        await base44.entities.TripHistory.create({
          trip_id: booking.id,
          trip_type: 'Booking',
          event_type: 'Motorista Atualizado',
          user_id: user.id,
          user_name: user.full_name,
          comment: `Dados do motorista atualizados manualmente.`,
          details: {
            driver_name: driverName,
            vehicle_plate: vehiclePlate
          }
        });
        queryClient.invalidateQueries(['tripHistory', booking.id]);
      } catch (histError) {
        console.error('Erro ao registrar histórico:', histError);
      }

      setDriverInfoSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });

      setTimeout(() => {
        setDriverInfoSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Erro ao salvar dados do motorista:', error);
      setDriverInfoError('Erro ao salvar dados do motorista');
    } finally {
      setIsSavingDriverInfo(false);
    }
  };

  const handleSendDriverInfo = async (notificationType) => {
    setIsSendingNotification(true);
    setNotificationError('');
    setNotificationSuccess(false);

    // Basic validation before sending
    if (!driverName.trim() || !driverPhone.trim() || !vehicleModel.trim() || !vehiclePlate.trim()) {
      setNotificationError('Por favor, preencha todos os campos do motorista e veículo antes de enviar.');
      setIsSendingNotification(false);
      return;
    }

    // Primeiro salvar os dados se houver alteração pendente
    if (driverName !== booking.driver_name ||
        driverPhone !== booking.driver_phone ||
        vehicleModel !== booking.vehicle_model ||
        vehiclePlate !== booking.vehicle_plate) {
      try {
        await base44.entities.Booking.update(booking.id, {
          driver_name: driverName,
          driver_phone: driverPhone,
          vehicle_model: vehicleModel,
          vehicle_plate: vehiclePlate,
          driver_reminder_1h_sent_at: null // Resetar lembrete ao alterar motorista
        });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
      } catch (error) {
        console.error('Erro ao salvar antes de enviar:', error);
        setNotificationError('Erro ao salvar dados antes do envio');
        setIsSendingNotification(false);
        return;
      }
    }

    try {
      console.log('Invocando função sendDriverInfoNotification com:', { bookingId: booking.id, notificationType });
      
      const response = await base44.functions.invoke('sendDriverInfoNotification', {
        bookingId: booking.id,
        notificationType: notificationType
      });

      console.log('Resposta da função:', response);

      // Verificar se a resposta contém dados
      if (response && response.data) {
        const { success, message, emailSent, whatsappSent, emailError, whatsappError } = response.data;
        
        if (success) {
          let successMsg = 'Informações enviadas com sucesso!';
          if (emailSent && whatsappSent) {
            successMsg = 'E-mail e WhatsApp enviados com sucesso!';
          } else if (emailSent) {
            successMsg = 'E-mail enviado com sucesso!' + (whatsappError ? ` (WhatsApp falhou: ${whatsappError})` : '');
          } else if (whatsappSent) {
            successMsg = 'WhatsApp enviado com sucesso!' + (emailError ? ` (E-mail falhou: ${emailError})` : '');
          }
          
          setNotificationSuccess(true);
          setNotificationError('');
          queryClient.invalidateQueries({ queryKey: ['bookings'] });

          setTimeout(() => {
            setNotificationSuccess(false);
          }, 5000);
        } else {
          // Se success é false, mostrar a mensagem de erro
          let errorMsg = message || 'Erro ao enviar notificação';
          if (emailError && whatsappError) {
            errorMsg = `E-mail: ${emailError}. WhatsApp: ${whatsappError}`;
          } else if (emailError) {
            errorMsg = `E-mail: ${emailError}`;
          } else if (whatsappError) {
            errorMsg = `WhatsApp: ${whatsappError}`;
          }
          setNotificationError(errorMsg);
        }
      } else {
        setNotificationError('Resposta inválida da função');
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      
      // Tentar extrair a mensagem de erro mais específica
      let errorMsg = 'Erro ao enviar notificação';
      
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      // Se for erro de configuração, dar uma dica
      if (errorMsg.includes('Evolution API') || errorMsg.includes('EVOLUTION_')) {
        errorMsg += ' (Verifique as variáveis de ambiente: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME)';
      } else if (errorMsg.includes('admin_whatsapp_number')) {
        errorMsg += ' (Configure em Configurações > WhatsApp do Administrador)';
      }
      
      setNotificationError(errorMsg);
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleSendToDriver = async () => {
    setIsSendingToDriver(true);
    setSendToDriverError('');
    setSendToDriverSuccess(false);

    // Validação - telefone do motorista deve estar preenchido
    if (!driverPhone || !driverPhone.trim()) {
      setSendToDriverError('Telefone do motorista não foi preenchido. Por favor, preencha antes de enviar.');
      setIsSendingToDriver(false);
      return;
    }

    // Salvar dados do motorista se houver alterações pendentes
    if (driverName !== booking.driver_name ||
        driverPhone !== booking.driver_phone ||
        vehicleModel !== booking.vehicle_model ||
        vehiclePlate !== booking.vehicle_plate) {
      try {
        await base44.entities.Booking.update(booking.id, {
          driver_name: driverName,
          driver_phone: driverPhone,
          vehicle_model: vehicleModel,
          vehicle_plate: vehiclePlate,
          driver_reminder_1h_sent_at: null // Resetar lembrete ao alterar motorista
        });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
      } catch (error) {
        console.error('Erro ao salvar antes de enviar:', error);
        setSendToDriverError('Erro ao salvar dados antes do envio');
        setIsSendingToDriver(false);
        return;
      }
    }

    try {
      console.log('Invocando função sendBookingDetailsToDriver com bookingId:', booking.id);
      
      const response = await base44.functions.invoke('sendBookingDetailsToDriver', {
        bookingId: booking.id
      });

      console.log('Resposta da função:', response);

      if (response && response.data) {
        if (response.data.success) {
          setSendToDriverSuccess(true);
          setSendToDriverError('');
          queryClient.invalidateQueries({ queryKey: ['bookings'] });

          setTimeout(() => {
            setSendToDriverSuccess(false);
          }, 5000);
        } else {
          setSendToDriverError(response.data.error || 'Erro ao enviar dados ao motorista');
        }
      } else {
        setSendToDriverError('Resposta inválida da função');
      }
    } catch (error) {
      console.error('Erro ao enviar dados ao motorista:', error);
      
      let errorMsg = 'Erro ao enviar dados ao motorista';
      
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      if (errorMsg.includes('Evolution API') || errorMsg.includes('EVOLUTION_')) {
        errorMsg += ' (Verifique as variáveis de ambiente da Evolution API)';
      }
      
      setSendToDriverError(errorMsg);
    } finally {
      setIsSendingToDriver(false);
    }
  };

  if (!booking) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatItemPrice = (item) => {
    if (item.adjustment_type === 'percentage') {
      return formatPrice(item.price);
    }
    return formatPrice(item.price);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            Detalhes da Reserva
            {booking.booking_number && (
              <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
                {booking.booking_number}
              </Badge>
            )}
            {booking.has_return && (
              <Badge className="bg-purple-600 text-white text-lg px-3 py-1">
                Ida e Volta
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mensagem de Sucesso de Reembolso */}
          {refundSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Reembolso processado com sucesso! O cliente receberá um e-mail de confirmação.
              </AlertDescription>
            </Alert>
          )}

          {/* Mensagem de Sucesso de Reenvio de Link */}
          {resendLinkSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Link de pagamento reenviado com sucesso! O cliente receberá um e-mail com o link.
              </AlertDescription>
            </Alert>
          )}

          {/* Mensagem de Erro de Reenvio de Link */}
          {resendLinkError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{resendLinkError}</AlertDescription>
            </Alert>
          )}

          {/* Mensagem de Erro de Atualização de Status */}
          {statusUpdateError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{statusUpdateError}</AlertDescription>
            </Alert>
          )}

          {/* SEÇÃO: Informações do Motorista - Visível para Admin */}
          <div className="border-t pt-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg mb-4 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Car className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-lg text-blue-900">Informações do Motorista</h3>
                </div>
                <p className="text-sm text-blue-800">
                  Gerencie a alocação de motorista e veículo
                </p>
              </div>
              <Button 
                onClick={onManageDriver}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <Car className="w-4 h-4 mr-2" />
                Gerenciar Motorista e Veículo
              </Button>
            </div>

            {driverInfoSuccess && (
              <Alert className="bg-green-50 border-green-200 mb-4">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Dados do motorista salvos com sucesso!
                </AlertDescription>
              </Alert>
            )}

            {driverInfoError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{driverInfoError}</AlertDescription>
              </Alert>
            )}

            {notificationSuccess && (
              <Alert className="bg-green-50 border-green-200 mb-4">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Informações enviadas com sucesso para o passageiro!
                </AlertDescription>
              </Alert>
            )}

            {notificationError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{notificationError}</AlertDescription>
              </Alert>
            )}

            {sendToDriverSuccess && (
              <Alert className="bg-green-50 border-green-200 mb-4">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Dados da viagem enviados com sucesso ao motorista!
                </AlertDescription>
              </Alert>
            )}

            {sendToDriverError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{sendToDriverError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 bg-white p-4 rounded-lg border">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="driver_name" className="text-sm font-semibold">
                    Nome do Motorista *
                  </Label>
                  <Input
                    id="driver_name"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="driver_phone" className="text-sm font-semibold">
                    Telefone do Motorista *
                  </Label>
                  <Input
                    id="driver_phone"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="Ex: +55 (11) 99999-9999"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vehicle_model" className="text-sm font-semibold">
                    Modelo do Veículo *
                  </Label>
                  <Input
                    id="vehicle_model"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Ex: Toyota Corolla 2023 Preto"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="vehicle_plate" className="text-sm font-semibold">
                    Placa do Veículo *
                  </Label>
                  <Input
                    id="vehicle_plate"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    placeholder="Ex: ABC-1234"
                    className="mt-1 uppercase"
                    maxLength={8}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleSaveDriverInfo}
                    disabled={isSavingDriverInfo}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSavingDriverInfo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Salvar Dados
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                  <p className="text-sm font-semibold text-amber-900 mb-2">📱 Enviar para o Passageiro:</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleSendDriverInfo('whatsapp')}
                      disabled={isSendingNotification || !driverName || !driverPhone || !vehicleModel || !vehiclePlate}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
                    >
                      {isSendingNotification ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          WhatsApp
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => handleSendDriverInfo('email')}
                      disabled={isSendingNotification || !driverName || !driverPhone || !vehicleModel || !vehiclePlate}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      {isSendingNotification ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          E-mail
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => handleSendDriverInfo('both')}
                      disabled={isSendingNotification || !driverName || !driverPhone || !vehicleModel || !vehiclePlate}
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      {isSendingNotification ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Ambos
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-purple-900 mb-2">🚗 Enviar para o Motorista:</p>
                  <Button
                    onClick={handleSendToDriver}
                    disabled={isSendingToDriver || !driverPhone}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isSendingToDriver ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando WhatsApp ao Motorista...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Enviar Dados da Viagem ao Motorista
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-purple-700 mt-2 text-center">
                    Envia todos os detalhes da reserva para o WhatsApp do motorista
                  </p>
                </div>

                {(booking.driver_info_shared_at || booking.driver_booking_info_sent_at) && (
                  <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                    {booking.driver_info_shared_at && (
                      <p>
                        ✓ Info enviada ao passageiro: {format(new Date(booking.driver_info_shared_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                    {booking.driver_booking_info_sent_at && (
                      <p>
                        ✓ Dados enviados ao motorista: {format(new Date(booking.driver_booking_info_sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rota IDA */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Rota de Ida</span>
              {booking.transfer_type && (
                <Badge className="ml-2 bg-purple-100 text-purple-800">
                  {booking.transfer_type === 'arrival' ? 'Chegada' : 'Saída'}
                </Badge>
              )}
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
                {booking.return_transfer_type && (
                  <Badge className="ml-2 bg-purple-100 text-purple-800">
                    {booking.return_transfer_type === 'arrival' ? 'Chegada' : 'Saída'}
                  </Badge>
                )}
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

          {/* Endereço do Cliente */}
          {booking.customer_address && (
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                <span className="font-semibold text-gray-900">
                  {booking.transfer_type === 'arrival' ? 'Endereço de Destino' : 'Endereço de Origem'}
                </span>
              </div>
              <p className="ml-7 text-gray-700">{booking.customer_address}</p>
            </div>
          )}

          {/* Data e Hora - IDA */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Data (Ida)</div>
                <div className="font-semibold">
                {format(parseLocalDate(booking.date), "dd/MM/yyyy", { locale: ptBR })}
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

          {/* Data e Hora - RETORNO */}
          {booking.has_return && (
            <div className="grid md:grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-500">Data (Retorno)</div>
                  <div className="font-semibold">
                    {format(parseLocalDate(booking.return_date), "dd/MM/yyyy", { locale: ptBR })}
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

          {/* Idioma do Motorista */}
          {booking.driver_language && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-900">Idioma do Motorista</span>
              </div>
              <p className="ml-7 text-lg font-medium text-purple-900">
                {booking.driver_language === 'pt' ? 'Português' :
                 booking.driver_language === 'en' ? 'English' :
                 booking.driver_language === 'es' ? 'Español' :
                 booking.driver_language} {/* Fallback for unknown languages */}
              </p>
            </div>
          )}

          {/* Breakdown de Preços */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold mb-3">Detalhamento do Valor</h3>
            <div className="space-y-1 text-sm">
              <div className="font-medium text-gray-700 mb-2">Ida:</div>
              <div className="flex justify-between ml-4">
                <span>Preço base:</span>
                <span>{formatPrice(booking.base_price || 0)}</span>
              </div>
              {booking.additional_expenses > 0 && (
                <div className="flex justify-between ml-4">
                  <span>Despesas adicionais:</span>
                  <span>{formatPrice(booking.additional_expenses)}</span>
                </div>
              )}
              {booking.pricing_adjustments !== 0 && (
                <div className="flex justify-between ml-4">
                  <span>Ajustes de tarifa:</span>
                  <span className={booking.pricing_adjustments > 0 ? 'text-orange-600' : 'text-green-600'}>
                    {formatPrice(booking.pricing_adjustments)}
                  </span>
                </div>
              )}
              {booking.additional_items_total > 0 && (
                <div className="flex justify-between ml-4">
                  <span>Itens adicionais:</span>
                  <span>{formatPrice(booking.additional_items_total)}</span>
                </div>
              )}

              {booking.has_return && (
                <>
                  <div className="font-medium text-gray-700 mt-3 mb-2">Retorno:</div>
                  <div className="flex justify-between ml-4">
                    <span>Preço base:</span>
                    <span>{formatPrice(booking.return_base_price || 0)}</span>
                  </div>
                  {booking.return_additional_expenses > 0 && (
                    <div className="flex justify-between ml-4">
                      <span>Despesas adicionais:</span>
                      <span>{formatPrice(booking.return_additional_expenses)}</span>
                    </div>
                  )}
                  {booking.return_pricing_adjustments !== 0 && (
                    <div className="flex justify-between ml-4">
                      <span>Ajustes de tarifa:</span>
                      <span className={booking.return_pricing_adjustments > 0 ? 'text-orange-600' : 'text-green-600'}>
                        {formatPrice(booking.return_pricing_adjustments)}
                      </span>
                    </div>
                  )}
                  {booking.return_additional_items_total > 0 && (
                    <div className="flex justify-between ml-4">
                      <span>Itens adicionais:</span>
                      <span>{formatPrice(booking.return_additional_items_total)}</span>
                    </div>
                  )}

                  {booking.round_trip_discount_amount > 0 && (
                    <div className="flex justify-between font-semibold text-green-600 mt-2">
                      <span className="flex items-center gap-1">
                        <Percent className="w-4 h-4" />
                        Desconto no retorno ({booking.round_trip_discount_percentage}%):
                      </span>
                      <span>-{formatPrice(booking.round_trip_discount_amount)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                <span>Total:</span>
                <span className="text-blue-600">{formatPrice(booking.total_price)}</span>
              </div>
            </div>
          </div>

          {/* Itens Adicionais */}
          {booking.selected_additional_items && booking.selected_additional_items.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-3">Itens Adicionais</h3>
              <div className="space-y-2">
                {booking.selected_additional_items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">Quantidade: {item.quantity}</div>
                    </div>
                    <div className="font-semibold text-blue-600">
                      {formatItemPrice(item)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dados do Cliente */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg">Dados do Cliente</h3>
              {passengerTags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end max-w-[50%]">
                  {passengerTags.map(tag => (
                    <Badge 
                      key={tag.id} 
                      className={`flex items-center gap-1 ${getTagStyle(tag.tag_type)}`}
                      title={tag.notes}
                    >
                      {tag.tag_type === 'VIP' && <Star className="w-3 h-3 fill-current" />}
                      {tag.tag_type === 'Atencao' && <AlertCircle className="w-3 h-3" />}
                      {tag.tag_type}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {passengerTags.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2 text-yellow-800 font-semibold text-sm">
                  <Tag className="w-4 h-4" />
                  Observações do Passageiro (Tags)
                </div>
                <div className="space-y-2">
                  {passengerTags.map(tag => (
                    <div key={tag.id} className="text-sm text-gray-700 flex gap-2 items-start">
                      <span className="font-bold min-w-[80px] text-xs uppercase text-gray-500">{tag.tag_type}:</span>
                      <span>{tag.notes}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Nome</div>
                  <div className="font-medium">{booking.customer_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="font-medium">{booking.customer_email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Telefone</div>
                  <div className="font-medium">{booking.customer_phone}</div>
                </div>
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

          {/* Controle Manual de Status e Lembretes */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Controle Operacional</h3>

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
            
            {updateStatusSuccess && (
              <Alert className="bg-green-50 border-green-200 mb-3">
                <AlertDescription className="text-green-800">Status atualizado com sucesso!</AlertDescription>
              </Alert>
            )}
            
            {statusUpdateError && (
              <Alert variant="destructive" className="mb-3">
                <AlertDescription>{statusUpdateError}</AlertDescription>
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
                    onClick={handleManualRatingSend} 
                    disabled={isSendingRating}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSendingRating ? (
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

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600" />
                Status do Motorista (Atualização Manual)
              </label>
              <div className="flex gap-2">
                <Select
                  value={manualDriverStatus}
                  onValueChange={setManualDriverStatus}
                  disabled={isUpdatingDriverStatus}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={`Atual: ${currentDriverStatus || 'Aguardando'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="a_caminho">A Caminho</SelectItem>
                    <SelectItem value="chegou_origem">Chegou na Origem</SelectItem>
                    <SelectItem value="passageiro_embarcou">Em Viagem (Embarcou)</SelectItem>
                    <SelectItem value="chegou_destino">Chegou no Destino</SelectItem>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                    <SelectItem value="no_show">Não Compareceu (No Show)</SelectItem>
                    <SelectItem value="cancelada_motorista">Cancelada pelo Motorista</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => handleDriverStatusUpdate(manualDriverStatus)}
                  disabled={!manualDriverStatus || isUpdatingDriverStatus}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isUpdatingDriverStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use para corrigir ou avançar manualmente o status da viagem caso o motorista não consiga.
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-500 block mb-2">Status da Reserva</label>
                <Select
                  value={booking.status}
                  onValueChange={(value) => handleStatusUpdate('status', value)}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-2">Status do Pagamento</label>
                <Select
                  value={booking.payment_status}
                  onValueChange={(value) => handleStatusUpdate('payment_status', value)}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="reembolsado">Reembolsado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botão de Reenvio de Link de Pagamento */}
              {(booking.payment_status === 'aguardando' || booking.payment_status === 'falhou') && booking.status !== 'cancelada' && (
                <div className="border-t pt-4">
                  <Button
                    onClick={handleResendPaymentLink}
                    disabled={isResendingLink}
                    variant="outline"
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    {isResendingLink ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Reenviando Link...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Reenviar Link de Pagamento
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    O cliente receberá um e-mail com um novo link para finalizar o pagamento
                  </p>
                </div>
              )}

              {/* Botão de Reembolso */}
              {booking.payment_status === 'pago' && (
                <div className="border-t pt-4">
                  <Button
                    onClick={() => setShowRefundDialog(true)}
                    variant="destructive"
                    className="w-full"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Cancelar e Reembolsar Reserva
                  </Button>
                </div>
              )}

              {/* Botão de Envio Manual de Pesquisa (Apenas se concluída/finalizada) */}
              {(booking.status === 'concluida' || booking.status === 'finalizada' || booking.driver_current_status === 'finalizada' || booking.driver_trip_status === 'finalizada') && (
                <div className="border-t pt-4">
                  <Button
                    onClick={handleManualRatingSend}
                    disabled={isSendingRating}
                    variant="outline"
                    className="w-full border-green-600 text-green-600 hover:bg-green-50"
                  >
                    {isSendingRating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando Pesquisa...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Enviar Pesquisa de Satisfação (WhatsApp)
                      </>
                    )}
                  </Button>
                  {ratingSuccess && (
                    <p className="text-xs text-green-600 mt-2 text-center font-bold">
                      Pesquisa enviada com sucesso!
                    </p>
                  )}
                  {ratingError && (
                    <p className="text-xs text-red-600 mt-2 text-center">
                      {ratingError}
                    </p>
                  )}
                </div>
              )}

              {/* Informações de Reembolso (se já foi reembolsado) */}
              {booking.payment_status === 'reembolsado' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Reembolso Processado</span>
                  </div>
                  {booking.refund_date && (
                    <p className="text-sm text-gray-700">
                      Data do reembolso: {format(new Date(booking.refund_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                  {booking.refund_reason && (
                    <p className="text-sm text-gray-700 mt-1">
                      Motivo: {booking.refund_reason}
                    </p>
                  )}
                  {booking.refund_id && (
                    <p className="text-xs text-gray-500 mt-2">
                      ID do Reembolso: {booking.refund_id}
                    </p>
                  )}
                </div>
              )}
          </div>

          {/* Histórico da Viagem */}
          <div className="border-t pt-4">
            <TripHistoryView tripId={booking.id} tripType="Booking" />
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={onClose} variant="outline">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Dialog de Confirmação de Reembolso */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="w-6 h-6" />
              Confirmar Reembolso
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta ação irá cancelar a reserva e reembolsar o valor pago pelo cliente. Esta operação não pode ser desfeita.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Valor a ser reembolsado:</span>
                <span className="text-xl font-bold text-red-600">
                  {formatPrice(booking.total_price)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                O valor será estornado no cartão do cliente em 5-10 dias úteis
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund_reason">Motivo do Cancelamento *</Label>
              <Textarea
                id="refund_reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Ex: Cancelamento por indisponibilidade de motorista, problema com veículo, etc."
                className="h-24"
              />
              <p className="text-xs text-gray-500">
                Este motivo será enviado por e-mail ao cliente
              </p>
            </div>

            {refundError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{refundError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRefundDialog(false);
                setRefundReason('');
                setRefundError('');
              }}
              disabled={isRefunding}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={isRefunding || !refundReason.trim()}
            >
              {isRefunding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Confirmar Reembolso
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}