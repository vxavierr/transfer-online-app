import React from 'react';
import { User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PassengerNamesFields({ passengerCount, passengerNames, onChange, t }) {
  if (passengerCount <= 1) return null;

  return (
    <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
      <div>
        <Label className="flex items-center gap-1.5 text-xs font-semibold text-gray-900">
          <User className="w-4 h-4 text-blue-600" />
          {t('bookingForm.additionalPassengersTitle')}
        </Label>
        <p className="mt-1 text-xs text-gray-500">{t('bookingForm.leadPassengerHelper')}</p>
      </div>

      {Array.from({ length: passengerCount - 1 }, (_, index) => {
        const passengerNumber = index + 2;

        return (
          <div key={passengerNumber} className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-900">
              {t('bookingForm.passengerNameLabel').replace('{number}', passengerNumber)} <span className="text-red-500">*</span>
            </Label>
            <Input
              value={passengerNames[index] || ''}
              onChange={(e) => onChange(index, e.target.value)}
              placeholder={t('bookingForm.passengerNamePlaceholder').replace('{number}', passengerNumber)}
              className="w-full px-3 py-2.5 text-sm h-10 bg-white"
              required
            />
          </div>
        );
      })}
    </div>
  );
}