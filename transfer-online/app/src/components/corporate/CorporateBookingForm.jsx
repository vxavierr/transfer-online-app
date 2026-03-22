import React, { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Copy, AlertCircle, Plane as PlaneIcon, MapPin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const LocationAutocomplete = React.lazy(() => import('../booking/LocationAutocomplete'));
const FlightStatusChecker = React.lazy(() => import('../flight/FlightStatusChecker'));
const MultiTripManager = React.lazy(() => import('../booking/MultiTripManager'));

const ComponentLoader = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
  </div>
);

export default function CorporateBookingForm({
  serviceType,
  onServiceTypeChange,
  formData,
  onFormDataChange,
  driverLanguage,
  onDriverLanguageChange,
  minDate,
  originIsAirport,
  destinationIsAirport,
  returnOriginIsAirport,
  returnDestinationIsAirport,
  onOriginLocationTypeChange,
  onDestinationLocationTypeChange,
  onCopyToClipboard,
  multiTripLegs,
  onMultiTripLegsChange,
  clientId
}) {
  const handleAddStop = () => {
    onFormDataChange({
      ...formData,
      additional_stops: [...formData.additional_stops, '']
    });
  };

  const handleRemoveStop = (index) => {
    onFormDataChange({
      ...formData,
      additional_stops: formData.additional_stops.filter((_, i) => i !== index)
    });
  };

  const handleStopChange = (index, value) => {
    onFormDataChange({
      ...formData,
      additional_stops: formData.additional_stops.map((stop, i) => i === index ? value : stop)
    });
  };

  return (
    <Tabs value={serviceType} onValueChange={onServiceTypeChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="one_way">Só Ida</TabsTrigger>
        <TabsTrigger value="round_trip">Ida e Volta</TabsTrigger>
        <TabsTrigger value="hourly">Por Hora</TabsTrigger>
        <TabsTrigger value="multi_trip">Múltiplos Trechos</TabsTrigger>
      </TabsList>

      <TabsContent value="one_way" className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="origin">Origem *</Label>
            {formData.origin && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-blue-600 hover:text-blue-800 px-2"
                onClick={() => onCopyToClipboard(formData.origin)}
                title="Copiar endereço"
              >
                <Copy className="w-3 h-3 mr-1" /> Copiar
              </Button>
            )}
          </div>
          <Suspense fallback={<ComponentLoader />}>
            <LocationAutocomplete 
              id="origin" 
              value={formData.origin} 
              onChange={(value) => onFormDataChange({...formData, origin: value})} 
              onLocationSelect={(loc) => onOriginLocationTypeChange(loc?.type || null)}
              placeholder="Digite o endereço de origem" 
            />
          </Suspense>
        </div>

        {originIsAirport && (
          <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-1">
              <Label htmlFor="origin_flight_number" className="flex items-center gap-2 text-sm font-bold text-blue-900">
                <PlaneIcon className="w-4 h-4 text-blue-600" />
                Número do Voo / Companhia (Origem) *
              </Label>
              <FlightStatusChecker 
                flightNumber={formData.origin_flight_number} 
                date={formData.date}
                expectedOrigin={formData.origin}
                checkType="arrival"
              />
            </div>
            <Input
              id="origin_flight_number"
              value={formData.origin_flight_number}
              onChange={(e) => onFormDataChange({...formData, origin_flight_number: e.target.value})}
              placeholder="Ex: LA 3000, GOL 1234"
              className="bg-white"
            />
            <p className="text-xs text-blue-700">
              ℹ️ Para rastreamento de chegada do passageiro
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="destination">Destino *</Label>
            {formData.destination && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-blue-600 hover:text-blue-800 px-2"
                onClick={() => onCopyToClipboard(formData.destination)}
                title="Copiar endereço"
              >
                <Copy className="w-3 h-3 mr-1" /> Copiar
              </Button>
            )}
          </div>
          <Suspense fallback={<ComponentLoader />}>
            <LocationAutocomplete 
              id="destination" 
              value={formData.destination} 
              onChange={(value) => onFormDataChange({...formData, destination: value})} 
              onLocationSelect={(loc) => onDestinationLocationTypeChange(loc?.type || null)}
              placeholder="Digite o endereço de destino" 
            />
          </Suspense>
        </div>

        {destinationIsAirport && (
          <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-1">
              <Label htmlFor="destination_flight_number" className="flex items-center gap-2 text-sm font-bold text-blue-900">
                <PlaneIcon className="w-4 h-4 text-blue-600" />
                Número do Voo / Companhia (Destino) *
              </Label>
              <FlightStatusChecker 
                flightNumber={formData.destination_flight_number} 
                date={formData.date}
                expectedDestination={formData.destination}
                checkType="departure"
              />
            </div>
            <Input
              id="destination_flight_number"
              value={formData.destination_flight_number}
              onChange={(e) => onFormDataChange({...formData, destination_flight_number: e.target.value})}
              placeholder="Ex: LA 3000, GOL 1234"
              className="bg-white"
            />
            <p className="text-xs text-blue-700">
              ℹ️ Para rastreamento de partida do passageiro
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input id="date" type="date" min={minDate} value={formData.date} onChange={(e) => onFormDataChange({...formData, date: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Horário *</Label>
            <Input id="time" type="time" value={formData.time} onChange={(e) => onFormDataChange({...formData, time: e.target.value})} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="round_trip" className="space-y-4">
        {/* Round trip content - similar to one_way but with return fields */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="origin-rt">Origem *</Label>
            {formData.origin && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-blue-600 hover:text-blue-800 px-2"
                onClick={() => onCopyToClipboard(formData.origin)}
              >
                <Copy className="w-3 h-3 mr-1" /> Copiar
              </Button>
            )}
          </div>
          <Suspense fallback={<ComponentLoader />}>
            <LocationAutocomplete 
              id="origin-rt" 
              value={formData.origin} 
              onChange={(value) => onFormDataChange({...formData, origin: value})} 
              onLocationSelect={(loc) => onOriginLocationTypeChange(loc?.type || null)}
              placeholder="Digite o endereço de origem" 
            />
          </Suspense>
        </div>

        {/* Add all round trip fields here - keeping it shorter for now */}
        <div className="bg-blue-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold text-blue-900">Ida</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-rt">Data *</Label>
              <Input id="date-rt" type="date" min={minDate} value={formData.date} onChange={(e) => onFormDataChange({...formData, date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-rt">Horário *</Label>
              <Input id="time-rt" type="time" value={formData.time} onChange={(e) => onFormDataChange({...formData, time: e.target.value})} />
            </div>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold text-green-900">Volta</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="return-date">Data *</Label>
              <Input id="return-date" type="date" min={formData.date || minDate} value={formData.return_date} onChange={(e) => onFormDataChange({...formData, return_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-time">Horário *</Label>
              <Input id="return-time" type="time" value={formData.return_time} onChange={(e) => onFormDataChange({...formData, return_time: e.target.value})} />
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="hourly" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hours">Quantidade de Horas *</Label>
          <Select value={String(formData.hours)} onValueChange={(value) => onFormDataChange({...formData, hours: parseInt(value)})}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 Horas</SelectItem>
              <SelectItem value="10">10 Horas</SelectItem>
              <SelectItem value="12">12 Horas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="origin-hourly">Ponto de Partida *</Label>
          <Suspense fallback={<ComponentLoader />}>
            <LocationAutocomplete 
              id="origin-hourly" 
              value={formData.origin} 
              onChange={(value) => onFormDataChange({...formData, origin: value})} 
              onLocationSelect={(loc) => onOriginLocationTypeChange(loc?.type || null)}
              placeholder="Digite o endereço inicial" 
            />
          </Suspense>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Paradas Adicionais (Obrigatório pelo menos 1) *</Label>
            <Button
              type="button"
              onClick={handleAddStop}
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Parada
            </Button>
          </div>

          {formData.additional_stops.length > 0 && (
            <div className="space-y-3">
              {formData.additional_stops.map((stop, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <Label className="text-sm font-medium text-blue-900">Parada {index + 1}</Label>
                      </div>
                      <Suspense fallback={<ComponentLoader />}>
                        <LocationAutocomplete
                          id={`stop-${index}`}
                          value={stop}
                          onChange={(value) => handleStopChange(index, value)}
                          placeholder="Digite o endereço da parada"
                        />
                      </Suspense>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleRemoveStop(index)}
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {formData.additional_stops.length === 0 && (
            <Alert className="bg-orange-50 border-orange-300">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 text-sm font-medium">
                ⚠️ Para viagens por hora, adicione pelo menos uma parada entre origem e destino final.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="destination-hourly">Destino Final *</Label>
          <Suspense fallback={<ComponentLoader />}>
            <LocationAutocomplete 
              id="destination-hourly" 
              value={formData.destination} 
              onChange={(value) => onFormDataChange({...formData, destination: value})} 
              onLocationSelect={(loc) => onDestinationLocationTypeChange(loc?.type || null)}
              placeholder="Digite o endereço de destino final" 
            />
          </Suspense>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date-hourly">Data *</Label>
            <Input id="date-hourly" type="date" min={minDate} value={formData.date} onChange={(e) => onFormDataChange({...formData, date: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time-hourly">Horário *</Label>
            <Input id="time-hourly" type="time" value={formData.time} onChange={(e) => onFormDataChange({...formData, time: e.target.value})} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="multi_trip" className="space-y-4">
        <Alert className="bg-blue-50 border-blue-300">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>📍 Múltiplos Trechos:</strong> Crie um itinerário com várias viagens diferentes. Cada trecho pode ter origem, destino, data e veículo específicos.
          </AlertDescription>
        </Alert>

        <Suspense fallback={<ComponentLoader />}>
          <MultiTripManager
            legs={multiTripLegs}
            onChange={onMultiTripLegsChange}
            clientId={clientId}
            driverLanguage={driverLanguage}
          />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}