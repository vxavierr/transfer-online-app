import React, { useState, useCallback, useMemo, useEffect, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  Users as UsersIcon,
  DollarSign,
  Package,
  User,
  Receipt,
  Plus,
  Trash2,
  Percent,
  X as CloseIcon,
  Copy,
  Star,
  TrendingDown,
  ChevronDown,
  Plane as PlaneIcon,
  MapPin,
  Shield,
  Car,
  BellRing
} from 'lucide-react';
import { format } from 'date-fns';
import { Suspense } from 'react';
import MetaTags from '@/components/seo/MetaTags';
import { getCorporateOnboardingSteps } from '@/components/corporate/CorporateConstants';

// Lazy load components
const FlightStatusChecker = React.lazy(() => import('../components/flight/FlightStatusChecker'));
const OnboardingTutorial = React.lazy(() => import('../components/onboarding/OnboardingTutorial'));
const LocationAutocomplete = React.lazy(() => import('../components/booking/LocationAutocomplete'));
const PassengerListManager = React.lazy(() => import('../components/booking/PassengerListManager'));
const PassengerSelector = React.lazy(() => import('../components/booking/PassengerSelector'));
const AdditionalPassengersList = React.lazy(() => import('../components/booking/AdditionalPassengersList'));
const CostCenterAllocation = React.lazy(() => import('../components/booking/CostCenterAllocation'));
const BillingMethodSelector = React.lazy(() => import('../components/booking/BillingMethodSelector'));
const PhoneInputWithCountry = React.lazy(() => import('@/components/ui/PhoneInputWithCountry'));

const ComponentLoader = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
  </div>
);

export default function SolicitarViagemCorporativa() {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [isMasterUser, setIsMasterUser] = useState(false); // New state for master user
  const [selectedClientForMaster, setSelectedClientForMaster] = useState(null); // New state for master user selected client
  const [selectedRequester, setSelectedRequester] = useState(null); // Novo estado para o solicitante (apenas master)
  const [client, setClient] = useState(null);
  const [isForMyself, setIsForMyself] = useState(true);
  const [selectedPassenger, setSelectedPassenger] = useState(null);
  const [numberOfPassengers, setNumberOfPassengers] = useState(1);
  const [passengersList, setPassengersList] = useState([]);
  const [additionalPassengers, setAdditionalPassengers] = useState([]);
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState('one_way');
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestNumber, setRequestNumber] = useState(null);
  const [returnRequestNumber, setReturnRequestNumber] = useState(null);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [driverLanguage, setDriverLanguage] = useState('pt');
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    date: '',
    time: '',
    return_date: '',
    return_time: '',
    hours: 5,
    notes: '',
    origin_flight_number: '',
    destination_flight_number: '',
    return_origin_flight_number: '',
    return_destination_flight_number: '',
    additional_stops: []
  });
  const [supplierQuotes, setSupplierQuotes] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isCalculatingPrices, setIsCalculatingPrices] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [costAllocations, setCostAllocations] = useState([]);
  const [showAddCostCenter, setShowAddCostCenter] = useState(false);
  const [newCostCenter, setNewCostCenter] = useState({
    cost_center_id: null,
    cost_center_code: '',
    cost_center_name: ''
  });
  const [isCloning, setIsCloning] = useState(false);
  const [clonedFromNumber, setClonedFromNumber] = useState(null);
  const [costCenterSearchTerm, setCostCenterSearchTerm] = useState('');
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [billingData, setBillingData] = useState({
    billing_method: null, // Inicialmente nulo para que as opções venham recolhidas
    billing_responsible_user_id: null,
    billing_responsible_email: '',
    billing_responsible_name: '',
    credit_card_payment_link_recipient: null,
    purchase_order_number: ''
  });

  // Estado para notificações em tempo real
  const [wantNotifications, setWantNotifications] = useState(false);
  const [notificationPhones, setNotificationPhones] = useState(['']);

  // States for location types (to detect airports from frequent locations)
  const [originLocationType, setOriginLocationType] = useState(null);
  const [destinationLocationType, setDestinationLocationType] = useState(null);

  // Funções para gerenciar telefones de notificação
  const handleAddNotificationPhone = () => {
    setNotificationPhones([...notificationPhones, '']);
  };

  const handleRemoveNotificationPhone = (index) => {
    setNotificationPhones(notificationPhones.filter((_, i) => i !== index));
  };

  const handleNotificationPhoneChange = (index, value) => {
    const updated = [...notificationPhones];
    updated[index] = value;
    setNotificationPhones(updated);
  };

  // Fetch airport keywords from AppConfig
  const { data: airportKeywordsConfig } = useQuery({
    queryKey: ['airportKeywordsCorporate'],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: 'airport_keywords' });
      return configs.length > 0 ? configs[0].config_value : null;
    },
    staleTime: 300000, // 5 minutes
  });

  // Buscar tema sazonal ativo
  const { data: seasonalThemeData } = useQuery({
    queryKey: ['seasonalThemeCorporate'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getActiveSeasonalTheme');
      return response.data;
    },
    staleTime: 300000, // 5 minutos
  });

  const seasonalTheme = seasonalThemeData?.active ? seasonalThemeData.theme : null;

  const minDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tutorial') === 'true') {
      setShowTutorial(true);
    }
  }, []);

  const maxPassengersAllowed = useMemo(() => {
    if (!selectedSupplier) return 4;
    return selectedSupplier.max_passengers || 4;
  }, [selectedSupplier]);

  const isAirport = useCallback((address) => {
    if (!address) return false;
    const lowerAddress = address.toLowerCase();
    
    let keywords = [
      'aeroporto',
      'airport',
      'gru',
      'guarulhos',
      'cgh',
      'congonhas',
      'vcp',
      'viracopos',
      'galeão',
      'gig',
      'santos dumont',
      'sdu',
      'confins',
      'cnf'
    ];

    if (airportKeywordsConfig) {
      keywords = airportKeywordsConfig.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    }

    return keywords.some(keyword => lowerAddress.includes(keyword));
  }, [airportKeywordsConfig]);

  const originIsAirport = useMemo(() => originLocationType === 'airport' || isAirport(formData.origin), [formData.origin, isAirport, originLocationType]);
  const destinationIsAirport = useMemo(() => destinationLocationType === 'airport' || isAirport(formData.destination), [formData.destination, isAirport, destinationLocationType]);
  const returnOriginIsAirport = useMemo(() => serviceType === 'round_trip' && (destinationLocationType === 'airport' || isAirport(formData.destination)), [serviceType, formData.destination, isAirport, destinationLocationType]);
  const returnDestinationIsAirport = useMemo(() => serviceType === 'round_trip' && (originLocationType === 'airport' || isAirport(formData.origin)), [serviceType, formData.origin, isAirport, originLocationType]);

  // Buscar todos os clientes (apenas para MASTER)
  const { data: allClients = [] } = useQuery({
    queryKey: ['allClients', user?.viewable_supplier_ids],
    queryFn: async () => {
      const clientsPromise = base44.entities.Client.list();
      const ownClientsPromise = base44.entities.SupplierOwnClient.list();

      const [clients, ownClients] = await Promise.all([clientsPromise, ownClientsPromise]);

      let filteredClients = clients;
      let filteredOwnClients = ownClients;

      // Se o admin tiver restrição de visualização de fornecedores, filtrar clientes
      if (user?.viewable_supplier_ids && user.viewable_supplier_ids.length > 0) {
        filteredClients = clients.filter(c => 
          c.associated_supplier_ids && 
          c.associated_supplier_ids.some(sid => user.viewable_supplier_ids.includes(sid))
        );
        filteredOwnClients = ownClients.filter(c =>
           user.viewable_supplier_ids.includes(c.supplier_id)
        );
      }

      // Unificar e adicionar tipo
      const normalizedClients = filteredClients.map(c => ({...c, client_type: 'platform', label_suffix: ''}));
      const normalizedOwnClients = filteredOwnClients.map(c => ({...c, client_type: 'own', label_suffix: ' (Próprio)'}));

      return [...normalizedClients, ...normalizedOwnClients].sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: isMasterUser && !!user,
    initialData: []
  });

  const { data: clientUsersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['clientUsers', client?.id],
    queryFn: async () => {
      if (isMasterUser && client?.id) {
        // Master buscando usuários de um cliente específico
        const allUsers = await base44.entities.User.list();
        const clientUsers = allUsers.filter(u => u.client_id === client.id && !u.is_driver);
        return { success: true, users: clientUsers };
      } else {
        // Usuário normal usando a função existente
        const response = await base44.functions.invoke('listClientUsers');
        return response.data;
      }
    },
    enabled: !!client?.id,
    initialData: { success: false, users: [] }
  });

  const { data: costCenters = [] } = useQuery({
    queryKey: ['costCenters', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      return await base44.entities.CostCenter.filter({
        client_id: client.id,
        active: true
      });
    },
    enabled: !!client?.id,
    initialData: []
  });

  const { data: frequentRequesters = [] } = useQuery({
    queryKey: ['frequentRequesters', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      return await base44.entities.FrequentRequester.filter({ client_id: client.id });
    },
    enabled: !!client?.id,
    initialData: []
  });

  const availablePassengers = useMemo(() => {
    return clientUsersData?.users || [];
  }, [clientUsersData]);

  const availableFinancialResponsibles = useMemo(() => {
    const users = (clientUsersData?.users || []).map(u => ({ ...u, is_system_user: true }));
    
    const requesters = frequentRequesters.map(fr => ({
      id: fr.id,
      full_name: fr.full_name,
      email: fr.email,
      is_system_user: false
    }));

    const all = [...users];
    
    requesters.forEach(req => {
      // Evitar duplicatas por email (usuário do sistema tem prioridade)
      if (req.email && !all.some(u => u.email?.toLowerCase() === req.email?.toLowerCase())) {
        all.push(req);
      } else if (!req.email) {
        // Se não tiver email, adiciona mesmo assim (nome pode ser útil)
        all.push(req);
      }
    });

    return all.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [clientUsersData, frequentRequesters]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        // Verificar se é usuário MASTER (admin)
        const isAdmin = currentUser.role === 'admin';
        setIsMasterUser(isAdmin);
        
        if (!isAdmin && !currentUser.client_id) {
          alert('Este recurso é exclusivo para usuários corporativos.');
          navigate('/NovaReserva');
          return;
        }
        
        setUser(currentUser);
        
        // Se NÃO for MASTER, buscar o cliente vinculado
        if (!isAdmin && currentUser.client_id) {
          const clients = await base44.entities.Client.list();
          const userClient = clients.find(c => c.id === currentUser.client_id);
          if (!userClient || !userClient.active) {
            alert('Cliente não encontrado ou inativo.');
            navigate('/');
            return;
          }
          setClient(userClient);
          setBillingData(prev => ({
            ...prev,
            billing_responsible_user_id: currentUser.id,
            billing_responsible_email: currentUser.email,
            billing_responsible_name: currentUser.full_name
          }));
        }
        
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        base44.auth.redirectToLogin();
      }
    };
    checkAuth();
  }, []);

  // Quando MASTER seleciona um cliente
  useEffect(() => {
    if (isMasterUser && selectedClientForMaster) {
      setClient(selectedClientForMaster);
      // Reset de estados dependentes do cliente
      setIsForMyself(false); // Master user is never "for myself" of the selected client
      setSelectedPassenger(null);
      setSelectedRequester(null); // Resetar solicitante
      setNumberOfPassengers(1);
      setPassengersList([]);
      setAdditionalPassengers([]);
      setCostAllocations([]);
      setBillingData({
        billing_method: null,
        billing_responsible_user_id: null,
        billing_responsible_email: '',
        billing_responsible_name: '',
        credit_card_payment_link_recipient: null,
        purchase_order_number: ''
      });
      setError(''); // Clear any previous errors
    } else if (isMasterUser && !selectedClientForMaster) {
      // If master user deselects client or starts without one, ensure client is null
      setClient(null);
    }
  }, [selectedClientForMaster, isMasterUser]);

  useEffect(() => {
    const loadClonedRequest = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const cloneId = urlParams.get('cloneId');

      if (cloneId && user && client && !isCheckingAuth) {
        try {
          setIsCloning(true);
          const requests = await base44.entities.ServiceRequest.filter({ id: cloneId });

          if (requests.length === 0) {
            alert('Solicitação não encontrada.');
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }

          const requestToClone = requests[0];

          if (!isMasterUser && requestToClone.client_id !== user.client_id) {
            alert('Você não tem permissão para clonar esta solicitação.');
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }
          // If master user, allow cloning as long as `client` is set to the request's client.
          // This relies on `selectedClientForMaster` being set correctly if cloning is initiated by master.
          if (isMasterUser && client.id !== requestToClone.client_id) {
            alert('Para clonar esta solicitação, selecione o cliente correto no menu Master.');
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }

          setServiceType(requestToClone.service_type);
          setDriverLanguage(requestToClone.driver_language || 'pt');
          setFormData({
            origin: requestToClone.origin || '',
            destination: requestToClone.destination || '',
            date: '',
            time: '',
            return_date: '',
            return_time: '',
            hours: requestToClone.hours || 5,
            notes: requestToClone.notes || '',
            origin_flight_number: '',
            destination_flight_number: '',
            return_origin_flight_number: '',
            return_destination_flight_number: '',
            additional_stops: requestToClone.additional_stops || []
          });

          setNumberOfPassengers(requestToClone.passengers || 1);

          // Passenger selection logic for cloned request
          if (isMasterUser) {
            // Master user implies 'for other' from the start, so just find the passenger
            if (clientUsersData?.users) {
              const passenger = clientUsersData.users.find(u => u.id === requestToClone.passenger_user_id);
              if (passenger) {
                setSelectedPassenger(passenger);
              } else {
                setSelectedPassenger(null); // Passenger might not exist in the selected client
              }
            }
          } else { // Non-master user
            if (requestToClone.passenger_user_id === user.id) {
              setIsForMyself(true);
              setSelectedPassenger(null);
            } else {
              setIsForMyself(false);
              if (clientUsersData?.users) {
                const passenger = clientUsersData.users.find(u => u.id === requestToClone.passenger_user_id);
                if (passenger) {
                  setSelectedPassenger(passenger);
                } else {
                  setSelectedPassenger(null);
                }
              }
            }
          }

          if (requestToClone.passengers_details && requestToClone.passengers_details.length > 0) {
            setAdditionalPassengers(requestToClone.passengers_details);
          } else {
            setAdditionalPassengers([]);
          }
          setPassengersList([]);

          if (requestToClone.cost_allocation && requestToClone.cost_allocation.length > 0) {
            setCostAllocations(requestToClone.cost_allocation);
          } else {
            setCostAllocations([]);
          }

          if (requestToClone.billing_method) {
            // Adjust billing responsible based on current user if non-master, or just clone if master.
            const clonedBillingResponsibleId = requestToClone.billing_responsible_user_id;
            let finalBillingResponsibleId = clonedBillingResponsibleId;
            let finalBillingResponsibleEmail = requestToClone.billing_responsible_email;
            let finalBillingResponsibleName = requestToClone.billing_responsible_name;

            if (!isMasterUser && user.id !== clonedBillingResponsibleId) {
              // If cloning for self, but original was for other, set to self.
              // This part assumes `currentUser` is available which it is from the checkAuth.
              finalBillingResponsibleId = user.id;
              finalBillingResponsibleEmail = user.email;
              finalBillingResponsibleName = user.full_name;
            }

            setBillingData({
              billing_method: requestToClone.billing_method,
              billing_responsible_user_id: finalBillingResponsibleId,
              billing_responsible_email: finalBillingResponsibleEmail,
              billing_responsible_name: finalBillingResponsibleName,
              credit_card_payment_link_recipient: requestToClone.credit_card_payment_link_recipient || null,
              purchase_order_number: requestToClone.purchase_order_number || ''
            });
          }

          setClonedFromNumber(requestToClone.request_number);
          setStep(1);

          window.history.replaceState({}, '', window.location.pathname);

        } catch (error) {
          console.error('Erro ao carregar solicitação para clonar:', error);
          alert('Erro ao carregar dados da solicitação. Tente novamente.');
          window.history.replaceState({}, '', window.location.pathname);
        } finally {
          setIsCloning(false);
        }
      }
    };

    if (!isCheckingAuth && user && client) {
      loadClonedRequest();
    }
  }, [user, client, isCheckingAuth, clientUsersData, isMasterUser]);


  useEffect(() => {
    if (numberOfPassengers > maxPassengersAllowed) {
      setNumberOfPassengers(maxPassengersAllowed);
      if (passengersList.length > maxPassengersAllowed) {
        setPassengersList(passengersList.slice(0, maxPassengersAllowed));
      }
      if (additionalPassengers.length > maxPassengersAllowed - 1) {
        setAdditionalPassengers(additionalPassengers.slice(0, maxPassengersAllowed - 1));
      }
    }
  }, [maxPassengersAllowed, numberOfPassengers, passengersList, additionalPassengers]);

  const isIntermunicipal = useMemo(() => false, []);

  const requiresPassengerDocumentation = useMemo(() => {
    if (!selectedSupplier?.vehicle_name) return false;

    const vehicleName = selectedSupplier.vehicle_name.toLowerCase();
    const requiresListVehicles = ['van', 'micro', 'ônibus', 'onibus', 'microônibus'];

    return requiresListVehicles.some(v => vehicleName.includes(v));
  }, [selectedSupplier?.vehicle_name]);

  const shouldUseDetailedList = useMemo(() => {
    return requiresPassengerDocumentation || numberOfPassengers > 5;
  }, [requiresPassengerDocumentation, numberOfPassengers]);

  const validateStep1 = useCallback(() => {
    setError('');
    // Master user must select a client before proceeding
    if (isMasterUser && !client) {
      setError('Por favor, selecione um cliente para continuar.');
      return false;
    }
    if (serviceType !== 'hourly' && (!formData.origin || !formData.destination)) {
      setError('Por favor, preencha origem e destino.');
      return false;
    }
    if (serviceType === 'hourly') {
      if (!formData.origin) {
        setError('Por favor, preencha o ponto de partida.');
        return false;
      }
      if (!formData.destination) {
        setError('Por favor, preencha o destino final.');
        return false;
      }
      const validStops = formData.additional_stops.filter(stop => stop.trim() !== '');
      if (validStops.length === 0) {
        setError('Para viagens por hora, é obrigatório adicionar pelo menos uma parada entre origem e destino.');
        return false;
      }
    }

    // VALIDAÇÃO DE NÚMERO DE VOO OBRIGATÓRIO PARA AEROPORTOS
    if (originIsAirport && !formData.origin_flight_number?.trim()) {
      setError('Por favor, informe o número do voo de origem (aeroporto detectado).');
      return false;
    }
    if (destinationIsAirport && !formData.destination_flight_number?.trim()) {
      setError('Por favor, informe o número do voo de destino (aeroporto detectado).');
      return false;
    }
    if (serviceType === 'round_trip') {
      if (returnOriginIsAirport && !formData.return_origin_flight_number?.trim()) {
        setError('Por favor, informe o número do voo de origem do retorno (aeroporto detectado).');
        return false;
      }
      if (returnDestinationIsAirport && !formData.return_destination_flight_number?.trim()) {
        setError('Por favor, informe o número do voo de destino do retorno (aeroporto detectado).');
        return false;
      }
    }

    if (!formData.date || !formData.time) {
      setError('Por favor, preencha data e horário.');
      return false;
    }
    if (serviceType === 'round_trip' && (!formData.return_date || !formData.return_time)) {
      setError('Por favor, preencha data e horário do retorno.');
      return false;
    }
    if (serviceType === 'hourly' && (!formData.hours || formData.hours < 5)) {
      setError('Por favor, informe a quantidade de horas (mínimo 5 horas).');
      return false;
    }
    const now = new Date();
    const bookingDateTime = new Date(`${formData.date}T${formData.time}`);
    if (bookingDateTime.getTime() < now.getTime()) {
      setError('A data e hora da viagem não podem ser no passado.');
      return false;
    }
    return true;
  }, [formData, serviceType, originIsAirport, destinationIsAirport, returnOriginIsAirport, returnDestinationIsAirport, isMasterUser, client]);

  const handleCalculateAndContinue = async () => {
    if (!validateStep1()) return;

    // Lógica para clientes próprios (Módulo 3) - Calcular direto
    if (client?.client_type === 'own') {
        setIsCalculatingPrices(true);
        setError('');
        try {
            const response = await base44.functions.invoke('calculateSupplierOwnBookingQuotes', {
                client_id: client.id,
                supplier_id: client.supplier_id,
                service_type: serviceType,
                origin: formData.origin,
                destination: formData.destination,
                date: formData.date,
                time: formData.time,
                return_date: serviceType === 'round_trip' ? formData.return_date : null,
                return_time: serviceType === 'round_trip' ? formData.return_time : null,
                hours: serviceType === 'hourly' ? formData.hours : null,
                driver_language: driverLanguage
            });

            if (response.data.success) {
                setSupplierQuotes(response.data.quotes);
                setStep(2);
            } else {
                throw new Error(response.data.error || 'Erro ao calcular preços');
            }
        } catch (err) {
            console.error('Erro ao calcular preços próprios:', err);
            setError(err.message || 'Erro ao buscar preços. Tente novamente.');
        } finally {
            setIsCalculatingPrices(false);
        }
        return;
    }

    setError('');
    setIsCalculatingPrices(true);
    try {
      const response = await base44.functions.invoke('calculateMultiSupplierPrices', {
        client_id: client.id,
        service_type: serviceType,
        origin: formData.origin,
        destination: formData.destination,
        date: formData.date,
        time: formData.time,
        return_date: serviceType === 'round_trip' ? formData.return_date : null,
        return_time: serviceType === 'round_trip' ? formData.return_time : null,
        hours: serviceType === 'hourly' ? formData.hours : null,
        additional_stops: serviceType === 'hourly' ? formData.additional_stops.filter(stop => stop.trim() !== '') : null,
        driver_language: driverLanguage
      });
      if (response.data.success) {
        setSupplierQuotes(response.data.supplier_quotes);
        setStep(2);
      } else {
        throw new Error(response.data.error || 'Erro ao calcular preços');
      }
    } catch (err) {
      console.error('[SolicitarViagemCorporativa] Erro ao calcular preços:', err);
      let errorMessage = err.response?.data?.error || err.message || 'Erro ao buscar fornecedores. Tente novamente.';
      if (err.response?.data?.error_type === 'no_suppliers_associated' || err.response?.data?.error_type === 'no_active_suppliers') {
        errorMessage += '\n\n💡 Entre em contato com o administrador do sistema para configurar fornecedores para sua empresa.';
      }
      setError(errorMessage);
    } finally {
      setIsCalculatingPrices(false);
    }
  };

  const formatPrice = (price) => {
    if (price === 0) return 'Sob Consulta';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  const handleAddCostAllocation = useCallback(() => {
    if (!newCostCenter.cost_center_code || !newCostCenter.cost_center_name) {
      setError('Por favor, preencha o código e o nome do centro de custo.');
      return;
    }
    const isDuplicate = costAllocations.some(a => a.cost_center_code === newCostCenter.cost_center_code);
    if (isDuplicate) {
      setError(`O centro de custo com código '${newCostCenter.cost_center_code}' já foi adicionado.`);
      return;
    }

    setCostAllocations(prevAllocations => {
      let updatedAllocations;
      if (prevAllocations.length === 0) {
        updatedAllocations = [{
          cost_center_id: newCostCenter.cost_center_id,
          cost_center_code: newCostCenter.cost_center_code,
          cost_center_name: newCostCenter.cost_center_name,
          allocation_type: 'percentage',
          allocation_value: 100
        }];
      } else {
        const allAllocations = [
          ...prevAllocations.map(alloc => ({
            ...alloc,
            allocation_type: 'percentage',
          })),
          {
            cost_center_id: newCostCenter.cost_center_id,
            cost_center_code: newCostCenter.cost_center_code,
            cost_center_name: newCostCenter.cost_center_name,
            allocation_type: 'percentage',
            allocation_value: 0
          }
        ];

        const evenPercentage = parseFloat((100 / allAllocations.length).toFixed(2));
        updatedAllocations = allAllocations.map(alloc => ({
          ...alloc,
          allocation_value: evenPercentage
        }));
      }
      return updatedAllocations;
    });

    setNewCostCenter({ cost_center_id: null, cost_center_code: '', cost_center_name: '' });
    setShowAddCostCenter(false);
    setCostCenterSearchTerm('');
    setIsManualEntry(false);
    setError('');
  }, [newCostCenter, costAllocations]);

  const handleRemoveCostAllocation = useCallback((index) => {
    setCostAllocations(prevAllocations => {
      const filtered = prevAllocations.filter((_, i) => i !== index);
      if (filtered.length === 0) return filtered;

      const evenPercentage = parseFloat((100 / filtered.length).toFixed(2));
      return filtered.map(alloc => ({
        ...alloc,
        allocation_value: evenPercentage
      }));
    });
    setError('');
  }, []);

  const handleSelectExistingCostCenter = useCallback((costCenter) => {
    setNewCostCenter({
      cost_center_id: costCenter.id,
      cost_center_code: costCenter.code,
      cost_center_name: costCenter.name,
    });
    setIsManualEntry(false);
    setCostCenterSearchTerm('');
  }, []);

  const handleCostAllocationsChange = useCallback((newAllocations) => {
    setCostAllocations(newAllocations);
  }, []);

  const handleBillingDataChange = useCallback((newBillingData) => {
    setBillingData(newBillingData);
  }, []);

  const validateCostAllocation = useCallback(() => {
    setError('');
    if (costAllocations.length === 0) {
      setError('Por favor, adicione pelo menos um centro de custo para esta viagem.');
      return false;
    }

    if (costAllocations.length === 1) {
      return true;
    }

    const hasPercentage = costAllocations.some(ca => ca.allocation_type === 'percentage');
    const hasFixedAmount = costAllocations.some(ca => ca.allocation_type === 'fixed_amount');

    if (hasPercentage && hasFixedAmount) {
      setError('Não é possível misturar rateio percentual com valor fixo.');
      return false;
    }

    if (hasPercentage) {
      const totalPercentage = costAllocations.filter(ca => ca.allocation_type === 'percentage').reduce((sum, ca) => sum + ca.allocation_value, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        setError(`A soma dos percentuais deve ser 100% (atual: ${totalPercentage.toFixed(2)}%).`);
        return false;
      }
    }

    if (hasFixedAmount && selectedSupplier) {
      const totalFixed = costAllocations.filter(ca => ca.allocation_type === 'fixed_amount').reduce((sum, ca) => sum + ca.allocation_value, 0);
      if (Math.abs(totalFixed - selectedSupplier.client_price) > 0.01) {
        setError(`A soma dos valores fixos deve ser igual ao total da viagem (${formatPrice(selectedSupplier.client_price)}).`);
        return false;
      }
    }

    return true;
  }, [costAllocations, selectedSupplier]);

  const validateBillingMethod = useCallback(() => {
    setError('');

    if (!billingData.billing_method) {
      setError('Por favor, selecione uma forma de faturamento.');
      return false;
    }

    if (billingData.billing_method === 'invoiced') {
      if (!billingData.billing_responsible_user_id && !billingData.billing_responsible_email) {
        setError('Por favor, selecione ou informe o responsável financeiro.');
        return false;
      }
      if (!billingData.billing_responsible_user_id && !billingData.billing_responsible_name) {
        setError('Por favor, informe o nome do responsável financeiro.');
        return false;
      }
    }

    if (billingData.billing_method === 'credit_card') {
      if (!billingData.credit_card_payment_link_recipient) {
        setError('Por favor, selecione para quem enviar o link de pagamento.');
        return false;
      }
      if (billingData.credit_card_payment_link_recipient === 'other' && !billingData.billing_responsible_email) {
        setError('Por favor, informe o email para envio do link de pagamento.');
        return false;
      }
    }

    if (billingData.billing_method === 'purchase_order' && !billingData.purchase_order_number) {
      setError('Por favor, informe o número da ordem de compra.');
      return false;
    }

    return true;
  }, [billingData]);

  const validateStep3 = useCallback(() => {
    setError('');
    
    // For master users, requester and passenger MUST be selected
    if (isMasterUser) {
      if (!selectedRequester) {
        setError('Por favor, selecione quem é o solicitante da viagem.');
        return false;
      }
      if (!selectedPassenger) {
        setError('Por favor, selecione o passageiro principal para a viagem.');
        return false;
      }
    }
    
    // For non-master users:
    if (!isMasterUser) {
      if (!user) {
        setError('Dados do usuário não carregados.');
        return false;
      }
      if (!isForMyself && !selectedPassenger) {
        setError('Por favor, selecione o passageiro principal para a viagem.');
        return false;
      }
    }
    
    if (numberOfPassengers > 1) {
      if (isMasterUser && !selectedPassenger) { // Master user acting on behalf
        setError('Por favor, defina o passageiro principal antes de adicionar outros passageiros.');
        return false;
      }
      if (!isMasterUser && !((isForMyself && user) || (!isForMyself && selectedPassenger))) { // Regular user
        setError('Por favor, defina o passageiro principal antes de adicionar outros passageiros.');
        return false;
      }

      if (shouldUseDetailedList) {
        if (passengersList.length !== numberOfPassengers) {
          setError(`Por favor, adicione todos os ${numberOfPassengers} passageiros com nome e documento.`);
          return false;
        }
      } else {
        if (additionalPassengers.length !== (numberOfPassengers - 1)) {
          setError(`Por favor, adicione detalhes para os ${numberOfPassengers - 1} passageiros adicionais.`);
          return false;
        }
      }
    }

    if (!validateCostAllocation()) return false;
    if (!validateBillingMethod()) return false;
    return true;
  }, [isForMyself, selectedPassenger, user, validateCostAllocation, validateBillingMethod, requiresPassengerDocumentation, passengersList, numberOfPassengers, additionalPassengers, isMasterUser]);


  const handleSupplierSelect = (supplier) => {
    startTransition(() => {
      setSelectedSupplier(supplier);
      setNumberOfPassengers(1);
      setPassengersList([]);
      setAdditionalPassengers([]);
    });
  };

  const handleSubmitRequest = async () => {
    if (!validateStep3()) return;
    setIsSubmitting(true);
    setError('');
    try {
      // Determine the main passenger data based on user type and selection
      const passengerData = isMasterUser ? selectedPassenger : (isForMyself ? user : selectedPassenger);
      if (!passengerData) throw new Error('Informações do passageiro não disponíveis.');

      // Handle Own Client Booking (Módulo 3)
      if (client?.client_type === 'own') {
          let ownPassengersDetails = [];
          if (shouldUseDetailedList) {
             if (passengersList.length > 0) ownPassengersDetails = passengersList;
          } else {
             ownPassengersDetails = [
                 {
                     name: passengerData.full_name,
                     document_type: 'CPF',
                     document_number: passengerData.document_number || '',
                     phone_number: passengerData.phone_number || '',
                     is_lead_passenger: true
                 },
                 ...additionalPassengers.map(p => ({
                     name: p.full_name || p.name,
                     document_type: 'CPF',
                     document_number: p.document_number || '',
                     phone_number: p.phone_number || '',
                     is_lead_passenger: false
                 }))
             ];
          }

          const response = await base44.functions.invoke('createSupplierOwnBooking', {
              client_id: client.id,
              supplier_id: client.supplier_id,
              service_type: serviceType,
              origin: formData.origin,
              destination: formData.destination,
              date: formData.date,
              time: formData.time,
              return_date: serviceType === 'round_trip' ? formData.return_date : null,
              return_time: serviceType === 'round_trip' ? formData.return_time : null,
              hours: serviceType === 'hourly' ? formData.hours : null,
              passengers: numberOfPassengers,
              passenger_name: passengerData.full_name,
              passenger_email: passengerData.email,
              passenger_phone: passengerData.phone_number || '',
              passengers_details: ownPassengersDetails,
              vehicle_type_id: selectedSupplier.vehicle_type_id,
              vehicle_type_name: selectedSupplier.vehicle_name,
              price: selectedSupplier.client_price,
              pricing_source: selectedSupplier.pricing_source,
              driver_language: driverLanguage,
              notes: formData.notes,
              additional_stops: formData.additional_stops.filter(s => s.trim() !== '').map((addr, i) => ({ address: addr, order: i+1 })),
              origin_flight_number: formData.origin_flight_number,
              destination_flight_number: formData.destination_flight_number,
              payment_method: billingData.billing_method,
              notification_phones: wantNotifications ? notificationPhones.filter(p => p && p.trim().length > 5) : []
          });

          if (response.data.success) {
             setRequestNumber(response.data.booking.booking_number);
             setIsRoundTrip(false); 
             setRequestSuccess(true);
             setTimeout(() => { navigate('/MinhasViagensProprias'); }, 4000);
          } else {
             throw new Error(response.data.error || 'Erro ao criar viagem');
          }
          setIsSubmitting(false);
          return;
      }

      const finalCostAllocations = costAllocations;

      let finalPassengersDetails = [];
      if (shouldUseDetailedList) {
        if (passengersList.length > 0) {
          finalPassengersDetails = passengersList;
        }
      } else {
        const mainPassengerDetail = {
          name: passengerData.full_name,
          document_type: 'CPF',
          document_number: passengerData.document_number || '',
          phone_number: passengerData.phone_number || '',
          is_lead_passenger: true
        };
        finalPassengersDetails = [mainPassengerDetail, ...additionalPassengers.map(p => ({
          name: p.full_name || p.name,
          document_type: 'CPF',
          document_number: p.document_number || '',
          phone_number: p.phone_number || '',
          is_lead_passenger: false
        }))];
      }


      const response = await base44.functions.invoke('submitServiceRequest', {
        client_id: client.id,
        service_type: serviceType,
        driver_language: driverLanguage,
        origin: formData.origin,
        destination: formData.destination,
        date: formData.date,
        time: formData.time,
        return_date: serviceType === 'round_trip' ? formData.return_date : null,
        return_time: serviceType === 'round_trip' ? formData.return_time : null,
        hours: serviceType === 'hourly' ? formData.hours : null,
        additional_stops: serviceType === 'hourly' ? formData.additional_stops.filter(stop => stop.trim() !== '') : null,
        distance_km: selectedSupplier.calculation_details?.supplier_total_distance_km || 0,
        duration_minutes: 0,
        passengers: numberOfPassengers,
        passenger_user_id: passengerData.id,
        passenger_name: passengerData.full_name,
        passenger_email: passengerData.email,
        passenger_phone: passengerData.phone_number || '',
        passengers_details: finalPassengersDetails.length > 0 ? finalPassengersDetails : null,
        notes: formData.notes,
        cost_allocation: finalCostAllocations.length > 0 ? finalCostAllocations : null,
        billing_method: billingData.billing_method,
        billing_responsible_user_id: billingData.billing_responsible_user_id || null, // Enviar null se vazio
        billing_responsible_email: billingData.billing_responsible_email || null,
        billing_responsible_name: billingData.billing_responsible_name || null,
        credit_card_payment_link_recipient: billingData.credit_card_payment_link_recipient || null,
        purchase_order_number: billingData.purchase_order_number || null,
        offered_suppliers: supplierQuotes,
        chosen_supplier_id: selectedSupplier.supplier_id,
        chosen_vehicle_type_id: selectedSupplier.vehicle_type_id,
        chosen_supplier_cost: selectedSupplier.supplier_cost,
        chosen_client_price: selectedSupplier.client_price,
        origin_flight_number: formData.origin_flight_number,
        destination_flight_number: formData.destination_flight_number,
        return_origin_flight_number: formData.return_origin_flight_number,
        return_destination_flight_number: formData.return_destination_flight_number,
        requester_user_id: isMasterUser && selectedRequester?.type === 'system_user' ? selectedRequester.id : null,
        // Enviar dados manuais do solicitante se não for usuário do sistema
        requester_full_name: isMasterUser ? (selectedRequester?.full_name || selectedRequester?.display_name) : null,
        requester_email: isMasterUser ? (selectedRequester?.email || selectedRequester?.display_email) : null,
        requester_phone: isMasterUser ? (selectedRequester?.phone_number) : null,
        frequent_requester_id: isMasterUser && selectedRequester?.type === 'frequent_requester' ? selectedRequester.id : (selectedRequester?.frequent_id || null),
        notification_phones: wantNotifications ? notificationPhones.filter(p => p && p.trim().length > 5) : []
      });

      if (response.data.success) {
        if (response.data.warning) {
          toast.warning("Aviso de Viagem Existente", {
            description: response.data.warning,
            duration: 8000,
          });
        }
        setRequestNumber(response.data.request_number);
        setReturnRequestNumber(response.data.return_request_number || null);
        setIsRoundTrip(response.data.is_round_trip || false);
        setRequestSuccess(true);
        setTimeout(() => { navigate('/MinhasSolicitacoes'); }, 4000);
      } else {
        throw new Error(response.data.error || 'Erro ao criar solicitação');
      }
    } catch (err) {
      console.error('[pages/SolicitarViagemCorporativa.js] Erro ao criar solicitação:', err);
      setError(err.message || 'Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allocationTotals = useMemo(() => {
    const percentageTotal = costAllocations.filter(ca => ca.allocation_type === 'percentage').reduce((sum, ca) => sum + ca.allocation_value, 0);
    const fixedTotal = costAllocations.filter(ca => ca.allocation_type === 'fixed_amount').reduce((sum, ca) => sum + ca.allocation_value, 0);
    return { percentageTotal, fixedTotal };
  }, [costAllocations]);

  const onboardingSteps = useMemo(() => getCorporateOnboardingSteps(), []);

  const handleAddStop = () => {
    setFormData(prev => ({
      ...prev,
      additional_stops: [...prev.additional_stops, '']
    }));
  };

  const handleRemoveStop = (index) => {
    setFormData(prev => ({
      ...prev,
      additional_stops: prev.additional_stops.filter((_, i) => i !== index)
    }));
  };

  const handleStopChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      additional_stops: prev.additional_stops.map((stop, i) => i === index ? value : stop)
    }));
  };

  const handleCopyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Endereço copiado!", {
      description: "Agora você pode colar onde preferir."
    });
  };

  if (isCheckingAuth || isLoadingUsers || isCloning) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {isCloning ? 'Carregando dados da solicitação...' : 'Verificando permissões...'}
          </p>
        </div>
      </div>
    );
  }

  if (requestSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {isRoundTrip ? 'Solicitações Enviadas!' : 'Solicitação Enviada!'}
          </h2>
          <p className="text-gray-600 text-base mb-2">
            {isRoundTrip
              ? 'Suas solicitações de ida e volta foram enviadas com sucesso ao fornecedor.'
              : 'Sua solicitação foi enviada com sucesso ao fornecedor.'}
          </p>

          {requestNumber && (
            <div className="space-y-3 mb-6">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-700 mb-1 font-semibold">
                  {isRoundTrip ? '✈️ Viagem de IDA:' : 'Número da Solicitação:'}
                </p>
                <p className="text-2xl font-bold text-green-600">{requestNumber}</p>
              </div>

              {isRoundTrip && returnRequestNumber && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700 mb-1 font-semibold">🔄 Viagem de VOLTA:</p>
                  <p className="text-2xl font-bold text-blue-600">{returnRequestNumber}</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-blue-900"><strong>📧 Próximos Passos:</strong></p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
              <li>O fornecedor receberá {isRoundTrip ? 'ambas as solicitações' : 'sua solicitação'}</li>
              <li>Você receberá notificações sobre o status</li>
              <li>Acompanhe em "Minhas Solicitações"</li>
            </ul>
          </div>
          <p className="text-sm text-gray-600">Redirecionando para suas solicitações...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6 relative transition-all duration-500"
      style={seasonalTheme?.theme_data?.background_image_url ? {
        backgroundImage: `url(${seasonalTheme.theme_data.background_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      } : seasonalTheme?.theme_data?.primary_color ? {
        background: `linear-gradient(135deg, ${seasonalTheme.theme_data.primary_color}15, #ffffff, ${seasonalTheme.theme_data.secondary_color || seasonalTheme.theme_data.primary_color}15)`
      } : {}}
    >
      <MetaTags 
        title="Portal Corporativo | TransferOnline" 
        description="Gestão de viagens corporativas e solicitações." 
      />
      {seasonalTheme?.theme_data?.background_overlay_color && (
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ backgroundColor: seasonalTheme.theme_data.background_overlay_color, zIndex: 0 }}
        />
      )}
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-8">
          {seasonalTheme?.theme_data?.decoration_icon && (
             <div className="absolute -top-6 right-0 opacity-20 pointer-events-none animate-pulse">
                {/* Ícone decorativo grande se houver */}
                {/* Mapeamento simples de ícones comuns ou usar imagem se for URL */}
             </div>
          )}
          
          <div className="flex items-center gap-3 mb-2">
            {seasonalTheme?.theme_data?.decoration_icon === 'snowflake' ? (
               <div className="text-blue-400 animate-spin-slow"><Star className="w-8 h-8" /></div>
            ) : seasonalTheme?.theme_data?.decoration_icon === 'tree' ? (
               <div className="text-green-600"><div className="w-8 h-8 text-2xl">🎄</div></div>
            ) : seasonalTheme?.theme_data?.decoration_icon === 'star' ? (
               <div className="text-yellow-500 animate-pulse"><Star className="w-8 h-8 fill-current" /></div>
            ) : (
               <Building2 className="w-8 h-8 text-blue-600" style={seasonalTheme?.theme_data?.primary_color ? { color: seasonalTheme.theme_data.primary_color } : {}} />
            )}
            
            <h1 className="text-4xl font-bold text-gray-900" style={seasonalTheme?.theme_data?.primary_color ? { color: seasonalTheme.theme_data.primary_color } : {}}>
              {seasonalTheme?.theme_data?.welcome_title || 'Solicitar Viagem'}
            </h1>
            {isMasterUser && (
              <Badge className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <Shield className="w-3 h-3 mr-1" />
                MASTER
              </Badge>
            )}
          </div>
          <p className="text-gray-600 font-medium">
            {seasonalTheme?.theme_data?.welcome_message ? (
              <span className="flex items-center gap-2">
                {seasonalTheme.theme_data.welcome_message}
              </span>
            ) : (
              isMasterUser 
                ? 'Operação Master - Selecione o cliente e usuário para criar a solicitação'
                : `${client?.name} - Comparação automática entre fornecedores`
            )}
          </p>

          {clonedFromNumber && (
            <Alert className="mt-4 bg-blue-50 border-blue-300">
              <Copy className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>📋 Clonando de:</strong> {clonedFromNumber}
                <br />
                <span className="text-sm">Os dados foram copiados. Por favor, defina novas datas e horários para prosseguir.</span>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Seletor de Cliente (apenas para MASTER) */}
        {isMasterUser && !client && (
          <Card className="mb-6 border-purple-300 bg-purple-50">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="select-client" className="text-lg font-semibold mb-2 block text-purple-900">
                    Selecione o Cliente para operar *
                  </Label>
                  <Select onValueChange={(clientId) => {
                    const selected = allClients.find(c => c.id === clientId);
                    setSelectedClientForMaster(selected);
                  }}>
                    <SelectTrigger id="select-client" className="w-full bg-white">
                      <SelectValue placeholder="Escolha o cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allClients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.label_suffix} {!c.active && '(Inativo)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedClientForMaster && (
                    <Alert className="mt-3 bg-purple-100 border-purple-300">
                      <AlertCircle className="h-4 w-4 text-purple-600" />
                      <AlertDescription className="text-purple-900 text-sm">
                        Para prosseguir, você deve selecionar um cliente.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {client && client.client_type !== 'own' && (!client.associated_supplier_ids || client.associated_supplier_ids.length === 0) && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>⚠️ Configuração Necessária</strong><br />
              {client.name} ainda não possui fornecedores associados. Entre em contato com o administrador do sistema para configurar os fornecedores e poder solicitar viagens.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6 whitespace-pre-line">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Render form only if a client is selected (or if not master user) */}
        {client && (
          <>
            {step === 1 && (
              <Card>
                <CardContent className="p-6">
                  <Tabs value={serviceType} onValueChange={setServiceType} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="one_way">Só Ida</TabsTrigger>
                      <TabsTrigger value="round_trip">Ida e Volta</TabsTrigger>
                      <TabsTrigger value="hourly">Por Hora</TabsTrigger>
                    </TabsList>

                    <TabsContent value="one_way" className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="origin">Origem *</Label>
                          {formData.origin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-blue-600 hover:text-blue-800 px-2"
                              onClick={() => handleCopyToClipboard(formData.origin)}
                              title="Copiar endereço"
                            >
                              <Copy className="w-3 h-3 mr-1" /> Copiar
                            </Button>
                          )}
                        </div>
                        <Suspense fallback={<ComponentLoader />}>
                          <LocationAutocomplete 
                            id="origin" 
                            value={formData.origin} 
                            onChange={(value) => startTransition(() => setFormData({...formData, origin: value}))} 
                            onLocationSelect={(loc) => startTransition(() => setOriginLocationType(loc?.type || null))}
                            placeholder="Digite o endereço de origem" 
                          />
                        </Suspense>
                      </div>

                      {originIsAirport && (
                        <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <Label htmlFor="origin_flight_number" className="flex items-center gap-2 text-sm font-bold text-blue-900">
                              <PlaneIcon className="w-4 h-4 text-blue-600" />
                              Número do Voo / Companhia (Origem) *
                            </Label>
                            <FlightStatusChecker 
                              flightNumber={formData.origin_flight_number} 
                              date={formData.date}
                              expectedOrigin={formData.origin}
                              checkType="arrival"
                            />
                          </div>
                          <Input
                            id="origin_flight_number"
                            value={formData.origin_flight_number}
                            onChange={(e) => setFormData({...formData, origin_flight_number: e.target.value})}
                            placeholder="Ex: LA 3000, GOL 1234"
                            className="bg-white"
                          />
                          <p className="text-xs text-blue-700">
                            ℹ️ Para rastreamento de chegada do passageiro
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="destination">Destino *</Label>
                          {formData.destination && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-blue-600 hover:text-blue-800 px-2"
                              onClick={() => handleCopyToClipboard(formData.destination)}
                              title="Copiar endereço"
                            >
                              <Copy className="w-3 h-3 mr-1" /> Copiar
                            </Button>
                          )}
                        </div>
                        <Suspense fallback={<ComponentLoader />}>
                          <LocationAutocomplete 
                            id="destination" 
                            value={formData.destination} 
                            onChange={(value) => startTransition(() => setFormData({...formData, destination: value}))} 
                            onLocationSelect={(loc) => startTransition(() => setDestinationLocationType(loc?.type || null))}
                            placeholder="Digite o endereço de destino" 
                          />
                        </Suspense>
                      </div>

                      {destinationIsAirport && (
                        <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <Label htmlFor="destination_flight_number" className="flex items-center gap-2 text-sm font-bold text-blue-900">
                              <PlaneIcon className="w-4 h-4 text-blue-600" />
                              Número do Voo / Companhia (Destino) *
                            </Label>
                            <FlightStatusChecker 
                              flightNumber={formData.destination_flight_number} 
                              date={formData.date}
                              expectedDestination={formData.destination}
                              checkType="departure"
                            />
                          </div>
                          <Input
                            id="destination_flight_number"
                            value={formData.destination_flight_number}
                            onChange={(e) => setFormData({...formData, destination_flight_number: e.target.value})}
                            placeholder="Ex: LA 3000, GOL 1234"
                            className="bg-white"
                          />
                          <p className="text-xs text-blue-700">
                            ℹ️ Para rastreamento de partida do passageiro
                          </p>
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="date">Data *</Label>
                          <Input id="date" type="date" min={minDate} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="time">Horário *</Label>
                          <Input id="time" type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="round_trip" className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="origin-rt">Origem *</Label>
                          {formData.origin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-blue-600 hover:text-blue-800 px-2"
                              onClick={() => handleCopyToClipboard(formData.origin)}
                              title="Copiar endereço"
                            >
                              <Copy className="w-3 h-3 mr-1" /> Copiar
                            </Button>
                          )}
                        </div>
                        <Suspense fallback={<ComponentLoader />}>
                          <LocationAutocomplete 
                            id="origin-rt" 
                            value={formData.origin} 
                            onChange={(value) => startTransition(() => setFormData({...formData, origin: value}))} 
                            onLocationSelect={(loc) => startTransition(() => setOriginLocationType(loc?.type || null))}
                            placeholder="Digite o endereço de origem" 
                          />
                        </Suspense>
                      </div>

                      {originIsAirport && (
                        <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <Label htmlFor="origin_flight_number_rt" className="flex items-center gap-2 text-sm font-bold text-blue-900">
                              <PlaneIcon className="w-4 h-4 text-blue-600" />
                              Número do Voo / Companhia (Ida - Origem) *
                            </Label>
                            <FlightStatusChecker 
                              flightNumber={formData.origin_flight_number} 
                              date={formData.date}
                              expectedOrigin={formData.origin}
                              checkType="arrival"
                            />
                          </div>
                          <Input
                            id="origin_flight_number_rt"
                            value={formData.origin_flight_number}
                            onChange={(e) => setFormData({...formData, origin_flight_number: e.target.value})}
                            placeholder="Ex: LA 3000, GOL 1234"
                            className="bg-white"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="destination-rt">Destino *</Label>
                          {formData.destination && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-blue-600 hover:text-blue-800 px-2"
                              onClick={() => handleCopyToClipboard(formData.destination)}
                              title="Copiar endereço"
                            >
                              <Copy className="w-3 h-3 mr-1" /> Copiar
                            </Button>
                          )}
                        </div>
                        <Suspense fallback={<ComponentLoader />}>
                          <LocationAutocomplete 
                            id="destination-rt" 
                            value={formData.destination} 
                            onChange={(value) => startTransition(() => setFormData({...formData, destination: value}))} 
                            onLocationSelect={(loc) => startTransition(() => setDestinationLocationType(loc?.type || null))}
                            placeholder="Digite o endereço de destino" 
                          />
                        </Suspense>
                      </div>

                      {destinationIsAirport && (
                        <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <Label htmlFor="destination_flight_number_rt" className="flex items-center gap-2 text-sm font-bold text-blue-900">
                              <PlaneIcon className="w-4 h-4 text-blue-600" />
                              Número do Voo / Companhia (Ida - Destino) *
                            </Label>
                            <FlightStatusChecker 
                              flightNumber={formData.destination_flight_number} 
                              date={formData.date}
                              expectedDestination={formData.destination}
                              checkType="departure"
                            />
                          </div>
                          <Input
                            id="destination_flight_number_rt"
                            value={formData.destination_flight_number}
                            onChange={(e) => setFormData({...formData, destination_flight_number: e.target.value})}
                            placeholder="Ex: LA 3000, GOL 1234"
                            className="bg-white"
                          />
                        </div>
                      )}

                      <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                        <h3 className="font-semibold text-blue-900">Ida</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="date-rt">Data *</Label>
                            <Input id="date-rt" type="date" min={minDate} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="time-rt">Horário *</Label>
                            <Input id="time-rt" type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg space-y-4">
                        <h3 className="font-semibold text-green-900">Volta</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="return-date">Data *</Label>
                            <Input id="return-date" type="date" min={formData.date || minDate} value={formData.return_date} onChange={(e) => setFormData({...formData, return_date: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="return-time">Horário *</Label>
                            <Input id="return-time" type="time" value={formData.return_time} onChange={(e) => setFormData({...formData, return_time: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      {returnOriginIsAirport && (
                        <div className="space-y-2 bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <Label htmlFor="return_origin_flight_number" className="flex items-center gap-2 text-sm font-bold text-green-900">
                              <PlaneIcon className="w-4 h-4 text-green-600" />
                              Número do Voo / Companhia (Volta - Origem) *
                            </Label>
                            <Suspense fallback={<ComponentLoader />}>
                              <FlightStatusChecker 
                                flightNumber={formData.return_origin_flight_number} 
                                date={formData.return_date}
                                expectedOrigin={formData.destination} // Retorno origem = destino da ida
                                checkType="arrival"
                              />
                            </Suspense>
                          </div>
                          <Input
                            id="return_origin_flight_number"
                            value={formData.return_origin_flight_number}
                            onChange={(e) => setFormData({...formData, return_origin_flight_number: e.target.value})}
                            placeholder="Ex: LA 3001, GOL 1235"
                            className="bg-white"
                          />
                        </div>
                      )}

                      {returnDestinationIsAirport && (
                        <div className="space-y-2 bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <Label htmlFor="return_destination_flight_number" className="flex items-center gap-2 text-sm font-bold text-green-900">
                              <PlaneIcon className="w-4 h-4 text-green-600" />
                              Número do Voo / Companhia (Volta - Destino) *
                            </Label>
                            <Suspense fallback={<ComponentLoader />}>
                              <FlightStatusChecker 
                                flightNumber={formData.return_destination_flight_number} 
                                date={formData.return_date}
                                expectedDestination={formData.origin} // Retorno destino = origem da ida
                                checkType="departure"
                              />
                            </Suspense>
                          </div>
                          <Input
                            id="return_destination_flight_number"
                            value={formData.return_destination_flight_number}
                            onChange={(e) => setFormData({...formData, return_destination_flight_number: e.target.value})}
                            placeholder="Ex: LA 3001, GOL 1235"
                            className="bg-white"
                          />
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="hourly" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="hours">Quantidade de Horas *</Label>
                        <Select value={String(formData.hours)} onValueChange={(value) => setFormData({...formData, hours: parseInt(value)})}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 Horas</SelectItem>
                            <SelectItem value="10">10 Horas</SelectItem>
                            <SelectItem value="12">12 Horas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="origin-hourly">Ponto de Partida *</Label>
                          {formData.origin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-blue-600 hover:text-blue-800 px-2"
                              onClick={() => handleCopyToClipboard(formData.origin)}
                              title="Copiar endereço"
                            >
                              <Copy className="w-3 h-3 mr-1" /> Copiar
                            </Button>
                          )}
                        </div>
                        <Suspense fallback={<ComponentLoader />}>
                          <LocationAutocomplete 
                            id="origin-hourly" 
                            value={formData.origin} 
                            onChange={(value) => startTransition(() => setFormData({...formData, origin: value}))} 
                            onLocationSelect={(loc) => startTransition(() => setOriginLocationType(loc?.type || null))}
                            placeholder="Digite o endereço inicial" 
                          />
                        </Suspense>
                      </div>

                      {originIsAirport && (
                        <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <Label htmlFor="origin_flight_number_hourly" className="flex items-center gap-2 text-sm font-bold text-blue-900">
                              <PlaneIcon className="w-4 h-4 text-blue-600" />
                              Número do Voo / Companhia (Origem) *
                            </Label>
                            <FlightStatusChecker 
                              flightNumber={formData.origin_flight_number} 
                              date={formData.date}
                              expectedOrigin={formData.origin}
                              checkType="arrival"
                            />
                          </div>
                          <Input
                            id="origin_flight_number_hourly"
                            value={formData.origin_flight_number}
                            onChange={(e) => setFormData({...formData, origin_flight_number: e.target.value})}
                            placeholder="Ex: LA 3000, GOL 1234"
                            className="bg-white"
                          />
                          <p className="text-xs text-blue-700">
                            ℹ️ Para rastreamento de chegada do passageiro
                          </p>
                        </div>
                      )}

                      {/* Paradas Adicionais (Obrigatório pelo menos 1) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold">Paradas Adicionais (Obrigatório pelo menos 1) *</Label>
                          <Button
                            type="button"
                            onClick={handleAddStop}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Parada
                          </Button>
                        </div>

                        {formData.additional_stops.length > 0 && (
                          <div className="space-y-3">
                            {formData.additional_stops.map((stop, index) => (
                              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <MapPin className="w-4 h-4 text-blue-600" />
                                      <Label className="text-sm font-medium text-blue-900">Parada {index + 1}</Label>
                                    </div>
                                    <Suspense fallback={<ComponentLoader />}>
                                      <LocationAutocomplete
                                        id={`stop-${index}`}
                                        value={stop}
                                        onChange={(value) => handleStopChange(index, value)}
                                        placeholder="Digite o endereço da parada"
                                      />
                                    </Suspense>
                                  </div>
                                  <Button
                                    type="button"
                                    onClick={() => handleRemoveStop(index)}
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {formData.additional_stops.length === 0 && (
                          <Alert className="bg-orange-50 border-orange-300">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-orange-800 text-sm font-medium">
                              ⚠️ Para viagens por hora, adicione pelo menos uma parada entre origem e destino final.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="destination-hourly">Destino Final *</Label>
                          {formData.destination && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-blue-600 hover:text-blue-800 px-2"
                              onClick={() => handleCopyToClipboard(formData.destination)}
                              title="Copiar endereço"
                            >
                              <Copy className="w-3 h-3 mr-1" /> Copiar
                            </Button>
                          )}
                        </div>
                        <Suspense fallback={<ComponentLoader />}>
                          <LocationAutocomplete 
                            id="destination-hourly" 
                            value={formData.destination} 
                            onChange={(value) => startTransition(() => setFormData({...formData, destination: value}))} 
                            onLocationSelect={(loc) => startTransition(() => setDestinationLocationType(loc?.type || null))}
                            placeholder="Digite o endereço de destino final" 
                          />
                        </Suspense>
                      </div>

                      {destinationIsAirport && (
                        <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <Label htmlFor="destination_flight_number_hourly" className="flex items-center gap-2 text-sm font-bold text-blue-900">
                              <PlaneIcon className="w-4 h-4 text-blue-600" />
                              Número do Voo / Companhia (Destino Final) *
                            </Label>
                            <FlightStatusChecker 
                              flightNumber={formData.destination_flight_number} 
                              date={formData.date}
                              expectedDestination={formData.destination}
                              checkType="departure"
                            />
                          </div>
                          <Input
                            id="destination_flight_number_hourly"
                            value={formData.destination_flight_number}
                            onChange={(e) => setFormData({...formData, destination_flight_number: e.target.value})}
                            placeholder="Ex: LA 3000, GOL 1234"
                            className="bg-white"
                          />
                          <p className="text-xs text-blue-700">
                            ℹ️ Para rastreamento de partida do passageiro
                          </p>
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="date-hourly">Data *</Label>
                          <Input id="date-hourly" type="date" min={minDate} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="time-hourly">Horário *</Label>
                          <Input id="time-hourly" type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="driver_language">Idioma do Motorista</Label>
                      <Select value={driverLanguage} onValueChange={setDriverLanguage}>
                        <SelectTrigger id="driver_language"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pt">🇧🇷 Português</SelectItem>
                          <SelectItem value="en">🇺🇸 English</SelectItem>
                          <SelectItem value="es">🇪🇸 Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCalculateAndContinue} disabled={isCalculatingPrices || (client && client.client_type !== 'own' && (!client.associated_supplier_ids || client.associated_supplier_ids.length === 0))} className="w-full bg-blue-600 hover:bg-blue-700">
                      {isCalculatingPrices ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Consultando Fornecedores...
                        </>
                      ) : (
                        <>
                          Ver Opções de Fornecedores
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <Button variant="ghost" onClick={() => startTransition(() => { setStep(1); setSelectedSupplier(null); setNumberOfPassengers(1); setPassengersList([]); setAdditionalPassengers([]); setError(''); })} className="mb-4">
                  ← Voltar
                </Button>

                <div>
                  <h2 className="text-2xl font-bold mb-2">Escolha a Melhor Opção</h2>
                  <p className="text-gray-600 mb-6">Comparamos todos os fornecedores disponíveis. Ofertas organizadas por categoria de veículo.</p>

                  {serviceType === 'round_trip' && (
                    <Alert className="mb-6 bg-blue-50 border-blue-300">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900 text-sm">
                        <strong>ℹ️ Ida e Volta:</strong> Os preços exibidos são <strong>por viagem</strong> (ida ou volta). O valor total será a soma das duas viagens.
                      </AlertDescription>
                    </Alert>
                  )}

                  {(() => {
                    const groupedQuotes = {};
                    supplierQuotes.forEach(quote => {
                      if (!groupedQuotes[quote.vehicle_name]) {
                        groupedQuotes[quote.vehicle_name] = [];
                      }
                      groupedQuotes[quote.vehicle_name].push(quote);
                    });

                    Object.keys(groupedQuotes).forEach(vehicleType => {
                      groupedQuotes[vehicleType].sort((a, b) => a.client_price - b.client_price);
                    });

                    const absoluteBestPrice = supplierQuotes.length > 0 ? Math.min(...supplierQuotes.map(q => q.client_price)) : 0;

                    const sortedVehicleTypes = Object.keys(groupedQuotes).sort((a, b) => {
                      const minPriceA = groupedQuotes[a][0].client_price;
                      const minPriceB = groupedQuotes[b][0].client_price;
                      return minPriceA - minPriceB;
                    });

                    return (
                      <Accordion type="single" collapsible className="space-y-3">
                        {sortedVehicleTypes.map((vehicleType, categoryIndex) => {
                          const quotes = groupedQuotes[vehicleType];
                          const categoryBestPrice = quotes[0].client_price;
                          const isCheapestCategory = categoryIndex === 0;

                          return (
                            <AccordionItem
                              key={vehicleType}
                              value={vehicleType}
                              className={`border-2 rounded-xl overflow-hidden ${
                                isCheapestCategory && quotes.some(q => q.client_price === absoluteBestPrice) ? 'border-green-400 bg-gradient-to-r from-green-50 to-emerald-50' : 'border-gray-200 bg-white'
                              }`}
                            >
                              <AccordionTrigger className="px-4 md:px-6 py-3 md:py-4 hover:bg-opacity-50 hover:no-underline">
                                <div className="flex items-center justify-between w-full pr-2 md:pr-4">
                                  <div className="flex items-center gap-2 md:gap-3">
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900">{vehicleType}</h3>
                                    <Badge variant="outline" className="text-xs">
                                      {quotes.length} {quotes.length === 1 ? 'opção' : 'opções'}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 md:gap-4">
                                    <div className="text-right">
                                      <p className="text-xs text-gray-500">A partir de</p>
                                      <p className={`text-xl md:text-2xl font-bold ${isCheapestCategory && quotes.some(q => q.client_price === absoluteBestPrice) ? 'text-green-700' : 'text-blue-600'}`}>
                                        {formatPrice(categoryBestPrice)}{serviceType === 'round_trip' && <span className="text-sm font-normal text-gray-500"> /viagem</span>}
                                      </p>
                                    </div>
                                    <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-gray-400 transition-transform" />
                                  </div>
                                </div>
                              </AccordionTrigger>

                              <AccordionContent className="px-4 md:px-6 pb-4 md:pb-6 pt-2">
                                <div className="space-y-3">
                                  {quotes.map((quote, quoteIndex) => {
                                    const isSelected = selectedSupplier?.supplier_id === quote.supplier_id && selectedSupplier?.vehicle_type_id === quote.vehicle_type_id;
                                    const isCategoryBest = quoteIndex === 0;

                                    return (
                                      <Card
                                        key={`${quote.supplier_id}-${quote.vehicle_type_id}`}
                                        className={`cursor-pointer transition-all hover:shadow-lg ${
                                          isSelected ? 'ring-2 ring-blue-500 shadow-xl bg-blue-50' : 'hover:bg-gray-50'
                                        }`}
                                        onClick={() => handleSupplierSelect(quote)}
                                      >
                                        <CardContent className="p-3 md:p-4">
                                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                                            <div className="flex-1">
                                              <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-3">
                                                {isCategoryBest && (
                                                  <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 text-xs">
                                                    <Star className="w-3 h-3 mr-1" />
                                                    Melhor desta Categoria
                                                  </Badge>
                                                )}
                                                <h4 className="text-base md:text-lg font-bold text-gray-900">{quote.supplier_name}</h4>
                                              </div>

                                              <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                  <UsersIcon className="w-4 h-4 text-blue-500" />
                                                  <span>Até <strong>{quote.max_passengers}</strong> passageiros</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Package className="w-4 h-4 text-purple-500" />
                                                  <span><strong>{quote.max_luggage}</strong> malas</span>
                                                </div>
                                              </div>

                                               {quote.calculation_details && (
                                                 <div className="mt-3 pt-3 border-t border-gray-200">
                                                   <div className="flex flex-wrap gap-3 text-xs">
                                                     {quote.calculation_details.tolls_included ? (
                                                       <div className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100">
                                                         <CheckCircle className="w-3 h-3" />
                                                         <span>Pedágios: <strong>{formatPrice(quote.calculation_details.tolls_cost || 0)}</strong></span>
                                                       </div>
                                                     ) : quote.calculation_details.tolls_error ? (
                                                       <div className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                                         <AlertCircle className="w-3 h-3" />
                                                         <span>Pedágios não inclusos</span>
                                                       </div>
                                                     ) : null}
                                                     
                                                     {quote.calculation_details.supplier_total_duration_minutes > 0 && (
                                                       <div className="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                                         <Clock className="w-3 h-3" />
                                                         <span>Duração: <strong>{(quote.calculation_details.supplier_total_duration_minutes / 60).toFixed(0)}h {quote.calculation_details.supplier_total_duration_minutes % 60}min</strong></span>
                                                       </div>
                                                     )}
                                                   </div>
                                                 </div>
                                               )}

                                            </div>

                                            <div className="flex md:flex-col items-center md:items-end gap-3 justify-between md:justify-start">
                                              <div className="text-right">
                                                {quoteIndex > 0 && categoryBestPrice > 0 && (
                                                  <p className="text-xs text-gray-500 mb-1">
                                                    +{formatPrice(quote.client_price - categoryBestPrice)} que a melhor
                                                  </p>
                                                )}
                                                <div className="text-2xl md:text-3xl font-bold text-blue-600">
                                                  {formatPrice(quote.client_price)}
                                                  {serviceType === 'round_trip' && (
                                                    <span className="block text-xs font-normal text-gray-500 mt-1">/viagem</span>
                                                  )}
                                                </div>
                                              </div>

                                              {isSelected ? (
                                                <div className="flex items-center gap-2 text-blue-600 bg-blue-100 px-3 md:px-4 py-1.5 md:py-2 rounded-full shadow-md">
                                                  <CheckCircle className="w-4 h-4 md:w-5 h-5" />
                                                  <span className="font-semibold text-xs md:text-sm">Selecionado</span>
                                                </div>
                                              ) : (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold text-xs md:text-sm"
                                                >
                                                  Selecionar
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    );
                  })()}

                  <Alert className="mt-6 bg-blue-50 border-blue-300">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900 text-sm">
                      <strong>💡 Dica:</strong> As opções estão ordenadas do menor para o maior preço dentro de cada categoria de veículo.
                    </AlertDescription>
                  </Alert>
                </div>

                {selectedSupplier && (
                  <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 border-t-2 border-gray-200">
                    <Button onClick={() => startTransition(() => setStep(3))} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base md:text-lg py-5 md:py-6 shadow-lg">
                      Continuar com {selectedSupplier.vehicle_name} - {selectedSupplier.supplier_name}
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {step === 3 && selectedSupplier && (
              <div className="space-y-6">
                <Button variant="ghost" onClick={() => startTransition(() => { setStep(2); setError(''); })} className="mb-4">
                  ← Voltar
                </Button>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-700 font-semibold mb-1">Veículo Selecionado:</p>
                        <h3 className="text-xl font-bold text-gray-900">{selectedSupplier.vehicle_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">Fornecedor: {selectedSupplier.supplier_name}</p>
                        <p className="text-xs text-blue-700 mt-2 flex items-center gap-1">
                          <UsersIcon className="w-4 h-4" />
                          Capacidade: até {selectedSupplier.max_passengers} passageiros
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                        <p className="text-3xl font-bold text-blue-600">{formatPrice(selectedSupplier.client_price)}</p>
                        {selectedSupplier.calculation_details?.tolls_error && (
                          <p className="text-xs text-orange-600 mt-1 font-medium flex items-center justify-end gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Pedágios não inclusos
                          </p>
                        )}
                        {selectedSupplier.calculation_details?.tolls_included && (
                          <p className="text-xs text-green-600 mt-1 font-medium flex items-center justify-end gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Pedágios inclusos: {formatPrice(selectedSupplier.calculation_details.tolls_cost || 0)}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedSupplier.calculation_details?.tolls_error && (
                      <Alert className="mt-4 bg-orange-50 border-orange-200">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800 text-xs">
                          Não foi possível calcular os pedágios automaticamente. Despesas com pedágios e estacionamento serão cobradas à parte.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    {/* Seção de Notificações em Tempo Real */}
                    <div className="mb-8 pb-6 border-b border-gray-200">
                      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <BellRing className="w-6 h-6 text-blue-600" />
                        Notificações da Viagem
                      </h2>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-start space-x-3 mb-4">
                          <Checkbox 
                            id="want_notifications" 
                            checked={wantNotifications} 
                            onCheckedChange={setWantNotifications}
                            className="mt-1"
                          />
                          <div>
                            <Label 
                              htmlFor="want_notifications" 
                              className="text-base font-semibold text-blue-900 cursor-pointer"
                            >
                              Deseja receber notificações sobre esta viagem?
                            </Label>
                            <p className="text-sm text-blue-700 mt-1">
                              Ao marcar esta opção, os números informados receberão o link da timeline em tempo real assim que o motorista iniciar a viagem.
                            </p>
                          </div>
                        </div>

                        {wantNotifications && (
                          <div className="pl-7 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <Label className="text-sm font-semibold text-blue-900">
                              Telefones para notificação (WhatsApp)
                            </Label>

                            {notificationPhones.map((phone, index) => (
                              <div key={index} className="flex gap-2">
                                <div className="flex-1">
                                  <Suspense fallback={<ComponentLoader />}>
                                    <PhoneInputWithCountry
                                      value={phone}
                                      onChange={(value) => handleNotificationPhoneChange(index, value)}
                                      placeholder="(00) 00000-0000"
                                      className="bg-white"
                                    />
                                  </Suspense>
                                </div>
                                {notificationPhones.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveNotificationPhone(index)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            ))}

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleAddNotificationPhone}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Adicionar outro telefone
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Seção do Solicitante (Apenas Master) */}
                    {isMasterUser && (
                      <div className="mb-8 pb-6 border-b border-gray-200">
                        <h2 className="text-2xl font-bold mb-4 text-purple-900">Informações do Solicitante</h2>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <Label className="text-base font-semibold mb-3 block text-purple-900">
                            Quem está solicitando esta viagem? *
                          </Label>
                          
                          {!selectedRequester ? (
                            <PassengerSelector
                              availablePassengers={availablePassengers}
                              selectedPassenger={selectedRequester}
                              onSelectPassenger={setSelectedRequester}
                              placeholder="Buscar solicitante por nome..."
                              label={null} // Remove internal label to avoid conflict with section title
                              allowManualEntry={true} // Permitir entrada manual
                              entityType="requester" // Usar entidade FrequentRequester
                              clientId={client?.id} // Passar clientId para salvar frequentes
                            />
                          ) : (
                            <div className="flex items-center justify-between bg-white p-3 rounded border border-purple-200">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900">{selectedRequester.full_name}</p>
                                  <p className="text-sm text-gray-500">{selectedRequester.email}</p>
                                </div>
                              </div>
                              <Button
                                onClick={() => setSelectedRequester(null)}
                                variant="ghost"
                                size="sm"
                                className="text-purple-600 hover:bg-purple-50"
                              >
                                Alterar
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-purple-700 mt-2">
                            ℹ️ Esta viagem ficará registrada no histórico deste usuário.
                          </p>
                        </div>
                      </div>
                    )}

                    <h2 className="text-2xl font-bold mb-4">Informações dos Passageiros</h2>

                    <div className="mb-6">
                      <Label htmlFor="num_passengers" className="text-base font-semibold mb-2 block">
                        Quantos passageiros no total? *
                      </Label>
                      <Select value={String(numberOfPassengers)} onValueChange={(value) => setNumberOfPassengers(parseInt(value))}>
                        <SelectTrigger id="num_passengers" className="w-full md:w-64">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: maxPassengersAllowed }, (_, i) => i + 1).map((num) => (
                            <SelectItem key={num} value={String(num)}>
                              {num} {num === 1 ? 'passageiro' : 'passageiros'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        ✅ Este veículo ({selectedSupplier.vehicle_name}) comporta até {maxPassengersAllowed} passageiros
                      </p>
                    </div>

                    <div className="space-y-3 mb-6 pb-6 border-b">
                      <Label className="text-base font-semibold">Quem é o passageiro principal?</Label>
                      
                      {!isMasterUser && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input type="radio" id="for-myself" checked={isForMyself} onChange={() => { setIsForMyself(true); setSelectedPassenger(null); }} className="w-4 h-4 text-blue-600" />
                            <Label htmlFor="for-myself" className="cursor-pointer text-sm font-medium">Eu mesmo ({user?.full_name})</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="radio" id="for-other" checked={!isForMyself} onChange={() => setIsForMyself(false)} className="w-4 h-4 text-blue-600" />
                            <Label htmlFor="for-other" className="cursor-pointer text-sm font-medium">Outra pessoa</Label>
                          </div>
                        </div>
                      )}

                      {/* Passenger Selector is shown if master user OR (not master user AND not for myself) */}
                      {((isMasterUser && !selectedPassenger) || (!isMasterUser && !isForMyself && !selectedPassenger)) && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-blue-200">
                          <Suspense fallback={<ComponentLoader />}>
                            <PassengerSelector
                              availablePassengers={availablePassengers}
                              selectedPassenger={selectedPassenger}
                              onSelectPassenger={setSelectedPassenger}
                              currentUser={user}
                              clientId={client?.id}
                              entityType="passenger"
                            />
                          </Suspense>
                        </div>
                      )}

                      {/* Display selected main passenger */}
                      {((!isMasterUser && ((isForMyself && user) || (!isForMyself && selectedPassenger))) || (isMasterUser && selectedPassenger)) && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 mt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Passageiro Principal:</p>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {isMasterUser ? selectedPassenger.full_name : (isForMyself ? user.full_name : selectedPassenger.full_name)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {isMasterUser ? selectedPassenger.email : (isForMyself ? user.email : selectedPassenger.email)}
                                  </p>
                                  {/* Manual passenger badge only relevant for non-master and 'other' selection */}
                                  {!isMasterUser && !isForMyself && selectedPassenger?.is_manual && (
                                    <Badge className="text-xs bg-purple-100 text-purple-700 mt-1">
                                      Passageiro Avulso
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* "Alterar" button shown if master user has selected passenger OR non-master user selected 'other' */}
                            {((isMasterUser && selectedPassenger) || (!isMasterUser && !isForMyself)) && (
                              <Button
                                onClick={() => setSelectedPassenger(null)}
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                Alterar
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional passengers list */}
                    {numberOfPassengers > 1 && (((isMasterUser && selectedPassenger) || (!isMasterUser && ((isForMyself && user) || (!isForMyself && selectedPassenger))))) && (
                      <div className="pb-6 border-b">
                        {shouldUseDetailedList ? (
                          <Suspense fallback={<ComponentLoader />}>
                            <PassengerListManager
                              passengers={passengersList}
                              onChange={setPassengersList}
                              maxPassengers={numberOfPassengers}
                              requiresDocumentation={requiresPassengerDocumentation}
                            />
                          </Suspense>
                        ) : (
                          <Suspense fallback={<ComponentLoader />}>
                            <AdditionalPassengersList
                              passengers={additionalPassengers}
                              onChange={setAdditionalPassengers}
                              maxPassengers={numberOfPassengers}
                              mainPassengerName={isMasterUser ? selectedPassenger?.full_name : (isForMyself ? user?.full_name : selectedPassenger?.full_name)}
                            />
                          </Suspense>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Informações Adicionais</h2>
                    <div className="space-y-6">
                      <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-purple-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              Centro de Custo *
                            </h3>
                          </div>
                          {!showAddCostCenter && (
                            <Button onClick={() => { setShowAddCostCenter(true); setError(''); setNewCostCenter({ cost_center_id: null, cost_center_code: '', cost_center_name: '' }); setCostCenterSearchTerm(''); setIsManualEntry(false); }} variant="outline" size="sm" className="text-purple-600 border-purple-300 hover:bg-purple-50">
                              <Plus className="w-4 h-4 mr-2" />
                              {costAllocations.length === 0 ? 'Adicionar Centro de Custo' : 'Adicionar Outro Centro'}
                            </Button>
                          )}
                        </div>

                        <Alert className="mb-4 bg-purple-50 border-purple-300">
                          <AlertCircle className="h-4 w-4 text-purple-600" />
                          <AlertDescription className="text-purple-900 text-sm">
                            <strong>📌 Obrigatório:</strong> Toda viagem deve ter pelo menos um centro de custo.<br />
                            <strong>📊 Rateio Automático:</strong> Ao adicionar vários centros, o sistema divide igualmente. Você pode editar os percentuais depois.
                          </AlertDescription>
                        </Alert>

                        {costAllocations.length > 0 && (
                          <Suspense fallback={<ComponentLoader />}>
                            <CostCenterAllocation
                              allocations={costAllocations}
                              onChange={handleCostAllocationsChange}
                              totalPrice={selectedSupplier.client_price}
                            />
                          </Suspense>
                        )}

                        {showAddCostCenter && (
                          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-4 mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">
                                {costAllocations.length === 0 ? 'Adicionar Centro de Custo (Obrigatório)' : 'Adicionar Outro Centro de Custo'}
                              </h4>
                              <Button onClick={() => {
                                setShowAddCostCenter(false);
                                setNewCostCenter({ cost_center_id: null, cost_center_code: '', cost_center_name: '' });
                                setCostCenterSearchTerm('');
                                setIsManualEntry(false);
                                setError('');
                              }} variant="ghost" size="sm">
                                <CloseIcon className="w-4 h-4" />
                              </Button>
                            </div>

                            {!isManualEntry && costCenters.length > 0 && (
                              <>
                                <div className="space-y-2">
                                  <Label className="text-sm font-semibold">🔍 Buscar Centro de Custo Cadastrado</Label>
                                  <Input
                                    placeholder="Digite código ou nome do centro de custo..."
                                    value={costCenterSearchTerm}
                                    onChange={(e) => setCostCenterSearchTerm(e.target.value)}
                                    className="w-full"
                                  />
                                </div>

                                <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3 bg-white">
                                  {(() => {
                                    const availableCostCenters = costCenters.filter(cc =>
                                      !costAllocations.some(a => a.cost_center_code === cc.code)
                                    );

                                    const filteredCostCenters = availableCostCenters.filter(cc => {
                                      const searchLower = costCenterSearchTerm.toLowerCase();
                                      return cc.code.toLowerCase().includes(searchLower) ||
                                             cc.name.toLowerCase().includes(searchLower);
                                    });

                                    if (filteredCostCenters.length === 0) {
                                      return (
                                        <div className="text-center py-6 text-gray-500">
                                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                          <p className="text-sm">
                                            {costCenterSearchTerm
                                              ? `Nenhum centro de custo encontrado com o termo "${costCenterSearchTerm}".`
                                              : 'Todos os centros de custo disponíveis já foram adicionados.'}
                                          </p>
                                        </div>
                                      );
                                    }

                                    return filteredCostCenters.map((cc) => (
                                      <button
                                        key={cc.id}
                                        type="button"
                                        onClick={() => handleSelectExistingCostCenter(cc)}
                                        className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:border-purple-400 hover:bg-purple-50 ${
                                          newCostCenter.cost_center_id === cc.id
                                            ? 'border-purple-500 bg-purple-50'
                                            : 'border-gray-200 bg-white'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {newCostCenter.cost_center_id === cc.id && (
                                            <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="font-mono text-sm font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                                                {cc.code}
                                              </span>
                                              <span className="font-semibold text-gray-900 truncate">
                                                {cc.name}
                                              </span>
                                            </div>
                                            {cc.description && (
                                              <p className="text-xs text-gray-500 truncate">{cc.description}</p>
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                    ));
                                  })()}
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="flex-1 border-t border-gray-300"></div>
                                  <span className="text-xs text-gray-500 font-medium">OU</span>
                                  <div className="flex-1 border-t border-gray-300"></div>
                                </div>

                                <Button
                                  type="button"
                                  onClick={() => {
                                    setIsManualEntry(true);
                                    setNewCostCenter({
                                      cost_center_id: null,
                                      cost_center_code: '',
                                      cost_center_name: ''
                                    });
                                    setCostCenterSearchTerm('');
                                  }}
                                  variant="outline"
                                  className="w-full border-dashed border-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Não encontrou? Cadastrar Manualmente
                                </Button>
                              </>
                            )}

                            {(isManualEntry || costCenters.length === 0) && (
                              <>
                                {costCenters.length > 0 && (
                                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                      <AlertCircle className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm text-blue-900 font-medium">Cadastro Manual</span>
                                    </div>
                                    <Button
                                      type="button"
                                      onClick={() => {
                                        setIsManualEntry(false);
                                        setNewCostCenter({
                                          cost_center_id: null,
                                          cost_center_code: '',
                                          cost_center_name: ''
                                        });
                                      }}
                                      variant="ghost"
                                      size="sm"
                                      className="text-blue-600 hover:text-blue-700"
                                    >
                                      Voltar à Busca
                                    </Button>
                                  </div>
                                )}

                                <div className="grid md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-sm">Código *</Label>
                                    <Input
                                      value={newCostCenter.cost_center_code}
                                      onChange={(e) => setNewCostCenter({...newCostCenter, cost_center_code: e.target.value})}
                                      placeholder="Ex: CC-001"
                                      className="font-mono"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-sm">Nome *</Label>
                                    <Input
                                      value={newCostCenter.cost_center_name}
                                      onChange={(e) => setNewCostCenter({...newCostCenter, cost_center_name: e.target.value})}
                                      placeholder="Ex: Marketing"
                                    />
                                  </div>
                                </div>
                              </>
                            )}

                            {costAllocations.length === 0 && (
                              <Alert className="bg-blue-50 border-blue-300">
                                <AlertCircle className="h-4 w-4 text-blue-600" />
                                <AlertDescription className="text-blue-800 text-xs">
                                  💡 Este será o primeiro centro de custo. Ele receberá 100% do valor automaticamente.
                                </AlertDescription>
                              </Alert>
                            )}

                            {costAllocations.length > 0 && (
                              <Alert className="bg-green-50 border-green-300">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800 text-xs">
                                  ✨ O percentual será distribuído automaticamente entre todos os centros de custo.
                                </AlertDescription>
                              </Alert>
                            )}

                            <Button
                              onClick={handleAddCostAllocation}
                              disabled={!newCostCenter.cost_center_code || !newCostCenter.cost_center_name}
                              className="w-full bg-purple-600 hover:bg-purple-700"
                              size="sm"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {costAllocations.length === 0 ? 'Adicionar Centro de Custo' : 'Adicionar e Redistribuir'}
                            </Button>
                          </div>
                        )}

                        {/* Removed redundant alert about mandatory cost center */}
                      </div>

                      <div className="border-t pt-6">
                        <Suspense fallback={<ComponentLoader />}>
                          <BillingMethodSelector
                            billingData={billingData}
                            onChange={handleBillingDataChange}
                            currentUser={user}
                            availableFinancialResponsibles={availableFinancialResponsibles}
                            isMasterUser={isMasterUser}
                          />
                        </Suspense>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Input id="notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Informações adicionais sobre a viagem" />
                      </div>

                      <Button
                        onClick={handleSubmitRequest}
                        disabled={isSubmitting || costAllocations.length === 0}
                        className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Enviando Solicitação...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Confirmar e Enviar Solicitação
                          </>
                        )}
                      </Button>

                      {costAllocations.length === 0 && (
                        <p className="text-xs text-center text-red-600 font-medium">
                          ⚠️ Adicione pelo menos um centro de custo para habilitar o envio
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
        <Suspense fallback={null}>
          <OnboardingTutorial 
            tutorialId="corporate_dashboard_intro" 
            steps={onboardingSteps}
            isOpen={showTutorial}
            onComplete={() => {
               setShowTutorial(false);
               window.history.replaceState({}, '', window.location.pathname);
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}