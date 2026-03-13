import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, MapPin, Users, Car, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function TransferPassengerDialog({ isOpen, onClose, passenger, currentTrip, availableTrips, onConfirm }) {
    const [selectedTripId, setSelectedTripId] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!selectedTripId) {
            alert("Selecione uma viagem de destino");
            return;
        }

        const targetTrip = availableTrips.find(t => t.id === selectedTripId);
        if (!targetTrip) return;

        const confirmMsg = `Transferir ${passenger?.passenger_name || 'passageiro'} de:\n\n` +
            `${currentTrip?.date ? format(new Date(currentTrip.date + 'T12:00:00'), 'dd/MM') : 'Data não definida'} às ${currentTrip?.start_time || '--:--'}\n` +
            `${currentTrip?.origin || 'Origem'} → ${currentTrip?.destination || 'Destino'}\n\n` +
            `Para:\n\n` +
            `${targetTrip?.date ? format(new Date(targetTrip.date + 'T12:00:00'), 'dd/MM') : 'Data não definida'} às ${targetTrip?.start_time || '--:--'}\n` +
            `${targetTrip?.origin || 'Origem'} → ${targetTrip?.destination || 'Destino'}\n\n` +
            `Confirmar transferência?`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            await onConfirm(selectedTripId);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <ArrowRight className="w-5 h-5" />
                    Transferir Passageiro
                </DialogTitle>
                <DialogDescription>
                    Selecione a viagem de destino para {passenger?.passenger_name}
                </DialogDescription>
            </DialogHeader>

            {!currentTrip ? (
                <div className="py-8 text-center text-gray-500">
                    Carregando informações da viagem...
                </div>
            ) : (
                <div className="space-y-4 py-4">
                    {/* Current Trip */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs font-bold text-blue-900 uppercase mb-2">Viagem Atual</p>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold">
                                    {currentTrip.date ? format(new Date(currentTrip.date + 'T12:00:00'), 'dd/MM/yyyy') : 'Data não definida'} às {currentTrip.start_time || '--:--'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <span>{currentTrip.origin || 'Origem'} → {currentTrip.destination || 'Destino'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Users className="w-4 h-4 text-blue-600" />
                                <span>{currentTrip.passenger_count || currentTrip.passengers?.length || 0} passageiros</span>
                            </div>
                        </div>
                    </div>

                    {/* Available Trips */}
                    <div>
                        <p className="text-sm font-bold text-gray-700 mb-3">Selecione a viagem de destino:</p>
                        
                        {availableTrips.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>Nenhuma outra viagem disponível para transferência.</p>
                            </div>
                        ) : (
                            <RadioGroup value={selectedTripId} onValueChange={setSelectedTripId}>
                                <div className="space-y-2">
                                    {availableTrips.map(trip => {
                                        const isFull = trip.vehicle_capacity && trip.passenger_count >= trip.vehicle_capacity;
                                        const passengerCount = trip.passenger_count || trip.passengers?.length || 0;
                                        
                                        return (
                                            <div key={trip.id} className={`border rounded-lg p-4 transition-all ${selectedTripId === trip.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'} ${isFull ? 'opacity-50' : ''}`}>
                                                <div className="flex items-start gap-3">
                                                    <RadioGroupItem value={trip.id} id={trip.id} disabled={isFull} className="mt-1" />
                                                    <Label htmlFor={trip.id} className="flex-1 cursor-pointer">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Clock className="w-4 h-4 text-gray-500" />
                                                                    <span className="font-semibold text-sm">
                                                                        {trip.date ? format(new Date(trip.date + 'T12:00:00'), 'dd/MM/yyyy') : 'Data não definida'} às {trip.start_time || '--:--'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    {isFull && (
                                                                        <Badge variant="destructive" className="text-xs">
                                                                            Lotado
                                                                        </Badge>
                                                                    )}
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {passengerCount}/{trip.vehicle_capacity || '∞'} pax
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                <MapPin className="w-4 h-4" />
                                                                <span>{trip.origin} → {trip.destination}</span>
                                                            </div>

                                                            {trip.vehicle_type_category && (
                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                    <Car className="w-3 h-3" />
                                                                    <span className="capitalize">{trip.vehicle_type_category}</span>
                                                                </div>
                                                            )}

                                                            {trip.driver_info && (
                                                                <div className="text-xs text-gray-500">
                                                                    Motorista: {trip.driver_info.name}
                                                                </div>
                                                            )}

                                                            {trip.notes && (
                                                                <p className="text-xs text-gray-500 italic">{trip.notes}</p>
                                                            )}
                                                        </div>
                                                    </Label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </RadioGroup>
                        )}
                    </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={loading || !selectedTripId}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Transferindo...
                            </>
                        ) : (
                            <>
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Confirmar Transferência
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}