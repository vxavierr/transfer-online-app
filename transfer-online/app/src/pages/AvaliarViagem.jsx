import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Loader2, CheckCircle, AlertCircle, Car, User, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AvaliarViagem() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tripData, setTripData] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Data
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Avaliações específicas
  const [punctuality, setPunctuality] = useState(0);
  const [vehicleCondition, setVehicleCondition] = useState(0);
  const [driverBehavior, setDriverBehavior] = useState(0);

  useEffect(() => {
    const loadTrip = async () => {
      if (!token) {
        setError('Link inválido ou incompleto (token ausente).');
        setLoading(false);
        return;
      }

      try {
        const response = await base44.functions.invoke('getRatingInfoByToken', { token });
        if (response.data.success) {
          setTripData(response.data.trip);
        } else {
          setError(response.data.error || 'Erro ao carregar dados da viagem.');
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Erro de conexão.');
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Por favor, selecione uma nota geral.');
      return;
    }
    if (!name) {
      alert('Por favor, informe seu nome.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await base44.functions.invoke('submitRatingByToken', {
        token,
        rating,
        comment,
        submitted_by_name: name,
        submitted_by_email: email,
        punctuality: punctuality || rating,
        vehicle_condition: vehicleCondition || rating,
        driver_behavior: driverBehavior || rating
      });

      if (response.data.success) {
        setSubmitted(true);
      } else {
        alert(response.data.error || 'Erro ao enviar avaliação.');
      }
    } catch (err) {
      alert('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, size = "md", label }) => (
    <div className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange && onChange(star)}
            className={`transition-colors ${onChange ? 'hover:scale-110' : 'cursor-default'}`}
            disabled={!onChange}
          >
            <Star
              className={`${
                size === "lg" ? "w-8 h-8" : "w-6 h-6"
              } ${
                star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md border-red-200 shadow-lg">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Link Inválido ou Expirado</h2>
            <p className="text-gray-600">{error}</p>
            <p className="text-xs text-gray-400 mt-4 font-mono bg-gray-100 p-2 rounded">Token buscado: {token}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md border-green-200 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Obrigado!</h2>
            <p className="text-gray-600">Sua avaliação foi enviada com sucesso.</p>
            <p className="text-sm text-gray-500 mt-4">Você pode fechar esta página agora.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Avalie sua Experiência</h1>
          <p className="mt-2 text-gray-600">Sua opinião nos ajuda a melhorar nossos serviços</p>
        </div>

        <Card className="shadow-xl border-t-4 border-blue-600 mb-6">
          <CardHeader className="bg-gray-50/50 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              Detalhes da Viagem
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Data</p>
                  <p className="text-gray-900">
                    {format(new Date(tripData.date), "dd/MM/yyyy", { locale: ptBR })} às {tripData.time}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Motorista</p>
                  <p className="text-gray-900">{tripData.driver_name}</p>
                  <p className="text-xs text-gray-500">{tripData.vehicle_model}</p>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-2">
              <div className="flex items-start gap-3 mb-2">
                <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">ORIGEM</p>
                  <p className="text-sm text-gray-900">{tripData.origin}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">DESTINO</p>
                  <p className="text-sm text-gray-900">{tripData.destination}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-xl">
            <CardContent className="p-6 space-y-8">
              
              {/* Nota Geral */}
              <div className="text-center py-4 border-b border-gray-100">
                <Label className="text-lg mb-3 block">Como foi sua experiência geral?</Label>
                <div className="flex justify-center">
                  <StarRating value={rating} onChange={setRating} size="lg" />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {rating === 0 ? 'Selecione as estrelas' : 
                   rating === 5 ? 'Excelente!' :
                   rating === 4 ? 'Muito bom' :
                   rating === 3 ? 'Bom' :
                   rating === 2 ? 'Ruim' : 'Péssimo'}
                </p>
              </div>

              {/* Critérios Específicos */}
              <div className="grid gap-6 sm:grid-cols-3">
                <StarRating 
                  label="Pontualidade" 
                  value={punctuality} 
                  onChange={setPunctuality} 
                />
                <StarRating 
                  label="Veículo" 
                  value={vehicleCondition} 
                  onChange={setVehicleCondition} 
                />
                <StarRating 
                  label="Motorista" 
                  value={driverBehavior} 
                  onChange={setDriverBehavior} 
                />
              </div>

              {/* Identificação */}
              <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="name">Seu Nome *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Digite seu nome"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Seu E-mail (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Para receber confirmação"
                  />
                </div>
              </div>

              {/* Comentário */}
              <div className="space-y-2">
                <Label htmlFor="comment">Deixe um comentário (opcional)</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Conte-nos mais sobre como foi a viagem..."
                  className="min-h-[100px]"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Avaliação'
                )}
              </Button>

            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}