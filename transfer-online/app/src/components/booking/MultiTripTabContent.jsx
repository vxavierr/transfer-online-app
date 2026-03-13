import React, { Suspense } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Phone } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const PhoneInputWithCountry = React.lazy(() => import('../ui/PhoneInputWithCountry'));
const MultiTripManager = React.lazy(() => import('./MultiTripManager'));

const ComponentLoader = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
  </div>
);

export default function MultiTripTabContent({
  formData,
  setFormData,
  multiTripLegs,
  setMultiTripLegs,
  vehicleTypes,
  driverLanguage,
  minDateBasedOnLeadTime,
  isAirport,
  t,
  user,
  canViewPricesWithoutLogin
}) {
  const nr = (key, params) => t(`novaReserva.${key}`, params || {});

  return (
    <div className="space-y-3 mt-3">
      <div className="space-y-1.5">
        <Label htmlFor="email-multi" className="text-xs font-bold text-gray-900">
          {nr('email')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email-multi"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          placeholder={nr('emailPlaceholder')}
          className="text-sm h-10 rounded-lg bg-gray-50"
        />
      </div>

      <div className="space-y-1.5 bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
        <Label htmlFor="phone-multi" className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
          <Phone className="w-3.5 h-3.5 text-blue-600" />
          {nr('phone')} <span className="text-red-500">*</span>
        </Label>
        <Suspense fallback={<ComponentLoader />}>
          <PhoneInputWithCountry
            id="phone-multi"
            required
            value={formData.phone}
            onChange={(value) => setFormData({...formData, phone: value})}
            placeholder="(00) 00000-0000"
          />
        </Suspense>
        <p className="text-xs text-blue-700">
          {nr('phoneCountryCode')}
        </p>
      </div>

      <Suspense fallback={<ComponentLoader />}>
        <MultiTripManager
          legs={multiTripLegs}
          setLegs={setMultiTripLegs}
          vehicleTypes={vehicleTypes}
          driverLanguage={driverLanguage}
          minDateBasedOnLeadTime={minDateBasedOnLeadTime}
          isAirport={isAirport}
          t={t}
          user={user}
          canViewPricesWithoutLogin={canViewPricesWithoutLogin}
        />
      </Suspense>
    </div>
  );
}