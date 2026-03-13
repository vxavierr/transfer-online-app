import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Settings, Users, Truck, Calendar, MapPin, Search, Filter, PlayCircle, FileText, Trash2, Plus, ArrowUpDown, CheckSquare, ArrowRight, Plane, CheckCircle, User, QrCode, AlertCircle, Package, Pencil, Briefcase, X, Send, ChevronDown, ChevronUp, DollarSign, Link2, Share2, Copy, Map, RefreshCw, PhoneOff, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { useQuery } from '@tanstack/react-query';
import BoardingPassModal from "@/components/BoardingPassModal";
import TripPassengersDialog from "@/components/event/TripPassengersDialog";
import ShareEventLinkDialog from "@/components/event/ShareEventLinkDialog";
import EventTripAdditionalItemsDialog from "@/components/event/EventTripAdditionalItemsDialog";
import EventFinancialReport from "@/components/event/EventFinancialReport";
import EventClientReport from "@/components/event/EventClientReport";
import EditPassengerDialog from "@/components/event/EditPassengerDialog";
import EventServicesManager from "@/components/event/EventServicesManager";
import SortOrderSelector from "@/components/event/SortOrderSelector";
import EditTripDialog from "@/components/event/EditTripDialog";
import LocationAutocomplete from "@/components/booking/LocationAutocomplete";
import DriverNotificationPreviewDialog from "@/components/event/DriverNotificationPreviewDialog";
import MissingPhonePassengersDialog from "@/components/event/MissingPhonePassengersDialog";
import DriverScheduleDialog from "@/components/event/DriverScheduleDialog";

export default function EventDetails() {
  // Force rebuild - v2
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("id");
  const initialTab = urlParams.get("tab");
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);

  const { data: additionalItems = [] } = useQuery({
      queryKey: ['additionalItems'],
      queryFn: () => base44.entities.AdditionalItem.filter({ active: true }),
      staleTime: 5 * 60 * 1000 // 5 minutos
  });

  const formatPrice = (value) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Helper for safe date formatting (Prevents day shift)
  const safeFormat = (dateStr, fmtStr) => {
      if (!dateStr) return '-';
      // Add T12:00:00 to ensure it falls in the middle of the day for any american timezone if it's just a date string
      const date = new Date((dateStr.length === 10 && !dateStr.includes('T')) ? `${dateStr}T12:00:00` : dateStr);
      if (!isValid(date)) return '-';
      return format(date, fmtStr, { locale: ptBR });
  };
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState([]);
  const [trips, setTrips] = useState([]);

  // Computed trip stats
  const cancelledTripsCount = trips.filter(t => t.status === 'cancelled' || t.driver_trip_status === 'cancelada_motorista').length;
  const activeTripsCount = trips.length - cancelledTripsCount;
  const [activeTab, setActiveTab] = useState(initialTab || "passengers");
  const [reportMode, setReportMode] = useState("client"); // 'client' or 'financial'
  const [supplierVehicles, setSupplierVehicles] = useState([]);
  const [showAllPassengers, setShowAllPassengers] = useState(false); // Toggle to show grouped passengers
  const [passengerSearch, setPassengerSearch] = useState(""); // Passenger search filter
  const [eventAddresses, setEventAddresses] = useState([]); // Endereços já utilizados no evento
  
  // State for Logistics Generation Dialog
  const [showLogisticsDialog, setShowLogisticsDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logisticsParams, setLogisticsParams] = useState({
    max_wait_time_minutes: 60,
    max_group_duration_minutes: 120,
    trip_type_filter: "all", // all, IN, OUT, airport_transfer
    vehicle_capacities: [], // Will be populated from supplier vehicles
    date_filter: "all",
    origin_filter: "all",
    destination_filter: "all",
    pickup_lead_time_hours: 0 // Default 0 hours for OUT trips
  });

  // Computed unique values for filters
  const uniqueDates = React.useMemo(() => {
      const dates = new Set(passengers.map(p => p.date || p.flight_date).filter(Boolean));
      return Array.from(dates).sort();
  }, [passengers]);



  // Manual Trip State
  const [selectedPassengers, setSelectedPassengers] = useState([]);
  const [showManualTripDialog, setShowManualTripDialog] = useState(false);
  const [manualTripVehicle, setManualTripVehicle] = useState("");
  const [manualTripPrice, setManualTripPrice] = useState("");
  const [manualTripType, setManualTripType] = useState("transfer");
  const [manualTripCapacity, setManualTripCapacity] = useState("");
  const [manualTripPickupLeadTime, setManualTripPickupLeadTime] = useState(0);
  const [manualTripAdditionalItems, setManualTripAdditionalItems] = useState([]);
  // Agora suporta múltiplos níveis de ordenação. Ex: [{key: 'date', direction: 'asc'}, {key: 'time', direction: 'asc'}]
  const [sortConfig, setSortConfig] = useState([{ key: 'date', direction: 'asc' }, { key: 'time', direction: 'asc' }, { key: 'name', direction: 'asc' }]);

  // Driver Assignment State
  const [showDriverDialog, setShowDriverDialog] = useState(false);
  const [selectedTripForDriver, setSelectedTripForDriver] = useState(null);
  const [driverForm, setDriverForm] = useState({ 
  driverId: 'none', 
  subcontractorId: 'none',
  coordinatorIds: [],
  vehicleId: 'none',
  payoutAmount: '',
  subcontractorCost: '',
  eventualName: '',
  eventualEmail: '',
  eventualPhone: '',
  eventualVehicleModel: '',
  eventualVehiclePlate: '',
  coordinatorCanStartTrip: false,
  tripStatus: 'aguardando',
  useCasualDriverId: 'none', // ID do motorista avulso salvo
  saveCasualDriver: false // Checkbox para salvar
  });
  const [drivers, setDrivers] = useState([]);
  const [driverVehicles, setDriverVehicles] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [casualDrivers, setCasualDrivers] = useState([]); // Motoristas avulsos salvos
  
  // Boarding Pass State
  const [showBoardingPass, setShowBoardingPass] = useState(false);
  const [boardingPassData, setBoardingPassData] = useState([]);
  const [showPassengerListDialog, setShowPassengerListDialog] = useState(false);
  const [selectedTripForPasses, setSelectedTripForPasses] = useState(null);
  
  // Share Link State
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedTripsForShare, setSelectedTripsForShare] = useState([]);

  // Review Subcontractor Info
  const [reviewTripInfo, setReviewTripInfo] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Notification Preview
  const [showNotificationPreview, setShowNotificationPreview] = useState(false);
  const [tripToNotify, setTripToNotify] = useState(null);

  // New: Additional Items Dialog
  const [showAdditionalItemsDialog, setShowAdditionalItemsDialog] = useState(false);
  const [selectedTripForItems, setSelectedTripForItems] = useState(null);
  const [editTripDialogTrip, setEditTripDialogTrip] = useState(null);

  // New: Add Passenger to Existing Trip
  const [showAddPassengerDialog, setShowAddPassengerDialog] = useState(false);
  const [targetTripForAdd, setTargetTripForAdd] = useState(null);
  const [passengersToAdd, setPassengersToAdd] = useState([]);
  const [addPassengerSearch, setAddPassengerSearch] = useState("");
  const [addPassengerOnlyFlexible, setAddPassengerOnlyFlexible] = useState(false); // NEW STATE
  const [replicateSelectedPassengers, setReplicateSelectedPassengers] = useState(false); // Replicate instead of transfer
  const [addPassengerDialogActiveTab, setAddPassengerDialogActiveTab] = useState("existing");
  const [newPassengerData, setNewPassengerData] = useState({
    passenger_name: '',
    passenger_email: '',
    passenger_phone: '',
    document_id: '',
    trip_type: 'airport_transfer',
    flight_number: '',
    airline: ''
  });

  // New: Create Empty Trip
  const [showEmptyTripDialog, setShowEmptyTripDialog] = useState(false);
  const [emptyTripForm, setEmptyTripForm] = useState({
      date: "",
      time: "",
      origin: "",
      destination: "",
      stops: [], // Array of { address: '', notes: '' }
      vehicleType: "",
      tripType: "transfer",
      clientPrice: "",
      partnerNotes: "",
      selectedAdditionalItems: []
  });

  const [showAddPassengersConfirmation, setShowAddPassengersConfirmation] = useState(false);
  const [showAddMorePassengersConfirm, setShowAddMorePassengersConfirm] = useState(false);
  const [newlyCreatedTripId, setNewlyCreatedTripId] = useState(null);

  // New Logistics UX State
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grouped'
  const [quickFilters, setQuickFilters] = useState({
      date: [], // Array para múltiplas datas
      time: "all", // Novo filtro de horário
      type: "all",
      origin: "all",
      destination: "all"
  });
  const [expandedGroups, setExpandedGroups] = useState({}); // { 'groupKey': true }
  const [expandedTripPassengers, setExpandedTripPassengers] = useState({}); // { 'tripId': true }

  const uniqueTimes = React.useMemo(() => {
      let filteredPassengers = passengers;
      if (quickFilters.date && quickFilters.date.length > 0) {
          filteredPassengers = passengers.filter(p => quickFilters.date.includes(p.date || p.flight_date));
      }
      const times = new Set(filteredPassengers.map(p => p.time || p.flight_time).filter(Boolean));
      return Array.from(times).sort();
  }, [passengers, quickFilters.date]);

  // Computed unique values for filters (Dynamic based on selected Date)
  const uniqueOrigins = React.useMemo(() => {
      let filteredPassengers = passengers;
      if (quickFilters.date && quickFilters.date.length > 0) {
          filteredPassengers = passengers.filter(p => quickFilters.date.includes(p.date || p.flight_date));
      }
      const origins = new Set(filteredPassengers.map(p => p.arrival_point || p.origin_address).filter(Boolean));
      return Array.from(origins).sort();
  }, [passengers, quickFilters.date]);

  const uniqueDestinations = React.useMemo(() => {
      let filteredPassengers = passengers;
      if (quickFilters.date && quickFilters.date.length > 0) {
          filteredPassengers = passengers.filter(p => quickFilters.date.includes(p.date || p.flight_date));
      }
      const dests = new Set(filteredPassengers.map(p => p.destination_address).filter(Boolean));
      return Array.from(dests).sort();
  }, [passengers, quickFilters.date]);

  const toggleTripPassengers = (tripId) => {
      setExpandedTripPassengers(prev => ({
          ...prev,
          [tripId]: !prev[tripId]
      }));
  };
  
  // Logistics Filters
  const [logisticsFilters, setLogisticsFilters] = useState({
      driverStatus: "all", // all, pending, assigned
      vehicleType: "all",
      date: "all",
      driverFilter: "all", // NEW: filter by specific driver
      coordinatorFilter: "all", // NEW: filter by coordinator
      partnerFilter: "all",
      originFilter: "all",
      destinationFilter: "all",
      flightFilter: "all",
      tripType: "all",
      missingPhoneFilter: "all",
      search: ""
  });

  // Edit Passenger State
  const [editPassengerDialogOpen, setEditPassengerDialogOpen] = useState(false);
  const [passengerToEdit, setPassengerToEdit] = useState(null);
  
  // Missing Phone Dialog
  const [showMissingPhoneDialog, setShowMissingPhoneDialog] = useState(false);

  // Driver Schedule Dialog
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedTripForSchedule, setSelectedTripForSchedule] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [tripToCancel, setTripToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const handleOpenSchedule = (trip = null) => {
      setSelectedTripForSchedule(trip);
      setShowScheduleDialog(true);
  };

  const handleAssignDriverFromSchedule = async (driverId) => {
      if (!selectedTripForSchedule) return;
      
      const toastId = toast.loading("Atribuindo motorista...");
      try {
          const response = await base44.functions.invoke('updateEventTripDriver', {
              tripId: selectedTripForSchedule.id,
              driverId: driverId
          });

          if (response.data && response.data.success) {
              toast.success("Motorista atribuído com sucesso!", { id: toastId });
              setShowScheduleDialog(false);
              setSelectedTripForSchedule(null);
              loadEventData();
          } else {
              throw new Error(response.data?.error || "Falha ao atribuir");
          }
      } catch (err) {
          console.error(err);
          toast.error("Erro ao atribuir: " + err.message, { id: toastId });
      }
  };

  const handleExportPendingTrips = async () => {
    if (!eventId) {
        toast.error("ID do Evento não encontrado.");
        return;
    }

    const toastId = toast.loading("Gerando planilha de pendências...");
    try {
        const response = await base44.functions.invoke('exportPendingTrips', { eventId });

        // Check if response is JSON (error or message) or Blob (file)
        const contentType = response.headers['content-type'];
        
        if (contentType && contentType.includes('application/json')) {
             // It's a JSON response (likely an error or "no data" message)
             const json = response.data; // axios automatically parses JSON
             if (json.error) throw new Error(json.error);
             if (json.message) {
                 toast.info(json.message, { id: toastId });
                 return;
             }
        }

        if (response.status === 200 && response.data) {
            // Check if it's an ArrayBuffer/Blob (the file)
            let blob;
            if (response.data instanceof ArrayBuffer || response.data instanceof Blob) {
                 blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            } else {
                // Fallback: try to see if it's a JSON hidden in text
                try {
                    // Sometimes axios returns object if content-type was json but we expected blob
                    if (response.data.message) {
                        toast.info(response.data.message, { id: toastId });
                        return;
                    }
                } catch(e) {}
                // If we are here, assume it's data for the blob
                blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${event?.event_name?.replace(/[^a-zA-Z0-9]/g, '_')}_Viagens_Pendentes.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast.success("Planilha exportada com sucesso!", { id: toastId });
        } else {
            throw new Error("Resposta inválida do servidor.");
        }
    } catch (err) {
        console.error("Export error:", err);
        // Try to extract error message from response object if available
        let msg = err.message || "Erro desconhecido";
        if (err.response && err.response.data) {
            try {
                // If response data is ArrayBuffer, decode it
                if (err.response.data instanceof ArrayBuffer) {
                    const text = new TextDecoder().decode(err.response.data);
                    const json = JSON.parse(text);
                    if (json.error) msg = json.error;
                } else if (err.response.data.error) {
                    msg = err.response.data.error;
                }
            } catch(e) {}
        }
        toast.error("Erro ao exportar: " + msg, { id: toastId });
    }
  };

  const getTripStatusBadge = (status) => {
      const statusMap = {
          'aguardando': { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
          'a_caminho': { label: 'A Caminho', color: 'bg-blue-100 text-blue-800 border-blue-200' },
          'chegou_origem': { label: 'Na Origem', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
          'passageiro_embarcou': { label: 'Embarcado', color: 'bg-green-100 text-green-800 border-green-200' },
          'a_caminho_destino': { label: 'Em Rota', color: 'bg-blue-50 text-blue-700 border-blue-200' },
          'chegou_destino': { label: 'No Destino', color: 'bg-teal-100 text-teal-800 border-teal-200' },
          'finalizada': { label: 'Finalizada', color: 'bg-gray-100 text-gray-800 border-gray-200' },
          'no_show': { label: 'No Show', color: 'bg-red-100 text-red-800 border-red-200' },
          'cancelada_motorista': { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200' },
          'parada_adicional': { label: 'Em Parada', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      };
      
      const config = statusMap[status] || { label: status || 'Pendente', color: 'bg-gray-100 text-gray-600 border-gray-200' };
      
      return (
          <Badge className={`border ${config.color} font-medium`}>
              {config.label}
          </Badge>
      );
  };

  const handleEditPassenger = (passenger) => {
      setPassengerToEdit(passenger);
      setEditPassengerDialogOpen(true);
  };

  const updatePassengerBoardingStatus = async (passengerId, newStatus) => {
      try {
          // Otimistic Update
          setPassengers(prev => prev.map(p => 
              p.id === passengerId ? { ...p, boarding_status: newStatus } : p
          ));

          await base44.entities.EventPassenger.update(passengerId, { boarding_status: newStatus });
          toast.success("Status atualizado!");
          
          // Background refresh to ensure consistency
          loadEventData(); 
      } catch (error) {
          console.error("Erro ao atualizar status:", error);
          toast.error("Erro ao atualizar status.");
          loadEventData(); // Revert on error
      }
  };

  useEffect(() => {
    if (!eventId) {
      navigate("/GerenciarEventos");
      return;
    }
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    setLoading(true);
    try {
      const eventData = await base44.entities.Event.get(eventId);
      setEvent(eventData);

      // Load initial passengers (limit increased to ensure accurate counts)
      const passengersData = await base44.entities.EventPassenger.filter({ event_id: eventId }, {}, 5000);
      setPassengers(passengersData);

      // Load trips
      // Sort by date ascending
      const tripsData = await base44.entities.EventTrip.filter({ event_id: eventId }, 'date', 500);
      
      // Enrich trips with driver names (Batch Fetch)
      const driverIdsForTrips = [...new Set(tripsData.map(t => t.driver_id).filter(Boolean))];
      let driversMap = {};
      
      if (driverIdsForTrips.length > 0) {
          try {
              // Batch fetch drivers to avoid 429 errors
              const driversList = await base44.entities.Driver.filter({ id: { $in: driverIdsForTrips } });
              driversList.forEach(d => { driversMap[d.id] = d; });
          } catch (err) {
              console.error("Error batch fetching drivers:", err);
          }
      }

      const enrichedTrips = tripsData.map(trip => {
          if (trip.driver_id && driversMap[trip.driver_id]) {
              return { ...trip, driver_name: driversMap[trip.driver_id].name };
          }
          return trip;
      });
      
      setTrips(enrichedTrips.sort((a, b) => {
        const timeA = a.start_time?.length === 5 ? a.start_time : (a.start_time || '00:00');
        const timeB = b.start_time?.length === 5 ? b.start_time : (b.start_time || '00:00');
        const dateA = `${a.date}T${timeA}`;
        const dateB = `${b.date}T${timeB}`;
        return dateA.localeCompare(dateB);
      }));

      // Coletar endereços únicos das viagens existentes para sugestão
      const collectedAddresses = new Set();
      enrichedTrips.forEach(trip => {
          if (trip.origin) collectedAddresses.add(trip.origin);
          if (trip.destination) collectedAddresses.add(trip.destination);
          if (trip.additional_stops && Array.isArray(trip.additional_stops)) {
              trip.additional_stops.forEach(stop => {
                  if (stop.address) collectedAddresses.add(stop.address);
              });
          }
      });
      // Também coletar dos passageiros se necessário (opcional, mas útil)
      passengersData.forEach(p => {
          if (p.origin_address) collectedAddresses.add(p.origin_address);
          if (p.destination_address) collectedAddresses.add(p.destination_address);
          if (p.arrival_point) collectedAddresses.add(p.arrival_point);
      });
      setEventAddresses(Array.from(collectedAddresses).sort());

      // Load Supplier Data (Parallelized to avoid waterfall)
      let vehicles = [];
      
      // Fetch casual drivers for this event (Independent of supplier)
      try {
          const eventCasualDrivers = await base44.entities.EventCasualDriver.filter({ event_id: eventId, active: true });
          setCasualDrivers(eventCasualDrivers);
      } catch (e) {
          console.error("Error loading casual drivers:", e);
      }

      if (eventData.supplier_id) {
          try {
              const [
                  supplierVehiclesData,
                  supplierDrivers,
                  supplierSubcontractors,
                  supplierCoordinators
              ] = await Promise.all([
                  base44.entities.SupplierVehicleType.filter({ supplier_id: eventData.supplier_id, active: true }),
                  base44.entities.Driver.filter({ supplier_id: eventData.supplier_id, active: true }),
                  base44.entities.Subcontractor.filter({ supplier_id: eventData.supplier_id, active: true }),
                  base44.entities.Coordinator.filter({ supplier_id: eventData.supplier_id, active: true })
              ]);

              vehicles = supplierVehiclesData;
              setSupplierVehicles(supplierVehiclesData);
              setDrivers(supplierDrivers);
              setSubcontractors(supplierSubcontractors);
              setCoordinators(supplierCoordinators);

              // Fetch vehicles for all drivers (Batch Fetch)
              let allVehicles = [];
              if (supplierDrivers.length > 0) {
                  const driverIds = supplierDrivers.map(d => d.id);
                  try {
                      allVehicles = await base44.entities.DriverVehicle.filter({ driver_id: { $in: driverIds }, active: true });
                  } catch (err) {
                      console.error("Error batch fetching vehicles:", err);
                  }
              }
              setDriverVehicles(allVehicles);
          } catch (err) {
              console.error("Error loading supplier data:", err);
              toast.error("Erro parcial ao carregar dados do fornecedor.");
          }
      }

      // Initialize params from event if available, otherwise use supplier vehicles
      let initialVehicles = [];
      
      if (vehicles.length > 0) {
          setManualTripAdditionalItems([]); // Reset additional items
          // Use supplier vehicles as base
          initialVehicles = vehicles.map(v => ({
              vehicle_type: v.name,
              capacity: v.max_passengers,
              selected: true // Default to selected
          }));
      } else {
          // Fallback defaults
           initialVehicles = [
              { vehicle_type: "sedan", capacity: 3, selected: true },
              { vehicle_type: "van", capacity: 15, selected: true }
          ];
      }

      setLogisticsParams({
          max_wait_time_minutes: 60,
          max_group_duration_minutes: 120,
          trip_type_filter: "all",
          vehicle_capacities: initialVehicles
      });

    } catch (error) {
      console.error("Erro ao carregar evento:", error);
      toast.error("Erro", {
        description: "Não foi possível carregar os dados do evento."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRunLogistics = async (useAI = false) => {
    // Filter only selected vehicles
    const activeVehicles = logisticsParams.vehicle_capacities.filter(v => v.selected);

    // Validar se tem pelo menos um veículo configurado
    if (activeVehicles.length === 0) {
        toast.error("Configuração inválida", {
            description: "Selecione pelo menos um tipo de veículo para o agrupamento."
        });
        return;
    }

    // Validar se todos os veículos têm nome e capacidade > 0
    const invalidVehicles = activeVehicles.some(v => !v.vehicle_type || v.capacity <= 0);
    if (invalidVehicles) {
        toast.error("Configuração inválida", {
            description: "Todos os veículos selecionados devem ter capacidade maior que zero."
        });
        return;
    }

    // Validar se há passageiros para processar
    const pendingCount = passengers.filter(p => p.status === 'pending').length;
    if (pendingCount === 0) {
        toast.error("Nenhum passageiro pendente", {
            description: "Não há passageiros disponíveis para agrupar. Todos já foram alocados."
        });
        return;
    }

    setIsGenerating(true);
    try {
        // Clean filters before sending (convert "all" to null/undefined)
        const cleanParams = { ...logisticsParams };
        if (cleanParams.date_filter === "all") delete cleanParams.date_filter;
        if (cleanParams.origin_filter === "all") delete cleanParams.origin_filter;
        if (cleanParams.destination_filter === "all") delete cleanParams.destination_filter;

        const payload = {
            eventId: eventId,
            parameters: {
                ...cleanParams,
                vehicle_capacities: activeVehicles // Send only active ones
            }
        };

        // Escolher função baseado no modo (IA ou Manual)
        const functionName = useAI ? 'generateAILogistics' : 'groupEventPassengers';
        const response = await base44.functions.invoke(functionName, payload);

        if (response.data && response.data.success) {
            const aiSummary = response.data.optimization_summary ? `\n\n${response.data.optimization_summary}` : '';
            toast.success(useAI ? "🤖 Logística Otimizada por IA!" : "Logística Gerada!", {
                description: `${response.data.tripsCreated} viagens criadas com sucesso.${aiSummary}`,
                className: "bg-green-50 border-green-200",
                duration: 5000
            });
            setShowLogisticsDialog(false);
            loadEventData(); // Reload data
            setActiveTab("logistics");
        } else {
            throw new Error(response.data?.error || "Erro desconhecido");
        }
    } catch (error) {
        console.error("Erro ao gerar logística:", error);
        toast.error("Erro", {
            description: error.message || "Falha ao agrupar passageiros."
        });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCloneTrip = async (trip) => {
      if (!confirm(`Deseja clonar a viagem "${trip.name}"? \n\nIsso criará uma nova viagem com os mesmos detalhes. Se houver passageiros, eles também serão copiados para a nova viagem.`)) return;

      const toastId = toast.loading("Clonando viagem...");
      try {
          const response = await base44.functions.invoke('cloneEventTrip', {
              tripId: trip.id,
              includePassengers: true
          });

          if (response.data && response.data.success) {
              toast.success("Viagem clonada com sucesso!", { id: toastId });
              await loadEventData(); // Recarrega os dados primeiro

              // Pergunta se quer editar a nova viagem
              setTimeout(async () => {
                  if (confirm("Deseja editar a nova viagem agora (ajustar data/hora, inverter rota)?")) {
                      // Busca a nova viagem nos dados recarregados ou busca direto do backend se ainda não estiver no state
                      // Como o loadEventData é async, pode demorar um pouco para o state atualizar.
                      // Vamos buscar a viagem individualmente para garantir
                      try {
                          const newTrip = await base44.entities.EventTrip.get(response.data.newTripId);
                          if (newTrip) {
                              setEditTripDialogTrip(newTrip);
                          }
                      } catch (err) {
                          console.error("Erro ao buscar nova viagem para edição", err);
                          toast.error("Não foi possível abrir a edição automática. Tente editar na lista.");
                      }
                  }
              }, 500); // Pequeno delay para UX
          } else {
              throw new Error(response.data?.error || "Erro ao clonar");
          }
      } catch (error) {
          console.error("Erro ao clonar:", error);
          toast.error("Erro ao clonar viagem: " + error.message, { id: toastId });
      }
  };

  const handleUngroupTrip = async (trip) => {
    if (!window.confirm(`Tem certeza que deseja desagrupar a viagem "${trip.name}"? Os passageiros voltarão para a lista de pendentes.`)) {
        return;
    }

    setLoading(true);
    try {
        const response = await base44.functions.invoke('ungroupEventTrip', { tripId: trip.id });

        if (response.data && response.data.success) {
            toast.success("Viagem Desagrupada", {
                description: response.data.message,
                className: "bg-green-50 border-green-200"
            });
            loadEventData(); // Recarrega tudo para atualizar as listas
        } else {
            throw new Error(response.data?.error || "Erro ao desagrupar");
        }
    } catch (error) {
        console.error("Erro ao desagrupar:", error);
        toast.error("Erro", {
            description: error.message
        });
    } finally {
        setLoading(false);
    }
  };

  const handleToggleFlexibleAllocation = async (passengerIds) => {
      try {
          const passengers = allPassengers.filter(p => passengerIds.includes(p.id));
          const currentlyFlexible = passengers.some(p => p.is_flexible_allocation);

          const confirmMsg = currentlyFlexible 
              ? `Desmarcar ${passengerIds.length} passageiro(s) como "Porta a Porta"? Eles serão atribuídos a veículos fixos.`
              : `Marcar ${passengerIds.length} passageiro(s) como "Porta a Porta"? Eles poderão embarcar em qualquer veículo disponível.`;

          if (!confirm(confirmMsg)) return;

          for (const passengerId of passengerIds) {
              await base44.entities.EventPassenger.update(passengerId, {
                  is_flexible_allocation: !currentlyFlexible,
                  event_trip_id: currentlyFlexible ? null : undefined // Clear assignment if enabling flexible
              });
          }

          toast.success(currentlyFlexible ? "Alocação Fixa Restaurada" : "Porta a Porta Ativado", {
              description: `${passengerIds.length} passageiro(s) atualizado(s)`,
              className: "bg-green-50 border-green-200"
          });

          fetchPassengers();
          setSelectedPassengers([]);
      } catch (error) {
          console.error('Error toggling flexible allocation:', error);
          toast.error("Erro", {
              description: "Erro ao atualizar alocação"
          });
      }
  };

  const handleCreateManualTrip = async () => {
    if (!manualTripVehicle) {
        toast.error("Selecione um veículo");
        return;
    }

    setIsGenerating(true);
    try {
        // Find capacity for selected vehicle from supplier vehicles list or logistics params
        let capacity = manualTripCapacity;
        if (!capacity) {
            capacity = 4;
            const supplierVehicle = supplierVehicles.find(v => v.name === manualTripVehicle);
            
            if (supplierVehicle) {
                capacity = supplierVehicle.max_passengers;
            } else {
                const logisticsVehicle = logisticsParams.vehicle_capacities.find(v => v.vehicle_type === manualTripVehicle);
                if (logisticsVehicle) capacity = logisticsVehicle.capacity;
            }
        }

        const response = await base44.functions.invoke('createManualEventTrip', {
            eventId,
            passengerIds: selectedPassengers,
            vehicleType: manualTripVehicle,
            vehicleCapacity: capacity,
            clientPrice: manualTripPrice,
            tripType: manualTripType,
            pickupLeadTimeHours: manualTripPickupLeadTime,
            additionalItems: manualTripAdditionalItems
        });

        if (response.data && response.data.success) {
            toast.success("Viagem Criada!", {
                description: "Passageiros agrupados com sucesso.",
                className: "bg-green-50 border-green-200"
            });
            setShowManualTripDialog(false);
            setSelectedPassengers([]);
            setManualTripVehicle("");
            setManualTripPrice("");
            setManualTripType("transfer");
            setManualTripAdditionalItems([]);
            loadEventData();
            } else {
            throw new Error(response.data?.error || "Erro ao criar viagem");
            }
    } catch (error) {
        console.error("Erro manual trip:", error);
        toast.error("Erro", { description: error.message });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCreateEmptyTrip = async () => {
      if (!emptyTripForm.date || !emptyTripForm.time || !emptyTripForm.origin || !emptyTripForm.destination || !emptyTripForm.vehicleType) {
          toast.error("Campos obrigatórios", { description: "Preencha todos os campos." });
          return;
      }

      setIsGenerating(true);
      try {
          const selectedVehicle = supplierVehicles.find(v => v.name === emptyTripForm.vehicleType);
          const defaultCapacity = selectedVehicle ? selectedVehicle.max_passengers : 4;
          const capacity = emptyTripForm.capacity || defaultCapacity;

          const response = await base44.functions.invoke('createManualEventTrip', {
              eventId,
              passengerIds: [], // Empty
              vehicleType: emptyTripForm.vehicleType,
              vehicleCapacity: capacity,
              date: emptyTripForm.date,
              time: emptyTripForm.time,
              origin: emptyTripForm.origin,
              destination: emptyTripForm.destination,
              tripType: emptyTripForm.tripType,
              clientPrice: emptyTripForm.clientPrice,
              partnerNotes: emptyTripForm.partnerNotes,
              stops: emptyTripForm.stops,
              additionalItems: emptyTripForm.selectedAdditionalItems
          });

          if (response.data && response.data.success) {
              toast.success("Viagem Criada!", { className: "bg-green-50 border-green-200" });
              setShowEmptyTripDialog(false);
              
              if (response.data.tripId) {
                  setNewlyCreatedTripId(response.data.tripId);
                  setShowAddPassengersConfirmation(true);
              }

              setEmptyTripForm({ date: "", time: "", origin: "", destination: "", stops: [], vehicleType: "", tripType: "transfer", clientPrice: "", partnerNotes: "", selectedAdditionalItems: [] });
              loadEventData();
          } else {
              throw new Error(response.data?.error || "Erro ao criar");
          }
      } catch (err) {
          toast.error("Erro", { description: err.message });
      } finally {
          setIsGenerating(false);
      }
  };

  const handleBulkFlexibleAllocation = async (isFlexible) => {
      if (selectedTripsForShare.length === 0) return;

      const actionName = isFlexible ? "Tornar Flexível (Porta a Porta)" : "Remover Flexibilidade";
      if (!confirm(`Tem certeza que deseja ${actionName} para todos os passageiros das ${selectedTripsForShare.length} viagens selecionadas?`)) return;

      setLoading(true); // Using loading state instead of isGenerating for main UI
      try {
          const response = await base44.functions.invoke('bulkUpdateFlexibleAllocation', {
              tripIds: selectedTripsForShare,
              isFlexible: isFlexible
          });

          if (response.data && response.data.success) {
              toast.success("Atualizado com Sucesso", {
                  description: response.data.message
              });
              loadEventData();
              setSelectedTripsForShare([]);
          } else {
              throw new Error(response.data?.error || "Erro ao atualizar");
          }
      } catch (error) {
          console.error("Erro bulk flexible:", error);
          toast.error("Erro", { description: error.message });
      } finally {
          setLoading(false);
      }
  };

  const handleRefreshETA = async (trip) => {
      const toastId = toast.loading("Calculando ETA...");
      try {
          const response = await base44.functions.invoke('refreshTripETA', { tripId: trip.id });

          if (response.data && response.data.success) {
              toast.success(`ETA Atualizado: ${response.data.data.eta_duration_text}`, { id: toastId });

              // Optimistic update
              setTrips(prev => prev.map(t => {
                  if (t.id === trip.id) {
                      return {
                          ...t,
                          ...response.data.data
                      };
                  }
                  return t;
              }));
          } else {
              throw new Error(response.data?.error || "Erro ao calcular");
          }
      } catch (error) {
          console.error(error);
          toast.error("Erro ao calcular ETA", { id: toastId });
      }
  };

  const handleBulkDelete = async () => {
  if (!confirm(`Tem certeza que deseja excluir ${selectedPassengers.length} passageiros permanentemente?`)) return;

  setIsGenerating(true);
    try {
        const response = await base44.functions.invoke('bulkDeletePassengers', {
            passengerIds: selectedPassengers,
            eventId: eventId
        });

        if (response.data && response.data.success) {
            toast.success(`${response.data.count} passageiros excluídos`);
            setSelectedPassengers([]);
            loadEventData();
        } else {
            throw new Error(response.data?.error || "Erro ao excluir");
        }
    } catch (error) {
        console.error(error);
        toast.error("Erro", { description: error.message });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleReviewSubcontractorInfo = async (status) => {
      if (!reviewTripInfo) return;
      if (status === 'rejected' && !rejectionReason.trim()) {
          toast.error("Motivo da rejeição é obrigatório");
          return;
      }

      setLoading(true);
      try {
          const response = await base44.functions.invoke('reviewSubcontractorInfo', {
              tripId: reviewTripInfo.id,
              status,
              reason: status === 'rejected' ? rejectionReason : null
          });

          if (response.data && response.data.success) {
              toast.success(`Informações ${status === 'approved' ? 'aprovadas' : 'rejeitadas'} com sucesso!`);
              setReviewDialogOpen(false);
              setReviewTripInfo(null);
              setRejectionReason("");
              loadEventData();
          } else {
              throw new Error(response.data?.error || "Erro ao processar");
          }
      } catch (err) {
          toast.error("Erro", { description: err.message });
      } finally {
          setLoading(false);
      }
  };

  const handleCancelTrip = (trip) => {
      setTripToCancel(trip);
      setCancellationReason("");
      setShowCancelDialog(true);
  };

  const handleConfirmCancelTrip = async () => {
      if (!tripToCancel) return;
      setLoading(true);
      try {
          const response = await base44.functions.invoke('cancelEventTrip', {
              tripId: tripToCancel.id,
              cancellationReason: cancellationReason || null,
          });

          if (response.data && response.data.success) {
              toast.success("Viagem Cancelada!", { description: "A viagem e seus passageiros foram cancelados com sucesso." });
              setShowCancelDialog(false);
              setTripToCancel(null);
              setCancellationReason("");
              loadEventData(); // Reload data to reflect changes
          } else {
              throw new Error(response.data?.error || "Erro desconhecido");
          }
      } catch (err) {
          console.error("Erro ao cancelar viagem:", err);
          toast.error("Erro ao cancelar viagem", { description: err.message });
      } finally {
          setLoading(false);
      }
  };

  const handleAddPassengersToTrip = async () => {
      if (!targetTripForAdd) return;

      const hasExisting = passengersToAdd.length > 0;
      const hasNew = addPassengerDialogActiveTab === 'new' && newPassengerData.passenger_name.trim();

      if (addPassengerDialogActiveTab === 'existing' && !hasExisting) {
          toast.error("Selecione pelo menos um passageiro");
          return;
      }

      if (addPassengerDialogActiveTab === 'new' && !newPassengerData.passenger_name.trim()) {
          toast.error("Nome Completo é obrigatório");
          return;
      }

      setIsGenerating(true);
      try {
          const payload = {
              tripId: targetTripForAdd.id,
              passengerIds: hasExisting ? passengersToAdd : [],
              replicateExisting: replicateSelectedPassengers,
              newPassengers: hasNew ? [{
                  passenger_name: newPassengerData.passenger_name.trim(),
                  passenger_email: newPassengerData.passenger_email.trim(),
                  passenger_phone: newPassengerData.passenger_phone.trim(),
                  document_id: newPassengerData.document_id.trim(),
                  trip_type: newPassengerData.trip_type,
                  flight_number: newPassengerData.flight_number.trim(),
                  airline: newPassengerData.airline.trim(),
                  date: targetTripForAdd.date,
                  time: targetTripForAdd.start_time,
                  origin_address: targetTripForAdd.origin,
                  destination_address: targetTripForAdd.destination
              }] : []
          };

          const response = await base44.functions.invoke('addPassengersToEventTrip', payload);

          if (response.data && response.data.success) {
              toast.success("✅ Sucesso!", { 
                  description: response.data.message,
                  className: "bg-green-50 border-green-200" 
              });
              
              // Limpar campos para próxima inserção
              setPassengersToAdd([]);
              setReplicateSelectedPassengers(false);
              // Mantém a aba ativa para agilizar fluxo contínuo
              setNewPassengerData({
                  passenger_name: '',
                  passenger_email: '',
                  passenger_phone: '',
                  document_id: '',
                  trip_type: 'airport_transfer',
                  flight_number: '',
                  airline: ''
              });
              
              // Perguntar se quer adicionar mais
              setShowAddPassengerDialog(false); // Fecha o anterior para evitar sobreposição
              setTimeout(() => setShowAddMorePassengersConfirm(true), 150); // Pequeno delay para transição suave
              
              loadEventData();
          } else {
              throw new Error(response.data?.error || "Erro ao adicionar");
          }
      } catch (err) {
          toast.error("Erro", { description: err.message });
      } finally {
          setIsGenerating(false);
      }
  };

  const openDriverDialog = (trip) => {
      setSelectedTripForDriver(trip);
      // Fallback for legacy single coordinator if new list not populated
      let initialCoordinatorIds = trip.coordinator_ids || [];
      if (initialCoordinatorIds.length === 0 && trip.coordinator_id) {
          initialCoordinatorIds = [trip.coordinator_id];
      }

      let driverIdVal = trip.driver_id || 'none';
      let eventualName = '';
      let eventualPhone = '';
      let eventualVehicleModel = '';
      let eventualVehiclePlate = '';
      let eventualEmail = '';

      let useCasualDriverId = 'none';
      if (trip.is_casual_driver) {
          driverIdVal = 'casual_driver';
          eventualName = trip.casual_driver_name || '';
          eventualPhone = trip.casual_driver_phone || '';
          eventualVehicleModel = trip.casual_driver_vehicle_model || '';
          eventualVehiclePlate = trip.casual_driver_vehicle_plate || '';
          useCasualDriverId = trip.event_casual_driver_id || 'none';
      }

      setDriverForm({
          driverId: driverIdVal,
          subcontractorId: trip.subcontractor_id || 'none',
          coordinatorIds: initialCoordinatorIds,
          vehicleId: trip.vehicle_id || 'none',
          payoutAmount: trip.driver_payout_amount || '',
          subcontractorCost: trip.subcontractor_cost || '',
          clientPrice: trip.client_price || '',
          eventualName: eventualName,
          eventualPhone: eventualPhone,
          eventualEmail: eventualEmail,
          eventualVehicleModel: eventualVehicleModel,
          eventualVehiclePlate: eventualVehiclePlate,
          coordinatorCanStartTrip: trip.coordinator_can_start_trip || false,
          tripStatus: trip.driver_trip_status || 'aguardando',
          useCasualDriverId: useCasualDriverId,
          saveCasualDriver: false
      });
      setShowDriverDialog(true);
  };

  const handleCopyDriverInfo = () => {
      if (!selectedTripForDriver) return;

      const trip = selectedTripForDriver;
      const flightNumbers = getTripFlightNumbers(trip.id).join(', ');
      const passengerNames = getTripPassengerNames(trip.id);
      
      let info = `📋 *Resumo da Viagem*\n\n`;
      info += `📅 Data: ${safeFormat(trip.date, 'dd/MM/yyyy')} às ${trip.start_time}\n`;
      info += `📍 Origem: ${trip.origin}\n`;

      if (trip.additional_stops && trip.additional_stops.length > 0) {
          trip.additional_stops.forEach((stop, idx) => {
              info += `➡️ Parada ${idx + 1}: ${stop.address} ${stop.notes ? `(${stop.notes})` : ''}\n`;
          });
      }

      info += `🏁 Destino: ${trip.destination}\n`;
      
      if (flightNumbers) {
          info += `✈️ Voo: ${flightNumbers}\n`;
      }
      
      info += `👥 Passageiro(s): ${passengerNames || trip.name} (${trip.passenger_count} pax)\n`;
      
      info += `\n🚘 *Motorista e Veículo*\n`;
      
      if (driverForm.driverId === 'new_eventual') {
          info += `👤 Motorista: ${driverForm.eventualName} ${driverForm.eventualPhone}\n`;
          info += `🚙 Veículo: ${driverForm.eventualVehicleModel} - ${driverForm.eventualVehiclePlate}\n`;
      } else if (driverForm.driverId === 'casual_driver') {
          info += `👤 Motorista: ${driverForm.eventualName} ${driverForm.eventualPhone}\n`;
          info += `🚙 Veículo: ${driverForm.eventualVehicleModel} - ${driverForm.eventualVehiclePlate}\n`;
      } else if (driverForm.driverId !== 'none') {
          const drv = drivers.find(d => d.id === driverForm.driverId);
          const vhc = driverVehicles.find(v => v.id === driverForm.vehicleId);
          
          if (drv) {
              info += `👤 Motorista: ${drv.name} ${drv.phone_number || ''}\n`;
              if (vhc) {
                  info += `🚙 Veículo: ${vhc.vehicle_model} - ${vhc.vehicle_plate}\n`;
              } else {
                  info += `🚙 Veículo: Não informado\n`;
              }
          }
      } else {
          info += `⚠️ Motorista ainda não atribuído.\n`;
      }

      navigator.clipboard.writeText(info);
      toast.success("Resumo completo copiado para a área de transferência!");
  };

  const handleSaveDriver = async () => {
      if (!selectedTripForDriver) return;
      
      setLoading(true);
      try {
          let payload = {
              tripId: selectedTripForDriver.id,
              driverId: driverForm.driverId,
              subcontractorId: driverForm.subcontractorId,
              coordinatorIds: driverForm.coordinatorIds,
              vehicleId: driverForm.vehicleId,
              driverPayoutAmount: driverForm.payoutAmount,
              subcontractorCost: driverForm.subcontractorCost,
              clientPrice: driverForm.clientPrice,
              coordinatorCanStartTrip: driverForm.coordinatorCanStartTrip,
              save_casual_driver: driverForm.saveCasualDriver,
              use_casual_driver_id: driverForm.useCasualDriverId !== 'none' ? driverForm.useCasualDriverId : null
          };

          if (driverForm.driverId === 'new_eventual' || driverForm.driverId === 'casual_driver') {
              if (!driverForm.eventualName || !driverForm.eventualPhone || !driverForm.eventualVehicleModel || !driverForm.eventualVehiclePlate) {
                  toast.error("Erro", { description: "Preencha todos os campos obrigatórios do motorista." });
                  setLoading(false);
                  return;
              }
              payload.eventualDriverData = {
                  name: driverForm.eventualName,
                  email: driverForm.eventualEmail,
                  phone: driverForm.eventualPhone,
                  vehicle_model: driverForm.eventualVehicleModel,
                  vehicle_plate: driverForm.eventualVehiclePlate
              };
          }

          const response = await base44.functions.invoke('updateEventTripDriver', payload);

          if (response.data && response.data.success) {
              toast.success("Sucesso", { description: "Motorista e veículo atribuídos.", className: "bg-green-50 border-green-200" });
              setShowDriverDialog(false);
              loadEventData();
          } else {
              throw new Error(response.data?.error || "Falha ao salvar");
          }
      } catch (err) {
          toast.error("Erro", { description: err.message });
      } finally {
          setLoading(false);
      }
  };

  const handleOpenPassengerList = (trip) => {
      setSelectedTripForPasses(trip);
      setShowPassengerListDialog(true);
  };

  const handleViewSinglePass = async (passenger) => {
      try {
          const response = await base44.functions.invoke('generateBoardingPass', { 
              tripId: selectedTripForPasses.id,
              passengerIds: [passenger.id]
          });

          if (response.data && response.data.success && response.data.data) {
              setBoardingPassData(response.data.data);
              setShowBoardingPass(true);
          } else {
              throw new Error(response.data?.error || "Erro ao obter dados");
          }

      } catch (err) {
          console.error("Boarding Pass Error", err);
          toast.error("Erro", { description: err.message || "Falha ao carregar cartão de embarque." });
      }
  };

  const toggleSort = (key) => {
    setSortConfig(current => {
      const configArray = Array.isArray(current) ? current : (current ? [current] : []);
      
      const existingIndex = configArray.findIndex(s => s.key === key);
      let newConfig = [...configArray];
      
      if (existingIndex >= 0) {
        // Inverte direção e move para o topo
        const item = newConfig[existingIndex];
        newConfig.splice(existingIndex, 1);
        newConfig.unshift({ ...item, direction: item.direction === 'asc' ? 'desc' : 'asc' });
      } else {
        // Adiciona no topo
        newConfig.unshift({ key, direction: 'asc' });
      }
      return newConfig;
    });
  };

  const getFilteredAndSortedPassengers = () => {
    // 1. Base Filter (Pending vs All)
    let filtered = showAllPassengers ? passengers : passengers.filter(p => p.status === 'pending');

    // Search Filter
    if (passengerSearch.trim()) {
        const searchLower = passengerSearch.toLowerCase();
        filtered = filtered.filter(p => 
            p.passenger_name?.toLowerCase().includes(searchLower)
        );
    }

    // 2. Quick Filters
    if (quickFilters.date && quickFilters.date.length > 0) {
        filtered = filtered.filter(p => quickFilters.date.includes(p.date || p.flight_date));
    }
    if (quickFilters.type !== 'all') {
        filtered = filtered.filter(p => {
             if (quickFilters.type === 'IN') return (p.trip_type === 'IN' || p.trip_type === 'airport_transfer' && !p.trip_type.includes('OUT'));
             if (quickFilters.type === 'OUT') return (p.trip_type === 'OUT');
             return p.trip_type === quickFilters.type;
        });
    }
    if (quickFilters.origin !== 'all') {
        filtered = filtered.filter(p => (p.arrival_point || p.origin_address) === quickFilters.origin);
    }
    if (quickFilters.destination !== 'all') {
        filtered = filtered.filter(p => p.destination_address === quickFilters.destination);
    }
    if (quickFilters.time !== 'all') {
        filtered = filtered.filter(p => (p.time || p.flight_time) === quickFilters.time);
    }

    // 3. Sorting (Multilevel with Grouping)
    // Agrupa passageiros principais e seus acompanhantes para manter os blocos juntos
    const filteredIds = new Set(filtered.map(p => p.id));
    const leaders = [];
    const companionsMap = {};

    filtered.forEach(p => {
        // Se tem main_passenger_id E o líder está na lista filtrada, é acompanhante
        const isCompanion = p.main_passenger_id && filteredIds.has(p.main_passenger_id);
        
        if (isCompanion) {
            if (!companionsMap[p.main_passenger_id]) {
                companionsMap[p.main_passenger_id] = [];
            }
            companionsMap[p.main_passenger_id].push(p);
        } else {
            leaders.push(p);
        }
    });

    // Função de comparação reutilizável
    const comparePassengers = (a, b) => {
        const rules = Array.isArray(sortConfig) ? sortConfig : [sortConfig];
        
        for (const rule of rules) {
            let valA, valB;
            
            switch(rule.key) {
                case 'name':
                    valA = (a.passenger_name || '').toLowerCase();
                    valB = (b.passenger_name || '').toLowerCase();
                    break;
                case 'date':
                    valA = a.date || a.flight_date || '9999-12-31';
                    valB = b.date || b.flight_date || '9999-12-31';
                    break;
                case 'time':
                    valA = a.time || a.flight_time || '23:59';
                    valB = b.time || b.flight_time || '23:59';
                    break;
                case 'origin':
                    valA = (a.origin_address || a.arrival_point || '').toLowerCase();
                    valB = (b.origin_address || b.arrival_point || '').toLowerCase();
                    break;
                case 'destination':
                    valA = (a.destination_address || '').toLowerCase();
                    valB = (b.destination_address || '').toLowerCase();
                    break;
                case 'type':
                    valA = (a.trip_type || '').toLowerCase();
                    valB = (b.trip_type || '').toLowerCase();
                    break;
                case 'flight':
                    valA = (a.flight_number || '').toLowerCase();
                    valB = (b.flight_number || '').toLowerCase();
                    break;
                case 'airline':
                    valA = (a.airline || '').toLowerCase();
                    valB = (b.airline || '').toLowerCase();
                    break;
                case 'status':
                    valA = (a.status || '').toLowerCase();
                    valB = (b.status || '').toLowerCase();
                    break;
                default:
                    valA = '';
                    valB = '';
            }

            if (valA < valB) return rule.direction === 'asc' ? -1 : 1;
            if (valA > valB) return rule.direction === 'asc' ? 1 : -1;
        }
        return 0;
    };

    // Ordena apenas os líderes
    leaders.sort(comparePassengers);

    // Reconstrói a lista plana: [Líder, ...Acompanhantes, Próximo Líder...]
    const finalSorted = [];
    leaders.forEach(leader => {
        finalSorted.push(leader);
        const companions = companionsMap[leader.id];
        if (companions && companions.length > 0) {
            // Ordena acompanhantes por nome para manter consistência interna (ou poderia usar a mesma regra)
            companions.sort((a, b) => (a.passenger_name || '').localeCompare(b.passenger_name || ''));
            finalSorted.push(...companions);
        }
    });

    return finalSorted;
  };

  const toggleSelectPassenger = (id) => {
    setSelectedPassengers(prev => 
        prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const visiblePassengers = getFilteredAndSortedPassengers();
    const allVisibleSelected = visiblePassengers.length > 0 && visiblePassengers.every(p => selectedPassengers.includes(p.id));
    
    if (allVisibleSelected) {
        // Unselect all visible
        const visibleIds = visiblePassengers.map(p => p.id);
        setSelectedPassengers(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
        // Select all visible
        const visibleIds = visiblePassengers.map(p => p.id);
        // Merge unique
        setSelectedPassengers(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const toggleSelectAllTrips = () => {
      const visibleTrips = getFilteredTrips();
      const allVisibleSelected = visibleTrips.length > 0 && visibleTrips.every(t => selectedTripsForShare.includes(t.id));
      
      if (allVisibleSelected) {
          // Unselect all visible
          const visibleIds = visibleTrips.map(t => t.id);
          setSelectedTripsForShare(prev => prev.filter(id => !visibleIds.includes(id)));
      } else {
          // Select all visible
          const visibleIds = visibleTrips.map(t => t.id);
          // Merge unique
          setSelectedTripsForShare(prev => [...new Set([...prev, ...visibleIds])]);
      }
  };

  // Grouping Logic
  const getGroupedPassengers = () => {
      const filtered = getFilteredAndSortedPassengers();
      const groups = {};

      filtered.forEach(p => {
          const date = safeFormat(p.date || p.flight_date, "dd/MM/yyyy");
          
          // Determine Context (Airport)
          let context = "Outros";
          const type = (p.trip_type || '').toUpperCase();
          const isIN = type.includes('IN') || type.includes('CHEGADA') || type.includes('ARRIVAL');
          const isOUT = type.includes('OUT') || type.includes('SAIDA') || type.includes('DEPARTURE');

          if (isIN) {
              context = `IN: ${p.arrival_point || p.origin_address || 'Origem Desc.'}`;
          } else if (isOUT) {
              context = `OUT: ${p.destination_address || 'Destino Desc.'} (Saindo de ${p.origin_address})`;
          } else {
              context = p.arrival_point || p.origin_address || 'Origem';
          }

          // Time Range (Hourly)
          const time = typeof p.time === 'string' ? p.time : (typeof p.flight_time === 'string' ? p.flight_time : "00:00");
          const hour = time.includes(':') ? time.split(':')[0] : "00";
          const timeRange = `${hour}h - ${parseInt(hour) + 1}h`;

          if (!groups[date]) groups[date] = {};
          if (!groups[date][context]) groups[date][context] = {};
          if (!groups[date][context][timeRange]) groups[date][context][timeRange] = [];

          groups[date][context][timeRange].push(p);
      });

      return groups;
  };

  const toggleGroup = (key) => {
      setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  // Get flight numbers for a trip
  const getTripFlightNumbers = (tripId) => {
      const tripPassengers = passengers.filter(p => p.event_trip_id === tripId);
      const flightNumbers = tripPassengers
          .filter(p => p.flight_number)
          .map(p => {
              const airline = p.airline ? p.airline.trim() : '';
              const number = p.flight_number.trim();
              
              let timeStr = p.flight_time;

              // Fallback para p.time se não tiver flight_time
              if (!timeStr && p.time) {
                  timeStr = p.time;
              }
              
              // Formatar HH:MM (apenas se existir e for válido)
              if (timeStr && typeof timeStr === 'string' && timeStr.length >= 5) {
                  timeStr = timeStr.substring(0, 5);
              } else {
                  timeStr = ''; 
              }

              const time = timeStr ? ` • ${timeStr}` : '';
              return airline ? `${airline} ${number}${time}` : `${number}${time}`;
          })
          .filter((v, i, a) => a.indexOf(v) === i); // Unique
      return flightNumbers;
  };

  // Get passenger names for a trip
  const getTripPassengerNames = (tripId) => {
      const tripPassengers = passengers.filter(p => p.event_trip_id === tripId);
      return tripPassengers.map(p => p.passenger_name).join(' ');
  };

  // Filter Trips for Logistics Tab
  const getFilteredTrips = () => {
      let filtered = [...trips];
      
      // Filter by driver status
      if (logisticsFilters.driverStatus === "pending") {
          filtered = filtered.filter(t => !t.driver_id && !t.is_casual_driver && !t.subcontractor_driver_name);
      } else if (logisticsFilters.driverStatus === "assigned") {
          filtered = filtered.filter(t => t.driver_id || t.is_casual_driver || t.subcontractor_driver_name);
      }
      
      // Filter by vehicle type
      if (logisticsFilters.vehicleType !== "all") {
          filtered = filtered.filter(t => t.vehicle_type_category === logisticsFilters.vehicleType);
      }
      
      // Filter by date
      if (logisticsFilters.date !== "all") {
          filtered = filtered.filter(t => t.date === logisticsFilters.date);
      }
      
      // Filter by specific driver
      if (logisticsFilters.driverFilter !== "all") {
          filtered = filtered.filter(t => 
              t.driver_name === logisticsFilters.driverFilter || 
              t.casual_driver_name === logisticsFilters.driverFilter || 
              t.subcontractor_driver_name === logisticsFilters.driverFilter
          );
      }

      // Filter by partner
      if (logisticsFilters.partnerFilter !== "all") {
          filtered = filtered.filter(t => t.subcontractor_id === logisticsFilters.partnerFilter);
      }

      // Filter by coordinator
      if (logisticsFilters.coordinatorFilter !== "all") {
          filtered = filtered.filter(t => t.coordinator_id === logisticsFilters.coordinatorFilter);
      }
      
      // Filter by origin
      if (logisticsFilters.originFilter !== "all") {
          filtered = filtered.filter(t => t.origin === logisticsFilters.originFilter);
      }
      
      // Filter by destination
      if (logisticsFilters.destinationFilter !== "all") {
          filtered = filtered.filter(t => t.destination === logisticsFilters.destinationFilter);
      }
      
      // Filter by flight number
      if (logisticsFilters.flightFilter !== "all") {
          filtered = filtered.filter(t => {
              const tripFlights = getTripFlightNumbers(t.id);
              return tripFlights.includes(logisticsFilters.flightFilter);
          });
      }

      // Filter by trip type
      if (logisticsFilters.tripType !== "all") {
          filtered = filtered.filter(t => {
              const type = (t.trip_type || '').toLowerCase();
              if (logisticsFilters.tripType === 'IN') return type === 'arrival' || type === 'in';
              if (logisticsFilters.tripType === 'OUT') return type === 'departure' || type === 'out';
              return type === logisticsFilters.tripType.toLowerCase();
          });
      }

      // Filter by missing phone
      if (logisticsFilters.missingPhoneFilter === "with_missing_phone") {
          filtered = filtered.filter(t => {
              const tripPassengers = passengers.filter(p => p.event_trip_id === t.id);
              return tripPassengers.some(p => !p.passenger_phone || p.passenger_phone.trim() === '');
          });
      }
      
      // Filter by search term (passengers, flights, origin, destination only)
      if (logisticsFilters.search.trim()) {
          const searchLower = logisticsFilters.search.toLowerCase().trim();
          filtered = filtered.filter(t => {
              const flightNumbers = getTripFlightNumbers(t.id).join(' ').toLowerCase();
              const passengerNames = getTripPassengerNames(t.id).toLowerCase();
              return t.origin?.toLowerCase().includes(searchLower) ||
                  t.destination?.toLowerCase().includes(searchLower) ||
                  t.name?.toLowerCase().includes(searchLower) ||
                  t.trip_code?.toLowerCase().includes(searchLower) ||
                  flightNumbers.includes(searchLower) ||
                  passengerNames.includes(searchLower);
          });
      }
      
      return filtered;
  };

  const passengersInFilteredTripsWithMissingPhone = React.useMemo(() => {
    const filteredTrips = getFilteredTrips();
    const filteredTripIds = new Set(filteredTrips.map(t => t.id));
    return passengers.filter(p => filteredTripIds.has(p.event_trip_id) && (!p.passenger_phone || p.passenger_phone.trim() === ''));
  }, [passengers, trips, logisticsFilters]);
  
  // Get unique vehicle types from trips
  const uniqueVehicleTypes = React.useMemo(() => {
      const types = new Set(trips.map(t => t.vehicle_type_category).filter(Boolean));
      return Array.from(types).sort();
  }, [trips]);
  
  // Get unique dates from trips
  const uniqueTripDates = React.useMemo(() => {
      const dates = new Set(trips.map(t => t.date).filter(Boolean));
      return Array.from(dates).sort();
  }, [trips]);
  
  // Get unique drivers from trips
  const uniqueDrivers = React.useMemo(() => {
      const allDriverNames = new Set();
      trips.forEach(t => {
          if (t.driver_name) allDriverNames.add(t.driver_name);
          if (t.casual_driver_name) allDriverNames.add(t.casual_driver_name);
          if (t.subcontractor_driver_name) allDriverNames.add(t.subcontractor_driver_name);
      });
      return Array.from(allDriverNames).sort();
  }, [trips]);
  
  // Get unique origins from trips
  const uniqueTripOrigins = React.useMemo(() => {
      const origins = new Set(trips.map(t => t.origin).filter(Boolean));
      return Array.from(origins).sort();
  }, [trips]);
  
  // Get unique destinations from trips
  const uniqueTripDestinations = React.useMemo(() => {
      const destinations = new Set(trips.map(t => t.destination).filter(Boolean));
      return Array.from(destinations).sort();
  }, [trips]);
  
  // Get unique flight numbers from trips
  const uniqueTripFlights = React.useMemo(() => {
      const flights = new Set();
      trips.forEach(trip => {
          const tripFlights = getTripFlightNumbers(trip.id);
          tripFlights.forEach(f => flights.add(f));
      });
      return Array.from(flights).sort();
  }, [trips, passengers]);
  
  // Suggest Vehicle Logic
  const getSuggestedVehicle = () => {
      const count = selectedPassengers.length;
      if (count === 0) return null;
      
      let candidates = [];
      
      if (supplierVehicles.length > 0) {
          candidates = supplierVehicles.map(v => ({ name: v.name, capacity: v.max_passengers }));
      } else {
          candidates = logisticsParams.vehicle_capacities.map(v => ({ name: v.vehicle_type, capacity: v.capacity }));
      }

      // Sort vehicles by capacity
      const sortedVehicles = candidates.sort((a, b) => a.capacity - b.capacity);
      
      // Find smallest vehicle that fits
      const fit = sortedVehicles.find(v => v.capacity >= count);
      
      if (fit) return fit;
      // If none fits (too big), suggest the largest
      return sortedVehicles[sortedVehicles.length - 1] || { name: 'Van', capacity: 15 };
  };

  // Auto-select vehicle when passenger count changes
  useEffect(() => {
      if (selectedPassengers.length > 0) {
          const suggested = getSuggestedVehicle();
          if (suggested) {
              setManualTripVehicle(suggested.name);
              setManualTripCapacity(suggested.capacity);
          }
      } else {
          setManualTripVehicle("");
          setManualTripCapacity("");
      }
  }, [selectedPassengers.length, supplierVehicles, logisticsParams.vehicle_capacities]);

  const addVehicleType = () => {
    setLogisticsParams(prev => ({
        ...prev,
        vehicle_capacities: [...prev.vehicle_capacities, { vehicle_type: "", capacity: 4 }]
    }));
  };

  const removeVehicleType = (index) => {
    setLogisticsParams(prev => {
        const newCaps = [...prev.vehicle_capacities];
        newCaps.splice(index, 1);
        return { ...prev, vehicle_capacities: newCaps };
    });
  };

  const updateVehicleType = (index, field, value) => {
    setLogisticsParams(prev => {
        const newCaps = [...prev.vehicle_capacities];
        newCaps[index] = { ...newCaps[index], [field]: value };
        return { ...prev, vehicle_capacities: newCaps };
    });
  };

  const toggleVehicleSelection = (index) => {
      setLogisticsParams(prev => {
          const newCaps = [...prev.vehicle_capacities];
          newCaps[index] = { ...newCaps[index], selected: !newCaps[index].selected };
          return { ...prev, vehicle_capacities: newCaps };
      });
  };

  // Calculate how many passengers will be processed with current filters
  const getPendingPassengersCount = React.useMemo(() => {
      let pendingPassengers = passengers.filter(p => p.status === 'pending');
      
      const tripTypeFilter = logisticsParams.trip_type_filter;
      if (tripTypeFilter !== 'all') {
          pendingPassengers = pendingPassengers.filter(p => {
              const type = (p.trip_type || '').toUpperCase();
              if (tripTypeFilter === 'IN') {
                  return type === 'IN' || type.includes('CHEGADA') || type.includes('ARRIVAL') || 
                         (type.includes('AIRPORT') && !type.includes('OUT'));
              }
              if (tripTypeFilter === 'OUT') {
                  return type === 'OUT' || type.includes('SAIDA') || type.includes('DEPARTURE') ||
                         (type.includes('AIRPORT') && !type.includes('IN'));
              }
              return type.includes('AIRPORT') || type.includes('TRANSFER');
          });
      }

      if (logisticsParams.date_filter && logisticsParams.date_filter !== 'all') {
          pendingPassengers = pendingPassengers.filter(p => 
              (p.date || p.flight_date) === logisticsParams.date_filter
          );
      }
      if (logisticsParams.origin_filter && logisticsParams.origin_filter !== 'all') {
          pendingPassengers = pendingPassengers.filter(p => {
              // Para viagens IN (chegadas), a origem é o arrival_point (aeroporto)
              // Para viagens OUT (saídas), a origem é o origin_address (hotel/local de partida)
              const type = (p.trip_type || '').toUpperCase();
              const isIN = type === 'IN' || type.includes('CHEGADA') || type.includes('ARRIVAL');
              
              const pOrigin = isIN 
                  ? (p.arrival_point || '').toLowerCase().trim()
                  : (p.origin_address || '').toLowerCase().trim();
              const filterOrigin = (logisticsParams.origin_filter || '').toLowerCase().trim();
              return pOrigin && (pOrigin.includes(filterOrigin) || filterOrigin.includes(pOrigin));
          });
      }
      if (logisticsParams.destination_filter && logisticsParams.destination_filter !== 'all') {
          pendingPassengers = pendingPassengers.filter(p => {
              const pDest = (p.destination_address || '').toLowerCase().trim();
              const filterDest = (logisticsParams.destination_filter || '').toLowerCase().trim();
              return pDest.includes(filterDest) || filterDest.includes(pDest);
          });
      }

      return {
          count: pendingPassengers.length,
          totalPending: passengers.filter(p => p.status === 'pending').length
      };
  }, [logisticsParams, passengers]);

  // Helper for Grouped Render
  const renderGroupedView = () => {
      const groups = getGroupedPassengers();
      const dates = Object.keys(groups).sort();

      if (dates.length === 0) {
          return (
              <div className="text-center py-12 text-gray-500">
                  Nenhum passageiro encontrado com os filtros atuais.
              </div>
          );
      }

      return (
          <div className="space-y-4">
              {dates.map(date => (
                  <div key={date} className="border rounded-lg bg-white overflow-hidden">
                      <div 
                          className="bg-gray-100 p-3 font-semibold flex items-center justify-between cursor-pointer hover:bg-gray-200 transition-colors"
                          onClick={() => toggleGroup(date)}
                      >
                          <div className="flex items-center gap-2">
                              {expandedGroups[date] ? <ArrowUpDown className="w-4 h-4 rotate-180" /> : <ArrowRight className="w-4 h-4" />}
                              <span>{date}</span>
                          </div>
                          <Badge variant="secondary" className="bg-white">
                              {Object.values(groups[date]).reduce((acc, ctx) => acc + Object.values(ctx).reduce((a, tr) => a + tr.length, 0), 0)} pax
                          </Badge>
                      </div>
                      
                      {expandedGroups[date] && (
                          <div className="p-2 space-y-2 bg-gray-50/50">
                              {Object.keys(groups[date]).sort().map(context => (
                                  <div key={context} className="border border-gray-200 rounded-md bg-white">
                                      <div 
                                          className="p-2 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors"
                                          onClick={() => toggleGroup(`${date}-${context}`)}
                                      >
                                          <div className="flex items-center gap-2">
                                              {context.includes('IN') ? <Plane className="w-4 h-4 text-blue-500 rotate-90" /> : <Plane className="w-4 h-4 text-orange-500 -rotate-90" />}
                                              <span className="font-medium text-sm text-gray-700">{context}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                                                  {Object.values(groups[date][context]).reduce((acc, tr) => acc + tr.length, 0)} pax
                                              </Badge>
                                          </div>
                                      </div>

                                      {expandedGroups[`${date}-${context}`] && (
                                          <div className="p-2 border-t space-y-2">
                                              {Object.keys(groups[date][context]).sort().map(timeRange => (
                                                  <div key={timeRange} className="ml-4 border-l-2 border-blue-200 pl-3 py-1">
                                                      <div className="flex items-center justify-between mb-2">
                                                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{timeRange}</span>
                                                          <Button 
                                                              size="sm" 
                                                              variant="ghost" 
                                                              className="h-6 text-xs text-blue-600 hover:text-blue-700"
                                                              onClick={() => {
                                                                  const ids = groups[date][context][timeRange].map(p => p.id);
                                                                  setSelectedPassengers(prev => [...new Set([...prev, ...ids])]);
                                                              }}
                                                          >
                                                              Selecionar Todos ({groups[date][context][timeRange].length})
                                                          </Button>
                                                      </div>
                                                      <div className="space-y-1">
                                                          {groups[date][context][timeRange].map(p => (
                                                              <div 
                                                                  key={p.id} 
                                                                  className={`flex items-center gap-3 p-2 rounded text-sm transition-colors cursor-pointer ${selectedPassengers.includes(p.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}
                                                                  onClick={() => toggleSelectPassenger(p.id)}
                                                              >
                                                                  <Checkbox checked={selectedPassengers.includes(p.id)} />
                                                                  <span className="font-medium w-12">{p.time}</span>
                                                                  <span className="flex-1 truncate font-medium text-gray-900">{p.passenger_name}</span>
                                                                  <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{p.flight_number}</Badge>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              ))}
          </div>
      );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/GerenciarEventos")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{event.event_name}</h1>
                <p className="text-xs text-gray-500">
                  {safeFormat(event.start_date, "dd/MM/yyyy")} • {event.event_type === 'airport_arrivals' ? 'Chegadas Aeroporto' : 'Logística Geral'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
                {event.status === 'active' ? 'Ativo' : 'Pendente'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <Card>
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Passageiros</p>
                        <h3 className="text-2xl font-bold">{passengers.length}</h3>
                    </div>
                    <Users className="w-8 h-8 text-blue-500 opacity-20" />
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pendentes</p>
                        <h3 className="text-2xl font-bold text-orange-600">
                            {passengers.filter(p => p.status === 'pending').length}
                        </h3>
                    </div>
                    <Filter className="w-8 h-8 text-orange-500 opacity-20" />
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Viagens Ativas</p>
                        <h3 className="text-2xl font-bold text-green-600">{activeTripsCount}</h3>
                    </div>
                    <Truck className="w-8 h-8 text-green-500 opacity-20" />
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Canceladas</p>
                        <h3 className="text-2xl font-bold text-red-600">{cancelledTripsCount}</h3>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-500 opacity-20" />
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pax Alocados</p>
                        <h3 className="text-2xl font-bold text-purple-600">
                            {passengers.filter(p => p.status !== 'pending').length}
                        </h3>
                    </div>
                    <CheckCircle className="w-8 h-8 text-purple-500 opacity-20" />
                </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => setShowLogisticsDialog(true)}>
                <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <PlayCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="font-bold text-blue-700">Gerar Logística</p>
                        <p className="text-xs text-blue-600">Agrupar passageiros</p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="passengers" className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Passageiros
            </TabsTrigger>
            <TabsTrigger value="logistics" className="flex items-center gap-2">
                <Truck className="w-4 h-4" /> Viagens / Grupos
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Serviços
            </TabsTrigger>
            <TabsTrigger value="partners" className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Gestão Parceiros
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> Relatórios
            </TabsTrigger>
          </TabsList>

          {/* Share Dialog */}
          <ShareEventLinkDialog 
            isOpen={showShareDialog} 
            onClose={() => {
                setShowShareDialog(false);
                setSelectedTripsForShare([]);
            }} 
            eventId={eventId}
            selectedTripIds={selectedTripsForShare}
          />

          <TabsContent value="passengers" className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="flex-1 w-full space-y-4">
                    {/* Quick Filters Bar */}
                    <Card className="bg-white">
                        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
                            <div className="space-y-1 col-span-2">
                                <Label className="text-xs text-gray-500">Buscar Passageiro</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                    <Input 
                                        placeholder="Nome..." 
                                        className="pl-8 h-9 text-xs"
                                        value={passengerSearch}
                                        onChange={(e) => setPassengerSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Filtrar Data(s)</Label>
                                <MultiSelect
                                    options={uniqueDates.map(d => ({ value: d, label: safeFormat(d, 'dd/MM/yyyy') }))}
                                    selected={quickFilters.date}
                                    onChange={(newDates) => setQuickFilters({...quickFilters, date: newDates})}
                                    placeholder="Todas"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Filtrar Origem</Label>
                                <Select value={quickFilters.origin} onValueChange={(v) => setQuickFilters({...quickFilters, origin: v})}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {uniqueOrigins.map((o, idx) => <SelectItem key={idx} value={o}>{o}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Filtrar Destino</Label>
                                <Select value={quickFilters.destination} onValueChange={(v) => setQuickFilters({...quickFilters, destination: v})}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {uniqueDestinations.map((d, idx) => <SelectItem key={idx} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Tipo Viagem</Label>
                                <Select value={quickFilters.type} onValueChange={(v) => setQuickFilters({...quickFilters, type: v})}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="IN">Chegadas (IN)</SelectItem>
                                        <SelectItem value="OUT">Saídas (OUT)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Filtrar Horário</Label>
                                <Select value={quickFilters.time} onValueChange={(v) => setQuickFilters({...quickFilters, time: v})}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {uniqueTimes.map((t, idx) => <SelectItem key={idx} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="col-span-2 flex items-center justify-end gap-2 pb-0.5">
                                <div className="bg-gray-100 p-1 rounded-lg flex items-center">
                                    <button 
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                                        onClick={() => setViewMode('list')}
                                        title="Vista Lista"
                                    >
                                        <FileText className="w-4 h-4" />
                                    </button>
                                    <button 
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grouped' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                                        onClick={() => setViewMode('grouped')}
                                        title="Vista Agrupada"
                                    >
                                        <Settings className="w-4 h-4" /> {/* Using Settings icon as Group icon fallback */}
                                    </button>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="show-all" checked={showAllPassengers} onCheckedChange={setShowAllPassengers} />
                                    <label htmlFor="show-all" className="text-xs font-medium cursor-pointer">Mostrar Agrupados</label>
                                </div>
                            </div>
                            
                            {/* Sorting Row */}
                            <div className="col-span-2 md:col-span-8 pt-2 border-t flex justify-between items-center">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 text-xs text-gray-500 hover:text-red-600 px-2"
                                    onClick={() => {
                                        setPassengerSearch("");
                                        setQuickFilters({
                                            date: [],
                                            time: "all",
                                            type: "all",
                                            origin: "all",
                                            destination: "all"
                                        });
                                    }}
                                    disabled={!(passengerSearch || (quickFilters.date && quickFilters.date.length > 0) || quickFilters.time !== "all" || quickFilters.type !== "all" || quickFilters.origin !== "all" || quickFilters.destination !== "all")}
                                >
                                    <X className="w-3 h-3 mr-1" />
                                    Limpar Filtros
                                </Button>
                                <SortOrderSelector 
                                    sortConfig={Array.isArray(sortConfig) ? sortConfig : [sortConfig]}
                                    onSortConfigChange={setSortConfig}
                                    availableSortFields={[
                                        { key: 'date', label: 'Data' },
                                        { key: 'time', label: 'Hora' },
                                        { key: 'name', label: 'Nome' },
                                        { key: 'origin', label: 'Origem' },
                                        { key: 'destination', label: 'Destino' },
                                        { key: 'type', label: 'Tipo' },
                                        { key: 'flight', label: 'Voo' },
                                        { key: 'airline', label: 'Cia Aérea' },
                                        { key: 'status', label: 'Status' }
                                    ]}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Passenger List / Grouped View */}
                    <Card>
                        <CardHeader className="py-3 px-4 border-b bg-gray-50/50">
                            <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Passageiros</CardTitle>
                                <CardDescription className="text-xs">
                                    {getFilteredAndSortedPassengers().length} encontrados
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => setShowMissingPhoneDialog(true)}
                                >
                                    <PhoneOff className="w-3 h-3 mr-1" />
                                    Sem Telefone ({passengers.filter(p => !p.passenger_phone || p.passenger_phone.trim() === '').length})
                                </Button>
                                {viewMode === 'list' && (
                                     <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={toggleSelectAll}>
                                        {selectedPassengers.length > 0 ? "Desmarcar Todos" : "Selecionar Visíveis"}
                                     </Button>
                                )}
                            </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {viewMode === 'grouped' ? (
                                <div className="p-4 bg-gray-50 min-h-[400px]">
                                    {renderGroupedView()}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40px] px-2">
                                                <Checkbox 
                                                    checked={getFilteredAndSortedPassengers().length > 0 && getFilteredAndSortedPassengers().every(p => selectedPassengers.includes(p.id))}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead className="cursor-pointer hover:text-blue-600 text-xs px-2" onClick={() => toggleSort('name')}>Nome <ArrowUpDown className="w-3 h-3 inline" /></TableHead>
                                            <TableHead className="text-xs px-2">#</TableHead>
                                            <TableHead className="text-xs px-2">Tipo</TableHead>
                                            <TableHead className="cursor-pointer hover:text-blue-600 text-xs px-2" onClick={() => toggleSort('date')}>Data <ArrowUpDown className="w-3 h-3 inline" /></TableHead>
                                            <TableHead className="cursor-pointer hover:text-blue-600 text-xs px-2" onClick={() => toggleSort('time')}>Hora <ArrowUpDown className="w-3 h-3 inline" /></TableHead>
                                            <TableHead className="text-xs px-2">Voo</TableHead>
                                            <TableHead className="text-xs px-2 cursor-pointer" onClick={() => toggleSort('origin')}>Origem</TableHead>
                                            <TableHead className="text-xs px-2 cursor-pointer" onClick={() => toggleSort('destination')}>Destino</TableHead>
                                            <TableHead className="text-xs px-2">Status</TableHead>
                                            <TableHead className="text-xs px-2 text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {getFilteredAndSortedPassengers().length === 0 ? (
                                            <TableRow><TableCell colSpan={10} className="text-center py-8 text-gray-500">Nenhum passageiro encontrado.</TableCell></TableRow>
                                        ) : (
                                            getFilteredAndSortedPassengers().map((p, index) => (
                                                <TableRow key={p.id} className={`hover:bg-gray-50 ${selectedPassengers.includes(p.id) ? "bg-blue-50/60" : ""}`}>
                                                    <TableCell className="px-2">
                                                        <Checkbox checked={selectedPassengers.includes(p.id)} onCheckedChange={() => toggleSelectPassenger(p.id)} />
                                                    </TableCell>
                                                    <TableCell className="px-2 font-medium text-xs">
                                                        <div className="flex flex-col">
                                                            <span>{p.passenger_name}</span>
                                                            {/* Tags Display */}
                                                            {p.tags && p.tags.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                                    {p.tags.map((tag, idx) => (
                                                                        <Badge key={idx} variant="secondary" className="text-[9px] h-4 px-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">
                                                                            {tag}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {/* Debug visual para forçar renderização se dados existirem */}
                                                            {(p.is_companion === true || String(p.is_companion) === 'true') && (
                                                                <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5 bg-gray-100 px-1 py-0.5 rounded w-fit">
                                                                    <Users className="w-3 h-3" /> 
                                                                    Acomp. {p.companion_relationship ? `(${p.companion_relationship})` : ''}
                                                                </span>
                                                            )}
                                                            {!(p.is_companion === true || String(p.is_companion) === 'true') && passengers.some(sub => sub.main_passenger_id === p.id) && (
                                                                <span className="text-[10px] text-blue-700 font-semibold flex items-center gap-1 mt-0.5 bg-blue-50 px-1 py-0.5 rounded w-fit">
                                                                    <Users className="w-3 h-3" /> 
                                                                    Principal ({passengers.filter(sub => sub.main_passenger_id === p.id).length} acomp.)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-2 text-xs text-gray-500">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="px-2"><Badge variant="outline" className="text-[10px] h-5 px-1">{p.trip_type}</Badge></TableCell>
                                                    <TableCell className="px-2 text-xs">{safeFormat(p.date, "dd/MM")}</TableCell>
                                                    <TableCell className="px-2 text-xs font-semibold text-gray-700">{p.time}</TableCell>
                                                    <TableCell className="px-2 text-xs text-gray-500">{p.airline} {p.flight_number}</TableCell>
                                                    <TableCell className="px-2 text-xs max-w-[100px] truncate" title={p.arrival_point || p.origin_address}>{p.arrival_point || p.origin_address}</TableCell>
                                                    <TableCell className="px-2 text-xs max-w-[100px] truncate" title={p.destination_address}>{p.destination_address}</TableCell>
                                                    <TableCell className="px-2">
                                                        <Badge variant={p.status === 'assigned' ? 'default' : 'outline'} className={`text-[10px] h-5 px-1 ${p.status === 'assigned' ? 'bg-green-100 text-green-800' : 'text-gray-400'}`}>
                                                            {p.status === 'assigned' ? 'Agrupado' : 'Pendente'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="px-2 text-right">
                                                        <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6 text-gray-500 hover:text-blue-600"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditPassenger(p);
                                                        }}
                                                        title="Editar Passageiro"
                                                        >
                                                        <Pencil className="w-3 h-3" />
                                                        </Button>
                                                        <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6 text-gray-500 hover:text-red-600 ml-1"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (!confirm("Tem certeza que deseja excluir este passageiro permanentemente?")) return;
                                                            try {
                                                                await base44.entities.EventPassenger.delete(p.id);
                                                                await base44.functions.invoke('syncEventCounts', { eventId });
                                                                toast.success("Passageiro excluído");
                                                                loadEventData();
                                                            } catch (err) {
                                                                console.error(err);
                                                                toast.error("Erro ao excluir");
                                                            }
                                                        }}
                                                        title="Excluir Passageiro"
                                                        >
                                                        <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Floating Action Button for Mobile - Manual Trip Creation */}
                {selectedPassengers.length > 0 && (
                    <div className="fixed bottom-4 right-4 z-50 lg:hidden">
                        <Button 
                            size="lg"
                            className="rounded-full w-14 h-14 shadow-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                            onClick={() => setShowManualTripDialog(true)}
                        >
                            <div className="relative">
                                <Truck className="w-6 h-6" />
                                <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                                    {selectedPassengers.length}
                                </div>
                            </div>
                        </Button>
                    </div>
                )}

                {/* Right Side Panel - Manual Trip Creation - Desktop Only */}
                {selectedPassengers.length > 0 && (
                    <div className="hidden lg:block w-80 flex-shrink-0 animate-in slide-in-from-right duration-300 sticky top-24 h-fit">
                        <Card className="border-l-4 border-l-blue-600 shadow-md">
                            <CardHeader className="py-3 px-4 bg-blue-50/50 border-b">
                                <CardTitle className="text-sm font-bold text-blue-800 flex items-center gap-2">
                                    <Truck className="w-4 h-4" />
                                    Nova Viagem Manual
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b">
                                    <span className="text-sm font-medium text-gray-700">Passageiros:</span>
                                    <Badge className="text-sm px-2 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200">
                                        {selectedPassengers.length}
                                    </Badge>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <div className="space-y-1 flex-1">
                                            <Label className="text-xs text-gray-500 font-medium uppercase">Veículo</Label>
                                            <Select value={manualTripVehicle} onValueChange={(val) => {
                                                setManualTripVehicle(val);
                                                const v = supplierVehicles.find(v => v.name === val) || logisticsParams.vehicle_capacities.find(v => v.vehicle_type === val);
                                                if (v) setManualTripCapacity(v.max_passengers || v.capacity);
                                            }}>
                                                <SelectTrigger className="w-full bg-white border-blue-200 focus:ring-blue-500">
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {supplierVehicles.length > 0 ? (
                                                        supplierVehicles.map((v) => (
                                                            <SelectItem key={v.id} value={v.name}>
                                                                <div className="flex justify-between w-full gap-2">
                                                                    <span className="font-medium">{v.name}</span>
                                                                    <span className="text-gray-500 text-xs">({v.max_passengers} pax)</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        logisticsParams.vehicle_capacities.map((v, idx) => (
                                                            <SelectItem key={idx} value={v.vehicle_type}>
                                                                <span className="capitalize">{v.vehicle_type}</span> ({v.capacity} pax)
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1 w-20">
                                            <Label className="text-xs text-gray-500 font-medium uppercase">Cap.</Label>
                                            <Input 
                                                type="number" 
                                                className="bg-white border-blue-200 focus:ring-blue-500 h-10"
                                                value={manualTripCapacity} 
                                                onChange={(e) => setManualTripCapacity(e.target.value)} 
                                            />
                                        </div>
                                    </div>

                                    {getSuggestedVehicle() && manualTripVehicle !== getSuggestedVehicle().name && (
                                        <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-100 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            Sugestão: <strong>{getSuggestedVehicle().name}</strong>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 pt-2 border-t">
                                    <Label className="text-xs font-semibold flex items-center gap-2">
                                        Ajuste Horário Pickup
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" 
                                            className="w-20 h-8 text-xs bg-white"
                                            step="0.5"
                                            value={manualTripPickupLeadTime}
                                            onChange={(e) => setManualTripPickupLeadTime(parseFloat(e.target.value) || 0)}
                                        />
                                        <span className="text-[10px] text-gray-500">horas (+ antes / - depois)</span>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <Button 
                                        className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm" 
                                        onClick={handleCreateManualTrip}
                                        disabled={isGenerating || !manualTripVehicle}
                                    >
                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Truck className="w-4 h-4 mr-2" />}
                                        Criar Viagem
                                    </Button>
                                    
                                    <Button 
                                        variant="outline" 
                                        className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 mt-2" 
                                        onClick={handleBulkDelete}
                                        disabled={isGenerating}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Excluir Selecionados
                                    </Button>

                                    <Button 
                                        variant="ghost" 
                                        className="w-full text-xs text-gray-500 hover:text-red-600 hover:bg-red-50" 
                                        onClick={() => setSelectedPassengers([])}
                                    >
                                        Limpar Seleção
                                    </Button>
                                </div>

                                <div className="text-[10px] text-gray-400 text-center pt-2 border-t">
                                    O veículo é sugerido automaticamente pela capacidade, mas você pode alterar acima.
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
              <EventServicesManager eventId={eventId} />
          </TabsContent>

          <TabsContent value="partners" className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-start gap-4 mb-6">
                      <div className="bg-indigo-100 p-3 rounded-full">
                          <Users className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                          <h2 className="text-lg font-bold text-gray-900">Gestão de Parceiros e Links</h2>
                          <p className="text-sm text-gray-500 max-w-2xl">
                              Gerencie o acesso dos seus parceiros (subcontratados) às viagens deste evento.
                              Gere links dinâmicos que mostram todas as viagens atribuídas a cada parceiro em tempo real.
                          </p>
                      </div>
                  </div>

                  <div className="grid gap-6">
                      {(() => {
                          // Agrupar viagens por parceiro
                          const partnerGroups = trips.reduce((acc, trip) => {
                              if (trip.subcontractor_id) {
                                  if (!acc[trip.subcontractor_id]) {
                                      const partner = subcontractors.find(s => s.id === trip.subcontractor_id);
                                      acc[trip.subcontractor_id] = {
                                          id: trip.subcontractor_id,
                                          name: partner ? partner.name : 'Parceiro Desconhecido',
                                          trips: [],
                                          totalPax: 0,
                                          totalValue: 0
                                      };
                                  }
                                  acc[trip.subcontractor_id].trips.push(trip);
                                  acc[trip.subcontractor_id].totalPax += trip.passenger_count || 0;
                                  acc[trip.subcontractor_id].totalValue += trip.subcontractor_cost || 0;
                              }
                              return acc;
                          }, {});

                          const partnerList = Object.values(partnerGroups);

                          if (partnerList.length === 0) {
                              return (
                                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                      <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                      <h3 className="font-medium text-gray-900">Nenhum parceiro atribuído</h3>
                                      <p className="text-sm text-gray-500 mt-1">
                                          Atribua viagens a parceiros/subcontratados na aba "Viagens / Grupos" para vê-los aqui.
                                      </p>
                                  </div>
                              );
                          }

                          return partnerList.map(partner => (
                              <Card key={partner.id} className="overflow-hidden border-l-4 border-l-indigo-500">
                                  <CardContent className="p-0">
                                      <div className="flex flex-col md:flex-row">
                                          <div className="p-6 flex-1">
                                              <div className="flex items-center justify-between mb-4">
                                                  <h3 className="text-xl font-bold text-gray-900">{partner.name}</h3>
                                                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                                                      {partner.trips.length} Viagens Atribuídas
                                                  </Badge>
                                              </div>
                                              
                                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                                  <div className="bg-gray-50 p-3 rounded-lg">
                                                      <p className="text-xs text-gray-500 uppercase font-semibold">Passageiros</p>
                                                      <p className="text-lg font-bold text-gray-900">{partner.totalPax}</p>
                                                  </div>
                                                  <div className="bg-gray-50 p-3 rounded-lg">
                                                      <p className="text-xs text-gray-500 uppercase font-semibold">Custo Previsto</p>
                                                      <p className="text-lg font-bold text-green-700">
                                                          R$ {partner.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                      </p>
                                                  </div>
                                                  <div className="bg-gray-50 p-3 rounded-lg">
                                                      <p className="text-xs text-gray-500 uppercase font-semibold">Primeira Viagem</p>
                                                      <p className="text-sm font-medium text-gray-900">
                                                          {safeFormat(partner.trips[0]?.date, 'dd/MM')} {partner.trips[0]?.start_time}
                                                      </p>
                                                  </div>
                                                  <div className="bg-gray-50 p-3 rounded-lg">
                                                      <p className="text-xs text-gray-500 uppercase font-semibold">Última Viagem</p>
                                                      <p className="text-sm font-medium text-gray-900">
                                                          {safeFormat(partner.trips[partner.trips.length-1]?.date, 'dd/MM')} {partner.trips[partner.trips.length-1]?.start_time}
                                                      </p>
                                                  </div>
                                              </div>

                                              <div className="flex flex-wrap gap-3 mt-4">
                                                  <Button 
                                                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                                      onClick={async () => {
                                                          try {
                                                              const payload = {
                                                                  name: `Link Parceiro - ${partner.name} - ${event.event_name}`,
                                                                  filters: {
                                                                      event_id: eventId,
                                                                      subcontractor_id: partner.id
                                                                  },
                                                                  expiresInHours: 720, // 30 dias
                                                                  coordinator_name: partner.name
                                                              };
                                                              
                                                              const response = await base44.functions.invoke('createSharedTripList', payload);
                                                              
                                                              if (response.data && response.data.success) {
                                                                  const url = window.location.origin + response.data.publicPath;
                                                                  const controlNumber = response.data.sharedList?.control_number || 'N/A';
                                                                  
                                                                  navigator.clipboard.writeText(url);
                                                                  toast.success(`Link Gerado! Controle: ${controlNumber}`, {
                                                                      description: "Link copiado. Use o número de controle para rastrear este link.",
                                                                      duration: 5000,
                                                                      className: "bg-green-50 border-green-200"
                                                                  });
                                                              } else {
                                                                  toast.error("Erro ao gerar link");
                                                              }
                                                          } catch(err) {
                                                              console.error(err);
                                                              toast.error("Erro ao gerar link");
                                                          }
                                                      }}
                                                  >
                                                      <Link2 className="w-4 h-4 mr-2" />
                                                      Copiar Link Dinâmico
                                                  </Button>
                                                  
                                                  <Button variant="outline" className="text-gray-600">
                                                      <FileText className="w-4 h-4 mr-2" />
                                                      Relatório PDF (Em Breve)
                                                  </Button>
                                              </div>
                                          </div>
                                          
                                          {/* Mini Preview List */}
                                          <div className="w-full md:w-80 bg-gray-50 p-4 border-t md:border-t-0 md:border-l border-gray-200 max-h-64 overflow-y-auto">
                                              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Próximas Viagens</h4>
                                              <div className="space-y-2">
                                                  {partner.trips.slice(0, 5).map(t => (
                                                      <div key={t.id} className="bg-white p-2 rounded border border-gray-200 text-xs">
                                                          <div className="flex justify-between font-medium">
                                                              <span>{safeFormat(t.date, 'dd/MM')} {t.start_time}</span>
                                                              <span className="text-indigo-600">{t.name}</span>
                                                          </div>
                                                          <div className="text-gray-500 mt-1 truncate">
                                                              {t.origin} → {t.destination}
                                                          </div>
                                                      </div>
                                                  ))}
                                                  {partner.trips.length > 5 && (
                                                      <div className="text-center text-xs text-gray-500 italic pt-2">
                                                          + {partner.trips.length - 5} viagens...
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  </CardContent>
                              </Card>
                          ));
                      })()}
                  </div>
              </div>
          </TabsContent>

          <TabsContent value="logistics" className="space-y-4">
            {/* Logistics Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button onClick={() => setShowLogisticsDialog(true)} className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-initial">
                        <PlayCircle className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Gerar Logística Auto</span>
                        <span className="sm:hidden">Gerar Auto</span>
                    </Button>
                    <Button variant="outline" onClick={() => setShowEmptyTripDialog(true)} className="border-dashed border-gray-400 flex-1 sm:flex-initial">
                        <Plus className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Nova Viagem Extra</span>
                        <span className="sm:hidden">Extra</span>
                    </Button>
                    <Button variant="outline" onClick={() => handleOpenSchedule(null)} className="border-blue-200 text-blue-700 bg-blue-50 flex-1 sm:flex-initial" title="Ver Agenda de Motoristas">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Agenda Motoristas</span>
                        <span className="sm:hidden">Agenda</span>
                    </Button>
                    <Button variant="outline" onClick={handleExportPendingTrips} className="border-gray-200 text-gray-700 bg-gray-50 flex-1 sm:flex-initial" title="Exportar viagens sem motorista">
                        <Download className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Exportar Pendências</span>
                        <span className="sm:hidden">Exportar</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => setShowMissingPhoneDialog(true)} 
                        className="border-red-200 text-red-600 bg-red-50 flex-1 sm:flex-initial hover:bg-red-100" 
                        title="Gerenciar passageiros sem telefone"
                    >
                        <PhoneOff className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Sem Telefone ({passengersInFilteredTripsWithMissingPhone.length})</span>
                        <span className="sm:hidden">Sem Tel</span>
                    </Button>
                </div>
                {selectedTripsForShare.length > 0 && (
                    <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex-1 sm:flex-initial">
                                    <Settings className="w-4 h-4 mr-2" />
                                    Ações em Massa ({selectedTripsForShare.length})
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Gestão de Alocação</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleBulkFlexibleAllocation(true)}>
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                    Tornar Flexível (Porta a Porta)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBulkFlexibleAllocation(false)}>
                                    <X className="w-4 h-4 mr-2 text-red-600" />
                                    Remover Flexibilidade
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button 
                            className="bg-green-600 hover:bg-green-700 text-white shadow-md flex-1 sm:flex-initial"
                            onClick={() => setShowShareDialog(true)}
                        >
                            <Share2 className="w-4 h-4 mr-2" />
                            Compartilhar
                        </Button>
                    </div>
                )}
            </div>

            {/* Logistics Filters */}
            {trips.length > 0 && (
                <Card className="bg-white">
                    <CardContent className="p-3 sm:p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 items-end">
                            <div className="space-y-1 col-span-2 sm:col-span-3 lg:col-span-2">
                                <Label className="text-xs text-gray-500">Buscar Viagem</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                                    <Input 
                                        placeholder="Passageiro, voo, origem..." 
                                        className="pl-9 h-8 text-xs sm:text-sm"
                                        value={logisticsFilters.search}
                                        onChange={(e) => setLogisticsFilters({...logisticsFilters, search: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Motorista</Label>
                                <Select value={logisticsFilters.driverFilter} onValueChange={(v) => setLogisticsFilters({...logisticsFilters, driverFilter: v})}>
                                    <SelectTrigger className="h-8 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {uniqueDrivers.map((driver) => (
                                            <SelectItem key={driver} value={driver}>{driver}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Parceiro</Label>
                                <Select value={logisticsFilters.partnerFilter} onValueChange={(v) => setLogisticsFilters({...logisticsFilters, partnerFilter: v})}>
                                    <SelectTrigger className="h-8 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {subcontractors.map((partner) => (
                                            <SelectItem key={partner.id} value={partner.id}>{partner.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Coordenador</Label>
                                <Select value={logisticsFilters.coordinatorFilter} onValueChange={(v) => setLogisticsFilters({...logisticsFilters, coordinatorFilter: v})}>
                                    <SelectTrigger className="h-8 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {coordinators.map((coord) => (
                                            <SelectItem key={coord.id} value={coord.id}>{coord.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Tipo</Label>
                                <Select value={logisticsFilters.tripType} onValueChange={(v) => setLogisticsFilters({...logisticsFilters, tripType: v})}>
                                    <SelectTrigger className="h-8 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="IN">Chegada (IN)</SelectItem>
                                        <SelectItem value="OUT">Saída (OUT)</SelectItem>
                                        <SelectItem value="transfer">Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Telefone Pax</Label>
                                <Select value={logisticsFilters.missingPhoneFilter} onValueChange={(v) => setLogisticsFilters({...logisticsFilters, missingPhoneFilter: v})}>
                                    <SelectTrigger className="h-8 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="with_missing_phone">⚠️ Com Pax Sem Telefone</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Status</Label>
                                <Select value={logisticsFilters.driverStatus} onValueChange={(v) => setLogisticsFilters({...logisticsFilters, driverStatus: v})}>
                                    <SelectTrigger className="h-8 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="pending">⚠️ Sem Motorista</SelectItem>
                                        <SelectItem value="assigned">✓ Com Motorista</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Veículo</Label>
                                <Select value={logisticsFilters.vehicleType} onValueChange={(v) => setLogisticsFilters({...logisticsFilters, vehicleType: v})}>
                                    <SelectTrigger className="h-8 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {uniqueVehicleTypes.map((type) => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Data</Label>
                                <Select value={logisticsFilters.date} onValueChange={(v) => setLogisticsFilters({...logisticsFilters, date: v})}>
                                    <SelectTrigger className="h-8 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {uniqueTripDates.map((date) => (
                                            <SelectItem key={date} value={date}>
                                                {safeFormat(date, "dd/MM/yyyy")}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Origem</Label>
                                <Select value={logisticsFilters.originFilter} onValueChange={(v) => setLogisticsFilters({...logisticsFilters, originFilter: v})}>
                                    <SelectTrigger className="h-8 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {uniqueTripOrigins.map((origin) => (
                                            <SelectItem key={origin} value={origin}>{origin}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Destino</Label>
                                <Select value={logisticsFilters.destinationFilter} onValueChange={(v) => setLogisticsFilters({...logisticsFilters, destinationFilter: v})}>
                                    <SelectTrigger className="h-8 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {uniqueTripDestinations.map((dest) => (
                                            <SelectItem key={dest} value={dest}>{dest}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 col-span-2 sm:col-span-1">
                                <Label className="text-xs text-gray-500">Voo</Label>
                                <Select value={logisticsFilters.flightFilter} onValueChange={(v) => setLogisticsFilters({...logisticsFilters, flightFilter: v})}>
                                    <SelectTrigger className="h-8 text-xs sm:text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {uniqueTripFlights.map((flight) => (
                                            <SelectItem key={flight} value={flight}>{flight}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-3 pt-3 border-t">
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                                <div className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                    <Checkbox 
                                        id="select-all-trips"
                                        checked={getFilteredTrips().length > 0 && getFilteredTrips().every(t => selectedTripsForShare.includes(t.id))}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                const visibleIds = getFilteredTrips().map(t => t.id);
                                                setSelectedTripsForShare(prev => [...new Set([...prev, ...visibleIds])]);
                                            } else {
                                                const visibleIds = getFilteredTrips().map(t => t.id);
                                                setSelectedTripsForShare(prev => prev.filter(id => !visibleIds.includes(id)));
                                            }
                                        }}
                                    />
                                    <label htmlFor="select-all-trips" className="cursor-pointer font-bold text-blue-700 select-none">
                                        Selecionar Todos ({getFilteredTrips().length})
                                    </label>
                                </div>

                                <div className="flex gap-2 text-gray-600 items-center">
                                    <span>Total: <strong className="text-gray-900">{getFilteredTrips().length}</strong></span>
                                    <span className="text-orange-600">Sem Mot.: <strong>{trips.filter(t => !t.driver_id).length}</strong></span>
                                    <span className="text-green-600">Com Mot.: <strong>{trips.filter(t => t.driver_id).length}</strong></span>
                                    {selectedTripsForShare.length > 0 && (
                                        <span className="text-blue-600 ml-2">Selecionados: <strong>{selectedTripsForShare.length}</strong></span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                className="h-7 text-xs"
                                onClick={() => setLogisticsFilters({
                                    driverStatus: "all",
                                    vehicleType: "all", 
                                    date: "all",
                                    driverFilter: "all",
                                    coordinatorFilter: "all",
                                    partnerFilter: "all",
                                    originFilter: "all",
                                    destinationFilter: "all",
                                    flightFilter: "all",
                                    tripType: "all",
                                    missingPhoneFilter: "all",
                                    search: ""
                                })}
                            >
                                Limpar Filtros
                            </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {trips.length === 0 ? (
                <Card className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                        <Truck className="w-12 h-12 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-900">Nenhuma viagem gerada ainda</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            Clique em "Gerar Logística" para agrupar automaticamente os passageiros em veículos ou crie uma viagem extra manualmente.
                        </p>
                    </div>
                </Card>
            ) : getFilteredTrips().length === 0 ? (
                <Card className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                        <Filter className="w-12 h-12 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-900">Nenhuma viagem encontrada</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            Ajuste os filtros acima para visualizar outras viagens.
                        </p>
                        <Button 
                            variant="outline" 
                            onClick={() => setLogisticsFilters({
                                driverStatus: "all",
                                vehicleType: "all", 
                                date: "all",
                                driverFilter: "all",
                                coordinatorFilter: "all",
                                originFilter: "all",
                                destinationFilter: "all",
                                flightFilter: "all",
                                tripType: "all",
                                search: ""
                            })}
                        >
                            Limpar Filtros
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {getFilteredTrips().map((trip) => {
                        const isCancelled = trip.status === 'cancelled' || trip.driver_trip_status === 'cancelada_motorista';
                        return (
                        <Card key={trip.id} className={`overflow-hidden ${selectedTripsForShare.includes(trip.id) ? 'border-2 border-green-500 bg-green-50/10' : isCancelled ? 'border-2 border-red-500 bg-red-50/20' : (!trip.driver_id && !trip.is_casual_driver) ? 'border-2 border-orange-200 shadow-md' : ''}`}>
                            <div className={`border-l-4 ${selectedTripsForShare.includes(trip.id) ? 'border-green-500 bg-green-50/30' : isCancelled ? 'border-red-500 bg-red-50/30' : (!trip.driver_id && !trip.is_casual_driver) ? 'border-orange-500 bg-orange-50/30' : 'border-blue-500 bg-white'}`}>
                                <CardHeader className={`py-3 px-4 ${isCancelled ? 'bg-red-50/50' : (!trip.driver_id && !trip.is_casual_driver) ? 'bg-orange-50/50' : 'bg-gray-50/50'} flex flex-row items-center justify-between space-y-0`}>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {isCancelled && (
                                            <Badge className="bg-red-100 text-red-700 border border-red-300 font-bold">
                                                🚫 CANCELADA
                                            </Badge>
                                        )}
                                        <Checkbox 
                                            checked={selectedTripsForShare.includes(trip.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedTripsForShare([...selectedTripsForShare, trip.id]);
                                                } else {
                                                    setSelectedTripsForShare(selectedTripsForShare.filter(id => id !== trip.id));
                                                }
                                            }}
                                        />
                                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                            {trip.vehicle_type_category?.toUpperCase()}
                                        </Badge>
                                        {getTripStatusBadge(trip.driver_trip_status)}
                                        
                                        {/* Indicador de Valor a Cobrar */}
                                        {((trip.final_client_price && trip.final_client_price > 0) || (trip.client_price && trip.client_price > 0)) && (
                                            <Badge 
                                                className="bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 cursor-help" 
                                                title={`Valor: R$ ${(trip.final_client_price || trip.client_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                            >
                                                <DollarSign className="w-3 h-3" />
                                            </Badge>
                                        )}

                                        {/* Indicador de Parceiro */}
                                        {trip.subcontractor_id && (
                                            <Badge 
                                                className="bg-indigo-100 text-indigo-700 border border-indigo-300 hover:bg-indigo-200 cursor-help" 
                                                title="Atribuído a Parceiro"
                                            >
                                                <Users className="w-3 h-3" />
                                            </Badge>
                                        )}

                                        {(trip.coordinator_ids?.length > 0 || trip.coordinator_id) && (
                                            <Badge 
                                                className="bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 cursor-help flex items-center gap-1" 
                                                title={`Coordenadores: ${(trip.coordinator_ids && trip.coordinator_ids.length > 0 ? trip.coordinator_ids : [trip.coordinator_id]).map(id => coordinators.find(c => c.id === id)?.name || 'Desconhecido').join(', ')}`}
                                            >
                                                <User className="w-3 h-3" />
                                                <span className="text-[10px] hidden sm:inline">
                                                    {(trip.coordinator_ids && trip.coordinator_ids.length > 0 ? trip.coordinator_ids : [trip.coordinator_id]).length > 1 
                                                        ? `${(trip.coordinator_ids && trip.coordinator_ids.length > 0 ? trip.coordinator_ids : [trip.coordinator_id]).length} Coords`
                                                        : (coordinators.find(c => c.id === (trip.coordinator_ids?.[0] || trip.coordinator_id))?.name?.split(' ')[0] || 'Coord')}
                                                </span>
                                            </Badge>
                                        )}

                                        <span className="font-bold text-gray-900">
                                            {trip.trip_code ? (
                                                <span className="text-blue-700 mr-2">{trip.trip_code}</span>
                                            ) : null}
                                            {/* Remove "- X Pax" from name if present to avoid redundancy */}
                                            {trip.name ? trip.name.replace(/ - \d+ Pax$/i, '').replace(/ \(Cópia\)/g, '*') : trip.name}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            ({trip.passenger_count} passageiros)
                                        </span>
                                        {!trip.driver_id && !trip.is_casual_driver && (
                                            <Badge className="bg-orange-100 text-orange-700 border border-orange-300">
                                                ⚠️ Sem Motorista
                                            </Badge>
                                        )}
                                        {trip.is_casual_driver && (
                                            <Badge className="bg-orange-100 text-orange-800 border border-orange-300" title={`Motorista: ${trip.casual_driver_name}`}>
                                                👤 {trip.casual_driver_name}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-lg text-blue-800 font-bold">
                                        {safeFormat(trip.date, "dd/MM")} • {trip.start_time}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="flex flex-col gap-4 text-sm">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-gray-700">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium">Origem:</span> {trip.origin}
                                            </div>
                                            {trip.additional_stops && trip.additional_stops.length > 0 && trip.additional_stops.map((stop, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-gray-700 ml-1 pl-3 border-l-2 border-dashed border-gray-300 my-1">
                                                    <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium">{stop.address}</span>
                                                        {stop.notes && <span className="text-[10px] text-gray-500 italic">{stop.notes}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex items-center gap-2 text-gray-700">
                                                <MapPin className="w-4 h-4 text-green-500" />
                                                <span className="font-medium">Destino:</span> {trip.destination}
                                            </div>
                                            {getTripFlightNumbers(trip.id).length > 0 && (
                                                <div className="flex items-center gap-2 text-gray-700 flex-wrap">
                                                    <Plane className="w-4 h-4 text-blue-500" />
                                                    <span className="font-medium">Voos:</span>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {getTripFlightNumbers(trip.id).map((flight, idx) => (
                                                            <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                                                {flight}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ETA Display */}
                                            {trip.eta_duration_text && (
                                                <div className="flex items-center gap-2 text-gray-700 bg-blue-50 p-1.5 rounded-md border border-blue-100 w-fit">
                                                    <Map className="w-4 h-4 text-blue-600" />
                                                    <span className="font-bold text-blue-800">{trip.eta_duration_text}</span>
                                                    <span className="text-xs text-gray-500">
                                                        (Chegada: {safeFormat(trip.estimated_arrival_time, "HH:mm")})
                                                    </span>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-5 w-5 ml-1 hover:bg-blue-100 rounded-full"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRefreshETA(trip);
                                                        }}
                                                        title="Atualizar ETA agora"
                                                    >
                                                        <RefreshCw className="w-3 h-3 text-blue-600" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Partner Notes */}
                                        {trip.partner_notes && (
                                            <div className="bg-yellow-50 border border-yellow-200 p-2 rounded-md flex gap-2 items-start">
                                                <AlertCircle className="w-4 h-4 text-yellow-700 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-bold text-yellow-800 uppercase">Observação do Gestor</p>
                                                    <p className="text-xs text-yellow-900">{trip.partner_notes}</p>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {!trip.eta_duration_text && (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="h-8 text-xs text-gray-600 border-gray-200 hover:bg-gray-50"
                                                    onClick={() => handleRefreshETA(trip)}
                                                    title="Calcular ETA"
                                                >
                                                    <Map className="w-3 h-3 mr-1 sm:mr-2" />
                                                    <span className="hidden sm:inline">Calcular ETA</span>
                                                    <span className="sm:hidden">ETA</span>
                                                </Button>
                                            )}
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                                onClick={() => setEditTripDialogTrip(trip)}
                                                title="Editar Data/Hora"
                                            >
                                                <Pencil className="w-3 h-3 mr-1 sm:mr-2" />
                                                <span className="hidden sm:inline">Editar</span>
                                                <span className="sm:hidden">Edit</span>
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className={`h-8 text-xs ${(!trip.driver_id && !trip.is_casual_driver) ? 'border-orange-300 text-orange-600 bg-orange-50' : 'text-green-600 border-green-200 bg-green-50'}`}
                                                onClick={() => openDriverDialog(trip)}
                                            >
                                                <User className="w-3 h-3 mr-1 sm:mr-2" />
                                                <span className="hidden sm:inline">{(trip.driver_id || trip.is_casual_driver) ? 'Motorista Atribuído' : 'Atribuir Motorista'}</span>
                                                <span className="sm:hidden">{(trip.driver_id || trip.is_casual_driver) ? 'Motorista' : 'Atribuir'}</span>
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-blue-600 hover:bg-blue-50 border border-blue-100"
                                                onClick={() => handleOpenSchedule(trip)}
                                                title="Atribuir via Agenda"
                                            >
                                                <Calendar className="w-4 h-4" />
                                            </Button>
                                            {(trip.driver_id || trip.is_casual_driver || trip.subcontractor_driver_name) && (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-8 text-xs text-blue-600 border-blue-200 bg-blue-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setTripToNotify(trip);
                                                        setShowNotificationPreview(true);
                                                    }}
                                                    title="Notificar Motorista"
                                                >
                                                    <Send className="w-3 h-3 mr-1 sm:mr-2" />
                                                    <span className="hidden sm:inline">Notificar</span>
                                                </Button>
                                            )}
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 text-xs"
                                                onClick={() => handleOpenPassengerList(trip)}
                                                disabled={!trip.driver_id && !trip.is_casual_driver}
                                                title={(!trip.driver_id && !trip.is_casual_driver) ? "Atribua um motorista antes" : "Gerenciar Cartões"}
                                            >
                                                <QrCode className="w-3 h-3 mr-1 sm:mr-2" />
                                                <span className="hidden sm:inline">Cartões</span>
                                                <span className="sm:hidden">QR</span>
                                                {passengers.filter(p => p.event_trip_id === trip.id && !p.whatsApp_last_sent_at && !p.email_last_sent_at).length > 0 && (
                                                    <Badge className="ml-1.5 h-4 min-w-[16px] px-1 bg-orange-600 text-white text-[9px] hover:bg-orange-700 border-0 rounded-full flex items-center justify-center" title="Cartões Pendentes de Envio">
                                                        {passengers.filter(p => p.event_trip_id === trip.id && !p.whatsApp_last_sent_at && !p.email_last_sent_at).length}
                                                    </Badge>
                                                )}
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                                onClick={() => handleCloneTrip(trip)}
                                                title="Clonar Viagem e Passageiros"
                                            >
                                                <Copy className="w-3 h-3 mr-1 sm:mr-2" />
                                                <span className="hidden sm:inline">Clonar</span>
                                                <span className="sm:hidden">Clone</span>
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                                onClick={() => handleUngroupTrip(trip)}
                                            >
                                                <Trash2 className="w-3 h-3 mr-1 sm:mr-2" />
                                                <span className="hidden sm:inline">Desagrupar</span>
                                                <span className="sm:hidden">Del</span>
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                                onClick={() => handleCancelTrip(trip)}
                                            >
                                                <X className="w-3 h-3 mr-1 sm:mr-2" />
                                                <span className="hidden sm:inline">Cancelar Viagem</span>
                                                <span className="sm:hidden">Cancelar</span>
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className={`h-8 text-xs ${(trip.additional_items && trip.additional_items.length > 0) ? 'bg-purple-50 text-purple-700 border-purple-200' : 'text-gray-600'}`}
                                                onClick={() => {
                                                    setSelectedTripForItems(trip);
                                                    setShowAdditionalItemsDialog(true);
                                                }}
                                                title="Adicionar itens extras (kit lanche, coordenador, etc)"
                                            >
                                                <Package className="w-3 h-3 mr-1 sm:mr-2" />
                                                <span className="hidden sm:inline">Adicionais</span>
                                                {(trip.additional_items && trip.additional_items.length > 0) && (
                                                    <Badge className="ml-1 h-4 px-1 bg-purple-200 text-purple-800 text-[9px] hover:bg-purple-300">
                                                        {trip.additional_items.length}
                                                    </Badge>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Passenger List Expansion */}
                                    {expandedTripPassengers[trip.id] && (
                                        <div className="mt-3 pt-3 border-t border-gray-100 animate-in slide-in-from-top duration-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Passageiros ({trip.passenger_count})</h4>
                                            </div>
                                            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                                                {passengers.filter(p => p.event_trip_id === trip.id).length === 0 ? (
                                                    <p className="text-xs text-gray-400 italic py-2 text-center">Nenhum passageiro nesta viagem.</p>
                                                ) : (
                                                    passengers.filter(p => p.event_trip_id === trip.id)
                                                        .sort((a, b) => (a.passenger_name || '').localeCompare(b.passenger_name || ''))
                                                        .map(p => (
                                                        <div key={p.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                                    p.boarding_status === 'boarded' ? 'bg-green-500' : 
                                                                    p.boarding_status === 'no_show' ? 'bg-red-500' : 'bg-yellow-400'
                                                                }`} title={p.boarding_status} />
                                                                <span className="font-medium text-gray-700 truncate">{p.passenger_name}</span>
                                                                {p.tags && p.tags.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {p.tags.map((tag, idx) => (
                                                                            <Badge key={idx} variant="secondary" className="text-[9px] h-4 px-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">
                                                                                {tag}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {(p.is_companion === true || String(p.is_companion) === 'true') && (
                                                                    <Badge variant="outline" className="text-[9px] h-4 px-1 bg-gray-100 text-gray-600 border-gray-200">Acomp.</Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-gray-500 flex-shrink-0 ml-2">
                                                                <div onClick={(e) => e.stopPropagation()}>
                                                                    <Select
                                                                        value={p.boarding_status}
                                                                        onValueChange={(val) => updatePassengerBoardingStatus(p.id, val)}
                                                                    >
                                                                        <SelectTrigger className={`h-6 text-[10px] px-2 w-[100px] border-none shadow-none focus:ring-0 ${
                                                                            p.boarding_status === 'boarded' ? 'bg-green-100 text-green-700 font-bold' : 
                                                                            p.boarding_status === 'no_show' ? 'bg-red-100 text-red-700 font-bold' : 
                                                                            'bg-gray-100 text-gray-600'
                                                                        }`}>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="pending">Aguardando</SelectItem>
                                                                            <SelectItem value="boarded">Embarcado</SelectItem>
                                                                            <SelectItem value="no_show">No Show</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                {p.document_id && <span className="hidden sm:inline">{p.document_id}</span>}
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-5 w-5 text-gray-400 hover:text-blue-600"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEditPassenger(p);
                                                                    }}
                                                                    title="Editar Passageiro"
                                                                >
                                                                    <Pencil className="w-3 h-3" />
                                                                </Button>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-5 w-5 text-gray-400 hover:text-red-600 -mr-1"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if(confirm(`Remover ${p.passenger_name} desta viagem? Ele voltará para a lista de pendentes.`)) {
                                                                            // Logic to remove single passenger (calling existing function or creating new one)
                                                                            base44.functions.invoke('removePassengerFromTrip', { passengerId: p.id, tripId: trip.id })
                                                                                .then(() => {
                                                                                    toast.success("Passageiro removido");
                                                                                    loadEventData();
                                                                                })
                                                                                .catch(err => toast.error("Erro ao remover: " + err.message));
                                                                        }
                                                                    }}
                                                                    title="Remover da viagem"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Quick Actions Row */}
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                                       <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] sm:text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2"
                                            onClick={() => toggleTripPassengers(trip.id)}
                                        >
                                            {expandedTripPassengers[trip.id] ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                                            {expandedTripPassengers[trip.id] ? 'Ocultar Passageiros' : 'Ver Passageiros'}
                                        </Button>

                                       <Button 
                                           variant="ghost" 
                                           size="sm" 
                                           className="h-6 text-[10px] sm:text-xs text-blue-600 hover:bg-blue-50 px-2"
                                           onClick={() => {
                                               setTargetTripForAdd(trip);
                                               setShowAddPassengerDialog(true);
                                           }}
                                       >
                                           <Plus className="w-3 h-3 mr-1" /> 
                                           <span className="hidden sm:inline">Adicionar Passageiro</span>
                                           <span className="sm:hidden">Add Pax</span>
                                           </Button>

                                           {trip.is_flexible_vehicle && (
                                           <Button 
                                               variant="default" 
                                               size="sm" 
                                               className="h-6 text-[10px] sm:text-xs bg-indigo-600 hover:bg-indigo-700 px-2"
                                               onClick={() => {
                                                   setTargetTripForAdd(trip);
                                                   setAddPassengerOnlyFlexible(true); // Auto-enable filter
                                                   setShowAddPassengerDialog(true);
                                               }}
                                               title="Adicionar passageiros flexíveis a este veículo"
                                           >
                                               <Users className="w-3 h-3 mr-1" /> 
                                               <span className="hidden sm:inline">Resgatar Flexíveis</span>
                                               <span className="sm:hidden">Flex</span>
                                           </Button>
                                           )}
                                           </div>
                                           </CardContent>
                                           </div>
                                           </Card>
                                           );
                                           })}
                </div>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
              <div className="flex justify-center mb-6">
                  <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                      <button 
                          onClick={() => setReportMode('client')}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${reportMode === 'client' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                          Visão Cliente (Externo)
                      </button>
                      <button 
                          onClick={() => setReportMode('financial')}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${reportMode === 'financial' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                          Visão Gerencial (Interno)
                      </button>
                  </div>
              </div>

              {reportMode === 'financial' ? (
                  <EventFinancialReport eventId={eventId} />
              ) : (
                  <EventClientReport event={event} trips={trips} passengers={passengers} />
              )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog for Adding Passengers */}
      <AlertDialog open={showAddPassengersConfirmation} onOpenChange={setShowAddPassengersConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Viagem Criada com Sucesso!</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja adicionar passageiros a esta viagem agora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowAddPassengersConfirmation(false)}>Não, obrigado</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
                setShowAddPassengersConfirmation(false);
                if (newlyCreatedTripId) {
                    let trip = trips.find(t => t.id === newlyCreatedTripId);
                    
                    if (!trip) {
                        try {
                            trip = await base44.entities.EventTrip.get(newlyCreatedTripId);
                        } catch (e) {
                            console.error("Erro ao buscar nova viagem", e);
                            toast.error("Erro ao abrir viagem. Tente encontrá-la na lista.");
                            return;
                        }
                    }
                    
                    if (trip) {
                        setTargetTripForAdd(trip);
                        setShowAddPassengerDialog(true);
                    }
                }
            }}>
              Sim, adicionar passageiros
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Adding MORE Passengers */}
      <AlertDialog open={showAddMorePassengersConfirm} onOpenChange={setShowAddMorePassengersConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Passageiro(s) Adicionado(s)!</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja adicionar mais passageiros a esta mesma viagem?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
                setShowAddMorePassengersConfirm(false);
                setTargetTripForAdd(null);
            }}>
                Não, finalizar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
                setShowAddMorePassengersConfirm(false);
                setShowAddPassengerDialog(true);
            }}>
                Sim, adicionar mais
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Criar Viagem Vazia */}
      <Dialog open={showEmptyTripDialog} onOpenChange={setShowEmptyTripDialog}>
          <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                  <DialogTitle>Nova Viagem Extra</DialogTitle>
                  <DialogDescription>Crie uma viagem avulsa e adicione passageiros depois.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label>Data</Label>
                          <Input type="date" value={emptyTripForm.date} onChange={e => setEmptyTripForm({...emptyTripForm, date: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                          <Label>Horário</Label>
                          <Input type="time" value={emptyTripForm.time} onChange={e => setEmptyTripForm({...emptyTripForm, time: e.target.value})} />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label>Origem</Label>
                      <LocationAutocomplete 
                          value={emptyTripForm.origin}
                          onChange={(val) => setEmptyTripForm({...emptyTripForm, origin: val})}
                          placeholder="Ex: Aeroporto GRU"
                          suggestions={eventAddresses}
                      />
                  </div>
                  <div className="space-y-2">
                      <Label>Destino</Label>
                      <LocationAutocomplete 
                          value={emptyTripForm.destination}
                          onChange={(val) => setEmptyTripForm({...emptyTripForm, destination: val})}
                          placeholder="Ex: Hotel Hilton"
                          suggestions={eventAddresses}
                      />
                  </div>

                  {/* Paradas Adicionais */}
                  <div className="space-y-2">
                      <div className="flex justify-between items-center">
                          <Label>Paradas / Endereços Adicionais</Label>
                          <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setEmptyTripForm({
                                  ...emptyTripForm, 
                                  stops: [...emptyTripForm.stops, { address: '', notes: '' }]
                              })}
                              className="h-6 text-xs text-blue-600 hover:text-blue-700"
                          >
                              <Plus className="w-3 h-3 mr-1" /> Adicionar
                          </Button>
                      </div>
                      
                      {emptyTripForm.stops.map((stop, idx) => (
                          <div key={idx} className="flex gap-2 items-start bg-gray-50 p-2 rounded border border-gray-200">
                              <div className="flex-1 space-y-2">
                                  <LocationAutocomplete 
                                      value={stop.address}
                                      onChange={(val) => {
                                          const newStops = [...emptyTripForm.stops];
                                          newStops[idx].address = val;
                                          setEmptyTripForm({...emptyTripForm, stops: newStops});
                                      }}
                                      placeholder={`Parada #${idx + 1}`}
                                      suggestions={eventAddresses}
                                  />
                                  <Input 
                                      placeholder="Obs da parada (opcional)" 
                                      value={stop.notes}
                                      className="h-7 text-xs"
                                      onChange={(e) => {
                                          const newStops = [...emptyTripForm.stops];
                                          newStops[idx].notes = e.target.value;
                                          setEmptyTripForm({...emptyTripForm, stops: newStops});
                                      }}
                                  />
                              </div>
                              <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-500 hover:bg-red-50"
                                  onClick={() => {
                                      const newStops = [...emptyTripForm.stops];
                                      newStops.splice(idx, 1);
                                      setEmptyTripForm({...emptyTripForm, stops: newStops});
                                  }}
                              >
                                  <Trash2 className="w-4 h-4" />
                              </Button>
                          </div>
                      ))}
                  </div>

                  <div className="space-y-2">
                      <Label>Tipo de Viagem</Label>
                      <Select value={emptyTripForm.tripType} onValueChange={v => setEmptyTripForm({...emptyTripForm, tripType: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="arrival">Chegada (IN)</SelectItem>
                              <SelectItem value="departure">Saída (OUT)</SelectItem>
                              <SelectItem value="transfer">Transfer</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="flex gap-2">
                      <div className="space-y-2 flex-1">
                          <Label>Veículo</Label>
                          <Select value={emptyTripForm.vehicleType} onValueChange={v => {
                              const selected = supplierVehicles.find(sv => sv.name === v);
                              setEmptyTripForm({
                                  ...emptyTripForm, 
                                  vehicleType: v,
                                  capacity: selected ? selected.max_passengers : 4
                              });
                          }}>
                              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                  {supplierVehicles.length > 0 ? supplierVehicles.map(v => (
                                      <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                                  )) : (
                                      <>
                                          <SelectItem value="Sedan">Sedan Executivo</SelectItem>
                                          <SelectItem value="Van">Van Executiva</SelectItem>
                                      </>
                                  )}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2 w-24">
                          <Label>Capacidade</Label>
                          <Input 
                              type="number" 
                              value={emptyTripForm.capacity || ''} 
                              onChange={e => setEmptyTripForm({...emptyTripForm, capacity: e.target.value})} 
                              placeholder="4"
                          />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label>Valor a Cobrar (R$) <span className="text-gray-400 font-normal text-xs">(Opcional)</span></Label>
                      <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          value={emptyTripForm.clientPrice}
                          onChange={(e) => setEmptyTripForm({...emptyTripForm, clientPrice: e.target.value})}
                          placeholder="0,00"
                          />
                          </div>
                          <div className="space-y-2">
                          <Label>Itens Adicionais</Label>
                          <MultiSelect
                          options={additionalItems.map(item => ({
                              label: `${item.name} (+${formatPrice(item.adjustment_value)})`,
                              value: item.id
                          }))}
                          selected={emptyTripForm.selectedAdditionalItems.map(item => item.item_id)}
                          onChange={(selectedIds) => {
                              const selectedItems = selectedIds.map(id => {
                                  const item = additionalItems.find(i => i.id === id);
                                  return {
                                      item_id: item.id,
                                      name: item.name,
                                      price: item.adjustment_value,
                                      quantity: 1,
                                      adjustment_type: item.adjustment_type
                                  };
                              });
                              setEmptyTripForm({...emptyTripForm, selectedAdditionalItems: selectedItems});
                          }}
                          placeholder="Selecione itens adicionais..."
                          />
                          </div>
                          <div className="space-y-2">
                          <Label>Observação para o Fornecedor <span className="text-gray-400 font-normal text-xs">(Visível no link)</span></Label>
                      <Input 
                          value={emptyTripForm.partnerNotes}
                          onChange={(e) => setEmptyTripForm({...emptyTripForm, partnerNotes: e.target.value})}
                          placeholder="Ex: Bagagem extra, Voo atrasado..."
                      />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setShowEmptyTripDialog(false)}>Cancelar</Button>
                  <Button onClick={handleCreateEmptyTrip} disabled={isGenerating}>Criar Viagem</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Dialog: Adicionar Passageiro a Viagem */}
      <Dialog open={showAddPassengerDialog} onOpenChange={(open) => {
          setShowAddPassengerDialog(open);
          if (!open) {
              setAddPassengerDialogActiveTab("existing");
              setPassengersToAdd([]);
              setAddPassengerSearch('');
              setAddPassengerOnlyFlexible(false);
              setReplicateSelectedPassengers(false);
              setNewPassengerData({
                  passenger_name: '',
                  passenger_email: '',
                  passenger_phone: '',
                  document_id: '',
                  trip_type: 'airport_transfer',
                  flight_number: '',
                  airline: ''
              });
          }
          }}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Adicionar Passageiros à Viagem</DialogTitle>
                  <DialogDescription>
                      Viagem: <strong>{targetTripForAdd?.name}</strong> • {safeFormat(targetTripForAdd?.date, 'dd/MM')} {targetTripForAdd?.start_time}
                  </DialogDescription>
              </DialogHeader>
              
              {/* Tabs: Buscar Existentes ou Criar Novo */}
              <Tabs value={addPassengerDialogActiveTab} onValueChange={setAddPassengerDialogActiveTab} className="flex-1 flex flex-col">
                  <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="existing">Buscar Existentes</TabsTrigger>
                      <TabsTrigger value="new">Criar Novo</TabsTrigger>
                  </TabsList>

                  {/* Tab: Buscar Passageiros Existentes */}
                  <TabsContent value="existing" className="flex-1 flex flex-col space-y-3 mt-3">
                      <div className="space-y-2">
                          <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                              <Input 
                                  placeholder="Buscar por nome do passageiro..." 
                                  className="pl-9"
                                  value={addPassengerSearch}
                                  onChange={(e) => setAddPassengerSearch(e.target.value)}
                              />
                          </div>
                          <div className="flex items-center space-x-2 px-1">
                              <Checkbox 
                                  id="filter-flexible" 
                                  checked={addPassengerOnlyFlexible} 
                                  onCheckedChange={setAddPassengerOnlyFlexible}
                              />
                              <label 
                                  htmlFor="filter-flexible" 
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                  Mostrar apenas passageiros flexíveis (porta a porta) não alocados
                              </label>
                          </div>
                          <div className="flex items-center space-x-2 px-1">
                              <Checkbox 
                                  id="replicate-passengers" 
                                  checked={replicateSelectedPassengers} 
                                  onCheckedChange={setReplicateSelectedPassengers}
                              />
                              <label 
                                  htmlFor="replicate-passengers" 
                                  className="text-sm font-medium leading-none cursor-pointer text-blue-700"
                              >
                                  Replicar passageiros selecionados para esta viagem (manter originais)
                              </label>
                          </div>
                      </div>

                      <div className="overflow-y-auto border rounded-md p-2 space-y-1 max-h-[50vh] min-h-[300px]">
                          {passengers
                              .filter(p => {
                                  const matchesSearch = p.passenger_name.toLowerCase().includes(addPassengerSearch.toLowerCase());
                                  const matchesFlexible = addPassengerOnlyFlexible 
                                      ? (p.is_flexible_allocation && p.status === 'pending') 
                                      : true;
                                  return matchesSearch && matchesFlexible;
                              })
                              .map(p => {
                                  const currentTrip = trips.find(t => t.id === p.event_trip_id);
                                  const isInTargetTrip = p.event_trip_id === targetTripForAdd?.id;
                                  
                                  return (
                                      <div 
                                          key={p.id} 
                                          className={`flex items-start gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                                              passengersToAdd.includes(p.id) ? 'bg-blue-50 border border-blue-200' : 
                                              isInTargetTrip ? 'bg-green-50 border border-green-200 opacity-60' : ''
                                          }`}
                                          onClick={() => {
                                              if (isInTargetTrip) return; // Não pode selecionar quem já está na viagem
                                              setPassengersToAdd(prev => 
                                                  prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                              );
                                          }}
                                      >
                                          <div className="pt-1">
                                              <Checkbox 
                                                  checked={passengersToAdd.includes(p.id) || isInTargetTrip} 
                                                  disabled={isInTargetTrip}
                                              />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <div className="flex items-start justify-between gap-2">
                                                  <p className="text-sm font-medium truncate">{p.passenger_name}</p>
                                                  <Badge variant="outline" className="text-[10px] flex-shrink-0">{p.trip_type}</Badge>
                                              </div>
                                              <p className="text-xs text-gray-500 mt-0.5">
                                                  {safeFormat(p.date, 'dd/MM')} • {p.time} • {p.flight_number}
                                              </p>
                                              <p className="text-xs text-gray-500 truncate">
                                                  {p.origin_address || p.arrival_point} → {p.destination_address}
                                              </p>
                                              {currentTrip && (
                                                  <div className="mt-1">
                                                      {isInTargetTrip ? (
                                                          <Badge className="bg-green-100 text-green-700 text-[10px]">
                                                              ✓ Já está nesta viagem
                                                          </Badge>
                                                      ) : (
                                                          <Badge className="bg-orange-100 text-orange-700 text-[10px]">
                                                              Em: {currentTrip.name}
                                                          </Badge>
                                                      )}
                                                  </div>
                                              )}
                                              {p.status === 'pending' && (
                                                  <Badge className="bg-gray-100 text-gray-600 text-[10px] mt-1">
                                                      Pendente (sem viagem)
                                                  </Badge>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })
                          }
                          {passengers.filter(p => p.passenger_name.toLowerCase().includes(addPassengerSearch.toLowerCase())).length === 0 && (
                              <div className="text-center py-12 text-gray-500">
                                  <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                  <p>Nenhum passageiro encontrado.</p>
                              </div>
                          )}
                      </div>

                      {passengersToAdd.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-sm font-medium text-blue-900">
                                  {passengersToAdd.length} passageiro(s) selecionado(s)
                              </p>
                              {passengersToAdd.some(id => {
                                  const p = passengers.find(pax => pax.id === id);
                                  return p?.event_trip_id && p.event_trip_id !== targetTripForAdd?.id;
                              }) && (
                                  <p className="text-xs text-orange-700 mt-1 flex items-start gap-1">
                                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                      Alguns passageiros serão transferidos de outras viagens.
                                  </p>
                              )}
                          </div>
                      )}
                  </TabsContent>

                  {/* Tab: Criar Novo Passageiro */}
                  <TabsContent value="new" className="space-y-3 mt-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                          <p className="font-semibold mb-1">ℹ️ Novo Passageiro</p>
                          <p className="text-xs">Preencha os dados básicos. O passageiro será criado e já adicionado a esta viagem.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                              <Label>Nome Completo *</Label>
                              <Input 
                                  value={newPassengerData.passenger_name}
                                  onChange={(e) => setNewPassengerData({...newPassengerData, passenger_name: e.target.value})}
                                  placeholder="Nome do passageiro"
                              />
                          </div>
                          <div className="space-y-2">
                              <Label>RG/CPF</Label>
                              <Input 
                                  value={newPassengerData.document_id}
                                  onChange={(e) => setNewPassengerData({...newPassengerData, document_id: e.target.value})}
                                  placeholder="123.456.789-00"
                              />
                          </div>
                          <div className="space-y-2">
                              <Label>Email</Label>
                              <Input 
                                  type="email"
                                  value={newPassengerData.passenger_email}
                                  onChange={(e) => setNewPassengerData({...newPassengerData, passenger_email: e.target.value})}
                                  placeholder="email@exemplo.com"
                              />
                          </div>
                          <div className="space-y-2">
                              <Label>Telefone</Label>
                              <Input 
                                  value={newPassengerData.passenger_phone}
                                  onChange={(e) => setNewPassengerData({...newPassengerData, passenger_phone: e.target.value})}
                                  placeholder="(11) 99999-9999"
                              />
                          </div>
                          <div className="space-y-2">
                              <Label>Tipo de Viagem</Label>
                              <Select 
                                  value={newPassengerData.trip_type} 
                                  onValueChange={(v) => setNewPassengerData({...newPassengerData, trip_type: v})}
                              >
                                  <SelectTrigger>
                                      <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="IN">Chegada (IN)</SelectItem>
                                      <SelectItem value="OUT">Saída (OUT)</SelectItem>
                                      <SelectItem value="airport_transfer">Transfer Aeroporto</SelectItem>
                                      <SelectItem value="door_to_door">Porta a Porta</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="space-y-2">
                              <Label>Número do Voo</Label>
                              <Input 
                                  value={newPassengerData.flight_number}
                                  onChange={(e) => setNewPassengerData({...newPassengerData, flight_number: e.target.value})}
                                  placeholder="Ex: G31234"
                              />
                          </div>
                          <div className="space-y-2 col-span-2">
                              <Label>Companhia Aérea</Label>
                              <Input 
                                  value={newPassengerData.airline}
                                  onChange={(e) => setNewPassengerData({...newPassengerData, airline: e.target.value})}
                                  placeholder="Ex: Gol, LATAM, Azul"
                              />
                          </div>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                          <p><strong>Data/Hora:</strong> {safeFormat(targetTripForAdd?.date, 'dd/MM/yyyy')} às {targetTripForAdd?.start_time}</p>
                          <p><strong>Origem:</strong> {targetTripForAdd?.origin}</p>
                          <p><strong>Destino:</strong> {targetTripForAdd?.destination}</p>
                          <p className="text-[10px] text-gray-500 mt-1">* Esses dados serão usados automaticamente do grupo/viagem</p>
                      </div>
                  </TabsContent>
              </Tabs>

              <DialogFooter className="flex justify-between items-center border-t pt-4">
                  <span className="text-sm text-gray-500">{passengersToAdd.length} selecionados</span>
                  <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowAddPassengerDialog(false)}>Cancelar</Button>
                      <Button onClick={handleAddPassengersToTrip} disabled={isGenerating}>
                          {isGenerating ? (
                              <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processando...
                              </>
                          ) : (
                              'Adicionar à Viagem'
                          )}
                      </Button>
                  </div>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Dialog: Criar Viagem Manual */}
      <Dialog open={showManualTripDialog} onOpenChange={(open) => {
          setShowManualTripDialog(open);
          if (!open) {
              setManualTripVehicle("");
              setManualTripPrice("");
          setManualTripAdditionalItems([]);
          }
      }}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Criar Viagem Manual</DialogTitle>
                <DialogDescription>
                    Criar uma viagem para os {selectedPassengers.length} passageiros selecionados.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                        {selectedPassengers.length} Passageiro(s) Selecionado(s)
                    </p>
                    <p className="text-xs text-blue-700">
                        Os passageiros selecionados serão agrupados em uma viagem.
                    </p>
                </div>

                <div className="flex gap-2">
                    <div className="space-y-2 flex-1">
                        <Label>Selecione o Veículo</Label>
                        <Select value={manualTripVehicle} onValueChange={(val) => {
                            setManualTripVehicle(val);
                            const v = supplierVehicles.find(v => v.name === val) || logisticsParams.vehicle_capacities.find(v => v.vehicle_type === val);
                            if (v) setManualTripCapacity(v.max_passengers || v.capacity);
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Tipo de Veículo" />
                            </SelectTrigger>
                            <SelectContent>
                                {supplierVehicles.length > 0 ? (
                                    supplierVehicles.map((v) => (
                                        <SelectItem key={v.id} value={v.name}>
                                            <div className="flex justify-between items-center gap-3 w-full">
                                                <span className="font-medium">{v.name}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {v.max_passengers} pax
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))
                                ) : (
                                    logisticsParams.vehicle_capacities.map((v, idx) => (
                                        <SelectItem key={idx} value={v.vehicle_type}>
                                            <span className="capitalize">{v.vehicle_type.replace('_', ' ')}</span> - {v.capacity} pax
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 w-24">
                        <Label>Capacidade</Label>
                        <Input 
                            type="number" 
                            value={manualTripCapacity} 
                            onChange={(e) => setManualTripCapacity(e.target.value)} 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Tipo de Viagem</Label>
                    <Select value={manualTripType} onValueChange={setManualTripType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="arrival">Chegada (IN)</SelectItem>
                            <SelectItem value="departure">Saída (OUT)</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {getSuggestedVehicle() && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-green-800 mb-1">
                            💡 Sugestão Automática
                        </p>
                        <p className="text-xs text-green-700">
                            Para {selectedPassengers.length} passageiros, recomendamos: <strong>{getSuggestedVehicle().name}</strong>
                        </p>
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Valor a Cobrar (R$) <span className="text-gray-400 font-normal text-xs">(Opcional)</span></Label>
                    <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        value={manualTripPrice}
                        onChange={(e) => setManualTripPrice(e.target.value)}
                        placeholder="0,00"
                    />
                </div>

                <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-semibold flex items-center gap-2">
                        Ajuste Horário Pickup (Viagens OUT)
                    </Label>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="number" 
                            className="w-24"
                            step="0.5"
                            value={manualTripPickupLeadTime}
                            onChange={(e) => setManualTripPickupLeadTime(parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-sm text-gray-600">horas</span>
                    </div>
                    <p className="text-[10px] text-gray-500">
                        Valor positivo adianta (antes do voo). Valor negativo adia/prorroga (mais próximo ou após o voo).
                    </p>
                </div>

                <div className="space-y-2 pt-2 border-t">
                    <Label>Itens Adicionais</Label>
                    <MultiSelect
                        options={additionalItems.map(item => ({
                            label: `${item.name} (+${formatPrice(item.adjustment_value)})`,
                            value: item.id
                        }))}
                        selected={manualTripAdditionalItems.map(item => item.item_id)}
                        onChange={(selectedIds) => {
                            const selectedItems = selectedIds.map(id => {
                                const item = additionalItems.find(i => i.id === id);
                                return {
                                    item_id: item.id,
                                    name: item.name,
                                    price: item.adjustment_value,
                                    quantity: 1,
                                    adjustment_type: item.adjustment_type
                                };
                            });
                            setManualTripAdditionalItems(selectedItems);
                        }}
                        placeholder="Selecione itens adicionais..."
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowManualTripDialog(false)}>Cancelar</Button>
                <Button onClick={handleCreateManualTrip} disabled={isGenerating || !manualTripVehicle}>
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Criando...
                        </>
                    ) : (
                        <>
                            <Truck className="w-4 h-4 mr-2" />
                            Criar Viagem
                        </>
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Gerar Logística */}
      <Dialog open={showLogisticsDialog} onOpenChange={setShowLogisticsDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Gerar Logística Automática</DialogTitle>
                <DialogDescription>
                    O sistema irá agrupar os passageiros pendentes baseando-se nos parâmetros abaixo.
                </DialogDescription>
            </DialogHeader>

            {/* Preview Counter */}
            <div className={`mx-6 mb-4 p-3 rounded-lg border-2 ${getPendingPassengersCount.count > 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-300'}`}>
                <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                        <Users className={`w-5 h-5 ${getPendingPassengersCount.count > 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                        <div>
                            <p className={`text-sm font-bold ${getPendingPassengersCount.count > 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                                {getPendingPassengersCount.count} Passageiro(s) Serão Processados
                            </p>
                            <p className="text-xs text-gray-600">
                                Total pendentes: {getPendingPassengersCount.totalPending}
                            </p>
                        </div>
                    </div>
                    {getPendingPassengersCount.count === 0 && (
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                    )}
                </div>
                {getPendingPassengersCount.count === 0 && (
                    <p className="text-xs text-orange-700 mt-2">
                        ⚠️ Os filtros selecionados não correspondem a nenhum passageiro. Ajuste os filtros acima.
                    </p>
                )}
            </div>

            <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold">Tempo Máx. Entre Voos (min)</Label>
                        <Input 
                            type="number" 
                            value={logisticsParams.max_wait_time_minutes}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setLogisticsParams({...logisticsParams, max_wait_time_minutes: isNaN(val) ? 0 : val});
                            }}
                        />
                        <p className="text-[10px] text-gray-500">Tempo máximo entre passageiros consecutivos</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold">Janela Máx. do Grupo (min)</Label>
                        <Input 
                            type="number" 
                            value={logisticsParams.max_group_duration_minutes}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setLogisticsParams({...logisticsParams, max_group_duration_minutes: isNaN(val) ? 0 : val});
                            }}
                        />
                        <p className="text-[10px] text-gray-500">Tempo máximo do 1º ao último passageiro do grupo</p>
                    </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-semibold flex items-center gap-2">
                        Ajuste Horário Pickup (Viagens OUT)
                    </Label>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="number" 
                            className="w-24"
                            step="0.5"
                            value={logisticsParams.pickup_lead_time_hours}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setLogisticsParams({...logisticsParams, pickup_lead_time_hours: isNaN(val) ? 0 : val});
                            }}
                        />
                        <span className="text-sm text-gray-600">horas</span>
                    </div>
                    <p className="text-[10px] text-gray-500">
                        Para viagens de SAÍDA (OUT), o horário será ajustado. Positivo = Antecedência. Negativo = Prorrogação.
                    </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Processar Apenas</Label>
                        <Select 
                            value={logisticsParams.trip_type_filter} 
                            onValueChange={(val) => setLogisticsParams({...logisticsParams, trip_type_filter: val})}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Tipos</SelectItem>
                                <SelectItem value="IN">Apenas Chegadas (IN)</SelectItem>
                                <SelectItem value="OUT">Apenas Saídas (OUT)</SelectItem>
                                <SelectItem value="airport_transfer">Transfer Aeroporto</SelectItem>
                            </SelectContent>
                            </Select>
                            </div>
                            </div>

                            {/* Novos Filtros de Seleção */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                            <div className="space-y-2">
                            <Label>Filtrar Data</Label>
                            <Select 
                                value={logisticsParams.date_filter} 
                                onValueChange={(val) => setLogisticsParams({...logisticsParams, date_filter: val})}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Datas</SelectItem>
                                    {uniqueDates.map(d => (
                                        <SelectItem key={d} value={d}>{safeFormat(d, 'dd/MM/yyyy')}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            </div>
                            <div className="space-y-2">
                            <Label>Filtrar Origem</Label>
                            <Select 
                                value={logisticsParams.origin_filter} 
                                onValueChange={(val) => setLogisticsParams({...logisticsParams, origin_filter: val})}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Origens</SelectItem>
                                    {uniqueOrigins.map((o, idx) => (
                                        <SelectItem key={idx} value={o} className="text-xs">{o}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            </div>
                            <div className="space-y-2">
                            <Label>Filtrar Destino</Label>
                            <Select 
                                value={logisticsParams.destination_filter} 
                                onValueChange={(val) => setLogisticsParams({...logisticsParams, destination_filter: val})}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Destinos</SelectItem>
                                    {uniqueDestinations.map((d, idx) => (
                                        <SelectItem key={idx} value={d} className="text-xs">{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            </div>
                            </div>

                            <p className="text-xs text-gray-500">
                            Use os filtros acima para processar apenas um grupo específico de passageiros (ex: apenas um hotel ou data específica).
                            </p>

                            <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between items-center">
                        <Label>Veículos para este Evento</Label>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={addVehicleType}
                            className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                            <Plus className="w-3 h-3 mr-1" /> Personalizar
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {logisticsParams.vehicle_capacities.map((v, idx) => (
                            <div key={idx} className={`flex items-center gap-2 p-2 rounded border transition-colors ${v.selected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
                                <div className="pt-4">
                                    <Checkbox 
                                        checked={v.selected}
                                        onCheckedChange={() => toggleVehicleSelection(idx)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <Label className="text-[10px] text-gray-500">Tipo Veículo</Label>
                                    <div className="font-medium text-sm">{v.vehicle_type}</div>
                                </div>
                                <div className="w-20">
                                    <Label className="text-[10px] text-gray-500">Capacidade</Label>
                                    <Input 
                                        type="number"
                                        className="h-7 bg-white text-right"
                                        value={v.capacity}
                                        onChange={(e) => updateVehicleType(idx, 'capacity', parseInt(e.target.value) || 0)}
                                        disabled={!v.selected}
                                    />
                                </div>
                            </div>
                        ))}
                        {logisticsParams.vehicle_capacities.length === 0 && (
                            <div className="text-center py-4 text-sm text-gray-500 border-2 border-dashed rounded-lg">
                                Nenhum veículo disponível.
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        * Marque apenas os veículos que você deseja utilizar neste agrupamento.
                    </p>
                </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setShowLogisticsDialog(false)} className="w-full sm:w-auto">
                    Cancelar
                </Button>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button 
                        onClick={() => handleRunLogistics(false)} 
                        disabled={isGenerating} 
                        variant="outline" 
                        className="flex-1 sm:flex-initial h-10 sm:h-9"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <PlayCircle className="w-4 h-4 mr-2" />
                        )}
                        Manual
                    </Button>
                    <Button 
                        onClick={() => handleRunLogistics(true)} 
                        disabled={isGenerating} 
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex-1 sm:flex-initial h-10 sm:h-9"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <>
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9V5h2v4h4v2h-4v4H9v-4H5V9h4z"/>
                                </svg>
                                🤖 IA Otimizada
                            </>
                        )}
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
        </Dialog>

        {/* Dialog: Editar Passageiro */}
        <EditPassengerDialog 
            isOpen={editPassengerDialogOpen}
            onClose={() => {
                setEditPassengerDialogOpen(false);
                setPassengerToEdit(null);
            }}
            passenger={passengerToEdit}
            allPassengers={passengers}
            trips={trips}
            onUpdate={loadEventData}
        />

        {/* Modal: Cartão de Embarque */}
        <BoardingPassModal 
            isOpen={showBoardingPass} 
            onClose={() => setShowBoardingPass(false)} 
            passes={boardingPassData} 
        />

        {/* Dialog: Itens Adicionais */}
        <EventTripAdditionalItemsDialog
            isOpen={showAdditionalItemsDialog}
            onClose={() => {
                setShowAdditionalItemsDialog(false);
                setSelectedTripForItems(null);
            }}
            trip={selectedTripForItems}
            onUpdate={loadEventData}
        />

        {/* Dialog: Editar Viagem (Data/Hora) */}
        <EditTripDialog
            isOpen={!!editTripDialogTrip}
            onClose={() => setEditTripDialogTrip(null)}
            trip={editTripDialogTrip}
            onUpdate={loadEventData}
        />

        {/* Dialog: Passageiros sem Telefone */}
        <MissingPhonePassengersDialog
            isOpen={showMissingPhoneDialog}
            onClose={() => setShowMissingPhoneDialog(false)}
            passengers={passengersInFilteredTripsWithMissingPhone}
            onUpdate={loadEventData}
        />

        {/* Dialog: Agenda de Motoristas */}
        <DriverScheduleDialog 
            isOpen={showScheduleDialog}
            onClose={() => {
                setShowScheduleDialog(false);
                setSelectedTripForSchedule(null);
            }}
            drivers={[
                ...drivers.map(d => ({ ...d, type: 'registered' })),
                ...casualDrivers.map(d => ({ ...d, type: 'casual', name: `${d.name} (Avulso)` }))
            ].sort((a, b) => a.name.localeCompare(b.name))}
            allTrips={trips}
            selectedTrip={selectedTripForSchedule}
            onAssignDriver={handleAssignDriverFromSchedule}
        />

        {/* Dialog: Lista de Passageiros para Cartão de Embarque */}
        <TripPassengersDialog
            isOpen={showPassengerListDialog}
            onClose={() => {
                setShowPassengerListDialog(false);
                setSelectedTripForPasses(null);
            }}
            trip={selectedTripForPasses}
            passengers={passengers}
            onViewPass={handleViewSinglePass}
            onPassengerUpdate={loadEventData}
            event={event}
            drivers={drivers}
            driverVehicles={driverVehicles}
        />

        {/* Dialog: Preview de Notificação */}
        <DriverNotificationPreviewDialog 
            isOpen={showNotificationPreview}
            onClose={() => {
                setShowNotificationPreview(false);
                setTripToNotify(null);
            }}
            tripId={tripToNotify?.id}
            onConfirm={async () => {
                if (!tripToNotify) return;
                try {
                    const res = await base44.functions.invoke('notifyDriverAboutTrip', {
                        serviceRequestId: tripToNotify.id,
                        notificationType: 'both'
                    });
                    if(res.data?.success) {
                        toast.success('Notificação enviada com sucesso!');
                        loadEventData(); // Refresh to update timestamps
                    } else {
                        throw new Error(res.data?.error || 'Erro ao enviar');
                    }
                } catch(err) {
                    console.error(err);
                    toast.error('Erro ao notificar: ' + err.message);
                    throw err; // Re-throw to handle loading state in dialog
                }
            }}
        />

        {/* Dialog: Cancelar Viagem */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cancelar Viagem</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja cancelar a viagem <strong>{tripToCancel?.name}</strong>?
                        Todos os passageiros associados a esta viagem também serão marcados como cancelados.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Label htmlFor="cancellation-reason">Motivo do Cancelamento (Opcional)</Label>
                    <Input
                        id="cancellation-reason"
                        value={cancellationReason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                        placeholder="Ex: Voo cancelado, passageiro não compareceu..."
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Manter Viagem</Button>
                    <Button variant="destructive" onClick={handleConfirmCancelTrip} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                        Confirmar Cancelamento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Dialog: Revisar Dados do Parceiro */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Revisar Dados do Parceiro</DialogTitle>
                    <DialogDescription>
                        O parceiro enviou as seguintes informações para esta viagem.
                    </DialogDescription>
                </DialogHeader>
                {reviewTripInfo && (
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div>
                                <Label className="text-xs text-gray-500">Motorista</Label>
                                <p className="font-medium">{reviewTripInfo.subcontractor_driver_name}</p>
                                <p className="text-sm text-gray-600">{reviewTripInfo.subcontractor_driver_phone}</p>
                                {reviewTripInfo.subcontractor_driver_document && (
                                    <p className="text-xs text-gray-500">Doc: {reviewTripInfo.subcontractor_driver_document}</p>
                                )}
                            </div>
                            <div>
                                <Label className="text-xs text-gray-500">Veículo</Label>
                                <p className="font-medium">{reviewTripInfo.subcontractor_vehicle_model}</p>
                                <p className="text-sm text-gray-600 font-mono">{reviewTripInfo.subcontractor_vehicle_plate}</p>
                                {reviewTripInfo.subcontractor_vehicle_color && (
                                    <p className="text-xs text-gray-500">Cor: {reviewTripInfo.subcontractor_vehicle_color}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Motivo da Rejeição (se rejeitar)</Label>
                            <Input 
                                placeholder="Ex: Placa incorreta, motorista sem cadastro..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                        </div>
                    </div>
                )}
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancelar</Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                            variant="destructive" 
                            onClick={() => handleReviewSubcontractorInfo('rejected')}
                            className="flex-1 sm:flex-initial"
                        >
                            Rejeitar
                        </Button>
                        <Button 
                            className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-initial"
                            onClick={() => handleReviewSubcontractorInfo('approved')}
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Aprovar
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Dialog: Atribuir Motorista */}
        <Dialog open={showDriverDialog} onOpenChange={setShowDriverDialog}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
          <DialogHeader>
              <DialogTitle>Atribuir Motorista e Veículo</DialogTitle>
              <DialogDescription>
                  Selecione o motorista e o veículo específico para a viagem <strong>{selectedTripForDriver?.name}</strong>.
              </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-2">
                  <Label>Atribuir a Parceiro / Subcontratado</Label>
                  <Select 
                    value={driverForm.subcontractorId} 
                    onValueChange={(val) => setDriverForm({ ...driverForm, subcontractorId: val })}
                  >
                      <SelectTrigger>
                          <SelectValue placeholder="Selecione o parceiro..." />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="none">-- Sem Parceiro (Frota Própria) --</SelectItem>
                          {subcontractors.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              <div className="space-y-2">
                  <Label>Atribuir a Coordenadores</Label>
                  <MultiSelect
                      options={coordinators.map(c => ({ value: c.id, label: c.name })).sort((a, b) => a.label.localeCompare(b.label))}
                      selected={driverForm.coordinatorIds}
                      onChange={(newIds) => setDriverForm({ ...driverForm, coordinatorIds: newIds })}
                      placeholder="Selecione coordenador(es)..."
                  />
              </div>

              <div className="space-y-2">
                  <Label>Motorista</Label>
                  <Select 
                    value={driverForm.driverId} 
                    onValueChange={(val) => setDriverForm({ ...driverForm, driverId: val, vehicleId: 'none' })}
                  >
                      <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="none">-- Sem Motorista --</SelectItem>
                          <SelectItem value="new_eventual" className="font-semibold text-blue-600">➕ Novo Motorista (Criar Cadastro)</SelectItem>
                          <SelectItem value="casual_driver" className="font-semibold text-orange-600">👤 Motorista Avulso (Sem Cadastro)</SelectItem>
                          {drivers.map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              {(driverForm.driverId === 'new_eventual' || driverForm.driverId === 'casual_driver') && (
                  <div className={`space-y-3 border-l-2 pl-3 p-2 rounded ${driverForm.driverId === 'casual_driver' ? 'border-orange-200 bg-orange-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
                      <h4 className={`text-xs font-bold uppercase ${driverForm.driverId === 'casual_driver' ? 'text-orange-800' : 'text-blue-800'}`}>
                          {driverForm.driverId === 'casual_driver' ? 'Dados do Motorista Avulso' : 'Dados do Novo Motorista'}
                      </h4>
                      
                      {/* Seletor de Motorista Avulso Salvo */}
                      {driverForm.driverId === 'casual_driver' && casualDrivers.length > 0 && (
                          <div className="space-y-1 mb-2">
                              <Label className="text-xs">Carregar Motorista Salvo</Label>
                              <Select 
                                  value={driverForm.useCasualDriverId}
                                  onValueChange={(val) => {
                                      if (val === 'none') {
                                          setDriverForm({
                                              ...driverForm,
                                              useCasualDriverId: 'none',
                                              eventualName: '',
                                              eventualPhone: '',
                                              eventualEmail: '',
                                              eventualVehicleModel: '',
                                              eventualVehiclePlate: '',
                                              saveCasualDriver: true // Default to saving new
                                          });
                                      } else {
                                          const saved = casualDrivers.find(c => c.id === val);
                                          if (saved) {
                                              setDriverForm({
                                                  ...driverForm,
                                                  useCasualDriverId: val,
                                                  eventualName: saved.name,
                                                  eventualPhone: saved.phone,
                                                  eventualEmail: saved.email || '',
                                                  eventualVehicleModel: saved.vehicle_model,
                                                  eventualVehiclePlate: saved.vehicle_plate,
                                                  saveCasualDriver: false // Don't save again
                                              });
                                          }
                                      }
                                  }}
                              >
                                  <SelectTrigger className="h-8 text-xs bg-white">
                                      <SelectValue placeholder="Selecione para preencher..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="none">-- Novo Motorista Avulso --</SelectItem>
                                      {casualDrivers.map(cd => (
                                          <SelectItem key={cd.id} value={cd.id}>{cd.name} - {cd.vehicle_model}</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                              <Label className="text-xs">Nome *</Label>
                              <Input 
                                  value={driverForm.eventualName}
                                  onChange={(e) => setDriverForm({...driverForm, eventualName: e.target.value})}
                                  placeholder="Nome Completo"
                                  className="h-8 text-xs bg-white"
                                  disabled={driverForm.useCasualDriverId !== 'none'}
                              />
                          </div>
                          <div className="space-y-1">
                              <Label className="text-xs">Telefone *</Label>
                              <Input 
                                  value={driverForm.eventualPhone}
                                  onChange={(e) => setDriverForm({...driverForm, eventualPhone: e.target.value})}
                                  placeholder="(00) 00000-0000"
                                  className="h-8 text-xs bg-white"
                                  disabled={driverForm.useCasualDriverId !== 'none'}
                              />
                          </div>
                          <div className="space-y-1 col-span-2">
                              <Label className="text-xs">Email (para acesso ao app)</Label>
                              <Input 
                                  type="email"
                                  value={driverForm.eventualEmail}
                                  onChange={(e) => setDriverForm({...driverForm, eventualEmail: e.target.value})}
                                  placeholder="email@exemplo.com"
                                  className="h-8 text-xs bg-white"
                                  disabled={driverForm.useCasualDriverId !== 'none'}
                              />
                          </div>
                          <div className="space-y-1">
                              <Label className="text-xs">Modelo Veículo *</Label>
                              <Input 
                                  value={driverForm.eventualVehicleModel}
                                  onChange={(e) => setDriverForm({...driverForm, eventualVehicleModel: e.target.value})}
                                  placeholder="Ex: Corolla Prata"
                                  className="h-8 text-xs bg-white"
                                  disabled={driverForm.useCasualDriverId !== 'none'}
                              />
                          </div>
                          <div className="space-y-1">
                              <Label className="text-xs">Placa *</Label>
                              <Input 
                                  value={driverForm.eventualVehiclePlate}
                                  onChange={(e) => setDriverForm({...driverForm, eventualVehiclePlate: e.target.value})}
                                  placeholder="ABC-1234"
                                  className="h-8 text-xs bg-white"
                                  disabled={driverForm.useCasualDriverId !== 'none'}
                              />
                          </div>
                      </div>
                      
                      {driverForm.driverId === 'casual_driver' && driverForm.useCasualDriverId === 'none' && (
                          <div className="flex items-center space-x-2 pt-2">
                              <Checkbox 
                                  id="save-casual" 
                                  checked={driverForm.saveCasualDriver} 
                                  onCheckedChange={(c) => setDriverForm({...driverForm, saveCasualDriver: c})} 
                              />
                              <label htmlFor="save-casual" className="text-xs font-medium cursor-pointer text-orange-800">
                                  Salvar neste evento (para usar em outras viagens)
                              </label>
                          </div>
                      )}
                  </div>
              )}

              {(driverForm.driverId !== 'new_eventual' && driverForm.driverId !== 'casual_driver') && (
              <div className="space-y-2">
                  <Label>Veículo da Frota</Label>
                  <Select 
                    value={driverForm.vehicleId} 
                    onValueChange={(val) => setDriverForm({...driverForm, vehicleId: val})}
                    disabled={driverForm.driverId === 'none'}
                  >
                      <SelectTrigger>
                          <SelectValue placeholder={driverForm.driverId === 'none' ? "Selecione um motorista primeiro" : "Selecione..."} />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="none">-- Sem Veículo --</SelectItem>
                          {driverVehicles
                            .filter(v => v.driver_id === driverForm.driverId)
                            .map(v => (
                              <SelectItem key={v.id} value={v.id}>{v.vehicle_model} - {v.vehicle_plate}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t mt-2">
                  <div className="space-y-2">
                      <Label>Valor a Cobrar (R$)</Label>
                      <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          value={driverForm.clientPrice}
                          onChange={(e) => setDriverForm({...driverForm, clientPrice: e.target.value})}
                          placeholder="0,00"
                          className="bg-white"
                      />
                  </div>
                  <div className="space-y-2">
                      <Label>
                          {driverForm.subcontractorId !== 'none' ? 'Custo Parceiro (R$)' : 'Valor Pagar Motorista (R$)'}
                      </Label>
                      <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          value={driverForm.subcontractorId !== 'none' ? driverForm.subcontractorCost : driverForm.payoutAmount}
                          onChange={(e) => {
                              if (driverForm.subcontractorId !== 'none') {
                                  setDriverForm({...driverForm, subcontractorCost: e.target.value});
                              } else {
                                  setDriverForm({...driverForm, payoutAmount: e.target.value});
                              }
                          }}
                          placeholder="0,00"
                          className="bg-white"
                      />
                  </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Defina o valor a ser cobrado do cliente e/ou o custo do serviço.</p>

              {/* Botão de Compartilhar Link com Parceiro */}
              {driverForm.subcontractorId !== 'none' && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mt-3">
                      <div className="flex justify-between items-center">
                          <div className="text-sm font-medium text-indigo-900">
                              Link para o Parceiro
                          </div>
                          <Button
                              size="sm"
                              variant="outline"
                              className="h-8 bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                              onClick={async () => {
                                  if (!selectedTripForDriver) return;
                                  try {
                                      const response = await base44.functions.invoke('generateEventTripShareLink', {
                                          tripId: selectedTripForDriver.id
                                      });
                                      if (response.data && response.data.success) {
                                          const url = window.location.origin + response.data.path;
                                          navigator.clipboard.writeText(url);
                                          toast.success("Link copiado!", {
                                              description: "Envie este link para o parceiro visualizar os detalhes."
                                          });
                                          // Opcional: abrir em nova aba para ver
                                          // window.open(url, '_blank');
                                      } else {
                                          toast.error("Erro ao gerar link");
                                      }
                                  } catch (err) {
                                      toast.error("Erro ao gerar link");
                                  }
                              }}
                          >
                              <Share2 className="w-3 h-3 mr-2" />
                              Copiar Link Público
                          </Button>
                      </div>
                      <p className="text-[10px] text-indigo-700 mt-1">
                          Gera um link público em tempo real com os detalhes da viagem e lista de passageiros para o parceiro agendar.
                      </p>
                  </div>
              )}

              <div className="space-y-2 pt-2 border-t mt-2">
                  <div className="flex items-center space-x-2">
                      <Checkbox 
                          id="coordinator-start-trip"
                          checked={driverForm.coordinatorCanStartTrip}
                          onCheckedChange={(checked) => setDriverForm({...driverForm, coordinatorCanStartTrip: checked})}
                      />
                      <label 
                          htmlFor="coordinator-start-trip"
                          className="text-sm font-medium leading-none cursor-pointer"
                      >
                          Permitir início da viagem pelo coordenador
                      </label>
                  </div>
                  <p className="text-[10px] text-gray-500">Se marcado, o coordenador poderá iniciar a viagem diretamente na lista de receptivo.</p>
              </div>

              {/* Comandos de Viagem (Gestor) */}
              {(selectedTripForDriver?.driver_id || selectedTripForDriver?.is_casual_driver || selectedTripForDriver?.subcontractor_driver_name) && (
                <div className="space-y-2 pt-4 border-t mt-2">
                    <Label className="text-sm font-semibold flex items-center gap-2 text-blue-800">
                        <PlayCircle className="w-4 h-4" />
                        Comandos de Viagem (Gestor)
                    </Label>
                    <div className="flex gap-2">
                        <Select
                            value={driverForm.tripStatus}
                            onValueChange={(val) => setDriverForm({...driverForm, tripStatus: val})}
                        >
                            <SelectTrigger className="flex-1 h-9 bg-white border-blue-200">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="aguardando">Aguardando</SelectItem>
                                <SelectItem value="a_caminho">A Caminho</SelectItem>
                                <SelectItem value="chegou_origem">Chegou Origem</SelectItem>
                                <SelectItem value="passageiro_embarcou">Embarcou</SelectItem>
                                <SelectItem value="a_caminho_destino">A Caminho Destino</SelectItem>
                                <SelectItem value="chegou_destino">Chegou Destino</SelectItem>
                                <SelectItem value="finalizada">Finalizada</SelectItem>
                                <SelectItem value="no_show">No-Show</SelectItem>
                                <SelectItem value="cancelada_motorista">Cancelada</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button 
                            variant="default"
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 h-9"
                            onClick={async () => {
                                if (!selectedTripForDriver || !driverForm.tripStatus) return;
                                
                                if (driverForm.tripStatus === 'finalizada' || driverForm.tripStatus === 'cancelada_motorista' || driverForm.tripStatus === 'no_show') {
                                    if (!confirm(`Tem certeza que deseja alterar o status para "${driverForm.tripStatus.toUpperCase()}"? Isso pode disparar notificações e encerrar a viagem.`)) return;
                                }

                                setLoading(true);
                                try {
                                    // Check auth before call
                                    if (!(await base44.auth.isAuthenticated())) {
                                        toast.error("Sessão inválida. Redirecionando...");
                                        await base44.auth.logout();
                                        return;
                                    }

                                    const response = await base44.functions.invoke('manualUpdateTripStatus', {
                                        serviceRequestId: selectedTripForDriver.id,
                                        newStatus: driverForm.tripStatus
                                    });
                                    
                                    if (response.data && response.data.success) {
                                        toast.success("Status atualizado com sucesso!");
                                        setShowDriverDialog(false);
                                        loadEventData();
                                    } else {
                                        throw new Error(response.data?.error || "Erro desconhecido ao atualizar status.");
                                    }
                                } catch (err) {
                                    console.error('Erro ao atualizar status:', err);
                                    const errorMsg = err.response?.data?.error || err.message || "Erro de conexão";
                                    toast.error(`Erro: ${errorMsg}`);
                                    
                                    if (errorMsg.includes('401') || errorMsg.includes('autenticação') || errorMsg.includes('Unauthorized') || (err.response && err.response.status === 401)) {
                                        toast.error("Sessão expirada. Redirecionando para login...", { duration: 3000 });
                                        setTimeout(() => base44.auth.logout(), 2000);
                                    }
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atualizar Status"}
                        </Button>
                    </div>
                    <p className="text-[10px] text-gray-500">
                        * Atualiza o status da viagem como se fosse o motorista. Reflete no app e painéis.
                    </p>
                </div>
              )}
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 w-full">
              <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleCopyDriverInfo}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto"
                  title="Copiar dados do motorista e veículo"
              >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Dados
              </Button>
              <div className="flex gap-2 justify-end w-full sm:w-auto">
                  <Button variant="outline" onClick={() => setShowDriverDialog(false)}>Cancelar</Button>
                  <Button onClick={handleSaveDriver} disabled={loading} className="bg-green-600 hover:bg-green-700">
                     {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Atribuição"}
                  </Button>
              </div>
          </DialogFooter>
        </DialogContent>
        </Dialog>
        </div>
        );
        }