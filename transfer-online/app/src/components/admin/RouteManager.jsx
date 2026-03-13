
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Car, Copy, Filter, ArrowLeftRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../LanguageContext';

const VEHICLE_TYPES = {
  sedan_executivo: 'Sedan Executivo',
  suv: 'SUV',
  van: 'Van',
  van_executiva: 'Van Executiva',
  micro_onibus: 'Micro-ônibus'
};

export default function RouteManager({ routes }) {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [transferTypeFilter, setTransferTypeFilter] = useState('all');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    transfer_type: 'arrival',
    origin: '',
    destination: '',
    vehicle_type: 'sedan_executivo',
    description: '',
    covered_areas: '', // Added new field
    base_price: 0,
    additional_expenses: 0,
    max_passengers: 4,
    duration_minutes: 60,
    min_booking_lead_time_hours: 24,
    active: true,
    create_return_route: false
  });

  const createRouteMutation = useMutation({
    mutationFn: (data) => base44.entities.Route.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      resetForm();
    }
  });

  const updateRouteMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Route.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      resetForm();
    }
  });

  const deleteRouteMutation = useMutation({
    mutationFn: (id) => base44.entities.Route.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    }
  });

  const resetForm = () => {
    setFormData({
      transfer_type: 'arrival',
      origin: '',
      destination: '',
      vehicle_type: 'sedan_executivo',
      description: '',
      covered_areas: '', // Reset new field
      base_price: 0,
      additional_expenses: 0,
      max_passengers: 4,
      duration_minutes: 60,
      min_booking_lead_time_hours: 24,
      active: true,
      create_return_route: false
    });
    setIsAdding(false);
    setEditingRoute(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingRoute) {
      // Ao editar, não criamos rota de retorno
      const { create_return_route, ...routeData } = formData;
      updateRouteMutation.mutate({ id: editingRoute.id, data: routeData });
    } else {
      // Ao criar nova rota
      const { create_return_route, ...routeData } = formData;
      
      try {
        // Criar a rota principal
        const mainRoute = await base44.entities.Route.create(routeData);
        
        // Se a opção de criar rota de retorno estiver marcada
        if (create_return_route) {
          // Criar rota de retorno invertida
          const returnRouteData = {
            transfer_type: routeData.transfer_type === 'arrival' ? 'departure' : 'arrival',
            origin: routeData.destination, // Inverte: origem vira destino
            destination: routeData.origin, // Inverte: destino vira origem
            vehicle_type: routeData.vehicle_type,
            description: routeData.description ? `${routeData.description} (Retorno)` : 'Rota de retorno',
            covered_areas: routeData.covered_areas, // Propagate covered_areas to return route
            base_price: routeData.base_price,
            additional_expenses: routeData.additional_expenses,
            max_passengers: routeData.max_passengers,
            duration_minutes: routeData.duration_minutes,
            min_booking_lead_time_hours: routeData.min_booking_lead_time_hours,
            active: routeData.active
          };
          
          // Criar a rota de retorno
          await base44.entities.Route.create(returnRouteData);
        }
        
        // Atualizar a lista de rotas e resetar o formulário
        queryClient.invalidateQueries({ queryKey: ['routes'] });
        resetForm();
      } catch (error) {
        console.error('Erro ao criar rota(s):', error);
      }
    }
  };

  const handleEdit = (route) => {
    setEditingRoute(route);
    setFormData({
      ...route,
      create_return_route: false // Não mostrar opção de criar retorno ao editar
    });
    setIsAdding(true);
  };

  const handleClone = (route) => {
    const clonedData = {
      ...route,
      origin: route.origin + ' (CÓPIA)',
      active: false,
      create_return_route: false
    };
    
    delete clonedData.id;
    delete clonedData.created_date;
    delete clonedData.updated_date;
    delete clonedData.created_by;
    
    setFormData(clonedData);
    setEditingRoute(null);
    setIsAdding(true);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Filtrar rotas por tipo de transfer
  const filteredRoutes = routes.filter(route => {
    if (transferTypeFilter === 'all') return true;
    return route.transfer_type === transferTypeFilter;
  });

  return (
    <div className="space-y-6">
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRoute ? t('routes.editRoute') : t('routes.newRoute')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transfer_type">{t('routes.transferType')} *</Label>
                <Select
                  value={formData.transfer_type}
                  onValueChange={(value) => setFormData({ ...formData, transfer_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('routes.transferType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arrival">{t('routes.arrival')}</SelectItem>
                    <SelectItem value="departure">{t('routes.departure')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {formData.transfer_type === 'arrival'
                    ? 'A origem deve ser um aeroporto e o destino um bairro/zona'
                    : 'A origem deve ser um bairro/zona e o destino um aeroporto'}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin">
                    {formData.transfer_type === 'arrival' ? 'Aeroporto de Origem *' : 'Bairro/Zona de Origem *'}
                  </Label>
                  <Input
                    id="origin"
                    required
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder={formData.transfer_type === 'arrival' ? 'Ex: Aeroporto GRU' : 'Ex: Centro de São Paulo'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">
                    {formData.transfer_type === 'arrival' ? 'Bairro/Zona de Destino *' : 'Aeroporto de Destino *'}
                  </Label>
                  <Input
                    id="destination"
                    required
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder={formData.transfer_type === 'arrival' ? 'Ex: Centro de São Paulo' : 'Ex: Aeroporto GRU'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_type">{t('routes.vehicleType')} *</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('routes.vehicleType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VEHICLE_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('routes.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Transfer confortável com motorista profissional, veículo com ar-condicionado e WiFi..."
                  className="h-24"
                />
              </div>

              {/* New field for covered_areas */}
              <div className="space-y-2">
                <Label htmlFor="covered_areas">Bairros e Áreas Atendidas</Label>
                <Textarea
                  id="covered_areas"
                  value={formData.covered_areas}
                  onChange={(e) => setFormData({ ...formData, covered_areas: e.target.value })}
                  placeholder="Ex: Bela Vista, Jardins, Cerqueira César, Consolação, Higienópolis..."
                  className="h-20"
                />
                <p className="text-xs text-gray-500">
                  Liste os principais bairros ou áreas atendidas por esta rota, separados por vírgula. Esta informação será exibida para o cliente de forma discreta.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_price">{t('routes.basePrice')} *</Label>
                  <Input
                    id="base_price"
                    type="number"
                    step="0.01"
                    required
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="additional_expenses">{t('routes.additionalExpenses')}</Label>
                  <Input
                    id="additional_expenses"
                    type="number"
                    step="0.01"
                    value={formData.additional_expenses}
                    onChange={(e) => setFormData({ ...formData, additional_expenses: parseFloat(e.target.value) })}
                    placeholder="Pedágios, estacionamento, etc"
                  />
                  <p className="text-xs text-gray-500">
                    {t('routes.additionalExpensesHelper')}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_passengers">{t('routes.maxPassengers')}</Label>
                  <Input
                    id="max_passengers"
                    type="number"
                    value={formData.max_passengers}
                    onChange={(e) => setFormData({ ...formData, max_passengers: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">{t('routes.duration')}</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_booking_lead_time_hours">{t('routes.minLeadTime')}</Label>
                  <Select
                    value={formData.min_booking_lead_time_hours?.toString()}
                    onValueChange={(value) => setFormData({ ...formData, min_booking_lead_time_hours: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="48">48 horas</SelectItem>
                      <SelectItem value="72">72 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">{t('routes.activeRoute')}</Label>
              </div>

              {/* Opção de criar rota de retorno - APENAS na criação de novas rotas */}
              {!editingRoute && (
                <div className="border-t pt-4 mt-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
                    <div className="flex items-start gap-3">
                      <Switch
                        id="create_return_route"
                        checked={formData.create_return_route}
                        onCheckedChange={(checked) => setFormData({ ...formData, create_return_route: checked })}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="create_return_route" className="flex items-center gap-2 text-base font-semibold text-gray-900 cursor-pointer">
                          <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                          Criar rota de retorno automaticamente
                        </Label>
                        <p className="text-sm text-gray-600 mt-2">
                          Se marcado, o sistema criará automaticamente uma rota de retorno espelhada com:
                        </p>
                        <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
                          <li>• Tipo de transfer invertido ({formData.transfer_type === 'arrival' ? 'Saída' : 'Chegada'})</li>
                          <li>• Origem e destino invertidos</li>
                          <li>• Mesmo tipo de veículo e preços</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingRoute ? t('common.update') : t('common.create')}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex-1">
            <CardTitle>{t('routes.registeredRoutes')}</CardTitle>
          </div>
          
          {/* Filtro de Tipo de Transfer */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={transferTypeFilter} onValueChange={setTransferTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('routes.allTransferTypes')}</SelectItem>
                  <SelectItem value="arrival">{t('routes.arrivalOnly')}</SelectItem>
                  <SelectItem value="departure">{t('routes.departureOnly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                {t('routes.newRoute')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredRoutes.map((route) => (
              <div
                key={route.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Car className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-600">
                      {VEHICLE_TYPES[route.vehicle_type] || route.vehicle_type}
                    </span>
                    <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      {route.transfer_type === 'arrival' ? t('routes.arrival') : t('routes.departure')}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900 mb-1">
                    {route.origin} → {route.destination}
                  </div>
                  {route.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {route.description}
                    </p>
                  )}
                  {/* Display covered_areas */}
                  {route.covered_areas && (
                    <div className="text-xs text-gray-500 mb-2 bg-blue-50 p-2 rounded">
                      <span className="font-medium">Áreas atendidas:</span> {route.covered_areas}
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    Preço base: {formatPrice(route.base_price)}
                    {route.additional_expenses > 0 && (
                      <> + {formatPrice(route.additional_expenses)} (despesas)</>
                    )} |
                    Max: {route.max_passengers} pass. |
                    {route.duration_minutes} min |
                    Antecedência: {route.min_booking_lead_time_hours || 24}h
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${route.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {route.active ? t('common.active') : t('common.inactive')}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClone(route)}
                    title={t('common.clone')}
                  >
                    <Copy className="w-4 h-4 text-blue-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(route)}
                    title={t('common.edit')}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(t('routes.confirmDelete'))) {
                        deleteRouteMutation.mutate(route.id);
                      }
                    }}
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredRoutes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {transferTypeFilter === 'all' 
                  ? t('routes.noRoutesYet')
                  : `Nenhuma rota de ${transferTypeFilter === 'arrival' ? 'chegada' : 'saída'} encontrada`
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
