# Guia de Integração - Múltiplos Trechos Corporativo

## 📋 Modificações Necessárias no arquivo `pages/SolicitarViagemCorporativa.jsx`

### 1️⃣ IMPORTS (Linha ~56)
Adicionar após a linha com `PhoneInputWithCountry`:

```javascript
const CorporateMultiTripManager = React.lazy(() => import('../components/corporate/CorporateMultiTripManager'));
const CorporateStep3Form = React.lazy(() => import('../components/corporate/CorporateStep3Form'));
```

---

### 2️⃣ ESTADO (Linha ~85)
Adicionar após a linha `const [serviceType, setServiceType] = useState('one_way');`:

```javascript
const [multiTripLegs, setMultiTripLegs] = useState([]);
```

---

### 3️⃣ VALIDAÇÃO STEP 1 (Linha ~468)
**SUBSTITUIR** a função `validateStep1` por:

```javascript
const validateStep1 = useCallback(() => {
  setError('');
  if (isMasterUser && !client) {
    setError('Por favor, selecione um cliente para continuar.');
    return false;
  }
  
  if (serviceType === 'multi_trip') {
    if (multiTripLegs.length === 0) {
      setError('Por favor, adicione pelo menos um trecho à sua viagem.');
      return false;
    }
    const invalidLegs = multiTripLegs.filter(leg => !leg.origin || !leg.destination || !leg.date || !leg.time || !leg.calculatedPrice);
    if (invalidLegs.length > 0) {
      setError('Por favor, preencha todos os campos e aguarde o cálculo de preço de cada trecho.');
      return false;
    }
    return true;
  }
  
  if (serviceType !== 'hourly' && (!formData.origin || !formData.destination)) {
    setError('Por favor, preencha origem e destino.');
    return false;
  }
  if (serviceType === 'hourly') {
    if (!formData.origin || !formData.hours) {
      setError('Por favor, preencha origem e número de horas.');
      return false;
    }
    if (formData.hours < 4) {
      setError('Serviço por hora requer no mínimo 4 horas.');
      return false;
    }
    return true;
  }
  if (!formData.date || !formData.time) {
    setError('Por favor, preencha data e horário.');
    return false;
  }
  if (serviceType === 'one_way' && originIsAirport && !formData.origin_flight_number) {
    setError('Por favor, informe o número do voo de chegada.');
    return false;
  }
  if (serviceType === 'one_way' && destinationIsAirport && !formData.destination_flight_number) {
    setError('Por favor, informe o número do voo de partida.');
    return false;
  }
  if (serviceType === 'round_trip') {
    if (!formData.return_date || !formData.return_time) {
      setError('Por favor, preencha data e horário do retorno.');
      return false;
    }
    if (returnOriginIsAirport && !formData.return_origin_flight_number) {
      setError('Por favor, informe o número do voo de retorno (chegada).');
      return false;
    }
    if (returnDestinationIsAirport && !formData.return_destination_flight_number) {
      setError('Por favor, informe o número do voo de retorno (partida).');
      return false;
    }
  }
  return true;
}, [formData, serviceType, originIsAirport, destinationIsAirport, returnOriginIsAirport, returnDestinationIsAirport, isMasterUser, client, multiTripLegs]);
```

---

### 4️⃣ HANDLE CALCULATE (Linha ~530)
Adicionar logo no início da função `handleCalculateAndContinue`, ANTES de `if (!validateStep1())`:

```javascript
if (serviceType === 'multi_trip') {
  setStep(3);
  return;
}
```

---

### 5️⃣ TABLELIST (Linha ~1338)
**SUBSTITUIR**:
```javascript
<TabsList className="grid w-full grid-cols-3 mb-6">
```

**POR**:
```javascript
<TabsList className="grid w-full grid-cols-4 mb-6">
```

---

### 6️⃣ TAB TRIGGER (Linha ~1342)
Adicionar APÓS `<TabsTrigger value="hourly">Por Hora</TabsTrigger>`:

```javascript
<TabsTrigger value="multi_trip">Múltiplos Trechos</TabsTrigger>
```

---

### 7️⃣ TAB CONTENT (Linha ~1838)
Adicionar ANTES do fechamento `</Tabs>`:

```javascript
<TabsContent value="multi_trip" className="space-y-4">
  <Alert className="bg-blue-50 border-blue-300 mb-4">
    <AlertCircle className="h-4 w-4 text-blue-600" />
    <AlertDescription className="text-blue-900 text-sm">
      <strong>📍 Múltiplos Trechos:</strong> Monte um itinerário com várias viagens. Cada trecho terá origem, destino, data e fornecedor próprios.
    </AlertDescription>
  </Alert>
  <Suspense fallback={<ComponentLoader />}>
    <CorporateMultiTripManager
      legs={multiTripLegs}
      onChange={setMultiTripLegs}
      clientId={client?.id}
      driverLanguage={driverLanguage}
    />
  </Suspense>
</TabsContent>
```

---

### 8️⃣ BOTÃO CONTINUAR (Linha ~1850)
**SUBSTITUIR** a div com o botão "Ver Opções de Fornecedores" por:

```javascript
<div className="mt-6 space-y-4">
  {serviceType !== 'multi_trip' && (
    <div className="space-y-2">
      <Label htmlFor="driver_language">Idioma do Motorista</Label>
      <Select value={driverLanguage} onValueChange={setDriverLanguage}>
        <SelectTrigger id="driver_language"><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pt">🇧🇷 Português</SelectItem>
          <SelectItem value="en">🇺🇸 English</SelectItem>
          <SelectItem value="es">🇪🇸 Español</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )}
  <Button 
    onClick={handleCalculateAndContinue} 
    disabled={isCalculatingPrices || (client && client.client_type !== 'own' && (!client.associated_supplier_ids || client.associated_supplier_ids.length === 0))} 
    className="w-full bg-blue-600 hover:bg-blue-700"
  >
    {isCalculatingPrices ? (
      <>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Consultando Fornecedores...
      </>
    ) : serviceType === 'multi_trip' ? (
      <>
        Continuar para Passageiros
        <ArrowRight className="w-4 h-4 ml-2" />
      </>
    ) : (
      <>
        Ver Opções de Fornecedores
        <ArrowRight className="w-4 h-4 ml-2" />
      </>
    )}
  </Button>
</div>
```

---

### 9️⃣ STEP 3 INÍCIO (Linha ~2074)
**SUBSTITUIR**:
```javascript
{step === 3 && selectedSupplier && (
```

**POR**:
```javascript
{step === 3 && (selectedSupplier || serviceType === 'multi_trip') && (
```

E **SUBSTITUIR** o botão voltar:
```javascript
<Button variant="ghost" onClick={() => startTransition(() => { setStep(2); setError(''); })} className="mb-4">
  ← Voltar
</Button>
```

**POR**:
```javascript
<Button variant="ghost" onClick={() => startTransition(() => { setStep(serviceType === 'multi_trip' ? 1 : 2); setError(''); })} className="mb-4">
  ← Voltar
</Button>
```

---

### 🔟 SUBMIT HANDLER (Linha ~1140)
Adicionar logo NO INÍCIO da função `handleSubmitRequest`, ANTES de qualquer lógica:

```javascript
if (serviceType === 'multi_trip') {
  const finalCostAllocations = costAllocations;
  let finalPassengersDetails = [];
  if (shouldUseDetailedList) {
    if (passengersList.length > 0) finalPassengersDetails = passengersList;
  } else {
    finalPassengersDetails = [{
      name: passengerData.full_name,
      document_type: 'CPF',
      document_number: passengerData.document_number || '',
      phone_number: passengerData.phone_number || '',
      is_lead_passenger: true
    }, ...additionalPassengers.map(p => ({
      name: p.full_name || p.name,
      document_type: 'CPF',
      document_number: p.document_number || '',
      phone_number: p.phone_number || '',
      is_lead_passenger: false
    }))];
  }
  
  const response = await base44.functions.invoke('submitMultiTripServiceRequest', {
    client_id: client.id,
    legs: multiTripLegs,
    passengers: numberOfPassengers,
    passenger_user_id: passengerData.id,
    passenger_name: passengerData.full_name,
    passenger_email: passengerData.email,
    passenger_phone: passengerData.phone_number || '',
    passengers_details: finalPassengersDetails.length > 0 ? finalPassengersDetails : null,
    notes: formData.notes,
    cost_allocation: finalCostAllocations,
    billing_method: billingData.billing_method,
    billing_responsible_user_id: billingData.billing_responsible_user_id || null,
    billing_responsible_email: billingData.billing_responsible_email || null,
    billing_responsible_name: billingData.billing_responsible_name || null,
    credit_card_payment_link_recipient: billingData.credit_card_payment_link_recipient || null,
    purchase_order_number: billingData.purchase_order_number || null,
    requester_user_id: isMasterUser && selectedRequester?.type === 'system_user' ? selectedRequester.id : null,
    requester_full_name: isMasterUser ? (selectedRequester?.full_name || selectedRequester?.display_name) : null,
    requester_email: isMasterUser ? (selectedRequester?.email || selectedRequester?.display_email) : null,
    requester_phone: isMasterUser ? selectedRequester?.phone_number : null,
    frequent_requester_id: isMasterUser && selectedRequester?.type === 'frequent_requester' ? selectedRequester.id : null,
    notification_phones: wantNotifications ? notificationPhones.filter(p => p && p.trim().length > 5) : []
  });
  
  if (response.data.success) {
    setRequestSuccess(true);
    setTimeout(() => { navigate('/MinhasSolicitacoes'); }, 4000);
  } else {
    throw new Error(response.data.error || 'Erro ao criar viagens');
  }
  setIsSubmitting(false);
  return;
}
```

---

## ✅ Checklist de Verificação

Após fazer todas as mudanças:

- [ ] Imports adicionados no topo
- [ ] Estado `multiTripLegs` declarado
- [ ] Validação Step 1 atualizada
- [ ] Handle calculate com check de multi_trip
- [ ] TabsList mudado para 4 colunas
- [ ] TabsTrigger "Múltiplos Trechos" adicionado
- [ ] TabsContent com CorporateMultiTripManager adicionado
- [ ] Botão continuar atualizado
- [ ] Condição Step 3 atualizada
- [ ] Botão voltar atualizado
- [ ] Submit handler com lógica multi_trip

## 🎯 Resultado Esperado

Após as modificações, o usuário poderá:
1. Selecionar a aba "Múltiplos Trechos"
2. Adicionar/remover trechos dinamicamente
3. Cada trecho tem origem, destino, data, hora e seleção de veículo
4. Calcular preços automaticamente para cada trecho
5. Visualizar o total do itinerário
6. Submeter todos os trechos de uma vez

---

**Documentação criada em:** 13/03/2026
**Versão:** 1.0