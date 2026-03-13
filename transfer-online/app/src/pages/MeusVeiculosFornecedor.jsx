import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import GenericTable from '@/components/ui/GenericTable';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Car,
  Users,
  Briefcase,
  DollarSign,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function MeusVeiculosFornecedor() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price_per_km: '',
    min_km_franchise: 0,
    min_price_for_franchise: 0,
    min_price_one_way: '',
    min_price_round_trip: '',
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
    language_surcharge_es: 0,
    operational_radius_km: 0,
    min_booking_lead_time_hours: 24,
    max_passengers: 4,
    max_luggage: 2,
    features: [],
    image_url: '',
    display_order: 0,
  });
  const [featureInput, setFeatureInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();

        // CORREÇÃO: Verificar supplier_id ao invés de role
        const isAdmin = currentUser.role === 'admin';
        const isSupplier = currentUser.supplier_id && !isAdmin;

        if (!isSupplier) {
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
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['supplierVehicles', user?.supplier_id],
    queryFn: () => base44.entities.SupplierVehicleType.filter({ supplier_id: user.supplier_id }),
    enabled: !!user?.supplier_id,
    initialData: [],
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplierVehicleType.create({
      ...data,
      supplier_id: user.supplier_id,
      approval_status: 'approved',
      active: true
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierVehicles'] });
      setSuccess('Veículo cadastrado com sucesso!');
      handleCloseDialog();
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao cadastrar veículo');
    }
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupplierVehicleType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierVehicles'] });
      setSuccess('Veículo atualizado com sucesso!');
      handleCloseDialog();
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao atualizar veículo');
    }
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id) => base44.entities.SupplierVehicleType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierVehicles'] });
      setSuccess('Veículo excluído com sucesso!');
      setShowDeleteDialog(false);
      setVehicleToDelete(null);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao excluir veículo');
    }
  });

  const handleOpenDialog = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        name: vehicle.name || '',
        description: vehicle.description || '',
        base_price_per_km: vehicle.base_price_per_km || '',
        min_km_franchise: vehicle.min_km_franchise || 0,
        min_price_for_franchise: vehicle.min_price_for_franchise || 0,
        min_price_one_way: vehicle.min_price_one_way || '',
        min_price_round_trip: vehicle.min_price_round_trip || '',
        hourly_5_hours_price: vehicle.hourly_5_hours_price || 0,
        hourly_5_hours_km_allowance: vehicle.hourly_5_hours_km_allowance || 50,
        hourly_10_hours_price: vehicle.hourly_10_hours_price || 0,
        hourly_10_hours_km_allowance: vehicle.hourly_10_hours_km_allowance || 100,
        hourly_km_allowance_per_hour: vehicle.hourly_km_allowance_per_hour || 12,
        additional_price_per_km: vehicle.additional_price_per_km || 0,
        additional_price_per_hour: vehicle.additional_price_per_hour || 0,
        language_surcharge_en_type: vehicle.language_surcharge_en_type || 'fixed_amount',
        language_surcharge_en: vehicle.language_surcharge_en || 0,
        language_surcharge_es_type: vehicle.language_surcharge_es_type || 'fixed_amount',
        language_surcharge_es: vehicle.language_surcharge_es || 0,
        operational_radius_km: vehicle.operational_radius_km || 0,
        min_booking_lead_time_hours: vehicle.min_booking_lead_time_hours || 24,
        max_passengers: vehicle.max_passengers || 4,
        max_luggage: vehicle.max_luggage || 2,
        features: vehicle.features || [],
        image_url: vehicle.image_url || '',
        display_order: vehicle.display_order || 0
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        name: '',
        description: '',
        base_price_per_km: '',
        min_km_franchise: 0,
        min_price_for_franchise: 0,
        min_price_one_way: '',
        min_price_round_trip: '',
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
        language_surcharge_es: 0,
        operational_radius_km: 0,
        min_booking_lead_time_hours: 24,
        max_passengers: 4,
        max_luggage: 2,
        features: [],
        image_url: '',
        display_order: 0
      });
    }
    setFeatureInput('');
    setError('');
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingVehicle(null);
    setError('');
  };

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()]
      });
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Nome do veículo é obrigatório');
      return;
    }
    if (!formData.base_price_per_km || parseFloat(formData.base_price_per_km) <= 0) {
      setError('Preço por km é obrigatório e deve ser maior que zero');
      return;
    }
    if (!formData.max_passengers || parseInt(formData.max_passengers) <= 0) {
      setError('Número máximo de passageiros é obrigatório');
      return;
    }

    const dataToSave = {
      ...formData,
      base_price_per_km: parseFloat(formData.base_price_per_km),
      min_km_franchise: parseFloat(formData.min_km_franchise) || 0,
      min_price_for_franchise: parseFloat(formData.min_price_for_franchise) || 0,
      min_price_one_way: formData.min_price_one_way ? parseFloat(formData.min_price_one_way) : null,
      min_price_round_trip: formData.min_price_round_trip ? parseFloat(formData.min_price_round_trip) : null,
      hourly_5_hours_price: parseFloat(formData.hourly_5_hours_price) || 0,
      hourly_5_hours_km_allowance: parseInt(formData.hourly_5_hours_km_allowance) || 50,
      hourly_10_hours_price: parseFloat(formData.hourly_10_hours_price) || 0,
      hourly_10_hours_km_allowance: parseInt(formData.hourly_10_hours_km_allowance) || 100,
      hourly_km_allowance_per_hour: parseFloat(formData.hourly_km_allowance_per_hour) || 12,
      additional_price_per_km: parseFloat(formData.additional_price_per_km) || 0,
      additional_price_per_hour: parseFloat(formData.additional_price_per_hour) || 0,
      language_surcharge_en: parseFloat(formData.language_surcharge_en) || 0,
      language_surcharge_es: parseFloat(formData.language_surcharge_es) || 0,
      operational_radius_km: parseFloat(formData.operational_radius_km) || 0,
      min_booking_lead_time_hours: parseInt(formData.min_booking_lead_time_hours) || 24,
      max_passengers: parseInt(formData.max_passengers),
      max_luggage: parseInt(formData.max_luggage) || 2,
      display_order: parseInt(formData.display_order) || 0
    };

    if (editingVehicle) {
      updateVehicleMutation.mutate({ id: editingVehicle.id, data: dataToSave });
    } else {
      createVehicleMutation.mutate(dataToSave);
    }
  };

  const handleDeleteClick = (vehicle) => {
    setVehicleToDelete(vehicle);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (vehicleToDelete) {
      deleteVehicleMutation.mutate(vehicleToDelete.id);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  const getApprovalStatusBadge = (status) => {
    // Mantendo a lógica específica para aprovação pois StatusBadge não tem esse tipo específico
    const statusConfig = {
      pending: { label: 'Aguardando Aprovação', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      approved: { label: 'Aprovado', className: 'bg-green-100 text-green-800 border-green-300' },
      rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-800 border-red-300' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={`${config.className} border`}>{config.label}</Badge>;
  };

  const columns = [
    {
      header: 'Veículo',
      accessor: 'name',
      render: (vehicle) => (
        <div>
          <div className="font-medium text-gray-900">{vehicle.name}</div>
          {vehicle.description && (
            <div className="text-sm text-gray-500 max-w-xs truncate">
              {vehicle.description}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Capacidade',
      render: (vehicle) => (
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{vehicle.max_passengers}</span>
          </div>
          <div className="flex items-center gap-1">
            <Briefcase className="w-4 h-4 text-gray-400" />
            <span>{vehicle.max_luggage}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Preço/km',
      accessor: 'base_price_per_km',
      render: (vehicle) => (
        <div className="flex items-center gap-1">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-green-600">
            {formatPrice(vehicle.base_price_per_km)}/km
          </span>
        </div>
      )
    },
    {
      header: 'Franquia',
      render: (vehicle) => vehicle.min_km_franchise > 0 && vehicle.min_price_for_franchise > 0 ? (
        <div className="text-sm space-y-0.5">
          <div className="font-semibold text-blue-600">
            {vehicle.min_km_franchise} km
          </div>
          <div className="text-xs text-gray-500">
            {formatPrice(vehicle.min_price_for_franchise)}
          </div>
        </div>
      ) : (
        <span className="text-sm text-gray-400">N/A</span>
      )
    },
    {
      header: 'Preço Mínimo',
      render: (vehicle) => (
        <div className="text-sm space-y-1">
          {vehicle.min_price_one_way && (
            <div>Ida: {formatPrice(vehicle.min_price_one_way)}</div>
          )}
          {vehicle.min_price_round_trip && (
            <div>Ida/Volta: {formatPrice(vehicle.min_price_round_trip)}</div>
          )}
        </div>
      )
    },
    {
      header: 'Raio',
      accessor: 'operational_radius_km',
      render: (vehicle) => vehicle.operational_radius_km > 0 ? (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>{vehicle.operational_radius_km} km</span>
        </div>
      ) : (
        <span className="text-sm text-gray-400">Ilimitado</span>
      )
    },
    {
      header: 'Aprovação',
      render: (vehicle) => (
        <div>
          {getApprovalStatusBadge(vehicle.approval_status)}
          {vehicle.approval_status === 'rejected' && vehicle.admin_notes && (
            <div className="mt-1 text-xs text-red-600">
              Motivo: {vehicle.admin_notes}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'active',
      render: (vehicle) => {
        // Status composto (ativo + aprovado)
        const isActiveAndApproved = vehicle.active && vehicle.approval_status === 'approved';
        return <StatusBadge status={isActiveAndApproved} type="user_status" />;
      }
    },
    {
      header: 'Ações',
      render: (vehicle) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDialog(vehicle)}
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(vehicle)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  // Only count vehicles that are active AND approved
  const activeVehicles = vehicles.filter(v => v.active && v.approval_status === 'approved');
  const inactiveVehicles = vehicles.filter(v => !v.active || v.approval_status !== 'approved');

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Meus Veículos
            </h1>
            <p className="text-gray-600">{supplier?.name} - Configure sua frota e tarifas</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Tipo de Veículo
          </Button>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && !showDialog && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}


        {/* Estatísticas */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Car className="w-4 h-4" />
                Total de Veículos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{vehicles.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Veículos Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeVehicles.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Veículos Inativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{inactiveVehicles.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Veículos */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Veículos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Nenhum veículo cadastrado</p>
                <p className="text-sm">Comece cadastrando seu primeiro tipo de veículo</p>
              </div>
            ) : (
              <GenericTable
                columns={columns}
                data={vehicles}
                emptyMessage="Nenhum veículo cadastrado"
              />
            )}
          </CardContent>
        </Card>

        {/* Dialog de Cadastro/Edição */}
        <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVehicle ? 'Editar Veículo' : 'Novo Tipo de Veículo'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="space-y-6 py-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* ID do Veículo - Somente na Edição */}
                {editingVehicle && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <Label htmlFor="vehicle_id" className="text-sm font-semibold text-green-900">
                      ID do Veículo (somente leitura)
                    </Label>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        id="vehicle_id"
                        value={editingVehicle.id}
                        readOnly
                        className="font-mono text-sm bg-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(editingVehicle.id);
                          alert('ID copiado para a área de transferência!');
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Informações Básicas</h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Veículo *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Sedan Executivo, Van, SUV"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="base_price_per_km">Preço por KM (R$) *</Label>
                      <Input
                        id="base_price_per_km"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.base_price_per_km}
                        onChange={(e) => setFormData({ ...formData, base_price_per_km: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva o veículo e o serviço oferecido..."
                      className="h-20"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_passengers">Máximo de Passageiros *</Label>
                      <Input
                        id="max_passengers"
                        type="number"
                        min="1"
                        value={formData.max_passengers}
                        onChange={(e) => setFormData({ ...formData, max_passengers: e.target.value })}
                        placeholder="4"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_luggage">Máximo de Malas</Label>
                      <Input
                        id="max_luggage"
                        type="number"
                        min="0"
                        value={formData.max_luggage}
                        onChange={(e) => setFormData({ ...formData, max_luggage: e.target.value })}
                        placeholder="2"
                      />
                    </div>
                  </div>
                </div>

                {/* 🆕 FRANQUIA MÍNIMA DE KM */}
                <div className="space-y-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-yellow-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-yellow-900 mb-1">
                        Franquia Mínima de Saída
                      </h3>
                      <p className="text-sm text-yellow-800 mb-3">
                        Configure o valor mínimo de saída do veículo. Até a franquia de KM, será cobrado o preço fixo da franquia.
                        Acima da franquia, será cobrado por KM rodado.
                      </p>
                    </div>
                  </div>

                  <Alert className="bg-blue-50 border-blue-300">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-sm">
                      <strong>💡 Exemplo:</strong> Franquia de 50 km por R$ 155,00<br />
                      • Viagem de 30 km = R$ 155,00 (valor da franquia)<br />
                      • Viagem de 80 km = 80 km × R$ {formData.base_price_per_km || '3,00'}/km = 
                      {formData.base_price_per_km ? ` R$ ${(80 * parseFloat(formData.base_price_per_km)).toFixed(2)}` : ' R$ 240,00'} (prevalece o maior)
                    </AlertDescription>
                  </Alert>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min_km_franchise" className="font-semibold">
                        Franquia Mínima (KM)
                      </Label>
                      <Input
                        id="min_km_franchise"
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.min_km_franchise}
                        onChange={(e) => setFormData({ ...formData, min_km_franchise: e.target.value })}
                        placeholder="Ex: 50"
                      />
                      <p className="text-xs text-gray-600">
                        Até quantos km vale o preço mínimo da franquia?
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="min_price_for_franchise" className="font-semibold">
                        Preço da Franquia (R$)
                      </Label>
                      <Input
                        id="min_price_for_franchise"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.min_price_for_franchise}
                        onChange={(e) => setFormData({ ...formData, min_price_for_franchise: e.target.value })}
                        placeholder="Ex: 155.00"
                      />
                      <p className="text-xs text-gray-600">
                        Valor fixo cobrado até atingir a franquia de KM
                      </p>
                    </div>
                  </div>

                  {/* Preview do Cálculo da Franquia */}
                  {formData.min_km_franchise > 0 && formData.min_price_for_franchise > 0 && formData.base_price_per_km > 0 && (
                    <div className="bg-white border-2 border-yellow-400 rounded-lg p-4">
                      <p className="text-xs font-semibold text-yellow-900 mb-2">📊 Simulação de Cobrança:</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Viagem de {formData.min_km_franchise / 2} km:</span>
                          <strong className="text-yellow-700">{formatPrice(formData.min_price_for_franchise)} (franquia)</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Viagem de {formData.min_km_franchise} km:</span>
                          <strong className="text-yellow-700">{formatPrice(formData.min_price_for_franchise)} (franquia)</strong>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span>Viagem de {parseFloat(formData.min_km_franchise) + 30} km:</span>
                          <strong className="text-green-600">
                            {formatPrice((parseFloat(formData.min_km_franchise) + 30) * parseFloat(formData.base_price_per_km))} (por km)
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preços Mínimos */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Preços Mínimos (Adicionais)</h3>
                  <Alert className="bg-gray-50 border-gray-300">
                    <AlertCircle className="h-4 w-4 text-gray-600" />
                    <AlertDescription className="text-gray-700 text-sm">
                      Estes valores são aplicados apenas se forem maiores que o cálculo por KM e a franquia.
                    </AlertDescription>
                  </Alert>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min_price_one_way">Preço Mínimo Só Ida (R$)</Label>
                      <Input
                        id="min_price_one_way"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.min_price_one_way}
                        onChange={(e) => setFormData({ ...formData, min_price_one_way: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="min_price_round_trip">Preço Mínimo Ida e Volta (R$)</Label>
                      <Input
                        id="min_price_round_trip"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.min_price_round_trip}
                        onChange={(e) => setFormData({ ...formData, min_price_round_trip: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Pacotes por Hora */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Pacotes por Hora</h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hourly_5_hours_price">Pacote 5 Horas (R$)</Label>
                      <Input
                        id="hourly_5_hours_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.hourly_5_hours_price}
                        onChange={(e) => setFormData({ ...formData, hourly_5_hours_price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hourly_5_hours_km_allowance">Franquia KM (5h)</Label>
                      <Input
                        id="hourly_5_hours_km_allowance"
                        type="number"
                        min="0"
                        value={formData.hourly_5_hours_km_allowance}
                        onChange={(e) => setFormData({ ...formData, hourly_5_hours_km_allowance: e.target.value })}
                        placeholder="50"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hourly_10_hours_price">Pacote 10 Horas (R$)</Label>
                      <Input
                        id="hourly_10_hours_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.hourly_10_hours_price}
                        onChange={(e) => setFormData({ ...formData, hourly_10_hours_price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hourly_10_hours_km_allowance">Franquia KM (10h)</Label>
                      <Input
                        id="hourly_10_hours_km_allowance"
                        type="number"
                        min="0"
                        value={formData.hourly_10_hours_km_allowance}
                        onChange={(e) => setFormData({ ...formData, hourly_10_hours_km_allowance: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="additional_price_per_km">Preço por KM Excedente (R$)</Label>
                      <Input
                        id="additional_price_per_km"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.additional_price_per_km}
                        onChange={(e) => setFormData({ ...formData, additional_price_per_km: e.target.value })}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">
                        Cobrado quando exceder a franquia de KM do pacote
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="additional_price_per_hour">Preço por Hora Excedente (R$)</Label>
                      <Input
                        id="additional_price_per_hour"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.additional_price_per_hour}
                        onChange={(e) => setFormData({ ...formData, additional_price_per_hour: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Sobretaxas de Idioma - NOVO COM CONFIGURAÇÃO DE TIPO */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Sobretaxas de Idioma</h3>

                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-sm">
                      <strong>💡 Configuração de Sobretaxas:</strong> Defina se a sobretaxa será um valor fixo (R$) ou um percentual (%) sobre o valor base da viagem.
                    </AlertDescription>
                  </Alert>

                  {/* Sobretaxa Inglês */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                      🇺🇸 Inglês (English)
                    </h4>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="language_surcharge_en_type">Tipo de Sobretaxa</Label>
                        <select
                          id="language_surcharge_en_type"
                          value={formData.language_surcharge_en_type}
                          onChange={(e) => setFormData({ ...formData, language_surcharge_en_type: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="fixed_amount">💰 Valor Fixo (R$)</option>
                          <option value="percentage">📊 Percentual (%)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="language_surcharge_en">
                          {formData.language_surcharge_en_type === 'fixed_amount' ? 'Valor (R$)' : 'Percentual (%)'}
                        </Label>
                        <Input
                          id="language_surcharge_en"
                          type="number"
                          min="0"
                          step={formData.language_surcharge_en_type === 'percentage' ? '0.1' : '0.01'}
                          max={formData.language_surcharge_en_type === 'percentage' ? '100' : undefined}
                          value={formData.language_surcharge_en}
                          onChange={(e) => setFormData({ ...formData, language_surcharge_en: e.target.value })}
                          placeholder={formData.language_surcharge_en_type === 'fixed_amount' ? '0.00' : '0.0'}
                        />
                        {formData.language_surcharge_en_type === 'percentage' && (
                          <p className="text-xs text-gray-500">
                            Ex: 10 = 10% sobre o valor base da viagem
                          </p>
                        )}
                        {formData.language_surcharge_en_type === 'fixed_amount' && (
                          <p className="text-xs text-gray-500">
                            Ex: 50.00 = R$ 50,00 adicionais
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Preview do cálculo */}
                    {formData.language_surcharge_en > 0 && (
                      <div className="bg-white border border-purple-300 rounded p-3">
                        <p className="text-xs font-semibold text-purple-900 mb-1">📋 Exemplo de Aplicação:</p>
                        {formData.language_surcharge_en_type === 'fixed_amount' ? (
                          <p className="text-sm text-gray-700">
                            Viagem de R$ 100,00 + R$ {parseFloat(formData.language_surcharge_en).toFixed(2)} =
                            <strong className="text-purple-600"> R$ {(100 + parseFloat(formData.language_surcharge_en || 0)).toFixed(2)}</strong>
                          </p>
                        ) : (
                          <p className="text-sm text-gray-700">
                            Viagem de R$ 100,00 + {parseFloat(formData.language_surcharge_en).toFixed(1)}% =
                            <strong className="text-purple-600"> R$ {(100 + (100 * parseFloat(formData.language_surcharge_en || 0) / 100)).toFixed(2)}</strong>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sobretaxa Espanhol */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold text-orange-900 flex items-center gap-2">
                      🇪🇸 Espanhol (Español)
                    </h4>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="language_surcharge_es_type">Tipo de Sobretaxa</Label>
                        <select
                          id="language_surcharge_es_type"
                          value={formData.language_surcharge_es_type}
                          onChange={(e) => setFormData({ ...formData, language_surcharge_es_type: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="fixed_amount">💰 Valor Fixo (R$)</option>
                          <option value="percentage">📊 Percentual (%)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="language_surcharge_es">
                          {formData.language_surcharge_es_type === 'fixed_amount' ? 'Valor (R$)' : 'Percentual (%)'}
                        </Label>
                        <Input
                          id="language_surcharge_es"
                          type="number"
                          min="0"
                          step={formData.language_surcharge_es_type === 'percentage' ? '0.1' : '0.01'}
                          max={formData.language_surcharge_es_type === 'percentage' ? '100' : undefined}
                          value={formData.language_surcharge_es}
                          onChange={(e) => setFormData({ ...formData, language_surcharge_es: e.target.value })}
                          placeholder={formData.language_surcharge_es_type === 'fixed_amount' ? '0.00' : '0.0'}
                        />
                        {formData.language_surcharge_es_type === 'percentage' && (
                          <p className="text-xs text-gray-500">
                            Ex: 10 = 10% sobre o valor base da viagem
                          </p>
                        )}
                        {formData.language_surcharge_es_type === 'fixed_amount' && (
                          <p className="text-xs text-gray-500">
                            Ex: 50.00 = R$ 50,00 adicionais
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Preview do cálculo */}
                    {formData.language_surcharge_es > 0 && (
                      <div className="bg-white border border-orange-300 rounded p-3">
                        <p className="text-xs font-semibold text-orange-900 mb-1">📋 Exemplo de Aplicação:</p>
                        {formData.language_surcharge_es_type === 'fixed_amount' ? (
                          <p className="text-sm text-gray-700">
                            Viagem de R$ 100,00 + R$ {parseFloat(formData.language_surcharge_es).toFixed(2)} =
                            <strong className="text-orange-600"> R$ {(100 + parseFloat(formData.language_surcharge_es || 0)).toFixed(2)}</strong>
                          </p>
                        ) : (
                          <p className="text-sm text-gray-700">
                            Viagem de R$ 100,00 + {parseFloat(formData.language_surcharge_es).toFixed(1)}% =
                            <strong className="text-orange-600"> R$ {(100 + (100 * parseFloat(formData.language_surcharge_es || 0) / 100)).toFixed(2)}</strong>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Configurações Operacionais */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Configurações Operacionais</h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="operational_radius_km">Raio de Atuação (km)</Label>
                      <Input
                        id="operational_radius_km"
                        type="number"
                        min="0"
                        value={formData.operational_radius_km}
                        onChange={(e) => setFormData({ ...formData, operational_radius_km: e.target.value })}
                        placeholder="0 = ilimitado"
                      />
                      <p className="text-xs text-gray-500">
                        Distância máxima total que o veículo pode percorrer (0 = ilimitado)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="min_booking_lead_time_hours">Antecedência Mínima (horas)</Label>
                      <Input
                        id="min_booking_lead_time_hours"
                        type="number"
                        min="0"
                        value={formData.min_booking_lead_time_hours}
                        onChange={(e) => setFormData({ ...formData, min_booking_lead_time_hours: e.target.value })}
                        placeholder="24"
                      />
                    </div>
                  </div>
                </div>

                {/* Características */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Características do Veículo</h3>

                  <div className="flex gap-2">
                    <Input
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      placeholder="Ex: Wi-Fi, Ar-condicionado..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddFeature}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {formData.features.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="gap-2">
                          {feature}
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createVehicleMutation.isLoading || updateVehicleMutation.isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {(createVehicleMutation.isLoading || updateVehicleMutation.isLoading) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    editingVehicle ? 'Atualizar' : 'Cadastrar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-900">
                <AlertCircle className="w-6 h-6" />
                Confirmar Exclusão
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tem certeza que deseja excluir o veículo <strong>{vehicleToDelete?.name}</strong>?
                  Esta ação não pode ser desfeita.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleteVehicleMutation.isLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteVehicleMutation.isLoading}
              >
                {deleteVehicleMutation.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluir
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}