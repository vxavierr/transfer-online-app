import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, Link2, Search, ExternalLink, Users, Calendar, Clock, 
    Mail, MessageCircle, XCircle, CheckCircle, Copy, ChevronDown, 
    ChevronRight, MapPin, User, Plane, BarChart3
} from "lucide-react";
import { format, isPast } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function GerenciarLinksCompartilhados() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [expandedLinks, setExpandedLinks] = useState({});
    const [user, setUser] = React.useState(null);

    React.useEffect(() => {
        const loadUser = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
            } catch (err) {
                console.error('Failed to load user:', err);
            }
        };
        loadUser();
    }, []);

    const { data: sharedLists, isLoading } = useQuery({
        queryKey: ['allSharedLists', user?.supplier_id],
        queryFn: async () => {
            // Filter by supplier_id if user is a supplier
            const filterQuery = user?.supplier_id ? { supplier_id: user.supplier_id } : {};
            
            // 1. Fetch SharedReceptiveList (Legacy/Receptive)
            const receptiveLists = await base44.entities.SharedReceptiveList.filter(filterQuery, '-created_date', 100);
            
            // 2. Fetch SharedTripList (New/Dynamic Partner Links)
            const partnerLists = await base44.entities.SharedTripList.filter(filterQuery, '-created_date', 100);

            // Enrich Receptive Lists
            const enrichedReceptive = await Promise.all(
                receptiveLists.map(async (list) => {
                    let eventData = null;
                    let tripsData = [];
                    
                    if (list.event_id) {
                        try {
                            eventData = await base44.entities.Event.get(list.event_id);
                            
                            if (list.event_trip_ids && list.event_trip_ids.length > 0) {
                                const tripsPromises = list.event_trip_ids.map(id => 
                                    base44.entities.EventTrip.get(id).catch(() => null)
                                );
                                tripsData = (await Promise.all(tripsPromises)).filter(Boolean);
                                
                                // Enrich trips with passenger count
                                const enrichedTrips = await Promise.all(
                                    tripsData.map(async (trip) => {
                                        const passengers = await base44.entities.EventPassenger.filter({ event_trip_id: trip.id });
                                        return { ...trip, passengers };
                                    })
                                );
                                tripsData = enrichedTrips;
                            }
                        } catch (err) { console.warn(err); }
                    }
                    return { ...list, type: 'receptive', event: eventData, trips: tripsData };
                })
            );

            // Enrich Partner Lists
            const enrichedPartner = await Promise.all(
                partnerLists.map(async (list) => {
                    let eventData = null;
                    let tripsData = [];

                    // Dynamic Filters Logic
                    if (list.filters && list.filters.event_id && list.filters.subcontractor_id) {
                        try {
                            eventData = await base44.entities.Event.get(list.filters.event_id);
                            
                            // Fetch subcontractor to get partner name
                            let partnerName = null;
                            if (list.filters.subcontractor_id) {
                                const subcontractor = await base44.entities.Subcontractor.get(list.filters.subcontractor_id).catch(() => null);
                                if (subcontractor) {
                                    partnerName = subcontractor.name;
                                }
                            }

                            // Fetch dynamic trips
                            const dynamicTrips = await base44.entities.EventTrip.filter({
                                event_id: list.filters.event_id,
                                subcontractor_id: list.filters.subcontractor_id
                            });
                            
                            // Enrich with passengers (minimal for display)
                            tripsData = await Promise.all(dynamicTrips.map(async (trip) => {
                                const passengers = await base44.entities.EventPassenger.filter({ event_trip_id: trip.id });
                                return { ...trip, passengers };
                            }));
                        } catch (err) { console.warn(err); }
                    }

                    return { 
                        ...list, 
                        type: 'partner',
                        link_type: 'partner_dynamic', // Override for UI badge
                        event: eventData, 
                        trips: tripsData,
                        partner_name: partnerName
                    };
                })
            );
            
            // Merge and sort
            return [...enrichedReceptive, ...enrichedPartner].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        },
        enabled: !!user
    });

    const deactivateMutation = useMutation({
        mutationFn: async ({ id, type }) => {
            if (type === 'partner') {
                await base44.entities.SharedTripList.update(id, { active: false });
            } else {
                await base44.entities.SharedReceptiveList.update(id, { active: false });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['allSharedLists']);
            toast({
                title: "Link Desativado",
                description: "O link foi desativado com sucesso.",
                className: "bg-green-50 border-green-200"
            });
        }
    });

    const reactivateMutation = useMutation({
        mutationFn: async ({ id, type }) => {
            if (type === 'partner') {
                await base44.entities.SharedTripList.update(id, { active: true });
            } else {
                await base44.entities.SharedReceptiveList.update(id, { active: true });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['allSharedLists']);
            toast({
                title: "Link Reativado",
                description: "O link foi reativado com sucesso.",
                className: "bg-green-50 border-green-200"
            });
        }
    });

    const handleCopyLink = async (list) => {
        let pageName = 'ReceptiveListEventView';
        if (list.link_type === 'client_dashboard') pageName = 'EventClientDashboard';
        if (list.type === 'partner') pageName = 'PublicSharedTripListView';

        const url = `${window.location.origin}/${pageName}?token=${list.token}`;
        
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
                toast({
                    title: "Link Copiado!",
                    description: "O link foi copiado para a área de transferência.",
                    duration: 2000
                });
            } else {
                throw new Error("Clipboard API not available");
            }
        } catch (err) {
            console.warn('Clipboard API failed, trying fallback...', err);
            try {
                const textArea = document.createElement("textarea");
                textArea.value = url;
                
                // Ensure element is not visible but part of DOM
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (successful) {
                    toast({
                        title: "Link Copiado!",
                        description: "O link foi copiado para a área de transferência.",
                        duration: 2000
                    });
                } else {
                    throw new Error("Fallback copy failed");
                }
            } catch (fallbackErr) {
                console.error('Copy failed', fallbackErr);
                toast({
                    title: "Erro ao copiar",
                    description: "Não foi possível copiar automaticamente. O link é: " + url,
                    duration: 5000,
                    action: <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>Abrir</Button>
                });
            }
        }
    };

    const handleOpenLink = (list) => {
        let pageName = 'ReceptiveListEventView';
        if (list.link_type === 'client_dashboard') pageName = 'EventClientDashboard';
        if (list.type === 'partner') pageName = 'PublicSharedTripListView';

        const url = `${window.location.origin}/${pageName}?token=${list.token}`;
        window.open(url, '_blank');
    };

    const toggleExpanded = (listId) => {
        setExpandedLinks(prev => ({ ...prev, [listId]: !prev[listId] }));
    };

    const getStatusInfo = (list) => {
        const isExpired = isPast(new Date(list.expires_at));
        
        if (!list.active) {
            return { label: 'Desativado', color: 'bg-gray-100 text-gray-700', icon: XCircle };
        } else if (isExpired) {
            return { label: 'Expirado', color: 'bg-red-100 text-red-700', icon: XCircle };
        } else {
            return { label: 'Ativo', color: 'bg-green-100 text-green-700', icon: CheckCircle };
        }
    };

    const getShareTypeInfo = (type) => {
        const typeMap = {
            'email': { label: 'E-mail', icon: Mail, color: 'text-blue-600' },
            'whatsapp': { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600' },
            'both': { label: 'E-mail + WhatsApp', icon: Users, color: 'text-purple-600' }
        };
        return typeMap[type] || { label: type, icon: Link2, color: 'text-gray-600' };
    };

    const getLinkTypeInfo = (linkType) => {
        const typeMap = {
            'coordinator': { label: 'Coordenador', icon: Users, color: 'bg-blue-100 text-blue-700', description: 'Link operacional com check-in' },
            'client_dashboard': { label: 'Cliente', icon: BarChart3, color: 'bg-purple-100 text-purple-700', description: 'Dashboard executivo' },
            'partner_dynamic': { label: 'Parceiro (Dinâmico)', icon: Link2, color: 'bg-indigo-100 text-indigo-700', description: 'Lista de viagens do parceiro' }
        };
        return typeMap[linkType] || typeMap['coordinator'];
    };

    const filteredLists = sharedLists?.filter(list => {
        // Search filter
        const matchesSearch = !searchTerm || 
            list.coordinator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            list.coordinator_contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            list.event?.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            list.control_number?.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Status filter
        let matchesStatus = true;
        if (statusFilter === 'active') {
            matchesStatus = list.active && !isPast(new Date(list.expires_at));
        } else if (statusFilter === 'inactive') {
            matchesStatus = !list.active;
        } else if (statusFilter === 'expired') {
            matchesStatus = isPast(new Date(list.expires_at));
        }
        
        return matchesSearch && matchesStatus;
    }) || [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Links Compartilhados</h1>
                    <p className="text-gray-600">
                        Gerencie todos os links de receptivo compartilhados com coordenadores
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500">Total de Links</p>
                                    <h3 className="text-2xl font-bold">{sharedLists?.length || 0}</h3>
                                </div>
                                <Link2 className="w-8 h-8 text-blue-500 opacity-20" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500">Ativos</p>
                                    <h3 className="text-2xl font-bold text-green-600">
                                        {sharedLists?.filter(l => l.active && !isPast(new Date(l.expires_at))).length || 0}
                                    </h3>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500">Expirados</p>
                                    <h3 className="text-2xl font-bold text-orange-600">
                                        {sharedLists?.filter(l => isPast(new Date(l.expires_at))).length || 0}
                                    </h3>
                                </div>
                                <Clock className="w-8 h-8 text-orange-500 opacity-20" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500">Desativados</p>
                                    <h3 className="text-2xl font-bold text-gray-600">
                                        {sharedLists?.filter(l => !l.active).length || 0}
                                    </h3>
                                </div>
                                <XCircle className="w-8 h-8 text-gray-500 opacity-20" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar por coordenador, evento ou contato..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filtrar por status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Status</SelectItem>
                                    <SelectItem value="active">✓ Ativos</SelectItem>
                                    <SelectItem value="expired">⏰ Expirados</SelectItem>
                                    <SelectItem value="inactive">✕ Desativados</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Links List */}
                <div className="space-y-4">
                    {filteredLists.length === 0 ? (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Nenhum link encontrado
                                </h3>
                                <p className="text-gray-500">
                                    {searchTerm || statusFilter !== 'all' 
                                        ? 'Ajuste os filtros para visualizar outros links.'
                                        : 'Links compartilhados aparecerão aqui.'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredLists.map((list) => {
                            const statusInfo = getStatusInfo(list);
                            const shareTypeInfo = getShareTypeInfo(list.share_type);
                            const linkTypeInfo = getLinkTypeInfo(list.link_type);
                            const StatusIcon = statusInfo.icon;
                            const ShareIcon = shareTypeInfo.icon;
                            const LinkTypeIcon = linkTypeInfo.icon;
                            const isExpanded = expandedLinks[list.id];

                            return (
                                <Card key={list.id} className="overflow-hidden">
                                    <CardHeader className="bg-gray-50 border-b pb-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <CardTitle className="text-base truncate flex items-center gap-2">
                                                        {list.event?.event_name || 'Evento Desconhecido'}
                                                        {list.control_number && (
                                                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200 font-mono font-bold px-2 py-0.5 shadow-sm">
                                                                #{list.control_number}
                                                            </Badge>
                                                        )}
                                                    </CardTitle>
                                                    <Badge className={linkTypeInfo.color}>
                                                        <LinkTypeIcon className="w-3 h-3 mr-1" />
                                                        {linkTypeInfo.label}
                                                    </Badge>
                                                    <Badge className={statusInfo.color}>
                                                        <StatusIcon className="w-3 h-3 mr-1" />
                                                        {statusInfo.label}
                                                    </Badge>
                                                </div>
                                                <div className="space-y-1">
                                                    {list.partner_name && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Users className="w-4 h-4 text-indigo-500" />
                                                            <span className="font-medium">Parceiro:</span>
                                                            <span className="font-semibold text-indigo-900">{list.partner_name}</span>
                                                        </div>
                                                    )}
                                                    {(list.coordinator_name && list.coordinator_name !== list.partner_name) && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <User className="w-4 h-4 text-gray-400" />
                                                            <span className="font-medium">Coordenador:</span>
                                                            <span>{list.coordinator_name}</span>
                                                        </div>
                                                    )}
                                                    {(!list.partner_name && !list.coordinator_name) && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <User className="w-4 h-4 text-gray-400" />
                                                            <span className="font-medium">Responsável:</span>
                                                            <span className="text-gray-400 italic">Não informado</span>
                                                        </div>
                                                    )}
                                                    {list.coordinator_contact && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <ShareIcon className={`w-4 h-4 ${shareTypeInfo.color}`} />
                                                            <span>{list.coordinator_contact}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        <span>Compartilhado:</span>
                                                        <span>{format(new Date(list.shared_at || list.created_date), "dd/MM/yyyy 'às' HH:mm")}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                        <span>Expira:</span>
                                                        <span className={isPast(new Date(list.expires_at)) ? 'text-red-600 font-semibold' : ''}>
                                                            {format(new Date(list.expires_at), "dd/MM/yyyy 'às' HH:mm")}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-2">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => handleCopyLink(list)}
                                                    className="w-full"
                                                >
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copiar Link
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => handleOpenLink(list)}
                                                >
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    Abrir
                                                </Button>
                                                {list.active ? (
                                                    <Button 
                                                        size="sm" 
                                                        variant="destructive"
                                                        onClick={() => {
                                                            if (confirm('Deseja desativar este link?')) {
                                                                deactivateMutation.mutate({ id: list.id, type: list.type });
                                                            }
                                                        }}
                                                        disabled={deactivateMutation.isPending}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-2" />
                                                        Desativar
                                                    </Button>
                                                ) : (
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        className="border-green-300 text-green-600 hover:bg-green-50"
                                                        onClick={() => {
                                                            if (confirm('Deseja reativar este link?')) {
                                                                reactivateMutation.mutate({ id: list.id, type: list.type });
                                                            }
                                                        }}
                                                        disabled={reactivateMutation.isPending}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        Reativar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    
                                    {list.trips && list.trips.length > 0 && (
                                        <>
                                            <div 
                                                onClick={() => toggleExpanded(list.id)}
                                                className="p-4 bg-white hover:bg-gray-50 cursor-pointer border-b transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4" />
                                                        )}
                                                        <Users className="w-4 h-4" />
                                                        <span>Viagens Incluídas ({list.trips.length})</span>
                                                    </div>
                                                    <Badge variant="outline">
                                                        {list.trips.reduce((acc, t) => acc + (t.passengers?.length || 0), 0)} passageiros
                                                    </Badge>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <CardContent className="p-4 bg-gray-50/50">
                                                    <div className="space-y-3">
                                                        {list.trips.map((trip) => (
                                                            <Card key={trip.id} className="border-l-4 border-l-blue-500">
                                                                <CardContent className="p-3">
                                                                    <div className="flex items-start justify-between gap-4 mb-2">
                                                                        <div className="flex-1 min-w-0">
                                                                            <h4 className="font-semibold text-sm text-gray-900 mb-1">
                                                                                {trip.name}
                                                                            </h4>
                                                                            <div className="space-y-1 text-xs text-gray-600">
                                                                                <div className="flex items-center gap-2">
                                                                                    <Calendar className="w-3 h-3 text-gray-400" />
                                                                                    {format(new Date(trip.date), "dd/MM/yyyy")} • {trip.start_time}
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <MapPin className="w-3 h-3 text-gray-400" />
                                                                                    {trip.origin} → {trip.destination}
                                                                                </div>
                                                                                {trip.driver_id && (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <User className="w-3 h-3 text-green-500" />
                                                                                        Motorista Atribuído
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col gap-1">
                                                                            <Badge className="bg-blue-100 text-blue-700">
                                                                                {trip.vehicle_type_category}
                                                                            </Badge>
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {trip.passengers?.length || 0} pax
                                                                            </Badge>
                                                                            {trip.driver_trip_status && trip.driver_trip_status !== 'aguardando' && (
                                                                                <Badge className="bg-green-100 text-green-700 text-xs">
                                                                                    {trip.driver_trip_status}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {trip.passengers && trip.passengers.length > 0 && (
                                                                        <div className="mt-2 pt-2 border-t">
                                                                            <p className="text-xs font-semibold text-gray-500 mb-1">Passageiros:</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {trip.passengers.map((p, idx) => (
                                                                                    <div 
                                                                                        key={idx} 
                                                                                        className={`text-xs px-2 py-1 rounded ${
                                                                                            p.boarding_status === 'boarded' 
                                                                                                ? 'bg-green-100 text-green-800' 
                                                                                                : p.boarding_status === 'no_show'
                                                                                                ? 'bg-red-100 text-red-800'
                                                                                                : 'bg-gray-100 text-gray-700'
                                                                                        }`}
                                                                                    >
                                                                                        {p.passenger_name}
                                                                                        {p.boarding_status === 'boarded' && ' ✓'}
                                                                                        {p.boarding_status === 'no_show' && ' ✕'}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            )}
                                        </>
                                    )}
                                    
                                    {(!list.trips || list.trips.length === 0) && (
                                        <CardContent className="p-4 text-center text-sm text-gray-500">
                                            Nenhuma viagem associada a este link.
                                        </CardContent>
                                    )}
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}