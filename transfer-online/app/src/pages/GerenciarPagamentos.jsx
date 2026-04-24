import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Filter,
  Car,
  UserCheck,
  Users,
  Search,
  DollarSign,
  Pencil
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EditDriverPayoutDialog from '@/components/supplier/EditDriverPayoutDialog';

export default function GerenciarPagamentos() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [supplier, setSupplier] = useState(null);
  
  // Edit Driver Payout State
  const [showEditDriverPayoutDialog, setShowEditDriverPayoutDialog] = useState(false);
  const [editingPayout, setEditingPayout] = useState(null);

  // Estados para Motoristas
  const [selectedDriverPayouts, setSelectedDriverPayouts] = useState([]);
  const [showDriverPaymentDialog, setShowDriverPaymentDialog] = useState(false);
  const [driverPaymentNotes, setDriverPaymentNotes] = useState('');
  
  // Estados para Coordenadores
  const [selectedCoordinatorPayouts, setSelectedCoordinatorPayouts] = useState([]);
  const [showCoordinatorPaymentDialog, setShowCoordinatorPaymentDialog] = useState(false);
  const [coordinatorPaymentNotes, setCoordinatorPaymentNotes] = useState('');
  const [showLaunchCoordinatorDialog, setShowLaunchCoordinatorDialog] = useState(false);
  const [newCoordinatorPayout, setNewCoordinatorPayout] = useState({
    coordinator_id: '',
    service_date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    notes: ''
  });

  // Estados para Parceiros
  const [searchTermPartner, setSearchTermPartner] = useState('');
  const [filterStatusPartner, setFilterStatusPartner] = useState('all');
  const [processingPartnerId, setProcessingPartnerId] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtros Gerais
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [driverFilter, setDriverFilter] = useState('all');

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();

        if (!currentUser.supplier_id) {
          alert('Acesso restrito a fornecedores.');
          window.location.href = '/';
          return;
        }

        setUser(currentUser);

        const suppliers = await base44.entities.Supplier.list();
        const supplierData = suppliers.find(p => p.id === currentUser.supplier_id);

        if (!supplierData) {
          alert('Dados do fornecedor não encontrados.');
          window.location.href = '/';
          return;
        }

        setSupplier(supplierData);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = '/AccessPortal?returnUrl=%2FGerenciarPagamentos';
      }
    };

    checkAuth();
  }, []);

  // --- DADOS DOS MOTORISTAS ---

  const { data: drivers = [] } = useQuery({
    queryKey: ['supplierDrivers', user?.supplier_id],
    queryFn: async () => {
      if (!user?.supplier_id) return [];
      return await base44.entities.Driver.filter({ supplier_id: user.supplier_id });
    },
    enabled: !!user?.supplier_id,
    initialData: []
  });

  const { data: driverPayoutsData } = useQuery({
    queryKey: ['driverPayouts', user?.supplier_id, startDate, endDate, driverFilter],
    queryFn: async () => {
      const response = await base44.functions.invoke('listDriverPayouts', {
        start_date: startDate || null,
        end_date: endDate || null,
        status_filter: 'todos',
        driver_filter: driverFilter !== 'all' ? driverFilter : null
      });
      return response.data;
    },
    enabled: !!user?.supplier_id,
    refetchInterval: 30000,
    initialData: { success: false, payouts: [], summary: {} }
  });

  const driverPayouts = driverPayoutsData.payouts || [];
  const filteredDriverPayouts = driverPayouts.filter(p => {
    if (startDate && p.trip_date) {
      const tripDate = p.trip_date.split('T')[0];
      if (tripDate < startDate) return false;
    }
    if (endDate && p.trip_date) {
      const tripDate = p.trip_date.split('T')[0];
      if (tripDate > endDate) return false;
    }
    if (driverFilter !== 'all' && p.driver_id !== driverFilter) return false;
    return true;
  });

  const markDriversAsPaidMutation = useMutation({
    mutationFn: async ({ payout_ids, notes }) => {
      const response = await base44.functions.invoke('markDriverPayoutAsPaid', {
        payout_ids,
        payment_notes: notes
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driverPayouts'] });
      setSuccess(`✅ ${data.updated_count} pagamento(s) de motorista(s) marcado(s) como pago(s)!`);
      setShowDriverPaymentDialog(false);
      setSelectedDriverPayouts([]);
      setDriverPaymentNotes('');
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => setError(error.message || 'Erro ao processar pagamentos')
  });

  const updateDriverPayoutMutation = useMutation({
    mutationFn: async (payoutData) => {
      const { id, type, amount, status, notes } = payoutData;
      if (type === 'service_request') {
        return await base44.entities.ServiceRequest.update(id, {
          driver_payout_amount: amount,
          driver_payout_status: status,
          driver_payout_notes: notes,
        });
      } else if (type === 'supplier_own_booking') {
        return await base44.entities.SupplierOwnBooking.update(id, {
          driver_payout_amount: amount,
          driver_payout_status: status,
          driver_notes: notes,
        });
      } else if (type === 'event_trip') {
        return await base44.entities.EventTrip.update(id, {
          driver_payout_amount: amount,
          driver_payout_status: status,
          driver_payout_notes: notes,
        });
      }
      throw new Error('Tipo de viagem desconhecido.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPayouts'] });
      setSuccess('✅ Pagamento atualizado com sucesso!');
      setShowEditDriverPayoutDialog(false);
      setEditingPayout(null);
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao atualizar pagamento.');
    },
  });

  // --- DADOS DOS COORDENADORES ---

  const { data: coordinatorPayouts = [] } = useQuery({
    queryKey: ['coordinatorPayouts', user?.supplier_id],
    queryFn: async () => {
      if (!user?.supplier_id) return [];
      return await base44.entities.CoordinatorPayout.filter({ supplier_id: user.supplier_id });
    },
    enabled: !!user?.supplier_id,
    initialData: []
  });

  const { data: coordinatorsList = [] } = useQuery({
    queryKey: ['coordinatorsList', user?.supplier_id],
    queryFn: async () => {
      if (!user?.supplier_id) return [];
      return await base44.entities.Coordinator.filter({ supplier_id: user.supplier_id, active: true });
    },
    enabled: !!user?.supplier_id,
    initialData: []
  });

  const createCoordinatorPayoutMutation = useMutation({
    mutationFn: async (data) => {
      const coordinator = coordinatorsList.find(c => c.id === data.coordinator_id);
      return await base44.entities.CoordinatorPayout.create({
        supplier_id: user.supplier_id,
        coordinator_id: data.coordinator_id,
        coordinator_name: coordinator?.name || 'Desconhecido',
        coordinator_contact: coordinator?.phone_number || '',
        amount: parseFloat(data.amount),
        service_date: data.service_date,
        notes: data.notes,
        status: 'pendente',
        created_by_user_id: user.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorPayouts'] });
      setSuccess('✅ Lançamento realizado com sucesso!');
      setShowLaunchCoordinatorDialog(false);
      setNewCoordinatorPayout({
        coordinator_id: '',
        service_date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        notes: ''
      });
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => setError(error.message || 'Erro ao lançar pagamento')
  });

  // Aplicar filtros de data nos coordenadores
  const filteredCoordinatorPayouts = coordinatorPayouts.filter(p => {
    if (startDate) {
      const itemDate = new Date(p.created_date).toISOString().split('T')[0];
      if (itemDate < startDate) return false;
    }
    if (endDate) {
      const itemDate = new Date(p.created_date).toISOString().split('T')[0];
      if (itemDate > endDate) return false;
    }
    return true;
  });

  const markCoordinatorsAsPaidMutation = useMutation({
    mutationFn: async ({ ids, notes }) => {
      const promises = ids.map(id => 
        base44.entities.CoordinatorPayout.update(id, {
          status: 'pago',
          payment_date: new Date().toISOString(),
          notes: notes
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordinatorPayouts'] });
      setSuccess(`✅ Pagamentos de coordenador(es) marcados como pagos!`);
      setShowCoordinatorPaymentDialog(false);
      setSelectedCoordinatorPayouts([]);
      setCoordinatorPaymentNotes('');
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => setError(error.message || 'Erro ao processar pagamentos')
  });

  // --- DADOS DOS PARCEIROS (SUBCONTRATADOS) ---

  const { data: partnerPaymentsData } = useQuery({
    queryKey: ['partnerPayments', user?.supplier_id, filterStatusPartner],
    queryFn: async () => {
      const response = await base44.functions.invoke('listSubcontractorPayments', {
        status: filterStatusPartner
      });
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    },
    enabled: !!user?.supplier_id,
    refetchInterval: 30000,
    initialData: []
  });

  const filteredPartnerPayments = partnerPaymentsData.filter(p => 
    p.subcontractor_name?.toLowerCase().includes(searchTermPartner.toLowerCase()) ||
    p.request_number?.toLowerCase().includes(searchTermPartner.toLowerCase())
  );

  const handleMarkPartnerAsPaid = async (payment) => {
    if (!confirm(`Confirmar pagamento de R$ ${payment.cost} para ${payment.subcontractor_name}?`)) return;

    setProcessingPartnerId(payment.id);
    try {
        const response = await base44.functions.invoke('updateSubcontractorPayment', {
            tripId: payment.id,
            tripType: payment.trip_type,
            paymentStatus: 'pago',
            paymentDate: new Date().toISOString()
        });

        if (response.data.success) {
            queryClient.invalidateQueries({ queryKey: ['partnerPayments'] });
            setSuccess('Pagamento a parceiro registrado com sucesso!');
            setTimeout(() => setSuccess(''), 3000);
        } else {
            setError("Erro ao atualizar: " + response.data.error);
        }
    } catch (error) {
        setError("Erro ao processar pagamento do parceiro");
    } finally {
        setProcessingPartnerId(null);
    }
  };

  // --- HANDLERS GERAIS ---

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  const parseLocalDate = (dateString) => {
    if (!dateString) return new Date();
    if (dateString.includes('T')) return new Date(dateString);
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  // --- HANDLERS MOTORISTAS ---

  const handleSelectDriverPayout = (id) => {
    setSelectedDriverPayouts(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSelectAllDrivers = (payouts) => {
    if (selectedDriverPayouts.length === payouts.length) setSelectedDriverPayouts([]);
    else setSelectedDriverPayouts(payouts.map(p => p.id));
  };

  const handleConfirmDriverPayment = () => {
    // Build type hints array matching selected payout IDs
    const payoutTypes = selectedDriverPayouts.map(id => {
      const payout = filteredDriverPayouts.find(p => p.id === id);
      return payout?.type || null;
    });
    markDriversAsPaidMutation.mutate({
      payout_ids: selectedDriverPayouts,
      payout_types: payoutTypes,
      notes: driverPaymentNotes
    });
  };

  const handleEditDriverPayout = (payout) => {
    setEditingPayout(payout);
    setShowEditDriverPayoutDialog(true);
  };

  const handleSaveDriverPayout = (data) => {
    updateDriverPayoutMutation.mutate(data);
  };

  // --- HANDLERS COORDENADORES ---

  const handleSelectCoordinatorPayout = (id) => {
    setSelectedCoordinatorPayouts(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSelectAllCoordinators = (payouts) => {
    if (selectedCoordinatorPayouts.length === payouts.length) setSelectedCoordinatorPayouts([]);
    else setSelectedCoordinatorPayouts(payouts.map(p => p.id));
  };

  const handleConfirmCoordinatorPayment = () => {
    markCoordinatorsAsPaidMutation.mutate({
      ids: selectedCoordinatorPayouts,
      notes: coordinatorPaymentNotes
    });
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <DollarSign className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
            Gerenciar Pagamentos
          </h1>
          <p className="text-sm md:text-base text-gray-600">{supplier?.name} - Central de Pagamentos a Prestadores</p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="drivers" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <TabsList className="grid w-full md:w-auto grid-cols-3 gap-2">
              <TabsTrigger value="drivers" className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                <span className="hidden md:inline">Motoristas</span>
                <span className="md:hidden">Mot.</span>
              </TabsTrigger>
              <TabsTrigger value="coordinators" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                <span className="hidden md:inline">Coordenadores</span>
                <span className="md:hidden">Coord.</span>
              </TabsTrigger>
              {supplier?.features?.can_subcontract && (
                <TabsTrigger value="partners" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden md:inline">Parceiros</span>
                  <span className="md:hidden">Parc.</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* TAB MOTORISTAS */}
          <TabsContent value="drivers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                  <Filter className="w-4 h-4" /> Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label>Data Inicial</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Data Final</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Motorista</Label>
                    <Select value={driverFilter} onValueChange={setDriverFilter}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Motoristas</SelectItem>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => { setStartDate(''); setEndDate(''); setDriverFilter('all'); }}
                      variant="outline"
                      className="w-full"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending">Pendentes ({filteredDriverPayouts.filter(p => p.status === 'pendente').length})</TabsTrigger>
                <TabsTrigger value="paid">Pagos ({filteredDriverPayouts.filter(p => p.status === 'pago').length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Pagamentos Pendentes (Motoristas)</CardTitle>
                    {selectedDriverPayouts.length > 0 && (
                      <Button onClick={() => setShowDriverPaymentDialog(true)} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" /> Pagar ({selectedDriverPayouts.length})
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <DriversTable 
                      payouts={filteredDriverPayouts.filter(p => p.status === 'pendente')}
                      selectedIds={selectedDriverPayouts}
                      onSelect={handleSelectDriverPayout}
                      onSelectAll={handleSelectAllDrivers}
                      formatPrice={formatPrice}
                      parseDate={parseLocalDate}
                      showCheckbox
                      onEdit={handleEditDriverPayout}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="paid">
                <Card>
                  <CardHeader><CardTitle>Histórico de Pagamentos (Motoristas)</CardTitle></CardHeader>
                  <CardContent>
                    <DriversTable 
                      payouts={filteredDriverPayouts.filter(p => p.status === 'pago')}
                      formatPrice={formatPrice}
                      parseDate={parseLocalDate}
                      showCheckbox={false}
                      onEdit={handleEditDriverPayout}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* TAB COORDENADORES */}
          <TabsContent value="coordinators" className="space-y-4">
            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending">Pendentes ({filteredCoordinatorPayouts.filter(p => p.status === 'pendente').length})</TabsTrigger>
                <TabsTrigger value="paid">Pagos ({filteredCoordinatorPayouts.filter(p => p.status === 'pago').length})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Pagamentos Pendentes (Coordenadores)</CardTitle>
                    <div className="flex gap-2">
                        <Button onClick={() => setShowLaunchCoordinatorDialog(true)} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                            <DollarSign className="w-4 h-4 mr-2" /> Lançar Pagamento
                        </Button>
                        {selectedCoordinatorPayouts.length > 0 && (
                        <Button onClick={() => setShowCoordinatorPaymentDialog(true)} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-4 h-4 mr-2" /> Pagar ({selectedCoordinatorPayouts.length})
                        </Button>
                        )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CoordinatorsTable 
                      payouts={filteredCoordinatorPayouts.filter(p => p.status === 'pendente')}
                      selectedIds={selectedCoordinatorPayouts}
                      onSelect={handleSelectCoordinatorPayout}
                      onSelectAll={handleSelectAllCoordinators}
                      formatPrice={formatPrice}
                      showCheckbox
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="paid">
                <Card>
                  <CardHeader><CardTitle>Histórico de Pagamentos (Coordenadores)</CardTitle></CardHeader>
                  <CardContent>
                    <CoordinatorsTable 
                      payouts={filteredCoordinatorPayouts.filter(p => p.status === 'pago')}
                      formatPrice={formatPrice}
                      showCheckbox={false}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* TAB PARCEIROS */}
          {supplier?.features?.can_subcontract && (
            <TabsContent value="partners" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <CardTitle>Pagamentos a Parceiros</CardTitle>
                  <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        placeholder="Buscar parceiro..." 
                        className="pl-8 w-full md:w-64"
                        value={searchTermPartner}
                        onChange={e => setSearchTermPartner(e.target.value)}
                      />
                    </div>
                    <Select value={filterStatusPartner} onValueChange={setFilterStatusPartner}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Viagem</TableHead>
                        <TableHead>Parceiro</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPartnerPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                            Nenhum pagamento encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPartnerPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{format(new Date(payment.date), "dd/MM/yyyy")}</TableCell>
                            <TableCell className="font-mono text-xs">{payment.request_number}</TableCell>
                            <TableCell className="font-medium">{payment.subcontractor_name}</TableCell>
                            <TableCell className="font-bold">{formatPrice(payment.cost)}</TableCell>
                            <TableCell>
                              <Badge className={payment.payment_status === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                {payment.payment_status === 'pago' ? 'Pago' : 'Pendente'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {payment.payment_status === 'pendente' && (
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleMarkPartnerAsPaid(payment)}
                                  disabled={processingPartnerId === payment.id}
                                >
                                  {processingPartnerId === payment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pagar'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">Total (Listado):</TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatPrice(filteredPartnerPayments.reduce((acc, p) => acc + (p.cost || 0), 0))}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <EditDriverPayoutDialog
          open={showEditDriverPayoutDialog}
          onOpenChange={setShowEditDriverPayoutDialog}
          payout={editingPayout}
          onSave={handleSaveDriverPayout}
          isLoading={updateDriverPayoutMutation.isPending}
        />

        {/* DIALOG MOTORISTAS */}
        <Dialog open={showDriverPaymentDialog} onOpenChange={setShowDriverPaymentDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirmar Pagamento (Motoristas)</DialogTitle></DialogHeader>
            <div className="py-4">
              <Alert className="bg-blue-50 mb-4">
                <AlertDescription>
                  Total a pagar: <strong>{formatPrice(filteredDriverPayouts.filter(p => selectedDriverPayouts.includes(p.id)).reduce((s, p) => s + p.amount, 0))}</strong>
                </AlertDescription>
              </Alert>
              <Label>Observações</Label>
              <Textarea 
                value={driverPaymentNotes} 
                onChange={e => setDriverPaymentNotes(e.target.value)} 
                placeholder="Ex: PIX realizado..." 
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDriverPaymentDialog(false)}>Cancelar</Button>
              <Button onClick={handleConfirmDriverPayment} disabled={markDriversAsPaidMutation.isPending}>
                {markDriversAsPaidMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG COORDENADORES */}
        <Dialog open={showCoordinatorPaymentDialog} onOpenChange={setShowCoordinatorPaymentDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirmar Pagamento (Coordenadores)</DialogTitle></DialogHeader>
            <div className="py-4">
              <Alert className="bg-blue-50 mb-4">
                <AlertDescription>
                  Total a pagar: <strong>{formatPrice(filteredCoordinatorPayouts.filter(p => selectedCoordinatorPayouts.includes(p.id)).reduce((s, p) => s + p.amount, 0))}</strong>
                </AlertDescription>
              </Alert>
              <Label>Observações</Label>
              <Textarea 
                value={coordinatorPaymentNotes} 
                onChange={e => setCoordinatorPaymentNotes(e.target.value)} 
                placeholder="Ex: PIX realizado..." 
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCoordinatorPaymentDialog(false)}>Cancelar</Button>
              <Button onClick={handleConfirmCoordinatorPayment} disabled={markCoordinatorsAsPaidMutation.isPending}>
                {markCoordinatorsAsPaidMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG LANÇAR PAGAMENTO COORDENADOR */}
        <Dialog open={showLaunchCoordinatorDialog} onOpenChange={setShowLaunchCoordinatorDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Lançar Pagamento para Coordenador</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                    <Label>Coordenador *</Label>
                    <Select 
                        value={newCoordinatorPayout.coordinator_id} 
                        onValueChange={(val) => setNewCoordinatorPayout(prev => ({ ...prev, coordinator_id: val }))}
                    >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                            {coordinatorsList.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Data do Serviço *</Label>
                    <Input 
                        type="date" 
                        value={newCoordinatorPayout.service_date} 
                        onChange={(e) => setNewCoordinatorPayout(prev => ({ ...prev, service_date: e.target.value }))} 
                    />
                </div>
                <div>
                    <Label>Valor (R$) *</Label>
                    <Input 
                        type="number" 
                        value={newCoordinatorPayout.amount} 
                        onChange={(e) => setNewCoordinatorPayout(prev => ({ ...prev, amount: e.target.value }))} 
                        placeholder="0.00"
                    />
                </div>
                <div>
                    <Label>Observações / Referência (Cliente/Job) *</Label>
                    <Textarea 
                        value={newCoordinatorPayout.notes} 
                        onChange={(e) => setNewCoordinatorPayout(prev => ({ ...prev, notes: e.target.value }))} 
                        placeholder="Ex: Receptivo Aeroporto, Cliente XYZ..." 
                    />
                </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLaunchCoordinatorDialog(false)}>Cancelar</Button>
              <Button 
                onClick={() => createCoordinatorPayoutMutation.mutate(newCoordinatorPayout)} 
                disabled={createCoordinatorPayoutMutation.isPending || !newCoordinatorPayout.coordinator_id || !newCoordinatorPayout.amount}
                className="bg-green-600 hover:bg-green-700"
              >
                {createCoordinatorPayoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lançar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

function DriversTable({ payouts, selectedIds = [], onSelect, onSelectAll, formatPrice, parseDate, showCheckbox, onEdit }) {
  if (payouts.length === 0) return <div className="text-center py-8 text-gray-500">Nenhum pagamento encontrado</div>;

  const total = payouts.reduce((acc, p) => acc + (p.amount || 0), 0);
  const subTotal = payouts
    .filter(p => selectedIds.includes(p.id))
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  const totalExpenses = payouts.reduce((acc, p) => acc + (p.additional_expenses?.reduce((sum, e) => sum + (e.value || 0), 0) || 0), 0);
  const subTotalExpenses = payouts
    .filter(p => selectedIds.includes(p.id))
    .reduce((acc, p) => acc + (p.additional_expenses?.reduce((sum, e) => sum + (e.value || 0), 0) || 0), 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showCheckbox && (
            <TableHead className="w-12">
              <Checkbox checked={selectedIds.length === payouts.length && payouts.length > 0} onCheckedChange={() => onSelectAll(payouts)} />
            </TableHead>
          )}
          <TableHead>Data Viagem</TableHead>
          <TableHead>Solicitação</TableHead>
          <TableHead>Motorista</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Despesas</TableHead>
          <TableHead>Status</TableHead>
          {onEdit && <TableHead className="text-right">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {payouts.map(p => (
          <TableRow key={p.id}>
            {showCheckbox && (
              <TableCell>
                <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => onSelect(p.id)} />
              </TableCell>
            )}
            <TableCell>{p.trip_date ? parseDate(p.trip_date).toLocaleDateString('pt-BR') : '-'}</TableCell>
            <TableCell>
              <span 
                className={`font-mono text-blue-600 ${onEdit ? 'cursor-pointer hover:underline' : ''}`}
                onClick={() => onEdit && onEdit(p)}
              >
                {p.request_number}
              </span>
            </TableCell>
            <TableCell>{p.driver_name}</TableCell>
            <TableCell className="font-bold text-green-600">{formatPrice(p.amount)}</TableCell>
            <TableCell>
                {p.additional_expenses && p.additional_expenses.length > 0 ? (
                    <div className="flex flex-col text-xs" title={p.additional_expenses.map(e => `${e.type}: ${formatPrice(e.value)}`).join('\n')}>
                        <span className="font-semibold text-red-600">
                            + {formatPrice(p.additional_expenses.reduce((sum, e) => sum + (e.value || 0), 0))}
                        </span>
                        <span className="text-gray-500 text-[10px]">
                            {p.additional_expenses.length} item(s)
                        </span>
                    </div>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </TableCell>
            <TableCell><Badge variant={p.status === 'pago' ? 'success' : 'outline'}>{p.status}</Badge></TableCell>
            {onEdit && (
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(p)} title="Editar">
                  <Pencil className="w-4 h-4" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        {showCheckbox && (
          <TableRow>
            <TableCell colSpan={4} className="text-right font-medium">Subtotal (Selecionados):</TableCell>
            <TableCell className="font-bold text-blue-600">{formatPrice(subTotal)}</TableCell>
            <TableCell className="font-bold text-red-600 text-xs">{subTotalExpenses > 0 ? `+ ${formatPrice(subTotalExpenses)}` : '-'}</TableCell>
            <TableCell colSpan={onEdit ? 2 : 1}></TableCell>
          </TableRow>
        )}
        <TableRow>
          <TableCell colSpan={showCheckbox ? 4 : 3} className="text-right font-medium">Total (Listado):</TableCell>
          <TableCell className="font-bold text-green-600">{formatPrice(total)}</TableCell>
          <TableCell className="font-bold text-red-600 text-xs">{totalExpenses > 0 ? `+ ${formatPrice(totalExpenses)}` : '-'}</TableCell>
          <TableCell colSpan={onEdit ? 2 : 1}></TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

function CoordinatorsTable({ payouts, selectedIds = [], onSelect, onSelectAll, formatPrice, showCheckbox }) {
  if (payouts.length === 0) return <div className="text-center py-8 text-gray-500">Nenhum pagamento encontrado</div>;

  const total = payouts.reduce((acc, p) => acc + (p.amount || 0), 0);
  const subTotal = payouts
    .filter(p => selectedIds.includes(p.id))
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showCheckbox && (
            <TableHead className="w-12">
              <Checkbox checked={selectedIds.length === payouts.length} onCheckedChange={() => onSelectAll(payouts)} />
            </TableHead>
          )}
          <TableHead>Data Serviço</TableHead>
          <TableHead>Coordenador</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Status</TableHead>
          {!showCheckbox && <TableHead>Obs</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {payouts.map(p => (
          <TableRow key={p.id}>
            {showCheckbox && (
              <TableCell>
                <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => onSelect(p.id)} />
              </TableCell>
            )}
            <TableCell>{p.service_date ? format(new Date(p.service_date), 'dd/MM/yyyy') : format(new Date(p.created_date), 'dd/MM/yyyy')}</TableCell>
            <TableCell className="font-medium">{p.coordinator_name}</TableCell>
            <TableCell className="text-gray-500">{p.coordinator_contact || '-'}</TableCell>
            <TableCell className="font-bold text-green-600">{formatPrice(p.amount)}</TableCell>
            <TableCell><Badge variant={p.status === 'pago' ? 'success' : 'outline'}>{p.status}</Badge></TableCell>
            {!showCheckbox && <TableCell className="text-xs text-gray-500">{p.notes || '-'}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        {showCheckbox && (
          <TableRow>
            <TableCell colSpan={4} className="text-right font-medium">Subtotal (Selecionados):</TableCell>
            <TableCell className="font-bold text-blue-600">{formatPrice(subTotal)}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        )}
        <TableRow>
          <TableCell colSpan={showCheckbox ? 4 : 3} className="text-right font-medium">Total (Listado):</TableCell>
          <TableCell className="font-bold text-green-600">{formatPrice(total)}</TableCell>
          <TableCell colSpan={showCheckbox ? 1 : 2}></TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}