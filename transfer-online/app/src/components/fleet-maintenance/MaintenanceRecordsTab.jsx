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
import { formatCurrency, formatDate, getMaintenanceTypeLabel } from './maintenanceUtils';

const initialForm = {
  fleet_vehicle_id: '',
  plan_id: '',
  provider_id: '',
  title: '',
  maintenance_type: 'scheduled',
  service_date: '',
  odometer_km: '',
  cost: '',
  status: 'completed',
  invoice_number: '',
  description: '',
  replaced_items: '',
  next_due_date: '',
  next_due_odometer_km: ''
};

export default function MaintenanceRecordsTab({ vehicles, plans, providers, records, onSave, onDelete }) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [editingId, setEditingId] = React.useState(null);

  const handleOpen = (record = null) => {
    if (record) {
      setEditingId(record.id);
      setForm({
        fleet_vehicle_id: record.fleet_vehicle_id || '',
        plan_id: record.plan_id || '',
        provider_id: record.provider_id || '',
        title: record.title || '',
        maintenance_type: record.maintenance_type || 'scheduled',
        service_date: record.service_date || '',
        odometer_km: record.odometer_km || '',
        cost: record.cost || '',
        status: record.status || 'completed',
        invoice_number: record.invoice_number || '',
        description: record.description || '',
        replaced_items: (record.replaced_items || []).join(', '),
        next_due_date: record.next_due_date || '',
        next_due_odometer_km: record.next_due_odometer_km || ''
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
      odometer_km: Number(form.odometer_km || 0),
      cost: Number(form.cost || 0),
      next_due_odometer_km: Number(form.next_due_odometer_km || 0),
      replaced_items: form.replaced_items
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    });
    setOpen(false);
  };

  const sortedRecords = [...records].sort((a, b) => (b.service_date || '').localeCompare(a.service_date || ''));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpen()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Novo registro de manutenção
        </Button>
      </div>

      <div className="space-y-4">
        {sortedRecords.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><p className="font-medium text-gray-900">Nenhum registro encontrado.</p><p className="text-sm text-gray-500">Lance cada serviço executado para formar o histórico do veículo.</p></CardContent></Card>
        ) : sortedRecords.map((record) => {
          const vehicle = vehicles.find((item) => item.id === record.fleet_vehicle_id);
          const provider = providers.find((item) => item.id === record.provider_id);
          const plan = plans.find((item) => item.id === record.plan_id);
          return (
            <Card key={record.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{record.title}</CardTitle>
                    <p className="mt-1 text-sm text-gray-500">{vehicle?.vehicle_name || 'Veículo não encontrado'} • {formatDate(record.service_date)}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">{record.status === 'completed' ? 'Concluído' : record.status === 'scheduled' ? 'Agendado' : record.status === 'in_progress' ? 'Em andamento' : 'Cancelado'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  <p>Tipo: <strong>{getMaintenanceTypeLabel(record.maintenance_type)}</strong></p>
                  <p>KM: <strong>{record.odometer_km ? `${record.odometer_km} km` : '—'}</strong></p>
                  <p>Custo: <strong>{formatCurrency(record.cost)}</strong></p>
                  <p>Plano: <strong>{plan?.title || 'Avulso'}</strong></p>
                  <p>Prestador: <strong>{provider?.name || 'Livre'}</strong></p>
                  <p>Próxima data: <strong>{formatDate(record.next_due_date)}</strong></p>
                </div>
                {record.description && <p className="rounded-lg bg-slate-50 p-3">{record.description}</p>}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpen(record)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onDelete(record.id, record.title)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar registro' : 'Novo registro de manutenção'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Veículo *</Label><Select value={form.fleet_vehicle_id} onValueChange={(value) => setForm({ ...form, fleet_vehicle_id: value })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{vehicles.map((vehicle) => <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_name} • {vehicle.vehicle_plate}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Plano vinculado</Label><Select value={form.plan_id || 'none'} onValueChange={(value) => setForm({ ...form, plan_id: value === 'none' ? '' : value })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none">Registro avulso</SelectItem>{plans.map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.title}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Prestador</Label><Select value={form.provider_id || 'none'} onValueChange={(value) => setForm({ ...form, provider_id: value === 'none' ? '' : value })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none">Sem prestador</SelectItem>{providers.map((provider) => <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Revisão de 50 mil km" required /></div>
              <div className="space-y-2"><Label>Tipo</Label><Select value={form.maintenance_type} onValueChange={(value) => setForm({ ...form, maintenance_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Programada</SelectItem><SelectItem value="preventive">Preventiva</SelectItem><SelectItem value="corrective">Corretiva</SelectItem><SelectItem value="inspection">Inspeção</SelectItem><SelectItem value="oil">Troca de óleo</SelectItem><SelectItem value="brakes">Freios</SelectItem><SelectItem value="tires">Pneus</SelectItem><SelectItem value="suspension">Suspensão</SelectItem><SelectItem value="electrical">Elétrica</SelectItem><SelectItem value="air_conditioning">Ar-condicionado</SelectItem><SelectItem value="bodywork">Funilaria</SelectItem><SelectItem value="other">Outros</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Data do serviço *</Label><Input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} required /></div>
              <div className="space-y-2"><Label>KM no serviço</Label><Input type="number" min="0" value={form.odometer_km} onChange={(e) => setForm({ ...form, odometer_km: e.target.value })} placeholder="0" /></div>
              <div className="space-y-2"><Label>Custo</Label><Input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0,00" /></div>
              <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Agendado</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="completed">Concluído</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Nota / OS</Label><Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></div>
              <div className="space-y-2"><Label>Próxima data prevista</Label><Input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Próximo KM previsto</Label><Input type="number" min="0" value={form.next_due_odometer_km} onChange={(e) => setForm({ ...form, next_due_odometer_km: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Peças / itens trocados</Label><Input value={form.replaced_items} onChange={(e) => setForm({ ...form, replaced_items: e.target.value })} placeholder="Ex: filtro de óleo, pastilhas, pneus" /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-24" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Salvar registro</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}