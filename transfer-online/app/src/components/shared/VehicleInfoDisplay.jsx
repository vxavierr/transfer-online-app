import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Car, User, Phone } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function VehicleInfoDisplay({ 
  vehicleType, 
  vehicleModel, 
  vehiclePlate, 
  vehicleColor,
  driverName,
  driverPhone,
  driverPhotoUrl,
  driverRating
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Car className="w-4 h-4 text-blue-600" />
          Veículo e Motorista
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Veículo */}
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-sm text-gray-900">{vehicleType || 'Tipo não definido'}</p>
              <p className="text-xs text-gray-600 mt-1">
                {vehicleModel} {vehicleColor ? `• ${vehicleColor}` : ''}
              </p>
            </div>
            {vehiclePlate && (
              <div className="bg-white border border-gray-200 px-2 py-1 rounded text-xs font-mono font-bold text-gray-800 shadow-sm">
                {vehiclePlate}
              </div>
            )}
          </div>
        </div>

        {/* Motorista */}
        {driverName ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-gray-200">
              <AvatarImage src={driverPhotoUrl} />
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {driverName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{driverName}</p>
              {driverPhone && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {driverPhone}
                </p>
              )}
            </div>
            {driverRating && (
              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-100">
                <span className="text-xs font-bold text-yellow-700">★ {driverRating}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2 text-gray-500 text-xs italic border-t border-gray-100">
            Motorista ainda não designado
          </div>
        )}
      </CardContent>
    </Card>
  );
}