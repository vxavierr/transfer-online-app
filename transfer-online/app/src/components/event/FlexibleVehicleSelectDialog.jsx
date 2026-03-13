import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Users, Loader2, AlertCircle } from "lucide-react";

export default function FlexibleVehicleSelectDialog({ 
    isOpen, 
    onClose, 
    passenger, 
    flexibleVehicles,
    onSelectVehicle 
}) {
    const [loading, setLoading] = useState(false);

    const handleSelect = async (vehicleId) => {
        setLoading(true);
        try {
            await onSelectVehicle(vehicleId);
            onClose();
        } catch (error) {
            console.error('Error selecting vehicle:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!passenger) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Car className="w-6 h-6 text-purple-600" />
                        Selecione o Veículo para Embarque
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Passageiro:</p>
                        <p className="text-lg font-bold text-blue-900">{passenger.passenger_name}</p>
                        {passenger.passenger_phone && (
                            <p className="text-sm text-blue-700 mt-1">{passenger.passenger_phone}</p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Car className="w-4 h-4" />
                            Veículos Disponíveis:
                        </p>

                        {flexibleVehicles.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Car className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>Nenhum veículo flexível disponível</p>
                                <p className="text-xs text-gray-400 mt-1">Todos os veículos estão lotados</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {flexibleVehicles.map(vehicle => {
                                    const occupancyRate = vehicle.vehicle_capacity 
                                        ? ((vehicle.current_passenger_count || 0) / vehicle.vehicle_capacity) * 100
                                        : 0;
                                    const isFull = vehicle.vehicle_capacity && vehicle.current_passenger_count >= vehicle.vehicle_capacity;
                                    const spotsLeft = vehicle.vehicle_capacity - (vehicle.current_passenger_count || 0);

                                    return (
                                        <button
                                            key={vehicle.id}
                                            onClick={() => handleSelect(vehicle.id)}
                                            disabled={isFull || loading}
                                            className={`text-left p-4 rounded-lg border-2 transition-all ${
                                                isFull 
                                                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                                                    : 'bg-white border-purple-300 hover:border-purple-500 hover:bg-purple-50 hover:shadow-md'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                                                        {vehicle.vehicle_type_category}
                                                    </Badge>
                                                    <span className="font-bold text-gray-900">{vehicle.name}</span>
                                                </div>
                                                {isFull ? (
                                                    <Badge className="bg-red-100 text-red-800">LOTADO</Badge>
                                                ) : spotsLeft <= 3 ? (
                                                    <Badge className="bg-yellow-100 text-yellow-800">
                                                        {spotsLeft} {spotsLeft === 1 ? 'vaga' : 'vagas'}
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-green-100 text-green-800">
                                                        {spotsLeft} vagas
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Users className="w-4 h-4" />
                                                    <span className="font-medium">
                                                        {vehicle.current_passenger_count || 0} / {vehicle.vehicle_capacity || '∞'} ocupados
                                                    </span>
                                                </div>
                                                
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-300 ${
                                                            occupancyRate >= 100 ? 'bg-red-500' :
                                                            occupancyRate >= 80 ? 'bg-yellow-500' :
                                                            'bg-green-500'
                                                        }`}
                                                        style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                                                    />
                                                </div>

                                                {vehicle.driver_info && (
                                                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                                                        <p><strong>Motorista:</strong> {vehicle.driver_info.name || 'Não atribuído'}</p>
                                                        {vehicle.driver_info.vehicle_model && (
                                                            <p><strong>Veículo:</strong> {vehicle.driver_info.vehicle_model}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold">Atenção:</p>
                            <p>A seleção do veículo é <strong>definitiva</strong> e será registrada no sistema imediatamente.</p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}