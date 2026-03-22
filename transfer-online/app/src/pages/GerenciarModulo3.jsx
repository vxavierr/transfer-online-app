import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Settings,
  Search,
  Building2,
  CheckCircle,
  AlertCircle,
  Package
} from 'lucide-react';

export default function GerenciarModulo3() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    module3_enabled: false,
    module3_subscription_level: 0,
    module3_subscription_plan_id: '',
    module3_trial_end_date: '',
    module3_is_on_trial: false,
    branding_company_name: '',
    branding_email: '',
    branding_phone: '',
    branding_logo_url: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();

        if (!currentUser || currentUser.role !== 'admin') {
          window.location.href = '/';
          return;
        }

        setUser(currentUser);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = '/AccessPortal?returnUrl=%2FGerenciarModulo3';
      }
    };

    checkAuth();
  }, []);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: []
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: () => base44.entities.SubscriptionPlan.filter({ active: true }),
    initialData: []
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setSuccess('Módulo 3 atualizado com sucesso!');
      setShowDialog(false);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao atualizar Módulo 3');
    }
  });

  const handleOpenDialog = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      module3_enabled: supplier.module3_enabled || false,
      module3_subscription_level: supplier.module3_subscription_level || 0,
      module3_subscription_plan_id: supplier.module3_subscription_plan_id || '',
      module3_trial_end_date: supplier.module3_trial_end_date ? supplier.module3_trial_end_date.split('T')[0] : '',
      module3_is_on_trial: supplier.module3_is_on_trial || false,
      branding_company_name: supplier.branding_company_name || '',
      branding_email: supplier.branding_email || '',
      branding_phone: supplier.branding_phone || '',
      branding_logo_url: supplier.branding_logo_url || ''
    });
    setShowDialog(true);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (formData.module3_enabled && formData.module3_subscription_level === 0) {
      setError('Selecione um nível de assinatura para ativar o Módulo 3');
      return;
    }

    if (formData.module3_enabled && formData.module3_subscription_level > 0) {
      if (!formData.branding_company_name || !formData.branding_email || !formData.branding_phone) {
        setError('Preencha todos os campos de branding obrigatórios');
        return;
      }
      if (!formData.module3_subscription_plan_id) {
        setError('Selecione um plano de assinatura');
        return;
      }
    }

    const now = new Date();
    const isNewActivation = formData.module3_enabled && !selectedSupplier.module3_enabled;
    const selectedPlan = plans.find(p => p.id === formData.module3_subscription_plan_id);

    const updateData = {
      ...formData,
      module3_activated_at: isNewActivation ? now.toISOString() : selectedSupplier.module3_activated_at,
      module3_trial_start_date: isNewActivation ? now.toISOString() : selectedSupplier.module3_trial_start_date,
      module3_trial_end_date: formData.module3_trial_end_date ? new Date(formData.module3_trial_end_date + 'T23:59:59').toISOString() : 
                               (isNewActivation && selectedPlan ? new Date(now.getTime() + selectedPlan.trial_days * 24 * 60 * 60 * 1000).toISOString() : selectedSupplier.module3_trial_end_date),
      module3_is_on_trial: isNewActivation ? true : formData.module3_is_on_trial,
      module3_current_billing_start_date: isNewActivation ? now.toISOString() : selectedSupplier.module3_current_billing_start_date,
      module3_current_trips_count: selectedSupplier.module3_current_trips_count || 0
    };

    updateMutation.mutate({
      id: selectedSupplier.id,
      data: updateData
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const search = searchTerm.toLowerCase();
    return (
      supplier.name?.toLowerCase().includes(search) ||
      supplier.company_name?.toLowerCase().includes(search) ||
      supplier.email?.toLowerCase().includes(search)
    );
  });

  const getLevelLabel = (level) => {
    const labels = {
      0: 'Desativado',
      1: 'Nível 1 - Recebe Viagens',
      2: 'Nível 2 - Recebe + Próprios Clientes',
      3: 'Nível 3 - Apenas Próprios Clientes'
    };
    return labels[level] || 'Desconhecido';
  };

  const getLevelColor = (level) => {
    const colors = {
      0: 'bg-gray-100 text-gray-800',
      1: 'bg-blue-100 text-blue-800',
      2: 'bg-purple-100 text-purple-800',
      3: 'bg-green-100 text-green-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gerenciar Módulo 3</h1>
          <p className="text-gray-600">Configure os níveis de acesso do Módulo 3 para os fornecedores</p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-300">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Total Fornecedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{suppliers.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Módulo 3 Ativo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {suppliers.filter(s => s.module3_enabled).length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Nível 2 e 3</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {suppliers.filter(s => s.module3_subscription_level >= 2).length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Desativado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {suppliers.filter(s => !s.module3_enabled).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, empresa ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Carregando fornecedores...</p>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum fornecedor encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Módulo 3</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nível</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branding</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{supplier.name}</div>
                              <div className="text-xs text-gray-500">{supplier.company_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-600">{supplier.email}</div>
                          <div className="text-xs text-gray-500">{supplier.phone_number}</div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={
                            supplier.module3_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }>
                            {supplier.module3_enabled ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <Badge className={getLevelColor(supplier.module3_subscription_level || 0)}>
                              Nível {supplier.module3_subscription_level || 0}
                            </Badge>
                            {supplier.module3_is_on_trial && (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                Em Teste
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {supplier.branding_company_name ? (
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{supplier.branding_company_name}</div>
                              <div className="text-xs text-gray-500">{supplier.branding_email}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Não configurado</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(supplier)}
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Configurar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configurar Módulo 3 - {selectedSupplier?.name}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Sobre o Módulo 3</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li><strong>Nível 1:</strong> Fornecedor recebe viagens dos clientes do sistema</li>
                  <li><strong>Nível 2:</strong> Recebe viagens + pode cadastrar seus próprios clientes</li>
                  <li><strong>Nível 3:</strong> Apenas gerencia seus próprios clientes (sem receber viagens do sistema)</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-base font-semibold">Ativar Módulo 3</Label>
                    <p className="text-sm text-gray-600">Habilitar funcionalidades avançadas para este fornecedor</p>
                  </div>
                  <Switch
                    checked={formData.module3_enabled}
                    onCheckedChange={(checked) => handleChange('module3_enabled', checked)}
                  />
                </div>

                {formData.module3_enabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Plano de Assinatura *</Label>
                      <Select
                        value={formData.module3_subscription_plan_id}
                        onValueChange={(value) => {
                          const selectedPlan = plans.find(p => p.id === value);
                          handleChange('module3_subscription_plan_id', value);
                          if (selectedPlan) {
                            handleChange('module3_subscription_level', selectedPlan.level);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map(plan => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - R$ {plan.monthly_fee}/mês
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-semibold text-amber-900 mb-2">Período de Teste</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Em Período de Teste</Label>
                          <input
                            type="checkbox"
                            checked={formData.module3_is_on_trial}
                            onChange={(e) => handleChange('module3_is_on_trial', e.target.checked)}
                            className="w-4 h-4"
                          />
                        </div>
                        {formData.module3_is_on_trial && (
                          <div className="space-y-2">
                            <Label className="text-sm">Data de Término do Teste</Label>
                            <Input
                              type="date"
                              value={formData.module3_trial_end_date}
                              onChange={(e) => handleChange('module3_trial_end_date', e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Configurações de Branding
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Estas informações serão usadas nas comunicações com os clientes próprios deste fornecedor
                      </p>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nome da Empresa (Branding) *</Label>
                          <Input
                            value={formData.branding_company_name}
                            onChange={(e) => handleChange('branding_company_name', e.target.value)}
                            placeholder="Ex: Transportes ABC"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Email (Branding) *</Label>
                          <Input
                            type="email"
                            value={formData.branding_email}
                            onChange={(e) => handleChange('branding_email', e.target.value)}
                            placeholder="contato@transportesabc.com"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Telefone (Branding) *</Label>
                          <Input
                            value={formData.branding_phone}
                            onChange={(e) => handleChange('branding_phone', e.target.value)}
                            placeholder="+55 11 99999-9999"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>URL da Logo (Branding)</Label>
                          <Input
                            value={formData.branding_logo_url}
                            onChange={(e) => handleChange('branding_logo_url', e.target.value)}
                            placeholder="https://exemplo.com/logo.png"
                          />
                          {formData.branding_logo_url && (
                            <div className="mt-2">
                              <img
                                src={formData.branding_logo_url}
                                alt="Logo Preview"
                                className="h-16 object-contain"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Configurações'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}