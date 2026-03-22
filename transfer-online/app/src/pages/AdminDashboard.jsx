import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, DollarSign, Users, CheckCircle, Search, Filter, XCircle, Clock, Loader2, AlertCircle, Navigation, BellRing, Settings, UserPlus, CreditCard, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/Pagination';

import { Suspense } from 'react';
import MetaTags from '@/components/seo/MetaTags';

// Lazy load heavy components
const UnifiedTripTable = React.lazy(() => import('../components/admin/UnifiedTripTable'));
const BookingDetails = React.lazy(() => import('../components/admin/BookingDetails'));
const ConsolidatedTrackingMap = React.lazy(() => import('../components/admin/ConsolidatedTrackingMap'));
const EditServiceRequestDialog = React.lazy(() => import('../components/admin/EditServiceRequestDialog'));
const SupplierOwnBookingDetailsDialog = React.lazy(() => import('../components/admin/SupplierOwnBookingDetailsDialog'));
const AdminManageDriverDialog = React.lazy(() => import('../components/admin/AdminManageDriverDialog'));
const AdminAcceptRequestDialog = React.lazy(() => import('../components/admin/AdminAcceptRequestDialog'));
const ShareTripsDialog = React.lazy(() => import('../components/ShareTripsDialog'));
const SupplierBookingDialog = React.lazy(() => import('../components/supplier/SupplierBookingDialog'));
const DriverScheduleDialog = React.lazy(() => import('../components/event/DriverScheduleDialog'));
const BulkPaymentLinkDialog = React.lazy(() => import('../components/admin/BulkPaymentLinkDialog'));
const TripScheduleSummaryDialog = React.lazy(() => import('../components/admin/TripScheduleSummaryDialog'));

const DashboardLoader = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
);
import { Share2 } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import PageHeader from '@/components/dashboard/PageHeader';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import SystemHealthAlert from '@/components/admin/SystemHealthAlert';
import PendingTripCard from '@/components/admin/PendingTripCard';
const EditTripDialog = React.lazy(() => import('../components/event/EditTripDialog'));
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [editingServiceRequest, setEditingServiceRequest] = useState(null);
  const [showEditServiceRequestDialog, setShowEditServiceRequestDialog] = useState(false);
  const [editingEventTrip, setEditingEventTrip] = useState(null);
  const [showEditEventTripDialog, setShowEditEventTripDialog] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSupplierBooking, setSelectedSupplierBooking] = useState(null);
  const [tripTypeFilter, setTripTypeFilter] = useState('all');
  const [driverAssignmentFilter, setDriverAssignmentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [sortColumn, setSortColumn] = useState('date_time');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Estado para gerenciamento de motorista (modal global)
  const [managingDriverTrip, setManagingDriverTrip] = useState(null);
  const [managingDriverType, setManagingDriverType] = useState(null);
  const [acceptingTrip, setAcceptingTrip] = useState(null);
  const [selectedTrips, setSelectedTrips] = useState([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDriverScheduleDialog, setShowDriverScheduleDialog] = useState(false);
  const [showBulkPaymentDialog, setShowBulkPaymentDialog] = useState(false);
  const [showScheduleSummaryDialog, setShowScheduleSummaryDialog] = useState(false);
  
  // Estado para edição de viagens de fornecedor
  const [editingSupplierBooking, setEditingSupplierBooking] = useState(null);
  const [showEditSupplierBookingDialog, setShowEditSupplierBookingDialog] = useState(false);
  const navigate = useNavigate();

  // Verificar se é admin
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setUser(currentUser);
        setIsCheckingAuth(false);
      } catch (error) {
        window.location.href = '/AccessPortal?returnUrl=%2FAdminDashboard';
      }
    };

    checkAuth();
  }, []);

  // Check for URL params to open dialogs (e.g. coming from Quote Conversion)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('editServiceRequest');
    
    if (editId && !isCheckingAuth && user) {
      base44.entities.ServiceRequest.get(editId).then(request => {
        if (request) {
          setEditingServiceRequest(request);
          setShowEditServiceRequestDialog(true);
          // Optional: Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      }).catch(err => console.error("Error fetching request from URL:", err));
    }
  }, [isCheckingAuth, user]);

  // Os lembretes automáticos já rodam no backend; evitamos disparo redundante no painel admin.


  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date'),
    initialData: [],
    enabled: !isCheckingAuth
  });

  const { data: serviceRequests = [] } = useQuery({
    queryKey: ['serviceRequests'],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date'),
    initialData: [],
    enabled: !isCheckingAuth,
    refetchInterval: 30000
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: [],
    enabled: !isCheckingAuth
  });

  const { data: supplierVehicles = [] } = useQuery({
    queryKey: ['supplierVehicles'],
    queryFn: () => base44.entities.SupplierVehicleType.list(),
    initialData: [],
    enabled: !isCheckingAuth
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
    enabled: !isCheckingAuth
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
    enabled: !isCheckingAuth
  });

  const { data: supplierClients = [] } = useQuery({
    queryKey: ['supplierClients'],
    queryFn: () => base44.entities.SupplierOwnClient.list(),
    initialData: [],
    enabled: !isCheckingAuth
  });

  const { data: eventTrips = [] } = useQuery({
    queryKey: ['eventTrips'],
    queryFn: () => base44.entities.EventTrip.list('-created_date'),
    initialData: [],
    enabled: !isCheckingAuth,
    refetchInterval: 30000
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    initialData: [],
    enabled: !isCheckingAuth
  });





  // Query para solicitações com rastreamento ativo
  const { data: activeTrackingRequests = [] } = useQuery({
    queryKey: ['activeTrackingRequests'],
    queryFn: async () => {
      const allRequests = await base44.entities.ServiceRequest.list('-created_date');
      return allRequests.filter(r =>
        r.gps_tracking_enabled &&
        ['a_caminho', 'passageiro_embarcou', 'a_caminho_destino'].includes(r.driver_trip_status)
      );
    },
    enabled: !isCheckingAuth,
    refetchInterval: 15000,
    initialData: []
  });

  // Query para viagens próprias de fornecedores
  const { data: supplierOwnBookings = [] } = useQuery({
    queryKey: ['supplierOwnBookings'],
    queryFn: () => base44.entities.SupplierOwnBooking.list('-created_date'),
    initialData: [],
    enabled: !isCheckingAuth
  });

  const { data: allDrivers = [] } = useQuery({
    queryKey: ['allDrivers'],
    queryFn: () => base44.entities.Driver.filter({ active: true }),
    initialData: [],
    enabled: !isCheckingAuth
  });

  const { data: pendingApprovals } = useQuery({
    queryKey: ['adminPendingApprovals'],
    queryFn: async () => {
      const drivers = await base44.entities.Driver.filter({ approval_status: 'pending' });
      const vehicles = await base44.entities.SupplierVehicleType.filter({ approval_status: 'pending' });
      const invitations = await base44.entities.EmployeeInvitation.filter({ status: 'pendente' });
      return {
        driversCount: drivers.length,
        vehiclesCount: vehicles.length,
        invitationsCount: invitations.length,
        total: drivers.length + vehicles.length + invitations.length
      };
    },
    enabled: !isCheckingAuth,
    initialData: { driversCount: 0, vehiclesCount: 0, invitationsCount: 0, total: 0 }
  });

  // Buscar histórico de comentários para identificar quais viagens têm observações
  const { data: tripsWithComments = new Set() } = useQuery({
    queryKey: ['tripsWithComments'],
    queryFn: async () => {
      // Busca registros de histórico do tipo "Comentário Admin"
      // Como pode haver muitos registros, idealmente limitaríamos por data, mas para garantir visibilidade vamos pegar os últimos 1000 por enquanto
      // e otimizar depois se necessário. O ideal seria uma função backend agregadora.
      const comments = await base44.entities.TripHistory.filter({ event_type: 'Comentário Admin' }, '-created_date', 1000);
      const ids = new Set(comments.map(c => c.trip_id));
      return ids;
    },
    initialData: new Set(),
    enabled: !isCheckingAuth,
    refetchInterval: 30000 // Atualizar a cada 30s
  });

  const filteredServiceRequests = serviceRequests.filter(request => {
    const search = searchTerm.toLowerCase().trim();
    const supplier = suppliers.find(s => s.id === request.chosen_supplier_id);
    const requester = allUsers.find(u => u.id === request.user_id);
    const client = clients.find(c => c.id === request.client_id);
    
    const matchesSearch = !searchTerm || (
      request.request_number?.toLowerCase().includes(search) ||
      request.passenger_name?.toLowerCase().includes(search) ||
      request.origin?.toLowerCase().includes(search) ||
      request.destination?.toLowerCase().includes(search) ||
      supplier?.name?.toLowerCase().includes(search) ||
      client?.name?.toLowerCase().includes(search)
    );

    const matchesStatus = statusFilter === 'all' || 
                         request.status === statusFilter ||
                         (statusFilter === 'aguardando_fornecedor' && request.supplier_response_status === 'aguardando_resposta');

    return matchesSearch && matchesStatus;
  });

  const pendingNovaReservaBookings = React.useMemo(() => {
    return bookings.filter((booking) => booking.payment_status === 'pago' && booking.status === 'pendente');
  }, [bookings]);

  // Normalizar e unificar todas as viagens
  const allTrips = React.useMemo(() => {
    const normalizedBookings = bookings
      .filter(b => b.payment_status === 'pago' || b.status !== 'pendente')
      .map(b => ({
      id: b.id,
      type: 'booking',
      display_id: b.booking_number,
      passenger_name: b.customer_name,
      driver_name: b.driver_name,
      client_name: 'Cliente Particular',
      origin: b.origin,
      destination: b.destination,
      date: b.date,
      time: b.time,
      price: b.total_price,
      status: b.status,
      original_data: b,
      created_date: b.created_date
    }));

    const normalizedRequests = serviceRequests
      .filter(r => !r.converted_booking_id) // Filtrar SRs que são conversões de Booking
      .map(r => {
      const client = clients.find(c => c.id === r.client_id);
      
      // Calcular status visual baseado na operação
      let computedStatus = r.status;
      const driverStatus = r.driver_trip_status;
      const departureStatus = r.departure_status;
      const receptivityStatus = r.receptivity_trip_status;

      // Determinar se todas as pernas operacionais relevantes foram concluídas
      const isDriverCompleted = ['finalizada', 'aguardando_confirmacao_despesas', 'no_show', 'cancelada_motorista'].includes(driverStatus);
      const isReceptivityCompleted = receptivityStatus ? ['finalizada', 'no_show', 'cancelada_motorista'].includes(receptivityStatus) : true;
      const isDepartureCompleted = departureStatus ? ['completed', 'departed_other_means'].includes(departureStatus) : true;

      // Se a viagem está marcada como 'concluida' ou todas as pernas estão finalizadas e não foi cancelada
      if (computedStatus === 'concluida' || (isDriverCompleted && isReceptivityCompleted && isDepartureCompleted && computedStatus !== 'cancelada')) {
          computedStatus = 'concluida';
      } else {
          // Se não está concluída, verificar se está em andamento operacionalmente
          const isInProgressOperational = ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'parada_adicional', 'a_caminho_destino', 'chegou_destino'].includes(driverStatus) ||
                                      (['passageiro_embarcou', 'a_caminho', 'chegou_origem'].includes(receptivityStatus) && !isReceptivityCompleted) ||
                                      (['started'].includes(departureStatus) && !isDepartureCompleted);

          if (['pendente', 'confirmada', 'aguardando_fornecedor', 'rascunho'].includes(computedStatus) && isInProgressOperational) {
              computedStatus = 'em_andamento';
          }
      }

      return {
        id: r.id,
        type: 'service_request',
        display_id: r.request_number,
        passenger_name: r.passenger_name,
        driver_name: r.driver_name,
        client_name: client?.name || 'Cliente Corporativo',
        origin: r.origin,
        destination: r.destination,
        date: r.date,
        time: r.time,
        price: r.chosen_client_price || 0,
        status: computedStatus,
        original_data: r,
        created_date: r.created_date
      };
    });

    const normalizedSupplierBookings = supplierOwnBookings.map(sb => {
      const supplier = suppliers.find(s => s.id === sb.supplier_id);
      const client = supplierClients.find(c => c.id === sb.client_id);

      // Calcular status visual baseado na operação
      let computedStatus = sb.status;
      const driverStatus = sb.driver_trip_status;
      const departureStatus = sb.departure_status;
      const receptivityStatus = sb.receptivity_trip_status;

      // Determinar se todas as pernas operacionais relevantes foram concluídas
      const isDriverCompleted = ['finalizada', 'aguardando_confirmacao_despesas', 'no_show', 'cancelada_motorista'].includes(driverStatus);
      const isReceptivityCompleted = receptivityStatus ? ['finalizada', 'no_show', 'cancelada_motorista'].includes(receptivityStatus) : true;
      const isDepartureCompleted = departureStatus ? ['completed', 'departed_other_means'].includes(departureStatus) : true;

      // Se a viagem está marcada como 'concluida' ou todas as pernas estão finalizadas e não foi cancelada
      if (computedStatus === 'concluida' || (isDriverCompleted && isReceptivityCompleted && isDepartureCompleted && computedStatus !== 'cancelada')) {
          computedStatus = 'concluida';
      } else {
          // Se não está concluída, verificar se está em andamento operacionalmente
          const isInProgressOperational = ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'parada_adicional', 'a_caminho_destino', 'chegou_destino'].includes(driverStatus) ||
                                      (['passageiro_embarcou', 'a_caminho', 'chegou_origem'].includes(receptivityStatus) && !isReceptivityCompleted) ||
                                      (['started'].includes(departureStatus) && !isDepartureCompleted);

          if (['pendente', 'confirmada'].includes(computedStatus) && isInProgressOperational) {
              computedStatus = 'em_andamento';
          }
      }

      return {
        id: sb.id,
        type: 'supplier_own_booking',
        display_id: sb.booking_number,
        passenger_name: sb.passenger_name,
        driver_name: sb.driver_name,
        client_name: client ? client.name : (supplier ? `Cliente de ${supplier.name}` : 'Cliente de Fornecedor'),
        origin: sb.origin,
        destination: sb.destination,
        date: sb.date,
        time: sb.time,
        price: sb.price || 0,
        status: computedStatus,
        original_data: sb,
        created_date: sb.created_date
      };
    });

    const normalizedEventTrips = eventTrips.map(et => {
      const event = events.find(e => e.id === et.event_id);
      const driver = allDrivers.find(d => d.id === et.driver_id);
      
      let computedStatus = et.status;
      if (et.status === 'dispatched') computedStatus = 'em_andamento';
      if (et.status === 'scheduled') computedStatus = 'confirmada';
      if (et.status === 'completed') computedStatus = 'concluida';
      if (et.status === 'cancelled') computedStatus = 'cancelada';

      // Format passenger name with count (cleaning potential 0 Pax artifacts from name)
      const cleanName = et.name ? et.name.replace(/ - \d+ Pax/g, '') : 'Viagem';
      const passengerLabel = et.passenger_count ? `${cleanName} - ${et.passenger_count} Pax` : cleanName;

      return {
        id: et.id,
        type: 'event_trip',
        display_id: et.trip_code || et.name,
        passenger_name: passengerLabel,
        driver_name: driver ? driver.name : (et.casual_driver_name || et.subcontractor_driver_name),
        client_name: event ? (event.client_name || event.event_name) : 'Evento',
        origin: et.origin,
        destination: et.destination,
        date: et.date,
        time: et.start_time,
        price: et.client_price || 0,
        status: computedStatus,
        original_data: et,
        created_date: et.created_date
      };
    });

    return [...normalizedBookings, ...normalizedRequests, ...normalizedSupplierBookings, ...normalizedEventTrips].sort((a, b) => {
      return new Date(b.created_date) - new Date(a.created_date);
    });
  }, [bookings, serviceRequests, supplierOwnBookings, eventTrips, clients, suppliers, supplierClients, events, allDrivers]);

  // Resetar paginação quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, tripTypeFilter, dateFilter, driverAssignmentFilter]);

  // Gerar sugestões de busca
  React.useEffect(() => {
    if (searchTerm && searchTerm.length >= 3) {
      const search = searchTerm.toLowerCase().trim();
      const suggestions = new Set();
      
      serviceRequests.forEach(r => {
        const supplier = suppliers.find(s => s.id === r.chosen_supplier_id);
        const vehicleType = supplierVehicles.find(v => v.id === r.chosen_vehicle_type_id);
        const requester = allUsers.find(u => u.id === r.user_id);
        const client = clients.find(c => c.id === r.client_id);
        
        if (r.request_number?.toLowerCase().includes(search)) suggestions.add(`📝 ${r.request_number}`);
        if (r.passenger_name?.toLowerCase().includes(search)) suggestions.add(`👤 ${r.passenger_name}`);
        if (r.driver_name?.toLowerCase().includes(search)) suggestions.add(`🚗 ${r.driver_name}`);
        if (supplier?.name?.toLowerCase().includes(search)) suggestions.add(`🏢 ${supplier.name}`);
        if (vehicleType?.name?.toLowerCase().includes(search)) suggestions.add(`🚙 ${vehicleType.name}`);
        if (requester?.full_name?.toLowerCase().includes(search)) suggestions.add(`👨‍💼 ${requester.full_name}`);
        if (client?.name?.toLowerCase().includes(search)) suggestions.add(`🏪 ${client.name}`);
        if (r.vehicle_plate?.toLowerCase().includes(search)) suggestions.add(`🚗 ${r.vehicle_plate}`);
      });
      
      bookings.forEach(b => {
        if (b.customer_name?.toLowerCase().includes(search)) suggestions.add(`👤 ${b.customer_name}`);
        if (b.customer_email?.toLowerCase().includes(search)) suggestions.add(`📧 ${b.customer_email}`);
        if (b.origin?.toLowerCase().includes(search)) suggestions.add(`📍 ${b.origin}`);
        if (b.destination?.toLowerCase().includes(search)) suggestions.add(`📍 ${b.destination}`);
      });
      
      setSearchSuggestions(Array.from(suggestions).slice(0, 10));
      setShowSuggestions(true);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, serviceRequests, bookings, suppliers, supplierVehicles, allUsers, clients]);

  const filteredTrips = React.useMemo(() => {
    let result = allTrips.filter(trip => {
      const search = searchTerm.toLowerCase().trim();
      
      const matchesSearch = !searchTerm || (
        trip.display_id?.toLowerCase().includes(search) ||
        trip.passenger_name?.toLowerCase().includes(search) ||
        trip.client_name?.toLowerCase().includes(search) ||
        trip.driver_name?.toLowerCase().includes(search) ||
        trip.origin?.toLowerCase().includes(search) ||
        trip.destination?.toLowerCase().includes(search)
      );

      const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
      const matchesType = tripTypeFilter === 'all' || trip.type === tripTypeFilter;
      
      const tripDate = trip.date || '';
      const matchesDate = (!dateFilter.start || tripDate >= dateFilter.start) && 
                          (!dateFilter.end || tripDate <= dateFilter.end);

      const matchesDriverAssignment = 
        driverAssignmentFilter === 'all' ||
        (driverAssignmentFilter === 'assigned' && trip.driver_name) ||
        (driverAssignmentFilter === 'unassigned' && !trip.driver_name);

      return matchesSearch && matchesStatus && matchesType && matchesDate && matchesDriverAssignment;
    });

    result.sort((a, b) => {
      let valA, valB;

      switch (sortColumn) {
        case 'display_id':
          valA = a.display_id || '';
          valB = b.display_id || '';
          break;
        case 'type':
          valA = a.type || '';
          valB = b.type || '';
          break;
        case 'passenger_name':
          valA = a.passenger_name || '';
          valB = b.passenger_name || '';
          break;
        case 'origin':
          valA = a.origin || '';
          valB = b.origin || '';
          break;
        case 'date_time':
          valA = new Date(`${a.date || '1970-01-01'}T${a.time || '00:00'}:00`).getTime();
          valB = new Date(`${b.date || '1970-01-01'}T${b.time || '00:00'}:00`).getTime();
          break;
        case 'created_date':
          valA = new Date(a.created_date).getTime();
          valB = new Date(b.created_date).getTime();
          break;
        case 'price':
          valA = a.price || 0;
          valB = b.price || 0;
          break;
        case 'status':
          valA = a.status || '';
          valB = b.status || '';
          break;
        default:
          valA = new Date(a.created_date).getTime();
          valB = new Date(b.created_date).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allTrips, searchTerm, statusFilter, tripTypeFilter, driverAssignmentFilter, sortColumn, sortDirection, dateFilter]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Paginação
  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage);
  const paginatedTrips = filteredTrips.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewDetails = (trip) => {
    if (trip.type === 'booking') {
      setSelectedBooking(trip.original_data);
    } else if (trip.type === 'service_request') {
      setEditingServiceRequest(trip.original_data);
      setShowEditServiceRequestDialog(true);
    } else if (trip.type === 'supplier_own_booking') {
      setSelectedSupplierBooking(trip.original_data);
    } else if (trip.type === 'event_trip') {
      setEditingEventTrip(trip.original_data);
      setShowEditEventTripDialog(true);
    }
  };

  const handleManageDriver = (trip, type) => {
    setSelectedBooking(null);
    setShowEditServiceRequestDialog(false);
    setEditingServiceRequest(null);
    setSelectedSupplierBooking(null);
    setManagingDriverTrip(trip);
    setManagingDriverType(type);
  };

  // Mutation para atualização otimista de status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ trip, newStatus }) => {
      let entityName = '';
      if (trip.type === 'booking') entityName = 'Booking';
      else if (trip.type === 'service_request') entityName = 'ServiceRequest';
      else if (trip.type === 'supplier_own_booking') entityName = 'SupplierOwnBooking';
      else if (trip.type === 'event_trip') entityName = 'EventTrip';

      if (entityName) {
        await base44.entities[entityName].update(trip.id, { status: newStatus });
        
        if (newStatus === 'cancelada') {
          try {
            await base44.functions.invoke('notifyDriverAboutCancellation', {
              tripId: trip.id,
              tripType: entityName,
              cancelReason: 'Cancelamento rápido via painel administrativo'
            });
          } catch (e) { console.error(e); }
        }
      }
    },
    onMutate: async ({ trip, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['bookings'] });
      await queryClient.cancelQueries({ queryKey: ['serviceRequests'] });
      await queryClient.cancelQueries({ queryKey: ['supplierOwnBookings'] });
      await queryClient.cancelQueries({ queryKey: ['eventTrips'] });

      const previousBookings = queryClient.getQueryData(['bookings']);
      const previousRequests = queryClient.getQueryData(['serviceRequests']);
      const previousSupplierBookings = queryClient.getQueryData(['supplierOwnBookings']);
      const previousEventTrips = queryClient.getQueryData(['eventTrips']);

      // Otimistic update
      if (trip.type === 'booking') {
        queryClient.setQueryData(['bookings'], old => old?.map(b => b.id === trip.id ? { ...b, status: newStatus } : b));
      } else if (trip.type === 'service_request') {
        queryClient.setQueryData(['serviceRequests'], old => old?.map(r => r.id === trip.id ? { ...r, status: newStatus } : r));
      } else if (trip.type === 'supplier_own_booking') {
        queryClient.setQueryData(['supplierOwnBookings'], old => old?.map(sb => sb.id === trip.id ? { ...sb, status: newStatus } : sb));
      } else if (trip.type === 'event_trip') {
        queryClient.setQueryData(['eventTrips'], old => old?.map(et => et.id === trip.id ? { ...et, status: newStatus } : et));
      }

      return { previousBookings, previousRequests, previousSupplierBookings, previousEventTrips };
    },
    onError: (err, variables, context) => {
      if (context?.previousBookings) queryClient.setQueryData(['bookings'], context.previousBookings);
      if (context?.previousRequests) queryClient.setQueryData(['serviceRequests'], context.previousRequests);
      if (context?.previousSupplierBookings) queryClient.setQueryData(['supplierOwnBookings'], context.previousSupplierBookings);
      if (context?.previousEventTrips) queryClient.setQueryData(['eventTrips'], context.previousEventTrips);
      alert('Erro ao atualizar status: ' + err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
      queryClient.invalidateQueries({ queryKey: ['supplierOwnBookings'] });
      queryClient.invalidateQueries({ queryKey: ['eventTrips'] });
    }
  });

  const handleUpdateStatus = (trip, newStatus) => {
    if (!confirm(`Tem certeza que deseja alterar o status para ${newStatus}?`)) return;
    updateStatusMutation.mutate({ trip, newStatus });
  };

  const stats = React.useMemo(() => {
    // Contagens Totais
    const totalTrips = bookings.length + serviceRequests.length + supplierOwnBookings.length + eventTrips.length;
    
    const confirmedTrips = 
      bookings.filter(b => b.status === 'confirmada').length +
      serviceRequests.filter(sr => sr.status === 'confirmada').length +
      supplierOwnBookings.filter(sb => sb.status === 'confirmada').length +
      eventTrips.filter(et => ['confirmada', 'confirmed', 'scheduled'].includes(et.status)).length;

    const pendingTrips = 
      bookings.filter(b => b.status === 'pendente').length +
      serviceRequests.filter(sr => ['rascunho', 'aguardando_fornecedor', 'aguardando_revisao_fornecedor'].includes(sr.status)).length +
      supplierOwnBookings.filter(sb => sb.status === 'pendente').length +
      eventTrips.filter(et => ['pending', 'planned'].includes(et.status)).length;

    const cancelledTrips = 
      bookings.filter(b => b.status === 'cancelada').length +
      serviceRequests.filter(sr => sr.status === 'cancelada').length +
      supplierOwnBookings.filter(sb => sb.status === 'cancelada').length +
      eventTrips.filter(et => et.status === 'cancelled').length;

    const inProgressTrips = 
      serviceRequests.filter(sr => sr.status === 'em_andamento').length +
      supplierOwnBookings.filter(sb => sb.status === 'em_andamento').length +
      eventTrips.filter(et => ['dispatched', 'active', 'em_andamento'].includes(et.status)).length;

    return {
      total: totalTrips,
      confirmed: confirmedTrips,
      pending: pendingTrips,
      cancelled: cancelledTrips,
      inProgress: inProgressTrips,
      
      totalServiceRequests: serviceRequests.length,
      totalEventTrips: eventTrips.length,
      awaitingResponse: serviceRequests.filter(sr => sr.supplier_response_status === 'aguardando_resposta').length,
      timeoutCount: serviceRequests.filter(sr => sr.supplier_response_status === 'timeout').length
    };
  }, [bookings, serviceRequests, supplierOwnBookings, eventTrips]);

  const handleAcceptTrip = (trip) => {
    setAcceptingTrip(trip);
  };

  const handleGenerateTimelineLink = async (trip) => {
    try {
      // Identificar o tipo correto de ID para enviar
      // A função backend espera serviceRequestId para ServiceRequest ou SupplierOwnBooking
      // Se for Booking (particular), verificamos se há suporte (atualmente SharedTripTimeline suporta service_request_id e supplier_own_booking_id)
      
      if (trip.type === 'booking') {
        alert('A linha do tempo ainda não está disponível para reservas particulares diretas.');
        return;
      }

      const response = await base44.functions.invoke('generateSharedTimelineLink', {
        serviceRequestId: trip.id,
        autoGenerated: false
      });

      if (response.data && response.data.timelineUrl) {
        navigator.clipboard.writeText(response.data.timelineUrl);
        alert('Link da linha do tempo copiado para a área de transferência!');
      } else {
        throw new Error(response.data?.error || 'Erro ao gerar link');
      }
    } catch (error) {
      console.error('Erro ao gerar link da timeline:', error);
      alert('Não foi possível gerar o link da timeline. Verifique se a viagem está ativa.');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Formas Abstratas Animadas - Apenas Desktop */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-300/15 to-purple-200/10 rounded-full blur-3xl animate-blob-admin"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-br from-green-300/15 to-blue-200/10 rounded-full blur-3xl animate-blob-admin animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-gradient-to-br from-cyan-200/10 to-blue-300/15 rounded-full blur-3xl animate-blob-admin animation-delay-7000"></div>
      </div>

      <MetaTags 
        title="Painel Administrativo | TransferOnline" 
        description="Gestão completa de reservas, motoristas e financeiro." 
      />
      <div className="max-w-7xl mx-auto p-6 relative z-10">
        {/* Header */}
        <PageHeader 
          title="Painel Administrativo" 
          subtitle="Gerencie suas reservas e tarifas"
        />

        {/* Pending Approvals Alert */}
        {pendingApprovals && pendingApprovals.total > 0 && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <UserPlus className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between w-full">
              <span className="text-amber-800">
                Atenção: Você tem <strong>{pendingApprovals.total}</strong> itens aguardando aprovação 
                ({pendingApprovals.driversCount > 0 ? `${pendingApprovals.driversCount} motoristas, ` : ''}
                 {pendingApprovals.vehiclesCount > 0 ? `${pendingApprovals.vehiclesCount} veículos, ` : ''}
                 {pendingApprovals.invitationsCount > 0 ? `${pendingApprovals.invitationsCount} convites` : ''}).
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white border-amber-300 text-amber-700 hover:bg-amber-100 ml-4"
                onClick={() => navigate(createPageUrl('GerenciarAprovacoes'))}
              >
                Revisar Agora
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <SystemHealthAlert />

        {/* Stats Cards */}
        <DashboardGrid cols={4}>
          <StatCard 
            title="Total de Reservas" 
            value={stats.total} 
            icon={Calendar} 
            variant="blue" 
          />
          <StatCard 
            title="Confirmadas" 
            value={stats.confirmed} 
            icon={CheckCircle} 
            variant="green" 
          />
          <StatCard 
            title="Pendentes" 
            value={stats.pending} 
            icon={Clock} 
            variant="yellow" 
          />
          <StatCard 
            title="Canceladas" 
            value={stats.cancelled} 
            icon={XCircle} 
            variant="red" 
          />
        </DashboardGrid>

        {/* Cards de Status Operacional */}
        <DashboardGrid cols={2}>
          <StatCard 
            title="Aguardando Resposta" 
            value={stats.awaitingResponse} 
            icon={Clock} 
            variant="orange" 
          />
          <StatCard 
            title="Em Andamento" 
            value={stats.inProgress} 
            icon={Navigation} 
            variant="purple" 
          />
        </DashboardGrid>



        {/* Mapa Consolidado de Rastreamento em Tempo Real */}
        {activeTrackingRequests.length > 0 && (
          <div className="mb-8">
            <Suspense fallback={<DashboardLoader />}>
              <ConsolidatedTrackingMap trips={activeTrackingRequests} />
            </Suspense>
          </div>
        )}

        {/* Card de Solicitações Aguardando Aceite - FILTRADAS */}
        {(filteredServiceRequests.filter(sr => ['aguardando_resposta', 'aguardando_fornecedor'].includes(sr.supplier_response_status)).length > 0 || pendingNovaReservaBookings.length > 0) && (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Viagens Aguardando Aceite ({filteredServiceRequests.filter(sr => ['aguardando_resposta', 'aguardando_fornecedor'].includes(sr.supplier_response_status)).length + pendingNovaReservaBookings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingNovaReservaBookings.slice(0, 5).map((booking) => (
                    <PendingTripCard
                      key={booking.id}
                      code={booking.booking_number}
                      badgeLabel="NovaReserva Paga"
                      badgeClassName="bg-yellow-100 text-yellow-800"
                      subtitle="Cliente Particular"
                      passengerName={booking.customer_name}
                      date={booking.date}
                      time={booking.time}
                      route={`${booking.origin} → ${booking.destination}`}
                      detailsLabel="Ver Detalhes"
                      acceptLabel="Aceitar Viagem"
                      onViewDetails={() => setSelectedBooking(booking)}
                      onAccept={() => setAcceptingTrip({
                        id: booking.id,
                        type: 'booking',
                        display_id: booking.booking_number,
                        passenger_name: booking.customer_name,
                        origin: booking.origin,
                        destination: booking.destination,
                        date: booking.date,
                        time: booking.time,
                        price: booking.total_price,
                        original_data: booking,
                      })}
                    />
                  ))}

                  {filteredServiceRequests
                    .filter(sr => ['aguardando_resposta', 'aguardando_fornecedor'].includes(sr.supplier_response_status))
                    .slice(0, 5)
                    .map((request) => {
                      const supplier = suppliers.find(s => s.id === request.chosen_supplier_id);
                      return (
                        <PendingTripCard
                          key={request.id}
                          code={request.request_number}
                          badgeLabel={request.supplier_response_status === 'aguardando_resposta' ? 'Aguardando Resposta' : 'Aguardando Fornecedor'}
                          badgeClassName="bg-amber-100 text-amber-800"
                          subtitle={supplier?.name}
                          passengerName={request.passenger_name}
                          date={request.date}
                          time={request.time}
                          route={`${request.origin} → ${request.destination}`}
                          detailsLabel="Ver Detalhes"
                          acceptLabel="Aceitar Viagem"
                          onViewDetails={() => {
                            setEditingServiceRequest(request);
                            setShowEditServiceRequestDialog(true);
                          }}
                          onAccept={() => setAcceptingTrip({
                            id: request.id,
                            type: 'service_request',
                            display_id: request.request_number,
                            passenger_name: request.passenger_name,
                            origin: request.origin,
                            destination: request.destination,
                            date: request.date,
                            time: request.time,
                            price: request.chosen_client_price || request.chosen_supplier_cost || request.final_client_price_with_additions || 0,
                            original_data: request,
                          })}
                        />
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 z-10" />
                <Input
                  placeholder="Buscar por número, passageiro, solicitante, cliente, fornecedor, motorista, veículo, placa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchTerm.length >= 3 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="pl-10"
                />
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {searchSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer text-sm dark:text-gray-200"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const cleanSuggestion = suggestion.includes(' ') ? suggestion.substring(suggestion.indexOf(' ') + 1) : suggestion;
                          setSearchTerm(cleanSuggestion);
                          setShowSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="aguardando_fornecedor">Aguardando Fornecedor</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="pendente">Pendente (Booking)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtros adicionais e Tabela Unificada */}
        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <Button 
            onClick={() => setShowDriverScheduleDialog(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white mb-[2px]"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Agenda Motoristas
          </Button>

          <div className="w-48">
            <label className="text-xs text-gray-500 font-medium mb-1 block">Tipo de Viagem</label>
            <Select value={tripTypeFilter} onValueChange={setTripTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Viagem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="booking">Particulares</SelectItem>
                <SelectItem value="service_request">Corporativos</SelectItem>
                <SelectItem value="supplier_own_booking">Viagens de Fornecedores</SelectItem>
                <SelectItem value="event_trip">Eventos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <label className="text-xs text-gray-500 font-medium mb-1 block">Atribuição Motorista</label>
            <Select value={driverAssignmentFilter} onValueChange={setDriverAssignmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status Motorista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="assigned">Atribuídos</SelectItem>
                <SelectItem value="unassigned">Pendente Atribuição</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <span className="text-xs text-gray-500 font-medium">Data Início</span>
            <Input 
              type="date" 
              value={dateFilter.start} 
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              className="w-40 bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700"
            />
          </div>

          <div className="grid gap-1">
            <span className="text-xs text-gray-500 font-medium">Data Fim</span>
            <Input 
              type="date" 
              value={dateFilter.end} 
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              className="w-40 bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700"
            />
          </div>

          <div className="w-32">
            <span className="text-xs text-gray-500 font-medium mb-1 block">Linhas por pág.</span>
            <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(dateFilter.start || dateFilter.end) && (
            <Button 
              variant="ghost" 
              onClick={() => setDateFilter({ start: '', end: '' })}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-10"
            >
              Limpar Filtro
            </Button>
          )}
        </div>

        {selectedTrips.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] w-[90%] max-w-3xl bg-white dark:bg-slate-800 border border-blue-600 p-4 rounded-xl shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 ring-1 ring-black/10">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2.5 rounded-full shadow-md">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-gray-900 dark:text-white">{selectedTrips.length} viagens selecionadas</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Crie um link público para compartilhar</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedTrips([])} className="hover:bg-gray-100 border-gray-300">
                Cancelar
              </Button>
              <Button onClick={() => setShowShareDialog(true)} className="bg-blue-600 hover:bg-blue-700 shadow-md text-white font-medium">
                Criar Link
              </Button>
              <Button onClick={() => setShowBulkPaymentDialog(true)} className="bg-green-600 hover:bg-green-700 shadow-md text-white font-medium">
                <CreditCard className="w-4 h-4 mr-1" />
                Link de Pagamento
              </Button>
              <Button onClick={() => setShowScheduleSummaryDialog(true)} className="bg-purple-600 hover:bg-purple-700 shadow-md text-white font-medium">
                <CalendarDays className="w-4 h-4 mr-1" />
                Resumo de Agenda
              </Button>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Todas as Viagens ({filteredTrips.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              </div>
            ) : (
              <Suspense fallback={<DashboardLoader />}>
                <UnifiedTripTable
                  trips={paginatedTrips}
                  tripIdsWithComments={tripsWithComments}
                  onViewDetails={handleViewDetails}
                  onUpdateStatus={handleUpdateStatus}
                  onAccept={handleAcceptTrip}
                  onGenerateTimelineLink={handleGenerateTimelineLink}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  selectedTrips={selectedTrips}
                  onSelectionChange={setSelectedTrips}
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </Suspense>
            )}
          </CardContent>
        </Card>

        <Suspense fallback={null}>
          {/* Booking Details Modal */}
          {selectedBooking && (
            <BookingDetails
              booking={selectedBooking}
              open={!!selectedBooking}
              onClose={() => setSelectedBooking(null)}
              onManageDriver={() => handleManageDriver(selectedBooking, 'booking')}
            />
          )}

          {/* Service Request Edit Dialog */}
          {showEditServiceRequestDialog && (
            <EditServiceRequestDialog
              serviceRequest={editingServiceRequest}
              open={showEditServiceRequestDialog}
              onClose={() => {
                setShowEditServiceRequestDialog(false);
                setEditingServiceRequest(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
              }}
              onManageDriver={() => handleManageDriver(editingServiceRequest, 'service_request')}
              onAccept={handleAcceptTrip}
            />
          )}

          {showEditEventTripDialog && (
            <EditTripDialog
              open={showEditEventTripDialog}
              onOpenChange={setShowEditEventTripDialog}
              eventTripId={editingEventTrip?.id}
              eventTrip={editingEventTrip}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['eventTrips'] });
                setEditingEventTrip(null);
              }}
            />
          )}

          {selectedSupplierBooking && (
            <SupplierOwnBookingDetailsDialog
              booking={selectedSupplierBooking}
              open={!!selectedSupplierBooking}
              onClose={() => setSelectedSupplierBooking(null)}
              onManageDriver={() => handleManageDriver(selectedSupplierBooking, 'supplier_own_booking')}
              onEdit={(booking) => {
                setEditingSupplierBooking(booking);
                setShowEditSupplierBookingDialog(true);
                setSelectedSupplierBooking(null);
              }}
            />
          )}

          {showEditSupplierBookingDialog && (
            <SupplierBookingDialog
              open={showEditSupplierBookingDialog}
              onOpenChange={setShowEditSupplierBookingDialog}
              bookingToEdit={editingSupplierBooking}
              supplierId={editingSupplierBooking?.supplier_id}
            />
          )}

          {managingDriverTrip && (
            <AdminManageDriverDialog
              trip={managingDriverTrip}
              type={managingDriverType}
              open={!!managingDriverTrip}
              onClose={() => {
                setManagingDriverTrip(null);
                setManagingDriverType(null);
              }}
            />
          )}

          {acceptingTrip && (
            <AdminAcceptRequestDialog
              open={!!acceptingTrip}
              trip={acceptingTrip}
              onClose={() => setAcceptingTrip(null)}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['bookings'] });
                queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
                queryClient.invalidateQueries({ queryKey: ['supplierOwnBookings'] });
              }}
            />
          )}

          {showShareDialog && (
            <ShareTripsDialog
              open={showShareDialog}
              onClose={() => setShowShareDialog(false)}
              selectedTrips={allTrips.filter(t => selectedTrips.includes(t.id))}
            />
          )}

          {showDriverScheduleDialog && (
            <DriverScheduleDialog
              isOpen={showDriverScheduleDialog}
              onClose={() => setShowDriverScheduleDialog(false)}
              drivers={allDrivers}
              allTrips={[]} // The dialog fetches its own trips via getDriverSchedule
            />
          )}

          {showBulkPaymentDialog && (
            <BulkPaymentLinkDialog
              open={showBulkPaymentDialog}
              onClose={() => setShowBulkPaymentDialog(false)}
              selectedTrips={allTrips.filter(t => selectedTrips.includes(t.id))}
            />
          )}

          {showScheduleSummaryDialog && (
            <TripScheduleSummaryDialog
              open={showScheduleSummaryDialog}
              onClose={() => setShowScheduleSummaryDialog(false)}
              selectedTrips={allTrips.filter(t => selectedTrips.includes(t.id))}
            />
          )}
        </Suspense>
      </div>

      <style>{`
        @keyframes blob-admin {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          50% {
            transform: translate(-50px, 50px) scale(1.2);
          }
        }

        .animate-blob-admin {
          animation: blob-admin 30s infinite ease-in-out;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animation-delay-7000 {
          animation-delay: 7s;
        }
      `}</style>
    </div>
  );
}