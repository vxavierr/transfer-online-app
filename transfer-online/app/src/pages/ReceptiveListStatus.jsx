import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Plane,
  User,
  Car,
  Phone,
  MapPin,
  AlertCircle,
  CalendarIcon,
  Building2,
  Image as ImageIcon,
  Users,
  ArrowUpDown,
  SortAsc,
  Plus,
  Map,
  Play,
  CheckSquare,
  MapPinned,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  LogOut,
  Undo
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TripTimeline from '@/components/receptive/TripTimeline';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PassengerActionsMenu from '@/components/receptive/PassengerActionsMenu';
import { BrowserService } from '@/native';

// Sub-componente para controlar o estado local de cada card (seleção de ponto)
function RequestCard({ request, getClientName, getReceptivityBadge, handleOpenAddPassenger, handleUpdateStatus, handlePassengerStatusUpdate, handleNotCompletedClick, updatingStatus, handlePassengerDepartureUpdate, updatingDepartureStatus }) {
    const [selectedPoint, setSelectedPoint] = useState('');
    const [isRouteExpanded, setIsRouteExpanded] = useState(false);
    const [selectedDeparturePoint, setSelectedDeparturePoint] = useState('');
    const [isDepartureExpanded, setIsDepartureExpanded] = useState(true);
    const [activePassengerTab, setActivePassengerTab] = useState('pendente');
    const [activeDepartureTab, setActiveDepartureTab] = useState('pendente');
    const [departureNotes, setDepartureNotes] = useState({});

    // Lista de pontos disponíveis para seleção
    const stops = request.planned_stops || request.additional_stops || [];
    const points = [
        { value: 'origin', label: `Origem: ${request.origin}`, type: 'origin' },
        ...stops.map((stop, idx) => ({
            value: stop.address,
            label: `Parada ${idx + 1}: ${stop.address}`,
            type: 'stop'
        })),
        { value: 'destination', label: `Destino: ${request.destination}`, type: 'destination' }
    ];

    // Filtrar passageiros relevantes para o ponto selecionado
    let allPassengers = [];

    // Construir lista normalizada
    if (request.passenger_receptivity_statuses && request.passenger_receptivity_statuses.length > 0) {
        allPassengers = request.passenger_receptivity_statuses.map((p, i) => {
            const details = request.passengers_details?.[i] || {};
            return { ...p, originalIndex: i, details };
        });
    } else if (request.passengers_details && request.passengers_details.length > 0) {
        allPassengers = request.passengers_details.map((p, i) => ({
            name: p.name,
            status: 'pending',
            notes: '',
            originalIndex: i,
            details: p
        }));
    } else {
        allPassengers = Array.from({ length: request.passengers || 1 }).map((_, i) => ({
            name: i === 0 ? (request.passenger_name || 'Passageiro Principal') : `Passageiro ${i + 1}`,
            status: 'pending',
            notes: '',
            originalIndex: i,
            details: { boarding_point: 'origin', disembarking_point: 'destination' }
        }));
    }

    // Ordenar alfabeticamente
    allPassengers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Aplicar filtro
    const filteredPassengers = allPassengers.filter(p => {
        // 1. Filtro por Aba Interna (Status)
        if (activePassengerTab === 'pendente' && p.status !== 'pending') return false;
        if (activePassengerTab === 'embarcados' && p.status !== 'arrived') return false;
        if (activePassengerTab === 'noshow' && p.status !== 'no_show') return false;

        // 2. Filtro por Ponto de Controle (se selecionado)
        if (!selectedPoint) return true;

        // Normalizar pontos
        const pBoarding = p.details?.boarding_point || 'origin';
        const pDisembarking = p.details?.disembarking_point || 'destination';

        // Se ponto selecionado é origem, mostrar quem embarca na origem
        if (selectedPoint === 'origin') {
             return pBoarding === 'origin' || pBoarding === request.origin;
        }
        // Se ponto selecionado é destino, mostrar quem desembarca no destino
        if (selectedPoint === 'destination') {
             return pDisembarking === 'destination' || pDisembarking === request.destination;
        }
        // Se é uma parada, mostrar quem embarca OU desembarca nela
        return pBoarding === selectedPoint || pDisembarking === selectedPoint;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return (
        <Card className="hover:shadow-md transition-shadow border-0 sm:border sm:rounded-xl shadow-sm sm:shadow-md mb-4 overflow-hidden">
            {/* Cabeçalho Mobile Friendly */}
            <div className="bg-gradient-to-r from-blue-50 to-white p-4 border-b">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                        <span className="font-mono font-bold text-blue-600 text-lg tracking-tight">
                            {request.request_number}
                        </span>
                        <div className="flex items-center gap-2 text-gray-600 mt-1">
                            <Clock className="w-4 h-4" />
                            <span className="font-bold text-xl">
                                {request.date ? format(parseISO(request.date), "dd/MM", { locale: ptBR }) : ''} • {request.time}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {getReceptivityBadge()}
                    </div>
                </div>

                {request.origin_flight_number && (
                    <div className="flex items-center gap-2 bg-white border border-blue-100 px-3 py-1.5 rounded-full w-fit shadow-sm mb-2">
                        <Plane className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-blue-800 text-sm">
                            Voo: {request.origin_flight_number}
                        </span>
                    </div>
                )}
            </div>

            <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-6">
                {/* Seção de Rota Simplificada */}
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="mt-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="w-0.5 h-full bg-gray-200 mx-auto my-1"></div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-semibold">Origem</span>
                            <div className="text-sm text-gray-900 font-medium">{request.origin}</div>
                        </div>
                    </div>

                    {/* Paradas Intermediárias Visíveis */}
                    {(request.planned_stops || request.additional_stops) && (request.planned_stops || request.additional_stops).length > 0 && (
                        <div className="pl-0 space-y-3">
                            {(request.planned_stops || request.additional_stops).map((stop, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <div className="mt-1">
                                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                        {idx < request.planned_stops.length - 1 && <div className="w-0.5 h-full bg-gray-200 mx-auto my-1"></div>}
                                        {idx === request.planned_stops.length - 1 && <div className="w-0.5 h-full bg-gray-200 mx-auto my-1"></div>}
                                    </div>
                                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 w-full">
                                        <span className="text-xs text-orange-700 uppercase font-bold flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> Parada {idx + 1}
                                        </span>
                                        <div className="text-sm text-gray-900 font-medium mt-0.5">{stop.address}</div>
                                        {stop.notes && <div className="text-xs text-gray-500 italic mt-1">"{stop.notes}"</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-start gap-3">
                        <div className="mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-semibold">Destino Final</span>
                            <div className="text-sm text-gray-900 font-medium">{request.destination}</div>
                        </div>
                    </div>
                </div>

                {/* Cards de Informações */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Info Receptivo */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-500 mb-2 uppercase font-semibold tracking-wider">Detalhes do Receptivo</div>
                        
                        {request.receptive_performed_by && (
                            <div className="text-sm mb-2">
                                <span className="font-medium text-gray-700">Responsável:</span>{' '}
                                {request.receptive_performed_by === 'driver' && 'Motorista'}
                                {request.receptive_performed_by === 'contracted_company' && 'Empresa Contratada'}
                                {request.receptive_performed_by === 'other_means' && 'Outros Meios'}
                            </div>
                        )}

                        {request.receptive_sign_url && (
                            <div className="mt-2">
                                <div className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" /> Placa:
                                </div>
                                <img
                                    src={request.receptive_sign_url}
                                    alt="Placa"
                                    className="w-full h-24 object-cover rounded border bg-white cursor-pointer"
                                    onClick={() => BrowserService.open(request.receptive_sign_url, '_blank')}
                                />
                            </div>
                        )}

                        {request.receptive_notes && (
                            <div className="mt-2 text-xs bg-white p-2 rounded border border-gray-200 text-gray-600 italic">
                                "{request.receptive_notes}"
                            </div>
                        )}
                    </div>


                </div>

                {/* NOVO: Exibir motivo se não efetuada */}
                {request.receptivity_status === 'nao_efetuada' && request.receptivity_not_completed_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Motivo da Não Realização:
                        </div>
                        <div className="text-sm text-red-800">
                            {request.receptivity_not_completed_reason}
                        </div>
                    </div>
                )}

                {/* SELEÇÃO DE PONTO E LISTA DE PASSAGEIROS */}
                <div className="mt-2">
                    <Tabs value={activePassengerTab} onValueChange={setActivePassengerTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-3">
                            <TabsTrigger value="pendente" className="text-xs h-8">
                                Pendentes <Badge variant="secondary" className="ml-1 bg-gray-200 text-gray-700 px-1 h-4 text-[10px]">{allPassengers.filter(p => p.status === 'pending').length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="embarcados" className="text-xs h-8">
                                Chegou <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700 px-1 h-4 text-[10px]">{allPassengers.filter(p => p.status === 'arrived').length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="noshow" className="text-xs h-8">
                                No Show <Badge variant="secondary" className="ml-1 bg-red-100 text-red-700 px-1 h-4 text-[10px]">{allPassengers.filter(p => p.status === 'no_show').length}</Badge>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value={activePassengerTab} className="mt-0">
                            <div className="flex justify-between items-center mb-3">
                                <h5 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Lista de Pax ({filteredPassengers.length})
                                </h5>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                    onClick={() => handleOpenAddPassenger(request)}
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Add Pax
                                </Button>
                            </div>

                            <div className="space-y-3">
                            {filteredPassengers.length > 0 ? (
                                filteredPassengers.map((p) => {
                                    // Determinar se é embarque ou desembarque neste ponto
                                    const pBoarding = p.details?.boarding_point || 'origin';
                                    const isBoarding = (selectedPoint === 'origin' && (pBoarding === 'origin' || pBoarding === request.origin)) || pBoarding === selectedPoint;

                                    return (
                                        <div key={p.originalIndex} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-2 shadow-sm">
                                            <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {isBoarding ? (
                                                    <Badge className="px-1 bg-blue-100 text-blue-700 hover:bg-blue-100 border-0" title="Embarque aqui">
                                                        <ArrowDown className="w-3 h-3" />
                                                    </Badge>
                                                ) : (
                                                    <Badge className="px-1 bg-orange-100 text-orange-700 hover:bg-orange-100 border-0" title="Desembarque aqui">
                                                        <ArrowUp className="w-3 h-3" />
                                                    </Badge>
                                                )}
                                                <span className="font-medium text-sm text-gray-800">{p.name}</span>
                                                {p.is_added_by_coordinator && (
                                                <Badge className="h-4 px-1 text-[9px] bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                                                    Novo
                                                </Badge>
                                                )}
                                                
                                                {/* Menu de Ações */}
                                                <div className="ml-1">
                                                    <PassengerActionsMenu 
                                                        passenger={p} 
                                                        request={request}
                                                        token={new URLSearchParams(window.location.search).get('token')}
                                                        onUpdate={() => {
                                                            // Recarregar a lista (chama a função handleUpdateStatus indiretamente ou refresh da página)
                                                            // O ideal seria passar a função de refresh como prop para o RequestCard e para cá
                                                            // Como não temos acesso fácil ao refresh aqui, vamos forçar um reload sutil ou apenas confiar no feedback visual local se possível
                                                            // Mas o componente PassengerActionsMenu já chama onUpdate. 
                                                            // Vamos passar uma prop onListRefresh para RequestCard
                                                            window.location.reload(); // Fallback simples temporário para garantir atualização
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <Badge className={`
                                                ${p.status === 'arrived' ? 'bg-green-100 text-green-800' : 
                                                p.status === 'no_show' ? 'bg-red-100 text-red-800' : 
                                                'bg-gray-100 text-gray-600'}
                                            `}>
                                                {p.status === 'arrived' ? 'Chegou' : p.status === 'no_show' ? 'No-Show' : 'Pendente'}
                                            </Badge>
                                            </div>

                                            <div className="flex gap-2 mt-1">
                                            <Button
                                                size="sm"
                                                variant={p.status === 'arrived' ? 'default' : 'outline'}
                                                className={`h-8 flex-1 ${p.status === 'arrived' ? 'bg-green-600 hover:bg-green-700' : 'text-green-700 border-green-200 hover:bg-green-50'}`}
                                                onClick={() => handlePassengerStatusUpdate(request.id, p.originalIndex, 'arrived')}
                                                disabled={updatingStatus[`${request.id}-p-${p.originalIndex}`]}
                                            >
                                                <CheckCircle className="w-3 h-3 mr-1" /> Chegou
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant={p.status === 'no_show' ? 'destructive' : 'outline'}
                                                className={`h-8 flex-1 ${p.status === 'no_show' ? '' : 'text-red-700 border-red-200 hover:bg-red-50'}`}
                                                onClick={() => {
                                                    handlePassengerStatusUpdate(request.id, p.originalIndex, 'no_show');
                                                }}
                                                disabled={updatingStatus[`${request.id}-p-${p.originalIndex}`]}
                                            >
                                                <XCircle className="w-3 h-3 mr-1" /> No Show
                                            </Button>

                                            {/* Botão Desfazer (Aparece se não for pendente) */}
                                            {p.status !== 'pending' && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                                    onClick={() => handlePassengerStatusUpdate(request.id, p.originalIndex, 'pending')}
                                                    disabled={updatingStatus[`${request.id}-p-${p.originalIndex}`]}
                                                    title="Desfazer / Voltar para Pendente"
                                                >
                                                    <Undo className="w-4 h-4" />
                                                </Button>
                                            )}
                                            </div>

                                            {p.status === 'no_show' && (
                                            <div className="mt-2">
                                                <input 
                                                type="text"
                                                placeholder="Motivo do não comparecimento..."
                                                className="w-full text-xs border border-red-200 rounded p-2 bg-red-50 focus:outline-none focus:border-red-400"
                                                defaultValue={p.notes || ''}
                                                onBlur={(e) => {
                                                    if (e.target.value !== (p.notes || '')) {
                                                    handlePassengerStatusUpdate(request.id, p.originalIndex, 'no_show', e.target.value);
                                                    }
                                                }}
                                                />
                                            </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded border border-dashed border-gray-200">
                                    Nenhum passageiro {activePassengerTab === 'pendente' ? 'pendente' : activePassengerTab === 'embarcados' ? 'embarcado' : 'no-show'} para {isBoardingPoint(selectedPoint) ? 'embarque' : 'desembarque'} neste ponto.
                                </div>
                            )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* ALERTA DE INÍCIO DE VIAGEM IDA (SE TODOS PROCESSADOS E AINDA NÃO INICIADA) */}
                    {(!request.receptivity_trip_status || request.receptivity_trip_status === 'aguardando') && allPassengers.length > 0 && allPassengers.filter(p => p.status === 'pending').length === 0 && (
                        <div className="mt-4 p-4 bg-green-50 border-2 border-green-400 rounded-xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-500 shadow-md">
                            <div className="bg-white p-2 rounded-full mb-2 shadow-sm">
                                <Play className="w-8 h-8 text-green-600 fill-current" />
                            </div>
                            <h4 className="text-green-800 font-bold text-lg">Pronto para Partir!</h4>
                            <p className="text-green-700 text-sm mb-4">Todos os passageiros processados. Inicie a viagem de ida.</p>
                            <Button 
                                onClick={() => handleUpdateStatus(request.id, 'efetuada')}
                                disabled={updatingStatus[request.id]}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg transform hover:scale-105 transition-all text-base py-6"
                            >
                                {updatingStatus[request.id] ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <Play className="w-5 h-5 mr-2 fill-current" />
                                )}
                                INICIAR VIAGEM (IDA)
                            </Button>
                        </div>
                    )}
                </div>

                {/* Botões de Ação - Fase 1: Receptividade (IDA) - REPOSICIONADO PARA FLUXO SEQUENCIAL */}
                <div className="space-y-2 pt-2 mt-4 border-t border-gray-100">
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ações da Viagem de Ida</h5>

                    {/* Botão INICIAR VIAGEM (IDA) */}
                    {(!request.receptivity_trip_status || request.receptivity_trip_status === 'aguardando') && (
                        <Button
                            onClick={() => handleUpdateStatus(request.id, 'efetuada')}
                            disabled={updatingStatus[request.id]}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-bold shadow-sm"
                        >
                            {updatingStatus[request.id] ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                            <Play className="w-4 h-4 mr-2 fill-current" />
                            )}
                            INICIAR VIAGEM (IDA)
                        </Button>
                    )}

                    {/* Botão FINALIZAR VIAGEM (IDA) */}
                    {request.receptivity_trip_status === 'passageiro_embarcou' && (
                        <Button
                            onClick={() => handleUpdateStatus(request.id, 'finalizada')}
                            disabled={updatingStatus[request.id]}
                            className="w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-50 font-bold shadow-sm"
                        >
                            {updatingStatus[request.id] ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                            <CheckSquare className="w-4 h-4 mr-2" />
                            )}
                            FINALIZAR VIAGEM (IDA)
                        </Button>
                    )}

                    {/* Status Fixo após finalização da IDA */}
                    {request.receptivity_trip_status === 'finalizada' && (
                        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-center text-sm font-bold border border-green-200 flex items-center justify-center gap-2 shadow-sm">
                            <CheckCircle className="w-5 h-5" /> Viagem de Ida Finalizada
                        </div>
                    )}

                    {/* Botão Falha/Não Realizada */}
                    {(!request.receptivity_trip_status || request.receptivity_trip_status === 'aguardando') && (
                        <Button
                            onClick={() => handleNotCompletedClick(request)}
                            disabled={updatingStatus[request.id]}
                            variant="ghost"
                            className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 mt-2"
                        >
                            {updatingStatus[request.id] ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                            <XCircle className="w-4 h-4 mr-2" />
                            )}
                            Cancelar / Não Compareceu (IDA)
                        </Button>
                    )}
                </div>

                {/* SEÇÃO DE SAÍDA/RETORNO (SÓ APARECE SE A IDA ESTIVER FINALIZADA) */}
                {request.receptivity_trip_status === 'finalizada' ? (
                    <div className="mt-6 p-4 border-2 border-indigo-100 bg-indigo-50/30 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <button 
                            onClick={() => setIsDepartureExpanded(!isDepartureExpanded)}
                            className="w-full flex items-center justify-between mb-4 hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                        >
                                <h5 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                <LogOut className="w-4 h-4 rotate-180" /> 
                                Controle de Saída / Retorno
                            </h5>
                            {isDepartureExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>

                        {isDepartureExpanded && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                            <div className={`mb-4 p-3 rounded-lg border transition-all duration-300 ${
                                !selectedDeparturePoint 
                                    ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-200' 
                                    : 'bg-slate-50 border-slate-200'
                            }`}>
                                <div className={`text-xs font-bold uppercase mb-2 flex items-center gap-1 ${
                                    !selectedDeparturePoint ? 'text-purple-700' : 'text-slate-500'
                                }`}>
                                    <MapPinned className="w-3 h-3" /> Ponto de Saída {!selectedDeparturePoint && '(Obrigatório)'}
                                </div>
                                <Select value={selectedDeparturePoint} onValueChange={setSelectedDeparturePoint}>
                                    <SelectTrigger className={`bg-white ${!selectedDeparturePoint ? 'border-purple-300 text-purple-900 font-medium' : ''}`}>
                                        <SelectValue placeholder="Selecione de onde estão saindo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {points.map((pt, idx) => (
                                            <SelectItem key={idx} value={pt.value}>
                                                {pt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Tabs value={activeDepartureTab} onValueChange={setActiveDepartureTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-3 mb-3">
                                    <TabsTrigger value="pendente" className="text-xs h-8">
                                        Pendentes <Badge variant="secondary" className="ml-1 bg-gray-200 text-gray-700 px-1 h-4 text-[10px]">{allPassengers.filter(p => (request.passenger_departure_statuses?.[p.originalIndex]?.status || 'pending_departure') === 'pending_departure').length}</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="embarcados" className="text-xs h-8">
                                        Embarcados <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700 px-1 h-4 text-[10px]">{allPassengers.filter(p => (request.passenger_departure_statuses?.[p.originalIndex]?.status) === 'departed').length}</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="noshow" className="text-xs h-8">
                                        No Show <Badge variant="secondary" className="ml-1 bg-red-100 text-red-700 px-1 h-4 text-[10px]">{allPassengers.filter(p => (request.passenger_departure_statuses?.[p.originalIndex]?.status) === 'departed_other_means').length}</Badge>
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value={activeDepartureTab} className="mt-0">
                                    <div className="flex justify-end mb-3">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-7 text-xs bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                                            onClick={() => handleOpenAddPassenger(request)}
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Add Pax
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {allPassengers
                                            .filter(p => {
                                                const status = request.passenger_departure_statuses?.[p.originalIndex]?.status || 'pending_departure';
                                                if (activeDepartureTab === 'pendente') return status === 'pending_departure';
                                                if (activeDepartureTab === 'embarcados') return status === 'departed';
                                                if (activeDepartureTab === 'noshow') return status === 'departed_other_means';
                                                return true;
                                            })
                                            .map((p) => {
                                            const departureStatus = request.passenger_departure_statuses?.[p.originalIndex] || { status: 'pending_departure' };

                                            return (
                                                <div key={p.originalIndex} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-2 shadow-sm">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <span className="font-medium text-sm text-gray-800">{p.name}</span>
                                                            <div className="ml-1">
                                                                <PassengerActionsMenu 
                                                                    passenger={p} 
                                                                    request={request}
                                                                    token={new URLSearchParams(window.location.search).get('token')}
                                                                    onUpdate={() => window.location.reload()}
                                                                />
                                                            </div>
                                                        </div>
                                                        <Badge className={`
                                                            ${departureStatus.status === 'departed' ? 'bg-green-100 text-green-800' : 
                                                            departureStatus.status === 'departed_other_means' ? 'bg-red-100 text-red-800' : 
                                                            'bg-gray-100 text-gray-600'}
                                                        `}>
                                                            {departureStatus.status === 'departed' ? 'Chegou' : 
                                                                departureStatus.status === 'departed_other_means' ? 'No Show' : 
                                                                'Aguardando'}
                                                        </Badge>
                                                        </div>

                                                        <div className="flex gap-2 mt-1">
                                                        <Button
                                                            size="sm"
                                                            variant={departureStatus.status === 'departed' ? 'default' : 'outline'}
                                                            className={`h-8 flex-1 ${departureStatus.status === 'departed' ? 'bg-green-600 hover:bg-green-700' : 'text-green-700 border-green-200 hover:bg-green-50'}`}
                                                            onClick={() => handlePassengerDepartureUpdate(request.id, p.originalIndex, 'departed', selectedDeparturePoint)}
                                                            disabled={updatingDepartureStatus[`${request.id}-p-${p.originalIndex}`]}
                                                        >
                                                            <CheckCircle className="w-3 h-3 mr-1" /> Chegou
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant={departureStatus.status === 'departed_other_means' ? 'destructive' : 'outline'}
                                                            className={`h-8 flex-1 ${departureStatus.status === 'departed_other_means' ? '' : 'text-red-700 border-red-200 hover:bg-red-50'}`}
                                                            onClick={() => {
                                                                const note = prompt('Informe o motivo do No Show:');
                                                                if (note) {
                                                                    handlePassengerDepartureUpdate(request.id, p.originalIndex, 'departed_other_means', selectedDeparturePoint, note);
                                                                }
                                                            }}
                                                            disabled={updatingDepartureStatus[`${request.id}-p-${p.originalIndex}`]}
                                                        >
                                                            <XCircle className="w-3 h-3 mr-1" /> No Show
                                                        </Button>

                                                        {/* Botão Desfazer para Saída */}
                                                        {departureStatus.status !== 'pending_departure' && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 text-gray-500 hover:text-purple-600 hover:bg-purple-50"
                                                                onClick={() => handlePassengerDepartureUpdate(request.id, p.originalIndex, 'pending_departure', selectedDeparturePoint)}
                                                                disabled={updatingDepartureStatus[`${request.id}-p-${p.originalIndex}`]}
                                                                title="Desfazer / Voltar para Pendente"
                                                            >
                                                                <Undo className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        </div>
                                                    {departureStatus.notes && (
                                                        <div className="text-xs text-gray-500 mt-1 italic">
                                                            Obs: {departureStatus.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {allPassengers.filter(p => {
                                            const status = request.passenger_departure_statuses?.[p.originalIndex]?.status || 'pending_departure';
                                            if (activeDepartureTab === 'pendente') return status === 'pending_departure';
                                            if (activeDepartureTab === 'embarcados') return status === 'departed';
                                            if (activeDepartureTab === 'noshow') return status === 'departed_other_means';
                                            return false;
                                        }).length === 0 && (
                                            <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded border border-dashed border-gray-200">
                                                Nenhum passageiro nesta categoria.
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            </Tabs>

                            {/* ALERTA DE INÍCIO/FIM DA SAÍDA */}
                            {allPassengers.length > 0 && allPassengers.every(p => {
                                const status = request.passenger_departure_statuses?.[p.originalIndex]?.status || 'pending_departure';
                                return status !== 'pending_departure';
                            }) && (
                                <div className="mt-4 p-4 bg-purple-50 border-2 border-purple-400 rounded-xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-500 shadow-md">
                                    <div className="bg-white p-2 rounded-full mb-2 shadow-sm">
                                        <CheckCircle className="w-8 h-8 text-purple-600" />
                                    </div>
                                    <h4 className="text-purple-800 font-bold text-lg">Saída pronta!</h4>

                              {/* CONTROLES DE VIAGEM DE VOLTA (SAÍDA) */}
                              {(!request.departure_trip_status || request.departure_trip_status === 'aguardando') ? (
                                  <>
                                      <p className="text-purple-700 text-sm mb-4">Todos processados. Inicie a viagem de volta.</p>
                                      <Button 
                                          onClick={() => handleUpdateStatus(request.id, 'started', null, 'departure')}
                                          disabled={updatingStatus[request.id]}
                                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg transform hover:scale-105 transition-all text-base py-6"
                                      >
                                          {updatingStatus[request.id] ? (
                                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                          ) : (
                                              <Play className="w-5 h-5 mr-2 fill-current" />
                                          )}
                                          INICIAR VIAGEM (VOLTA)
                                      </Button>
                                  </>
                              ) : request.departure_trip_status === 'passageiro_embarcou' ? (
                                  <>
                                      <p className="text-purple-700 text-sm mb-4">Viagem de volta em andamento. Finalize ao chegar.</p>
                                      <Button 
                                          onClick={() => handleUpdateStatus(request.id, 'completed', null, 'departure')}
                                          disabled={updatingStatus[request.id]}
                                          className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold shadow-lg transform hover:scale-105 transition-all text-base py-6"
                                      >
                                          {updatingStatus[request.id] ? (
                                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                          ) : (
                                              <CheckSquare className="w-5 h-5 mr-2" />
                                          )}
                                          FINALIZAR VIAGEM (VOLTA)
                                      </Button>
                                  </>
                              ) : (
                                  <div className="bg-green-100 text-green-800 p-2 rounded text-center text-sm font-bold border border-green-200 flex items-center justify-center gap-2">
                                      <CheckCircle className="w-4 h-4" /> Viagem de Volta Finalizada
                                  </div>
                              )}
                                </div>
                            )}
                            </div>
                            )}
                            </div>
                            ) : null}

                {/* Coluna 3: Info do Motorista */}
                <div className="space-y-3 mt-4 pt-4 border-t">
                {request.driver_name ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex justify-between items-center">
                        <div>
                            <h4 className="font-semibold text-green-900 text-xs uppercase flex items-center gap-1 mb-1">
                                <Car className="w-3 h-3" /> Motorista
                            </h4>
                            <div className="font-medium text-sm">{request.driver_name}</div>
                            <div className="text-xs text-gray-600">{request.vehicle_model} • {request.vehicle_plate}</div>
                        </div>
                        {request.driver_phone && (
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="h-8 bg-white border-green-200 text-green-700" onClick={() => BrowserService.open(`tel:${request.driver_phone}`)}>
                                    <Phone className="w-3 h-3" />
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-8 bg-green-500 hover:bg-green-600 text-white"
                                    onClick={() => BrowserService.open(`https://wa.me/${request.driver_phone.replace(/\D/g, '')}`, '_blank')}
                                    title="Abrir WhatsApp"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.929C.11 5.72 5.718.055 12.042.055c3.534 0 6.821 1.688 9.223 4.453 2.401 2.765 3.737 6.401 3.736 10.057.001 6.325-5.607 11.491-11.931 11.492-1.987.001-3.953-.5-5.688-1.446l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.594 5.392 1.594 5.097 0 9.205-4.115 9.206-9.213 0-5.097-4.112-9.205-9.212-9.205-5.097 0-9.204 4.116-9.204 9.213 0 1.737.57 3.457 1.457 4.908l-1.168 4.022 4.104-1.071zm4.905-1.104c-1.181-.068-2.43-.728-2.613-.793-.183-.065-.453-.102-.646.133-.192.235-.747.962-.917 1.165-.17.206-.34.221-.63.076-.29-.15-1.229-.452-2.342-1.44-.86-1.01-.192-1.55-.135-1.666.05-.114.398-.293.646-.54.247-.247.33-.427.497-.68.169-.253.084-.473-.028-.662-.112-.189-.64-.993-.878-1.344-.236-.35-.192-.29-.44-.64-.247-.35-.63-.83-.868-1.077-.238-.246-.03-.275 1.642 1.636 1.83 1.8 3.037 3.326 3.42 3.565.384.237.295.197.674.195.38.002 1.036-.399 1.181-.76.146-.36.25-1.127.183-1.229z"/>
                                    </svg>
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Alert className="bg-orange-50 border-orange-200 py-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 text-xs">
                        Motorista não atribuído
                    </AlertDescription>
                    </Alert>
                )}

                {/* Aviso se a ida não foi finalizada ainda */}
                {request.receptivity_trip_status !== 'finalizada' && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 mt-4">
                        <p className="text-sm text-gray-500 mb-1">A gestão do retorno será habilitada após a finalização da viagem de ida.</p>
                        <div className="text-xs text-gray-400">Complete o fluxo acima primeiro.</div>
                    </div>
                )}
                </div>

                {request.receptivity_updated_at && (
                    <div className="text-xs text-gray-500 text-center pt-2 border-t">
                    Atualizado: {format(parseISO(request.receptivity_updated_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </div>
                )}
                </div>
            </CardContent>
        </Card>
    );
}

// Helper para verificar se é um ponto de embarque (simplificado)
function isBoardingPoint(pointValue) {
    return pointValue !== 'destination';
}

export default function ReceptiveListStatus() {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sharedList, setSharedList] = useState(null);
  const [requests, setRequests] = useState([]);
  const [sortOrder, setSortOrder] = useState('time'); // 'time' or 'alpha'
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [clients, setClients] = useState([]);
  
  // NOVO: Estados para o dialog de motivo
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [selectedRequestForReason, setSelectedRequestForReason] = useState(null);
  const [notCompletedReason, setNotCompletedReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  // NOVO: Estados para adicionar passageiro
  const [showAddPassengerDialog, setShowAddPassengerDialog] = useState(false);
  const [selectedRequestForAdd, setSelectedRequestForAdd] = useState(null);
  const [newPassengerData, setNewPassengerData] = useState({
    name: '',
    phone_number: '',
    boarding_point: 'origin',
    disembarking_point: 'destination'
  });
  const [isAddingPassenger, setIsAddingPassenger] = useState(false);
  const [updatingDepartureStatus, setUpdatingDepartureStatus] = useState({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (!urlToken) {
      setError('Link inválido: token não encontrado');
      setIsLoading(false);
      return;
    }

    setToken(urlToken);
    loadReceptiveList(urlToken);
  }, []);

  const loadReceptiveList = async (urlToken) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await base44.functions.invoke('getReceptiveListByToken', {
        token: urlToken
      });

      if (response.data.success) {
        setSharedList(response.data.sharedList);
        setRequests(response.data.requests);
        
        try {
          const clientsData = await base44.entities.Client.list();
          setClients(clientsData);
        } catch (clientError) {
          console.error('[ReceptiveListStatus] Erro ao buscar clientes:', clientError);
        }
      } else {
        if (response.data.errorType === 'expired') {
          const expiryDate = response.data.expiresAt ? 
            format(parseISO(response.data.expiresAt), "dd/MM/yyyy 'às' HH:mm") : '';
          setError(`Este link expirou${expiryDate ? ` em ${expiryDate}` : ''}. Solicite um novo link ou a extensão da validade ao fornecedor.`);
        } else if (response.data.errorType === 'not_found') {
          setError('Link inválido ou não encontrado.');
        } else if (response.data.errorType === 'blocked') {
          setError('Este link foi bloqueado ou desativado pelo fornecedor.');
        } else {
          setError(response.data.error || 'Erro ao carregar lista');
        }
      }
    } catch (err) {
      console.error('[ReceptiveListStatus] Erro:', err);
      setError('Erro ao carregar lista de receptivos');
    } finally {
      setIsLoading(false);
    }
  };

  const getClientName = (clientId) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.name || null;
  };

  // NOVO: Função para abrir dialog de motivo
  const handleNotCompletedClick = (request) => {
    setSelectedRequestForReason(request);
    setNotCompletedReason('');
    setReasonError('');
    setShowReasonDialog(true);
  };

  // NOVO: Função para confirmar "não efetuada" com motivo
  const handleConfirmNotCompleted = async () => {
    if (!notCompletedReason.trim()) {
      setReasonError('Por favor, informe o motivo da receptividade não efetuada');
      return;
    }

    setShowReasonDialog(false);
    await handleUpdateStatus(selectedRequestForReason.id, 'nao_efetuada', notCompletedReason.trim());
    setSelectedRequestForReason(null);
    setNotCompletedReason('');
  };

  // NOVO: Handlers para adicionar passageiro
  const handleOpenAddPassenger = (request) => {
    setSelectedRequestForAdd(request);
    setNewPassengerData({
      name: '',
      phone_number: '',
      boarding_point: 'origin',
      disembarking_point: 'destination'
    });
    setShowAddPassengerDialog(true);
  };

  const handleConfirmAddPassenger = async () => {
    if (!newPassengerData.name) {
      alert('Nome é obrigatório');
      return;
    }

    setIsAddingPassenger(true);
    try {
      const response = await base44.functions.invoke('addPassengerToRequest', {
        requestId: selectedRequestForAdd.id,
        passengerData: newPassengerData,
        token: token
      });

      if (response.data.success) {
        // Atualizar estado local
        setRequests(prev => prev.map(r => {
          if (r.id !== selectedRequestForAdd.id) return r;
          
          const updatedDetails = [...(r.passengers_details || []), response.data.data.passenger];
          const updatedStatuses = [...(r.passenger_receptivity_statuses || []), response.data.data.status];
          const updatedDepartureStatuses = [...(r.passenger_departure_statuses || []), response.data.data.departureStatus];
          
          return {
            ...r,
            passengers: (r.passengers || 0) + 1,
            passengers_details: updatedDetails,
            passenger_receptivity_statuses: updatedStatuses,
            passenger_departure_statuses: updatedDepartureStatuses
          };
        }));
        setShowAddPassengerDialog(false);
        setSuccess('Passageiro adicionado com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        alert('Erro ao adicionar: ' + response.data.error);
      }
    } catch (error) {
      console.error('Erro ao adicionar passageiro:', error);
      alert('Erro ao adicionar passageiro');
    } finally {
      setIsAddingPassenger(false);
    }
  };

  // Função para atualizar status de um passageiro individual
  const handlePassengerDepartureUpdate = async (requestId, passengerIndex, status, point, notes = '') => {
    setUpdatingDepartureStatus(prev => ({ ...prev, [`${requestId}-p-${passengerIndex}`]: true }));
    
    try {
      const response = await base44.functions.invoke('updatePassengerDepartureStatus', {
        serviceRequestId: requestId,
        token,
        passengerUpdate: {
          index: passengerIndex,
          status,
          departure_point: point,
          notes,
          departure_time: new Date().toISOString()
        }
      });

      if (response.data.success) {
        // Atualização otimista
        setRequests(prev => prev.map(r => {
          if (r.id !== requestId) return r;
          return { ...r, passenger_departure_statuses: response.data.passengerDepartureStatuses };
        }));
        
        await loadReceptiveList(token); // Recarregar dados reais
        
        setSuccess('Saída registrada com sucesso');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        alert('Erro: ' + response.data.error);
      }
    } catch (err) {
      console.error('Erro ao atualizar saída:', err);
      alert('Erro ao atualizar saída');
    } finally {
      setUpdatingDepartureStatus(prev => ({ ...prev, [`${requestId}-p-${passengerIndex}`]: false }));
    }
  };

  const handlePassengerStatusUpdate = async (requestId, passengerIndex, status, notes = '') => {
    setUpdatingStatus(prev => ({ ...prev, [`${requestId}-p-${passengerIndex}`]: true }));
    
    try {
      const response = await base44.functions.invoke('updateReceptivityStatus', {
        serviceRequestId: requestId,
        token,
        passengerUpdate: {
          index: passengerIndex,
          status,
          notes
        }
      });

      if (response.data.success) {
        console.log('Status atualizado com sucesso:', response.data);

        // 1. Atualização Otimista (Imediata)
        const updatedStatuses = response.data.passengerStatuses;
        setRequests(prev => prev.map(r => {
          if (r.id !== requestId) return r;

          if (updatedStatuses) {
              return { ...r, passenger_receptivity_statuses: updatedStatuses };
          }

          let currentStatuses = [...(r.passenger_receptivity_statuses || [])];
          if (currentStatuses.length === 0) {
             if (r.passengers_details && r.passengers_details.length > 0) {
                currentStatuses = r.passengers_details.map(p => ({ name: p.name, status: 'pending', notes: '' }));
             } else {
                currentStatuses = Array.from({ length: r.passengers || 1 }).map((_, i) => ({
                    name: i === 0 ? (r.passenger_name || 'Passageiro Principal') : `Passageiro ${i + 1}`,
                    status: 'pending',
                    notes: ''
                }));
             }
          }

          if (currentStatuses[passengerIndex]) {
            currentStatuses[passengerIndex] = {
              ...currentStatuses[passengerIndex],
              status,
              notes
            };
          }
          return { ...r, passenger_receptivity_statuses: currentStatuses };
        }));

        // 2. Recarregar dados do servidor para garantir consistência total
        loadReceptiveList(token);
      }
    } catch (err) {
      console.error('Erro ao atualizar passageiro:', err);
      alert('Erro ao atualizar passageiro');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [`${requestId}-p-${passengerIndex}`]: false }));
    }
  };

  const handleUpdateStatus = async (requestId, newStatus, reason = null, type = 'receptive') => {
    setUpdatingStatus(prev => ({ ...prev, [requestId]: true }));
    setError('');
    setSuccess('');

    try {
      const response = await base44.functions.invoke('updateReceptivityStatus', {
        serviceRequestId: requestId,
        token,
        status: newStatus,
        reason: reason,
        type: type // 'receptive' ou 'departure'
      });

      if (response.data.success) {
        // Atualizar localmente
        setRequests(prev => prev.map(r => {
            if (r.id === requestId) {
                const updated = {
                    ...r,
                    receptivity_updated_at: new Date().toISOString()
                };

                if (type === 'departure') {
                    updated.departure_status = newStatus;
                    if (newStatus === 'started') {
                        updated.departure_trip_status = 'passageiro_embarcou';
                        updated.driver_trip_status = 'passageiro_embarcou';
                        updated.status = 'em_andamento';
                    } else if (newStatus === 'completed') {
                        updated.departure_trip_status = 'finalizada';
                        updated.driver_trip_status = 'finalizada';
                        updated.status = 'concluida';
                    }
                } else {
                    // Lógica padrão para receptivo (Ida)
                    updated.receptivity_not_completed_reason = reason || r.receptivity_not_completed_reason;

                    if (newStatus === 'efetuada') {
                        updated.receptivity_status = 'efetuada';
                        updated.receptivity_trip_status = 'passageiro_embarcou';
                        updated.driver_trip_status = 'passageiro_embarcou'; // Reflete Ida
                        updated.status = 'em_andamento';
                    } else if (newStatus === 'finalizada') {
                        updated.receptivity_trip_status = 'finalizada';
                        updated.driver_trip_status = 'finalizada'; // Ida finalizada
                        // Se não tiver volta, ou volta pendente, ok.
                        // Se tiver volta, o badge vai tratar.
                    } else {
                        updated.receptivity_status = newStatus;
                    }
                }
                return updated;
            }
            return r;
        }));

        if (type === 'departure') {
            setSuccess(newStatus === 'started' ? 'Viagem de saída iniciada!' : 'Viagem de saída finalizada!');
        } else if (newStatus === 'finalizada') {
            setSuccess('Viagem finalizada com sucesso!');
        } else {
            setSuccess(`Receptividade marcada como "${newStatus === 'efetuada' ? 'Efetuada' : 'Não Efetuada'}"`);
        }
        
        await loadReceptiveList(token); // Forçar recarga para garantir consistência
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(response.data.error || 'Erro ao atualizar status');
      }
    } catch (err) {
      console.error('[ReceptiveListStatus] Erro:', err);
      setError(err.message || 'Erro ao atualizar status de receptividade');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const getReceptivityBadge = (request) => {
    // Lógica de prioridade para exibir o status mais relevante do momento

    // 1. Volta (Saída)
    if (request.departure_status === 'completed' || request.departure_trip_status === 'finalizada') {
       return <Badge className="bg-gray-800 text-white border-gray-600">🏁 Viagem Concluída</Badge>;
    }
    if (request.departure_status === 'started' || request.departure_trip_status === 'passageiro_embarcou') {
       return <Badge className="bg-purple-100 text-purple-800 border-purple-300 animate-pulse">🚗💨 Em Trânsito (Retorno)</Badge>;
    }
    if (request.departure_trip_status === 'a_caminho') {
       return <Badge className="bg-purple-50 text-purple-700 border-purple-200">🚖 Motorista a Caminho (Retorno)</Badge>;
    }

    // 2. Ida (Receptividade)
    if (request.receptivity_trip_status === 'finalizada') {
       // Se tem volta pendente, avisa que a ida acabou
       if (request.departure_status === 'pending' || !request.departure_status) {
          return <Badge className="bg-green-100 text-green-800 border-green-300">✅ Ida Finalizada</Badge>;
       }
       return <Badge className="bg-green-100 text-green-800 border-green-300">✅ Receptividade Efetuada</Badge>;
    }
    if (request.receptivity_trip_status === 'passageiro_embarcou') {
       return <Badge className="bg-blue-100 text-blue-800 border-blue-300 animate-pulse">🚗💨 Em Trânsito (Ida)</Badge>;
    }
    if (request.receptivity_trip_status === 'a_caminho' || request.receptivity_trip_status === 'chegou_origem') {
       return <Badge className="bg-blue-50 text-blue-700 border-blue-200">🚖 Motorista no Local (Ida)</Badge>;
    }

    // 3. Status Básicos
    if (request.receptivity_status === 'nao_efetuada') {
       return <Badge className="bg-red-100 text-red-800 border-red-300"><XCircle className="w-3 h-3 mr-1" />❌ Não Efetuada</Badge>;
    }

    return <Badge className="bg-gray-100 text-gray-800 border border-gray-300">⏳ Pendente</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando lista de receptivos...</p>
        </div>
      </div>
    );
  }

  if (error && !sharedList) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-300">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Acesso Negado
            </h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiresAt = sharedList?.expiresAt ? parseISO(sharedList.expiresAt) : null;
  
  // Encontrar uma viagem que tenha dados do cliente/solicitante para exibir no cabeçalho
  const headerInfoRequest = requests.find(r => r.client_id || r.requester_full_name) || requests[0];

  const pendingCount = requests.filter(r => r.receptivity_status === 'pendente').length;
  const completedCount = requests.filter(r => r.receptivity_status === 'efetuada').length;
  const notCompletedCount = requests.filter(r => r.receptivity_status === 'nao_efetuada').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header Otimizado para Mobile */}
        <Card className="mb-4 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                  📋 Lista de Receptivos
                </h1>
                <div className="text-sm text-blue-800 mt-1">
                  <span className="font-semibold">Fornecedor:</span> {sharedList?.supplierName}
                </div>
                {requests.length > 0 && headerInfoRequest && (
                  <div className="flex flex-col gap-1 mt-2">
                    {(headerInfoRequest.client_display_name || getClientName(headerInfoRequest.client_id)) ? (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-blue-900 bg-white/60 px-2 py-1 rounded-md w-fit border border-blue-100">
                        <Building2 className="w-3.5 h-3.5 text-blue-700" />
                        <span className="font-bold">{headerInfoRequest.client_display_name || getClientName(headerInfoRequest.client_id)}</span>
                      </div>
                    ) : headerInfoRequest.requester_full_name && (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-blue-900 bg-white/60 px-2 py-1 rounded-md w-fit border border-blue-100">
                        <User className="w-3.5 h-3.5 text-blue-700" />
                        <span className="font-bold">{headerInfoRequest.requester_full_name}</span>
                      </div>
                    )}
                  </div>
                )}
                {sharedList?.coordinatorName && (
                  <div className="text-xs text-blue-700 mt-0.5">
                    <span className="font-semibold">Coord:</span> {sharedList.coordinatorName}
                  </div>
                )}
              </div>
              {expiresAt && (
                <div className="flex flex-col items-end">
                  <Badge variant="outline" className="bg-white/50 text-[10px] border-blue-300 text-blue-800 whitespace-nowrap">
                    <Clock className="w-3 h-3 mr-1" />
                    Até {format(expiresAt, "HH:mm", { locale: ptBR })}
                  </Badge>
                  <div className="text-[10px] text-blue-600 mt-1">
                    {format(expiresAt, "dd/MM", { locale: ptBR })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPIs Compactos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
            <CardContent className="p-2 text-center">
              <div className="text-xs opacity-90 uppercase font-semibold">Total</div>
              <div className="text-xl font-bold">{requests.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-sm">
            <CardContent className="p-2 text-center">
              <div className="text-xs opacity-90 uppercase font-semibold">Pendentes</div>
              <div className="text-xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-sm">
            <CardContent className="p-2 text-center">
              <div className="text-xs opacity-90 uppercase font-semibold">Efetuadas</div>
              <div className="text-xl font-bold">{completedCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-sm">
            <CardContent className="p-2 text-center">
              <div className="text-xs opacity-90 uppercase font-semibold">Não Efetuadas</div>
              <div className="text-xl font-bold">{notCompletedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Messages */}
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Controles de Ordenação */}
        <div className="flex justify-end mb-4">
          <div className="bg-white p-1 rounded-lg border border-gray-200 flex gap-1 shadow-sm">
            <Button
              variant={sortOrder === 'time' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSortOrder('time')}
              className={`text-xs gap-2 ${sortOrder === 'time' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
            >
              <Clock className="w-3.5 h-3.5" />
              Por Horário
            </Button>
            <Button
              variant={sortOrder === 'alpha' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSortOrder('alpha')}
              className={`text-xs gap-2 ${sortOrder === 'alpha' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
            >
              <SortAsc className="w-3.5 h-3.5" />
              Por Nome (A-Z)
            </Button>
          </div>
        </div>

        {/* Lista de Receptivos (Todos os cards, sem abas externas) */}
        <div className="space-y-4">
          {[...requests]
            .sort((a, b) => {
              if (sortOrder === 'time') {
                const timeA = new Date(`${a.date}T${a.time}`).getTime();
                const timeB = new Date(`${b.date}T${b.time}`).getTime();
                return timeA - timeB;
              } else {
                return (a.passenger_name || '').localeCompare(b.passenger_name || '');
              }
            })
            .map((request) => (
              <RequestCard
                  key={request.id}
                  request={request}
                  getClientName={getClientName}
                  getReceptivityBadge={() => getReceptivityBadge(request)}
                  handleOpenAddPassenger={handleOpenAddPassenger}
                  handleUpdateStatus={handleUpdateStatus}
                  handlePassengerStatusUpdate={handlePassengerStatusUpdate}
                  handleNotCompletedClick={handleNotCompletedClick}
                  updatingStatus={updatingStatus}
                  handlePassengerDepartureUpdate={handlePassengerDepartureUpdate}
                  updatingDepartureStatus={updatingDepartureStatus}
              />
          ))}
          {requests.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-200">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma solicitação encontrada.</p>
            </div>
          )}
        </div>

        {/* NOVO: Dialog para motivo de não efetuada */}
        <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-900">
                <XCircle className="w-6 h-6" />
                Embarque Não Realizado
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Por favor, informe o motivo do embarque não ter sido realizado.
                </AlertDescription>
              </Alert>

              {selectedRequestForReason && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Solicitação:</div>
                  <div className="font-bold">{selectedRequestForReason.request_number}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {selectedRequestForReason.passenger_name}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo / Observação *</Label>
                <Textarea
                  id="reason"
                  value={notCompletedReason}
                  onChange={(e) => {
                    setNotCompletedReason(e.target.value);
                    setReasonError('');
                  }}
                  placeholder="Ex: Passageiro não compareceu, voo atrasado, motorista não encontrou o passageiro..."
                  className="h-24"
                />
                {reasonError && (
                  <p className="text-sm text-red-600">{reasonError}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReasonDialog(false);
                  setNotCompletedReason('');
                  setReasonError('');
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmNotCompleted}
                disabled={!notCompletedReason.trim()}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Confirmar Não Realizado
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* NOVO: Dialog Adicionar Passageiro */}
        <Dialog open={showAddPassengerDialog} onOpenChange={setShowAddPassengerDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Passageiro Extra</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input 
                  value={newPassengerData.name}
                  onChange={(e) => setNewPassengerData({...newPassengerData, name: e.target.value})}
                  placeholder="Nome do passageiro"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input 
                  value={newPassengerData.phone_number}
                  onChange={(e) => setNewPassengerData({...newPassengerData, phone_number: e.target.value})}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Embarque</Label>
                  <Select 
                    value={newPassengerData.boarding_point} 
                    onValueChange={(val) => setNewPassengerData({...newPassengerData, boarding_point: val})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="origin">Origem</SelectItem>
                      {selectedRequestForAdd?.planned_stops?.map((stop, idx) => (
                        <SelectItem key={idx} value={stop.address}>Parada {idx + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Desembarque</Label>
                  <Select 
                    value={newPassengerData.disembarking_point} 
                    onValueChange={(val) => setNewPassengerData({...newPassengerData, disembarking_point: val})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedRequestForAdd?.planned_stops?.map((stop, idx) => (
                        <SelectItem key={idx} value={stop.address}>Parada {idx + 1}</SelectItem>
                      ))}
                      <SelectItem value="destination">Destino Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddPassengerDialog(false)}>Cancelar</Button>
              <Button onClick={handleConfirmAddPassenger} disabled={isAddingPassenger}>
                {isAddingPassenger ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <Card className="mt-6 bg-gray-50">
          <CardContent className="p-6 text-center text-sm text-gray-600">
            <p>🔒 Este é um link seguro e temporário.</p>
            <p className="mt-1">As atualizações são refletidas automaticamente no sistema do fornecedor.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}