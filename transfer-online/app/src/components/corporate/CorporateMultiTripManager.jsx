import React, { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Plus, Trash2, MapPin, Plane as PlaneIcon, AlertCircle, Loader2, Car, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const LocationAutocomplete = React.lazy(() => import('../booking/LocationAutocomplete'));

const ComponentLoader = () => (
  <div className="flex items-center justify-center p-2">
    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
  </div>
);

export default function CorporateMultiTripManager({ 
  legs, 
  onChange, 
  clientId,
  driverLanguage,
  onValidationChange
}) {
  const [legErrors, setLegErrors] = useState({});
  const prevIsCompleteRef = React.useRef(null);
  
  // Buscar tipos de veículos disponíveis para seleção
  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['supplierVehicleTypes', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const client = await base44.entities.Client.get(clientId);
      if (!client.associated_supplier_ids || client.associated_supplier_ids.length === 0) return [];
      
      const allVehicles = await base44.entities.SupplierVehicleType.filter({ 
        approval_status: 'approved',
        active: true 
      });
      
      return allVehicles.filter(v => client.associated_supplier_ids.includes(v.supplier_id));
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5
  });
  
  // Sincronizar driverLanguage global com todos os trechos
  useEffect(() => {
    if (driverLanguage && legs.length > 0) {
      const needsUpdate = legs.some(leg => leg.driverLanguage !== driverLanguage);
      if (needsUpdate) {
        onChange(legs.map(leg => ({ ...leg, driverLanguage })));
      }
    }
  }, [driverLanguage]);

  const addNewLeg = () => {
    // Validar se o trecho anterior está completo antes de adicionar novo
    if (legs.length > 0) {
      const lastLeg = legs[legs.length - 1];
      if (!lastLeg.origin || !lastLeg.destination || !lastLeg.date || !lastLeg.time || !lastLeg.selectedVehicleTypeId) {
        alert('⚠️ Por favor, complete todos os campos do trecho anterior (incluindo tipo de veículo) antes de adicionar um novo.');
        return;
      }
    }
    
    const newLeg = {
      id: Date.now().toString(),
      origin: '',
      destination: '',
      date: '',
      time: '',
      origin_flight_number: '',
      destination_flight_number: '',
      selectedVehicleTypeId: null, // Tipo de veículo escolhido pelo usuário
      vehicleTypeId: null,
      supplierId: null,
      supplierName: '',
      calculatedPrice: null,
      vehicleTypeName: '',
      originIsAirport: false,
      destinationIsAirport: false,
      driverLanguage: driverLanguage || 'pt'
    };
    onChange([...legs, newLeg]);
  };

  const removeLeg = (legId) => {
    onChange(legs.filter(leg => leg.id !== legId));
  };

  const updateLeg = (legId, updates) => {
    const updatedLegs = legs.map(leg => {
      if (leg.id === legId) {
        return { ...leg, ...updates };
      }
      return leg;
    });
    console.log('[CorporateMultiTripManager] updateLeg chamado. Leg atualizado:', legId, 'Updates:', updates, 'Todos os legs:', updatedLegs);
    onChange(updatedLegs);
  };

  // Validação e notificação ao componente pai
  useEffect(() => {
    const timer = setTimeout(() => {
      const legValidations = legs.map((leg, i) => {
        const hasVehicle = !!(leg.selectedVehicleTypeId || leg.vehicleTypeId);
        const isValid = !!(leg.origin && leg.destination && leg.date && leg.time && hasVehicle);

        console.log(`[CorporateMultiTripManager] Leg ${i + 1}:`, {
          origin: !!leg.origin,
          destination: !!leg.destination,
          date: !!leg.date,
          time: !!leg.time,
          hasVehicle,
          isValid
        });

        return isValid;
      });

      const allValid = legValidations.every(valid => valid);
      const isComplete = legs.length > 0 && allValid;

      console.log('[CorporateMultiTripManager] ✅ VALIDAÇÃO FINAL:', {
        legsCount: legs.length,
        allValid,
        isComplete
      });

      if (prevIsCompleteRef.current !== isComplete) {
        prevIsCompleteRef.current = isComplete;
        if (onValidationChange) {
          onValidationChange(isComplete);
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [legs, onValidationChange]);

  return (
    <div className="space-y-4">
      {legs.length === 0 && (
        <Alert className="bg-blue-50 border-blue-300">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>💡 Dica:</strong> Adicione seu primeiro trecho para começar a montar o itinerário.
          </AlertDescription>
        </Alert>
      )}

      {legs.map((leg, index) => (
        <Card key={leg.id} className="p-4 border-2 border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Trecho {index + 1}
            </h4>
            {legs.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeLeg(leg.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900">
                Origem <span className="text-red-500">*</span>
              </Label>
              <Suspense fallback={<ComponentLoader />}>
                <LocationAutocomplete
                  value={leg.origin}
                  onChange={(value) => updateLeg(leg.id, { origin: value })}
                  onLocationSelect={(loc) => updateLeg(leg.id, { originIsAirport: loc?.type === 'airport' })}
                  placeholder="Digite o endereço de origem"
                />
              </Suspense>
            </div>

            {leg.originIsAirport && (
              <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Label className="flex items-center gap-2 text-sm font-bold text-blue-900">
                  <PlaneIcon className="w-4 h-4" />
                  Número do Voo (Origem)
                </Label>
                <Input
                  value={leg.origin_flight_number || ''}
                  onChange={(e) => updateLeg(leg.id, { origin_flight_number: e.target.value })}
                  placeholder="Ex: LA 3000, GOL 1234"
                  className="bg-white"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900">
                Destino <span className="text-red-500">*</span>
              </Label>
              <Suspense fallback={<ComponentLoader />}>
                <LocationAutocomplete
                  value={leg.destination}
                  onChange={(value) => updateLeg(leg.id, { destination: value })}
                  onLocationSelect={(loc) => updateLeg(leg.id, { destinationIsAirport: loc?.type === 'airport' })}
                  placeholder="Digite o endereço de destino"
                />
              </Suspense>
            </div>

            {leg.destinationIsAirport && (
              <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Label className="flex items-center gap-2 text-sm font-bold text-blue-900">
                  <PlaneIcon className="w-4 h-4" />
                  Número do Voo (Destino)
                </Label>
                <Input
                  value={leg.destination_flight_number || ''}
                  onChange={(e) => updateLeg(leg.id, { destination_flight_number: e.target.value })}
                  placeholder="Ex: LA 3000, GOL 1234"
                  className="bg-white"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Data <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={leg.date}
                  onChange={(e) => updateLeg(leg.id, { date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Horário <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="time"
                  value={leg.time}
                  onChange={(e) => updateLeg(leg.id, { time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                <Car className="w-4 h-4 text-blue-600" />
                Tipo de Veículo <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={leg.selectedVehicleTypeId || ''} 
                onValueChange={(value) => {
                  console.log('[CorporateMultiTripManager] Tipo de veículo selecionado:', value, 'para leg:', leg.id);
                  const selectedVehicle = vehicleTypes.find(v => v.id === value);
                  updateLeg(leg.id, { 
                    selectedVehicleTypeId: value,
                    vehicleTypeName: selectedVehicle?.name || '',
                    vehicleTypeId: value
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de veículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">Nenhum veículo disponível</div>
                  ) : (
                    vehicleTypes.map(vt => (
                      <SelectItem key={vt.id} value={vt.id}>
                        {vt.name} (até {vt.max_passengers} passageiros)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {leg.selectedVehicleTypeId && (
                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  ✅ Sedan selecionado
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}

      <Button
        type="button"
        onClick={addNewLeg}
        variant="outline"
        className="w-full border-2 border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 hover:border-blue-500 py-6"
      >
        <Plus className="w-5 h-5 mr-2" />
        Adicionar {legs.length === 0 ? 'Primeiro' : 'Novo'} Trecho
      </Button>


    </div>
  );
}