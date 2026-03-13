import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { 
  Car, 
  UserPlus, 
  Loader2, 
  Upload, 
  Save, 
  Send, 
  MessageSquare, 
  Mail, 
  AlertCircle, 
  CheckCircle, 
  Star,
  Plus,
  DollarSign,
  Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';

export default function AdminManageDriverDialog({ trip, type, open, onClose }) {
  const queryClient = useQueryClient();
  const [selectedDriverId, setSelectedDriverId] = useState('new');
  const [selectedDriverVehicleId, setSelectedDriverVehicleId] = useState('new');
  const [driverVehicles, setDriverVehicles] = useState([]);

  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPhotoUrl, setDriverPhotoUrl] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [driverPayoutAmount, setDriverPayoutAmount] = useState('');
  const [driverNotes, setDriverNotes] = useState('');
  
  const [driverSchedule, setDriverSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passengerFavorites, setPassengerFavorites] = useState(new Set());
  const [passengerTags, setPassengerTags] = useState([]);

  // Buscar motoristas favoritos e TAGS do passageiro
  useEffect(() => {
    const fetchData = async () => {
        if (!trip) return;
        
        // 1. Buscar Favoritos
        const targetUserIds = [];
        if (trip.user_id) targetUserIds.push(trip.user_id);
        if (trip.passenger_user_id && trip.passenger_user_id !== trip.user_id) targetUserIds.push(trip.passenger_user_id);
        
        if (targetUserIds.length > 0) {
            try {
                const promises = targetUserIds.map(uid => base44.entities.FavoriteDriver.filter({ user_id: uid }));
                const results = await Promise.all(promises);
                const favIds = new Set();
                results.flat().forEach(fav => favIds.add(fav.driver_id));
                setPassengerFavorites(favIds);
            } catch (err) {
                console.error('Erro ao buscar favoritos:', err);
            }
        }

        // 2. Buscar Tags de Passageiro
        try {
            // Identificadores possíveis: ID do usuário, email do passageiro, telefone do passageiro
            const identifiers = new Set();
            if (trip.user_id) identifiers.add(trip.user_id);
            if (trip.passenger_user_id) identifiers.add(trip.passenger_user_id);
            if (trip.passenger_email) identifiers.add(trip.passenger_email);
            if (trip.passenger_phone) identifiers.add(trip.passenger_phone);
            
            // Também buscar pelo email do solicitante se for diferente
            if (trip.requester_email) identifiers.add(trip.requester_email);

            if (identifiers.size > 0) {
                const allTags = await base44.entities.PassengerTag.filter({ is_active: true });
                const matchingTags = allTags.filter(tag => identifiers.has(tag.passenger_identifier));
                setPassengerTags(matchingTags);
            }
        } catch (err) {
            console.error('Erro ao buscar tags:', err);
        }
    };
    fetchData();
  }, [trip]);

  // Determinar o ID do fornecedor baseado no tipo
  const supplierId = React.useMemo(() => {
    if (!trip) return null;
    if (type === 'booking') return trip.supplier_id;
    if (type === 'service_request') return trip.chosen_supplier_id;
    if (type === 'supplier_own_booking') return trip.supplier_id;
    return null;
  }, [trip, type]);

  // Buscar motoristas do fornecedor
  const { data: drivers = [] } = useQuery({
    queryKey: ['adminSupplierDrivers', supplierId],
    queryFn: () => base44.entities.Driver.filter({
      supplier_id: supplierId,
      active: true
    }),
    enabled: !!supplierId,
    initialData: []
  });

  // Buscar veículos dos motoristas
  const { data: allDriverVehicles = [] } = useQuery({
    queryKey: ['adminAllDriverVehicles', drivers],
    queryFn: async () => {
      if (drivers.length === 0) return [];
      const driverIds = drivers.map(d => d.id);
      const allVehicles = await Promise.all(
        driverIds.map(driverId =>
          base44.entities.DriverVehicle.filter({
            driver_id: driverId,
            active: true
          })
        )
      );
      return allVehicles.flat();
    },
    enabled: drivers.length > 0,
    initialData: []
  });

  useEffect(() => {
    if (trip && open) {
      // Prioridade: Motorista Eventual -> Subcontratado -> Motorista da Frota
      if (trip.is_casual_driver) {
        setDriverName(trip.casual_driver_name || '');
        setDriverPhone(trip.casual_driver_phone || '+55');
        setVehicleModel(trip.casual_driver_vehicle_model || '');
        setVehiclePlate(trip.casual_driver_vehicle_plate || '');
        setSelectedDriverId('new');
        setDriverVehicles([]);
        setSelectedDriverVehicleId('new');
      } else if (trip.subcontractor_driver_name) {
        setDriverName(trip.subcontractor_driver_name || '');
        setDriverPhone(trip.subcontractor_driver_phone || '+55');
        setVehicleModel(trip.subcontractor_vehicle_model || '');
        setVehiclePlate(trip.subcontractor_vehicle_plate || '');
        setSelectedDriverId('new');
        setDriverVehicles([]);
        setSelectedDriverVehicleId('new');
      } else {
        setDriverName(trip.driver_name || '');
        setDriverPhone(trip.driver_phone || '+55');
        setVehicleModel(trip.vehicle_model || '');
        setVehiclePlate(trip.vehicle_plate || '');

        if (trip.driver_name) {
          const existingDriver = drivers.find(d => d.name === trip.driver_name);
          if (existingDriver) {
            setSelectedDriverId(existingDriver.id);
            const vehicles = allDriverVehicles.filter(v => v.driver_id === existingDriver.id);
            setDriverVehicles(vehicles);
            
            const existingVehicle = vehicles.find(v => v.vehicle_plate === trip.vehicle_plate);
            if (existingVehicle) {
              setSelectedDriverVehicleId(existingVehicle.id);
            } else {
              setSelectedDriverVehicleId('new');
            }
          } else {
            setSelectedDriverId('new');
            setSelectedDriverVehicleId('new');
            setDriverVehicles([]);
          }
        } else {
          setSelectedDriverId('new');
          setSelectedDriverVehicleId('new');
          setDriverVehicles([]);
        }
      }

      setDriverEmail(trip.driver_email || '');
      setDriverPhotoUrl(trip.driver_photo_url || '');
      setDriverPayoutAmount(trip.driver_payout_amount || '');
      setDriverNotes(trip.driver_notes || '');
      
      setError('');
      setSuccess('');
    }
  }, [trip, open, drivers, allDriverVehicles]);

  const handleDriverSelection = async (driverId) => {
    setSelectedDriverId(driverId);
    setDriverSchedule([]);

    if (driverId === 'new') {
      setDriverName('');
      setDriverPhone('+55');
      setDriverEmail('');
      setDriverPhotoUrl('');
      setVehicleModel('');
      setVehiclePlate('');
      setDriverVehicles([]);
      setSelectedDriverVehicleId('new');
    } else {
      const driver = drivers.find(d => d.id === driverId);
      if (driver) {
        setDriverName(driver.name);
        setDriverPhone(driver.phone_number);
        setDriverEmail(driver.email || '');
        setDriverPhotoUrl(driver.photo_url || '');

        const vehiclesForDriver = allDriverVehicles.filter(v => v.driver_id === driverId);
        setDriverVehicles(vehiclesForDriver);

        if (vehiclesForDriver.length === 1) {
          const vehicle = vehiclesForDriver[0];
          setVehicleModel(vehicle.vehicle_model);
          setVehiclePlate(vehicle.vehicle_plate);
          setSelectedDriverVehicleId(vehicle.id);
        } else {
          setVehicleModel('');
          setVehiclePlate('');
          setSelectedDriverVehicleId('');
        }

        // Buscar agenda
        if (trip.date) {
          setLoadingSchedule(true);
          try {
            const scheduleRes = await base44.functions.invoke('getDriverSchedule', { 
              driver_id: driverId, 
              date: trip.date 
            });
            if (scheduleRes.data?.trips) {
              setDriverSchedule(scheduleRes.data.trips);
            }
          } catch (err) {
            console.error("Erro ao buscar agenda:", err);
          } finally {
            setLoadingSchedule(false);
          }
        }
      }
    }
  };

  const handleDriverVehicleSelection = (vehicleId) => {
    setSelectedDriverVehicleId(vehicleId);

    if (vehicleId === 'new') {
      setVehicleModel('');
      setVehiclePlate('');
    } else {
      const vehicle = driverVehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        setVehicleModel(vehicle.vehicle_model);
        setVehiclePlate(vehicle.vehicle_plate);
      }
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setDriverPhotoUrl(response.file_url);
      setSuccess('Foto enviada com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setError('Erro ao enviar foto.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!driverName || !driverPhone || !vehicleModel || !vehiclePlate) {
        throw new Error('Por favor, preencha todos os campos obrigatórios.');
      }

      const commonData = {
        driver_id: selectedDriverId !== 'new' ? selectedDriverId : null,
        driver_name: driverName,
        driver_phone: driverPhone,
        driver_email: driverEmail,
        driver_photo_url: driverPhotoUrl,
        vehicle_model: vehicleModel,
        vehicle_plate: vehiclePlate,
        driver_notes: driverNotes,
      };

      const timestamp = new Date().toISOString();

      if (type === 'service_request') {
        return await base44.functions.invoke('updateServiceRequestDriverInfo', {
          serviceRequestId: trip.id,
          ...commonData,
          driver_payout_amount: parseFloat(driverPayoutAmount) || 0
        });
      } else if (type === 'supplier_own_booking') {
        return await base44.entities.SupplierOwnBooking.update(trip.id, {
          ...commonData,
          driver_payout_amount: parseFloat(driverPayoutAmount) || 0,
          status: trip.status === 'pendente' ? 'confirmada' : trip.status,
          driver_id: selectedDriverId !== 'new' ? selectedDriverId : null,
          driver_info_last_updated_at: timestamp
        });
      } else if (type === 'booking') {
        return await base44.entities.Booking.update(trip.id, {
          ...commonData,
          driver_payout_amount: parseFloat(driverPayoutAmount) || 0,
          driver_reminder_1h_sent_at: null,
          driver_info_last_updated_at: timestamp
        });
      }
    },
    onMutate: async () => {
      // Optimistic Update
      setIsSaving(true);
      setError('');
      
      // Determine query key
      const queryKey = type === 'service_request' ? ['serviceRequests'] : 
                       type === 'booking' ? ['bookings'] : ['supplierOwnBookings'];
      
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;
        return old.map(item => {
          if (item.id === trip.id) {
             return {
                ...item,
                driver_name: driverName,
                driver_phone: driverPhone,
                vehicle_model: vehicleModel,
                vehicle_plate: vehiclePlate,
                driver_trip_status: item.driver_trip_status || 'aguardando'
             };
          }
          return item;
        });
      });
      
      return { previousData, queryKey };
    },
    onError: (err, newTodo, context) => {
       setError(err.message || 'Erro ao salvar dados');
       if (context?.queryKey) {
         queryClient.setQueryData(context.queryKey, context.previousData);
       }
    },
    onSettled: (data, error, variables, context) => {
       setIsSaving(false);
       if (context?.queryKey) {
         queryClient.invalidateQueries({ queryKey: context.queryKey });
       }
    },
    onSuccess: () => {
      setSuccess('Dados salvos com sucesso!');
      setTimeout(() => setSuccess(''), 2500);
    }
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleNotify = async (target) => {
    setError('');
    setSuccess('');
    setIsSending(true);

    try {
      if (target === 'driver') {
        // Notificar Motorista
        if (type === 'booking') {
          await base44.functions.invoke('sendBookingDetailsToDriver', { bookingId: trip.id });
        } else {
          await base44.functions.invoke('notifyDriverAboutTrip', {
            serviceRequestId: trip.id,
            notificationType: 'whatsapp'
          });
        }
        setSuccess('Motorista notificado!');
      } else {
        // Notificar Passageiro (Email/WhatsApp)
        if (type === 'booking') {
          await base44.functions.invoke('sendDriverInfoNotification', {
            bookingId: trip.id,
            notificationType: target
          });
        } else {
          await base44.functions.invoke('sendDriverInfoToPassengers', {
            serviceRequestId: trip.id,
            notificationType: target
          });
        }
        setSuccess(`Notificação enviada (${target})!`);
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao enviar notificação: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSending(false);
    }
  };

  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Car className="w-6 h-6 text-blue-600" />
            Gerenciar Motorista e Veículo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* ALERTAS DE TAGS DE PASSAGEIRO */}
          {passengerTags.length > 0 && (
            <div className="space-y-2">
                {passengerTags.map(tag => (
                    <Alert key={tag.id} className={`${
                        tag.tag_type === 'VIP' ? 'bg-purple-50 border-purple-200' :
                        tag.tag_type === 'Restricao' ? 'bg-red-50 border-red-200' :
                        tag.tag_type === 'Preferencia' ? 'bg-blue-50 border-blue-200' :
                        'bg-amber-50 border-amber-200'
                    }`}>
                        <div className="flex items-start gap-2">
                            {tag.tag_type === 'VIP' && <Star className="h-5 w-5 text-purple-600 mt-0.5" />}
                            {tag.tag_type === 'Restricao' && <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />}
                            {tag.tag_type === 'Preferencia' && <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />}
                            {(tag.tag_type === 'Atencao' || tag.tag_type === 'Outros') && <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />}
                            
                            <div>
                                <h4 className={`font-bold text-sm ${
                                    tag.tag_type === 'VIP' ? 'text-purple-900' :
                                    tag.tag_type === 'Restricao' ? 'text-red-900' :
                                    tag.tag_type === 'Preferencia' ? 'text-blue-900' :
                                    'text-amber-900'
                                }`}>
                                    {tag.tag_type.toUpperCase()}: {tag.passenger_name || 'Passageiro'}
                                </h4>
                                <AlertDescription className={`mt-1 ${
                                    tag.tag_type === 'VIP' ? 'text-purple-800' :
                                    tag.tag_type === 'Restricao' ? 'text-red-800' :
                                    tag.tag_type === 'Preferencia' ? 'text-blue-800' :
                                    'text-amber-800'
                                }`}>
                                    {tag.notes}
                                </AlertDescription>
                            </div>
                        </div>
                    </Alert>
                ))}
            </div>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Selecionar Motorista (da base do fornecedor)
            </Label>

            <Select value={selectedDriverId} onValueChange={handleDriverSelection}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha um motorista..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">➕ Novo Motorista (Eventual)</SelectItem>
                {[...drivers].sort((a, b) => {
                    // Colocar favoritos no topo
                    const aFav = passengerFavorites.has(a.id);
                    const bFav = passengerFavorites.has(b.id);
                    if (aFav && !bFav) return -1;
                    if (!aFav && bFav) return 1;
                    return (a.name || '').localeCompare(b.name || '');
                }).map((driver) => (
                  <SelectItem key={driver.id} value={driver.id} className={passengerFavorites.has(driver.id) ? "bg-yellow-50 text-yellow-900 font-medium" : ""}>
                    {passengerFavorites.has(driver.id) ? "⭐ " : ""}{driver.name} - {driver.phone_number}
                    {passengerFavorites.has(driver.id) && " (Favorito do Passageiro)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agenda do Motorista */}
          {selectedDriverId && selectedDriverId !== 'new' && trip.date && (
            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs -mt-2 mb-4">
              <div className="flex items-center gap-2 font-semibold text-blue-800 mb-2">
                <Calendar className="w-3.5 h-3.5" />
                Agenda em {new Date(trip.date).toLocaleDateString()}:
              </div>
              
              {loadingSchedule ? (
                <div className="flex items-center text-blue-600 py-2">
                  <Loader2 className="w-3 h-3 animate-spin mr-2" /> Verificando disponibilidade...
                </div>
              ) : driverSchedule.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {driverSchedule.map((t, idx) => (
                    <div key={idx} className="flex gap-2 items-start border-l-2 border-blue-400 pl-2 bg-white/50 p-1 rounded">
                      <div className="font-bold text-blue-700 w-10 shrink-0">{t.time}</div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium text-gray-800">{t.origin}</div>
                        <div className="truncate text-gray-500">→ {t.destination}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-green-600 italic py-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Nenhuma viagem agendada para este dia.
                </div>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nome do Motorista *</Label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
            </div>
            <div>
              <Label>Telefone *</Label>
              <PhoneInputWithCountry value={driverPhone} onChange={(value) => setDriverPhone(value)} />
            </div>
          </div>

          <div>
            <Label>Email do Motorista (para notificações)</Label>
            <Input type="email" value={driverEmail} onChange={(e) => setDriverEmail(e.target.value)} placeholder="motorista@exemplo.com" />
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Car className="w-5 h-5 text-purple-600" />
              Veículo
            </Label>

            {selectedDriverId !== 'new' && driverVehicles.length > 0 && (
              <Select value={selectedDriverVehicleId} onValueChange={handleDriverVehicleSelection}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o veículo..." />
                </SelectTrigger>
                <SelectContent>
                  {driverVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.vehicle_model} - {v.vehicle_plate} {v.is_default ? '⭐' : ''}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">➕ Outro Veículo</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Modelo *</Label>
                <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Ex: Corolla Preto" />
              </div>
              <div>
                <Label>Placa *</Label>
                <Input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())} placeholder="ABC-1234" />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Foto do Motorista</Label>
                <div className="flex items-center gap-4">
                   {driverPhotoUrl && <img src={driverPhotoUrl} className="w-12 h-12 rounded-full object-cover" alt="Motorista" />}
                   <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md text-sm flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
                   </label>
                </div>
             </div>
             
             <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Pagamento ao Motorista
                </Label>
                <Input 
                  type="number" 
                  value={driverPayoutAmount} 
                  onChange={(e) => setDriverPayoutAmount(e.target.value)} 
                  placeholder="0.00"
                />
             </div>
          </div>

          <div className="space-y-2">
             <Label>Observações para o Motorista</Label>
             <Textarea value={driverNotes} onChange={(e) => setDriverNotes(e.target.value)} placeholder="Instruções especiais..." />
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
             <Button onClick={handleSave} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Dados
             </Button>

             {/* Seção de Notificação */}
             <div className={`mt-2 p-3 rounded-lg border ${
                (!trip.driver_notification_sent_at || new Date(trip.driver_info_last_updated_at || 0) > new Date(trip.driver_notification_sent_at)) && driverName
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200'
             }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Notificações</span>
                  {(!trip.driver_notification_sent_at || new Date(trip.driver_info_last_updated_at || 0) > new Date(trip.driver_notification_sent_at)) && driverName && (
                    <Badge className="bg-amber-500 text-white animate-pulse text-[10px]">
                      ⚠️ Pendente Envio ao Motorista
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={(!trip.driver_notification_sent_at || new Date(trip.driver_info_last_updated_at || 0) > new Date(trip.driver_notification_sent_at)) && driverName ? "default" : "outline"}
                      onClick={() => handleNotify('driver')} 
                      disabled={isSending || !driverName} 
                      className={
                        (!trip.driver_notification_sent_at || new Date(trip.driver_info_last_updated_at || 0) > new Date(trip.driver_notification_sent_at)) && driverName
                          ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                          : "border-purple-200 text-purple-700 hover:bg-purple-50"
                      }
                    >
                       <Send className="w-4 h-4 mr-2" />
                       Notificar Motorista
                    </Button>
                    <Button variant="outline" onClick={() => handleNotify('both')} disabled={isSending || !driverName} className="border-green-200 text-green-700 hover:bg-green-50">
                       <MessageSquare className="w-4 h-4 mr-2" />
                       Notificar Passageiro
                    </Button>
                </div>
                {trip.driver_notification_sent_at && (
                  <p className="text-[10px] text-gray-500 mt-2 text-center">
                    Última notificação ao motorista: {format(new Date(trip.driver_notification_sent_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
             </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={onClose} variant="outline">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}