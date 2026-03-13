import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function PassengerCommentDialog({ isOpen, onClose, passenger, tripId, token }) {
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!comment.trim()) {
            toast({ title: "Erro", description: "Por favor, escreva um comentário.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const response = await base44.functions.invoke('addPassengerComment', {
                passengerId: passenger.id,
                tripId,
                comment: comment.trim(),
                token
            });

            if (response.data?.success) {
                toast({
                    title: "Comentário Adicionado!",
                    description: "Seu comentário foi registrado com sucesso.",
                    className: "bg-green-50"
                });
                setComment('');
                onClose();
            } else {
                throw new Error(response.data?.error || "Erro ao adicionar comentário");
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro",
                description: error.message || "Falha ao adicionar comentário.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Adicionar Comentário
                    </DialogTitle>
                    <DialogDescription>
                        Adicione uma observação sobre {passenger?.passenger_name}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Textarea
                        placeholder="Escreva seu comentário aqui..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={5}
                        className="resize-none"
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Adicionar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}