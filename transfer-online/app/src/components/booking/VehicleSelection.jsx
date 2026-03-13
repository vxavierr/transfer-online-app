import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Briefcase, Check, Loader2, Lock, LogIn, Globe, Sparkles, ArrowRight, Clock, AlertCircle, MessageSquare } from 'lucide-react';

export default function VehicleSelection({ 
  vehicles, 
  selectedVehicleId, 
  onSelectVehicle, 
  onDriverLanguageChange,
  isCalculating,
  isLoggedIn = false,
  showPrices = false,
  selectedDriverLanguage = 'pt',
  bookingDateTime = null,
  onRequestQuote,
  isAdminMode = false,
  isMultiSelectMode = false, // New prop
  selectedVehicleIds = [] // New prop for multi-select
}) {
  // If showPrices is not explicitly passed, default to isLoggedIn status
  // This ensures backward compatibility if parent doesn't pass it
  const pricesVisible = showPrices || isLoggedIn;
  const { t, language } = useLanguage();
  const [selectedLanguages, setSelectedLanguages] = useState({});
  const [requestingQuoteForVehicle, setRequestingQuoteForVehicle] = useState(null);

  // Quando o idioma global muda (vindo da primeira tela), resetar seleção de todos os veículos
  useEffect(() => {
    setSelectedLanguages({});
  }, [selectedDriverLanguage]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getAvailableLanguages = (vehicle) => {
    const languages = [
      { code: 'pt', name: 'Português', flag: '🇧🇷', always_available: true }
    ];

    if (vehicle.language_surcharge_en !== undefined && 
        vehicle.language_surcharge_en !== null && 
        vehicle.language_surcharge_en > 0) {
      languages.push({ code: 'en', name: 'English', flag: '🇺🇸' });
    }

    if (vehicle.language_surcharge_es !== undefined && 
        vehicle.language_surcharge_es !== null && 
        vehicle.language_surcharge_es > 0) {
      languages.push({ code: 'es', name: 'Español', flag: '🇪🇸' });
    }

    return languages;
  };

  const handleLanguageChange = (vehicleId, lang) => {
    setSelectedLanguages(prev => ({
      ...prev,
      [vehicleId]: lang
    }));
    
    if (onDriverLanguageChange) {
      onDriverLanguageChange(lang);
    }
  };

  const handleSelectVehicle = (vehicle) => {
    const language = selectedLanguages[vehicle?.id] || selectedDriverLanguage || 'pt';
    onSelectVehicle(vehicle, language);
  };

  const handleLoginClick = () => {
    onSelectVehicle(null, selectedDriverLanguage || 'pt');
  };

  const handleRequestQuote = async (vehicle, lang) => {
    setRequestingQuoteForVehicle(vehicle.id);
    try {
      if (onRequestQuote) {
        await onRequestQuote(vehicle, lang);
      }
    } finally {
      setRequestingQuoteForVehicle(null);
    }
  };

  const getLocalizedDescription = (v) => {
    if (language === 'en' && v.description_en) return v.description_en;
    if (language === 'es' && v.description_es) return v.description_es;
    return v.description;
  };

  if (isCalculating) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-3 animate-pulse">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-gray-700 text-base font-medium">{t('novaReserva.calculatingOptions')}</p>
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="text-center py-12 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border-2 border-yellow-200 shadow-lg">
        <p className="text-gray-700 text-lg font-semibold">
          Nenhum veículo disponível no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isLoggedIn && !pricesVisible && (
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">{t('novaReserva.exclusivePrices')}</h3>
                <p className="text-blue-100 text-sm">
                  {t('novaReserva.loginToSeePrice')}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLoginClick}
              size="sm"
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm px-6 py-5 rounded-xl shadow-lg"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {t('novaReserva.loginCreateAccount')}
            </Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {vehicles.map((vehicle) => {
          const availableLanguages = getAvailableLanguages(vehicle);
          const currentLanguage = selectedLanguages[vehicle.id] || selectedDriverLanguage;
          
          const isLanguageAvailable = availableLanguages.some(lang => lang.code === currentLanguage);
          const displayLanguage = isLanguageAvailable ? currentLanguage : 'pt';

          let meetsLeadTime = true;
          let leadTimeMessage = '';
          
          if (bookingDateTime && vehicle.min_booking_lead_time_hours) {
            const now = new Date();
            const diffMs = bookingDateTime.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            meetsLeadTime = diffHours >= vehicle.min_booking_lead_time_hours;
            
            if (!meetsLeadTime) {
              leadTimeMessage = `Requer ${vehicle.min_booking_lead_time_hours}h antecedência`;
            }
          }

          const outsideRadius = vehicle.calculation_details?.outside_operational_radius || false;
          const operationalRadius = vehicle.calculation_details?.operational_radius_km || 0;

          const isRequestingThisQuote = requestingQuoteForVehicle === vehicle.id;

          // Check if selected (multi or single)
          const isSelected = isMultiSelectMode 
            ? selectedVehicleIds.includes(vehicle.id)
            : selectedVehicleId === vehicle.id;

          // Aplicar opacidade apenas se NÃO for modo admin E (não atender lead time OU fora do raio)
          const shouldApplyOpacity = !isAdminMode && (!meetsLeadTime || outsideRadius);

          return (
            <Card
              key={vehicle.id}
              className={`overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-2xl ${
                isSelected
                  ? 'ring-4 ring-blue-500 shadow-xl scale-105'
                  : 'hover:ring-2 hover:ring-blue-300'
              } ${shouldApplyOpacity ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-0">
                <div className="relative bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 p-6 min-h-[160px] flex items-center justify-center">
                  {isSelected && isLoggedIn && !outsideRadius && (
                    <div className="absolute top-3 right-3 w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center z-10 shadow-md animate-bounce">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  {vehicle.image_url ? (
                    <img
                      src={vehicle.image_url}
                      alt={vehicle.name}
                      className="w-full h-40 object-contain drop-shadow-xl"
                      style={{ 
                        filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.12))',
                        maxHeight: '160px'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className = 'w-full h-40 flex items-center justify-center';
                        fallback.innerHTML = '<svg class="w-20 h-20 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>';
                        e.target.parentElement.appendChild(fallback);
                      }}
                    />
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center">
                      <Users className="w-20 h-20 text-gray-300" />
                    </div>
                  )}

                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-full shadow-md">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-bold text-gray-900 text-xs">{vehicle.max_passengers}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-full shadow-md">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-bold text-gray-900 text-xs">{vehicle.max_luggage}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3 bg-white">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{vehicle.name}</h3>

                  {getLocalizedDescription(vehicle) && (
                    <p className="text-xs text-gray-600 line-clamp-2">{getLocalizedDescription(vehicle)}</p>
                  )}

                  {bookingDateTime && vehicle.min_booking_lead_time_hours !== undefined && (
                    <div className={`flex items-center gap-1.5 p-1.5 rounded-md text-xs ${
                      meetsLeadTime ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <Clock className={`w-3.5 h-3.5 ${meetsLeadTime ? 'text-green-600' : 'text-red-600'}`} />
                      <span className={`font-medium ${meetsLeadTime ? 'text-green-800' : 'text-red-800'}`}>
                        {leadTimeMessage || `${t('novaReserva.leadTime')} ${vehicle.min_booking_lead_time_hours}h`}
                      </span>
                    </div>
                  )}

                  {outsideRadius && operationalRadius > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-md p-2.5">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-orange-900">
                            Fora do raio de atuação
                          </p>
                          <p className="text-xs text-orange-700 mt-0.5">
                            Atende até {operationalRadius} km. Solicite cotação.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!meetsLeadTime && bookingDateTime && !outsideRadius && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-2">
                      <p className="text-xs text-red-800">
                        ⚠️ Indisponível para esta data/hora. Escolha {vehicle.min_booking_lead_time_hours}h de antecedência.
                      </p>
                    </div>
                  )}

                  {pricesVisible && vehicle.calculated_price !== null && !outsideRadius ? (
                    <div className="text-center py-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatPrice(vehicle.calculated_price)}
                      </div>
                      {vehicle.calculation_details?.min_price_applied && (
                        <p className="text-xs text-amber-600 mt-0.5 font-medium">* Preço mínimo</p>
                      )}
                      {vehicle.calculation_details?.package_type && (
                        <p className="text-xs text-blue-600 mt-0.5 font-medium">
                          {vehicle.calculation_details.package_type === 'fixed_5_hours' && '📦 Pacote 5h'}
                          {vehicle.calculation_details.package_type === 'fixed_10_hours' && '📦 Pacote 10h'}
                          {vehicle.calculation_details.km_allowance && ` - ${vehicle.calculation_details.km_allowance}km`}
                        </p>
                      )}
                      {vehicle.calculation_details?.language_surcharge && vehicle.calculation_details.language_surcharge.amount > 0 && (
                        <p className="text-xs text-purple-600 mt-0.5 font-medium">
                          + Idioma: {formatPrice(vehicle.calculation_details.language_surcharge.amount)}
                        </p>
                      )}
                    </div>
                  ) : outsideRadius ? (
                    <div className="text-center py-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-300">
                      <div className="flex flex-col items-center gap-1.5">
                        <MessageSquare className="w-6 h-6 text-orange-600" />
                        <span className="text-base font-bold text-orange-900">Cotação Personalizada</span>
                        <span className="text-xs text-orange-700">Orçamento sob medida</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative text-center py-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-gray-300 overflow-hidden">
                      {pricesVisible ? (
                        /* Preços visíveis mas não calculados (erro ou indisponível) */
                        <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 p-2">
                          <AlertCircle className="w-6 h-6 text-gray-500" />
                          <span className="text-sm font-bold text-gray-700">Sob Consulta</span>
                          <span className="text-xs text-gray-500 max-w-[150px] leading-tight" title={vehicle.error_details}>
                            {vehicle.error_details ? 'Erro: ' + vehicle.error_details : 'Preço não disponível no momento'}
                          </span>
                        </div>
                      ) : (
                        /* Preços ocultos (requer login) */
                        <>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-3xl font-bold text-gray-400 blur-md select-none">
                              R$ •••,••
                            </div>
                          </div>
                          
                          <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 backdrop-blur-[2px]">
                            <Lock className="w-5 h-5 text-gray-600" />
                            <span className="text-sm font-bold text-gray-700">Preço Exclusivo</span>
                            <span className="text-xs text-gray-600">Faça login</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      {t('novaReserva.driverLanguage')}
                    </label>
                    <Select
                      value={displayLanguage}
                      onValueChange={(value) => handleLanguageChange(vehicle.id, value)}
                      disabled={availableLanguages.length === 1 || (!isAdminMode && (!meetsLeadTime || outsideRadius))}
                    >
                      <SelectTrigger className={`w-full h-10 rounded-lg border-2 text-sm ${
                        availableLanguages.length === 1 || (!isAdminMode && (!meetsLeadTime || outsideRadius)) ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {availableLanguages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code} className="text-sm">
                            {lang.flag} {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {outsideRadius ? (
                    <Button
                      className="w-full h-11 text-sm font-bold rounded-xl shadow-md bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
                      onClick={() => handleRequestQuote(vehicle, displayLanguage)}
                      disabled={(!isAdminMode && !meetsLeadTime) || isRequestingThisQuote}
                    >
                      {isRequestingThisQuote ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          {t('novaReserva.requestQuote')}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                    className={`w-full h-11 text-sm font-bold rounded-xl shadow-md ${
                      !isAdminMode && !meetsLeadTime
                        ? 'bg-gray-400 cursor-not-allowed opacity-50'
                        : isLoggedIn
                          ? isSelected
                            ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                    }`}
                    onClick={() => handleSelectVehicle(vehicle)}
                    disabled={!isAdminMode && !meetsLeadTime}
                    >
                    {!isAdminMode && !meetsLeadTime ? (
                      <>
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {t('novaReserva.notAvailable')}
                      </>
                    ) : isLoggedIn ? (
                      isSelected ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          {t('novaReserva.selectedVehicle')}
                        </>
                      ) : (
                        <>
                          {isMultiSelectMode ? (
                            <>
                              <Check className="w-4 h-4 mr-2 opacity-50" />
                              {t('novaReserva.addVehicle')}
                            </>
                          ) : (
                            <>
                              {t('novaReserva.selectVehicle')}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </>
                      )
                    ) : (
                        <>
                          {pricesVisible ? (
                            <>
                              <ArrowRight className="w-4 h-4 mr-2" />
                              {t('novaReserva.bookNow')}
                            </>
                          ) : (
                            <>
                              <LogIn className="w-4 h-4 mr-2" />
                              {t('novaReserva.loginToContinue')}
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}