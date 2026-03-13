import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function VehiclePriceAdjustment({ vehicles }) {
  const [percentage, setPercentage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const handleAdjustPrices = async () => {
    if (!percentage || parseFloat(percentage) === 0) {
      return;
    }

    setIsProcessing(true);
    setSuccess(false);

    const adjustmentFactor = 1 + (parseFloat(percentage) / 100);

    const updates = vehicles.map(vehicle => ({
      id: vehicle.id,
      base_price_per_km: parseFloat((vehicle.base_price_per_km * adjustmentFactor).toFixed(2)),
      base_price_per_hour: parseFloat((vehicle.base_price_per_hour * adjustmentFactor).toFixed(2)),
      min_price_one_way: parseFloat((vehicle.min_price_one_way * adjustmentFactor).toFixed(2)),
      min_price_round_trip: parseFloat((vehicle.min_price_round_trip * adjustmentFactor).toFixed(2)),
      min_price_hourly: parseFloat((vehicle.min_price_hourly * adjustmentFactor).toFixed(2)),
      additional_price_per_km: parseFloat(((vehicle.additional_price_per_km || 0) * adjustmentFactor).toFixed(2)),
      additional_price_per_hour: parseFloat(((vehicle.additional_price_per_hour || 0) * adjustmentFactor).toFixed(2)),
      // Ajustar sobretaxas de idioma apenas se forem valor fixo (não percentual)
      language_surcharge_en: vehicle.language_surcharge_en_type === 'fixed_amount' 
        ? parseFloat(((vehicle.language_surcharge_en || 0) * adjustmentFactor).toFixed(2))
        : vehicle.language_surcharge_en,
      language_surcharge_es: vehicle.language_surcharge_es_type === 'fixed_amount'
        ? parseFloat(((vehicle.language_surcharge_es || 0) * adjustmentFactor).toFixed(2))
        : vehicle.language_surcharge_es
    }));

    for (const update of updates) {
      await base44.entities.VehicleType.update(update.id, {
        base_price_per_km: update.base_price_per_km,
        base_price_per_hour: update.base_price_per_hour,
        min_price_one_way: update.min_price_one_way,
        min_price_round_trip: update.min_price_round_trip,
        min_price_hourly: update.min_price_hourly,
        additional_price_per_km: update.additional_price_per_km,
        additional_price_per_hour: update.additional_price_per_hour,
        language_surcharge_en: update.language_surcharge_en,
        language_surcharge_es: update.language_surcharge_es
      });
    }

    queryClient.invalidateQueries({ queryKey: ['vehicleTypes'] });
    setIsProcessing(false);
    setSuccess(true);
    setPercentage('');

    setTimeout(() => setSuccess(false), 3000);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getAdjustedPrice = (price) => {
    if (!percentage) return price;
    const adjustmentFactor = 1 + (parseFloat(percentage) / 100);
    return price * adjustmentFactor;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Reajuste Geral de Preços de Veículos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="percentage">Percentual de Reajuste (%)</Label>
            <div className="flex gap-3">
              <Input
                id="percentage"
                type="number"
                step="0.1"
                placeholder="Ex: 10 para aumentar 10%"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleAdjustPrices}
                disabled={!percentage || isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? 'Processando...' : 'Aplicar Reajuste'}
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Use valores negativos para redução (ex: -10 para reduzir 10%)
            </p>
            <p className="text-xs text-gray-400">
              * O reajuste será aplicado em TODOS os preços (por km, por hora, mínimos, adicionais)
            </p>
            <p className="text-xs text-gray-400">
              * Sobretaxas de idioma em valor fixo serão ajustadas. Sobretaxas em % não serão alteradas.
            </p>
          </div>

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Reajuste aplicado com sucesso em todos os veículos!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {percentage && parseFloat(percentage) !== 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prévia do Reajuste</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg text-gray-900">{vehicle.name}</h3>
                  </div>

                  {/* Preços Principais */}
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-xs text-gray-600 mb-1">Preço por KM</div>
                      <div>
                        <span className="line-through text-gray-500">{formatPrice(vehicle.base_price_per_km)}</span>
                        {' → '}
                        <span className="font-bold text-blue-600">{formatPrice(getAdjustedPrice(vehicle.base_price_per_km))}</span>
                      </div>
                    </div>

                    <div className="bg-green-50 p-2 rounded">
                      <div className="text-xs text-gray-600 mb-1">Preço por Hora</div>
                      <div>
                        <span className="line-through text-gray-500">{formatPrice(vehicle.base_price_per_hour)}</span>
                        {' → '}
                        <span className="font-bold text-green-600">{formatPrice(getAdjustedPrice(vehicle.base_price_per_hour))}</span>
                      </div>
                    </div>

                    <div className="bg-purple-50 p-2 rounded">
                      <div className="text-xs text-gray-600 mb-1">Mínimo Só Ida</div>
                      <div>
                        <span className="line-through text-gray-500">{formatPrice(vehicle.min_price_one_way)}</span>
                        {' → '}
                        <span className="font-bold text-purple-600">{formatPrice(getAdjustedPrice(vehicle.min_price_one_way))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Preços Mínimos */}
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="bg-orange-50 p-2 rounded">
                      <div className="text-xs text-gray-600 mb-1">Mínimo Ida/Volta</div>
                      <div>
                        <span className="line-through text-gray-500">{formatPrice(vehicle.min_price_round_trip)}</span>
                        {' → '}
                        <span className="font-bold text-orange-600">{formatPrice(getAdjustedPrice(vehicle.min_price_round_trip))}</span>
                      </div>
                    </div>

                    <div className="bg-cyan-50 p-2 rounded">
                      <div className="text-xs text-gray-600 mb-1">Mínimo Por Hora</div>
                      <div>
                        <span className="line-through text-gray-500">{formatPrice(vehicle.min_price_hourly)}</span>
                        {' → '}
                        <span className="font-bold text-cyan-600">{formatPrice(getAdjustedPrice(vehicle.min_price_hourly))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Adicionais (se existirem) */}
                  {(vehicle.additional_price_per_km > 0 || vehicle.additional_price_per_hour > 0) && (
                    <div className="grid md:grid-cols-2 gap-3 text-sm border-t pt-2">
                      {vehicle.additional_price_per_km > 0 && (
                        <div className="bg-amber-50 p-2 rounded">
                          <div className="text-xs text-gray-600 mb-1">Adicional por KM</div>
                          <div>
                            <span className="line-through text-gray-500">{formatPrice(vehicle.additional_price_per_km)}</span>
                            {' → '}
                            <span className="font-bold text-amber-600">{formatPrice(getAdjustedPrice(vehicle.additional_price_per_km))}</span>
                          </div>
                        </div>
                      )}

                      {vehicle.additional_price_per_hour > 0 && (
                        <div className="bg-amber-50 p-2 rounded">
                          <div className="text-xs text-gray-600 mb-1">Adicional por Hora</div>
                          <div>
                            <span className="line-through text-gray-500">{formatPrice(vehicle.additional_price_per_hour)}</span>
                            {' → '}
                            <span className="font-bold text-amber-600">{formatPrice(getAdjustedPrice(vehicle.additional_price_per_hour))}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sobretaxas de Idioma */}
                  {(vehicle.language_surcharge_en > 0 || vehicle.language_surcharge_es > 0) && (
                    <div className="grid md:grid-cols-2 gap-3 text-sm border-t pt-2">
                      {vehicle.language_surcharge_en > 0 && (
                        <div className="bg-indigo-50 p-2 rounded">
                          <div className="text-xs text-gray-600 mb-1">🇺🇸 Inglês</div>
                          <div>
                            {vehicle.language_surcharge_en_type === 'fixed_amount' ? (
                              <>
                                <span className="line-through text-gray-500">{formatPrice(vehicle.language_surcharge_en)}</span>
                                {' → '}
                                <span className="font-bold text-indigo-600">{formatPrice(getAdjustedPrice(vehicle.language_surcharge_en))}</span>
                              </>
                            ) : (
                              <span className="font-bold text-indigo-600">{vehicle.language_surcharge_en}%</span>
                            )}
                            <span className="text-xs ml-1">
                              ({vehicle.language_surcharge_en_type === 'fixed_amount' ? 'Fixo' : '%'})
                            </span>
                          </div>
                        </div>
                      )}

                      {vehicle.language_surcharge_es > 0 && (
                        <div className="bg-indigo-50 p-2 rounded">
                          <div className="text-xs text-gray-600 mb-1">🇪🇸 Espanhol</div>
                          <div>
                            {vehicle.language_surcharge_es_type === 'fixed_amount' ? (
                              <>
                                <span className="line-through text-gray-500">{formatPrice(vehicle.language_surcharge_es)}</span>
                                {' → '}
                                <span className="font-bold text-indigo-600">{formatPrice(getAdjustedPrice(vehicle.language_surcharge_es))}</span>
                              </>
                            ) : (
                              <span className="font-bold text-indigo-600">{vehicle.language_surcharge_es}%</span>
                            )}
                            <span className="text-xs ml-1">
                              ({vehicle.language_surcharge_es_type === 'fixed_amount' ? 'Fixo' : '%'})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}