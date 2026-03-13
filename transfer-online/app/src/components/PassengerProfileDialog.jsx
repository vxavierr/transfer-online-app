import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, MapPin, Plane, Calendar, Clock, FileText, CheckCircle, XCircle, X } from "lucide-react";
import { format } from "date-fns";

export default function PassengerProfileDialog({ isOpen, onClose, passenger, trip }) {
    if (!passenger) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <Button
                    onClick={onClose}
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 rounded-full lg:hidden"
                >
                    <X className="h-5 w-5" />
                </Button>
                <DialogHeader className="pr-10 lg:pr-0">
                    <DialogTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Perfil do Participante
                    </DialogTitle>
                    <DialogDescription>
                        Informações detalhadas do passageiro
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Nome */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-bold text-gray-500 uppercase">Nome Completo</span>
                        </div>
                        <p className="text-base font-semibold text-gray-900 pl-6">{passenger.passenger_name}</p>
                    </div>

                    {/* Status */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-bold text-gray-500 uppercase">Status</span>
                        </div>
                        <div className="pl-6">
                            {passenger.boarding_status === 'boarded' ? (
                                <Badge className="bg-green-100 text-green-700">
                                    <CheckCircle className="w-3 h-3 mr-1" /> Embarcado
                                </Badge>
                            ) : passenger.boarding_status === 'no_show' ? (
                                <Badge className="bg-red-100 text-red-700">
                                    <XCircle className="w-3 h-3 mr-1" /> No Show
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="bg-gray-50">
                                    Aguardando
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Telefone */}
                    {passenger.passenger_phone && (
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-bold text-gray-500 uppercase">Telefone</span>
                            </div>
                            <p className="text-base text-gray-900 pl-6">{passenger.passenger_phone}</p>
                        </div>
                    )}

                    {/* Email */}
                    {passenger.passenger_email && (
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-bold text-gray-500 uppercase">E-mail</span>
                            </div>
                            <p className="text-sm text-gray-900 pl-6 break-all">{passenger.passenger_email}</p>
                        </div>
                    )}

                    {/* Cidade de Origem */}
                    {passenger.passenger_city_origin && (
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-bold text-gray-500 uppercase">Cidade de Origem</span>
                            </div>
                            <p className="text-base text-gray-900 pl-6">{passenger.passenger_city_origin}</p>
                        </div>
                    )}

                    {/* Documento */}
                    {passenger.document_id && (
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-bold text-gray-500 uppercase">Documento</span>
                            </div>
                            <p className="text-base text-gray-900 pl-6">{passenger.document_id}</p>
                        </div>
                    )}

                    {/* Informações do Voo */}
                    {(passenger.flight_number || passenger.airline) && (
                        <div className="pt-4 border-t">
                            <h4 className="text-sm font-bold text-gray-700 mb-3">Informações do Voo</h4>
                            
                            {passenger.airline && (
                                <div className="mb-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Plane className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold text-gray-500 uppercase">Companhia Aérea</span>
                                    </div>
                                    <p className="text-base text-gray-900 pl-6">{passenger.airline}</p>
                                </div>
                            )}

                            {passenger.flight_number && (
                                <div className="mb-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Plane className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold text-gray-500 uppercase">Número do Voo</span>
                                    </div>
                                    <p className="text-base text-gray-900 pl-6">{passenger.flight_number}</p>
                                </div>
                            )}

                            {passenger.flight_date && (
                                <div className="mb-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold text-gray-500 uppercase">Data do Voo</span>
                                    </div>
                                    <p className="text-base text-gray-900 pl-6">
                                        {format(new Date(passenger.flight_date.includes('T') ? passenger.flight_date : passenger.flight_date + 'T12:00:00'), 'dd/MM/yyyy')}
                                    </p>
                                </div>
                            )}

                            {passenger.flight_time && (
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold text-gray-500 uppercase">Horário do Voo</span>
                                    </div>
                                    <p className="text-base text-gray-900 pl-6">{passenger.flight_time}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Informações da Viagem */}
                    {trip && (
                        <div className="pt-4 border-t">
                            <h4 className="text-sm font-bold text-gray-700 mb-3">Informações da Viagem</h4>
                            
                            <div className="space-y-2">
                                <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase">Origem</span>
                                    <p className="text-sm text-gray-900">{trip.origin}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase">Destino</span>
                                    <p className="text-sm text-gray-900">{trip.destination}</p>
                                </div>
                                <div className="flex gap-4">
                                    <div>
                                        <span className="text-xs font-bold text-gray-500 uppercase">Data</span>
                                        <p className="text-sm text-gray-900">
                                            {format(new Date(trip.date.includes('T') ? trip.date : trip.date + 'T12:00:00'), 'dd/MM/yyyy')}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-gray-500 uppercase">Horário</span>
                                        <p className="text-sm text-gray-900">{trip.start_time}</p>
                                    </div>
                                </div>
                            </div>
                            </div>
                            )}
                            </div>

                            <div className="lg:hidden pt-4 border-t">
                            <Button 
                            onClick={onClose} 
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                            Fechar
                            </Button>
                            </div>
                            </DialogContent>
                            </Dialog>
                            );
                            }