import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { Loader2, Link as LinkIcon, Check, Copy } from "lucide-react";

export default function ShareEventLinkDialog({ isOpen, onClose, eventId, selectedTripIds }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState("");
    const [linkType, setLinkType] = useState("receptive_list");
    const [formData, setFormData] = useState({
        coordinatorName: "",
        coordinatorContact: "",
        expiresInDays: 7
    });

    const handleGenerate = async () => {
        if (selectedTripIds.length === 0) {
            toast({ title: "Erro", description: "Nenhuma viagem selecionada.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(formData.expiresInDays));

            const response = await base44.functions.invoke('generateEventReceptiveLink', {
                eventId,
                tripIds: selectedTripIds,
                coordinatorName: formData.coordinatorName,
                coordinatorContact: formData.coordinatorContact,
                expiresAt: expiresAt.toISOString(),
                linkType: linkType
            });

            if (response.data && response.data.success) {
                setGeneratedLink(response.data.link);
                toast({ title: "Link Gerado!", description: "Compartilhe com o coordenador.", className: "bg-green-50" });
            } else {
                throw new Error(response.data?.error || "Erro ao gerar link");
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(generatedLink);
                toast({ title: "Copiado!", description: "Link copiado para a área de transferência." });
            } else {
                throw new Error("Clipboard API not available");
            }
        } catch (err) {
            console.warn('Clipboard API failed, trying fallback...', err);
            try {
                const textArea = document.createElement("textarea");
                textArea.value = generatedLink;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    toast({ title: "Copiado!", description: "Link copiado para a área de transferência." });
                } else {
                    throw new Error("Fallback copy failed");
                }
            } catch (fallbackErr) {
                console.error('Copy failed', fallbackErr);
                toast({
                    title: "Erro ao copiar",
                    description: "Não foi possível copiar automaticamente. O link é: " + generatedLink,
                    variant: "destructive",
                    action: <Button variant="outline" size="sm" onClick={() => window.open(generatedLink, '_blank')}>Abrir</Button>
                });
            }
        }
    };

    const reset = () => {
        setGeneratedLink("");
        setLinkType("receptive_list");
        setFormData({ coordinatorName: "", coordinatorContact: "", expiresInDays: 7 });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={reset}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Compartilhar Lista de Receptivo</DialogTitle>
                    <DialogDescription>
                        Gere um link para o coordenador fazer o check-in dos passageiros das <strong>{selectedTripIds.length}</strong> viagens selecionadas.
                    </DialogDescription>
                </DialogHeader>

                {!generatedLink ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Tipo de Link</Label>
                            <select
                                value={linkType}
                                onChange={(e) => setLinkType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                                <option value="receptive_list">Lista de Receptivo (Coordenadores)</option>
                                <option value="client_dashboard">Dashboard Executivo (Cliente)</option>
                            </select>
                            <p className="text-xs text-gray-500">
                                {linkType === "receptive_list" 
                                    ? "Para coordenadores realizarem check-in e gestão operacional" 
                                    : "Para o cliente acompanhar toda a logística em tempo real"}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>{linkType === "receptive_list" ? "Nome do Coordenador" : "Nome do Responsável"}</Label>
                            <Input 
                                value={formData.coordinatorName}
                                onChange={(e) => setFormData({...formData, coordinatorName: e.target.value})}
                                placeholder="Ex: João Silva"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{linkType === "receptive_list" ? "Contato (WhatsApp/Email)" : "Contato do Responsável"}</Label>
                            <Input 
                                value={formData.coordinatorContact}
                                onChange={(e) => setFormData({...formData, coordinatorContact: e.target.value})}
                                placeholder="Ex: (11) 99999-9999"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Validade do Link (Dias)</Label>
                            <Input 
                                type="number"
                                min="1"
                                max="30"
                                value={formData.expiresInDays}
                                onChange={(e) => setFormData({...formData, expiresInDays: e.target.value})}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="py-6 space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                            <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <h3 className="font-bold text-green-800">Link Gerado com Sucesso!</h3>
                            <p className="text-sm text-green-700 mt-1">Este link permite acesso à lista de passageiros e check-in.</p>
                        </div>
                        <div className="flex gap-2">
                            <Input value={generatedLink} readOnly className="bg-gray-50" />
                            <Button size="icon" variant="outline" onClick={copyToClipboard}>
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={reset}>Fechar</Button>
                    {!generatedLink && (
                        <Button onClick={handleGenerate} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                            Gerar Link
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}