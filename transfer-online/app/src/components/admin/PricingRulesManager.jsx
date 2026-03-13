import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, TrendingUp, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAYS_OF_WEEK = {
  domingo: 'Domingo',
  segunda: 'Segunda',
  terca: 'Terça',
  quarta: 'Quarta',
  quinta: 'Quinta',
  sexta: 'Sexta',
  sabado: 'Sábado'
};

export default function PricingRulesManager({ rules, routes }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    route_id: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    days_of_week: [],
    adjustment_type: 'percentage',
    adjustment_value: 0,
    priority: 1,
    active: true
  });

  const createRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.PricingRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
      resetForm();
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PricingRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
      resetForm();
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.PricingRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricingRules'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      route_id: '',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      days_of_week: [],
      adjustment_type: 'percentage',
      adjustment_value: 0,
      priority: 1,
      active: true
    });
    setIsAdding(false);
    setEditingRule(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (!submitData.route_id) submitData.route_id = null;
    
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data: submitData });
    } else {
      createRuleMutation.mutate(submitData);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      ...rule,
      days_of_week: rule.days_of_week || []
    });
    setIsAdding(true);
  };

  const toggleDayOfWeek = (day) => {
    const currentDays = formData.days_of_week || [];
    if (currentDays.includes(day)) {
      setFormData({
        ...formData,
        days_of_week: currentDays.filter(d => d !== day)
      });
    } else {
      setFormData({
        ...formData,
        days_of_week: [...currentDays, day]
      });
    }
  };

  const getRouteName = (routeId) => {
    if (!routeId) return 'Todas as rotas';
    const route = routes.find(r => r.id === routeId);
    return route ? `${route.origin} → ${route.destination}` : 'Rota não encontrada';
  };

  const formatAdjustment = (rule) => {
    if (rule.adjustment_type === 'percentage') {
      return `${rule.adjustment_value > 0 ? '+' : ''}${rule.adjustment_value}%`;
    } else {
      return `${rule.adjustment_value > 0 ? '+' : ''}R$ ${Math.abs(rule.adjustment_value).toFixed(2)}`;
    }
  };

  return (
    <div className="space-y-6">
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRule ? 'Editar Regra de Precificação' : 'Nova Regra de Precificação'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Regra *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Tarifa Feriado Carnaval"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="route_id">Aplicar à Rota</Label>
                <Select
                  value={formData.route_id || 'all'}
                  onValueChange={(value) => setFormData({ ...formData, route_id: value === 'all' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma rota" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as rotas</SelectItem>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.origin} → {route.destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data Inicial</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Data Final</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Horário Inicial</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">Horário Final</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dias da Semana</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(DAYS_OF_WEEK).map(([key, label]) => (
                    <Button
                      key={key}
                      type="button"
                      variant={formData.days_of_week?.includes(key) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleDayOfWeek(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adjustment_type">Tipo de Ajuste *</Label>
                  <Select
                    value={formData.adjustment_type}
                    onValueChange={(value) => setFormData({ ...formData, adjustment_type: value })}
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
                <div className="space-y-2">
                  <Label htmlFor="adjustment_value">Valor do Ajuste *</Label>
                  <Input
                    id="adjustment_value"
                    type="number"
                    step="0.01"
                    required
                    value={formData.adjustment_value}
                    onChange={(e) => setFormData({ ...formData, adjustment_value: parseFloat(e.target.value) })}
                    placeholder={formData.adjustment_type === 'percentage' ? 'Ex: 20' : 'Ex: 50.00'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Regra Ativa</Label>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingRule ? 'Atualizar' : 'Criar'} Regra
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Regras de Precificação</CardTitle>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Regra
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-gray-900">{rule.name}</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {formatAdjustment(rule)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Rota: {getRouteName(rule.route_id)}</div>
                      {(rule.start_date || rule.end_date) && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {rule.start_date && format(new Date(rule.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                          {rule.start_date && rule.end_date && ' - '}
                          {rule.end_date && format(new Date(rule.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      )}
                      {(rule.start_time || rule.end_time) && (
                        <div>Horário: {rule.start_time || '00:00'} - {rule.end_time || '23:59'}</div>
                      )}
                      {rule.days_of_week && rule.days_of_week.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {rule.days_of_week.map(day => (
                            <Badge key={day} variant="outline" className="text-xs">
                              {DAYS_OF_WEEK[day]}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div>Prioridade: {rule.priority}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${rule.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {rule.active ? 'Ativa' : 'Inativa'}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(rule)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir esta regra?')) {
                          deleteRuleMutation.mutate(rule.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhuma regra de precificação cadastrada ainda
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}