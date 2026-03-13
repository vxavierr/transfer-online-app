import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, User, Mail, Phone, Briefcase, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function InvitationManagerDialog({ open, onOpenChange, invitations = [] }) {
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionError, setActionError] = useState('');
  
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('approveEmployeeInvitation', { invitationId: id }),
    onSuccess: (response) => {
      if (response.data.error) {
        setActionError(response.data.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      // Reset selection if the approved one was selected
      if (selectedInvitation?.id) setSelectedInvitation(null);
    },
    onError: (err) => setActionError(err.message || 'Erro ao aprovar')
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => base44.functions.invoke('rejectEmployeeInvitation', { invitationId: id, rejectionReason: reason }),
    onSuccess: (response) => {
        if (response.data.error) {
            setActionError(response.data.error);
            return;
        }
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      if (selectedInvitation?.id) {
          setSelectedInvitation(null);
          setShowRejectInput(false);
          setRejectReason('');
      }
    },
    onError: (err) => setActionError(err.message || 'Erro ao rejeitar')
  });

  const handleApprove = (invitation) => {
    setActionError('');
    approveMutation.mutate(invitation.id);
  };

  const handleRejectClick = (invitation) => {
    setSelectedInvitation(invitation);
    setShowRejectInput(true);
    setActionError('');
  };

  const confirmReject = () => {
    if (!selectedInvitation) return;
    rejectMutation.mutate({ id: selectedInvitation.id, reason: rejectReason });
  };

  const getRoleLabel = (role) => {
    const labels = {
        admin_client: 'Administrador',
        requester: 'Solicitante',
        passenger: 'Passageiro',
        approver: 'Aprovador',
        manager: 'Gerente',
        dispatcher: 'Despachante',
        driver: 'Motorista'
    };
    return labels[role] || role;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Gerenciar Solicitações de Convite</DialogTitle>
          <DialogDescription>
            Aprove ou rejeite as solicitações de novos membros da equipe.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6 pt-2">
          {actionError && (
              <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{actionError}</AlertDescription>
              </Alert>
          )}

          {invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <CheckCircle className="w-12 h-12 mb-2 text-gray-300" />
              <p>Nenhuma solicitação pendente</p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {invitations.map((inv) => (
                  <div 
                    key={inv.id} 
                    className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-500" />
                                {inv.full_name}
                            </h3>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {getRoleLabel(inv.desired_role)}
                            </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {inv.email}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {inv.phone_number}
                          </div>
                          <div className="flex items-center gap-2 col-span-full">
                             <Clock className="w-3.5 h-3.5 text-gray-400" />
                             Solicitado em: {new Date(inv.created_date).toLocaleDateString()}
                          </div>
                        </div>

                        {inv.notes && (
                            <div className="mt-2 text-sm bg-gray-50 p-2 rounded border border-gray-100 flex gap-2 items-start">
                                <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-600 italic">"{inv.notes}"</span>
                            </div>
                        )}
                      </div>

                      <div className="flex flex-row md:flex-col justify-center gap-2 min-w-[120px]">
                        {showRejectInput && selectedInvitation?.id === inv.id ? (
                            <div className="flex flex-col gap-2 w-full md:w-64 animate-in fade-in slide-in-from-right-4 duration-200">
                                <Textarea 
                                    placeholder="Motivo da rejeição..." 
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="text-sm h-20"
                                />
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="destructive" 
                                        onClick={confirmReject}
                                        disabled={rejectMutation.isPending}
                                        className="flex-1"
                                    >
                                        Confirmar
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => { setShowRejectInput(false); setRejectReason(''); setSelectedInvitation(null); }}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Button 
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApprove(inv)}
                                    disabled={approveMutation.isPending || (showRejectInput && selectedInvitation?.id !== inv.id)}
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Aprovar
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => handleRejectClick(inv)}
                                    disabled={rejectMutation.isPending || (showRejectInput && selectedInvitation?.id !== inv.id)}
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Rejeitar
                                </Button>
                            </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        
        <DialogFooter className="p-4 border-t bg-gray-50">
           <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}