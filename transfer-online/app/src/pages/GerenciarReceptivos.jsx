import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Plane,
  Clock,
  User,
  Car,
  Share2,
  Mail,
  MessageSquare,
  Copy,
  CheckCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  Activity,
  MapPin,
  Phone,
  Send,
  Building2,
  Ban,
  CalendarClock,
  Link as LinkIcon,
  Search,
  XCircle,
  ImageIcon,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, subDays, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ptBR } from 'date-fns/locale';
import { BrowserService } from '@/native';

export default function GerenciarReceptivos() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [supplier, setSupplier] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        const isAdmin = currentUser.role === 'admin';
        const isSupplier = currentUser.supplier_id && !isAdmin;
        
        if (!isSupplier) {
          alert('Acesso restrito a fornecedores.');
          window.location.href = '/';
          return;
        }

        setUser(currentUser);

        const suppliers = await base44.entities.Supplier.list();
        const supplierData = suppliers.find(p => p.id === currentUser.supplier_id);
        
        if (!supplierData) {
          alert('Dados do fornecedor não encontrados.');
          window.location.href = '/';
          return;
        }

        // Verify supplier features permissions
        if (!supplierData.features?.receptive_management) {
          alert('Esta funcionalidade não está disponível no seu plano atual. Entre em contato com o suporte para fazer o upgrade.');
          window.location.href = '/DashboardFornecedor';
          return;
        }

        setSupplier(supplierData);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Gerenciar Receptivos
          </h1>
          <p className="text-gray-600">{supplier?.name} - Gestão completa de receptivos</p>
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Gerar Listas / Distribuir
            </TabsTrigger>
            <TabsTrigger value="monitor" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Monitoramento (Realizados)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            <ReceptiveGeneratorTab user={user} supplier={supplier} />
          </TabsContent>

          <TabsContent value="monitor">
            <ReceptiveMonitoringTab user={user} supplier={supplier} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function ReceptiveGeneratorTab({ user, supplier }) {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorContact, setCoordinatorContact] = useState('');
  const [coordinatorPaymentAmount, setCoordinatorPaymentAmount] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingList, setEditingList] = useState(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Buscar todos os clientes
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => base44.entities.Client.list(),
    enabled: !!user?.supplier_id,
    initialData: []
  });

  // Buscar todas as listas compartilhadas anteriores
  const { data: sharedLists = [] } = useQuery({
    queryKey: ['sharedReceptiveLists', user?.supplier_id],
    queryFn: async () => {
      if (!user?.supplier_id) return [];
      return await base44.entities.SharedReceptiveList.filter({ 
        supplier_id: user.supplier_id 
      });
    },
    enabled: !!user?.supplier_id,
    initialData: []
  });

  // Criar um Set com todos os IDs já compartilhados
  const sharedRequestIds = useMemo(() => {
    const ids = new Set();
    sharedLists.forEach(list => {
      list.request_ids?.forEach(id => ids.add(id));
    });
    return ids;
  }, [sharedLists]);

  // Buscar solicitações do fornecedor no período
  const { data: allRequests = [], isLoading, refetch } = useQuery({
    queryKey: ['receptiveRequests', user?.supplier_id, startDate, endDate],
    queryFn: async () => {
      if (!user?.supplier_id) return [];
      
      const [serviceRequests, ownBookings, b2cBookings] = await Promise.all([
        base44.entities.ServiceRequest.filter({ 
          chosen_supplier_id: user.supplier_id,
          date: { $gte: startDate, $lte: endDate }
        }, undefined, 1000),
        base44.entities.SupplierOwnBooking.filter({
          supplier_id: user.supplier_id,
          date: { $gte: startDate, $lte: endDate }
        }, undefined, 1000),
        base44.entities.Booking.filter({
          supplier_id: user.supplier_id,
          date: { $gte: startDate, $lte: endDate }
        }, undefined, 1000)
      ]);

      const normalizedOwnBookings = ownBookings.map(booking => ({
        ...booking,
        id: booking.id,
        request_number: booking.booking_number,
        passenger_name: booking.passenger_name || (booking.passengers_details?.[0]?.name) || 'Passageiro',
        passenger_phone: booking.passenger_phone || (booking.passengers_details?.[0]?.phone_number) || '',
        supplier_response_status: 'confirmado',
        client_id: booking.client_id,
        type: 'supplier_own_booking'
      }));

      const normalizedB2CBookings = b2cBookings.map(booking => ({
        ...booking,
        id: booking.id,
        request_number: booking.booking_number,
        passenger_name: booking.customer_name,
        passenger_phone: booking.customer_phone,
        supplier_response_status: ['confirmada', 'concluida'].includes(booking.status) ? 'confirmado' : booking.status,
        type: 'booking_b2c',
        is_receptive_needed: true // Assumindo true para B2C se for aeroporto, será verificado abaixo
      }));

      const allTrips = [...serviceRequests, ...normalizedOwnBookings, ...normalizedB2CBookings];

      return allTrips.filter(r => {
        if (!r.date) return false;
        
        // Garante que pegamos apenas a parte da data YYYY-MM-DD para comparação
        const tripDate = r.date.substring(0, 10);
        const inPeriod = tripDate >= startDate && tripDate <= endDate;

        // Para B2C o status é diferente, mapeamos acima para 'confirmado' se 'confirmada'/'concluida'
        // Mas a verificação abaixo usa supplier_response_status
        // Para ServiceRequest: aguardando_escolha, aguardando_resposta, aceito, recusado...
        // Para OwnBooking: forçamos 'confirmado'
        // Para B2C: mapeamos 'confirmada'/'concluida' para 'confirmado'
        const isConfirmed = ['aceito', 'confirmado'].includes(r.supplier_response_status);
        
        // Verifica status global também
        const isNotCancelled = r.status !== 'cancelada' && r.status !== 'cancelado';

        // Removido filtro needsReceptive para exibir TODAS as viagens conforme solicitado
        return inPeriod && isConfirmed && isNotCancelled;
      }).sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        return timeA.localeCompare(timeB);
      });
    },
    enabled: !!user?.supplier_id && !!startDate && !!endDate,
    refetchInterval: 30000,
    initialData: []
  });

  const getClientName = (clientId) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.name || null;
  };

  const requestsByDate = useMemo(() => {
    const grouped = {};
    allRequests.forEach(request => {
      const dateKey = request.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(request);
    });
    return grouped;
  }, [allRequests]);

  const isAirportOrigin = (address) => {
    if (!address) return false;
    const lower = address.toLowerCase();
    return lower.includes('aeroporto') || lower.includes('airport') || lower.includes('gru') || lower.includes('guarulhos');
  };

  const handleToggleRequest = (requestId) => {
    setSelectedRequests(prev => {
      if (prev.includes(requestId)) {
        return prev.filter(id => id !== requestId);
      } else {
        return [...prev, requestId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === allRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(allRequests.map(r => r.id));
    }
  };

  const handleGenerateLink = async () => {
    if (selectedRequests.length === 0) {
      setError('Selecione pelo menos uma solicitação');
      return;
    }

    setError('');
    setSuccess('');
    setIsGenerating(true);

    try {
      const response = await base44.functions.invoke('generateReceptiveListToken', {
        serviceRequestIds: selectedRequests,
        coordinatorName: coordinatorName.trim() || null,
        coordinatorContact: coordinatorContact.trim() || null,
        coordinatorPaymentAmount: coordinatorPaymentAmount ? parseFloat(coordinatorPaymentAmount) : null,
        shareType: 'both'
      });

      if (response.data.success) {
        setGeneratedLink(response.data.shareUrl);
        setSuccess(`Link gerado com sucesso! Expira em: ${format(parseISO(response.data.expiresAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`);
        setSelectedRequests([]);
        refetch();
        queryClient.invalidateQueries({ queryKey: ['sharedReceptiveLists'] });
      } else {
        throw new Error(response.data.error || 'Erro ao gerar link');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao gerar link de compartilhamento');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setSuccess('Link copiado para a área de transferência!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `📋 *Lista de Receptivos - ${supplier?.name}*\n\n` +
      `Período: ${format(parseISO(startDate), "dd/MM/yyyy", { locale: ptBR })} a ${format(parseISO(endDate), "dd/MM/yyyy", { locale: ptBR })}\n` +
      `${selectedRequests.length} transfer(s)\n\n` +
      `Acesse a lista completa:\n${generatedLink}\n\n` +
      `⏰ Link válido por 24h após o último transfer`
    );
    BrowserService.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleShareEmail = async () => {
    if (!coordinatorContact || !coordinatorContact.includes('@')) {
      setError('Informe um e-mail válido do coordenador');
      return;
    }

    try {
      await base44.integrations.Core.SendEmail({
        to: coordinatorContact,
        subject: `Lista de Receptivos - ${format(parseISO(startDate), "dd/MM/yyyy", { locale: ptBR })} a ${format(parseISO(endDate), "dd/MM/yyyy", { locale: ptBR })}`,
        body: `
          <h2>📋 Lista de Receptivos</h2>
          <p><strong>Fornecedor:</strong> ${supplier?.name}</p>
          <p><strong>Período:</strong> ${format(parseISO(startDate), "dd/MM/yyyy", { locale: ptBR })} a ${format(parseISO(endDate), "dd/MM/yyyy", { locale: ptBR })}</p>
          <p>
            <a href="${generatedLink}">Acessar Lista de Receptivos</a>
          </p>
        `
      });

      setSuccess('E-mail enviado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erro ao enviar e-mail: ' + err.message);
    }
  };

  const handleToggleActive = async (listId, currentStatus) => {
    if (!confirm(currentStatus ? 'Deseja bloquear este link?' : 'Deseja desbloquear este link?')) return;
    
    setIsUpdating(true);
    try {
      const response = await base44.functions.invoke('toggleSharedListActive', {
        listId,
        active: !currentStatus
      });

      if (response.data.success) {
        setSuccess(currentStatus ? 'Link bloqueado.' : 'Link desbloqueado.');
        setTimeout(() => setSuccess(''), 3000);
        queryClient.invalidateQueries({ queryKey: ['sharedReceptiveLists'] });
      }
    } catch (err) {
      setError('Erro ao alterar status: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateValidity = async () => {
    if (!editingList || !newExpiryDate) return;

    setIsUpdating(true);
    try {
      const response = await base44.functions.invoke('updateSharedListValidity', {
        listId: editingList.id,
        newExpiryDate: new Date(newExpiryDate).toISOString()
      });

      if (response.data.success) {
        setSuccess('Validade atualizada.');
        setEditingList(null);
        setTimeout(() => setSuccess(''), 3000);
        queryClient.invalidateQueries({ queryKey: ['sharedReceptiveLists'] });
      }
    } catch (err) {
      setError('Erro ao atualizar validade: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const openValidityDialog = (list) => {
    setEditingList(list);
    const date = new Date(list.expires_at);
    const formatted = format(date, "yyyy-MM-dd'T'HH:mm");
    setNewExpiryDate(formatted);
  };

  const getReceptivityBadge = (status) => {
    const badges = {
      pendente: <Badge className="bg-gray-100 text-gray-800">Pendente</Badge>,
      efetuada: <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Efetuada</Badge>,
      nao_efetuada: <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Não Efetuada</Badge>
    };
    return badges[status] || badges.pendente;
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Filtros e Seleção de Período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Selecionar Período e Viagens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSelectedRequests([]);
                  setGeneratedLink('');
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSelectedRequests([]);
                  setGeneratedLink('');
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSelectAll}
                variant="outline"
                className="w-full"
                disabled={allRequests.length === 0}
              >
                {selectedRequests.length === allRequests.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              <strong>{allRequests.length}</strong> viagen(s) encontrada(s) • 
              <strong className="text-blue-600 ml-2">{selectedRequests.length}</strong> selecionada(s)
            </div>
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                {allRequests.filter(r => sharedRequestIds.has(r.id)).length} já compartilhada(s)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gerenciamento de Links Ativos */}
      {sharedLists.length > 0 && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-purple-600" />
              Links Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
              {sharedLists
                .sort((a, b) => new Date(b.shared_at) - new Date(a.shared_at))
                .map(list => (
                  <SharedListItem 
                    key={list.id} 
                    list={list} 
                    onToggleActive={handleToggleActive}
                    onUpdateValidity={() => openValidityDialog(list)}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Viagens */}
      <Card>
        <CardHeader>
          <CardTitle>
            Viagens Disponíveis para Agrupamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Carregando viagens...</p>
            </div>
          ) : allRequests.length === 0 ? (
            <div className="text-center py-12">
              <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">
                Nenhuma viagem encontrada
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(requestsByDate)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([dateKey, requests]) => (
                  <div key={dateKey} className="border-2 border-blue-200 rounded-lg p-5 bg-gradient-to-r from-blue-50 to-transparent">
                    <h2 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-3">
                      <CalendarIcon className="w-6 h-6" />
                      {format(parseISO(dateKey), "dd/MM/yyyy", { locale: ptBR })}
                      <Badge variant="outline" className="ml-2">{requests.length}</Badge>
                    </h2>

                    <div className="space-y-3">
                      {requests.map((request) => {
                        const wasShared = sharedRequestIds.has(request.id);
                        
                        return (
                          <Card key={request.id} className={`${wasShared ? 'bg-purple-50 border-2 border-purple-300' : 'bg-white'} hover:shadow-md transition-shadow`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <Checkbox
                                  checked={selectedRequests.includes(request.id)}
                                  onCheckedChange={() => handleToggleRequest(request.id)}
                                  className="mt-1"
                                />
                                
                                <div className="flex-1 grid md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-bold text-blue-600">
                                        {request.request_number}
                                      </span>
                                      {getReceptivityBadge(request.receptivity_status)}
                                      {wasShared && (
                                        <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                                          <Send className="w-3 h-3 mr-1" />
                                          Já Enviado
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-sm">
                                      <Clock className="w-4 h-4 text-gray-400" />
                                      <span className="font-bold text-lg">{request.time}</span>
                                      {request.origin_flight_number && (
                                        <>
                                          <span className="text-gray-400">•</span>
                                          <Plane className="w-4 h-4 text-blue-600" />
                                          <span className="font-semibold text-blue-600">
                                            {request.origin_flight_number}
                                          </span>
                                        </>
                                      )}
                                    </div>

                                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
                                      <div className="flex items-start gap-2 text-sm">
                                        <User className="w-4 h-4 text-indigo-600 mt-0.5" />
                                        <div className="flex-1">
                                          <div className="font-semibold text-gray-900">{request.passenger_name}</div>
                                          {request.passengers > 1 && (
                                            <Badge variant="outline" className="mt-1 text-xs">
                                              {request.passengers} pax
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-sm space-y-1">
                                      <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                                        <span>{request.origin}</span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                                        <span>{request.destination}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-2 bg-green-50 rounded-lg p-3">
                                    {request.driver_name ? (
                                      <>
                                        <div className="flex items-center gap-2 text-sm">
                                          <Car className="w-4 h-4 text-green-600" />
                                          <span className="font-semibold text-green-900">
                                            Motorista Atribuído
                                          </span>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                          <div className="font-medium">{request.driver_name}</div>
                                          <div className="text-xs text-gray-600 font-mono">
                                            {request.vehicle_model} • {request.vehicle_plate}
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="flex items-center gap-2 text-sm text-orange-700">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="font-semibold">Motorista não atribuído</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário de Compartilhamento */}
      {selectedRequests.length > 0 && (
        <Card className="fixed bottom-0 left-0 right-0 z-50 border-t shadow-lg md:relative md:border md:shadow-sm md:z-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-purple-600" />
              Gerar Link ({selectedRequests.length} selecionados)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Coordenador (Opcional)</Label>
                <Input
                  value={coordinatorName}
                  onChange={(e) => setCoordinatorName(e.target.value)}
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor a Pagar (Opcional)</Label>
                <Input
                  type="number"
                  value={coordinatorPaymentAmount}
                  onChange={(e) => setCoordinatorPaymentAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            <Button
              onClick={handleGenerateLink}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar Link de Compartilhamento'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Link Gerado */}
      {generatedLink && (
        <Card className="border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Link Gerado!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={generatedLink} readOnly className="bg-white" />
              <Button onClick={handleCopyLink} variant="outline">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Button onClick={handleShareWhatsApp} className="bg-green-600 hover:bg-green-700">
                <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
              </Button>
              <Button onClick={handleShareEmail} className="bg-blue-600 hover:bg-blue-700">
                <Mail className="w-4 h-4 mr-2" /> E-mail
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingList} onOpenChange={(open) => !open && setEditingList(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Validade</DialogTitle>
            <DialogDescription>Nova data limite para acesso ao link.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              type="datetime-local" 
              value={newExpiryDate}
              onChange={(e) => setNewExpiryDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingList(null)}>Cancelar</Button>
            <Button onClick={handleUpdateValidity} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceptiveMonitoringTab({ user }) {
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [requestCoordinators, setRequestCoordinators] = useState({});
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    status: 'all', 
    clientId: 'all',
    searchTerm: ''
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!user?.supplier_id) return;

        const [platformClients, ownClients] = await Promise.all([
          base44.entities.Client.list(),
          base44.entities.SupplierOwnClient.filter({ supplier_id: user.supplier_id })
        ]);

        const combinedClients = [...platformClients, ...ownClients].sort((a, b) => a.name.localeCompare(b.name));
        setClients(combinedClients);

        await fetchRequests(user.supplier_id);
      } catch (error) {
        console.error('Erro ao inicializar:', error);
        setIsLoading(false);
      }
    };

    initialize();
  }, [user]);

  const fetchRequests = async (supplierId) => {
    setIsLoading(true);
    try {
      const [serviceRequests, ownBookings, b2cBookings, sharedLists] = await Promise.all([
        base44.entities.ServiceRequest.filter({
          chosen_supplier_id: supplierId,
          status: { $in: ['confirmada', 'em_andamento', 'concluida', 'aguardando_revisao_fornecedor'] }
        }),
        base44.entities.SupplierOwnBooking.filter({
          supplier_id: supplierId,
          status: { $in: ['confirmada', 'em_andamento', 'concluida'] }
        }),
        base44.entities.Booking.filter({
          supplier_id: supplierId,
          status: { $in: ['confirmada', 'concluida'] }
        }),
        base44.entities.SharedReceptiveList.filter({
          supplier_id: supplierId
        })
      ]);

      const coordinatorsMap = {};
      if (sharedLists && sharedLists.length > 0) {
        sharedLists.forEach(list => {
          if (list.coordinator_name && list.request_ids) {
            list.request_ids.forEach(reqId => {
              coordinatorsMap[reqId] = list.coordinator_name;
            });
          }
        });
      }
      setRequestCoordinators(coordinatorsMap);

      const normalizedOwnBookings = ownBookings.map(b => ({
        ...b,
        request_number: b.booking_number,
        is_own_booking: true
      }));

      const normalizedB2CBookings = b2cBookings.map(b => ({
        ...b,
        request_number: b.booking_number,
        passenger_name: b.customer_name,
        passenger_phone: b.customer_phone,
        is_b2c_booking: true
      }));

      setRequests([...serviceRequests, ...normalizedOwnBookings, ...normalizedB2CBookings]);
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (filters.startDate && filters.endDate) {
        if (req.date < filters.startDate || req.date > filters.endDate) return false;
      }

      if (filters.status !== 'all') {
        if (filters.status === 'pendente' && !req.receptivity_status) {
           // passa
        } else if (req.receptivity_status !== filters.status) {
           return false;
        }
      }

      if (filters.clientId !== 'all' && req.client_id !== filters.clientId) return false;

      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const searchMatch = 
          req.request_number?.toLowerCase().includes(term) ||
          req.passenger_name?.toLowerCase().includes(term) ||
          req.origin?.toLowerCase().includes(term) ||
          req.origin_flight_number?.toLowerCase().includes(term);
        if (!searchMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateB - dateA;
    });
  }, [requests, filters]);

  const getClientName = (clientId) => {
    return clients.find(c => c.id === clientId)?.name || 'Cliente não encontrado';
  };

  const getReceptivityBadge = (status) => {
    switch (status) {
      case 'efetuada':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Efetuada</Badge>;
      case 'nao_efetuada':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Não Efetuada</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(val) => setFilters(prev => ({ ...prev, status: val }))}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="efetuada">Efetuada</SelectItem>
                  <SelectItem value="nao_efetuada">Não Efetuada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={filters.clientId} onValueChange={(val) => setFilters(prev => ({ ...prev, clientId: val }))}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input placeholder="Nº, Passageiro..." className="pl-8" value={filters.searchTerm} onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <Plane className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum receptivo encontrado</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(request => (
            <Card key={request.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
              <CardHeader className="pb-2 bg-gray-50/50 border-b border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-blue-700 border-blue-200 bg-blue-50">{request.request_number}</Badge>
                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      {format(parseISO(request.date), "dd/MM/yyyy")} | {request.time}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 mr-2">Status:</span>
                    {getReceptivityBadge(request.receptivity_status || 'pendente')}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-5 space-y-3 border-r-0 md:border-r border-gray-100 pr-0 md:pr-4">
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Origem</p>
                          <p className="text-sm font-medium text-gray-900">{request.origin}</p>
                          {request.origin_flight_number && <Badge variant="secondary" className="mt-1 text-[10px]">Voo: {request.origin_flight_number}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-start gap-2 mt-2">
                        <MapPin className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Destino</p>
                          <p className="text-sm font-medium text-gray-900">{request.destination}</p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 mt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Cliente:</span>
                        <span className="font-medium">{getClientName(request.client_id)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-7 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Check-in</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                          {(() => {
                            let passengers = request.passenger_receptivity_statuses || [];
                            if (passengers.length === 0) {
                               if (request.passengers_details && request.passengers_details.length > 0) {
                                  passengers = request.passengers_details.map(p => ({ name: p.name, status: 'pending' }));
                               } else {
                                  passengers = [{ name: request.passenger_name, status: 'pending' }];
                               }
                            }
                            return passengers.map((p, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-gray-100 shadow-sm">
                                <span className="font-medium text-gray-700 truncate max-w-[120px]" title={p.name}>{p.name}</span>
                                <div className="flex items-center">
                                  {p.status === 'arrived' && <Badge className="bg-green-100 text-green-800 h-5 text-[10px]">Chegou</Badge>}
                                  {p.status === 'no_show' && <Badge className="bg-red-100 text-red-800 h-5 text-[10px]">No Show</Badge>}
                                  {p.status === 'pending' && <Badge className="bg-gray-100 text-gray-600 h-5 text-[10px]">Pendente</Badge>}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {requestCoordinators[request.id] && (
                          <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 mb-3">
                            <h4 className="text-xs font-bold text-purple-700 uppercase mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Coordenador</h4>
                            <p className="text-sm font-medium text-purple-900">{requestCoordinators[request.id]}</p>
                          </div>
                        )}
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                          <h4 className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-1"><Car className="w-3 h-3" /> Motorista</h4>
                          {request.driver_name ? (
                            <div className="text-sm">
                              <p className="font-bold text-gray-900">{request.driver_name}</p>
                              <p className="text-gray-600 text-xs">{request.vehicle_model} • {request.vehicle_plate}</p>
                              <p className="text-gray-500 text-xs mt-1">{request.driver_phone}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 italic">Motorista não atribuído</p>
                          )}
                        </div>
                        {request.receptive_sign_url && (
                          <div className="flex items-center gap-2 text-xs">
                            <ImageIcon className="w-3 h-3 text-blue-600" />
                            <a href={request.receptive_sign_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Ver Placa</a>
                          </div>
                        )}
                        {request.receptivity_status === 'nao_efetuada' && request.receptivity_not_completed_reason && (
                          <div className="bg-red-50 p-2 rounded border border-red-100 mt-1 text-xs">
                            <p className="font-bold text-red-700 mb-0.5">Motivo:</p>
                            <p className="text-red-600">{request.receptivity_not_completed_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SharedListItem({ list, onToggleActive, onUpdateValidity }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleToggle = async () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    
    if (nextState && trips.length === 0 && list.request_ids?.length > 0) {
      setIsLoading(true);
      try {
        const [reqs, owns, b2c] = await Promise.all([
           base44.entities.ServiceRequest.filter({ id: { $in: list.request_ids } }),
           base44.entities.SupplierOwnBooking.filter({ id: { $in: list.request_ids } }),
           base44.entities.Booking.filter({ id: { $in: list.request_ids } })
        ]);
        
        const normalized = [
          ...reqs.map(r => ({ ...r, _type: 'SR', passenger: r.passenger_name, date: r.date, time: r.time, origin: r.origin, receptivity_status: r.receptivity_status })),
          ...owns.map(r => ({ ...r, _type: 'OWN', passenger: r.passenger_name || r.passengers_details?.[0]?.name, date: r.date, time: r.time, origin: r.origin, receptivity_status: r.receptivity_status })),
          ...b2c.map(r => ({ ...r, _type: 'B2C', passenger: r.customer_name, date: r.date, time: r.time, origin: r.origin, receptivity_status: 'confirmada' }))
        ].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        
        setTrips(normalized);
      } catch (e) {
        console.error("Error loading details", e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const copyLink = (e) => {
    e.stopPropagation();
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/ReceptiveListStatus?token=${list.token}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };
  
  const shareWhatsApp = (e) => {
     e.stopPropagation();
     const baseUrl = window.location.origin;
     const url = `${baseUrl}/ReceptiveListStatus?token=${list.token}`;
     const message = encodeURIComponent(`Acesse a lista de receptivos: ${url}`);
     BrowserService.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <div className={`rounded-lg border transition-all duration-200 ${list.active === false ? 'bg-gray-50 border-gray-200' : 'bg-white border-purple-100 shadow-sm hover:shadow-md'}`}>
      <div 
        className="p-4 flex flex-col md:flex-row justify-between gap-4 cursor-pointer"
        onClick={handleToggle}
      >
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-900">
              {list.coordinator_name || 'Sem Coordenador'}
            </span>
            {list.active === false ? (
              <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>
            ) : (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px]">Ativo</Badge>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Gerado: {format(parseISO(list.shared_at), "dd/MM/yyyy HH:mm")}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 hover:bg-purple-200">
              {list.request_ids?.length || 0} viagem(ns)
            </Badge>
            <span className="text-xs text-blue-600 font-medium flex items-center">
              {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              {isExpanded ? 'Ocultar detalhes' : 'Ver viagens'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-center" onClick={e => e.stopPropagation()}>
          <Button 
            size="sm" 
            variant="outline"
            className="h-8 text-xs"
            onClick={copyLink}
          >
            {copySuccess ? <CheckCircle className="w-3 h-3 mr-1 text-green-600" /> : <Copy className="w-3 h-3 mr-1" />}
            {copySuccess ? 'Copiado!' : 'Copiar'}
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            className="h-8 text-xs text-green-600 border-green-200 hover:bg-green-50"
            onClick={shareWhatsApp}
          >
            <MessageSquare className="w-3 h-3 mr-1" /> Whats
          </Button>

          <Button 
            size="sm" 
            variant="outline"
            className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={(e) => { e.stopPropagation(); onUpdateValidity(); }}
          >
            <CalendarClock className="w-3 h-3 mr-1" /> Validade
          </Button>

          <Button 
            size="sm" 
            variant={list.active === false ? "default" : "destructive"}
            className={`h-8 text-xs ${list.active === false ? 'bg-green-600 hover:bg-green-700' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleActive(list.id, list.active !== false); }}
          >
            {list.active === false ? (
              <><CheckCircle className="w-3 h-3 mr-1" /> Desbloquear</>
            ) : (
              <><Ban className="w-3 h-3 mr-1" /> Bloquear</>
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50 rounded-b-lg animate-in slide-in-from-top-2 duration-200">
          <div className="pt-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Viagens nesta lista</h4>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : trips.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {trips.map((trip, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-gray-100 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-50 text-blue-700 font-mono text-xs px-2 py-1 rounded">
                        {format(parseISO(trip.date), "dd/MM")} {trip.time}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1">{trip.passenger}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{trip.origin}</p>
                      </div>
                    </div>
                    {trip.receptivity_status && (
                       <Badge variant="outline" className="text-[10px] shrink-0">
                         {trip.receptivity_status === 'efetuada' ? 'Efetuada' : 'Pendente'}
                       </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Nenhuma viagem encontrada.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}