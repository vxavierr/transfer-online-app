import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Hotel, 
  Plane, 
  Home, 
  Building2, 
  Briefcase, 
  Hospital,
  ShoppingBag,
  UtensilsCrossed,
  MapPin,
  Search,
  History
} from 'lucide-react';

const locationTypeIcons = {
  hotel: Hotel,
  airport: Plane,
  residence: Home,
  event_center: Building2,
  business_center: Briefcase,
  hospital: Hospital,
  shopping: ShoppingBag,
  restaurant: UtensilsCrossed,
  office: Building2,
  history: History
};

export default function LocationAutocomplete({ 
  id, 
  value, 
  onChange, 
  onLocationSelect,
  placeholder, 
  required,
  className,
  suggestions = [] 
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [googleSuggestions, setGoogleSuggestions] = useState([]);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const { data: frequentLocations = [] } = useQuery({
    queryKey: ['frequentLocations'],
    queryFn: () => base44.entities.FrequentLocation.filter({ active: true }, '-display_order'),
    staleTime: 60000,
  });

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Função para buscar sugestões do Google Places
  const fetchGoogleSuggestions = async (searchTerm) => {
    if (searchTerm.trim().length < 3) {
      setGoogleSuggestions([]);
      return;
    }

    setIsLoadingGoogle(true);
    try {
      const response = await base44.functions.invoke('placesAutocomplete', {
        input: searchTerm
      });

      if (response.data && response.data.predictions) {
        setGoogleSuggestions(response.data.predictions);
      } else {
        setGoogleSuggestions([]);
      }
    } catch (error) {
      console.error('Erro ao buscar sugestões do Google:', error);
      setGoogleSuggestions([]);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setShowSuggestions(true);
    
    if (onLocationSelect) {
      onLocationSelect(null);
    }

    // Debounce para Google Places API
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchGoogleSuggestions(newValue);
    }, 500); // 500ms de debounce
  };

  const handleLocationSelect = (location) => {
    setInputValue(location.address);
    onChange(location.address);
    setShowSuggestions(false);
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const handleGooglePlaceSelect = (prediction) => {
    // Usar a descrição completa do Google Places
    setInputValue(prediction.description);
    onChange(prediction.description);
    setShowSuggestions(false);
    setGoogleSuggestions([]);
    if (onLocationSelect) {
      onLocationSelect(null);
    }
  };

  // Processar sugestões externas (histórico do evento, etc)
  const normalizedSuggestions = React.useMemo(() => {
      return suggestions.map((s, idx) => {
          if (typeof s === 'string') {
              return {
                  id: `suggestion-${idx}`,
                  name: s,
                  address: s,
                  type: 'history',
                  display_order: 0
              };
          }
          return s;
      });
  }, [suggestions]);

  // Filtrar sugestões externas
  const filteredSuggestions = normalizedSuggestions.filter(location => {
    const searchTerm = inputValue.toLowerCase();
    return (
      location.name.toLowerCase().includes(searchTerm) ||
      location.address.toLowerCase().includes(searchTerm)
    );
  });

  // Filtrar locais frequentes
  const filteredLocations = frequentLocations.filter(location => {
    const searchTerm = inputValue.toLowerCase();
    return (
      location.name.toLowerCase().includes(searchTerm) ||
      location.address.toLowerCase().includes(searchTerm)
    );
  });

  // Ordenar locais frequentes: primeiro por display_order, depois alfabeticamente
  const sortedFilteredLocations = [...filteredLocations].sort((a, b) => {
    const orderA = a.display_order ?? 999999;
    const orderB = b.display_order ?? 999999;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.name.localeCompare(b.name);
  });

  const hasSuggestions = filteredSuggestions.length > 0;
  const hasFrequentLocations = sortedFilteredLocations.length > 0;
  const hasGoogleSuggestions = googleSuggestions.length > 0;
  const showDropdown = showSuggestions && (hasSuggestions || hasFrequentLocations || hasGoogleSuggestions || isLoadingGoogle);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />

      {showDropdown && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          <div className="p-2">
            {/* Sugestões do Evento / Histórico */}
            {hasSuggestions && (
              <>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                  Sugestões
                </div>
                {filteredSuggestions.map((location) => {
                  const Icon = locationTypeIcons[location.type] || History;
                  return (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => handleLocationSelect(location)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-purple-50 rounded-lg transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">
                          {location.name}
                        </div>
                        {location.address !== location.name && (
                            <div className="text-xs text-gray-500 truncate">
                            {location.address}
                            </div>
                        )}
                      </div>
                    </button>
                  );
                })}
                <div className="border-t border-gray-200 my-2" />
              </>
            )}

            {/* Locais Frequentes */}
            {hasFrequentLocations && (
              <>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                  Locais Frequentes
                </div>
                {sortedFilteredLocations.map((location) => {
                  const Icon = locationTypeIcons[location.type] || MapPin;
                  return (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => handleLocationSelect(location)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-lg transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">
                          {location.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {location.address}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {/* Separador */}
            {(hasFrequentLocations || hasSuggestions) && (hasGoogleSuggestions || isLoadingGoogle) && (
              <div className="border-t border-gray-200 my-2" />
            )}

            {/* Loading do Google */}
            {isLoadingGoogle && (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                <div className="inline-flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                  Buscando endereços...
                </div>
              </div>
            )}

            {/* Sugestões do Google Places */}
            {!isLoadingGoogle && hasGoogleSuggestions && (
              <>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 flex items-center gap-2">
                  <Search className="w-3 h-3" />
                  Outros Endereços
                </div>
                {googleSuggestions.map((prediction) => (
                  <button
                    key={prediction.place_id}
                    type="button"
                    onClick={() => handleGooglePlaceSelect(prediction)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-green-50 rounded-lg transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">
                        {prediction.structured_formatting?.main_text || prediction.description}
                      </div>
                      {prediction.structured_formatting?.secondary_text && (
                        <div className="text-xs text-gray-500 truncate">
                          {prediction.structured_formatting.secondary_text}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Mensagem quando não há resultados */}
            {!isLoadingGoogle && !hasFrequentLocations && !hasSuggestions && !hasGoogleSuggestions && inputValue.trim().length >= 3 && (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                Nenhum endereço encontrado
              </div>
            )}

            {/* Mensagem para digitar mais caracteres */}
            {!isLoadingGoogle && inputValue.trim().length < 3 && !hasFrequentLocations && !hasSuggestions && (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                Digite pelo menos 3 caracteres para buscar endereços
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}