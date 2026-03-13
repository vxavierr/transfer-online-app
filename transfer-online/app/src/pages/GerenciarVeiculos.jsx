import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Save, X, Car, DollarSign, Users, Briefcase, Settings, Globe, Clock, Image as ImageIcon, Link as LinkIcon, Upload, Loader2 } from 'lucide-react';

export default function GerenciarVeiculos() {
  const [isAdding, setIsAdding] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [features, setFeatures] = useState('');
  const [imageOption, setImageOption] = useState('url');
  const [uploadingImage, setUploadingImage] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    description_en: '',
    description_es: '',
    base_price_per_km: 0,
    min_km_franchise: 0,
    min_price_for_franchise: 0,
    base_price_per_hour: 0,
    min_price_one_way: 0,
    min_price_round_trip: 0,
    min_price_hourly: 0,
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
    active: true
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: vehicleTypes = [], isLoading } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: () => base44.entities.VehicleType.list(),
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data) => base44.entities.VehicleType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleTypes'] });
      resetForm();
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VehicleType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleTypes'] });
      resetForm();
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id) => base44.entities.VehicleType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleTypes'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      description_en: '',
      description_es: '',
      base_price_per_km: 0,
      min_km_franchise: 0,
      min_price_for_franchise: 0,
      base_price_per_hour: 0,
      min_price_one_way: 0,
      min_price_round_trip: 0,
      min_price_hourly: 0,
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
      operational_radius_km: 0, // New field
      min_booking_lead_time_hours: 24,
      max_passengers: 4,
      max_luggage: 2,
      features: [],
      image_url: '',
      display_order: 0,
      active: true
    });
    setFeatures('');
    setIsAdding(false);
    setEditingVehicle(null);
    setImageOption('url');
  };

  const handleSubmit = async () => {
    const featuresArray = features ? features.split(',').map(f => f.trim()).filter(f => f) : [];
    const dataToSubmit = {
      ...formData,
      features: featuresArray
    };

    if (editingVehicle) {
      updateVehicleMutation.mutate({ id: editingVehicle.id, data: dataToSubmit });
    } else {
      createVehicleMutation.mutate(dataToSubmit);
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      description: vehicle.description || '',
      description_en: vehicle.description_en || '',
      description_es: vehicle.description_es || '',
      base_price_per_km: vehicle.base_price_per_km,
      min_km_franchise: vehicle.min_km_franchise || 0,
      min_price_for_franchise: vehicle.min_price_for_franchise || 0,
      base_price_per_hour: vehicle.base_price_per_hour,
      min_price_one_way: vehicle.min_price_one_way,
      min_price_round_trip: vehicle.min_price_round_trip,
      min_price_hourly: vehicle.min_price_hourly,
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
      operational_radius_km: vehicle.operational_radius_km || 0, // New field
      min_booking_lead_time_hours: vehicle.min_booking_lead_time_hours || 24,
      max_passengers: vehicle.max_passengers,
      max_luggage: vehicle.max_luggage,
      features: vehicle.features || [],
      image_url: vehicle.image_url || '',
      display_order: vehicle.display_order || 0,
      active: vehicle.active
    });
    setFeatures(vehicle.features?.join(', ') || '');
    setImageOption(vehicle.image_url ? 'url' : 'url');
    setIsAdding(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB.');
      return;
    }

    setUploadingImage(true);

    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: response.file_url });
      setUploadingImage(false);
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
      alert('Erro ao fazer upload da imagem. Tente novamente.');
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: '' });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Acesso restrito a administradores.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />

      <div className="max-w-7xl mx-auto p-6 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gerenciar Tipos de Veículos</h1>
          <p className="text-gray-600">Configure os tipos de veículos e suas tarifas</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : (
          <Tabs defaultValue="vehicles" className="space-y-6">
            <TabsList className="bg-white shadow-sm">
              <TabsTrigger value="vehicles" className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                Tipos de Veículos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vehicles" className="space-y-6">
              {isAdding && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {editingVehicle ? 'Editar Tipo de Veículo' : 'Novo Tipo de Veículo'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome do Veículo *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Sedan Executivo"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="display_order">Ordem de Exibição</Label>
                        <Input
                          id="display_order"
                          type="number"
                          value={formData.display_order}
                          onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">🇧🇷 Descrição (Português)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descrição detalhada do veículo em português"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="description_en">🇺🇸 Descrição (English)</Label>
                        <Textarea
                          id="description_en"
                          value={formData.description_en}
                          onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                          placeholder="Detailed vehicle description in English"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description_es">🇪🇸 Descripción (Español)</Label>
                        <Textarea
                          id="description_es"
                          value={formData.description_es}
                          onChange={(e) => setFormData({ ...formData, description_es: e.target.value })}
                          placeholder="Descripción detallada del vehículo en español"
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        Imagem do Veículo
                      </h4>

                      <Tabs value={imageOption} onValueChange={setImageOption} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                          <TabsTrigger value="url" className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" />
                            URL da Imagem
                          </TabsTrigger>
                          <TabsTrigger value="upload" className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Fazer Upload
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="url" className="space-y-2">
                          <Label htmlFor="image_url">URL da Imagem</Label>
                          <Input
                            id="image_url"
                            value={formData.image_url}
                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                            placeholder="https://exemplo.com/imagem.jpg"
                          />
                          <p className="text-xs text-gray-600">
                            Cole o link direto da imagem (ex: de um servidor, Unsplash, etc)
                          </p>
                        </TabsContent>

                        <TabsContent value="upload" className="space-y-3">
                          <Label htmlFor="image_upload">Selecionar Imagem</Label>
                          <Input
                            id="image_upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                          <p className="text-xs text-gray-600">
                            Tamanho máximo: 5MB. Formatos aceitos: JPG, PNG, WEBP
                          </p>
                          {uploadingImage && (
                            <div className="flex items-center gap-2 text-blue-600">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Fazendo upload...</span>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>

                      {formData.image_url && (
                        <div className="mt-4 p-3 bg-white rounded-lg border-2 border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Pré-visualização:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveImage}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Remover
                            </Button>
                          </div>
                          <img
                            src={formData.image_url}
                            alt="Preview"
                            className="w-full h-48 object-contain bg-gray-50 rounded"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const errorMsg = document.createElement('div');
                              errorMsg.className = 'text-red-600 text-sm p-4 text-center';
                              errorMsg.textContent = 'Erro ao carregar a imagem. Verifique a URL.';
                              e.target.parentElement.appendChild(errorMsg);
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="max_passengers" className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Passageiros *
                        </Label>
                        <Input
                          id="max_passengers"
                          type="number"
                          value={formData.max_passengers}
                          onChange={(e) => setFormData({ ...formData, max_passengers: parseInt(e.target.value) || 0 })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max_luggage" className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          Malas *
                        </Label>
                        <Input
                          id="max_luggage"
                          type="number"
                          value={formData.max_luggage}
                          onChange={(e) => setFormData({ ...formData, max_luggage: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="min_booking_lead_time_hours" className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          Antecedência Mínima (horas) *
                        </Label>
                        <Input
                          id="min_booking_lead_time_hours"
                          type="number"
                          min="0"
                          value={formData.min_booking_lead_time_hours}
                          onChange={(e) => setFormData({ ...formData, min_booking_lead_time_hours: parseInt(e.target.value) || 0 })}
                          placeholder="Ex: 24, 48, 72"
                        />
                        <p className="text-sm text-gray-600">
                          Tempo mínimo necessário entre a reserva e o serviço
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="operational_radius_km" className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-orange-600" />
                          Raio de Atuação (KM)
                        </Label>
                        <Input
                          id="operational_radius_km"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.operational_radius_km}
                          onChange={(e) => setFormData({ ...formData, operational_radius_km: parseFloat(e.target.value) || 0 })}
                          placeholder="Ex: 350"
                        />
                        <p className="text-sm text-gray-600">
                          Limite máximo de distância total (ciclo completo) que este veículo pode percorrer. Use 0 para sem limite.
                        </p>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                      <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Preços Base - Sistema de KM Rodado
                      </h4>
                      
                      <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4 text-sm text-blue-900">
                        <strong>💡 Como funciona:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Configure o <strong>preço por KM</strong> para cálculo geral</li>
                          <li>Configure a <strong>franquia mínima</strong> (ex: até 50km) e seu <strong>preço fixo</strong></li>
                          <li>Se a rota estiver dentro da franquia, será cobrado o <strong>maior valor</strong> entre: (KM × Preço/KM) e (Preço da Franquia)</li>
                          <li>Acima da franquia, o valor é sempre o <strong>maior</strong> entre o calculado e o mínimo da franquia</li>
                        </ul>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="base_price_per_km">Preço por KM (R$) *</Label>
                          <Input
                            id="base_price_per_km"
                            type="number"
                            step="0.01"
                            value={formData.base_price_per_km}
                            onChange={(e) => setFormData({ ...formData, base_price_per_km: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-gray-600">Valor cobrado por cada KM rodado no ciclo completo</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="min_km_franchise">Franquia Mínima (KM)</Label>
                          <Input
                            id="min_km_franchise"
                            type="number"
                            step="0.01"
                            value={formData.min_km_franchise}
                            onChange={(e) => setFormData({ ...formData, min_km_franchise: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-gray-600">Ex: 50 (rotas de até 50km terão preço especial)</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="min_price_for_franchise">Preço da Franquia (R$)</Label>
                          <Input
                            id="min_price_for_franchise"
                            type="number"
                            step="0.01"
                            value={formData.min_price_for_franchise}
                            onChange={(e) => setFormData({ ...formData, min_price_for_franchise: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-gray-600">Preço mínimo para rotas dentro da franquia</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="min_price_one_way">Preço Mínimo Absoluto - Só Ida (R$)</Label>
                          <Input
                            id="min_price_one_way"
                            type="number"
                            step="0.01"
                            value={formData.min_price_one_way}
                            onChange={(e) => setFormData({ ...formData, min_price_one_way: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-gray-600">Preço mínimo geral (aplicado após franquia)</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="min_price_round_trip">Preço Mínimo Absoluto - Ida e Volta (R$)</Label>
                          <Input
                            id="min_price_round_trip"
                            type="number"
                            step="0.01"
                            value={formData.min_price_round_trip}
                            onChange={(e) => setFormData({ ...formData, min_price_round_trip: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-gray-600">Preço mínimo geral para ida e volta</p>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                        <p className="text-sm text-yellow-900">
                          <strong>Exemplo:</strong> Se configurar Preço/KM = R$ 2,00, Franquia = 50km e Preço da Franquia = R$ 150,00:
                          <br />• Rota de 30km: 30 × 2 = R$ 60. Como está dentro da franquia, cobra R$ 150 (maior valor)
                          <br />• Rota de 60km: 60 × 2 = R$ 120. Acima da franquia, mas menor que R$ 150, cobra R$ 150
                          <br />• Rota de 100km: 100 × 2 = R$ 200. Acima da franquia e maior que R$ 150, cobra R$ 200
                        </p>
                      </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Pacotes de Horas
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Pacote de 5 Horas</h5>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="hourly_5_hours_price">Preço Fixo (R$)</Label>
                              <Input
                                id="hourly_5_hours_price"
                                type="number"
                                step="0.01"
                                value={formData.hourly_5_hours_price}
                                onChange={(e) => setFormData({ ...formData, hourly_5_hours_price: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="hourly_5_hours_km_allowance">Franquia KM</Label>
                              <Input
                                id="hourly_5_hours_km_allowance"
                                type="number"
                                value={formData.hourly_5_hours_km_allowance}
                                onChange={(e) => setFormData({ ...formData, hourly_5_hours_km_allowance: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Pacote de 10 Horas</h5>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="hourly_10_hours_price">Preço Fixo (R$)</Label>
                              <Input
                                id="hourly_10_hours_price"
                                type="number"
                                step="0.01"
                                value={formData.hourly_10_hours_price}
                                onChange={(e) => setFormData({ ...formData, hourly_10_hours_price: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="hourly_10_hours_km_allowance">Franquia KM</Label>
                              <Input
                                id="hourly_10_hours_km_allowance"
                                type="number"
                                value={formData.hourly_10_hours_km_allowance}
                                onChange={(e) => setFormData({ ...formData, hourly_10_hours_km_allowance: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 pt-3 border-t border-amber-300">
                          <div className="space-y-2">
                            <Label htmlFor="additional_price_per_km">Preço Adicional por KM Excedente (R$)</Label>
                            <Input
                              id="additional_price_per_km"
                              type="number"
                              step="0.01"
                              value={formData.additional_price_per_km}
                              onChange={(e) => setFormData({ ...formData, additional_price_per_km: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="additional_price_per_hour">Preço Adicional por Hora Excedente (R$)</Label>
                            <Input
                              id="additional_price_per_hour"
                              type="number"
                              step="0.01"
                              value={formData.additional_price_per_hour}
                              onChange={(e) => setFormData({ ...formData, additional_price_per_hour: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                      <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Sobretaxas por Idioma do Motorista
                      </h4>
                      
                      <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4 text-sm text-blue-900">
                        <strong>💡 Dica:</strong> Defina o valor como <strong>0 (zero)</strong> se o idioma não for oferecido para este tipo de veículo. 
                        Apenas idiomas com sobretaxa maior que zero estarão disponíveis para os clientes.
                      </div>
                      
                      <div className="mb-4 p-3 bg-white rounded-lg border-2 border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900 flex items-center gap-2">
                            🇺🇸 Inglês (English)
                          </h5>
                          {formData.language_surcharge_en > 0 ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                              ✓ Disponível
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-semibold">
                              ✗ Não oferecido
                            </span>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="language_surcharge_en_type">Tipo de Cobrança</Label>
                            <Select
                              value={formData.language_surcharge_en_type}
                              onValueChange={(value) => setFormData({ ...formData, language_surcharge_en_type: value })}
                            >
                              <SelectTrigger id="language_surcharge_en_type">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                                <SelectItem value="percentage">Percentual (%)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="language_surcharge_en">
                              Valor {formData.language_surcharge_en_type === 'percentage' ? '(%)' : '(R$)'}
                            </Label>
                            <Input
                              id="language_surcharge_en"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.language_surcharge_en}
                              onChange={(e) => setFormData({ ...formData, language_surcharge_en: parseFloat(e.target.value) || 0 })}
                              placeholder="0.00"
                            />
                            <p className="text-xs text-gray-500">
                              {formData.language_surcharge_en_type === 'percentage' 
                                ? 'Ex: 10 para adicionar 10% ao valor total. Use 0 se não oferecido.' 
                                : 'Ex: 50.00 para adicionar R$ 50,00 ao valor total. Use 0 se não oferecido.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-lg border-2 border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900 flex items-center gap-2">
                            🇪🇸 Espanhol (Español)
                          </h5>
                          {formData.language_surcharge_es > 0 ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                              ✓ Disponível
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-semibold">
                              ✗ Não oferecido
                            </span>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="language_surcharge_es_type">Tipo de Cobrança</Label>
                            <Select
                              value={formData.language_surcharge_es_type}
                              onValueChange={(value) => setFormData({ ...formData, language_surcharge_es_type: value })}
                            >
                              <SelectTrigger id="language_surcharge_es_type">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                                <SelectItem value="percentage">Percentual (%)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="language_surcharge_es">
                              Valor {formData.language_surcharge_es_type === 'percentage' ? '(%)' : '(R$)'}
                            </Label>
                            <Input
                              id="language_surcharge_es"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.language_surcharge_es}
                              onChange={(e) => setFormData({ ...formData, language_surcharge_es: parseFloat(e.target.value) || 0 })}
                              placeholder="0.00"
                            />
                            <p className="text-xs text-gray-500">
                              {formData.language_surcharge_es_type === 'percentage' 
                                ? 'Ex: 10 para adicionar 10% ao valor total. Use 0 se não oferecido.' 
                                : 'Ex: 50.00 para adicionar R$ 50,00 ao valor total. Use 0 se não oferecido.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="features">Características (separadas por vírgula)</Label>
                      <Input
                        id="features"
                        value={features}
                        onChange={(e) => setFeatures(e.target.value)}
                        placeholder="Ex: Wi-Fi, Ar-condicionado, Água"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <Label htmlFor="active" className="cursor-pointer">Veículo Ativo</Label>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button onClick={handleSubmit} className="flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        {editingVehicle ? 'Atualizar' : 'Criar'}
                      </Button>
                      <Button variant="outline" onClick={resetForm}>
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Tipos de Veículos Cadastrados</h2>
                {!isAdding && (
                  <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar Novo
                  </Button>
                )}
              </div>

              <div className="grid gap-4">
                {vehicleTypes.map((vehicle) => (
                  <Card key={vehicle.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4 flex-1">
                          {vehicle.image_url && (
                            <img
                              src={vehicle.image_url}
                              alt={vehicle.name}
                              className="w-32 h-32 object-contain bg-gray-50 rounded"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-xl font-bold">{vehicle.name}</h3>
                                {vehicle.description && (
                                  <p className="text-sm text-gray-600 mt-1">{vehicle.description}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(vehicle)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Tem certeza que deseja excluir este veículo?')) {
                                      deleteVehicleMutation.mutate(vehicle.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-4">
                              <div>
                                <span className="text-gray-600">Passageiros:</span>
                                <span className="font-semibold ml-2">{vehicle.max_passengers}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Malas:</span>
                                <span className="font-semibold ml-2">{vehicle.max_luggage}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Preço/KM:</span>
                                <span className="font-semibold ml-2">{formatPrice(vehicle.base_price_per_km)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Antecedência:</span>
                                <span className="font-semibold ml-2">{vehicle.min_booking_lead_time_hours || 24}h</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Mín. Só Ida:</span>
                                <span className="font-semibold ml-2">{formatPrice(vehicle.min_price_one_way)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Mín. Ida/Volta:</span>
                                <span className="font-semibold ml-2">{formatPrice(vehicle.min_price_round_trip)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Raio Atuação:</span>
                                <span className="font-semibold ml-2">
                                  {vehicle.operational_radius_km > 0 ? `${vehicle.operational_radius_km} KM` : 'Sem limite'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Status:</span>
                                <span className={`ml-2 font-semibold ${vehicle.active ? 'text-green-600' : 'text-red-600'}`}>
                                  {vehicle.active ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                              {vehicle.min_km_franchise > 0 && (
                                <div>
                                  <span className="text-gray-600">Franquia Mín. KM:</span>
                                  <span className="font-semibold ml-2">{vehicle.min_km_franchise} KM</span>
                                </div>
                              )}
                              {vehicle.min_price_for_franchise > 0 && (
                                <div>
                                  <span className="text-gray-600">Preço Franquia:</span>
                                  <span className="font-semibold ml-2">{formatPrice(vehicle.min_price_for_franchise)}</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 flex gap-2 text-xs">
                              {vehicle.language_surcharge_en > 0 && (
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  🇺🇸 Inglês: +{vehicle.language_surcharge_en_type === 'percentage' ? `${vehicle.language_surcharge_en}%` : formatPrice(vehicle.language_surcharge_en)}
                                </span>
                              )}
                              {vehicle.language_surcharge_es > 0 && (
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  🇪🇸 Espanhol: +{vehicle.language_surcharge_es_type === 'percentage' ? `${vehicle.language_surcharge_es}%` : formatPrice(vehicle.language_surcharge_es)}
                                </span>
                              )}
                            </div>

                            {vehicle.features && vehicle.features.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {vehicle.features.map((feature, idx) => (
                                  <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}