import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, getMaintenanceTypeLabel, getPlanStatus, getPlanStatusMeta } from './maintenanceUtils';

const initialForm = {
  fleet_vehicle_id: '',
  provider_id: '',
  title: '',
  maintenance_type: 'preventive',
  interval_km: '',
  interval_days: '',
  last_service_date: '',
  last_service_odometer_km: '',
  estimated_cost: '',
  notes: '',
  active: true
};

export default function MaintenancePlansTab({ vehicles, providers, plans, onSave, onDelete }) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [editingId, setEditingId] = React.useState(null);

  const handleOpen = (plan = null) => {
    if (plan) {
      setEditingId(plan.id);
      setForm({
        fleet_vehicle_id: plan.fleet_vehicle_id || '',
        provider_id: plan.provider_id || '',
        title: plan.title || '',
        maintenance_type: plan.maintenance_type || 'preventive',
        interval_km: plan.interval_km || '',
        interval_days: plan.interval_days || '',
        last_service_date: plan.last_service_date || '',
        last_service_odometer_km: plan.last_service_odometer_km || '',
        estimated_cost: plan.estimated_cost || '',
        notes: plan.notes || '',
        active: plan.active !== false
      });
    } else {
      setEditingId(null);
      setForm(initialForm);
    }
    setOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave({
      id: editingId,
      ...form,
      interval_km: Number(form.interval_km || 0),
      interval_days: Number(form.interval_days || 0),
      last_service_odometer_km: Number(form.last_service_odometer_km || 0),
      estimated_cost: Number(form.estimated_cost || 0)
    });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpen()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Novo plano preventivo
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {plans.length === 0 ? (
          <Card className="lg:col-span-2"><CardContent className="py-12 text-center"><p className="font-medium text-gray-900">Nenhum plano de manutenção cadastrado.</p><p className="text-sm text-gray-500">Crie planos recorrentes para controlar vencimentos por data e quilometragem.</p></CardContent></Card>
        ) : plans.map((plan) => {
          const vehicle = vehicles.find((item) => item.id === plan.fleet_vehicle_id);
          const provider = providers.find((item) => item.id === plan.provider_id);
          const statusMeta = getPlanStatusMeta(getPlanStatus(plan, vehicle));
          return (
            <Card key={plan.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{plan.title}</CardTitle>
                    <p className="mt-1 text-sm text-gray-500">{vehicle?.vehicle_name || 'Veículo não encontrado'} • {getMaintenanceTypeLabel(plan.maintenance_type)}</p>
                  </div>
                  <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="grid gap-2 md:grid-cols-2">
                  <p>Intervalo: <strong>{plan.interval_days ? `${plan.interval_days} dias` : '—'}</strong></p>
                  <p>KM: <strong>{plan.interval_km ? `${plan.interval_km} km` : '—'}</strong></p>
                  <p>Próxima data: <strong>{formatDate(plan.next_due_date)}</strong></p>
                  <p>Próximo KM: <strong>{plan.next_due_odometer_km ? `${plan.next_due_odometer_km} km` : '—'}</strong></p>
                  <p>Custo estimado: <strong>{formatCurrency(plan.estimated_cost)}</strong></p>
                  <p>Prestador: <strong>{provider?.name || 'Livre'}</strong></p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpen(plan)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onDelete(plan.id, plan.title)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar plano' : 'Novo plano de manutenção'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Veículo *</Label><Select value={form.fleet_vehicle_id} onValueChange={(value) => setForm({ ...form, fleet_vehicle_id: value })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{vehicles.map((vehicle) => <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_name} • {vehicle.vehicle_plate}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Prestador padrão</Label><Select value={form.provider_id || 'none'} onValueChange={(value) => setForm({ ...form, provider_id: value === 'none' ? '' : value })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none">Sem prestador definido</SelectItem>{providers.map((provider) => <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Troca de óleo e filtros" required /></div>
              <div className="space-y-2"><Label>Tipo</Label><Select value={form.maintenance_type} onValueChange={(value) => setForm({ ...form, maintenance_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="preventive">Preventiva</SelectItem><SelectItem value="corrective">Corretiva</SelectItem><SelectItem value="inspection">Inspeção</SelectItem><SelectItem value="oil">Troca de óleo</SelectItem><SelectItem value="brakes">Freios</SelectItem><SelectItem value="tires">Pneus</SelectItem><SelectItem value="suspension">Suspensão</SelectItem><SelectItem value="electrical">Elétrica</SelectItem><SelectItem value="air_conditioning">Ar-condicionado</SelectItem><SelectItem value="bodywork">Funilaria</SelectItem><SelectItem value="other">Outros</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Intervalo em dias</Label><Input type="number" min="0" value={form.interval_days} onChange={(e) => setForm({ ...form, interval_days: e.target.value })} placeholder="180" /></div>
              <div className="space-y-2"><Label>Intervalo em KM</Label><Input type="number" min="0" value={form.interval_km} onChange={(e) => setForm({ ...form, interval_km: e.target.value })} placeholder="10000" /></div>
              <div className="space-y-2"><Label>Último serviço</Label><Input type="date" value={form.last_service_date} onChange={(e) => setForm({ ...form, last_service_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>KM do último serviço</Label><Input type="number" min="0" value={form.last_service_odometer_km} onChange={(e) => setForm({ ...form, last_service_odometer_km: e.target.value })} placeholder="50000" /></div>
              <div className="space-y-2"><Label>Custo estimado</Label><Input type="number" min="0" step="0.01" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} placeholder="0,00" /></div>
              <div className="space-y-2"><Label>Status do plano</Label><Select value={form.active ? 'active' : 'inactive'} onValueChange={(value) => setForm({ ...form, active: value === 'active' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-24" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Salvar plano</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}