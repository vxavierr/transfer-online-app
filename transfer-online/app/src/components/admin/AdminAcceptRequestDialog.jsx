import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminAcceptRequestDialog({ open, onClose, trip, onSuccess }) {
  const [price, setPrice] = useState('');
  const [assignDriver, setAssignDriver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [driverVehicles, setDriverVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleLoadError, setVehicleLoadError] = useState('');
  const [manualVehicleModel, setManualVehicleModel] = useState('');
  const [manualVehiclePlate, setManualVehiclePlate] = useState('');
  const [driverPayout, setDriverPayout] = useState('');
  const [driverSchedule, setDriverSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && trip) {
      // Inicializar valores
      let initialPrice = 0;
      if (trip.type === 'service_request') {
        const r = trip.original_data;
        initialPrice = r.chosen_client_price || r.chosen_supplier_cost || r.final_client_price_with_additions || 0;
        
        // Se ainda for 0, tentar encontrar o valor na oferta do fornecedor escolhido
        if (!initialPrice && r.offered_suppliers && Array.isArray(r.offered_suppliers) && r.chosen_supplier_id) {
          const offer = r.offered_suppliers.find(o => o.supplier_id === r.chosen_supplier_id);
          if (offer) {
            initialPrice = offer.client_price || offer.supplier_cost || 0;
          }
        }
      }
      else if (trip.type === 'booking') initialPrice = trip.price || 0;
      else if (trip.type === 'supplier_own_booking') initialPrice = trip.price || 0;
      
      setPrice(initialPrice);
      setAssignDriver(false);
      setSelectedDriverId('');
      setSelectedVehicleId('');
      setManualVehicleModel('');
      setManualVehiclePlate('');
      setDriverPayout('');
      setError('');
      setDrivers([]);
      setDriverVehicles([]);
      setVehicleLoadError('');
      
      // Carregar motoristas se necessário
      fetchDrivers();
    }
  }, [open, trip]);

  const fetchDrivers = async () => {
    setLoadingDrivers(true);
    try {
      // Se for uma ServiceRequest com fornecedor definido, tentar buscar motoristas desse fornecedor
      // Caso contrário, ou se for admin geral, buscar todos os motoristas ativos
      let filter = { active: true };
      
      if (trip.type === 'service_request' && trip.original_data.chosen_supplier_id) {
        filter.supplier_id = trip.original_data.chosen_supplier_id;
      } else if (trip.type === 'supplier_own_booking' && trip.original_data.supplier_id) {
        filter.supplier_id = trip.original_data.supplier_id;
      }
      
      // Buscar motoristas
      const fetchedDrivers = await base44.entities.Driver.filter(filter);
      setDrivers(fetchedDrivers.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Erro ao buscar motoristas:", err);
      // Fallback silencioso ou erro não crítico
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleDriverChange = async (driverId) => {
    setSelectedDriverId(driverId);
    setSelectedVehicleId('');
    setManualVehicleModel('');
    setManualVehiclePlate('');
    setDriverSchedule([]);
    setDriverVehicles([]);
    setVehicleLoadError('');

    if (driverId && driverId !== 'new') {
      setLoadingSchedule(true);
      setLoadingVehicles(true);

      const date = trip.date;
      const [vehiclesResult, scheduleResult] = await Promise.allSettled([
        base44.functions.invoke('getDriverVehiclesForAdmin', { driver_id: driverId }),
        base44.functions.invoke('getDriverSchedule', { driver_id: driverId, date })
      ]);

      if (vehiclesResult.status === 'fulfilled') {
        const activeVehicles = vehiclesResult.value?.data?.vehicles || [];
        setDriverVehicles(activeVehicles);

        if (activeVehicles.length > 0) {
          const defaultVehicle = activeVehicles.find((vehicle) => vehicle.is_default);
          const vehicleToSelect = defaultVehicle || activeVehicles[0];
          setSelectedVehicleId(vehicleToSelect.id);
          setManualVehicleModel(vehicleToSelect.vehicle_model || '');
          setManualVehiclePlate(vehicleToSelect.vehicle_plate || '');
        }
      } else {
        console.error('Erro ao carregar veículos do motorista:', vehiclesResult.reason);
        setVehicleLoadError('Erro ao carregar os veículos deste motorista.');
      }

      if (scheduleResult.status === 'fulfilled' && scheduleResult.value?.data?.trips) {
        setDriverSchedule(scheduleResult.value.data.trips);
      } else if (scheduleResult.status === 'rejected') {
        console.warn('Erro ao carregar agenda do motorista:', scheduleResult.reason);
      }

      setLoadingSchedule(false);
      setLoadingVehicles(false);
    }
  };

  const handleVehicleChange = (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    if (vehicleId && vehicleId !== 'new') {
      const v = driverVehicles.find(v => v.id === vehicleId);
      if (v) {
        setManualVehicleModel(v.vehicle_model);
        setManualVehiclePlate(v.vehicle_plate);
      }
    } else {
      setManualVehicleModel('');
      setManualVehiclePlate('');
    }
  };

  const handleConfirm = async () => {
    if (!trip) return;
    setError('');
    setLoading(true);

    try {
      const updateData = {
        status: 'confirmada',
        supplier_response_status: 'confirmado' // Para ServiceRequest
      };

      // Atualizar preço se mudou (dependendo da entidade)
      if (price) {
        if (trip.type === 'service_request') {
          updateData.chosen_client_price = parseFloat(price);
          updateData.chosen_supplier_cost = parseFloat(price); // Admin define valor final
        } else if (trip.type === 'booking') {
          updateData.total_price = parseFloat(price);
        } else if (trip.type === 'supplier_own_booking') {
          updateData.price = parseFloat(price);
        }
      }

      // Dados do Motorista
      if (assignDriver) {
        if (!selectedDriverId) {
          throw new Error("Selecione um motorista ou desmarque a opção de atribuir.");
        }
        
        const driver = drivers.find(d => d.id === selectedDriverId);
        if (!driver) throw new Error("Motorista inválido.");

        if (!manualVehicleModel || !manualVehiclePlate) {
          throw new Error("Informe o modelo e placa do veículo.");
        }

        updateData.driver_id = driver.id;
        updateData.driver_name = driver.name;
        updateData.driver_phone = driver.phone_number;
        updateData.driver_photo_url = driver.photo_url;
        updateData.vehicle_model = manualVehicleModel;
        updateData.vehicle_plate = manualVehiclePlate;
        updateData.driver_trip_status = 'aguardando';
        
        if (driverPayout) {
          updateData.driver_payout_amount = parseFloat(driverPayout);
        }
      }

      // Executar atualização baseada no tipo
      if (trip.type === 'service_request') {
        await base44.entities.ServiceRequest.update(trip.id, updateData);
        
        // Adicionar notificação ao motorista se foi atribuído
        if (assignDriver && updateData.driver_id) {
           try {
             await base44.functions.invoke('notifyDriverAboutTrip', {
               serviceRequestId: trip.id,
               notificationType: 'whatsapp'
             });
           } catch (e) {
             console.warn("Erro ao notificar motorista:", e);
           }
        }
        
      } else if (trip.type === 'booking') {
        await base44.entities.Booking.update(trip.id, updateData);
      } else if (trip.type === 'supplier_own_booking') {
        await base44.entities.SupplierOwnBooking.update(trip.id, updateData);
        
        if (assignDriver && updateData.driver_id) {
           try {
             await base44.functions.invoke('notifyDriverAboutTrip', {
               serviceRequestId: trip.id, // notifyDriver handles SupplierOwnBooking lookup too usually or we adapt
               notificationType: 'whatsapp'
             });
           } catch (e) {
             console.warn("Erro ao notificar motorista:", e);
           }
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao confirmar:", err);
      setError(err.message || "Erro ao confirmar viagem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Confirmar Viagem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {trip && (
            <div className="bg-blue-50 p-3 rounded-md text-sm space-y-1">
              <div className="font-bold text-blue-800">#{trip.display_id}</div>
              <div className="text-blue-700">{trip.origin} → {trip.destination}</div>
              <div className="text-blue-600">{new Date(trip.date).toLocaleDateString()} às {trip.time}</div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              Valor Final
            </Label>
            <Input 
              type="number" 
              value={price} 
              onChange={(e) => setPrice(e.target.value)}
              step="0.01"
            />
          </div>

          <div className="flex items-center space-x-2 border-t pt-4">
            <Checkbox 
              id="assignDriver" 
              checked={assignDriver} 
              onCheckedChange={setAssignDriver} 
            />
            <Label htmlFor="assignDriver" className="font-medium cursor-pointer">
              Atribuir motorista agora?
            </Label>
          </div>

          {assignDriver && (
            <div className="bg-gray-50 p-4 rounded-md border space-y-4 animate-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label>Motorista</Label>
                {loadingDrivers ? (
                  <div className="flex items-center text-sm text-gray-500">
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Carregando motoristas...
                  </div>
                ) : (
                  <Select value={selectedDriverId} onValueChange={handleDriverChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motorista" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Agenda do Motorista */}
              {selectedDriverId && selectedDriverId !== 'new' && (
                <div className="bg-white border rounded-md p-3 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-gray-700 mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Agenda em {new Date(trip.date).toLocaleDateString()}:
                  </div>
                  
                  {loadingSchedule ? (
                    <div className="flex items-center text-gray-500 py-2">
                      <Loader2 className="w-3 h-3 animate-spin mr-2" /> Verificando disponibilidade...
                    </div>
                  ) : driverSchedule.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                      {driverSchedule.map((t, idx) => (
                        <div key={idx} className="flex gap-2 items-start border-l-2 border-blue-300 pl-2">
                          <div className="font-bold text-blue-700 w-10 shrink-0">{t.time}</div>
                          <div className="flex-1">
                            <div className="truncate font-medium">{t.origin}</div>
                            <div className="truncate text-gray-500">→ {t.destination}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-green-600 italic py-1">
                      Nenhuma viagem agendada para este dia.
                    </div>
                  )}
                </div>
              )}

              {selectedDriverId && (
                <div className="space-y-2">
                  <Label>Veículo</Label>
                  {loadingVehicles ? (
                    <div className="flex items-center text-sm text-gray-500">
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Carregando veículos...
                    </div>
                  ) : vehicleLoadError ? (
                    <div className="text-xs text-red-600 mb-2">{vehicleLoadError}</div>
                  ) : driverVehicles.length > 0 ? (
                    <Select value={selectedVehicleId} onValueChange={handleVehicleChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {driverVehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.vehicle_model} ({v.vehicle_plate})
                          </SelectItem>
                        ))}
                        <SelectItem value="manual">+ Outro / Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-xs text-amber-600 mb-2">
                      Este motorista não possui veículos cadastrados. Preencha manualmente.
                    </div>
                  )}
                </div>
              )}

              {(selectedVehicleId === 'manual' || (selectedDriverId && driverVehicles.length === 0)) && (
                <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Modelo</Label>
                  <Input 
                    value={manualVehicleModel} 
                    onChange={(e) => setManualVehicleModel(e.target.value)} 
                    placeholder="Ex: Corolla"
                  />
                </div>
                <div>
                  <Label className="text-xs">Placa</Label>
                  <Input 
                    value={manualVehiclePlate} 
                    onChange={(e) => setManualVehiclePlate(e.target.value.toUpperCase())} 
                    placeholder="ABC-1234"
                  />
                </div>
                </div>
                )}

                <div className="pt-2 border-t mt-2">
                <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Valor a Pagar ao Motorista (R$)
                </Label>
                <Input 
                type="number" 
                value={driverPayout} 
                onChange={(e) => setDriverPayout(e.target.value)}
                placeholder="0,00"
                step="0.01"
                className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                Valor líquido que será repassado ao motorista por esta viagem.
                </p>
                </div>
                </div>
                )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Confirmar Aceite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}