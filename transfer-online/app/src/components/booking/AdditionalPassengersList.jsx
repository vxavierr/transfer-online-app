import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  UserPlus,
  Trash2,
  User,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function AdditionalPassengersList({
  passengers = [],
  onChange,
  maxPassengers,
  mainPassengerName
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPassenger, setNewPassenger] = useState({
    name: '',
    email: '',
    phone_number: ''
  });

  const handleAddPassenger = () => {
    if (!newPassenger.name.trim()) {
      return;
    }

    onChange([...passengers, { ...newPassenger }]);
    setNewPassenger({ name: '', email: '', phone_number: '' });
    setShowAddForm(false);
  };

  const handleRemovePassenger = (index) => {
    onChange(passengers.filter((_, i) => i !== index));
  };

  const remainingSlots = maxPassengers - 1 - passengers.length; // -1 porque o principal já ocupa 1 vaga

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Passageiros Adicionais {passengers.length > 0 && `(${passengers.length})`}
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            {remainingSlots > 0 
              ? `Você pode adicionar até ${remainingSlots} passageiro${remainingSlots > 1 ? 's' : ''} adicional${remainingSlots > 1 ? 'is' : ''}` 
              : 'Todos os passageiros foram adicionados'}
          </p>
        </div>
        {remainingSlots > 0 && !showAddForm && (
          <Button
            onClick={() => setShowAddForm(true)}
            variant="outline"
            size="sm"
            className="border-green-400 text-green-700 hover:bg-green-50"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar Passageiro
          </Button>
        )}
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-xs">
          💡 <strong>Passageiro Principal:</strong> {mainPassengerName}<br />
          {remainingSlots > 0 && `Adicione os ${remainingSlots > 1 ? 'demais passageiros' : 'outro passageiro'} que estará${remainingSlots > 1 ? 'ão' : ''} na viagem.`}
        </AlertDescription>
      </Alert>

      {/* Lista de passageiros adicionados */}
      {passengers.length > 0 && (
        <div className="space-y-2">
          {passengers.map((passenger, index) => (
            <Card key={index} className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {passenger.name}
                      </p>
                      {passenger.email && (
                        <p className="text-xs text-gray-600 truncate">{passenger.email}</p>
                      )}
                      {passenger.phone_number && (
                        <p className="text-xs text-gray-500">{passenger.phone_number}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRemovePassenger(index)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Formulário para adicionar novo passageiro */}
      {showAddForm && (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900 text-sm">Adicionar Passageiro</h4>
              <Button
                onClick={() => {
                  setShowAddForm(false);
                  setNewPassenger({ name: '', email: '', phone_number: '' });
                }}
                variant="ghost"
                size="sm"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Nome Completo *</Label>
              <Input
                value={newPassenger.name}
                onChange={(e) => setNewPassenger({ ...newPassenger, name: e.target.value })}
                placeholder="Ex: João Silva"
                className="bg-white text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Email (Opcional)</Label>
              <Input
                type="email"
                value={newPassenger.email}
                onChange={(e) => setNewPassenger({ ...newPassenger, email: e.target.value })}
                placeholder="Ex: joao@exemplo.com"
                className="bg-white text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Telefone (Opcional)</Label>
              <PhoneInputWithCountry
                value={newPassenger.phone_number}
                onChange={(value) => setNewPassenger({ ...newPassenger, phone_number: value })}
                placeholder="Ex: (11) 99999-9999"
                className="bg-white text-sm"
              />
            </div>

            <Button
              onClick={handleAddPassenger}
              disabled={!newPassenger.name.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-sm"
              size="sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Adicionar à Lista
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}