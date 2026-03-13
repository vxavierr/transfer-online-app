import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function PriceAdjustment({ routes }) {
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

    const updates = routes.map(route => ({
      id: route.id,
      base_price: parseFloat((route.base_price * adjustmentFactor).toFixed(2)),
      additional_expenses: parseFloat(((route.additional_expenses || 0) * adjustmentFactor).toFixed(2))
    }));

    for (const update of updates) {
      await base44.entities.Route.update(update.id, {
        base_price: update.base_price,
        additional_expenses: update.additional_expenses
      });
    }

    queryClient.invalidateQueries({ queryKey: ['routes'] });
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

  const calculateTotalPrice = (route) => {
    return route.base_price + (route.additional_expenses || 0);
  };

  const calculateAdjustedTotal = (route) => {
    return getAdjustedPrice(route.base_price) + getAdjustedPrice(route.additional_expenses || 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Reajuste de Tarifas
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
              * O reajuste será aplicado tanto no preço base quanto nas despesas adicionais
            </p>
          </div>

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Reajuste aplicado com sucesso em todas as rotas!
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
            <div className="space-y-3">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className="p-4 border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {route.origin} → {route.destination}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">Valor Atual</div>
                        <div className="font-semibold text-gray-700 line-through">
                          {formatPrice(calculateTotalPrice(route))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">Novo Valor</div>
                        <div className="font-semibold text-blue-600 text-lg">
                          {formatPrice(calculateAdjustedTotal(route))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Detailed breakdown */}
                  <div className="mt-2 pt-2 border-t text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Preço base:</span>
                      <span>
                        <span className="line-through">{formatPrice(route.base_price)}</span>
                        {' → '}
                        <span className="text-blue-600 font-medium">
                          {formatPrice(getAdjustedPrice(route.base_price))}
                        </span>
                      </span>
                    </div>
                    {route.additional_expenses > 0 && (
                      <div className="flex justify-between">
                        <span>Despesas adicionais:</span>
                        <span>
                          <span className="line-through">{formatPrice(route.additional_expenses)}</span>
                          {' → '}
                          <span className="text-blue-600 font-medium">
                            {formatPrice(getAdjustedPrice(route.additional_expenses))}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}