import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, CheckCircle, Star, Users as UsersIcon, Package, Clock, ChevronDown, ArrowRight } from 'lucide-react';

export default function CorporateStep2SupplierSelection({
  supplierQuotes,
  selectedSupplier,
  onSupplierSelect,
  serviceType,
  onContinue,
  onBack,
  formatPrice
}) {
  // Component renders supplier selection options

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
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
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
                          onClick={() => onSupplierSelect(quote)}
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
                                  <Button variant="outline" size="sm" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold text-xs md:text-sm">
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

        <Alert className="mt-6 bg-blue-50 border-blue-300">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>💡 Dica:</strong> As opções estão ordenadas do menor para o maior preço dentro de cada categoria de veículo.
          </AlertDescription>
        </Alert>
      </div>

      {selectedSupplier && (
        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 border-t-2 border-gray-200">
          <Button onClick={onContinue} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base md:text-lg py-5 md:py-6 shadow-lg">
            Continuar com {selectedSupplier.vehicle_name} - {selectedSupplier.supplier_name}
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}