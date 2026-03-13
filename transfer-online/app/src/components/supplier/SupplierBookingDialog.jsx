import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Plus,
  Car,
  Users,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Trash2,
  Printer
} from 'lucide-react';
import LocationAutocomplete from '@/components/booking/LocationAutocomplete';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';
import ServiceOrderPDFDialog from '@/components/ServiceOrderPDFDialog';

export default function SupplierBookingDialog({ 
  open, 
  onOpenChange, 
  bookingToEdit = null, 
  supplierId 
}) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    client_id: '',
    service_type: 'one_way',
    origin: '',
    destination: '',
    date: '',
    time: '',
    return_date: '',
    return_time: '',
    hours: 5,
    passengers: 1,
    passenger_name: '',
    passenger_email: '',
    passenger_phone: '',
    origin_flight_number: '',
    destination_flight_number: '',
    notes: '',
    vehicle_type_id: '',
    price: 0,
    payment_method: '',
    driver_id: '',
    driver_name: '',
    driver_phone: '',
    vehicle_model: '',
    vehicle_plate: '',
    driver_payout_amount: '',
    driver_language: 'pt',
    cost_allocation: []
  });

  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [priceCalculationDetails, setPriceCalculationDetails] = useState(null);
  const [passengersDetails, setPassengersDetails] = useState([]);
  const [additionalStops, setAdditionalStops] = useState([]);
  
  const [selectedDriverVehicleId, setSelectedDriverVehicleId] = useState('');
  const [manualCostCenterName, setManualCostCenterName] = useState('');
  const [showManualCostCenterInput, setShowManualCostCenterInput] = useState(false);
  const [notifyDriver, setNotifyDriver] = useState(true);
  const [isPDFDialogOpen, setIsPDFDialogOpen] = useState(false);

  // Queries
  const { data: clients = [] } = useQuery({
    queryKey: ['supplierOwnClients', supplierId],
    queryFn: () => base44.entities.SupplierOwnClient.filter({ supplier_id: supplierId }),
    enabled: !!supplierId,
    initialData: []
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['supplierVehicles', supplierId],
    queryFn: () => base44.entities.SupplierVehicleType.filter({ supplier_id: supplierId }),
    enabled: !!supplierId,
    initialData: []
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['supplierDrivers', supplierId],
    queryFn: () => base44.entities.Driver.filter({ supplier_id: supplierId }),
    enabled: !!supplierId,
    initialData: []
  });

  const { data: allDriverVehicles = [] } = useQuery({
    queryKey: ['allDriverVehicles', drivers],
    queryFn: async () => {
      if (drivers.length === 0) return [];
      const driverIds = drivers.map(d => d.id);
      const results = await Promise.all(
        driverIds.map(id => base44.entities.DriverVehicle.filter({ driver_id: id, active: true }))
      );
      return results.flat();
    },
    enabled: drivers.length > 0,
    initialData: []
  });

  const { data: clientCostCenters = [] } = useQuery({
    queryKey: ['clientCostCenters', formData.client_id],
    queryFn: () => base44.entities.CostCenter.filter({ client_id: formData.client_id, active: true }),
    enabled: !!formData.client_id,
    initialData: []
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async ({ data: bookingData, shouldNotify }) => {
      // Obter contagem atual para gerar número (simples, idealmente seria no backend atomicamente)
      const currentBookings = await base44.entities.SupplierOwnBooking.filter({ supplier_id: supplierId });
      const bookingNumber = `VG-${String(currentBookings.length + 1).padStart(4, '0')}`;
      
      const newBooking = await base44.entities.SupplierOwnBooking.create({
        ...bookingData,
        supplier_id: supplierId,
        booking_number: bookingNumber,
        status: 'pendente'
      });
      
      await base44.functions.invoke('trackSupplierBookingUsage', { booking_id: newBooking.id });
      
      if (shouldNotify && bookingData.driver_name && bookingData.driver_phone) {
        base44.functions.invoke('notifyDriverAboutTrip', {
          serviceRequestId: newBooking.id,
          notificationType: 'whatsapp'
        }).catch(err => console.error('Erro ao notificar motorista:', err));
      }

      return newBooking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierOwnBookings'] });
      queryClient.invalidateQueries({ queryKey: ['supplierServiceRequests'] });
      setSuccess('Viagem criada com sucesso!');
      setTimeout(() => {
        setSuccess('');
        onOpenChange(false);
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao criar viagem');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, shouldNotify }) => {
      const updated = await base44.entities.SupplierOwnBooking.update(id, data);
      
      if (shouldNotify && data.driver_name && data.driver_phone) {
        base44.functions.invoke('notifyDriverAboutTrip', {
          serviceRequestId: id,
          notificationType: 'whatsapp'
        }).catch(err => console.error('Erro ao notificar motorista:', err));
      }
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierOwnBookings'] });
      queryClient.invalidateQueries({ queryKey: ['supplierServiceRequests'] });
      setSuccess('Viagem atualizada com sucesso!');
      setTimeout(() => {
        setSuccess('');
        onOpenChange(false);
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao atualizar viagem');
    }
  });

  // Effects
  useEffect(() => {
    if (open) {
      if (bookingToEdit) {
        setFormData({ ...bookingToEdit });
        setPassengersDetails(bookingToEdit.passengers_details || []);
        setAdditionalStops(bookingToEdit.additional_stops || []);
        setNotifyDriver(false); // Default false para edição para evitar spam acidental
        
        // Configurar veículo selecionado se houver driver_id
        if (bookingToEdit.driver_id) {
            // Tentar encontrar o veículo que corresponde
            // Como não temos o ID do veículo salvo explicitamente em todos os casos legados,
            // tentamos inferir ou deixamos em branco se não bater
            // Mas o ideal é que se tiver placa, tentamos achar.
            // Para simplificar, se já tem driver_id, deixamos o usuário selecionar se quiser mudar.
        }
      } else {
        resetForm();
        setNotifyDriver(true); // Default true para nova viagem
      }
    }
  }, [open, bookingToEdit]);

  const resetForm = () => {
    setFormData({
      client_id: '',
      service_type: 'one_way',
      origin: '',
      destination: '',
      date: '',
      time: '',
      return_date: '',
      return_time: '',
      hours: 5,
      passengers: 1,
      passenger_name: '',
      passenger_email: '',
      passenger_phone: '',
      origin_flight_number: '',
      destination_flight_number: '',
      notes: '',
      vehicle_type_id: '',
      price: 0,
      payment_method: '',
      driver_id: '',
      driver_payout_amount: '',
      driver_language: 'pt',
      cost_allocation: []
    });
    setPassengersDetails([{
      name: '',
      document_type: 'RG',
      document_number: '',
      phone_number: '',
      email: '',
      is_lead_passenger: true
    }]);
    setAdditionalStops([]);
    setError('');
    setPriceCalculationDetails(null);
    setSuccess('');
  };

  // Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});

    const errors = {};
    if (!formData.client_id) errors.client_id = true;
    if (!formData.origin) errors.origin = true;
    if (!formData.destination) errors.destination = true;
    if (formData.service_type === 'hourly' && additionalStops.length === 0) errors.additional_stops = true;
    if (!formData.date) errors.date = true;
    if (!formData.time) errors.time = true;
    if (!formData.passengers) errors.passengers = true;

    const passengerErrors = [];
    if (passengersDetails.length > 0) {
      passengersDetails.forEach((p, index) => {
        const pErrors = {};
        if (!p.name) pErrors.name = true;
        if (Object.keys(pErrors).length > 0) {
          passengerErrors[index] = pErrors;
        }
      });
    } else {
      errors.passengersDetails = true;
    }

    const hasPassengerErrors = passengerErrors.length > 0 && passengerErrors.some(e => e && Object.keys(e).length > 0);

    if (Object.keys(errors).length > 0 || hasPassengerErrors) {
      setValidationErrors({ ...errors, passengersDetails: passengerErrors });
      setError('Por favor, preencha os campos obrigatórios destacados em vermelho.');
      return;
    }

    const leadPassenger = passengersDetails.find(p => p.is_lead_passenger) || passengersDetails[0];
    const submissionBaseData = { ...formData };
    
    if (leadPassenger) {
      submissionBaseData.passenger_name = leadPassenger.name;
      submissionBaseData.passenger_email = leadPassenger.email || '';
      submissionBaseData.passenger_phone = leadPassenger.phone_number || '';
    } else {
      const selectedClient = clients.find(c => c.id === formData.client_id);
      if (selectedClient) {
        submissionBaseData.passenger_name = submissionBaseData.passenger_name || selectedClient.name;
        submissionBaseData.passenger_phone = submissionBaseData.passenger_phone || selectedClient.phone_number || '';
        submissionBaseData.passenger_email = submissionBaseData.passenger_email || selectedClient.email || '';
      }
    }

    let finalCostAllocation = formData.cost_allocation;

    if (showManualCostCenterInput && manualCostCenterName && formData.client_id) {
      try {
        const newCostCenter = await base44.entities.CostCenter.create({
          client_id: formData.client_id,
          code: manualCostCenterName.substring(0, 20).toUpperCase().replace(/[^A-Z0-9-]/g, ''),
          name: manualCostCenterName,
          description: 'Criado manualmente via Nova Viagem',
          active: true
        });
        finalCostAllocation = [{
          cost_center_id: newCostCenter.id,
          cost_center_code: newCostCenter.code,
          cost_center_name: newCostCenter.name,
          allocation_type: 'percentage',
          allocation_value: 100
        }];
        queryClient.invalidateQueries({ queryKey: ['clientCostCenters', formData.client_id] });
      } catch (ccError) {
        setError(`Erro ao criar centro de custo manual: ${ccError.message}`);
        return;
      }
    }

    const submissionData = {
      ...submissionBaseData,
      driver_payout_amount: (submissionBaseData.driver_payout_amount === '' || submissionBaseData.driver_payout_amount === null || isNaN(submissionBaseData.driver_payout_amount)) ? 0 : Number(submissionBaseData.driver_payout_amount),
      passengers_details: passengersDetails,
      additional_stops: additionalStops,
      cost_allocation: finalCostAllocation
    };

    if (bookingToEdit) {
      updateMutation.mutate({ id: bookingToEdit.id, data: submissionData, shouldNotify: notifyDriver });
    } else {
      createMutation.mutate({ data: submissionData, shouldNotify: notifyDriver });
    }
  };

  const addPassenger = () => {
    const isFirst = passengersDetails.length === 0;
    setPassengersDetails([...passengersDetails, {
      name: '',
      document_type: 'RG',
      document_number: '',
      phone_number: '',
      email: '',
      is_lead_passenger: isFirst
    }]);
    setFormData(prev => ({ ...prev, passengers: prev.passengers + 1 }));
  };

  const updatePassenger = (index, field, value) => {
    const updated = [...passengersDetails];
    if (field === 'is_lead_passenger' && value === true) {
      updated.forEach(p => p.is_lead_passenger = false);
    }
    updated[index] = { ...updated[index], [field]: value };
    setPassengersDetails(updated);
  };

  const removePassenger = (index) => {
    const updated = passengersDetails.filter((_, i) => i !== index);
    if (passengersDetails[index].is_lead_passenger && updated.length > 0) {
      updated[0].is_lead_passenger = true;
    }
    setPassengersDetails(updated);
    setFormData(prev => ({ ...prev, passengers: Math.max(1, prev.passengers - 1) }));
  };

  const addStop = () => {
    setAdditionalStops([...additionalStops, {
      address: '',
      notes: '',
      order: additionalStops.length + 1
    }]);
  };

  const updateStop = (index, field, value) => {
    const updated = [...additionalStops];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalStops(updated);
  };

  const removeStop = (index) => {
    setAdditionalStops(additionalStops.filter((_, i) => i !== index));
  };

  const handleChange = async (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    const updatedData = { ...formData, [field]: value };
    if (['client_id', 'vehicle_type_id', 'service_type', 'origin', 'destination', 'hours', 'driver_language'].includes(field)) {
      await calculatePrice(updatedData);
    }
  };

  const handleDriverChange = (value) => {
    if (value === 'manual') {
      setFormData(prev => ({
        ...prev,
        driver_id: null,
        driver_name: '',
        driver_phone: '',
        vehicle_model: '',
        vehicle_plate: ''
      }));
      setSelectedDriverVehicleId('');
    } else {
      const driver = drivers.find(d => d.id === value);
      if (driver) {
        const driverCars = allDriverVehicles.filter(v => v.driver_id === value);
        let vModel = '';
        let vPlate = '';
        let vId = '';
        if (driverCars.length === 1) {
          vModel = driverCars[0].vehicle_model;
          vPlate = driverCars[0].vehicle_plate;
          vId = driverCars[0].id;
        }
        setFormData(prev => ({
          ...prev,
          driver_id: value,
          driver_name: driver.name,
          driver_phone: driver.phone_number,
          vehicle_model: vModel,
          vehicle_plate: vPlate
        }));
        setSelectedDriverVehicleId(vId);
      }
    }
  };

  const handleVehicleChange = (vehicleId) => {
    setSelectedDriverVehicleId(vehicleId);
    if (vehicleId === 'manual_vehicle') {
      setFormData(prev => ({ ...prev, vehicle_model: '', vehicle_plate: '' }));
    } else {
      const vehicle = allDriverVehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        setFormData(prev => ({
          ...prev,
          vehicle_model: vehicle.vehicle_model,
          vehicle_plate: vehicle.vehicle_plate
        }));
      }
    }
  };

  const calculatePrice = async (data) => {
    if (!data.client_id || !data.vehicle_type_id || !data.service_type) {
      return;
    }
    if (data.service_type !== 'hourly' && (!data.origin || !data.destination)) {
      return;
    }
    setIsCalculatingPrice(true);
    setPriceCalculationDetails(null);
    try {
      const response = await base44.functions.invoke('calculateSupplierOwnBookingPrice', {
        client_id: data.client_id,
        vehicle_type_id: data.vehicle_type_id,
        service_type: data.service_type,
        origin: data.origin,
        destination: data.destination,
        hours: data.hours,
        driver_language: data.driver_language
      });
      const result = response.data;
      if (result.success) {
        setFormData(prev => ({ 
          ...prev, 
          price: result.price,
          distance_km: result.distance_km 
        }));
        setPriceCalculationDetails(result);
      }
    } catch (err) {
      console.error('Erro ao calcular preço:', err);
      // Não setar erro global para não bloquear o fluxo, apenas log
    } finally {
      setIsCalculatingPrice(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {bookingToEdit ? 'Editar Viagem' : 'Nova Viagem'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-50 border-green-300">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={validationErrors.client_id ? "text-red-500" : ""}>Cliente *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => handleChange('client_id', value)}
              >
                <SelectTrigger className={validationErrors.client_id ? "border-red-500" : ""}>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.active).map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Serviço *</Label>
              <Select
                value={formData.service_type}
                onValueChange={(value) => handleChange('service_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_way">Só Ida</SelectItem>
                  <SelectItem value="round_trip">Ida e Volta</SelectItem>
                  <SelectItem value="hourly">Por Hora</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className={validationErrors.origin ? "text-red-500" : ""}>Origem *</Label>
              <LocationAutocomplete
                value={formData.origin}
                onChange={(value) => handleChange('origin', value)}
                placeholder="Digite o endereço de origem..."
                className={validationErrors.origin ? "border-red-500" : ""}
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label className={`text-base font-semibold ${validationErrors.additional_stops ? "text-red-500" : ""}`}>
                  Paradas Adicionais {formData.service_type === 'hourly' && '(Obrigatório pelo menos 1) *'}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStop}
                  className={`gap-2 ${validationErrors.additional_stops ? "border-red-500" : ""}`}
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Parada
                </Button>
              </div>
              {additionalStops.length > 0 ? (
                <div className="space-y-3">
                  {additionalStops.map((stop, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">Parada {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStop(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Endereço</Label>
                        <LocationAutocomplete
                          value={stop.address}
                          onChange={(value) => updateStop(index, 'address', value)}
                          placeholder="Digite o endereço da parada..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Observações</Label>
                        <Input
                          value={stop.notes}
                          onChange={(e) => updateStop(index, 'notes', e.target.value)}
                          placeholder="Ex: Buscar documentos, etc."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${validationErrors.additional_stops ? "text-red-500 font-medium" : "text-gray-500"} text-center py-2`}>
                  {formData.service_type === 'hourly' 
                    ? 'Adicione pelo menos uma parada para viagens por hora' 
                    : 'Nenhuma parada adicional'}
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className={validationErrors.destination ? "text-red-500" : ""}>Destino Final *</Label>
              <LocationAutocomplete
                value={formData.destination}
                onChange={(value) => handleChange('destination', value)}
                placeholder="Digite o endereço de destino final..."
                className={validationErrors.destination ? "border-red-500" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label className={validationErrors.date ? "text-red-500" : ""}>Data *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className={validationErrors.date ? "border-red-500" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label className={validationErrors.time ? "text-red-500" : ""}>Horário *</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                className={validationErrors.time ? "border-red-500" : ""}
              />
            </div>

            {formData.service_type === 'round_trip' && (
              <>
                <div className="space-y-2">
                  <Label>Data de Retorno</Label>
                  <Input
                    type="date"
                    value={formData.return_date}
                    onChange={(e) => handleChange('return_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horário de Retorno</Label>
                  <Input
                    type="time"
                    value={formData.return_time}
                    onChange={(e) => handleChange('return_time', e.target.value)}
                  />
                </div>
              </>
            )}

            {formData.service_type === 'hourly' && (
              <div className="space-y-2">
                <Label>Quantidade de Horas</Label>
                <Input
                  type="number"
                  value={formData.hours}
                  onChange={(e) => handleChange('hours', parseInt(e.target.value))}
                  min={1}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className={validationErrors.passengers ? "text-red-500" : ""}>Número de Passageiros *</Label>
              <Input
                type="number"
                value={passengersDetails.length || formData.passengers}
                readOnly
                className="bg-gray-100"
                title="Adicione passageiros na lista abaixo"
              />
            </div>

            <div className="md:col-span-2 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Passageiros
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPassenger}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Passageiro
                </Button>
              </div>
              
              {passengersDetails.map((passenger, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm relative">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 font-normal">
                        Passageiro {index + 1}
                      </Badge>
                      
                      {passenger.is_lead_passenger ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Principal (Responsável)
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updatePassenger(index, 'is_lead_passenger', true)}
                          className="text-xs text-gray-400 hover:text-blue-600 underline decoration-dotted underline-offset-2 transition-colors"
                        >
                          Definir como Principal
                        </button>
                      )}
                    </div>

                    {passengersDetails.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePassenger(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        title="Remover passageiro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className={validationErrors.passengersDetails?.[index]?.name ? "text-red-500" : ""}>Nome Completo *</Label>
                      <Input
                        value={passenger.name}
                        onChange={(e) => updatePassenger(index, 'name', e.target.value)}
                        placeholder="Nome do passageiro"
                        className={validationErrors.passengersDetails?.[index]?.name ? "border-red-500" : ""}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Telefone / WhatsApp</Label>
                      <PhoneInputWithCountry
                        value={passenger.phone_number}
                        onChange={(value) => updatePassenger(index, 'phone_number', value)}
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={passenger.email}
                        onChange={(e) => updatePassenger(index, 'email', e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className={validationErrors.passengersDetails?.[index]?.document_number ? "text-red-500" : ""}>Documento (Opcional)</Label>
                      <div className="flex gap-2">
                        <Select
                          value={passenger.document_type || 'RG'}
                          onValueChange={(value) => updatePassenger(index, 'document_type', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RG">RG</SelectItem>
                            <SelectItem value="CPF">CPF</SelectItem>
                            <SelectItem value="CNH">CNH</SelectItem>
                            <SelectItem value="Passaporte">Passaporte</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={passenger.document_number}
                          onChange={(e) => updatePassenger(index, 'document_number', e.target.value)}
                          placeholder="Número"
                          className={validationErrors.passengersDetails?.[index]?.document_number ? "border-red-500 flex-1" : "flex-1"}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Número do Voo (Origem)</Label>
              <Input
                value={formData.origin_flight_number}
                onChange={(e) => handleChange('origin_flight_number', e.target.value)}
                placeholder="Ex: LA 3000"
              />
            </div>

            <div className="space-y-2">
              <Label>Número do Voo (Destino)</Label>
              <Input
                value={formData.destination_flight_number}
                onChange={(e) => handleChange('destination_flight_number', e.target.value)}
                placeholder="Ex: LA 3001"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Veículo</Label>
              <Select
                value={formData.vehicle_type_id}
                onValueChange={(value) => handleChange('vehicle_type_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.filter(v => v.active).map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2 border-t pt-4 mt-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                Atribuição de Motorista e Veículo
              </Label>
              
              <div className="grid md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <Label>Selecionar Motorista</Label>
                  <Select
                    value={formData.driver_id || 'manual'}
                    onValueChange={handleDriverChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motorista..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual" className="font-semibold text-blue-600">
                        ➕ Motorista Manual / Externo
                      </SelectItem>
                      {drivers.filter(d => d.active && d.approval_status === 'approved').map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.driver_id && (
                  <div className="space-y-2">
                    <Label>Veículo do Motorista</Label>
                    <Select
                      value={selectedDriverVehicleId}
                      onValueChange={handleVehicleChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o veículo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allDriverVehicles
                          .filter(v => v.driver_id === formData.driver_id)
                          .map(vehicle => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.vehicle_model} ({vehicle.vehicle_plate})
                            </SelectItem>
                          ))
                        }
                        <SelectItem value="manual_vehicle" className="font-medium text-orange-600">
                          ✏️ Outro Veículo (Digitar)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4 mt-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Motorista</Label>
                    <Input
                      value={formData.driver_name}
                      onChange={(e) => handleChange('driver_name', e.target.value)}
                      placeholder="Nome completo"
                      readOnly={!!formData.driver_id}
                      className={formData.driver_id ? "bg-gray-100" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={formData.driver_phone}
                      onChange={(e) => handleChange('driver_phone', e.target.value)}
                      placeholder="+55 11 99999-9999"
                      readOnly={!!formData.driver_id}
                      className={formData.driver_id ? "bg-gray-100" : ""}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Modelo do Veículo</Label>
                    <Input
                      value={formData.vehicle_model}
                      onChange={(e) => handleChange('vehicle_model', e.target.value)}
                      placeholder="Ex: Corolla Preto"
                      readOnly={!!formData.driver_id && selectedDriverVehicleId !== 'manual_vehicle' && selectedDriverVehicleId !== ''}
                      className={(!!formData.driver_id && selectedDriverVehicleId !== 'manual_vehicle' && selectedDriverVehicleId !== '') ? "bg-gray-100" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Placa</Label>
                    <Input
                      value={formData.vehicle_plate}
                      onChange={(e) => handleChange('vehicle_plate', e.target.value.toUpperCase())}
                      placeholder="ABC-1234"
                      className={`uppercase ${(!!formData.driver_id && selectedDriverVehicleId !== 'manual_vehicle' && selectedDriverVehicleId !== '') ? "bg-gray-100" : ""}`}
                      readOnly={!!formData.driver_id && selectedDriverVehicleId !== 'manual_vehicle' && selectedDriverVehicleId !== ''}
                    />
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 p-3 rounded-lg mt-2">
                  <Label className="flex items-center gap-2 text-green-700 font-semibold mb-1">
                    <DollarSign className="w-4 h-4" />
                    Valor a Pagar ao Motorista (Opcional)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.driver_payout_amount}
                    onChange={(e) => handleChange('driver_payout_amount', e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="Ex: 150.00"
                    className="bg-white border-green-300 focus:border-green-500 font-medium"
                  />
                  <p className="text-xs text-green-600 mt-1">
                    Este valor aparecerá no painel do motorista como "Valor a Receber" e no seu financeiro.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Idioma do Motorista</Label>
              <Select
                value={formData.driver_language}
                onValueChange={(value) => handleChange('driver_language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Preço Calculado</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleChange('price', parseFloat(e.target.value))}
                  disabled={isCalculatingPrice}
                  className="text-lg font-bold"
                />
                {isCalculatingPrice && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-xs text-blue-600">Calculando...</span>
                  </div>
                )}
              </div>
              {priceCalculationDetails && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-900 font-medium">
                      {priceCalculationDetails.pricing_source === 'client_specific' 
                        ? '✓ Preço diferenciado para este cliente' 
                        : 'Preço padrão do veículo'}
                    </span>
                    <span className="font-bold text-blue-700">
                      {formatPrice(formData.price)}
                    </span>
                  </div>
                  {priceCalculationDetails.calculation_details?.total_distance_km > 0 && (
                    <div className="text-blue-800">
                      📏 Distância total (ciclo completo): {Number(priceCalculationDetails.calculation_details.total_distance_km).toFixed(2)} km
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Input
                value={formData.payment_method}
                onChange={(e) => handleChange('payment_method', e.target.value)}
                placeholder="Ex: Dinheiro, Cartão, PIX"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Centro de Custo (Opcional)</Label>
              {showManualCostCenterInput ? (
                <div className="flex gap-2">
                  <Input
                    value={manualCostCenterName}
                    onChange={(e) => setManualCostCenterName(e.target.value)}
                    placeholder="Digite o nome do novo centro de custo (ex: RH, Vendas SP)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowManualCostCenterInput(false);
                      setManualCostCenterName('');
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Select
                  value={formData.cost_allocation?.[0]?.cost_center_id || 'none'}
                  onValueChange={(value) => {
                    if (value === 'manual_entry') {
                      setShowManualCostCenterInput(true);
                      setManualCostCenterName(''); 
                      setFormData(prev => ({ ...prev, cost_allocation: [] }));
                    } else if (value === 'none') {
                      setFormData(prev => ({ ...prev, cost_allocation: [] }));
                    } else {
                      const cc = clientCostCenters.find(c => c.id === value);
                      if (cc) {
                        setFormData(prev => ({
                          ...prev,
                          cost_allocation: [{
                            cost_center_id: cc.id,
                            cost_center_code: cc.code,
                            cost_center_name: cc.name,
                            allocation_type: 'percentage',
                            allocation_value: 100
                          }]
                        }));
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um centro de custo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clientCostCenters.map(cc => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} - {cc.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="manual_entry" className="font-semibold text-blue-600 border-t mt-1 pt-1">
                      ➕ Inserir Manualmente
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 items-center sm:justify-between">
            <div className="flex items-center space-x-2 self-start sm:self-center">
              <Checkbox 
                id="notifyDriver" 
                checked={notifyDriver} 
                onCheckedChange={setNotifyDriver}
                disabled={!formData.driver_id}
              />
              <Label 
                htmlFor="notifyDriver" 
                className={`text-sm cursor-pointer ${!formData.driver_id ? 'text-gray-400' : 'text-gray-700'}`}
              >
                Notificar motorista (WhatsApp)
              </Label>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end flex-wrap">
              {bookingToEdit && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPDFDialogOpen(true)}
                  className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 mr-auto sm:mr-0"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir OS
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {isPDFDialogOpen && bookingToEdit && (
        <ServiceOrderPDFDialog 
          open={isPDFDialogOpen}
          onClose={() => setIsPDFDialogOpen(false)}
          serviceRequest={{
            id: bookingToEdit.id,
            request_number: bookingToEdit.booking_number,
            type: 'own'
          }}
        />
      )}
    </Dialog>
  );
}