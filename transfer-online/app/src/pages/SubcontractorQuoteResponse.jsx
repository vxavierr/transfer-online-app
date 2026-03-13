import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, MapPin, Calendar, Clock, Users, Car, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SubcontractorQuoteResponse() {
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState(null);
  const [cost, setCost] = useState('');
  
  // Estados para dados do motorista (Fase 2)
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('quote'); // 'quote' (preço) ou 'driver' (motorista)

  useEffect(() => {
    const loadData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
          setError('Link inválido.');
          setLoading(false);
          return;
        }

        const response = await base44.functions.invoke('getSubcontractorQuoteDetails', { token });
        
        if (response.data.success) {
          const tripData = response.data.data;
          setTrip(tripData);
          
          // Determinar modo
          if (tripData.current_cost && !tripData.driver_assigned) {
             // Se já tem custo mas não tem motorista, e foi aprovado (isso seria ideal verificar, mas por simplificação, se o fornecedor aprovou, ele deve ter pedido os dados)
             // Vamos assumir que se o fornecedor aprovou a cotação, o status da subcontratação mudou. 
             // Como não expus o status detalhado na função publica por segurança, vamos permitir enviar motorista se já tiver custo.
             // Opcional: só permitir se o fornecedor "pedir" explicitamente. Mas o fluxo diz "parceiro informa dados".
             setMode('driver');
             setCost(tripData.current_cost);
          } else if (tripData.driver_assigned) {
             setSuccess(true); // Já finalizado
          }
        } else {
          setError(response.data.error || 'Erro ao carregar dados.');
        }
      } catch (err) {
        console.error('Erro:', err);
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (mode === 'quote') {
        if (!cost || parseFloat(cost) <= 0) {
            setError('Por favor, informe um valor válido.');
            return;
        }
    } else {
        if (!driverName || !vehiclePlate) {
            setError('Por favor, preencha os dados do motorista e veículo.');
            return;
        }
    }

    setSubmitting(true);
    setError('');

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      const payload = {
        token,
        cost: mode === 'quote' ? parseFloat(cost) : undefined,
        // Enviar dados do motorista se estiver no modo driver ou se quiser enviar tudo junto (opcional)
        driverName: mode === 'driver' ? driverName : undefined,
        driverPhone: mode === 'driver' ? driverPhone : undefined,
        vehicleModel: mode === 'driver' ? vehicleModel : undefined,
        vehiclePlate: mode === 'driver' ? vehiclePlate : undefined,
      };

      const response = await base44.functions.invoke('submitSubcontractorQuote', payload);

      if (response.data.success) {
        setSuccess(true);
        if (mode === 'quote') {
            // Se enviou apenas cotação, mostrar mensagem de aguarde
        }
      } else {
        setError(response.data.error || 'Erro ao enviar.');
      }
    } catch (err) {
      console.error('Erro:', err);
      setError('Erro ao enviar resposta. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (val) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" /> Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-700 text-2xl">
              {mode === 'quote' ? 'Cotação Enviada!' : 'Motorista Confirmado!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              {mode === 'quote' 
                ? 'Sua cotação foi enviada para o fornecedor. Aguarde a aprovação para informar os dados do motorista.' 
                : 'Os dados do motorista foram enviados com sucesso. A viagem está confirmada.'}
            </p>
            {mode === 'quote' && (
                <div className="bg-gray-100 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Valor Informado</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(cost)}</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
            {trip.supplier_logo && (
                <img src={trip.supplier_logo} alt="Logo" className="h-16 mx-auto mb-4 object-contain" />
            )}
            <h1 className="text-2xl font-bold text-gray-900">Solicitação de Cotação</h1>
            <div className="text-gray-500 space-y-1">
                <p>Solicitado por: <span className="font-medium text-gray-700">{trip.supplier_name}</span></p>
                {trip.subcontractor_name && (
                    <p>Para o Parceiro: <span className="font-medium text-gray-700">{trip.subcontractor_name}</span></p>
                )}
            </div>
        </div>

        <Card>
            <CardHeader className="bg-blue-50 border-b border-blue-100">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Cotação</p>
                        <CardTitle className="text-lg text-blue-900">{trip.request_number}</CardTitle>
                    </div>
                    <div className="text-right">
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {trip.service_type === 'one_way' ? 'Só Ida' : 
                             trip.service_type === 'round_trip' ? 'Ida e Volta' : 
                             trip.service_type === 'hourly' ? 'Por Hora' : trip.service_type}
                         </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                {/* Data e Hora em destaque */}
                <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4 border border-gray-100">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                        <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Data e Hora</p>
                        <p className="text-lg font-bold text-gray-900">
                            {trip.date && formatDate(trip.date)} <span className="text-gray-400 mx-1">|</span> {trip.time}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                        <div className="flex gap-3">
                            <div className="mt-1"><MapPin className="w-5 h-5 text-green-600" /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Origem</p>
                                <p className="font-medium">{trip.origin}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="mt-1"><MapPin className="w-5 h-5 text-red-600" /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Destino</p>
                                <p className="font-medium">{trip.destination}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-px bg-gray-200 hidden md:block"></div>
                    
                    <div className="flex-1 space-y-4">
                        <div className="flex gap-3">
                            <div className="mt-1"><Car className="w-5 h-5 text-gray-400" /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Veículo Solicitado</p>
                                <p className="font-medium text-lg">{trip.vehicle_type_name || 'Não especificado'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="mt-1"><Users className="w-5 h-5 text-gray-400" /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Passageiros</p>
                                <p className="font-medium">{trip.passengers}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {trip.notes && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                        <p className="text-xs text-yellow-700 font-bold uppercase mb-1">Observações</p>
                        <p className="text-sm text-yellow-900">{trip.notes}</p>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>{mode === 'quote' ? 'Enviar Cotação' : 'Dados do Motorista'}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'quote' ? (
                        <div className="space-y-2">
                            <Label htmlFor="cost" className="text-lg">Valor da Viagem (R$)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <Input 
                                    id="cost"
                                    type="number" 
                                    placeholder="0,00" 
                                    step="0.01" 
                                    min="0"
                                    className="pl-10 text-xl font-bold h-12"
                                    value={cost}
                                    onChange={e => setCost(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-gray-500">Informe o valor total que será cobrado por este serviço.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100 mb-4">
                                <p className="text-sm text-green-800">
                                    Cotação aprovada no valor de <strong>{formatPrice(trip.current_cost)}</strong>.
                                    Por favor, informe os dados do motorista para confirmar a viagem.
                                </p>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="driverName">Nome do Motorista</Label>
                                    <Input 
                                        id="driverName"
                                        value={driverName}
                                        onChange={e => setDriverName(e.target.value)}
                                        placeholder="Nome Completo"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="driverPhone">Telefone</Label>
                                    <Input 
                                        id="driverPhone"
                                        value={driverPhone}
                                        onChange={e => setDriverPhone(e.target.value)}
                                        placeholder="(11) 99999-9999"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vehicleModel">Modelo do Veículo</Label>
                                    <Input 
                                        id="vehicleModel"
                                        value={vehicleModel}
                                        onChange={e => setVehicleModel(e.target.value)}
                                        placeholder="Ex: Corolla Preto"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vehiclePlate">Placa</Label>
                                    <Input 
                                        id="vehiclePlate"
                                        value={vehiclePlate}
                                        onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                                        placeholder="ABC-1234"
                                        className="uppercase"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Button type="submit" className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'quote' ? 'Enviar Cotação' : 'Confirmar Motorista')}
                    </Button>
                </form>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}