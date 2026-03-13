import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, CheckCircle } from 'lucide-react';
import { useGoogleMapsReady } from './GoogleMapsLoader';

export default function AddressInput({ label, value, onChange, placeholder, required = true, id }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const { isReady, error: loadError } = useGoogleMapsReady();
  const [initError, setInitError] = useState('');
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    // Se não carregou depois de 5 segundos, habilitar modo manual
    const timeout = setTimeout(() => {
      if (!isReady && !loadError) {
        setManualMode(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isReady, loadError]);

  useEffect(() => {
    if (!isReady || !inputRef.current || manualMode) return;

    if (!window.google?.maps?.places?.Autocomplete) {
      setInitError('Autocomplete não disponível');
      setManualMode(true);
      return;
    }

    try {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'br' },
        fields: ['formatted_address', 'geometry', 'name', 'address_components'],
        types: ['address']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (place.formatted_address) {
          onChange(place.formatted_address);
        } else if (place.name) {
          onChange(place.name);
        }
      });

      autocompleteRef.current = autocomplete;
      setInitError('');
    } catch (error) {
      console.error('[AddressInput] Erro ao inicializar autocomplete:', error);
      setInitError('Erro ao inicializar autocomplete');
      setManualMode(true);
    }

    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isReady, onChange, manualMode]);

  const showManualMode = manualMode || loadError || initError;
  const showLoading = !isReady && !showManualMode;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2 text-base font-semibold">
        <MapPin className="w-5 h-5 text-blue-600" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={showLoading}
          className="w-full h-12 text-base pr-10"
        />
        {showLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}
        {showManualMode && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
        )}
      </div>
      {showManualMode && (
        <p className="text-sm text-green-600 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Digite o endereço completo manualmente
        </p>
      )}
      {showLoading && (
        <p className="text-sm text-gray-500">
          Carregando sugestões de endereço...
        </p>
      )}
      {isReady && !showManualMode && (
        <p className="text-sm text-gray-500">
          Digite o endereço e selecione uma sugestão
        </p>
      )}
    </div>
  );
}