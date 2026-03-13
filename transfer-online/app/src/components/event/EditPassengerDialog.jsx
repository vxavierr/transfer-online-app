import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function EditPassengerDialog({ isOpen, onClose, passenger, allPassengers = [], trips = [], onUpdate }) {
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [applyToAll, setApplyToAll] = useState(true); // Default true para facilitar

    useEffect(() => {
        if (passenger) {
            setFormData({
                passenger_name: passenger.passenger_name || '',
                document_id: passenger.document_id || '',
                passenger_email: passenger.passenger_email || '',
                passenger_phone: passenger.passenger_phone || '',
                passenger_city_origin: passenger.passenger_city_origin || '',
                date: passenger.date || '',
                time: passenger.time || '',
                trip_type: passenger.trip_type || 'IN',
                origin_address: passenger.origin_address || passenger.arrival_point || '',
                destination_address: passenger.destination_address || '',
                flight_number: passenger.flight_number || '',
                airline: passenger.airline || '',
                is_companion: passenger.is_companion || false,
                main_passenger_id: passenger.main_passenger_id || 'none',
                companion_relationship: passenger.companion_relationship || '',
                tags: passenger.tags ? passenger.tags.join(', ') : '',
                is_flexible_allocation: passenger.is_flexible_allocation || false,
                event_trip_id: passenger.event_trip_id || 'none'
            });
        }
    }, [passenger]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSwapLocations = () => {
        setFormData(prev => ({
            ...prev,
            origin_address: prev.destination_address,
            destination_address: prev.origin_address
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = { ...formData };
            if (payload.main_passenger_id === 'none') payload.main_passenger_id = null;
            
            // Se virou principal, limpar dados de acompanhante
            if (!payload.is_companion) {
                payload.main_passenger_id = null;
                payload.companion_relationship = null;
            }

            // Converter tags string para array
            if (typeof payload.tags === 'string') {
                payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean);
            }

            // CORREÇÃO: Mapear o campo de origem correto baseado no tipo de viagem
            // O formulário usa 'origin_address' como campo genérico de input para a origem.
            // Se for IN (Chegada), devemos salvar em 'arrival_point' e limpar 'origin_address' para a listagem priorizar corretamente.
            // Se for OUT ou Door-to-Door, salvamos em 'origin_address' e limpamos 'arrival_point'.
            if (payload.trip_type === 'IN') {
                 payload.arrival_point = payload.origin_address;
                 payload.origin_address = null; 
            } else {
                 // Para OUT, door_to_door e outros, mantemos no origin_address
                 // Mas garantimos limpar o arrival_point para não haver conflito visual
                 payload.arrival_point = null;
            }

            // Separate event_trip_id for manual handling
            const targetTripId = payload.event_trip_id === 'none' ? null : payload.event_trip_id;
            delete payload.event_trip_id; // Remove from payload as updateEventPassenger might not whitelist it

            const response = await base44.functions.invoke('updateEventPassenger', {
                passengerId: passenger.id,
                data: payload
            });

            if (response.data && response.data.success) {
                // Handle Trip Assignment Change if needed
                const originalTripId = passenger.event_trip_id || null;
                if (targetTripId !== originalTripId) {
                    try {
                        if (targetTripId) {
                            // Assign to new trip (handles transfer automatically)
                            await base44.functions.invoke('addPassengersToEventTrip', {
                                tripId: targetTripId,
                                passengerIds: [passenger.id]
                            });
                        } else if (originalTripId) {
                            // Unassign (remove from current trip)
                            await base44.functions.invoke('removePassengerFromTrip', {
                                tripId: originalTripId,
                                passengerId: passenger.id
                            });
                        }
                    } catch (assignError) {
                        console.error("Erro ao atualizar atribuição de viagem:", assignError);
                        toast.error("Dados salvos, mas erro ao atualizar viagem.");
                    }
                }

                // Se marcado para aplicar a todos, chama a propagação
                if (applyToAll) {
                    try {
                        const propResponse = await base44.functions.invoke('propagatePassengerRelationship', {
                            sourcePassengerId: passenger.id
                        });
                        if (propResponse.data?.updatedCount > 0) {
                            toast.success(`Vínculo replicado para mais ${propResponse.data.updatedCount} viagens!`);
                        }
                    } catch (propError) {
                        console.error("Erro na propagação:", propError);
                        // Não falha o fluxo principal, apenas avisa
                    }
                }

                toast.success("Passageiro atualizado com sucesso!");
                onUpdate();
                onClose();
            } else {
                throw new Error(response.data?.error || "Erro ao atualizar");
            }
        } catch (error) {
            console.error("Erro:", error);
            toast.error("Erro ao salvar", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Passageiro</DialogTitle>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input value={formData.passenger_name} onChange={e => handleChange('passenger_name', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Documento (RG/CPF)</Label>
                            <Input value={formData.document_id} onChange={e => handleChange('document_id', e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={formData.passenger_email} onChange={e => handleChange('passenger_email', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefone</Label>
                            <Input value={formData.passenger_phone} onChange={e => handleChange('passenger_phone', e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Cidade Origem</Label>
                        <Input value={formData.passenger_city_origin} onChange={e => handleChange('passenger_city_origin', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                        <div className="space-y-2">
                            <Label>Data</Label>
                            <Input type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Hora</Label>
                            <Input type="time" value={formData.time} onChange={e => handleChange('time', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={formData.trip_type} onValueChange={v => handleChange('trip_type', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="IN">Chegada (IN)</SelectItem>
                                    <SelectItem value="OUT">Saída (OUT)</SelectItem>
                                    <SelectItem value="airport_transfer">Transfer</SelectItem>
                                    <SelectItem value="door_to_door">Porta a Porta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-end gap-2">
                        <div className="space-y-2 flex-1">
                            <Label>Origem / Ponto Encontro</Label>
                            <Input value={formData.origin_address} onChange={e => handleChange('origin_address', e.target.value)} />
                        </div>
                        <Button 
                            type="button"
                            variant="ghost" 
                            size="icon" 
                            className="mb-0.5 shrink-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={handleSwapLocations}
                            title="Inverter Origem e Destino"
                        >
                            <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                        <div className="space-y-2 flex-1">
                            <Label>Destino</Label>
                            <Input value={formData.destination_address} onChange={e => handleChange('destination_address', e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                        <div className="space-y-2">
                            <Label>Companhia Aérea</Label>
                            <Input value={formData.airline} onChange={e => handleChange('airline', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Número Voo</Label>
                            <Input value={formData.flight_number} onChange={e => handleChange('flight_number', e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <Label>Tags (separadas por vírgula)</Label>
                        <Input 
                            value={formData.tags} 
                            onChange={e => handleChange('tags', e.target.value)} 
                            placeholder="Ex: VIP, Importante, Criança, Idoso"
                            />
                            </div>

                            {/* Seção de Alocação Flexível */}
                            <div className="border-t pt-4 mt-2">
                            <div className="flex items-center space-x-2 mb-3">
                            <input 
                                type="checkbox" 
                                id="isFlexible" 
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                checked={formData.is_flexible_allocation || false}
                                onChange={(e) => handleChange('is_flexible_allocation', e.target.checked)}
                            />
                            <label htmlFor="isFlexible" className="text-sm font-medium text-gray-900 cursor-pointer select-none">
                                Alocação Flexível (Porta a Porta)
                            </label>
                            </div>

                            {formData.is_flexible_allocation && (
                            <div className="pl-6 space-y-2">
                                <Label className="text-xs text-blue-700">Atribuir a Veículo Flexível (Opcional)</Label>
                                <Select 
                                    value={formData.event_trip_id} 
                                    onValueChange={v => handleChange('event_trip_id', v)}
                                >
                                    <SelectTrigger className="bg-blue-50 border-blue-200">
                                        <SelectValue placeholder="Selecione um veículo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Pendente / Nenhum --</SelectItem>
                                        {trips
                                            .filter(t => t.is_flexible_vehicle)
                                            .map(t => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.name} ({t.passenger_count}/{t.vehicle_capacity} pax) - {t.start_time}
                                                </SelectItem>
                                            ))
                                        }
                                        {trips.filter(t => t.is_flexible_vehicle).length === 0 && (
                                            <div className="p-2 text-xs text-gray-500 text-center">Nenhum veículo flexível criado.</div>
                                        )}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-gray-500">
                                    Selecione em qual veículo porta a porta este passageiro deve embarcar.
                                </p>
                            </div>
                            )}
                            </div>

                            <div className="border-t pt-4 bg-gray-50 p-3 rounded-md mt-2">
                            <h4 className="text-sm font-semibold mb-3 text-gray-700">Vínculo Familiar / Acompanhante</h4>
                            <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>É Acompanhante?</Label>
                                <Select 
                                    value={formData.is_companion ? "yes" : "no"} 
                                    onValueChange={v => handleChange('is_companion', v === "yes")}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="no">Não (Principal)</SelectItem>
                                        <SelectItem value="yes">Sim (Acompanhante)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {formData.is_companion && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Passageiro Principal</Label>
                                        <Select 
                                            value={formData.main_passenger_id} 
                                            onValueChange={v => handleChange('main_passenger_id', v)}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">-- Selecione --</SelectItem>
                                                {allPassengers
                                                    .filter(p => p.id !== passenger.id && !p.is_companion) // Não mostrar ele mesmo nem outros acompanhantes
                                                    .sort((a, b) => a.passenger_name.localeCompare(b.passenger_name))
                                                    .map(p => {
                                                        const dateStr = p.date ? p.date.split('-').reverse().slice(0, 2).join('/') : '';
                                                        const timeStr = p.time ? ` às ${p.time}` : '';
                                                        const typeStr = p.trip_type === 'IN' ? 'Chegada' : p.trip_type === 'OUT' ? 'Saída' : p.trip_type;
                                                        return (
                                                            <SelectItem key={p.id} value={p.id}>
                                                                {p.passenger_name} <span className="text-gray-400 text-xs ml-1">({dateStr}{timeStr} - {typeStr})</span>
                                                            </SelectItem>
                                                        );
                                                    })
                                                }
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Relacionamento</Label>
                                        <Input 
                                            placeholder="Ex: Esposa, Filho, Amigo"
                                            value={formData.companion_relationship} 
                                            onChange={e => handleChange('companion_relationship', e.target.value)} 
                                        />
                                    </div>
                                </>
                                )}
                                </div>
                                </div>

                                {/* Opção de Propagação */}
                                <div className="flex items-center space-x-2 mt-4 bg-blue-50 p-3 rounded-md border border-blue-100">
                                <input 
                                type="checkbox" 
                                id="applyToAll" 
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                checked={applyToAll}
                                onChange={(e) => setApplyToAll(e.target.checked)}
                                />
                                <label htmlFor="applyToAll" className="text-sm font-medium text-blue-900 cursor-pointer select-none">
                                Aplicar este vínculo familiar para todas as viagens deste passageiro?
                                </label>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 ml-1">
                                O sistema buscará todas as viagens deste passageiro no evento e replicará o vínculo, ajustando também seus acompanhantes.
                                </p>
                                </div>

                                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Alterações"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}