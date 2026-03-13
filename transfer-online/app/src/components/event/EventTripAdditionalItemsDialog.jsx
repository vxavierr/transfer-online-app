import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, DollarSign, Package } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function EventTripAdditionalItemsDialog({ isOpen, onClose, trip, onUpdate }) {
    const { toast } = useToast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [catalogItems, setCatalogItems] = useState([]);

    useEffect(() => {
        if (isOpen && trip) {
            setItems(trip.additional_items || []);
            fetchCatalogItems();
        }
    }, [isOpen, trip]);

    const fetchCatalogItems = async () => {
        try {
            // Fetch predefined additional items from the catalog
            const data = await base44.entities.AdditionalItem.filter({ active: true });
            setCatalogItems(data);
        } catch (error) {
            console.error("Error fetching catalog items:", error);
        }
    };

    const handleAddItem = () => {
        setItems([...items, { name: "", quantity: 1, unit_price: 0, total_price: 0, notes: "" }]);
    };

    const handleRemoveItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };
        
        // Auto-calculate total price
        if (field === 'quantity' || field === 'unit_price') {
            const qty = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(item.quantity) || 0;
            const price = field === 'unit_price' ? parseFloat(value) || 0 : parseFloat(item.unit_price) || 0;
            item.total_price = qty * price;
        }

        // Auto-fill from catalog if name matches
        if (field === 'name') {
            const catalogItem = catalogItems.find(c => c.name === value);
            if (catalogItem) {
                item.unit_price = catalogItem.adjustment_value || 0;
                item.total_price = (item.quantity || 1) * (catalogItem.adjustment_value || 0);
            }
        }

        newItems[index] = item;
        setItems(newItems);
    };

    const handleSelectCatalogItem = (index, catalogItemId) => {
        const catalogItem = catalogItems.find(c => c.id === catalogItemId);
        if (catalogItem) {
            handleItemChange(index, 'name', catalogItem.name);
            // Trigger price update explicitly
            const newItems = [...items];
            newItems[index] = { 
                ...newItems[index], 
                name: catalogItem.name, 
                unit_price: catalogItem.adjustment_value || 0,
                total_price: (newItems[index].quantity || 1) * (catalogItem.adjustment_value || 0)
            };
            setItems(newItems);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await base44.functions.invoke('updateEventTripAdditionalItems', {
                tripId: trip.id,
                additionalItems: items
            });

            if (response.data && response.data.success) {
                toast({
                    title: "Sucesso",
                    description: "Itens adicionais atualizados.",
                    className: "bg-green-50 border-green-200"
                });
                onUpdate();
                onClose();
            } else {
                throw new Error(response.data?.error || "Erro ao salvar");
            }
        } catch (error) {
            console.error("Error saving additional items:", error);
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const grandTotal = items.reduce((acc, item) => acc + (parseFloat(item.total_price) || 0), 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        Itens Adicionais
                    </DialogTitle>
                    <DialogDescription>
                        Adicione custos extras a esta viagem (ex: Coordenador, Kit Lanche, Cadeirinha).
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {items.length === 0 && (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                            Nenhum item adicional.
                        </div>
                    )}

                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-4">
                            <div className="col-span-12 sm:col-span-4 space-y-1">
                                <Label className="text-xs">Item</Label>
                                <div className="flex gap-1">
                                    <Input 
                                        value={item.name}
                                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                        placeholder="Nome do item"
                                        className="h-8 text-sm"
                                        list={`catalog-list-${index}`}
                                    />
                                    {catalogItems.length > 0 && (
                                        <Select onValueChange={(val) => handleSelectCatalogItem(index, val)}>
                                            <SelectTrigger className="w-8 h-8 px-0 flex justify-center">
                                                <Plus className="w-3 h-3" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {catalogItems.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>
                            <div className="col-span-3 sm:col-span-2 space-y-1">
                                <Label className="text-xs">Qtd</Label>
                                <Input 
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                    className="h-8 text-sm text-center"
                                />
                            </div>
                            <div className="col-span-4 sm:col-span-2 space-y-1">
                                <Label className="text-xs">Unit. (R$)</Label>
                                <Input 
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unit_price}
                                    onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                    className="h-8 text-sm text-right"
                                />
                            </div>
                            <div className="col-span-4 sm:col-span-3 space-y-1">
                                <Label className="text-xs">Total (R$)</Label>
                                <div className="h-8 px-3 flex items-center justify-end bg-gray-100 rounded text-sm font-semibold">
                                    {(parseFloat(item.total_price) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="col-span-1 flex justify-end pb-1">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleRemoveItem(index)}
                                    className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="col-span-12 space-y-1 mt-1">
                                <Input 
                                    value={item.notes}
                                    onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                                    placeholder="Observações (opcional)"
                                    className="h-7 text-xs bg-gray-50 border-transparent focus:bg-white focus:border-gray-200"
                                />
                            </div>
                        </div>
                    ))}

                    <Button variant="outline" size="sm" onClick={handleAddItem} className="w-full border-dashed">
                        <Plus className="w-4 h-4 mr-2" /> Adicionar Item
                    </Button>

                    <div className="flex justify-end items-center gap-2 pt-4 border-t">
                        <span className="text-sm font-medium text-gray-500">Total Adicionais:</span>
                        <span className="text-xl font-bold text-gray-900">
                            R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Salvar Itens"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}