import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function UpdateTripStatusDialog({ trip, open, onClose, onConfirm }) {
  const [newStatus, setNewStatus] = useState(trip?.driver_trip_status || 'aguardando');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const statusOptions = [
    { value: 'aguardando', label: 'Aguardando Início' },
    { value: 'a_caminho', label: 'A Caminho da Origem' },
    { value: 'chegou_origem', label: 'Chegou na Origem' },
    { value: 'passageiro_embarcou', label: 'Passageiro Embarcou' },
    { value: 'parada_adicional', label: 'Parada Adicional' },
    { value: 'a_caminho_destino', label: 'A Caminho do Destino' },
    { value: 'chegou_destino', label: 'Chegou no Destino' },
    { value: 'aguardando_confirmacao_despesas', label: 'Aguardando Conf. Despesas' },
    { value: 'finalizada', label: 'Finalizada' },
    { value: 'no_show', label: 'Passageiro Não Compareceu' },
    { value: 'cancelada_motorista', label: 'Cancelada pelo Motorista' },
  ];

  React.useEffect(() => {
    if (trip) {
      setNewStatus(trip.driver_trip_status || 'aguardando');
      setError('');
      setSuccess('');
    }
  }, [trip]);

  const handleSubmit = async () => {
    if (!trip || !newStatus) {
      setError('Selecione um status válido.');
      return;
    }

    setIsUpdating(true);
    setError('');
    setSuccess('');

    try {
      await onConfirm(trip, newStatus);
      setSuccess('Status atualizado com sucesso!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setError(err.message || 'Erro ao atualizar o status da viagem.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Atualizar Status da Viagem</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center space-x-2">
            <Label htmlFor="current-status" className="font-semibold">Status Atual:</Label>
            <span id="current-status" className="text-gray-700">{statusOptions.find(s => s.value === trip.driver_trip_status)?.label || trip.driver_trip_status}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-status">Novo Status:</Label>
            <Select value={newStatus} onValueChange={setNewStatus} disabled={isUpdating}>
              <SelectTrigger id="new-status">
                <SelectValue placeholder="Selecione o novo status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isUpdating || newStatus === trip.driver_trip_status}>
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}