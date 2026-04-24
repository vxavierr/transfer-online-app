import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Banknote, TrendingUp, CheckCircle, AlertCircle, List } from 'lucide-react';
import { toast } from 'sonner';
import PayableKPIs from '@/components/payables/PayableKPIs';
import PayableForm from '@/components/payables/PayableForm';
import PayablesList from '@/components/payables/PayablesList';
import CashFlowView from '@/components/payables/CashFlowView';

export default function GerenciarContasPagar() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        const isAdmin = currentUser.role === 'admin';
        const isSupplier = currentUser.supplier_id && !isAdmin;
        if (!isSupplier) {
          toast.error('Acesso restrito a fornecedores.');
          return;
        }
        setUser(currentUser);
        const suppliers = await base44.entities.Supplier.list();
        const supplierData = suppliers.find(p => p.id === currentUser.supplier_id);
        if (!supplierData) {
          toast.error('Dados do fornecedor não encontrados.');
          return;
        }
        if (!supplierData.features?.payables_management) {
          toast.error('Módulo de Contas a Pagar não está habilitado para seu fornecedor.');
          return;
        }
        setSupplier(supplierData);
        setIsCheckingAuth(false);
      } catch {
        toast.error('Erro ao verificar autenticação.');
      }
    };
    checkAuth();
  }, []);

  const { data: accounts = [] } = useQuery({
    queryKey: ['payableAccounts', supplier?.id],
    queryFn: () => base44.entities.PayableAccount.filter({ supplier_id: supplier.id }, '-due_date'),
    enabled: !!supplier?.id,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['supplierDrivers', supplier?.id],
    queryFn: () => base44.entities.Driver.filter({ supplier_id: supplier.id }),
    enabled: !!supplier?.id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['supplierInvoicesForCashFlow', supplier?.id],
    queryFn: () => base44.entities.SupplierInvoice.filter({ supplier_id: supplier.id }),
    enabled: !!supplier?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PayableAccount.create({ ...data, supplier_id: supplier.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payableAccounts'] });
      toast.success('Conta cadastrada com sucesso!');
      setShowForm(false);
      setEditingAccount(null);
    },
    onError: (err) => toast.error(err.message || 'Erro ao cadastrar'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PayableAccount.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payableAccounts'] });
      toast.success('Conta atualizada!');
      setShowForm(false);
      setEditingAccount(null);
    },
    onError: (err) => toast.error(err.message || 'Erro ao atualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PayableAccount.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payableAccounts'] });
      toast.success('Conta excluída!');
    },
    onError: (err) => toast.error(err.message || 'Erro ao excluir'),
  });

  const payMutation = useMutation({
    mutationFn: async ({ id, payData }) => {
      const account = accounts.find(a => a.id === id);
      if (!account) return;
      const newPaid = (account.paid_amount || 0) + payData.amount;
      const newStatus = payData.is_full ? 'pago' : (newPaid >= account.amount ? 'pago' : 'pago_parcial');
      await base44.entities.PayableAccount.update(id, {
        paid_amount: newPaid,
        paid_date: new Date(payData.date).toISOString(),
        status: newStatus,
        notes: payData.notes ? `${account.notes || ''}\n[${new Date().toLocaleDateString('pt-BR')}] Pgto: ${payData.notes}`.trim() : account.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payableAccounts'] });
      toast.success('Pagamento registrado!');
    },
    onError: (err) => toast.error(err.message || 'Erro ao registrar pagamento'),
  });

  const handleSave = (formData) => {
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Deseja excluir esta conta a pagar?')) {
      deleteMutation.mutate(id);
    }
  };

  const handlePay = (id, payData) => {
    payMutation.mutate({ id, payData });
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Módulo de Contas a Pagar não disponível. Solicite a ativação ao gestor do sistema.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Banknote className="w-8 h-8 text-red-600" />
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Contas a Pagar</h1>
            </div>
            <p className="text-gray-600 text-sm">{supplier?.name} — Gestão de despesas e fluxo de caixa</p>
          </div>
          <Button onClick={() => { setEditingAccount(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        {/* KPIs */}
        <PayableKPIs accounts={accounts} />

        {/* Tabs */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Lançamentos
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Fluxo de Caixa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <PayablesList
              accounts={accounts}
              drivers={drivers}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPay={handlePay}
              isDeleting={deleteMutation.isPending}
              isPaying={payMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="cashflow">
            <CashFlowView payables={accounts} invoices={invoices} />
          </TabsContent>
        </Tabs>

        {/* Form Dialog */}
        <PayableForm
          open={showForm}
          onOpenChange={setShowForm}
          onSave={handleSave}
          editingAccount={editingAccount}
          drivers={drivers}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </div>
  );
}