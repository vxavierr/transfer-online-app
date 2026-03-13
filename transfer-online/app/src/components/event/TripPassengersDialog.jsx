import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Eye, Mail, MessageCircle, X, Loader2, Pencil, Check, AlertCircle, Copy, Smartphone } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function TripPassengersDialog({ isOpen, onClose, trip, passengers, onViewPass, onPassengerUpdate, event, drivers, driverVehicles }) {
    const { toast } = useToast();
    const [sendingState, setSendingState] = useState({}); // { passengerId: 'whatsapp' | 'email' | null }
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    
    // Bulk Action States
    const [selectedPassengers, setSelectedPassengers] = useState([]);
    const [bulkSending, setBulkSending] = useState(false);

    if (!trip) return null;

    const tripPassengers = passengers.filter(p => p.event_trip_id === trip.id);

    const validateContact = (value, type) => {
        if (!value) return false;
        if (type === 'email') {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }
        if (type === 'phone') {
            // Basic check for at least 10 digits
            const digits = value.replace(/\D/g, '');
            return digits.length >= 10;
        }
        return false;
    };

    const toggleSelectAll = () => {
        if (selectedPassengers.length === tripPassengers.length) {
            setSelectedPassengers([]);
        } else {
            setSelectedPassengers(tripPassengers.map(p => p.id));
        }
    };

    const toggleSelectPassenger = (id) => {
        if (selectedPassengers.includes(id)) {
            setSelectedPassengers(selectedPassengers.filter(pid => pid !== id));
        } else {
            setSelectedPassengers([...selectedPassengers, id]);
        }
    };

    const handleBulkSend = async (type) => {
        setBulkSending(true);
        const passengersToSend = tripPassengers.filter(p => selectedPassengers.includes(p.id));
        
        const validPassengers = [];
        let validationFailCount = 0;

        // Local Validation
        for (const passenger of passengersToSend) {
             const isPhoneType = type === 'whatsapp' || type === 'sms';
             const contact = isPhoneType ? (passenger.passenger_phone || passenger.phone_number) : (passenger.passenger_email || passenger.email);
             const contactType = isPhoneType ? 'phone' : 'email';
             
             if (validateContact(contact, contactType)) {
                 validPassengers.push(passenger);
             } else {
                 validationFailCount++;
             }
        }

        let backendSuccessCount = 0;
        let backendFailCount = 0;

        if (validPassengers.length > 0) {
            try {
                let functionName = 'sendBoardingPassEmail';
                if (type === 'whatsapp') functionName = 'sendBoardingPassWhatsApp';
                if (type === 'sms') functionName = 'sendBoardingPassSMS';

                const passengerIds = validPassengers.map(p => p.id);
                
                const response = await base44.functions.invoke(functionName, {
                    tripId: trip.id,
                    passengerIds: passengerIds
                });
                
                if (response.data) {
                    backendSuccessCount = response.data.successCount || 0;
                    backendFailCount = response.data.failedCount || 0;
                }
            } catch (error) {
                console.error("Bulk send error", error);
                backendFailCount += validPassengers.length;
                toast({ title: "Erro no envio em massa", description: error.message, variant: "destructive" });
            }
        }

        const totalSuccess = backendSuccessCount;
        const totalFail = validationFailCount + backendFailCount;

        setBulkSending(false);
        toast({
            title: "Envio em Massa Concluído",
            description: `Sucesso: ${totalSuccess}, Falhas: ${totalFail}`,
            variant: totalFail > 0 ? "warning" : "success",
            className: totalFail > 0 ? "bg-orange-50" : "bg-green-50"
        });
        
        if (onPassengerUpdate) onPassengerUpdate();
    };

    const handleSendWhatsApp = async (passenger, silent = false) => {
        setSendingState(prev => ({ ...prev, [passenger.id]: 'whatsapp' }));
        try {
            const response = await base44.functions.invoke('sendBoardingPassWhatsApp', {
                tripId: trip.id,
                passengerId: passenger.id
            });
            
            if (response.data?.success) {
                if (!silent) toast({ title: "Enviado!", description: `WhatsApp enviado para ${passenger.passenger_name}`, className: "bg-green-50", duration: 3000 });
                if (onPassengerUpdate) onPassengerUpdate(); // Update list to show green icon
            } else {
                throw new Error(response.data?.error || "Falha no envio");
            }
        } catch (error) {
            console.error(error);
            if (!silent) {
                const errorMessage = error.response?.data?.error || error.message || "Falha no envio";
                toast({ title: "Erro no envio", description: errorMessage, variant: "destructive" });
            }
            if (onPassengerUpdate) onPassengerUpdate(); // Update list to show red icon if failed
            throw error; // Re-throw for bulk handler
        } finally {
            setSendingState(prev => ({ ...prev, [passenger.id]: null }));
        }
    };

    const handleSendEmail = async (passenger, silent = false) => {
        setSendingState(prev => ({ ...prev, [passenger.id]: 'email' }));
        try {
            const response = await base44.functions.invoke('sendBoardingPassEmail', {
                tripId: trip.id,
                passengerId: passenger.id
            });

            if (response.data?.success) {
                if (!silent) toast({ title: "Enviado!", description: `Email enviado para ${passenger.passenger_name}`, className: "bg-green-50", duration: 3000 });
                if (onPassengerUpdate) onPassengerUpdate();
            } else {
                throw new Error(response.data?.error || "Falha no envio");
            }
        } catch (error) {
            console.error(error);
            if (!silent) {
                const errorMessage = error.response?.data?.error || error.message || "Falha no envio";
                toast({ title: "Erro no envio", description: errorMessage, variant: "destructive" });
            }
            if (onPassengerUpdate) onPassengerUpdate();
            throw error;
        } finally {
            setSendingState(prev => ({ ...prev, [passenger.id]: null }));
        }
    };

    const handleSendSMS = async (passenger, silent = false) => {
        setSendingState(prev => ({ ...prev, [passenger.id]: 'sms' }));
        try {
            const response = await base44.functions.invoke('sendBoardingPassSMS', {
                tripId: trip.id,
                passengerId: passenger.id
            });

            if (response.data?.success) {
                if (!silent) toast({ title: "Enviado!", description: `SMS enviado para ${passenger.passenger_name}`, className: "bg-green-50", duration: 3000 });
                if (onPassengerUpdate) onPassengerUpdate();
            } else {
                throw new Error(response.data?.error || "Falha no envio");
            }
        } catch (error) {
            console.error(error);
            if (!silent) {
                const errorMessage = error.response?.data?.error || error.message || "Falha no envio";
                toast({ title: "Erro no envio", description: errorMessage, variant: "destructive" });
            }
            if (onPassengerUpdate) onPassengerUpdate();
            throw error;
        } finally {
            setSendingState(prev => ({ ...prev, [passenger.id]: null }));
        }
    };

    const handleEditClick = (passenger) => {
        setEditingId(passenger.id);
        setEditForm({
            passenger_phone: passenger.passenger_phone || passenger.phone_number || '',
            passenger_email: passenger.passenger_email || passenger.email || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSaveEdit = async () => {
        setIsSaving(true);
        try {
            await base44.entities.EventPassenger.update(editingId, editForm);
            toast({ title: "Atualizado!", description: "Dados do passageiro atualizados com sucesso.", className: "bg-green-50", duration: 3000 });
            setEditingId(null);
            if (onPassengerUpdate) onPassengerUpdate();
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Falha ao atualizar dados.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusColor = (status, type) => {
        if (status === 'success') return "text-green-600 bg-green-50 border-green-200 hover:bg-green-100";
        if (status === 'failed') return "text-red-600 bg-red-50 border-red-200 hover:bg-red-100";
        return "text-blue-600 border-blue-200 hover:bg-blue-50"; // default
    };

    const handleCopyPhone = (phone) => {
        if (!phone) return;
        navigator.clipboard.writeText(phone);
        toast({ 
            title: "Copiado!", 
            description: "Telefone copiado para a área de transferência.", 
            className: "bg-green-50", 
            duration: 2000 
        });
    };

    const handleCopyEmail = (email) => {
        if (!email) return;
        navigator.clipboard.writeText(email);
        toast({ 
            title: "Copiado!", 
            description: "Email copiado para a área de transferência.", 
            className: "bg-green-50", 
            duration: 2000 
        });
    };

    const handleCopyPass = (passenger) => {
        // Date formatting dd/mm/yyyy
        const formatDate = (dateString) => {
            if (!dateString) return "";
            try {
                const cleanDate = dateString.includes('T') ? dateString.split('T')[0] : dateString;
                const [year, month, day] = cleanDate.split('-');
                return `${day}/${month}/${year}`;
            } catch {
                return dateString;
            }
        };

        const dateStr = formatDate(trip.date);
        
        // 1. Header
        let text = `🎫 *Cartão de Embarque - ${event?.event_name || 'Evento'}*\n\n`;
        text += `Olá, *${passenger.passenger_name}*!\n`;
        text += `Aqui estão os detalhes do seu transfer:\n\n`;
        
        // 2. Trip Details
        text += `📅 *Data:* ${dateStr}\n`;
        text += `⏰ *Horário:* ${trip.start_time}\n`;
        text += `📍 *Origem:* ${trip.origin}`;

        // Stops
        let stops = trip.additional_stops;
        if (typeof stops === 'string') {
            try { stops = JSON.parse(stops); } catch(e) { stops = []; }
        }
        if (Array.isArray(stops) && stops.length > 0) {
            text += `\n🛑 *Paradas:*`;
            stops.forEach((stop, idx) => {
                const stopText = stop.address || stop.notes || '-';
                const stopNote = (stop.address && stop.notes) ? ` (${stop.notes})` : '';
                text += `\n• ${idx + 1}: ${stopText}${stopNote}`;
            });
        }

        text += `\n🏁 *Destino:* ${trip.destination}`;

        // 3. Vehicle/Driver Info
        let driverName = "A definir";
        let driverPhone = "";
        let vehicleInfo = trip.vehicle_type_category || "A definir";
        
        // Resolve driver info locally using passed props
        if (trip.is_casual_driver && trip.casual_driver_name) {
            driverName = trip.casual_driver_name;
            driverPhone = trip.casual_driver_phone || "";
            const model = trip.casual_driver_vehicle_model || "Veículo";
            const plate = trip.casual_driver_vehicle_plate || "";
            vehicleInfo = `${model} ${plate ? `(${plate})` : ''}`;
        } else if (trip.subcontractor_driver_name) {
            driverName = trip.subcontractor_driver_name;
            driverPhone = trip.subcontractor_driver_phone || "";
            const model = trip.subcontractor_vehicle_model || "Veículo";
            const plate = trip.subcontractor_vehicle_plate || "";
            vehicleInfo = `${model} ${plate ? `(${plate})` : ''}`;
        } else if (trip.driver_id && drivers) {
            const driver = drivers.find(d => d.id === trip.driver_id);
            if (driver) {
                driverName = driver.full_name || driver.name || "Motorista";
                driverPhone = driver.phone_number || driver.phone || "";
            }
        }

        if ((vehicleInfo === "A definir" || vehicleInfo === trip.vehicle_type_category) && trip.vehicle_id && driverVehicles) {
            const vehicle = driverVehicles.find(v => v.id === trip.vehicle_id);
            if (vehicle) {
                const model = vehicle.vehicle_model || vehicle.model || "Veículo";
                const plate = vehicle.vehicle_plate || vehicle.plate || "";
                vehicleInfo = `${model} ${plate ? `(${plate})` : ''}`;
            }
        }

        const tripCodeInitials = trip.trip_code ? trip.trip_code.split('-')[0] : '';
        const showDriverInfo = !passenger.is_flexible_allocation;
        let currentVehicleInfo = vehicleInfo;
        let currentDriverName = driverName;
        let currentDriverPhone = driverPhone;

        if (passenger.is_flexible_allocation) {
            currentVehicleInfo = trip.name || "Porta a Porta";
        }

        if (showDriverInfo) {
            text += `\n🚗 *Veículo:* ${tripCodeInitials ? `[${tripCodeInitials}] ` : ''}${currentVehicleInfo}`;
            text += `\n👤 *Motorista:* ${currentDriverName} ${currentDriverPhone ? `(${currentDriverPhone})` : ''}`;
        } else {
            text += `\n🚐 *Serviço:* ${tripCodeInitials ? `[${tripCodeInitials}] ` : ''}${currentVehicleInfo}`;
        }

        // 4. Link (Removed)
        text += `\n\nBoa viagem!`;

        navigator.clipboard.writeText(text);
        toast({ 
            title: "Copiado!", 
            description: "Informações copiadas para a área de transferência.", 
            className: "bg-green-50", 
            duration: 2000 
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Passageiros da Viagem: {trip.name}</DialogTitle>
                    <DialogDescription>
                        Gerencie os passageiros e envie cartões de embarque.
                    </DialogDescription>
                </DialogHeader>

                {/* Bulk Actions Toolbar */}
                <div className="flex items-center justify-between py-2 border-b">
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            className="rounded border-gray-300 ml-2"
                            checked={tripPassengers.length > 0 && selectedPassengers.length === tripPassengers.length}
                            onChange={toggleSelectAll}
                        />
                        <span className="text-sm text-gray-500">
                            {selectedPassengers.length} selecionados
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            size="sm" 
                            variant="outline" 
                            disabled={selectedPassengers.length === 0 || bulkSending}
                            onClick={() => handleBulkSend('whatsapp')}
                            className="gap-2"
                        >
                            {bulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4 text-green-600" />}
                            Enviar WhatsApp ({selectedPassengers.length})
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline"
                            disabled={selectedPassengers.length === 0 || bulkSending}
                            onClick={() => handleBulkSend('email')}
                            className="gap-2"
                        >
                            {bulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 text-blue-600" />}
                            Enviar Email ({selectedPassengers.length})
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline"
                            disabled={selectedPassengers.length === 0 || bulkSending}
                            onClick={() => handleBulkSend('sms')}
                            className="gap-2"
                        >
                            {bulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4 text-purple-600" />}
                            Enviar SMS ({selectedPassengers.length})
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto py-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]"></TableHead>
                                <TableHead>Passageiro</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tripPassengers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                        Nenhum passageiro nesta viagem.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tripPassengers.map(p => {
                                    const phone = p.passenger_phone || p.phone_number;
                                    const email = p.passenger_email || p.email;
                                    const isPhoneValid = validateContact(phone, 'phone');
                                    const isEmailValid = validateContact(email, 'email');

                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-gray-300"
                                                    checked={selectedPassengers.includes(p.id)}
                                                    onChange={() => toggleSelectPassenger(p.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{p.passenger_name}</div>
                                                {editingId === p.id ? (
                                                    <div className="flex flex-col gap-2 mt-2">
                                                        <Input 
                                                            value={editForm.passenger_phone}
                                                            onChange={(e) => setEditForm({...editForm, passenger_phone: e.target.value})}
                                                            placeholder="Telefone"
                                                            className="h-7 text-xs"
                                                        />
                                                        <Input 
                                                            value={editForm.passenger_email}
                                                            onChange={(e) => setEditForm({...editForm, passenger_email: e.target.value})}
                                                            placeholder="Email"
                                                            className="h-7 text-xs"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-500 flex flex-col gap-0.5 mt-1">
                                                        <div className="flex items-center gap-1">
                                                            {phone ? (
                                                                <>
                                                                    <span className={!isPhoneValid ? "text-red-500" : ""}>{phone}</span>
                                                                    <Button 
                                                                        size="icon" 
                                                                        variant="ghost" 
                                                                        className="h-4 w-4 ml-1 p-0 text-gray-400 hover:text-blue-600" 
                                                                        onClick={() => handleCopyPhone(phone)}
                                                                        title="Copiar Telefone"
                                                                    >
                                                                        <Copy className="w-3 h-3" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <span className="text-red-300 italic">Sem telefone</span>
                                                            )}
                                                            {!isPhoneValid && phone && <AlertCircle className="w-3 h-3 text-red-500" title="Telefone inválido" />}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {email ? (
                                                                <>
                                                                    <span className={!isEmailValid ? "text-red-500" : ""}>{email}</span>
                                                                    <Button 
                                                                        size="icon" 
                                                                        variant="ghost" 
                                                                        className="h-4 w-4 ml-1 p-0 text-gray-400 hover:text-blue-600" 
                                                                        onClick={() => handleCopyEmail(email)}
                                                                        title="Copiar Email"
                                                                    >
                                                                        <Copy className="w-3 h-3" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <span className="text-red-300 italic">Sem email</span>
                                                            )}
                                                            {!isEmailValid && email && <AlertCircle className="w-3 h-3 text-red-500" title="Email inválido" />}
                                                        </div>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={p.boarding_status === 'boarded' ? 'default' : 'outline'}>
                                                    {p.boarding_status === 'boarded' ? 'Embarcado' : 'Pendente'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right align-top pt-3">
                                                {editingId === p.id ? (
                                                    <div className="flex justify-end gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                                                            onClick={handleSaveEdit}
                                                            disabled={isSaving}
                                                            title="Salvar"
                                                        >
                                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            className="h-8 w-8 p-0" 
                                                            onClick={handleCancelEdit}
                                                            disabled={isSaving}
                                                            title="Cancelar"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="h-8 w-8 p-0 hover:bg-gray-100"
                                                            onClick={() => handleEditClick(p)}
                                                            title="Editar Dados"
                                                        >
                                                            <Pencil className="w-4 h-4 text-gray-500" />
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => handleCopyPass(p)}
                                                            title="Copiar Texto do Cartão"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => onViewPass(p)}
                                                            title="Visualizar Cartão"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className={`h-8 w-8 p-0 border transition-colors ${getStatusColor(p.whatsApp_last_sent_status, 'whatsapp')} ${!isPhoneValid && phone ? 'opacity-50' : ''}`}
                                                            onClick={() => handleSendWhatsApp(p)}
                                                            disabled={sendingState[p.id] === 'whatsapp' || !phone}
                                                            title={
                                                                !isPhoneValid ? "Telefone inválido" :
                                                                p.whatsApp_last_sent_status === 'success' ? `Enviado em ${new Date(p.whatsApp_last_sent_at).toLocaleString()}` : 
                                                                p.whatsApp_last_sent_status === 'failed' ? "Falha no último envio" : "Enviar WhatsApp"
                                                            }
                                                        >
                                                            {sendingState[p.id] === 'whatsapp' ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                                p.whatsApp_last_sent_status === 'success' ? <Check className="w-4 h-4" /> :
                                                                (p.whatsApp_last_sent_status === 'failed' || (!isPhoneValid && phone)) ? <AlertCircle className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            className={`h-8 w-8 p-0 border transition-colors ${getStatusColor(p.email_last_sent_status, 'email')} ${!isEmailValid && email ? 'opacity-50' : ''}`}
                                                            onClick={() => handleSendEmail(p)}
                                                            disabled={sendingState[p.id] === 'email' || !email}
                                                            title={
                                                                !isEmailValid ? "Email inválido" :
                                                                p.email_last_sent_status === 'success' ? `Enviado em ${new Date(p.email_last_sent_at).toLocaleString()}` : 
                                                                p.email_last_sent_status === 'failed' ? "Falha no último envio" : "Enviar Email"
                                                            }
                                                        >
                                                            {sendingState[p.id] === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                                p.email_last_sent_status === 'success' ? <Check className="w-4 h-4" /> :
                                                                (p.email_last_sent_status === 'failed' || (!isEmailValid && email)) ? <AlertCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            className={`h-8 w-8 p-0 border transition-colors ${getStatusColor(p.sms_last_sent_status, 'sms')} ${!isPhoneValid && phone ? 'opacity-50' : ''}`}
                                                            onClick={() => handleSendSMS(p)}
                                                            disabled={sendingState[p.id] === 'sms' || !phone}
                                                            title={
                                                                !isPhoneValid ? "Telefone inválido" :
                                                                p.sms_last_sent_status === 'success' ? `Enviado em ${new Date(p.sms_last_sent_at).toLocaleString()}` : 
                                                                p.sms_last_sent_status === 'failed' ? "Falha no último envio" : "Enviar SMS"
                                                            }
                                                        >
                                                            {sendingState[p.id] === 'sms' ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                                p.sms_last_sent_status === 'success' ? <Check className="w-4 h-4" /> :
                                                                (p.sms_last_sent_status === 'failed' || (!isPhoneValid && phone)) ? <AlertCircle className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}