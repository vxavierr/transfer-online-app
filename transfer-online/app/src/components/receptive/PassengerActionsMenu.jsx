import React, { useState } from 'react';
import { 
  MoreVertical, Phone, MessageCircle, MessageSquare, Plane, User, Car, Trash2, 
  ExternalLink, Loader2, Save, X 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import FlightStatusChecker from '@/components/flight/FlightStatusChecker';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";

export default function PassengerActionsMenu({ passenger, request, token, onUpdate }) {
  const { toast } = useToast();
  const [activeDialog, setActiveDialog] = useState(null); // 'comment', 'profile', 'flight', 'remove'
  const [isLoading, setIsLoading] = useState(false);
  
  // States for forms
  const [comment, setComment] = useState(passenger.notes || '');
  const [profileData, setProfileData] = useState({
    name: passenger.name || '',
    phone_number: passenger.details?.phone_number || '',
    email: passenger.details?.email || '',
    document_number: passenger.details?.document_number || ''
  });

  const handleAction = (action) => {
    switch(action) {
      case 'call':
        if (profileData.phone_number) window.open(`tel:${profileData.phone_number}`);
        break;
      case 'whatsapp':
        if (profileData.phone_number) {
            const num = profileData.phone_number.replace(/\D/g, '');
            window.open(`https://wa.me/${num}`);
        }
        break;
      case 'uber':
        // Link genérico do Uber
        window.open('https://m.uber.com/ul/', '_blank');
        break;
      case 'comment':
        setComment(passenger.notes || '');
        setActiveDialog('comment');
        break;
      case 'profile':
        setProfileData({
            name: passenger.name || '',
            phone_number: passenger.details?.phone_number || '',
            email: passenger.details?.email || '',
            document_number: passenger.details?.document_number || ''
        });
        setActiveDialog('profile');
        break;
      case 'flight':
        setActiveDialog('flight');
        break;
      case 'remove':
        setActiveDialog('remove');
        break;
    }
  };

  const saveComment = async () => {
    setIsLoading(true);
    try {
        const res = await base44.functions.invoke('managePassenger', {
            requestId: request.id,
            token,
            passengerIndex: passenger.originalIndex,
            action: 'update_notes',
            data: { notes: comment }
        });
        if (res.data.success) {
            toast({ title: "Comentário salvo!" });
            setActiveDialog(null);
            onUpdate();
        } else throw new Error(res.data.error);
    } catch (e) {
        toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    setIsLoading(true);
    try {
        const res = await base44.functions.invoke('managePassenger', {
            requestId: request.id,
            token,
            passengerIndex: passenger.originalIndex,
            action: 'update_profile',
            data: profileData
        });
        if (res.data.success) {
            toast({ title: "Perfil atualizado!" });
            setActiveDialog(null);
            onUpdate();
        } else throw new Error(res.data.error);
    } catch (e) {
        toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const removePassenger = async () => {
    setIsLoading(true);
    try {
        const res = await base44.functions.invoke('managePassenger', {
            requestId: request.id,
            token,
            passengerIndex: passenger.originalIndex,
            action: 'remove'
        });
        if (res.data.success) {
            toast({ title: "Passageiro removido!" });
            setActiveDialog(null);
            onUpdate();
        } else throw new Error(res.data.error);
    } catch (e) {
        toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100">
            <MoreVertical className="h-4 w-4 text-gray-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-gray-500 font-normal truncate">
            {passenger.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleAction('call')} disabled={!profileData.phone_number}>
            <Phone className="mr-2 h-4 w-4" /> Ligar
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleAction('whatsapp')} disabled={!profileData.phone_number}>
            <MessageCircle className="mr-2 h-4 w-4" /> Mensagem WhatsApp
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleAction('comment')}>
            <MessageSquare className="mr-2 h-4 w-4" /> Comentar
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleAction('flight')}>
            <Plane className="mr-2 h-4 w-4" /> Rastrear Voo
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleAction('profile')}>
            <User className="mr-2 h-4 w-4" /> Perfil Participante
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleAction('uber')}>
            <Car className="mr-2 h-4 w-4" /> Uber
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleAction('remove')} className="text-red-600 focus:text-red-600 focus:bg-red-50">
            <Trash2 className="mr-2 h-4 w-4" /> Remover Participante
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      
      {/* Comentar */}
      <Dialog open={activeDialog === 'comment'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Comentário</DialogTitle></DialogHeader>
            <div className="py-2">
                <Textarea 
                    placeholder="Adicione uma observação sobre este passageiro..." 
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    className="h-32"
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancelar</Button>
                <Button onClick={saveComment} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Perfil */}
      <Dialog open={activeDialog === 'profile'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Perfil do Participante</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
                <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={profileData.phone_number} onChange={e => setProfileData({...profileData, phone_number: e.target.value})} placeholder="+55..." />
                </div>
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Documento</Label>
                    <Input value={profileData.document_number} onChange={e => setProfileData({...profileData, document_number: e.target.value})} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancelar</Button>
                <Button onClick={saveProfile} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rastrear Voo */}
      <Dialog open={activeDialog === 'flight'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Rastrear Voo</DialogTitle></DialogHeader>
            <div className="py-4 flex justify-center">
                {/* Reutilizando lógica do FlightStatusChecker ou fornecendo interface para ele */}
                <div className="w-full">
                    <Label className="mb-2 block">Voo Vinculado</Label>
                    <div className="p-4 bg-gray-50 rounded mb-4">
                        {request.origin_flight_number || request.destination_flight_number || request.flight_number || "Nenhum voo informado na viagem."}
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-4">
                        Use a ferramenta abaixo para verificar o status em tempo real.
                    </p>
                    
                    <FlightStatusChecker 
                        defaultFlightNumber={request.origin_flight_number || request.destination_flight_number || request.flight_number}
                        defaultDate={request.date}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setActiveDialog(null)}>Fechar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remover */}
      <Dialog open={activeDialog === 'remove'} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-red-600">Remover Participante</DialogTitle>
                <DialogDescription>
                    Tem certeza que deseja remover <strong>{passenger.name}</strong> desta lista?
                    Esta ação não pode ser desfeita.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancelar</Button>
                <Button variant="destructive" onClick={removePassenger} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Remover
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}