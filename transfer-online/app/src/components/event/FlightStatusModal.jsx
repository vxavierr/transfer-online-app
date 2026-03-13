import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plane, Clock, MapPin, Calendar, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function FlightStatusModal({ isOpen, onClose, flightNumber, airline, token }) {
    const [loading, setLoading] = useState(false);
    const [flightData, setFlightData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && flightNumber) {
            fetchFlightStatus();
        }
    }, [isOpen, flightNumber]);

    const fetchFlightStatus = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await base44.functions.invoke('checkFlightStatus', {
                flightNumber: flightNumber,
                token: token
            });

            console.log("Flight status response:", response.data);
            
            if (response.data?.success && response.data?.flight) {
                setFlightData(response.data.flight);
            } else {
                const errorMsg = response.data?.error || 'Não foi possível obter informações do voo';
                console.error("Flight status error:", errorMsg, response.data);
                setError(errorMsg);
            }
        } catch (err) {
            console.error('Erro ao buscar status do voo:', err);
            setError('Erro ao conectar com o serviço de rastreamento');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'scheduled': { label: 'Agendado', color: 'bg-blue-100 text-blue-700', icon: Clock },
            'active': { label: 'Em Voo', color: 'bg-green-100 text-green-700', icon: Plane },
            'landed': { label: 'Aterrissou', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
            'cancelled': { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
            'incident': { label: 'Incidente', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
            'diverted': { label: 'Desviado', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle }
        };

        const statusInfo = statusMap[status?.toLowerCase()] || { label: status || 'Desconhecido', color: 'bg-gray-100 text-gray-700', icon: AlertCircle };
        const Icon = statusInfo.icon;

        return (
            <Badge className={`${statusInfo.color} flex items-center gap-1`}>
                <Icon className="w-3 h-3" />
                {statusInfo.label}
            </Badge>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plane className="w-5 h-5" />
                        Rastreamento de Voo
                    </DialogTitle>
                </DialogHeader>

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                {!loading && !error && flightData && (
                    <div className="space-y-4">
                        {/* Flight Info Header */}
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase">Voo</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {flightData.airline?.name || airline} {flightData.flight?.iata || flightNumber}
                                    </p>
                                </div>
                                {getStatusBadge(flightData.flight_status)}
                            </div>
                            {flightData.flight?.icao && (
                                <p className="text-xs text-gray-500">Código ICAO: {flightData.flight.icao}</p>
                            )}
                        </div>

                        {/* Departure */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-100 rounded-full p-2">
                                    <MapPin className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 uppercase mb-1">Partida</p>
                                    <p className="font-semibold text-gray-900">
                                        {flightData.departure?.airport || 'N/A'}
                                    </p>
                                    {flightData.departure?.iata && (
                                        <p className="text-sm text-gray-600">
                                            {flightData.departure.iata} - {flightData.departure?.timezone || ''}
                                        </p>
                                    )}
                                    {flightData.departure?.scheduled && (
                                        <div className="mt-2 space-y-1">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-700">
                                                    Previsto: {format(new Date(flightData.departure.scheduled), 'dd/MM/yyyy HH:mm')}
                                                </span>
                                            </div>
                                            {flightData.departure?.estimated && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock className="w-4 h-4 text-orange-400" />
                                                    <span className="text-orange-700">
                                                        Estimado: {format(new Date(flightData.departure.estimated), 'dd/MM/yyyy HH:mm')}
                                                    </span>
                                                </div>
                                            )}
                                            {flightData.departure?.actual && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                                    <span className="text-green-700">
                                                        Real: {format(new Date(flightData.departure.actual), 'dd/MM/yyyy HH:mm')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {flightData.departure?.gate && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            Portão: <span className="font-semibold">{flightData.departure.gate}</span>
                                        </p>
                                    )}
                                    {flightData.departure?.terminal && (
                                        <p className="text-sm text-gray-600">
                                            Terminal: <span className="font-semibold">{flightData.departure.terminal}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Arrival */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <div className="bg-green-100 rounded-full p-2">
                                    <MapPin className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 uppercase mb-1">Chegada</p>
                                    <p className="font-semibold text-gray-900">
                                        {flightData.arrival?.airport || 'N/A'}
                                    </p>
                                    {flightData.arrival?.iata && (
                                        <p className="text-sm text-gray-600">
                                            {flightData.arrival.iata} - {flightData.arrival?.timezone || ''}
                                        </p>
                                    )}
                                    {flightData.arrival?.scheduled && (
                                        <div className="mt-2 space-y-1">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-700">
                                                    Previsto: {format(new Date(flightData.arrival.scheduled), 'dd/MM/yyyy HH:mm')}
                                                </span>
                                            </div>
                                            {flightData.arrival?.estimated && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock className="w-4 h-4 text-orange-400" />
                                                    <span className="text-orange-700">
                                                        Estimado: {format(new Date(flightData.arrival.estimated), 'dd/MM/yyyy HH:mm')}
                                                    </span>
                                                </div>
                                            )}
                                            {flightData.arrival?.actual && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                                    <span className="text-green-700">
                                                        Real: {format(new Date(flightData.arrival.actual), 'dd/MM/yyyy HH:mm')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {flightData.arrival?.gate && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            Portão: <span className="font-semibold">{flightData.arrival.gate}</span>
                                        </p>
                                    )}
                                    {flightData.arrival?.terminal && (
                                        <p className="text-sm text-gray-600">
                                            Terminal: <span className="font-semibold">{flightData.arrival.terminal}</span>
                                        </p>
                                    )}
                                    {flightData.arrival?.baggage && (
                                        <p className="text-sm text-gray-600">
                                            Esteira: <span className="font-semibold">{flightData.arrival.baggage}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        {flightData.aircraft && (
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 uppercase mb-1">Aeronave</p>
                                <p className="text-sm text-gray-700">
                                    {flightData.aircraft.registration && `Registro: ${flightData.aircraft.registration}`}
                                    {flightData.aircraft.iata && ` • Modelo: ${flightData.aircraft.iata}`}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {!loading && !error && !flightData && (
                    <div className="text-center py-8 text-gray-500">
                        Insira um número de voo para rastrear
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}