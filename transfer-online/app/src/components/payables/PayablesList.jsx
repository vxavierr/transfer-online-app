import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Edit, Trash2, DollarSign, Eye, Search, Filter, 
  Loader2, CheckCircle, XCircle, Banknote
} from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
import { BrowserService } from '@/native';

const CATEGORY_LABELS = {
  motorista: 'Motorista', combustivel: 'Combustível', manutencao: 'Manutenção',
  seguro: 'Seguro', multa: 'Multa', imposto: 'Imposto', aluguel: 'Aluguel',
  parceiro: 'Parceiro', outros: 'Outros',
};

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
  pago_parcial: { label: 'Parcial', className: 'bg-blue-100 text-blue-800' },
  pago: { label: 'Pago', className: 'bg-green-100 text-green-800' },
  vencido: { label: 'Vencido', className: 'bg-red-100 text-red-800' },
  cancelado: { label: 'Cancelado', className: 'bg-gray-100 text-gray-600' },
};

const formatPrice = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function PayablesList({ 
  accounts, drivers, onEdit, onDelete, onPay, 
  isDeleting, isPaying 
}) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [payDialog, setPayDialog] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '', is_full: true });

  const driverMap = useMemo(() => {
    const map = {};
    (drivers || []).forEach(d => { map[d.id] = d.name; });
    return map;
  }, [drivers]);

  // Auto-mark overdue
  const enriched = useMemo(() => {
    const now = new Date();
    return (accounts || []).map(a => {
      if (a.status === 'pendente' && a.due_date && isBefore(parseISO(a.due_date), now)) {
        return { ...a, status: 'vencido' };
      }
      return a;
    });
  }, [accounts]);

  const filtered = useMemo(() => {
    return enriched.filter(a => {
      if (filterCategory !== 'all' && a.category !== filterCategory) return false;
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        const match = (a.description || '').toLowerCase().includes(s) ||
                      (a.creditor_name || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      if (filterStart && a.due_date < filterStart) return false;
      if (filterEnd && a.due_date > filterEnd) return false;
      return true;
    }).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
  }, [enriched, search, filterCategory, filterStatus, filterStart, filterEnd]);

  const openPayDialog = (account) => {
    const remaining = (account.amount || 0) - (account.paid_amount || 0);
    setPayForm({ amount: remaining.toFixed(2), date: format(new Date(), 'yyyy-MM-dd'), notes: '', is_full: true });
    setPayDialog(account);
  };

  const handleConfirmPay = () => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) return;
    onPay(payDialog.id, {
      amount: parseFloat(payForm.amount),
      date: payForm.date,
      notes: payForm.notes,
      is_full: payForm.is_full,
    });
    setPayDialog(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-red-600" />
              Contas a Pagar ({filtered.length})
            </CardTitle>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                <Input className="pl-8 w-48 h-9" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" className="w-36 h-9" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
              <Input type="date" className="w-36 h-9" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
              {(filterCategory !== 'all' || filterStatus !== 'all' || filterStart || filterEnd || search) && (
                <Button variant="ghost" size="sm" onClick={() => { setFilterCategory('all'); setFilterStatus('all'); setFilterStart(''); setFilterEnd(''); setSearch(''); }}>Limpar</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Banknote className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p>Nenhuma conta encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(a => {
                const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.pendente;
                const remaining = (a.amount || 0) - (a.paid_amount || 0);
                return (
                  <div key={a.id} className={`border rounded-lg p-4 hover:shadow-sm transition-shadow ${a.status === 'vencido' ? 'border-red-300 bg-red-50/50' : ''}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className="text-[10px]" variant="outline">{CATEGORY_LABELS[a.category] || a.category}</Badge>
                          <Badge className={sc.className}>{sc.label}</Badge>
                          {a.recurrence && a.recurrence !== 'unico' && (
                            <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200">🔄 {a.recurrence}</Badge>
                          )}
                        </div>
                        <p className="font-medium text-gray-900 truncate">{a.description}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                          {a.creditor_name && <span>👤 {a.creditor_name}</span>}
                          {a.related_driver_id && driverMap[a.related_driver_id] && <span>🚗 {driverMap[a.related_driver_id]}</span>}
                          {a.related_vehicle_plate && <span>🏷️ {a.related_vehicle_plate}</span>}
                          {a.due_date && <span>📅 Venc: {format(parseISO(a.due_date), 'dd/MM/yyyy')}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{formatPrice(a.amount)}</p>
                          {a.paid_amount > 0 && a.status !== 'pago' && (
                            <p className="text-xs text-green-600">Pago: {formatPrice(a.paid_amount)} | Resta: {formatPrice(remaining)}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {a.document_url && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => BrowserService.open(a.document_url)} title="Ver documento">
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {a.status !== 'pago' && a.status !== 'cancelado' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => openPayDialog(a)} title="Registrar Pagamento">
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(a)} title="Editar">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => onDelete(a.id)} title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Registrar Pagamento
            </DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                <div className="flex justify-between"><span>Total:</span><span className="font-semibold">{formatPrice(payDialog.amount)}</span></div>
                <div className="flex justify-between"><span>Já pago:</span><span className="text-green-600">{formatPrice(payDialog.paid_amount || 0)}</span></div>
                <div className="flex justify-between border-t pt-1"><span className="font-bold">Restante:</span><span className="font-bold text-blue-600">{formatPrice((payDialog.amount || 0) - (payDialog.paid_amount || 0))}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data do Pagamento</Label>
                <Input type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} rows={2} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="full_pay" checked={payForm.is_full} onCheckedChange={v => setPayForm({ ...payForm, is_full: v })} />
                <Label htmlFor="full_pay" className="text-sm">Marcar como quitação total</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancelar</Button>
            <Button onClick={handleConfirmPay} disabled={isPaying} className="bg-green-600 hover:bg-green-700">
              {isPaying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}