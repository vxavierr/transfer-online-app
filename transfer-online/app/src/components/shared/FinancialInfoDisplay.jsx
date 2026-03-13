import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, PieChart } from 'lucide-react';

export default function FinancialInfoDisplay({ 
  totalPrice, 
  basePrice, 
  extras = [], 
  costAllocation = [], 
  currency = 'BRL',
  paymentStatus,
  paymentMethod
}) {
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid':
      case 'pago': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
      case 'pendente': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'invoiced':
      case 'faturado': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            Financeiro
          </div>
          {paymentStatus && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase ${getStatusColor(paymentStatus)}`}>
              {paymentStatus}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Breakdown */}
        <div className="space-y-2 text-sm">
          {basePrice !== undefined && (
            <div className="flex justify-between text-gray-600">
              <span>Tarifa Base</span>
              <span>{formatMoney(basePrice)}</span>
            </div>
          )}
          
          {extras && extras.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500">Adicionais</p>
              {extras.map((extra, idx) => (
                <div key={idx} className="flex justify-between text-xs text-gray-500 pl-2">
                  <span>{extra.description || extra.name}</span>
                  <span>{formatMoney(extra.value || extra.price)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-gray-100 flex justify-between font-bold text-base text-gray-900">
            <span>Total</span>
            <span>{formatMoney(totalPrice)}</span>
          </div>
          
          {paymentMethod && (
            <div className="text-xs text-right text-gray-500">
              via {paymentMethod}
            </div>
          )}
        </div>

        {/* Cost Allocation */}
        {costAllocation && costAllocation.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-2">
              <PieChart className="w-3 h-3" /> Rateio de Custos
            </p>
            <div className="space-y-2">
              {costAllocation.map((alloc, idx) => (
                <div key={idx} className="bg-gray-50 p-2 rounded text-xs flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-medium">{alloc.cost_center_name || alloc.cost_center_code}</span>
                    <span className="text-gray-400 text-[10px]">Centro de Custo</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-medium">
                      {alloc.allocation_type === 'percentage' 
                        ? `${alloc.allocation_value}%` 
                        : formatMoney(alloc.allocation_value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}