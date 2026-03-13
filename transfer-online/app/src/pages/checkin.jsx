import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, CheckCircle, User, Truck, MapPin, QrCode, AlertTriangle, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import QRCode from 'qrcode';

export default function CheckInPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Helper to format date strictly from YYYY-MM-DD string to DD/MM/YYYY
    // ignoring timezone differences
    const formatDateStrict = (dateStr) => {
        if (!dateStr) return '';
        try {
            const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
            const parts = cleanDate.split('-');
            if (parts.length === 3) {
                const [year, month, day] = parts;
                return `${day}/${month}/${year}`;
            }
            return format(new Date(dateStr), 'dd/MM/yyyy');
        } catch (e) {
            return dateStr;
        }
    };
    
    const tripId = searchParams.get("tripId");
    const passengerId = searchParams.get("passengerId");

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [checkinLoading, setCheckinLoading] = useState(false);
    const [checkinSuccess, setCheckinSuccess] = useState(false);

    useEffect(() => {
        if (!tripId || !passengerId) {
            setError("Link inválido. Parâmetros ausentes.");
            setLoading(false);
            return;
        }
        loadBoardingPass();
    }, [tripId, passengerId]);

    const loadBoardingPass = async () => {
        try {
            const response = await base44.functions.invoke('getBoardingPassPublic', { tripId, passengerId });
            
            if (response.data && response.data.success) {
                setData(response.data.data);
                
                // Generate QR Code
                const url = window.location.href;
                try {
                    const qr = await QRCode.toDataURL(url, { width: 200, margin: 1 });
                    setQrCodeUrl(qr);
                } catch (e) {
                    console.error("QR Gen error", e);
                }
            } else {
                setError(response.data?.error || "Dados não encontrados.");
            }
        } catch (err) {
            console.error("Erro ao carregar cartão:", err);
            setError("Falha ao carregar informações. Verifique sua conexão.");
        } finally {
            setLoading(false);
        }
    };

    const handleStaffCheckIn = async () => {
        if (!confirm("Confirmar embarque deste passageiro?")) return;

        setCheckinLoading(true);
        try {
            const response = await base44.functions.invoke('processCheckIn', { tripId, passengerId });
            
            if (response.data && (response.data.success || response.data.alreadyCheckedIn)) {
                setCheckinSuccess(true);
                // Refresh data to show updated status
                loadBoardingPass();
            } else {
                alert(response.data?.error || "Falha ao processar check-in. Você tem permissão?");
            }
        } catch (err) {
            console.error("Erro checkin:", err);
            alert("Erro ao conectar. Você precisa estar logado como staff/motorista.");
            // Optional: redirect to login
            // base44.auth.redirectToLogin(window.location.href);
        } finally {
            setCheckinLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500">Carregando cartão de embarque...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
                <Card className="w-full max-w-md border-t-4 border-t-red-500">
                    <CardContent className="pt-6 text-center">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Ops! Algo deu errado</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <Button onClick={() => window.location.reload()} variant="outline">Tentar Novamente</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { passenger, trip, event, driver, vehicle } = data;
    const isBoarded = passenger.boarding_status === 'boarded' || checkinSuccess;

    const tripCodeInitials = trip.trip_code ? trip.trip_code.split('-')[0] : '';

    return (
        <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
            <Card className="w-full max-w-md shadow-2xl overflow-hidden border-0">
                {/* Header */}
                <div className="bg-blue-600 p-6 text-white text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-xl font-bold uppercase tracking-wider">Cartão de Embarque</h1>
                        <p className="text-blue-100 text-sm mt-1">{event.event_name}</p>
                    </div>
                    {/* Decorative circles */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full translate-x-1/3 translate-y-1/3"></div>
                </div>

                <CardContent className="p-0">
                    {/* Status Banner */}
                    {isBoarded ? (
                        <div className="bg-green-100 text-green-800 p-3 text-center text-sm font-bold flex items-center justify-center gap-2">
                            <CheckCircle className="w-4 h-4" /> EMBARQUE CONFIRMADO
                        </div>
                    ) : (
                        <div className="bg-amber-50 text-amber-800 p-3 text-center text-xs font-medium border-b border-amber-100">
                            Apresente este cartão ao motorista
                        </div>
                    )}

                    <div className="p-6 space-y-6">
                        {/* Passenger */}
                        <div className="text-center">
                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Passageiro</p>
                            <h2 className="text-2xl font-bold text-gray-900">{passenger.passenger_name}</h2>
                            {passenger.document_id && <p className="text-sm text-gray-500">Doc: {passenger.document_id}</p>}
                        </div>

                        {/* Trip Details */}
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1 text-gray-500">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span className="text-xs font-bold uppercase">Data</span>
                                </div>
                                <p className="font-semibold text-gray-900">{formatDateStrict(trip.date)}</p>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1.5 mb-1 text-blue-600">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-xs font-bold uppercase">Horário</span>
                                </div>
                                <p className="font-bold text-xl text-blue-600">{trip.start_time}</p>
                            </div>
                        </div>

                        {/* Route */}
                        <div className="relative pl-6 space-y-6">
                            {/* Line */}
                            <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-gray-200"></div>
                            
                            <div className="relative">
                                <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-white z-10"></div>
                                <p className="text-xs text-gray-400 uppercase font-bold mb-0.5">Origem</p>
                                <p className="text-sm font-medium text-gray-900 leading-snug">{trip.origin}</p>
                            </div>
                            
                            <div className="relative">
                                <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-green-500 bg-white z-10"></div>
                                <p className="text-xs text-gray-400 uppercase font-bold mb-0.5">Destino</p>
                                <p className="text-sm font-medium text-gray-900 leading-snug">{trip.destination}</p>
                            </div>
                        </div>

                        {/* Driver Info - Only show for non-flexible allocation */}
                        {!passenger.is_flexible_allocation && (driver || vehicle) && (
                            <div className="border-t border-dashed pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Truck className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{driver?.full_name || driver?.name || "Motorista a definir"}</p>
                                        <p className="text-xs text-gray-500">
                                            {tripCodeInitials && <span className="font-bold text-blue-600 mr-1">[{tripCodeInitials}]</span>}
                                            {vehicle ? `${vehicle.vehicle_model || vehicle.model} • ${vehicle.vehicle_plate || vehicle.plate}` : trip.vehicle_type_category}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Flexible allocation info */}
                        {passenger.is_flexible_allocation && (
                            <div className="border-t border-dashed pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Truck className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">
                                            {tripCodeInitials && <span className="mr-1 text-purple-700">[{tripCodeInitials}]</span>}
                                            {trip.name || "Porta a Porta"}
                                        </p>
                                        <p className="text-xs text-purple-600">Veículo será atribuído no momento do embarque</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* QR Code Area */}
                        <div className="flex flex-col items-center justify-center pt-2">
                            {qrCodeUrl && (
                                <div className="p-2 border-2 border-dashed border-gray-200 rounded-lg">
                                    <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                                </div>
                            )}
                            <p className="text-[10px] text-gray-400 mt-2 text-center uppercase tracking-wide">
                                Apresente este código para embarcar
                            </p>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="bg-gray-50 p-4 border-t border-gray-100 flex flex-col gap-2">
                    {isBoarded && (
                        <Button variant="outline" className="w-full text-green-600 border-green-200 bg-green-50 cursor-default hover:bg-green-50">
                            <CheckCircle className="w-4 h-4 mr-2" /> Embarque Realizado
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}