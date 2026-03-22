import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, CheckCircle, User, MapPin, Search, RefreshCw, QrCode, Phone, Calendar, Clock, AlertTriangle, MoreVertical, Car, MessageCircle, ExternalLink, XCircle, MessageSquare, Plane, RotateCcw, ArrowRight, PlayCircle, Users, UserPlus, Camera, Upload, Baby, Tag, UserCheck, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import PassengerProfileDialog from "../components/PassengerProfileDialog";
import PassengerCommentDialog from "../components/PassengerCommentDialog";
import FlightStatusModal from "../components/event/FlightStatusModal";
import TransferPassengerDialog from "../components/event/TransferPassengerDialog";
import QRCodeScanner from "../components/QRCodeScanner";
import FlexibleVehicleSelectDialog from "../components/event/FlexibleVehicleSelectDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ReceptiveListEventView() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [checkinLoading, setCheckinLoading] = useState({}); // { passengerId: boolean }
    const [profileDialogOpen, setProfileDialogOpen] = useState(false);
    const [selectedPassenger, setSelectedPassenger] = useState(null);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [commentDialogOpen, setCommentDialogOpen] = useState(false);
    const [flightStatusOpen, setFlightStatusOpen] = useState(false);
    const [selectedFlight, setSelectedFlight] = useState({ number: null, airline: null });
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [startingTrip, setStartingTrip] = useState({});
    const [flexVehicleDialogOpen, setFlexVehicleDialogOpen] = useState(false);
    const [selectedPassengerForFlex, setSelectedPassengerForFlex] = useState(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState(null);
    const [addPassengerDialogOpen, setAddPassengerDialogOpen] = useState(false);
    const [newPassenger, setNewPassenger] = useState({
        passenger_name: '',
        passenger_phone: '',
        passenger_email: '',
        document_id: '',
        passenger_city_origin: '',
        origin_address: '',
        destination_address: '',
        flight_number: '',
        airline: '',
        main_passenger_id: '',
        is_companion: false,
        companion_relationship: '',
        selected_trip_id: ''
    });
    const [addingPassenger, setAddingPassenger] = useState(false);
    const [expandedTrips, setExpandedTrips] = useState({});
    const [sortOrder, setSortOrder] = useState('alphabetical');

    const toggleTrip = (tripId) => {
        setExpandedTrips(prev => ({
            ...prev,
            [tripId]: !prev[tripId]
        }));
    };

    // Estatísticas Gerais
    const stats = React.useMemo(() => {
        if (!data?.trips) return { total: 0, pending: 0, boarded: 0, noshow: 0 };
        return data.trips.reduce((acc, trip) => {
            const passengers = trip.passengers || [];
            acc.total += passengers.length;
            passengers.forEach(p => {
                if (p.boarding_status === 'boarded') acc.boarded++;
                else if (p.boarding_status === 'no_show') acc.noshow++;
                else acc.pending++;
            });
            return acc;
        }, { total: 0, pending: 0, boarded: 0, noshow: 0 });
    }, [data]);
    
    // States for Start Trip with Photo
    const [startTripModalOpen, setStartTripModalOpen] = useState(false);
    const [selectedTripForStart, setSelectedTripForStart] = useState(null);
    const [platePhoto, setPlatePhoto] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [finishingTrip, setFinishingTrip] = useState({});
    const [scanTransferData, setScanTransferData] = useState(null);
    const fileInputRef = React.useRef(null);

    useEffect(() => {
        if (!token) {
            setError("Token de acesso inválido ou ausente.");
            setLoading(false);
            return;
        }
        // Load initially without forcing server fetch (prefer cache)
        loadData(false);
    }, [token]);

    const loadData = async (force = false, silent = false) => {
        const cacheKey = `receptive_list_${token}`;
        
        // 1. Try to load from cache first if not forcing update
        if (!force) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    setData(parsed);
                    setLoading(false);
                    // If we have cache, we don't fetch automatically to avoid 500 errors
                    // User must explicitly click refresh
                    if (!silent) toast.info("Dados carregados da memória (Offline).", { duration: 2000 });
                    return; 
                } catch (e) {
                    console.error("Cache corrupted", e);
                }
            }
        }

        if (!silent) setLoading(true);
        try {
            // Adiciona timestamp para evitar cache em atualizações forçadas
            const payload = { token };
            if (force) payload._t = Date.now();
            
            const response = await base44.functions.invoke('getEventReceptiveListByToken', payload);
            if (response.data && response.data.success) {
                const dataWithTimestamp = { ...response.data, _cachedAt: new Date().toISOString() };
                setData(dataWithTimestamp);
                // Save to cache
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(dataWithTimestamp));
                } catch (e) {
                    console.error("Failed to save to cache", e);
                }
                if (!silent && force) toast.success("Lista atualizada com sucesso!");
            } else {
                if (!silent) setError(response.data?.error || "Erro ao carregar lista.");
            }
        } catch (err) {
            console.error("Erro:", err);
            // Fallback to cache if request fails
            const cached = localStorage.getItem(cacheKey);
            if (cached && force) {
                try {
                    setData(JSON.parse(cached));
                    toast.warning("Sem conexão. Exibindo última versão salva.");
                } catch (e) {
                    if (!silent) setError("Falha na conexão.");
                }
            } else {
                if (!silent) setError("Falha na conexão.");
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleUpdateBoardingStatus = async (passenger, tripId, status, skipConfirm = false, newTripId = null) => {
        // Se o passageiro é de alocação flexível e está fazendo check-in, usar o veículo selecionado
        if (passenger.is_flexible_allocation && status === 'boarded' && !newTripId) {
            if (!selectedVehicleId) {
                toast.error("Selecione um Veículo", {
                    description: "Por favor, selecione primeiro o veículo que está operando no momento.",
                    duration: 2000
                });
                return;
            }
            newTripId = selectedVehicleId;
        }

        const actionText = status === 'boarded' ? 'embarque' : 'no show';
        const confirmText = status === 'boarded' ? `Confirmar embarque de ${passenger.passenger_name}?` : `Marcar ${passenger.passenger_name} como No Show?`;
        
        if (!skipConfirm && !confirm(confirmText)) return;

        setCheckinLoading(prev => ({ ...prev, [passenger.id]: true }));
        try {
            const requestData = {
                tripId,
                passengerId: passenger.id,
                status,
                token
            };

            // Se newTripId fornecido, inclui para reatribuição
            if (newTripId) {
                requestData.newTripId = newTripId;
            }

            const response = await base44.functions.invoke('processCheckIn', requestData);

            if (response.data && response.data.success) {
                const title = status === 'boarded' ? "Check-in Realizado!" : "Marcado como No Show";
                const description = status === 'boarded' ? `${passenger.passenger_name} embarcado com sucesso.` : `${passenger.passenger_name} marcado como No Show.`;
                
                toast.success(title, {
                    description,
                    duration: 2000
                });

                // Atualização Otimista do Estado Local
                setData(prev => {
                    if (!prev) return prev;
                    
                    // Se houve troca de viagem
                    if (newTripId && newTripId !== tripId) {
                        // Remove da antiga e adiciona na nova
                        let movedPassenger = null;
                        
                        const tripsAfterRemoval = prev.trips.map(t => {
                            if (t.id === tripId) {
                                const p = t.passengers.find(p => p.id === passenger.id);
                                if (p) {
                                    movedPassenger = { 
                                        ...p, 
                                        boarding_status: status, 
                                        boarding_time: new Date().toISOString(),
                                        event_trip_id: newTripId 
                                    };
                                    return {
                                        ...t,
                                        passengers: t.passengers.filter(p => p.id !== passenger.id),
                                        passenger_count: Math.max(0, (t.passenger_count || t.passengers.length) - 1),
                                        current_passenger_count: t.is_flexible_vehicle ? Math.max(0, (t.current_passenger_count || 0) - 1) : t.current_passenger_count
                                    };
                                }
                            }
                            return t;
                        });

                        if (movedPassenger) {
                            return {
                                ...prev,
                                trips: tripsAfterRemoval.map(t => {
                                    if (t.id === newTripId) {
                                        return {
                                            ...t,
                                            passengers: [...(t.passengers || []), movedPassenger],
                                            passenger_count: (t.passenger_count || t.passengers.length) + 1,
                                            current_passenger_count: t.is_flexible_vehicle ? (t.current_passenger_count || 0) + 1 : t.current_passenger_count
                                        };
                                    }
                                    return t;
                                })
                            };
                        }
                    }

                    // Atualização normal (mesma viagem)
                    const newTrips = prev.trips.map(t => {
                        if (t.id === tripId) {
                            return {
                                ...t,
                                passengers: t.passengers.map(p => 
                                    p.id === passenger.id ? { ...p, boarding_status: status, boarding_time: new Date().toISOString() } : p
                                )
                            };
                        }
                        return t;
                    });
                    return { ...prev, trips: newTrips };
                });
                
                // Debounced Refresh to avoid rate limit on rapid clicks
                if (window._refreshTimeout) clearTimeout(window._refreshTimeout);
                window._refreshTimeout = setTimeout(() => {
                    loadData(true, true); 
                }, 3000); // Wait 3 seconds of inactivity before refreshing from server
            } else {
                alert(response.data?.error || `Erro ao processar ${actionText}`);
            }
        } catch (err) {
            alert(`Erro de conexão ao processar ${actionText}`);
        } finally {
            setCheckinLoading(prev => ({ ...prev, [passenger.id]: false }));
        }
    };

    const handleSelectFlexibleVehicle = async (vehicleId) => {
        if (!selectedPassengerForFlex) return;

        await handleUpdateBoardingStatus(
            selectedPassengerForFlex, 
            vehicleId, // tripId para validação (será substituído no backend por newTripId)
            'boarded', 
            true, // skip confirm
            vehicleId // newTripId para atribuição
        );
        
        setFlexVehicleDialogOpen(false);
        setSelectedPassengerForFlex(null);
    };

    const handleChangeStatus = async (passenger, tripId, newStatus) => {
        if (!confirm(`Deseja alterar o status de ${passenger.passenger_name} para ${newStatus === 'pending' ? 'Aguardando' : newStatus === 'boarded' ? 'Embarcado' : 'No Show'}?`)) return;

        setCheckinLoading(prev => ({ ...prev, [passenger.id]: true }));
        try {
            const response = await base44.functions.invoke('processCheckIn', {
                tripId,
                passengerId: passenger.id,
                status: newStatus,
                token
            });

            if (response.data && response.data.success) {
                toast.success("Status Alterado", {
                    description: `Status de ${passenger.passenger_name} alterado com sucesso.`,
                    duration: 2000
                });
                
                setData(prev => {
                    const newTrips = prev.trips.map(t => {
                        if (t.id === tripId) {
                            return {
                                ...t,
                                passengers: t.passengers.map(p => 
                                    p.id === passenger.id ? { ...p, boarding_status: newStatus, boarding_time: new Date().toISOString() } : p
                                )
                            };
                        }
                        return t;
                    });
                    return { ...prev, trips: newTrips };
                });
            } else {
                alert(response.data?.error || 'Erro ao alterar status');
            }
        } catch (err) {
            alert('Erro de conexão ao alterar status');
        } finally {
            setCheckinLoading(prev => ({ ...prev, [passenger.id]: false }));
        }
    };

    const handleSendSMS = async (passenger, tripId) => {
        if (!passenger.passenger_phone) {
            toast.error("Sem Telefone", {
                description: "Passageiro sem telefone cadastrado.",
                duration: 2000
            });
            return;
        }

        const toastId = toast.loading("Enviando SMS...");

        try {
            const response = await base44.functions.invoke('sendBoardingPassSMS', {
                passengerId: passenger.id,
                tripId: tripId || passenger.event_trip_id
            });

            if (response.data?.success) {
                toast.success("SMS Enviado!", {
                    id: toastId,
                    description: "Cartão de embarque enviado com sucesso.",
                    duration: 3000
                });
            } else {
                throw new Error(response.data?.error || "Erro ao enviar SMS");
            }
        } catch (error) {
            toast.error("Erro no Envio", {
                id: toastId,
                description: error.message || "Falha ao enviar SMS.",
                duration: 3000
            });
        }
    };

    const handleScanResult = (scannedUrl) => {
        console.log('[QR Scanner] Código escaneado:', scannedUrl);
        
        try {
            let url;
            
            // Tenta fazer parse como URL completa
            try {
                url = new URL(scannedUrl);
            } catch {
                // Se falhar, tenta como URL relativa combinada com a origem atual
                try {
                    url = new URL(scannedUrl, window.location.origin);
                } catch {
                    throw new Error('URL_PARSE_FAILED');
                }
            }

            const tripId = url.searchParams.get("tripId");
            const passengerId = url.searchParams.get("passengerId");

            console.log('[QR Scanner] tripId:', tripId, 'passengerId:', passengerId);

            if (!tripId || !passengerId) {
                toast.error("QR Code Inválido", {
                    description: "Este código não contém as informações necessárias.",
                    duration: 2000
                });
                return;
            }

            // Find passenger in data to confirm details
            let foundPassenger = null;
            let foundTripId = null;

            data.trips.forEach(trip => {
                if (trip.id === tripId) {
                    const p = trip.passengers.find(pass => pass.id === passengerId);
                    if (p) {
                        foundPassenger = p;
                        foundTripId = trip.id;
                    }
                }
            });

            if (foundPassenger) {
                // Verificar se o passageiro pertence a outro veículo (se um veículo específico estiver selecionado)
                if (selectedVehicleId && foundTripId !== selectedVehicleId) {
                    const currentTripName = data.trips.find(t => t.id === foundTripId)?.name || "Outro Veículo";
                    const targetTripName = data.trips.find(t => t.id === selectedVehicleId)?.name || "Veículo Atual";
                    
                    setScanTransferData({
                        passenger: foundPassenger,
                        fromTripId: foundTripId,
                        toTripId: selectedVehicleId,
                        fromTripName: currentTripName,
                        toTripName: targetTripName
                    });
                    return;
                }

                if (foundPassenger.boarding_status === 'boarded') {
                    toast.warning("Já Embarcado", {
                        description: `${foundPassenger.passenger_name} já realizou check-in.`,
                        duration: 2000
                    });
                } else if (foundPassenger.boarding_status === 'no_show') {
                    toast.warning("Marcado como No Show", {
                        description: `${foundPassenger.passenger_name} foi marcado como No Show.`,
                        duration: 2000
                    });
                } else {
                    // Realiza check-in automaticamente
                    handleUpdateBoardingStatus(foundPassenger, foundTripId, 'boarded', true);
                }
            } else {
                toast.error("Passageiro Não Encontrado", {
                    description: "Este passageiro não está nesta lista.",
                    duration: 2000
                });
            }
        } catch (e) {
            console.error('[QR Scanner] Erro ao processar código:', e);
            toast.error("Erro ao Processar Código", {
                description: "Não foi possível ler este QR Code.",
                duration: 2000
            });
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
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // Separar trips normais dos flexíveis
    // Agora incluímos todas as viagens na lista principal (normalTrips) para aparecerem nas abas
    const normalTrips = data.trips; 
    const flexibleVehicles = data.trips.filter(trip => trip.is_flexible_vehicle);

    // Passageiros flexíveis pendentes de check-in (apenas os que ainda não embarcaram)
    const pendingFlexPassengers = flexibleVehicles
        .flatMap(vehicle => 
            (vehicle.passengers || []).filter(p => 
                p.is_flexible_allocation && 
                p.boarding_status === 'pending'
            )
        )
        .sort((a, b) => a.passenger_name.localeCompare(b.passenger_name));
    
    // Passageiros flexíveis já embarcados (para visualização)
    const boardedFlexPassengers = flexibleVehicles
        .flatMap(vehicle => 
            (vehicle.passengers || []).filter(p => 
                p.is_flexible_allocation && 
                (p.boarding_status === 'boarded' || p.boarding_status === 'no_show')
            )
        )
        .sort((a, b) => a.passenger_name.localeCompare(b.passenger_name));

    const filteredTrips = normalTrips.filter(trip => {
        // Se um veículo específico estiver selecionado, filtra apenas ele (exceto se for busca global)
        if (selectedVehicleId && trip.id !== selectedVehicleId && !searchTerm) return false;

        if (!searchTerm) return true;
        
        const passengers = trip.passengers || [];
        const searchLower = searchTerm.toLowerCase();
        
        // Busca por passageiros
        const matchesPax = passengers.some(p => 
            (p.passenger_name || '').toLowerCase().includes(searchLower)
        );
        
        // Busca por dados da viagem
        const matchesTrip = (trip.name || '').toLowerCase().includes(searchLower) || 
                            (trip.trip_code || '').toLowerCase().includes(searchLower) ||
                            (trip.driver_info?.name || '').toLowerCase().includes(searchLower) ||
                            (trip.vehicle_plate || '').toLowerCase().includes(searchLower);
                            
        return matchesPax || matchesTrip;
    });

    // Filtrar passageiros flexíveis pendentes pela busca
    // Lógica de agrupamento de passageiros (Famílias/Grupos)
    const groupPassengers = (passengers) => {
        const groups = {};
        const singles = [];

        // Primeiro, identificar os principais
        passengers.forEach(p => {
            if (p.is_companion && p.main_passenger_id) {
                if (!groups[p.main_passenger_id]) groups[p.main_passenger_id] = [];
                groups[p.main_passenger_id].push(p);
            } else {
                // Se não é acompanhante, verifica se ele é um principal (tem gente apontando pra ele)
                // Mas aqui não sabemos ainda. Vamos colocar em singles temporariamente
                // Ou melhor, colocar em um mapa por ID para fácil acesso
            }
        });

        // Agora construir a lista final
        const finalMap = new Map(); // ID -> Objeto { passenger, companions: [] }

        passengers.forEach(p => {
            if (!p.is_companion) {
                if (!finalMap.has(p.id)) {
                    finalMap.set(p.id, { passenger: p, companions: [] });
                }
            }
        });

        // Adicionar acompanhantes aos seus principais
        passengers.forEach(p => {
            if (p.is_companion && p.main_passenger_id) {
                if (finalMap.has(p.main_passenger_id)) {
                    finalMap.get(p.main_passenger_id).companions.push(p);
                } else {
                    // Caso órfão (principal não está nesta lista ou filtro), tratar como single
                    if (!finalMap.has(p.id)) {
                        finalMap.set(p.id, { passenger: p, companions: [] });
                    }
                }
            }
        });

        return Array.from(finalMap.values());
    };

    const filteredFlexPassengers = searchTerm 
    ? pendingFlexPassengers.filter(p => p.passenger_name.toLowerCase().includes(searchTerm.toLowerCase()))
    : pendingFlexPassengers;

    const groupedFlexPassengers = groupPassengers(filteredFlexPassengers).sort((a, b) => a.passenger.passenger_name.localeCompare(b.passenger.passenger_name));

    // Filtrar passageiros flexíveis embarcados pela busca
    const filteredBoardedFlexPassengers = searchTerm 
    ? boardedFlexPassengers.filter(p => p.passenger_name.toLowerCase().includes(searchTerm.toLowerCase()))
    : boardedFlexPassengers;

    const groupedBoardedFlexPassengers = groupPassengers(filteredBoardedFlexPassengers).sort((a, b) => a.passenger.passenger_name.localeCompare(b.passenger.passenger_name));

    const handleOpenProfile = (passenger, trip) => {
        setSelectedPassenger(passenger);
        setSelectedTrip(trip);
        setProfileDialogOpen(true);
    };

    const handleOpenComment = (passenger, trip) => {
        setSelectedPassenger(passenger);
        setSelectedTrip(trip);
        setCommentDialogOpen(true);
    };

    const handleOpenFlightStatus = (passenger) => {
        setSelectedFlight({
            number: passenger.flight_number,
            airline: passenger.airline
        });
        setFlightStatusOpen(true);
    };

    const handleOpenUber = (trip) => {
        const destination = encodeURIComponent(trip.destination);
        const uberUrl = `uber://?action=setPickup&pickup=my_location&dropoff[formatted_address]=${destination}`;
        
        // Try to open Uber app
        window.location.href = uberUrl;
        
        // Fallback to web after a delay
        setTimeout(() => {
            const webUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${destination}`;
            window.open(webUrl, '_blank');
        }, 1000);
    };

    const handleRemovePassenger = async (passenger, tripId) => {
        if (!confirm(`Tem certeza que deseja remover ${passenger.passenger_name} desta viagem?`)) return;
        
        try {
            const response = await base44.functions.invoke('removePassengerFromTrip', {
                passengerId: passenger.id,
                tripId,
                token
            });

            if (response.data?.success) {
                toast.success("Passageiro Removido", {
                    description: `${passenger.passenger_name} foi removido da viagem.`,
                    duration: 2000
                });
                loadData(true, true); // Reload data silently
            } else {
                throw new Error(response.data?.error || "Erro ao remover passageiro");
            }
        } catch (error) {
            toast.error("Erro", {
                description: error.message || "Falha ao remover passageiro.",
                duration: 2000
            });
        }
    };

    const handleOpenTransferDialog = (passenger, trip) => {
        setSelectedPassenger(passenger);
        setSelectedTrip(trip);
        setTransferDialogOpen(true);
    };

    const handleTransferConfirm = async (toTripId) => {
        try {
            const response = await base44.functions.invoke('transferPassengerBetweenTrips', {
                passengerId: selectedPassenger.id,
                fromTripId: selectedTrip.id,
                toTripId,
                token
            });

            if (response.data?.success) {
                toast.success("Passageiro Transferido", {
                    description: response.data.message || "Transferência realizada com sucesso!",
                    duration: 2000
                });
                loadData(true, true); // Reload data silently
            } else {
                throw new Error(response.data?.error || "Erro ao transferir passageiro");
            }
        } catch (error) {
            toast.error("Erro", {
                description: error.message || "Falha ao transferir passageiro.",
                duration: 2000
            });
            throw error;
        }
    };

    const getAvailableTripsForTransfer = (currentTripId) => {
        if (!data?.trips) return [];
        return data.trips.filter(trip => trip.id !== currentTripId);
    };

    const handleStartTrip = (trip) => {
        if (!trip.coordinator_can_start_trip) {
            toast.error("Permissão Negada", {
                description: "O gestor não habilitou o início da viagem pelo coordenador.",
                duration: 2000
            });
            return;
        }
        
        setSelectedTripForStart(trip);
        setPlatePhoto(null);
        setStartTripModalOpen(true);
    };

    const handleConfirmStartTrip = async () => {
        if (!selectedTripForStart) return;
        
        const trip = selectedTripForStart;
        setStartingTrip(prev => ({ ...prev, [trip.id]: true }));
        setUploadingPhoto(true);

        try {
            let photoUrl = null;

            if (platePhoto) {
                const uploadRes = await base44.integrations.Core.UploadFile({
                   file: platePhoto
                });
                photoUrl = uploadRes.file_url;
            }

            const response = await base44.functions.invoke('updateEventTripStatus', {
                tripId: trip.id,
                newStatus: 'a_caminho',
                token,
                vehicle_plate_photo_url: photoUrl
            });

            if (response.data?.success) {
                toast.success("Viagem Iniciada!", {
                    description: "O motorista está a caminho e o ETA foi calculado.",
                    duration: 3000
                });
                setStartTripModalOpen(false);
                setSelectedTripForStart(null);
                setPlatePhoto(null);
                loadData(true, true); 
            } else {
                throw new Error(response.data?.error || "Erro ao iniciar viagem");
            }
        } catch (error) {
            toast.error("Erro", {
                description: error.message || "Falha ao iniciar viagem.",
                duration: 2000
            });
        } finally {
            setStartingTrip(prev => ({ ...prev, [trip.id]: false }));
            setUploadingPhoto(false);
        }
    };

    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPlatePhoto(file);
        }
    };

    const handleFinalizeTrip = async (trip) => {
        if (!confirm(`Confirma a finalização da viagem para ${trip.destination}? Isso encerrará o atendimento.`)) return;

        setFinishingTrip(prev => ({ ...prev, [trip.id]: true }));
        try {
            const response = await base44.functions.invoke('finalizeEventTrip', {
                tripId: trip.id,
                token
            });

            if (response.data && response.data.success) {
                toast.success("Viagem Finalizada!", {
                    description: "A viagem foi concluída com sucesso.",
                    duration: 3000
                });
                loadData(true, true);
            } else {
                throw new Error(response.data?.error || "Erro ao finalizar viagem");
            }
        } catch (error) {
            toast.error("Erro", {
                description: error.message || "Falha ao finalizar viagem.",
                duration: 2000
            });
        } finally {
            setFinishingTrip(prev => ({ ...prev, [trip.id]: false }));
        }
    };

    // Filter logic for tabs
    const scheduledTrips = filteredTrips.filter(t => {
        const status = t.driver_trip_status || 'aguardando';
        const isFinished = t.status === 'completed' || t.status === 'cancelled' || ['finalizada', 'cancelada_motorista', 'no_show'].includes(status);
        if (isFinished) return false;
        
        // Programado inclui: aguardando (apenas viagens não iniciadas)
        return ['aguardando'].includes(status);
    });

    const transitTrips = filteredTrips.filter(t => {
        const status = t.driver_trip_status;
        const isFinished = t.status === 'completed' || t.status === 'cancelled' || ['finalizada', 'cancelada_motorista', 'no_show'].includes(status);
        if (isFinished) return false;
        if (!status || status === 'aguardando') return false;

        // Trânsito inclui: a_caminho, chegou_origem, passageiro_embarcou e outros status
        return ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'parada_adicional', 'a_caminho_destino', 'chegou_destino', 'aguardando_confirmacao_despesas', 'desembarcou'].includes(status);
    });

    const finishedTrips = filteredTrips.filter(t => 
        t.status === 'completed' || 
        t.status === 'cancelled' || 
        ['finalizada', 'cancelada_motorista', 'no_show'].includes(t.driver_trip_status)
    );

    const handleOpenAddPassenger = (tripId) => {
        setNewPassenger(prev => ({
            ...prev,
            selected_trip_id: tripId
        }));
        setAddPassengerDialogOpen(true);
    };

    const renderTripCard = (trip) => (
        <Card key={trip.id} className="overflow-hidden border-0 shadow-md transition-all duration-200 mb-4">
            <div 
                className={`p-3 text-white cursor-pointer transition-colors ${
                    trip.driver_trip_status === 'finalizada' ? 'bg-gray-600 hover:bg-gray-700' :
                    trip.driver_trip_status === 'cancelada_motorista' || trip.status === 'cancelled' ? 'bg-red-600 hover:bg-red-700' :
                    trip.driver_trip_status !== 'aguardando' ? 'bg-indigo-600 hover:bg-indigo-700' :
                    'bg-blue-600 hover:bg-blue-700'
                }`}
                onClick={() => toggleTrip(trip.id)}
            >
                <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        {expandedTrips[trip.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {(trip.trip_code || trip.name) && (
                            <span className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-bold mr-1">
                                {(trip.trip_code || trip.name).split('-')[0].trim()}
                            </span>
                        )}
                        <Clock className="w-4 h-4" /> {format(new Date(trip.date + 'T12:00:00'), "dd/MM")} • {trip.start_time}
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-white hover:bg-white/20 rounded-full"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddPassenger(trip.id);
                            }}
                            title="Adicionar Passageiro nesta viagem"
                        >
                            <UserPlus className="w-4 h-4" />
                        </Button>
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                            {trip.passengers.length} pax
                        </Badge>
                    </div>
                </div>
                
                {/* Resumo da Viagem */}
                <div className="flex gap-2 mb-3 text-[10px] font-medium">
                    <span className="bg-white/20 px-2 py-0.5 rounded text-white">
                        {trip.passengers.filter(p => p.boarding_status === 'pending').length} Pendentes
                    </span>
                    <span className="bg-green-500/30 px-2 py-0.5 rounded text-white">
                        {trip.passengers.filter(p => p.boarding_status === 'boarded').length} Embarcados
                    </span>
                    {trip.passengers.filter(p => p.boarding_status === 'no_show').length > 0 && (
                        <span className="bg-red-500/30 px-2 py-0.5 rounded text-white">
                            {trip.passengers.filter(p => p.boarding_status === 'no_show').length} No Show
                        </span>
                    )}
                </div>

                <div className="text-xs text-blue-100 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {trip.origin} → {trip.destination}
                </div>

                {/* Indicadores de Itens Adicionais na Viagem */}
                {trip.additional_items && trip.additional_items.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 mb-1">
                        {trip.additional_items.map((item, idx) => (
                            <div key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-500/20 text-orange-100 border border-orange-500/30 text-[10px] font-medium animate-pulse">
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

                {/* Coordinators Info */}
                {trip.coordinators && trip.coordinators.length > 0 && (
                    <div className="mt-2 mb-2 bg-white/10 p-2 rounded flex flex-col gap-1 border border-white/20">
                        <div className="text-[10px] font-bold text-blue-100 uppercase flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            Coordenadores da Viagem
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {trip.coordinators.map((coord, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs text-white bg-white/10 px-2 py-1 rounded">
                                    <span className="font-semibold">{coord.name}</span>
                                    {coord.phone && (
                                        <>
                                            <span className="text-white/40">|</span>
                                            <a href={`https://wa.me/${coord.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-blue-200 hover:text-white flex items-center gap-1">
                                                <Phone className="w-2.5 h-2.5" /> 
                                                {coord.phone}
                                            </a>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {trip.driver_info && (
                    <div className="mt-3 pt-3 border-t border-white/20 text-sm bg-white/5 -mx-3 px-3 pb-1">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 font-medium text-white">
                                <User className="w-4 h-4 opacity-80" /> 
                                <span>{trip.driver_info.name}</span>
                                {trip.driver_info.phone && (
                                    <div className="ml-auto flex items-center gap-3">
                                        <a 
                                            href={`tel:${trip.driver_info.phone}`} 
                                            className="flex items-center gap-1 text-blue-200 hover:text-white transition-colors"
                                            title="Ligar"
                                        >
                                            <Phone className="w-3.5 h-3.5" />
                                        </a>
                                        <a 
                                            href={`https://wa.me/${trip.driver_info.phone.replace(/\D/g, '')}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="flex items-center gap-1 text-green-400 hover:text-green-300 transition-colors"
                                            title="WhatsApp"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                        </a>
                                        <span className="text-blue-200 font-normal text-xs">{trip.driver_info.phone}</span>
                                    </div>
                                )}
                            </div>
                            {trip.driver_info.vehicle_model && trip.driver_info.vehicle_plate && (
                                <div className="flex items-center gap-2 text-blue-100 pl-6">
                                    <Car className="w-3 h-3 opacity-70" /> 
                                    <span className="font-semibold">{trip.driver_info.vehicle_model}</span>
                                    <span className="opacity-60">•</span>
                                    <span className="font-mono bg-white/10 px-1.5 rounded text-xs">{trip.driver_info.vehicle_plate}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {trip.coordinator_can_start_trip && trip.driver_trip_status === 'aguardando' && (
                    <div className="mt-2 pt-2 border-t border-white/20">
                        <Button 
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700 text-white h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={(e) => { e.stopPropagation(); handleStartTrip(trip); }}
                            disabled={startingTrip[trip.id] || (trip.passengers && trip.passengers.length > 0 && !trip.passengers.every(p => p.boarding_status === 'boarded' || p.boarding_status === 'no_show'))}
                            title={trip.passengers && trip.passengers.length > 0 && !trip.passengers.every(p => p.boarding_status === 'boarded' || p.boarding_status === 'no_show') ? "Processe todos os passageiros (Chegou/No Show) para iniciar a viagem" : "Iniciar Viagem"}
                        >
                            {startingTrip[trip.id] ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <PlayCircle className="w-4 h-4 mr-2" />
                            )}
                            Iniciar Viagem
                        </Button>
                    </div>
                )}
                {trip.driver_trip_status && trip.driver_trip_status !== 'aguardando' && (
                    <div className="mt-2 pt-2 border-t border-white/20 space-y-2">
                        <Badge className={`w-full justify-center ${trip.driver_trip_status === 'finalizada' ? 'bg-gray-200 text-gray-700' : 'bg-white/90 text-blue-900'}`}>
                            Status: {trip.driver_trip_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                        
                        {/* Botão Finalizar Viagem */}
                        {trip.driver_trip_status !== 'finalizada' && 
                         trip.driver_trip_status !== 'cancelada_motorista' && 
                         trip.driver_trip_status !== 'no_show' &&
                         trip.passengers && 
                         trip.passengers.length > 0 && 
                         trip.passengers.every(p => p.boarding_status === 'boarded' || p.boarding_status === 'no_show') && (
                            <Button 
                                size="sm"
                                className="w-full bg-white/20 hover:bg-white/30 text-white h-8 border border-white/40"
                                onClick={(e) => { e.stopPropagation(); handleFinalizeTrip(trip); }}
                                disabled={finishingTrip[trip.id]}
                            >
                                {finishingTrip[trip.id] ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                )}
                                Finalizar Viagem
                            </Button>
                        )}
                    </div>
                )}
            </div>
            {expandedTrips[trip.id] && (
            <CardContent className="p-0 animate-in slide-in-from-top-2 duration-200">
                {trip.passengers
                    .filter(p => p.passenger_name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .sort((a, b) => {
                        if (sortOrder === 'flight_time') {
                            const timeA = a.flight_time || '99:99';
                            const timeB = b.flight_time || '99:99';
                            if (timeA !== timeB) return timeA.localeCompare(timeB);
                        }
                        return a.passenger_name.localeCompare(b.passenger_name);
                    })
                    .map((passenger, idx) => (
                    <div 
                        key={passenger.id} 
                        className={`p-4 ${idx !== trip.passengers.length - 1 ? 'border-b' : ''} ${passenger.boarding_status === 'boarded' ? 'bg-green-50/50' : passenger.boarding_status === 'no_show' ? 'bg-red-50/50' : 'bg-white'}`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className={`font-medium text-sm truncate ${passenger.boarding_status === 'boarded' ? 'text-green-800' : passenger.boarding_status === 'no_show' ? 'text-red-800' : 'text-gray-900'}`}>
                                            {passenger.passenger_name}
                                        </p>
                                        {/* Tags do Passageiro */}
                                        {passenger.tags && passenger.tags.length > 0 && passenger.tags.map((tag, tIdx) => (
                                            <Badge key={tIdx} variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1">
                                                <Tag className="w-2.5 h-2.5" />
                                                {tag}
                                            </Badge>
                                        ))}
                                        {passenger.comments && passenger.comments.length > 0 && (
                                            <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1 animate-pulse" title="Ver comentários">
                                                <MessageSquare className="w-2.5 h-2.5" />
                                                {passenger.comments.length}
                                            </Badge>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 -ml-1">
                                            <MoreVertical className="w-4 h-4 text-gray-500" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56">
                                        <DropdownMenuLabel className="text-xs text-gray-500 uppercase">
                                            {passenger.passenger_name}
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {passenger.passenger_phone && (
                                            <>
                                                <DropdownMenuItem onClick={() => window.open(`tel:${passenger.passenger_phone}`, '_system')}>
                                                    <Phone className="w-4 h-4 mr-2" /> Ligar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => window.open(`https://wa.me/${passenger.passenger_phone.replace(/\D/g, '')}`, '_blank')}>
                                                    <MessageCircle className="w-4 h-4 mr-2" /> Mensagem WhatsApp
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleSendSMS(passenger, passenger.event_trip_id)}>
                                                    <MessageSquare className="w-4 h-4 mr-2" /> Enviar SMS
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        <DropdownMenuItem onClick={() => handleOpenComment(passenger, trip)}>
                                            <MessageSquare className="w-4 h-4 mr-2" /> Comentar
                                        </DropdownMenuItem>
                                        {passenger.flight_number && (
                                            <DropdownMenuItem onClick={() => handleOpenFlightStatus(passenger)}>
                                                <Plane className="w-4 h-4 mr-2" /> Rastrear Voo
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => handleOpenProfile(passenger, trip)}>
                                            <User className="w-4 h-4 mr-2" /> Perfil Participante
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenUber(trip)}>
                                            <Car className="w-4 h-4 mr-2" /> Uber
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleOpenTransferDialog(passenger, trip)}>
                                            <ArrowRight className="w-4 h-4 mr-2" /> Transferir Passageiro
                                        </DropdownMenuItem>
                                        {(passenger.boarding_status === 'boarded' || passenger.boarding_status === 'no_show') && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel className="text-xs text-gray-500 uppercase">
                                                    Alterar Status
                                                </DropdownMenuLabel>
                                                {passenger.boarding_status !== 'pending' && (
                                                    <DropdownMenuItem onClick={() => handleChangeStatus(passenger, trip.id, 'pending')}>
                                                        <RotateCcw className="w-4 h-4 mr-2" /> Voltar para Aguardando
                                                    </DropdownMenuItem>
                                                )}
                                                {passenger.boarding_status !== 'boarded' && (
                                                    <DropdownMenuItem onClick={() => handleChangeStatus(passenger, trip.id, 'boarded')}>
                                                        <CheckCircle className="w-4 h-4 mr-2" /> Marcar como Embarcado
                                                    </DropdownMenuItem>
                                                )}
                                                {passenger.boarding_status !== 'no_show' && (
                                                    <DropdownMenuItem onClick={() => handleChangeStatus(passenger, trip.id, 'no_show')}>
                                                        <XCircle className="w-4 h-4 mr-2" /> Marcar como No Show
                                                    </DropdownMenuItem>
                                                )}
                                            </>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                            onClick={() => handleRemovePassenger(passenger, trip.id)}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" /> Remover Participante
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                </div>
                                {(passenger.airline || passenger.flight_number) && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <Plane className="w-3 h-3 text-gray-400" />
                                        <span className="text-xs text-gray-500">
                                            {passenger.airline && passenger.flight_number ? `${passenger.airline} ${passenger.flight_number}` : passenger.flight_number || passenger.airline}
                                            {passenger.flight_time && ` • ${passenger.flight_time}`}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            {passenger.boarding_status === 'boarded' ? (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            ) : passenger.boarding_status === 'no_show' ? (
                                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                            ) : null}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                                {passenger.boarding_status === 'boarded' ? (
                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                        Embarcado
                                    </span>
                                ) : passenger.boarding_status === 'no_show' ? (
                                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                        No Show
                                    </span>
                                ) : (
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                                        Aguardando
                                    </span>
                                )}
                                {passenger.passenger_phone && (
                                    <span className="text-[10px] text-gray-400">
                                        {passenger.passenger_phone}
                                    </span>
                                )}
                            </div>

                            {passenger.boarding_status !== 'boarded' && passenger.boarding_status !== 'no_show' && (
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        className="h-8 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                        onClick={() => handleUpdateBoardingStatus(passenger, trip.id, 'boarded', true)}
                                        disabled={checkinLoading[passenger.id]}
                                    >
                                        {checkinLoading[passenger.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" /> Chegou</>}
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="h-8 border-red-300 text-red-600 hover:bg-red-50 shadow-sm"
                                        onClick={() => handleUpdateBoardingStatus(passenger, trip.id, 'no_show')}
                                        disabled={checkinLoading[passenger.id]}
                                    >
                                        {checkinLoading[passenger.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-1" /> No Show</>}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
            )}
        </Card>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">{data.event.event_name}</h1>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-500">Lista de Receptivo</p>
                                {data?._cachedAt && (
                                    <span className="text-[10px] text-gray-400">
                                        • Atualizado: {format(new Date(data._cachedAt), "HH:mm")}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {data.coordinator.name || "Coordenador"}
                            </Badge>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        {flexibleVehicles.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Car className="w-4 h-4 text-purple-600" />
                                <select
                                    value={selectedVehicleId || ''}
                                    onChange={(e) => setSelectedVehicleId(e.target.value || null)}
                                    className="flex-1 h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">📋 Todos os Veículos (Visão Geral)</option>
                                    {data.trips.map(vehicle => {
                                        const spotsLeft = vehicle.vehicle_capacity ? (vehicle.vehicle_capacity - (vehicle.passenger_count || 0)) : null;
                                        return (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                {vehicle.is_flexible_vehicle ? '🚕' : '🚐'} {(vehicle.trip_code || vehicle.name)} {spotsLeft !== null ? `(${spotsLeft} vagas)` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}

                        <div className="flex flex-wrap sm:flex-nowrap gap-2">
                            <div className="order-2 flex-1 sm:flex-none sm:w-[180px] sm:order-1">
                                <Select value={sortOrder} onValueChange={setSortOrder}>
                                    <SelectTrigger className="h-10 bg-white border-gray-200 w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="alphabetical">🔤 Nome (A-Z)</SelectItem>
                                        <SelectItem value="flight_time">✈️ Horário Voo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="relative w-full order-1 sm:flex-1 sm:order-2">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    type="search"
                                    placeholder="Buscar..."
                                    className="pl-9 bg-gray-50 border-gray-200 text-sm w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 order-3 sm:order-3">
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={() => loadData(true)} 
                                    title="Forçar Atualização"
                                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </Button>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {/* Resumo Geral */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-white border-blue-100 shadow-sm">
                        <CardContent className="p-3 text-center">
                            <p className="text-xs text-gray-500 font-medium uppercase">Total</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-yellow-100 shadow-sm">
                        <CardContent className="p-3 text-center">
                            <p className="text-xs text-gray-500 font-medium uppercase">Pendentes</p>
                            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-green-100 shadow-sm">
                        <CardContent className="p-3 text-center">
                            <p className="text-xs text-gray-500 font-medium uppercase">Embarcados</p>
                            <p className="text-2xl font-bold text-green-600">{stats.boarded}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-red-100 shadow-sm">
                        <CardContent className="p-3 text-center">
                            <p className="text-xs text-gray-500 font-medium uppercase">No Show</p>
                            <p className="text-2xl font-bold text-red-600">{stats.noshow}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Seção de Passageiros Flexíveis Pendentes (Porta a Porta) */}
                {filteredFlexPassengers.length > 0 && (
                    <Card className="overflow-hidden border-2 border-purple-300 shadow-lg">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="font-bold text-base flex items-center gap-2">
                                    <Car className="w-5 h-5" /> Passageiros Aguardando Embarque (Porta a Porta)
                                </h3>
                                <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                                    {filteredFlexPassengers.length} pax
                                </Badge>
                            </div>
                            <p className="text-xs text-purple-100">
                                {selectedVehicleId 
                                    ? `Check-in será realizado no: ${flexibleVehicles.find(v => v.id === selectedVehicleId)?.name || 'Veículo'}` 
                                    : '⚠️ Selecione o veículo acima antes de realizar check-in'}
                            </p>
                        </div>
                        <CardContent className="p-0">
                            {groupedFlexPassengers.map((group, idx) => {
                                const { passenger, companions } = group;
                                const hasCompanions = companions.length > 0;
                                
                                return (
                                <div key={passenger.id} className={`${idx !== groupedFlexPassengers.length - 1 ? 'border-b' : ''}`}>
                                    {/* Passageiro Principal */}
                                    <div className="p-4 bg-white hover:bg-purple-50/30 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-sm text-gray-900 flex items-center gap-1">
                                                            {hasCompanions && <Users className="w-4 h-4 text-purple-600" title="Grupo Familiar" />}
                                                            {passenger.passenger_name}
                                                        </p>
                                                        {passenger.comments && passenger.comments.length > 0 && (
                                                            <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1" title="Ver comentários">
                                                                <MessageSquare className="w-2.5 h-2.5" />
                                                                {passenger.comments.length}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 -ml-1">
                                                            <MoreVertical className="w-4 h-4 text-gray-500" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-56">
                                                        <DropdownMenuLabel className="text-xs text-gray-500 uppercase">
                                                            {passenger.passenger_name}
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {passenger.passenger_phone && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => window.open(`tel:${passenger.passenger_phone}`, '_system')}>
                                                                    <Phone className="w-4 h-4 mr-2" /> Ligar
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => window.open(`https://wa.me/${passenger.passenger_phone.replace(/\D/g, '')}`, '_blank')}>
                                                                    <MessageCircle className="w-4 h-4 mr-2" /> Mensagem WhatsApp
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleSendSMS(passenger, passenger.event_trip_id)}>
                                                                    <MessageSquare className="w-4 h-4 mr-2" /> Enviar SMS
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        <DropdownMenuItem onClick={() => handleOpenComment(passenger, { id: passenger.event_trip_id })}>
                                                            <MessageSquare className="w-4 h-4 mr-2" /> Comentar
                                                        </DropdownMenuItem>
                                                        {passenger.flight_number && (
                                                            <DropdownMenuItem onClick={() => handleOpenFlightStatus(passenger)}>
                                                                <Plane className="w-4 h-4 mr-2" /> Rastrear Voo
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={() => handleOpenProfile(passenger, { id: passenger.event_trip_id })}>
                                                            <User className="w-4 h-4 mr-2" /> Perfil Participante
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleOpenUber({ destination: passenger.destination_address })}>
                                                            <Car className="w-4 h-4 mr-2" /> Uber
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleOpenTransferDialog(passenger, { id: passenger.event_trip_id, destination: passenger.destination_address, origin: passenger.origin_address })}>
                                                            <ArrowRight className="w-4 h-4 mr-2" /> Transferir Passageiro
                                                        </DropdownMenuItem>
                                                        {(passenger.boarding_status === 'boarded' || passenger.boarding_status === 'no_show') && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuLabel className="text-xs text-gray-500 uppercase">
                                                                    Alterar Status
                                                                </DropdownMenuLabel>
                                                                {passenger.boarding_status !== 'pending' && (
                                                                    <DropdownMenuItem onClick={() => handleChangeStatus(passenger, passenger.event_trip_id, 'pending')}>
                                                                        <RotateCcw className="w-4 h-4 mr-2" /> Voltar para Aguardando
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {passenger.boarding_status !== 'boarded' && (
                                                                    <DropdownMenuItem onClick={() => handleChangeStatus(passenger, passenger.event_trip_id, 'boarded')}>
                                                                        <CheckCircle className="w-4 h-4 mr-2" /> Marcar como Embarcado
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {passenger.boarding_status !== 'no_show' && (
                                                                    <DropdownMenuItem onClick={() => handleChangeStatus(passenger, passenger.event_trip_id, 'no_show')}>
                                                                        <XCircle className="w-4 h-4 mr-2" /> Marcar como No Show
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem 
                                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                            onClick={() => handleRemovePassenger(passenger, passenger.event_trip_id)}
                                                        >
                                                            <XCircle className="w-4 h-4 mr-2" /> Remover Participante
                                                        </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                        </DropdownMenu>
                                                </div>
                                                {passenger.passenger_phone && (
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Phone className="w-3 h-3 text-gray-400" />
                                                        <span className="text-xs text-gray-500">
                                                            {passenger.passenger_phone}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                                                Porta a Porta
                                            </span>

                                            <div className="flex gap-2">
                                                <Button 
                                                    size="sm" 
                                                    className="h-8 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                                    onClick={() => handleUpdateBoardingStatus(passenger, passenger.event_trip_id, 'boarded', true)}
                                                    disabled={checkinLoading[passenger.id] || !selectedVehicleId}
                                                >
                                                    {checkinLoading[passenger.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" /> Check-in</>}
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    className="h-8 border-red-300 text-red-600 hover:bg-red-50 shadow-sm"
                                                    onClick={() => handleUpdateBoardingStatus(passenger, passenger.event_trip_id, 'no_show')}
                                                    disabled={checkinLoading[passenger.id]}
                                                >
                                                    {checkinLoading[passenger.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-1" /> No Show</>}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Acompanhantes */}
                                    {companions.map((comp, cIdx) => (
                                        <div key={comp.id} className="pl-8 pr-4 py-3 bg-gray-50/50 border-t border-gray-100 relative">
                                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-purple-200"></div>
                                            <div className="absolute left-4 top-1/2 w-3 h-0.5 bg-purple-200"></div>
                                            
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-sm text-gray-700">
                                                            {comp.passenger_name}
                                                            {comp.companion_relationship && <span className="text-xs text-gray-400 font-normal ml-2">({comp.companion_relationship})</span>}
                                                        </p>
                                                        {comp.comments && comp.comments.length > 0 && (
                                                            <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1" title="Ver comentários">
                                                                <MessageSquare className="w-2.5 h-2.5" />
                                                                {comp.comments.length}
                                                            </Badge>
                                                        )}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-5 w-5 -ml-1">
                                                                    <MoreVertical className="w-3 h-3 text-gray-400" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            {/* Menu simplificado para acompanhante, ou completo se necessário. Usando o mesmo por simplicidade */}
                                                            <DropdownMenuContent align="start" className="w-56">
                                                                <DropdownMenuItem onClick={() => handleUpdateBoardingStatus(comp, comp.event_trip_id, 'boarded', true)}>
                                                                    Check-in Individual
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleUpdateBoardingStatus(comp, comp.event_trip_id, 'no_show')}>
                                                                    No-Show Individual
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-end">
                                                <div className="flex gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        className="h-7 text-xs bg-green-600/90 hover:bg-green-700 text-white shadow-sm"
                                                        onClick={() => handleUpdateBoardingStatus(comp, comp.event_trip_id, 'boarded', true)}
                                                        disabled={checkinLoading[comp.id] || !selectedVehicleId}
                                                    >
                                                        {checkinLoading[comp.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3 mr-1" /> Check-in</>}
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50 shadow-sm"
                                                        onClick={() => handleUpdateBoardingStatus(comp, comp.event_trip_id, 'no_show')}
                                                        disabled={checkinLoading[comp.id]}
                                                    >
                                                        {checkinLoading[comp.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <><XCircle className="w-3 h-3 mr-1" /> No Show</>}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                        </CardContent>
                        </Card>
                        )}

                        {/* Seção de Passageiros Flexíveis Já Embarcados */}
                        {filteredBoardedFlexPassengers.length > 0 && (
                            <Card className="overflow-hidden border-2 border-green-300 shadow-lg">
                                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white">
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="font-bold text-base flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5" /> Passageiros Embarcados (Porta a Porta)
                                        </h3>
                                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                                            {filteredBoardedFlexPassengers.length} pax
                                        </Badge>
                                    </div>
                                </div>
                                <CardContent className="p-0">
                                    {filteredBoardedFlexPassengers.map((passenger, idx) => (
                                        <div 
                                            key={passenger.id} 
                                            className={`p-4 ${idx !== filteredBoardedFlexPassengers.length - 1 ? 'border-b' : ''} ${
                                                passenger.boarding_status === 'boarded' ? 'bg-green-50/30' : 'bg-red-50/30'
                                            } hover:bg-opacity-50 transition-colors`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`font-medium text-sm ${
                                                            passenger.boarding_status === 'boarded' ? 'text-green-800' : 'text-red-800'
                                                        }`}>
                                                            {passenger.passenger_name}
                                                        </p>
                                                        {passenger.comments && passenger.comments.length > 0 && (
                                                            <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1" title="Ver comentários">
                                                                <MessageSquare className="w-2.5 h-2.5" />
                                                                {passenger.comments.length}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {passenger.passenger_phone && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Phone className="w-3 h-3 text-gray-400" />
                                                            <span className="text-xs text-gray-500">
                                                                {passenger.passenger_phone}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {passenger.boarding_status === 'boarded' ? (
                                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Botão Iniciar Viagem para Veículos Flexíveis */}
                        {flexibleVehicles.length > 0 && selectedVehicleId && (() => {
                        const selectedVehicle = flexibleVehicles.find(v => v.id === selectedVehicleId);
                        const allPaxProcessed = !selectedVehicle.passengers || selectedVehicle.passengers.length === 0 || selectedVehicle.passengers.every(p => p.boarding_status === 'boarded' || p.boarding_status === 'no_show');
                        
                        return selectedVehicle && selectedVehicle.coordinator_can_start_trip && selectedVehicle.driver_trip_status === 'aguardando' && (
                        <Card className="overflow-hidden border-green-200 shadow-md bg-green-50">
                        <CardContent className="p-4">
                            <Button 
                                className="w-full bg-green-600 hover:bg-green-700 text-white h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => handleStartTrip(selectedVehicle)}
                                disabled={startingTrip[selectedVehicle.id] || !allPaxProcessed}
                                title={!allPaxProcessed ? "Processe todos os passageiros (Chegou/No Show) para iniciar a viagem" : "Iniciar Viagem"}
                            >
                                {startingTrip[selectedVehicle.id] ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <PlayCircle className="w-4 h-4 mr-2" />
                                )}
                                Iniciar Viagem - {selectedVehicle.name}
                            </Button>
                        </CardContent>
                        </Card>
                        );
                        })()}

                        {/* Visão dos Veículos Flexíveis com Ocupação */}
                        {flexibleVehicles.length > 0 && (
                    <Card className="overflow-hidden border-purple-200 shadow-md">
                        <div className="bg-purple-100 p-3 border-b border-purple-200">
                            <h3 className="font-bold text-sm text-purple-900 flex items-center gap-2">
                                <Car className="w-4 h-4" /> Veículos Disponíveis (Porta a Porta)
                            </h3>
                        </div>
                        <CardContent className="p-3 space-y-2">
                            {flexibleVehicles.map(vehicle => {
                                const occupancyRate = vehicle.vehicle_capacity 
                                    ? ((vehicle.current_passenger_count || 0) / vehicle.vehicle_capacity) * 100
                                    : 0;
                                const spotsLeft = vehicle.vehicle_capacity - (vehicle.current_passenger_count || 0);

                                return (
                                    <div key={vehicle.id} className="bg-white border border-purple-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-sm text-gray-900">{vehicle.name}</span>
                                            <Badge className={
                                                spotsLeft === 0 ? "bg-red-100 text-red-800" :
                                                spotsLeft <= 3 ? "bg-yellow-100 text-yellow-800" :
                                                "bg-green-100 text-green-800"
                                            }>
                                                {spotsLeft} vagas
                                            </Badge>
                                        </div>

                                        <div className="space-y-1.5 mb-2">
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <Users className="w-3 h-3" />
                                                <span>{vehicle.current_passenger_count || 0} / {vehicle.vehicle_capacity || '∞'} ocupados</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <MapPin className="w-3 h-3" />
                                                <span className="truncate">{vehicle.origin} → {vehicle.destination}</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <Calendar className="w-3 h-3" />
                                                <span>{vehicle.date && format(new Date(vehicle.date + 'T12:00:00'), 'dd/MM/yyyy')} • {vehicle.start_time || '--:--'}</span>
                                            </div>
                                        </div>

                                        {vehicle.driver_info ? (
                                            <div className="mt-2 pt-2 border-t border-purple-100 space-y-1">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <User className="w-3 h-3 text-purple-600" />
                                                        <span className="font-medium text-purple-900">{vehicle.driver_info.name}</span>
                                                        {vehicle.driver_info.phone && (
                                                            <div className="ml-auto flex items-center gap-3">
                                                                <a 
                                                                    href={`tel:${vehicle.driver_info.phone}`} 
                                                                    className="flex items-center gap-1 text-purple-600 hover:text-purple-800 transition-colors"
                                                                    title="Ligar"
                                                                >
                                                                    <Phone className="w-3.5 h-3.5" />
                                                                </a>
                                                                <a 
                                                                    href={`https://wa.me/${vehicle.driver_info.phone.replace(/\D/g, '')}`} 
                                                                    target="_blank" 
                                                                    rel="noreferrer"
                                                                    className="flex items-center gap-1 text-green-600 hover:text-green-800 transition-colors"
                                                                    title="WhatsApp"
                                                                >
                                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                                </a>
                                                                <span className="text-purple-600 text-xs">{vehicle.driver_info.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {vehicle.driver_info.vehicle_model && vehicle.driver_info.vehicle_plate && (
                                                        <div className="flex items-center gap-2 text-xs text-gray-600 pl-5">
                                                            <Car className="w-3 h-3" />
                                                            <span className="font-bold bg-purple-50 px-1.5 rounded border border-purple-100">{vehicle.driver_info.vehicle_model} • {vehicle.driver_info.vehicle_plate}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-2 pt-2 border-t border-purple-100">
                                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Motorista não atribuído
                                                </span>
                                            </div>
                                        )}

                                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                            <div 
                                                className={`h-2 rounded-full transition-all ${
                                                    occupancyRate >= 100 ? 'bg-red-500' :
                                                    occupancyRate >= 80 ? 'bg-yellow-500' :
                                                    'bg-green-500'
                                                }`}
                                                style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}

                {/* Abas de Navegação */}
                <Tabs defaultValue="programado" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4 h-12 bg-white border border-gray-200 shadow-sm">
                        <TabsTrigger 
                            value="programado" 
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white h-full rounded-md text-gray-600"
                        >
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-xs">PROGRAMADO</span>
                                <span className="text-[10px] opacity-80">{scheduledTrips.length} viagens</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="transito" 
                            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white h-full rounded-md text-gray-600"
                        >
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-xs">TRÂNSITO</span>
                                <span className="text-[10px] opacity-80">{transitTrips.length} viagens</span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="finalizado" 
                            className="data-[state=active]:bg-gray-700 data-[state=active]:text-white h-full rounded-md text-gray-600"
                        >
                            <div className="flex flex-col items-center">
                                <span className="font-bold text-xs">FINALIZADO</span>
                                <span className="text-[10px] opacity-80">{finishedTrips.length} viagens</span>
                            </div>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="programado" className="space-y-4">
                        {scheduledTrips.length === 0 && filteredFlexPassengers.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                                Nenhuma viagem programada.
                            </div>
                        ) : (
                            <>
                                {scheduledTrips.map(renderTripCard)}
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="transito" className="space-y-4">
                        {transitTrips.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                                Nenhuma viagem em trânsito.
                            </div>
                        ) : (
                            transitTrips.map(renderTripCard)
                        )}
                    </TabsContent>

                    <TabsContent value="finalizado" className="space-y-4">
                        {finishedTrips.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                                Nenhuma viagem finalizada.
                            </div>
                        ) : (
                            finishedTrips.map(renderTripCard)
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Floating Scan Button */}
            <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-auto">
                <Card 
                    className="bg-slate-900 text-white border-0 shadow-xl cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => setScannerOpen(true)}
                >
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-full">
                            <QrCode className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-sm">
                            <p className="font-bold">Modo de Leitura</p>
                            <p className="text-slate-400 text-xs">Use a câmera do celular para ler os cartões.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialogs */}
            <PassengerProfileDialog 
                isOpen={profileDialogOpen}
                onClose={() => {
                    setProfileDialogOpen(false);
                    setSelectedPassenger(null);
                    setSelectedTrip(null);
                }}
                passenger={selectedPassenger}
                trip={selectedTrip}
            />

            {/* Flexible Vehicle Selection Dialog */}
            <FlexibleVehicleSelectDialog
                isOpen={flexVehicleDialogOpen}
                onClose={() => {
                    setFlexVehicleDialogOpen(false);
                    setSelectedPassengerForFlex(null);
                }}
                passenger={selectedPassengerForFlex}
                flexibleVehicles={flexibleVehicles.filter(v => !v.vehicle_capacity || v.current_passenger_count < v.vehicle_capacity)}
                onSelectVehicle={handleSelectFlexibleVehicle}
            />

            <PassengerCommentDialog 
                isOpen={commentDialogOpen}
                onClose={() => {
                    setCommentDialogOpen(false);
                    setSelectedPassenger(null);
                    setSelectedTrip(null);
                }}
                passenger={selectedPassenger}
                tripId={selectedTrip?.id}
                token={token}
            />

            <FlightStatusModal
                isOpen={flightStatusOpen}
                onClose={() => {
                    setFlightStatusOpen(false);
                    setSelectedFlight({ number: null, airline: null });
                }}
                flightNumber={selectedFlight.number}
                airline={selectedFlight.airline}
                token={token}
            />

            <TransferPassengerDialog
                isOpen={transferDialogOpen}
                onClose={() => {
                    setTransferDialogOpen(false);
                    setSelectedPassenger(null);
                    setSelectedTrip(null);
                }}
                passenger={selectedPassenger}
                currentTrip={selectedTrip}
                availableTrips={selectedTrip ? getAvailableTripsForTransfer(selectedTrip.id) : []}
                onConfirm={handleTransferConfirm}
            />

            <QRCodeScanner
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScanSuccess={handleScanResult}
            />

            {/* Confirmation Dialog for Transfer Scan */}
            <Dialog open={!!scanTransferData} onOpenChange={(open) => !open && setScanTransferData(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="w-5 h-5" />
                            Passageiro em Outro Veículo
                        </DialogTitle>
                    </DialogHeader>
                    
                    {scanTransferData && (
                        <div className="py-4 space-y-4">
                            <p className="text-gray-700">
                                O passageiro <strong>{scanTransferData.passenger.passenger_name}</strong> pertence ao veículo <strong>{scanTransferData.fromTripName}</strong>.
                            </p>
                            <p className="text-gray-700">
                                Deseja transferi-lo para <strong>{scanTransferData.toTripName}</strong> e confirmar o embarque?
                            </p>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button 
                            variant="outline" 
                            onClick={() => setScanTransferData(null)}
                        >
                            Manter no Original
                        </Button>
                        <Button 
                            onClick={() => {
                                if (scanTransferData) {
                                    handleUpdateBoardingStatus(
                                        scanTransferData.passenger,
                                        scanTransferData.fromTripId,
                                        'boarded',
                                        true, // skip confirm
                                        scanTransferData.toTripId // new trip ID
                                    );
                                    setScanTransferData(null);
                                }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            Transferir e Embarcar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Start Trip Dialog with Photo */}
            <Dialog open={startTripModalOpen} onOpenChange={setStartTripModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PlayCircle className="w-5 h-5 text-green-600" />
                            Iniciar Viagem
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <p className="text-sm text-gray-600">
                            Você está prestes a iniciar a viagem para <strong>{selectedTripForStart?.destination}</strong>.
                        </p>
                        
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800">
                            <p className="flex items-start gap-2">
                                <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>Ao iniciar, o sistema calculará automaticamente o <strong>tempo estimado de chegada (ETA)</strong> para os passageiros.</span>
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Foto da Placa do Veículo (Opcional, mas Recomendado)</Label>
                            <div 
                                className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {platePhoto ? (
                                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                                        <img 
                                            src={URL.createObjectURL(platePhoto)} 
                                            alt="Preview" 
                                            className="w-full h-full object-contain"
                                        />
                                        <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            className="absolute bottom-2 right-2 bg-white/80 hover:bg-white"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                            }}
                                        >
                                            Trocar Foto
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Camera className="w-10 h-10 text-gray-400 mb-2" />
                                        <p className="text-sm font-medium text-gray-700">Tirar Foto da Placa</p>
                                        <p className="text-xs text-gray-500">Toque para abrir a câmera ou galeria</p>
                                    </>
                                )}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    capture="environment"
                                    onChange={handlePhotoSelect}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setStartTripModalOpen(false)}
                            disabled={uploadingPhoto}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleConfirmStartTrip}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={uploadingPhoto}
                        >
                            {uploadingPhoto ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                            ) : (
                                <><PlayCircle className="w-4 h-4 mr-2" /> Iniciar Viagem</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Passenger Dialog */}
            <Dialog open={addPassengerDialogOpen} onOpenChange={setAddPassengerDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-purple-600" />
                            Adicionar Novo Passageiro
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Trip Selection */}
                        {data && data.trips && data.trips.length > 0 && (
                            <div>
                                <Label htmlFor="selected_trip">Selecionar Viagem *</Label>
                                <Select
                                    value={newPassenger.selected_trip_id}
                                    onValueChange={(value) => setNewPassenger({...newPassenger, selected_trip_id: value})}
                                >
                                    <SelectTrigger className="w-full mt-1">
                                        <SelectValue placeholder="Selecione uma viagem" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {normalTrips.map(trip => {
                                            const spotsLeft = trip.vehicle_capacity - (trip.passenger_count || 0);
                                            return (
                                                <SelectItem key={trip.id} value={trip.id} >
                                                    🚐 {(trip.trip_code || trip.name).split('-')[0].trim()} ({trip.start_time}) - {spotsLeft} vagas
                                                </SelectItem>
                                            );
                                        })}
                                        {flexibleVehicles.map(trip => {
                                            const spotsLeft = trip.vehicle_capacity - (trip.current_passenger_count || 0);
                                            return (
                                                <SelectItem key={trip.id} value={trip.id} >
                                                    🚗 {(trip.trip_code || trip.name).split('-')[0].trim()} (Porta a Porta) - {spotsLeft} vagas
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="passenger_name">Nome Completo *</Label>
                            <Input
                                id="passenger_name"
                                value={newPassenger.passenger_name}
                                onChange={(e) => setNewPassenger({...newPassenger, passenger_name: e.target.value})}
                                placeholder="Nome do passageiro"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="passenger_phone">Telefone</Label>
                            <Input
                                id="passenger_phone"
                                value={newPassenger.passenger_phone}
                                onChange={(e) => setNewPassenger({...newPassenger, passenger_phone: e.target.value})}
                                placeholder="+55 11 99999-9999"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="passenger_email">E-mail</Label>
                            <Input
                                id="passenger_email"
                                type="email"
                                value={newPassenger.passenger_email}
                                onChange={(e) => setNewPassenger({...newPassenger, passenger_email: e.target.value})}
                                placeholder="email@exemplo.com"
                                className="mt-1"
                            />
                        </div>

                        <div className="pt-2 border-t">
                            <div className="flex items-center space-x-2 mb-4">
                                <input
                                    type="checkbox"
                                    id="is_companion"
                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    checked={newPassenger.is_companion}
                                    onChange={(e) => setNewPassenger({
                                        ...newPassenger, 
                                        is_companion: e.target.checked,
                                        main_passenger_id: e.target.checked ? newPassenger.main_passenger_id : ''
                                    })}
                                />
                                <Label htmlFor="is_companion">Este passageiro é um acompanhante?</Label>
                            </div>

                            {newPassenger.is_companion && (
                                <div className="space-y-4 pl-4 border-l-2 border-purple-100">
                                    <div>
                                        <Label>Passageiro Principal</Label>
                                        <select
                                            className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white mt-1"
                                            value={newPassenger.main_passenger_id}
                                            onChange={(e) => setNewPassenger({...newPassenger, main_passenger_id: e.target.value})}
                                        >
                                            <option value="">Selecione o principal...</option>
                                            {pendingFlexPassengers
                                                .filter(p => !p.is_companion)
                                                .map(p => (
                                                    <option key={p.id} value={p.id}>{p.passenger_name}</option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                    <div>
                                        <Label>Relacionamento (ex: Filho, Cônjuge)</Label>
                                        <Input 
                                            value={newPassenger.companion_relationship}
                                            onChange={(e) => setNewPassenger({...newPassenger, companion_relationship: e.target.value})}
                                            placeholder="Ex: Filho"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setAddPassengerDialogOpen(false);
                                setNewPassenger({
                                    passenger_name: '',
                                    passenger_phone: '',
                                    passenger_email: '',
                                    document_id: '',
                                    passenger_city_origin: '',
                                    origin_address: '',
                                    destination_address: '',
                                    flight_number: '',
                                    airline: '',
                                    is_companion: false,
                                    main_passenger_id: '',
                                    companion_relationship: '',
                                    selected_trip_id: ''
                                });
                            }}
                            disabled={addingPassenger}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={async () => {
                                if (!newPassenger.passenger_name || !newPassenger.selected_trip_id) {
                                    toast.error("Erro", {
                                        description: "Nome do passageiro e a viagem são obrigatórios.",
                                        duration: 2000
                                    });
                                    return;
                                }

                                setAddingPassenger(true);
                                try {
                                    const response = await base44.functions.invoke('managePassenger', {
                                        action: 'add',
                                        eventId: data.event.id,
                                        passengerData: {
                                            ...newPassenger,
                                            trip_type: 'door_to_door',
                                            is_flexible_allocation: false,
                                            date: new Date().toISOString().split('T')[0],
                                            time: '00:00',
                                            event_trip_id: newPassenger.selected_trip_id
                                        },
                                        token
                                    });

                                    if (response.data?.success) {
                                        toast.success("Passageiro Adicionado", {
                                            description: `${newPassenger.passenger_name} foi adicionado ao evento.`,
                                            duration: 2000
                                        });
                                        
                                        setAddPassengerDialogOpen(false);
                                        setNewPassenger({
                                            passenger_name: '',
                                            passenger_phone: '',
                                            passenger_email: '',
                                            document_id: '',
                                            passenger_city_origin: '',
                                            origin_address: '',
                                            destination_address: '',
                                            flight_number: '',
                                            airline: '',
                                            selected_trip_id: ''
                                        });
                                        // Força atualização imediata para refletir o novo total de passageiros
                                        setTimeout(() => loadData(true, true), 500);
                                    } else {
                                        throw new Error(response.data?.error || "Erro ao adicionar passageiro");
                                    }
                                } catch (error) {
                                    toast.error("Erro", {
                                        description: error.message || "Falha ao adicionar passageiro.",
                                        duration: 2000
                                    });
                                } finally {
                                    setAddingPassenger(false);
                                }
                            }}
                            disabled={addingPassenger}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {addingPassenger ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adicionando...</>
                            ) : (
                                <><UserPlus className="w-4 h-4 mr-2" /> Adicionar Passageiro</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
            );
            }