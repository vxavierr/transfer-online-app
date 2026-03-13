import React, { Suspense } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Phone, Plane as PlaneIcon, Loader2 } from 'lucide-react';

const LocationAutocomplete = React.lazy(() => import('./LocationAutocomplete'));
const PhoneInputWithCountry = React.lazy(() => import('../ui/PhoneInputWithCountry'));
const FlightStatusChecker = React.lazy(() => import('../flight/FlightStatusChecker'));

const ComponentLoader = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
  </div>
);

export default function OneWayTabContent({
  formData,
  setFormData,
  startTransition,
  originIsAirport,
  destinationIsAirport,
  minDateBasedOnLeadTime,
  setOriginLocationType,
  setDestinationLocationType,
  user,
  t
}) {
  const nr = (key, params) => t(`novaReserva.${key}`, params || {});

  return (
    <div className="space-y-3 mt-3">
      <div className="space-y-1.5">
        <Label htmlFor="origin" className="text-xs font-bold text-gray-900">
          {nr('whereFrom')} <span className="text-red-500">*</span>
        </Label>
        <Suspense fallback={<ComponentLoader />}>
          <LocationAutocomplete
           id="origin"
           required
           value={formData.origin}
           onChange={(value) => startTransition(() => setFormData({...formData, origin: value}))}
           onLocationSelect={(loc) => startTransition(() => setOriginLocationType(loc?.type || null))}
           placeholder={nr('originPlaceholder')}
           className="text-sm h-10 rounded-lg bg-gray-50"
          />
        </Suspense>
      </div>

      {originIsAirport && (
        <div className="space-y-1.5 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <Label htmlFor="origin_flight_number" className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
            <PlaneIcon className="w-3.5 h-3.5 text-blue-600" />
            {nr('flightNumber')}
          </Label>
          <Input
            id="origin_flight_number"
            value={formData.origin_flight_number}
            onChange={(e) => setFormData({...formData, origin_flight_number: e.target.value})}
            placeholder="Ex: LA 3000, GOL 1234"
            className="text-sm h-10 rounded-lg bg-white"
          />
          <p className="text-xs text-blue-700">
            {nr('arrivalTracking')}
          </p>
          {user?.client_id && (
            <Suspense fallback={<ComponentLoader />}>
              <FlightStatusChecker 
                flightNumber={formData.origin_flight_number} 
                date={formData.date}
                expectedOrigin={formData.origin}
                checkType="arrival"
                className="mt-2"
              />
            </Suspense>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="destination" className="text-xs font-bold text-gray-900">
          {nr('whereTo')} <span className="text-red-500">*</span>
        </Label>
        <Suspense fallback={<ComponentLoader />}>
          <LocationAutocomplete
           id="destination"
           required
           value={formData.destination}
           onChange={(value) => startTransition(() => setFormData({...formData, destination: value}))}
           onLocationSelect={(loc) => startTransition(() => setDestinationLocationType(loc?.type || null))}
           placeholder={nr('destinationPlaceholder')}
           className="text-sm h-10 rounded-lg bg-gray-50"
          />
        </Suspense>
      </div>

      {destinationIsAirport && (
        <div className="space-y-1.5 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <Label htmlFor="destination_flight_number" className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
            <PlaneIcon className="w-3.5 h-3.5 text-blue-600" />
            {nr('flightNumber')}
          </Label>
          <Input
            id="destination_flight_number"
            value={formData.destination_flight_number}
            onChange={(e) => setFormData({...formData, destination_flight_number: e.target.value})}
            placeholder="Ex: LA 3000, GOL 1234"
            className="text-sm h-10 rounded-lg bg-white"
          />
          <p className="text-xs text-blue-700">
            {nr('departureTracking')}
          </p>
          {user?.client_id && (
            <Suspense fallback={<ComponentLoader />}>
              <FlightStatusChecker 
                flightNumber={formData.destination_flight_number} 
                date={formData.date}
                expectedDestination={formData.destination}
                checkType="departure"
                className="mt-2"
              />
            </Suspense>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="date" className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          {nr('date')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="date"
          type="date"
          required
          min={minDateBasedOnLeadTime}
          value={formData.date}
          onChange={(e) => setFormData({...formData, date: e.target.value})}
          className="w-full text-xs md:text-sm h-9 md:h-10 rounded-lg bg-gray-50 border-0 [&::-webkit-date-and-time-value]:text-xs md:[&::-webkit-date-and-time-value]:text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="time" className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          {nr('time')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="time"
          type="time"
          required
          value={formData.time}
          onChange={(e) => setFormData({...formData, time: e.target.value})}
          className="w-full text-xs md:text-sm h-9 md:h-10 rounded-lg bg-gray-50 border-0 [&::-webkit-date-and-time-value]:text-xs md:[&::-webkit-date-and-time-value]:text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-bold text-gray-900">
          {nr('email')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          placeholder={nr('emailPlaceholder')}
          className="text-sm h-10 rounded-lg bg-gray-50"
        />
      </div>

      <div className="space-y-1.5 bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
        <Label htmlFor="phone" className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
          <Phone className="w-3.5 h-3.5 text-blue-600" />
          {nr('phone')} <span className="text-red-500">*</span>
        </Label>
        <Suspense fallback={<ComponentLoader />}>
          <PhoneInputWithCountry
            id="phone"
            required
            value={formData.phone}
            onChange={(value) => setFormData({...formData, phone: value})}
            placeholder="(00) 00000-0000"
            className=""
          />
        </Suspense>
        <p className="text-xs text-blue-700">
          {nr('phoneCountryCode')}
        </p>
      </div>

      {originIsAirport && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mt-1">
          <p className="text-xs text-amber-800 font-medium">{nr('airportParkingNotice')}</p>
        </div>
      )}
    </div>
  );
}