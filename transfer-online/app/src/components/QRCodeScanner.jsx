import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Camera, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QRCodeScanner({ isOpen, onClose, onScanSuccess }) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState(null);
    const scannerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
                scannerRef.current = null;
            }
            setError(null);
            setIsScanning(false);
            return;
        }

        const initScanner = async () => {
            try {
                const scanner = new Html5Qrcode("qr-reader");
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        scanner.stop().then(() => {
                            scannerRef.current = null;
                            onScanSuccess(decodedText);
                            onClose();
                        }).catch(err => console.error(err));
                    },
                    () => {}
                );

                setIsScanning(true);
            } catch (err) {
                console.error('Erro ao iniciar câmera:', err);
                setError('Não foi possível acessar a câmera. Permita o acesso e tente novamente.');
            }
        };

        setTimeout(initScanner, 500);

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
                scannerRef.current = null;
            }
        };
    }, [isOpen]);

    const handleClose = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().catch(() => {});
            scannerRef.current = null;
        }
        setError(null);
        setIsScanning(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        Escanear QR Code
                    </DialogTitle>
                </DialogHeader>
                
                <div className="py-4">
                    {!isScanning && !error && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                            <p className="text-sm text-gray-500">Iniciando câmera...</p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-red-700 mb-2">
                                <AlertCircle className="w-5 h-5" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                            <p className="text-xs text-red-600 mb-3">
                                Verifique as configurações de permissão da câmera no navegador.
                            </p>
                            <Button 
                                onClick={handleClose} 
                                variant="outline" 
                                className="w-full"
                            >
                                Fechar
                            </Button>
                        </div>
                    )}
                    
                    <div id="qr-reader" className="w-full"></div>
                    
                    {isScanning && (
                        <div className="mt-4 space-y-2">
                            <p className="text-sm text-gray-600 text-center font-medium">
                                Posicione o QR Code dentro da área
                            </p>
                            <p className="text-xs text-gray-500 text-center">
                                A leitura será automática
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}