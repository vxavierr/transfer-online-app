import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, Plus, Trash2, MapPin, ArrowRight, Plane as PlaneIcon, AlertCircle } from 'lucide-react';
import LocationAutocomplete from './LocationAutocomplete';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { useLanguage } from '@/components/LanguageContext';

export default function MultiTripManager({ 
  legs, 
  setLegs, 
  vehicleTypes, 
  driverLanguage,
  minDateBasedOnLeadTime,
  isAirport,
  user,
  canViewPricesWithoutLogin
}) {
  const { t } = useLanguage();
  const [calculatingPrices, setCalculatingPrices] = useState({});
  const [legErrors, setLegErrors] = useState({});

  const addNewLeg = () => {
    const newLeg = {
      id: Date.now().toString(),
      origin: '',
      destination: '',
      date: '',
      time: '',
      origin_flight_number: '',
      destination_flight_number: '',
      vehicleTypeId: null,
      calculatedPrice: null,
      vehicleTypeName: '',
      originIsAirport: false,
      destinationIsAirport: false
    };
    setLegs([...legs, newLeg]);
  };

  const removeLeg = (legId) => {
    setLegs(legs.filter(leg => leg.id !== legId));
  };

  const updateLeg = (legId, updates) => {
    console.log('[MultiTripManager] updateLeg called:', legId, updates);
    setLegs(prevLegs => prevLegs.map(leg => {
      if (leg.id === legId) {
        const updated = { ...leg, ...updates };
        
        // Check if origin/destination is airport
        if (updates.origin !== undefined) {
          updated.originIsAirport = isAirport(updates.origin);
        }
        if (updates.destination !== undefined) {
          updated.destinationIsAirport = isAirport(updates.destination);
        }
        
        console.log('[MultiTripManager] Leg updated:', updated);
        return updated;
      }
      return leg;
    }));
  };

  const calculatePriceForLeg = async (legId) => {
    const leg = legs.find(l => l.id === legId);
    if (!leg || !leg.origin || !leg.destination || !leg.date || !leg.time || !leg.vehicleTypeId) {
      return;
    }

    setCalculatingPrices(prev => ({ ...prev, [legId]: true }));
    setLegErrors(prev => ({ ...prev, [legId]: null }));

    try {
      const priceResponse = await base44.functions.invoke('calculateTransferPrice', {
        service_type: 'one_way',
        vehicle_type_id: leg.vehicleTypeId,
        origin: leg.origin,
        destination: leg.destination,
        date: leg.date,
        time: leg.time,
        driver_language: driverLanguage
      });

      if (priceResponse.data?.success && priceResponse.data.pricing) {
        const vehicle = vehicleTypes.find(v => v.id === leg.vehicleTypeId);
        updateLeg(legId, {
          calculatedPrice: priceResponse.data.pricing.total_price,
          vehicleTypeName: vehicle?.name || '',
          calculationDetails: priceResponse.data.pricing.calculation_details
        });
      } else {
        throw new Error('Falha ao calcular preço');
      }
    } catch (error) {
      console.error('Erro ao calcular preço da viagem:', error);
      setLegErrors(prev => ({ 
        ...prev, 
        [legId]: error.response?.data?.error || error.message || 'Erro ao calcular preço'
      }));
    } finally {
      setCalculatingPrices(prev => ({ ...prev, [legId]: false }));
    }
  };

  // Auto-calculate when all required fields are filled
  useEffect(() => {
    if (!user && !canViewPricesWithoutLogin) return;
    
    legs.forEach(leg => {
      if (leg.origin && leg.destination && leg.date && leg.time && leg.vehicleTypeId && !leg.calculatedPrice && !calculatingPrices[leg.id]) {
        console.log('[MultiTripManager] Auto-calculating price for leg', leg.id);
        calculatePriceForLeg(leg.id);
      }
    });
  }, [legs, user, canViewPricesWithoutLogin]);

  const totalPrice = legs.reduce((sum, leg) => sum + (leg.calculatedPrice || 0), 0);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-sm text-blue-900 mb-1">{t('novaReserva.multiTripTitle')}</h3>
        <p className="text-xs text-blue-700">{t('novaReserva.multiTripDesc')}</p>
      </div>

      {legs.map((leg, index) => (
        <Card key={leg.id} className="p-4 border-2 border-gray-200 relative">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm text-gray-900">
              {t('novaReserva.leg')} {index + 1}
            </h4>
            {legs.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeLeg(leg.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-900">
                {t('novaReserva.whereFrom')} <span className="text-red-500">*</span>
              </Label>
              <LocationAutocomplete
                value={leg.origin}
                onChange={(value) => updateLeg(leg.id, { origin: value })}
                onLocationSelect={(loc) => updateLeg(leg.id, { originIsAirport: loc?.type === 'airport' })}
                placeholder={t('novaReserva.originPlaceholder')}
                className="text-sm h-10 rounded-lg bg-gray-50"
              />
            </div>

            {leg.originIsAirport && (
              <div className="space-y-1.5 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Label className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <PlaneIcon className="w-3.5 h-3.5" />
                  {t('novaReserva.flightNumber')}
                </Label>
                <Input
                  value={leg.origin_flight_number}
                  onChange={(e) => updateLeg(leg.id, { origin_flight_number: e.target.value })}
                  placeholder="Ex: LA 3000"
                  className="text-sm h-10 rounded-lg bg-white"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-900">
                {t('novaReserva.whereTo')} <span className="text-red-500">*</span>
              </Label>
              <LocationAutocomplete
                value={leg.destination}
                onChange={(value) => updateLeg(leg.id, { destination: value })}
                onLocationSelect={(loc) => updateLeg(leg.id, { destinationIsAirport: loc?.type === 'airport' })}
                placeholder={t('novaReserva.destinationPlaceholder')}
                className="text-sm h-10 rounded-lg bg-gray-50"
              />
            </div>

            {leg.destinationIsAirport && (
              <div className="space-y-1.5 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Label className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <PlaneIcon className="w-3.5 h-3.5" />
                  {t('novaReserva.flightNumber')}
                </Label>
                <Input
                  value={leg.destination_flight_number}
                  onChange={(e) => updateLeg(leg.id, { destination_flight_number: e.target.value })}
                  placeholder="Ex: LA 3000"
                  className="text-sm h-10 rounded-lg bg-white"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs font-bold text-gray-900">
                  <Calendar className="w-3 h-3 text-blue-600" />
                  {t('novaReserva.date')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  min={minDateBasedOnLeadTime}
                  value={leg.date}
                  onChange={(e) => updateLeg(leg.id, { date: e.target.value })}
                  className="text-xs h-9 rounded-lg bg-gray-50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs font-bold text-gray-900">
                  <Clock className="w-3 h-3 text-blue-600" />
                  {t('novaReserva.time')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="time"
                  value={leg.time}
                  onChange={(e) => updateLeg(leg.id, { time: e.target.value })}
                  className="text-xs h-9 rounded-lg bg-gray-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-900">
                {t('novaReserva.selectVehicleForLeg')} <span className="text-red-500">*</span>
              </Label>
              <select
                value={leg.vehicleTypeId || ''}
                onChange={(e) => {
                  const selectedVehicle = vehicleTypes.find(v => v.id === e.target.value);
                  updateLeg(leg.id, {
                    vehicleTypeId: e.target.value,
                    vehicleTypeName: selectedVehicle?.name || '',
                    calculatedPrice: null,
                    calculationDetails: null
                  });
                }}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm"
              >
                <option value="">{t('novaReserva.selectVehiclePlaceholder')}</option>
                {vehicleTypes.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} ({vehicle.max_passengers} {t('novaReserva.passengers')})
                  </option>
                ))}
              </select>
            </div>

            {legErrors[leg.id] && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs">{legErrors[leg.id]}</AlertDescription>
              </Alert>
            )}

            {calculatingPrices[leg.id] && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-700">{t('novaReserva.calculating')}</p>
              </div>
            )}

            {leg.calculatedPrice && !calculatingPrices[leg.id] && (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-green-900">{t('novaReserva.legPrice')}</span>
                  <span className="text-lg font-bold text-green-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(leg.calculatedPrice)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}

      <Button
        type="button"
        onClick={addNewLeg}
        variant="outline"
        className="w-full border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
      >
        <Plus className="w-4 h-4 mr-2" />
        {t('novaReserva.addLeg')}
      </Button>

      {legs.length > 0 && totalPrice > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs opacity-90">{t('novaReserva.totalItinerary')}</p>
              <p className="text-sm font-medium">{legs.length} {t('novaReserva.legs')}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPrice)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}