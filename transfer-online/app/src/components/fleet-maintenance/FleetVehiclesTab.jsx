import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Car, Edit, Plus, Trash2 } from 'lucide-react';
import { getVehicleStatusMeta } from './maintenanceUtils';

const initialForm = {
  vehicle_name: '',
  supplier_vehicle_type_id: '',
  brand: '',
  model: '',
  vehicle_plate: '',
  vehicle_color: '',
  vehicle_year: '',
  fuel_type: 'flex',
  current_odometer_km: '',
  status: 'operational',
  acquisition_date: '',
  renavam: '',
  chassis: '',
  notes: ''
};

export default function FleetVehiclesTab({ vehicles, vehicleTypes, onSave, onDelete, driverVehicles = [], drivers = [] }) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [editingId, setEditingId] = React.useState(null);

  const handleOpen = (vehicle = null) => {
    if (vehicle) {
      setEditingId(vehicle.id);
      setForm({
        vehicle_name: vehicle.vehicle_name || '',
        supplier_vehicle_type_id: vehicle.supplier_vehicle_type_id || '',
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        vehicle_plate: vehicle.vehicle_plate || '',
        vehicle_color: vehicle.vehicle_color || '',
        vehicle_year: vehicle.vehicle_year || '',
        fuel_type: vehicle.fuel_type || 'flex',
        current_odometer_km: vehicle.current_odometer_km || '',
        status: vehicle.status || 'operational',
        acquisition_date: vehicle.acquisition_date || '',
        renavam: vehicle.renavam || '',
        chassis: vehicle.chassis || '',
        notes: vehicle.notes || ''
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
      current_odometer_km: Number(form.current_odometer_km || 0),
      active: form.status !== 'inactive'
    });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpen()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Novo veículo da frota
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {vehicles.length === 0 ? (
          <Card className="lg:col-span-2"><CardContent className="flex flex-col items-center py-12 text-center"><Car className="mb-3 h-12 w-12 text-gray-300" /><p className="font-medium text-gray-900">Nenhum veículo cadastrado na frota.</p><p className="text-sm text-gray-500">Cadastre os veículos reais da operação para controlar manutenção.</p></CardContent></Card>
        ) : vehicles.map((vehicle) => {
          const type = vehicleTypes.find((item) => item.id === vehicle.supplier_vehicle_type_id);
          const statusMeta = getVehicleStatusMeta(vehicle.status);
          return (
            <Card key={vehicle.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{vehicle.vehicle_name}</CardTitle>
                    <p className="mt-1 text-sm text-gray-500">{vehicle.brand} {vehicle.model} • {vehicle.vehicle_plate}</p>
                  </div>
                  <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <div className="grid gap-2 md:grid-cols-2">
                  <p>Tipo: <strong>{type?.name || 'Não vinculado'}</strong></p>
                  <p>KM atual: <strong>{Number(vehicle.current_odometer_km || 0).toLocaleString('pt-BR')} km</strong></p>
                  <p>Combustível: <strong>{vehicle.fuel_type}</strong></p>
                  <p>Ano: <strong>{vehicle.vehicle_year || '—'}</strong></p>
                </div>
                {vehicle.notes && <p className="rounded-lg bg-slate-50 p-3">{vehicle.notes}</p>}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpen(vehicle)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onDelete(vehicle.id, vehicle.vehicle_name)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Veículos dos Motoristas Associados (somente leitura) */}
      {driverVehicles.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Car className="h-5 w-5 text-gray-500" />
            Veículos dos Motoristas ({driverVehicles.length})
          </h3>
          <p className="text-sm text-gray-500 -mt-2">Veículos cadastrados pelos motoristas associados ao seu fornecedor. Apenas para consulta.</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {driverVehicles.map((dv) => {
              const driverData = drivers.find(d => d.id === dv.driver_id);
              return (
                <Card key={dv.id} className="border-dashed border-gray-300 bg-gray-50/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{dv.vehicle_model}</CardTitle>
                        <p className="mt-1 text-sm text-gray-500">{dv.vehicle_plate} {dv.vehicle_color ? `• ${dv.vehicle_color}` : ''}</p>
                      </div>
                      <Badge className={dv.active === false ? 'bg-red-100 text-red-800' : dv.registration_blocked ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}>
                        {dv.active === false ? 'Inativo' : dv.registration_blocked ? 'Bloqueado' : 'Ativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-gray-600">
                    <div className="grid gap-2 md:grid-cols-2">
                      <p>Motorista: <strong>{driverData?.name || 'Desconhecido'}</strong></p>
                      <p>Ano: <strong>{dv.vehicle_year || '—'}</strong></p>
                      {dv.registration_expiry && (
                        <p>Licenciamento: <strong>{dv.registration_expiry}</strong></p>
                      )}
                      {dv.is_default && <p><Badge className="bg-blue-100 text-blue-800">Veículo padrão</Badge></p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar veículo da frota' : 'Novo veículo da frota'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Nome interno *</Label><Input value={form.vehicle_name} onChange={(e) => setForm({ ...form, vehicle_name: e.target.value })} placeholder="Ex: Sedan Preto 01" required /></div>
              <div className="space-y-2"><Label>Tipo de veículo</Label><Select value={form.supplier_vehicle_type_id || 'none'} onValueChange={(value) => setForm({ ...form, supplier_vehicle_type_id: value === 'none' ? '' : value })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none">Não vincular</SelectItem>{vehicleTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Marca</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Toyota" /></div>
              <div className="space-y-2"><Label>Modelo *</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Corolla" required /></div>
              <div className="space-y-2"><Label>Placa *</Label><Input value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value.toUpperCase() })} placeholder="ABC1D23" required /></div>
              <div className="space-y-2"><Label>Cor</Label><Input value={form.vehicle_color} onChange={(e) => setForm({ ...form, vehicle_color: e.target.value })} placeholder="Preto" /></div>
              <div className="space-y-2"><Label>Ano</Label><Input value={form.vehicle_year} onChange={(e) => setForm({ ...form, vehicle_year: e.target.value })} placeholder="2024" /></div>
              <div className="space-y-2"><Label>Combustível</Label><Select value={form.fuel_type} onValueChange={(value) => setForm({ ...form, fuel_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="flex">Flex</SelectItem><SelectItem value="gasolina">Gasolina</SelectItem><SelectItem value="etanol">Etanol</SelectItem><SelectItem value="diesel">Diesel</SelectItem><SelectItem value="eletrico">Elétrico</SelectItem><SelectItem value="hibrido">Híbrido</SelectItem><SelectItem value="gnv">GNV</SelectItem><SelectItem value="other">Outro</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>KM atual</Label><Input type="number" min="0" value={form.current_odometer_km} onChange={(e) => setForm({ ...form, current_odometer_km: e.target.value })} placeholder="0" /></div>
              <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="operational">Operacional</SelectItem><SelectItem value="maintenance">Em manutenção</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Data de aquisição</Label><Input type="date" value={form.acquisition_date} onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>RENAVAM</Label><Input value={form.renavam} onChange={(e) => setForm({ ...form, renavam: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Chassi</Label><Input value={form.chassis} onChange={(e) => setForm({ ...form, chassis: e.target.value })} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-24" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Salvar veículo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}