import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Package, DollarSign, Percent } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function AdditionalItemsManager({ items }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    adjustment_type: 'fixed_amount',
    adjustment_value: 0,
    active: true
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.AdditionalItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additionalItems'] });
      resetForm();
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AdditionalItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additionalItems'] });
      resetForm();
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => base44.entities.AdditionalItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additionalItems'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      adjustment_type: 'fixed_amount',
      adjustment_value: 0,
      active: true
    });
    setIsAdding(false);
    setEditingItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createItemMutation.mutate(formData);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      adjustment_type: item.adjustment_type || 'fixed_amount',
      adjustment_value: item.adjustment_value || item.price || 0,
      active: item.active
    });
    setIsAdding(true);
  };

  const formatValue = (item) => {
    if (item.adjustment_type === 'percentage') {
      return `${item.adjustment_value}%`;
    } else {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(item.adjustment_value || item.price || 0);
    }
  };

  return (
    <div className="space-y-6">
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingItem ? 'Editar Item Adicional' : 'Novo Item Adicional'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Item *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cadeirinha de Bebê"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição detalhada do item..."
                  className="h-20"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adjustment_type">Tipo de Cobrança *</Label>
                  <Select
                    value={formData.adjustment_type}
                    onValueChange={(value) => setFormData({ ...formData, adjustment_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_amount">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Valor Fixo (R$)
                        </div>
                      </SelectItem>
                      <SelectItem value="percentage">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4" />
                          Percentual (%)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjustment_value">
                    {formData.adjustment_type === 'percentage' ? 'Percentual (%)' : 'Valor (R$)'} *
                  </Label>
                  <Input
                    id="adjustment_value"
                    type="number"
                    step="0.01"
                    required
                    value={formData.adjustment_value}
                    onChange={(e) => setFormData({ ...formData, adjustment_value: parseFloat(e.target.value) })}
                    placeholder={formData.adjustment_type === 'percentage' ? 'Ex: 10' : 'Ex: 50.00'}
                  />
                  <p className="text-xs text-gray-500">
                    {formData.adjustment_type === 'percentage' 
                      ? 'Percentual que será aplicado sobre o preço base da rota'
                      : 'Valor fixo em reais que será adicionado ao total'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Item Ativo</Label>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingItem ? 'Atualizar' : 'Criar'} Item
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
          <CardTitle>Itens Adicionais Cadastrados</CardTitle>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Item
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-900">{item.name}</span>
                    {(item.adjustment_type === 'percentage' || (!item.adjustment_type && item.price)) && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {item.adjustment_type === 'percentage' ? (
                          <div className="flex items-center gap-1">
                            <Percent className="w-3 h-3" />
                            Percentual
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Fixo
                          </div>
                        )}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                  )}
                  <div className="text-sm font-semibold text-blue-600">
                    {formatValue(item)}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${item.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {item.active ? 'Ativo' : 'Inativo'}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(item)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir este item?')) {
                        deleteItemMutation.mutate(item.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum item adicional cadastrado ainda
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}