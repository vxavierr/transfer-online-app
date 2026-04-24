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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Users,
  Phone,
  Mail,
  Building,
  MapPin,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Upload,
  Image as ImageIcon,
  Star
} from 'lucide-react';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';

export default function GerenciarFornecedores() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '', // Added new field
    contact_name: '',
    email: '',
    phone_number: '',
    company_name: '',
    document_id: '',
    address: '',
    city: '',
    state: '',
    base_address: '',
    payment_details: '',
    default_margin_percentage: 0,
    notes: '',
    features: { driver_messaging: false, receptive_management: false, event_dashboard_access: false, driver_tracking_access: false },
      active: true
    });
    const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false); // Added new state

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          alert('Acesso restrito a administradores.');
          window.location.href = '/';
          return;
        }
        setUser(currentUser);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = '/AccessPortal?returnUrl=%2FGerenciarFornecedores';
      }
    };

    checkAuth();
  }, []);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: !isCheckingAuth,
    initialData: [],
  });

  const createSupplierMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setSuccess('Fornecedor cadastrado com sucesso!');
      handleCloseDialog();
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao cadastrar fornecedor');
    }
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setSuccess('Fornecedor atualizado com sucesso!');
      handleCloseDialog();
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao atualizar fornecedor');
    }
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setSuccess('Fornecedor excluído com sucesso!');
      setShowDeleteDialog(false);
      setSupplierToDelete(null);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao excluir fornecedor');
    }
  });

  const handleOpenDialog = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name || '',
        logo_url: supplier.logo_url || '', // Set logo_url when editing
        contact_name: supplier.contact_name || '',
        email: supplier.email || '',
        phone_number: supplier.phone_number || '',
        company_name: supplier.company_name || '',
        document_id: supplier.document_id || '',
        address: supplier.address || '',
        city: supplier.city || '',
        state: supplier.state || '',
        base_address: supplier.base_address || '',
        payment_details: supplier.payment_details || '',
        default_margin_percentage: supplier.default_margin_percentage || 0,
        notes: supplier.notes || '',
        features: supplier.features || { driver_messaging: false },
        active: supplier.active !== false
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        logo_url: '', // Initialize logo_url for new supplier
        contact_name: '',
        email: '',
        phone_number: '',
        company_name: '',
        document_id: '',
        address: '',
        city: '',
        state: '',
        base_address: '',
        payment_details: '',
        default_margin_percentage: 0,
        notes: '',
        features: { driver_messaging: false, receptive_management: false, event_dashboard_access: false, driver_tracking_access: false, can_subcontract: false },
        active: true
        });
        }
    setError('');
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingSupplier(null);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Nome do fornecedor é obrigatório');
      return;
    }
    if (!formData.email.trim()) {
      setError('E-mail é obrigatório');
      return;
    }
    if (!formData.phone_number.trim()) {
      setError('Telefone é obrigatório');
      return;
    }
    if (!formData.company_name.trim()) {
      setError('Nome da empresa é obrigatório');
      return;
    }

    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createSupplierMutation.mutate(formData);
    }
  };

  const handleDeleteClick = (supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (supplierToDelete) {
      deleteSupplierMutation.mutate(supplierToDelete.id);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploadingLogo(true);
    setError('');

    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: response.file_url });
      setSuccess('Logomarca carregada com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Erro ao fazer upload da logo:', err);
      setError('Erro ao fazer upload da logomarca. Tente novamente.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const activeSuppliers = suppliers.filter(p => p.active !== false);
  const inactiveSuppliers = suppliers.filter(p => p.active === false);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
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
              Gerenciar Fornecedores
            </h1>
            <p className="text-gray-600">Cadastre e gerencie fornecedores para executar viagens</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Fornecedor
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
                <Users className="w-4 h-4" />
                Total de Fornecedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{suppliers.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Fornecedores Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeSuppliers.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Fornecedores Inativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{inactiveSuppliers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Fornecedores */}
        <Card>
          <CardHeader>
            <CardTitle>Fornecedores Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Nenhum fornecedor cadastrado</p>
                <p className="text-sm">Comece cadastrando seu primeiro fornecedor</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Logo</TableHead> {/* Added new TableHead */}
                      <TableHead className="font-semibold">Fornecedor</TableHead>
                      <TableHead className="font-semibold">Empresa</TableHead>
                      <TableHead className="font-semibold">Contato</TableHead>
                      <TableHead className="font-semibold">Localização</TableHead>
                      <TableHead className="font-semibold">Margem Padrão</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="relative w-12 h-12">
                            {supplier.logo_url && (
                              <img
                                src={supplier.logo_url}
                                alt={`Logo ${supplier.name}`}
                                className="w-12 h-12 object-contain rounded border border-gray-200 absolute top-0 left-0 bg-white z-10"
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            )}
                            <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center absolute top-0 left-0">
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{supplier.name}</div>
                            {supplier.contact_name && (
                              <div className="text-sm text-gray-500">Contato: {supplier.contact_name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="font-medium">{supplier.company_name}</div>
                              {supplier.document_id && (
                                <div className="text-xs text-gray-500">{supplier.document_id}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span>{supplier.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{supplier.phone_number}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {supplier.city || supplier.state ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">
                                {supplier.city}{supplier.city && supplier.state ? ', ' : ''}{supplier.state}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-green-600">
                              {supplier.default_margin_percentage || 0}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={supplier.active !== false ?
                            'bg-green-100 text-green-800 border-green-300' :
                            'bg-gray-100 text-gray-800 border-gray-300'}>
                            {supplier.active !== false ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(supplier)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(supplier)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Cadastro/Edição */}
        <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
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

                {/* ID do Fornecedor - Somente na Edição */}
                {editingSupplier && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <Label htmlFor="supplier_id" className="text-sm font-semibold text-blue-900">
                      ID do Fornecedor (somente leitura)
                    </Label>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        id="supplier_id"
                        value={editingSupplier.id}
                        readOnly
                        className="font-mono text-sm bg-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(editingSupplier.id);
                          alert('ID copiado para a área de transferência!');
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Use este ID para associar usuários a este fornecedor no painel da Base44
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Logomarca</h3>

                  <div className="space-y-3">
                    <Label htmlFor="logo_upload">Logo do Fornecedor</Label>

                    {formData.logo_url && (
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="relative w-24 h-24">
                          <img
                            src={formData.logo_url}
                            alt="Logo preview"
                            className="w-24 h-24 object-contain rounded border border-gray-300 bg-white absolute top-0 left-0 z-10"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                          <div className="w-24 h-24 bg-gray-200 rounded border border-gray-300 flex items-center justify-center absolute top-0 left-0">
                            <ImageIcon className="w-10 h-10 text-gray-400" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Logo carregada</p>
                          <p className="text-xs text-gray-500 mt-1">Esta logo aparecerá em relatórios e documentos</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData({ ...formData, logo_url: '' })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remover
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Input
                        id="logo_upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('logo_upload').click()}
                        disabled={isUploadingLogo}
                        className="w-full"
                      >
                        {isUploadingLogo ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Carregando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {formData.logo_url ? 'Alterar Logomarca' : 'Fazer Upload da Logomarca'}
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500">
                      Recomendado: imagem PNG ou JPG com fundo transparente, tamanho máximo 5MB
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Informações Básicas</h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Fornecedor *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: João Silva Transfer"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_name">Nome do Contato</Label>
                      <Input
                        id="contact_name"
                        value={formData.contact_name}
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                        placeholder="Ex: João Silva"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="contato@exemplo.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Telefone *</Label>
                      <PhoneInputWithCountry
                        id="phone_number"
                        value={formData.phone_number}
                        onChange={(value) => setFormData({ ...formData, phone_number: value })}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Dados da Empresa</h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Razão Social / Nome Fantasia *</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        placeholder="Ex: Transfer Express LTDA"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="document_id">CNPJ / CPF</Label>
                      <Input
                        id="document_id"
                        value={formData.document_id}
                        onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Rua, número, bairro"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="base_address">Endereço Base (Opcional)</Label>
                    <Input
                      id="base_address"
                      value={formData.base_address}
                      onChange={(e) => setFormData({ ...formData, base_address: e.target.value })}
                      placeholder="Ex: Endereço principal da frota ou escritório"
                    />
                     <p className="text-xs text-gray-500">
                      Utilizado para calcular distâncias de cotações com ponto de partida nesse local.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Ex: São Paulo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="Ex: SP"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Dados Financeiros</h3>

                  <div className="space-y-2">
                    <Label htmlFor="payment_details">Dados Bancários / PIX</Label>
                    <Textarea
                      id="payment_details"
                      value={formData.payment_details}
                      onChange={(e) => setFormData({ ...formData, payment_details: e.target.value })}
                      placeholder="Ex: Banco Itaú, Ag: 1234, Conta: 56789-0, PIX: 11999999999"
                      className="h-20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default_margin_percentage">Margem de Lucro Padrão (%)</Label>
                    <Input
                      id="default_margin_percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.default_margin_percentage}
                      onChange={(e) => setFormData({ ...formData, default_margin_percentage: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500">
                      Percentual aplicado sobre o custo do fornecedor para calcular o preço final
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Funcionalidades Extras (Planos)
                  </h3>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="feature_driver_messaging"
                        checked={formData.features?.driver_messaging || false}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          features: { 
                            ...formData.features, 
                            driver_messaging: e.target.checked 
                          } 
                        })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <Label htmlFor="feature_driver_messaging" className="cursor-pointer font-medium text-gray-900">
                        Envio de Mensagens para Motoristas
                      </Label>
                    </div>
                    <p className="text-xs text-gray-600 ml-6 mt-1">
                      Permite que o fornecedor envie mensagens em massa ou individuais para seus motoristas via App e WhatsApp.
                    </p>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="feature_receptive_management"
                        checked={formData.features?.receptive_management || false}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          features: { 
                            ...formData.features, 
                            receptive_management: e.target.checked 
                          } 
                        })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <Label htmlFor="feature_receptive_management" className="cursor-pointer font-medium text-gray-900">
                        Gestão de Receptivos
                      </Label>
                    </div>
                    <p className="text-xs text-gray-600 ml-6 mt-1">
                      Habilita o módulo de gerenciamento de receptivos em aeroportos e acompanhamento em tempo real.
                    </p>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="feature_event_dashboard_access"
                        checked={formData.features?.event_dashboard_access || false}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          features: { 
                            ...formData.features, 
                            event_dashboard_access: e.target.checked 
                          } 
                        })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <Label htmlFor="feature_event_dashboard_access" className="cursor-pointer font-medium text-gray-900">
                        Acesso ao Dashboard de Eventos
                      </Label>
                    </div>
                    <p className="text-xs text-gray-600 ml-6 mt-1">
                      Libera o acesso ao dashboard executivo de eventos no menu do fornecedor.
                    </p>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="feature_driver_tracking_access"
                        checked={formData.features?.driver_tracking_access || false}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          features: { 
                            ...formData.features, 
                            driver_tracking_access: e.target.checked 
                          } 
                        })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <Label htmlFor="feature_driver_tracking_access" className="cursor-pointer font-medium text-gray-900">
                        Acesso à Localização em Tempo Real
                      </Label>
                    </div>
                    <p className="text-xs text-gray-600 ml-6 mt-1">
                      Permite que o fornecedor visualize o mapa com a localização dos motoristas ativos em tempo real.
                    </p>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="feature_can_subcontract"
                        checked={formData.features?.can_subcontract || false}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          features: { 
                            ...formData.features, 
                            can_subcontract: e.target.checked 
                          } 
                        })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <Label htmlFor="feature_can_subcontract" className="cursor-pointer font-medium text-gray-900">
                        Gestão de Subcontratação (Parceiros)
                      </Label>
                    </div>
                    <p className="text-xs text-gray-600 ml-6 mt-1">
                       Permite que o fornecedor cadastre parceiros e subcontrate viagens quando não puder atender com frota própria.
                     </p>
                     </div>

                     <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="feature_payables_management"
                        checked={formData.features?.payables_management || false}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          features: { 
                            ...formData.features, 
                            payables_management: e.target.checked 
                          } 
                        })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <Label htmlFor="feature_payables_management" className="cursor-pointer font-medium text-gray-900">
                        Gestão de Contas a Pagar
                      </Label>
                    </div>
                    <p className="text-xs text-gray-600 ml-6 mt-1">
                      Habilita o módulo completo de contas a pagar com lançamentos manuais, categorias de despesas e fluxo de caixa comparativo.
                    </p>
                    </div>
                    </div>

                    <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações Internas</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notas internas sobre o fornecedor..."
                      className="h-20"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="active" className="cursor-pointer">
                      Fornecedor Ativo (pode receber cotações e reservas)
                    </Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createSupplierMutation.isLoading || updateSupplierMutation.isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {(createSupplierMutation.isLoading || updateSupplierMutation.isLoading) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    editingSupplier ? 'Atualizar' : 'Cadastrar'
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
                  Tem certeza que deseja excluir o fornecedor <strong>{supplierToDelete?.name}</strong>?
                  Esta ação não pode ser desfeita.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleteSupplierMutation.isLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteSupplierMutation.isLoading}
              >
                {deleteSupplierMutation.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
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