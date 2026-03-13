import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, AlertCircle, Loader2, Plane as PlaneIcon, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';

const LocationAutocomplete = React.lazy(() => import('./LocationAutocomplete'));
const FlightStatusChecker = React.lazy(() => import('../flight/FlightStatusChecker'));
const PhoneInputWithCountry = React.lazy(() => import('../ui/PhoneInputWithCountry'));

const ComponentLoader = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
  </div>
);

export default function HourlyTabContent({
  formData,
  setFormData,
  startTransition,
  originIsAirport,
  destinationIsAirport,
  minDateBasedOnLeadTime,
  isCustomHours,
  setIsCustomHours,
  getSelectedHoursOption,
  user,
  t
}) {
  const nr = (key) => t ? t(`novaReserva.${key}`) : key;

  return (
    <TabsContent value="hourly" className="space-y-3 mt-3">
      <div className="space-y-1.5">
        <Label htmlFor="hours-select" className="text-xs font-bold text-gray-900">
          {nr('hourPackage')} <span className="text-red-500">*</span>
        </Label>
        <Select
          value={getSelectedHoursOption}
          onValueChange={(value) => {
            if (value === 'custom') {
              setIsCustomHours(true);
              setFormData(prev => ({ ...prev, hours: '' }));
            } else {
              setIsCustomHours(false);
              setFormData(prev => ({ ...prev, hours: parseInt(value) }));
            }
          }}
        >
          <SelectTrigger id="hours-select" className="w-full text-sm h-10 rounded-lg bg-gray-50 border-0">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">{nr('fiveHours')}</SelectItem>
            <SelectItem value="10">{nr('tenHours')}</SelectItem>
            <SelectItem value="custom">{nr('otherHours')}</SelectItem>
          </SelectContent>
        </Select>
        {isCustomHours && (
          <Input
            id="hours"
            type="number"
            min="5"
            required
            value={formData.hours}
            onChange={(e) => {
              const value = e.target.value;
              setFormData(prev => ({ ...prev, hours: value === '' ? '' : parseInt(value) || '' }));
            }}
            placeholder="Quantidade de horas (mín. 5)"
            className="text-sm h-10 rounded-lg bg-gray-50 border-0"
          />
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="origin-hourly" className="text-xs font-bold text-gray-900">
          {nr('departurePoint')} <span className="text-red-500">*</span>
        </Label>
        <Suspense fallback={<ComponentLoader />}>
          <LocationAutocomplete
            id="origin-hourly"
            required
            value={formData.origin}
            onChange={(value) => startTransition(() => setFormData(prev => ({ ...prev, origin: value })))}
            placeholder={nr('originHourlyPlaceholder')}
            className="text-sm h-10 rounded-lg bg-gray-50"
          />
        </Suspense>
      </div>

      {originIsAirport && (
        <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex justify-between items-start mb-1">
            <Label htmlFor="origin_flight_number_hourly" className="flex items-center gap-2 text-sm font-bold text-blue-900">
              <PlaneIcon className="w-4 h-4 text-blue-600" />
              {nr('flightOriginHourly')} *
            </Label>
            <Suspense fallback={<ComponentLoader />}>
              <FlightStatusChecker
                flightNumber={formData.origin_flight_number}
                date={formData.date}
                expectedOrigin={formData.origin}
                checkType="arrival"
              />
            </Suspense>
          </div>
          <Input
            id="origin_flight_number_hourly"
            value={formData.origin_flight_number}
            onChange={(e) => setFormData(prev => ({ ...prev, origin_flight_number: e.target.value }))}
            placeholder="Ex: LA 3000, GOL 1234"
            className="bg-white"
          />
          <p className="text-xs text-blue-700">{nr('arrivalTracking')}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-gray-900">
            {nr('additionalStops')} <span className="text-red-500">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFormData(prev => ({ ...prev, additional_stops: [...(prev.additional_stops || []), ''] }))}
            className="text-xs h-7 border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <Plus className="w-3 h-3 mr-1" />
            {nr('addStop')}
          </Button>
        </div>

        {(!formData.additional_stops || formData.additional_stops.length === 0) && (
          <Alert className="bg-orange-50 border-orange-200 py-2">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <AlertDescription className="text-orange-800 text-xs leading-snug">
                {nr('additionalStopsWarning')}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="space-y-2">
          {formData.additional_stops?.map((stop, index) => (
            <div key={index} className="flex gap-2">
              <Suspense fallback={<ComponentLoader />}>
                <LocationAutocomplete
                  value={stop}
                  onChange={(value) => {
                    startTransition(() => {
                      const newStops = [...formData.additional_stops];
                      newStops[index] = value;
                      setFormData(prev => ({ ...prev, additional_stops: newStops }));
                    });
                  }}
                  placeholder={`${nr('stopAddressPlaceholder')} ${index + 1}`}
                  className="text-sm h-10 rounded-lg bg-gray-50 flex-1"
                />
              </Suspense>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newStops = formData.additional_stops.filter((_, i) => i !== index);
                  setFormData(prev => ({ ...prev, additional_stops: newStops }));
                }}
                className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="destination-hourly" className="text-xs font-bold text-gray-900">
          {nr('finalDestination')} <span className="text-red-500">*</span>
        </Label>
        <Suspense fallback={<ComponentLoader />}>
          <LocationAutocomplete
            id="destination-hourly"
            required
            value={formData.destination}
            onChange={(value) => startTransition(() => setFormData(prev => ({ ...prev, destination: value })))}
            placeholder={nr('destinationHourlyPlaceholder')}
            className="text-sm h-10 rounded-lg bg-gray-50"
          />
        </Suspense>
      </div>

      {destinationIsAirport && (
        <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex justify-between items-start mb-1">
            <Label htmlFor="destination_flight_number_hourly" className="flex items-center gap-2 text-sm font-bold text-blue-900">
              <PlaneIcon className="w-4 h-4 text-blue-600" />
              {nr('flightDestinationHourly')} *
            </Label>
            <Suspense fallback={<ComponentLoader />}>
              <FlightStatusChecker
                flightNumber={formData.destination_flight_number}
                date={formData.date}
                expectedDestination={formData.destination}
                checkType="departure"
              />
            </Suspense>
          </div>
          <Input
            id="destination_flight_number_hourly"
            value={formData.destination_flight_number}
            onChange={(e) => setFormData(prev => ({ ...prev, destination_flight_number: e.target.value }))}
            placeholder="Ex: LA 3000, GOL 1234"
            className="bg-white"
          />
          <p className="text-xs text-blue-700">{nr('departureTracking')}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="date-hourly" className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          {nr('date')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="date-hourly"
          type="date"
          required
          min={minDateBasedOnLeadTime}
          value={formData.date}
          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          className="w-full text-xs md:text-sm h-9 md:h-10 rounded-lg bg-gray-50 border-0"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="time-hourly" className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          {nr('time')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="time-hourly"
          type="time"
          required
          value={formData.time}
          onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
          className="w-full text-xs md:text-sm h-9 md:h-10 rounded-lg bg-gray-50 border-0"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email-hourly" className="text-xs font-bold text-gray-900">
          {nr('email')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email-hourly"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder={nr('emailPlaceholder')}
          className="text-sm h-10 rounded-lg bg-gray-50"
        />
      </div>

      <div className="space-y-1.5 bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
        <Label htmlFor="phone-hourly" className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
          <span className="w-3.5 h-3.5 text-blue-600">📞</span>
          {nr('phone')} <span className="text-red-500">*</span>
        </Label>
        <Suspense fallback={<ComponentLoader />}>
          <PhoneInputWithCountry
            id="phone-hourly"
            required
            value={formData.phone}
            onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
            placeholder="(00) 00000-0000"
          />
        </Suspense>
        <p className="text-xs text-blue-700">{nr('phoneCountryCode')}</p>
      </div>
    </TabsContent>
  );
}