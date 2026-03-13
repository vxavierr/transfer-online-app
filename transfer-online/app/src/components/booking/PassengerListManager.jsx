import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Users,
  Upload,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Star,
  Edit2
} from 'lucide-react';

export default function PassengerListManager({ 
  passengers = [], 
  onChange, 
  maxPassengers = 15,
  requiresDocumentation = false 
}) {
  const [showManualForm, setShowManualForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [newPassenger, setNewPassenger] = useState({
    name: '',
    document_type: 'RG',
    document_number: '',
    phone_number: '',
    is_lead_passenger: false
  });

  // Resetar formulário
  const resetForm = () => {
    setNewPassenger({
      name: '',
      document_type: 'RG',
      document_number: '',
      phone_number: '',
      is_lead_passenger: false
    });
    setShowManualForm(false);
    setEditingIndex(null);
  };

  // Adicionar ou atualizar passageiro manualmente
  const handleAddOrUpdatePassenger = () => {
    if (!newPassenger.name.trim()) {
      setUploadError('Nome é obrigatório');
      return;
    }

    if (requiresDocumentation && !newPassenger.document_number.trim()) {
      setUploadError('Número do documento é obrigatório para viagens intermunicipais');
      return;
    }

    const updatedPassengers = [...passengers];

    if (editingIndex !== null) {
      // Atualizar passageiro existente
      updatedPassengers[editingIndex] = { ...newPassenger };
    } else {
      // Adicionar novo passageiro
      if (passengers.length >= maxPassengers) {
        setUploadError(`Limite máximo de ${maxPassengers} passageiros atingido`);
        return;
      }
      updatedPassengers.push({ ...newPassenger });
    }

    onChange(updatedPassengers);
    setUploadSuccess(editingIndex !== null ? 'Passageiro atualizado!' : 'Passageiro adicionado!');
    resetForm();
    setTimeout(() => setUploadSuccess(''), 3000);
    setUploadError('');
  };

  // Remover passageiro
  const handleRemovePassenger = (index) => {
    const updatedPassengers = passengers.filter((_, i) => i !== index);
    onChange(updatedPassengers);
  };

  // Marcar como passageiro principal
  const handleToggleLeadPassenger = (index) => {
    const updatedPassengers = passengers.map((p, i) => ({
      ...p,
      is_lead_passenger: i === index
    }));
    onChange(updatedPassengers);
  };

  // Editar passageiro
  const handleEditPassenger = (index) => {
    setNewPassenger({ ...passengers[index] });
    setEditingIndex(index);
    setShowManualForm(true);
  };

  const processFile = async (file) => {
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ['text/csv', 'application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|pdf|jpg|jpeg|png|txt)$/i)) {
      setUploadError('Tipo de arquivo não suportado. Use CSV, PDF, JPG, PNG ou TXT.');
      return;
    }

    // Validar tamanho (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      // 1. Upload do arquivo
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResponse.file_url;

      // 2. Extrair dados com IA
      const jsonSchema = {
        type: "object",
        properties: {
          passengers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Nome completo do passageiro"
                },
                document_type: {
                  type: "string",
                  enum: ["RG", "CPF", "CNH", "Passaporte"],
                  description: "Tipo de documento (RG, CPF, CNH ou Passaporte)"
                },
                document_number: {
                  type: "string",
                  description: "Número do documento"
                },
                phone_number: {
                  type: "string",
                  description: "Telefone do passageiro (opcional)"
                }
              },
              required: ["name", "document_type", "document_number"]
            }
          }
        },
        required: ["passengers"]
      };

      const extractResponse = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: jsonSchema
      });

      if (extractResponse.status === 'success' && extractResponse.output?.passengers) {
        const extractedPassengers = extractResponse.output.passengers;

        // Validar quantidade
        if (extractedPassengers.length > maxPassengers) {
          setUploadError(`O arquivo contém ${extractedPassengers.length} passageiros, mas o limite é ${maxPassengers}.`);
          setIsUploading(false);
          return;
        }

        // Adicionar passageiros extraídos
        const formattedPassengers = extractedPassengers.map((p, index) => ({
          name: p.name || '',
          document_type: p.document_type || 'RG',
          document_number: p.document_number || '',
          phone_number: p.phone_number || '',
          is_lead_passenger: index === 0 // Primeiro é o principal
        }));

        onChange(formattedPassengers);
        setUploadSuccess(`✅ ${formattedPassengers.length} passageiro(s) extraído(s) com sucesso! Revise os dados abaixo.`);
      } else {
        throw new Error(extractResponse.details || 'Não foi possível extrair dados do arquivo.');
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setUploadError(error.message || 'Erro ao processar arquivo. Tente novamente ou adicione manualmente.');
    } finally {
      setIsUploading(false);
    }
  };

  // Upload inteligente com IA via Input
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    processFile(file);
    // Limpar input file
    e.target.value = '';
  };

  // Handlers para Drag and Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-lg">
            Lista de Passageiros {requiresDocumentation && <span className="text-red-600">*</span>}
          </h3>
        </div>
        <Badge variant="outline" className="text-sm">
          {passengers.length} / {maxPassengers}
        </Badge>
      </div>

      {requiresDocumentation && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 text-sm">
            <strong>📋 Listagem Obrigatória:</strong> Para viagens intermunicipais ou com múltiplos passageiros, 
            é necessário informar nome e documento de cada passageiro.
          </AlertDescription>
        </Alert>
      )}

      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {uploadSuccess && (
        <Alert className="bg-green-50 border-green-300">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">{uploadSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Opções de Adição */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Upload Inteligente */}
        <Card 
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            isDragging 
              ? 'border-blue-600 bg-blue-50 scale-[1.02] shadow-lg' 
              : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50/30'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-6">
            <div className="text-center pointer-events-none">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors ${isDragging ? 'bg-blue-200' : 'bg-blue-100'}`}>
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                ) : (
                  <Upload className={`w-6 h-6 text-blue-600 ${isDragging ? 'animate-bounce' : ''}`} />
                )}
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                🤖 Upload Inteligente (Recomendado)
              </h4>
              <p className="text-xs text-gray-600 mb-4">
                {isDragging ? 'Solte o arquivo aqui!' : 'Arraste e solte um arquivo aqui ou clique para selecionar'}
              </p>
              <div className="pointer-events-auto">
                <label className="cursor-pointer block">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                    className="w-full bg-white hover:bg-gray-50"
                    asChild
                  >
                    <span>
                      <FileText className="w-4 h-4 mr-2" />
                      {isUploading ? 'Processando...' : 'Escolher Arquivo'}
                    </span>
                  </Button>
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,.pdf,.jpg,.jpeg,.png,.txt"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                CSV, PDF, JPG, PNG ou TXT (máx 10MB)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Adicionar Manualmente */}
        <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-gray-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                ✍️ Adicionar Manualmente
              </h4>
              <p className="text-xs text-gray-600 mb-4">
                Preencha os dados de cada passageiro individualmente
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowManualForm(!showManualForm);
                  if (showManualForm) resetForm();
                }}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {showManualForm ? 'Cancelar' : 'Adicionar Passageiro'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário Manual */}
      {showManualForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6 space-y-4">
            <h4 className="font-semibold text-blue-900">
              {editingIndex !== null ? 'Editar Passageiro' : 'Novo Passageiro'}
            </h4>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={newPassenger.name}
                  onChange={(e) => setNewPassenger({...newPassenger, name: e.target.value})}
                  placeholder="Ex: João Silva"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Documento *</Label>
                <Select
                  value={newPassenger.document_type}
                  onValueChange={(value) => setNewPassenger({...newPassenger, document_type: value})}
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
                  value={newPassenger.document_number}
                  onChange={(e) => setNewPassenger({...newPassenger, document_number: e.target.value})}
                  placeholder="Ex: 12.345.678-9"
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone (Opcional)</Label>
                <PhoneInputWithCountry
                  value={newPassenger.phone_number}
                  onChange={(value) => setNewPassenger({...newPassenger, phone_number: value})}
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAddOrUpdatePassenger}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {editingIndex !== null ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exemplo de Formato */}
      {!showManualForm && passengers.length === 0 && (
        <Alert className="bg-gray-50 border-gray-200">
          <FileText className="h-4 w-4 text-gray-500" />
          <AlertDescription className="text-gray-700 text-sm">
            <strong>💡 Dica para Upload CSV:</strong> Use colunas "Nome", "Tipo de Documento", "Número do Documento", "Telefone"
            <br />
            <span className="text-xs text-gray-500">
              Exemplo: João Silva, RG, 12.345.678-9, (11) 99999-9999
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de Passageiros */}
      {passengers.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Passageiros Cadastrados</h4>
              <Badge className="bg-green-100 text-green-800">
                {passengers.length} {passengers.length === 1 ? 'passageiro' : 'passageiros'}
              </Badge>
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">Documento</TableHead>
                    <TableHead className="font-semibold">Telefone</TableHead>
                    <TableHead className="font-semibold">Principal</TableHead>
                    <TableHead className="font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passengers.map((passenger, index) => (
                    <TableRow key={index} className={passenger.is_lead_passenger ? 'bg-blue-50' : ''}>
                      <TableCell className="font-medium">{passenger.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {passenger.document_type}: {passenger.document_number}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {passenger.phone_number || '-'}
                      </TableCell>
                      <TableCell>
                        {passenger.is_lead_passenger ? (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Star className="w-3 h-3 mr-1" />
                            Principal
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleLeadPassenger(index)}
                            className="text-xs"
                          >
                            Marcar como principal
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPassenger(index)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePassenger(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}