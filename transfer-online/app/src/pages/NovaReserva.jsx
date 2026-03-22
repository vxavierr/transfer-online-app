import React, { useState, useCallback, useMemo, useEffect, useRef, useTransition } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import OneWayTabContent from '@/components/booking/OneWayTabContent';
import RoundTripTabContent from '@/components/booking/RoundTripTabContent';
import HourlyTabContent from '@/components/booking/HourlyTabContent';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, ArrowRight, CheckCircle, AlertCircle, Loader2, User, LogOut, Package, LogIn, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Suspense } from 'react';
import MetaTags from '@/components/seo/MetaTags';

// Lazy load
const VehicleSelection = React.lazy(() => import('../components/booking/VehicleSelection'));
const BookingForm = React.lazy(() => import('../components/booking/BookingForm'));
const WhatsAppButton = React.lazy(() => import('../components/WhatsAppButton'));
const LanguageSelector = React.lazy(() => import('../components/LanguageSelector'));
const MultiTripTabContent = React.lazy(() => import('../components/booking/MultiTripTabContent'));

const ComponentLoader = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
  </div>
);

const BOOKING_STATE_KEY = 'transferonline_booking_state';

export default function NovaReserva({ isEmbedded }) {
  const { t, language } = useLanguage();
  const nr = (key, params) => t(`novaReserva.${key}`, params || {});
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState('one_way');
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [bookingNumber, setBookingNumber] = useState(null);
  const [user, setUser] = useState(null);
  
  const mapLanguageToDriverLanguage = (lang) => {
    if (lang === 'pt-BR') return 'pt';
    if (lang === 'en') return 'en';
    if (lang === 'es') return 'es';
    return 'pt';
  };
  
  const [driverLanguage, setDriverLanguage] = useState(() => mapLanguageToDriverLanguage(language));
  const [isInitializing, setIsInitializing] = useState(true);
  const hasRestoredStateRef = useRef(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [returnUrl, setReturnUrl] = useState(null);
  const [originLocationType, setOriginLocationType] = useState(null);
  const [destinationLocationType, setDestinationLocationType] = useState(null);
  const [quoteRequested, setQuoteRequested] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState(null);
  const [bookingLeadId, setBookingLeadId] = useState(null);

  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    date: '',
    time: '',
    return_date: '',
    return_time: '',
    hours: 5,
    origin_flight_number: '',
    destination_flight_number: '',
    return_origin_flight_number: '',
    return_destination_flight_number: '',
    phone: '',
    email: '',
    additional_stops: []
  });

  const [multiTripLegs, setMultiTripLegs] = useState([{
    id: '1',
    origin: '',
    destination: '',
    date: '',
    time: '',
    origin_flight_number: '',
    destination_flight_number: '',
    vehicleTypeId: null,
    calculatedPrice: null,
    vehicleTypeName: '',
    originIsAirport: false,
    destinationIsAirport: false
  }]);

  const [isCustomHours, setIsCustomHours] = useState(false);
  const [distanceData, setDistanceData] = useState(null);
  const [distanceError, setDistanceError] = useState('');
  const [leadTimeError, setLeadTimeError] = useState('');
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [vehiclesWithPrices, setVehiclesWithPrices] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isCalculatingPrices, setIsCalculatingPrices] = useState(false);

  const { data: publicConfig, isLoading: isLoadingPublicConfig } = useQuery({
    queryKey: ['publicConfig'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getPublicConfig');
        return response.data || {};
      } catch (error) {
        console.warn('[NovaReserva] Falha ao carregar configuração pública:', error);
        return {};
      }
    },
    staleTime: 300000,
  });

  const canViewPricesWithoutLogin = publicConfig?.publicPricing?.enabled ?? true;

  const { data: seasonalThemeData } = useQuery({
    queryKey: ['seasonalTheme'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getActiveSeasonalTheme');
        return response.data?.theme;
      } catch (e) {
        console.warn('Failed to fetch theme', e);
        return null;
      }
    },
    staleTime: 60 * 60 * 1000
  });

  const airportKeywordsConfig = publicConfig?.airportKeywords || null;

  const themeStyle = useMemo(() => {
    if (!seasonalThemeData) return {};
    const { theme_data } = seasonalThemeData;
    if (!theme_data) return {};

    return {
      '--primary-color': theme_data.primary_color,
      '--secondary-color': theme_data.secondary_color,
      backgroundImage: theme_data.background_image_url ? `url(${theme_data.background_image_url})` : undefined,
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
      backgroundPosition: 'center',
    };
  }, [seasonalThemeData]);

  const bgClass = isEmbedded
    ? "w-full bg-white"
    : (seasonalThemeData?.theme_data?.background_image_url 
      ? "min-h-screen p-3 md:p-4 pb-24 relative" 
      : "min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-3 md:p-4 pb-24");

  const { data: vehicleTypes = [], isLoading: isLoadingVehicleTypes, isError: isVehicleError, error: vehicleError, refetch: refetchVehicleTypes } = useQuery({
    queryKey: ['publicVehicleTypes'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getPublicConfig');
      return Array.isArray(response.data?.vehicleTypes) ? response.data.vehicleTypes : [];
    },
    staleTime: 60000,
    retry: 2,
  });

  const minDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const minDateBasedOnLeadTime = useMemo(() => {
    if (vehicleTypes.length === 0) return minDate;
    const minDateTime = new Date();
    const minLeadTimeHours = Math.min(...vehicleTypes.map(v => v.min_booking_lead_time_hours || 24));
    minDateTime.setHours(minDateTime.getHours() + minLeadTimeHours);
    return format(minDateTime, 'yyyy-MM-dd');
  }, [vehicleTypes, minDate]);

  const clearBookingState = useCallback(() => {
    localStorage.removeItem(BOOKING_STATE_KEY);
  }, []);

  const saveBookingState = useCallback((requestingQuote) => {
    const state = {
      step,
      serviceType,
      formData,
      multiTripLegs,
      distanceData,
      selectedVehicleId: selectedVehicle?.id,
      driverLanguage,
      isCustomHours,
      timestamp: Date.now(),
      requestingQuote: requestingQuote || false
    };
    localStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(state));
  }, [step, serviceType, formData, multiTripLegs, distanceData, selectedVehicle, driverLanguage, isCustomHours]);

  useEffect(() => {
    if (isInitializing || step === 0 || paymentCompleted || quoteRequested) {
      return;
    }
    const debounceTimer = setTimeout(() => {
      saveBookingState(false);
    }, 1000);
    return () => clearTimeout(debounceTimer);
  }, [step, serviceType, formData, distanceData, selectedVehicle, driverLanguage, isInitializing, saveBookingState, isCustomHours, paymentCompleted, quoteRequested]);

  const calculatePricesForAllVehicles = useCallback(async (authenticatedUser, customFormData, customDistanceData, customServiceType, customDriverLanguage) => {
    if (!authenticatedUser && !canViewPricesWithoutLogin) {
      return null;
    }

    setIsCalculatingPrices(true);

    const dataToUse = customFormData || formData;
    const distanceToUse = customDistanceData || distanceData;
    const serviceToUse = customServiceType || serviceType;
    const languageToUse = customDriverLanguage || driverLanguage;

    const priceCalculationPromises = vehicleTypes.map(async (vehicle) => {
      try {
        const priceResponse = await base44.functions.invoke('calculateTransferPrice', {
          service_type: serviceToUse,
          vehicle_type_id: vehicle.id,
          origin: dataToUse.origin,
          destination: dataToUse.destination,
          date: dataToUse.date,
          time: dataToUse.time,
          return_date: serviceToUse === 'round_trip' ? dataToUse.return_date : null,
          return_time: serviceToUse === 'round_trip' ? dataToUse.return_time : null,
          hours: serviceToUse === 'hourly' ? dataToUse.hours : null,
          driver_language: languageToUse
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
        let errorDetails = 'Erro desconhecido';
        if (error.response?.data) {
          if (typeof error.response.data === 'object' && error.response.data.error) {
            errorDetails = error.response.data.error;
          } else if (typeof error.response.data === 'string') {
            errorDetails = error.response.data;
          } else {
            errorDetails = JSON.stringify(error.response.data);
          }
        } else if (error.message) {
          errorDetails = error.message;
        }

        return {
          ...vehicle,
          calculated_price: null,
          error_details: errorDetails
        };
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
    return vehiclePrices;
  }, [vehicleTypes, formData, distanceData, serviceType, driverLanguage, canViewPricesWithoutLogin]);

  const isAirport = useCallback((address) => {
    if (!address) return false;
    const lowerAddress = address.toLowerCase();
    
    let keywords = [
      'aeroporto', 'airport', 'gru', 'guarulhos', 'cgh', 'congonhas',
      'vcp', 'viracopos', 'galeão', 'gig', 'santos dumont', 'sdu',
      'confins', 'cnf'
    ];

    if (airportKeywordsConfig) {
      keywords = airportKeywordsConfig.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
    }

    return keywords.some(keyword => lowerAddress.includes(keyword));
  }, [airportKeywordsConfig]);

  const handleNewBooking = useCallback(() => {
    setStep(1);
    setServiceType('one_way');
    setFormData({
      origin: '', destination: '', date: '', time: '', return_date: '', return_time: '',
      hours: 5, origin_flight_number: '', destination_flight_number: '',
      return_origin_flight_number: '', return_destination_flight_number: '',
      phone: '', email: '', additional_stops: []
    });
    setMultiTripLegs([{
      id: '1', origin: '', destination: '', date: '', time: '',
      origin_flight_number: '', destination_flight_number: '',
      vehicleTypeId: null, calculatedPrice: null, vehicleTypeName: '',
      originIsAirport: false, destinationIsAirport: false
    }]);
    setIsCustomHours(false);
    setDistanceData(null);
    setVehiclesWithPrices([]);
    setSelectedVehicle(null);
    setPaymentCompleted(false);
    setBookingNumber(null);
    setQuoteRequested(false);
    setQuoteNumber(null);
    setDriverLanguage('pt');
    clearBookingState();
  }, [clearBookingState]);

  const handleRequestQuote = useCallback(async (vehicle, language) => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        throw new Error('Usuário não autenticado.');
      }

      const customerPhone = currentUser.phone_number || '';
      const notes = 'Cotação solicitada devido a viagem fora do raio de atuação.';

      const quotePayload = {
        service_type: serviceType,
        vehicle_type_id: vehicle.id,
        vehicle_type_name: vehicle.name,
        driver_language: language,
        origin: formData.origin,
        destination: formData.destination || formData.origin,
        date: formData.date,
        time: formData.time,
        return_date: serviceType === 'round_trip' ? formData.return_date : null,
        return_time: serviceType === 'round_trip' ? formData.return_time : null,
        hours: serviceType === 'hourly' ? formData.hours : null,
        distance_km: vehicle.calculation_details?.supplier_total_distance_km || distanceData?.distance_km || 0,
        duration_minutes: distanceData?.duration_minutes || 0,
        passengers: 1,
        customer_name: currentUser.full_name,
        customer_email: currentUser.email,
        customer_phone: customerPhone,
        notes: notes,
        reason: 'Fora do raio de atuação'
      };
      
      const response = await base44.functions.invoke('submitQuoteRequest', quotePayload);

      if (response.data.success) {
        setQuoteNumber(response.data.quote_request.quote_number);
        setQuoteRequested(true);
        clearBookingState();
      } else {
        throw new Error(response.data.message || 'Erro desconhecido ao solicitar cotação.');
      }
    } catch (error) {
      console.error('[NovaReserva] Erro ao solicitar cotação:', error);
      
      if (error.response?.status === 401) {
        const stateToSave = {
          step: 2, serviceType, formData, distanceData,
          selectedVehicleId: vehicle.id, driverLanguage: language,
          isCustomHours, timestamp: Date.now(), requestingQuote: true
        };
        localStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(stateToSave));
        const targetUrl = '/NovaReserva?from_booking=true';
        window.location.href = `/AccessPortal?returnUrl=${encodeURIComponent(targetUrl)}`;
      } else {
        alert('Erro ao solicitar cotação. Verifique o console para mais detalhes ou tente novamente.');
      }
    }
  }, [serviceType, formData, distanceData, isCustomHours, clearBookingState]);

  const handleDriverLanguageChange = useCallback(async (newLanguage) => {
    setDriverLanguage(newLanguage);
    if ((user || canViewPricesWithoutLogin) && (distanceData || serviceType === 'hourly')) {
      await calculatePricesForAllVehicles(user, formData, distanceData, serviceType, newLanguage);
    }
  }, [user, canViewPricesWithoutLogin, distanceData, formData, serviceType, calculatePricesForAllVehicles]);

  const loadBookingState = useCallback(async (currentUser) => {
    try {
      const savedState = localStorage.getItem(BOOKING_STATE_KEY);
      if (!savedState) return false;

      const state = JSON.parse(savedState);
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - state.timestamp > oneHour) {
        clearBookingState();
        return false;
      }

      const restoredFormData = {
        ...state.formData,
        origin_flight_number: state.formData.origin_flight_number || '',
        destination_flight_number: state.formData.destination_flight_number || '',
        return_origin_flight_number: state.formData.return_origin_flight_number || '',
        return_destination_flight_number: state.formData.return_destination_flight_number || '',
        phone: state.formData.phone || '',
        additional_stops: state.formData.additional_stops || []
      };
      
      setServiceType(state.serviceType);
      setFormData(restoredFormData);
      setDistanceData(state.distanceData);
      setDriverLanguage(state.driverLanguage);
      
      if (state.multiTripLegs && Array.isArray(state.multiTripLegs)) {
        setMultiTripLegs(state.multiTripLegs);
      }
      
      if (state.serviceType === 'hourly') {
        if (typeof state.isCustomHours !== 'undefined') {
          setIsCustomHours(state.isCustomHours);
        } else {
          setIsCustomHours(![5, 10].includes(state.formData.hours));
        }
      } else {
        setIsCustomHours(false);
      }

      const hasStep1Data = (state.distanceData || state.serviceType === 'hourly');
      if (!hasStep1Data) {
        setStep(1);
        return true;
      }

      let calculatedVehicles = [];
      if (currentUser) {
        calculatedVehicles = await calculatePricesForAllVehicles(
          currentUser, restoredFormData, state.distanceData,
          state.serviceType, state.driverLanguage
        );
      } else {
        if (canViewPricesWithoutLogin) {
          console.log('[NovaReserva] Public pricing enabled, calculating prices for guest...');
          calculatedVehicles = await calculatePricesForAllVehicles(
            null, restoredFormData, state.distanceData,
            state.serviceType, state.driverLanguage
          );
        } else {
          calculatedVehicles = vehicleTypes.map(v => ({
            ...v, calculated_price: null, calculation_details: null
          }));
          calculatedVehicles.sort((a, b) => a.display_order - b.display_order);
          setVehiclesWithPrices(calculatedVehicles);
        }
      }

      if (state.requestingQuote && currentUser && calculatedVehicles && calculatedVehicles.length > 0) {
        const vehicleForQuote = calculatedVehicles.find(v => v.id === state.selectedVehicleId);
        if (vehicleForQuote) {
          clearBookingState();
          await handleRequestQuote(vehicleForQuote, state.driverLanguage);
          return true;
        }
      }

      if (state.selectedVehicleId && calculatedVehicles && calculatedVehicles.length > 0) {
        const vehicle = calculatedVehicles.find(v => v.id === state.selectedVehicleId);
        if (vehicle) {
          setSelectedVehicle(vehicle);
          if (vehicle.calculation_details?.outside_operational_radius) {
            setStep(2);
            return true;
          }
          if (currentUser) {
            setStep(3);
            return true;
          }
        }
      }

      setStep(2);
      return true;
    } catch (error) {
      console.error('[NovaReserva] Erro ao carregar estado:', error);
      clearBookingState();
      return false;
    }
  }, [clearBookingState, calculatePricesForAllVehicles, vehicleTypes, handleRequestQuote, canViewPricesWithoutLogin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isInitializing) {
        console.warn('[NovaReserva] Force finishing initialization due to timeout');
        setIsInitializing(false);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [isInitializing]);

  useEffect(() => {
    let isMounted = true;
    if (hasRestoredStateRef.current) return;
    if (isLoadingVehicleTypes || isLoadingPublicConfig) return;

    const initializeApp = async () => {
      console.log('[NovaReserva] Initializing app (rev). Public Pricing:', canViewPricesWithoutLogin);
      try {
        console.log('[NovaReserva] Starting initialization...');
        let currentUser = null;
        try {
          const authPromise = base44.auth.me();
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000));
          currentUser = await Promise.race([authPromise, timeoutPromise]);
          if (isMounted) setUser(currentUser);
        } catch (authError) {
          console.warn('[NovaReserva] Auth check failed or timed out:', authError);
          if (isMounted) setUser(null);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const fromBooking = urlParams.get('from_booking');
        const fromGuestSuccess = urlParams.get('from_guest_success');
        const paramOrigin = urlParams.get('origin');
        const urlReturnUrl = urlParams.get('returnUrl');
        
        if (isMounted && urlReturnUrl) {
          setReturnUrl(urlReturnUrl);
        }
        
        if (paramOrigin) {
           const paramFormData = {
             origin: urlParams.get('origin') || '',
             destination: urlParams.get('destination') || '',
             date: urlParams.get('date') || '',
             time: urlParams.get('time') || '',
             return_date: urlParams.get('return_date') || '',
             return_time: urlParams.get('return_time') || '',
             hours: urlParams.get('hours') ? parseInt(urlParams.get('hours')) : 5,
             origin_flight_number: urlParams.get('origin_flight_number') || '',
             destination_flight_number: urlParams.get('destination_flight_number') || '',
             return_origin_flight_number: urlParams.get('return_origin_flight_number') || '',
             return_destination_flight_number: urlParams.get('return_destination_flight_number') || '',
             phone: urlParams.get('phone') || '',
             email: urlParams.get('email') || '',
             additional_stops: []
           };
           const paramServiceType = urlParams.get('service_type') || 'one_way';
           
           if (isMounted) {
             setFormData(prev => ({ ...prev, ...paramFormData }));
             setServiceType(paramServiceType);
             if (paramServiceType === 'hourly') {
                setIsCustomHours(![5, 10].includes(paramFormData.hours));
             }
           }
        }

        const updateUrl = () => {
          if (urlReturnUrl) {
            const newUrl = new URL(window.location.href);
            newUrl.search = `?returnUrl=${encodeURIComponent(urlReturnUrl)}`;
            window.history.replaceState({}, '', newUrl.toString());
          } else {
            window.history.replaceState({}, '', window.location.pathname);
          }
        };

        if (fromGuestSuccess === 'true') {
          clearBookingState();
          updateUrl();
          if (isMounted) {
             setFormData(prev => ({
                ...prev, origin: '', destination: '', date: '', time: '',
                return_date: '', return_time: '', phone: '', email: '', additional_stops: []
             }));
             setIsInitializing(false);
          }
          return;
        }

        if (fromBooking === 'true' && !paramOrigin) {
          updateUrl();
          await loadBookingState(currentUser);
        } else {
          if (paramOrigin) {
             updateUrl();
          }
          if (serviceType === 'hourly' && !localStorage.getItem(BOOKING_STATE_KEY) && !paramOrigin) {
            if (isMounted) {
              setFormData(prev => ({ ...prev, hours: 5 }));
              setIsCustomHours(false);
            }
          }
        }

        hasRestoredStateRef.current = true;
      } catch (error) {
        console.error('[NovaReserva] Error during initialization:', error);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
          console.log('[NovaReserva] Initialization finished.');
        }
      }
    };

    initializeApp();
    return () => { isMounted = false; };
  }, [isLoadingVehicleTypes, isLoadingPublicConfig, vehicleTypes, loadBookingState, serviceType, canViewPricesWithoutLogin, clearBookingState]);

  useEffect(() => {
    if (serviceType === 'hourly') {
      setFormData(prev => ({ ...prev, hours: 5 }));
      setIsCustomHours(false);
    } else {
      setIsCustomHours(false);
    }
  }, [serviceType]);

  useEffect(() => {
    const mapped = mapLanguageToDriverLanguage(language);
    setDriverLanguage(mapped);
    if (step === 2 && (user || canViewPricesWithoutLogin) && (distanceData || serviceType === 'hourly')) {
      calculatePricesForAllVehicles(user, formData, distanceData, serviceType, mapped);
    }
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateStep1 = useCallback(() => {
    setDistanceError('');
    setLeadTimeError('');



    if (!user && (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))) {
      setDistanceError(nr('errValidEmail'));
      return false;
    }
    if (!formData.phone || formData.phone.trim().length < 10) {
      setDistanceError(nr('errValidPhone'));
      return false;
    }
    if (serviceType !== 'hourly' && serviceType !== 'multi_trip' && (!formData.origin || !formData.destination)) {
      setDistanceError(nr('errOriginDestination'));
      return false;
    }
    if (serviceType === 'hourly' && !formData.origin) {
      setDistanceError(nr('errOrigin'));
      return false;
    }
    if (serviceType !== 'multi_trip' && (!formData.date || !formData.time)) {
      setDistanceError(nr('errDateTime'));
      return false;
    }
    if (serviceType === 'round_trip') {
      if (!formData.return_date || !formData.return_time) {
        setDistanceError(nr('errReturnDateTime'));
        return false;
      }
    }
    if (serviceType === 'hourly') {
      const hours = formData.hours;
      if (hours === '' || hours === null || hours === undefined || parseFloat(hours) < 5) {
        setDistanceError(nr('errMinHours'));
        return false;
      }
      if (!formData.additional_stops || formData.additional_stops.length === 0) {
        setDistanceError(nr('errAddStop'));
        return false;
      }
      if (!formData.destination) {
        setDistanceError(nr('errDestination'));
        return false;
      }
    }

    if (serviceType !== 'multi_trip') {
      const now = new Date();
      const bookingDateTime = new Date(`${formData.date}T${formData.time}`);
      if (isNaN(bookingDateTime.getTime())) {
        setDistanceError(nr('errInvalidDateTime'));
        return false;
      }
      if (bookingDateTime.getTime() < now.getTime()) {
        setDistanceError(nr('errPastDateTime'));
        return false;
      }
      if (vehicleTypes.length > 0) {
        const diffMs = bookingDateTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const maxLeadTimeHours = Math.max(...vehicleTypes.map(v => v.min_booking_lead_time_hours || 24));
        if (diffHours < maxLeadTimeHours) {
          setDistanceError(nr('errMinLeadTimeNotMet', { hours: maxLeadTimeHours }));
          return false;
        }
      }
    }

    return true;
  }, [formData, serviceType, vehicleTypes, nr, user, multiTripLegs]);

  const handleCalculateAndContinue = async () => {
    if (serviceType === 'multi_trip') {
      // Validação específica para multi-trip
      if (!user && (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))) {
        setDistanceError(nr('errValidEmail'));
        return;
      }
      if (!formData.phone || formData.phone.trim().length < 10) {
        setDistanceError(nr('errValidPhone'));
        return;
      }
      if (multiTripLegs.length === 0) {
        setDistanceError('Adicione pelo menos uma viagem');
        return;
      }
      
      // Validação detalhada de cada perna
      console.log('[NovaReserva] Validating multiTripLegs:', multiTripLegs);
      const now = new Date();
      const MIN_LEAD_TIME_HOURS = 48; // Prazo mínimo padrão para múltiplas viagens
      
      for (let i = 0; i < multiTripLegs.length; i++) {
        const leg = multiTripLegs[i];
        const legNum = i + 1;
        console.log(`[NovaReserva] Validating leg ${legNum}:`, leg);
        if (!leg.origin || leg.origin.trim() === '') {
          setDistanceError(`Viagem ${legNum}: Preencha a origem`);
          return;
        }
        if (!leg.destination || leg.destination.trim() === '') {
          setDistanceError(`Viagem ${legNum}: Preencha o destino`);
          return;
        }
        if (!leg.date) {
          setDistanceError(`Viagem ${legNum}: Selecione a data`);
          return;
        }
        if (!leg.time) {
          setDistanceError(`Viagem ${legNum}: Selecione o horário`);
          return;
        }
        
        // Validação de prazo mínimo (48 horas)
        const legDateTime = new Date(`${leg.date}T${leg.time}`);
        if (isNaN(legDateTime.getTime())) {
          setDistanceError(`Viagem ${legNum}: Data ou horário inválidos`);
          return;
        }
        
        const diffMs = legDateTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffHours < MIN_LEAD_TIME_HOURS) {
          setDistanceError(`The selected date and time do not meet the minimum lead time of ${MIN_LEAD_TIME_HOURS} hours. Please choose a later date/time.`);
          return;
        }
        
        if (!leg.vehicleTypeId) {
          setDistanceError(`Viagem ${legNum}: Selecione um veículo`);
          return;
        }
      }

      const totalPrice = multiTripLegs.reduce((sum, leg) => sum + (leg.calculatedPrice || 0), 0);
      if (totalPrice === 0) {
        setDistanceError('Aguarde o cálculo dos preços de todas as viagens');
        return;
      }

      setIsCalculatingDistance(true);
      try {
        const customerData = {
          customer_name: user?.full_name || formData.customer_name || 'Cliente',
          customer_email: user?.email || formData.email,
          customer_phone: formData.phone,
          passengers: 1,
          notes: formData.notes || ''
        };

        const response = await base44.functions.invoke('createMultiTripBooking', {
          legs: multiTripLegs,
          driverLanguage,
          customerData,
          isGuest: !user
        });

        if (response.data?.url) {
          window.location.href = response.data.url;
        } else {
          throw new Error('URL de pagamento não retornada');
        }
      } catch (error) {
        console.error('Erro ao criar reserva multi-viagem:', error);
        setDistanceError(error.response?.data?.error || error.message || 'Erro ao processar reserva');
        setIsCalculatingDistance(false);
      }
      return;
    }
    
    if (!validateStep1()) return;

    setDistanceError('');
    setLeadTimeError('');
    setIsCalculatingDistance(true);

    const isIframe = window.self !== window.top;
    if (isIframe) {
      const params = new URLSearchParams();
      params.set('origin', formData.origin);
      params.set('destination', formData.destination);
      params.set('date', formData.date);
      params.set('time', formData.time);
      params.set('service_type', serviceType);
      params.set('phone', formData.phone);
      params.set('email', formData.email);
      
      if (formData.return_date) params.set('return_date', formData.return_date);
      if (formData.return_time) params.set('return_time', formData.return_time);
      if (formData.hours) params.set('hours', formData.hours);
      if (formData.origin_flight_number) params.set('origin_flight_number', formData.origin_flight_number);
      if (formData.destination_flight_number) params.set('destination_flight_number', formData.destination_flight_number);
      if (formData.return_origin_flight_number) params.set('return_origin_flight_number', formData.return_origin_flight_number);
      if (formData.return_destination_flight_number) params.set('return_destination_flight_number', formData.return_destination_flight_number);
      
      const currentUrlParams = new URLSearchParams(window.location.search);
      const returnUrl = currentUrlParams.get('returnUrl') || 'https://www.transferonline.com.br';
      params.set('returnUrl', returnUrl);
      const standaloneUrl = `${window.location.origin}/NovaReserva?${params.toString()}`;
      
      try {
        window.top.location.href = standaloneUrl;
      } catch (e) {
        window.open(standaloneUrl, '_top');
      }
      return;
    }

    try {
      const leadResult = await base44.functions.invoke('saveBookingLead', {
        phone: formData.phone,
        email: formData.email,
        service_type: serviceType,
        origin: formData.origin,
        destination: formData.destination || formData.origin,
        date: formData.date,
        time: formData.time,
        hours: serviceType === 'hourly' ? formData.hours : null,
        driver_language: driverLanguage,
        origin_flight_number: formData.origin_flight_number,
        destination_flight_number: formData.destination_flight_number,
        return_origin_flight_number: formData.return_origin_flight_number,
        return_destination_flight_number: formData.return_destination_flight_number
      });
      console.log('[NovaReserva] Lead salvo:', leadResult);
      if (leadResult?.data?.success && leadResult?.data?.lead_id) {
        setBookingLeadId(leadResult.data.lead_id);
      }
    } catch (leadError) {
      console.error('[NovaReserva] Erro ao salvar lead:', leadError);
    }

    let calculatedDistance = null;
    if (serviceType !== 'hourly') {
      try {
        if (!formData.origin || !formData.destination) {
          throw new Error('Origem e destino são obrigatórios');
        }

        const distanceResponse = await base44.functions.invoke('calculateDistance', {
          origin: formData.origin,
          destination: formData.destination
        });

        if (distanceResponse.data && distanceResponse.data.distance_km) {
          calculatedDistance = distanceResponse.data;
        } else {
          throw new Error('Resposta inválida da API de cálculo de distância');
        }
      } catch (error) {
        console.error('[NovaReserva] Erro ao calcular distância:', error);

        if (error.response?.status === 404) {
          setDistanceError(nr('errRouteNotFound'));
          setIsCalculatingDistance(false);
          return;
        }

        if (error.response?.status && error.response.status < 500 && error.response?.data?.error) {
          setDistanceError(error.response.data.error);
          setIsCalculatingDistance(false);
          return;
        }

        console.warn('[NovaReserva] Continuando sem distância calculada devido a falha temporária.');
        calculatedDistance = null;
      }
    } else {
      calculatedDistance = null;
    }

    setDistanceData(calculatedDistance);
    setIsCalculatingDistance(false);

    const vehiclesWithoutPrices = vehicleTypes.map(v => ({
      ...v,
      calculated_price: null,
      calculation_details: null
    }));
    vehiclesWithoutPrices.sort((a, b) => a.display_order - b.display_order);
    setVehiclesWithPrices(vehiclesWithoutPrices);
    setStep(2);
    
    if (user || canViewPricesWithoutLogin) {
      await calculatePricesForAllVehicles(user, formData, calculatedDistance, serviceType, driverLanguage);
    }
  };

  const handleVehicleSelect = async (vehicle, language) => {
    setLeadTimeError('');
    if (!user && canViewPricesWithoutLogin && vehicle !== null) {
    }

    if (vehicle === null) {
      const stateToSave = {
        step: 2, serviceType, formData, distanceData,
        selectedVehicleId: null, driverLanguage: language || driverLanguage,
        isCustomHours, timestamp: Date.now()
      };
      localStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(stateToSave));
      const currentUrl = '/NovaReserva?from_booking=true';
      window.location.href = `/AccessPortal?returnUrl=${encodeURIComponent(currentUrl)}`;
      return;
    }

    const now = new Date();
    const bookingDateTime = new Date(`${formData.date}T${formData.time}`);
    if (isNaN(bookingDateTime.getTime())) {
      setLeadTimeError(nr('errInvalidDateTimeBooking'));
      return;
    }

    const diffMs = bookingDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const vehicleLeadTime = vehicle.min_booking_lead_time_hours || 0;
    if (diffHours < vehicleLeadTime) {
      setLeadTimeError(nr('errLeadTimeRequired', { hours: vehicleLeadTime }));
      return;
    }

    let currentUser = user;
    if (!currentUser) {
      try {
        currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
      }
    }

    try {
      setDriverLanguage(language);
      let currentVehiclesWithPrices = vehiclesWithPrices;
      if (!currentVehiclesWithPrices[0]?.calculated_price || driverLanguage !== language) {
        currentVehiclesWithPrices = await calculatePricesForAllVehicles(currentUser, null, null, null, language);
      }

      const selectedVehicleWithPrice = currentVehiclesWithPrices.find(v => v.id === vehicle.id);
      const finalSelectedVehicle = selectedVehicleWithPrice || vehicle;
      setSelectedVehicle(finalSelectedVehicle);

      if (bookingLeadId) {
        base44.functions.invoke('updateBookingLead', {
          lead_id: bookingLeadId,
          vehicle_type_id: finalSelectedVehicle.id,
          vehicle_type_name: finalSelectedVehicle.name,
          calculated_price: finalSelectedVehicle.calculated_price,
          distance_km: distanceData?.distance_km,
          duration_minutes: distanceData?.duration_minutes,
          status: 'booking_started'
        }).catch(err => console.error('[NovaReserva] Erro ao atualizar lead:', err));
      }

      if (currentUser || canViewPricesWithoutLogin) {
        setStep(3);
        saveBookingState(false);
      } else {
         throw new Error('Login required');
      }
    } catch (error) {
      if (error.message === 'Login required' || error.response?.status === 401) {
        setDriverLanguage(language);
        const stateToSave = {
          step: 2, serviceType, formData, distanceData,
          selectedVehicleId: vehicle?.id, driverLanguage: language,
          isCustomHours, timestamp: Date.now() 
        };
        localStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(stateToSave));
        const targetUrl = '/NovaReserva?from_booking=true';
        window.location.href = `/AccessPortal?returnUrl=${encodeURIComponent(targetUrl)}`;
      } else {
        console.error("Erro ao selecionar veículo:", error);
        toast.error(nr('errProcessingSelection'));
      }
    }
  };

  const handlePaymentCompleted = useCallback((bookingId) => {
    setBookingNumber(bookingId);
    setPaymentCompleted(true);
    clearBookingState();
  }, [clearBookingState]);

  useEffect(() => {
    if (paymentCompleted) {
      const timer = setTimeout(handleNewBooking, 5000);
      return () => clearTimeout(timer);
    }
  }, [paymentCompleted, handleNewBooking]);

  useEffect(() => {
    if (quoteRequested) {
      const timer = setTimeout(handleNewBooking, 5000);
      return () => clearTimeout(timer);
    }
  }, [quoteRequested, handleNewBooking]);

  const getSelectedHoursOption = useMemo(() => {
    if (isCustomHours) return 'custom';
    if (formData.hours === 5 || formData.hours === 10) return String(formData.hours);
    return 'custom';
  }, [formData.hours, isCustomHours]);

  const userMenuItems = user ? [
    { title: 'Minhas Viagens', url: createPageUrl('MinhasViagens'), icon: Package },
    ...(user.event_access_active ? [{ title: 'Meus Eventos', url: createPageUrl('GerenciarEventos'), icon: Calendar }] : []),
    { title: 'Meus Dados', url: createPageUrl('MeusDados'), icon: User }
  ] : [];

  const originIsAirport = useMemo(() => originLocationType === 'airport' || isAirport(formData.origin), [formData.origin, originLocationType, isAirport]);
  const destinationIsAirport = useMemo(() => destinationLocationType === 'airport' || isAirport(formData.destination), [formData.destination, destinationLocationType, isAirport]);
  const returnOriginIsAirport = useMemo(() => serviceType === 'round_trip' && (destinationLocationType === 'airport' || isAirport(formData.destination)), [serviceType, formData.destination, destinationLocationType, isAirport]); 
  const returnDestinationIsAirport = useMemo(() => serviceType === 'round_trip' && (originLocationType === 'airport' || isAirport(formData.origin)), [serviceType, formData.origin, originLocationType, isAirport]);
  const multiTripPaymentReady = useMemo(() => {
    if (serviceType !== 'multi_trip') return true;

    const hasValidContact = formData.phone?.trim()?.length >= 10 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email || '');
    const hasLegs = multiTripLegs.length > 0;
    const allLegsReady = multiTripLegs.every((leg) => (
      leg.origin &&
      leg.destination &&
      leg.date &&
      leg.time &&
      leg.vehicleTypeId &&
      Number(leg.calculatedPrice) > 0
    ));

    return hasValidContact && hasLegs && allLegsReady;
  }, [serviceType, formData.email, formData.phone, multiTripLegs]);

  if (isVehicleError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 p-4">
        <div className="text-center max-w-md bg-white p-6 rounded-xl shadow-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erro ao carregar veículos</h2>
          <p className="text-gray-600 mb-6">
            Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.
            <br />
            <span className="text-xs text-red-400 mt-2 block">{vehicleError?.message || 'Erro desconhecido'}</span>
          </p>
          <Button onClick={() => refetchVehicleTypes()} className="bg-blue-600 hover:bg-blue-700 w-full">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">{nr('loading')}</p>
        </div>
      </div>
    );
  }

  if (quoteRequested) {
    return (
      <div className="flex items-center justify-center p-4 min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{nr('quoteTitle')}</h2>
          <p className="text-gray-600 text-base mb-2">{nr('quoteSent')}</p>
          {quoteNumber && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-orange-700 mb-1">{nr('quoteNumberLabel')}</p>
              <p className="text-2xl font-bold text-orange-600">{quoteNumber}</p>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-blue-900"><strong>{nr('nextSteps')}</strong></p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
              <li>{nr('nextStepEmail')}</li>
              <li>{nr('nextStepAnalysis')}</li>
              <li>{nr('nextStepQuoteSent')}</li>
            </ul>
          </div>
          <Button
            onClick={handleNewBooking}
            className="bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-700 hover:to-amber-800 text-white w-full py-5 text-base font-bold rounded-xl shadow-lg"
          >
            {nr('newBooking')}
          </Button>
        </div>
      </div>
    );
  }

  if (paymentCompleted) {
    return (
      <div className="flex items-center justify-center p-4 min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{nr('paymentSuccess')}</h2>
          <p className="text-gray-600 text-base mb-6">
            {nr('bookingConfirmed')}
            {bookingNumber && (
              <>
                <br />
                <span className="font-bold text-xl text-green-600 block mt-2">#{bookingNumber}</span>
              </>
            )}
          </p>
          {returnUrl ? (
            <div className="space-y-3">
              <Button
                onClick={() => window.location.href = returnUrl}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white w-full py-5 text-base font-bold rounded-xl shadow-lg"
              >
                {nr('backToSite')}
              </Button>
              <Button onClick={handleNewBooking} variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50">
                {nr('newBooking')}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleNewBooking}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white w-full py-5 text-base font-bold rounded-xl shadow-lg"
            >
              Fazer Nova Reserva
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={bgClass} style={themeStyle}>
      {!isEmbedded && <MetaTags 
        title="Nova Reserva | TransferOnline" 
        description="Agende seu transfer executivo com segurança e conforto." 
      />}
      {seasonalThemeData?.theme_data?.background_image_url && (
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundColor: seasonalThemeData.theme_data.background_overlay_color || 'rgba(255,255,255,0.9)' }}></div>
      )}

      <div className="max-w-2xl mx-auto relative z-10">
        {!isEmbedded && seasonalThemeData?.theme_data?.welcome_title && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm p-4 mb-4 border-l-4 text-center" style={{ borderLeftColor: seasonalThemeData.theme_data.primary_color }}>
             <h2 className="text-xl font-bold" style={{ color: seasonalThemeData.theme_data.primary_color }}>
               {seasonalThemeData.theme_data.decoration_icon === 'snowflake' && '❄️ '}
               {seasonalThemeData.theme_data.decoration_icon === 'tree' && '🎄 '}
               {seasonalThemeData.theme_data.decoration_icon === 'star' && '✨ '}
               {seasonalThemeData.theme_data.decoration_icon === 'gift' && '🎁 '}
               {seasonalThemeData.theme_data.welcome_title}
             </h2>
             {seasonalThemeData.theme_data.welcome_message && (
               <p className="text-gray-600 text-sm mt-1">{seasonalThemeData.theme_data.welcome_message}</p>
             )}
          </div>
        )}

        {!isEmbedded && (
        <div className="bg-white rounded-xl shadow-md p-3 md:p-4 mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68effdb75fcac474f3f66b8f/57204d3c2_logo-icone.jpg" 
                  alt="TransferOnline Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-base text-gray-900 leading-tight">TransferOnline</h1>
                <p className="text-[10px] text-gray-500 truncate">Transporte Executivo</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Suspense fallback={null}>
                <LanguageSelector compact />
              </Suspense>
              {user ? (
                <Button
                  onClick={() => { localStorage.removeItem('base44_access_token'); localStorage.removeItem('token'); localStorage.removeItem('access_token'); window.location.href = '/AccessPortal'; }}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              ) : (
                <Button
                  onClick={() => window.location.href = `/AccessPortal?returnUrl=${encodeURIComponent('/NovaReserva')}`}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  title="Login"
                >
                  <LogIn className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
        )}

        {step === 1 && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-5">
              <Tabs value={serviceType} onValueChange={setServiceType} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-3 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger value="one_way" className="text-[10px] md:text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
                    {nr('oneWay')}
                  </TabsTrigger>
                  <TabsTrigger value="round_trip" className="text-[10px] md:text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
                    {nr('roundTrip')}
                  </TabsTrigger>
                  <TabsTrigger value="hourly" className="text-[10px] md:text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
                    {nr('hourly')}
                  </TabsTrigger>
                  <TabsTrigger value="multi_trip" className="text-[10px] md:text-sm font-semibold rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
                    {nr('multiTrip')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="one_way">
                  <Suspense fallback={<ComponentLoader />}>
                    <OneWayTabContent
                      formData={formData}
                      setFormData={setFormData}
                      startTransition={startTransition}
                      originIsAirport={originIsAirport}
                      destinationIsAirport={destinationIsAirport}
                      minDateBasedOnLeadTime={minDateBasedOnLeadTime}
                      setOriginLocationType={setOriginLocationType}
                      setDestinationLocationType={setDestinationLocationType}
                      user={user}
                      t={t}
                    />
                  </Suspense>
                </TabsContent>

                <TabsContent value="round_trip">
                  <Suspense fallback={<ComponentLoader />}>
                    <RoundTripTabContent
                      formData={formData}
                      setFormData={setFormData}
                      startTransition={startTransition}
                      originIsAirport={originIsAirport}
                      destinationIsAirport={destinationIsAirport}
                      returnOriginIsAirport={returnOriginIsAirport}
                      returnDestinationIsAirport={returnDestinationIsAirport}
                      minDateBasedOnLeadTime={minDateBasedOnLeadTime}
                      setOriginLocationType={setOriginLocationType}
                      setDestinationLocationType={setDestinationLocationType}
                      user={user}
                      t={t}
                    />
                  </Suspense>
                </TabsContent>

                <TabsContent value="hourly">
                  <HourlyTabContent
                    formData={formData}
                    setFormData={setFormData}
                    startTransition={startTransition}
                    originIsAirport={originIsAirport}
                    destinationIsAirport={destinationIsAirport}
                    minDateBasedOnLeadTime={minDateBasedOnLeadTime}
                    isCustomHours={isCustomHours}
                    setIsCustomHours={setIsCustomHours}
                    getSelectedHoursOption={getSelectedHoursOption}
                    user={user}
                    t={t}
                  />
                </TabsContent>

                <TabsContent value="multi_trip">
                  <Suspense fallback={<ComponentLoader />}>
                    <MultiTripTabContent
                      formData={formData}
                      setFormData={setFormData}
                      multiTripLegs={multiTripLegs}
                      setMultiTripLegs={setMultiTripLegs}
                      vehicleTypes={vehicleTypes}
                      driverLanguage={driverLanguage}
                      minDateBasedOnLeadTime={minDateBasedOnLeadTime}
                      isAirport={isAirport}
                      t={t}
                      user={user}
                      canViewPricesWithoutLogin={canViewPricesWithoutLogin}
                    />
                  </Suspense>
                </TabsContent>
              </Tabs>

              {distanceError && (
                <Alert variant="destructive" className="mt-3 rounded-lg border-2 py-2.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <AlertDescription className="text-xs font-medium">{distanceError}</AlertDescription>
                </Alert>
              )}

              <div className="mt-6">
                <Button
                  onClick={handleCalculateAndContinue}
                  disabled={isCalculatingDistance || (serviceType === 'multi_trip' && !multiTripPaymentReady)}
                  className="w-full h-12 text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCalculatingDistance ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {serviceType === 'multi_trip' ? 'Processando Reserva...' : serviceType !== 'hourly' ? 'Calculando...' : 'Processando...'}
                    </>
                  ) : (
                    <>
                      {serviceType === 'multi_trip' ? nr('continueToPayment') : nr('viewVehicles')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
                {serviceType === 'multi_trip' && !multiTripPaymentReady && (
                  <p className="mt-2 text-xs text-amber-700 text-center font-medium">
                    {nr('multiTripPaymentLocked')}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <Button variant="ghost" onClick={() => setStep(1)} className="text-xs h-8 px-3">
              {nr('back')}
            </Button>
            {leadTimeError && (
              <Alert variant="destructive" className="rounded-lg border-2 py-2.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs font-medium">{leadTimeError}</AlertDescription>
              </Alert>
            )}
            <Suspense fallback={<ComponentLoader />}>
              <VehicleSelection
                vehicles={vehiclesWithPrices}
                selectedVehicleId={selectedVehicle?.id}
                onSelectVehicle={handleVehicleSelect}
                onDriverLanguageChange={handleDriverLanguageChange}
                onRequestQuote={handleRequestQuote}
                isCalculating={isCalculatingPrices}
                isLoggedIn={!!user}
                showPrices={!!user || canViewPricesWithoutLogin}
                selectedDriverLanguage={driverLanguage}
                bookingDateTime={formData.date && formData.time ? new Date(`${formData.date}T${formData.time}`) : null}
              />
            </Suspense>
          </div>
        )}

        {step === 3 && selectedVehicle && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              onClick={() => {
                setStep(2);
                if (bookingLeadId) {
                  base44.functions.invoke('updateBookingLead', {
                    lead_id: bookingLeadId,
                    status: 'viewed_prices'
                  }).catch(err => console.error('[NovaReserva] Erro ao atualizar status do lead ao voltar:', err));
                }
              }}
              className="text-xs h-8 px-3"
            >
              {nr('back')}
            </Button>
            <Suspense fallback={<ComponentLoader />}>
              <BookingForm
                serviceType={serviceType}
                tripDetails={formData}
                distanceData={distanceData}
                selectedVehicle={selectedVehicle}
                driverLanguage={driverLanguage}
                onPaymentCompleted={handlePaymentCompleted}
              />
            </Suspense>
          </div>
        )}
      </div>

      {!isEmbedded && (
        <Suspense fallback={null}>
          <WhatsAppButton className="mb-4" />
        </Suspense>
      )}
    </div>
  );
}