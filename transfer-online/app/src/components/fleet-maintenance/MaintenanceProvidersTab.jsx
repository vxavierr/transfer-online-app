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
import { getProviderCategoryLabel } from './maintenanceUtils';

const initialForm = {
  name: '',
  category: 'workshop',
  contact_name: '',
  phone_number: '',
  email: '',
  address: '',
  notes: '',
  active: true
};

export default function MaintenanceProvidersTab({ providers, onSave, onDelete }) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(initialForm);
  const [editingId, setEditingId] = React.useState(null);

  const handleOpen = (provider = null) => {
    if (provider) {
      setEditingId(provider.id);
      setForm({
        name: provider.name || '',
        category: provider.category || 'workshop',
        contact_name: provider.contact_name || '',
        phone_number: provider.phone_number || '',
        email: provider.email || '',
        address: provider.address || '',
        notes: provider.notes || '',
        active: provider.active !== false
      });
    } else {
      setEditingId(null);
      setForm(initialForm);
    }
    setOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave({ id: editingId, ...form });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpen()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Novo prestador
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {providers.length === 0 ? (
          <Card className="lg:col-span-2"><CardContent className="py-12 text-center"><p className="font-medium text-gray-900">Nenhum prestador cadastrado.</p><p className="text-sm text-gray-500">Cadastre oficinas e parceiros para organizar a manutenção da frota.</p></CardContent></Card>
        ) : providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{provider.name}</CardTitle>
                  <p className="mt-1 text-sm text-gray-500">{getProviderCategoryLabel(provider.category)}</p>
                </div>
                <Badge className={provider.active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-100 text-slate-700 border-slate-200'}>{provider.active ? 'Ativo' : 'Inativo'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <div className="grid gap-2 md:grid-cols-2">
                <p>Contato: <strong>{provider.contact_name || '—'}</strong></p>
                <p>Telefone: <strong>{provider.phone_number || '—'}</strong></p>
                <p>E-mail: <strong>{provider.email || '—'}</strong></p>
                <p>Endereço: <strong>{provider.address || '—'}</strong></p>
              </div>
              {provider.notes && <p className="rounded-lg bg-slate-50 p-3">{provider.notes}</p>}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleOpen(provider)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onDelete(provider.id, provider.name)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar prestador' : 'Novo prestador de manutenção'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Oficina Centro" required /></div>
              <div className="space-y-2"><Label>Categoria</Label><Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="workshop">Oficina</SelectItem><SelectItem value="dealership">Concessionária</SelectItem><SelectItem value="tire_shop">Loja de pneus</SelectItem><SelectItem value="electrician">Elétrica</SelectItem><SelectItem value="body_shop">Funilaria</SelectItem><SelectItem value="oil_service">Lubrificação</SelectItem><SelectItem value="other">Outros</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Contato</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} /></div>
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Status</Label><Select value={form.active ? 'active' : 'inactive'} onValueChange={(value) => setForm({ ...form, active: value === 'active' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Endereço</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-24" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Salvar prestador</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}