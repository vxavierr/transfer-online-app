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

export default function RoundTripTabContent({
  formData,
  setFormData,
  startTransition,
  originIsAirport,
  destinationIsAirport,
  returnOriginIsAirport,
  returnDestinationIsAirport,
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
        <Label htmlFor="origin-rt" className="text-xs font-bold text-gray-900">
          {nr('whereFrom')} <span className="text-red-500">*</span>
        </Label>
        <Suspense fallback={<ComponentLoader />}>
          <LocationAutocomplete
           id="origin-rt"
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
          <Label htmlFor="origin_flight_number_rt" className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
            <PlaneIcon className="w-3.5 h-3.5 text-blue-600" />
            {nr('flightOutbound')}
          </Label>
          <Input
            id="origin_flight_number_rt"
            value={formData.origin_flight_number}
            onChange={(e) => setFormData({...formData, origin_flight_number: e.target.value})}
            placeholder="Ex: LA 3000, GOL 1234"
            className="text-sm h-10 rounded-lg bg-white"
          />
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
        <Label htmlFor="destination-rt" className="text-xs font-bold text-gray-900">
          {nr('whereTo')} <span className="text-red-500">*</span>
        </Label>
        <Suspense fallback={<ComponentLoader />}>
          <LocationAutocomplete
           id="destination-rt"
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
          <Label htmlFor="destination_flight_number_rt" className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
            <PlaneIcon className="w-3.5 h-3.5 text-blue-600" />
            {nr('flightOutbound')}
          </Label>
          <Input
            id="destination_flight_number_rt"
            value={formData.destination_flight_number}
            onChange={(e) => setFormData({...formData, destination_flight_number: e.target.value})}
            placeholder="Ex: LA 3000, GOL 1234"
            className="text-sm h-10 rounded-lg bg-white"
          />
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

      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200/50">
        <h3 className="font-bold text-xs mb-2 text-blue-900">{nr('outbound')}</h3>
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label htmlFor="date-rt" className="flex items-center gap-1 text-xs font-bold text-gray-900">
              <Calendar className="w-3 h-3 text-blue-600" />
              Data <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date-rt"
              type="date"
              required
              min={formData.date || minDateBasedOnLeadTime}
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="w-full text-xs md:text-sm h-8 md:h-9 rounded-lg bg-white border-0 [&::-webkit-date-and-time-value]:text-xs md:[&::-webkit-date-and-time-value]:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="time-rt" className="flex items-center gap-1 text-xs font-bold text-gray-900">
              <Clock className="w-3 h-3 text-blue-600" />
              Horário <span className="text-red-500">*</span>
            </Label>
            <Input
              id="time-rt"
              type="time"
              required
              value={formData.time}
              onChange={(e) => setFormData({...formData, time: e.target.value})}
              className="w-full text-xs md:text-sm h-8 md:h-9 rounded-lg bg-white border-0 [&::-webkit-date-and-time-value]:text-xs md:[&::-webkit-date-and-time-value]:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-green-50 p-3 rounded-lg border border-green-200/50">
        <h3 className="font-bold text-xs mb-2 text-green-900">{nr('return')}</h3>
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label htmlFor="return-date" className="flex items-center gap-1 text-xs font-bold text-gray-900">
              <Calendar className="w-3 h-3 text-green-600" />
              Data <span className="text-red-500">*</span>
            </Label>
            <Input
              id="return-date"
              type="date"
              required
              min={formData.date || minDateBasedOnLeadTime}
              value={formData.return_date}
              onChange={(e) => setFormData({...formData, return_date: e.target.value})}
              className="w-full text-xs md:text-sm h-8 md:h-9 rounded-lg bg-white border-0 [&::-webkit-date-and-time-value]:text-xs md:[&::-webkit-date-and-time-value]:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="return-time" className="flex items-center gap-1 text-xs font-bold text-green-900">
              <Clock className="w-3 h-3 text-green-600" />
              Horário <span className="text-red-500">*</span>
            </Label>
            <Input
              id="return-time"
              type="time"
              required
              value={formData.return_time}
              onChange={(e) => setFormData({...formData, return_time: e.target.value})}
              className="w-full text-xs md:text-sm h-8 md:h-9 rounded-lg bg-white border-0 [&::-webkit-date-and-time-value]:text-xs md:[&::-webkit-date-and-time-value]:text-sm"
            />
          </div>
        </div>
      </div>

      {returnOriginIsAirport && (
        <div className="space-y-1.5 bg-green-50 border border-green-200 rounded-lg p-3">
          <Label htmlFor="return_origin_flight_number" className="flex items-center gap-1.5 text-xs font-bold text-green-900">
            <PlaneIcon className="w-3.5 h-3.5 text-green-600" />
            {nr('flightReturnOrigin')} *
          </Label>
          <Input
            id="return_origin_flight_number"
            value={formData.return_origin_flight_number}
            onChange={(e) => setFormData({...formData, return_origin_flight_number: e.target.value})}
            placeholder="Ex: LA 3001, GOL 1235"
            className="text-sm h-10 rounded-lg bg-white"
          />
          {user?.client_id && (
            <Suspense fallback={<ComponentLoader />}>
              <FlightStatusChecker 
                flightNumber={formData.return_origin_flight_number} 
                date={formData.return_date}
                expectedOrigin={formData.destination}
                checkType="arrival"
                className="mt-2"
              />
            </Suspense>
          )}
        </div>
      )}

      {returnDestinationIsAirport && (
       <div className="space-y-1.5 bg-green-50 border border-green-200 rounded-lg p-3">
         <Label htmlFor="return_destination_flight_number" className="flex items-center gap-1.5 text-xs font-bold text-green-900">
           <PlaneIcon className="w-3.5 h-3.5 text-green-600" />
           {nr('flightReturnDestination')} *
         </Label>
         <Input
           id="return_destination_flight_number"
           value={formData.return_destination_flight_number}
           onChange={(e) => setFormData({...formData, return_destination_flight_number: e.target.value})}
           placeholder="Ex: LA 3001, GOL 1235"
           className="text-sm h-10 rounded-lg bg-white"
         />
         {user?.client_id && (
           <Suspense fallback={<ComponentLoader />}>
             <FlightStatusChecker 
               flightNumber={formData.return_destination_flight_number} 
               date={formData.return_date}
               expectedDestination={formData.origin}
               checkType="departure"
               className="mt-2"
             />
           </Suspense>
         )}
       </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email-rt" className="text-xs font-bold text-gray-900">
          {nr('email')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email-rt"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          placeholder={nr('emailPlaceholder')}
          className="text-sm h-10 rounded-lg bg-gray-50"
        />
      </div>

      <div className="space-y-1.5 bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
        <Label htmlFor="phone-rt" className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
          <Phone className="w-3.5 h-3.5 text-blue-600" />
          {nr('phone')} <span className="text-red-500">*</span>
        </Label>
        <Suspense fallback={<ComponentLoader />}>
          <PhoneInputWithCountry
            id="phone-rt"
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