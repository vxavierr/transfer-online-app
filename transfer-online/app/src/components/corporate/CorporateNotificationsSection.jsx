import React, { Suspense } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { BellRing, Plus, Trash2, Loader2 } from 'lucide-react';

const PhoneInputWithCountry = React.lazy(() => import('@/components/ui/PhoneInputWithCountry'));

const ComponentLoader = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
  </div>
);

export default function CorporateNotificationsSection({
  wantNotifications,
  onWantNotificationsChange,
  notificationPhones,
  onPhonesChange
}) {
  const handleAddPhone = () => {
    onPhonesChange([...notificationPhones, '']);
  };

  const handleRemovePhone = (index) => {
    onPhonesChange(notificationPhones.filter((_, i) => i !== index));
  };

  const handlePhoneChange = (index, value) => {
    const updated = [...notificationPhones];
    updated[index] = value;
    onPhonesChange(updated);
  };

  return (
    <div className="mb-8 pb-6 border-b border-gray-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <BellRing className="w-6 h-6 text-blue-600" />
        Notificações da Viagem
      </h2>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-3 mb-4">
          <Checkbox 
            id="want_notifications" 
            checked={wantNotifications} 
            onCheckedChange={onWantNotificationsChange}
            className="mt-1"
          />
          <div>
            <Label 
              htmlFor="want_notifications" 
              className="text-base font-semibold text-blue-900 cursor-pointer"
            >
              Deseja receber notificações sobre esta viagem?
            </Label>
            <p className="text-sm text-blue-700 mt-1">
              Ao marcar esta opção, os números informados receberão o link da timeline em tempo real assim que o motorista iniciar a viagem.
            </p>
          </div>
        </div>

        {wantNotifications && (
          <div className="pl-7 space-y-3 animate-in fade-in slide-in-from-top-2">
            <Label className="text-sm font-semibold text-blue-900">
              Telefones para notificação (WhatsApp)
            </Label>

            {notificationPhones.map((phone, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <Suspense fallback={<ComponentLoader />}>
                    <PhoneInputWithCountry
                      value={phone}
                      onChange={(value) => handlePhoneChange(index, value)}
                      placeholder="(00) 00000-0000"
                      className="bg-white"
                    />
                  </Suspense>
                </div>
                {notificationPhones.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePhone(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPhone}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <Plus className="w-3 h-3 mr-1" />
              Adicionar outro telefone
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}