import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import GenericTable from '@/components/ui/GenericTable';
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  Save,
  ArrowRight,
  Car,
  Loader2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function GerenciarTrechosFrequentes() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    origin: '',
    destination: '',
    service_type: 'transfer',
    notes: '',
    vehicle_options: {} // { 'Sedan Executivo': 150.00 }
  });

  const queryClient = useQueryClient();

  // Fetch Frequent Routes
  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['frequentRoutes'],
    queryFn: () => base44.entities.FrequentRoute.list('-created_date'),
    initialData: [],
  });

  // Fetch Vehicle Types for the price form
  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: () => base44.entities.VehicleType.filter({ active: true }),
    initialData: [],
  });

  // Filtered routes
  const filteredRoutes = useMemo(() => {
    if (!searchTerm) return routes;
    const lower = searchTerm.toLowerCase();
    return routes.filter(r => 
      r.name?.toLowerCase().includes(lower) || 
      r.origin?.toLowerCase().includes(lower) || 
      r.destination?.toLowerCase().includes(lower)
    );
  }, [routes, searchTerm]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FrequentRoute.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['frequentRoutes']);
      setShowDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FrequentRoute.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['frequentRoutes']);
      setShowDialog(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FrequentRoute.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['frequentRoutes']);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      origin: '',
      destination: '',
      service_type: 'transfer',
      notes: '',
      vehicle_options: {}
    });
    setEditingRoute(null);
  };

  const handleEdit = (route) => {
    const options = {};
    if (route.vehicle_options) {
      route.vehicle_options.forEach(opt => {
        options[opt.vehicle_type_name] = opt.price;
      });
    }

    setFormData({
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      service_type: route.service_type || 'transfer',
      notes: route.notes || '',
      vehicle_options: options
    });
    setEditingRoute(route);
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir este trecho?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.origin || !formData.destination) {
      alert('Preencha os campos obrigatórios (Nome, Origem, Destino)');
      return;
    }

    // Convert vehicle_options object back to array format
    const vehicleOptionsArray = Object.entries(formData.vehicle_options)
      .filter(([_, price]) => price && parseFloat(price) > 0)
      .map(([name, price]) => ({
        vehicle_type_name: name,
        price: parseFloat(price)
      }));

    const payload = {
      name: formData.name,
      origin: formData.origin,
      destination: formData.destination,
      service_type: formData.service_type,
      notes: formData.notes,
      vehicle_options: vehicleOptionsArray,
      active: true
    };

    if (editingRoute) {
      updateMutation.mutate({ id: editingRoute.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handlePriceChange = (vehicleName, value) => {
    setFormData(prev => ({
      ...prev,
      vehicle_options: {
        ...prev.vehicle_options,
        [vehicleName]: value
      }
    }));
  };

  const columns = [
    {
      header: 'Nome do Trecho',
      render: (row) => (
        <div>
          <div className="font-bold text-gray-900">{row.name}</div>
          {row.notes && <div className="text-xs text-gray-500 mt-1">{row.notes}</div>}
        </div>
      )
    },
    {
      header: 'Tipo',
      render: (row) => {
        const types = {
          'transfer': 'Transfer',
          'hourly_5': '5 Horas',
          'hourly_10': '10 Horas',
          'hourly_custom': 'Por Hora'
        };
        return (
          <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
            {types[row.service_type] || 'Transfer'}
          </span>
        );
      }
    },
    {
      header: 'Rota',
      render: (row) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="truncate max-w-[200px]" title={row.origin}>{row.origin}</span>
          </div>
          <div className="border-l border-dashed border-gray-300 h-3 ml-1 my-0.5"></div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="truncate max-w-[200px]" title={row.destination}>{row.destination}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Veículos / Preços',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.vehicle_options && row.vehicle_options.length > 0 ? (
            row.vehicle_options.map((opt, idx) => (
              <div key={idx} className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">
                <span className="text-gray-600 mr-1">{opt.vehicle_type_name}:</span>
                <span className="font-bold text-green-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(opt.price)}
                </span>
              </div>
            ))
          ) : (
            <span className="text-xs text-gray-400 italic">Nenhum preço definido</span>
          )}
        </div>
      )
    },
    {
      header: 'Ações',
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
            <Pencil className="w-4 h-4 text-blue-600" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trechos Frequentes</h1>
            <p className="text-gray-600">Gerencie rotas e preços pré-definidos para agilizar cotações</p>
          </div>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />
            Novo Trecho
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar por nome, origem ou destino..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <GenericTable 
              columns={columns} 
              data={filteredRoutes} 
              emptyMessage="Nenhum trecho frequente cadastrado."
            />
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRoute ? 'Editar Trecho' : 'Novo Trecho Frequente'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <Label>Nome do Trecho *</Label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Aeroporto GRU - Hotel Unique"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label>Tipo de Serviço *</Label>
                  <Select 
                    value={formData.service_type} 
                    onValueChange={(val) => setFormData({...formData, service_type: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Transfer (Ponto a Ponto)</SelectItem>
                      <SelectItem value="hourly_5">5 Horas (Meia Diária)</SelectItem>
                      <SelectItem value="hourly_10">10 Horas (Diária)</SelectItem>
                      <SelectItem value="hourly_custom">Por Hora (Outro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Origem *</Label>
                  <Input 
                    value={formData.origin}
                    onChange={(e) => setFormData({...formData, origin: e.target.value})}
                    placeholder="Endereço de origem"
                  />
                </div>
                <div>
                  <Label>Destino *</Label>
                  <Input 
                    value={formData.destination}
                    onChange={(e) => setFormData({...formData, destination: e.target.value})}
                    placeholder="Endereço de destino"
                  />
                </div>
              </div>

              <div>
                <Label>Observações Padrão</Label>
                <Textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Instruções padrão para este trecho..."
                  rows={2}
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Tabela de Preços Sugeridos
                </h3>
                
                {vehicleTypes.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Nenhum tipo de veículo ativo cadastrado.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicleTypes.map(vehicle => (
                      <div key={vehicle.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                        <span className="text-sm font-medium">{vehicle.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">R$</span>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00"
                            className="w-24 h-8 text-right"
                            value={formData.vehicle_options[vehicle.name] || ''}
                            onChange={(e) => handlePriceChange(vehicle.name, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  * Deixe em branco os veículos que não se aplicam a este trecho.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button 
                onClick={handleSave} 
                className="bg-green-600 hover:bg-green-700"
                disabled={createMutation.isLoading || updateMutation.isLoading}
              >
                {(createMutation.isLoading || updateMutation.isLoading) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Salvar Trecho
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}