import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Filter, Download, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RelatorioKmPercorrido() {
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Novos Estados para Filtros
  const [selectedWorkLocation, setSelectedWorkLocation] = useState('all');
  const [selectedRequesterName, setSelectedRequesterName] = useState('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState('all');
  const [selectedServiceType, setSelectedServiceType] = useState('all');
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Buscar Clientes
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: []
  });

  // Buscar Fornecedores (para mapear nomes)
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: []
  });

  // Buscar Tipos de Veículo (para mapear nomes)
  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['supplierVehicleTypes'],
    queryFn: () => base44.entities.SupplierVehicleType.list(), // Ou VehicleType global dependendo do uso
    initialData: []
  });

  // Buscar Usuários (para mapear nomes dos solicitantes)
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  // Buscar Solicitantes Frequentes
  const { data: frequentRequesters = [] } = useQuery({
    queryKey: ['allFrequentRequesters'],
    queryFn: () => base44.entities.FrequentRequester.list(),
    initialData: []
  });

  // Buscar Solicitações
  const { data: allRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['serviceRequests'],
    queryFn: () => base44.entities.ServiceRequest.list(),
    initialData: []
  });

  // Funções Auxiliares (Movidas para uso nos filtros)
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'N/A';
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'N/A';
  };

  const getRequesterName = (req) => {
    if (req.requester_full_name) return req.requester_full_name;
    if (req.frequent_requester_id) {
      const fr = frequentRequesters.find(f => f.id === req.frequent_requester_id);
      if (fr) return fr.full_name;
    }
    if (req.requester_user_id) {
      const user = users.find(u => u.id === req.requester_user_id);
      if (user) return user.full_name;
    }
    if (req.user_id) {
      const user = users.find(u => u.id === req.user_id);
      return user ? user.full_name : 'N/A';
    }
    return 'N/A';
  };

  const getWorkLocation = (req) => {
    if (req.requester_user_id) {
      const user = users.find(u => u.id === req.requester_user_id);
      if (user && user.work_location) return user.work_location;
    }
    if (req.frequent_requester_id) {
      const fr = frequentRequesters.find(f => f.id === req.frequent_requester_id);
      if (fr && fr.work_location) return fr.work_location;
    }
    return '-';
  };

  const getVehicleTypeName = (vehicleTypeId) => {
    const svt = vehicleTypes.find(v => v.id === vehicleTypeId);
    return svt ? svt.name : vehicleTypeId || 'N/A';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatServiceType = (type) => {
    const types = {
      'one_way': 'Só Ida',
      'round_trip': 'Ida e Volta',
      'hourly': 'Por Hora'
    };
    return types[type] || type;
  };

  const getStatusBadge = (status) => {
    const colors = {
      'concluida': 'bg-green-100 text-green-800',
      'cancelada': 'bg-red-100 text-red-800',
      'em_andamento': 'bg-blue-100 text-blue-800',
      'confirmada': 'bg-indigo-100 text-indigo-800',
      'aguardando_fornecedor': 'bg-yellow-100 text-yellow-800',
      'rascunho': 'bg-gray-100 text-gray-800'
    };
    return (
      <Badge className={`${colors[status] || 'bg-gray-100 text-gray-800'} hover:bg-opacity-80`}>
        {status}
      </Badge>
    );
  };

  // Listas únicas para filtros
  const uniqueWorkLocations = React.useMemo(() => {
    const locations = new Set();
    allRequests.forEach(req => {
      const loc = getWorkLocation(req);
      if (loc && loc !== '-' && loc !== 'N/A') locations.add(loc);
    });
    return Array.from(locations).sort();
  }, [allRequests, users, frequentRequesters]);

  const uniqueRequesters = React.useMemo(() => {
    const names = new Set();
    allRequests.forEach(req => {
      const name = getRequesterName(req);
      if (name && name !== 'N/A') names.add(name);
    });
    return Array.from(names).sort();
  }, [allRequests, users, frequentRequesters]);

  // Filtragem
  useEffect(() => {
    let filtered = allRequests;

    if (selectedClientId !== 'all') {
      filtered = filtered.filter(req => req.client_id === selectedClientId);
    }
    if (startDate) {
      filtered = filtered.filter(req => req.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(req => req.date <= endDate);
    }
    // Novos Filtros
    if (selectedWorkLocation !== 'all') {
      filtered = filtered.filter(req => getWorkLocation(req) === selectedWorkLocation);
    }
    if (selectedRequesterName !== 'all') {
      filtered = filtered.filter(req => getRequesterName(req) === selectedRequesterName);
    }
    if (selectedSupplierId !== 'all') {
      filtered = filtered.filter(req => req.chosen_supplier_id === selectedSupplierId);
    }
    if (selectedServiceType !== 'all') {
      filtered = filtered.filter(req => req.service_type === selectedServiceType);
    }
    if (selectedVehicleTypeId !== 'all') {
      filtered = filtered.filter(req => req.chosen_vehicle_type_id === selectedVehicleTypeId);
    }
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(req => req.status === selectedStatus);
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    setFilteredRequests(filtered);
  }, [selectedClientId, startDate, endDate, allRequests, selectedWorkLocation, selectedRequesterName, selectedSupplierId, selectedServiceType, selectedVehicleTypeId, selectedStatus]);



  // Totais
  const totalKm = filteredRequests.reduce((acc, req) => acc + (req.distance_km || 0), 0);
  const totalValueClient = filteredRequests.reduce((acc, req) => acc + (req.chosen_client_price || 0), 0);
  const totalCostSupplier = filteredRequests.reduce((acc, req) => acc + (req.chosen_supplier_cost || 0), 0);

  const handleExportPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      // Call backend function to generate PDF
      const response = await base44.functions.invoke('generateMileageReportPDF', {
        clientId: selectedClientId,
        startDate: startDate || null,
        endDate: endDate || null
      });
      
      // Create blob and download
      // Note: base44.functions.invoke returns the axios response object
      // The data might be a string/buffer depending on how the SDK handles binary responses
      // If it comes as a string/buffer, we need to handle it.
      // Assuming the SDK handles binary correctly if we use the right headers.
      // Actually, a safer way for binary files if SDK JSON-parses is to use fetch directly or rely on the SDK returning raw data if it detects non-JSON.
      // However, sticking to the pattern seen in other files (e.g. exportTasks.js example).
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'relatorio_km_percorrido.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Relatório de Km Percorrido</h1>
            <p className="text-gray-500">Analise detalhada de viagens, custos e quilometragem</p>
          </div>
          <Button onClick={handleExportPDF} disabled={isGeneratingPdf || filteredRequests.length === 0}>
            {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exportar PDF
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Clientes</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Local de Trabalho</Label>
                <Select value={selectedWorkLocation} onValueChange={setSelectedWorkLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Locais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Locais</SelectItem>
                    {uniqueWorkLocations.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Solicitante</Label>
                <Select value={selectedRequesterName} onValueChange={setSelectedRequesterName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Solicitantes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Solicitantes</SelectItem>
                    {uniqueRequesters.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Fornecedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Fornecedores</SelectItem>
                    {suppliers.map(sup => (
                      <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Serviço</Label>
                <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
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
                <Label>Veículo</Label>
                <Select value={selectedVehicleTypeId} onValueChange={setSelectedVehicleTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Veículos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Veículos</SelectItem>
                    {vehicleTypes.map(vt => (
                      <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="aguardando_fornecedor">Aguardando Fornecedor</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-sm text-blue-600 font-medium">Km Total Percorrido</div>
              <div className="text-2xl font-bold text-blue-900">{totalKm.toFixed(2)} km</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="text-sm text-green-600 font-medium">Valor Total (Cliente)</div>
              <div className="text-2xl font-bold text-green-900">{formatCurrency(totalValueClient)}</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="text-sm text-purple-600 font-medium">Custo Total (Fornecedor)</div>
              <div className="text-2xl font-bold text-purple-900">{formatCurrency(totalCostSupplier)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoadingRequests ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-2 text-gray-500">Carregando dados...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhuma viagem encontrada com os filtros selecionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="whitespace-nowrap">Nº Viagem</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Local de Trabalho</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tipo Serviço</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead className="text-right">Valor (Cli)</TableHead>
                      <TableHead className="text-right">Custo (Forn)</TableHead>
                      <TableHead className="text-right">Km</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((req) => (
                      <TableRow key={req.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono font-medium text-blue-600">
                          {req.request_number}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm font-medium">{format(new Date(req.date), 'dd/MM/yyyy')}</div>
                          <div className="text-xs text-gray-500">{req.time}</div>
                        </TableCell>
                        <TableCell>{getRequesterName(req)}</TableCell>
                        <TableCell>{getSupplierName(req.chosen_supplier_id)}</TableCell>
                        <TableCell>{getWorkLocation(req)}</TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell>{formatServiceType(req.service_type)}</TableCell>
                        <TableCell>{getVehicleTypeName(req.chosen_vehicle_type_id)}</TableCell>
                        <TableCell className="text-right font-medium text-green-700">
                          {formatCurrency(req.chosen_client_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-purple-700">
                          {formatCurrency(req.chosen_supplier_cost)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {req.distance_km || 0} km
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}