import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Package,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  User,
  Building2,
  Receipt,
  Percent,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ResponseTimer, { ElapsedTimeDisplay } from '../components/ResponseTimer';

export default function AcompanharSolicitacoes() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setUser(currentUser);
        setIsCheckingAuth(false);
      } catch (error) {
        window.location.href = '/AccessPortal?returnUrl=%2FAcompanharSolicitacoes';
      }
    };

    checkAuth();
  }, []);

  const { data: serviceRequests = [], isLoading } = useQuery({
    queryKey: ['serviceRequests'],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date'),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    initialData: []
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: []
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: []
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getStatusColor = (status) => {
    const colors = {
      rascunho: 'bg-gray-100 text-gray-800 border-gray-300',
      aguardando_fornecedor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      confirmada: 'bg-green-100 text-green-800 border-green-300',
      em_andamento: 'bg-blue-100 text-blue-800 border-blue-300',
      concluida: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      cancelada: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSupplierResponseColor = (status) => {
    const colors = {
      aguardando_escolha: 'bg-gray-100 text-gray-800',
      aguardando_resposta: 'bg-amber-100 text-amber-800',
      aceito: 'bg-green-100 text-green-800',
      recusado: 'bg-red-100 text-red-800',
      timeout: 'bg-orange-100 text-orange-800',
      cancelado: 'bg-gray-100 text-gray-800',
      confirmado: 'bg-emerald-100 text-emerald-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      rascunho: 'Rascunho',
      aguardando_fornecedor: 'Aguardando Fornecedor',
      confirmada: 'Confirmada',
      em_andamento: 'Em Andamento',
      concluida: 'Concluída',
      cancelada: 'Cancelada'
    };
    return labels[status] || status;
  };

  const getSupplierResponseLabel = (status) => {
    const labels = {
      aguardando_escolha: 'Aguardando Escolha',
      aguardando_resposta: 'Aguardando Resposta',
      aceito: 'Aceito',
      recusado: 'Recusado',
      timeout: 'Timeout',
      cancelado: 'Cancelado',
      confirmado: 'Confirmado'
    };
    return labels[status] || status;
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  // Filtrar por categorias
  const pendingRequests = serviceRequests.filter(r => 
    r.status === 'aguardando_fornecedor' && r.supplier_response_status === 'aguardando_resposta'
  );
  
  const confirmedRequests = serviceRequests.filter(r => 
    r.status === 'confirmada' || r.status === 'em_andamento'
  );
  
  const completedRequests = serviceRequests.filter(r => 
    r.status === 'concluida' || r.status === 'cancelada'
  );

  // Estatísticas
  const stats = {
    total: serviceRequests.length,
    pending: pendingRequests.length,
    confirmed: confirmedRequests.length,
    completed: completedRequests.length
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Acompanhar Solicitações (Módulo 2)
          </h1>
          <p className="text-gray-600">Monitore as solicitações de viagem dos clientes corporativos em tempo real</p>
        </div>

        {/* Estatísticas */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Total de Solicitações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Aguardando Fornecedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Confirmadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.confirmed}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Finalizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabelas por Status */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 gap-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendentes ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Confirmadas ({stats.confirmed})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Finalizadas ({stats.completed})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Solicitações Aguardando Resposta do Fornecedor</CardTitle>
              </CardHeader>
              <CardContent>
                <ServiceRequestTable
                  requests={pendingRequests}
                  clients={clients}
                  suppliers={suppliers}
                  onViewDetails={handleViewDetails}
                  formatPrice={formatPrice}
                  getStatusColor={getStatusColor}
                  getSupplierResponseColor={getSupplierResponseColor}
                  getStatusLabel={getStatusLabel}
                  getSupplierResponseLabel={getSupplierResponseLabel}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="confirmed">
            <Card>
              <CardHeader>
                <CardTitle>Solicitações Confirmadas e Em Andamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ServiceRequestTable
                  requests={confirmedRequests}
                  clients={clients}
                  suppliers={suppliers}
                  onViewDetails={handleViewDetails}
                  formatPrice={formatPrice}
                  getStatusColor={getStatusColor}
                  getSupplierResponseColor={getSupplierResponseColor}
                  getStatusLabel={getStatusLabel}
                  getSupplierResponseLabel={getSupplierResponseLabel}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card>
              <CardHeader>
                <CardTitle>Solicitações Concluídas e Canceladas</CardTitle>
              </CardHeader>
              <CardContent>
                <ServiceRequestTable
                  requests={completedRequests}
                  clients={clients}
                  suppliers={suppliers}
                  onViewDetails={handleViewDetails}
                  formatPrice={formatPrice}
                  getStatusColor={getStatusColor}
                  getSupplierResponseColor={getSupplierResponseColor}
                  getStatusLabel={getStatusLabel}
                  getSupplierResponseLabel={getSupplierResponseLabel}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de Detalhes */}
        {selectedRequest && (
          <ServiceRequestDetailsDialog
            request={selectedRequest}
            clients={clients}
            suppliers={suppliers}
            open={showDetailsDialog}
            onClose={() => setShowDetailsDialog(false)}
            formatPrice={formatPrice}
            getStatusColor={getStatusColor}
            getSupplierResponseColor={getSupplierResponseColor}
            getStatusLabel={getStatusLabel}
            getSupplierResponseLabel={getSupplierResponseLabel}
          />
        )}
      </div>
    </div>
  );
}

function ServiceRequestTable({
  requests,
  clients,
  suppliers,
  onViewDetails,
  formatPrice,
  getStatusColor,
  getSupplierResponseColor,
  getStatusLabel,
  getSupplierResponseLabel
}) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p>Nenhuma solicitação encontrada</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Nº Solicitação</TableHead>
            <TableHead className="font-semibold">Cliente</TableHead>
            <TableHead className="font-semibold">Rota</TableHead>
            <TableHead className="font-semibold">Data</TableHead>
            <TableHead className="font-semibold">Fornecedor</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Resp. Fornecedor</TableHead>
            <TableHead className="font-semibold">Tempo</TableHead>
            <TableHead className="font-semibold">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const client = clients.find(c => c.id === request.client_id);
            const supplier = suppliers.find(p => p.id === request.chosen_supplier_id);

            return (
              <TableRow key={request.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="font-mono font-semibold text-blue-600">
                    {request.request_number}
                  </div>
                  <div className="text-sm text-green-600 font-semibold mt-1">
                    {formatPrice(request.chosen_client_price || 0)}
                  </div>
                  {/* Badge de Notificação Pendente */}
                  {request.driver_name && (!request.driver_notification_sent_at || new Date(request.driver_info_last_updated_at || 0) > new Date(request.driver_notification_sent_at)) && (
                    <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 border-amber-200 text-[9px] whitespace-nowrap">
                      ⚠️ Notif. Pendente
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      {client?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">{request.passenger_name}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-xs">
                    <div className="font-medium truncate">{request.origin}</div>
                    <div className="text-gray-500 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      <span className="truncate">{request.destination}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{format(new Date(request.date), "dd/MM/yyyy", { locale: ptBR })}</div>
                    <div className="text-gray-500">{request.time}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {supplier ? (
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{supplier.name}</div>
                      {request.supplier_request_sent_at && (
                        <div className="text-xs text-gray-500">
                          Enviado: {format(new Date(request.supplier_request_sent_at), "dd/MM HH:mm", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={`${getStatusColor(request.status)} border text-xs`}>
                    {getStatusLabel(request.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={`${getSupplierResponseColor(request.supplier_response_status)} text-xs`}>
                    {getSupplierResponseLabel(request.supplier_response_status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {/* NOVO: Timer de Resposta */}
                  {request.supplier_response_status === 'aguardando_resposta' && request.supplier_request_sent_at ? (
                    <ResponseTimer
                      requestSentAt={request.supplier_request_sent_at}
                      responseDeadline={request.supplier_response_deadline}
                      responseStatus={request.supplier_response_status}
                      compact={true}
                    />
                  ) : request.supplier_response_at && request.supplier_request_sent_at ? (
                    <ElapsedTimeDisplay
                      requestSentAt={request.supplier_request_sent_at}
                      responseAt={request.supplier_response_at}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(request)}
                    title="Ver detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ServiceRequestDetailsDialog({
  request,
  clients,
  suppliers,
  open,
  onClose,
  formatPrice,
  getStatusColor,
  getSupplierResponseColor,
  getStatusLabel,
  getSupplierResponseLabel
}) {
  const client = clients.find(c => c.id === request.client_id);
  const currentSupplier = suppliers.find(p => p.id === request.chosen_supplier_id);
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [generatedTimelineLink, setGeneratedTimelineLink] = useState('');
  const [isGeneratingTimelineLink, setIsGeneratingTimelineLink] = useState(false);

  const handleGenerateTimelineLink = async () => {
    setIsGeneratingTimelineLink(true);
    try {
      const response = await base44.functions.invoke('generateSharedTimelineLink', {
        serviceRequestId: request.id,
        notificationType: 'none'
      });
      
      if (response.data.success) {
        setGeneratedTimelineLink(response.data.timelineUrl);
      } else {
        alert('Erro ao gerar link: ' + response.data.error);
      }
    } catch (error) {
      alert('Erro ao conectar com o servidor');
    } finally {
      setIsGeneratingTimelineLink(false);
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }) => {
      await base44.functions.invoke('updateDriverTripStatusManual', {
        serviceRequestId: request.id,
        newStatus: status
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['serviceRequests']);
      alert('Status atualizado com sucesso!');
      onClose();
    },
    onError: (error) => {
      alert('Erro ao atualizar status: ' + error.message);
    }
  });

  const handleStatusChange = (value) => {
    if (confirm(`Tem certeza que deseja alterar o status da viagem para "${value}"?`)) {
      updateStatusMutation.mutate({ status: value });
    }
  };

  const driverStatuses = [
    { value: 'aguardando', label: 'Aguardando' },
    { value: 'a_caminho', label: 'A Caminho' },
    { value: 'chegou_origem', label: 'Chegou na Origem' },
    { value: 'passageiro_embarcou', label: 'Passageiro Embarcou' },
    { value: 'parada_adicional', label: 'Parada Adicional' },
    { value: 'a_caminho_destino', label: 'A Caminho do Destino' },
    { value: 'chegou_destino', label: 'Chegou no Destino' },
    { value: 'finalizada', label: 'Finalizada' },
    { value: 'no_show', label: 'No Show' },
    { value: 'cancelada_motorista', label: 'Cancelada pelo Motorista' }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            Detalhes da Solicitação
            <Badge className="text-lg px-3 py-1">
              {request.request_number}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Geral */}
          <div className="flex flex-wrap gap-3">
            <Badge className={`${getStatusColor(request.status)} border text-base px-3 py-1`}>
              Status: {getStatusLabel(request.status)}
            </Badge>
            <Badge className={`${getSupplierResponseColor(request.supplier_response_status)} text-base px-3 py-1`}>
              Fornecedor: {getSupplierResponseLabel(request.supplier_response_status)}
            </Badge>
            {request.payment_status && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-300 border text-base px-3 py-1">
                Pagamento: {request.payment_status}
              </Badge>
            )}
          </div>

          {/* Informações do Cliente */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Cliente Corporativo
            </h3>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Nome:</span>
                <span className="font-semibold ml-2">{client?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Documento:</span>
                <span className="font-semibold ml-2">{client?.document_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Responsável:</span>
                <span className="font-semibold ml-2">{client?.contact_person_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Telefone:</span>
                <span className="font-semibold ml-2">{client?.contact_person_phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Informações da Viagem */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Informações da Viagem</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo:</span>
                <span className="font-medium">
                  {request.service_type === 'one_way' ? 'Só Ida' :
                    request.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Passageiros:</span>
                <span className="font-medium">{request.passengers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Idioma Motorista:</span>
                <span className="font-medium">
                  {request.driver_language === 'pt' ? 'Português' :
                    request.driver_language === 'en' ? 'English' : 'Español'}
                </span>
              </div>
            </div>
          </div>

          {/* Rota */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">Rota</span>
            </div>
            <div className="ml-7 bg-gray-50 p-3 rounded-lg">
              <div className="text-sm">
                <span className="font-semibold">{request.origin}</span>
                <span className="mx-2 text-gray-500">→</span>
                <span className="font-semibold">{request.destination}</span>
              </div>
              {request.distance_km > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Distância: {request.distance_km} km
                </p>
              )}
            </div>
          </div>

          {/* Data e Hora */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Data</div>
                <div className="font-semibold">
                  {format(new Date(request.date), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Horário</div>
                <div className="font-semibold">{request.time}</div>
              </div>
            </div>
          </div>

          {/* Dados do Passageiro */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-4">Dados do Passageiro</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Nome</div>
                  <div className="font-medium">{request.passenger_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="font-medium">{request.passenger_email}</div>
                </div>
              </div>
              {request.passenger_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Telefone</div>
                    <div className="font-medium">{request.passenger_phone}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* NOVO: Seção de Rateio de Centros de Custo */}
          {request.cost_allocation && request.cost_allocation.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-lg text-purple-900">Rateio de Centros de Custo</h3>
              </div>
              <div className="space-y-3">
                {request.cost_allocation.map((allocation, index) => (
                  <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-sm font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded">
                            {allocation.cost_center_code}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {allocation.cost_center_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          {allocation.allocation_type === 'percentage' ? (
                            <>
                              <div className="flex items-center gap-1 text-purple-600">
                                <Percent className="w-4 h-4" />
                                <span className="font-semibold">{allocation.allocation_value}%</span>
                              </div>
                              <span className="text-gray-400">•</span>
                              <span className="font-bold text-purple-700">
                                {formatPrice((request.chosen_client_price * allocation.allocation_value) / 100)}
                              </span>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-purple-600" />
                              <span className="font-bold text-purple-700">
                                {formatPrice(allocation.allocation_value)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Resumo do rateio */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-blue-900">Total da Viagem:</span>
                    <span className="text-xl font-bold text-blue-700">
                      {formatPrice(request.chosen_client_price)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fornecedor Atual */}
          {currentSupplier && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                Fornecedor Atual
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Nome:</span>
                  <span className="font-semibold ml-2">{currentSupplier.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Custo do Fornecedor:</span>
                  <span className="font-semibold ml-2">{formatPrice(request.chosen_supplier_cost || 0)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Preço para Cliente:</span>
                  <span className="font-semibold ml-2 text-green-600">{formatPrice(request.chosen_client_price || 0)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <Badge className={`${getSupplierResponseColor(request.supplier_response_status)} ml-2`}>
                    {getSupplierResponseLabel(request.supplier_response_status)}
                  </Badge>
                </div>
                {request.supplier_request_sent_at && (
                  <div>
                    <span className="text-gray-600">Solicitação enviada:</span>
                    <span className="ml-2">{format(new Date(request.supplier_request_sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                )}
                {request.supplier_response_at && (
                  <div>
                    <span className="text-gray-600">Resposta recebida:</span>
                    <span className="ml-2">{format(new Date(request.supplier_response_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Histórico de Fallback */}
          {request.fallback_history && request.fallback_history.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-4">Histórico de Tentativas</h3>
              <div className="space-y-2">
                {request.fallback_history.map((entry, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-lg text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{entry.supplier_name}</span>
                      <Badge className={entry.status === 'aceito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {entry.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      Enviado: {format(new Date(entry.sent_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      {entry.response_at && ` • Respondido: ${format(new Date(entry.response_at), "dd/MM 'às' HH:mm", { locale: ptBR })}`}
                    </div>
                    {entry.reason && (
                      <div className="text-xs text-gray-600 mt-1">
                        Motivo: {entry.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          {request.notes && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-2">Observações</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{request.notes}</p>
            </div>
          )}

          {/* Informações do Motorista (se confirmado) */}
          {request.driver_name && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 text-green-900">Informações do Motorista</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Nome:</span>
                  <span className="font-semibold ml-2">{request.driver_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Telefone:</span>
                  <span className="font-semibold ml-2">{request.driver_phone}</span>
                </div>
                <div>
                  <span className="text-gray-600">Veículo:</span>
                  <span className="font-semibold ml-2">{request.vehicle_model}</span>
                </div>
                <div>
                  <span className="text-gray-600">Placa:</span>
                  <span className="font-semibold ml-2 uppercase">{request.vehicle_plate}</span>
                </div>
              </div>
            </div>
          )}

          {/* Controle Manual de Status (Admin) */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3 text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Controle Manual de Status
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-sm text-gray-600 mb-3">
                Use esta opção para alterar o status da viagem manualmente caso o motorista não consiga fazê-lo pelo aplicativo.
              </p>
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Status Atual do Motorista</Label>
                  <div className="font-medium px-3 py-2 bg-white border rounded-md">
                    {driverStatuses.find(s => s.value === request.driver_trip_status)?.label || request.driver_trip_status || 'Aguardando'}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Alterar Para</Label>
                  <Select onValueChange={handleStatusChange} disabled={updateStatusMutation.isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar novo status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {driverStatuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Link da Timeline (Novo) */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3 text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Link Público de Acompanhamento
            </h3>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              {!generatedTimelineLink ? (
                <Button
                  onClick={handleGenerateTimelineLink}
                  disabled={isGeneratingTimelineLink}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {isGeneratingTimelineLink ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando Link...
                    </>
                  ) : (
                    'Gerar Link da Timeline'
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={generatedTimelineLink} 
                      className="text-sm bg-white"
                    />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedTimelineLink);
                        alert('Link copiado!');
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-blue-700">
                    Este link permite que qualquer pessoa acompanhe o status da viagem em tempo real.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}