import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Calendar, Users, Plane, Pencil, XIcon, Plus, Save, Loader2, Car } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatusBadge from '@/components/ui/StatusBadge';

export default function TripDetailsDisplay({ 
  trip, 
  isEditable = false, 
  onSave, 
  isSaving = false,
  onOpenStatusChangeDialog
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    origin: trip.origin || '',
    destination: trip.destination || '',
    date: trip.date || '',
    time: trip.time || '',
    notes: trip.notes || '',
    planned_stops: trip.planned_stops || []
  });

  const parseLocalDate = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const handleStartEdit = () => {
    setFormData({
      origin: trip.origin || '',
      destination: trip.destination || '',
      date: trip.date || '',
      time: trip.time || '',
      notes: trip.notes || '',
      planned_stops: trip.planned_stops || []
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(formData).then(() => {
        setIsEditing(false);
      });
    }
  };

  const handleAddStop = () => {
    setFormData(prev => ({
      ...prev,
      planned_stops: [...prev.planned_stops, { address: '', order: prev.planned_stops.length + 1, notes: '' }]
    }));
  };

  const handleRemoveStop = (index) => {
    setFormData(prev => {
      const updated = prev.planned_stops.filter((_, i) => i !== index);
      updated.forEach((stop, i) => stop.order = i + 1);
      return { ...prev, planned_stops: updated };
    });
  };

  const handleUpdateStop = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.planned_stops];
      updated[index][field] = value;
      return { ...prev, planned_stops: updated };
    });
  };

  return (
    <div className="space-y-6">
      {/* Informações da Viagem */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-3">Informações da Viagem</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Tipo:</span>
            <span className="font-medium">
              {trip.service_type === 'one_way' ? 'Só Ida' :
                trip.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Passageiros:</span>
            <span className="font-medium">{trip.passengers}</span>
          </div>
          {trip.driver_language && (
            <div className="flex justify-between">
              <span className="text-gray-600">Idioma:</span>
              <span className="font-medium">
                {trip.driver_language === 'pt' ? 'Português' :
                  trip.driver_language === 'en' ? 'English' : 'Español'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Rota e Detalhes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">Rota</span>
          </div>
          <div className="flex gap-2">
            {isEditable && !isEditing && trip.driver_name && onOpenStatusChangeDialog && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onOpenStatusChangeDialog(trip)}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Alterar Status
              </Button>
            )}
            {isEditable && !isEditing && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleStartEdit}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Editar Detalhes
              </Button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">Origem *</Label>
                <Input
                  value={formData.origin}
                  onChange={(e) => setFormData({...formData, origin: e.target.value})}
                  placeholder="Endereço de origem"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold">Destino *</Label>
                <Input
                  value={formData.destination}
                  onChange={(e) => setFormData({...formData, destination: e.target.value})}
                  placeholder="Endereço de destino"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold">Data *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Horário *</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Observações sobre a viagem"
                  className="mt-1 h-20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Paradas Planejadas</Label>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleAddStop}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar Parada
                  </Button>
                </div>
                {formData.planned_stops.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {formData.planned_stops.map((stop, index) => (
                      <div key={index} className="bg-white border rounded-lg p-3">
                        <div className="flex items-start gap-2 mb-2">
                          <Badge className="bg-yellow-100 text-yellow-800">Parada {index + 1}</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveStop(index)}
                            className="ml-auto h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                          >
                            <XIcon className="w-4 h-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Endereço da parada"
                          value={stop.address}
                          onChange={(e) => handleUpdateStop(index, 'address', e.target.value)}
                          className="mb-2"
                        />
                        <Input
                          placeholder="Observações (opcional)"
                          value={stop.notes}
                          onChange={(e) => handleUpdateStop(index, 'notes', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="ml-7 bg-gray-50 p-3 rounded-lg">
            <div className="text-sm flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <div className="mt-1 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <div>
                  <span className="text-xs text-gray-500 block">Origem</span>
                  <span className="font-semibold">{trip.origin}</span>
                </div>
              </div>

              {trip.planned_stops && trip.planned_stops.length > 0 && (
                <div className="ml-1 pl-4 border-l-2 border-dashed border-gray-300 space-y-3 py-1">
                  {trip.planned_stops.map((stop, index) => (
                    <div key={index} className="flex items-start gap-2 relative -left-[5px]">
                      <div className="mt-1 w-2 h-2 rounded-full bg-yellow-400 shrink-0 border border-white ring-2 ring-gray-50" />
                      <div>
                        <span className="text-xs text-gray-500 block">Parada Planejada {index + 1}</span>
                        <span className="text-gray-800">{stop.address}</span>
                        {stop.notes && <p className="text-xs text-gray-500 italic mt-0.5">{stop.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {trip.additional_stops && trip.additional_stops.length > 0 && (
                <div className="ml-1 pl-4 border-l-2 border-dashed border-gray-300 space-y-3 py-1">
                  {trip.additional_stops.map((stop, index) => (
                    <div key={index} className="flex items-start gap-2 relative -left-[5px]">
                      <div className="mt-1 w-2 h-2 rounded-full bg-orange-400 shrink-0 border border-white ring-2 ring-gray-50" />
                      <div>
                        <span className="text-xs text-gray-500 block">Parada Adicional {index + 1}</span>
                        {stop.address ? (
                          <>
                              <span className="text-gray-800 font-medium">{stop.address}</span>
                              {stop.notes && <p className="text-xs text-gray-500 italic mt-0.5">{stop.notes}</p>}
                          </>
                        ) : (
                          <span className="text-gray-800">{stop.notes}</span>
                        )}
                        {stop.timestamp && (
                          <p className="text-xs text-gray-500 italic mt-0.5">
                            {format(new Date(stop.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-2">
                <div className="mt-1 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <div>
                  <span className="text-xs text-gray-500 block">Destino</span>
                  <span className="font-semibold">{trip.destination}</span>
                </div>
              </div>
            </div>
            {trip.distance_km > 0 && (
              <p className="text-xs text-gray-500 mt-3 pt-2 border-t">
                Distância total estimada: {trip.distance_km} km
              </p>
            )}
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm text-gray-500">Data</div>
              <div className="font-semibold">
                {parseLocalDate(trip.date).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm text-gray-500">Horário</div>
              <div className="font-semibold">{trip.time}</div>
            </div>
          </div>
        </div>
      )}

      {/* Dados do Passageiro */}
      <div className="border-t pt-4">
        <h3 className="font-semibold text-lg mb-4">Dados do Passageiro</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">Nome</div>
              <div className="font-medium">{trip.passenger_name}</div>
            </div>
          </div>
          {trip.passenger_email && (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5" />
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium">{trip.passenger_email}</div>
              </div>
            </div>
          )}
          {trip.passenger_phone && (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5" />
              <div>
                <div className="text-sm text-gray-500">Telefone</div>
                <div className="font-medium">{trip.passenger_phone}</div>
              </div>
            </div>
          )}

          {trip.passengers_details && trip.passengers_details.length > 0 && (
            <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
              <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Passageiros Adicionais ({trip.passengers_details.length})
              </div>
              <div className="space-y-3 pl-7">
                {trip.passengers_details.map((p, idx) => (
                  <div key={idx} className="text-sm bg-gray-50 p-2 rounded border">
                    <div className="font-medium">{p.name}</div>
                    {(p.document_type || p.document_number) && (
                      <div className="text-xs text-gray-500">
                        {p.document_type}: {p.document_number}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {(trip.driver_name || trip.vehicle_model) && (
        <div className="border-t pt-4">
          <h3 className="font-semibold text-lg mb-4">Dados do Motorista e Veículo</h3>
          <div className="space-y-3">
            {trip.driver_name && (
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Motorista</div>
                  <div className="font-medium">{trip.driver_name}</div>
                </div>
              </div>
            )}
            {trip.driver_phone && (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5" />
                <div>
                  <div className="text-sm text-gray-500">Telefone do Motorista</div>
                  <div className="font-medium">{trip.driver_phone}</div>
                </div>
              </div>
            )}
            {trip.driver_photo_url && (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5" />
                <div>
                  <div className="text-sm text-gray-500">Foto do Motorista</div>
                  <img src={trip.driver_photo_url} alt="Foto do Motorista" className="w-16 h-16 rounded-full object-cover mt-1" />
                </div>
              </div>
            )}
            {trip.vehicle_model && (
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Modelo do Veículo</div>
                  <div className="font-medium">{trip.vehicle_model}</div>
                </div>
              </div>
            )}
            {trip.vehicle_plate && (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5" />
                <div>
                  <div className="text-sm text-gray-500">Placa do Veículo</div>
                  <div className="font-medium">{trip.vehicle_plate}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {trip.notes && !isEditing && (
        <div className="border-t pt-4">
          <h3 className="font-semibold text-lg mb-2">Observações</h3>
          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{trip.notes}</p>
        </div>
      )}

      {/* Exibição de Itinerário Completo para Agências/Eventos */}
      {trip.agency_quoted_legs && trip.agency_quoted_legs.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="font-semibold text-lg mb-4 text-orange-900 flex items-center gap-2">
            <MapPin className="w-5 h-5" /> Itinerário Completo (Agência)
          </h3>
          <div className="space-y-4">
            {trip.agency_quoted_legs.map((leg, index) => (
              <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3 border-b border-orange-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white text-orange-800 border-orange-300">Trecho #{index + 1}</Badge>
                    <span className="text-sm font-semibold text-orange-900">
                      {leg.service_type === 'transfer' ? 'Transfer' : 
                       leg.service_type === 'hourly_5' ? '5 Horas' : 
                       leg.service_type === 'hourly_10' ? '10 Horas' : 'Por Hora'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {leg.date ? format(new Date(leg.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    <Clock className="w-4 h-4 ml-2" />
                    {leg.time}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Origem</div>
                    <div className="text-sm text-gray-900">{leg.origin}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">Destino</div>
                    <div className="text-sm text-gray-900">{leg.destination}</div>
                  </div>
                </div>

                {leg.notes && (
                  <div className="mb-3 bg-white p-2 rounded border border-orange-100 text-xs text-gray-600">
                    <strong>Obs:</strong> {leg.notes}
                  </div>
                )}

                {leg.vehicle_options && leg.vehicle_options.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-2">Veículos Cotados</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {leg.vehicle_options.map((opt, optIdx) => (
                        <div key={optIdx} className="bg-white p-2 rounded border border-gray-200 text-center">
                          <div className="text-[10px] text-gray-500">{opt.vehicle_type_name}</div>
                          <div className="font-bold text-green-700 text-sm">
                            {opt.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(opt.price) : '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {leg.selected_additional_items && leg.selected_additional_items.length > 0 && (
                  <div className="mt-3 border-t border-orange-200 pt-2">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-2">Itens Adicionais</div>
                    <div className="flex flex-wrap gap-2">
                      {leg.selected_additional_items.map((item, i) => (
                        <Badge key={i} variant="outline" className="bg-white border-orange-200 text-orange-800 text-xs">
                          {item.quantity}x {item.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}