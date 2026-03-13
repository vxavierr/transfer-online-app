import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, Clock, MessageSquare, MapPin, ArrowRightLeft, Car, GripVertical, Trash2, Plus } from "lucide-react";
import LocationAutocomplete from "@/components/booking/LocationAutocomplete";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function EditTripDialog({ isOpen, onClose, trip, onUpdate }) {
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [routePoints, setRoutePoints] = useState([]);
    const [partnerNotes, setPartnerNotes] = useState("");
    const [tripType, setTripType] = useState("");
    const [vehicleTypeCategory, setVehicleTypeCategory] = useState("");
    const [vehicleTypes, setVehicleTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadVehicleTypes = async () => {
            try {
                const types = await base44.entities.VehicleType.filter({ active: true }, 'display_order', 100);
                setVehicleTypes(types);
            } catch (error) {
                console.error("Erro ao carregar tipos de veículos", error);
            }
        };
        loadVehicleTypes();
    }, []);

    useEffect(() => {
        if (trip) {
            setDate(trip.date || "");
            setTime(trip.start_time || "");
            setPartnerNotes(trip.partner_notes || "");
            setTripType(trip.trip_type || "arrival");
            setVehicleTypeCategory(trip.vehicle_type_category || "");
            
            // Construct route points
            const points = [
                { id: 'origin', address: trip.origin || "", notes: "" },
                ...(trip.additional_stops || []).map((s, i) => ({ 
                    id: `stop-${i}-${Math.random().toString(36).substr(2, 9)}`, 
                    address: s.address || "", 
                    notes: s.notes || "" 
                })),
                { id: 'dest', address: trip.destination || "", notes: "" }
            ];
            setRoutePoints(points);
        }
    }, [trip]);

    const addStop = () => {
        const newPoints = [...routePoints];
        // Insert before destination (last item)
        const destIndex = newPoints.length - 1;
        newPoints.splice(destIndex, 0, { 
            id: `new-stop-${Math.random().toString(36).substr(2, 9)}`, 
            address: "", 
            notes: "" 
        });
        setRoutePoints(newPoints);
    };

    const removePoint = (index) => {
        if (index === 0 || index === routePoints.length - 1) return; // Can't remove origin/dest
        const newPoints = [...routePoints];
        newPoints.splice(index, 1);
        setRoutePoints(newPoints);
    };

    const updatePoint = (index, field, value) => {
        const newPoints = [...routePoints];
        newPoints[index] = { ...newPoints[index], [field]: value };
        setRoutePoints(newPoints);
    };

    const handleSwapRoute = () => {
        if (routePoints.length < 2) return;
        
        const newPoints = [...routePoints];
        const first = newPoints[0];
        const last = newPoints[newPoints.length - 1];
        
        newPoints[0] = { ...last, id: first.id }; // Swap content but keep IDs for stability if preferred, or swap full objects
        newPoints[newPoints.length - 1] = { ...first, id: last.id };
        
        // Actually for swap, we just want to swap addresses, usually
        // But if we have stops, 'Invert' usually means reversing the WHOLE list?
        // Or just swapping origin/dest?
        // Standard behavior is usually just Origin <-> Dest. 
        // Let's stick to swapping Origin and Dest contents.
        
        const tempAddr = newPoints[0].address;
        newPoints[0].address = newPoints[newPoints.length - 1].address;
        newPoints[newPoints.length - 1].address = tempAddr;
        
        setRoutePoints(newPoints);
        
        if (tripType === 'arrival' || tripType === 'IN') {
            setTripType('departure');
        } else if (tripType === 'departure' || tripType === 'OUT') {
            setTripType('arrival');
        }
        
        toast.success("Origem e Destino Invertidos!");
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(routePoints);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setRoutePoints(items);
    };

    const handleSave = async () => {
        if (!date || !time) {
            toast.error("Preencha data e hora");
            return;
        }

        if (routePoints.length < 2) {
            toast.error("A rota deve ter pelo menos origem e destino");
            return;
        }

        const origin = routePoints[0].address;
        const destination = routePoints[routePoints.length - 1].address;
        const additionalStops = routePoints.slice(1, -1).map(p => ({
            address: p.address,
            notes: p.notes
        }));

        setIsLoading(true);
        try {
            const response = await base44.functions.invoke('updateEventTripDateTime', {
                tripId: trip.id,
                date,
                time,
                origin,
                destination,
                partner_notes: partnerNotes,
                trip_type: tripType,
                vehicle_type_category: vehicleTypeCategory,
                additional_stops: additionalStops
            });

            if (response.data?.success) {
                toast.success("Viagem atualizada com sucesso");
                if (onUpdate) onUpdate();
                onClose();
            } else {
                throw new Error(response.data?.error || "Erro ao atualizar");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Editar Viagem</DialogTitle>
                    <DialogDescription>
                        Atualize data, horário e rota. Arraste os endereços para reordenar.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Nova Data</Label>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Clock className="w-4 h-4" /> Novo Horário</Label>
                        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Tipo de Viagem</Label>
                            <Select value={tripType} onValueChange={setTripType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="arrival">Chegada (IN)</SelectItem>
                                    <SelectItem value="departure">Saída (OUT)</SelectItem>
                                    <SelectItem value="transfer">Transfer Interno</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Car className="w-4 h-4" /> Tipo de Veículo</Label>
                            <Select value={vehicleTypeCategory} onValueChange={setVehicleTypeCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o veículo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicleTypes.map(type => (
                                        <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Rota (Arraste para reordenar)</Label>
                            <div className="flex gap-2">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleSwapRoute}
                                    className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                    <ArrowRightLeft className="w-3 h-3 mr-1" />
                                    Inverter
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={addStop} className="h-6 text-xs">
                                    <Plus className="w-3 h-3 mr-1" />
                                    Parada
                                </Button>
                            </div>
                        </div>

                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="route-points">
                                {(provided) => (
                                    <div 
                                        {...provided.droppableProps} 
                                        ref={provided.innerRef} 
                                        className="space-y-3 bg-gray-50/50 p-3 rounded-lg border border-dashed border-gray-200"
                                    >
                                        {routePoints.map((point, index) => {
                                            const isOrigin = index === 0;
                                            const isDest = index === routePoints.length - 1;
                                            const label = isOrigin ? "Origem" : isDest ? "Destino" : `Parada #${index}`;
                                            const showNotes = !isOrigin && !isDest;

                                            return (
                                                <Draggable key={point.id} draggableId={point.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className={`bg-white border rounded-md p-3 shadow-sm transition-shadow ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 ring-opacity-50 z-50' : ''}`}
                                                        >
                                                            <div className="flex items-start gap-2">
                                                                <div 
                                                                    {...provided.dragHandleProps} 
                                                                    className="mt-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                                                                >
                                                                    <GripVertical className="w-5 h-5" />
                                                                </div>
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex justify-between items-center">
                                                                        <Label className={`text-xs font-semibold uppercase ${isOrigin ? 'text-green-600' : isDest ? 'text-red-600' : 'text-blue-600'}`}>
                                                                            {label}
                                                                        </Label>
                                                                        {!isOrigin && !isDest && (
                                                                            <Button 
                                                                                type="button" 
                                                                                variant="ghost" 
                                                                                size="sm" 
                                                                                onClick={() => removePoint(index)} 
                                                                                className="h-5 w-5 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                    <LocationAutocomplete 
                                                                        value={point.address} 
                                                                        onChange={(val) => updatePoint(index, 'address', val)} 
                                                                        placeholder={isOrigin ? "Endereço de origem" : isDest ? "Endereço de destino" : "Endereço da parada"}
                                                                    />
                                                                    {showNotes && (
                                                                        <Input 
                                                                            value={point.notes} 
                                                                            onChange={(e) => updatePoint(index, 'notes', e.target.value)} 
                                                                            placeholder="Obs da parada (ex: pegar João)" 
                                                                            className="text-xs h-8"
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Observações para Parceiro/Motorista</Label>
                        <Textarea 
                            value={partnerNotes} 
                            onChange={(e) => setPartnerNotes(e.target.value)} 
                            placeholder="Ex: Cliente VIP, aguardar na recepção... (Visível no link do parceiro e app do motorista)"
                            className="h-24 resize-none"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}