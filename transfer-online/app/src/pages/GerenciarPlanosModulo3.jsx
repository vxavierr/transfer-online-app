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
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Package
} from 'lucide-react';

export default function GerenciarPlanosModulo3() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: 2,
    monthly_fee: 0,
    included_trips: 0,
    per_trip_overage_cost: 0,
    trial_days: 30,
    features: [],
    active: true,
    display_order: 0
  });

  const [newFeature, setNewFeature] = useState('');

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
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: () => base44.entities.SubscriptionPlan.list('display_order'),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (planData) => base44.entities.SubscriptionPlan.create(planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionPlans'] });
      setSuccess('Plano criado com sucesso!');
      setShowDialog(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao criar plano');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SubscriptionPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionPlans'] });
      setSuccess('Plano atualizado com sucesso!');
      setShowDialog(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao atualizar plano');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SubscriptionPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionPlans'] });
      setSuccess('Plano excluído com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao excluir plano');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      level: 2,
      monthly_fee: 0,
      included_trips: 0,
      per_trip_overage_cost: 0,
      trial_days: 30,
      features: [],
      active: true,
      display_order: 0
    });
    setEditingPlan(null);
    setError('');
    setNewFeature('');
  };

  const handleOpenDialog = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({ ...plan });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || formData.monthly_fee < 0) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...(prev.features || []), newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Planos de Assinatura - Módulo 3</h1>
          <p className="text-gray-600">Configure os planos disponíveis para os fornecedores</p>
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
              <CardTitle className="text-sm font-medium opacity-90">Total de Planos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{plans.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Planos Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {plans.filter(p => p.active).length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">Receita Potencial/Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {formatPrice(plans.reduce((sum, p) => sum + (p.active ? p.monthly_fee : 0), 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex justify-end">
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Novo Plano
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Carregando planos...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum plano criado ainda</p>
            </div>
          ) : (
            plans.map((plan) => (
              <Card key={plan.id} className={`${!plan.active ? 'opacity-60' : ''} hover:shadow-lg transition-shadow`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{plan.name}</span>
                    <Badge className={
                      plan.level === 1 ? 'bg-blue-100 text-blue-800' :
                      plan.level === 2 ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }>
                      Nível {plan.level}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {plan.description && (
                    <p className="text-sm text-gray-600">{plan.description}</p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Mensalidade:</span>
                      <span className="font-bold text-lg text-green-600">
                        {formatPrice(plan.monthly_fee)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Viagens incluídas:</span>
                      <span className="font-semibold">{plan.included_trips}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Custo adicional/viagem:</span>
                      <span className="font-semibold">{formatPrice(plan.per_trip_overage_cost)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Período de teste:</span>
                      <span className="font-semibold">{plan.trial_days} dias</span>
                    </div>
                  </div>

                  {plan.features && plan.features.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Funcionalidades:</p>
                      <ul className="space-y-1">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(plan)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Tem certeza que deseja excluir o plano "${plan.name}"?`)) {
                          deleteMutation.mutate(plan.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {!plan.active && (
                    <Badge className="w-full justify-center bg-gray-100 text-gray-800">
                      Inativo
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}
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
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome do Plano *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ex: Módulo 3 Premium"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nível *</Label>
                  <Select
                    value={String(formData.level)}
                    onValueChange={(value) => handleChange('level', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Nível 1 - Recebe Viagens</SelectItem>
                      <SelectItem value="2">Nível 2 - Recebe + Próprios</SelectItem>
                      <SelectItem value="3">Nível 3 - Apenas Próprios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mensalidade (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthly_fee}
                    onChange={(e) => handleChange('monthly_fee', parseFloat(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Viagens Incluídas *</Label>
                  <Input
                    type="number"
                    value={formData.included_trips}
                    onChange={(e) => handleChange('included_trips', parseInt(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Custo por Viagem Adicional (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.per_trip_overage_cost}
                    onChange={(e) => handleChange('per_trip_overage_cost', parseFloat(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dias de Teste Gratuito</Label>
                  <Input
                    type="number"
                    value={formData.trial_days}
                    onChange={(e) => handleChange('trial_days', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ordem de Exibição</Label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => handleChange('display_order', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Funcionalidades do Plano</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Digite uma funcionalidade"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleAddFeature}
                      variant="outline"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.features && formData.features.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {formData.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm">{feature}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFeature(idx)}
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <Label>Plano Ativo</Label>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => handleChange('active', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
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
      </div>
    </div>
  );
}