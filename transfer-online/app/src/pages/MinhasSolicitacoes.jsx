import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Calendar,
  MapPin,
  Clock,
  Eye,
  Loader2,
  Package,
  Building2,
  User,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Car,
  Receipt,
  Percent,
  DollarSign,
  Copy,
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ResponseTimer, { ElapsedTimeDisplay } from '../components/ResponseTimer';
import { Pagination } from '@/components/ui/Pagination';
import TripRatingDialog from '../components/TripRatingDialog';
import LiveTrackingMap from '../components/LiveTrackingMap';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import ServiceOrderPDFDialog from '../components/ServiceOrderPDFDialog';

// Função para buscar favoritos
const useFavoriteDriver = (driverId, userId) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check status inicial
  useEffect(() => {
    const checkStatus = async () => {
      if (!driverId || !userId) return;
      try {
        const favs = await base44.entities.FavoriteDriver.filter({ user_id: userId, driver_id: driverId });
        setIsFavorite(favs.length > 0);
      } catch (e) {
        console.error(e);
      }
    };
    checkStatus();
  }, [driverId, userId]);

  const toggleFavorite = async () => {
    if (!driverId) return;
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('toggleFavoriteDriver', { driver_id: driverId });
      if (response.data.success) {
        setIsFavorite(response.data.is_favorite);
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao favoritar motorista');
    } finally {
      setIsLoading(false);
    }
  };

  return { isFavorite, toggleFavorite, isLoading };
};

// Função para fazer parse correto de datas evitando problemas de timezone
const parseLocalDate = (dateString) => {
  if (!dateString) return new Date(); // Return current date if string is empty
  const [year, month, day] = dateString.split('-');
  // Months are 0-indexed in Date constructor, so subtract 1 from month
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

export default function MinhasSolicitacoes() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [requestToRate, setRequestToRate] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showPDFDialog, setShowPDFDialog] = useState(false);
  const [requestToExport, setRequestToExport] = useState(null);
  const navigate = useNavigate();

  // Estados de Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        if (!currentUser.client_id) {
          alert('Este recurso é exclusivo para usuários corporativos.');
          window.location.href = '/MinhasViagens';
          return;
        }

        setUser(currentUser);

        const clients = await base44.entities.Client.list();
        const userClient = clients.find(c => c.id === currentUser.client_id);
        
        if (!userClient) {
          alert('Cliente não encontrado.');
          window.location.href = '/';
          return;
        }

        setClient(userClient);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = '/AccessPortal?returnUrl=%2FMinhasSolicitacoes';
      }
    };

    checkAuth();
  }, []);

  const { data: serviceRequests = [], isLoading } = useQuery({
    queryKey: ['myServiceRequests', user?.id],
    queryFn: async () => {
      const allRequests = await base44.entities.ServiceRequest.list('-created_date');
      // Filtrar solicitações onde o usuário é o criador OU o passageiro
      return allRequests.filter(r => 
        r.user_id === user.id || r.passenger_user_id === user.id
      );
    },
    enabled: !!user,
    refetchInterval: 30000,
    initialData: []
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: []
  });

  const { data: supplierVehicles = [] } = useQuery({
    queryKey: ['supplierVehicles'],
    queryFn: () => base44.entities.SupplierVehicleType.list(),
    initialData: []
  });

  const { data: clientUsers = [] } = useQuery({
    queryKey: ['clientUsers', client?.id],
    queryFn: () => base44.entities.User.filter({ client_id: client.id }),
    enabled: !!client,
    initialData: []
  });

  // Função de filtragem e ordenação
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = [...serviceRequests];

    // Filtro por busca de texto (expandido com novos campos)
    if (searchTerm && searchTerm.length >= 1) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(r => {
        const supplier = suppliers.find(s => s.id === r.chosen_supplier_id);
        const vehicleType = supplierVehicles.find(v => v.id === r.chosen_vehicle_type_id);
        const requester = clientUsers && Array.isArray(clientUsers) ? clientUsers.find(u => u.id === r.user_id) : null;
        
        return (
          r.request_number?.toLowerCase().includes(search) ||
          r.origin?.toLowerCase().includes(search) ||
          r.destination?.toLowerCase().includes(search) ||
          r.passenger_name?.toLowerCase().includes(search) ||
          r.driver_name?.toLowerCase().includes(search) ||
          r.vehicle_model?.toLowerCase().includes(search) ||
          r.vehicle_plate?.toLowerCase().includes(search) ||
          supplier?.name?.toLowerCase().includes(search) ||
          vehicleType?.name?.toLowerCase().includes(search) ||
          requester?.full_name?.toLowerCase().includes(search) ||
          client?.name?.toLowerCase().includes(search)
        );
      });
    }

    // Filtro por status
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Filtro por tipo de serviço
    if (serviceTypeFilter && serviceTypeFilter !== 'all') {
      filtered = filtered.filter(r => r.service_type === serviceTypeFilter);
    }

    // Filtro por período
    if (periodFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(r => {
        const tripDate = parseLocalDate(r.date);
        tripDate.setHours(0, 0, 0, 0);
        
        switch(periodFilter) {
          case 'today':
            return tripDate.getTime() === today.getTime();
          case 'this_week': {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            return tripDate >= startOfWeek && tripDate <= endOfWeek;
          }
          case 'this_month': {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return tripDate >= startOfMonth && tripDate <= endOfMonth;
          }
          case 'last_3_months': {
            const threeMonthsAgo = new Date(today);
            threeMonthsAgo.setMonth(today.getMonth() - 3);
            threeMonthsAgo.setDate(1);
            const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return tripDate >= threeMonthsAgo && tripDate <= endOfCurrentMonth;
          }
          case 'custom': {
            if (!customStartDate || !customEndDate) return true;
            const start = parseLocalDate(customStartDate);
            start.setHours(0, 0, 0, 0);
            const end = parseLocalDate(customEndDate);
            end.setHours(23, 59, 59, 999);
            return tripDate >= start && tripDate <= end;
          }
          default:
            return true;
        }
      });
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'date_desc':
          return parseLocalDate(b.date) - parseLocalDate(a.date);
        case 'date_asc':
          return parseLocalDate(a.date) - parseLocalDate(b.date);
        case 'created_desc':
          return new Date(b.created_date) - new Date(a.created_date);
        case 'created_asc':
          return new Date(a.created_date) - new Date(b.created_date);
        case 'price_desc':
          return (b.chosen_client_price || 0) - (a.chosen_client_price || 0);
        case 'price_asc':
          return (a.chosen_client_price || 0) - (b.chosen_client_price || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [serviceRequests, searchTerm, statusFilter, serviceTypeFilter, periodFilter, customStartDate, customEndDate, sortBy, suppliers, supplierVehicles, clientUsers, client]);

  // Paginação
  const totalPages = Math.ceil(filteredAndSortedRequests.length / itemsPerPage);
  const paginatedRequests = filteredAndSortedRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, serviceTypeFilter, periodFilter, customStartDate, customEndDate, sortBy]);

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

  const handleOpenRatingDialog = (request) => {
    setRequestToRate(request);
    setShowRatingDialog(true);
  };

  const handleCloneRequest = (request) => {
    navigate(createPageUrl('SolicitarViagemCorporativa') + `?cloneId=${request.id}`);
  };

  const handleOpenPDFDialog = (request) => {
    setRequestToExport(request);
    setShowPDFDialog(true);
  };

  const handleCopyTripSummary = (request) => {
    const supplier = suppliers.find(s => s.id === request.chosen_supplier_id);
    const serviceTypeLabel = request.service_type === 'one_way' ? 'Só Ida' :
      request.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora';

    const lines = [
      `🚗 *Resumo da Viagem - ${request.request_number}*`,
      ``,
      `📅 Data: ${format(parseLocalDate(request.date), "dd/MM/yyyy", { locale: ptBR })} às ${request.time}`,
      `🗺️ Tipo: ${serviceTypeLabel}`,
      ``,
      `📍 Origem: ${request.origin}`,
      request.destination ? `📍 Destino: ${request.destination}` : null,
      ``,
      `👤 Passageiro: ${request.passenger_name || '-'}`,
      request.passenger_phone ? `📞 Telefone: ${request.passenger_phone}` : null,
    ];

    if (request.driver_name) {
      lines.push(``);
      lines.push(`🧑‍✈️ Motorista: ${request.driver_name}`);
      if (request.driver_phone) lines.push(`📞 Tel. Motorista: ${request.driver_phone}`);
      if (request.vehicle_model) lines.push(`🚙 Veículo: ${request.vehicle_model}${request.vehicle_plate ? ` - ${request.vehicle_plate.toUpperCase()}` : ''}`);
    }

    if (supplier) {
      lines.push(``);
      lines.push(`🏢 Fornecedor: ${supplier.name}`);
    }

    lines.push(``);
    lines.push(`💰 Valor: ${formatPrice(request.chosen_client_price || 0)}`);
    lines.push(`✅ Status: ${getStatusLabel(request.status)}`);

    const text = lines.filter(l => l !== null).join('\n');
    navigator.clipboard.writeText(text);
    alert('Resumo da viagem copiado para a área de transferência!');
  };

  const handleCopyTimelineLink = async (request) => {
    try {
      const response = await base44.functions.invoke('generateSharedTimelineLink', { 
        serviceRequestId: request.id,
        autoGenerated: false
      });
      
      if (response.data && response.data.link) {
        navigator.clipboard.writeText(response.data.link);
        alert('Link da linha do tempo copiado para a área de transferência!');
      } else {
        throw new Error(response.data?.error || 'Erro ao gerar link');
      }
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      alert('Não foi possível gerar o link da timeline.');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setServiceTypeFilter('all');
    setPeriodFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSortBy('date_desc');
    setCurrentPage(1);
  };

  // Gerar sugestões de busca
  useEffect(() => {
    if (searchTerm && searchTerm.length >= 3) {
      const search = searchTerm.toLowerCase().trim();
      const suggestions = new Set();
      
      serviceRequests.forEach(r => {
        const supplier = suppliers.find(s => s.id === r.chosen_supplier_id);
        const vehicleType = supplierVehicles.find(v => v.id === r.chosen_vehicle_type_id);
        const requester = clientUsers.find(u => u.id === r.user_id);
        
        if (r.request_number?.toLowerCase().includes(search)) suggestions.add(`📝 ${r.request_number}`);
        if (r.passenger_name?.toLowerCase().includes(search)) suggestions.add(`👤 ${r.passenger_name}`);
        if (r.driver_name?.toLowerCase().includes(search)) suggestions.add(`🚗 ${r.driver_name}`);
        if (supplier?.name?.toLowerCase().includes(search)) suggestions.add(`🏢 ${supplier.name}`);
        if (vehicleType?.name?.toLowerCase().includes(search)) suggestions.add(`🚙 ${vehicleType.name}`);
        if (requester?.full_name?.toLowerCase().includes(search)) suggestions.add(`👨‍💼 ${requester.full_name}`);
        if (r.origin?.toLowerCase().includes(search)) suggestions.add(`📍 ${r.origin}`);
        if (r.destination?.toLowerCase().includes(search)) suggestions.add(`📍 ${r.destination}`);
      });
      
      setSearchSuggestions(Array.from(suggestions).slice(0, 8));
      setShowSuggestions(true);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, serviceRequests, suppliers, supplierVehicles, clientUsers]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (statusFilter !== 'all') count++;
    if (serviceTypeFilter !== 'all') count++;
    if (periodFilter !== 'all') count++;
    if (periodFilter === 'custom' && (customStartDate || customEndDate)) count++;
    if (sortBy !== 'date_desc') count++;
    return count;
  }, [searchTerm, statusFilter, serviceTypeFilter, periodFilter, customStartDate, customEndDate, sortBy]);

  const pendingRequests = serviceRequests.filter(r => 
    r.status === 'aguardando_fornecedor' && r.supplier_response_status === 'aguardando_resposta'
  );
  
  const confirmedRequests = serviceRequests.filter(r => 
    r.status === 'confirmada' || r.status === 'em_andamento'
  );
  
  const completedRequests = serviceRequests.filter(r => 
    r.status === 'concluida' || r.status === 'cancelada'
  );

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Minhas Solicitações</h1>
          </div>
          <p className="text-gray-600">
            {client?.name} - Acompanhe suas solicitações de viagem
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{serviceRequests.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingRequests.length}</div>
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
              <div className="text-3xl font-bold">{confirmedRequests.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Finalizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedRequests.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Busca e Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Campo de Busca */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <Input
                  placeholder="Buscar por número, passageiro, solicitante, cliente, fornecedor, motorista, veículo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchTerm.length >= 3 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="pl-10"
                />
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {searchSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const cleanSuggestion = suggestion.replace(/^[📝👤🚗🏢🚙👨‍💼🏪📍]\s/, '');
                          setSearchTerm(cleanSuggestion);
                          setShowSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className="relative"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-2 bg-blue-600 text-white px-2 py-0.5 text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
                {activeFiltersCount > 0 && (
                  <Button
                    onClick={handleClearFilters}
                    variant="ghost"
                    size="icon"
                    title="Limpar todos os filtros"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Painel de Filtros Expandido */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="aguardando_fornecedor">Aguardando Fornecedor</SelectItem>
                      <SelectItem value="confirmada">Confirmada</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Tipo de Serviço</Label>
                  <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os Tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="one_way">Só Ida</SelectItem>
                      <SelectItem value="round_trip">Ida e Volta</SelectItem>
                      <SelectItem value="hourly">Por Hora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Ordenar Por</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_desc">Data da Viagem (Mais Recente)</SelectItem>
                      <SelectItem value="date_asc">Data da Viagem (Mais Antiga)</SelectItem>
                      <SelectItem value="created_desc">Criação (Mais Recente)</SelectItem>
                      <SelectItem value="created_asc">Criação (Mais Antiga)</SelectItem>
                      <SelectItem value="price_desc">Preço (Maior)</SelectItem>
                      <SelectItem value="price_asc">Preço (Menor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label className="text-sm font-semibold">Período da Viagem</Label>
                  <div className="grid md:grid-cols-4 gap-2">
                    <Select value={periodFilter} onValueChange={setPeriodFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os Períodos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Períodos</SelectItem>
                        <SelectItem value="today">Hoje</SelectItem>
                        <SelectItem value="this_week">Esta Semana</SelectItem>
                        <SelectItem value="this_month">Este Mês</SelectItem>
                        <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
                        <SelectItem value="custom">Período Personalizado</SelectItem>
                      </SelectContent>
                    </Select>

                    {periodFilter === 'custom' && (
                      <>
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          placeholder="Data Inicial"
                          className="md:col-span-1"
                        />
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          placeholder="Data Final"
                          className="md:col-span-1"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultados */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando suas solicitações...</p>
          </div>
        ) : (serviceRequests.length === 0) ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhuma solicitação encontrada
              </h3>
              <p className="text-gray-600 mb-6">
                Você ainda não fez nenhuma solicitação de viagem
              </p>
              <Button
                onClick={() => window.location.href = '/SolicitarViagemCorporativa'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Fazer Primeira Solicitação
              </Button>
            </CardContent>
          </Card>
        ) : (filteredAndSortedRequests.length === 0) ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum resultado encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                Tente ajustar os filtros ou termos de busca para encontrar suas solicitações.
              </p>
              <Button
                onClick={handleClearFilters}
                variant="outline"
              >
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Informações de Resultados */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                Mostrando {paginatedRequests.length} de {filteredAndSortedRequests.length} solicitações
                {activeFiltersCount > 0 && ` (${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''} ativo${activeFiltersCount > 1 ? 's' : ''})`}
              </p>
            </div>

            {/* Lista de Solicitações */}
            <ServiceRequestCards
              requests={paginatedRequests}
              suppliers={suppliers}
              onViewDetails={handleViewDetails}
              onCloneRequest={handleCloneRequest}
              formatPrice={formatPrice}
              getStatusColor={getStatusColor}
              getSupplierResponseColor={getSupplierResponseColor}
              getStatusLabel={getStatusLabel}
              getSupplierResponseLabel={getSupplierResponseLabel}
            />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}

        {/* Dialog de Detalhes */}
        {selectedRequest && (
          <ServiceRequestDetailsDialog
            request={selectedRequest}
            suppliers={suppliers}
            open={showDetailsDialog}
            onClose={() => setShowDetailsDialog(false)}
            onOpenRating={handleOpenRatingDialog}
            onCloneRequest={handleCloneRequest}
            formatPrice={formatPrice}
            getStatusColor={getStatusColor}
            getSupplierResponseColor={getSupplierResponseColor}
            getStatusLabel={getStatusLabel}
            getSupplierResponseLabel={getSupplierResponseLabel}
            onExportPDF={handleOpenPDFDialog}
            onCopyTimelineLink={handleCopyTimelineLink}
            onCopyTripSummary={handleCopyTripSummary}
          />
        )}

        {/* Dialog de Exportação de PDF */}
        <ServiceOrderPDFDialog
          serviceRequest={requestToExport}
          open={showPDFDialog}
          onClose={() => {
            setShowPDFDialog(false);
            setRequestToExport(null);
          }}
        />

        {/* Dialog de Avaliação */}
        <TripRatingDialog
          serviceRequest={requestToRate}
          open={showRatingDialog}
          onClose={() => {
            setShowRatingDialog(false);
            setRequestToRate(null);
          }}
        />
      </div>
    </div>
  );
}

function ServiceRequestCards({
  requests,
  suppliers,
  onViewDetails,
  onCloneRequest,
  formatPrice,
  getStatusColor,
  getSupplierResponseColor,
  getStatusLabel,
  getSupplierResponseLabel
}) {
  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">Nenhuma solicitação encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {requests.map((request) => {
        const supplier = suppliers.find(p => p.id === request.chosen_supplier_id);

        return (
          <Card key={request.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {request.request_number}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {request.service_type === 'one_way' ? 'Só Ida' :
                          request.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">De:</span>{' '}
                        <span className="text-gray-600">{request.origin}</span>
                      </div>
                    </div>
                    {request.destination && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Para:</span>{' '}
                          <span className="text-gray-600">{request.destination}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {format(parseLocalDate(request.date), "dd/MM/yyyy", { locale: ptBR })} às {request.time}
                      </span>
                    </div>
                    {supplier && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Fornecedor: <span className="font-medium">{supplier.name}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className={`${getStatusColor(request.status)} border`}>
                      {getStatusLabel(request.status)}
                    </Badge>
                    <Badge className={`${getSupplierResponseColor(request.supplier_response_status)}`}>
                      {getSupplierResponseLabel(request.supplier_response_status)}
                    </Badge>
                    
                    {request.supplier_response_status === 'aguardando_resposta' && request.supplier_request_sent_at && (
                      <ResponseTimer
                        requestSentAt={request.supplier_request_sent_at}
                        responseDeadline={request.supplier_response_deadline}
                        responseStatus={request.supplier_response_status}
                        compact={true}
                      />
                    )}
                    
                    {request.supplier_response_at && request.supplier_request_sent_at && (
                      <ElapsedTimeDisplay
                        requestSentAt={request.supplier_request_sent_at}
                        responseAt={request.supplier_response_at}
                      />
                    )}
                  </div>

                  {/* Mostrar dados do motorista se existirem, independentemente do status (se não for cancelada/rascunho) */}
                  {request.driver_name && request.driver_phone && request.status !== 'rascunho' && request.status !== 'cancelada' && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-900 text-sm">Motorista Designado</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Motorista:</span>{' '}
                          <span className="font-medium">{request.driver_name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Telefone:</span>{' '}
                          <a href={`tel:${request.driver_phone}`} className="font-medium text-blue-600 hover:text-blue-700">
                            {request.driver_phone}
                          </a>
                        </div>
                        <div>
                          <span className="text-gray-600">Veículo:</span>{' '}
                          <span className="font-medium">{request.vehicle_model}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Placa:</span>{' '}
                          <span className="font-medium uppercase">{request.vehicle_plate}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {request.supplier_response_status === 'aguardando_resposta' && request.supplier_response_deadline && (
                    <Alert className="mt-3 bg-amber-50 border-amber-200">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800 text-sm">
                        Aguardando resposta do fornecedor até{' '}
                        {format(new Date(request.supplier_response_deadline), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </AlertDescription>
                    </Alert>
                  )}

                  {request.supplier_response_status === 'aguardando_resposta' && request.supplier_request_sent_at && (
                    <div className="mt-3">
                      <ResponseTimer
                        requestSentAt={request.supplier_request_sent_at}
                        responseDeadline={request.supplier_response_deadline}
                        responseStatus={request.supplier_response_status}
                        compact={false}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3 lg:pl-4 lg:border-l">
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">Valor Total</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatPrice(request.chosen_client_price || 0)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <Button
                      onClick={() => onViewDetails(request)}
                      variant="outline"
                      className="w-full lg:w-auto"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                    <Button
                      onClick={() => onCloneRequest(request)}
                      variant="outline"
                      className="w-full lg:w-auto border-green-300 text-green-700 hover:bg-green-50"
                      title="Clonar esta solicitação para criar uma nova com os mesmos dados"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Clonar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ServiceRequestDetailsDialog({
  request,
  suppliers,
  open,
  onClose,
  onOpenRating,
  onCloneRequest,
  onExportPDF,
  onCopyTimelineLink,
  onCopyTripSummary,
  formatPrice,
  getStatusColor,
  getSupplierResponseColor,
  getStatusLabel,
  getSupplierResponseLabel
}) {
  const currentSupplier = suppliers.find(p => p.id === request.chosen_supplier_id);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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
          </div>

          {/* Informações da Viagem */}
          <div className="bg-blue-50 p-4 rounded-lg">
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
                {request.destination && (
                  <>
                    <span className="mx-2 text-gray-500">→</span>
                    <span className="font-semibold">{request.destination}</span>
                  </>
                )}
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
                  {format(parseLocalDate(request.date), "dd/MM/yyyy", { locale: ptBR })}
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

          {/* Seção de Rateio de Centros de Custo */}
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
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                Fornecedor
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Nome:</span>
                  <span className="font-semibold ml-2">{currentSupplier.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Preço:</span>
                  <span className="font-semibold ml-2 text-green-600">{formatPrice(request.chosen_client_price || 0)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <Badge className={`${getSupplierResponseColor(request.supplier_response_status)} ml-2`}>
                    {getSupplierResponseLabel(request.supplier_response_status)}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Informações do Motorista (se confirmado) */}
          {request.driver_name && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 text-green-900">Informações do Motorista</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-600">Nome:</span>
                    <span className="font-semibold ml-2">{request.driver_name}</span>
                  </div>
                  {request.driver_id && user && (
                    <FavoriteDriverButton driverId={request.driver_id} userId={user.id} />
                  )}
                </div>
                <div>
                  <span className="text-gray-600">Telefone:</span>
                  <a href={`tel:${request.driver_phone}`} className="font-semibold ml-2 text-blue-600 hover:text-blue-700">
                    {request.driver_phone}
                  </a>
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

          {/* Mapa de Rastreamento em Tempo Real */}
          {request.gps_tracking_enabled && ['a_caminho', 'passageiro_embarcou', 'a_caminho_destino'].includes(request.driver_trip_status) && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Rastreamento em Tempo Real
              </h3>
              <LiveTrackingMap serviceRequest={request} showDriverLocation={true} />
            </div>
          )}

          {/* Observações */}
          {request.notes && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-2">Observações</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{request.notes}</p>
            </div>
          )}

          {/* Botão de Avaliar e Enviar Link (se concluída e não avaliada) */}
          {(request.status === 'concluida' || request.driver_trip_status === 'finalizada') && !request.rating_submitted && (
            <div className="border-t pt-4">
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    ⭐ Avaliação da Viagem
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Como foi a experiência do passageiro?
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <Button
                      onClick={() => {
                        onClose();
                        onOpenRating(request);
                      }}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Avaliar Agora
                    </Button>
                    
                    <Button
                      onClick={async () => {
                        try {
                          const response = await base44.functions.invoke('generateAndSendRatingLink', {
                            serviceRequestId: request.id,
                            recipientEmail: request.passenger_email
                          });
                          if (response.data.success) {
                            alert('Link de avaliação enviado com sucesso para ' + request.passenger_email);
                          } else {
                            alert('Erro ao enviar link: ' + response.data.error);
                          }
                        } catch (error) {
                          alert('Erro ao enviar solicitação');
                        }
                      }}
                      variant="outline"
                      className="border-yellow-600 text-yellow-700 hover:bg-yellow-50 bg-white"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Enviar Link para Passageiro
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Mostrar avaliação se já foi enviada */}
          {request.rating_submitted && request.rating_id && (
            <div className="border-t pt-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-900">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Avaliação Enviada</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Obrigado por avaliar esta viagem!
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            onClick={() => onCopyTripSummary(request)} 
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar Resumo
          </Button>
          <Button 
            onClick={() => {
              onCopyTimelineLink(request);
            }} 
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Link da Timeline
          </Button>
          <Button 
            onClick={() => {
              onExportPDF(request);
            }} 
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <FileText className="w-4 h-4 mr-2" />
            Ordem de Serviço (PDF)
          </Button>
          <Button 
            onClick={() => {
              onClose();
              onCloneRequest(request);
            }} 
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            <Copy className="w-4 h-4 mr-2" />
            Clonar Solicitação
          </Button>
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FavoriteDriverButton({ driverId, userId }) {
  const { isFavorite, toggleFavorite, isLoading } = useFavoriteDriver(driverId, userId);
  // Lucide Heart icon
  const HeartIcon = ({ className, fill }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill={fill ? "currentColor" : "none"} 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`h-8 px-2 ${isFavorite ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'}`}
      title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <HeartIcon className="w-4 h-4 mr-1" fill={isFavorite} />
      <span className="text-xs">{isFavorite ? 'Favorito' : 'Favoritar'}</span>
    </Button>
  );
}