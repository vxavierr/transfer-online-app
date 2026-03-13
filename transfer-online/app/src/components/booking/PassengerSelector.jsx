import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  UserPlus, 
  X, 
  AlertCircle, 
  User,
  CheckCircle,
  Star,
  Save,
  Loader2
} from 'lucide-react';

export default function PassengerSelector({ 
  availablePassengers = [],
  selectedPassenger,
  onSelectPassenger,
  currentUser,
  label, // Optional custom label
  clientId, // Optional: ID of the client to fetch/save frequent passengers
  allowManualEntry = true, // Optional: Allow manual entry of passengers (default: true)
  entityType = 'passenger' // Optional: 'passenger' or 'requester' (default: 'passenger')
}) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [saveAsFrequent, setSaveAsFrequent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [manualPassenger, setManualPassenger] = useState({
    full_name: '',
    email: '',
    phone_number: ''
  });

  const entityName = entityType === 'requester' ? 'FrequentRequester' : 'FrequentPassenger';
  const queryKey = entityType === 'requester' ? 'frequentRequesters' : 'frequentPassengers';
  const itemLabel = entityType === 'requester' ? 'Solicitante' : 'Passageiro';

  // Buscar passageiros/solicitantes frequentes se tiver clientId
  const { data: frequentItems = [], isLoading: isLoadingFrequent } = useQuery({
    queryKey: [queryKey, clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return await base44.entities[entityName].filter({ client_id: clientId });
    },
    enabled: !!clientId,
    initialData: []
  });

  // Combinar e filtrar passageiros/solicitantes
  const filteredItems = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    // Normalizar usuários do sistema (Users)
    const systemUsers = availablePassengers.map(p => ({
      ...p,
      type: 'system_user',
      display_name: p.full_name,
      display_email: p.email
    }));

    // Normalizar frequentes
    const frequentUsers = frequentItems.map(p => ({
      ...p,
      type: entityType === 'requester' ? 'frequent_requester' : 'frequent_passenger',
      display_name: p.full_name,
      display_email: p.email,
      is_frequent: true
    }));

    // Combinar listas (evitar duplicatas por ID se necessário, mas IDs são diferentes entre tabelas)
    let all = [...systemUsers, ...frequentUsers];

    if (!searchTerm) return all;

    return all.filter(p => 
      p.display_name?.toLowerCase().includes(searchLower) ||
      p.display_email?.toLowerCase().includes(searchLower) ||
      p.phone_number?.includes(searchLower)
    ).sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
  }, [availablePassengers, frequentItems, searchTerm, entityType]);

  const handleSelectExisting = (passenger) => {
    onSelectPassenger(passenger);
    setShowManualEntry(false);
    setSearchTerm('');
  };

  const handleAddManual = async () => {
    // Only full_name is now required
    if (!manualPassenger.full_name.trim()) {
      return;
    }

    setIsSaving(true);
    
    try {
      let createdFrequentId = null;

      // Se marcado para salvar e tiver clientId, criar registro
      if (saveAsFrequent && clientId) {
        // Prepare payload, removing undefined/null/empty strings for optional fields to avoid validation errors
        const payload = {
          client_id: clientId,
          full_name: manualPassenger.full_name,
        };

        if (manualPassenger.email && manualPassenger.email.trim()) {
            payload.email = manualPassenger.email.trim();
        }

        if (manualPassenger.phone_number && manualPassenger.phone_number.trim()) {
            payload.phone_number = manualPassenger.phone_number.trim();
        }

        const created = await base44.entities[entityName].create(payload);
        createdFrequentId = created.id;
        
        // Invalidar query para recarregar a lista
        queryClient.invalidateQueries([queryKey, clientId]);
      }
      
      // Criar objeto manual
      const newItem = {
        id: createdFrequentId || `manual_${Date.now()}`, // Usar ID real se salvou
        frequent_id: createdFrequentId, // Guardar ID do frequente
        full_name: manualPassenger.full_name,
        email: manualPassenger.email || '',
        phone_number: manualPassenger.phone_number || '',
        is_manual: !createdFrequentId, // Se salvou, não é puramente manual (é frequente agora)
        type: createdFrequentId ? (entityType === 'requester' ? 'frequent_requester' : 'frequent_passenger') : 'manual',
        is_frequent: !!createdFrequentId
      };
      
      onSelectPassenger(newItem);
      setShowManualEntry(false);
      setManualPassenger({ full_name: '', email: '', phone_number: '' });
      setSaveAsFrequent(false);
      setSearchTerm('');
    } catch (error) {
      console.error("Erro ao salvar passageiro frequente:", error);
      alert("Erro ao salvar passageiro. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearSelection = () => {
    onSelectPassenger(null);
    setShowManualEntry(false);
    setSearchTerm('');
  };

  // Se já tem um passageiro selecionado, mostrar resumo
  if (selectedPassenger) {
    return (
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-gray-700">Passageiro Principal Selecionado</Label>
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{selectedPassenger.full_name}</p>
                <p className="text-xs text-gray-600">{selectedPassenger.email}</p>
                {selectedPassenger.phone_number && (
                  <p className="text-xs text-gray-500">{selectedPassenger.phone_number}</p>
                )}
                {selectedPassenger.is_manual && (
                  <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mt-1">
                    Passageiro Avulso
                  </span>
                )}
              </div>
            </div>
            <Button
              onClick={handleClearSelection}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              Alterar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Determine label text. If label is explicit null, don't show it. If undefined, use default.
  const labelText = label !== undefined ? label : "Selecione o Passageiro Principal *";

  return (
    <div className="space-y-4">
      {labelText && (
        <Label className="text-sm font-semibold text-gray-700">{labelText}</Label>
      )}

      {/* Modo de entrada manual */}
      {showManualEntry ? (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-gray-900">Adicionar {itemLabel} Avulso</h4>
            </div>
            <Button
              onClick={() => {
                setShowManualEntry(false);
                setManualPassenger({ full_name: '', email: '', phone_number: '' });
              }}
              variant="ghost"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Alert className="bg-blue-50 border-blue-300">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-xs">
              💡 Este {itemLabel.toLowerCase()} será registrado apenas para esta viagem e não terá acesso à plataforma.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">Nome Completo *</Label>
              <Input
                value={manualPassenger.full_name}
                onChange={(e) => setManualPassenger({ ...manualPassenger, full_name: e.target.value })}
                placeholder="Ex: João Silva"
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Email {entityType === 'requester' ? '*' : '(Opcional)'}</Label>
              <Input
                type="email"
                value={manualPassenger.email}
                onChange={(e) => setManualPassenger({ ...manualPassenger, email: e.target.value })}
                placeholder="Ex: joao.silva@exemplo.com"
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Telefone (Opcional)</Label>
              <PhoneInputWithCountry
                value={manualPassenger.phone_number}
                onChange={(value) => setManualPassenger({ ...manualPassenger, phone_number: value })}
                placeholder="Ex: (11) 99999-9999"
                className="bg-white"
              />
            </div>

            {clientId && (
              <div className="flex items-center space-x-2 py-2">
                <Checkbox 
                  id="save-frequent" 
                  checked={saveAsFrequent}
                  onCheckedChange={setSaveAsFrequent}
                />
                <Label htmlFor="save-frequent" className="text-sm font-medium text-purple-900 cursor-pointer flex items-center gap-1">
                  <Save className="w-3 h-3" />
                  Salvar na lista de {itemLabel}s Frequentes
                </Label>
              </div>
            )}

            <Button
              onClick={handleAddManual}
              disabled={!manualPassenger.full_name.trim() || (entityType === 'requester' && !manualPassenger.email.trim()) || isSaving}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Confirmar {itemLabel}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Barra de busca */}
          {availablePassengers.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="🔍 Buscar funcionário por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Lista de filtrados */}
          {(availablePassengers.length > 0 || frequentItems.length > 0) ? (
            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3 bg-white">
              {filteredItems.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">
                    Nenhum {itemLabel.toLowerCase()} encontrado com o termo "{searchTerm}".
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={`${item.type}_${item.id}`}
                    type="button"
                    onClick={() => handleSelectExisting(item)}
                    className="w-full text-left p-3 rounded-lg border-2 transition-all hover:border-blue-400 hover:bg-blue-50 border-gray-200 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.is_frequent ? 'bg-amber-100' : 'bg-blue-100'}`}>
                        {item.is_frequent ? (
                          <Star className="w-5 h-5 text-amber-600" />
                        ) : (
                          <User className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">{item.display_name}</p>
                          {item.is_frequent && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                              {item.type === 'frequent_requester' ? 'Solicitante Frequente' : 'Passageiro Frequente'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate">{item.display_email}</p>
                        {item.phone_number && (
                          <p className="text-xs text-gray-500">{item.phone_number}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 text-xs">
                Não há funcionários cadastrados. Adicione manualmente abaixo.
              </AlertDescription>
            </Alert>
          )}

          {/* Separador e Botão Manual (condicional) */}
          {allowManualEntry && (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="text-xs text-gray-500 font-medium">OU</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              <Button
                type="button"
                onClick={() => setShowManualEntry(true)}
                variant="outline"
                className="w-full border-2 border-dashed border-purple-400 text-purple-700 hover:bg-purple-50 hover:border-purple-500"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar {itemLabel} Não Cadastrado
              </Button>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-xs">
                  💡 <strong>Dica:</strong> Se o {itemLabel.toLowerCase()} não estiver cadastrado na plataforma, você pode adicioná-lo como "{itemLabel} Avulso" clicando no botão acima.
                </AlertDescription>
              </Alert>
            </>
          )}
        </>
      )}
    </div>
  );
}