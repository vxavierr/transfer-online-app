import React, { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  User, MapPin, CheckCircle, Plus, Loader2, 
  AlertCircle, Receipt, Trash2, BellRing 
} from 'lucide-react';
import { format } from 'date-fns';

const ComponentLoader = () => (
  <div className="flex justify-center items-center p-8">
    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
  </div>
);

const PassengerSelector = React.lazy(() => import('../booking/PassengerSelector'));
const PassengerListManager = React.lazy(() => import('../booking/PassengerListManager'));
const AdditionalPassengersList = React.lazy(() => import('../booking/AdditionalPassengersList'));
const CostCenterAllocation = React.lazy(() => import('../booking/CostCenterAllocation'));
const BillingMethodSelector = React.lazy(() => import('../booking/BillingMethodSelector'));
const PhoneInputWithCountry = React.lazy(() => import('@/components/ui/PhoneInputWithCountry'));

export default function CorporateStep3Form({
  selectedSupplier,
  multiTripLegs,
  serviceType,
  formatPrice,
  onBack,
  // Notification state
  wantNotifications,
  onWantNotificationsChange,
  notificationPhones,
  onNotificationPhonesChange,
  onAddNotificationPhone,
  onRemoveNotificationPhone,
  // Master user state
  isMasterUser,
  selectedRequester,
  onSelectedRequesterChange,
  availablePassengers,
  client,
  user,
  // Passenger state
  numberOfPassengers,
  onNumberOfPassengersChange,
  maxPassengersAllowed,
  isForMyself,
  onIsForMyselfChange,
  selectedPassenger,
  onSelectedPassengerChange,
  // Additional passengers
  shouldUseDetailedList,
  passengersList,
  onPassengersListChange,
  requiresPassengerDocumentation,
  additionalPassengers,
  onAdditionalPassengersChange,
  // Cost center state
  costAllocations,
  onCostAllocationsChange,
  showAddCostCenter,
  onShowAddCostCenterChange,
  newCostCenter,
  onNewCostCenterChange,
  costCenterSearchTerm,
  onCostCenterSearchTermChange,
  isManualEntry,
  onIsManualEntryChange,
  costCenters,
  onSelectExistingCostCenter,
  onAddCostAllocation,
  // Billing state
  billingData,
  onBillingDataChange,
  availableFinancialResponsibles,
  // Notes and submit
  notes,
  onNotesChange,
  onSubmit,
  isSubmitting,
  error,
  // Cost center config from client
  clientHasCostCenters = true,
  // Purchase order config from client
  clientRequiresPurchaseOrder = false
}) {

  const handleNotificationPhoneChange = (index, value) => {
    const newPhones = [...notificationPhones];
    newPhones[index] = value;
    onNotificationPhonesChange(newPhones);
  };

  return (
    <>
      {serviceType === 'multi_trip' && (
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">Itinerário: {multiTripLegs.length} {multiTripLegs.length === 1 ? 'trecho' : 'trechos'}</h3>
              </div>
              {multiTripLegs.map((leg, index) => (
                <div key={index} className="bg-white rounded-lg border border-purple-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-600 text-white">#{index + 1}</Badge>
                      <span className="text-sm text-gray-600">{format(new Date(leg.date + 'T' + leg.time), "dd/MM/yy HH:mm")}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{leg.vehicleTypeName}</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-700 truncate"><strong>De:</strong> {leg.origin}</p>
                    <p className="text-gray-700 truncate"><strong>Para:</strong> {leg.destination}</p>
                    <div className="flex justify-between pt-2 border-t mt-2">
                      <span className="text-gray-600">Valor:</span>
                      <span className="text-lg font-bold text-purple-600">{formatPrice(leg.calculatedPrice)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total do Itinerário:</span>
                  <span className="text-3xl font-bold">{formatPrice(multiTripLegs.reduce((sum, leg) => sum + leg.calculatedPrice, 0))}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSupplier && serviceType !== 'multi_trip' && (
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300">
          <CardContent className="p-6">
            {/* Existing supplier card content */}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          {/* Notifications */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <BellRing className="w-6 h-6 text-blue-600" />
              Notificações da Viagem
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3 mb-4">
                <Checkbox 
                  id="want_notifications" 
                  checked={wantNotifications} 
                  onCheckedChange={onWantNotificationsChange}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="want_notifications" className="text-base font-semibold text-blue-900 cursor-pointer">
                    Deseja receber notificações sobre esta viagem?
                  </Label>
                  <p className="text-sm text-blue-700 mt-1">
                    Ao marcar esta opção, os números informados receberão o link da timeline em tempo real assim que o motorista iniciar a viagem.
                  </p>
                </div>
              </div>
              {wantNotifications && (
                <div className="pl-7 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-sm font-semibold text-blue-900">Telefones para notificação (WhatsApp)</Label>
                  {notificationPhones.map((phone, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <Suspense fallback={<ComponentLoader />}>
                          <PhoneInputWithCountry
                            value={phone}
                            onChange={(value) => handleNotificationPhoneChange(index, value)}
                            placeholder="(00) 00000-0000"
                            className="bg-white"
                          />
                        </Suspense>
                      </div>
                      {notificationPhones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveNotificationPhone(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAddNotificationPhone}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar outro telefone
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Requester (Master Only) */}
          {isMasterUser && (
            <div className="mb-8 pb-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold mb-4 text-purple-900">Informações do Solicitante</h2>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <Label className="text-base font-semibold mb-3 block text-purple-900">
                  Quem está solicitando esta viagem? *
                </Label>
                {!selectedRequester ? (
                  <Suspense fallback={<ComponentLoader />}>
                    <PassengerSelector
                      availablePassengers={availablePassengers}
                      selectedPassenger={selectedRequester}
                      onSelectPassenger={onSelectedRequesterChange}
                      placeholder="Buscar solicitante por nome..."
                      label={null}
                      allowManualEntry={true}
                      entityType="requester"
                      clientId={client?.id}
                    />
                  </Suspense>
                ) : (
                  <div className="flex items-center justify-between bg-white p-3 rounded border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{selectedRequester.full_name}</p>
                        <p className="text-sm text-gray-500">{selectedRequester.email}</p>
                      </div>
                    </div>
                    <Button onClick={() => onSelectedRequesterChange(null)} variant="ghost" size="sm" className="text-purple-600 hover:bg-purple-50">
                      Alterar
                    </Button>
                  </div>
                )}
                <p className="text-xs text-purple-700 mt-2">
                  ℹ️ Esta viagem ficará registrada no histórico deste usuário.
                </p>
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-4">Informações dos Passageiros</h2>

          {/* Number of passengers */}
          <div className="mb-6">
            <Label htmlFor="num_passengers" className="text-base font-semibold mb-2 block">
              Quantos passageiros no total? *
            </Label>
            <Select value={String(numberOfPassengers)} onValueChange={(value) => onNumberOfPassengersChange(parseInt(value))}>
              <SelectTrigger id="num_passengers" className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: serviceType === 'multi_trip' ? 10 : maxPassengersAllowed }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num} {num === 1 ? 'passageiro' : 'passageiros'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {serviceType !== 'multi_trip' && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                ✅ Este veículo ({selectedSupplier?.vehicle_name}) comporta até {maxPassengersAllowed} passageiros
              </p>
            )}
          </div>

          {/* Main passenger selector */}
          <div className="space-y-3 mb-6 pb-6 border-b">
            <Label className="text-base font-semibold">Quem é o passageiro principal?</Label>
            {!isMasterUser && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="radio" id="for-myself" checked={isForMyself} onChange={() => { onIsForMyselfChange(true); onSelectedPassengerChange(null); }} className="w-4 h-4 text-blue-600" />
                  <Label htmlFor="for-myself" className="cursor-pointer text-sm font-medium">Eu mesmo ({user?.full_name})</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="radio" id="for-other" checked={!isForMyself} onChange={() => onIsForMyselfChange(false)} className="w-4 h-4 text-blue-600" />
                  <Label htmlFor="for-other" className="cursor-pointer text-sm font-medium">Outra pessoa</Label>
                </div>
              </div>
            )}

            {((isMasterUser && !selectedPassenger) || (!isMasterUser && !isForMyself && !selectedPassenger)) && (
              <div className="space-y-2 mt-3 pt-3 border-t border-blue-200">
                <Suspense fallback={<ComponentLoader />}>
                  <PassengerSelector
                    availablePassengers={availablePassengers}
                    selectedPassenger={selectedPassenger}
                    onSelectPassenger={onSelectedPassengerChange}
                    currentUser={user}
                    clientId={client?.id}
                    entityType="passenger"
                  />
                </Suspense>
              </div>
            )}

            {((!isMasterUser && ((isForMyself && user) || (!isForMyself && selectedPassenger))) || (isMasterUser && selectedPassenger)) && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Passageiro Principal:</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {isMasterUser ? selectedPassenger?.full_name : (isForMyself ? user?.full_name : selectedPassenger?.full_name)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isMasterUser ? selectedPassenger?.email : (isForMyself ? user?.email : selectedPassenger?.email)}
                        </p>
                        {!isMasterUser && !isForMyself && selectedPassenger?.is_manual && (
                          <Badge className="text-xs bg-purple-100 text-purple-700 mt-1">Passageiro Avulso</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {((isMasterUser && selectedPassenger) || (!isMasterUser && !isForMyself)) && (
                    <Button onClick={() => onSelectedPassengerChange(null)} variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                      Alterar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Additional passengers */}
          {numberOfPassengers > 1 && (((isMasterUser && selectedPassenger) || (!isMasterUser && ((isForMyself && user) || (!isForMyself && selectedPassenger))))) && (
            <div className="pb-6 border-b">
              {shouldUseDetailedList ? (
                <Suspense fallback={<ComponentLoader />}>
                  <PassengerListManager
                    passengers={passengersList}
                    onChange={onPassengersListChange}
                    maxPassengers={numberOfPassengers}
                    requiresDocumentation={requiresPassengerDocumentation}
                  />
                </Suspense>
              ) : (
                <Suspense fallback={<ComponentLoader />}>
                  <AdditionalPassengersList
                    passengers={additionalPassengers}
                    onChange={onAdditionalPassengersChange}
                    maxPassengers={numberOfPassengers}
                    mainPassengerName={isMasterUser ? selectedPassenger?.full_name : (isForMyself ? user?.full_name : selectedPassenger?.full_name)}
                  />
                </Suspense>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4">Informações Adicionais</h2>
          <div className="space-y-6">
            {/* Cost Centers - Simplified version */}
            {clientHasCostCenters && (
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Centro de Custo *</h3>
              </div>
              {costAllocations.length > 0 && (
                <Suspense fallback={<ComponentLoader />}>
                  <CostCenterAllocation
                    allocations={costAllocations}
                    onChange={onCostAllocationsChange}
                    totalPrice={serviceType === 'multi_trip' ? multiTripLegs.reduce((sum, leg) => sum + leg.calculatedPrice, 0) : selectedSupplier?.client_price}
                  />
                </Suspense>
              )}
            </div>
            )}

            {/* Billing */}
            <div className="border-t pt-6">
              <Suspense fallback={<ComponentLoader />}>
                <BillingMethodSelector
                  billingData={billingData}
                  onChange={onBillingDataChange}
                  currentUser={user}
                  availableFinancialResponsibles={availableFinancialResponsibles}
                  isMasterUser={isMasterUser}
                  clientRequiresPurchaseOrder={clientRequiresPurchaseOrder}
                />
              </Suspense>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Input id="notes" value={notes} onChange={(e) => onNotesChange(e.target.value)} placeholder="Informações adicionais sobre a viagem" />
            </div>

            {/* Submit */}
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || (clientHasCostCenters && costAllocations.length === 0)}
              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Enviando Solicitação...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Confirmar e Enviar Solicitação
                </>
              )}
            </Button>

            {clientHasCostCenters && costAllocations.length === 0 && (
              <p className="text-xs text-center text-red-600 font-medium">
                ⚠️ Adicione pelo menos um centro de custo para habilitar o envio
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}