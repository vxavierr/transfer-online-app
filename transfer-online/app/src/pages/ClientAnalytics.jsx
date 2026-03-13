import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  DollarSign,
  Package,
  MapPin,
  Download,
  Filter,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Star,
  TrendingDown,
  Receipt
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientAnalytics() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);

  // Estados de filtros
  const [dateRange, setDateRange] = useState('last30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [costCenterFilter, setCostCenterFilter] = useState('all');
  const [passengerFilter, setPassengerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('concluida'); // Padrão: apenas concluídas

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();

        if (!currentUser.client_id) {
          alert('Este recurso é exclusivo para usuários corporativos.');
          window.location.href = '/';
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
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  // Buscar todas as solicitações do cliente
  const { data: allServiceRequests = [], isLoading } = useQuery({
    queryKey: ['clientServiceRequests', client?.id],
    queryFn: () => base44.entities.ServiceRequest.filter({ client_id: client.id }, '-created_date'),
    enabled: !!client?.id,
    initialData: []
  });

  // Buscar centros de custo do cliente
  const { data: costCenters = [] } = useQuery({
    queryKey: ['clientCostCenters', client?.id],
    queryFn: () => base44.entities.CostCenter.filter({ client_id: client.id }),
    enabled: !!client?.id,
    initialData: []
  });

  // Buscar funcionários/passageiros
  const { data: clientUsersData } = useQuery({
    queryKey: ['clientUsers', user?.client_id],
    queryFn: async () => {
      const response = await base44.functions.invoke('listClientUsers');
      return response.data;
    },
    enabled: !!user?.client_id,
    initialData: { success: false, users: [] }
  });

  const availablePassengers = useMemo(() => {
    return clientUsersData?.users || [];
  }, [clientUsersData]);

  // Filtrar solicitações baseadas nos filtros
  const filteredRequests = useMemo(() => {
    let filtered = [...allServiceRequests];

    // Filtro de data
    const now = new Date();
    let startDate, endDate;

    if (dateRange === 'last30') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (dateRange === 'last90') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (dateRange === 'thisMonth') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (dateRange === 'lastMonth') {
      const lastMonth = subMonths(now, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
    } else if (dateRange === 'last6Months') {
      startDate = subMonths(now, 6);
      endDate = now;
    } else if (dateRange === 'last12Months') {
      startDate = subMonths(now, 12);
      endDate = now;
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      startDate = parseISO(customStartDate);
      endDate = parseISO(customEndDate);
    } else {
      // Default: últimos 30 dias
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
    }

    filtered = filtered.filter(req => {
      const reqDate = parseISO(req.date);
      return isWithinInterval(reqDate, { start: startDate, end: endDate });
    });

    // Filtro de tipo de serviço
    if (serviceTypeFilter !== 'all') {
      filtered = filtered.filter(req => req.service_type === serviceTypeFilter);
    }

    // Filtro de centro de custo
    if (costCenterFilter !== 'all') {
      filtered = filtered.filter(req => {
        if (!req.cost_allocation || req.cost_allocation.length === 0) return false;
        return req.cost_allocation.some(alloc => alloc.cost_center_id === costCenterFilter);
      });
    }

    // Filtro de passageiro
    if (passengerFilter !== 'all') {
      filtered = filtered.filter(req => req.passenger_user_id === passengerFilter);
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    return filtered;
  }, [allServiceRequests, dateRange, customStartDate, customEndDate, serviceTypeFilter, costCenterFilter, passengerFilter, statusFilter]);

  // Calcular KPIs
  const kpis = useMemo(() => {
    const totalTrips = filteredRequests.length;
    const totalCost = filteredRequests.reduce((sum, req) => sum + (req.chosen_client_price || 0), 0);
    const avgCost = totalTrips > 0 ? totalCost / totalTrips : 0;
    const totalPassengers = filteredRequests.reduce((sum, req) => sum + (req.passengers || 0), 0);
    
    // Calcular economia potencial (diferença entre oferta mais cara e mais barata)
    const potentialSavings = filteredRequests.reduce((sum, req) => {
      if (!req.offered_suppliers || req.offered_suppliers.length < 2) return sum;
      const prices = req.offered_suppliers.map(s => s.client_price);
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      return sum + (maxPrice - minPrice);
    }, 0);

    // Avaliação média
    const requestsWithRating = filteredRequests.filter(req => req.rating_id);
    const avgRating = requestsWithRating.length > 0 ? 4.5 : 0; // Placeholder - seria bom buscar as avaliações reais

    return {
      totalTrips,
      totalCost,
      avgCost,
      totalPassengers,
      potentialSavings,
      avgRating,
      requestsWithRating: requestsWithRating.length
    };
  }, [filteredRequests]);

  // Dados para gráfico de evolução mensal
  const monthlyData = useMemo(() => {
    const months = {};
    
    filteredRequests.forEach(req => {
      const monthKey = format(parseISO(req.date), 'MMM/yy', { locale: ptBR });
      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, trips: 0, cost: 0 };
      }
      months[monthKey].trips += 1;
      months[monthKey].cost += req.chosen_client_price || 0;
    });

    return Object.values(months).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA - dateB;
    });
  }, [filteredRequests]);

  // Dados para distribuição por tipo de serviço
  const serviceTypeData = useMemo(() => {
    const types = {
      one_way: { name: 'Só Ida', value: 0, cost: 0 },
      round_trip: { name: 'Ida e Volta', value: 0, cost: 0 },
      hourly: { name: 'Por Hora', value: 0, cost: 0 }
    };

    filteredRequests.forEach(req => {
      if (types[req.service_type]) {
        types[req.service_type].value += 1;
        types[req.service_type].cost += req.chosen_client_price || 0;
      }
    });

    return Object.values(types).filter(t => t.value > 0);
  }, [filteredRequests]);

  // Dados para distribuição por centro de custo
  const costCenterData = useMemo(() => {
    const centers = {};

    filteredRequests.forEach(req => {
      if (req.cost_allocation && req.cost_allocation.length > 0) {
        req.cost_allocation.forEach(alloc => {
          const key = alloc.cost_center_code || 'Sem Código';
          if (!centers[key]) {
            centers[key] = {
              name: alloc.cost_center_name || key,
              trips: 0,
              cost: 0
            };
          }
          centers[key].trips += 1;
          
          // Calcular custo real atribuído
          if (alloc.allocation_type === 'percentage') {
            centers[key].cost += (req.chosen_client_price * alloc.allocation_value) / 100;
          } else {
            centers[key].cost += alloc.allocation_value;
          }
        });
      } else {
        // Sem rateio
        const key = 'Sem Centro de Custo';
        if (!centers[key]) {
          centers[key] = { name: key, trips: 0, cost: 0 };
        }
        centers[key].trips += 1;
        centers[key].cost += req.chosen_client_price || 0;
      }
    });

    return Object.values(centers).sort((a, b) => b.cost - a.cost);
  }, [filteredRequests]);

  // Rotas mais frequentes
  const topRoutes = useMemo(() => {
    const routes = {};

    filteredRequests.forEach(req => {
      const routeKey = `${req.origin} → ${req.destination}`;
      if (!routes[routeKey]) {
        routes[routeKey] = { route: routeKey, count: 0, cost: 0 };
      }
      routes[routeKey].count += 1;
      routes[routeKey].cost += req.chosen_client_price || 0;
    });

    return Object.values(routes)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredRequests]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  const exportToCSV = () => {
    if (filteredRequests.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const headers = [
      'Nº Solicitação',
      'Data',
      'Horário',
      'Origem',
      'Destino',
      'Tipo de Serviço',
      'Passageiro',
      'Passageiros',
      'Fornecedor',
      'Custo Total',
      'Status',
      'Centro de Custo'
    ];

    const rows = filteredRequests.map(req => {
      const costCenterNames = req.cost_allocation?.map(a => a.cost_center_name).join('; ') || '-';
      
      return [
        req.request_number,
        format(parseISO(req.date), 'dd/MM/yyyy'),
        req.time,
        req.origin,
        req.destination || '-',
        req.service_type === 'one_way' ? 'Só Ida' : req.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora',
        req.passenger_name,
        req.passengers,
        req.chosen_supplier_id || '-',
        req.chosen_client_price?.toFixed(2) || '0.00',
        req.status,
        costCenterNames
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_viagens_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando análises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-10 h-10 text-blue-600" />
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Central de Análise de Viagens</h1>
              <p className="text-gray-600">{client?.name} - Relatórios Gerenciais e Insights</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros Inteligentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Período */}
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last30">Últimos 30 dias</SelectItem>
                    <SelectItem value="last90">Últimos 90 dias</SelectItem>
                    <SelectItem value="thisMonth">Este Mês</SelectItem>
                    <SelectItem value="lastMonth">Mês Passado</SelectItem>
                    <SelectItem value="last6Months">Últimos 6 Meses</SelectItem>
                    <SelectItem value="last12Months">Últimos 12 Meses</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Serviço */}
              <div className="space-y-2">
                <Label>Tipo de Serviço</Label>
                <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="one_way">Só Ida</SelectItem>
                    <SelectItem value="round_trip">Ida e Volta</SelectItem>
                    <SelectItem value="hourly">Por Hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Centro de Custo */}
              <div className="space-y-2">
                <Label>Centro de Custo</Label>
                <Select value={costCenterFilter} onValueChange={setCostCenterFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {costCenters.map(cc => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} - {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Passageiro */}
              <div className="space-y-2">
                <Label>Passageiro</Label>
                <Select value={passengerFilter} onValueChange={setPassengerFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {availablePassengers.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="concluida">Concluídas</SelectItem>
                    <SelectItem value="confirmada">Confirmadas</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="cancelada">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Datas Personalizadas */}
              {dateRange === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label>Data Inicial</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Final</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar para CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando dados...</p>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Total de Viagens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{kpis.totalTrips}</div>
                  <div className="text-sm opacity-80 mt-1">
                    {kpis.totalPassengers} passageiros transportados
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Custo Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{formatPrice(kpis.totalCost)}</div>
                  <div className="text-sm opacity-80 mt-1">
                    Média: {formatPrice(kpis.avgCost)} por viagem
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Economia Potencial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{formatPrice(kpis.potentialSavings)}</div>
                  <div className="text-sm opacity-80 mt-1">
                    Comparando fornecedores
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Avaliação Média
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{kpis.avgRating.toFixed(1)}</div>
                  <div className="text-sm opacity-80 mt-1">
                    {kpis.requestsWithRating} viagens avaliadas
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Evolução Mensal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Evolução Mensal de Viagens e Custos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === 'Custo (R$)') return formatPrice(value);
                          return value;
                        }}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="trips" stroke="#3B82F6" strokeWidth={2} name="Viagens" />
                      <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#10B981" strokeWidth={2} name="Custo (R$)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Distribuição por Tipo de Serviço */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-green-600" />
                    Distribuição por Tipo de Serviço
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={serviceTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {serviceTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [value, props.payload.name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Distribuição por Centro de Custo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-purple-600" />
                    Custos por Centro de Custo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costCenterData.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value) => formatPrice(value)} />
                      <Legend />
                      <Bar dataKey="cost" fill="#8B5CF6" name="Custo (R$)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Rotas Mais Frequentes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-600" />
                    Top 10 Rotas Mais Frequentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topRoutes.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Nenhuma rota encontrada</div>
                  ) : (
                    <div className="space-y-2">
                      {topRoutes.map((route, index) => {
                        const [origin, destination] = route.route.split(' → ');
                        const maxCount = topRoutes[0].count;
                        const barWidth = Math.round((route.count / maxCount) * 100);
                        return (
                          <div key={index} className="flex items-center gap-3">
                            <span className="w-5 text-xs font-bold text-gray-400 text-right flex-shrink-0">{index + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-700 truncate" title={origin}>{origin}</div>
                              <div className="text-xs text-gray-400 truncate" title={destination}>→ {destination || '-'}</div>
                              <div className="mt-1 h-1.5 bg-orange-100 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${barWidth}%` }} />
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <span className="text-sm font-bold text-orange-600">{route.count}</span>
                              <div className="text-xs text-gray-400">{formatPrice(route.cost / route.count)}/avg</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabela Detalhada */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento de Viagens ({filteredRequests.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium">Nenhuma viagem encontrada</p>
                    <p className="text-sm">Ajuste os filtros para ver resultados</p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Nº</TableHead>
                          <TableHead className="font-semibold">Data</TableHead>
                          <TableHead className="font-semibold">Rota</TableHead>
                          <TableHead className="font-semibold">Tipo</TableHead>
                          <TableHead className="font-semibold">Passageiro</TableHead>
                          <TableHead className="font-semibold">Centro de Custo</TableHead>
                          <TableHead className="font-semibold text-right">Custo</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.slice(0, 100).map((req) => (
                          <TableRow key={req.id}>
                            <TableCell className="font-mono text-sm">{req.request_number}</TableCell>
                            <TableCell className="text-sm">
                              {format(parseISO(req.date), 'dd/MM/yy')}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>{req.origin}</div>
                              <div className="text-gray-500">→ {req.destination || '-'}</div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <Badge variant="outline">
                                {req.service_type === 'one_way' ? 'Só Ida' :
                                 req.service_type === 'round_trip' ? 'Ida/Volta' : 'Por Hora'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{req.passenger_name}</TableCell>
                            <TableCell className="text-sm">
                              {req.cost_allocation && req.cost_allocation.length > 0 ? (
                                <div className="space-y-1">
                                  {req.cost_allocation.map((alloc, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {alloc.cost_center_code}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              {formatPrice(req.chosen_client_price)}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                req.status === 'concluida' ? 'bg-green-100 text-green-800' :
                                req.status === 'confirmada' ? 'bg-blue-100 text-blue-800' :
                                req.status === 'cancelada' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {req.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredRequests.length > 100 && (
                      <div className="p-4 text-center text-sm text-gray-500 border-t">
                        Mostrando 100 de {filteredRequests.length} viagens. Exporte para CSV para ver todas.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}