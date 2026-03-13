import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  FileText,
  Download,
  Repeat,
  XCircle,
  Plus,
  Trash2,
  DollarSign,
  Car,
  Upload,
  ImageIcon,
  BellRing,
  MessageSquare,
  PhoneCall,
  Send
} from 'lucide-react';
import TripHistoryView from './TripHistoryView';
import ServiceOrderPDFDialog from '../../components/ServiceOrderPDFDialog';
import FlightStatusChecker from '../../components/flight/FlightStatusChecker';
import PhoneInputWithCountry from '../ui/PhoneInputWithCountry';
import DriverDataSection from './DriverDataSection';
import ServiceRequestContactsTab from './ServiceRequestContactsTab';
import ServiceRequestBillingTab from './ServiceRequestBillingTab';

export default function EditServiceRequestDialog({ serviceRequest, open, onClose, onSuccess, onManageDriver, onAccept }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    date: '',
    time: '',
    return_date: '',
    return_time: '',
    hours: 5,
    service_type: 'one_way',
    passengers: 1,
    passenger_name: '',
    passenger_email: '',
    passenger_phone: '',
    notes: '',
    chosen_supplier_id: '',
    chosen_vehicle_type_id: '',
    origin_flight_number: '',
    destination_flight_number: '',
    requester_user_id: '',
    requester_full_name: '',
    requester_email: '',
    requester_phone: '',
    driver_language: 'pt',
    is_receptive_needed: false,
    receptive_performed_by: '',
    receptive_sign_url: '',
    receptive_notes: '',
    chosen_client_price: 0,
    planned_stops: [],
    billing_method: 'invoiced',
    payment_link: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passengersDetails, setPassengersDetails] = useState([]);
  const [costAllocation, setCostAllocation] = useState([]);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPDFDialog, setShowPDFDialog] = useState(false);
  const [isUploadingSign, setIsUploadingSign] = useState(false);
  
  // Estado para controle manual de status do motorista
  const [manualDriverStatus, setManualDriverStatus] = useState('');
  const [isUpdatingDriverStatus, setIsUpdatingDriverStatus] = useState(false);
  const [currentDriverStatus, setCurrentDriverStatus] = useState('');

  // Estados para lembrete manual
  const [isSendingManualReminder, setIsSendingManualReminder] = useState(false);
  const [manualReminderStatus, setManualReminderStatus] = useState('');
  const [manualReminderMessage, setManualReminderMessage] = useState('');
  const [notificationPhones, setNotificationPhones] = useState(['']);
  
  // Estado para compartilhamento manual de link
  const [manualSharePhone, setManualSharePhone] = useState('');
  const [isSharingLink, setIsSharingLink] = useState(false);

  const handleManualShareLink = async () => {
    if (!manualSharePhone || manualSharePhone.length < 10) {
      setError('Digite um número de telefone válido para compartilhar');
      return;
    }
    
    setIsSharingLink(true);
    try {
      const response = await base44.functions.invoke('generateSharedTimelineLink', {
        serviceRequestId: serviceRequest.id,
        notificationType: 'whatsapp',
        additionalPhone: manualSharePhone,
        skipPassengerNotification: true
      });
      
      if (response.data && response.data.success) {
        setSuccess(`Link enviado com sucesso para ${manualSharePhone}!`);
        setManualSharePhone('');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(response.data?.error || 'Erro ao enviar link');
      }
    } catch (err) {
      console.error('Erro ao compartilhar link:', err);
      setError(err.message || 'Erro ao compartilhar link');
    } finally {
      setIsSharingLink(false);
    }
  };

  const handleAddNotificationPhone = () => {
    setNotificationPhones([...notificationPhones, '']);
  };

  const handleRemoveNotificationPhone = (index) => {
    setNotificationPhones(notificationPhones.filter((_, i) => i !== index));
  };

  const handleNotificationPhoneChange = (index, value) => {
    const updated = [...notificationPhones];
    updated[index] = value;
    setNotificationPhones(updated);
  };

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: []
  });

  const activeSuppliers = suppliers.filter(s => s.active);

  const { data: costCenters = [] } = useQuery({
    queryKey: ['costCenters', serviceRequest?.client_id],
    queryFn: () => base44.entities.CostCenter.filter({ client_id: serviceRequest.client_id }),
    enabled: !!serviceRequest?.client_id,
    initialData: []
  });

  const { data: supplierVehicles = [] } = useQuery({
    queryKey: ['supplierVehicles', formData.chosen_supplier_id],
    queryFn: () => base44.entities.SupplierVehicleType.filter({ 
      supplier_id: formData.chosen_supplier_id,
      active: true,
      approval_status: 'approved'
    }),
    enabled: !!formData.chosen_supplier_id,
    initialData: []
  });

  const { data: clientUsers = [] } = useQuery({
    queryKey: ['clientUsers', serviceRequest?.client_id],
    queryFn: async () => {
        try {
            const res = await base44.functions.invoke('listClientUsers', { client_id: serviceRequest.client_id });
            return res.data?.users || [];
        } catch (e) {
            console.error("Erro ao buscar usuários do cliente:", e);
            return [];
        }
    },
    enabled: !!serviceRequest?.client_id,
    initialData: []
  });

  useEffect(() => {
    if (serviceRequest && open) {
      setFormData({
        origin: serviceRequest.origin || '',
        destination: serviceRequest.destination || '',
        date: serviceRequest.date || '',
        time: serviceRequest.time || '',
        return_date: serviceRequest.return_date || '',
        return_time: serviceRequest.return_time || '',
        hours: serviceRequest.hours || 5,
        service_type: serviceRequest.service_type || 'one_way',
        passengers: serviceRequest.passengers || 1,
        passenger_name: serviceRequest.passenger_name || '',
        passenger_email: serviceRequest.passenger_email || '',
        passenger_phone: serviceRequest.passenger_phone || '',
        notes: serviceRequest.notes || '',
        chosen_supplier_id: serviceRequest.chosen_supplier_id || '',
        chosen_vehicle_type_id: serviceRequest.chosen_vehicle_type_id || '',
        origin_flight_number: serviceRequest.origin_flight_number || '',
        destination_flight_number: serviceRequest.destination_flight_number || '',
        requester_user_id: serviceRequest.requester_user_id || serviceRequest.user_id || '',
        requester_full_name: serviceRequest.requester_full_name || '',
        requester_email: serviceRequest.requester_email || '',
        requester_phone: serviceRequest.requester_phone || '',
        driver_language: serviceRequest.driver_language || 'pt',
        is_receptive_needed: serviceRequest.is_receptive_needed || false,
        receptive_performed_by: serviceRequest.receptive_performed_by || '',
        receptive_sign_url: serviceRequest.receptive_sign_url || '',
        receptive_notes: serviceRequest.receptive_notes || '',
        chosen_client_price: serviceRequest.chosen_client_price || 0,
        planned_stops: serviceRequest.planned_stops || [],
        billing_method: serviceRequest.billing_method || 'invoiced',
        payment_link: serviceRequest.payment_link || ''
        });
        setPassengersDetails(serviceRequest.passengers_details || []);
        setCostAllocation(serviceRequest.cost_allocation || []);
        setNotificationPhones(serviceRequest.notification_phones && serviceRequest.notification_phones.length > 0 ? serviceRequest.notification_phones : ['']);
        setError('');
        setSuccess('');
        setCancelReason('');
        setShowCancelDialog(false);
        setCurrentDriverStatus(serviceRequest.driver_trip_status || 'aguardando');
        }
        }, [serviceRequest, open]);

  const updateMutation = useMutation({
    mutationFn: async (updatedData) => {
      const result = await base44.entities.ServiceRequest.update(serviceRequest.id, updatedData);
      
      try {
        const currentUser = await base44.auth.me();
        let changeComment = "Viagem editada manualmente pelo admin.";
        
        if (updatedData.notes !== serviceRequest.notes) {
          changeComment += " Observações foram atualizadas.";
        }

        await base44.entities.TripHistory.create({
          trip_id: serviceRequest.id,
          trip_type: 'ServiceRequest',
          event_type: 'Viagem Editada',
          user_id: currentUser.id,
          user_name: currentUser.full_name,
          comment: changeComment,
          details: {
             edited_fields: Object.keys(updatedData)
          }
        });
      } catch (histError) {
        console.error('Erro ao registrar histórico:', histError);
      }

      if (serviceRequest.chosen_supplier_id) {
        try {
          await base44.functions.invoke('notifySupplierAboutUpdate', {
            service_request_id: serviceRequest.id
          });
        } catch (notifyError) {
          console.error('Erro ao notificar fornecedor:', notifyError);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userServiceRequests'] });
      queryClient.invalidateQueries(['tripHistory', serviceRequest.id]);
      setSuccess('Solicitação atualizada com sucesso!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao atualizar solicitação');
    }
  });

  const transferSupplierMutation = useMutation({
    mutationFn: async (newSupplierId) => {
      const now = new Date().toISOString();
      const client = await base44.entities.Client.get(serviceRequest.client_id);
      const timeoutMinutes = client?.supplier_response_timeout_minutes || 60;
      const deadline = new Date();
      deadline.setMinutes(deadline.getMinutes() + timeoutMinutes);

      return await base44.entities.ServiceRequest.update(serviceRequest.id, {
        chosen_supplier_id: newSupplierId,
        supplier_response_status: 'aguardando_resposta',
        supplier_request_sent_at: now,
        supplier_response_deadline: deadline.toISOString(),
        supplier_response_at: null,
        supplier_refusal_reason: null,
        fallback_history: [
          ...(serviceRequest.fallback_history || []),
          {
            supplier_id: serviceRequest.chosen_supplier_id,
            supplier_name: suppliers.find(s => s.id === serviceRequest.chosen_supplier_id)?.name || 'Desconhecido',
            sent_at: serviceRequest.supplier_request_sent_at,
            response_at: now,
            status: 'transferido_manualmente',
            reason: 'Transferência manual pelo admin'
          }
        ]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userServiceRequests'] });
      setSuccess('Fornecedor transferido! O novo fornecedor será notificado.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao transferir fornecedor');
    }
  });

  const acceptTripMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      return await base44.entities.ServiceRequest.update(serviceRequest.id, {
        supplier_response_status: 'aceito',
        supplier_response_at: now,
        status: 'confirmada'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userServiceRequests'] });
      setSuccess('Viagem aceita com sucesso! O fornecedor será notificado.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao aceitar viagem');
    }
  });

  const cancelTripMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.entities.ServiceRequest.update(serviceRequest.id, {
        status: 'cancelada',
        supplier_response_status: 'cancelado',
        supplier_refusal_reason: cancelReason || 'Cancelado pelo administrador'
      });

      try {
        const currentUser = await base44.auth.me();
        await base44.entities.TripHistory.create({
          trip_id: serviceRequest.id,
          trip_type: 'ServiceRequest',
          event_type: 'Viagem Cancelada',
          user_id: currentUser.id,
          user_name: currentUser.full_name,
          comment: `Viagem cancelada manualmente pelo admin. Motivo: ${cancelReason || 'Não informado'}`,
          details: {
             reason: cancelReason,
             previous_status: serviceRequest.status
          }
        });

        await base44.functions.invoke('notifyDriverAboutCancellation', {
          tripId: serviceRequest.id,
          tripType: 'ServiceRequest',
          cancelReason: cancelReason
        });

      } catch (histError) {
        console.error('Erro ao registrar histórico ou notificar motorista:', histError);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userServiceRequests'] });
      setSuccess('Viagem cancelada com sucesso!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao cancelar viagem');
    }
  });

  const handleReceptiveSignUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploadingSign(true);
    setError('');

    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      handleChange('receptive_sign_url', response.file_url);
      setSuccess('Placa de receptivo enviada com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erro ao fazer upload da placa:', error);
      setError('Erro ao enviar placa. Tente novamente.');
    } finally {
      setIsUploadingSign(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const missingFields = [];
    if (!formData.origin) missingFields.push('Origem');
    if (!formData.destination) missingFields.push('Destino');
    if (!formData.date) missingFields.push('Data');
    if (!formData.time) missingFields.push('Horário');

    if (formData.is_receptive_needed) {
      if (!formData.receptive_performed_by) {
        missingFields.push('Quem fará o receptivo');
      } else if (formData.receptive_performed_by === 'other_means' && !formData.receptive_notes?.trim()) {
        missingFields.push('Descrição do receptivo (Outros Meios)');
      }
    }

    if (missingFields.length > 0) {
      setError(`Preencha os campos obrigatórios: ${missingFields.join(', ')}`);
      return;
    }

    if (costAllocation.length > 0) {
      const totalPercentage = costAllocation
        .filter(a => a.allocation_type === 'percentage')
        .reduce((sum, a) => sum + (a.allocation_value || 0), 0);
      
      if (totalPercentage > 100) {
        setError('A soma dos percentuais dos centros de custo não pode exceder 100%');
        return;
      }
    }

    if (formData.chosen_supplier_id !== serviceRequest.chosen_supplier_id) {
      if (confirm(`Deseja transferir esta solicitação para ${suppliers.find(s => s.id === formData.chosen_supplier_id)?.name}? O fornecedor anterior será notificado.`)) {
        transferSupplierMutation.mutate(formData.chosen_supplier_id);
      }
      return;
    }

    updateMutation.mutate({
      ...formData,
      passengers_details: passengersDetails,
      cost_allocation: costAllocation,
      planned_stops: formData.planned_stops,
      notification_phones: notificationPhones.filter(p => p && p.trim().length > 5)
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRequesterUserChange = (userId) => {
    const user = clientUsers.find(u => u.id === userId);
    if (user) {
        setFormData(prev => ({
            ...prev,
            requester_user_id: user.id,
            requester_full_name: user.full_name,
            requester_email: user.email,
            requester_phone: user.phone_number || prev.requester_phone
        }));
    } else if (userId === 'manual') {
        setFormData(prev => ({
            ...prev,
            requester_user_id: null,
            requester_full_name: '',
            requester_email: '',
            requester_phone: ''
        }));
    }
  };

  const handleAcceptTrip = () => {
    if (onAccept) {
      const updatedRequest = { 
        ...serviceRequest, 
        ...formData,
        chosen_client_price: parseFloat(formData.chosen_client_price || 0),
        chosen_supplier_cost: parseFloat(formData.chosen_client_price || 0) 
      };
      onAccept({
        id: updatedRequest.id,
        type: 'service_request',
        original_data: updatedRequest,
        display_id: updatedRequest.request_number,
        origin: updatedRequest.origin,
        destination: updatedRequest.destination,
        date: updatedRequest.date,
        time: updatedRequest.time
      });
      onClose();
    } else if (confirm('Deseja aceitar esta viagem em nome do fornecedor? O fornecedor será notificado sobre a confirmação.')) {
      acceptTripMutation.mutate();
    }
  };

  const handleCancelTrip = () => {
    if (!cancelReason.trim()) {
      setError('Por favor, informe o motivo do cancelamento');
      return;
    }
    if (confirm('Tem certeza que deseja cancelar esta viagem? Esta ação não pode ser desfeita.')) {
      setShowCancelDialog(false);
      cancelTripMutation.mutate();
    }
  };

  const addPlannedStop = () => {
    setFormData(prev => ({
      ...prev,
      planned_stops: [...(prev.planned_stops || []), { 
        address: '', 
        notes: '', 
        purpose: 'other',
        passenger_name: '',
        passenger_phone: '',
        status: 'pending',
        order: (prev.planned_stops?.length || 0) + 1 
      }]
    }));
  };

  const updatePlannedStop = (index, field, value) => {
    const updatedStops = [...(formData.planned_stops || [])];
    updatedStops[index] = { ...updatedStops[index], [field]: value };
    setFormData(prev => ({ ...prev, planned_stops: updatedStops }));
  };

  const handleManualReminder = async (channel) => {
    setIsSendingManualReminder(true);
    setManualReminderStatus('loading');
    setManualReminderMessage('');

    try {
      const response = await base44.functions.invoke('manualSendDriverReminder', {
        tripId: serviceRequest.id,
        tripType: 'ServiceRequest',
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

  const removePlannedStop = (index) => {
    const updatedStops = (formData.planned_stops || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, planned_stops: updatedStops }));
  };

  const handleDriverStatusUpdate = async (newStatus) => {
    if (!newStatus) return;
    setIsUpdatingDriverStatus(true);
    
    try {
      const response = await base44.functions.invoke('manualUpdateTripStatus', {
        serviceRequestId: serviceRequest.id,
        newStatus: newStatus
      });

      if (response.data && response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
        setSuccess(`Status do motorista atualizado para: ${newStatus}`);
        setCurrentDriverStatus(newStatus);
        setManualDriverStatus('');
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(response.data?.error || 'Erro ao atualizar status');
      }
    } catch (err) {
      console.error('Erro ao atualizar status manual:', err);
      setError(err.message || 'Erro ao atualizar status');
    } finally {
      setIsUpdatingDriverStatus(false);
    }
  };

  const addPassenger = () => {
    setPassengersDetails([...passengersDetails, {
      name: '',
      document_type: 'RG',
      document_number: '',
      phone_number: '',
      is_lead_passenger: false
    }]);
  };

  const updatePassenger = (index, field, value) => {
    const updated = [...passengersDetails];
    updated[index] = { ...updated[index], [field]: value };
    setPassengersDetails(updated);
  };

  const removePassenger = (index) => {
    setPassengersDetails(passengersDetails.filter((_, i) => i !== index));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  const isLoading = updateMutation.isPending || transferSupplierMutation.isPending || acceptTripMutation.isPending || cancelTripMutation.isPending;

  if (!serviceRequest) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Editar Solicitação - {serviceRequest.request_number}
          </DialogTitle>
          <DialogDescription className="hidden">
            Formulário para edição de detalhes da solicitação de serviço
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-300">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">{success}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="details" className="w-full flex-1">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="contacts">Contatos</TabsTrigger>
                <TabsTrigger value="operational">Operacional</TabsTrigger>
                <TabsTrigger value="billing">Faturamento</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>

              <div className="mt-4 space-y-4">
                {/* ABA 1: DETALHES DA VIAGEM */}
                <TabsContent value="details" className="space-y-6">
                  {/* Tipo de Serviço e Idioma */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="service_type" className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-600" />
                        Tipo de Serviço *
                      </Label>
                      <Select
                        value={formData.service_type}
                        onValueChange={(value) => handleChange('service_type', value)}
                      >
                        <SelectTrigger id="service_type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one_way">Só Ida</SelectItem>
                          <SelectItem value="round_trip">Ida e Volta</SelectItem>
                          <SelectItem value="hourly">Por Hora</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="driver_language" className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-600" />
                        Idioma do Motorista
                      </Label>
                      <Select
                        value={formData.driver_language}
                        onValueChange={(value) => handleChange('driver_language', value)}
                      >
                        <SelectTrigger id="driver_language" className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pt">Português (Padrão)</SelectItem>
                          <SelectItem value="en">Inglês (Bilingue)</SelectItem>
                          <SelectItem value="es">Espanhol (Bilingue)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Origem e Destino */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="origin" className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        Origem *
                      </Label>
                      <Input
                        id="origin"
                        value={formData.origin}
                        onChange={(e) => handleChange('origin', e.target.value)}
                        placeholder="Endereço de origem"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="destination" className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-green-600" />
                        Destino {formData.service_type === 'hourly' ? '(Opcional)' : '*'}
                      </Label>
                      <Input
                        id="destination"
                        value={formData.destination}
                        onChange={(e) => handleChange('destination', e.target.value)}
                        placeholder="Endereço de destino"
                        required={formData.service_type !== 'hourly'}
                      />
                    </div>
                  </div>

                  {/* Paradas Planejadas */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="flex items-center gap-2 text-gray-700">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        Paradas / Pontos Intermediários
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPlannedStop}
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Adicionar Parada
                      </Button>
                    </div>
                    
                    {formData.planned_stops && formData.planned_stops.length > 0 ? (
                      <div className="space-y-4 pl-4 border-l-2 border-orange-100">
                        {formData.planned_stops.map((stop, idx) => (
                          <div key={idx} className="space-y-2 p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-orange-700 uppercase">Parada {idx + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removePlannedStop(idx)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs">Endereço *</Label>
                                <Input
                                  value={stop.address}
                                  onChange={(e) => updatePlannedStop(idx, 'address', e.target.value)}
                                  placeholder="Endereço completo"
                                  className="text-sm"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Ação na Parada</Label>
                                <Select
                                  value={stop.purpose || 'other'}
                                  onValueChange={(value) => updatePlannedStop(idx, 'purpose', value)}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pickup">Buscar Passageiro</SelectItem>
                                    <SelectItem value="dropoff">Deixar Passageiro</SelectItem>
                                    <SelectItem value="wait">Aguardar</SelectItem>
                                    <SelectItem value="other">Outros</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {(stop.purpose === 'pickup' || stop.purpose === 'dropoff') && (
                                <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
                                  <div>
                                    <Label className="text-xs">Nome Passageiro</Label>
                                    <Input
                                      value={stop.passenger_name || ''}
                                      onChange={(e) => updatePlannedStop(idx, 'passenger_name', e.target.value)}
                                      placeholder="Nome"
                                      className="text-xs h-8 bg-white"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Telefone (Notificação)</Label>
                                    <PhoneInputWithCountry
                                      value={stop.passenger_phone || ''}
                                      onChange={(value) => updatePlannedStop(idx, 'passenger_phone', value)}
                                      placeholder="(11) 99999-9999"
                                      className="text-xs h-8 bg-white"
                                    />
                                  </div>
                                </div>
                              )}

                              <div>
                                <Label className="text-xs">Observações</Label>
                                <Input
                                  value={stop.notes}
                                  onChange={(e) => updatePlannedStop(idx, 'notes', e.target.value)}
                                  placeholder="Detalhes adicionais (opcional)"
                                  className="text-xs h-8 bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic ml-1">Nenhuma parada adicional.</p>
                    )}
                  </div>

                  {/* Números de Voo */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start mb-1">
                        <Label htmlFor="origin_flight_number">Número do Voo (Origem)</Label>
                        <FlightStatusChecker 
                          flightNumber={formData.origin_flight_number} 
                          date={formData.date}
                        />
                      </div>
                      <Input
                        id="origin_flight_number"
                        value={formData.origin_flight_number}
                        onChange={(e) => handleChange('origin_flight_number', e.target.value)}
                        placeholder="Ex: G31234"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-start mb-1">
                        <Label htmlFor="destination_flight_number">Número do Voo (Destino)</Label>
                        <FlightStatusChecker 
                          flightNumber={formData.destination_flight_number} 
                          date={formData.date}
                        />
                      </div>
                      <Input
                        id="destination_flight_number"
                        value={formData.destination_flight_number}
                        onChange={(e) => handleChange('destination_flight_number', e.target.value)}
                        placeholder="Ex: G35678"
                      />
                    </div>
                  </div>

                  {/* Data, Hora, Passageiros */}
                  {formData.service_type === 'hourly' ? (
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          Data *
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => handleChange('date', e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="time" className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-600" />
                          Horário *
                        </Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.time}
                          onChange={(e) => handleChange('time', e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hours" className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          Horas *
                        </Label>
                        <Input
                          id="hours"
                          type="number"
                          min="1"
                          value={formData.hours}
                          onChange={(e) => handleChange('hours', parseInt(e.target.value))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="passengers" className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600" />
                          Passageiros *
                        </Label>
                        <Input
                          id="passengers"
                          type="number"
                          min="1"
                          value={formData.passengers}
                          onChange={(e) => handleChange('passengers', parseInt(e.target.value))}
                          required
                        />
                      </div>
                    </div>
                  ) : formData.service_type === 'round_trip' ? (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="date" className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-600" />
                            Data Ida *
                          </Label>
                          <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="time" className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-600" />
                            Horário Ida *
                          </Label>
                          <Input
                            id="time"
                            type="time"
                            value={formData.time}
                            onChange={(e) => handleChange('time', e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="passengers" className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-600" />
                            Passageiros *
                          </Label>
                          <Input
                            id="passengers"
                            type="number"
                            min="1"
                            value={formData.passengers}
                            onChange={(e) => handleChange('passengers', parseInt(e.target.value))}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="return_date" className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-green-600" />
                            Data Retorno *
                          </Label>
                          <Input
                            id="return_date"
                            type="date"
                            value={formData.return_date}
                            onChange={(e) => handleChange('return_date', e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="return_time" className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-600" />
                            Horário Retorno *
                          </Label>
                          <Input
                            id="return_time"
                            type="time"
                            value={formData.return_time}
                            onChange={(e) => handleChange('return_time', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date" className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          Data *
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => handleChange('date', e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="time" className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-600" />
                          Horário *
                        </Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.time}
                          onChange={(e) => handleChange('time', e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="passengers" className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600" />
                          Passageiros *
                        </Label>
                        <Input
                          id="passengers"
                          type="number"
                          min="1"
                          value={formData.passengers}
                          onChange={(e) => handleChange('passengers', parseInt(e.target.value))}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Preço da Viagem (Editável) */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-blue-900 flex items-center gap-2">
                           <DollarSign className="w-5 h-5" />
                           Valor Total da Viagem (Editável)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-bold text-lg">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.chosen_client_price}
                          onChange={(e) => handleChange('chosen_client_price', e.target.value)}
                          className="text-xl font-bold text-blue-700 bg-white w-full"
                        />
                      </div>
                  </div>
                </TabsContent>

                {/* ABA 2: CONTATOS E PASSAGEIROS */}
                <TabsContent value="contacts">
                  <ServiceRequestContactsTab
                    serviceRequest={serviceRequest}
                    formData={formData}
                    handleChange={handleChange}
                    clientUsers={clientUsers}
                    handleRequesterUserChange={handleRequesterUserChange}
                    passengersDetails={passengersDetails}
                    addPassenger={addPassenger}
                    updatePassenger={updatePassenger}
                    removePassenger={removePassenger}
                    isUploadingSign={isUploadingSign}
                    handleReceptiveSignUpload={handleReceptiveSignUpload}
                  />
                </TabsContent>

                {/* ABA 3: OPERACIONAL */}
                <TabsContent value="operational" className="space-y-6">
                  {/* Fornecedor e Veículo */}
                  <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Repeat className="w-5 h-5 text-amber-600" />
                        <h3 className="font-semibold text-amber-900">Fornecedor e Veículo</h3>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="text-sm text-amber-800">
                        <strong>Fornecedor Atual:</strong>{' '}
                        {suppliers.find(s => s.id === serviceRequest.chosen_supplier_id)?.name || 'Não encontrado'}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="chosen_supplier_id">Fornecedor</Label>
                        <Select
                          value={formData.chosen_supplier_id}
                          onValueChange={(value) => {
                            handleChange('chosen_supplier_id', value);
                            handleChange('chosen_vehicle_type_id', ''); // Limpar veículo ao trocar fornecedor
                          }}
                        >
                          <SelectTrigger id="chosen_supplier_id">
                            <SelectValue placeholder="Selecione um fornecedor" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeSuppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.chosen_supplier_id && (
                        <div className="space-y-2">
                          <Label htmlFor="chosen_vehicle_type_id">Tipo de Veículo</Label>
                          <Select
                            value={formData.chosen_vehicle_type_id}
                            onValueChange={(value) => handleChange('chosen_vehicle_type_id', value)}
                          >
                            <SelectTrigger id="chosen_vehicle_type_id">
                              <SelectValue placeholder="Selecione um tipo de veículo" />
                            </SelectTrigger>
                            <SelectContent>
                              {supplierVehicles.map((vehicle) => (
                                <SelectItem key={vehicle.id} value={vehicle.id}>
                                  {vehicle.name} - {vehicle.max_passengers} passageiros
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {formData.chosen_supplier_id !== serviceRequest.chosen_supplier_id && (
                        <Alert className="bg-red-50 border-red-300">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-900 text-sm">
                            <strong>⚠️ Atenção:</strong> Ao salvar, a solicitação será transferida para o novo fornecedor.
                            O fornecedor anterior será notificado sobre a transferência.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>

                  {/* Dados do Motorista (Componente Extraído) */}
                  <DriverDataSection 
                    serviceRequest={serviceRequest}
                    formData={formData}
                    passengersDetails={passengersDetails}
                    onManageDriver={onManageDriver}
                  />

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
                                  type="button"
                                  onClick={() => handleManualReminder('whatsapp')}
                                  disabled={isSendingManualReminder}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                  {isSendingManualReminder ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <MessageSquare className="w-3 h-3 mr-1" />}
                                  WhatsApp
                              </Button>
                              <Button
                                  type="button"
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

                  {/* Notificações em Tempo Real */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <BellRing className="w-5 h-5" />
                      Notificações da Viagem (Links de Rastreamento)
                    </h3>
                    <p className="text-sm text-blue-700 mb-4">
                      Adicione números de WhatsApp para receber o link da timeline quando a viagem iniciar.
                    </p>

                    <div className="space-y-3">
                      {notificationPhones.map((phone, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="flex-1">
                            <PhoneInputWithCountry
                              value={phone}
                              onChange={(value) => handleNotificationPhoneChange(index, value)}
                              placeholder="(00) 00000-0000"
                              className="bg-white"
                            />
                          </div>
                          {notificationPhones.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveNotificationPhone(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddNotificationPhone}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar outro telefone
                      </Button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <Label className="text-xs font-bold text-blue-800 mb-2 block">Compartilhar link agora com outro número (Avulso)</Label>
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <PhoneInputWithCountry
                            value={manualSharePhone}
                            onChange={setManualSharePhone}
                            placeholder="(00) 00000-0000"
                            className="bg-white"
                          />
                        </div>
                        <Button
                          type="button"
                          size="default"
                          onClick={handleManualShareLink}
                          disabled={isSharingLink || !manualSharePhone}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isSharingLink ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                          Enviar Agora
                        </Button>
                      </div>
                      <p className="text-[10px] text-blue-600 mt-1">
                        Envia o link de rastreamento imediatamente para este número via WhatsApp.
                      </p>
                    </div>
                  </div>

                  {/* Controle de Status do Motorista (Manual) */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-2">
                      <Car className="w-4 h-4 text-blue-600" />
                      Status do Motorista (Atualização Manual)
                    </label>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Select
                          value={manualDriverStatus}
                          onValueChange={(value) => {
                            setManualDriverStatus(value);
                            handleDriverStatusUpdate(value);
                          }}
                          disabled={isUpdatingDriverStatus}
                        >
                          <SelectTrigger className="bg-white">
                            <div className="flex items-center gap-2">
                              {isUpdatingDriverStatus && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
                              <SelectValue placeholder={`Atual: ${currentDriverStatus || 'Aguardando'}`} />
                            </div>
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
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Atualize manualmente o status da viagem se o motorista não puder fazê-lo. Isso afetará o status geral da solicitação.
                    </p>
                  </div>

                  {/* Necessário Receptivo */}
                  <div className="flex flex-col space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_receptive_needed"
                        checked={formData.is_receptive_needed}
                        onChange={(e) => handleChange('is_receptive_needed', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <Label htmlFor="is_receptive_needed" className="text-sm font-medium text-gray-700">
                        Necessário Receptivo? (Ex: Placa em Aeroporto)
                      </Label>
                    </div>

                    {formData.is_receptive_needed && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pl-6 border-l-2 border-blue-200">
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-indigo-600" />
                            Receptivo será efetuado por: *
                          </Label>
                          <Select 
                            value={formData.receptive_performed_by} 
                            onValueChange={(value) => handleChange('receptive_performed_by', value)}
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Selecione quem fará o receptivo..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="driver">Motorista</SelectItem>
                              <SelectItem value="contracted_company">Empresa Contratada</SelectItem>
                              <SelectItem value="other_means">Outros Meios</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {(formData.receptive_performed_by === 'driver' || formData.receptive_performed_by === 'contracted_company') && (
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Upload da Placa de Receptivo *</Label>
                            
                            {formData.receptive_sign_url && (
                              <div className="flex justify-center">
                                <img
                                  src={formData.receptive_sign_url}
                                  alt="Placa de Receptivo"
                                  className="max-w-full h-48 object-contain border-4 border-indigo-200 rounded-lg shadow-lg bg-white"
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-center w-full">
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-indigo-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-indigo-50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  {isUploadingSign ? (
                                    <>
                                      <Loader2 className="w-8 h-8 mb-2 text-indigo-500 animate-spin" />
                                      <p className="text-sm text-indigo-600">Enviando placa...</p>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-8 h-8 mb-2 text-indigo-500" />
                                      <p className="mb-2 text-sm text-gray-600">
                                        <span className="font-semibold">Clique para enviar</span> a placa
                                      </p>
                                      <p className="text-xs text-gray-500">Foto da placa com nome do passageiro</p>
                                    </>
                                  )}
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={handleReceptiveSignUpload}
                                  disabled={isUploadingSign}
                                />
                              </label>
                            </div>
                          </div>
                        )}

                        {formData.receptive_performed_by === 'other_means' && (
                          <div className="space-y-2">
                            <Label htmlFor="receptive_notes">Descreva como será feito o receptivo: *</Label>
                            <Textarea
                              id="receptive_notes"
                              value={formData.receptive_notes}
                              onChange={(e) => handleChange('receptive_notes', e.target.value)}
                              placeholder="Ex: Passageiro irá até o balcão da empresa no saguão..."
                              className="h-20 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ABA 4: FATURAMENTO E OBSERVAÇÕES */}
                <TabsContent value="billing" className="space-y-6">
                  <ServiceRequestBillingTab
                    formData={formData}
                    handleChange={handleChange}
                    serviceRequest={serviceRequest}
                    costCenters={costCenters}
                    costAllocation={costAllocation}
                    setCostAllocation={setCostAllocation}
                    formatPrice={formatPrice}
                  />
                </TabsContent>

                {/* ABA 5: HISTÓRICO */}
                <TabsContent value="history">
                  <div className="pt-2">
                    <TripHistoryView tripId={serviceRequest.id} tripType="ServiceRequest" />
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="flex gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Fechar
              </Button>

              <Button
                type="button"
                onClick={() => setShowPDFDialog(true)}
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-transparent"
                title="Baixar Ordem de Serviço"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar OS
              </Button>

              {!['concluida', 'cancelada'].includes(serviceRequest.status) && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cancelar Viagem
                </Button>
              )}

              {serviceRequest.chosen_supplier_id && 
               serviceRequest.supplier_response_status !== 'aceito' && 
               !['confirmada', 'em_andamento', 'concluida', 'cancelada'].includes(serviceRequest.status) && (
                <Button
                  type="button"
                  onClick={handleAcceptTrip}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {acceptTripMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Aceitando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aceitar Viagem
                    </>
                  )}
                </Button>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </DialogFooter>
        </form>

        {/* Dialog de Cancelamento */}
        {showCancelDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Cancelar Viagem
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Informe o motivo do cancelamento. Esta ação não pode ser desfeita.
              </p>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Cliente solicitou cancelamento, horário conflitante, etc."
                rows={3}
                className="mb-4"
              />
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCancelDialog(false);
                    setError('');
                  }}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancelTrip}
                  disabled={cancelTripMutation.isPending}
                >
                  {cancelTripMutation.isPending ? (
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
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <ServiceOrderPDFDialog
      serviceRequest={serviceRequest}
      open={showPDFDialog}
      onClose={() => setShowPDFDialog(false)}
    />
    </>
  );
}