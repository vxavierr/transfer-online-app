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
  ArrowUpCircle
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';

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
    return null;
  };

  const canManageDriver = (request) => {
    if (request.type === 'own' || request.type === 'direct_booking') return true;
    return ['aceito', 'confirmado'].includes(request.supplier_response_status);
  };

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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(request)}
                      className="flex-1 text-xs h-8"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Ver
                    </Button>
                    {showActions && request.supplier_response_status === 'aguardando_resposta' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(request)}
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                          className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          {acceptMutation.isPending && acceptMutation.variables?.id === request.id ? (
                            <span className="animate-spin mr-1">⌛</span>
                          ) : (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          Aceitar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReject(request)}
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                          variant="destructive"
                          className="flex-1 text-xs h-8 disabled:opacity-50"
                        >
                          {rejectMutation.isPending && rejectMutation.variables?.id === request.id ? (
                            <span className="animate-spin mr-1">⌛</span>
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          Recusar
                        </Button>
                      </>
                    )}
                    {showDriverAction && canManageDriver(request) && (
                      <Button
                        size="sm"
                        onClick={() => onManageDriver(request)}
                        className="flex-1 text-xs h-8 bg-blue-600 hover:bg-blue-700"
                      >
                        <Car className="w-3 h-3 mr-1" />
                        Motorista
                      </Button>
                    )}
                    {showTripStatus && request.status !== 'concluida' && request.status !== 'cancelada' && request.driver_name && (
                        <Button
                            size="sm"
                            onClick={() => onStatusChange(request)}
                            className="flex-1 text-xs h-8 bg-orange-600 hover:bg-orange-700"
                            title="Mudar Status da Viagem"
                        >
                            <ArrowUpCircle className="w-3 h-3 mr-1" />
                            Status
                        </Button>
                    )}
                    {supplier?.features?.can_subcontract && ['aceito', 'confirmado', 'pendente', 'em_andamento', 'aguardando_resposta'].includes(request.unified_status || request.supplier_response_status) && (
                        <Button
                            size="sm"
                            onClick={() => onSubcontract(request)}
                            className="flex-1 text-xs h-8 bg-purple-600 hover:bg-purple-700"
                            title="Subcontratar Parceiro"
                        >
                            <Users className="w-3 h-3 mr-1" />
                            {request.subcontractor_id ? 'Parceiro' : 'Parceiro'}
                        </Button>
                    )}
                    {request.subcontractor_id && !request.supplier_margin_on_subcontractor && request.subcontractor_cost && (
                        <Button
                            size="sm"
                            onClick={() => onApproveSubcontract(request)}
                            className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700 animate-pulse"
                            title="Aprovar Cotação do Parceiro"
                        >
                            <DollarSign className="w-3 h-3 mr-1" />
                            Aprovar
                        </Button>
                    )}
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

      <div className="hidden md:block rounded-lg border bg-white overflow-hidden">
        <Table>
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
              <TableHead className="font-semibold px-2">
                <button
                  onClick={() => onSort('request_number')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Nº
                  {getSortIcon('request_number')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2">
                <button
                  onClick={() => onSort('origin')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Rota
                  {getSortIcon('origin')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2">
                <button
                  onClick={() => onSort('date_time')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Data
                  {getSortIcon('date_time')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2">
                <button
                  onClick={() => onSort('passengers')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Pax
                  {getSortIcon('passengers')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2">
                <button
                  onClick={() => onSort('chosen_supplier_cost')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Valor
                  {getSortIcon('chosen_supplier_cost')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2">
                <button
                  onClick={() => onSort('supplier_response_status')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Status
                  {getSortIcon('supplier_response_status')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2">
                <button
                  onClick={() => onSort('chosen_vehicle_type_name')}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  Veículo
                  {getSortIcon('chosen_vehicle_type_name')}
                </button>
              </TableHead>
              <TableHead className="font-semibold px-2">Ações</TableHead>
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
                <TableRow
                  key={request.id}
                  className={rowClasses}
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
                    <div className="flex flex-col">
                      <div className="font-mono font-semibold text-blue-600 text-xs md:text-sm">
                        {request.request_number}
                      </div>
                      {request.type === 'own' ? (
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] w-fit mt-1 px-1 py-0">
                          Própria
                        </Badge>
                      ) : request.type === 'direct_booking' ? (
                        <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] w-fit mt-1 px-1 py-0">
                          Particular
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px] w-fit mt-1 px-1 py-0">
                          Plataforma
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[250px] px-2">
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
                  <TableCell className="px-2">
                    <div className="text-xs md:text-sm">
                      <div className="font-bold">{parseLocalDate(request.date).toLocaleDateString('pt-BR')}</div>
                      <div className="text-gray-500">{request.time}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center px-2">{request.passengers}</TableCell>
                  <TableCell className="px-2">
                    <div className="font-semibold text-green-600 text-xs md:text-sm">
                      {formatPrice(request.value_display)}
                    </div>
                  </TableCell>
                  <TableCell className="px-2">
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
                  <TableCell className="px-2">
                    <div className="text-xs md:text-sm text-gray-700 truncate max-w-[100px]" title={getVehicleTypeName(request.chosen_vehicle_type_id)}>
                      {getVehicleTypeName(request.chosen_vehicle_type_id)}
                    </div>
                  </TableCell>
                  <TableCell className="px-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(request)}
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {showActions && request.supplier_response_status === 'aguardando_resposta' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAccept(request)}
                            disabled={acceptMutation.isPending || rejectMutation.isPending}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 disabled:opacity-50"
                            title="Aceitar"
                          >
                            {acceptMutation.isPending && acceptMutation.variables?.id === request.id ? (
                                <span className="animate-spin">⌛</span>
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(request)}
                            disabled={acceptMutation.isPending || rejectMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                            title="Recusar"
                          >
                            {rejectMutation.isPending && rejectMutation.variables?.id === request.id ? (
                                <span className="animate-spin">⌛</span>
                            ) : (
                                <XCircle className="w-4 h-4" />
                            )}
                          </Button>
                        </>
                      )}
                      {showDriverAction && canManageDriver(request) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onManageDriver(request)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Gerenciar Motorista"
                        >
                          <Car className="w-4 h-4" />
                        </Button>
                      )}
                      {showTripStatus && request.status !== 'concluida' && request.status !== 'cancelada' && request.driver_name && (
                          <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onStatusChange(request)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              title="Mudar Status da Viagem"
                          >
                              <ArrowUpCircle className="w-4 h-4" />
                          </Button>
                      )}
                      {supplier?.features?.can_subcontract && ['aceito', 'confirmado', 'pendente', 'em_andamento', 'aguardando_resposta'].includes(request.unified_status || request.supplier_response_status) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSubcontract(request)}
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            title={request.subcontractor_id ? "Alterar Parceiro" : "Subcontratar Parceiro"}
                        >
                            <Users className="w-4 h-4" />
                        </Button>
                      )}
                      {request.subcontractor_id && !request.supplier_margin_on_subcontractor && request.subcontractor_cost && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onApproveSubcontract(request)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 animate-pulse"
                            title="Aprovar Cotação"
                        >
                            <DollarSign className="w-4 h-4" />
                        </Button>
                      )}
                      {request.subcontractor_id && !request.subcontractor_cost && (
                         <span title="Aguardando Parceiro" className="text-purple-400 cursor-help"><Users className="w-4 h-4" /></span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}