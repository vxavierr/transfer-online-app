import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  User, 
  Mail, 
  Phone,
  Search,
  MapPin,
  Users,
  DollarSign,
  Edit,
  Send,
  Plane as PlaneIcon,
  Car,
  Plus,
  Trash2,
  Building2,
  History,
  FileText,
  Save,
  Bookmark
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import LocationAutocomplete from '@/components/booking/LocationAutocomplete';
import VehicleSelection from '@/components/booking/VehicleSelection';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';
import { MultiSelect } from '@/components/ui/MultiSelect';
import AdditionalItemsManager from '@/components/quotes/AdditionalItemsManager';

export default function QuoteDialog({ open, onOpenChange, onSuccess }) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState('one_way');
  const [success, setSuccess] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState(null);
  const [driverLanguage, setDriverLanguage] = useState('pt');
  const [createdQuoteId, setCreatedQuoteId] = useState(null);
  const [user, setUser] = useState(null);
  
  // New States for Professional Format
  const [quoteFormat, setQuoteFormat] = useState('standard'); // 'standard', 'professional', or 'agency'
  const [selectedVehicles, setSelectedVehicles] = useState([]); // Array of IDs for multi-select
  const [multiVehiclePrices, setMultiVehiclePrices] = useState({}); // { vehicleId: price }
  const [professionalNotes, setProfessionalNotes] = useState('');
  const [quotedTrips, setQuotedTrips] = useState([]); // List of trips for B2B quote
  const [isAddingTrip, setIsAddingTrip] = useState(false);
  
  // Agency Format States
  const [agencyControlNumber, setAgencyControlNumber] = useState('');
  const [agencyLegs, setAgencyLegs] = useState([{
  id: 1,
  origin: '',
  destination: '',
  date: '',
  time: '',
  notes: '',
  service_type: 'transfer', // Default to transfer
  vehiclePrices: {
    'Sedan Executivo': '',
    'Van Executiva': '',
    'Micro-ônibus': '',
    'Ônibus': ''
  }
  }]);
  const [priceSuggestions, setPriceSuggestions] = useState({}); // { legId: { vehicleType: price } }

  // Estado para lista detalhada de veículos por hora (Professional Format + Hourly)
  const [hourlyVehicles, setHourlyVehicles] = useState([]);

  // Dados do Cliente
  const [searchEmail, setSearchEmail] = useState('');
  const [customerData, setCustomerData] = useState({
    requester_name: '',
    customer_name: '',
    customer_email: '',
    customer_phone: ''
  });
  const [searchedUser, setSearchedUser] = useState(null);
  const [searchError, setSearchError] = useState('');

  // Dados da Viagem
  const [tripData, setTripData] = useState({
    origin: '',
    destination: '',
    date: '',
    time: '',
    return_date: '',
    return_time: '',
    hours: 5,
    passengers: 1,
    notes: '',
    // New flight number fields
    origin_flight_number: '',
    destination_flight_number: '',
    return_origin_flight_number: '',
    return_destination_flight_number: '',
    planned_stops: [],
    selected_additional_items: []
  });


  
  // State for saving frequent routes
  const [savingRouteLegId, setSavingRouteLegId] = useState(null);
  const [newRouteName, setNewRouteName] = useState('');

  const queryClient = useQueryClient();



  const handleSaveFrequentRoute = async (leg) => {
    if (!newRouteName.trim()) return;

    try {
      const vehicleOptions = Object.entries(leg.vehiclePrices)
        .filter(([_, price]) => price && parseFloat(price) > 0)
        .map(([vType, price]) => ({
          vehicle_type_name: vType,
          price: parseFloat(price)
        }));

      await base44.entities.FrequentRoute.create({
        name: newRouteName,
        origin: leg.origin,
        destination: leg.destination,
        service_type: leg.service_type || 'transfer',
        vehicleOptions: vehicleOptions,
        notes: leg.notes,
        active: true
      });

      queryClient.invalidateQueries(['frequentRoutes']);
      setSavingRouteLegId(null);
      setNewRouteName('');
      // Optional: show success toast
    } catch (error) {
      console.error("Error saving frequent route:", error);
    }
  };

  const handleLoadFrequentRoute = (legId, routeId) => {
    const route = frequentRoutes.find(r => r.id === routeId);
    if (!route) return;

    setAgencyLegs(prev => prev.map(leg => {
      if (leg.id === legId) {
        const newVehiclePrices = { ...leg.vehiclePrices };
        
        if (route.vehicle_options && route.vehicle_options.length > 0) {
          route.vehicle_options.forEach(opt => {
            newVehiclePrices[opt.vehicle_type_name] = opt.price;
          });
        }

        return {
          ...leg,
          origin: route.origin,
          destination: route.destination,
          service_type: route.service_type || 'transfer', // Load service type
          notes: route.notes || leg.notes,
          vehiclePrices: newVehiclePrices
        };
      }
      return leg;
    }));
  };

  const [isCustomHours, setIsCustomHours] = useState(false);
  const [distanceData, setDistanceData] = useState(null);
  const [distanceError, setDistanceError] = useState('');
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  const [vehiclesWithPrices, setVehiclesWithPrices] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isCalculatingPrices, setIsCalculatingPrices] = useState(false);
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);

  // Passo 4 & 5: Revisão de Preço / Envio
  const [adminQuotePrice, setAdminQuotePrice] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSendingToClient, setIsSendingToClient] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [shouldSaveClient, setShouldSaveClient] = useState(false);
  const [publicLink, setPublicLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error("Error loading user", e);
      }
    };
    if (open) loadUser();
  }, [open]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      handleNewQuote();
    }
  }, [open]);

  // Função auxiliar para verificar se um endereço é aeroporto
  const isAirport = (address) => {
    if (!address) return false;
    const lowerAddress = address.toLowerCase();
    const airportKeywords = [
      'aeroporto', 'airport', 'gru', 'guarulhos', 'cgh', 'congonhas', 
      'vcp', 'viracopos', 'campinas', 'galeão', 'gig', 'santos dumont', 
      'sdu', 'confins', 'cnf'
    ];
    return airportKeywords.some(keyword => lowerAddress.includes(keyword));
  };

  const originIsAirport = useMemo(() => isAirport(tripData.origin), [tripData.origin]);
  const destinationIsAirport = useMemo(() => isAirport(tripData.destination), [tripData.destination]);
  
  const returnOriginIsAirport = useMemo(() => serviceType === 'round_trip' && isAirport(tripData.destination), [serviceType, tripData.destination]);
  const returnDestinationIsAirport = useMemo(() => serviceType === 'round_trip' && isAirport(tripData.origin), [serviceType, tripData.origin]);

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: () => base44.entities.VehicleType.filter({ active: true }),
    staleTime: 60000,
    enabled: open
  });

  const { data: additionalItems = [] } = useQuery({
    queryKey: ['additionalItems'],
    queryFn: () => base44.entities.AdditionalItem.filter({ active: true }),
    staleTime: 60000,
    enabled: open
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersForSearch'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 60000,
    enabled: open && user?.role === 'admin'
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ['allClientsForSearch'],
    queryFn: () => base44.entities.Client.list(),
    staleTime: 60000,
    enabled: open
  });

  const { data: allSupplierOwnClients = [] } = useQuery({
    queryKey: ['allSupplierOwnClientsForSearch'],
    queryFn: () => base44.entities.SupplierOwnClient.list(),
    staleTime: 60000,
    enabled: open
  });

  const { data: frequentRoutes = [] } = useQuery({
    queryKey: ['frequentRoutes'],
    queryFn: () => base44.entities.FrequentRoute.filter({ active: true }),
    staleTime: 60000,
    enabled: open
  });

  const minDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const getTripDescription = (tripDataInput, serviceTypeInput, formatInput, legsInput) => {
    if (formatInput === 'agency' && legsInput && legsInput.length > 0) {
      if (legsInput.length === 1) {
        return `${legsInput[0].origin} → ${legsInput[0].destination}`;
      }
      return `Múltiplos Trechos (${legsInput.length} trechos): ${legsInput[0].origin} ... ${legsInput[legsInput.length - 1].destination}`;
    }
    if (serviceTypeInput === 'hourly') {
      return `${tripDataInput.hours}h à Disposição (Início: ${tripDataInput.origin || 'N/A'})`;
    } else if (serviceTypeInput === 'round_trip') {
      return `Ida: ${tripDataInput.origin} → ${tripDataInput.destination} | Volta: ${tripDataInput.destination} → ${tripDataInput.origin}`;
    } else if (serviceTypeInput === 'one_way') {
      return `${tripDataInput.origin} → ${tripDataInput.destination}`;
    }
    return '';
  };

  const minDateBasedOnLeadTime = useMemo(() => {
    if (vehicleTypes.length === 0) return minDate;

    const minDateTime = new Date();
    const minLeadTimeHours = Math.min(
      ...vehicleTypes.map(v => v.min_booking_lead_time_hours || 24)
    );

    minDateTime.setHours(minDateTime.getHours() + minLeadTimeHours);

    return format(minDateTime, 'yyyy-MM-dd');
  }, [vehicleTypes, minDate]);

  const handleSearchUser = () => {
    setSearchError('');
    setSearchedUser(null);

    if (!searchEmail.trim()) {
      setSearchError('Digite um termo para buscar');
      return;
    }

    const term = searchEmail.toLowerCase().trim();

    // 1. Buscar em Users
    const foundUser = allUsers.find(u => 
      u.email.toLowerCase().includes(term) || 
      (u.full_name && u.full_name.toLowerCase().includes(term))
    );

    if (foundUser) {
      setSearchedUser(foundUser);
      setCustomerData(prev => ({
        ...prev,
        customer_name: foundUser.full_name || '',
        customer_email: foundUser.email,
        customer_phone: foundUser.phone_number || ''
      }));
      return;
    }

    // 2. Buscar em Clients
    const foundClient = allClients.find(c => 
      c.name.toLowerCase().includes(term) ||
      (c.contact_person_email && c.contact_person_email.toLowerCase().includes(term)) ||
      (c.contact_person_name && c.contact_person_name.toLowerCase().includes(term))
    );

    if (foundClient) {
      setSearchedUser(foundClient);
      setCustomerData(prev => ({
        ...prev,
        customer_name: foundClient.name || foundClient.contact_person_name || '',
        customer_email: foundClient.contact_person_email || '',
        customer_phone: foundClient.contact_person_phone || foundClient.phone_number || ''
      }));
      return;
    }

    // 3. Buscar em SupplierOwnClients
    const foundSupplierClient = allSupplierOwnClients.find(c => 
      c.name.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.contact_person_name && c.contact_person_name.toLowerCase().includes(term))
    );

    if (foundSupplierClient) {
      setSearchedUser(foundSupplierClient);
      setCustomerData(prev => ({
        ...prev,
        customer_name: foundSupplierClient.name || foundSupplierClient.contact_person_name || '',
        customer_email: foundSupplierClient.email || '',
        customer_phone: foundSupplierClient.phone_number || foundSupplierClient.contact_person_phone || ''
      }));
      return;
    }

    setSearchError('Cliente não encontrado. Você pode inserir os dados manualmente abaixo.');
    if (term.includes('@')) {
      setCustomerData(prev => ({
        ...prev,
        customer_name: '',
        customer_email: searchEmail,
        customer_phone: ''
      }));
    } else {
      setCustomerData(prev => ({
        ...prev,
        customer_name: searchEmail,
        customer_email: '',
        customer_phone: ''
      }));
    }
  };

  const validateStep1 = () => {
    if (!customerData.customer_name.trim()) {
      setSearchError('Por favor, informe o nome do cliente');
      return false;
    }
    if (!customerData.customer_phone.trim()) {
      setSearchError('Por favor, informe o telefone do cliente');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    setDistanceError('');

    if (serviceType !== 'hourly' && (!tripData.origin || !tripData.destination)) {
      setDistanceError('Por favor, preencha origem e destino');
      return false;
    }
    
    if (serviceType === 'hourly' && !tripData.origin) {
      setDistanceError('Por favor, preencha o ponto de partida');
      return false;
    }

    if (!tripData.date || !tripData.time) {
      setDistanceError('Por favor, preencha data e horário');
      return false;
    }

    if (serviceType === 'round_trip') {
      if (!tripData.return_date || !tripData.return_time) {
        setDistanceError('Por favor, preencha data e horário do retorno');
        return false;
      }
    }

    if (serviceType === 'hourly') {
      const hours = tripData.hours;
      if (hours === '' || hours === null || hours === undefined || parseFloat(hours) < 5) {
        setDistanceError('Por favor, informe a quantidade de horas (mínimo 5 horas)');
        return false;
      }
    }

    if (!tripData.passengers || tripData.passengers < 1) {
      setDistanceError('Por favor, informe o número de passageiros');
      return false;
    }

    return true;
  };

  const handleCalculateAndContinue = async () => {
    if (!validateStep2()) {
      return;
    }

    setDistanceError('');
    setIsCalculatingDistance(true);

    let calculatedDistance = null;

    if (serviceType !== 'hourly') {
      try {
        const distanceResponse = await base44.functions.invoke('calculateDistance', {
          origin: tripData.origin,
          destination: tripData.destination
        });

        if (distanceResponse.data && distanceResponse.data.distance_km) {
          calculatedDistance = distanceResponse.data;
        } else {
          throw new Error('Resposta inválida da API de cálculo de distância');
        }
      } catch (error) {
        console.error('Erro ao calcular distância:', error);
        
        let errorMessage = 'Não foi possível calcular a rota entre origem e destino.';
        
        if (error.response?.status === 404) {
          errorMessage = 'Rota não encontrada. Verifique se os endereços estão corretos e tente novamente.';
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setDistanceError(errorMessage);
        setIsCalculatingDistance(false);
        return;
      }
    }

    setDistanceData(calculatedDistance);
    setIsCalculatingDistance(false);

    // Calcular preços
    setIsCalculatingPrices(true);

    const priceCalculationPromises = vehicleTypes.map(async (vehicle) => {
      try {
        const priceResponse = await base44.functions.invoke('calculateTransferPrice', {
          service_type: serviceType,
          vehicle_type_id: vehicle.id,
          origin: tripData.origin,
          destination: tripData.destination,
          date: tripData.date,
          time: tripData.time,
          return_date: serviceType === 'round_trip' ? tripData.return_date : null,
          return_time: serviceType === 'round_trip' ? tripData.return_time : null,
          hours: serviceType === 'hourly' ? tripData.hours : null,
          driver_language: driverLanguage
        });

        if (priceResponse.data && priceResponse.data.pricing) {
          return {
            ...vehicle,
            calculated_price: priceResponse.data.pricing.total_price,
            calculation_details: priceResponse.data.pricing.calculation_details
          };
        }
      } catch (error) {
        console.error(`Erro ao calcular preço para ${vehicle.name}:`, error);
      }
      
      return {
        ...vehicle,
        calculated_price: null
      };
    });

    const vehiclePrices = await Promise.all(priceCalculationPromises);

    vehiclePrices.sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return (a.calculated_price || 0) - (b.calculated_price || 0);
    });

    setVehiclesWithPrices(vehiclePrices);
    setIsCalculatingPrices(false);

    startTransition(() => setStep(3));
  };

  const handleVehicleSelect = (vehicle, language) => {
    if (!vehicle) return;

    setDriverLanguage(language);

    if (quoteFormat === 'professional') {
      if (serviceType === 'hourly' && !isAddingTrip) {
        setHourlyVehicles(prev => [
          ...prev,
          {
            id: Date.now(), 
            vehicleTypeId: vehicle.id,
            vehicleName: vehicle.name,
            quantity: 1,
            price: vehicle.calculated_price ? vehicle.calculated_price.toFixed(2) : '',
            maxPassengers: vehicle.max_passengers,
            maxLuggage: vehicle.max_luggage,
            imageUrl: vehicle.image_url
          }
        ]);
        
        if (!selectedVehicles.includes(vehicle.id)) {
            setSelectedVehicles(prev => [...prev, vehicle.id]);
        }
        return;
      }

      if (isAddingTrip) {
        const newTrip = {
          date: tripData.date,
          time: tripData.time,
          origin: tripData.origin,
          destination: tripData.destination,
          origin_flight_number: tripData.origin_flight_number,
          destination_flight_number: tripData.destination_flight_number,
          vehicle_type_id: vehicle.id,
          vehicle_type_name: vehicle.name,
          price: vehicle.calculated_price, 
          passengers: tripData.passengers,
          notes: tripData.notes,
          service_type: serviceType,
          hours: tripData.hours,
          selected_additional_items: tripData.selected_additional_items
        };
        setQuotedTrips([...quotedTrips, newTrip]);
        setIsAddingTrip(false);
        startTransition(() => setStep(4));
        return;
      }

      setSelectedVehicles(prev => {
        if (prev.includes(vehicle.id)) {
          return prev.filter(id => id !== vehicle.id);
        } else {
          return [...prev, vehicle.id];
        }
      });
      
      if (!multiVehiclePrices[vehicle.id] && vehicle.calculated_price) {
        setMultiVehiclePrices(prev => ({
          ...prev,
          [vehicle.id]: vehicle.calculated_price.toFixed(2)
        }));
      }
    } else {
      setSelectedVehicle(vehicle);
    }
  };

  const handleAddAnotherTrip = () => {
    if (selectedVehicles.length > 0) {
      const convertedTrips = selectedVehicles.map(vId => {
        const v = vehiclesWithPrices.find(veh => veh.id === vId);
        const price = multiVehiclePrices[vId] ? parseFloat(multiVehiclePrices[vId]) : (v.calculated_price || 0);
        
        return {
          date: tripData.date,
          time: tripData.time,
          origin: tripData.origin,
          destination: tripData.destination,
          origin_flight_number: tripData.origin_flight_number,
          destination_flight_number: tripData.destination_flight_number,
          vehicle_type_id: v.id,
          vehicle_type_name: v.name,
          price: price,
          passengers: tripData.passengers,
          notes: tripData.notes,
          service_type: serviceType,
          hours: tripData.hours
        };
      });
      
      setQuotedTrips(prev => [...convertedTrips, ...prev]);
      setSelectedVehicles([]);
      setMultiVehiclePrices({});
    }

    setTripData({
      ...tripData,
      date: '',
      time: '',
      origin: '', 
      destination: '',
      origin_flight_number: '',
      destination_flight_number: '',
    });
    setIsAddingTrip(true);
    startTransition(() => setStep(2));
  };

  const handleRemoveTrip = (index) => {
    const newTrips = [...quotedTrips];
    newTrips.splice(index, 1);
    setQuotedTrips(newTrips);
  };

  const handleUpdateTripPrice = (index, newPrice) => {
    const newTrips = [...quotedTrips];
    newTrips[index].price = parseFloat(newPrice) || 0;
    setQuotedTrips(newTrips);
  };

  const handleCreateQuote = async () => {
    if (quoteFormat === 'standard' && !selectedVehicle) return;
    if (quoteFormat === 'professional' && serviceType === 'hourly') {
       if (hourlyVehicles.length === 0) return;
    } else if (quoteFormat === 'professional' && selectedVehicles.length === 0 && quotedTrips.length === 0) {
       return;
    }

    setIsCreatingQuote(true);

    try {
      let multiVehicleData = [];
      let primaryVehicle = null;

      if (quoteFormat === 'professional') {
        if (serviceType === 'hourly') {
          multiVehicleData = hourlyVehicles.map(v => ({
            vehicle_type_id: v.vehicleTypeId,
            vehicle_type_name: v.vehicleName,
            quantity: v.quantity,
            price: parseFloat(v.price) || 0,
            total_price: (parseFloat(v.price) || 0) * v.quantity,
            capacity_passengers: v.maxPassengers,
            capacity_luggage: v.maxLuggage,
            image_url: v.imageUrl
          }));
          
          primaryVehicle = { name: hourlyVehicles[0].vehicleName, id: hourlyVehicles[0].vehicleTypeId };
        } else {
          multiVehicleData = selectedVehicles.map(vId => {
            const v = vehiclesWithPrices.find(v => v.id === vId);
            return {
              vehicle_type_id: v.id,
              vehicle_type_name: v.name,
              quantity: 1,
              price: 0,
              capacity_passengers: v.max_passengers,
              capacity_luggage: v.max_luggage,
              image_url: v.image_url
            };
          });
        }
        
        if (quotedTrips.length > 0) {
           const firstTrip = quotedTrips[0];
           primaryVehicle = { name: firstTrip.vehicle_type_name, id: firstTrip.vehicle_type_id };
        } else {
           primaryVehicle = vehiclesWithPrices.find(v => v.id === selectedVehicles[0]);
        }
      } else if (quoteFormat === 'agency') {
        // Agency format logic
        const formattedAgencyLegs = agencyLegs.map(leg => {
          const vehicleOptions = Object.entries(leg.vehiclePrices)
            .filter(([_, price]) => price && parseFloat(price) > 0)
            .map(([vType, price]) => ({
              vehicle_type_name: vType,
              price: parseFloat(price)
            }));
            
          return {
            origin: leg.origin,
            destination: leg.destination,
            date: leg.date,
            time: leg.time,
            notes: leg.notes,
            vehicle_options: vehicleOptions
          };
        });

        // Save prices to history for future suggestions
        // Non-blocking
        formattedAgencyLegs.forEach(async (leg) => {
          if (leg.vehicle_options.length > 0) {
            leg.vehicle_options.forEach(async (opt) => {
              try {
                // Check if exists first? Or just append?
                // The entity AgencyLegPrice is for history. We can upsert or just insert.
                // Simplest is to find one matching origin/dest/vehicle and update it.
                // Since I can't do complex upsert easily, I'll search then update/create.
                const existing = await base44.entities.AgencyLegPrice.filter({
                  origin: leg.origin,
                  destination: leg.destination,
                  vehicle_type_name: opt.vehicle_type_name
                });
                
                if (existing && existing.length > 0) {
                  await base44.entities.AgencyLegPrice.update(existing[0].id, {
                    last_quoted_price: opt.price,
                    last_quoted_date: new Date().toISOString(),
                    quote_count: (existing[0].quote_count || 1) + 1
                  });
                } else {
                  await base44.entities.AgencyLegPrice.create({
                    origin: leg.origin,
                    destination: leg.destination,
                    vehicle_type_name: opt.vehicle_type_name,
                    last_quoted_price: opt.price,
                    last_quoted_date: new Date().toISOString(),
                    quote_count: 1
                  });
                }
              } catch (err) {
                console.error("Error saving price history", err);
              }
            });
          }
        });

        // Add to payload
        // We need dummy values for required fields like origin/date/time for the main record
        primaryVehicle = { name: 'Múltiplos' };
      } else {
        primaryVehicle = selectedVehicle;
      }

      const quotePayload = {
        quote_format: quoteFormat,
        service_type: serviceType,
        vehicle_type_id: primaryVehicle?.id,
        vehicle_type_name: primaryVehicle?.name,
        multi_vehicle_quotes: multiVehicleData,
        quoted_trips: quotedTrips,
        agency_control_number: agencyControlNumber,
        agency_quoted_legs: quoteFormat === 'agency' ? agencyLegs.map(leg => {
          const vehicleOptions = Object.entries(leg.vehiclePrices)
            .filter(([_, price]) => price && parseFloat(price) > 0)
            .map(([vType, price]) => ({
              vehicle_type_name: vType,
              price: parseFloat(price)
            }));
          return {
            origin: leg.origin,
            destination: leg.destination,
            date: leg.date,
            time: leg.time,
            notes: leg.notes,
            service_type: leg.service_type || 'transfer', // Pass service type to backend
            vehicle_options: vehicleOptions,
            selected_additional_items: leg.selected_additional_items || tripData.selected_additional_items || []
          };
        }) : null,
        driver_language: driverLanguage,
        origin: quoteFormat === 'agency' ? agencyLegs[0]?.origin : (quotedTrips.length > 0 ? quotedTrips[0].origin : tripData.origin),
        destination: quoteFormat === 'agency' ? agencyLegs[0]?.destination : (quotedTrips.length > 0 ? quotedTrips[0].destination : (tripData.destination || tripData.origin)),
        date: quoteFormat === 'agency' ? agencyLegs[0]?.date : (quotedTrips.length > 0 ? quotedTrips[0].date : tripData.date),
        time: quoteFormat === 'agency' ? agencyLegs[0]?.time : (quotedTrips.length > 0 ? quotedTrips[0].time : tripData.time),
        return_date: serviceType === 'round_trip' ? tripData.return_date : null,
        return_time: serviceType === 'round_trip' ? tripData.return_time : null,
        hours: serviceType === 'hourly' ? tripData.hours : null,
        distance_km: primaryVehicle?.calculation_details?.supplier_total_distance_km || distanceData?.distance_km || 0,
        duration_minutes: distanceData?.duration_minutes || 0,
        passengers: tripData.passengers,
        requester_name: customerData.requester_name,
        customer_name: customerData.customer_name,
        customer_email: customerData.customer_email,
        customer_phone: customerData.customer_phone,
        notes: tripData.notes || 'Cotação criada manualmente pelo administrador',
        reason: 'Cotação manual criada pelo admin',
        ...(user?.supplier_id && { supplier_id: user.supplier_id }),
        origin_flight_number: tripData.origin_flight_number || null,
        destination_flight_number: tripData.destination_flight_number || null,
        return_origin_flight_number: tripData.return_origin_flight_number || null,
        return_destination_flight_number: tripData.return_destination_flight_number || null,
        planned_stops: tripData.planned_stops || [],
        selected_additional_items: tripData.selected_additional_items || []
      };

      const response = await base44.functions.invoke('submitQuoteRequest', quotePayload);

      if (response.data.success) {
        const createdQuote = response.data.quote_request;
        setQuoteNumber(createdQuote.quote_number);
        setCreatedQuoteId(createdQuote.id);
        
        if (quoteFormat === 'professional') {
             const updateData = {
                 quote_format: 'professional',
                 multi_vehicle_quotes: multiVehicleData
             };
             if (quotedTrips.length > 0) {
                 updateData.quoted_trips = quotedTrips;
             }
             await base44.entities.QuoteRequest.update(createdQuote.id, updateData);
        }

        startTransition(() => setStep(4));
      } else {
        throw new Error(response.data.message || 'Erro desconhecido ao criar cotação.');
      }
    } catch (error) {
      console.error('Erro ao criar cotação:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Erro desconhecido';
      alert('Erro ao criar cotação: ' + errorMsg);
    } finally {
      setIsCreatingQuote(false);
    }
  };

  const handleSendToClient = async () => {
    setPriceError('');

    const price = parseFloat(adminQuotePrice);
    if (isNaN(price) || price <= 0) {
      setPriceError('Por favor, informe um preço válido maior que zero');
      return;
    }

    setIsSendingToClient(true);

    try {
      await base44.entities.QuoteRequest.update(createdQuoteId, {
        admin_quote_price: price,
        admin_notes: adminNotes,
        status: 'cotado',
        quoted_at: new Date().toISOString()
      });

      const paymentLinkResponse = await base44.functions.invoke('createPaymentLinkForQuote', {
        quoteId: createdQuoteId,
        price: price,
        adminNotes: adminNotes
      });

      if (paymentLinkResponse.data.success) {
        setSuccess(true);
        if(onSuccess) onSuccess();
      } else {
        throw new Error(paymentLinkResponse.data.message || 'Erro ao criar link de pagamento');
      }
    } catch (error) {
      console.error('Erro ao enviar cotação:', error);
      setPriceError('Erro ao enviar cotação ao cliente: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsSendingToClient(false);
    }
  };

  const handleSaveNewClient = async () => {
    if (!customerData.customer_email) return;
    
    try {
      const existingUsers = await base44.entities.User.filter({ email: customerData.customer_email });
      if (existingUsers.length > 0) {
        return; 
      }

      await base44.entities.Client.create({
        name: customerData.customer_name,
        contact_person_email: customerData.customer_email,
        contact_person_phone: customerData.customer_phone,
        client_type: 'corporate',
        active: true,
        notes: 'Cadastrado via Cotação Manual'
      });
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    }
  };

  const handleGenerateLink = async () => {
    if (!createdQuoteId) return;
    setIsGeneratingLink(true);
    try {
      const response = await base44.functions.invoke('generateQuotePublicToken', { quoteId: createdQuoteId });
      if (response.data && response.data.token) {
        const link = `${window.location.origin}/PublicQuoteView?token=${response.data.token}&id=${createdQuoteId}`;
        setPublicLink(link);
      } else {
        throw new Error(response.data.error || 'Erro ao gerar token');
      }
    } catch (error) {
      console.error('Erro ao gerar link:', error);
      alert('Erro ao gerar link público.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleExportPDF = async () => {
    if (!createdQuoteId) return;
    
    try {
      // Show loading toast or indicator?
      const loadingToast = document.createElement('div'); // Simple approach or use sonner if available? 
      // User context has Toaster from sonner in Layout.
      // But I can't access toast easily here without importing it.
      // I'll just change button state if I had one, but this is triggered from button.
      
      const response = await base44.functions.invoke('generateQuotePDF', { quoteId: createdQuoteId });
      
      // The response from SDK invoke for binary/blob might be handled differently depending on SDK version.
      // Usually invoke returns { data, status, headers }.
      // If the function returns a stream/blob, the SDK might parse it as JSON by default or text.
      // Wait, SDK invoke usually parses JSON.
      // For binary, I might need to fetch directly or check SDK capabilities for binary response.
      // Actually, base44.functions.invoke uses axios/fetch internally.
      // If the response is binary, `response.data` might be the blob or arraybuffer.
      
      // HOWEVER, `generateQuotePDF` returns `new Response(pdfBytes, ...)` which is a standard Web Response.
      // When called via SDK `invoke`, the SDK wrapper handles it.
      // If the content-type is application/pdf, the SDK might return it as is or text.
      
      // Alternative: Use a direct fetch to the function URL if possible, but functions are hidden behind auth usually.
      // Best bet: The SDK likely returns the data. If it's a string (base64 or raw), I need to handle it.
      // Let's try to handle it as a blob.
      
      // Actually, the previous example I saw in the prompt instructions used `base44.functions.invoke` and then `new Blob([data])`.
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cotacao-${quoteNumber || 'nova'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Erro ao gerar PDF.');
    }
  };

  const handleSaveAndGenerateLink = async () => {
    let updatePayload = {};

    if (quoteFormat === 'standard') {
      const price = parseFloat(adminQuotePrice);
      if (isNaN(price) || price <= 0) {
        setPriceError('Por favor, informe um preço válido para gerar o link');
        return;
      }
      updatePayload = {
        admin_quote_price: price,
        admin_notes: adminNotes,
        status: 'cotado',
        quoted_at: new Date().toISOString()
      };
    } else {
      let vehiclesData = [];
      
      if (serviceType === 'hourly') {
        vehiclesData = hourlyVehicles.map(v => ({
          vehicle_type_id: v.vehicleTypeId,
          vehicle_type_name: v.vehicleName,
          quantity: v.quantity,
          price: parseFloat(v.price) || 0,
          total_price: (parseFloat(v.price) || 0) * v.quantity,
          capacity_passengers: v.maxPassengers,
          capacity_luggage: v.maxLuggage,
          image_url: v.imageUrl
        }));
      } else {
        vehiclesData = selectedVehicles.map(vId => {
          const v = vehiclesWithPrices.find(veh => veh.id === vId);
          return {
            vehicle_type_id: v.id,
            vehicle_type_name: v.name,
            quantity: 1,
            price: parseFloat(multiVehiclePrices[vId]) || 0,
            total_price: parseFloat(multiVehiclePrices[vId]) || 0,
            capacity_passengers: v.max_passengers,
            capacity_luggage: v.max_luggage,
            image_url: v.image_url
          };
        });
      }

      updatePayload = {
        multi_vehicle_quotes: vehiclesData,
        quoted_trips: quotedTrips,
        professional_notes: professionalNotes,
        admin_notes: adminNotes,
        status: 'cotado',
        quoted_at: new Date().toISOString()
      };
    }

    setIsGeneratingLink(true);
    try {
      await base44.entities.QuoteRequest.update(createdQuoteId, updatePayload);

      const response = await base44.functions.invoke('generateQuotePublicToken', { quoteId: createdQuoteId });
      
      if (response.data && response.data.token) {
        const link = `${window.location.origin}/PublicQuoteView?token=${response.data.token}&id=${createdQuoteId}`;
        setPublicLink(link);
        if(onSuccess) onSuccess();
      } else {
        throw new Error('Erro ao gerar token');
      }
    } catch (error) {
      console.error('Erro:', error);
      setPriceError('Erro ao gerar link: ' + error.message);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicLink);
    alert('Link copiado para a área de transferência!');
  };

  const handleNewQuote = () => {
    setStep(1);
    setServiceType('one_way');
    setCustomerData({
      requester_name: '',
      customer_name: '',
      customer_email: '',
      customer_phone: ''
    });
    setShouldSaveClient(false);
    setTripData({
    origin: '',
    destination: '',
    date: '',
    time: '',
    return_date: '',
    return_time: '',
    hours: 5,
    passengers: 1,
    notes: '',
    origin_flight_number: '',
    destination_flight_number: '',
    return_origin_flight_number: '',
    return_destination_flight_number: '',
    planned_stops: [],
    selected_additional_items: []
    });
    setSearchEmail('');
    setSearchedUser(null);
    setSearchError('');
    setDistanceData(null);
    setDistanceError('');
    setVehiclesWithPrices([]);
    setSelectedVehicle(null);
    setHourlyVehicles([]);
    setSuccess(false);
    setQuoteNumber(null);
    setDriverLanguage('pt');
    setIsCustomHours(false);
    setCreatedQuoteId(null);
    setAdminQuotePrice('');
    setAdminNotes('');
    setPriceError('');
    setPublicLink('');
    setAgencyControlNumber('');
    setAgencyLegs([{
      id: 1,
      origin: '',
      destination: '',
      date: '',
      time: '',
      notes: '',
      vehiclePrices: {
        'Sedan Executivo': '',
        'Van Executiva': '',
        'Micro-ônibus': '',
        'Ônibus': ''
      },
      service_type: 'transfer'
    }]);
    setPriceSuggestions({});
  };

  const fetchPriceSuggestions = async (legId, origin, destination) => {
    if (!origin || !destination) return;
    
    try {
      const history = await base44.entities.AgencyLegPrice.filter({ 
        origin: origin, 
        destination: destination 
      });
      
      if (history && history.length > 0) {
        const suggestions = {};
        history.forEach(h => {
          suggestions[h.vehicle_type_name] = h.last_quoted_price;
        });
        
        setPriceSuggestions(prev => ({
          ...prev,
          [legId]: suggestions
        }));
      }
    } catch (error) {
      console.error("Error fetching price suggestions", error);
    }
  };

  const handleAgencyLegChange = (id, field, value) => {
    setAgencyLegs(prev => prev.map(leg => {
      if (leg.id === id) {
        const updatedLeg = { ...leg, [field]: value };
        if (field === 'origin' || field === 'destination') {
          // Debounce fetch suggestions? Or just fetch when both are present
          if (updatedLeg.origin && updatedLeg.destination) {
             fetchPriceSuggestions(id, updatedLeg.origin, updatedLeg.destination);
          }
        }
        return updatedLeg;
      }
      return leg;
    }));
  };

  const handleAgencyPriceChange = (legId, vehicleType, price) => {
    setAgencyLegs(prev => prev.map(leg => {
      if (leg.id === legId) {
        return {
          ...leg,
          vehiclePrices: {
            ...leg.vehiclePrices,
            [vehicleType]: price
          }
        };
      }
      return leg;
    }));
  };

  const addAgencyLeg = () => {
  setAgencyLegs(prev => [...prev, {
  id: Date.now(),
  origin: '',
  destination: '',
  date: '',
  time: '',
  notes: '',
  service_type: 'transfer',
  vehiclePrices: {
    'Sedan Executivo': '',
    'Van Executiva': '',
    'Micro-ônibus': '',
    'Ônibus': ''
  }
  }]);
  };

  const removeAgencyLeg = (id) => {
    if (agencyLegs.length > 1) {
      setAgencyLegs(prev => prev.filter(l => l.id !== id));
    }
  };

  const getSelectedHoursOption = useMemo(() => {
    if (isCustomHours) {
      return 'custom';
    }
    if (tripData.hours === 5 || tripData.hours === 10) {
      return String(tripData.hours);
    }
    return 'custom';
  }, [tripData.hours, isCustomHours]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Criar Cotação Manual
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para gerar uma nova cotação.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Cotação Criada com Sucesso!
            </h2>
            <p className="text-gray-600 mb-2">
              A cotação foi registrada no sistema.
            </p>
            {quoteNumber && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6 inline-block">
                <p className="text-sm text-blue-700 mb-1">Número da Cotação:</p>
                <p className="text-2xl font-bold text-blue-600">
                  {quoteNumber}
                </p>
              </div>
            )}
            
            {publicLink && (
              <div className="mb-6 bg-gray-50 p-3 rounded-lg border border-gray-200 text-left max-w-lg mx-auto">
                <p className="text-sm font-medium text-gray-700 mb-2">Link da Cotação:</p>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={publicLink} 
                    className="text-xs bg-white"
                  />
                  <Button size="icon" onClick={copyToClipboard} variant="outline">
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Envie este link para o cliente visualizar a cotação online</p>
              </div>
            )}

            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                onClick={handleExportPDF}
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
              <Button
                onClick={handleNewQuote}
                variant="outline"
              >
                Criar Outra
              </Button>
              <Button
                onClick={() => {
                    onOpenChange(false);
                    if(onSuccess) onSuccess();
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quote Format Selector */}
            {step === 1 && (
              <div className="mb-6">
                <Label className="text-base font-semibold mb-3 block">Formato da Cotação</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      quoteFormat === 'standard' 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => startTransition(() => setQuoteFormat('standard'))}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        quoteFormat === 'standard' ? 'border-blue-600' : 'border-gray-400'
                      }`}>
                        {quoteFormat === 'standard' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                      </div>
                      <span className={`font-bold ${quoteFormat === 'standard' ? 'text-blue-900' : 'text-gray-700'}`}>
                        Padrão (Eventual)
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 ml-8">
                      Para solicitações esporádicas. Focado em pagamento rápido.
                    </p>
                  </div>

                  <div 
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      quoteFormat === 'professional' 
                        ? 'border-purple-600 bg-purple-50' 
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => startTransition(() => setQuoteFormat('professional'))}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        quoteFormat === 'professional' ? 'border-purple-600' : 'border-gray-400'
                      }`}>
                        {quoteFormat === 'professional' && <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />}
                      </div>
                      <span className={`font-bold ${quoteFormat === 'professional' ? 'text-purple-900' : 'text-gray-700'}`}>
                        Profissional (B2B)
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 ml-8">
                      Proposta formal com múltiplos veículos, logo e regras.
                    </p>
                  </div>

                  <div 
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      quoteFormat === 'agency' 
                        ? 'border-orange-600 bg-orange-50' 
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                    onClick={() => startTransition(() => setQuoteFormat('agency'))}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        quoteFormat === 'agency' ? 'border-orange-600' : 'border-gray-400'
                      }`}>
                        {quoteFormat === 'agency' && <div className="w-2.5 h-2.5 rounded-full bg-orange-600" />}
                      </div>
                      <span className={`font-bold ${quoteFormat === 'agency' ? 'text-orange-900' : 'text-gray-700'}`}>
                        Agência / Evento
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 ml-8">
                      Para agências com controle externo, múltiplos trechos e sugestão de preços.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Steps */}
            <div className="mb-4">
              <div className="flex items-center justify-center gap-4">
                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>1</div>
                  <span className="text-xs font-medium hidden md:inline">Cliente</span>
                </div>
                <div className={`h-px w-8 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>2</div>
                  <span className="text-xs font-medium hidden md:inline">Viagem</span>
                </div>
                {quoteFormat !== 'agency' && (
                  <>
                    <div className={`h-px w-8 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                    <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>3</div>
                      <span className="text-xs font-medium hidden md:inline">Veículo</span>
                    </div>
                  </>
                )}
                <div className={`h-px w-8 ${step >= 4 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                <div className={`flex items-center gap-2 ${step >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    {quoteFormat === 'agency' ? 3 : 4}
                  </div>
                  <span className="text-xs font-medium hidden md:inline">Ações</span>
                </div>
              </div>
            </div>

            {/* Step 1: Dados do Cliente */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <Label className="text-sm font-bold text-blue-900 mb-2 block">
                    Buscar Cliente Cadastrado
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Busque por Nome, Email ou Empresa..."
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                      className="flex-1"
                    />
                    <Button onClick={handleSearchUser} variant="outline">
                      <Search className="w-4 h-4 mr-2" />
                      Buscar
                    </Button>
                  </div>
                  {searchedUser && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
                      <p className="text-sm text-green-800">
                        ✓ Cliente encontrado: <strong>{searchedUser.full_name || searchedUser.name}</strong>
                      </p>
                    </div>
                  )}
                </div>

                {searchError && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">{searchError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-600" />
                      Solicitante
                    </Label>
                    <Input
                      value={customerData.requester_name}
                      onChange={(e) => setCustomerData({...customerData, requester_name: e.target.value})}
                      placeholder="Quem está solicitando a cotação?"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-600" />
                      Nome Completo (Passageiro/Empresa) *
                    </Label>
                    <Input
                      value={customerData.customer_name}
                      onChange={(e) => setCustomerData({...customerData, customer_name: e.target.value})}
                      placeholder="Nome do cliente"
                      required
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-gray-600" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={customerData.customer_email}
                      onChange={(e) => setCustomerData({...customerData, customer_email: e.target.value})}
                      placeholder="email@exemplo.com (opcional)"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4 text-gray-600" />
                      Telefone (com DDD) *
                    </Label>
                    <PhoneInputWithCountry
                      value={customerData.customer_phone}
                      onChange={(value) => setCustomerData({...customerData, customer_phone: value})}
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                </div>

                {!searchedUser && (
                  <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <Checkbox 
                      id="save_client" 
                      checked={shouldSaveClient}
                      onCheckedChange={setShouldSaveClient}
                    />
                    <Label htmlFor="save_client" className="text-sm cursor-pointer text-gray-700">
                      Salvar como novo cliente na base de dados
                    </Label>
                  </div>
                )}

                <DialogFooter>
                  <Button onClick={() => onOpenChange(false)} variant="outline">Cancelar</Button>
                  <Button
                    onClick={() => {
                      if (validateStep1()) {
                        if (shouldSaveClient) {
                          handleSaveNewClient();
                        }
                        setSearchError('');
                        startTransition(() => setStep(2));
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Step 2: Dados da Viagem (Standard/Professional) */}
            {step === 2 && quoteFormat !== 'agency' && (
              <div className="space-y-4">
                <Tabs value={serviceType} onValueChange={(val) => startTransition(() => setServiceType(val))}>
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="one_way">Só Ida</TabsTrigger>
                    <TabsTrigger value="round_trip">Ida e Volta</TabsTrigger>
                    <TabsTrigger value="hourly">Por Hora</TabsTrigger>
                  </TabsList>

                  <TabsContent value="one_way" className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Origem *</Label>
                      <LocationAutocomplete
                        value={tripData.origin}
                        onChange={(value) => setTripData({...tripData, origin: value})}
                        placeholder="Digite o endereço de origem"
                      />
                    </div>

                    {originIsAirport && (
                      <div className="space-y-1.5 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <Label className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                          <PlaneIcon className="w-3.5 h-3.5 text-blue-600" />
                          Número do Voo / Companhia (Origem)
                        </Label>
                        <Input
                          value={tripData.origin_flight_number}
                          onChange={(e) => setTripData({...tripData, origin_flight_number: e.target.value})}
                          placeholder="Ex: LA 3000, GOL 1234"
                          className="text-sm h-10 rounded-lg bg-white"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="mb-2 block">Destino *</Label>
                      <LocationAutocomplete
                        value={tripData.destination}
                        onChange={(value) => setTripData({...tripData, destination: value})}
                        placeholder="Digite o endereço de destino"
                      />
                    </div>

                    {destinationIsAirport && (
                      <div className="space-y-1.5 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <Label className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                          <PlaneIcon className="w-3.5 h-3.5 text-blue-600" />
                          Número do Voo / Companhia (Destino)
                        </Label>
                        <Input
                          value={tripData.destination_flight_number}
                          onChange={(e) => setTripData({...tripData, destination_flight_number: e.target.value})}
                          placeholder="Ex: LA 3000, GOL 1234"
                          className="text-sm h-10 rounded-lg bg-white"
                        />
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4" />
                          Data *
                        </Label>
                        <Input
                          type="date"
                          min={minDateBasedOnLeadTime}
                          value={tripData.date}
                          onChange={(e) => setTripData({...tripData, date: e.target.value})}
                        />
                      </div>

                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4" />
                          Horário *
                        </Label>
                        <Input
                          type="time"
                          value={tripData.time}
                          onChange={(e) => setTripData({...tripData, time: e.target.value})}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="round_trip" className="space-y-4">
                    {/* Simplified for brevity - same fields as one_way plus return */}
                    <div>
                      <Label className="mb-2 block">Origem *</Label>
                      <LocationAutocomplete
                        value={tripData.origin}
                        onChange={(value) => setTripData({...tripData, origin: value})}
                        placeholder="Digite o endereço de origem"
                      />
                    </div>
                    {originIsAirport && (
                      <div className="space-y-1.5 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <Label className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                          <PlaneIcon className="w-3.5 h-3.5 text-blue-600" />
                          Número do Voo / Companhia (Ida - Origem)
                        </Label>
                        <Input
                          value={tripData.origin_flight_number}
                          onChange={(e) => setTripData({...tripData, origin_flight_number: e.target.value})}
                          placeholder="Ex: LA 3000"
                          className="text-sm h-10 rounded-lg bg-white"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="mb-2 block">Destino *</Label>
                      <LocationAutocomplete
                        value={tripData.destination}
                        onChange={(value) => setTripData({...tripData, destination: value})}
                        placeholder="Digite o endereço de destino"
                      />
                    </div>
                    {destinationIsAirport && (
                      <div className="space-y-1.5 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <Label className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                          <PlaneIcon className="w-3.5 h-3.5 text-blue-600" />
                          Número do Voo / Companhia (Ida - Destino)
                        </Label>
                        <Input
                          value={tripData.destination_flight_number}
                          onChange={(e) => setTripData({...tripData, destination_flight_number: e.target.value})}
                          placeholder="Ex: LA 3000"
                          className="text-sm h-10 rounded-lg bg-white"
                        />
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 block">Data Ida *</Label>
                        <Input
                          type="date"
                          min={minDateBasedOnLeadTime}
                          value={tripData.date}
                          onChange={(e) => setTripData({...tripData, date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block">Horário Ida *</Label>
                        <Input
                          type="time"
                          value={tripData.time}
                          onChange={(e) => setTripData({...tripData, time: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-bold text-sm mb-3 text-green-900">Volta</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label className="mb-2 block">Data Volta *</Label>
                          <Input
                            type="date"
                            min={tripData.date || minDateBasedOnLeadTime}
                            value={tripData.return_date}
                            onChange={(e) => setTripData({...tripData, return_date: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label className="mb-2 block">Horário Volta *</Label>
                          <Input
                            type="time"
                            value={tripData.return_time}
                            onChange={(e) => setTripData({...tripData, return_time: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                    {returnOriginIsAirport && (
                        <div className="space-y-1.5 bg-green-50 border border-green-200 rounded-lg p-3">
                            <Label className="text-xs font-bold text-green-900">Voo (Volta - Origem)</Label>
                            <Input value={tripData.return_origin_flight_number} onChange={(e) => setTripData({...tripData, return_origin_flight_number: e.target.value})} placeholder="Ex: LA 3001" className="text-sm h-10 bg-white" />
                        </div>
                    )}
                    {returnDestinationIsAirport && (
                        <div className="space-y-1.5 bg-green-50 border border-green-200 rounded-lg p-3">
                            <Label className="text-xs font-bold text-green-900">Voo (Volta - Destino)</Label>
                            <Input value={tripData.return_destination_flight_number} onChange={(e) => setTripData({...tripData, return_destination_flight_number: e.target.value})} placeholder="Ex: LA 3001" className="text-sm h-10 bg-white" />
                        </div>
                    )}
                  </TabsContent>

                  <TabsContent value="hourly" className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Pacote de Horas *</Label>
                      <Select
                        value={getSelectedHoursOption}
                        onValueChange={(value) => {
                          if (value === 'custom') {
                            setIsCustomHours(true);
                            setTripData(prev => ({ ...prev, hours: '' }));
                          } else {
                            setIsCustomHours(false);
                            setTripData(prev => ({ ...prev, hours: parseInt(value) }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 Horas</SelectItem>
                          <SelectItem value="10">10 Horas</SelectItem>
                          <SelectItem value="custom">Outras (mín. 5h)</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {isCustomHours && (
                        <Input
                          type="number"
                          min="5"
                          value={tripData.hours}
                          onChange={(e) => {
                            const value = e.target.value;
                            setTripData(prev => ({ 
                              ...prev, 
                              hours: value === '' ? '' : parseInt(value) || ''
                            }));
                          }}
                          placeholder="Quantidade de horas (mín. 5)"
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <Label className="mb-2 block">Ponto de Partida *</Label>
                      <LocationAutocomplete
                        value={tripData.origin}
                        onChange={(value) => setTripData({...tripData, origin: value})}
                        placeholder="Digite o endereço inicial"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4" />
                          Data *
                        </Label>
                        <Input
                          type="date"
                          min={minDateBasedOnLeadTime}
                          value={tripData.date}
                          onChange={(e) => setTripData({...tripData, date: e.target.value})}
                        />
                      </div>

                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4" />
                          Horário *
                        </Label>
                        <Input
                          type="time"
                          value={tripData.time}
                          onChange={(e) => setTripData({...tripData, time: e.target.value})}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4" />
                    Número de Passageiros *
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={tripData.passengers}
                    onChange={(e) => setTripData({...tripData, passengers: parseInt(e.target.value) || 1})}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Observações</Label>
                  <Textarea
                    value={tripData.notes}
                    onChange={(e) => setTripData({...tripData, notes: e.target.value})}
                    placeholder="Observações adicionais sobre a viagem"
                    rows={3}
                  />
                </div>

                <AdditionalItemsManager
                  items={tripData.selected_additional_items}
                  onUpdateItems={(newItems) => setTripData({...tripData, selected_additional_items: newItems})}
                  additionalItemsCatalog={additionalItems}
                  formatPrice={formatPrice}
                  showSaveToCatalog={true}
                  onSaveToCatalog={async (newItem) => {
                    try {
                      await base44.entities.AdditionalItem.create({
                        name: newItem.name,
                        adjustment_value: newItem.price,
                        adjustment_type: 'fixed_amount',
                        active: true,
                        description: 'Cadastrado via Cotação Manual'
                      });
                      queryClient.invalidateQueries(['additionalItems']);
                    } catch (error) {
                      console.error("Erro ao salvar item no catálogo:", error);
                    }
                  }}
                />

                {distanceError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{distanceError}</AlertDescription>
                  </Alert>
                )}

                <DialogFooter>
                  <Button onClick={() => startTransition(() => setStep(1))} variant="outline">Voltar</Button>
                  <Button
                    onClick={handleCalculateAndContinue}
                    disabled={isCalculatingDistance}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isCalculatingDistance ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Calculando...</>
                    ) : (
                      <>Ver Veículos <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Step 2: Agency Specific - Control Number & Legs */}
            {step === 2 && quoteFormat === 'agency' && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-bold text-orange-900 mb-2 block">
                    Número de Controle da Agência *
                  </Label>
                  <Input 
                    value={agencyControlNumber}
                    onChange={(e) => setAgencyControlNumber(e.target.value)}
                    placeholder="Ex: EVENTO-2024-XYZ"
                    className="border-orange-200 focus:ring-orange-500"
                  />
                </div>

                <AdditionalItemsManager
                  items={tripData.selected_additional_items}
                  onUpdateItems={(newItems) => setTripData({...tripData, selected_additional_items: newItems})}
                  additionalItemsCatalog={additionalItems}
                  formatPrice={formatPrice}
                  showSaveToCatalog={true}
                  onSaveToCatalog={async (newItem) => {
                    try {
                      await base44.entities.AdditionalItem.create({
                        name: newItem.name,
                        adjustment_value: newItem.price,
                        adjustment_type: 'fixed_amount',
                        active: true,
                        description: 'Cadastrado via Cotação Manual'
                      });
                      queryClient.invalidateQueries(['additionalItems']);
                    } catch (error) {
                      console.error("Erro ao salvar item no catálogo:", error);
                    }
                  }}
                />

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-bold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-gray-600" />
                      Trechos e Valores
                    </Label>
                    <Button onClick={addAgencyLeg} size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
                      <Plus className="w-4 h-4 mr-2" /> Novo Trecho
                    </Button>
                  </div>

                  {agencyLegs.map((leg, index) => (
                    <div key={leg.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 relative animate-in fade-in">
                      <div className="absolute -top-3 left-4 bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">
                        Trecho #{index + 1}
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeAgencyLeg(leg.id)}
                          disabled={agencyLegs.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Frequent Route Selector */}
                      <div className="mb-4 mt-2">
                        <Select onValueChange={(val) => handleLoadFrequentRoute(leg.id, val)}>
                          <SelectTrigger className="h-8 text-xs bg-white border-blue-200 text-blue-700 w-full md:w-1/2">
                            <SelectValue placeholder="📂 Carregar Trecho Salvo (Favoritos)..." />
                          </SelectTrigger>
                          <SelectContent>
                            {frequentRoutes.map(route => (
                              <SelectItem key={route.id} value={route.id}>
                                {route.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid md:grid-cols-4 gap-3 mb-4">
                        <div className="col-span-2">
                          <Label className="text-xs text-gray-500">Origem</Label>
                          <Input 
                            value={leg.origin} 
                            onChange={(e) => handleAgencyLegChange(leg.id, 'origin', e.target.value)}
                            placeholder="Ex: Aeroporto GRU"
                            className="bg-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs text-gray-500">Destino</Label>
                          <Input 
                            value={leg.destination} 
                            onChange={(e) => handleAgencyLegChange(leg.id, 'destination', e.target.value)}
                            placeholder="Ex: Hotel Hilton"
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Data</Label>
                          <Input 
                            type="date"
                            value={leg.date} 
                            onChange={(e) => handleAgencyLegChange(leg.id, 'date', e.target.value)}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Horário</Label>
                          <Input 
                            type="time"
                            value={leg.time} 
                            onChange={(e) => handleAgencyLegChange(leg.id, 'time', e.target.value)}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Tipo de Serviço</Label>
                          <Select 
                            value={leg.service_type || 'transfer'} 
                            onValueChange={(val) => handleAgencyLegChange(leg.id, 'service_type', val)}
                          >
                            <SelectTrigger className="h-10 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="transfer">Transfer</SelectItem>
                              <SelectItem value="hourly_5">5 Horas</SelectItem>
                              <SelectItem value="hourly_10">10 Horas</SelectItem>
                              <SelectItem value="hourly_custom">Por Hora</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Observações</Label>
                          <Input 
                            value={leg.notes} 
                            onChange={(e) => handleAgencyLegChange(leg.id, 'notes', e.target.value)}
                            placeholder="Voo, detalhes..."
                            className="bg-white"
                          />
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <Label className="text-xs font-bold text-gray-700 mb-2 block">Tabela de Preços (R$)</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {['Sedan Executivo', 'Van Executiva', 'Micro-ônibus', 'Ônibus'].map(type => (
                            <div key={type}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-gray-500">{type}</span>
                                {priceSuggestions[leg.id]?.[type] && (
                                  <span 
                                    className="text-[10px] text-green-600 bg-green-50 px-1 rounded cursor-pointer flex items-center gap-0.5"
                                    title={`Último preço: R$ ${priceSuggestions[leg.id][type]}`}
                                    onClick={() => handleAgencyPriceChange(leg.id, type, priceSuggestions[leg.id][type])}
                                  >
                                    <History className="w-3 h-3" />
                                    {priceSuggestions[leg.id][type]}
                                  </span>
                                )}
                              </div>
                              <Input 
                                type="number" 
                                placeholder="0.00"
                                value={leg.vehiclePrices[type]}
                                onChange={(e) => handleAgencyPriceChange(leg.id, type, e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Save Route Button */}
                      <div className="mt-2 flex justify-end">
                        {savingRouteLegId === leg.id ? (
                          <div className="flex items-center gap-2 bg-white p-1 rounded border shadow-sm animate-in fade-in slide-in-from-right-5">
                            <Input 
                              value={newRouteName}
                              onChange={(e) => setNewRouteName(e.target.value)}
                              placeholder="Nome do Trecho (ex: GRU - Hotel)"
                              className="h-7 text-xs w-48"
                              autoFocus
                            />
                            <Button 
                              size="sm" 
                              className="h-7 px-2 bg-green-600 hover:bg-green-700 text-xs"
                              onClick={() => handleSaveFrequentRoute(leg)}
                            >
                              Salvar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                setSavingRouteLegId(null);
                                setNewRouteName('');
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs text-gray-500 hover:text-blue-600"
                            onClick={() => {
                              setSavingRouteLegId(leg.id);
                              // Suggest a name based on origin/dest
                              if (leg.origin && leg.destination) {
                                setNewRouteName(`${leg.origin} - ${leg.destination}`);
                              }
                            }}
                          >
                            <Bookmark className="w-3 h-3 mr-1" />
                            Gravar este trecho
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <DialogFooter>
                  <Button onClick={() => startTransition(() => setStep(1))} variant="outline">Voltar</Button>
                  <Button
                  onClick={() => handleCreateQuote()}
                  disabled={!agencyControlNumber || agencyLegs.some(l => !l.origin || !l.destination || !l.date || !l.time)}
                  className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isCreatingQuote ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Gerando...</>
                    ) : (
                      <>Gerar Cotação <ArrowRight className="w-5 h-5 mr-2" /></>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Step 3: Seleção de Veículo */}
            {step === 3 && (
              <div className="space-y-4">
                <VehicleSelection
                  vehicles={vehiclesWithPrices}
                  selectedVehicleId={selectedVehicle?.id}
                  onSelectVehicle={handleVehicleSelect}
                  onDriverLanguageChange={setDriverLanguage}
                  isCalculating={isCalculatingPrices}
                  isLoggedIn={true}
                  selectedDriverLanguage={driverLanguage}
                  bookingDateTime={tripData.date && tripData.time ? new Date(`${tripData.date}T${tripData.time}`) : null}
                  onRequestQuote={(vehicle, language) => handleVehicleSelect(vehicle, language)}
                  isAdminMode={true}
                  isMultiSelectMode={quoteFormat === 'professional'}
                  selectedVehicleIds={selectedVehicles}
                />

                {/* Seção Especial para Múltiplos Veículos em Hourly Professional */}
                {quoteFormat === 'professional' && serviceType === 'hourly' && (
                  <div className="mt-8 bg-blue-50 p-6 rounded-xl border border-blue-200">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <Car className="w-5 h-5" />
                      Veículos Selecionados
                    </h3>
                    
                    {hourlyVehicles.length === 0 ? (
                      <div className="text-center p-4 text-sm text-blue-400">
                        Nenhum veículo adicionado. Clique nos veículos acima.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {hourlyVehicles.map((item) => (
                          <div key={item.id} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
                            <div className="flex-1 font-bold text-gray-900">{item.vehicleName}</div>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setHourlyVehicles(prev => prev.map(v => v.id === item.id ? { ...v, quantity: val } : v));
                              }}
                              className="w-20"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setHourlyVehicles(prev => {
                                  const filtered = prev.filter(v => v.id !== item.id);
                                  const hasType = filtered.some(v => v.vehicleTypeId === item.vehicleTypeId);
                                  if (!hasType) {
                                    setSelectedVehicles(curr => curr.filter(id => id !== item.vehicleTypeId));
                                  }
                                  return filtered;
                                });
                              }}
                              className="text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button onClick={() => startTransition(() => setStep(2))} variant="outline">Voltar</Button>
                  <Button
                    onClick={handleCreateQuote}
                    disabled={isCreatingQuote || (quoteFormat === 'standard' && !selectedVehicle)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreatingQuote ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Criando Cotação...</>
                    ) : (
                      <>Continuar <ArrowRight className="w-5 h-5 mr-2" /></>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Step 4: Opções pós-criação */}
            {step === 4 && (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200 mb-4">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Cotação criada! Escolha como prosseguir.
                  </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Opção 1: Atribuir a Parceiro */}
                  <Card className="border-2 border-purple-200 hover:border-purple-400 cursor-pointer" onClick={() => {
                      onOpenChange(false);
                      if(onSuccess) onSuccess(); // Just close, user can assign in the list
                  }}>
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="font-bold text-gray-900">Atribuir Parceiro</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Consulte um parceiro sobre o custo
                      </p>
                    </CardContent>
                  </Card>

                  {/* Opção 2: Definir Preço e Enviar Direto */}
                  <Card className="border-2 border-green-200 hover:border-green-400 cursor-pointer" onClick={() => {
                      setAdminQuotePrice(selectedVehicle?.calculated_price ? selectedVehicle.calculated_price.toFixed(2) : '');
                      setAdminNotes('');
                      startTransition(() => setStep(5));
                  }}>
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="font-bold text-gray-900">Definir Preço</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Enviar cotação diretamente ao cliente
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {quoteFormat === 'professional' && (
                  <Button
                    onClick={handleAddAnotherTrip}
                    className="w-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Outro Trecho/Viagem a Esta Proposta
                  </Button>
                )}
                
                {quoteFormat === 'agency' && (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mt-4">
                    <h3 className="font-bold text-orange-900 mb-2">Cotação de Agência Criada</h3>
                    <p className="text-sm text-orange-800">
                      Os preços dos trechos foram salvos no histórico para futuras sugestões.
                      Você pode gerar o link público abaixo para enviar à agência.
                    </p>
                  </div>
                )}

                {!publicLink ? (
                  <div className="pt-2">
                    <Button
                      onClick={handleSaveAndGenerateLink}
                      disabled={isGeneratingLink}
                      variant="outline"
                      className="w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      {isGeneratingLink ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <PlaneIcon className="w-4 h-4 mr-2" />
                      )}
                      Gerar Link de Visualização (Sem Enviar Email)
                    </Button>
                  </div>
                ) : (
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 text-left">
                    <p className="text-sm font-medium text-purple-900 mb-2">Link Público Gerado:</p>
                    <div className="flex gap-2">
                      <Input 
                        readOnly 
                        value={publicLink} 
                        className="text-xs bg-white border-purple-200"
                      />
                      <Button size="icon" onClick={copyToClipboard} variant="outline" className="border-purple-200 hover:bg-purple-100">
                        <CheckCircle className="w-4 h-4 text-purple-700" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Revisão Final de Preço e Envio ao Cliente */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h3 className="font-bold text-blue-900 mb-3">Resumo</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Cliente:</strong> {customerData.customer_name}</p>
                    <p><strong>Rota:</strong> {getTripDescription(tripData, serviceType, quoteFormat, agencyLegs)}</p>
                    {quoteFormat === 'agency' && agencyControlNumber && (
                      <p><strong>Controle:</strong> {agencyControlNumber}</p>
                    )}
                  </div>
                </div>

                {priceError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{priceError}</AlertDescription>
                  </Alert>
                )}

                {quoteFormat === 'standard' ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="admin_price" className="text-base font-bold flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        Preço Final (R$) *
                      </Label>
                      <Input
                        id="admin_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={adminQuotePrice}
                        onChange={(e) => setAdminQuotePrice(e.target.value)}
                        placeholder="0.00"
                        className="text-xl font-bold text-green-700"
                      />
                    </div>

                    <div>
                      <Label htmlFor="admin_notes" className="text-base font-bold mb-2 block">
                        Observações (opcional)
                      </Label>
                      <Textarea
                        id="admin_notes"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                ) : quoteFormat === 'agency' ? (
                  <div className="space-y-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                          <DollarSign className="w-5 h-5" />
                          Revisão de Valores por Trecho
                        </h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                          {agencyLegs.map((leg, idx) => (
                            <div key={leg.id} className="bg-white p-3 rounded border border-orange-100 shadow-sm">
                              <div className="flex justify-between text-xs font-bold text-gray-700 mb-2">
                                <span>Trecho #{idx + 1}</span>
                                <span>{format(new Date(leg.date), 'dd/MM/yyyy')} - {leg.time}</span>
                              </div>
                              <div className="text-xs text-gray-600 mb-2 truncate">
                                {leg.origin} → {leg.destination}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(leg.vehiclePrices).map(([vType, price]) => (
                                  price && parseFloat(price) > 0 && (
                                    <div key={vType} className="flex justify-between items-center text-xs bg-orange-50 px-2 py-1 rounded">
                                      <span className="text-orange-800">{vType}</span>
                                      <span className="font-bold text-orange-900">{formatPrice(price)}</span>
                                    </div>
                                  )
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                    </div>
                    <div>
                      <Label htmlFor="admin_notes" className="text-base font-bold mb-2 block">
                        Observações Gerais (opcional)
                      </Label>
                      <Textarea
                        id="admin_notes"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Professional Format Logic */}
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h3 className="font-bold text-purple-900 mb-2">Definir Preços</h3>
                        <p className="text-sm text-purple-800">
                            Configure os preços de cada veículo no passo anterior ou edite a cotação depois.
                        </p>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button onClick={() => startTransition(() => setStep(4))} variant="outline">Voltar</Button>
                  <Button
                    onClick={handleSendToClient}
                    disabled={isSendingToClient}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                  >
                    {isSendingToClient ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Enviando...</>
                    ) : (
                      <><Send className="w-5 h-5 mr-2" />Enviar Cotação</>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}