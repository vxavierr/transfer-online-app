import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MAINTENANCE_TYPES = {
  scheduled: 'Revisão Programada',
  preventive: 'Preventiva',
  corrective: 'Corretiva',
  oil: 'Troca de Óleo',
  brakes: 'Freios',
  tires: 'Pneus',
  suspension: 'Suspensão',
  electrical: 'Elétrica',
  air_conditioning: 'Ar-condicionado',
  bodywork: 'Funilaria/Pintura',
  inspection: 'Inspeção',
  other: 'Outro'
};

const initialForm = {
  fleet_vehicle_id: '',
  title: '',
  maintenance_type: 'scheduled',
  service_date: new Date().toISOString().split('T')[0],
  odometer_km: '',
  cost: '',
  description: '',
  invoice_number: '',
  replaced_items: '',
  status: 'completed'
};

export default function DriverMaintenanceRecords({ driverId, supplierId, vehicles = [], fleetVehicles = [] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar registros de manutenção deste fornecedor vinculados a veículos do motorista
  const driverPlates = vehicles.map(v => v.vehicle_plate?.toUpperCase());
  const matchingFleetIds = fleetVehicles
    .filter(fv => driverPlates.includes(fv.vehicle_plate?.toUpperCase()))
    .map(fv => fv.id);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['driverMaintenanceRecords', supplierId, matchingFleetIds.join(',')],
    queryFn: async () => {
      if (!supplierId) return [];
      const allRecords = await base44.entities.FleetMaintenanceRecord.filter({ supplier_id: supplierId }, '-service_date', 100);
      // Filtra apenas registros dos veículos deste motorista
      if (matchingFleetIds.length > 0) {
        return allRecords.filter(r => matchingFleetIds.includes(r.fleet_vehicle_id));
      }
      return [];
    },
    enabled: !!supplierId
  });

  const handleOpenNew = () => {
    setForm({ ...initialForm });
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.fleet_vehicle_id) {
      toast.error('Informe o veículo e o título do serviço.');
      return;
    }

    setIsSubmitting(true);
    try {
      await base44.entities.FleetMaintenanceRecord.create({
        supplier_id: supplierId,
        fleet_vehicle_id: form.fleet_vehicle_id,
        title: form.title,
        maintenance_type: form.maintenance_type,
        service_date: form.service_date,
        odometer_km: Number(form.odometer_km) || 0,
        cost: Number(form.cost) || 0,
        description: form.description,
        invoice_number: form.invoice_number,
        replaced_items: form.replaced_items ? form.replaced_items.split(',').map(s => s.trim()) : [],
        status: form.status
      });

      // Atualizar KM do veículo se informado
      if (form.odometer_km && form.fleet_vehicle_id) {
        const fv = fleetVehicles.find(v => v.id === form.fleet_vehicle_id);
        if (fv && Number(form.odometer_km) > (fv.current_odometer_km || 0)) {
          await base44.entities.SupplierFleetVehicle.update(fv.id, {
            current_odometer_km: Number(form.odometer_km)
          });
        }
      }

      toast.success('Manutenção registrada!');
      queryClient.invalidateQueries({ queryKey: ['driverMaintenanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['supplierFleetVehicles'] });
      setOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar manutenção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCost = records.reduce((s, r) => s + (r.cost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-500" /> Manutenções
        </h3>
        {matchingFleetIds.length > 0 && (
          <Button onClick={handleOpenNew} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-1 h-4 w-4" /> Nova Manutenção
          </Button>
        )}
      </div>

      {matchingFleetIds.length === 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-4 text-center text-sm text-amber-800">
            Seus veículos ainda não estão vinculados à frota do fornecedor. Solicite ao gestor o cadastro na frota para registrar manutenções.
          </CardContent>
        </Card>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-blue-600 font-medium">Total Registros</p>
            <p className="text-xl font-bold text-blue-800">{records.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-green-600 font-medium">Custo Total</p>
            <p className="text-xl font-bold text-green-800">R$ {totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : records.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-8 text-center text-gray-500">Nenhuma manutenção registrada.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {records.map(record => {
            const fv = fleetVehicles.find(v => v.id === record.fleet_vehicle_id);
            return (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-blue-100 text-blue-800 text-xs">{MAINTENANCE_TYPES[record.maintenance_type] || record.maintenance_type}</Badge>
                        <Badge className={record.status === 'completed' ? 'bg-green-100 text-green-800 text-xs' : 'bg-yellow-100 text-yellow-800 text-xs'}>
                          {record.status === 'completed' ? 'Concluída' : record.status === 'in_progress' ? 'Em andamento' : record.status === 'scheduled' ? 'Agendada' : 'Cancelada'}
                        </Badge>
                      </div>
                      <p className="font-semibold text-gray-900">{record.title}</p>
                      <p className="text-sm text-gray-600">
                        {record.service_date ? format(new Date(record.service_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                        {record.cost ? ` • R$ ${record.cost.toFixed(2)}` : ''}
                      </p>
                      {fv && <p className="text-xs text-gray-500">🚗 {fv.vehicle_name} ({fv.vehicle_plate})</p>}
                      {record.odometer_km > 0 && <p className="text-xs text-gray-500">📏 {record.odometer_km.toLocaleString('pt-BR')} km</p>}
                      {record.description && <p className="text-xs text-gray-500 mt-1">{record.description}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Manutenção</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Veículo da Frota *</Label>
              <Select value={form.fleet_vehicle_id || 'none'} onValueChange={v => setForm(p => ({ ...p, fleet_vehicle_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione...</SelectItem>
                  {fleetVehicles.filter(fv => matchingFleetIds.includes(fv.id)).map(fv => (
                    <SelectItem key={fv.id} value={fv.id}>{fv.vehicle_name} - {fv.vehicle_plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Título *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Troca de óleo" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.maintenance_type} onValueChange={v => setForm(p => ({ ...p, maintenance_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MAINTENANCE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data *</Label>
                <Input type="date" value={form.service_date} onChange={e => setForm(p => ({ ...p, service_date: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Custo (R$)</Label>
                <Input type="number" step="0.01" min="0" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} placeholder="350.00" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">KM Atual</Label>
                <Input type="number" min="0" value={form.odometer_km} onChange={e => setForm(p => ({ ...p, odometer_km: e.target.value }))} placeholder="85000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nota/OS</Label>
                <Input value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} placeholder="NF 1234" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Peças substituídas (separe por vírgula)</Label>
              <Input value={form.replaced_items} onChange={e => setForm(p => ({ ...p, replaced_items: e.target.value }))} placeholder="Filtro de óleo, Óleo 5W30" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="h-16" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}