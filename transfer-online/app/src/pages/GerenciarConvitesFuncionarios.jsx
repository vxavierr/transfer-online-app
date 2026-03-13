import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  Building2,
  AlertCircle,
  Eye,
  Send,
  Copy,
  Edit,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GerenciarConvitesFuncionarios() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    desired_role: ''
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        if (currentUser.role !== 'admin') {
          alert('Acesso restrito a administradores.');
          window.location.href = '/';
          return;
        }

        setUser(currentUser);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['employeeInvitations'],
    queryFn: () => base44.entities.EmployeeInvitation.list(),
    enabled: !!user,
    initialData: []
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: !!user,
    initialData: []
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: !!user,
    initialData: []
  });

  const sendInviteMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('resendEmployeeInvitation', { 
      invitationId: id,
      origin: window.location.origin 
    }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['employeeInvitations'] });
      
      const data = response?.data || {};
      if (data.whatsappSent) {
          setSuccess('Convite enviado via WhatsApp com sucesso!');
      } else if (data.emailSent) {
          setSuccess('Convite enviado via E-mail com sucesso!');
      } else if (data.warning) {
        setError(`Atenção: ${data.warning}. Copie o link: ${data.inviteLink}`);
        setTimeout(() => setError(''), 15000);
        return;
      } else {
        setSuccess('Convite processado com sucesso!');
      }
      setTimeout(() => setSuccess(''), 4000);
    },
    onError: (error) => {
      console.error('Erro no envio:', error);
      const apiError = error.response?.data?.error || error.message || 'Erro desconhecido';
      // Se tiver link no erro (caso de fallback total), mostra pro usuário com o motivo
      const link = error.response?.data?.inviteLink;
      if (link) {
          // Mostra o erro completo para facilitar debug
          let cleanError = apiError;
          // Tenta limpar um pouco se for o formato padrão
          if (apiError.includes("Falha no envio. WhatsApp:")) {
             cleanError = apiError.replace("Falha no envio. ", "");
          }
          
          setError(
            <div className="flex flex-col gap-2">
              <span className="text-sm text-red-600"><strong>Erro:</strong> {cleanError}</span>
              <span className="text-sm font-medium">Copie o link abaixo e envie manualmente:</span>
              <div className="flex items-center gap-2 bg-white p-2 rounded border">
                <code className="text-xs flex-1 break-all">{link}</code>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    alert('Link copiado!');
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
      } else {
          setError('Erro ao enviar convite: ' + apiError);
      }
    }
  });

  const updateInvitationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmployeeInvitation.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employeeInvitations'] });
      
      // Se foi uma aprovação, tenta enviar o email automaticamente
      if (variables.data.status === 'aprovado') {
        setSuccess('Solicitação aprovada! Enviando e-mail de convite...');
        sendInviteMutation.mutate(variables.id);
      } else {
        setSuccess('Solicitação atualizada com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      }

      setShowDetailsDialog(false);
      setShowRejectDialog(false);
      setShowEditDialog(false);
      setRejectionReason('');
    },
    onError: (error) => {
      setError(error.message || 'Erro ao atualizar solicitação');
    }
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeInvitation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeInvitations'] });
      setSuccess('Solicitação excluída com sucesso!');
      setShowDeleteDialog(false);
      setItemToDelete(null);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao excluir solicitação');
      setShowDeleteDialog(false);
    }
  });

  const handleApprove = (invitation) => {
    setSelectedInvitation(invitation);
    
    updateInvitationMutation.mutate({
      id: invitation.id,
      data: {
        status: 'aprovado',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      }
    });
  };

  const handleResendInvite = (invitation) => {
    setSuccess('Reenviando convite...');
    sendInviteMutation.mutate(invitation.id);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      setError('Informe o motivo da rejeição');
      return;
    }

    updateInvitationMutation.mutate({
      id: selectedInvitation.id,
      data: {
        status: 'rejeitado',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason
      }
    });
  };

  const openRejectDialog = (invitation) => {
    setSelectedInvitation(invitation);
    setShowRejectDialog(true);
    setError('');
  };

  const handleEditClick = (invitation) => {
    setSelectedInvitation(invitation);
    setEditFormData({
      full_name: invitation.full_name || '',
      email: invitation.email || '',
      phone_number: invitation.phone_number || '',
      desired_role: invitation.desired_role || ''
    });
    setShowEditDialog(true);
  };

  const handleDeleteClick = (invitation) => {
    setItemToDelete(invitation);
    setShowDeleteDialog(true);
  };

  const confirmEdit = (e) => {
    e.preventDefault();
    updateInvitationMutation.mutate({
      id: selectedInvitation.id,
      data: editFormData
    });
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteInvitationMutation.mutate(itemToDelete.id);
    }
  };

  const getRequesterInfo = (invitation) => {
    if (invitation.requester_type === 'supplier') {
      const supplier = suppliers.find(s => s.id === invitation.supplier_id);
      return {
        type: 'Fornecedor',
        name: supplier?.name || 'N/A',
        icon: Building2,
        color: 'text-green-600'
      };
    } else {
      const client = clients.find(c => c.id === invitation.client_id);
      return {
        type: 'Cliente Corporativo',
        name: client?.name || 'N/A',
        icon: Building2,
        color: 'text-blue-600'
      };
    }
  };

  const getRoleLabel = (invitation) => {
    if (invitation.role_type === 'supplier_employee_role') {
      const labels = {
        manager: 'Gerente',
        dispatcher: 'Despachante',
        driver: 'Motorista'
      };
      return labels[invitation.desired_role] || invitation.desired_role;
    } else {
      const labels = {
        admin_client: 'Administrador',
        requester: 'Solicitante',
        passenger: 'Passageiro',
        approver: 'Aprovador'
      };
      return labels[invitation.desired_role] || invitation.desired_role;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      convite_enviado: { label: 'Convite Enviado', color: 'bg-blue-100 text-blue-800', icon: Send },
      rejeitado: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
      cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800', icon: XCircle }
    };
    return badges[status] || badges.pendente;
  };

  const pendingInvitations = invitations.filter(i => i.status === 'pendente');
  const approvedInvitations = invitations.filter(i => ['aprovado', 'convite_enviado'].includes(i.status));
  const rejectedInvitations = invitations.filter(i => ['rejeitado', 'cancelado'].includes(i.status));

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Gerenciar Convites de Funcionários
          </h1>
          <p className="text-gray-600">
            Aprovar e gerenciar solicitações de convite de fornecedores e clientes
          </p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && !showRejectDialog && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingInvitations.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Aprovadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{approvedInvitations.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Rejeitadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{rejectedInvitations.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{invitations.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pendentes ({pendingInvitations.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Aprovadas ({approvedInvitations.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejeitadas ({rejectedInvitations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <InvitationsList
              invitations={pendingInvitations}
              isLoading={isLoading}
              getRequesterInfo={getRequesterInfo}
              getRoleLabel={getRoleLabel}
              getStatusBadge={getStatusBadge}
              onApprove={handleApprove}
              onReject={openRejectDialog}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onView={(inv) => {
                setSelectedInvitation(inv);
                setShowDetailsDialog(true);
              }}
              showActions={true}
            />
            </TabsContent>

            <TabsContent value="approved">
              <InvitationsList
                invitations={approvedInvitations}
                isLoading={isLoading}
                getRequesterInfo={getRequesterInfo}
                getRoleLabel={getRoleLabel}
                getStatusBadge={getStatusBadge}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onResend={handleResendInvite}
                onView={(inv) => {
                  setSelectedInvitation(inv);
                  setShowDetailsDialog(true);
                }}
                showActions={false}
                canEditDelete={true}
                canResend={true}
              />
            </TabsContent>

            <TabsContent value="rejected">
            <InvitationsList
              invitations={rejectedInvitations}
              isLoading={isLoading}
              getRequesterInfo={getRequesterInfo}
              getRoleLabel={getRoleLabel}
              getStatusBadge={getStatusBadge}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onView={(inv) => {
                setSelectedInvitation(inv);
                setShowDetailsDialog(true);
              }}
              showActions={false}
              canEditDelete={true}
            />
          </TabsContent>
        </Tabs>

        {/* Dialog de Detalhes */}
        {selectedInvitation && (
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">Detalhes da Solicitação</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusBadge(selectedInvitation.status).color}>
                    {getStatusBadge(selectedInvitation.status).label}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {format(new Date(selectedInvitation.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Solicitante</h3>
                  {(() => {
                    const info = getRequesterInfo(selectedInvitation);
                    const Icon = info.icon;
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${info.color}`} />
                          <span className="font-medium">{info.type}</span>
                        </div>
                        <p className="text-gray-900">{info.name}</p>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3">Dados do Funcionário</h3>
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <Label className="text-gray-600">Nome Completo</Label>
                      <p className="font-medium">{selectedInvitation.full_name}</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-600 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          E-mail
                        </Label>
                        <p className="font-medium">{selectedInvitation.email}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Telefone
                        </Label>
                        <p className="font-medium">{selectedInvitation.phone_number}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-600">Função Desejada</Label>
                      <p className="font-medium">{getRoleLabel(selectedInvitation)}</p>
                    </div>
                  </div>
                </div>

                {selectedInvitation.notes && (
                  <div>
                    <Label className="text-gray-600">Observações</Label>
                    <p className="bg-gray-50 p-3 rounded-lg">{selectedInvitation.notes}</p>
                  </div>
                )}

                {selectedInvitation.rejection_reason && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Motivo da Rejeição:</strong><br />
                      {selectedInvitation.rejection_reason}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setShowDetailsDialog(false)} variant="outline">
                  Fechar
                </Button>
                {selectedInvitation.status === 'pendente' && (
                  <>
                    <Button
                      onClick={() => {
                        setShowDetailsDialog(false);
                        openRejectDialog(selectedInvitation);
                      }}
                      variant="destructive"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedInvitation)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprovar e Enviar Convite
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog de Rejeição */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar Solicitação</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Informe o motivo da rejeição. Esta informação será compartilhada com o solicitante.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Motivo da Rejeição *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ex: E-mail já cadastrado no sistema, dados incompletos, etc."
                  rows={4}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setShowRejectDialog(false)} variant="outline">
                Cancelar
              </Button>
              <Button
                onClick={handleReject}
                disabled={updateInvitationMutation.isPending}
                variant="destructive"
              >
                {updateInvitationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rejeitando...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Confirmar Rejeição
                  </>
                )}
              </Button>
            </DialogFooter>
            </DialogContent>
            </Dialog>

            {/* Dialog de Edição */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Solicitação</DialogTitle>
            </DialogHeader>
            <form onSubmit={confirmEdit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone_number">Telefone</Label>
                  <Input
                    id="phone_number"
                    value={editFormData.phone_number}
                    onChange={(e) => setEditFormData({...editFormData, phone_number: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="desired_role">Função</Label>
                  <Input
                    id="desired_role"
                    value={editFormData.desired_role}
                    onChange={(e) => setEditFormData({...editFormData, desired_role: e.target.value})}
                    required
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateInvitationMutation.isPending}>
                  {updateInvitationMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
            </DialogContent>
            </Dialog>

            {/* Dialog de Exclusão */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Tem certeza que deseja excluir esta solicitação de <strong>{itemToDelete?.full_name}</strong>?</p>
              <p className="text-sm text-gray-500 mt-2">Esta ação não pode ser desfeita.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={deleteInvitationMutation.isPending}
              >
                {deleteInvitationMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
              </Button>
            </DialogFooter>
            </DialogContent>
            </Dialog>
            </div>
            </div>
            );
            }

            function InvitationsList({ 
            invitations, 
            isLoading, 
            getRequesterInfo, 
            getRoleLabel, 
            getStatusBadge,
            onApprove,
            onReject,
            onEdit,
            onDelete,
            onResend,
            onView,
            showActions,
            canEditDelete = false,
            canResend = false
            }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando solicitações...</p>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">Nenhuma solicitação encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Solicitante</TableHead>
                <TableHead className="font-semibold">Funcionário</TableHead>
                <TableHead className="font-semibold">Função</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => {
                const requesterInfo = getRequesterInfo(invitation);
                const Icon = requesterInfo.icon;
                const statusBadge = getStatusBadge(invitation.status);
                const StatusIcon = statusBadge.icon;

                return (
                  <TableRow key={invitation.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div 
                        className="flex items-center gap-1 group cursor-pointer hover:bg-gray-100 p-1 rounded" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(invitation.id);
                          alert('ID copiado: ' + invitation.id);
                        }} 
                        title="Clique para copiar ID completo"
                      >
                        <span className="font-mono text-xs text-gray-500">{invitation.id.substring(0, 8)}...</span>
                        <Copy className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${requesterInfo.color}`} />
                        <div>
                          <div className="font-medium text-gray-900">{requesterInfo.name}</div>
                          <div className="text-xs text-gray-500">{requesterInfo.type}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invitation.full_name}</div>
                        <div className="text-xs text-gray-500">{invitation.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getRoleLabel(invitation)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadge.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {format(new Date(invitation.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(invitation)}
                          title="Ver Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canResend && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onResend(invitation)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Reenviar E-mail"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        {showActions && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onApprove(invitation)}
                              className="text-green-600 hover:text-green-700"
                              title="Aprovar"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onReject(invitation)}
                              className="text-red-600 hover:text-red-700"
                              title="Rejeitar"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {(showActions || canEditDelete) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(invitation)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(invitation)}
                              className="text-red-600 hover:text-red-700"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        </div>
                        </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}