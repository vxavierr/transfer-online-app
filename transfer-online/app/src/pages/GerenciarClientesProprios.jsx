import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import ClientCostCentersManager from '../components/admin/ClientCostCentersManager';
import GenericTable from '@/components/ui/GenericTable';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Loader2,
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Building2,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Car,
  Briefcase
} from 'lucide-react';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';

export default function GerenciarClientesProprios() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [selectedClientForPricing, setSelectedClientForPricing] = useState(null);
  const [showCostCenterDialog, setShowCostCenterDialog] = useState(false);
  const [selectedClientForCostCenter, setSelectedClientForCostCenter] = useState(null);

  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    document_id: '',
    email: '',
    phone_number: '',
    address: '',
    city: '',
    state: '',
    client_type: 'individual',
    contact_person_name: '',
    contact_person_phone: '',
    payment_terms: 'cash',
    notes: ''
  });

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

        const supplierData = await base44.entities.Supplier.get(currentUser.supplier_id);

        if (!supplierData.module3_enabled || supplierData.module3_subscription_level === 0) {
          alert('Módulo 3 não habilitado para este fornecedor. Entre em contato com o administrador.');
          window.location.href = '/DashboardFornecedor';
          return;
        }

        setSupplier(supplierData);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = '/AccessPortal?returnUrl=%2FGerenciarClientesProprios';
      }
    };

    checkAuth();
  }, []);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['supplierOwnClients', supplier?.id],
    queryFn: () => base44.entities.SupplierOwnClient.filter({ supplier_id: supplier.id }),
    enabled: !!supplier,
    initialData: []
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['supplierVehicles', supplier?.id],
    queryFn: () => base44.entities.SupplierVehicleType.filter({ supplier_id: supplier.id }),
    enabled: !!supplier,
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (clientData) => base44.entities.SupplierOwnClient.create({
      ...clientData,
      supplier_id: supplier.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierOwnClients'] });
      setSuccess('Cliente criado com sucesso!');
      setShowDialog(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao criar cliente');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupplierOwnClient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierOwnClients'] });
      setSuccess('Cliente atualizado com sucesso!');
      setShowDialog(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao atualizar cliente');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SupplierOwnClient.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierOwnClients'] });
      setSuccess('Cliente excluído com sucesso!');
      setDeleteConfirm(null);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao excluir cliente');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      document_id: '',
      email: '',
      phone_number: '',
      address: '',
      city: '',
      state: '',
      client_type: 'individual',
      contact_person_name: '',
      contact_person_phone: '',
      payment_terms: 'cash',
      notes: ''
    });
    setEditingClient(null);
    setError('');
  };

  const handleOpenDialog = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({ ...client });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleOpenCostCenters = (client) => {
    setSelectedClientForCostCenter(client);
    setShowCostCenterDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.phone_number) {
      setError('Nome e telefone são obrigatórios');
      return;
    }

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredClients = clients.filter(client => {
    const search = searchTerm.toLowerCase();
    return (
      client.name?.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone_number?.toLowerCase().includes(search) ||
      client.document_id?.toLowerCase().includes(search)
    );
  });

  const columns = [
    {
      header: 'Cliente',
      render: (client) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            client.client_type === 'corporate' ? 'bg-blue-100' : 'bg-purple-100'
          }`}>
            {client.client_type === 'corporate' ? (
              <Building2 className="w-5 h-5 text-blue-600" />
            ) : (
              <UserIcon className="w-5 h-5 text-purple-600" />
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">{client.name}</div>
            {client.document_id && (
              <div className="text-xs text-gray-500">{client.document_id}</div>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Tipo',
      render: (client) => (
        <Badge className={
          client.client_type === 'corporate' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
        }>
          {client.client_type === 'corporate' ? 'Corporativo' : 'Individual'}
        </Badge>
      )
    },
    {
      header: 'Contato',
      render: (client) => (
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="w-3 h-3" />
            {client.phone_number}
          </div>
          {client.email && (
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-3 h-3" />
              {client.email}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Localização',
      render: (client) => (
        <div className="text-sm text-gray-600">
          {client.city && client.state ? `${client.city} - ${client.state}` : 'N/A'}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'active',
      render: (client) => <StatusBadge status={client.active} type="user_status" />
    },
    {
      header: 'Ações',
      render: (client) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedClientForPricing(client);
              setShowPricingDialog(true);
            }}
            title="Gerenciar Precificação"
          >
            <DollarSign className="w-4 h-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenCostCenters(client)}
            title="Gerenciar Centros de Custo"
          >
            <Briefcase className="w-4 h-4 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDialog(client)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteConfirm(client)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Meus Clientes</h1>
          <p className="text-gray-600">Gerencie seus clientes próprios</p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-300">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Total de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Clientes Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {clients.filter(c => c.active).length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Clientes Corporativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {clients.filter(c => c.client_type === 'corporate').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email, telefone ou documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Cliente
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Carregando clientes...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
                </p>
              </div>
            ) : (
              <GenericTable
                columns={columns}
                data={filteredClients}
                emptyMessage="Nenhum cliente encontrado"
              />
            )}
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Adicionar Cliente'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_type">Tipo de Cliente *</Label>
                  <Select
                    value={formData.client_type}
                    onValueChange={(value) => handleChange('client_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Pessoa Física</SelectItem>
                      <SelectItem value="corporate">Pessoa Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    {formData.client_type === 'corporate' ? 'Razão Social *' : 'Nome Completo *'}
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document_id">
                    {formData.client_type === 'corporate' ? 'CNPJ' : 'CPF'}
                  </Label>
                  <Input
                    id="document_id"
                    value={formData.document_id}
                    onChange={(e) => handleChange('document_id', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">Telefone *</Label>
                  <PhoneInputWithCountry
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(value) => handleChange('phone_number', value)}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>

                {formData.client_type === 'corporate' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="contact_person_name">Pessoa de Contato</Label>
                      <Input
                        id="contact_person_name"
                        value={formData.contact_person_name}
                        onChange={(e) => handleChange('contact_person_name', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_person_phone">Telefone do Contato</Label>
                      <PhoneInputWithCountry
                        id="contact_person_phone"
                        value={formData.contact_person_phone}
                        onChange={(value) => handleChange('contact_person_phone', value)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_terms">Termos de Pagamento</Label>
                  <Select
                    value={formData.payment_terms}
                    onValueChange={(value) => handleChange('payment_terms', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">À Vista</SelectItem>
                      <SelectItem value="30_days">30 dias</SelectItem>
                      <SelectItem value="60_days">60 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {deleteConfirm && (
          <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
              </DialogHeader>
              <p className="text-gray-600">
                Tem certeza que deseja excluir o cliente <strong>{deleteConfirm.name}</strong>?
                Esta ação não pode ser desfeita.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Excluir'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {selectedClientForPricing && (
          <ClientPricingDialog
            client={selectedClientForPricing}
            supplier={supplier}
            vehicles={vehicles}
            open={showPricingDialog}
            onClose={() => {
              setShowPricingDialog(false);
              setSelectedClientForPricing(null);
            }}
          />
        )}

        {selectedClientForCostCenter && (
          <ClientCostCentersManager
            client={selectedClientForCostCenter}
            open={showCostCenterDialog}
            onClose={() => {
              setShowCostCenterDialog(false);
              setSelectedClientForCostCenter(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function ClientPricingDialog({ client, supplier, vehicles, open, onClose }) {
  const queryClient = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [usesCustomPricing, setUsesCustomPricing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: clientPricings = [] } = useQuery({
    queryKey: ['clientPricings', client.id],
    queryFn: () => base44.entities.SupplierClientPricing.filter({
      supplier_id: supplier.id,
      client_id: client.id
    }),
    enabled: !!client && !!supplier,
    initialData: []
  });

  const [pricingData, setPricingData] = useState({
    base_price_per_km: 0,
    min_km_franchise: 0,
    min_price_for_franchise: 0,
    min_price_one_way: 0,
    min_price_round_trip: 0,
    hourly_5_hours_price: 0,
    hourly_5_hours_km_allowance: 50,
    hourly_10_hours_price: 0,
    hourly_10_hours_km_allowance: 100,
    hourly_km_allowance_per_hour: 12,
    additional_price_per_km: 0,
    additional_price_per_hour: 0,
    language_surcharge_en_type: 'fixed_amount',
    language_surcharge_en: 0,
    language_surcharge_es_type: 'fixed_amount',
    language_surcharge_es: 0
  });

  useEffect(() => {
    if (selectedVehicle) {
      const vehicleData = vehicles.find(v => v.id === selectedVehicle);
      const existingPricing = clientPricings.find(p => p.vehicle_type_id === selectedVehicle);

      if (existingPricing) {
        setUsesCustomPricing(true);
        setPricingData({
          base_price_per_km: existingPricing.base_price_per_km,
          min_km_franchise: existingPricing.min_km_franchise,
          min_price_for_franchise: existingPricing.min_price_for_franchise,
          min_price_one_way: existingPricing.min_price_one_way,
          min_price_round_trip: existingPricing.min_price_round_trip,
          hourly_5_hours_price: existingPricing.hourly_5_hours_price,
          hourly_5_hours_km_allowance: existingPricing.hourly_5_hours_km_allowance,
          hourly_10_hours_price: existingPricing.hourly_10_hours_price,
          hourly_10_hours_km_allowance: existingPricing.hourly_10_hours_km_allowance,
          hourly_km_allowance_per_hour: existingPricing.hourly_km_allowance_per_hour,
          additional_price_per_km: existingPricing.additional_price_per_km,
          additional_price_per_hour: existingPricing.additional_price_per_hour,
          language_surcharge_en_type: existingPricing.language_surcharge_en_type,
          language_surcharge_en: existingPricing.language_surcharge_en,
          language_surcharge_es_type: existingPricing.language_surcharge_es_type,
          language_surcharge_es: existingPricing.language_surcharge_es
        });
      } else if (vehicleData) {
        setUsesCustomPricing(false);
        setPricingData({
          base_price_per_km: vehicleData.base_price_per_km,
          min_km_franchise: vehicleData.min_km_franchise,
          min_price_for_franchise: vehicleData.min_price_for_franchise,
          min_price_one_way: vehicleData.min_price_one_way,
          min_price_round_trip: vehicleData.min_price_round_trip,
          hourly_5_hours_price: vehicleData.hourly_5_hours_price,
          hourly_5_hours_km_allowance: vehicleData.hourly_5_hours_km_allowance,
          hourly_10_hours_price: vehicleData.hourly_10_hours_price,
          hourly_10_hours_km_allowance: vehicleData.hourly_10_hours_km_allowance,
          hourly_km_allowance_per_hour: vehicleData.hourly_km_allowance_per_hour,
          additional_price_per_km: vehicleData.additional_price_per_km,
          additional_price_per_hour: vehicleData.additional_price_per_hour,
          language_surcharge_en_type: vehicleData.language_surcharge_en_type,
          language_surcharge_en: vehicleData.language_surcharge_en,
          language_surcharge_es_type: vehicleData.language_surcharge_es_type,
          language_surcharge_es: vehicleData.language_surcharge_es
        });
      }
    }
  }, [selectedVehicle, clientPricings, vehicles]);

  const savePricingMutation = useMutation({
    mutationFn: async () => {
      const existingPricing = clientPricings.find(p => p.vehicle_type_id === selectedVehicle);

      if (usesCustomPricing) {
        const pricingPayload = {
          supplier_id: supplier.id,
          client_id: client.id,
          vehicle_type_id: selectedVehicle,
          ...pricingData,
          active: true
        };

        if (existingPricing) {
          return await base44.entities.SupplierClientPricing.update(existingPricing.id, pricingPayload);
        } else {
          return await base44.entities.SupplierClientPricing.create(pricingPayload);
        }
      } else {
        if (existingPricing) {
          return await base44.entities.SupplierClientPricing.delete(existingPricing.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientPricings'] });
      setSuccess(usesCustomPricing ? 'Precificação personalizada salva!' : 'Usando precificação padrão do veículo');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao salvar precificação');
    }
  });

  const handleSavePricing = () => {
    setError('');
    if (usesCustomPricing && pricingData.base_price_per_km <= 0) {
      setError('Preço base por KM deve ser maior que zero');
      return;
    }
    savePricingMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Precificação - {client.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-300">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Selecione o Tipo de Veículo</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um tipo de veículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.filter(v => v.active).map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      {vehicle.name} - {vehicle.max_passengers} passageiros
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedVehicle && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={usesCustomPricing}
                    onChange={(e) => setUsesCustomPricing(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <h4 className="font-semibold text-blue-900">Usar Precificação Diferenciada</h4>
                    <p className="text-sm text-blue-800">
                      {usesCustomPricing 
                        ? '✓ Este cliente terá preços personalizados para este tipo de veículo'
                        : 'Este cliente usará a tabela de preços padrão do veículo'}
                    </p>
                  </div>
                </div>
              </div>

              {usesCustomPricing && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Configuração de Preços Personalizados</h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Preço Base por KM (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricingData.base_price_per_km}
                        onChange={(e) => setPricingData(prev => ({ ...prev, base_price_per_km: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Franquia Mínima de KM</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={pricingData.min_km_franchise}
                        onChange={(e) => setPricingData(prev => ({ ...prev, min_km_franchise: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Preço Mínimo da Franquia (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricingData.min_price_for_franchise}
                        onChange={(e) => setPricingData(prev => ({ ...prev, min_price_for_franchise: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Preço Mínimo Só Ida (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricingData.min_price_one_way}
                        onChange={(e) => setPricingData(prev => ({ ...prev, min_price_one_way: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Preço Mínimo Ida e Volta (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricingData.min_price_round_trip}
                        onChange={(e) => setPricingData(prev => ({ ...prev, min_price_round_trip: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold mb-3">Pacotes de Horas</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pacote 5 Horas - Preço (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricingData.hourly_5_hours_price}
                          onChange={(e) => setPricingData(prev => ({ ...prev, hourly_5_hours_price: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Franquia de KM (5h)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={pricingData.hourly_5_hours_km_allowance}
                          onChange={(e) => setPricingData(prev => ({ ...prev, hourly_5_hours_km_allowance: parseInt(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Pacote 10 Horas - Preço (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricingData.hourly_10_hours_price}
                          onChange={(e) => setPricingData(prev => ({ ...prev, hourly_10_hours_price: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Franquia de KM (10h)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={pricingData.hourly_10_hours_km_allowance}
                          onChange={(e) => setPricingData(prev => ({ ...prev, hourly_10_hours_km_allowance: parseInt(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Preço Adicional por Hora (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricingData.additional_price_per_hour}
                          onChange={(e) => setPricingData(prev => ({ ...prev, additional_price_per_hour: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Preço Adicional por KM (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricingData.additional_price_per_km}
                          onChange={(e) => setPricingData(prev => ({ ...prev, additional_price_per_km: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold mb-3">Sobretaxas de Idioma</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo Sobretaxa Inglês</Label>
                        <Select
                          value={pricingData.language_surcharge_en_type}
                          onValueChange={(value) => setPricingData(prev => ({ ...prev, language_surcharge_en_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                            <SelectItem value="percentage">Percentual (%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Valor Sobretaxa Inglês</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricingData.language_surcharge_en}
                          onChange={(e) => setPricingData(prev => ({ ...prev, language_surcharge_en: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo Sobretaxa Espanhol</Label>
                        <Select
                          value={pricingData.language_surcharge_es_type}
                          onValueChange={(value) => setPricingData(prev => ({ ...prev, language_surcharge_es_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                            <SelectItem value="percentage">Percentual (%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Valor Sobretaxa Espanhol</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricingData.language_surcharge_es}
                          onChange={(e) => setPricingData(prev => ({ ...prev, language_surcharge_es: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {selectedVehicle && (
            <Button
              onClick={handleSavePricing}
              disabled={savePricingMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {savePricingMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Precificação'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}