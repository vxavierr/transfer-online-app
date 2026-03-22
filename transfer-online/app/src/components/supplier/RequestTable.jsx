import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Eye,
  CheckCircle,
  XCircle,
  Car,
  Users,
  DollarSign,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ArrowUpCircle,
  MoreHorizontal
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import RequestSummaryTooltip from '@/components/supplier/RequestSummaryTooltip';

export default function RequestTable({
  requests,
  onViewDetails,
  onAccept,
  onReject,
  onManageDriver,
  onStatusChange,
  formatPrice,
  showActions = false,
  showDriverAction = false,
  showTripStatus = false,
  showUrgencyIndicator = false,
  highlightNotStarted = false,
  parseLocalDate,
  sortColumn,
  sortDirection,
  onSort,
  supplierVehicleTypes,
  selectedTrips = [],
  onSelectionChange,
  supplier,
  onSubcontract,
  onApproveSubcontract
}) {
  const queryClient = useQueryClient();

  // Optimistic Accept Mutation
  const acceptMutation = useMutation({
    mutationFn: async (request) => {
      // If onAccept prop is provided and is a function, we might assume it handles it.
      // But to ensure optimistic updates we implement logic here if possible, 
      // or we assume onAccept is just a trigger.
      // Since user asked to update mutations IN RequestTable, we assume we should implement logic.
      if (typeof onAccept === 'function') {
         // Try to use the prop if it returns a promise, otherwise fallback to SDK
         try {
             const res = await onAccept(request);
             return res;
         } catch(e) {
             // If onAccept is not async or fails, try direct call
             console.warn("onAccept prop failed or not async, trying direct SDK call", e);
         }
      }
      return await base44.functions.invoke('supplierAcceptRejectRequest', { 
        serviceRequestId: request.id, 
        action: 'accept' 
      });
    },
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: ['supplierRequests'] });
      const previousData = queryClient.getQueryData(['supplierRequests']);
      
      queryClient.setQueryData(['supplierRequests'], (old) => {
        if (!old) return old;
        return old.map((item) => 
          item.id === request.id 
            ? { ...item, supplier_response_status: 'aceito', status: 'confirmada' } 
            : item
        );
      });
      toast.success('Solicitação aceita! (Otimista)');
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['supplierRequests'], context.previousData);
      }
      toast.error('Erro ao aceitar solicitação');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierRequests'] });
      queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
    }
  });

  // Optimistic Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async (request) => {
      if (typeof onReject === 'function') {
         try {
             return await onReject(request);
         } catch(e) { console.warn("onReject prop error", e); }
      }
      return await base44.functions.invoke('supplierAcceptRejectRequest', { 
        serviceRequestId: request.id, 
        action: 'reject' 
      });
    },
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: ['supplierRequests'] });
      const previousData = queryClient.getQueryData(['supplierRequests']);
      
      queryClient.setQueryData(['supplierRequests'], (old) => {
        if (!old) return old;
        // Remove or update status
        return old.map((item) => 
          item.id === request.id 
            ? { ...item, supplier_response_status: 'recusado', status: 'cancelada' } 
            : item
        );
      });
      toast.success('Solicitação recusada! (Otimista)');
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['supplierRequests'], context.previousData);
      }
      toast.error('Erro ao recusar solicitação');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierRequests'] });
      queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
    }
  });

  const handleAccept = (request) => {
    acceptMutation.mutate(request);
  };

  const handleReject = (request) => {
    rejectMutation.mutate(request);
  };


  const getUrgencyBadge = (request) => {
    if (request.type === 'direct_booking' && 
       (request.status === 'pendente' || request.status === 'confirmada') &&
       (!request.driver_name || !request.driver_phone || !request.vehicle_model || !request.vehicle_plate)) {
       return <Badge className="bg-orange-600 text-white text-[10px] md:text-xs">⚠️ SEM MOTORISTA</Badge>;
    }
    if (request.supplier_response_status === 'aguardando_resposta') {
      return <Badge className="bg-red-600 text-white animate-pulse text-[10px] md:text-xs">🚨 RESPONDER</Badge>;
    }
    if (['aceito', 'confirmado'].includes(request.supplier_response_status) &&
        (!request.driver_name || !request.driver_phone || !request.vehicle_model || !request.vehicle_plate) &&
        request.status !== 'concluida' && request.status !== 'cancelada') {
      return <Badge className="bg-orange-600 text-white text-[10px] md:text-xs">⚠️ SEM MOTORISTA</Badge>;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripDate = request.date ? parseLocalDate(request.date) : null;
    if (tripDate) tripDate.setHours(0,0,0,0);

    if (highlightNotStarted && tripDate && tripDate.getTime() === today.getTime() && request.driver_trip_status === 'aguardando' && request.driver_name && request.driver_phone && request.status !== 'concluida' && request.status !== 'cancelada') {
      return <Badge className="bg-amber-600 text-white text-[10px] md:text-xs">⏰ NÃO INICIOU</Badge>;
    }
    if (request.unified_status === 'concluida' || request.status === 'concluida' || request.driver_trip_status === 'finalizada') {
      return <Badge className="bg-green-600 text-white text-[10px] md:text-xs">✅ CONCLUÍDA</Badge>;
    }
    return null;
  };

  const canManageDriver = (request) => {
    if (request.type === 'own' || request.type === 'direct_booking') return true;
    return ['aceito', 'confirmado'].includes(request.supplier_response_status);
  };

  const renderActionMenu = (request, isMobile = false) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={isMobile ? 'flex-1 text-xs h-8' : 'h-8 px-3'}
        >
          <MoreHorizontal className="w-4 h-4" />
          {isMobile && 'Ações'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => onViewDetails(request)}>
          <Eye className="w-4 h-4 mr-2" />
          Ver detalhes
        </DropdownMenuItem>
        {showActions && request.supplier_response_status === 'aguardando_resposta' && (
          <>
            <DropdownMenuItem onClick={() => handleAccept(request)}>
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Aceitar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleReject(request)}>
              <XCircle className="w-4 h-4 mr-2 text-red-600" />
              Recusar
            </DropdownMenuItem>
          </>
        )}
        {showDriverAction && canManageDriver(request) && (
          <DropdownMenuItem onClick={() => onManageDriver(request)}>
            <Car className="w-4 h-4 mr-2 text-blue-600" />
            Gerenciar motorista
          </DropdownMenuItem>
        )}
        {showTripStatus && request.status !== 'concluida' && request.status !== 'cancelada' && request.driver_name && (
          <DropdownMenuItem onClick={() => onStatusChange(request)}>
            <ArrowUpCircle className="w-4 h-4 mr-2 text-orange-600" />
            Mudar status
          </DropdownMenuItem>
        )}
        {supplier?.features?.can_subcontract && ['aceito', 'confirmado', 'pendente', 'em_andamento', 'aguardando_resposta'].includes(request.unified_status || request.supplier_response_status) && (
          <DropdownMenuItem onClick={() => onSubcontract(request)}>
            <Users className="w-4 h-4 mr-2 text-purple-600" />
            {request.subcontractor_id ? 'Alterar parceiro' : 'Subcontratar parceiro'}
          </DropdownMenuItem>
        )}
        {request.subcontractor_id && !request.supplier_margin_on_subcontractor && request.subcontractor_cost && (
          <DropdownMenuItem onClick={() => onApproveSubcontract(request)}>
            <DollarSign className="w-4 h-4 mr-2 text-green-600" />
            Aprovar cotação
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const getVehicleTypeName = (vehicleTypeId) => {
    const vehicleType = supplierVehicleTypes.find(vt => vt.id === vehicleTypeId);
    return vehicleType?.name || '-';
  };

  const getTripTypeLabel = (request) => {
    if (request.type === 'platform') return 'Corporativa';
    if (request.type === 'own') return 'Própria';
    if (request.type === 'direct_booking') return 'Particular';
    if (request.type === 'event_trip') return 'Evento';
    return '-';
  };

  const getTripTypeBadgeClass = (request) => {
    if (request.type === 'platform') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (request.type === 'own') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (request.type === 'direct_booking') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (request.type === 'event_trip') return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 md:py-12 text-gray-500">
        Nenhuma solicitação encontrada
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden space-y-3">
        {requests.map((request) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tripDate = request.date ? parseLocalDate(request.date) : null;
          if (tripDate) tripDate.setHours(0, 0, 0, 0);

          const isNotStartedToday = highlightNotStarted && tripDate && tripDate.getTime() === today.getTime() && request.driver_trip_status === 'aguardando';
          const needsDriver = ['aceito', 'confirmado'].includes(request.supplier_response_status) &&
                            (!request.driver_name || !request.driver_phone || !request.vehicle_model || !request.vehicle_plate);

          let cardClasses = 'border-2 hover:shadow-lg transition-all';
          if (isNotStartedToday) {
            cardClasses += ' border-amber-500 bg-amber-50';
          } else if (needsDriver) {
            cardClasses += ' border-orange-500 bg-orange-50';
          } else if (request.supplier_response_status === 'aguardando_resposta') {
            cardClasses += ' border-red-500 bg-red-50';
          }

          return (
            <Card key={request.id} className={cardClasses}>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    {onSelectionChange && (
                      <Checkbox 
                        checked={selectedTrips.includes(request.id)}
                        onCheckedChange={(checked) => {
                          if (checked) onSelectionChange([...selectedTrips, request.id]);
                          else onSelectionChange(selectedTrips.filter(id => id !== request.id));
                        }}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-bold text-blue-600 text-sm">
                        {request.request_number}
                      </div>
                      {showUrgencyIndicator && getUrgencyBadge(request)}
                    </div>
                    <StatusBadge status={request.supplier_response_status} type="request" className="text-[10px]" />
                  </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="font-medium truncate">{request.origin}</div>
                    <div className="text-gray-500 truncate">→ {request.destination}</div>
                  </div>

                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div><span className="text-gray-500">Passageiro:</span> <span className="font-medium text-gray-900">{request.passenger_name || '-'}</span></div>
                    <div><span className="text-gray-500">Cliente:</span> <span className="font-medium text-gray-900">{request.client_name_display || '-'}</span></div>
                    <div>
                      <Badge className={`${getTripTypeBadgeClass(request)} text-[10px]`}>
                        {getTripTypeLabel(request)}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold">{parseLocalDate(request.date).toLocaleDateString('pt-BR')}</div>
                      <div className="text-gray-500">{request.time}</div>
                    </div>
                    {request.chosen_supplier_cost && (
                      <div className="font-bold text-green-600">
                        {formatPrice(request.chosen_supplier_cost)}
                      </div>
                    )}
                  </div>

                  {showTripStatus && (
                    <div className="pt-2 border-t">
                      <StatusBadge status={request.driver_trip_status} type="trip" className="text-xs" />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 pt-2">
                    {renderActionMenu(request, true)}
                    {request.subcontractor_id && !request.subcontractor_cost && (
                        <Badge className="bg-purple-100 text-purple-800 text-[10px] h-8 flex items-center justify-center">
                            Aguardando Parceiro
                        </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TooltipProvider>
        <div className="hidden md:block rounded-lg border bg-white overflow-hidden">
          <Table className="min-w-[1180px]">
          <TableHeader>
            <TableRow className="bg-gray-50">
              {onSelectionChange && (
                <TableHead className="w-[50px] text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-normal leading-none">Selec.</span>
                    <Checkbox 
                      checked={requests.length > 0 && requests.every(r => selectedTrips.includes(r.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const newSelected = [...new Set([...selectedTrips, ...requests.map(r => r.id)])];
                          onSelectionChange(newSelected);
                        } else {
                          const newSelected = selectedTrips.filter(id => !requests.some(r => r.id === id));
                          onSelectionChange(newSelected);
                        }
                      }}
                      title="Selecionar todas as viagens visíveis"
                    />
                  </div>
                </TableHead>
              )}
              {showUrgencyIndicator && <TableHead className="font-semibold">Urgência</TableHead>}
              <TableHead className="font-semibold px-2 w-[88px]">
                <button
                  onClick={() => onSort('request_number')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Nº
                  {getSortIcon('request_number')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2 w-[150px]">
                <button
                  onClick={() => onSort('passenger_name')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Passageiro
                  {getSortIcon('passenger_name')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2 w-[155px]">
                <button
                  onClick={() => onSort('client_name_display')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Cliente
                  {getSortIcon('client_name_display')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2 w-[95px]">
                <button
                  onClick={() => onSort('trip_type')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Tipo
                  {getSortIcon('trip_type')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2 w-[260px]">
                <button
                  onClick={() => onSort('origin')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Rota
                  {getSortIcon('origin')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2 w-[110px]">
                <button
                  onClick={() => onSort('date_time')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Data
                  {getSortIcon('date_time')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2 w-[56px] text-center">
                <button
                  onClick={() => onSort('passengers')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Pax
                  {getSortIcon('passengers')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2 w-[92px]">
                <button
                  onClick={() => onSort('chosen_supplier_cost')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Valor
                  {getSortIcon('chosen_supplier_cost')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2 w-[98px] sticky right-[210px] z-20 bg-gray-50 shadow-[-1px_0_0_0_rgba(229,231,235,1)]">
                <button
                  onClick={() => onSort('supplier_response_status')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Status
                  {getSortIcon('supplier_response_status')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2 w-[92px] sticky right-[118px] z-20 bg-gray-50 shadow-[-1px_0_0_0_rgba(229,231,235,1)]">
                <button
                  onClick={() => onSort('chosen_vehicle_type_name')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Veículo
                  {getSortIcon('chosen_vehicle_type_name')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2 w-[104px] sticky right-0 z-20 bg-gray-50 shadow-[-1px_0_0_0_rgba(229,231,235,1)]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const today = new Date();
              today.setHours(0,0,0,0);
              const tripDate = request.date ? parseLocalDate(request.date) : null;
              if(tripDate) tripDate.setHours(0,0,0,0);

              const isNotStartedToday = highlightNotStarted && tripDate && tripDate.getTime() === today.getTime() && request.driver_trip_status === 'aguardando';
              const needsDriver = ['aceito', 'confirmado'].includes(request.supplier_response_status) &&
                                (!request.driver_name || !request.driver_phone || !request.vehicle_model || !request.vehicle_plate);

              let rowClasses = 'hover:bg-gray-50';
              if (isNotStartedToday) {
                rowClasses += ' bg-amber-50 border-l-4 border-amber-600';
              } else if (needsDriver) {
                rowClasses += ' bg-orange-50 border-l-4 border-orange-600';
              } else if (request.supplier_response_status === 'aguardando_resposta') {
                  rowClasses += ' bg-red-50 border-l-4 border-red-600';
              }

              return (
                <Tooltip key={request.id}>
                  <TooltipTrigger asChild>
                    <TableRow
                      className={`${rowClasses} cursor-help`}
                    >
                  {onSelectionChange && (
                    <TableCell>
                      <Checkbox 
                        checked={selectedTrips.includes(request.id)}
                        onCheckedChange={(checked) => {
                          if (checked) onSelectionChange([...selectedTrips, request.id]);
                          else onSelectionChange(selectedTrips.filter(id => id !== request.id));
                        }}
                      />
                    </TableCell>
                  )}
                  {showUrgencyIndicator && (
                    <TableCell>
                      {getUrgencyBadge(request)}
                    </TableCell>
                  )}
                  <TableCell className="px-2">
                    <div className="font-mono font-semibold text-blue-600 text-xs md:text-sm">
                      {request.request_number}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 w-[150px] max-w-[150px]">
                    <div className="text-xs md:text-sm font-medium text-gray-900 truncate" title={request.passenger_name || '-'}>
                      {request.passenger_name || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 w-[155px] max-w-[155px]">
                    <div className="text-xs md:text-sm text-gray-700 truncate" title={request.client_name_display || '-'}>
                      {request.client_name_display || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="px-2">
                    <Badge className={`${getTripTypeBadgeClass(request)} text-[10px] md:text-xs border`}>
                      {getTripTypeLabel(request)}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-[260px] max-w-[260px] px-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-xs md:text-sm" title={request.origin}>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                        <span className="truncate font-medium text-gray-900">{request.origin}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs md:text-sm" title={request.destination}>
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        <span className="truncate font-medium text-gray-900">{request.destination}</span>
                      </div>
                      {request.distance_km > 0 && (
                        <div className="text-[10px] text-gray-400 ml-2.5">{request.distance_km} km</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 w-[110px]">
                    <div className="text-xs md:text-sm whitespace-nowrap">
                      <div className="font-bold">{parseLocalDate(request.date).toLocaleDateString('pt-BR')}</div>
                      <div className="text-gray-500">{request.time}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center px-2 w-[56px]">{request.passengers}</TableCell>
                  <TableCell className="px-2 w-[92px]">
                    <div className="font-semibold text-green-600 text-xs md:text-sm whitespace-nowrap">
                      {formatPrice(request.value_display)}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 w-[98px] sticky right-[210px] z-10 bg-white shadow-[-1px_0_0_0_rgba(229,231,235,1)]">
                    <div className="scale-90 origin-left">
                    {request.driver_name ? (
                      <StatusBadge status={request.driver_trip_status || request.driver_current_status || 'aguardando'} type="trip" />
                    ) : (
                      request.type === 'own' ? (
                        <StatusBadge status={request.unified_status} type="request" />
                      ) : request.type === 'direct_booking' ? (
                        <StatusBadge status={request.unified_status} type="booking" />
                      ) : (
                        <StatusBadge status={request.supplier_response_status} type="request" />
                      )
                    )}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 w-[92px] sticky right-[118px] z-10 bg-white shadow-[-1px_0_0_0_rgba(229,231,235,1)]">
                    <div className="text-xs md:text-sm text-gray-700 truncate max-w-[88px]" title={getVehicleTypeName(request.chosen_vehicle_type_id)}>
                      {getVehicleTypeName(request.chosen_vehicle_type_id)}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 w-[104px] sticky right-0 z-10 bg-white shadow-[-1px_0_0_0_rgba(229,231,235,1)]">
                     <div className="flex items-center justify-end gap-1">
                      {request.subcontractor_id && !request.subcontractor_cost && (
                         <span title="Aguardando Parceiro" className="text-purple-400 cursor-help"><Users className="w-4 h-4" /></span>
                      )}
                      {renderActionMenu(request)}
                      </div>
                  </TableCell>
                    </TableRow>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 max-w-sm z-50">
                    <RequestSummaryTooltip request={request} />
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TableBody>
          </Table>
        </div>
      </TooltipProvider>
    </>
  );
}