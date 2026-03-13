import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Star, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function TripRatingDialog({ serviceRequest, open, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [vehicleConditionRating, setVehicleConditionRating] = useState(0);
  const [driverBehaviorRating, setDriverBehaviorRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Check if already favorite
  React.useEffect(() => {
    const checkFavorite = async () => {
      if (serviceRequest?.driver_id) {
        const user = await base44.auth.me();
        if (user) {
          const favs = await base44.entities.FavoriteDriver.filter({ user_id: user.id, driver_id: serviceRequest.driver_id });
          if (favs.length > 0) setIsFavorite(true);
        }
      }
    };
    checkFavorite();
  }, [serviceRequest]);

  const queryClient = useQueryClient();

  const submitRatingMutation = useMutation({
    mutationFn: async (ratingData) => {
      const response = await base44.functions.invoke('submitRating', ratingData);
      return response.data;
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['myServiceRequests'] });
      setTimeout(() => {
        onClose();
        setSuccess(false);
        resetForm();
      }, 2000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao enviar avaliação');
    }
  });

  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setPunctualityRating(0);
    setVehicleConditionRating(0);
    setDriverBehaviorRating(0);
    setComment('');
    setError('');
  };

  const handleSubmit = () => {
    if (rating === 0) {
      setError('Por favor, selecione uma avaliação geral');
      return;
    }

    setError('');
    submitRatingMutation.mutate({
      serviceRequestId: serviceRequest.id,
      rating,
      comment,
      punctuality_rating: punctualityRating || null,
      vehicle_condition_rating: vehicleConditionRating || null,
      driver_behavior_rating: driverBehaviorRating || null
    });

    // Handle Favorite Toggle if changed
    if (serviceRequest.driver_id) {
        base44.functions.invoke('toggleFavoriteDriver', { driver_id: serviceRequest.driver_id })
            .then(res => {
                if (res.data.is_favorite !== isFavorite) {
                    // Sync state just in case, but user intent was fulfilled
                }
            })
            .catch(console.error);
    }
  };

  const StarRating = ({ value, onChange, label }) => {
    const [hover, setHover] = useState(0);

    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700">{label}</div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hover || value)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (!serviceRequest) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            ⭐ Avaliar Viagem
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Avaliação Enviada!
            </h3>
            <p className="text-gray-600">
              Obrigado pelo seu feedback! Isso nos ajuda a melhorar nosso serviço.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Viagem:</div>
              <div className="font-bold text-lg">{serviceRequest.request_number}</div>
              <div className="text-sm text-gray-600 mt-2">
                Motorista: <span className="font-semibold">{serviceRequest.driver_name}</span>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              {/* Avaliação Geral */}
              <div className="space-y-2">
                <div className="text-base font-semibold text-gray-900">
                  Avaliação Geral * <span className="text-sm font-normal text-gray-500">(Obrigatório)</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          star <= (hoverRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600">
                    {rating === 1 && '😞 Muito ruim'}
                    {rating === 2 && '😕 Ruim'}
                    {rating === 3 && '😐 Regular'}
                    {rating === 4 && '😊 Bom'}
                    {rating === 5 && '🤩 Excelente'}
                  </p>
                )}
              </div>

              {/* Avaliações Detalhadas (Opcionais) */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold text-gray-900">
                  Avaliações Detalhadas <span className="text-sm font-normal text-gray-500">(Opcional)</span>
                </h3>
                
                <StarRating
                  value={punctualityRating}
                  onChange={setPunctualityRating}
                  label="⏰ Pontualidade"
                />

                <StarRating
                  value={vehicleConditionRating}
                  onChange={setVehicleConditionRating}
                  label="🚗 Estado do Veículo"
                />

                <StarRating
                  value={driverBehaviorRating}
                  onChange={setDriverBehaviorRating}
                  label="😊 Comportamento do Motorista"
                />
              </div>

              {/* Comentário */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Comentário (Opcional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Compartilhe sua experiência com esta viagem..."
                  className="h-24"
                />
              </div>

              {/* Favoritar Motorista */}
              {serviceRequest.driver_id && (
                <div className="flex items-center gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setIsFavorite(!isFavorite)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                            isFavorite 
                                ? 'bg-red-50 border-red-200 text-red-600' 
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <Star className={`w-5 h-5 ${isFavorite ? 'fill-red-600 text-red-600' : 'text-gray-400'}`} />
                        <span className="font-medium text-sm">
                            {isFavorite ? 'Motorista Favorito' : 'Adicionar aos Favoritos'}
                        </span>
                    </button>
                    <span className="text-xs text-gray-500">
                        Isso sinaliza sua preferência para futuras viagens.
                    </span>
                </div>
              )}
            </div>
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button onClick={onClose} variant="outline" disabled={submitRatingMutation.isLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitRatingMutation.isLoading || rating === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitRatingMutation.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Enviar Avaliação
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}