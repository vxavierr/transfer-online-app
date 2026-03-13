import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Send, MessageSquare, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DriverNotificationPreviewDialog({ isOpen, onClose, tripId, onConfirm }) {
    const [isLoading, setIsLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (isOpen && tripId) {
            loadPreview();
        } else {
            setPreviewData(null);
        }
    }, [isOpen, tripId]);

    const loadPreview = async () => {
        setIsLoading(true);
        try {
            const response = await base44.functions.invoke('generateDriverNotificationPreview', { serviceRequestId: tripId });
            if (response.data && !response.data.error) {
                setPreviewData(response.data);
            } else {
                toast.error("Erro ao gerar pré-visualização");
                onClose();
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar pré-visualização");
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        setIsSending(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        Pré-visualização da Notificação
                    </DialogTitle>
                    <DialogDescription>
                        Confira a mensagem que será enviada ao motorista.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : previewData ? (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                            <p className="font-semibold text-gray-700 mb-1">Destinatário:</p>
                            <p className="text-gray-900">{previewData.driverName} - {previewData.driverPhone}</p>
                            {previewData.driverEmail && <p className="text-gray-500 text-xs">{previewData.driverEmail}</p>}
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-gray-700">Mensagem WhatsApp:</p>
                            <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200 text-xs sm:text-sm whitespace-pre-wrap font-mono text-gray-800 max-h-[40vh] overflow-y-auto">
                                {previewData.whatsappMessage}
                            </div>
                        </div>

                        {previewData.whatsappMessage.includes('TOKEN_SERA_GERADO') && (
                            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                <AlertCircle className="w-4 h-4" />
                                O link final será gerado no momento do envio.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-4 text-red-500">Erro ao carregar dados.</div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSend} disabled={isSending || isLoading} className="bg-green-600 hover:bg-green-700 text-white">
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Confirmar Envio
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}