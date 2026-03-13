import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Hotel, 
  Plane, 
  Home, 
  Building2, 
  Briefcase, 
  Plus, 
  Pencil, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Hospital,
  ShoppingBag,
  UtensilsCrossed,
  MapPin
} from 'lucide-react';

const locationTypeIcons = {
  hotel: Hotel,
  airport: Plane,
  residence: Home,
  event_center: Building2,
  business_center: Briefcase,
  hospital: Hospital,
  shopping: ShoppingBag,
  restaurant: UtensilsCrossed,
  office: Building2
};

const locationTypeLabels = {
  hotel: 'Hotel',
  airport: 'Aeroporto',
  residence: 'Residência',
  event_center: 'Centro de Eventos',
  business_center: 'Centro Empresarial',
  hospital: 'Hospital',
  shopping: 'Shopping',
  restaurant: 'Restaurante',
  office: 'Escritório'
};

export default function FrequentLocationsManager({ locations }) {
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'business_center',
    display_order: 0,
    active: true
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FrequentLocation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frequentLocations'] });
      setSuccess('Local criado com sucesso!');
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao criar local');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FrequentLocation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frequentLocations'] });
      setSuccess('Local atualizado com sucesso!');
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao atualizar local');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FrequentLocation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frequentLocations'] });
      setSuccess('Local excluído com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao excluir local');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      type: 'business_center',
      display_order: 0,
      active: true
    });
    setEditingLocation(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (location) => {
    setFormData({
      name: location.name,
      address: location.address,
      type: location.type,
      display_order: location.display_order || 0,
      active: location.active !== false
    });
    setEditingLocation(location);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.address) {
      setError('Nome e endereço são obrigatórios');
      return;
    }

    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir este local?')) {
      deleteMutation.mutate(id);
    }
  };

  const sortedLocations = [...locations].sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Locais Frequentes</h2>
          <p className="text-gray-600">Gerencie pontos de interesse para facilitar as reservas</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Local
        </Button>
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle>{editingLocation ? 'Editar Local' : 'Novo Local'}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Local *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Hotel Hilton Morumbi"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Local *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(locationTypeLabels).map(([key, label]) => {
                        const Icon = locationTypeIcons[key];
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço Completo *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ex: Av Nações Unidas 12901, São Paulo"
                  required
                />
                <p className="text-sm text-gray-500">
                  Endereço usado para cálculo de rota no Google Maps
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_order">Ordem de Exibição</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-sm text-gray-500">Menor valor aparece primeiro</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="active">Status</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                    <span className="text-sm text-gray-600">
                      {formData.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {editingLocation ? 'Atualizar' : 'Criar'} Local
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedLocations.map((location) => {
          const Icon = locationTypeIcons[location.type] || MapPin;
          return (
            <Card key={location.id} className={!location.active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    location.active ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${location.active ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{location.name}</h3>
                    <p className="text-sm text-gray-600 mb-2 break-words">{location.address}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        {locationTypeLabels[location.type]}
                      </span>
                      {!location.active && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(location)}
                        className="flex-1"
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(location.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sortedLocations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum local cadastrado
            </h3>
            <p className="text-gray-600 mb-4">
              Crie locais frequentes para facilitar o processo de reserva
            </p>
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Local
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}