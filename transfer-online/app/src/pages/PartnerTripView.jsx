import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Calendar, Clock, MapPin, Truck, Users, User, Plane, AlertCircle, Phone, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from '@/components/ui/button';

export default function PartnerTripView() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token) {
            setError("Link inválido.");
            setLoading(false);
            return;
        }
        loadData();
    }, [token]);

    const loadData = async () => {
        setLoading(true);
        try {
            const response = await base44.functions.invoke('getSharedEventTrip', { token });
            if (response.data && response.data.success) {
                setData(response.data);
            } else {
                setError("Viagem não encontrada ou link expirado.");
            }
        } catch (err) {
            console.error(err);
            setError("Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md text-center border-red-200">
                    <CardContent className="pt-6">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
                        <p className="text-gray-600">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { trip, passengers, event } = data;

    const safeFormat = (dateStr, fmtStr) => {
        if (!dateStr) return '-';
        try {
            const date = new Date((dateStr.length === 10 && !dateStr.includes('T')) ? `${dateStr}T12:00:00` : dateStr);
            return format(date, fmtStr, { locale: ptBR });
        } catch (e) { return '-'; }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Ordem de Serviço - Parceiro</h1>
                        <p className="text-gray-500">{event.name} • {safeFormat(trip.date, "dd/MM/yyyy")}</p>
                    </div>
                    <Button onClick={() => window.print()} variant="outline" className="hidden md:flex">
                        <Download className="w-4 h-4 mr-2" /> Imprimir / PDF
                    </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-t-4 border-t-blue-600">
                        <CardHeader className="bg-gray-50/50 pb-2">
                            <CardTitle className="text-base font-bold text-gray-700 flex items-center gap-2">
                                <Truck className="w-4 h-4" /> Dados da Viagem
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Identificação</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                        {trip.trip_code || "N/A"}
                                    </Badge>
                                    <span className="font-bold text-lg">{trip.name}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Data
                                    </p>
                                    <p className="font-medium">{safeFormat(trip.date, "dd/MM/yyyy")}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Horário
                                    </p>
                                    <p className="font-medium text-lg text-blue-700">{trip.start_time}</p>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-dashed">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-green-600" /> Origem
                                    </p>
                                    <p className="font-medium text-sm">{trip.origin}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-red-600" /> Destino
                                    </p>
                                    <p className="font-medium text-sm">{trip.destination}</p>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-dashed">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Veículo Solicitado</p>
                                <p className="font-medium">{trip.vehicle_type_category} (Capacidade: {trip.vehicle_capacity})</p>
                            </div>
                            
                            {trip.notes && (
                                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100">
                                    <p className="text-xs text-yellow-700 font-bold mb-1">Observações:</p>
                                    <p className="text-sm text-yellow-800">{trip.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-purple-600">
                        <CardHeader className="bg-gray-50/50 pb-2">
                            <CardTitle className="text-base font-bold text-gray-700 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Passageiros ({passengers.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="h-9 text-xs">Nome</TableHead>
                                        <TableHead className="h-9 text-xs">Voo</TableHead>
                                        <TableHead className="h-9 text-xs">Telefone</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {passengers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                                                Nenhum passageiro listado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        passengers.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-3 h-3 text-gray-400" />
                                                        {p.passenger_name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {p.flight_number ? (
                                                        <div className="flex items-center gap-1">
                                                            <Plane className="w-3 h-3 text-blue-500" />
                                                            {p.flight_number} {p.flight_time ? `(${p.flight_time})` : ''}
                                                        </div>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {p.passenger_phone ? (
                                                        <div className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3 text-green-600" />
                                                            {p.passenger_phone}
                                                        </div>
                                                    ) : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                
                <div className="text-center text-xs text-gray-400 pt-8 pb-4">
                    Este link é atualizado em tempo real. Recarregue a página para ver as informações mais recentes.
                </div>
            </div>
        </div>
    );
}