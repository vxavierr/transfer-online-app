import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Calendar, Briefcase, DollarSign, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function EventServicesManager({ eventId }) {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingService, setEditingService] = useState(null);

    const [formData, setFormData] = useState({
        service_name: "",
        service_type: "coordination",
        quantity: 1,
        service_date: "",
        unit_price: 0,
        notes: ""
    });

    useEffect(() => {
        if (eventId) {
            loadServices();
        }
    }, [eventId]);

    const loadServices = async () => {
        setLoading(true);
        try {
            const data = await base44.entities.EventService.filter({ event_id: eventId }, 'service_date');
            setServices(data);
        } catch (error) {
            console.error("Erro ao carregar serviços:", error);
            toast.error("Erro ao carregar serviços.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (service = null) => {
        if (service) {
            setEditingService(service);
            setFormData({
                service_name: service.service_name,
                service_type: service.service_type,
                quantity: service.quantity,
                service_date: service.service_date,
                unit_price: service.unit_price,
                notes: service.notes || ""
            });
        } else {
            setEditingService(null);
            setFormData({
                service_name: "",
                service_type: "coordination",
                quantity: 1,
                service_date: new Date().toISOString().split('T')[0],
                unit_price: 0,
                notes: ""
            });
        }
        setShowDialog(true);
    };

    const handleSave = async () => {
        if (!formData.service_name || !formData.service_date || formData.quantity <= 0) {
            toast.error("Preencha os campos obrigatórios (Nome, Data, Quantidade > 0)");
            return;
        }

        setSaving(true);
        try {
            const totalPrice = Number(formData.quantity) * Number(formData.unit_price);
            
            const payload = {
                event_id: eventId,
                service_name: formData.service_name,
                service_type: formData.service_type,
                quantity: Number(formData.quantity),
                service_date: formData.service_date,
                unit_price: Number(formData.unit_price),
                total_price: totalPrice,
                notes: formData.notes
            };

            if (editingService) {
                await base44.entities.EventService.update(editingService.id, payload);
                toast.success("Serviço atualizado!");
            } else {
                await base44.entities.EventService.create(payload);
                toast.success("Serviço adicionado!");
            }

            setShowDialog(false);
            loadServices();
        } catch (error) {
            console.error("Erro ao salvar serviço:", error);
            toast.error("Erro ao salvar serviço.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Tem certeza que deseja excluir este serviço?")) return;

        try {
            await base44.entities.EventService.delete(id);
            toast.success("Serviço excluído.");
            loadServices();
        } catch (error) {
            console.error("Erro ao excluir:", error);
            toast.error("Erro ao excluir serviço.");
        }
    };

    const safeFormatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            // Fix timezone offset for display
            const date = new Date((dateStr.length === 10 && !dateStr.includes('T')) ? `${dateStr}T12:00:00` : dateStr);
            return format(date, "dd/MM/yyyy", { locale: ptBR });
        } catch (e) {
            return dateStr;
        }
    };

    const totalCost = services.reduce((acc, s) => acc + (s.total_price || 0), 0);

    const serviceTypeLabels = {
        coordination: "Coordenação",
        hostess: "Recepção / Hostess",
        security: "Segurança",
        equipment: "Equipamento",
        other: "Outros"
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Serviços do Evento</h3>
                    <p className="text-sm text-gray-500">Gerencie coordenação, segurança e outros recursos por data.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Custo Total Serviços</p>
                        <p className="text-lg font-bold text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCost)}
                        </p>
                    </div>
                    <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Serviço
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : services.length === 0 ? (
                <Card className="text-center py-12 border-dashed">
                    <div className="flex flex-col items-center gap-3">
                        <Briefcase className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500">Nenhum serviço cadastrado para este evento.</p>
                        <Button variant="outline" onClick={() => handleOpenDialog()}>
                            Cadastrar Primeiro Serviço
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {/* Group by Date maybe? Or just simple table for now */}
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Serviço</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-center">Qtd.</TableHead>
                                    <TableHead className="text-right">Valor Unit.</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {services.map((service) => (
                                    <TableRow key={service.id}>
                                        <TableCell className="font-medium text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {safeFormatDate(service.service_date)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{service.service_name}</div>
                                            {service.notes && <div className="text-xs text-gray-500 truncate max-w-[200px]">{service.notes}</div>}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {serviceTypeLabels[service.service_type] || service.service_type}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                                {service.quantity}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-gray-600">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.unit_price)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-gray-900">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.total_price)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleOpenDialog(service)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(service.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingService ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
                        <DialogDescription>
                            Adicione serviços de apoio ao evento (coordenação, segurança, etc).
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Data do Serviço *</Label>
                                <Input 
                                    type="date" 
                                    value={formData.service_date} 
                                    onChange={(e) => setFormData({...formData, service_date: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select 
                                    value={formData.service_type} 
                                    onValueChange={(v) => setFormData({...formData, service_type: v})}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="coordination">Coordenação</SelectItem>
                                        <SelectItem value="hostess">Recepção / Hostess</SelectItem>
                                        <SelectItem value="security">Segurança</SelectItem>
                                        <SelectItem value="equipment">Equipamento</SelectItem>
                                        <SelectItem value="other">Outros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Nome do Serviço *</Label>
                            <Input 
                                placeholder="Ex: Coordenação Aeroporto, Segurança Noturna" 
                                value={formData.service_name} 
                                onChange={(e) => setFormData({...formData, service_name: e.target.value})} 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Quantidade *</Label>
                                <div className="relative">
                                    <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input 
                                        type="number" 
                                        min="1"
                                        className="pl-9"
                                        value={formData.quantity} 
                                        onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Valor Unitário (R$)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input 
                                        type="number" 
                                        step="0.01"
                                        className="pl-9"
                                        value={formData.unit_price} 
                                        onChange={(e) => setFormData({...formData, unit_price: e.target.value})} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Calculated Total Preview */}
                        <div className="bg-gray-50 p-3 rounded-md flex justify-between items-center text-sm">
                            <span className="text-gray-600">Total Estimado:</span>
                            <span className="font-bold text-gray-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                    (Number(formData.quantity) || 0) * (Number(formData.unit_price) || 0)
                                )}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Input 
                                placeholder="Detalhes adicionais..." 
                                value={formData.notes} 
                                onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}