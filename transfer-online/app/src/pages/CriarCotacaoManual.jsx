import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Loader2, FileText, MapPin, Calendar, Clock, Users, Car, DollarSign, Download, ChevronLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import moment from 'moment';

export default function CriarCotacaoManual() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quoteData, setQuoteData] = useState({
    quote_format: 'standard',
    customer_name: '',
    requester_name: '',
    customer_email: '',
    customer_phone: '',
    notes: '',
    admin_notes: '',
    driver_language: 'pt',
  });
  const [legs, setLegs] = useState([
    {
      origin: '',
      destination: '',
      date: '',
      time: '',
      service_type: 'one_way',
      hours: 1, // Default for hourly
      passengers: 1,
      notes: '',
      vehicle_options: [], // Array to hold multiple vehicle types and prices
    }
  ]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Vehicle Types
  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: () => base44.entities.VehicleType.list(),
  });

  const handleQuoteDataChange = (field, value) => {
    setQuoteData(prev => ({ ...prev, [field]: value }));
  };

  const handleLegChange = (legIndex, field, value) => {
    const newLegs = [...legs];
    newLegs[legIndex][field] = value;
    setLegs(newLegs);
  };

  const addLeg = () => {
    setLegs([...legs, {
      origin: '',
      destination: '',
      date: '',
      time: '',
      service_type: 'one_way',
      hours: 1,
      passengers: 1,
      notes: '',
      vehicle_options: [],
    }]);
  };

  const removeLeg = (legIndex) => {
    const newLegs = legs.filter((_, i) => i !== legIndex);
    setLegs(newLegs);
  };

  const addVehicleOption = (legIndex) => {
    const newLegs = [...legs];
    newLegs[legIndex].vehicle_options.push({
      vehicle_type_id: '',
      vehicle_type_name: '',
      price: 0,
    });
    setLegs(newLegs);
  };

  const updateVehicleOption = (legIndex, optionIndex, field, value) => {
    const newLegs = [...legs];
    const option = newLegs[legIndex].vehicle_options[optionIndex];
    option[field] = value;

    if (field === 'vehicle_type_id' && value) {
      const selectedVehicle = vehicleTypes.find(v => v.id === value);
      option.vehicle_type_name = selectedVehicle ? selectedVehicle.name : '';
    }
    setLegs(newLegs);
  };

  const removeVehicleOption = (legIndex, optionIndex) => {
    const newLegs = [...legs];
    newLegs[legIndex].vehicle_options = newLegs[legIndex].vehicle_options.filter((_, i) => i !== optionIndex);
    setLegs(newLegs);
  };

  const createQuoteMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('submitQuoteRequest', data);
      if (!response.data.success) {
        throw new Error(response.data.error || 'Erro ao criar cotação');
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['quoteRequests']);
      toast.success('Cotação criada com sucesso!');
      navigate(createPageUrl('GerenciarCotacoes')); // Redirect to quotes list
    },
    onError: (err) => {
      setError(err.message || 'Erro desconhecido ao criar cotação.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Basic validation
    if (!quoteData.customer_name || !quoteData.customer_email || !quoteData.customer_phone) {
      setError('Por favor, preencha nome, email e telefone do cliente.');
      setIsSubmitting(false);
      return;
    }
    if (legs.length === 0) {
      setError('Adicione pelo menos um trecho à cotação.');
      setIsSubmitting(false);
      return;
    }
    for (const leg of legs) {
      if (!leg.origin || !leg.destination || !leg.date || !leg.time) {
        setError('Preencha todos os campos obrigatórios (Origem, Destino, Data, Hora) para todos os trechos.');
        setIsSubmitting(false);
        return;
      }
      if (leg.vehicle_options.length === 0) {
        setError('Adicione pelo menos uma opção de veículo para cada trecho.');
        setIsSubmitting(false);
        return;
      }
      for (const option of leg.vehicle_options) {
        if (!option.vehicle_type_id || option.price <= 0) {
          setError('Preencha o tipo de veículo e o preço para todas as opções de veículo.');
          setIsSubmitting(false);
          return;
        }
      }
    }

    createQuoteMutation.mutate({
      ...quoteData,
      quoted_trips: legs, // Send legs as quoted_trips
    });
  };

  const handleDownloadPDF = async () => {
    toast.info('Funcionalidade de download de PDF em desenvolvimento.');
  };

  return (
    <div className="container mx-auto p-4 md:p-6 bg-white rounded-lg shadow-md max-w-4xl my-8">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">Criar Cotação Manual</h1>
        <div></div> {/* Spacer */}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <div className="border p-4 rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Dados do Cliente
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Nome do Cliente *</Label>
              <Input
                id="customer_name"
                value={quoteData.customer_name}
                onChange={(e) => handleQuoteDataChange('customer_name', e.target.value)}
                placeholder="Nome da empresa ou cliente"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requester_name">Nome do Solicitante</Label>
              <Input
                id="requester_name"
                value={quoteData.requester_name}
                onChange={(e) => handleQuoteDataChange('requester_name', e.target.value)}
                placeholder="Quem solicitou a cotação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_email">Email do Cliente *</Label>
              <Input
                id="customer_email"
                type="email"
                value={quoteData.customer_email}
                onChange={(e) => handleQuoteDataChange('customer_email', e.target.value)}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Telefone do Cliente *</Label>
              <Input
                id="customer_phone"
                value={quoteData.customer_phone}
                onChange={(e) => handleQuoteDataChange('customer_phone', e.target.value)}
                placeholder="(XX) XXXXX-XXXX"
                required
              />
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="driver_language">Idioma do Motorista</Label>
            <Select
              value={quoteData.driver_language}
              onValueChange={(value) => handleQuoteDataChange('driver_language', value)}
            >
              <SelectTrigger id="driver_language">
                <SelectValue placeholder="Selecione o idioma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="en">Inglês</SelectItem>
                <SelectItem value="es">Espanhol</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Trechos e Valores */}
        <div className="border p-4 rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600" />
            Trechos e Valores
          </h2>

          {legs.map((leg, legIndex) => (
            <div key={legIndex} className="border p-4 rounded-lg bg-white mb-4 shadow-sm relative">
              <h3 className="font-semibold mb-4">Trecho #{legIndex + 1}</h3>
              
              {legs.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => removeLeg(legIndex)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor={`origin-${legIndex}`}>Origem *</Label>
                  <Input
                    id={`origin-${legIndex}`}
                    value={leg.origin}
                    onChange={(e) => handleLegChange(legIndex, 'origin', e.target.value)}
                    placeholder="Endereço de origem"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`destination-${legIndex}`}>Destino *</Label>
                  <Input
                    id={`destination-${legIndex}`}
                    value={leg.destination}
                    onChange={(e) => handleLegChange(legIndex, 'destination', e.target.value)}
                    placeholder="Endereço de destino"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor={`date-${legIndex}`}>Data *</Label>
                  <Input
                    id={`date-${legIndex}`}
                    type="date"
                    value={leg.date}
                    onChange={(e) => handleLegChange(legIndex, 'date', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`time-${legIndex}`}>Horário *</Label>
                  <Input
                    id={`time-${legIndex}`}
                    type="time"
                    value={leg.time}
                    onChange={(e) => handleLegChange(legIndex, 'time', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`service_type-${legIndex}`}>Tipo de Serviço *</Label>
                  <Select
                    value={leg.service_type}
                    onValueChange={(value) => handleLegChange(legIndex, 'service_type', value)}
                  >
                    <SelectTrigger id={`service_type-${legIndex}`}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_way">Só Ida</SelectItem>
                      <SelectItem value="round_trip">Ida e Volta</SelectItem>
                      <SelectItem value="hourly">Por Hora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`passengers-${legIndex}`}>Passageiros *</Label>
                  <Input
                    id={`passengers-${legIndex}`}
                    type="number"
                    min="1"
                    value={leg.passengers}
                    onChange={(e) => handleLegChange(legIndex, 'passengers', parseInt(e.target.value))}
                    required
                  />
                </div>
                {leg.service_type === 'hourly' && (
                  <div className="space-y-2">
                    <Label htmlFor={`hours-${legIndex}`}>Horas *</Label>
                    <Input
                      id={`hours-${legIndex}`}
                      type="number"
                      min="1"
                      value={leg.hours}
                      onChange={(e) => handleLegChange(legIndex, 'hours', parseInt(e.target.value))}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Vehicle Options Section */}
              <div className="space-y-3 mt-6 p-3 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Opções de Veículo e Preço
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addVehicleOption(legIndex)}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Adicionar Opção
                  </Button>
                </div>
                
                {leg.vehicle_options.length === 0 && (
                  <p className="text-sm text-gray-500 italic">Adicione pelo menos uma opção de veículo.</p>
                )}

                {leg.vehicle_options.map((option, optionIndex) => (
                  <div key={optionIndex} className="grid md:grid-cols-3 gap-3 items-end border-t pt-3 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor={`vehicle_type_id-${legIndex}-${optionIndex}`}>Tipo de Veículo *</Label>
                      <Select
                        value={option.vehicle_type_id}
                        onValueChange={(value) => updateVehicleOption(legIndex, optionIndex, 'vehicle_type_id', value)}
                      >
                        <SelectTrigger id={`vehicle_type_id-${legIndex}-${optionIndex}`}>
                          <SelectValue placeholder="Selecione o tipo de veículo" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map(vehicle => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`price-${legIndex}-${optionIndex}`} className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        Preço (R$) *
                      </Label>
                      <Input
                        id={`price-${legIndex}-${optionIndex}`}
                        type="number"
                        step="0.01"
                        value={option.price}
                        onChange={(e) => updateVehicleOption(legIndex, optionIndex, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeVehicleOption(legIndex, optionIndex)}
                      className="h-9 w-9"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor={`notes-${legIndex}`}>Observações do Trecho</Label>
                <Textarea
                  id={`notes-${legIndex}`}
                  value={leg.notes}
                  onChange={(e) => handleLegChange(legIndex, 'notes', e.target.value)}
                  placeholder="Observações específicas para este trecho..."
                />
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addLeg} className="w-full mt-4 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Novo Trecho
          </Button>
        </div>

        {/* General Notes */}
        <div className="border p-4 rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">Observações Gerais</h2>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações para o Cliente</Label>
            <Textarea
              id="notes"
              value={quoteData.notes}
              onChange={(e) => handleQuoteDataChange('notes', e.target.value)}
              placeholder="Informações adicionais para a cotação..."
              rows={3}
            />
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="admin_notes">Notas Internas (apenas para admins)</Label>
            <Textarea
              id="admin_notes"
              value={quoteData.admin_notes}
              onChange={(e) => handleQuoteDataChange('admin_notes', e.target.value)}
              placeholder="Notas internas para esta cotação..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Baixar PDF (Em Breve)
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4" />}
            Criar Cotação
          </Button>
        </div>
      </form>
    </div>
  );
}