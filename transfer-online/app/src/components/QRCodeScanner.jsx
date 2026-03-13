import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Camera, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraService, isNativePlatform } from '@/native';

/**
 * QRCodeScanner — Componente de scan de QR Code com suporte nativo e web.
 *
 * Em plataforma nativa (Android/iOS via Capacitor):
 *   - Usa CameraService (@capacitor/camera) para abrir câmera nativa
 *   - Nota: @capacitor/camera captura foto; para decodificação QR em tempo real
 *     numa futura iteração pode-se integrar jsQR. Por ora retorna o dataUrl
 *     e mostra feedback ao usuário para retentar se necessário.
 *
 * Em web (browser):
 *   - Usa html5-qrcode (getUserMedia) — comportamento original mantido
 */
export default function QRCodeScanner({ isOpen, onClose, onScanSuccess }) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState(null);
    const [isNativeCapturing, setIsNativeCapturing] = useState(false);
    const scannerRef = useRef(null);

    const isNative = isNativePlatform();

    // Limpa scanner web quando fecha
    useEffect(() => {
        if (!isOpen) {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
                scannerRef.current = null;
            }
            setError(null);
            setIsScanning(false);
            setIsNativeCapturing(false);
            return;
        }

        if (isNative) {
            // Em nativo: abre câmera nativa imediatamente ao abrir o dialog
            handleNativeScan();
        } else {
            // Web: inicia html5-qrcode com delay para DOM estar pronto
            setTimeout(initWebScanner, 500);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
                scannerRef.current = null;
            }
        };
    }, [isOpen]);

    // --- Fluxo Nativo ---
    const handleNativeScan = async () => {
        setIsNativeCapturing(true);
        setError(null);

        const permission = await CameraService.requestPermission();
        if (permission === 'denied') {
            setError('Permissão de câmera negada. Acesse as configurações do dispositivo para permitir o acesso.');
            setIsNativeCapturing(false);
            return;
        }

        const result = await CameraService.scanQRCode((err) => {
            console.error('[QRCodeScanner] Erro nativo:', err);
        });

        setIsNativeCapturing(false);

        if (!result) {
            // Usuário cancelou — fecha o dialog
            handleClose();
            return;
        }

        if (result.dataUrl) {
            // Foto capturada — em nativo com @capacitor/camera não há decodificação
            // automática de QR em tempo real. Comunicamos o dataUrl para o caller
            // que pode processar com jsQR ou similar.
            // Por ora, sinalizamos sucesso com o dataUrl como fallback.
            // TODO Wave 3c: integrar jsQR para decodificação client-side do dataUrl.
            onScanSuccess(result.dataUrl);
            handleClose();
        }
    };

    // --- Fluxo Web (html5-qrcode) ---
    const initWebScanner = async () => {
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

    const handleClose = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().catch(() => {});
            scannerRef.current = null;
        }
        setError(null);
        setIsScanning(false);
        setIsNativeCapturing(false);
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
                    {/* Estado de carregamento */}
                    {!isScanning && !error && !isNativeCapturing && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                            <p className="text-sm text-gray-500">Iniciando câmera...</p>
                        </div>
                    )}

                    {/* Estado de captura nativa */}
                    {isNativeCapturing && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Camera className="w-10 h-10 text-blue-600" />
                            <p className="text-sm text-gray-500">Câmera nativa aberta...</p>
                            <p className="text-xs text-gray-400">Posicione o QR Code e tire uma foto</p>
                        </div>
                    )}

                    {/* Estado de erro */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-red-700 mb-2">
                                <AlertCircle className="w-5 h-5" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                            <p className="text-xs text-red-600 mb-3">
                                {isNative
                                    ? 'Verifique as configurações do dispositivo para permitir acesso à câmera.'
                                    : 'Verifique as configurações de permissão da câmera no navegador.'}
                            </p>
                            {isNative && (
                                <Button
                                    onClick={handleNativeScan}
                                    variant="default"
                                    className="w-full mb-2"
                                >
                                    Tentar novamente
                                </Button>
                            )}
                            <Button
                                onClick={handleClose}
                                variant="outline"
                                className="w-full"
                            >
                                Fechar
                            </Button>
                        </div>
                    )}

                    {/* Container do scanner web (html5-qrcode) — oculto em nativo */}
                    {!isNative && (
                        <div id="qr-reader" className="w-full"></div>
                    )}

                    {isScanning && !isNative && (
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
