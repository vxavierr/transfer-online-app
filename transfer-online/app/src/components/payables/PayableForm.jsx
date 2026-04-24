import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Upload, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const CATEGORIES = [
  { value: 'motorista', label: 'Motorista' },
  { value: 'combustivel', label: 'Combustível' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'multa', label: 'Multa' },
  { value: 'imposto', label: 'Imposto' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'parceiro', label: 'Parceiro / Subcontratado' },
  { value: 'outros', label: 'Outros' },
];

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'ted', label: 'TED' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'debito_automatico', label: 'Débito Automático' },
  { value: 'outro', label: 'Outro' },
];

const RECURRENCES = [
  { value: 'unico', label: 'Pagamento Único' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'anual', label: 'Anual' },
];

const INITIAL_FORM = {
  category: 'outros',
  description: '',
  creditor_name: '',
  creditor_document: '',
  amount: '',
  due_date: format(new Date(), 'yyyy-MM-dd'),
  payment_method: 'pix',
  recurrence: 'unico',
  related_driver_id: '',
  related_vehicle_plate: '',
  document_url: '',
  notes: '',
};

export default function PayableForm({ open, onOpenChange, onSave, editingAccount, drivers = [], isPending }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingAccount) {
        setFormData({
          category: editingAccount.category || 'outros',
          description: editingAccount.description || '',
          creditor_name: editingAccount.creditor_name || '',
          creditor_document: editingAccount.creditor_document || '',
          amount: editingAccount.amount || '',
          due_date: editingAccount.due_date || '',
          payment_method: editingAccount.payment_method || 'pix',
          recurrence: editingAccount.recurrence || 'unico',
          related_driver_id: editingAccount.related_driver_id || '',
          related_vehicle_plate: editingAccount.related_vehicle_plate || '',
          document_url: editingAccount.document_url || '',
          notes: editingAccount.notes || '',
        });
      } else {
        setFormData(INITIAL_FORM);
      }
      setError('');
    }
  }, [open, editingAccount]);

  const handleUploadDocument = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, document_url: res.file_url }));
    } catch (err) {
      setError('Erro ao fazer upload do documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    setError('');
    if (!formData.description.trim()) return setError('Descrição é obrigatória');
    if (!formData.amount || parseFloat(formData.amount) <= 0) return setError('Valor deve ser maior que zero');
    if (!formData.due_date) return setError('Data de vencimento é obrigatória');

    onSave({
      ...formData,
      amount: parseFloat(formData.amount),
    });
  };

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            {editingAccount ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={formData.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recorrência</Label>
              <Select value={formData.recurrence} onValueChange={v => set('recurrence', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECURRENCES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input value={formData.description} onChange={e => set('description', e.target.value)} placeholder="Ex: Pagamento motorista João - Março" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Credor / Beneficiário</Label>
              <Input value={formData.creditor_name} onChange={e => set('creditor_name', e.target.value)} placeholder="Nome do credor" />
            </div>
            <div className="space-y-2">
              <Label>CPF/CNPJ do Credor</Label>
              <Input value={formData.creditor_document} onChange={e => set('creditor_document', e.target.value)} placeholder="000.000.000-00" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={formData.amount} onChange={e => set('amount', e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Vencimento *</Label>
              <Input type="date" value={formData.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={formData.payment_method} onValueChange={v => set('payment_method', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Motorista Relacionado</Label>
              <Select value={formData.related_driver_id || 'none'} onValueChange={v => set('related_driver_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Placa do Veículo</Label>
              <Input value={formData.related_vehicle_plate} onChange={e => set('related_vehicle_plate', e.target.value)} placeholder="ABC-1234" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comprovante / Documento</Label>
            <div className="flex gap-2 items-center">
              <Input id="payable_doc_upload" type="file" accept="image/*,.pdf" className="hidden" onChange={handleUploadDocument} />
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('payable_doc_upload').click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                {formData.document_url ? 'Alterar' : 'Anexar'}
              </Button>
              {formData.document_url && <span className="text-xs text-green-600 font-medium">✓ Documento anexado</span>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas adicionais..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {editingAccount ? 'Salvar Alterações' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}