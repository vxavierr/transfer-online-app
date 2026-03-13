import React from 'react';
// import { format } from 'date-fns';
// import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Building2, User, Truck, ArrowUp, ArrowDown, ArrowUpDown, MoreHorizontal, CheckCircle, XCircle, Clock, CheckSquare, MessageSquare, Share2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

      export default function UnifiedTripTable({ 
        trips, 
        tripIdsWithComments, 
        onViewDetails, 
        onUpdateStatus, 
        onAccept, 
        onGenerateTimelineLink, 
        sortColumn, 
        sortDirection, 
        onSort,
        selectedTrips = [],
        onSelectionChange
      }) {
        const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  const getStatusColor = (trip) => {
    const status = trip.status;
    const data = trip.original_data || {};
    // Verifica se tem motorista atribuído (nome ou ID)
    const hasDriver = !!(data.driver_name || data.driver_id || data.casual_driver_name || data.subcontractor_driver_name);

    if (status === 'confirmada') {
      // Se confirmada e tem motorista: Verde
      // Se confirmada e NÃO tem motorista: Laranja/Amarelo (Alerta)
      return hasDriver 
        ? 'bg-green-100 text-green-800 border-green-300' 
        : 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
    }

    const colors = {
      pendente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      rascunho: 'bg-gray-100 text-gray-800 border-gray-300',
      aguardando_fornecedor: 'bg-orange-100 text-orange-800 border-orange-300',
      em_andamento: 'bg-blue-100 text-blue-800 border-blue-300',
      concluida: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      cancelada: 'bg-red-100 text-red-800 border-red-300',
      dispatched: 'bg-blue-100 text-blue-800 border-blue-300',
      scheduled: 'bg-green-100 text-green-800 border-green-300',
      active: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (trip) => {
    const status = trip.status;
    const data = trip.original_data || {};
    const hasDriver = !!(data.driver_name || data.driver_id || data.casual_driver_name || data.subcontractor_driver_name);

    if (status === 'confirmada') {
      return hasDriver ? 'Confirmada (Atribuído)' : 'Confirmada (Não Atribuído)';
    }

    const labels = {
      pendente: 'Pendente',
      rascunho: 'Rascunho',
      aguardando_fornecedor: 'Aguardando Fornec.',
      em_andamento: 'Em Andamento',
      concluida: 'Concluída',
      cancelada: 'Cancelada',
      dispatched: 'Em Andamento',
      scheduled: 'Confirmada',
      active: 'Em Andamento',
      completed: 'Concluída'
    };
    return labels[status] || status;
  };

  const getDriverStatusBadge = (driverTripStatus) => {
    const configs = {
      aguardando: { label: 'Aguardando', color: 'bg-gray-100 text-gray-800' },
      a_caminho: { label: 'A Caminho', color: 'bg-blue-100 text-blue-800' },
      chegou_origem: { label: 'Na Origem', color: 'bg-indigo-100 text-indigo-800' },
      passageiro_embarcou: { label: 'Em Viagem', color: 'bg-purple-100 text-purple-800' },
      parada_adicional: { label: 'Parada', color: 'bg-orange-100 text-orange-800' },
      chegou_destino: { label: 'No Destino', color: 'bg-green-100 text-green-800' },
      aguardando_confirmacao_despesas: { label: 'Aguardando Conf.', color: 'bg-yellow-100 text-yellow-800' },
      finalizada: { label: 'Finalizada', color: 'bg-emerald-100 text-emerald-800' },
      no_show: { label: 'Não Compareceu', color: 'bg-red-100 text-red-800' },
      cancelada_motorista: { label: 'Cancelada (Mot.)', color: 'bg-red-100 text-red-800' },
    };
    const config = configs[driverTripStatus] || { label: '-', color: 'bg-gray-100 text-gray-400' };
    // Só mostrar badge se tiver status válido
    if (!driverTripStatus) return <span className="text-gray-400 text-xs">-</span>;
    return <Badge className={`${config.color} text-xs border whitespace-nowrap`}>{config.label}</Badge>;
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'booking':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><User className="w-3 h-3 mr-1" /> Particular</Badge>;
      case 'service_request':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200"><Building2 className="w-3 h-3 mr-1" /> Corporativo</Badge>;
      case 'supplier_own_booking':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><Truck className="w-3 h-3 mr-1" /> Fornecedor</Badge>;
      case 'event_trip':
        return <Badge className="bg-teal-100 text-teal-800 border-teal-200"><Clock className="w-3 h-3 mr-1" /> Evento</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />;
  };

  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden">
        <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow className="bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800">
            {onSelectionChange && (
              <TableHead className="w-[40px] px-2">
                <Checkbox 
                  checked={trips.length > 0 && trips.every(t => selectedTrips.includes(t.id))}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const newSelected = [...new Set([...selectedTrips, ...trips.map(t => t.id)])];
                      onSelectionChange(newSelected);
                    } else {
                      const newSelected = selectedTrips.filter(id => !trips.some(t => t.id === id));
                      onSelectionChange(newSelected);
                    }
                  }}
                />
              </TableHead>
            )}
            <TableHead className="w-[70px] px-2 font-semibold cursor-pointer text-gray-700 dark:text-gray-300" onClick={() => onSort('display_id')}>
              <div className="flex items-center">ID <SortIcon column="display_id" /></div>
            </TableHead>
            <TableHead className="w-[90px] px-2 font-semibold cursor-pointer text-gray-700 dark:text-gray-300 hidden sm:table-cell" onClick={() => onSort('type')}>
              <div className="flex items-center">Tipo <SortIcon column="type" /></div>
            </TableHead>
            <TableHead className="w-[180px] px-2 font-semibold cursor-pointer text-gray-700 dark:text-gray-300" onClick={() => onSort('passenger_name')}>
              <div className="flex items-center">Passageiro <SortIcon column="passenger_name" /></div>
            </TableHead>
            <TableHead className="w-[140px] px-2 font-semibold cursor-pointer text-gray-700 dark:text-gray-300 hidden md:table-cell" onClick={() => onSort('origin')}>
              <div className="flex items-center">Rota <SortIcon column="origin" /></div>
            </TableHead>
            <TableHead className="w-[100px] px-2 font-semibold cursor-pointer text-gray-700 dark:text-gray-300" onClick={() => onSort('date_time')}>
              <div className="flex items-center">Data <SortIcon column="date_time" /></div>
            </TableHead>
            <TableHead className="w-[100px] px-2 font-semibold cursor-pointer text-gray-700 dark:text-gray-300 hidden 2xl:table-cell" onClick={() => onSort('created_date')}>
              <div className="flex items-center">Criado <SortIcon column="created_date" /></div>
            </TableHead>

            <TableHead className="w-[110px] px-2 font-semibold text-center cursor-pointer text-gray-700 dark:text-gray-300" onClick={() => onSort('status')}>
              <div className="flex items-center justify-center">Status <SortIcon column="status" /></div>
            </TableHead>
            <TableHead className="w-[110px] px-2 font-semibold text-center hidden lg:table-cell">Status Motorista</TableHead>
            <TableHead className="w-[50px] px-2 font-semibold text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trips.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                Nenhuma viagem encontrada
              </TableCell>
            </TableRow>
          ) : (
            trips.map((trip) => (
              <Tooltip key={`${trip.type}-${trip.id}`}>
                <TooltipTrigger asChild>
                  <TableRow className="hover:bg-gray-50 dark:hover:bg-slate-800/50 border-gray-200 dark:border-slate-800 cursor-help">
                    {onSelectionChange && (
                  <TableCell className="px-2 py-2">
                    <Checkbox 
                      checked={selectedTrips.includes(trip.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onSelectionChange([...selectedTrips, trip.id]);
                        } else {
                          onSelectionChange(selectedTrips.filter(id => id !== trip.id));
                        }
                      }}
                    />
                  </TableCell>
                )}
                <TableCell className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    <div className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {trip.display_id || '-'}
                    </div>
                    {tripIdsWithComments && tripIdsWithComments.has(trip.id) && (
                      <div className="bg-blue-100 p-0.5 rounded-full">
                        <MessageSquare className="w-2.5 h-2.5 text-blue-600" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2 hidden sm:table-cell">
                  <div className="scale-90 origin-left transform flex flex-col gap-1 items-start">
                    {getTypeBadge(trip.type)}
                    {(trip.original_data?.driver_language === 'en' || trip.original_data?.driver_language === 'es') && (
                      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] px-1.5 py-0 h-4 whitespace-nowrap">
                        {trip.original_data.driver_language === 'en' ? 'Bilíngue EN' : 'Bilíngue ES'}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <div className="truncate max-w-[170px]" title={trip.passenger_name}>
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{trip.passenger_name}</div>
                    {trip.client_name && trip.client_name !== trip.passenger_name && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                        <Building2 className="w-3 h-3 flex-shrink-0" /> {trip.client_name}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2 hidden md:table-cell">
                  <div className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[130px]">
                    <div className="font-medium truncate" title={trip.origin}>{trip.origin}</div>
                    {trip.destination && (
                      <div className="text-gray-500 dark:text-gray-400 truncate" title={trip.destination}>→ {trip.destination}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    <div>{trip.date ? trip.date.split('-').reverse().join('/') : '-'}</div>
                    <div className="text-gray-500 dark:text-gray-400">{trip.time}</div>
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2 hidden 2xl:table-cell">
                  <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    <div>{new Date(trip.created_date).toLocaleDateString('pt-BR')}</div>
                  </div>
                </TableCell>

                <TableCell className="px-2 py-2 text-center">
                  <Badge className={`${getStatusColor(trip)} border text-[10px] px-1 py-0 h-5 whitespace-nowrap truncate max-w-[100px]`}>
                    {getStatusLabel(trip)}
                  </Badge>
                </TableCell>
                <TableCell className="px-2 py-2 text-center hidden lg:table-cell">
                  <div className="scale-90 origin-center transform">
                    {getDriverStatusBadge(
                      trip.type === 'booking' 
                        ? trip.original_data.driver_current_status 
                        : trip.original_data.driver_trip_status
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onViewDetails(trip)}>
                        <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                      </DropdownMenuItem>
                      {onGenerateTimelineLink && (trip.type === 'service_request' || trip.type === 'supplier_own_booking') && (
                        <DropdownMenuItem onClick={() => onGenerateTimelineLink(trip)}>
                          <Share2 className="mr-2 h-4 w-4 text-blue-600" /> Copiar Link Timeline
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onAccept ? onAccept(trip) : onUpdateStatus(trip, 'confirmada')}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Confirmar / Aceitar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus(trip, 'concluida')}>
                        <CheckSquare className="mr-2 h-4 w-4 text-blue-600" /> Concluir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus(trip, 'pendente')}>
                        <Clock className="mr-2 h-4 w-4 text-yellow-600" /> Pendente
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onUpdateStatus(trip, 'cancelada')} className="text-red-600">
                        <XCircle className="mr-2 h-4 w-4" /> Cancelar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-slate-800 max-w-sm z-50">
              <div className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                  <span className="font-bold text-base text-gray-900 dark:text-white">{trip.display_id}</span>
                  <Badge variant="outline" className="text-[10px] h-5">{getStatusLabel(trip)}</Badge>
                </div>
                
                <div className="grid grid-cols-[80px_1fr] gap-1">
                  <span className="font-semibold text-gray-500">Passageiro:</span>
                  <span className="font-medium text-gray-900 dark:text-white truncate">{trip.passenger_name}</span>
                  
                  <span className="font-semibold text-gray-500">Cliente:</span>
                  <span className="truncate">{trip.client_name || '-'}</span>
                  
                  <span className="font-semibold text-gray-500">Data:</span>
                  <span>{trip.date ? trip.date.split('-').reverse().join('/') : '-'} às {trip.time}</span>
                  
                  <span className="font-semibold text-gray-500">Rota:</span>
                  <div className="flex flex-col">
                    <span className="truncate text-xs text-gray-500">{trip.origin}</span>
                    <ArrowDown className="w-3 h-3 my-0.5 text-gray-300" />
                    <span className="truncate text-xs text-gray-500">{trip.destination}</span>
                  </div>
                </div>

                {(trip.driver_name || (trip.original_data && (trip.original_data.driver_name || trip.original_data.driver_id))) && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 -mx-4 -mb-4 p-3 rounded-b-lg">
                    <div className="font-semibold text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> MOTORISTA
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {trip.driver_name || trip.original_data?.driver_name || 'Motorista'}
                    </div>
                    {(trip.original_data?.vehicle_model || trip.original_data?.vehicle_plate) && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {trip.original_data.vehicle_model} 
                        {trip.original_data.vehicle_plate && <span className="bg-gray-200 dark:bg-slate-700 px-1 rounded ml-1">{trip.original_data.vehicle_plate}</span>}
                      </div>
                    )}
                    {trip.original_data?.driver_phone && (
                      <div className="text-xs text-blue-600 mt-1">{trip.original_data.driver_phone}</div>
                    )}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))
          )}
        </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}