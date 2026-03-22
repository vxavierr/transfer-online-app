import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Send, MessageSquare, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function EnviarMensagemMotoristas() {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [recipientMode, setRecipientMode] = useState('select'); // 'all', 'select'
  const [selectedDriverIds, setSelectedDriverIds] = useState([]);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sendingProgress, setSendingProgress] = useState(null); // { current: 0, total: 0, success: 0, failed: 0 }
  const [sendResult, setSendResult] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser?.supplier_id) {
          window.location.href = '/';
          return;
        }

        // Verify supplier features permissions
        const supplier = await base44.entities.Supplier.get(currentUser.supplier_id);
        if (!supplier.features?.driver_messaging) {
          alert('Esta funcionalidade não está disponível no seu plano atual. Entre em contato com o suporte para fazer o upgrade.');
          window.location.href = '/DashboardFornecedor';
          return;
        }

        setUser(currentUser);
        
        // Check for pre-selected driver in URL (e.g. from driver details page)
        const params = new URLSearchParams(window.location.search);
        const driverId = params.get('driverId');
        if (driverId) {
          setRecipientMode('select');
          setSelectedDriverIds([driverId]);
        }
        
        setIsLoadingAuth(false);
      } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/AccessPortal?returnUrl=%2FEnviarMensagemMotoristas';
      }
    };
    checkAuth();
  }, []);

  const { data: drivers = [], isLoading: isLoadingDrivers } = useQuery({
    queryKey: ['supplierDrivers', user?.supplier_id],
    queryFn: async () => {
      if (!user?.supplier_id) return [];
      // Only active drivers usually? Or all? Let's get all for now or filter by active if needed.
      // Assuming we want to message active drivers primarily.
      const allDrivers = await base44.entities.Driver.filter({ supplier_id: user.supplier_id });
      return allDrivers.filter(d => d.active); // Optional: filter only active drivers
    },
    enabled: !!user?.supplier_id
  });

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.phone_number.includes(searchTerm)
  );

  const handleToggleDriver = (driverId) => {
    setSelectedDriverIds(prev => {
      if (prev.includes(driverId)) {
        return prev.filter(id => id !== driverId);
      } else {
        return [...prev, driverId];
      }
    });
  };

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredDrivers.map(d => d.id);
    const newSet = new Set([...selectedDriverIds, ...idsToAdd]);
    setSelectedDriverIds(Array.from(newSet));
  };

  const handleDeselectAll = () => {
    setSelectedDriverIds([]);
  };

  const sendMutation = useMutation({
    mutationFn: async (driversToSend) => {
      let successCount = 0;
      let failedCount = 0;
      
      setSendingProgress({ current: 0, total: driversToSend.length, success: 0, failed: 0 });

      for (let i = 0; i < driversToSend.length; i++) {
        const driver = driversToSend[i];
        setSendingProgress(prev => ({ ...prev, current: i + 1 }));
        
        try {
          const response = await base44.functions.invoke('sendDriverMessage', {
            driverId: driver.id,
            driverPhone: driver.phone_number,
            title,
            message,
            type,
            sendWhatsApp
          });

          if (response.data?.success) {
            successCount++;
            setSendingProgress(prev => ({ ...prev, success: prev.success + 1 }));
          } else {
            failedCount++;
            setSendingProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
          }
        } catch (error) {
          console.error(`Error sending to driver ${driver.id}:`, error);
          failedCount++;
          setSendingProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      }

      return { successCount, failedCount };
    },
    onSuccess: (data) => {
      setSendResult({
        type: 'success',
        message: `Mensagens enviadas: ${data.successCount} sucesso(s), ${data.failedCount} falha(s).`
      });
      setSendingProgress(null);
      // Reset form slightly but keep type/mode?
      setTitle('');
      setMessage('');
      setSelectedDriverIds([]);
    },
    onError: (error) => {
      setSendResult({ type: 'error', message: 'Erro ao iniciar envio: ' + error.message });
      setSendingProgress(null);
    }
  });

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      setSendResult({ type: 'error', message: 'Título e mensagem são obrigatórios.' });
      return;
    }

    let targetDrivers = [];
    if (recipientMode === 'all') {
      targetDrivers = drivers;
    } else {
      if (selectedDriverIds.length === 0) {
        setSendResult({ type: 'error', message: 'Selecione pelo menos um motorista.' });
        return;
      }
      targetDrivers = drivers.filter(d => selectedDriverIds.includes(d.id));
    }

    if (targetDrivers.length === 0) {
      setSendResult({ type: 'error', message: 'Nenhum motorista encontrado para envio.' });
      return;
    }

    if (confirm(`Confirma o envio desta mensagem para ${targetDrivers.length} motorista(s)?`)) {
      setSendResult(null);
      sendMutation.mutate(targetDrivers);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            Enviar Mensagens
          </h1>
          <p className="text-gray-600">Envie comunicados, alertas e avisos para seus motoristas.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Message Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conteúdo da Mensagem</CardTitle>
                <CardDescription>Defina o texto e a importância da comunicação.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input 
                    id="title" 
                    placeholder="Ex: Manutenção Preventiva, Aviso Importante..." 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Digite o conteúdo da mensagem aqui..." 
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Mensagem</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div 
                      className={`cursor-pointer border rounded-lg p-3 text-center transition-colors ${type === 'info' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-gray-50'}`}
                      onClick={() => setType('info')}
                    >
                      <div className="flex justify-center mb-1"><CheckCircle className="w-5 h-5 text-blue-500" /></div>
                      <div className="text-sm font-medium text-blue-700">Informativa</div>
                    </div>
                    <div 
                      className={`cursor-pointer border rounded-lg p-3 text-center transition-colors ${type === 'warning' ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' : 'hover:bg-gray-50'}`}
                      onClick={() => setType('warning')}
                    >
                      <div className="flex justify-center mb-1"><AlertCircle className="w-5 h-5 text-amber-500" /></div>
                      <div className="text-sm font-medium text-amber-700">Aviso</div>
                    </div>
                    <div 
                      className={`cursor-pointer border rounded-lg p-3 text-center transition-colors ${type === 'critical' ? 'bg-red-50 border-red-500 ring-1 ring-red-500' : 'hover:bg-gray-50'}`}
                      onClick={() => setType('critical')}
                    >
                      <div className="flex justify-center mb-1"><AlertCircle className="w-5 h-5 text-red-500" /></div>
                      <div className="text-sm font-medium text-red-700">Crítico</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="whatsapp" 
                      checked={sendWhatsApp}
                      onCheckedChange={setSendWhatsApp}
                    />
                    <Label htmlFor="whatsapp" className="flex items-center gap-2 cursor-pointer font-medium">
                      <MessageSquare className="w-4 h-4 text-green-600" />
                      Enviar também via WhatsApp
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-6 mt-1">
                    A mensagem será enviada para o WhatsApp cadastrado do motorista, se disponível.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Feedback Area */}
            {sendResult && (
              <Alert className={sendResult.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                {sendResult.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                <AlertDescription className={sendResult.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {sendResult.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Right Column: Recipients */}
          <div className="space-y-6">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Destinatários</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <RadioGroup value={recipientMode} onValueChange={setRecipientMode} className="mb-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="cursor-pointer">Todos os Motoristas Ativos ({drivers.length})</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="select" id="select" />
                    <Label htmlFor="select" className="cursor-pointer">Selecionar Manualmente</Label>
                  </div>
                </RadioGroup>

                {recipientMode === 'select' && (
                  <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
                    <div className="p-2 border-b bg-gray-50 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input 
                          placeholder="Buscar motorista..." 
                          className="pl-8 h-9 text-sm"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 text-xs">
                        <Button variant="ghost" size="sm" onClick={handleSelectAllFiltered} className="h-6 px-2">
                          Todos
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleDeselectAll} className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                          Limpar
                        </Button>
                        <div className="ml-auto text-gray-500 py-1">
                          {selectedDriverIds.length} selecionado(s)
                        </div>
                      </div>
                    </div>
                    <ScrollArea className="flex-1 h-[300px]">
                      <div className="p-2 space-y-1">
                        {isLoadingDrivers ? (
                          <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                        ) : filteredDrivers.length === 0 ? (
                          <div className="text-center text-gray-400 text-sm py-4">Nenhum motorista encontrado</div>
                        ) : (
                          filteredDrivers.map(driver => (
                            <div 
                              key={driver.id}
                              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${selectedDriverIds.includes(driver.id) ? 'bg-blue-50 border-blue-100' : 'hover:bg-gray-50'}`}
                              onClick={() => handleToggleDriver(driver.id)}
                            >
                              <Checkbox 
                                checked={selectedDriverIds.includes(driver.id)}
                                onCheckedChange={() => handleToggleDriver(driver.id)}
                                id={`driver-${driver.id}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{driver.name}</div>
                                <div className="text-xs text-gray-500">{driver.phone_number}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {recipientMode === 'all' && (
                  <div className="flex-1 flex items-center justify-center text-gray-500 text-sm bg-gray-50 rounded-lg border border-dashed p-8">
                    <p className="text-center">
                      A mensagem será enviada para todos os <strong>{drivers.length}</strong> motoristas ativos da sua frota.
                    </p>
                  </div>
                )}

                <div className="pt-4 mt-4 border-t">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 gap-2" 
                    size="lg"
                    onClick={handleSend}
                    disabled={sendMutation.isPending || (recipientMode === 'select' && selectedDriverIds.length === 0)}
                  >
                    {sendMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar Mensagem
                      </>
                    )}
                  </Button>
                  
                  {sendingProgress && (
                    <div className="mt-2 text-xs text-center text-gray-600">
                      Processando: {sendingProgress.current} de {sendingProgress.total}
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${(sendingProgress.current / sendingProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}