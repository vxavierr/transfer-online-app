import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, X, Loader2 } from "lucide-react";
import html2canvas from 'html2canvas';
import { format } from "date-fns";
import QRCode from 'qrcode';

export default function BoardingPassModal({ isOpen, onClose, passes }) {
    const printRef = useRef(null);
    const [qrCodes, setQrCodes] = useState({});
    const [generatingQr, setGeneratingQr] = useState(true);

    useEffect(() => {
        const generateQrCodes = async () => {
            if (!passes || passes.length === 0) return;
            
            setGeneratingQr(true);
            const codes = {};
            
            try {
                for (const pass of passes) {
                    // Generate QR code from checkin_url or fallback to a default
                    const url = pass.checkin_url || pass.qr_code_url || `trip:${pass.trip_name}`;
                    codes[pass.passenger_id] = await QRCode.toDataURL(url, { width: 200, margin: 2 });
                }
                setQrCodes(codes);
            } catch (err) {
                console.error("Error generating QR codes:", err);
            } finally {
                setGeneratingQr(false);
            }
        };

        if (isOpen) {
            generateQrCodes();
        }
    }, [isOpen, passes]);

    // Helper to format date strictly from YYYY-MM-DD string to DD/MM/YYYY
    // ignoring timezone differences
    const formatDateStrict = (dateStr) => {
        if (!dateStr) return '-';
        try {
            // Handle both YYYY-MM-DD and full ISO strings
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

    const handleDownloadImage = async () => {
        if (!printRef.current) return;
        
        try {
            const canvas = await html2canvas(printRef.current, {
                scale: 2, // Better quality
                backgroundColor: "#ffffff",
                logging: false,
                useCORS: true
            });
            
            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `BoardingPass_${passes[0]?.trip_name || 'Trip'}.png`;
            link.click();
        } catch (error) {
            console.error("Error generating image:", error);
            alert("Erro ao gerar imagem. Tente novamente.");
        }
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        const windowUrl = 'about:blank';
        const uniqueName = new Date();
        const windowName = 'Print' + uniqueName.getTime();
        const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Imprimir Cartão de Embarque</title>
                        <style>
                            body { font-family: sans-serif; margin: 0; padding: 20px; }
                            .pass-container { page-break-after: always; margin-bottom: 40px; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; max-width: 400px; margin-left: auto; margin-right: auto; }
                            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
                            .content { padding: 20px; }
                            .label { font-weight: bold; font-size: 12px; color: #666; margin-top: 10px; }
                            .value { font-size: 16px; font-weight: 500; color: #000; }
                            .driver-box { background-color: #f3f4f6; padding: 10px; border-radius: 6px; margin-top: 20px; }
                            .qr-container { text-align: center; margin-top: 30px; }
                            .qr-img { width: 150px; height: 150px; }
                            .footer { text-align: center; font-size: 10px; color: #999; margin-top: 10px; padding-bottom: 20px; }
                        </style>
                    </head>
                    <body>
                        ${printContent.innerHTML}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    if (!passes || passes.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Cartão de Embarque</DialogTitle>
                </DialogHeader>

                {/* Printable Area */}
                <div className="bg-gray-100 p-4 rounded-lg overflow-y-auto max-h-[60vh] flex justify-center">
                    <div ref={printRef} className="bg-white w-full max-w-[350px] space-y-8">
                        {passes.map((pass, index) => (
                            <div key={index} className="pass-container bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden mb-4 last:mb-0">
                                {/* Header */}
                                <div className="header bg-blue-600 text-white p-6 text-center">
                                    <h2 className="text-xl font-bold uppercase tracking-wide">Cartão de Embarque</h2>
                                    <p className="text-sm opacity-90 mt-1">{pass.event_name}</p>
                                </div>

                                {/* Content */}
                                <div className="content p-6 space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase">Passageiro</p>
                                        <p className="text-lg font-bold text-gray-900">{pass.passenger_name}</p>
                                    </div>

                                    <div className="flex justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase">Data</p>
                                            <p className="font-medium">{formatDateStrict(pass.date)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-gray-500 uppercase">
                                                {pass.is_grouped_trip ? 'Horário Encontro Grupo' : 'Horário'}
                                            </p>
                                            <p className="font-medium text-blue-600">
                                                {pass.is_grouped_trip && pass.estimated_group_departure 
                                                    ? pass.estimated_group_departure 
                                                    : pass.time}
                                            </p>
                                        </div>
                                    </div>

                                    {pass.is_grouped_trip && (
                                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-xs text-yellow-800">
                                            <p className="font-bold mb-1">⚠️ Aviso Importante</p>
                                            <p>Seu Transfer foi agrupado com outros passageiros com voos distintos, fique tranquilo nosso receptivo irá aguardá-lo.</p>

                                            {pass.group_flights && pass.group_flights.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-yellow-200">
                                                    <p className="font-semibold text-[10px] uppercase text-yellow-700 mb-1">Voos do Grupo:</p>
                                                    <ul className="list-disc list-inside space-y-0.5">
                                                        {pass.group_flights.map((f, idx) => (
                                                            <li key={idx} className="text-[10px]">{f}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-3 pt-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                <p className="text-xs font-bold text-gray-500 uppercase">Origem</p>
                                            </div>
                                            <p className="font-medium pl-4">{pass.origin}</p>
                                        </div>

                                        {pass.additional_stops && pass.additional_stops.length > 0 && (
                                            <div className="space-y-3">
                                                {pass.additional_stops.map((stop, idx) => (
                                                    <div key={idx}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-yellow-500 border border-white ring-1 ring-yellow-500"></div>
                                                            <p className="text-xs font-bold text-gray-500 uppercase">Parada {idx + 1}</p>
                                                        </div>
                                                        <p className="font-medium pl-4 text-sm">{stop.address || stop.notes}</p>
                                                        {stop.notes && stop.address && <p className="text-xs text-gray-400 pl-4 italic">({stop.notes})</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                <p className="text-xs font-bold text-gray-500 uppercase">Destino</p>
                                            </div>
                                            <p className="font-medium pl-4">{pass.destination}</p>
                                        </div>
                                    </div>

                                    {/* Driver Box */}
                                    <div className="driver-box bg-gray-50 p-3 rounded-lg border border-gray-100 mt-4">
                                        {pass.coordinator_contact ? (
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Coordenação / Suporte</p>
                                                <p className="text-sm font-medium">{pass.coordinator_contact.name}</p>
                                                <p className="text-xs text-gray-500">{pass.coordinator_contact.phone}</p>
                                                <p className="text-[10px] text-gray-400 mt-1 italic">Para informações, contate o coordenador.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Motorista</p>
                                                    <p className="text-sm font-medium">{pass.driver_name}</p>
                                                    {pass.driver_phone && <p className="text-xs text-gray-500">{pass.driver_phone}</p>}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Veículo</p>
                                                    <p className="text-sm font-medium">{pass.vehicle_info}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* QR Code */}
                                    <div className="qr-container text-center mt-6 pt-4 border-t border-dashed border-gray-200 min-h-[160px] flex flex-col items-center justify-center">
                                        {generatingQr || !qrCodes[pass.passenger_id] ? (
                                            <div className="flex flex-col items-center justify-center py-4">
                                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                                                <span className="text-xs text-gray-400">Gerando código...</span>
                                            </div>
                                        ) : (
                                            <img src={qrCodes[pass.passenger_id]} alt="QR Code" className="w-40 h-40 mx-auto" />
                                        )}
                                        <p className="text-xs text-gray-400 mt-2">Apresente este código para embarcar</p>
                                    </div>
                                    
                                    <div className="text-center pt-2">
                                        <p className="text-[10px] text-gray-300">ID: {pass.trip_name}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:justify-center">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        <X className="w-4 h-4 mr-2" /> Fechar
                    </Button>
                    <Button variant="secondary" onClick={handlePrint} className="flex-1" disabled={generatingQr}>
                        <Printer className="w-4 h-4 mr-2" /> Imprimir
                    </Button>
                    <Button onClick={handleDownloadImage} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={generatingQr}>
                        <Download className="w-4 h-4 mr-2" /> Salvar Imagem
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}