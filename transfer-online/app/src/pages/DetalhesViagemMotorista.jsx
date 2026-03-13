import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { GeoService, BrowserService } from '@/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Loader2,
  MapPin,
  Calendar,
  Clock,
  Users,
  Phone,
  CheckCircle,
  AlertCircle,
  Navigation,
  User,
  Mail,
  DollarSign,
  Timer,
  Plus,
  Trash2,
  PauseCircle,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  Info,
  Building2,
  Share2,
  MessageSquare,
  Copy,
  CalendarPlus,
  ImageIcon,
  ChevronRight,
  AlertTriangle,
  Plane,
  Menu,
  Upload,
  FileText,
  Package
} from 'lucide-react';
import { format, subHours, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import SwipeableButton from '@/components/ui/SwipeableButton';
import DriverNavigationMap from '@/components/driver/DriverNavigationMap';
import TelemetryTracker from '@/components/telemetry/TelemetryTracker';

const StopTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!startTime) return;

    const start = new Date(startTime).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = now - start;
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      setElapsed(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <Badge className="bg-orange-600 text-white border-0 font-mono font-bold animate-pulse">
      ⏱️ {elapsed}
    </Badge>
  );
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
          Math.cos(phi1) * Math.cos(phi2) *
          Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=AIzaSyDpTGd0zvKbJCjo5VUGDFCk9kEGgQhOhAU`
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    console.error('[geocodeAddress] Erro:', error);
    return null;
  }
};

export default function DetalhesViagemMotorista() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [serviceRequest, setServiceRequest] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [gpsPermissionGranted, setGpsPermissionGranted] = useState(false);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);
  const [showGpsAlert, setShowGpsAlert] = useState(false);
  
  const [originCoords, setOriginCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [distanceToOrigin, setDistanceToOrigin] = useState(null);
  const [distanceToDestination, setDistanceToDestination] = useState(null);
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState(false);
  
  const [showExpensesDialog, setShowExpensesDialog] = useState(false);
  const [hasAdditionalExpenses, setHasAdditionalExpenses] = useState(null);
  const [additionalExpenses, setAdditionalExpenses] = useState([]);
  const [currentExpense, setCurrentExpense] = useState({
    type: 'estacionamento',
    value: '',
    quantity_minutes: '',
    description: '',
    receipt_url: ''
  });
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [expenseError, setExpenseError] = useState('');
  const [showAdditionalStopDialog, setShowAdditionalStopDialog] = useState(false);
  const [additionalStopNotes, setAdditionalStopNotes] = useState('');
  const [pendingNavigationDestination, setPendingNavigationDestination] = useState('');
  const [swipeResetKey, setSwipeResetKey] = useState(0);
  
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [sharedTimelineUrl, setSharedTimelineUrl] = useState('');

  const [isGeneratingCalendarLink, setIsGeneratingCalendarLink] = useState(false);
  const [showSafetyAlert, setShowSafetyAlert] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isPhoneVisible, setIsPhoneVisible] = useState(false);
  const [isCommandButtonsEnabled, setIsCommandButtonsEnabled] = useState(false);
  const [showInternalNavigation, setShowInternalNavigation] = useState(false);
  
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [preferredMap, setPreferredMap] = useState('waze'); // 'internal' | 'waze' | 'google_maps'

  const [client, setClient] = useState(null);

  // Determinar se o rastreamento deve estar ativo
  const isTrackingActive = serviceRequest && 
                           ['a_caminho', 'chegou_origem', 'passageiro_embarcou', 'parada_adicional', 'a_caminho_destino'].includes(serviceRequest.driver_trip_status) &&
                           !['finalizada', 'no_show', 'cancelada_motorista'].includes(serviceRequest.driver_trip_status);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (!urlToken) {
      setError('Link inválido: token não encontrado');
      setIsLoading(false);
      return;
    }

    setToken(urlToken);
    loadTripDetails(urlToken);

    // Polling para atualização quase em tempo real (5 segundos)
    const pollingInterval = setInterval(() => {
      loadTripDetails(urlToken, true); // true = silent update
    }, 5000);
    
    // Verificar permissão de GPS uma única vez no carregamento
    checkGPSPermissionStatus();

    // Carregar preferência de mapa
    const savedMap = localStorage.getItem('driver_preferred_map_app');
    if (savedMap) {
      setPreferredMap(savedMap);
    }

    return () => clearInterval(pollingInterval);
  }, []);

  const checkGPSPermissionStatus = async () => {
    if (!navigator.permissions) {
      // Fallback para navegadores sem API de permissões
      const savedPermission = localStorage.getItem('gps_permission_granted');
      if (savedPermission === 'true') {
        setGpsPermissionGranted(true);
      }
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      
      if (result.state === 'granted') {
        setGpsPermissionGranted(true);
        setGpsPermissionDenied(false);
        localStorage.setItem('gps_permission_granted', 'true');
      } else if (result.state === 'denied') {
        setGpsPermissionGranted(false);
        setGpsPermissionDenied(true);
        localStorage.setItem('gps_permission_granted', 'false');
      }

      // Monitorar mudanças de permissão
      result.addEventListener('change', () => {
        if (result.state === 'granted') {
          setGpsPermissionGranted(true);
          setGpsPermissionDenied(false);
          setShowGpsAlert(false);
          localStorage.setItem('gps_permission_granted', 'true');
        } else if (result.state === 'denied') {
          setGpsPermissionGranted(false);
          setGpsPermissionDenied(true);
          setShowGpsAlert(true);
          localStorage.setItem('gps_permission_granted', 'false');
        }
      });
    } catch (err) {
      console.warn('[GPS] Permissions API não disponível:', err);
      // Fallback para localStorage
      const savedPermission = localStorage.getItem('gps_permission_granted');
      if (savedPermission === 'true') {
        setGpsPermissionGranted(true);
      }
    }
  };

  useEffect(() => {
    if (serviceRequest?.date && serviceRequest?.time) {
      const tripDate = parseLocalDate(serviceRequest.date);
      const [hours, minutes] = serviceRequest.time.split(':');
      tripDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const activationTime = subHours(tripDate, 4);
      const now = new Date();
      
      const isTimeAllowed = isAfter(now, activationTime);
      const isTripStarted = serviceRequest.driver_trip_status !== 'aguardando';
      
      setIsCommandButtonsEnabled(isTimeAllowed || isTripStarted);
    } else if (serviceRequest) {
      setIsCommandButtonsEnabled(serviceRequest.driver_trip_status !== 'aguardando');
    }
  }, [serviceRequest]);

  const loadTripDetails = async (urlToken, silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError('');
    }

    try {
      const response = await base44.functions.invoke('getTripDetailsByToken', { token: urlToken });
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'Viagem não encontrada ou link inválido');
      }

      const request = response.data.trip;
      const clientData = response.data.client;

      // Garantir status padrão se vier nulo
      if (!request.driver_trip_status) {
        request.driver_trip_status = 'aguardando';
      }

      setServiceRequest(request);
      setClient(clientData);
      
      // Apenas geocodificar se não tiver feito ainda (para economizar requisições no polling)
      if (request.origin && !originCoords) {
        const originCoordinates = await geocodeAddress(request.origin);
        setOriginCoords(originCoordinates);
      }
      
      if (request.destination && !destinationCoords) {
        const destinationCoordinates = await geocodeAddress(request.destination);
        setDestinationCoords(destinationCoordinates);
      }
      
      if (!silent) setIsLoading(false);
    } catch (err) {
      console.error('[DetalhesViagemMotorista] Erro ao carregar viagem:', err);
      if (!silent) {
        setError('Erro ao carregar dados da viagem. Tente recarregar a página.');
        setIsLoading(false);
      }
    }
  };

  const handleGenerateShareLink = async () => {
    setIsGeneratingLink(true);
    setError('');

    try {
      const response = await base44.functions.invoke('generateSharedTimelineLink', {
        serviceRequestId: serviceRequest.id,
        notificationType: 'both',
        autoGenerated: false
      });

      if (response.data.success) {
        setSharedTimelineUrl(response.data.timelineUrl);
        setSuccess(response.data.isNewLink 
          ? '✅ Link gerado e enviado para o passageiro!' 
          : '✅ Link reenviado para o passageiro!');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        throw new Error(response.data.error || 'Erro ao gerar link');
      }
    } catch (err) {
      setError(err.message || 'Erro ao gerar link de compartilhamento');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharedTimelineUrl)
      .then(() => {
        setSuccess('✅ Link copiado!');
        setTimeout(() => setSuccess(''), 3000);
      })
      .catch((err) => {
        console.error('Erro ao copiar link:', err);
        setError('Não foi possível copiar o link automaticamente.');
      });
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `🚗 *Acompanhe sua viagem em tempo real!*\n\nViagem ${serviceRequest.request_number}\n\n${sharedTimelineUrl}`
    );
    BrowserService.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleAddToGoogleCalendar = async () => {
    setIsGeneratingCalendarLink(true);
    setError('');

    try {
      const response = await base44.functions.invoke('generateGoogleCalendarLink', {
        serviceRequestId: serviceRequest.id,
        token
      });

      if (response.data.success) {
        BrowserService.open(response.data.calendarUrl, '_blank');
        setSuccess('✅ Abrindo Google Agenda...');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(response.data.error || 'Erro ao gerar link do Google Calendar');
      }
    } catch (err) {
      setError(err.message || 'Erro ao adicionar ao Google Calendar');
    } finally {
      setIsGeneratingCalendarLink(false);
    }
  };

  const requestGPSPermission = async () => {
    if (!GeoService.isAvailable()) {
      setError('Seu dispositivo não suporta geolocalização');
      setShowGpsAlert(true);
      return false;
    }

    try {
      await GeoService.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000,
      });
      setGpsPermissionGranted(true);
      setGpsPermissionDenied(false);
      setShowGpsAlert(false);
      localStorage.setItem('gps_permission_granted', 'true');
      setSuccess('✅ Permissão de GPS concedida! Rastreamento iniciado.');
      setTimeout(() => setSuccess(''), 3000);
      return true;
    } catch (err) {
      console.error('[GPS] Erro ao solicitar permissão:', err);
      setGpsPermissionGranted(false);
      setGpsPermissionDenied(true);
      setShowGpsAlert(true);
      localStorage.setItem('gps_permission_granted', 'false');
      return false;
    }
  };



  const updateStatusMutation = useMutation({
  mutationFn: async ({ newStatus, latitude, longitude }) => {
    // Retry logic wrapper manually since useMutation retry config is sometimes limited
    let attempts = 0;
    while (attempts < 3) {
        try {
            const response = await base44.functions.invoke('updateTripStatus', {
              serviceRequestId: serviceRequest.id,
              token,
              newStatus,
              location_lat: latitude,
              location_lon: longitude
            });
            return response.data;
        } catch (error) {
            attempts++;
            // Retry only on 404 (deployment issue/cold start) or 500 (timeout/cpu)
            // base44 sdk error response might wrap status
            console.warn(`[updateTripStatus] Attempt ${attempts} failed:`, error);
            if (attempts >= 3) throw error;
            await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
        }
    }
  },
  retry: 2, // Also enable React Query retry
  onSuccess: (data) => {
    if (data.success) {
      setServiceRequest(prev => ({
        ...prev,
        driver_trip_status: data.newStatus,
        driver_trip_status_updated_at: new Date().toISOString(),
        // Atualiza o histórico localmente se retornado pelo backend, ou recarrega a viagem
        command_history: data.trip?.command_history || prev.command_history
      }));
      setSuccess('Status atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
      // Recarregar detalhes para garantir sincronia do histórico
      loadTripDetails(token, true);
    }
  },
  onError: (error) => {
    setError(error.message || 'Erro ao atualizar status');
  }
  });

  const handleStatusUpdate = async (newStatus) => {
  const isFirstCommand = serviceRequest.driver_trip_status === 'aguardando';
  const safetyAlertKey = `safety_alert_shown_${serviceRequest.id}`;
  const hasShownSafetyAlert = localStorage.getItem(safetyAlertKey) === 'true';

  // Obter localização atual antes de enviar
  let currentLat = null;
  let currentLon = null;

  try {
    if (GeoService.isAvailable()) {
      const position = await GeoService.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000,
      });
      currentLat = position.coords.latitude;
      currentLon = position.coords.longitude;
    }
  } catch (err) {
    console.warn('Não foi possível obter localização exata para o comando:', err);
    // Fallback para última localização conhecida
    if (serviceRequest.current_location_lat && serviceRequest.current_location_lon) {
      currentLat = serviceRequest.current_location_lat;
      currentLon = serviceRequest.current_location_lon;
    }
  }

  // Status que requerem o diálogo de despesas antes de finalizar
  if (newStatus === 'chegou_destino' || newStatus === 'no_show') {
    setIsUpdatingStatus(true);
    setError('');
    try {
      await updateStatusMutation.mutateAsync({ newStatus, latitude: currentLat, longitude: currentLon });
      setShowExpensesDialog(true);
    } catch (err) {
      console.error('[handleStatusUpdate] Erro ao atualizar status:', err);
      setError(err.message || 'Erro ao atualizar status');
    } finally {
      setIsUpdatingStatus(false);
    }
    return;
  }

  if (newStatus === 'parada_adicional') {
    setShowAdditionalStopDialog(true);
    return;
  }

  setIsUpdatingStatus(true);
  setError('');
  try {
    await updateStatusMutation.mutateAsync({ newStatus, latitude: currentLat, longitude: currentLon });

    if (isFirstCommand && !hasShownSafetyAlert) {
      setShowSafetyAlert(true);
      localStorage.setItem(safetyAlertKey, 'true');

      setTimeout(() => {
        setShowSafetyAlert(false);
      }, 5000);
    }
      
      if (newStatus === 'a_caminho') {
        setAutoDetectionEnabled(true);
        handleOpenNavigation(serviceRequest.origin);
      }

      if (newStatus === 'passageiro_embarcou' || newStatus === 'a_caminho_destino') {
        setAutoDetectionEnabled(true);
        handleOpenNavigation(serviceRequest.destination);
      }
    } catch (err) {
      console.error('[handleStatusUpdate] Erro ao atualizar status:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Erro ao atualizar status. Por favor, tente novamente.';
      setError(errorMessage);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveAdditionalStop = async () => {
    if (!additionalStopNotes.trim()) {
      setError('Por favor, informe os detalhes da parada adicional');
      return;
    }

    setIsUpdatingStatus(true);
    setError('');

    // Obter localização atual antes de enviar
    let currentLat = null;
    let currentLon = null;

    try {
      if (GeoService.isAvailable()) {
        const position = await GeoService.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 5000,
        });
        currentLat = position.coords.latitude;
        currentLon = position.coords.longitude;
      }
    } catch (err) {
      console.warn('Não foi possível obter localização exata para a parada:', err);
      // Fallback para última localização conhecida
      if (serviceRequest.current_location_lat && serviceRequest.current_location_lon) {
        currentLat = serviceRequest.current_location_lat;
        currentLon = serviceRequest.current_location_lon;
      }
    }

    try {
      const response = await base44.functions.invoke('updateTripStatus', {
        serviceRequestId: serviceRequest.id,
        token,
        newStatus: 'parada_adicional',
        notes: additionalStopNotes.trim(),
        location_lat: currentLat,
        location_lon: currentLon
      });

      if (response.data.success) {
        // Recarregar os detalhes para obter o endereço resolvido pelo backend
        loadTripDetails(token, true);
        
        setSuccess('Parada adicional registrada!');
        setShowAdditionalStopDialog(false);
        setAdditionalStopNotes('');
        setSwipeResetKey(prev => prev + 1); // Reseta o botão de swipe
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao registrar parada adicional');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddExpense = () => {
    setExpenseError('');

    let newExpense = {
      type: currentExpense.type,
      receipt_url: currentExpense.receipt_url || null
    };

    // Tratamento robusto para valores numéricos (aceita vírgula)
    const parseValue = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        return parseFloat(val.toString().replace(',', '.'));
    };

    if (currentExpense.type === 'hora_espera') {
      if (!currentExpense.quantity_minutes || parseValue(currentExpense.quantity_minutes) <= 0) {
        setExpenseError('Informe a quantidade de minutos de espera');
        return null;
      }
      newExpense.quantity_minutes = parseInt(currentExpense.quantity_minutes);
    } else {
      const val = parseValue(currentExpense.value);
      if (!val || val <= 0) {
        setExpenseError('Informe o valor da despesa');
        return null;
      }
      newExpense.value = val;
      
      if (currentExpense.type === 'outros') {
        if (!currentExpense.description.trim()) {
          setExpenseError('Informe a descrição da despesa');
          return null;
        }
        newExpense.description = currentExpense.description.trim();
      }
    }

    setAdditionalExpenses(prev => [...prev, newExpense]);
    setCurrentExpense({
      type: 'estacionamento',
      value: '',
      quantity_minutes: '',
      description: '',
      receipt_url: ''
    });
    setExpenseError('');
    return newExpense;
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setExpenseError('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setExpenseError('Formato inválido. Apenas Imagens e PDF.');
      return;
    }

    setIsUploadingReceipt(true);
    setExpenseError('');

    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      if (response && response.file_url) {
        setCurrentExpense(prev => ({ ...prev, receipt_url: response.file_url }));
      } else {
        throw new Error('Falha no upload');
      }
    } catch (err) {
      console.error('Erro no upload do recibo:', err);
      setExpenseError('Erro ao enviar recibo. Tente novamente.');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleRemoveExpense = (index) => {
    setAdditionalExpenses(additionalExpenses.filter((_, i) => i !== index));
  };

  const handleConfirmFinalization = async () => {
    if (!serviceRequest || !serviceRequest.id) {
      setExpenseError('Erro: Dados da viagem não encontrados. Por favor, recarregue a página.');
      return;
    }

    if (!token) {
      setExpenseError('Erro: Token de autenticação não encontrado. Por favor, recarregue a página.');
      return;
    }

    if (hasAdditionalExpenses === null) {
      setExpenseError('Por favor, indique se houve despesas adicionais');
      return;
    }

    // Verificação inteligente: Se o usuário preencheu os campos mas esqueceu de clicar em "Adicionar"
    let finalExpenses = [...additionalExpenses];
    
    if (hasAdditionalExpenses && additionalExpenses.length === 0) {
      // Verifica se há dados preenchidos no formulário atual
      const hasPendingData = currentExpense.value || (currentExpense.type === 'hora_espera' && currentExpense.quantity_minutes);
      
      if (hasPendingData) {
        // Tenta adicionar automaticamente
        const autoAdded = handleAddExpense(); // Modificado para retornar a nova despesa ou null
        if (autoAdded) {
           finalExpenses.push(autoAdded);
        } else {
           // Se falhou validação (ex: valor zero)
           return; 
        }
      } else {
        setExpenseError('Adicione pelo menos uma despesa ou selecione "Não"');
        return;
      }
    }

    setIsUpdatingStatus(true);
    setError('');
    setExpenseError('');

    try {
      const payload = {
        serviceRequestId: serviceRequest.id,
        token: token,
        hasAdditionalExpenses: hasAdditionalExpenses || false,
        additionalExpenses: hasAdditionalExpenses ? finalExpenses : []
      };

      const response = await base44.functions.invoke('finalizeDriverTrip', payload);

      if (response.data.success) {
        setServiceRequest(prev => ({
          ...prev,
          driver_trip_status: response.data.newStatus,
          driver_trip_status_updated_at: new Date().toISOString(),
          driver_reported_additional_expenses: hasAdditionalExpenses ? additionalExpenses : [],
          status: response.data.serviceStatus
        }));
        
        setShowExpensesDialog(false);
        setSuccess(hasAdditionalExpenses 
          ? 'Viagem finalizada! Aguardando revisão do fornecedor sobre as despesas adicionais.' 
          : 'Viagem finalizada com sucesso!');
        
        if (watchId) {
          GeoService.clearWatch(watchId);
          setWatchId(null);
        }
        setAutoDetectionEnabled(false);

        setTimeout(() => {
          navigate(createPageUrl('DashboardMotorista'));
        }, 2000);
      } else {
        throw new Error(response.data.error || 'Erro ao finalizar viagem');
      }
    } catch (err) {
      console.error('[handleConfirmFinalization] Erro:', err);
      setExpenseError(err.response?.data?.error || err.message || 'Erro ao finalizar viagem. Por favor, tente novamente.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const startContinuousTracking = async () => {
    if (!GeoService.isAvailable()) {
      setError('Seu dispositivo não suporta geolocalização');
      setShowGpsAlert(true);
      return;
    }

    // Tentar obter localização inicial primeiro (mais tolerante)
    GeoService.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    }).then((position) => {
      console.log('[GPS] Localização inicial obtida com sucesso');
      updateLocationState(position);
    }).catch((error) => {
      console.warn('[GPS] Erro na localização inicial:', error.message);
      // Continuar mesmo sem sucesso inicial
    });

    // Usar background tracking para motoristas — mantém GPS mesmo com app minimizado
    const id = await GeoService.startBackgroundTracking(
      async (position) => {
        await updateLocationState(position);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        backgroundMessage: 'Rastreamento de viagem ativo',
        backgroundTitle: 'TransferOnline',
        distanceFilter: 10,
      }
    ).catch(async (err) => {
      console.error('[GPS] Erro ao rastrear localização:', err);

      // Não desistir imediatamente - pode ser timeout temporário
      if (err.code === 3) { // TIMEOUT
        console.warn('[GPS] Timeout - tentando novamente...');
        return null;
      }

      // Permissão negada ou erro de localização
      setGpsPermissionGranted(false);
      setGpsPermissionDenied(true);
      setShowGpsAlert(true);
      localStorage.setItem('gps_permission_granted', 'false');

      // Notificar backend que GPS está desabilitado (para alertar admin)
      try {
        await base44.functions.invoke('updateDriverLocation', {
          serviceRequestId: serviceRequest.id,
          token,
          latitude: null,
          longitude: null,
          gpsDisabled: true
        });
      } catch (notifyErr) {
        console.error('[GPS] Erro ao notificar backend:', notifyErr);
      }
      return null;
    });

    if (id !== null && id !== undefined) {
      setWatchId(id);
    }
  };

  const updateLocationState = async (position) => {
    try {
      // Permissão concedida com sucesso
      setGpsPermissionGranted(true);
      setGpsPermissionDenied(false);
      setShowGpsAlert(false);

      // Capturar heading (direção) e speed (velocidade) se disponíveis
      const heading = position.coords.heading;
      const speed = position.coords.speed;

      // Atualizar UI imediatamente (Otimistic UI)
      setServiceRequest(prev => ({
        ...prev,
        current_location_lat: position.coords.latitude,
        current_location_lon: position.coords.longitude,
        current_heading: heading,
        current_speed: speed,
        location_last_updated_at: new Date().toISOString()
      }));

      // Enviar para backend em background (não bloqueia UI)
      base44.functions.invoke('updateDriverLocation', {
        serviceRequestId: serviceRequest.id,
        token,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: heading,
        speed: speed
      }).catch(err => console.error('[GPS] Erro ao sincronizar backend:', err));

      if (autoDetectionEnabled) {
        if (originCoords && serviceRequest.driver_trip_status === 'a_caminho') {
          const distToOrigin = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            originCoords.lat,
            originCoords.lng
          );
          setDistanceToOrigin(distToOrigin);

          if (distToOrigin <= 100 && serviceRequest.driver_trip_status === 'a_caminho') {
            await updateStatusMutation.mutateAsync('chegou_origem');
            setSuccess('🎯 Chegada à origem detectada automaticamente!');
            setTimeout(() => setSuccess(''), 5000);
          }
        }

        if (destinationCoords && serviceRequest.driver_trip_status === 'passageiro_embarcou') {
          const distToDestination = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            destinationCoords.lat,
            destinationCoords.lng
          );
          setDistanceToDestination(distToDestination);

          if (distToDestination <= 100) {
            await updateStatusMutation.mutateAsync('chegou_destino');
            setShowExpensesDialog(true);
            setSuccess('🎯 Chegada ao destino detectada automaticamente!');
            setTimeout(() => setSuccess(''), 5000);
            setAutoDetectionEnabled(false);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao rastrear localização:', err);
    }
  };

  const stopContinuousTracking = () => {
    if (watchId) {
      GeoService.stopBackgroundTracking(watchId);
      setWatchId(null);
    }
    setAutoDetectionEnabled(false);
  };

  // Verificar e solicitar GPS automaticamente quando necessário
  useEffect(() => {
    const shouldTrack = serviceRequest?.gps_tracking_enabled && 
                        ['a_caminho', 'passageiro_embarcou', 'a_caminho_destino', 'parada_adicional'].includes(serviceRequest.driver_trip_status);
    
    if (shouldTrack) {
      // Se não tiver watchId ativo, tentar iniciar rastreamento
      if (!watchId) {
        // Verificar se tem permissão
        if (gpsPermissionGranted) {
          startContinuousTracking();
        } else {
          // Solicitar permissão UMA ÚNICA VEZ automaticamente
          requestGPSPermission().then(granted => {
            if (granted) {
              startContinuousTracking();
            }
          });
        }
      }
    } else if (watchId && !shouldTrack) {
      // Parar rastreamento se não for mais necessário
      stopContinuousTracking();
    }

    return () => {
      if (watchId) {
        GeoService.stopBackgroundTracking(watchId);
      }
    };
  }, [serviceRequest?.driver_trip_status, serviceRequest?.gps_tracking_enabled, gpsPermissionGranted]);

  const getStatusConfig = (status) => {
    const configs = {
      aguardando: { label: 'Aguardando', color: 'bg-gray-700 text-white', icon: Clock, step: 0 },
      a_caminho: { label: 'A Caminho da Origem', color: 'bg-blue-600 text-white', icon: Navigation, step: 1 },
      chegou_origem: { label: 'Na Origem', color: 'bg-indigo-600 text-white', icon: MapPin, step: 2 },
      passageiro_embarcou: { label: 'Em Viagem', color: 'bg-purple-600 text-white', icon: Users, step: 3 },
      parada_adicional: { label: 'Parada Adicional', color: 'bg-orange-600 text-white', icon: PauseCircle, step: 3 },
      chegou_destino: { label: 'No Destino', color: 'bg-green-600 text-white', icon: MapPin, step: 4 },
      aguardando_confirmacao_despesas: { label: 'Aguardando', color: 'bg-yellow-600 text-white', icon: DollarSign, step: 4 },
      finalizada: { label: 'Finalizada', color: 'bg-emerald-600 text-white', icon: CheckCircle, step: 5 },
      no_show: { label: 'Não Compareceu', color: 'bg-red-600 text-white', icon: AlertCircle, step: 5 },
      cancelada_motorista: { label: 'Cancelada', color: 'bg-red-600 text-white', icon: AlertCircle, step: 5 }
    };
    return configs[status] || configs.aguardando;
  };

  const getNextStatusOptions = (currentStatus) => {
    const statusFlow = {
      aguardando: ['a_caminho'],
      a_caminho: ['chegou_origem'],
      chegou_origem: ['passageiro_embarcou', 'no_show'],
      passageiro_embarcou: ['parada_adicional', 'chegou_destino'],
      a_caminho_destino: ['parada_adicional', 'chegou_destino'],
      parada_adicional: ['a_caminho_destino', 'chegou_destino'],
      chegou_destino: [],
      aguardando_confirmacao_despesas: []
    };
    return statusFlow[currentStatus] || [];
  };

  const getExpenseTypeLabel = (type) => {
    const labels = {
      estacionamento: 'Estacionamento',
      pedagio: 'Pedágio',
      hora_espera: 'Hora Parada/Espera',
      outros: 'Outros'
    };
    return labels[type] || type;
  };

  const calculateExpensesTotal = () => {
    return additionalExpenses.reduce((total, expense) => {
      if (expense.type === 'hora_espera') {
        return total;
      }
      return total + (parseFloat(expense.value) || 0);
    }, 0);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const parseLocalDate = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const handleOpenNavigation = async (destination) => {
    // Force start tracking if not active (CRITICAL: Always start tracking for telemetry)
    if (!watchId && gpsPermissionGranted) {
      startContinuousTracking();
    } else if (!gpsPermissionGranted) {
      // Try to request permissions before opening external app
      const granted = await requestGPSPermission();
      if (granted) startContinuousTracking();
    }

    if (preferredMap === 'waze') {
      // Tentar obter coordenadas para maior precisão
      const coords = await geocodeAddress(destination);
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        // Usar esquema waze:// para forçar abertura do app em mobile
        if (coords) {
          window.location.href = `waze://?ll=${coords.lat},${coords.lng}&navigate=yes`;
        } else {
          window.location.href = `waze://?q=${encodeURIComponent(destination)}&navigate=yes`;
        }
      } else {
        // Fallback para web em desktop
        let url = '';
        if (coords) {
          url = `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`;
        } else {
          url = `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`;
        }
        BrowserService.open(url, '_blank');
      }
    } else if (preferredMap === 'google_maps') {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
      BrowserService.open(url, '_blank');
    } else {
      // Internal Map
      setPendingNavigationDestination(destination);
      setShowInternalNavigation(true);
    }
  };

  const handleSaveMapPreference = (type) => {
    setPreferredMap(type);
    localStorage.setItem('driver_preferred_map_app', type);
    setSuccess(`Preferência de navegação salva: ${type === 'internal' ? 'Mapa do App' : type === 'waze' ? 'Waze' : 'Google Maps'}`);
    setTimeout(() => setSuccess(''), 3000);
    setShowSettingsDialog(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error && !serviceRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white border-red-200 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Erro</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!serviceRequest) {
    return null;
  }

  if (showInternalNavigation) {
    // Preparar localização do motorista (pode ser null/inválida inicialmente)
    const hasValidLocation = serviceRequest.current_location_lat && 
                            serviceRequest.current_location_lon &&
                            !isNaN(serviceRequest.current_location_lat) &&
                            !isNaN(serviceRequest.current_location_lon);
    
    return (
      <DriverNavigationMap
        origin={serviceRequest.origin}
        destination={pendingNavigationDestination || serviceRequest.destination}
        driverLocation={hasValidLocation ? {
          lat: serviceRequest.current_location_lat,
          lng: serviceRequest.current_location_lon,
          heading: serviceRequest.current_heading
        } : null}
        onClose={() => setShowInternalNavigation(false)}
      />
    );
  }

  const statusConfig = getStatusConfig(serviceRequest.driver_trip_status);
  const StatusIcon = statusConfig.icon;
  const nextStatusOptions = getNextStatusOptions(serviceRequest.driver_trip_status);
  const isFinished = ['finalizada', 'no_show', 'cancelada_motorista'].includes(serviceRequest.driver_trip_status);
  const isArrivalAtAirport = serviceRequest?.origin?.toLowerCase().includes('aeroporto') || 
                              serviceRequest?.origin?.toLowerCase().includes('airport') ||
                              serviceRequest?.origin?.toLowerCase().includes('gru') ||
                              serviceRequest?.origin?.toLowerCase().includes('cgh') ||
                              serviceRequest?.origin?.toLowerCase().includes('vcp');

  // Determine planned stops (handling both ServiceRequest planned_stops and EventTrip additional_stops)
  const stopsToDisplay = serviceRequest.planned_stops && serviceRequest.planned_stops.length > 0 
    ? serviceRequest.planned_stops 
    : (serviceRequest.additional_stops && serviceRequest.additional_stops.length > 0 && !serviceRequest.additional_stops[0].timestamp 
        ? serviceRequest.additional_stops 
        : []);

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-4">
      {/* Componente de Telemetria (Invisível ou Discreto) */}
      {serviceRequest && (
        <TelemetryTracker 
          isTracking={isTrackingActive} 
          driverId={serviceRequest.driver_id} 
          tripId={serviceRequest.id}
        />
      )}

      {/* HEADER SIMPLIFICADO */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-sm font-semibold text-gray-500">{(serviceRequest.trip_code || serviceRequest.name || serviceRequest.request_number || '').split('-')[0].trim()}</div>
              <Badge className={`${statusConfig.color} text-xs px-2 py-1 shadow-none border-0`}>
                {statusConfig.label}
              </Badge>
            </div>
            {!isFinished && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettingsDialog(true)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <Menu className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => setShowShareDialog(true)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <Share2 className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={handleAddToGoogleCalendar}
                  disabled={isGeneratingCalendarLink}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  {isGeneratingCalendarLink ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-700" />
                  ) : (
                    <CalendarPlus className="w-4 h-4 text-gray-700" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ALERTAS */}
      <div className="max-w-2xl mx-auto px-4 pt-3 space-y-3">
        {success && (
          <Alert className="bg-green-900/30 border-green-700">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300 text-sm">{success}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert className="bg-red-900/30 border-red-700">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300 text-sm">{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Alerta Persistente de GPS Desabilitado */}
        {showGpsAlert && gpsPermissionDenied && ['a_caminho', 'passageiro_embarcou'].includes(serviceRequest?.driver_trip_status) && (
          <Alert className="bg-red-900/40 border-2 border-red-500 animate-pulse">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <AlertDescription className="text-red-200">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="font-bold text-base mb-1">📍 Localização Desabilitada</p>
                  <p className="text-sm">O rastreamento em tempo real não está funcionando. Habilite a localização para que o cliente acompanhe a viagem.</p>
                </div>
                <Button
                  onClick={async () => {
                    const granted = await requestGPSPermission();
                    if (granted) {
                      startContinuousTracking();
                    }
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 font-bold"
                  size="sm"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Habilitar Localização Agora
                </Button>
                <p className="text-xs text-red-300">
                  ⚠️ Se o botão não funcionar, vá em Configurações do navegador → Privacidade → Localização
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-3 mt-4">
        {/* BOTÃO DE AÇÃO PRINCIPAL - DESLIZAR PARA CONFIRMAR */}
        {nextStatusOptions.length > 0 && !isFinished && (
          <div className="space-y-2">
            {nextStatusOptions.map((nextStatus) => {
              const config = getStatusConfig(nextStatus);
              let label = config.label;
              let icon = config.icon;
              let color = config.color;

              // Customização para "Retomar Viagem"
              if (serviceRequest.driver_trip_status === 'parada_adicional' && nextStatus === 'a_caminho_destino') {
                label = 'Retomar Viagem';
                icon = Navigation;
                color = 'bg-blue-600 text-white';
              }

              return (
                <SwipeableButton
                  key={`${nextStatus}-${swipeResetKey}`}
                  onConfirm={() => handleStatusUpdate(nextStatus)}
                  label={label}
                  color={color}
                  icon={icon}
                  disabled={isUpdatingStatus || !isCommandButtonsEnabled}
                  isLoading={isUpdatingStatus}
                  subLabel={!isCommandButtonsEnabled ? "Liberado 4h antes da viagem" : ""}
                />
              );
            })}
          </div>
        )}

        {/* BOTÃO PARA RETOMAR FINALIZAÇÃO (CASO TENHA FECHADO O MODAL DE DESPESAS) */}
        {(serviceRequest.driver_trip_status === 'chegou_destino' || serviceRequest.driver_trip_status === 'no_show') && !isFinished && (
          <div className="mt-2 space-y-2">
            <Alert className="bg-blue-900/20 border-blue-800">
              <Info className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-200 text-sm">
                Você chegou ao destino. Clique abaixo para informar despesas e finalizar.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => setShowExpensesDialog(true)}
              className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg animate-pulse"
            >
              <CheckCircle className="w-6 h-6 mr-2" />
              Finalizar Viagem
            </Button>
          </div>
        )}

        {/* DATA E HORÁRIO - COMPACTO */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Data</div>
              <div className="text-base font-bold text-gray-900">
                {parseLocalDate(serviceRequest.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Horário</div>
              <div className="text-base font-bold text-gray-900">{serviceRequest.time}</div>
            </div>
          </div>
        </div>

        {/* ALERTA DE RECEPTIVO (SE NECESSÁRIO) */}
        {serviceRequest.is_receptive_needed && (
          <div className={`rounded-xl p-4 mb-3 border-l-4 shadow-sm ${
            serviceRequest.receptive_performed_by === 'driver' 
              ? 'bg-indigo-50 border-indigo-500' 
              : 'bg-white border-gray-300'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${
                serviceRequest.receptive_performed_by === 'driver' ? 'bg-indigo-100' : 'bg-gray-100'
              }`}>
                <ImageIcon className={`w-5 h-5 ${serviceRequest.receptive_performed_by === 'driver' ? 'text-indigo-600' : 'text-gray-600'}`} />
              </div>
              <div className="flex-1">
                <h3 className={`text-sm font-bold uppercase mb-1 ${
                  serviceRequest.receptive_performed_by === 'driver' ? 'text-indigo-700' : 'text-gray-500'
                }`}>
                  Instruções de Receptivo
                </h3>
                
                <div className="text-gray-900 font-medium mb-2">
                  Responsável: <span className="font-bold text-lg ml-1 text-gray-900">
                    {serviceRequest.receptive_performed_by === 'driver' ? 'VOCÊ (MOTORISTA)' :
                     serviceRequest.receptive_performed_by === 'contracted_company' ? 'Empresa Contratada' : 
                     'Outros Meios'}
                  </span>
                </div>

                {serviceRequest.receptive_performed_by === 'driver' && (
                  <div className="bg-white rounded p-3 mb-3 border border-indigo-100 shadow-sm">
                    <p className="text-sm text-indigo-800 flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-indigo-600" />
                      Você deve aguardar o passageiro com a placa de identificação.
                    </p>
                  </div>
                )}

                {serviceRequest.receptive_notes && (
                  <p className="text-sm text-gray-600 mb-3 italic">
                    "{serviceRequest.receptive_notes}"
                  </p>
                )}

                {(serviceRequest.receptive_performed_by === 'driver' || serviceRequest.receptive_performed_by === 'contracted_company') && serviceRequest.receptive_sign_url && (
                  <Button
                    onClick={() => BrowserService.open(serviceRequest.receptive_sign_url, '_blank')}
                    size="sm"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visualizar/Baixar Placa
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* INFORMAÇÕES DE VOO (SE HOUVER) */}
        {(serviceRequest.origin_flight_number || serviceRequest.destination_flight_number || serviceRequest.event_origin_flight_number || serviceRequest.event_destination_flight_number) && (
          <div className="grid grid-cols-1 gap-3">
            {(serviceRequest.origin_flight_number || serviceRequest.event_origin_flight_number) && (
              <div className="bg-white border border-blue-100 shadow-sm rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Plane className="w-5 h-5 text-blue-600 rotate-90" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Voo de Chegada (Origem)</div>
                  <div className="text-sm font-bold text-gray-900">
                    {serviceRequest.event_origin_airline && <span className="font-normal text-gray-600 mr-1">{serviceRequest.event_origin_airline}</span>}
                    {serviceRequest.origin_flight_number || serviceRequest.event_origin_flight_number}
                  </div>
                </div>
              </div>
            )}
            {(serviceRequest.destination_flight_number || serviceRequest.event_destination_flight_number) && (
              <div className="bg-white border border-green-100 shadow-sm rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <Plane className="w-5 h-5 text-green-600 -rotate-45" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Voo de Partida (Destino)</div>
                  <div className="text-sm font-bold text-gray-900">
                    {serviceRequest.event_destination_airline && <span className="font-normal text-gray-600 mr-1">{serviceRequest.event_destination_airline}</span>}
                    {serviceRequest.destination_flight_number || serviceRequest.event_destination_flight_number}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ORIGEM - ESTILO UBER */}
        <button
          onClick={() => handleOpenNavigation(serviceRequest.origin)}
          className="w-full bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 active:scale-[0.99] transition-all group"
        >
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-blue-200 shadow-md">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-xs text-gray-400 font-bold uppercase mb-0.5 tracking-wide">Origem</div>
            <div className="text-sm font-bold text-gray-900 leading-tight group-hover:text-blue-700 transition-colors break-words">
              {serviceRequest.origin}
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-gray-300 group-hover:text-blue-600 flex-shrink-0 transition-colors" />
        </button>

        {/* PARADAS PLANEJADAS */}
        {stopsToDisplay && stopsToDisplay.length > 0 && (
          <div className="space-y-3 relative before:absolute before:left-10 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-200 before:-z-10 py-1">
            {stopsToDisplay.map((stop, index) => (
              <button
                key={index}
                onClick={() => handleOpenNavigation(stop.address)}
                className="w-full bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border border-orange-100 active:scale-[0.99] transition-all group ml-4 w-[calc(100%-1rem)]"
              >
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-orange-200 shadow-md">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-xs text-orange-600 font-bold uppercase mb-0.5 tracking-wide">Parada {index + 1}</div>
                  <div className="text-sm font-bold text-gray-900 leading-tight break-words">
                    {stop.address}
                  </div>
                  {stop.notes && <div className="text-xs text-gray-500 italic mt-1">{stop.notes}</div>}
                </div>
                <ExternalLink className="w-5 h-5 text-gray-300 group-hover:text-orange-600 flex-shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* DESTINO FINAL - ESTILO UBER */}
        <button
          onClick={() => handleOpenNavigation(serviceRequest.destination)}
          className="w-full bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 active:scale-[0.99] transition-all group"
        >
          <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-green-200 shadow-md">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-xs text-gray-400 font-bold uppercase mb-0.5 tracking-wide">Destino Final</div>
            <div className="text-sm font-bold text-gray-900 leading-tight group-hover:text-green-700 transition-colors break-words">
              {serviceRequest.destination}
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-gray-300 group-hover:text-green-600 flex-shrink-0 transition-colors" />
        </button>

        {/* PASSAGEIRO */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase font-bold tracking-wide">Passageiro</div>
                <div className="text-base font-bold text-gray-900">{serviceRequest.passenger_name}</div>
                {serviceRequest.tags && serviceRequest.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {serviceRequest.tags.map((tag, i) => (
                            <span key={i} className="text-[10px] font-bold bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 uppercase">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
              </div>
            </div>
            <Badge className="bg-purple-50 text-purple-700 border-purple-100 text-xs px-2.5 py-0.5">
              {serviceRequest.passengers} pax
            </Badge>
          </div>

          {/* Lista de Passageiros Extras (se houver, e suas tags) */}
          {serviceRequest.passengers_details && serviceRequest.passengers_details.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Outros Passageiros</p>
                  <div className="space-y-2">
                      {serviceRequest.passengers_details.filter(p => !p.is_lead_passenger).map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                              <User className="w-3 h-3 text-gray-400" />
                              <span>{p.name}</span>
                              {p.tags && p.tags.length > 0 && (
                                  <div className="flex gap-1">
                                      {p.tags.map((t, ti) => (
                                          <span key={ti} className="text-[9px] bg-gray-100 px-1 rounded">{t}</span>
                                      ))}
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* ITENS ADICIONAIS / CARACTERÍSTICAS ESPECIAIS */}
          {((serviceRequest.additional_items && serviceRequest.additional_items.length > 0) || 
            (serviceRequest.selected_additional_items && serviceRequest.selected_additional_items.length > 0)) && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Itens Adicionais</p>
              <div className="space-y-2">
                {(serviceRequest.additional_items || serviceRequest.selected_additional_items).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                    <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 text-sm text-gray-800">
                      <span className="font-semibold">{item.quantity}x</span> {item.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {serviceRequest.passenger_phone && (
            <a
              href={`tel:${serviceRequest.passenger_phone}`}
              className="w-full flex items-center justify-center gap-2 p-3 bg-green-50 border-2 border-green-500 rounded-xl active:bg-green-100 transition-colors shadow-sm mt-3"
            >
              <Phone className="w-5 h-5 text-green-700" />
              <span className="font-bold text-green-800 text-lg">{serviceRequest.passenger_phone}</span>
            </a>
          )}

          {client && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl mt-3">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Empresa</div>
                <div className="text-sm font-semibold text-gray-700">{client.name}</div>
              </div>
            </div>
          )}
        </div>

        {/* OBSERVAÇÕES DA VIAGEM - LOGO APÓS PASSAGEIRO/EMPRESA */}
        {(() => {
          let notes = serviceRequest.notes || '';
          
          if (notes.includes('Otimizado por IA') || notes.includes('Veículo flexível criado por IA')) {
             const clean = notes
               .replace(/Otimizado por IA.*?(\.|$)/gi, '')
               .replace(/Veículo flexível criado por IA.*?(\.|$)/gi, '')
               .replace(/Criados \d+ grupos.*?(\.|$)/gi, '')
               .replace(/.*?passageiros com.*?(\.|$)/gi, '')
               .replace(/.*?janela total.*?(\.|$)/gi, '')
               .replace(/.*?passageiros agrupados.*?(\.|$)/gi, '')
               .replace(/.*?passageiros pré-atribuídos.*?(\.|$)/gi, '')
               .replace(/.*?mesmo destino.*?(\.|$)/gi, '')
               .replace(/.*?viagens individuais.*?(\.|$)/gi, '')
               .replace(/\.\./g, '.')
               .replace(/^[.,\s]+|[.,\s]+$/g, '')
               .trim();
             
             if (clean.length < 3) return null;
             notes = clean;
          }

          if (!notes) return null;

          return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-amber-700 font-bold uppercase mb-1">Observações da Viagem</div>
                  <p className="text-sm text-gray-800 leading-relaxed font-medium">{notes}</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* PLACA DE RECEPTIVO */}
        {isArrivalAtAirport && serviceRequest.receptive_sign_url && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="receptive" className="border border-indigo-200 rounded-xl bg-white shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline bg-indigo-50">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-indigo-900">Placa de Receptivo</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-4 bg-white">
                <div className="flex justify-center mb-3">
                  <img
                    src={serviceRequest.receptive_sign_url}
                    alt="Placa"
                    className="max-w-full h-auto max-h-80 object-contain rounded-lg border border-gray-100 shadow-sm"
                  />
                </div>
                <Button
                  onClick={() => BrowserService.open(serviceRequest.receptive_sign_url, '_blank')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base font-semibold"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Abrir / Baixar
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* PARADAS ADICIONAIS */}
        {serviceRequest.additional_stops && serviceRequest.additional_stops.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <PauseCircle className="w-5 h-5 text-orange-600" />
              <span className="font-bold text-orange-900 text-sm">
                Histórico de Paradas ({serviceRequest.additional_stops.length})
              </span>
            </div>
            <div className="space-y-2">
              {serviceRequest.additional_stops.map((stop, index) => {
                const isActive = stop.status === 'active';
                return (
                  <div key={index} className={`rounded-lg p-3 ${isActive ? 'bg-white border-2 border-orange-400 shadow-md' : 'bg-white border border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">
                        {stop.start_time && !isNaN(new Date(stop.start_time).getTime()) 
                          ? format(new Date(stop.start_time), "dd/MM HH:mm", { locale: ptBR })
                          : (stop.timestamp ? format(new Date(stop.timestamp), "dd/MM HH:mm", { locale: ptBR }) : `Ponto de Parada ${index + 1}`)}
                      </div>
                      {isActive ? (
                        <StopTimer startTime={stop.start_time} />
                      ) : (
                        stop.duration_minutes && (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] h-5">
                            {stop.duration_minutes} min
                          </Badge>
                        )
                      )}
                    </div>
                    <div className="text-sm text-gray-800">
                      {stop.address ? (
                        <>
                          <span className="font-semibold block mb-1">{stop.address}</span>
                          {stop.notes && <span className="block text-gray-500 text-xs italic bg-gray-50 p-1.5 rounded">{stop.notes}</span>}
                        </>
                      ) : (
                        stop.notes
                      )}
                    </div>
                    {isActive && (
                      <div className="mt-2 text-xs text-orange-600 font-bold flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Contabilizando tempo de espera...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* DIALOGS */}
      <Dialog open={showSafetyAlert} onOpenChange={setShowSafetyAlert}>
        <DialogContent className="max-w-md border-4 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="text-center py-6 space-y-4">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse shadow-2xl">
              <AlertCircle className="w-12 h-12 text-white" />
            </div>
            
            <div>
              <h3 className="text-2xl font-black text-red-700 mb-2">
                ⚠️ ATENÇÃO
              </h3>
              <p className="text-xl font-bold text-gray-900 leading-tight">
                Não use o celular ao dirigir!
              </p>
            </div>
            
            <div className="bg-white border-2 border-amber-400 rounded-lg p-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                Para sua segurança e de todos, <strong>pare o veículo</strong> antes de interagir com o aplicativo.
              </p>
            </div>
            
            <Button
              onClick={() => setShowSafetyAlert(false)}
              className="w-full h-14 text-lg font-bold bg-red-600 hover:bg-red-700 shadow-lg"
            >
              <CheckCircle className="w-6 h-6 mr-2" />
              Entendi
            </Button>
            
            <p className="text-xs text-gray-500">
              Esta mensagem fecha automaticamente em 5 segundos
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <Share2 className="w-6 h-6 text-blue-600" />
              Compartilhar Linha do Tempo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {sharedTimelineUrl ? (
              <>
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <AlertDescription className="text-green-800 font-semibold">
                    ✅ Link gerado e enviado para o passageiro!
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Label className="text-sm font-bold">Link de Acompanhamento:</Label>
                  <div className="flex gap-2">
                    <Input
                      value={sharedTimelineUrl}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    onClick={handleShareWhatsApp}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Enviar via WhatsApp
                  </Button>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-xs">
                    🔄 Este link atualiza automaticamente e expira quando você finalizar a viagem.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <>
                <Alert className="bg-blue-50 border-blue-300">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    🚗 Gere um link seguro para que o passageiro acompanhe a viagem em tempo real!
                  </AlertDescription>
                </Alert>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 mb-3">📋 O que o passageiro verá:</h4>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                      <span>Status da viagem em tempo real</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                      <span>Localização do motorista no mapa</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                      <span>Tempo estimado de chegada (ETA)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                      <span>Histórico completo da viagem</span>
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={handleGenerateShareLink}
                  disabled={isGeneratingLink}
                  className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isGeneratingLink ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Gerando Link...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-5 h-5 mr-2" />
                      Gerar e Enviar Link
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowShareDialog(false);
                setSharedTimelineUrl('');
              }}
              variant="outline"
              className="w-full"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <Dialog open={showAdditionalStopDialog} onOpenChange={setShowAdditionalStopDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <PauseCircle className="w-6 h-6 text-orange-600" />
              Registrar Parada Adicional
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-orange-50 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 text-sm">
                Registre os detalhes desta parada adicional. Esta informação será visível para o cliente e fornecedor.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="stop_notes" className="text-base font-bold">Detalhes da Parada *</Label>
              <Textarea
                id="stop_notes"
                value={additionalStopNotes}
                onChange={(e) => setAdditionalStopNotes(e.target.value)}
                placeholder="Ex: Parada em restaurante solicitada pelo passageiro..."
                className="h-32 text-base"
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2">
            <Button
              onClick={handleSaveAdditionalStop}
              disabled={isUpdatingStatus || !additionalStopNotes.trim()}
              className="w-full h-14 text-lg font-bold bg-orange-600 hover:bg-orange-700"
            >
              {isUpdatingStatus ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Confirmar Parada
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAdditionalStopDialog(false);
                setAdditionalStopNotes('');
                setSwipeResetKey(prev => prev + 1); // Reseta o botão de swipe ao cancelar
              }}
              className="w-full"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExpensesDialog} onOpenChange={setShowExpensesDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <span className="text-base sm:text-xl">Finalizar - Despesas</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {expenseError && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{expenseError}</AlertDescription>
              </Alert>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-semibold text-blue-900 mb-1 text-sm sm:text-base">
                ❓ Houve despesas adicionais?
              </p>
              <p className="text-xs sm:text-sm text-blue-800 mb-3">
                (Estacionamento, pedágio, horas de espera, etc.)
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    setHasAdditionalExpenses(true);
                    setExpenseError('');
                  }}
                  variant={hasAdditionalExpenses === true ? 'default' : 'outline'}
                  className={`h-10 sm:h-12 text-sm sm:text-base font-bold ${hasAdditionalExpenses === true ? 'bg-blue-600' : ''}`}
                >
                  Sim
                </Button>
                <Button
                  onClick={() => {
                    setHasAdditionalExpenses(false);
                    setAdditionalExpenses([]);
                    setExpenseError('');
                  }}
                  variant={hasAdditionalExpenses === false ? 'default' : 'outline'}
                  className={`h-10 sm:h-12 text-sm sm:text-base font-bold ${hasAdditionalExpenses === false ? 'bg-green-600' : ''}`}
                >
                  Não
                </Button>
              </div>
            </div>

            {hasAdditionalExpenses && (
              <>
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                    <Plus className="w-4 h-4" />
                    Adicionar Despesa
                  </h3>

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Tipo *</Label>
                    <select
                      value={currentExpense.type}
                      onChange={(e) => setCurrentExpense({ ...currentExpense, type: e.target.value, value: '', quantity_minutes: '', description: '' })}
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                    >
                      <option value="estacionamento">Estacionamento</option>
                      <option value="pedagio">Pedágio</option>
                      <option value="hora_espera">Hora Parada</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>

                  {currentExpense.type === 'hora_espera' ? (
                    <div className="space-y-2">
                      <Label htmlFor="quantity_minutes" className="text-xs sm:text-sm">Minutos *</Label>
                      <Input
                        id="quantity_minutes"
                        type="number"
                        min="1"
                        value={currentExpense.quantity_minutes}
                        onChange={(e) => setCurrentExpense({ ...currentExpense, quantity_minutes: e.target.value })}
                        placeholder="Ex: 30"
                        className="h-10 text-sm"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="value" className="text-xs sm:text-sm">Valor (R$) *</Label>
                      <Input
                        id="value"
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentExpense.value}
                        onChange={(e) => setCurrentExpense({ ...currentExpense, value: e.target.value })}
                        placeholder="0.00"
                        className="h-10 text-sm"
                      />
                    </div>
                  )}

                  {currentExpense.type === 'outros' && (
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-xs sm:text-sm">Descrição *</Label>
                      <Input
                        id="description"
                        value={currentExpense.description}
                        onChange={(e) => setCurrentExpense({ ...currentExpense, description: e.target.value })}
                        placeholder="Ex: Lavagem do veículo"
                        className="h-10 text-sm"
                      />
                    </div>
                  )}

                  {/* Upload de Recibo */}
                  {currentExpense.type !== 'hora_espera' && (
                    <div className="space-y-2">
                      <Label htmlFor="receipt" className="text-xs sm:text-sm flex items-center justify-between">
                        <span>Comprovante (Opcional)</span>
                        {currentExpense.receipt_url && <span className="text-green-600 text-xs font-bold">✓ Anexado</span>}
                      </Label>
                      
                      <div className="flex gap-2">
                        <label className={`flex-1 flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer transition-colors ${
                          currentExpense.receipt_url 
                            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleReceiptUpload}
                            className="hidden"
                            disabled={isUploadingReceipt}
                          />
                          {isUploadingReceipt ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                          ) : currentExpense.receipt_url ? (
                            <><FileText className="w-4 h-4 mr-2" /> Alterar Recibo</>
                          ) : (
                            <><Upload className="w-4 h-4 mr-2" /> Fazer Upload de Recibo</>
                          )}
                        </label>
                        
                        {currentExpense.receipt_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => setCurrentExpense(prev => ({ ...prev, receipt_url: '' }))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleAddExpense}
                    disabled={isUploadingReceipt}
                    className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>

                {additionalExpenses.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 text-sm">Despesas:</h3>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {additionalExpenses.map((expense, index) => (
                        <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-purple-100 text-purple-800 text-xs">
                                  {getExpenseTypeLabel(expense.type)}
                                </Badge>
                                {expense.receipt_url && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] gap-1 px-1.5 h-5">
                                    <FileText className="w-3 h-3" />
                                    Recibo
                                  </Badge>
                                )}
                              </div>
                              {expense.type === 'hora_espera' ? (
                                <div className="text-xs">
                                  <Timer className="w-3 h-3 inline mr-1 text-gray-400" />
                                  <span className="font-semibold">{expense.quantity_minutes}min</span>
                                </div>
                              ) : (
                                <div className="text-sm font-bold text-purple-700">
                                  {formatPrice(expense.value)}
                                </div>
                              )}
                              {expense.description && (
                                <p className="text-xs text-gray-600 mt-1 truncate">{expense.description}</p>
                              )}
                            </div>
                            <Button
                              onClick={() => handleRemoveExpense(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-blue-900 text-xs sm:text-sm">Total:</span>
                        <span className="text-lg sm:text-xl font-bold text-blue-700">
                          {formatPrice(calculateExpensesTotal())}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-blue-600 mt-1">
                        * Hora parada será calculada pelo fornecedor
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {hasAdditionalExpenses !== null && (
              <Alert className="bg-amber-50 border-amber-200 py-2">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                <AlertDescription className="text-xs sm:text-sm text-amber-800">
                  {hasAdditionalExpenses 
                    ? '⚠️ O fornecedor revisará as despesas.'
                    : '✅ Finalizar sem despesas adicionais.'}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 pt-3">
            <Button
              onClick={handleConfirmFinalization}
              disabled={isUpdatingStatus || hasAdditionalExpenses === null}
              className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700"
            >
              {isUpdatingStatus ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowExpensesDialog(false);
                setHasAdditionalExpenses(null);
                setAdditionalExpenses([]);
                setCurrentExpense({ type: 'estacionamento', value: '', quantity_minutes: '', description: '', receipt_url: '' });
                setExpenseError('');
              }}
              className="w-full h-10 text-sm"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              Atenção à Privacidade
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Por questões de privacidade, entre em contato com o passageiro apenas se for <strong>extremamente necessário</strong>.
            </p>
            <p className="text-gray-700 mt-2">
              Caso contrário, recomendamos contatar o fornecedor.
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowPrivacyModal(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setIsPhoneVisible(true);
                setShowPrivacyModal(false);
              }}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              Ver Telefone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG DE CONFIGURAÇÕES DE NAVEGAÇÃO */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <Navigation className="w-6 h-6" />
              Preferências de Navegação
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-600">
              Escolha qual aplicativo usar para navegar até os destinos da viagem. A telemetria continuará funcionando em segundo plano.
            </p>

            <div className="grid gap-3">
              <button
                onClick={() => handleSaveMapPreference('internal')}
                className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                  preferredMap === 'internal' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                  preferredMap === 'internal' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  <Navigation className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <div className={`font-bold ${preferredMap === 'internal' ? 'text-blue-900' : 'text-gray-700'}`}>
                    Mapa do Aplicativo
                  </div>
                  <div className="text-xs text-gray-500">
                    Navegação integrada sem sair do app
                  </div>
                </div>
                {preferredMap === 'internal' && <CheckCircle className="w-5 h-5 text-blue-600" />}
              </button>

              <button
                onClick={() => handleSaveMapPreference('waze')}
                className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                  preferredMap === 'waze' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                  preferredMap === 'waze' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <div className={`font-bold ${preferredMap === 'waze' ? 'text-blue-900' : 'text-gray-700'}`}>
                    Waze
                  </div>
                  <div className="text-xs text-gray-500">
                    Abre o aplicativo Waze externo
                  </div>
                </div>
                {preferredMap === 'waze' && <CheckCircle className="w-5 h-5 text-blue-600" />}
              </button>

              <button
                onClick={() => handleSaveMapPreference('google_maps')}
                className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                  preferredMap === 'google_maps' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                  preferredMap === 'google_maps' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <div className={`font-bold ${preferredMap === 'google_maps' ? 'text-blue-900' : 'text-gray-700'}`}>
                    Google Maps
                  </div>
                  <div className="text-xs text-gray-500">
                    Abre o aplicativo Google Maps externo
                  </div>
                </div>
                {preferredMap === 'google_maps' && <CheckCircle className="w-5 h-5 text-blue-600" />}
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSettingsDialog(false)}
              className="w-full"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}