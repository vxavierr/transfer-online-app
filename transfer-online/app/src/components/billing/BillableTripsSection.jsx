import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Filter, X, Users, Building2, Calendar, DollarSign, Edit,
  Receipt, Eye, ChevronDown, ChevronRight, Loader2, Search, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import WhatsAppShareButton from '@/components/billing/WhatsAppShareButton';

export default function BillableTripsSection({
  billableRequests,
  allTrips,
  showAllTrips,
  setShowAllTrips,
  clients,
  users,
  filters,
  setFilters,
  groupBy,
  setGroupBy,
  selectedRequests,
  setSelectedRequests,
  onCreateInvoice,
  onEditBooking
}) {
  const [expandedGroups, setExpandedGroups] = useState({ 'Todas as Viagens': true });
  const [searchTerm, setSearchTerm] = useState('');

  const tripsToShow = showAllTrips ? allTrips : billableRequests;

  const filteredRequests = useMemo(() => {
    return tripsToShow.filter(request => {
      // Filtro de busca por número da viagem
      if (searchTerm.trim() !== '') {
        const tripNumber = (request.request_number || request.booking_number || '').toLowerCase();
        if (!tripNumber.includes(searchTerm.toLowerCase().trim())) return false;
      }

      if (filters.client_id !== 'all' && request.client_id !== filters.client_id) return false;
      if (filters.user_id !== 'all' && request.user_id !== filters.user_id) return false;

      if (filters.billing_responsible_user_id !== 'all') {
        const matchesUserId = request.billing_responsible_user_id === filters.billing_responsible_user_id;
        const matchesEmail = request.billing_responsible_email === filters.billing_responsible_user_id;
        if (!matchesUserId && !matchesEmail) return false;
      }

      if (filters.billing_method !== 'all' && request.billing_method !== filters.billing_method) return false;

      if (filters.cost_center_code !== 'all') {
        const hasCostCenter = request.cost_allocation?.some(alloc =>
          alloc.cost_center_code === filters.cost_center_code
        );
        if (!hasCostCenter) return false;
      }

      if (filters.date_start && new Date(request.date) < new Date(filters.date_start)) return false;
      if (filters.date_end && new Date(request.date) > new Date(filters.date_end)) return false;

      // Filtro de link de pagamento
      if (filters.payment_link_status === 'with_link') {
        if (!request.payment_link && !request.stripe_checkout_session_id) return false;
      } else if (filters.payment_link_status === 'without_link') {
        if (request.payment_link || request.stripe_checkout_session_id) return false;
      }

      // Filtro de agrupamento (viagens com mesmo stripe_checkout_session_id)
      if (filters.grouping_status === 'grouped') {
        if (!request.stripe_checkout_session_id) return false;
        // Verificar se há outras viagens com o mesmo session_id
        const sameSessionTrips = tripsToShow.filter(t => 
          t.stripe_checkout_session_id === request.stripe_checkout_session_id
        );
        if (sameSessionTrips.length <= 1) return false;
      } else if (filters.grouping_status === 'individual') {
        if (request.stripe_checkout_session_id) {
          const sameSessionTrips = tripsToShow.filter(t => 
            t.stripe_checkout_session_id === request.stripe_checkout_session_id
          );
          if (sameSessionTrips.length > 1) return false;
        }
      }

      return true;
    });
  }, [tripsToShow, filters, searchTerm]);

  const groupedRequests = useMemo(() => {
    if (groupBy === 'none') {
      return { 'Todas as Viagens': filteredRequests };
    }

    const groups = {};
    filteredRequests.forEach(request => {
      let groupKey = '';

      if (groupBy === 'client') {
        const client = clients.find(c => c.id === request.client_id);
        groupKey = client?.name || 'Cliente Desconhecido';
      } else if (groupBy === 'billing_responsible') {
        const responsible = users.find(u => u.id === request.billing_responsible_user_id);
        groupKey = responsible?.full_name || request.billing_responsible_name || 'Não Informado';
      } else if (groupBy === 'month') {
        groupKey = format(new Date(request.date + 'T00:00:00'), 'MMMM/yyyy', { locale: ptBR });
      } else if (groupBy === 'cost_center') {
        if (request.cost_allocation && request.cost_allocation.length > 0) {
          request.cost_allocation.forEach(alloc => {
            const ccKey = `${alloc.cost_center_code} - ${alloc.cost_center_name || 'Nome não disponível'}`;
            if (!groups[ccKey]) {
              groups[ccKey] = [];
            }
            groups[ccKey].push(request);
          });
          return;
        } else {
          groupKey = 'Sem Centro de Custo';
        }
      } else if (groupBy === 'billing_method') {
        const methodLabels = {
          'invoiced': 'Faturado',
          'credit_card': 'Cartão de Crédito',
          'purchase_order': 'Ordem de Compra'
        };
        groupKey = methodLabels[request.billing_method] || 'Método Não Informado';
      }

      if (groupBy !== 'cost_center' || !groups[groupKey]?.includes(request)) {
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(request);
      }
    });

    return groups;
  }, [filteredRequests, groupBy, clients, users]);

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
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

  const handleToggleGroup = (groupRequests) => {
    const groupRequestIds = groupRequests.map(r => r.id);
    const allSelected = groupRequestIds.every(id => selectedRequests.includes(id));

    if (allSelected) {
      setSelectedRequests(prev => prev.filter(id => !groupRequestIds.includes(id)));
    } else {
      setSelectedRequests(prev => [...new Set([...prev, ...groupRequestIds])]);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      client_id: 'all',
      user_id: 'all',
      billing_responsible_user_id: 'all',
      cost_center_code: 'all',
      billing_method: 'all',
      payment_link_status: 'all',
      grouping_status: 'all',
      date_start: '',
      date_end: ''
    });
    setGroupBy('none');
    setSearchTerm('');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getPaymentStatusBadge = (request) => {
    // Para ServiceRequest com cartão de crédito
    if (request.type === 'ServiceRequest' && request.billing_method === 'credit_card') {
      if (request.stripe_payment_status === 'paid') {
        return (
          <Badge className="bg-green-100 text-green-800 border border-green-300 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Pago
          </Badge>
        );
      } else if (request.stripe_payment_status === 'unpaid') {
        return (
          <Badge className="bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Não Pago
          </Badge>
        );
      } else {
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pendente
          </Badge>
        );
      }
    }

    // Para SupplierOwnBooking
    if (request.type === 'SupplierOwnBooking') {
      if (request.payment_status === 'pago') {
        return (
          <Badge className="bg-green-100 text-green-800 border border-green-300 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Pago
          </Badge>
        );
      } else if (request.payment_status === 'pendente') {
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pendente
          </Badge>
        );
      }
    }

    // Para outros métodos de pagamento de ServiceRequest
    if (request.payment_status === 'pago') {
      return (
        <Badge className="bg-green-100 text-green-800 border border-green-300 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Pago
        </Badge>
      );
    } else if (request.payment_status === 'faturado') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
          <Receipt className="w-3 h-3" />
          Faturado
        </Badge>
      );
    }

    return (
      <Badge className="bg-gray-100 text-gray-800 border border-gray-300 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Pendente
      </Badge>
    );
  };

  const totalValue = useMemo(() => {
    return filteredRequests.reduce((sum, r) => sum + (r.chosen_supplier_cost + (r.total_additional_expenses_approved || 0)), 0);
  }, [filteredRequests]);

  const availableFinancialResponsibles = useMemo(() => {
    const responsibles = [];
    const seenUserIds = new Set();
    const seenEmails = new Set();

    billableRequests.forEach(request => {
      if (request.billing_responsible_user_id) {
        if (!seenUserIds.has(request.billing_responsible_user_id)) {
          const user = users.find(u => u.id === request.billing_responsible_user_id);
          if (user) {
            responsibles.push({
              type: 'user',
              id: request.billing_responsible_user_id,
              label: user.full_name,
              email: user.email
            });
            seenUserIds.add(request.billing_responsible_user_id);
          }
        }
      }
      else if (request.billing_responsible_email && !seenEmails.has(request.billing_responsible_email)) {
        responsibles.push({
          type: 'email',
          id: request.billing_responsible_email,
          label: request.billing_responsible_name || request.billing_responsible_email,
          email: request.billing_responsible_email
        });
        seenEmails.add(request.billing_responsible_email);
      }
    });

    return responsibles.sort((a, b) => a.label.localeCompare(b.label));
  }, [billableRequests, users]);

  const availableSolicitors = useMemo(() => {
    const solicitors = [];
    const seenUserIds = new Set();

    billableRequests.forEach((request) => {
      if (request.user_id) {
        if (!seenUserIds.has(request.user_id)) {
          const user = users.find(u => u.id === request.user_id);
          if (user) {
            solicitors.push({
              id: user.id,
              label: user.full_name,
              email: user.email
            });
            seenUserIds.add(request.user_id);
          }
        }
      }
    });

    return solicitors.sort((a, b) => a.label.localeCompare(b.label));
  }, [billableRequests, users]);

  const availableCostCenters = useMemo(() => {
    const costCentersMap = new Map();

    billableRequests.forEach(request => {
      if (request.cost_allocation && request.cost_allocation.length > 0) {
        request.cost_allocation.forEach(alloc => {
          const key = alloc.cost_center_code;
          if (!costCentersMap.has(key)) {
            costCentersMap.set(key, {
              code: alloc.cost_center_code,
              name: alloc.cost_center_name
            });
          }
        });
      }
    });

    return Array.from(costCentersMap.values()).sort((a, b) =>
      a.code.localeCompare(b.code)
    );
  }, [billableRequests]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim() !== '') count++;
    if (filters.client_id !== 'all') count++;
    if (filters.user_id !== 'all') count++;
    if (filters.billing_responsible_user_id !== 'all') count++;
    if (filters.cost_center_code !== 'all') count++;
    if (filters.billing_method !== 'all') count++;
    if (filters.payment_link_status && filters.payment_link_status !== 'all') count++;
    if (filters.grouping_status && filters.grouping_status !== 'all') count++;
    if (filters.date_start || filters.date_end) count++;
    return count;
  }, [filters, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle>Viagens Prontas para Faturamento</CardTitle>
            <div className="flex items-center gap-2 bg-blue-100 px-3 py-1.5 rounded-full">
              <input
                type="checkbox"
                id="showAllTrips"
                checked={showAllTrips}
                onChange={(e) => setShowAllTrips(e.target.checked)}
                className="cursor-pointer"
              />
              <label htmlFor="showAllTrips" className="text-sm font-medium text-blue-900 cursor-pointer">
                Mostrar todas
              </label>
            </div>
          </div>
          {selectedRequests.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <WhatsAppShareButton
                selectedRequests={selectedRequests}
                filteredRequests={filteredRequests}
                clients={clients}
              />
              <Button
                onClick={onCreateInvoice}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Gerar Relatório ({selectedRequests.length})
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <Accordion type="single" collapsible className="mb-6">
          <AccordionItem value="filters" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span className="font-semibold">Filtros e Agrupamentos</span>
                {activeFiltersCount > 0 && (
                  <Badge className="bg-blue-600 text-white">{activeFiltersCount}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                {/* Campo de Busca */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Buscar por Número da Viagem
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Ex: SR-0301 ou SP-0123"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Cliente
                    </Label>
                    <Select value={filters.client_id} onValueChange={(value) => setFilters({...filters, client_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Clientes</SelectItem>
                        {clients.filter(c => billableRequests.some(r => r.client_id === c.id)).map(client => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Solicitante
                    </Label>
                    <Select value={filters.user_id} onValueChange={(value) => setFilters({...filters, user_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Solicitantes</SelectItem>
                        {availableSolicitors.map((solicitor) => (
                          <SelectItem key={solicitor.id} value={solicitor.id}>
                            {solicitor.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Responsável Financeiro
                    </Label>
                    <Select
                      value={filters.billing_responsible_user_id}
                      onValueChange={(value) => setFilters({...filters, billing_responsible_user_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Responsáveis</SelectItem>
                        {availableFinancialResponsibles.map((resp) => (
                          <SelectItem key={resp.id} value={resp.id}>
                            {resp.label}
                            {resp.email && resp.type === 'email' && (
                              <span className="text-xs text-gray-500 ml-1">({resp.email})</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Centro de Custo</Label>
                    <Select value={filters.cost_center_code} onValueChange={(value) => setFilters({...filters, cost_center_code: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                       </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Centros de Custo</SelectItem>
                        {availableCostCenters.map((cc) => (
                          <SelectItem key={cc.code} value={cc.code}>
                            <span className="font-mono text-sm">{cc.code}</span>
                            {' - '}
                            {cc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Método de Faturamento</Label>
                    <Select value={filters.billing_method} onValueChange={(value) => setFilters({...filters, billing_method: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Métodos</SelectItem>
                        <SelectItem value="invoiced">Faturado</SelectItem>
                        <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                        <SelectItem value="purchase_order">Ordem de Compra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status de Link de Pagamento</Label>
                    <Select value={filters.payment_link_status || 'all'} onValueChange={(value) => setFilters({...filters, payment_link_status: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="with_link">Com Link Gerado</SelectItem>
                        <SelectItem value="without_link">Sem Link Gerado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Agrupamento</Label>
                    <Select value={filters.grouping_status || 'all'} onValueChange={(value) => setFilters({...filters, grouping_status: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="grouped">Viagens Agrupadas</SelectItem>
                        <SelectItem value="individual">Viagens Individuais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Período da Viagem
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={filters.date_start}
                        onChange={(e) => setFilters({...filters, date_start: e.target.value})}
                        placeholder="De"
                      />
                      <Input
                        type="date"
                        value={filters.date_end}
                        onChange={(e) => setFilters({...filters, date_end: e.target.value})}
                        placeholder="Até"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <Label className="font-semibold">Agrupar Viagens Por:</Label>
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem Agrupamento (Lista Simples)</SelectItem>
                      <SelectItem value="client">Cliente</SelectItem>
                      <SelectItem value="billing_responsible">Responsável Financeiro</SelectItem>
                      <SelectItem value="cost_center">Centro de Custo</SelectItem>
                      <SelectItem value="billing_method">Método de Faturamento</SelectItem>
                      <SelectItem value="month">Mês da Viagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleClearFilters} variant="outline" size="sm">
                    <X className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Viagens */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Nenhuma viagem encontrada</p>
            <p className="text-sm">Ajuste os filtros para ver outras viagens.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedRequests).map(([groupName, groupRequests]) => {
              const groupTotal = groupRequests.reduce((sum, r) => sum + (r.chosen_supplier_cost + (r.total_additional_expenses_approved || 0)), 0);
              const allGroupSelected = groupRequests.every(r => selectedRequests.includes(r.id));
              const isExpanded = expandedGroups[groupName];

              return (
                <div key={groupName} className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50 transition-all">
                  {groupBy !== 'none' ? (
                    <div 
                      className="flex items-center justify-between mb-2 pb-2 border-b border-blue-300 cursor-pointer hover:bg-blue-100/50 rounded px-2 -mx-2"
                      onClick={() => toggleGroup(groupName)}
                    >
                      <div className="flex items-center gap-3">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={allGroupSelected}
                            onCheckedChange={() => handleToggleGroup(groupRequests)}
                            className="w-5 h-5"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-blue-700" /> : <ChevronRight className="w-5 h-5 text-blue-700" />}
                          <div>
                            <h3 className="text-lg font-bold text-blue-900">{groupName}</h3>
                            <p className="text-sm text-blue-700">
                              {groupRequests.length} viagem{groupRequests.length !== 1 ? 'ns' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-blue-700">Total do Grupo</p>
                        <p className="text-2xl font-bold text-blue-900">{formatPrice(groupTotal)}</p>
                      </div>
                    </div>
                  ) : null}

                  {isExpanded && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                      {groupRequests.map((request) => {
                        const requestClient = clients.find(c => c.id === request.client_id);
                        const requestUser = users.find(u => u.id === request.user_id);
                        const financialResponsibleUser = users.find(u => u.id === request.billing_responsible_user_id);

                        return (
                          <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedRequests.includes(request.id)}
                                onCheckedChange={() => handleToggleRequest(request.id)}
                                className="mt-1"
                              />

                              <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <div className="font-mono font-bold text-blue-600 text-lg">{request.request_number}</div>
                                      {getPaymentStatusBadge(request)}
                                    </div>
                                    <div className="text-xs text-gray-500">{format(new Date(request.date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })} às {request.time}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="text-xs text-gray-500">Valor</div>
                                      {request.type === 'SupplierOwnBooking' && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-gray-400 hover:text-blue-600 -mr-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onEditBooking(request);
                                          }}
                                          title="Editar Valor"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                    <div className="font-bold text-green-600 text-xl">
                                      {formatPrice(request.chosen_supplier_cost + (request.total_additional_expenses_approved || 0))}
                                    </div>
                                    {(request.total_additional_expenses_approved || 0) > 0 && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        (Base: {formatPrice(request.chosen_supplier_cost)} + Despesas: {formatPrice(request.total_additional_expenses_approved)})
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <div className="text-xs text-gray-500 mb-1">Rota:</div>
                                  <div className="text-sm font-medium">{request.origin} → {request.destination}</div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-3 text-sm">
                                  <div className="bg-blue-50 p-3 rounded-lg">
                                    <div className="text-xs text-blue-700 font-semibold mb-1">Cliente:</div>
                                    <div className="font-medium text-gray-900">{requestClient?.name || 'N/A'}</div>
                                  </div>
                                  <div className="bg-purple-50 p-3 rounded-lg">
                                    <div className="text-xs text-purple-700 font-semibold mb-1">Solicitante:</div>
                                    <div className="font-medium text-gray-900">{requestUser?.full_name || 'N/A'}</div>
                                    {requestUser?.email && (
                                      <div className="text-xs text-gray-500">{requestUser.email}</div>
                                    )}
                                  </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-3 text-sm">
                                  <div className="bg-green-50 p-3 rounded-lg">
                                    <div className="text-xs text-green-700 font-semibold mb-1">
                                      Responsável Financeiro:
                                    </div>
                                    <div className="font-medium text-gray-900">
                                      {request.billing_method === 'invoiced' && (
                                        <>
                                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded mr-2">
                                            Faturado
                                          </span>
                                          {financialResponsibleUser?.full_name || request.billing_responsible_name || 'N/A'}
                                        </>
                                      )}
                                      {request.billing_method === 'credit_card' && (
                                        <>
                                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded mr-2">
                                            Cartão
                                          </span>
                                          {request.billing_responsible_email || 'N/A'}
                                        </>
                                      )}
                                      {request.billing_method === 'purchase_order' && (
                                        <>
                                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded mr-2">
                                            OC
                                          </span>
                                          {request.purchase_order_number || 'N/A'}
                                        </>
                                      )}
                                      {!request.billing_method && 'N/A'}
                                    </div>
                                    {request.billing_method === 'credit_card' && request.billing_responsible_email && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        📧 {request.billing_responsible_email}
                                      </div>
                                    )}
                                  </div>

                                  <div className="bg-orange-50 p-3 rounded-lg">
                                    <div className="text-xs text-orange-700 font-semibold mb-1">Centro(s) de Custo:</div>
                                    {request.cost_allocation && request.cost_allocation.length > 0 ? (
                                      <div className="space-y-1">
                                        {request.cost_allocation.map((alloc, idx) => (
                                          <div key={idx} className="text-xs">
                                            <span className="font-mono font-semibold text-orange-700">
                                              {alloc.cost_center_code}
                                            </span>
                                            {' - '}
                                            <span className="text-gray-700">{alloc.cost_center_name}</span>
                                            {alloc.allocation_type === 'percentage' && (
                                              <span className="text-orange-600 ml-1">({alloc.allocation_value}%)</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-gray-500">Não informado</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {selectedRequests.length > 0 && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 sticky bottom-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-blue-900 text-lg">
                    Total Selecionado ({selectedRequests.length} viagens):
                  </span>
                  <span className="text-3xl font-bold text-blue-700">
                    {formatPrice(
                      filteredRequests
                        .filter(r => selectedRequests.includes(r.id))
                        .reduce((sum, r) => sum + (r.chosen_supplier_cost + (r.total_additional_expenses_approved || 0)), 0)
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}