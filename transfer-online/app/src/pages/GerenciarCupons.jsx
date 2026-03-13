import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Edit, Trash2, Ticket, AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import GenericTable from '@/components/ui/GenericTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Switch } from '@/components/ui/switch';

export default function GerenciarCupons() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    valid_from: '',
    valid_until: '',
    min_purchase_amount: '',
    max_usage: '',
    max_usage_per_user: 1,
    applies_to: 'all',
    target_vehicle_ids: [],
    active: true,
    description: ''
  });

  const queryClient = useQueryClient();

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => base44.entities.Coupon.list('-created_date'),
    initialData: []
  });

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: () => base44.entities.VehicleType.filter({ active: true }),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Coupon.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setShowDialog(false);
      resetForm();
      setFormSuccess('Cupom criado com sucesso!');
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || error.message || 'Erro ao criar cupom');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Coupon.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setShowDialog(false);
      resetForm();
      setFormSuccess('Cupom atualizado com sucesso!');
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || error.message || 'Erro ao atualizar cupom');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Coupon.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setFormSuccess('Cupom excluído com sucesso!');
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (error) => {
      setFormError(error.response?.data?.error || error.message || 'Erro ao excluir cupom');
    }
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setIsCheckingAuth(false);
      } catch (error) {
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      valid_from: '',
      valid_until: '',
      min_purchase_amount: '',
      max_usage: '',
      max_usage_per_user: 1,
      applies_to: 'all',
      target_vehicle_ids: [],
      active: true,
      description: ''
    });
    setEditingCoupon(null);
    setFormError('');
  };

  const handleOpenDialog = (coupon = null) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code || '',
        discount_type: coupon.discount_type || 'percentage',
        discount_value: coupon.discount_value || '',
        valid_from: coupon.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 16) : '',
        valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 16) : '',
        min_purchase_amount: coupon.min_purchase_amount || '',
        max_usage: coupon.max_usage || '',
        max_usage_per_user: coupon.max_usage_per_user || 1,
        applies_to: coupon.applies_to || 'all',
        target_vehicle_ids: coupon.target_vehicle_ids || [],
        active: coupon.active !== undefined ? coupon.active : true,
        description: coupon.description || ''
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    // Validações
    if (!formData.code.trim()) {
      setFormError('Código do cupom é obrigatório');
      return;
    }

    if (!formData.discount_value || parseFloat(formData.discount_value) <= 0) {
      setFormError('Valor do desconto deve ser maior que zero');
      return;
    }

    if (formData.discount_type === 'percentage' && parseFloat(formData.discount_value) > 100) {
      setFormError('Desconto percentual não pode ser maior que 100%');
      return;
    }

    // Preparar dados
    const dataToSubmit = {
      code: formData.code.toUpperCase().trim(),
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
      min_purchase_amount: formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount) : 0,
      max_usage: formData.max_usage ? parseInt(formData.max_usage) : null,
      max_usage_per_user: formData.max_usage_per_user ? parseInt(formData.max_usage_per_user) : 1,
      applies_to: formData.applies_to,
      target_vehicle_ids: formData.applies_to === 'specific_vehicle' ? formData.target_vehicle_ids : [],
      active: formData.active,
      description: formData.description.trim()
    };

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data: dataToSubmit });
    } else {
      dataToSubmit.current_usage_count = 0;
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleDelete = async (couponId) => {
    if (window.confirm('Tem certeza que deseja excluir este cupom?')) {
      deleteMutation.mutate(couponId);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setFormSuccess('Código copiado!');
    setTimeout(() => setFormSuccess(''), 2000);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isCheckingAuth || isLoading) {
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Gerenciar Cupons</h1>
            <p className="text-gray-600">Crie e gerencie cupons de desconto para seus clientes</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />
            Novo Cupom
          </Button>
        </div>

        {formSuccess && (
          <Alert className="bg-green-50 border-green-200 mb-6">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{formSuccess}</AlertDescription>
          </Alert>
        )}

        {formError && !showDialog && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Cupons Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coupons.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Nenhum cupom cadastrado</p>
                <p className="text-sm">Clique em "Novo Cupom" para criar seu primeiro cupom de desconto</p>
              </div>
            ) : (
              <GenericTable
                columns={[
                  {
                    header: 'Código',
                    render: (coupon) => (
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {coupon.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyCode(coupon.code)}
                            className="h-6 w-6"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-gray-500 mt-1">{coupon.description}</p>
                        )}
                      </div>
                    )
                  },
                  {
                    header: 'Desconto',
                    render: (coupon) => coupon.discount_type === 'percentage' ? (
                      <span className="font-semibold">{coupon.discount_value}%</span>
                    ) : (
                      <span className="font-semibold">{formatPrice(coupon.discount_value)}</span>
                    )
                  },
                  {
                    header: 'Validade',
                    render: (coupon) => (
                      <div className="text-sm">
                        {coupon.valid_from && <div>De: {formatDate(coupon.valid_from)}</div>}
                        {coupon.valid_until && <div>Até: {formatDate(coupon.valid_until)}</div>}
                        {!coupon.valid_from && !coupon.valid_until && <span className="text-gray-500">Sem limite</span>}
                      </div>
                    )
                  },
                  {
                    header: 'Uso',
                    render: (coupon) => (
                      <div className="text-sm">
                        <div>{coupon.current_usage_count || 0} uso(s)</div>
                        {coupon.max_usage && <div className="text-gray-500">Máx: {coupon.max_usage}</div>}
                      </div>
                    )
                  },
                  {
                    header: 'Aplicável a',
                    render: (coupon) => (
                      <Badge variant="outline">
                        {coupon.applies_to === 'all' && 'Todos'}
                        {coupon.applies_to === 'one_way' && 'Só Ida'}
                        {coupon.applies_to === 'round_trip' && 'Ida/Volta'}
                        {coupon.applies_to === 'hourly' && 'Por Hora'}
                        {coupon.applies_to === 'specific_vehicle' && 'Veículo Específico'}
                      </Badge>
                    )
                  },
                  {
                    header: 'Status',
                    render: (coupon) => <StatusBadge status={coupon.active} type="user_status" />
                  },
                  {
                    header: 'Ações',
                    render: (coupon) => (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(coupon)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  }
                ]}
                data={coupons}
                emptyMessage="Nenhum cupom cadastrado"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Código do Cupom *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: PRIMEIRAVIAGEM10"
                  required
                  className="uppercase"
                />
              </div>

              <div>
                <Label htmlFor="discount_type">Tipo de Desconto *</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount_value">
                  Valor do Desconto * {formData.discount_type === 'percentage' ? '(%)' : '(R$)'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={formData.discount_type === 'percentage' ? '10' : '50.00'}
                  required
                />
              </div>

              <div>
                <Label htmlFor="min_purchase_amount">Valor Mínimo de Compra (R$)</Label>
                <Input
                  id="min_purchase_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_purchase_amount}
                  onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valid_from">Válido A Partir De</Label>
                <Input
                  id="valid_from"
                  type="datetime-local"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="valid_until">Válido Até</Label>
                <Input
                  id="valid_until"
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_usage">Uso Máximo Total</Label>
                <Input
                  id="max_usage"
                  type="number"
                  min="1"
                  value={formData.max_usage}
                  onChange={(e) => setFormData({ ...formData, max_usage: e.target.value })}
                  placeholder="Ilimitado"
                />
              </div>

              <div>
                <Label htmlFor="max_usage_per_user">Uso Máximo Por Usuário</Label>
                <Input
                  id="max_usage_per_user"
                  type="number"
                  min="1"
                  value={formData.max_usage_per_user}
                  onChange={(e) => setFormData({ ...formData, max_usage_per_user: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="applies_to">Aplicável a</Label>
              <Select
                value={formData.applies_to}
                onValueChange={(value) => setFormData({ ...formData, applies_to: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Serviços</SelectItem>
                  <SelectItem value="one_way">Só Ida</SelectItem>
                  <SelectItem value="round_trip">Ida e Volta</SelectItem>
                  <SelectItem value="hourly">Por Hora</SelectItem>
                  <SelectItem value="specific_vehicle">Veículo Específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.applies_to === 'specific_vehicle' && (
              <div>
                <Label>Veículos Permitidos</Label>
                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto border rounded p-3">
                  {vehicleTypes.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`vehicle-${vehicle.id}`}
                        checked={formData.target_vehicle_ids.includes(vehicle.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              target_vehicle_ids: [...formData.target_vehicle_ids, vehicle.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              target_vehicle_ids: formData.target_vehicle_ids.filter(id => id !== vehicle.id)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`vehicle-${vehicle.id}`} className="cursor-pointer">
                        {vehicle.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="description">Descrição Interna (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição interna do cupom para controle administrativo"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Cupom Ativo</Label>
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
                  editingCoupon ? 'Atualizar' : 'Criar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}