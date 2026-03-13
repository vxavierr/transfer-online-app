import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Loader2, CheckCircle, XCircle, Clock, Search, RefreshCw, Users, 
    TrendingUp, AlertTriangle, MapPin, Calendar, Car, User, MessageSquare,
    Plane, Phone, ChevronDown, ChevronUp, Copy, Baby, Tag, UserCheck
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInMinutes } from "date-fns";

export default function EventClientDashboard() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    // Helper to format date strictly from YYYY-MM-DD string to DD/MM
    // ignoring timezone differences
    const formatDateStrict = (dateStr) => {
        if (!dateStr) return '';
        try {
            // Handle both YYYY-MM-DD and full ISO strings
            const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
            const parts = cleanDate.split('-');
            if (parts.length === 3) {
                const [year, month, day] = parts;
                return `${day}/${month}`;
            }
            return format(new Date(dateStr), 'dd/MM');
        } catch (e) {
            return dateStr;
        }
    };

    const calculateArrivalTime = (minutes, baseTimeIso) => {
        if (!minutes || minutes < 0) return '';
        try {
            const baseTime = baseTimeIso ? new Date(baseTimeIso).getTime() : Date.now();
            const arrivalTime = new Date(baseTime + minutes * 60000);
            return format(arrivalTime, 'HH:mm');
        } catch (e) {
            return '';
        }
    };

    const formatDuration = (minutes) => {
        if (!minutes || minutes < 0) return '';
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.round(minutes % 60);
        if (hours > 0) return `${hours}h ${remainingMinutes}min`;
        return `${remainingMinutes}min`;
    };

    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [tripFilter, setTripFilter] = useState("all");
    const [directionFilter, setDirectionFilter] = useState("all"); // 'all', 'IN', 'OUT'
    const [dateFilter, setDateFilter] = useState("all");
    const [originFilter, setOriginFilter] = useState("all");
    const [destinationFilter, setDestinationFilter] = useState("all");
    const [vehicleFilter, setVehicleFilter] = useState("all");
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [passengerList, setPassengerList] = useState([]);
    const [expandedTrips, setExpandedTrips] = useState({});

    const toggleTrip = (tripId) => {
        setExpandedTrips(prev => ({
            ...prev,
            [tripId]: !prev[tripId]
        }));
    };

    const handleCopyTripSummary = (e, trip) => {
        e.stopPropagation(); // Prevent toggling accordion
        
        const flightPassenger = trip.passengers.find(p => p.flight_number);
        const flightInfo = flightPassenger?.flight_number 
            ? `${flightPassenger.airline || ''} ${flightPassenger.flight_number}`.trim()
            : "TERRESTRE";
            
        const passengerNames = trip.passengers.map(p => p.passenger_name).join(", ");
        
        const text = `📋 *Resumo da Viagem*

📅 Data: ${formatDateStrict(trip.date)} às ${trip.start_time}
📍 Origem: ${trip.origin}
🏁 Destino: ${trip.destination}
✈️ Voo: ${flightInfo}
👥 Passageiro(s): ${passengerNames} (${trip.passenger_count} pax)

🚘 *Motorista e Veículo*
👤 Motorista: ${trip.driver_info?.name || 'Não atribuído'}
📞 ${trip.driver_info?.phone || ''}
🚙 Veículo: ${trip.driver_info?.vehicle_model || ''} ${trip.driver_info?.vehicle_plate ? `- ${trip.driver_info.vehicle_plate}` : ''}
`.trim();

        navigator.clipboard.writeText(text);
        toast.success("Resumo copiado!");
    };

    useEffect(() => {
        if (!token) {
            setError("Token de acesso inválido ou ausente.");
            setLoading(false);
            return;
        }
        loadData();

        // Auto-refresh every 10 seconds silently in background to reduce flickering
        const interval = setInterval(() => {
            loadData(true); // silent update
        }, 10000);

        return () => clearInterval(interval);
    }, [token]);

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        // Silent updates don't trigger isRefreshing to avoid UI flicker
        if (silent) {
            // No UI feedback for background updates
        } else {
            setIsRefreshing(true);
        }

        try {
            const response = await base44.functions.invoke('getEventClientDashboardByToken', { token });
            if (response.data && response.data.success) {
                // Avoid re-rendering if data hasn't changed
                const newData = response.data;
                
                // Compare only relevant data to avoid updates on metadata changes (like server timestamps)
                // This prevents the screen from flickering when data is effectively the same
                const dataChanged = !data || 
                                  JSON.stringify(newData.trips) !== JSON.stringify(data.trips) ||
                                  JSON.stringify(newData.event) !== JSON.stringify(data.event);

                if (dataChanged) {
                    setData(newData);

                    const activeTripsForStats = newData.trips.filter(t => t.status !== 'cancelled' && t.status !== 'cancelada' && t.driver_trip_status !== 'cancelada_motorista');
                    const allPassengers = activeTripsForStats.flatMap(trip => 
                        trip.passengers.map(p => ({
                            ...p,
                            boarding_status: (p.boarding_status === 'boarded' || p.boarding_status === 'no_show') 
                                ? p.boarding_status 
                                : (['passageiro_embarcou', 'a_caminho_destino', 'parada_adicional', 'chegou_destino', 'finalizada'].includes(trip.driver_trip_status) 
                                    ? 'boarded' 
                                    : (p.status === 'arrived' ? 'boarded' : (p.status === 'no_show' ? 'no_show' : 'pending'))),
                            trip_info: {
                                id: trip.id,
                                name: trip.name,
                                origin: trip.origin,
                                destination: trip.destination,
                                start_time: trip.start_time,
                                date: trip.date,
                                driver_info: trip.driver_info,
                                driver_trip_status: trip.driver_trip_status,
                                current_eta_minutes: trip.current_eta_minutes || null,
                                vehicle_type_category: trip.vehicle_type_category
                            }
                        }))
                    );
                    // Sort by trip date and time (earliest first), then passenger name
                    setPassengerList(allPassengers.sort((a, b) => {
                        const dateA = new Date(`${a.trip_info.date}T${a.trip_info.start_time}`);
                        const dateB = new Date(`${b.trip_info.date}T${b.trip_info.start_time}`);
                        
                        if (dateA < dateB) return -1;
                        if (dateA > dateB) return 1;
                        
                        return a.passenger_name.localeCompare(b.passenger_name);
                    }));

                    setLastUpdate(new Date());
                }
                setError(null);
            } else {
                if (!silent) setError(response.data?.error || "Erro ao carregar dados do evento.");
            }
        } catch (err) {
            console.error("Erro:", err);
            if (!silent) setError("Falha na conexão.");
        } finally {
            if (!silent) setLoading(false);
            else setIsRefreshing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md border-red-200 shadow-lg">
                    <CardHeader className="text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                        <CardTitle className="text-red-700">Acesso Negado</CardTitle>
                        <p className="text-sm text-gray-600">{error}</p>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // Use data.trips directly for statistics to ensure all trips are counted
    const allBackendTrips = data?.trips || [];

    // Calculate passenger statistics
    const totalPassengers = passengerList.length;
    const boardedCount = passengerList.filter(p => p.boarding_status === 'boarded').length;
    const noShowCount = passengerList.filter(p => p.boarding_status === 'no_show').length;
    const pendingCount = totalPassengers - boardedCount - noShowCount;

    // Trip statistics (using allBackendTrips instead of derived from passengers)
    const cancelledTripsCount = allBackendTrips.filter(t => t.status === 'cancelled' || t.status === 'cancelada' || t.driver_trip_status === 'cancelada_motorista').length;
    const activeTripsCount = allBackendTrips.length - cancelledTripsCount;

    const tripsInProgress = allBackendTrips.filter(t => 
        ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'a_caminho_destino'].includes(t.driver_trip_status)
    ).length;
    const completedTrips = allBackendTrips.filter(t => t.driver_trip_status === 'finalizada').length;

    // --- LOGIC FOR ARRIVAL FORECAST ---
    const getArrivalForecast = () => {
        const activeTrips = allBackendTrips.filter(t => 
            ['passageiro_embarcou', 'a_caminho_destino', 'parada_adicional'].includes(t.driver_trip_status)
        );

        const timeBuckets = {}; 
        const now = new Date();

        activeTrips.forEach(trip => {
            let arrivalDate = null;

            if (trip.estimated_arrival_time) {
                arrivalDate = new Date(trip.estimated_arrival_time);
            } else if (trip.current_eta_minutes) {
                const baseTime = trip.eta_last_calculated_at ? new Date(trip.eta_last_calculated_at).getTime() : Date.now();
                arrivalDate = new Date(baseTime + trip.current_eta_minutes * 60000);
            }

            // Consider arrivals slightly in the past (e.g. 5 mins ago) as "current" if status is still in transit
            // But for buckets, we stick to the schedule time blocks.
            if (arrivalDate) {
                // Round down to nearest 30 min
                let startMinute = Math.floor(arrivalDate.getMinutes() / 30) * 30;
                let startTime = new Date(arrivalDate);
                startTime.setMinutes(startMinute, 0, 0);
                
                let endTime = new Date(startTime.getTime() + 30 * 60000);

                const bucketKey = `entre ${format(startTime, 'HH:mm')} e ${format(endTime, 'HH:mm')}`;
                
                const paxCount = trip.passengers ? trip.passengers.length : (trip.passenger_count || 0);
                
                if (!timeBuckets[bucketKey]) {
                    timeBuckets[bucketKey] = 0;
                }
                timeBuckets[bucketKey] += paxCount;
            }
        });

        // Convert to array and sort chronologically
        return Object.entries(timeBuckets)
            .map(([time, count]) => ({ time, count }))
            .sort((a, b) => {
                const extractTime = (str) => {
                    const match = str.match(/(\d{2}:\d{2})/);
                    return match ? match[1] : "00:00";
                };
                return extractTime(a.time).localeCompare(extractTime(b.time));
            });
    };

    const arrivalForecast = getArrivalForecast();

    // Extract unique values for filters from all backend trips
    const uniqueDates = Array.from(new Set(allBackendTrips.map(t => t.date))).sort();
    const uniqueOrigins = Array.from(new Set(allBackendTrips.map(t => t.origin))).sort();
    const uniqueDestinations = Array.from(new Set(allBackendTrips.map(t => t.destination))).sort();
    const uniqueVehicleTypes = Array.from(new Set(allBackendTrips.map(t => t.vehicle_type_category).filter(Boolean))).sort();

    // Filter Trips and their passengers
    const filteredTrips = (data?.trips || []).filter(trip => {
        // 1. Trip Level Filters
        const matchesTripStatus = tripFilter === "all" || (() => {
            if (tripFilter === "in_progress") return ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'a_caminho_destino'].includes(trip.driver_trip_status);
            if (tripFilter === "completed") return trip.driver_trip_status === 'finalizada';
            if (tripFilter === "pending") return trip.driver_trip_status === 'aguardando';
            return true;
        })();

        const matchesDirection = directionFilter === "all" || (() => {
            const type = (trip.trip_type || '').toUpperCase();
            // Expanded logic to catch more variations and default behavior
            if (directionFilter === 'IN') {
                return type === 'ARRIVAL' || type === 'IN' || type === 'CHEGADA' || type === 'TRANSFER_IN';
            }
            if (directionFilter === 'OUT') {
                return type === 'DEPARTURE' || type === 'OUT' || type === 'SAIDA' || type === 'TRANSFER_OUT';
            }
            return false;
        })();

        const matchesDate = dateFilter === "all" || trip.date === dateFilter;
        const matchesOrigin = originFilter === "all" || trip.origin === originFilter;
        const matchesDestination = destinationFilter === "all" || trip.destination === destinationFilter;
        const matchesVehicle = vehicleFilter === "all" || trip.vehicle_type_category === vehicleFilter;

        // 2. Search Logic (Trip fields or Passenger fields)
        const searchLower = searchTerm.toLowerCase();
        const matchesTripSearch = 
            trip.name?.toLowerCase().includes(searchLower) ||
            trip.origin.toLowerCase().includes(searchLower) ||
            trip.destination.toLowerCase().includes(searchLower) ||
            trip.driver_info?.name?.toLowerCase().includes(searchLower) ||
            trip.vehicle_type_category?.toLowerCase().includes(searchLower);

        // 3. Filter Passengers inside the trip
        const matchingPassengers = trip.passengers.filter(p => {
            const matchesPassengerSearch = p.passenger_name.toLowerCase().includes(searchLower);
            const matchesPassengerStatus = statusFilter === "all" || p.boarding_status === statusFilter;
            
            // If searching, we only want passengers that match, UNLESS the trip itself matched (then show all that pass status filter)
            return (matchesTripSearch || matchesPassengerSearch) && matchesPassengerStatus;
        }).sort((a, b) => a.passenger_name.localeCompare(b.passenger_name));

        // Attach filtered passengers to the trip object for rendering (temporary property)
        trip.filteredPassengers = matchingPassengers;

        // Show trip if:
        // - It passes trip-level filters AND
        // - It has at least one matching passenger (after all filters) OR it's an empty trip matching search
        const showEmptyTrip = trip.passengers.length === 0 && matchesTripSearch && statusFilter === 'all';
        return matchesTripStatus && matchesDirection && matchesDate && matchesOrigin && matchesDestination && matchesVehicle && (matchingPassengers.length > 0 || showEmptyTrip);
    }).sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.start_time}`);
        const dateB = new Date(`${b.date}T${b.start_time}`);
        return dateA - dateB;
    });

    const getTripStatusBadge = (status) => {
        const statusMap = {
            'aguardando': { label: 'Aguardando', color: 'bg-gray-100 text-gray-700', icon: Clock },
            'a_caminho': { label: 'A Caminho', color: 'bg-blue-100 text-blue-700', icon: Car },
            'chegou_origem': { label: 'Chegou Origem', color: 'bg-green-100 text-green-700', icon: MapPin },
            'passageiro_embarcou': { label: 'Embarcado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
            'a_caminho_destino': { label: 'Em Rota', color: 'bg-blue-100 text-blue-700', icon: Car },
            'chegou_destino': { label: 'Chegou Destino', color: 'bg-green-100 text-green-700', icon: MapPin },
            'finalizada': { label: 'Finalizada', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
        };

        const info = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: AlertTriangle };
        const Icon = info.icon;

        return (
            <Badge className={`${info.color} flex items-center gap-1`}>
                <Icon className="w-3 h-3" />
                {info.label}
            </Badge>
        );
    };

    const getBoardingStatusBadge = (status) => {
        if (status === 'boarded') {
            return (
                <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Embarcado
                </Badge>
            );
        } else if (status === 'no_show') {
            return (
                <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> No Show
                </Badge>
            );
        } else {
            return (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Aguardando
                </Badge>
            );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-2xl font-bold">{data.event.event_name}</h1>
                            <p className="text-sm text-blue-100 mt-1">Dashboard Executivo - Logística</p>
                        </div>
                        <div className="text-right">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => loadData(false)}
                                disabled={isRefreshing}
                                className="bg-white/10 hover:bg-white/20 text-white border-white/30 transition-all"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                                {isRefreshing ? 'Atualizando...' : 'Atualizar'}
                            </Button>
                            <div className="flex items-center justify-end gap-2 mt-2">
                                {isRefreshing && <Loader2 className="w-3 h-3 text-blue-200 animate-spin" />}
                                <p className="text-xs text-blue-100">
                                    Última atualização: {format(lastUpdate, 'HH:mm:ss')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-white mb-1">
                                    <Users className="w-4 h-4" />
                                    <span className="text-xs font-medium">Total Pax</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{totalPassengers}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-green-500/20 backdrop-blur-sm border-green-400/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-white mb-1">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-xs font-medium">Embarcados</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{boardedCount}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-yellow-500/20 backdrop-blur-sm border-yellow-400/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-white mb-1">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-xs font-medium">Pendentes</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-red-500/20 backdrop-blur-sm border-red-400/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-white mb-1">
                                    <XCircle className="w-4 h-4" />
                                    <span className="text-xs font-medium">No Show</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{noShowCount}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-indigo-500/20 backdrop-blur-sm border-indigo-400/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-white mb-1">
                                    <Car className="w-4 h-4" />
                                    <span className="text-xs font-medium">Viagens Ativas</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{activeTripsCount}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-red-500/20 backdrop-blur-sm border-red-400/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-white mb-1">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-xs font-medium">Canceladas</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{cancelledTripsCount}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-blue-500/20 backdrop-blur-sm border-blue-400/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-white mb-1">
                                    <Car className="w-4 h-4" />
                                    <span className="text-xs font-medium">Em Andamento</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{tripsInProgress}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-700/20 backdrop-blur-sm border-gray-600/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-white mb-1">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-xs font-medium">Concluídas</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{completedTrips}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Arrival Forecast Card */}
                    {arrivalForecast.length > 0 && (
                        <div className="mt-4">
                            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                                <CardHeader className="p-4 pb-2 border-b border-white/10">
                                    <CardTitle className="text-white text-base flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Previsão de Chegadas (Em Trânsito)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {arrivalForecast.map((item, idx) => (
                                            <div key={idx} className="bg-white/10 rounded-lg p-2 text-center border border-white/10">
                                                <div className="text-xs text-blue-200 mb-1">{item.time}</div>
                                                <div className="text-xl font-bold text-white">{item.count} <span className="text-xs font-normal opacity-70">pax</span></div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-blue-200/60 mt-4 text-center italic">
                                        * Horários estimados, sujeitos a variação conforme trânsito local.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Coordinators Section */}
                    {data.coordinators && data.coordinators.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-white/10">
                            <Accordion type="single" collapsible className="w-full border-none">
                                <AccordionItem value="coordinators" className="border-none">
                                    <AccordionTrigger className="hover:no-underline py-2 text-sm font-semibold text-blue-100 flex justify-between">
                                        <div className="flex items-center gap-2">
                                            <UserCheck className="w-4 h-4" />
                                            <span>Coordenadores Atribuídos ({data.coordinators.length})</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="flex flex-wrap gap-3 pt-2">
                                            {data.coordinators.map((coord, idx) => (
                                                <div key={idx} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 flex items-center gap-3">
                                                    <div className="bg-blue-500/20 p-1.5 rounded-full">
                                                        <User className="w-3 h-3 text-blue-100" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-white">{coord.name}</div>
                                                        {coord.phone && (
                                                            <a 
                                                                href={`https://wa.me/${coord.phone.replace(/\D/g, '')}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-blue-200 hover:text-white flex items-center gap-1 mt-0.5"
                                                            >
                                                                <Phone className="w-3 h-3" />
                                                                {coord.phone}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                type="search"
                                placeholder="Buscar passageiro, veículo, origem ou destino..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="all">Todos os Status</option>
                            <option value="boarded">Embarcados</option>
                            <option value="pending">Pendentes</option>
                            <option value="no_show">No Show</option>
                        </select>

                        <select
                            value={tripFilter}
                            onChange={(e) => setTripFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="all">Todas as Viagens</option>
                            <option value="pending">Aguardando</option>
                            <option value="in_progress">Em Andamento</option>
                            <option value="completed">Concluídas</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="all">Todas as Datas</option>
                            {uniqueDates.map(date => (
                                <option key={date} value={date}>{formatDateStrict(date)}</option>
                            ))}
                        </select>

                        <select
                            value={originFilter}
                            onChange={(e) => setOriginFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="all">Todas as Origens</option>
                            {uniqueOrigins.map(origin => (
                                <option key={origin} value={origin}>{origin}</option>
                            ))}
                        </select>

                        <select
                            value={destinationFilter}
                            onChange={(e) => setDestinationFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="all">Todos os Destinos</option>
                            {uniqueDestinations.map(dest => (
                                <option key={dest} value={dest}>{dest}</option>
                            ))}
                        </select>

                        <select
                            value={vehicleFilter}
                            onChange={(e) => setVehicleFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="all">Todos os Veículos</option>
                            {uniqueVehicleTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                        <Button 
                            variant={directionFilter === 'all' ? 'default' : 'outline'}
                            onClick={() => setDirectionFilter('all')}
                            className="text-sm h-8"
                        >
                            Todos
                        </Button>
                        <Button 
                            variant={directionFilter === 'IN' || directionFilter === 'arrival' || directionFilter === 'airport_transfer' ? 'default' : 'outline'}
                            onClick={() => setDirectionFilter('IN')}
                            className="text-sm h-8 flex items-center gap-2"
                        >
                            <Plane className="w-3 h-3 rotate-90" />
                            Chegadas (IN)
                        </Button>
                        <Button 
                            variant={directionFilter === 'OUT' || directionFilter === 'departure' ? 'default' : 'outline'}
                            onClick={() => setDirectionFilter('OUT')}
                            className="text-sm h-8 flex items-center gap-2"
                        >
                            <Plane className="w-3 h-3 -rotate-90" />
                            Saídas (OUT)
                        </Button>
                    </div>
                </div>

                {/* Trips List */}
                {filteredTrips.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Car className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Nenhuma viagem encontrada com os filtros aplicados.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredTrips.map(trip => (
                            <Card key={trip.id} className="overflow-hidden shadow-md border-t-4 border-t-blue-600">
                                {/* Trip Header */}
                                <div className="bg-gray-50 p-4 border-b border-gray-200">
                                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="font-bold text-lg text-gray-900">
                                                    {(trip.trip_code || trip.name || trip.vehicle_type_category || 'Viagem').split('-')[0].trim()}
                                                </h3>
                                                <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                                                    {formatDateStrict(trip.date)} • {trip.start_time}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                        <span className="font-medium">{trip.origin}</span>
                                                        <span className="text-gray-400">→</span>
                                                        <span className="font-medium">{trip.destination}</span>
                                                    </div>
                                                    {trip.additional_stops && trip.additional_stops.length > 0 && (
                                                        <div className="flex flex-col gap-1 pl-6 text-xs text-gray-600">
                                                            {trip.additional_stops.map((stop, idx) => (
                                                                <div key={idx} className="flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                                                    <span>Parada: {stop.address}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Indicadores de Itens Adicionais na Viagem */}
                                                {trip.additional_items && trip.additional_items.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {trip.additional_items.map((item, idx) => (
                                                            <div key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 text-orange-700 border border-orange-200 text-xs font-medium">
                                                                {(item.name?.toLowerCase().includes('bebê') || item.name?.toLowerCase().includes('baby') || item.name?.toLowerCase().includes('cadeira')) ? (
                                                                    <Baby className="w-3 h-3" />
                                                                ) : (
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                )}
                                                                {item.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {trip.driver_info && (
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-500" />
                                                        <span>
                                                            {trip.driver_info.name}
                                                            {trip.driver_info.vehicle_model && ` • ${trip.driver_info.vehicle_model}`}
                                                            {trip.driver_info.vehicle_plate && ` (${trip.driver_info.vehicle_plate})`}
                                                        </span>
                                                        {trip.driver_info.phone && (
                                                            <a 
                                                                href={`tel:${trip.driver_info.phone}`}
                                                                className="text-green-600 hover:text-green-700"
                                                                title="Ligar"
                                                            >
                                                                <Phone className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-400 hover:text-blue-600"
                                                    onClick={(e) => handleCopyTripSummary(e, trip)}
                                                    title="Copiar resumo da viagem"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                                {getTripStatusBadge(trip.driver_trip_status)}
                                                {(trip.estimated_arrival_time || trip.current_eta_minutes) && trip.driver_trip_status === 'passageiro_embarcou' && (
                                                    <Badge className="bg-blue-600 text-white flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        ETA {trip.estimated_arrival_time 
                                                            ? format(new Date(trip.estimated_arrival_time), 'HH:mm')
                                                            : calculateArrivalTime(trip.current_eta_minutes, trip.eta_last_calculated_at)}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div 
                                                className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                                                onClick={() => toggleTrip(trip.id)}
                                            >
                                                <div className="text-xs text-gray-500 font-medium">
                                                    {trip.passenger_count} Passageiros ({trip.filteredPassengers.length} visíveis)
                                                </div>
                                                {expandedTrips[trip.id] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Passengers List within Trip */}
                                {expandedTrips[trip.id] && (
                                    <div className="divide-y divide-gray-100 animate-in slide-in-from-top duration-200">
                                        {trip.filteredPassengers.map(passenger => (
                                            <div key={passenger.id} className={`p-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                                                passenger.boarding_status === 'boarded' ? 'bg-green-50/20' : 
                                                passenger.boarding_status === 'no_show' ? 'bg-red-50/20' : ''
                                            }`}>
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                    passenger.boarding_status === 'boarded' ? 'bg-green-500' : 
                                                    passenger.boarding_status === 'no_show' ? 'bg-red-500' : 'bg-yellow-400'
                                                }`} />
                                                
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-medium text-gray-900 truncate">{passenger.passenger_name}</p>
                                                        {passenger.tags && passenger.tags.length > 0 && passenger.tags.map((tag, tIdx) => (
                                                            <Badge key={tIdx} variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1">
                                                                <Tag className="w-2.5 h-2.5" />
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                        {(passenger.airline || passenger.flight_number) && (
                                                            <span className="flex items-center gap-1">
                                                                <Plane className="w-3 h-3" />
                                                                {passenger.airline} {passenger.flight_number}
                                                            </span>
                                                        )}
                                                        {passenger.passenger_phone && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="w-3 h-3" />
                                                                {passenger.passenger_phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pl-2">
                                                {getBoardingStatusBadge(passenger.boarding_status)}
                                            </div>
                                        </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}