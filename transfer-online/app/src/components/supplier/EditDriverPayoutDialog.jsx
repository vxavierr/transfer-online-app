import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Map as MapIcon, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function EditDriverPayoutDialog({ open, onOpenChange, payout, onSave, isLoading }) {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  
  // Trip Data for Map
  const [tripDetails, setTripDetails] = useState(null);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);

  useEffect(() => {
    if (payout) {
      setAmount(payout.amount != null ? payout.amount.toFixed(2) : '');
      setStatus(payout.status || 'pendente');
      setNotes(payout.notes || '');
      
      // Fetch trip details for map
      fetchTripDetails(payout);
    } else {
      setTripDetails(null);
      setRouteCoordinates([]);
    }
  }, [payout]);

  const fetchTripDetails = async (payoutData) => {
    setLoadingTrip(true);
    setRouteCoordinates([]);
    setTripDetails(null);
    try {
      let data;
      if (payoutData.type === 'service_request') {
        data = await base44.entities.ServiceRequest.get(payoutData.id);
      } else if (payoutData.type === 'supplier_own_booking') {
        data = await base44.entities.SupplierOwnBooking.get(payoutData.id);
      } else if (payoutData.type === 'event_trip') {
        data = await base44.entities.EventTrip.get(payoutData.id);
      }
      
      setTripDetails(data);

      // Extract coordinates from command_history if available
      if (data && data.command_history && Array.isArray(data.command_history)) {
        const coords = data.command_history
          .filter(cmd => cmd.latitude && cmd.longitude)
          .map(cmd => [cmd.latitude, cmd.longitude]);
        setRouteCoordinates(coords);
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes da viagem:", error);
    } finally {
      setLoadingTrip(false);
    }
  };

  const handleSave = () => {
    onSave({
      id: payout.id,
      type: payout.type,
      amount: parseFloat(amount),
      status: status,
      notes: notes,
    });
  };

  if (!payout) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pagamento de Motorista</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Lado Esquerdo - Formulário */}
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-gray-700">
                <strong>Solicitação:</strong> <span className="font-mono text-blue-600">{payout.request_number}</span>
              </p>
              <p className="text-sm text-gray-700">
                <strong>Motorista:</strong> {payout.driver_name}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Data Viagem:</strong> {payout.trip_date ? format(new Date(payout.trip_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
              </p>
              {tripDetails && (
                <>
                   <p className="text-sm text-gray-700">
                    <strong>Origem:</strong> {tripDetails.origin}
                  </p>
                   <p className="text-sm text-gray-700">
                    <strong>Destino:</strong> {tripDetails.destination}
                  </p>
                </>
              )}
            </div>

            <div>
              <Label htmlFor="amount">Valor a Pagar (R$)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
                step="0.01"
              />
            </div>

            <div>
              <Label htmlFor="status">Status do Pagamento</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="mt-1">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre o pagamento (ex: 'PIX realizado')"
                className="mt-1 h-24"
              />
            </div>
          </div>

          {/* Lado Direito - Mapa */}
          <div className="flex flex-col h-full min-h-[300px] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
            <div className="p-2 bg-gray-200 border-b border-gray-300 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-gray-600 flex items-center gap-1">
                <MapIcon className="w-3 h-3" /> Trajeto Realizado
              </span>
              {routeCoordinates.length > 0 && (
                <span className="text-xs text-gray-500">{routeCoordinates.length} pontos rastreados</span>
              )}
            </div>
            
            <div className="flex-1 relative">
              {loadingTrip ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : routeCoordinates.length > 0 ? (
                <MapContainer 
                  center={routeCoordinates[0]} 
                  zoom={13} 
                  style={{ height: '100%', width: '100%', minHeight: '300px' }}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <Polyline 
                    positions={routeCoordinates} 
                    color="blue" 
                    weight={4} 
                    opacity={0.7} 
                  />
                  <Marker position={routeCoordinates[0]}>
                    <Popup>Início</Popup>
                  </Marker>
                  <Marker position={routeCoordinates[routeCoordinates.length - 1]}>
                    <Popup>Fim</Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                  <Info className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">Nenhum histórico de trajeto encontrado para esta viagem.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}