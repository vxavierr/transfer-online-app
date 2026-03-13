import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, Trash2, Plus, ImageIcon } from 'lucide-react';
import PhoneInputWithCountry from '../ui/PhoneInputWithCountry';

export default function ServiceRequestContactsTab({
  serviceRequest,
  formData,
  handleChange,
  clientUsers,
  handleRequesterUserChange,
  passengersDetails,
  addPassenger,
  updatePassenger,
  removePassenger,
  isUploadingSign,
  handleReceptiveSignUpload
}) {
  const safeClientUsers = Array.isArray(clientUsers) ? clientUsers : [];

  return (
    <div className="space-y-6">
      {/* Informações do Cliente */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Informações do Cliente</h3>
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <span className="text-gray-600">ID Cliente:</span>
            <span className="ml-2 font-medium">{serviceRequest.client_id}</span>
          </div>
          <div>
            <span className="text-gray-600">ID Usuário:</span>
            <span className="ml-2 font-medium">{serviceRequest.user_id}</span>
          </div>
        </div>

        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Dados do Solicitante (Editável)</h4>
          </div>
          
          {/* Seletor de Usuário do Cliente */}
          <div className="space-y-2">
              <Label htmlFor="requester_select">Selecionar Usuário Cadastrado</Label>
              <Select
                  value={formData.requester_user_id || 'manual'}
                  onValueChange={handleRequesterUserChange}
              >
                  <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione um usuário ou preencha manualmente" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="manual">-- Preencher Manualmente --</SelectItem>
                      {[...safeClientUsers].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')).map(user => (
                          <SelectItem key={user.id} value={user.id}>
                              {user.full_name} ({user.email})
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requester_full_name">Nome</Label>
              <Input
                id="requester_full_name"
                value={formData.requester_full_name}
                onChange={(e) => handleChange('requester_full_name', e.target.value)}
                placeholder="Nome do solicitante"
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requester_email">Email</Label>
              <Input
                id="requester_email"
                type="email"
                value={formData.requester_email}
                onChange={(e) => handleChange('requester_email', e.target.value)}
                placeholder="email@exemplo.com"
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requester_phone">Telefone</Label>
              <PhoneInputWithCountry
                id="requester_phone"
                value={formData.requester_phone}
                onChange={(value) => handleChange('requester_phone', value)}
                placeholder="(11) 99999-9999"
                className="bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dados do Passageiro */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Dados do Passageiro Principal</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="passenger_name">Nome</Label>
            <Input
              id="passenger_name"
              value={formData.passenger_name}
              onChange={(e) => handleChange('passenger_name', e.target.value)}
              placeholder="Nome do passageiro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passenger_email">Email</Label>
            <Input
              id="passenger_email"
              type="email"
              value={formData.passenger_email}
              onChange={(e) => handleChange('passenger_email', e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passenger_phone">Telefone</Label>
            <PhoneInputWithCountry
              id="passenger_phone"
              value={formData.passenger_phone}
              onChange={(value) => handleChange('passenger_phone', value)}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>
      </div>

      {/* Lista de Passageiros Detalhada */}
      <div className="border-t pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Passageiros Adicionais</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPassenger}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Passageiro
          </Button>
        </div>
        
        {passengersDetails.length > 0 ? (
          <div className="space-y-3">
            {passengersDetails.map((passenger, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Passageiro {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePassenger(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      value={passenger.name}
                      onChange={(e) => updatePassenger(index, 'name', e.target.value)}
                      placeholder="Nome do passageiro"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipo de Documento</Label>
                    <Select
                      value={passenger.document_type}
                      onValueChange={(value) => updatePassenger(index, 'document_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RG">RG</SelectItem>
                        <SelectItem value="CPF">CPF</SelectItem>
                        <SelectItem value="CNH">CNH</SelectItem>
                        <SelectItem value="Passaporte">Passaporte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Número do Documento *</Label>
                    <Input
                      value={passenger.document_number}
                      onChange={(e) => updatePassenger(index, 'document_number', e.target.value)}
                      placeholder="Número do documento"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <PhoneInputWithCountry
                      value={passenger.phone_number}
                      onChange={(value) => updatePassenger(index, 'phone_number', value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhum passageiro adicional cadastrado
          </p>
        )}
      </div>

      {/* Necessário Receptivo */}
      <div className="flex flex-col space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_receptive_needed"
            checked={formData.is_receptive_needed}
            onChange={(e) => handleChange('is_receptive_needed', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <Label htmlFor="is_receptive_needed" className="text-sm font-medium text-gray-700">
            Necessário Receptivo? (Ex: Placa em Aeroporto)
          </Label>
        </div>

        {formData.is_receptive_needed && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pl-6 border-l-2 border-blue-200">
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Receptivo será efetuado por: *
              </Label>
              <Select 
                value={formData.receptive_performed_by} 
                onValueChange={(value) => handleChange('receptive_performed_by', value)}
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Selecione quem fará o receptivo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver">Motorista</SelectItem>
                  <SelectItem value="contracted_company">Empresa Contratada</SelectItem>
                  <SelectItem value="other_means">Outros Meios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.receptive_performed_by === 'driver' || formData.receptive_performed_by === 'contracted_company') && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Upload da Placa de Receptivo *</Label>
                
                {formData.receptive_sign_url && (
                  <div className="flex justify-center">
                    <img
                      src={formData.receptive_sign_url}
                      alt="Placa de Receptivo"
                      className="max-w-full h-48 object-contain border-4 border-indigo-200 rounded-lg shadow-lg bg-white"
                    />
                  </div>
                )}

                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-indigo-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-indigo-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {isUploadingSign ? (
                        <>
                          <Loader2 className="w-8 h-8 mb-2 text-indigo-500 animate-spin" />
                          <p className="text-sm text-indigo-600">Enviando placa...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mb-2 text-indigo-500" />
                          <p className="mb-2 text-sm text-gray-600">
                            <span className="font-semibold">Clique para enviar</span> a placa
                          </p>
                          <p className="text-xs text-gray-500">Foto da placa com nome do passageiro</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleReceptiveSignUpload}
                      disabled={isUploadingSign}
                    />
                  </label>
                </div>
              </div>
            )}

            {formData.receptive_performed_by === 'other_means' && (
              <div className="space-y-2">
                <Label htmlFor="receptive_notes">Descreva como será feito o receptivo: *</Label>
                <Textarea
                  id="receptive_notes"
                  value={formData.receptive_notes}
                  onChange={(e) => handleChange('receptive_notes', e.target.value)}
                  placeholder="Ex: Passageiro irá até o balcão da empresa no saguão..."
                  className="h-20 bg-white"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}