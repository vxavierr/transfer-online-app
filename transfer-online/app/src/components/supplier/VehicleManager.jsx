import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Car, Plus, Edit, Trash2, Star, Check } from 'lucide-react';

export default function VehicleManager({ driverId }) {
  const queryClient = useQueryClient();
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  
  const [vehicleFormData, setVehicleFormData] = useState({
    vehicle_model: '',
    vehicle_plate: '',
    vehicle_color: '',
    vehicle_year: '',
    registration_expiry: '',
    registration_document_url: '',
    is_default: false
  });

  const { data: driverVehicles = [] } = useQuery({
    queryKey: ['driverVehicles', driverId],
    queryFn: () => base44.entities.DriverVehicle.filter({ driver_id: driverId }),
    enabled: !!driverId,
    initialData: []
  });

  const createVehicleMutation = useMutation({
    mutationFn: async (vehicleData) => {
      if (vehicleData.is_default) {
        const existingVehicles = await base44.entities.DriverVehicle.filter({ driver_id: driverId });
        for (const vehicle of existingVehicles) {
          if (vehicle.is_default) {
            await base44.entities.DriverVehicle.update(vehicle.id, { is_default: false });
          }
        }
      }
      return await base44.entities.DriverVehicle.create({
        driver_id: driverId,
        ...vehicleData,
        vehicle_year: vehicleData.vehicle_year ? String(vehicleData.vehicle_year) : '',
        active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverVehicles', driverId] });
      queryClient.invalidateQueries({ queryKey: ['allDriverVehicles'] });
      setSuccess('Veículo adicionado com sucesso!');
      setShowAddVehicle(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => setFormError(error.message || 'Erro ao adicionar veículo')
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (data.is_default) {
        const existingVehicles = await base44.entities.DriverVehicle.filter({ driver_id: driverId });
        for (const vehicle of existingVehicles) {
          if (vehicle.id !== id && vehicle.is_default) {
            await base44.entities.DriverVehicle.update(vehicle.id, { is_default: false });
          }
        }
      }
      return await base44.entities.DriverVehicle.update(id, {
        ...data,
        vehicle_year: data.vehicle_year ? String(data.vehicle_year) : ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverVehicles', driverId] });
      queryClient.invalidateQueries({ queryKey: ['allDriverVehicles'] });
      setSuccess('Veículo atualizado com sucesso!');
      setEditingVehicle(null);
      setShowAddVehicle(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => setFormError(error.message || 'Erro ao atualizar veículo')
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id) => base44.entities.DriverVehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverVehicles', driverId] });
      queryClient.invalidateQueries({ queryKey: ['allDriverVehicles'] });
      setSuccess('Veículo removido com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => setFormError(error.message || 'Erro ao remover veículo')
  });

  const resetForm = () => {
    setVehicleFormData({ 
      vehicle_model: '', 
      vehicle_plate: '', 
      vehicle_color: '', 
      vehicle_year: '', 
      registration_expiry: '', 
      registration_document_url: '', 
      is_default: driverVehicles.length === 0 
    });
  };

  const handleOpenForm = (vehicle = null) => {
    setFormError('');
    if (vehicle) {
      setEditingVehicle(vehicle);
      setVehicleFormData({
        vehicle_model: vehicle.vehicle_model || '',
        vehicle_plate: vehicle.vehicle_plate || '',
        vehicle_color: vehicle.vehicle_color || '',
        vehicle_year: vehicle.vehicle_year || '',
        registration_expiry: vehicle.registration_expiry || '',
        registration_document_url: vehicle.registration_document_url || '',
        is_default: vehicle.is_default || false
      });
    } else {
      setEditingVehicle(null);
      resetForm();
    }
    setShowAddVehicle(true);
  };

  const handleFileUpload = async (file) => {
    if (!file) return null;
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      return response.file_url;
    } catch (error) {
      throw new Error("Falha no upload: " + error.message);
    }
  };

  const handleVehicleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessingDoc(true);
    setFormError('');

    try {
      const url = await handleFileUpload(file);
      if (!url) throw new Error("Falha no upload");

      const verifyRes = await base44.functions.invoke('verifyDocumentWithAI', {
        file_url: url,
        document_type: 'crlv'
      });

      if (verifyRes?.data) {
        const { isValid, expiryDate, extractedData } = verifyRes.data;
        
        if (!isValid && !extractedData?.is_legible) {
           setFormError("Atenção: Documento pode estar ilegível ou inválido.");
        }

        setVehicleFormData(prev => ({
          ...prev,
          registration_document_url: url,
          registration_expiry: expiryDate || prev.registration_expiry,
          vehicle_plate: extractedData?.license_plate || prev.vehicle_plate,
          vehicle_model: extractedData?.vehicle_model || prev.vehicle_model,
          vehicle_year: extractedData?.vehicle_year ? String(extractedData.vehicle_year) : prev.vehicle_year,
          vehicle_color: extractedData?.vehicle_color || prev.vehicle_color
        }));

        setSuccess('Dados do veículo extraídos do documento!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error("Erro:", error);
      setFormError("Erro ao processar o documento. Preencha manualmente.");
    } finally {
      setIsProcessingDoc(false);
    }
  };

  const handleSave = () => {
    setFormError('');
    if (!vehicleFormData.vehicle_model.trim() || !vehicleFormData.vehicle_plate.trim()) {
      setFormError('Preencha Modelo e Placa do veículo');
      return;
    }

    if (editingVehicle) {
      updateVehicleMutation.mutate({ id: editingVehicle.id, data: vehicleFormData });
    } else {
      createVehicleMutation.mutate(vehicleFormData);
    }
  };

  const handleSetDefault = async (vehicle) => {
    try {
      const existing = await base44.entities.DriverVehicle.filter({ driver_id: driverId });
      for (const v of existing) {
        if (v.is_default && v.id !== vehicle.id) {
          await base44.entities.DriverVehicle.update(v.id, { is_default: false });
        }
      }
      await base44.entities.DriverVehicle.update(vehicle.id, { is_default: true });
      queryClient.invalidateQueries({ queryKey: ['driverVehicles', driverId] });
      queryClient.invalidateQueries({ queryKey: ['allDriverVehicles'] });
      setSuccess('Veículo padrão atualizado!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setFormError('Erro ao definir veículo padrão');
    }
  };

  return (
    <div className="bg-green-50 p-4 rounded-lg space-y-4 border-2 border-green-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5 text-green-700" />
          <h3 className="font-semibold text-green-900 text-lg">Veículos do Motorista</h3>
          <Badge variant="outline" className="bg-white border-green-300 text-green-700">
            {driverVehicles.length} {driverVehicles.length === 1 ? 'veículo' : 'veículos'}
          </Badge>
        </div>
        {!showAddVehicle && (
          <Button onClick={() => handleOpenForm()} size="sm" className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Veículo
          </Button>
        )}
      </div>

      {success && <Alert className="bg-green-100 text-green-800 border-green-300"><AlertDescription>{success}</AlertDescription></Alert>}
      {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}

      {driverVehicles.length > 0 && (
        <div className="space-y-2">
          {driverVehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {vehicle.is_default && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                    <span className="font-semibold text-gray-900">{vehicle.vehicle_model}</span>
                    {vehicle.is_default && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">Padrão</Badge>}
                  </div>
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <div>🚗 Placa: <span className="font-mono font-semibold">{vehicle.vehicle_plate}</span></div>
                    {vehicle.vehicle_color && <div>🎨 Cor: {vehicle.vehicle_color}</div>}
                    {vehicle.vehicle_year && <div>📅 Ano: {vehicle.vehicle_year}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!vehicle.is_default && (
                    <Button type="button" variant="outline" size="sm" onClick={() => handleSetDefault(vehicle)} className="text-yellow-600 border-yellow-300 hover:bg-yellow-50">
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenForm(vehicle)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { if (confirm('Remover veículo?')) deleteVehicleMutation.mutate(vehicle.id); }} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddVehicle && (
        <div className="bg-white border-2 border-dashed border-green-400 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">{editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}</h4>
            <Button type="button" onClick={() => setShowAddVehicle(false)} variant="ghost" size="sm">Cancelar</Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Label className="text-blue-900 font-semibold mb-2 block">1º Passo: Upload do Documento (CRLV)</Label>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Input type="file" accept="image/*,.pdf" onChange={handleVehicleDocumentUpload} disabled={isProcessingDoc} className="bg-white border-blue-200" />
                {isProcessingDoc && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center bg-white pl-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 mr-2" />
                    <span className="text-xs text-blue-600 font-medium">Lendo...</span>
                  </div>
                )}
              </div>
              {vehicleFormData.registration_document_url && (
                <Button type="button" variant="outline" onClick={() => window.open(vehicleFormData.registration_document_url, '_blank')} className="bg-white hover:bg-gray-50">
                  <Car className="w-4 h-4 mr-2" /> Ver Doc
                </Button>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Modelo *</Label><Input value={vehicleFormData.vehicle_model} onChange={(e) => setVehicleFormData({...vehicleFormData, vehicle_model: e.target.value})} placeholder="Ex: Toyota Corolla" /></div>
            <div className="space-y-2"><Label>Placa *</Label><Input value={vehicleFormData.vehicle_plate} onChange={(e) => setVehicleFormData({...vehicleFormData, vehicle_plate: e.target.value.toUpperCase()})} placeholder="ABC-1234" className="uppercase" /></div>
            <div className="space-y-2"><Label>Cor</Label><Input value={vehicleFormData.vehicle_color} onChange={(e) => setVehicleFormData({...vehicleFormData, vehicle_color: e.target.value})} /></div>
            <div className="space-y-2"><Label>Ano</Label><Input value={vehicleFormData.vehicle_year} onChange={(e) => setVehicleFormData({...vehicleFormData, vehicle_year: e.target.value})} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Validade Licenciamento</Label><Input type="date" value={vehicleFormData.registration_expiry} onChange={(e) => setVehicleFormData({...vehicleFormData, registration_expiry: e.target.value})} /></div>
          </div>

          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            <input type="checkbox" id="is_default" checked={vehicleFormData.is_default} onChange={(e) => setVehicleFormData({...vehicleFormData, is_default: e.target.checked})} className="w-4 h-4" />
            <Label htmlFor="is_default" className="cursor-pointer text-sm font-medium text-yellow-900 flex items-center gap-1"><Star className="w-4 h-4 text-yellow-600" /> Definir como padrão</Label>
          </div>

          <Button type="button" onClick={handleSave} disabled={createVehicleMutation.isLoading || updateVehicleMutation.isLoading} className="w-full bg-green-600 hover:bg-green-700">
            {(createVehicleMutation.isLoading || updateVehicleMutation.isLoading) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            {editingVehicle ? 'Atualizar' : 'Adicionar'}
          </Button>
        </div>
      )}
    </div>
  );
}