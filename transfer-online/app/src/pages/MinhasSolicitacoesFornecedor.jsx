import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/ui/StatusBadge';
import TripDetailsDisplay from '@/components/TripDetailsDisplay';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  AlertCircle,
  Eye,
  Car,
  Upload,
  Send,
  Mail,
  MessageSquare,
  Save,
  UserPlus,
  Navigation,
  DollarSign,
  AlertTriangle,
  Flame,
  Bell,
  Star,
  Plus,
  Image as ImageIcon,
  Share2,
  Pencil,
  Package,
  TrendingUp,
  Filter,
  User,
  Printer,
  Search
} from 'lucide-react';
import PageHeader from '@/components/dashboard/PageHeader';
import MetaTags from '@/components/seo/MetaTags';
import { format, startOfDay, endOfDay, addDays, startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatCard from '@/components/dashboard/StatCard';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import { Pagination } from '@/components/ui/Pagination';
import RequestTable from '@/components/supplier/RequestTable';
import RequestFilters from '@/components/supplier/RequestFilters';

// Lazy Load
const ServiceOrderPDFDialog = React.lazy(() => import('../components/ServiceOrderPDFDialog'));
const ShareTripsDialog = React.lazy(() => import('../components/ShareTripsDialog'));
const SupplierBookingDialog = React.lazy(() => import('@/components/supplier/SupplierBookingDialog'));
const ExpensesDialog = React.lazy(() => import('@/components/supplier/ExpensesDialog'));
const UpdateTripStatusDialog = React.lazy(() => import('@/components/supplier/UpdateTripStatusDialog'));

const SectionLoader = () => (
  <div className="flex justify-center p-8">
    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
  </div>
);

export default function MinhasSolicitacoesFornecedor() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [supplier, setSupplier] = useState(null);
  
  // Estados de Controle de UI
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [showDriverInfoDialog, setShowDriverInfoDialog] = useState(false);
  const [responseType, setResponseType] = useState('accept');
  const [refusalReason, setRefusalReason] = useState('');
  const [priceToConfirm, setPriceToConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Estados para atribuição de motorista no aceite
  const [assignDriverNow, setAssignDriverNow] = useState(false);
  const [acceptDriverId, setAcceptDriverId] = useState('');
  const [acceptVehicleId, setAcceptVehicleId] = useState('');
  const [acceptDriverName, setAcceptDriverName] = useState('');
  const [acceptDriverPhone, setAcceptDriverPhone] = useState('');
  const [acceptVehicleModel, setAcceptVehicleModel] = useState('');
  const [acceptVehiclePlate, setAcceptVehiclePlate] = useState('');
  const [acceptDriverPayout, setAcceptDriverPayout] = useState('');
  
  const [showPDFDialog, setShowPDFDialog] = useState(false);
  const [requestToExport, setRequestToExport] = useState(null);

  // Filtros da Tabela
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
  const [selectedTrips, setSelectedTrips] = useState([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [clientFilter, setClientFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [costCenterFilter, setCostCenterFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [tripTypeFilter, setTripTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('all'); // today, week, month, all

  // Auto-open new booking dialog if query param present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new' && supplier) {
        setShowSupplierBookingDialog(true);
        window.history.replaceState({}, '', window.location.pathname);
    }
  }, [supplier]);

  // Estados para ordenação
  const [sortColumn, setSortColumn] = useState('date_time');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados de Motorista (Dialog)
  const [selectedDriverId, setSelectedDriverId] = useState('new');
  const [selectedDriverVehicleId, setSelectedDriverVehicleId] = useState('new');
  const [driverVehicles, setDriverVehicles] = useState([]);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverPhotoUrl, setDriverPhotoUrl] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [driverPayoutAmount, setDriverPayoutAmount] = useState('');
  const [driverNotes, setDriverNotes] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingDriverInfo, setIsSavingDriverInfo] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [receptivePerformedBy, setReceptivePerformedBy] = useState('');
  const [receptiveSignUrl, setReceptiveSignUrl] = useState('');
  const [receptiveNotes, setReceptiveNotes] = useState('');
  const [isReceptiveNeeded, setIsReceptiveNeeded] = useState(false);
  const [isUploadingSign, setIsUploadingSign] = useState(false);
  const [shouldNotifyDriver, setShouldNotifyDriver] = useState(false);
  const [generatedDriverLink, setGeneratedDriverLink] = useState('');
  const [generatedTimelineLink, setGeneratedTimelineLink] = useState('');
  const [isGeneratingTimelineLink, setIsGeneratingTimelineLink] = useState(false);

  const handleOpenStatusChangeDialog = (request) => {
    setStatusChangeRequest(request);
    setShowStatusChangeDialog(true);
  };
  
  // Estados para edição rápida (Dialog Detalhes)
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editingPriceValue, setEditingPriceValue] = useState('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [isEditingTripDetails, setIsEditingTripDetails] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState('');
  const [editingDestination, setEditingDestination] = useState('');
  const [editingDate, setEditingDate] = useState('');
  const [editingTime, setEditingTime] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [editingPlannedStops, setEditingPlannedStops] = useState([]);
  const [isSavingTripDetails, setIsSavingTripDetails] = useState(false);

  // State para Nova Viagem / Editar Viagem Própria
  const [showSupplierBookingDialog, setShowSupplierBookingDialog] = useState(false);
  const [supplierBookingToEdit, setSupplierBookingToEdit] = useState(null);

  // States para Despesas Manuais
  const [showExpensesDialog, setShowExpensesDialog] = useState(false);
  const [pendingManualStatus, setPendingManualStatus] = useState('');
  const [isUpdatingManualStatus, setIsUpdatingManualStatus] = useState(false);

  // States para Subcontratação
  const [showSubcontractDialog, setShowSubcontractDialog] = useState(false);
  const [showApproveSubcontractDialog, setShowApproveSubcontractDialog] = useState(false);
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState('');
  const [subcontractMargin, setSubcontractMargin] = useState('');
  const [taxPercentage, setTaxPercentage] = useState(18);
  const [profitPercentage, setProfitPercentage] = useState(25);
  const [isSubmittingSubcontract, setIsSubmittingSubcontract] = useState(false);
  const [documentAlerts, setDocumentAlerts] = useState([]);

  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);
  const [statusChangeRequest, setStatusChangeRequest] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkDocs = async () => {
      if (supplier) {
        try {
          const res = await base44.functions.invoke('checkSupplierDocumentAlerts');
          if (res.data && res.data.alerts) {
            setDocumentAlerts(res.data.alerts);
          }
        } catch (e) {
          console.error("Erro ao verificar documentos:", e);
        }
      }
    };
    checkDocs();
  }, [supplier]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        const isAdmin = currentUser.role === 'admin';
        const isDriver = currentUser?.is_driver === true && currentUser?.driver_id;
        const isSupplier = !isAdmin && !isDriver && currentUser?.supplier_id;

        if (!isSupplier) {
          alert('Acesso restrito a fornecedores.');
          window.location.href = '/';
          return;
        }

        setUser(currentUser);
        setIsAdminUser(isAdmin);

        const suppliers = await base44.entities.Supplier.list();
        const supplierData = suppliers.find(p => p.id === currentUser.supplier_id);

        if (!supplierData) {
          alert('Dados do fornecedor não encontrados.');
          window.location.href = '/';
          return;
        }

        setSupplier(supplierData);
        setIsCheckingAuth(false);

        const urlParams = new URLSearchParams(window.location.search);
        const requestId = urlParams.get('requestId');
        const ownBookingId = urlParams.get('ownBookingId');
        const bookingId = urlParams.get('bookingId');

        if (requestId) {
          const requests = await base44.entities.ServiceRequest.filter({ id: requestId });
          if (requests.length > 0) handleOpenDriverInfoDialog({ ...requests[0], type: 'platform' });
        } else if (ownBookingId) {
          const bookings = await base44.entities.SupplierOwnBooking.filter({ id: ownBookingId });
          if (bookings.length > 0) handleOpenDriverInfoDialog({ ...bookings[0], type: 'own', request_number: bookings[0].booking_number, chosen_supplier_id: currentUser.supplier_id });
        } else if (bookingId) {
          const bookings = await base44.entities.Booking.filter({ id: bookingId });
          if (bookings.length > 0) handleOpenDriverInfoDialog({ ...bookings[0], type: 'direct_booking', request_number: bookings[0].booking_number, is_own: false });
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  // Queries
  const { data: serviceRequests = [] } = useQuery({
    queryKey: ['supplierServiceRequests', user?.supplier_id],
    queryFn: () => base44.entities.ServiceRequest.filter({ chosen_supplier_id: user.supplier_id }),
    enabled: !!user?.supplier_id,
    refetchInterval: 15000,
    initialData: []
  });

  const { data: ownBookings = [] } = useQuery({
    queryKey: ['supplierOwnBookings', user?.supplier_id],
    queryFn: () => base44.entities.SupplierOwnBooking.filter({ supplier_id: user.supplier_id }),
    enabled: !!user?.supplier_id && !!supplier?.module3_enabled,
    refetchInterval: 15000,
    initialData: []
  });

  const { data: directBookings = [] } = useQuery({
    queryKey: ['supplierDirectBookings', user?.supplier_id],
    queryFn: () => base44.entities.Booking.filter({ supplier_id: user.supplier_id }),
    enabled: !!user?.supplier_id,
    refetchInterval: 15000,
    initialData: []
  });

  const { data: ownClients = [] } = useQuery({
    queryKey: ['supplierOwnClients', user?.supplier_id],
    queryFn: () => base44.entities.SupplierOwnClient.filter({ supplier_id: user.supplier_id }),
    enabled: !!user?.supplier_id && !!supplier?.module3_enabled,
    initialData: []
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['supplierDrivers', user?.supplier_id],
    queryFn: () => base44.entities.Driver.filter({ supplier_id: user.supplier_id, active: true }),
    enabled: !!user?.supplier_id,
    initialData: []
  });

  // Removed allDriverVehicles query to prevent 429 errors (unused)

  const { data: supplierVehicleTypes = [] } = useQuery({
    queryKey: ['supplierVehicleTypes', user?.supplier_id],
    queryFn: () => base44.entities.SupplierVehicleType.filter({ supplier_id: user.supplier_id, active: true }),
    enabled: !!user?.supplier_id,
    initialData: []
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.filter({ active: true }),
    initialData: []
  });

  const { data: subcontractors = [] } = useQuery({
    queryKey: ['subcontractors', user?.supplier_id],
    queryFn: () => base44.entities.Subcontractor.filter({ supplier_id: user.supplier_id, active: true }),
    enabled: !!user?.supplier_id && !!supplier?.features?.can_subcontract,
    initialData: []
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['supplierVehicles', user?.supplier_id],
    queryFn: () => base44.entities.SupplierVehicleType.filter({ supplier_id: user.supplier_id }),
    enabled: !!user?.supplier_id,
    initialData: []
  });

  const { data: supplierEvents = [] } = useQuery({
    queryKey: ['supplierEvents', user?.supplier_id],
    queryFn: () => base44.entities.Event.filter({ supplier_id: user.supplier_id }),
    enabled: !!user?.supplier_id,
    initialData: []
  });

  const { data: eventTrips = [] } = useQuery({
    queryKey: ['supplierEventTrips', supplierEvents],
    queryFn: async () => {
      if (supplierEvents.length === 0) return [];
      // Filter only active/pending events to reduce API calls
      const activeEvents = supplierEvents.filter(e => e.status === 'active' || e.status === 'pending');
      if (activeEvents.length === 0) return [];
      
      const eventIds = activeEvents.map(e => e.id);
      const tripsArrays = await Promise.all(eventIds.map(id => base44.entities.EventTrip.filter({ event_id: id })));
      return tripsArrays.flat();
    },
    enabled: supplierEvents.length > 0,
    initialData: []
  });

  const uniqueCostCenters = useMemo(() => {
    const centers = new Map();
    serviceRequests.forEach(request => {
      if (request.cost_allocation && Array.isArray(request.cost_allocation)) {
        request.cost_allocation.forEach(allocation => {
          if (allocation.cost_center_code && allocation.cost_center_name) {
            centers.set(allocation.cost_center_code, allocation.cost_center_name);
          }
        });
      }
    });
    return Array.from(centers.entries()).map(([code, name]) => ({ code, name }));
  }, [serviceRequests]);

  const uniqueDrivers = useMemo(() => {
    const driverSet = new Set();
    serviceRequests.forEach(request => {
      if (request.driver_name) driverSet.add(request.driver_name);
    });
    return Array.from(driverSet).sort();
  }, [serviceRequests]);

  const parseLocalDate = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDriverStatusLabel = (driverTripStatus) => {
    const labels = {
      aguardando: 'Aguardando',
      a_caminho: 'A Caminho',
      chegou_origem: 'Na Origem',
      passageiro_embarcou: 'Em Viagem',
      parada_adicional: 'Parada',
      chegou_destino: 'No Destino',
      aguardando_confirmacao_despesas: 'Aguardando Conf.',
      finalizada: 'Finalizada',
      no_show: 'Não Compareceu',
      cancelada_motorista: 'Cancelada (Mot.)',
    };
    return labels[driverTripStatus] || driverTripStatus;
  };

  // Unificar viagens
  const allTrips = useMemo(() => {
    // Filtrar SRs que são conversões de Booking (pois queremos mostrar o Booking original para viagens particulares)
    // Mas mantemos SRs que são legitimamente corporativas ou não têm booking vinculado
    const validServiceRequests = serviceRequests.filter(r => !r.converted_booking_id);

    const platformTrips = validServiceRequests.map(r => ({
      ...r,
      type: 'platform',
      unified_status: r.supplier_response_status,
      display_id: r.request_number,
      client_name_display: clients.find(c => c.id === r.client_id)?.name || 'Cliente Plataforma',
      value_display: (!r.client_id && r.chosen_client_price) ? (r.final_client_price_with_additions || r.chosen_client_price) : r.chosen_supplier_cost,
      is_own: false
    }));

    const ownTripsFormatted = ownBookings.map(b => {
      let computedStatus = b.status;
      const isOperationalActive = ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'parada_adicional', 'a_caminho_destino', 'chegou_destino'].includes(b.driver_trip_status) || 
                                  ['passageiro_embarcou', 'finalizada'].includes(b.receptivity_trip_status) ||
                                  ['started', 'completed'].includes(b.departure_status);
      
      if (['pendente', 'confirmada'].includes(b.status) && isOperationalActive) {
          computedStatus = 'em_andamento';
      }
      
      if (b.status !== 'concluida' && (b.driver_trip_status === 'finalizada' && (!b.departure_status || b.departure_status === 'completed'))) {
          computedStatus = 'concluida';
      }

      return {
      ...b,
      type: 'own',
      request_number: b.booking_number,
      display_id: b.booking_number,
      supplier_response_status: b.status === 'pendente' ? 'aceito' : 'confirmado',
      unified_status: computedStatus,
      client_name_display: ownClients.find(c => c.id === b.client_id)?.name || 'Cliente Próprio',
      value_display: b.price,
      driver_trip_status: b.driver_trip_status || 'aguardando',
      chosen_vehicle_type_id: b.vehicle_type_id,
      is_own: true
    };
    });

    const directBookingsFormatted = directBookings
      .filter(b => !platformTrips.some(pt => pt.converted_booking_id === b.id))
      .map(b => {
      let computedStatus = b.status;
      const isOperationalActive = ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'desembarcou'].includes(b.driver_current_status);

      if (['pendente', 'confirmada'].includes(b.status) && isOperationalActive) {
        computedStatus = 'em_andamento';
      }
      if (b.status === 'concluida') {
        computedStatus = 'concluida';
      }

      return {
        ...b,
        type: 'direct_booking',
        request_number: b.booking_number, 
        display_id: b.booking_number,
        supplier_response_status: 'confirmado',
        unified_status: computedStatus, 
        client_name_display: b.customer_name || 'Particular',
        value_display: b.total_price,
        driver_trip_status: b.driver_current_status || 'aguardando',
        chosen_vehicle_type_id: b.vehicle_type_id,
        passenger_name: b.customer_name,
        is_own: false 
      };
    });

    const eventTripsFormatted = eventTrips.map(t => {
        const event = supplierEvents.find(e => e.id === t.event_id);
        const driver = drivers.find(d => d.id === t.driver_id);
        
        let computedStatus = t.status === 'planned' ? 'confirmada' : t.status; // Mapear 'planned' para confirmada no contexto operacional
        if (t.status === 'completed') computedStatus = 'concluida';
        if (t.status === 'cancelled') computedStatus = 'cancelada';
        
        const isOperationalActive = ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'a_caminho_destino', 'chegou_destino'].includes(t.driver_trip_status);
        if (isOperationalActive) computedStatus = 'em_andamento';

        return {
            ...t,
            id: t.id,
            type: 'event_trip',
            request_number: t.trip_code,
            display_id: t.trip_code,
            origin: t.origin,
            destination: t.destination,
            date: t.date,
            time: t.start_time,
            passengers: t.passenger_count,
            passenger_name: t.name || 'Grupo Evento',
            client_name_display: event?.event_name || 'Evento',
            value_display: t.final_supplier_cost || 0,
            status: computedStatus,
            supplier_response_status: 'confirmado', // Assumido para eventos
            unified_status: computedStatus,
            driver_trip_status: t.driver_trip_status || 'aguardando',
            driver_name: driver?.name || t.subcontractor_driver_name,
            driver_phone: driver?.phone_number || t.subcontractor_driver_phone,
            driver_photo_url: driver?.photo_url,
            vehicle_model: t.subcontractor_vehicle_model || t.vehicle_type_category,
            // Mapeamentos adicionais se necessário
            is_own: true
        };
    });

    return [...platformTrips, ...ownTripsFormatted, ...directBookingsFormatted, ...eventTripsFormatted];
  }, [serviceRequests, ownBookings, directBookings, eventTrips, clients, ownClients, supplierEvents, drivers]);

  // Filtragem
  const filteredServiceRequests = useMemo(() => {
    let filtered = [...allTrips];
    const now = new Date();

    // Filtro de Período (Novo)
    if (periodFilter !== 'all') {
      filtered = filtered.filter(request => {
        if (!request.date) return false;
        const requestDate = parseISO(request.date);
        
        switch (periodFilter) {
          case 'today':
            return isSameDay(requestDate, now);
          case 'week':
            const weekEnd = addDays(now, 7);
            return isWithinInterval(requestDate, { start: startOfDay(now), end: endOfDay(weekEnd) });
          case 'month':
            return isWithinInterval(requestDate, { start: startOfMonth(now), end: endOfMonth(now) });
          default:
            return true;
        }
      });
    }

    if (tripTypeFilter !== 'all') {
      if (tripTypeFilter === 'platform') {
        filtered = filtered.filter(t => t.type === 'platform');
      } else if (tripTypeFilter === 'direct_booking') {
        filtered = filtered.filter(t => t.type === 'direct_booking');
      } else {
        filtered = filtered.filter(t => t.type === tripTypeFilter);
      }
    }

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(request =>
        request.request_number?.toLowerCase().includes(lowerSearch) ||
        request.passenger_name?.toLowerCase().includes(lowerSearch) ||
        request.driver_name?.toLowerCase().includes(lowerSearch) ||
        request.origin?.toLowerCase().includes(lowerSearch) ||
        request.destination?.toLowerCase().includes(lowerSearch) ||
        request.vehicle_model?.toLowerCase().includes(lowerSearch) ||
        request.chosen_vehicle_type_name?.toLowerCase().includes(lowerSearch) ||
        request.client_name_display?.toLowerCase().includes(lowerSearch) ||
        getDriverStatusLabel(request.driver_trip_status)?.toLowerCase().includes(lowerSearch)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => {
        const driverStatuses = ['aguardando', 'a_caminho', 'chegou_origem', 'passageiro_embarcou', 'parada_adicional', 'chegou_destino', 'finalizada', 'no_show', 'cancelada_motorista'];
        if (driverStatuses.includes(statusFilter)) {
          return request.driver_trip_status === statusFilter;
        }
        if (request.type === 'own') {
          if (statusFilter === 'aguardando_resposta') return false;
          if (statusFilter === 'aceito') return request.status === 'pendente';
          if (statusFilter === 'confirmado') return request.status === 'confirmada' || request.status === 'em_andamento';
          return false; 
        }
        return request.supplier_response_status === statusFilter;
      });
    }

    if (vehicleTypeFilter !== 'all') {
      filtered = filtered.filter(request => request.chosen_vehicle_type_id === vehicleTypeFilter);
    }

    if (clientFilter !== 'all') {
      filtered = filtered.filter(request => request.client_id === clientFilter);
    }

    if (driverFilter !== 'all') {
      filtered = filtered.filter(request => request.driver_name === driverFilter);
    }

    if (costCenterFilter !== 'all') {
      filtered = filtered.filter(request => {
        if (!request.cost_allocation || !Array.isArray(request.cost_allocation)) return false;
        return request.cost_allocation.some(allocation => allocation.cost_center_code === costCenterFilter);
      });
    }

    if (dateFilter) {
      filtered = filtered.filter(request => request.date === dateFilter);
    }

    // Ordenação
    filtered.sort((a, b) => {
      let valA, valB;
      switch (sortColumn) {
        case 'request_number': valA = a.request_number || ''; valB = b.request_number || ''; break;
        case 'date_time': valA = `${a.date || '9999-12-31'} ${a.time || '23:59'}`; valB = `${b.date || '9999-12-31'} ${b.time || '23:59'}`; break;
        case 'origin': valA = a.origin || ''; valB = b.origin || ''; break;
        case 'passengers': valA = a.passengers || 0; valB = b.passengers || 0; break;
        case 'chosen_supplier_cost': valA = a.chosen_supplier_cost || 0; valB = b.chosen_supplier_cost || 0; break;
        case 'supplier_response_status': valA = a.supplier_response_status || ''; valB = b.supplier_response_status || ''; break;
        default: valA = `${a.date || '9999-12-31'} ${a.time || '23:59'}`; valB = `${b.date || '9999-12-31'} ${b.time || '23:59'}`; break;
      }
      if (typeof valA === 'string') {
        const comparison = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allTrips, searchTerm, statusFilter, vehicleTypeFilter, clientFilter, driverFilter, costCenterFilter, dateFilter, sortColumn, sortDirection, tripTypeFilter, periodFilter]);

  // Estatísticas do Dashboard (Similar ao Admin)
  const dashboardStats = useMemo(() => {
    const total = allTrips.length;
    
    const confirmed = allTrips.filter(t => 
      ['confirmada', 'aceito', 'confirmado', 'concluida'].includes(t.unified_status) && t.unified_status !== 'cancelada'
    ).length;

    const pending = allTrips.filter(t => 
      ['pendente', 'rascunho', 'aguardando_fornecedor', 'aguardando_revisao_fornecedor'].includes(t.unified_status)
    ).length;

    const cancelled = allTrips.filter(t => t.unified_status === 'cancelada').length;

    const awaitingResponse = allTrips.filter(t => 
        t.type === 'platform' && t.supplier_response_status === 'aguardando_resposta'
    ).length;

    const inProgress = allTrips.filter(t => 
        t.unified_status === 'em_andamento' || 
        ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'parada_adicional', 'a_caminho_destino', 'chegou_destino'].includes(t.driver_trip_status)
    ).length;

    return { total, confirmed, pending, cancelled, awaitingResponse, inProgress };
  }, [allTrips]);

  // Conflitos de Motorista
  const driverConflicts = useMemo(() => {
    const conflicts = [];
    
    // Filtrar apenas viagens futuras ou de hoje para conflitos
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const requestsWithDrivers = filteredServiceRequests.filter(r => {
        if (!r.driver_phone || !r.date) return false;
        const tripDate = parseLocalDate(r.date);
        tripDate.setHours(0, 0, 0, 0);
        return tripDate >= now;
    });

    requestsWithDrivers.forEach((request, index) => {
      const requestDateTime = new Date(`${request.date}T${request.time}`);
      const requestEndTime = new Date(requestDateTime.getTime() + (request.duration_minutes || 60) * 60000);

      for (let i = index + 1; i < requestsWithDrivers.length; i++) {
        const otherRequest = requestsWithDrivers[i];
        if (request.driver_phone === otherRequest.driver_phone) {
          const otherDateTime = new Date(`${otherRequest.date}T${otherRequest.time}`);
          const otherEndTime = new Date(otherDateTime.getTime() + (otherRequest.duration_minutes || 60) * 60000);

          if ((requestDateTime <= otherDateTime && requestEndTime > otherDateTime) || (otherDateTime <= requestDateTime && otherEndTime > requestDateTime)) {
            conflicts.push({
              driver: request.driver_name,
              request1: request.request_number,
              request2: otherRequest.request_number,
              date: format(parseISO(request.date), 'dd/MM/yyyy', { locale: ptBR }),
              time1: request.time,
              time2: otherRequest.time
            });
          }
        }
      }
    });
    return conflicts;
  }, [filteredServiceRequests]);

  // Agenda por Dia (Timeline)
  const requestsByDay = useMemo(() => {
    const grouped = {};
    filteredServiceRequests.forEach(request => {
      if (!request.date) return;
      const dateKey = format(parseISO(request.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(request);
    });
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
    });
    return grouped;
  }, [filteredServiceRequests]);

  // Paginação
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, vehicleTypeFilter, clientFilter, driverFilter, costCenterFilter, dateFilter, tripTypeFilter, periodFilter]);
  
  // Categorias de listas
  const pendingResponseRequests = filteredServiceRequests.filter(r => r.type === 'platform' && r.supplier_response_status === 'aguardando_resposta');
  const needDriverRequests = filteredServiceRequests.filter(r => {
    const isMissing = (!r.driver_name || !r.driver_phone || !r.vehicle_model || !r.vehicle_plate);
    if (r.type === 'own') return (r.status === 'pendente' || r.status === 'confirmada') && isMissing && r.status !== 'concluida' && r.status !== 'cancelada';
    return ['aceito', 'confirmado'].includes(r.supplier_response_status) && isMissing && r.status !== 'concluida' && r.status !== 'cancelada';
  });
  const todayRequestsList = filteredServiceRequests.filter(r => {
    if (!r.date) return false;
    const tripDate = parseLocalDate(r.date);
    tripDate.setHours(0, 0, 0, 0);
    return tripDate.getTime() === today.getTime() && r.status !== 'concluida' && r.status !== 'cancelada';
  });
  const inProgressRequestsList = filteredServiceRequests.filter(r => r.status === 'em_andamento' || ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'parada_adicional', 'a_caminho_destino', 'chegou_destino', 'aguardando_confirmacao_despesas'].includes(r.driver_trip_status));
  
  const criticalRequests = [...pendingResponseRequests, ...needDriverRequests, ...todayRequestsList.filter(r => r.driver_trip_status === 'aguardando' && r.driver_name)].filter((v,i,a)=>a.findIndex(t=>(t.id===v.id))===i);
  
  const otherRequests = filteredServiceRequests.filter(r => 
    !criticalRequests.some(cr => cr.id === r.id) && 
    !inProgressRequestsList.some(ir => ir.id === r.id) &&
    !todayRequestsList.some(tr => tr.id === r.id)
  );

  const totalPages = Math.ceil(filteredServiceRequests.length / itemsPerPage);
  const paginatedRequests = filteredServiceRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatPrice = (price) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price || 0);
  const getStatusColor = (status) => ({ aguardando_resposta: 'bg-yellow-100 text-yellow-800', aceito: 'bg-green-100 text-green-800', confirmado: 'bg-blue-100 text-blue-800', recusado: 'bg-red-100 text-red-800' }[status] || 'bg-gray-100 text-gray-800');
  const getTripStatusColor = (status) => ({ aguardando: 'bg-gray-100 text-gray-800', a_caminho: 'bg-blue-100 text-blue-800', passageiro_embarcou: 'bg-purple-100 text-purple-800', a_caminho_destino: 'bg-indigo-100 text-indigo-800', finalizada: 'bg-green-100 text-green-800' }[status] || 'bg-gray-100 text-gray-800');

  // Funções de Ação (Handlers) - Mantidas e Simplificadas
  const handleOpenResponseDialog = (request, type) => {
    setSelectedRequest(request);
    setResponseType(type);
    setRefusalReason('');
    setPriceToConfirm(request.chosen_supplier_cost || '');
    setAssignDriverNow(false);
    setError('');
    setShowResponseDialog(true);
  };

  const handleSubmitResponse = () => {
    let driverData = null;
    if (responseType === 'accept' && assignDriverNow) {
      if (!acceptDriverId || !acceptVehicleModel) { setError('Selecione motorista e veículo'); return; }
      const driver = drivers.find(d => d.id === acceptDriverId);
      driverData = { driver_id: acceptDriverId, driver_name: acceptDriverName, driver_phone: acceptDriverPhone, driver_photo_url: driver?.photo_url, vehicle_model: acceptVehicleModel, vehicle_plate: acceptVehiclePlate, driver_payout_amount: acceptDriverPayout ? parseFloat(acceptDriverPayout) : null };
    }
    
    // Simulação da Mutation (substituir pela real se necessário, mas mantendo a lógica simples aqui)
    base44.functions.invoke('supplierAcceptRejectRequest', {
        serviceRequestId: selectedRequest.id,
        accept: responseType === 'accept',
        refusalReason: refusalReason,
        price: responseType === 'accept' ? priceToConfirm : null,
        driverData
    }).then(() => {
        queryClient.invalidateQueries(['supplierServiceRequests']);
        setSuccess('Resposta enviada!');
        setShowResponseDialog(false);
        setTimeout(() => setSuccess(''), 3000);
    }).catch(e => setError(e.message));
  };

  const handleOpenDriverInfoDialog = (request) => {
    setSelectedRequest(request);
    // Reset fields logic here (same as original)
    setDriverName(request.driver_name || '');
    setDriverPhone(request.driver_phone || '+55');
    setVehicleModel(request.vehicle_model || '');
    setVehiclePlate(request.vehicle_plate || '');
    setShowDriverInfoDialog(true);
  };

  const handleDriverSelection = (driverId) => {
    setSelectedDriverId(driverId);
    if (driverId !== 'new') {
        const d = drivers.find(drv => drv.id === driverId);
        if (d) { setDriverName(d.name); setDriverPhone(d.phone_number); }
    }
  };

  const handleSaveDriverInfo = async (isAutoSave = false) => {
      setIsSavingDriverInfo(true);
      try {
          const payload = { 
              serviceRequestId: selectedRequest.id, 
              driver_id: (selectedDriverId !== 'new' && selectedDriverId !== 'casual_driver') ? selectedDriverId : null,
              driver_name: driverName, 
              driver_phone: driverPhone, 
              vehicle_model: vehicleModel, 
              vehicle_plate: vehiclePlate 
          };
          
          if (selectedRequest.type === 'own') {
              await base44.entities.SupplierOwnBooking.update(selectedRequest.id, { driver_name: driverName, driver_phone: driverPhone, vehicle_model: vehicleModel, vehicle_plate: vehiclePlate });
              if(!isAutoSave) setSuccess('Salvo!');
              queryClient.invalidateQueries(['supplierOwnBookings']);
          } else if (selectedRequest.type === 'direct_booking') {
              await base44.entities.Booking.update(selectedRequest.id, { driver_name: driverName, driver_phone: driverPhone, vehicle_model: vehicleModel, vehicle_plate: vehiclePlate });
              if(!isAutoSave) setSuccess('Salvo!');
              queryClient.invalidateQueries(['supplierDirectBookings']);
          } else if (selectedRequest.type === 'event_trip') {
              let driverIdToSend = selectedDriverId;
              if (selectedDriverId === 'new') driverIdToSend = 'new_eventual';
              if (selectedDriverId === 'casual_driver') driverIdToSend = 'casual_driver';
              
              const res = await base44.functions.invoke('updateEventTripDriver', {
                  tripId: selectedRequest.id,
                  driverId: driverIdToSend,
                  eventualDriverData: (selectedDriverId === 'new' || selectedDriverId === 'casual_driver') ? {
                      name: driverName,
                      phone: driverPhone,
                      vehicle_model: vehicleModel,
                      vehicle_plate: vehiclePlate,
                      email: '', 
                      vehicle_color: ''
                  } : null
              });
              
              if (res.data && res.data.error) throw new Error(res.data.error);
              
              if(!isAutoSave) setSuccess('Salvo!');
              queryClient.invalidateQueries(['supplierEventTrips']);
          } else {
              // Service Request
              const res = await base44.functions.invoke('updateServiceRequestDriverInfo', payload);
              if (res.data && res.data.error) throw new Error(res.data.error);
              if(!isAutoSave) setSuccess('Salvo!');
              queryClient.invalidateQueries(['supplierServiceRequests']);
          }
          if(!isAutoSave) setShowDriverInfoDialog(false);
      } catch (err) {
          console.error('Error saving driver info:', err);
          setError('Erro ao salvar: ' + (err.message || 'Desconhecido'));
      } finally {
          setIsSavingDriverInfo(false);
      }
  };

  // Funções de Subcontratação
  const handleOpenSubcontractDialog = (request) => {
    setSelectedRequest(request);
    setSelectedSubcontractorId(request.subcontractor_id || '');
    setShowSubcontractDialog(true);
  };

  const handleSubcontract = async () => {
    if (!selectedSubcontractorId) { setError('Selecione um parceiro'); return; }
    setIsSubmittingSubcontract(true);
    try {
        const res = await base44.functions.invoke('requestSubcontractorQuote', {
            tripId: selectedRequest.id,
            tripType: selectedRequest.type,
            subcontractorId: selectedSubcontractorId
        });
        if (res.data.success) {
            setSuccess('Solicitação enviada!');
            setShowSubcontractDialog(false);
            queryClient.invalidateQueries(['supplierServiceRequests']);
            setTimeout(() => setSuccess(''), 3000);
        } else {
            setError(res.data.error || 'Erro ao solicitar');
        }
    } catch (err) { setError(err.message); } finally { setIsSubmittingSubcontract(false); }
  };

  const handleOpenApproveSubcontract = (request) => {
      setSelectedRequest(request);
      setSubcontractMargin('');
      setShowApproveSubcontractDialog(true);
  };

  const handleApproveSubcontract = async () => {
      setIsSubmittingSubcontract(true);
      try {
          const partnerCost = selectedRequest?.subcontractor_cost || 0;
          const taxValue = partnerCost * (taxPercentage / 100);
          const subtotal = partnerCost + taxValue;
          const profitValue = subtotal * (profitPercentage / 100);
          const finalPrice = subtotal + profitValue;
          const calculatedMargin = finalPrice - partnerCost;

          const res = await base44.functions.invoke('confirmSubcontractorAssignment', {
              tripId: selectedRequest.id,
              tripType: selectedRequest.type,
              approved: true,
              margin: calculatedMargin
          });
          if (res.data.success) {
              setSuccess('Subcontratação confirmada!');
              setShowApproveSubcontractDialog(false);
              queryClient.invalidateQueries(['supplierServiceRequests']);
              setTimeout(() => setSuccess(''), 3000);
          } else {
              setError(res.data.error || 'Erro ao confirmar');
          }
      } catch (err) { setError(err.message); } finally { setIsSubmittingSubcontract(false); }
  };

  const handleViewDetails = (request) => { setSelectedRequest(request); setShowDetailsDialog(true); };

  const handleEditTrip = (request) => {
      setShowDetailsDialog(false);
      // Preparar dados para o SupplierBookingDialog
      if (request.type === 'own' || request.type === 'direct_booking') {
          // Mapear campos se necessário, mas geralmente SupplierOwnBooking já bate com o form
          // Se for direct_booking (Booking), precisamos adaptar alguns campos para o form do SupplierBookingDialog
          let bookingData = { ...request };
          if (request.type === 'direct_booking') {
              bookingData = {
                  ...bookingData,
                  client_id: null, // Booking não tem client_id de SupplierOwnClient
                  passenger_name: request.customer_name,
                  passenger_email: request.customer_email,
                  passenger_phone: request.customer_phone,
                  price: request.total_price,
                  // Adicionar outros campos conforme necessário
              };
          }
          setSupplierBookingToEdit(bookingData);
          setShowSupplierBookingDialog(true);
      } else {
          alert('Edição completa disponível apenas para viagens próprias e reservas diretas no momento.');
      }
  };

  const handleSendPassengerMessage = async (request) => {
      if (!confirm('Enviar detalhes da viagem para o passageiro via WhatsApp?')) return;
      try {
          const res = await base44.functions.invoke('sendTripInfoToPassenger', {
              tripId: request.id,
              tripType: request.type
          });
          if (res.data.success) alert('Mensagem enviada com sucesso!');
          else alert('Erro ao enviar: ' + (res.data.error || 'Desconhecido'));
      } catch (e) {
          alert('Erro ao enviar mensagem: ' + e.message);
      }
  };

  const handleSendDriverMessage = async (request) => {
      if (!confirm('Enviar detalhes da viagem para o motorista via WhatsApp?')) return;
      try {
          const res = await base44.functions.invoke('notifyDriverAboutTrip', {
              serviceRequestId: request.id,
              notificationType: 'whatsapp'
          });
          if (res.data.success) alert('Mensagem enviada com sucesso!');
          else alert('Erro ao enviar: ' + (res.data.error || 'Desconhecido'));
      } catch (e) {
          alert('Erro ao enviar mensagem: ' + e.message);
      }
  };
  const handleSort = (col) => { setSortColumn(col); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); };

  if (isCheckingAuth) return <SectionLoader />;

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-6">
      <MetaTags title="Dashboard Operacional | Fornecedor" description="Gestão completa de operações." />
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6">
          <PageHeader 
            title={
              <span className="flex items-center gap-2 md:gap-3">
                <Bell className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                Dashboard Operacional
              </span>
            }
            subtitle={`${supplier?.name} - Centro de Comando Unificado`}
            actions={
              supplier?.module3_enabled && (
                <Button 
                    onClick={() => { setSupplierBookingToEdit(null); setShowSupplierBookingDialog(true); }}
                    className="bg-green-600 hover:bg-green-700 shadow-lg text-white font-bold py-2 px-4 rounded-full flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Nova Viagem
                </Button>
              )
            }
          />
        </div>

        {/* Feedback Messages */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards (Similar ao Admin) */}
        <DashboardGrid cols={4}>
          <StatCard title="Total de Reservas" value={dashboardStats.total} icon={CalendarIcon} variant="blue" />
          <StatCard title="Confirmadas" value={dashboardStats.confirmed} icon={CheckCircle} variant="green" />
          <StatCard title="Pendentes" value={dashboardStats.pending} icon={Clock} variant="yellow" />
          <StatCard title="Canceladas" value={dashboardStats.cancelled} icon={XCircle} variant="red" />
        </DashboardGrid>

        <DashboardGrid cols={2} className="mt-4 mb-6">
          <StatCard title="Aguardando Resposta" value={dashboardStats.awaitingResponse} icon={Clock} variant="orange" />
          <StatCard title="Em Andamento" value={dashboardStats.inProgress} icon={Navigation} variant="purple" />
        </DashboardGrid>

        {/* Filtros e Busca (Similar ao Admin) */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 z-10" />
                <Input
                  placeholder="Buscar por número, passageiro, solicitante, cliente, fornecedor, motorista, veículo, placa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="aguardando_resposta">Aguardando Resposta</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtros Secundários */}
        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div className="w-48">
            <label className="text-xs text-gray-500 font-medium mb-1 block">Tipo de Viagem</label>
            <Select value={tripTypeFilter} onValueChange={setTripTypeFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="platform">Plataforma</SelectItem>
                <SelectItem value="own">Próprias</SelectItem>
                <SelectItem value="direct_booking">Particulares</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <span className="text-xs text-gray-500 font-medium">Data</span>
            <Input 
              type="date" 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-40 bg-white"
            />
          </div>

          {dateFilter && (
            <Button 
              variant="ghost" 
              onClick={() => setDateFilter('')}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-10"
            >
              Limpar Filtro
            </Button>
          )}
        </div>

        {/* 3. Alertas de Conflitos */}
        {driverConflicts.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <AlertDescription className="w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <strong className="text-base sm:text-lg">⚠️ {driverConflicts.length} Conflito(s) de Motorista</strong>
              </div>
              <div className="mt-2 text-xs sm:text-sm space-y-1">
                {driverConflicts.slice(0, 3).map((c, i) => (
                  <div key={i} className="bg-red-100/50 p-1 rounded">
                    <span className="font-semibold">{c.driver}:</span> {c.time1} e {c.time2} <span className="text-gray-600">({c.date})</span>
                  </div>
                ))}
                {driverConflicts.length > 3 && <div className="text-xs text-center pt-1">+ mais {driverConflicts.length - 3} conflitos</div>}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 4. Área Principal (Lista e Agenda) */}
        <Tabs defaultValue="list" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-0">
             <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex">
                <TabsTrigger value="list">Lista de Viagens</TabsTrigger>
                <TabsTrigger value="agenda">Agenda Visual</TabsTrigger>
             </TabsList>
          </div>

          <TabsContent value="list" className="space-y-6">
             <Suspense fallback={<SectionLoader />}>
                <Card>
                  <CardContent className="p-0">
                    <RequestTable 
                        requests={paginatedRequests} 
                        onViewDetails={handleViewDetails} 
                        onManageDriver={handleOpenDriverInfoDialog}
                        onAccept={(r) => handleOpenResponseDialog(r, 'accept')}
                        onReject={(r) => handleOpenResponseDialog(r, 'reject')}
                        formatPrice={formatPrice}
                        showActions showDriverAction showUrgencyIndicator showTripStatus
                        parseLocalDate={parseLocalDate}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        supplierVehicleTypes={supplierVehicleTypes}
                        selectedTrips={selectedTrips}
                        onSelectionChange={setSelectedTrips}
                        supplier={supplier}
                        onSubcontract={handleOpenSubcontractDialog}
                        onApproveSubcontract={handleOpenApproveSubcontract}
                        onStatusChange={handleOpenStatusChangeDialog}
                    />
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  </CardContent>
                </Card>
             </Suspense>
          </TabsContent>

          <TabsContent value="agenda">
            <Card>
              <CardContent className="p-6">
                {Object.keys(requestsByDay).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">Nenhuma viagem agendada para o período selecionado.</div>
                ) : (
                    <div className="space-y-6">
                        {Object.keys(requestsByDay).sort().map(dateKey => {
                            const dayRequests = requestsByDay[dateKey];
                            const isToday = isSameDay(parseISO(dateKey), new Date());
                            return (
                                <div key={dateKey} className={`border-l-4 ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} rounded-lg p-4`}>
                                    <h3 className="font-bold text-lg mb-2">{format(parseISO(dateKey), "dd 'de' MMMM (EEEE)", { locale: ptBR })}</h3>
                                    <div className="space-y-2">
                                        {dayRequests.map(req => (
                                            <div key={req.id} className="bg-white p-3 rounded shadow-sm flex justify-between items-center">
                                                <div>
                                                    <span className="font-bold text-blue-600 mr-2">{req.time}</span>
                                                    <span className="font-medium">{req.origin} ➔ {req.destination}</span>
                                                    <div className="text-sm text-gray-600 mt-1">
                                                        {req.passenger_name} • {req.vehicle_model || 'Veículo não definido'}
                                                    </div>
                                                </div>
                                                <Badge className={getTripStatusColor(req.driver_trip_status)}>
                                                    {getDriverStatusLabel(req.driver_trip_status)}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modais */}
        <Suspense fallback={null}>
            {showSupplierBookingDialog && <SupplierBookingDialog open={showSupplierBookingDialog} onOpenChange={setShowSupplierBookingDialog} supplierId={supplier?.id} bookingToEdit={supplierBookingToEdit} />}
            {showPDFDialog && <ServiceOrderPDFDialog serviceRequest={requestToExport} open={showPDFDialog} onClose={() => setShowPDFDialog(false)} />}
            {showShareDialog && <ShareTripsDialog open={showShareDialog} onClose={() => setShowShareDialog(false)} selectedTrips={allTrips.filter(t => selectedTrips.includes(t.id))} />}
            {showExpensesDialog && (
                <ExpensesDialog
                  open={showExpensesDialog}
                  onClose={() => { setShowExpensesDialog(false); setPendingManualStatus(''); }}
                  isUpdating={isUpdatingManualStatus}
                  onConfirm={async ({ hasAdditionalExpenses, additionalExpenses }) => {
                    setIsUpdatingManualStatus(true);
                    try {
                      let statusToSend = pendingManualStatus;
                      if (pendingManualStatus === 'chegou_destino' && !hasAdditionalExpenses) statusToSend = 'finalizada';
                      const res = await base44.functions.invoke('manualUpdateTripStatus', {
                        serviceRequestId: selectedRequest.id,
                        newStatus: statusToSend,
                        hasAdditionalExpenses,
                        additionalExpenses
                      });
                      if (res.data.success) {
                        queryClient.invalidateQueries(['supplierServiceRequests']);
                        queryClient.invalidateQueries(['supplierOwnBookings']);
                        queryClient.invalidateQueries(['supplierDirectBookings']);
                        setSuccess('Status atualizado!');
                        setShowExpensesDialog(false);
                        setShowDetailsDialog(false);
                      } else alert('Erro: ' + res.data.error);
                    } catch (err) { console.error(err); alert('Erro ao atualizar'); } finally { setIsUpdatingManualStatus(false); }
                  }}
                />
            )}
            {statusChangeRequest && (
                <UpdateTripStatusDialog
                    open={showStatusChangeDialog}
                    onClose={() => setShowStatusChangeDialog(false)}
                    trip={statusChangeRequest}
                    onConfirm={async (tripToUpdate, newStatus) => {
                        try {
                            const res = await base44.functions.invoke('manualUpdateTripStatus', {
                                serviceRequestId: tripToUpdate.id,
                                newStatus: newStatus,
                            });
                            if (res.data.success) {
                                queryClient.invalidateQueries(['supplierServiceRequests']);
                                queryClient.invalidateQueries(['supplierOwnBookings']);
                                queryClient.invalidateQueries(['supplierDirectBookings']);
                            } else {
                                throw new Error(res.data.error);
                            }
                        } catch (error) {
                            console.error('Erro ao atualizar status:', error);
                            throw error;
                        }
                    }}
                />
            )}
        </Suspense>

        {/* Dialogs de Subcontratação */}
        <Dialog open={showSubcontractDialog} onOpenChange={setShowSubcontractDialog}>
            <DialogContent>
                <DialogHeader><DialogTitle>Subcontratar Viagem</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <Label>Selecione o Parceiro</Label>
                    <Select value={selectedSubcontractorId} onValueChange={setSelectedSubcontractorId}>
                        <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
                        <SelectContent>{subcontractors.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSubcontractDialog(false)}>Cancelar</Button>
                    <Button onClick={handleSubcontract} disabled={isSubmittingSubcontract || !selectedSubcontractorId}>
                        {isSubmittingSubcontract ? <Loader2 className="animate-spin" /> : 'Enviar Solicitação'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={showApproveSubcontractDialog} onOpenChange={setShowApproveSubcontractDialog}>
            <DialogContent>
                <DialogHeader><DialogTitle>Aprovar Cotação</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <p>Custo: {formatPrice(selectedRequest?.subcontractor_cost)}</p>
                    <div><Label>Taxas (%)</Label><Input type="number" value={taxPercentage} onChange={e => setTaxPercentage(parseFloat(e.target.value))} /></div>
                    <div><Label>Lucro (%)</Label><Input type="number" value={profitPercentage} onChange={e => setProfitPercentage(parseFloat(e.target.value))} /></div>
                </div>
                <DialogFooter>
                    <Button onClick={handleApproveSubcontract} disabled={isSubmittingSubcontract}>{isSubmittingSubcontract ? <Loader2 className="animate-spin" /> : 'Confirmar'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {selectedRequest && (
            <>
                <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Detalhes da Solicitação</DialogTitle></DialogHeader>
                        <TripDetailsDisplay 
                            trip={selectedRequest} 
                            isEditable={true} 
                            onOpenStatusChangeDialog={handleOpenStatusChangeDialog}
                        />
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button variant="outline" onClick={() => setShowDetailsDialog(false)} className="flex-1 sm:flex-none">Fechar</Button>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                {(selectedRequest.type === 'own' || selectedRequest.type === 'direct_booking') && (
                                    <Button variant="secondary" onClick={() => handleEditTrip(selectedRequest)} className="flex-1 sm:flex-none">
                                        <Pencil className="w-4 h-4 mr-2" />
                                        Editar Viagem
                                    </Button>
                                )}

                                <Button 
                                    variant="outline" 
                                    onClick={() => { setRequestToExport(selectedRequest); setShowPDFDialog(true); }} 
                                    className="flex-1 sm:flex-none"
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir OS
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="flex-1 sm:flex-none">
                                            <MessageSquare className="w-4 h-4 mr-2" />
                                            Enviar Mensagem
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => handleSendPassengerMessage(selectedRequest)}>
                                            <User className="w-4 h-4 mr-2" /> Para Passageiro
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleSendDriverMessage(selectedRequest)}>
                                            <Car className="w-4 h-4 mr-2" /> Para Motorista
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {['aceito', 'confirmado'].includes(selectedRequest.supplier_response_status) && (
                                    <Button onClick={() => handleOpenDriverInfoDialog(selectedRequest)} className="flex-1 sm:flex-none">
                                        Gerenciar Motorista
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{responseType === 'accept' ? 'Aceitar' : 'Recusar'}</DialogTitle></DialogHeader>
                        {responseType === 'reject' && (
                            <Textarea placeholder="Motivo da recusa" value={refusalReason} onChange={e => setRefusalReason(e.target.value)} />
                        )}
                        {responseType === 'accept' && (
                            <div className="space-y-4">
                                <Label>Confirmar Valor</Label>
                                <Input type="number" value={priceToConfirm} onChange={e => setPriceToConfirm(e.target.value)} />
                                <div className="flex items-center gap-2">
                                    <Checkbox checked={assignDriverNow} onCheckedChange={setAssignDriverNow} />
                                    <Label>Atribuir Motorista Agora?</Label>
                                </div>
                                {assignDriverNow && (
                                    <Select value={acceptDriverId} onValueChange={setAcceptDriverId}>
                                        <SelectTrigger><SelectValue placeholder="Selecione Motorista" /></SelectTrigger>
                                        <SelectContent>
                                            {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={handleSubmitResponse}>{responseType === 'accept' ? 'Confirmar' : 'Recusar'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={showDriverInfoDialog} onOpenChange={setShowDriverInfoDialog}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Gerenciar Motorista</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                            <Label>Motorista</Label>
                            <Select value={selectedDriverId} onValueChange={handleDriverSelection}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new">Novo Motorista (Cadastrar)</SelectItem>
                                    <SelectItem value="casual_driver">Motorista Avulso (Não cadastrar)</SelectItem>
                                    {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Input placeholder="Nome" value={driverName} onChange={e => setDriverName(e.target.value)} disabled={selectedDriverId !== 'new' && selectedDriverId !== 'casual_driver'} />
                            <Input placeholder="Telefone" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} disabled={selectedDriverId !== 'new' && selectedDriverId !== 'casual_driver'} />
                            <Input placeholder="Modelo Veículo" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} />
                            <Input placeholder="Placa" value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} />
                        </div>
                        <DialogFooter>
                            <Button onClick={() => handleSaveDriverInfo(false)} disabled={isSavingDriverInfo}>Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        )}
      </div>
    </div>
  );
}