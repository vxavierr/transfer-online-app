import React, { useState, useEffect } from 'react';
import { BrowserService } from '@/native';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPageUrl } from '@/utils';
import {
  Loader2,
  MapPin,
  Calendar,
  Clock,
  Users,
  Package,
  Navigation,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X as CloseIcon,
  BellRing,
  CalendarPlus,
  ExternalLink,
  Car,
  DollarSign,
  MessageSquare,
  Plane,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import StatCard from '@/components/dashboard/StatCard';
import PageHeader from '@/components/dashboard/PageHeader';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import { Suspense } from 'react';
import MetaTags from '@/components/seo/MetaTags';
import TelemetryTracker from '@/components/telemetry/TelemetryTracker';

// Lazy load
const DriverMessages = React.lazy(() => import('@/components/driver/DriverMessages'));

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const ComponentLoader = () => (
  <div className="flex justify-center p-8">
    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
  </div>
);

// Função para fazer parse correto de datas evitando problemas de timezone
const parseLocalDate = (dateString) => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

// Dashboard para motoristas - exibe viagens vinculadas por ID ou telefone
export default function DashboardMotoristaV2() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [documentAlerts, setDocumentAlerts] = useState([]);
  const [blockingImpediment, setBlockingImpediment] = useState(null);
  const [viewingTripId, setViewingTripId] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  // State for controlling tabs
  const [activeTab, setActiveTab] = useState("waiting");
  
  const queryClient = useQueryClient();
  const location = useLocation();

  useEffect(() => {
    const storedDismissedAlerts = localStorage.getItem('dismissedDriverAlerts');
    if (storedDismissedAlerts) {
      try {
        setDismissedAlerts(JSON.parse(storedDismissedAlerts));
      } catch (e) {
        console.error('Error parsing dismissed alerts', e);
      }
    }

    const params = new URLSearchParams(location.search);
    
    // Check for tab parameter
    const tabParam = params.get('tab');
    if (tabParam && ['waiting', 'active', 'upcoming', 'completed', 'messages'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Function to change tab and update URL without reload
  const handleTabChange = (value) => {
    setActiveTab(value);
    const url = new URL(window.location);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url);
  };

  useEffect(() => {
    // Solicitar permissão de GPS no início se ainda não foi concedida/solicitada
    const askForGPS = () => {
      const hasPermission = localStorage.getItem('gps_permission_granted') === 'true';
      if (!hasPermission && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => {
            localStorage.setItem('gps_permission_granted', 'true');
          },
          (error) => {
            console.warn('GPS request on dashboard denied/error:', error);
            localStorage.setItem('gps_permission_granted', 'false');
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    };

    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();

        if (currentUser.is_driver) {
          askForGPS();
        }

        if (!currentUser.is_driver || !currentUser.driver_id) {
          alert('Acesso restrito a motoristas.');
          window.location.href = '/';
          return;
        }

        setUser(currentUser);

        let driverData = null;
        try {
          driverData = await base44.entities.Driver.get(currentUser.driver_id);
        } catch (error) {
          console.warn('Driver not found via get, trying list fallback');
          // Fallback if get fails for some reason (e.g. permission or id issue)
          const drivers = await base44.entities.Driver.list();
          driverData = drivers.find(d => d.id === currentUser.driver_id);
        }

        if (!driverData) {
          alert('Dados do motorista não encontrados.');
          window.location.href = '/';
          return;
        }

        setDriver(driverData);

        // Check Documents Expiry (CNH + Vehicles)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const alerts = [];

        // 1. CNH
        if (!driverData.license_document_url) {
           // Bloqueio se não tiver documento (upload pendente)
           setBlockingImpediment({
              title: "Documentação Pendente",
              message: "Para acessar o sistema e receber viagens, é necessário fazer o upload da sua CNH. A IA fará a leitura automática dos seus dados.",
              actionLabel: "Enviar CNH",
              actionLink: createPageUrl('MeusDados') + '?tab=documents'
           });
        } else if (driverData.license_expiry) {
          const expiryDate = parseLocalDate(driverData.license_expiry);
          if (expiryDate < today) {
            // CNH vencida: bloqueia o acesso
            if (!driverData.license_blocked) {
              await base44.entities.Driver.update(driverData.id, { license_blocked: true });
            }
            // Define o impedimento bloqueante
            setBlockingImpediment({
              title: "Acesso Suspenso Temporariamente",
              message: `Sua CNH venceu em ${format(expiryDate, 'dd/MM/yyyy')}. Para voltar a visualizar detalhes das viagens e realizar corridas, é necessário enviar uma foto da CNH renovada.`,
              actionLabel: "Regularizar Agora",
              actionLink: createPageUrl('MeusDados') + '?tab=documents'
            });
          } else {
            const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            if (daysToExpiry <= 30) {
              alerts.push({
                id: 'cnh',
                type: 'warning',
                message: `Sua CNH vence em ${daysToExpiry} dias (${format(expiryDate, 'dd/MM/yyyy')}).`,
                link: createPageUrl('MeusDados') + '?tab=documents',
                action: 'Regularizar'
              });
            }
          }
        } else if (driverData.license_blocked) {
           // Caso esteja marcado como bloqueado mas sem data
            setBlockingImpediment({
              title: "Acesso Suspenso",
              message: "Seu cadastro possui pendências documentais. Por favor, verifique seus documentos.",
              actionLabel: "Verificar Documentos",
              actionLink: createPageUrl('MeusDados') + '?tab=documents'
            });
        }

        // 2. Vehicles
        try {
          const vehicles = await base44.entities.DriverVehicle.filter({ driver_id: driverData.id });
          
          // Se não tiver nenhum veículo cadastrado, bloqueia pedindo cadastro
          if (vehicles.length === 0 && !blockingImpediment) {
             setBlockingImpediment({
                title: "Cadastro de Veículo Necessário",
                message: "Para começar a receber viagens, você precisa cadastrar pelo menos um veículo e enviar o documento de licenciamento.",
                actionLabel: "Cadastrar Veículo",
                actionLink: createPageUrl('MeusDados') + '?tab=documents&action=add_vehicle'
             });
          }

          let hasPendingVehicleDoc = false;

          for (const vehicle of vehicles) {
            if (vehicle.active !== false) {
               if (!vehicle.registration_document_url) {
                  hasPendingVehicleDoc = true;
                  alerts.push({
                      id: `veh-doc-${vehicle.id}`,
                      type: 'danger',
                      message: `Documento Pendente: Faça o upload do licenciamento do veículo ${vehicle.vehicle_model || 'Veículo'} (${vehicle.vehicle_plate}).`,
                      link: createPageUrl('MeusDados') + '?tab=documents',
                      action: 'Enviar Agora'
                   });
                   continue;
               }

               if (vehicle.registration_expiry) {
                   const expiryDate = parseLocalDate(vehicle.registration_expiry);
                   const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                   
                   if (expiryDate < today) {
                     // Bloquear veículo se vencido
                     if (!vehicle.registration_blocked) {
                        await base44.entities.DriverVehicle.update(vehicle.id, { registration_blocked: true });
                     }
                     
                     alerts.push({
                        id: `veh-${vehicle.id}`,
                        type: 'danger',
                        message: `Veículo Bloqueado: Licenciamento do ${vehicle.vehicle_model} (${vehicle.vehicle_plate}) vencido em ${format(expiryDate, 'dd/MM/yyyy')}.`,
                        link: createPageUrl('MeusDados') + '?tab=documents',
                        action: 'Regularizar'
                     });
                   } else if (daysToExpiry <= 30) {
                     alerts.push({
                        id: `veh-${vehicle.id}`,
                        type: 'warning',
                        message: `Licenciamento do veículo ${vehicle.vehicle_model} (${vehicle.vehicle_plate}) vence em ${daysToExpiry} dias.`,
                        link: createPageUrl('MeusDados') + '?tab=documents',
                        action: 'Ver Veículo'
                     });
                   }
               }
            }
          }
          
          if (hasPendingVehicleDoc && !blockingImpediment) {
             // CORREÇÃO: Não bloqueia mais a navegação se houver documento de veículo pendente
             // Apenas mostra o alerta (já adicionado acima)
             // setBlockingImpediment(...) - REMOVIDO
          }

        } catch (err) {
          console.error('Error checking vehicle expiry:', err);
        }

        if (alerts.length > 0) {
          setDocumentAlerts(alerts);
        }

        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = '/AccessPortal?returnUrl=%2FDashboardMotoristaV2';
      }
    };

    checkAuth();
  }, []);

  const { data: trips = [] } = useQuery({
    queryKey: ['driverTrips', user?.driver_id, user?.phone_number],
    queryFn: async () => {
      const driverId = user?.driver_id;
      const driverPhone = user?.phone_number;
      
      if (!driverId && !driverPhone) return [];

      // Estratégia de busca de viagens unificada (ID + Telefone)
      let platformTrips = [];
      
      // 1. Buscar por ID (prioridade)
      if (driverId) {
        const byId = await base44.entities.ServiceRequest.filter({ driver_id: driverId });
        platformTrips = [...byId];
      }
      
      // 2. Buscar por Telefone (fallback/legado)
      if (driverPhone) {
        const byPhone = await base44.entities.ServiceRequest.filter({ driver_phone: driverPhone });
        
        // Adicionar apenas se não já estiver na lista
        const existingIds = new Set(platformTrips.map(t => t.id));
        for (const trip of byPhone) {
          if (!existingIds.has(trip.id)) {
            platformTrips.push(trip);
          }
        }
      }

      // Buscar viagens próprias (SupplierOwnBooking) via ID do motorista
      const ownPromise = driverId
        ? base44.entities.SupplierOwnBooking.filter({ driver_id: driverId })
        : Promise.resolve([]);

      // Buscar viagens de eventos (EventTrip)
      const eventTripsPromise = driverId 
        ? base44.entities.EventTrip.filter({ driver_id: driverId }) 
        : Promise.resolve([]);

      // Buscar Bookings (TP-XXXX)
      let bookingTrips = [];
      if (driverId) {
        const bId = await base44.entities.Booking.filter({ driver_id: driverId });
        bookingTrips = [...bId];
      }
      if (driverPhone) {
        const bPhone = await base44.entities.Booking.filter({ driver_phone: driverPhone });
        const existingIds = new Set(bookingTrips.map(t => t.id));
        for (const b of bPhone) {
          if (!existingIds.has(b.id)) {
            bookingTrips.push(b);
          }
        }
      }

      const [ownTrips, eventTrips] = await Promise.all([ownPromise, eventTripsPromise]);

      // Normalizar viagens da plataforma (ServiceRequest)
      const normalizedPlatformTrips = platformTrips.map(trip => ({
        ...trip,
        type: 'platform',
        is_own: false
      }));

      // Normalizar Bookings (TP-XXXX)
      const normalizedBookings = bookingTrips.map(trip => ({
        ...trip,
        type: 'booking',
        request_number: trip.booking_number,
        is_own: false,
        passenger_name: trip.customer_name, // Mapear nome do cliente para passageiro
        passenger_phone: trip.customer_phone,
        driver_trip_status: trip.driver_trip_status || 'aguardando'
      }));

      // Normalizar viagens próprias
      const normalizedOwnTrips = ownTrips.map(trip => {
        // Garante que driver_trip_status tenha um valor válido para os filtros do dashboard
        let driverTripStatus = trip.driver_trip_status || 'aguardando';
        
        // Se a viagem já foi concluída ou cancelada no macro, reflete isso para o motorista
        if ((trip.status === 'concluida' || trip.status === 'finalizada') && driverTripStatus === 'aguardando') {
            driverTripStatus = 'finalizada';
        }
        if (trip.status === 'cancelada' && driverTripStatus === 'aguardando') {
            driverTripStatus = 'cancelada_motorista';
        }

        return {
          ...trip,
          type: 'own',
          request_number: trip.booking_number,
          is_own: true,
          status: ['pendente', 'confirmada', 'em_andamento'].includes(trip.status) ? 'em_andamento' : trip.status,
          driver_trip_status: driverTripStatus
        };
      });

      // Normalizar viagens de eventos
      const normalizedEventTrips = eventTrips.map(trip => ({
        ...trip,
        type: 'event',
        request_number: trip.name, // Nome do grupo como identificador
        is_own: true, // Tratar como própria/interna
        time: trip.start_time, // Mapear start_time para time
        passengers: trip.passenger_count,
        passenger_name: 'Grupo de Evento', // Nome genérico ou pegar do primeiro pax se disponível
        status: ['dispatched', 'confirmed', 'planned'].includes(trip.status) ? 'em_andamento' : trip.status,
        driver_trip_status: trip.driver_trip_status || 'aguardando'
      }));

      const allTrips = [...normalizedPlatformTrips, ...normalizedBookings, ...normalizedOwnTrips, ...normalizedEventTrips];

      // Ordenar por data/hora
      return allTrips.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
        return dateA.getTime() - dateB.getTime();
      });
    },
    enabled: !!(user?.driver_id || user?.phone_number),
    refetchInterval: 30000,
    initialData: []
  });

  const acknowledgeTripMutation = useMutation({
    mutationFn: async (serviceRequestId) => {
      const response = await base44.functions.invoke('acknowledgeDriverTrip', {
        serviceRequestId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverTrips'] });
    }
  });

  const waitingTrips = trips.filter(t => 
    t.driver_trip_status === 'aguardando' && 
    t.status !== 'cancelada' &&
    t.status !== 'concluida'
  );

  const activeTrips = trips.filter(t => 
    ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'parada_adicional', 'a_caminho_destino', 'chegou_destino'].includes(t.driver_trip_status) &&
    t.status === 'em_andamento'
  );

  // Determine current active tracking trip
  const currentTrackingTrip = activeTrips.length > 0 ? activeTrips[0] : null;
  const isTracking = !!currentTrackingTrip;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTrips = trips.filter(t => {
    if (!t.date) return false;
    const tripDate = parseLocalDate(t.date);
    tripDate.setHours(0, 0, 0, 0);
    return tripDate >= today && 
           t.driver_trip_status === 'aguardando' &&
           t.status !== 'cancelada' &&
           t.status !== 'concluida';
  }).sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
    return dateA - dateB;
  });

  const todayTrips = upcomingTrips.filter(t => {
    const tripDate = parseLocalDate(t.date);
    tripDate.setHours(0, 0, 0, 0);
    return tripDate.getTime() === today.getTime();
  });

  const futureTrips = upcomingTrips.filter(t => {
    const tripDate = parseLocalDate(t.date);
    tripDate.setHours(0, 0, 0, 0);
    return tripDate.getTime() > today.getTime();
  });

  const completedTrips = trips.filter(t => 
    t.driver_trip_status === 'finalizada' || 
    t.status === 'concluida'
  ).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const newTrips = trips.filter(trip => {
    const now = new Date();
    const createdDate = new Date(trip.created_date);
    const hoursSinceCreation = (now - createdDate) / (1000 * 60 * 60);
    
    return hoursSinceCreation <= 24 && 
           !trip.driver_acknowledged_at &&
           trip.status !== 'cancelada' &&
           trip.status !== 'concluida';
  });

  const newTripIds = newTrips.map(t => t.id);

  const handleViewTrip = async (trip) => {
    setViewingTripId(trip.id);
    if (trip.driver_access_token) {
      window.location.href = `/DetalhesViagemMotoristaV2?token=${trip.driver_access_token}`;
      return;
    }

    // Se não tiver token, tenta gerar um agora
    try {
      const response = await base44.functions.invoke('ensureDriverAccessToken', {
        tripId: trip.id,
        tripType: trip.type
      });
      
      if (response.data?.token) {
        // Atualiza localmente para evitar chamadas repetidas se o usuário voltar
        trip.driver_access_token = response.data.token; 
        window.location.href = `/DetalhesViagemMotoristaV2?token=${response.data.token}`;
      } else {
        alert('Erro ao acessar detalhes da viagem: Token não gerado.');
        setViewingTripId(null);
      }
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      alert('Erro ao acessar detalhes da viagem. Por favor, contate o suporte.');
      setViewingTripId(null);
    }
  };

  const handleGenerateGoogleCalendarLink = async (trip) => {
    const title = encodeURIComponent(`Viagem: ${trip.request_number || 'Transfer'}`);
    const details = encodeURIComponent(
      `Origem: ${trip.origin}\nDestino: ${trip.destination}\nPassageiro: ${trip.passenger_name}\nTelefone: ${trip.passenger_phone || 'N/A'}`
    );
    const location = encodeURIComponent(trip.origin);
    
    const startDateTime = new Date(`${trip.date}T${trip.time || '00:00'}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
    
    const formatGoogleDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const dates = `${formatGoogleDate(startDateTime)}/${formatGoogleDate(endDateTime)}`;
    
    const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    
    acknowledgeTripMutation.mutate(trip.id);

    await BrowserService.open(calendarUrl);
  };

  const handleDismissNewTrip = (tripId) => {
    acknowledgeTripMutation.mutate(tripId);
  };

  const handleDismissAlert = (alertId) => {
    const newDismissedAlerts = [...dismissedAlerts, alertId];
    setDismissedAlerts(newDismissedAlerts);
    localStorage.setItem('dismissedDriverAlerts', JSON.stringify(newDismissedAlerts));
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-3 md:p-6 pb-24 md:pb-6">
      <MetaTags 
        title="Painel do Motorista | TransferOnline" 
        description="Acompanhe suas viagens e ganhos." 
      />
      <div className="max-w-6xl mx-auto">
        <div id="driver-header">
            <PageHeader 
            title={`Olá, ${driver?.name || user?.full_name} 👋`}
            subtitle="Suas viagens e solicitações"
            />
        </div>

        {driver && currentTrackingTrip && (
            <TelemetryTracker 
                isTracking={isTracking} 
                driverId={driver.id} 
                tripId={currentTrackingTrip.id}
                visible={false}
            />
        )}

        <AnimatePresence>
          {documentAlerts.filter(alert => !dismissedAlerts.includes(alert.id)).map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <Alert className={`border ${alert.type === 'danger' ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
                <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${alert.type === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
                <AlertDescription className={`flex-1 ${alert.type === 'danger' ? 'text-red-800' : 'text-amber-800'} flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2 ml-2`}>
                  <span className="flex-1 mr-2">{alert.message}</span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`flex-1 sm:flex-none ${alert.type === 'danger' ? 'bg-white border-red-300 text-red-700 hover:bg-red-100' : 'bg-white border-amber-300 text-amber-700 hover:bg-amber-100'}`}
                      onClick={() => window.location.href = alert.link}
                    >
                      {alert.action}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${alert.type === 'danger' ? 'text-red-700 hover:bg-red-100' : 'text-amber-700 hover:bg-amber-100'}`}
                      onClick={() => handleDismissAlert(alert.id)}
                    >
                      <CloseIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          ))}
        </AnimatePresence>



        <div id="driver-stats" className="hidden sm:grid grid-cols-3 gap-3 mb-6">
          <div onClick={() => handleTabChange('waiting')} className="cursor-pointer transition-transform active:scale-95">
            <StatCard 
              title="Aguardando" 
              value={waitingTrips.length} 
              variant="red" 
              description="Para Iniciar"
            />
          </div>
          <div onClick={() => handleTabChange('active')} className="cursor-pointer transition-transform active:scale-95">
            <StatCard 
              title="Andamento" 
              value={activeTrips.length} 
              variant="blue" 
              description="Em Curso"
            />
          </div>
          <div onClick={() => handleTabChange('upcoming')} className="cursor-pointer transition-transform active:scale-95">
            <StatCard 
              title="Hoje" 
              value={todayTrips.length} 
              variant="green" 
              description="Agendadas"
            />
          </div>
        </div>

        <Tabs id="driver-tabs" value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            <TabsTrigger value="waiting" className="relative text-xs md:text-sm py-2 md:py-2.5">
              <span className="hidden md:inline">Aguardando</span>
              <span className="md:hidden">Aguard.</span>
              {waitingTrips.length > 0 && (
                <Badge className="ml-1 md:ml-2 bg-red-500 text-white text-[10px] md:text-xs px-1 md:px-2">{waitingTrips.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="relative text-xs md:text-sm py-2 md:py-2.5">
              <span className="hidden md:inline">Em Andamento</span>
              <span className="md:hidden">Ativas</span>
              {activeTrips.length > 0 && (
                <Badge className="ml-1 md:ml-2 bg-blue-500 text-white text-[10px] md:text-xs px-1 md:px-2">{activeTrips.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="relative text-xs md:text-sm py-2 md:py-2.5">
              Próximas
              {upcomingTrips.length > 0 && (
                <Badge className="ml-1 md:ml-2 bg-green-500 text-white text-[10px] md:text-xs px-1 md:px-2">{upcomingTrips.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs md:text-sm py-2 md:py-2.5">
              <span className="hidden md:inline">Finalizadas</span>
              <span className="md:hidden">Final.</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs md:text-sm py-2 md:py-2.5">
              <span className="hidden md:inline">Mensagens</span>
              <span className="md:hidden">Msgs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="waiting">
            <TripsList 
              trips={waitingTrips} 
              title="Viagens Aguardando Início"
              emptyMessage="Nenhuma viagem aguardando início"
              onViewTrip={handleViewTrip}
              onAddToCalendar={handleGenerateGoogleCalendarLink}
              showCalendarButton
              viewingTripId={viewingTripId}
              newTripIds={newTripIds}
            />
          </TabsContent>

          <TabsContent value="active">
            <TripsList 
              trips={activeTrips} 
              title="Viagens em Andamento"
              emptyMessage="Nenhuma viagem em andamento"
              onViewTrip={handleViewTrip}
              highlightToday
              viewingTripId={viewingTripId}
              newTripIds={newTripIds}
            />
          </TabsContent>

          <TabsContent value="upcoming">
            <TripsList 
              trips={upcomingTrips} 
              title="Próximas Viagens"
              emptyMessage="Nenhuma viagem agendada"
              onViewTrip={handleViewTrip}
              onAddToCalendar={handleGenerateGoogleCalendarLink}
              showCalendarButton
              highlightToday
              viewingTripId={viewingTripId}
              newTripIds={newTripIds}
            />
          </TabsContent>

          <TabsContent value="completed">
            <TripsList 
              trips={completedTrips} 
              title="Viagens Finalizadas"
              emptyMessage="Nenhuma viagem finalizada"
              onViewTrip={handleViewTrip}
              viewingTripId={viewingTripId}
            />
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardContent className="p-4 md:p-6">
                <Suspense fallback={<ComponentLoader />}>
                  <DriverMessages driverId={driver?.id} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!blockingImpediment} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-center text-xl">{blockingImpediment?.title}</DialogTitle>
              <DialogDescription className="text-center pt-2 text-gray-600">
                {blockingImpediment?.message}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center mt-4">
              <Button 
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                onClick={() => window.location.href = blockingImpediment?.actionLink}
              >
                {blockingImpediment?.actionLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function TripsList({ trips, title, emptyMessage, onViewTrip, onAddToCalendar, showCalendarButton = false, highlightToday = false, viewingTripId = null, newTripIds = [] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getTripStatusBadge = (status) => {
    const statusConfig = {
      aguardando: { label: 'Aguardando', color: 'bg-gray-100 text-gray-800 border-gray-200' },
      a_caminho: { label: 'A Caminho', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      chegou_origem: { label: 'Na Origem', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
      passageiro_embarcou: { label: 'A Bordo', color: 'bg-purple-100 text-purple-800 border-purple-200' },
      parada_adicional: { label: 'Parada', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      a_caminho_destino: { label: 'A Caminho', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
      chegou_destino: { label: 'No Destino', color: 'bg-green-100 text-green-800 border-green-200' },
      finalizada: { label: 'Finalizada', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
    };
    const config = statusConfig[status] || statusConfig.aguardando;
    return <Badge variant="outline" className={`${config.color} text-xs font-semibold px-2 py-0.5 whitespace-nowrap`}>{config.label}</Badge>;
  };

  const handleCopyTripDetails = (trip) => {
    const text = [
      `Viagem: ${trip.request_number}`,
      `Data: ${trip.date ? format(parseLocalDate(trip.date), "dd/MM/yyyy") : ''} às ${trip.time}`,
      `Origem: ${trip.origin}`,
      `Destino: ${trip.destination}`,
      `Passageiro: ${trip.passenger_name}`,
      trip.passenger_phone ? `Tel: ${trip.passenger_phone}` : null,
      trip.notes ? `Obs: ${trip.notes}` : null
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text)
      .then(() => toast.success('Dados copiados para a área de transferência!'))
      .catch(() => toast.error('Erro ao copiar dados.'));
  };

  const handleQuickNavigation = async (address) => {
    // Tenta abrir direto no Waze ou Maps (preferência Waze se mobile)
    const encoded = encodeURIComponent(address);
    // Detectar se é mobile para tentar deep link
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // Usar esquema waze:// para forçar abertura do app
      window.location.href = `waze://?q=${encoded}&navigate=yes`;
    } else {
      await BrowserService.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`);
    }
  };

  if (trips.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-gray-50/50 dark:bg-slate-900/50 dark:border-slate-700">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 px-1">
        {title} 
        <Badge variant="secondary" className="text-xs font-normal bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-gray-400">{trips.length}</Badge>
      </h2>
      <div className="grid gap-4">
        {trips.map((trip) => {
          const tripDate = trip.date ? parseLocalDate(trip.date) : null;
          if (tripDate) tripDate.setHours(0, 0, 0, 0);
          const isToday = highlightToday && tripDate && tripDate.getTime() === today.getTime();
          
          // Verifica se deve mostrar botão de navegação rápida
          const showQuickNav = ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'parada_adicional', 'a_caminho_destino'].includes(trip.driver_trip_status);
          const navTarget = ['passageiro_embarcou', 'a_caminho_destino', 'parada_adicional'].includes(trip.driver_trip_status) ? trip.destination : trip.origin;

          const isNew = newTripIds.includes(trip.id);

          return (
            <div 
              key={trip.id} 
              className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 overflow-hidden transition-all active:scale-[0.99] duration-200 ${
                isNew ? 'ring-2 ring-yellow-400 border-l-4 border-l-yellow-500' : isToday ? 'border-l-4 border-l-green-500 border-y-green-100 border-r-green-100 dark:border-y-green-900/30 dark:border-r-green-900/30 shadow-md' : 'border-l-4 border-l-blue-500 border-gray-200 dark:border-slate-800'
              }`}
            >
              <div className="p-4">
                {/* Cabeçalho do Card */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-gray-900 dark:text-gray-50 tracking-tight">
                        {trip.request_number}
                      </span>
                      {isNew && (
                        <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-200 flex items-center gap-1">
                          <BellRing className="w-3 h-3 fill-yellow-700" />
                          NOVO
                        </span>
                      )}
                      {isToday && (
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                          HOJE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 flex-wrap">
                      <Calendar className="w-3 h-3" />
                      <span className="font-medium">
                        {trip.date ? format(parseLocalDate(trip.date), "dd MMM", { locale: ptBR }).toUpperCase() : '-'}
                      </span>
                      <span className="text-gray-300">|</span>
                      <Clock className="w-3 h-3" />
                      <span className="font-medium text-gray-700 text-sm">
                        {trip.time || '--:--'}
                      </span>
                      {(trip.origin_flight_number || trip.destination_flight_number || trip.event_origin_flight_number || trip.event_destination_flight_number) && (
                        <>
                          <span className="text-gray-300 ml-1">|</span>
                          <Plane className="w-3 h-3 ml-1" />
                          <span className="font-medium">
                            {trip.event_origin_airline ? `${trip.event_origin_airline} ` : ''}
                            {trip.origin_flight_number || trip.event_origin_flight_number}
                            {(trip.origin_flight_number || trip.event_origin_flight_number) && (trip.destination_flight_number || trip.event_destination_flight_number) && " → "}
                            {trip.event_destination_airline ? `${trip.event_destination_airline} ` : ''}
                            {trip.destination_flight_number || trip.event_destination_flight_number}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {getTripStatusBadge(trip.driver_trip_status)}
                </div>

                {/* Rota Visual */}
                <div className="relative pl-3 border-l-2 border-gray-100 ml-1.5 space-y-4 my-4">
                  {/* Origem */}
                  <div className="relative">
                    <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full border-2 border-blue-500 bg-white"></div>
                    <div className="text-xs text-gray-400 font-bold uppercase mb-0.5 leading-none">Origem</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
                      {trip.origin}
                    </div>
                  </div>

                  {/* Paradas (se houver) */}
                  {trip.planned_stops && trip.planned_stops.length > 0 && (
                    <div className="relative">
                      <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full border-2 border-orange-400 bg-white"></div>
                      <div className="text-xs text-orange-500 font-bold uppercase mb-0.5 leading-none">
                        {trip.planned_stops.length} Parada(s)
                      </div>
                    </div>
                  )}

                  {/* Destino */}
                  <div className="relative">
                    <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full border-2 border-gray-900 bg-white"></div>
                    <div className="text-xs text-gray-400 font-bold uppercase mb-0.5 leading-none">Destino</div>
                    <div className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
                      {trip.destination}
                    </div>
                  </div>
                </div>

                {/* Rodapé e Ações */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-slate-800 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Passageiro</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100 max-w-[120px] truncate">
                        {trip.passenger_name?.split(' ')[0]} 
                        <span className="text-gray-400 dark:text-gray-500 font-normal text-xs ml-1">
                          +{trip.passengers - 1 > 0 ? trip.passengers - 1 : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyTripDetails(trip);
                      }}
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 border-gray-200 hover:bg-gray-50 text-gray-600"
                      title="Copiar dados"
                    >
                      <Copy className="w-5 h-5" />
                    </Button>

                    {showQuickNav && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickNavigation(navTarget);
                        }}
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                        title="Navegar com Waze/Maps"
                      >
                        <Navigation className="w-5 h-5" />
                      </Button>
                    )}
                    
                    {showCalendarButton ? (
                      <Button
                        onClick={() => onAddToCalendar(trip)}
                        variant="outline"
                        size="sm"
                        className="h-10 px-4 border-gray-200 hover:bg-gray-50"
                      >
                        <CalendarPlus className="w-4 h-4" />
                      </Button>
                    ) : null}

                    <Button
                      onClick={() => onViewTrip(trip)}
                      disabled={viewingTripId === trip.id}
                      className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm hover:shadow"
                    >
                      {viewingTripId === trip.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Abrindo...
                        </>
                      ) : (
                        'Ver Detalhes'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}