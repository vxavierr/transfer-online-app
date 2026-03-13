import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Car,
  Eye,
  AlertCircle,
  Phone,
  Mail,
  Briefcase,
  DollarSign,
  Link as LinkIcon,
  Copy,
  UserPlus,
  Send,
  Edit,
  Trash2,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import DriverApprovalHistory from '@/components/admin/DriverApprovalHistory';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GerenciarAprovacoes() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState(null); // 'driver' or 'vehicle'
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState('approve'); // 'approve' or 'reject'
  const [adminNotes, setAdminNotes] = useState('');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailToUpdate, setEmailToUpdate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // States for Invitation management
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [showInvitationDetails, setShowInvitationDetails] = useState(false);
  const [showInvitationRejectDialog, setShowInvitationRejectDialog] = useState(false);
  const [showInvitationEditDialog, setShowInvitationEditDialog] = useState(false);
  const [invitationRejectionReason, setInvitationRejectionReason] = useState('');
  const [invitationEditData, setInvitationEditData] = useState({});
  const [selectedClientForFlow, setSelectedClientForFlow] = useState(''); // Para selecionar cliente do fluxo corporativo
  const [approvalMode, setApprovalMode] = useState('direct'); // 'direct' | 'flow'

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setUser(currentUser);
        setIsCheckingAuth(false);
      } catch (error) {
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  const { data: drivers = [], isLoading: loadingDrivers } = useQuery({
    queryKey: ['allDrivers'],
    queryFn: () => base44.entities.Driver.list('-created_date'),
    enabled: !isCheckingAuth,
    initialData: []
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['allSupplierVehicles'],
    queryFn: () => base44.entities.SupplierVehicleType.list('-created_date'),
    enabled: !isCheckingAuth,
    initialData: []
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: !isCheckingAuth,
    initialData: []
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: !isCheckingAuth,
    initialData: []
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['employeeInvitations'],
    queryFn: () => base44.entities.EmployeeInvitation.list(),
    enabled: !isCheckingAuth,
    initialData: []
  });

  const { data: flowInstances = [] } = useQuery({
    queryKey: ['flowInstances'],
    queryFn: () => base44.entities.DriverApprovalFlowInstance.list(),
    enabled: !isCheckingAuth,
    initialData: []
  });

  const initiateInvitationFlowMutation = useMutation({
    mutationFn: async ({ invitationId, clientId }) => {
        const res = await base44.functions.invoke('initiateCorporateDriverApproval', {
            invitationId: invitationId,
            clientId: clientId
        });
        if (res.data?.error) throw new Error(res.data.error);
        return res.data;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['employeeInvitations'] });
        queryClient.invalidateQueries({ queryKey: ['flowInstances'] });
        setSuccess('Fluxo de aprovação corporativa iniciado para o convite!');
        handleCloseDialogs();
        setShowInvitationDetails(false);
        setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => setError(err.message)
  });

  const resendApprovalLinkMutation = useMutation({
    mutationFn: async ({ flowId }) => {
        const res = await base44.functions.invoke('resendCorporateApprovalLink', { flowInstanceId: flowId });
        if (res.data?.error) throw new Error(res.data.error);
        return res.data;
    },
    onSuccess: () => {
        setSuccess('Email de aprovação reenviado com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => setError(err.message || 'Erro ao reenviar email')
  });

  const approveDriverMutation = useMutation({
    mutationFn: async ({ id, notes, startCorporateFlow, clientId }) => {
      // Se for iniciar fluxo corporativo
      if (startCorporateFlow && clientId) {
         const res = await base44.functions.invoke('initiateCorporateDriverApproval', {
            driverId: id,
            clientId: clientId
         });
         
         if (res.data?.error) throw new Error(res.data.error);
         
         // Atualiza status local para refletir (embora a função backend faça isso)
         return base44.entities.Driver.update(id, {
            approval_status: 'pending', // Mantém pending geral enquanto corre o fluxo corp
            admin_notes: notes
         });
      } else {
         // Aprovação normal
         return base44.entities.Driver.update(id, {
            approval_status: 'approved',
            active: true,
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            admin_notes: notes,
            requires_corporate_approval: false // Garante que desliga se aprovou direto
         });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDrivers'] });
      setSuccess('Motorista aprovado com sucesso!');
      handleCloseDialogs();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao aprovar motorista');
    }
  });

  const rejectDriverMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.Driver.update(id, {
      approval_status: 'rejected',
      active: false,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      admin_notes: notes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDrivers'] });
      setSuccess('Motorista rejeitado.');
      handleCloseDialogs();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao rejeitar motorista');
    }
  });

  const approveVehicleMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.SupplierVehicleType.update(id, {
      approval_status: 'approved',
      active: true,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      admin_notes: notes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allSupplierVehicles'] });
      setSuccess('Veículo aprovado com sucesso!');
      handleCloseDialogs();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao aprovar veículo');
    }
  });

  const rejectVehicleMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.SupplierVehicleType.update(id, {
      approval_status: 'rejected',
      active: false,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      admin_notes: notes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allSupplierVehicles'] });
      setSuccess('Veículo rejeitado.');
      handleCloseDialogs();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao rejeitar veículo');
    }
  });

  const updateEmailMutation = useMutation({
    mutationFn: ({ driverId, email }) => base44.functions.invoke('adminUpdateDriverEmail', { driverId, email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDrivers'] });
      setSuccess('Email atualizado e convite enviado!');
      setShowEmailDialog(false);
      setSelectedItem(null);
      setEmailToUpdate('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao atualizar email');
    }
  });

  const handleCloseDialogs = () => {
    setShowDetailsDialog(false);
    setShowApprovalDialog(false);
    setSelectedItem(null);
    setItemType(null);
    setAdminNotes('');
    setError('');
  };

  const handleOpenApprovalDialog = (item, type, action) => {
    setSelectedItem(item);
    setItemType(type);
    setApprovalAction(action);
    setAdminNotes('');
    setError('');
    setSelectedClientForFlow(''); // Reset
    setApprovalMode('direct'); // Reset mode
    setShowApprovalDialog(true);
  };

  const handleOpenEmailDialog = (driver) => {
    setSelectedItem(driver);
    setItemType('driver');
    setEmailToUpdate(driver.email || '');
    setError('');
    setShowEmailDialog(true);
  };

  const handleViewDetails = (item, type) => {
    setSelectedItem(item);
    setItemType(type);
    setShowDetailsDialog(true);
  };

  const generateAndCopyLink = async (driverId) => {
    try {
      const promise = base44.functions.invoke('generateDriverTermsLink', { driverId });
      
      toast.promise(promise, {
        loading: 'Gerando link...',
        success: (response) => {
          if (response.data?.link) {
            navigator.clipboard.writeText(response.data.link);
            return 'Link copiado para a área de transferência!';
          }
          throw new Error('Link não gerado');
        },
        error: 'Erro ao gerar link'
      });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar link');
    }
  };

  const handleSubmitApproval = () => {
    if (approvalAction === 'reject' && !adminNotes.trim()) {
      setError('Por favor, informe o motivo da rejeição');
      return;
    }

    if (itemType === 'driver') {
      if (approvalAction === 'approve') {
        if (approvalMode === 'flow' && !selectedClientForFlow) {
            setError('Selecione um cliente para iniciar o fluxo de aprovação.');
            return;
        }
        approveDriverMutation.mutate({ 
            id: selectedItem.id, 
            notes: adminNotes,
            startCorporateFlow: approvalMode === 'flow',
            clientId: selectedClientForFlow
        });
      } else {
        rejectDriverMutation.mutate({ id: selectedItem.id, notes: adminNotes });
      }
    } else if (itemType === 'invitation') {
      if (approvalAction === 'approve') {
        // Se houver fluxo selecionado
        if (approvalMode === 'flow' && selectedClientForFlow && selectedItem.desired_role === 'driver') {
           const existingDriver = drivers.find(d => d.email === selectedItem.email);
           
           if (existingDriver) {
               // Inicia o fluxo para o motorista existente (comportamento antigo mantido se motorista já existir)
               approveDriverMutation.mutate({
                  id: existingDriver.id,
                  notes: adminNotes,
                  startCorporateFlow: true,
                  clientId: selectedClientForFlow
               });
               // Não precisamos fazer updateInvitationMutation aqui, pois o approveDriverMutation já lida com o driver
               // Mas se o convite estiver aberto, talvez queiramos fechá-lo? 
               // Vamos assumir que se o driver existe, o convite já foi processado ou é irrelevante para este fluxo
           } else {
               // NOVO: Inicia pré-fluxo no convite (o motorista NÃO existe ainda)
               initiateInvitationFlowMutation.mutate({
                   invitationId: selectedItem.id,
                   clientId: selectedClientForFlow
               });
           }
        } else {
            // Aprovação Direta (Convencional)
            updateInvitationMutation.mutate({ 
                id: selectedItem.id, 
                data: { 
                    status: 'aprovado', 
                    reviewed_by: user.id, 
                    reviewed_at: new Date().toISOString(),
                    corporate_flow_client_id: null
                } 
            });
        }
      } else {
        updateInvitationMutation.mutate({ 
            id: selectedItem.id, 
            data: { status: 'rejeitado', rejection_reason: adminNotes, reviewed_by: user.id, reviewed_at: new Date().toISOString() } 
        });
      }
    } else if (itemType === 'vehicle') {
      if (approvalAction === 'approve') {
        approveVehicleMutation.mutate({ id: selectedItem.id, notes: adminNotes });
      } else {
        rejectVehicleMutation.mutate({ id: selectedItem.id, notes: adminNotes });
      }
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || 'N/A';
  };

  const pendingDrivers = drivers.filter(d => d.approval_status === 'pending');
  const pendingVehicles = vehicles.filter(v => v.approval_status === 'pending');
  
  // Convites que estão realmente pendentes de ação do admin (status pendente E não estão em pré-fluxo em andamento)
  // Se pre_approval_status for 'approved', volta para pendente de envio do admin.
  // Se pre_approval_status for 'in_progress', está esperando o cliente, então não deve aparecer na lista principal ou deve aparecer separado.
  const pendingInvitations = invitations.filter(i => 
    i.status === 'pendente' && i.pre_approval_status !== 'in_progress'
  );
  
  const invitationsInFlow = invitations.filter(i => 
    i.status === 'pendente' && i.pre_approval_status === 'in_progress'
  );

  const pendingFlowDrivers = pendingDrivers.filter(d => d.corporate_approval_status === 'pending_approver_review');
  const pendingDirectDrivers = pendingDrivers.filter(d => d.corporate_approval_status !== 'pending_approver_review');

  const getFlowDetails = (item, type = 'driver') => {
    const flow = flowInstances.find(f => 
        (type === 'driver' ? f.driver_id === item.id : f.invitation_id === item.id) 
        && f.status === 'in_progress'
    );
    if (!flow) {
      // Busca fluxo concluído/rejeitado para exibir histórico
      const completedFlow = flowInstances.find(f =>
        type === 'driver' ? f.driver_id === item.id : f.invitation_id === item.id
      );
      if (completedFlow && completedFlow.approver_history?.length > 0) {
        const client = clients.find(c => c.id === completedFlow.client_id);
        return {
          id: completedFlow.id,
          clientName: client?.name || 'Cliente Desconhecido',
          approverName: null,
          approverEmail: null,
          sentAt: null,
          step: null,
          totalSteps: completedFlow.flow_config_used?.approver_sequence?.length || 0,
          status: completedFlow.status,
          approver_history: completedFlow.approver_history || []
        };
      }
      return null;
    }
    if (!flow) return null;
    
    const client = clients.find(c => c.id === flow.client_id);
    const config = flow.flow_config_used;
    const currentApprover = config?.approver_sequence?.[flow.current_approver_index];
    const lastSent = flow.secure_links_sent?.[flow.secure_links_sent.length - 1];

    return {
      id: flow.id,
      clientName: client?.name || 'Cliente Desconhecido',
      approverName: currentApprover?.name || 'N/A',
      approverEmail: currentApprover?.email || 'N/A',
      sentAt: lastSent?.sent_at,
      step: flow.current_approver_index + 1,
      totalSteps: config?.approver_sequence?.length || 0,
      status: flow.status,
      approver_history: flow.approver_history || []
    };
  };

  const approvedDrivers = drivers.filter(d => d.approval_status === 'approved');
  const approvedVehicles = vehicles.filter(v => v.approval_status === 'approved');
  const approvedInvitations = invitations.filter(i => ['aprovado', 'convite_enviado'].includes(i.status));

  const rejectedDrivers = drivers.filter(d => d.approval_status === 'rejected');
  const rejectedVehicles = vehicles.filter(v => v.approval_status === 'rejected');
  const rejectedInvitations = invitations.filter(i => ['rejeitado', 'cancelado'].includes(i.status));

  const sendInviteMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('resendEmployeeInvitation', { 
      invitationId: id,
      origin: window.location.origin 
    }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['employeeInvitations'] });
      const data = response?.data || {};
      if (data.whatsappSent) setSuccess('Convite enviado via WhatsApp com sucesso!');
      else if (data.emailSent) setSuccess('Convite enviado via E-mail com sucesso!');
      else if (data.warning) {
        setError(`Atenção: ${data.warning}. Copie o link: ${data.inviteLink}`);
        setTimeout(() => setError(''), 15000);
        return;
      } else setSuccess('Convite processado com sucesso!');
      setTimeout(() => setSuccess(''), 4000);
    },
    onError: (error) => setError(error.message || 'Erro ao enviar convite')
  });

  const updateInvitationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmployeeInvitation.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employeeInvitations'] });
      if (variables.data.status === 'aprovado') {
        setSuccess('Solicitação aprovada! Enviando e-mail...');
        sendInviteMutation.mutate(variables.id);
      } else {
        setSuccess('Solicitação atualizada!');
        setTimeout(() => setSuccess(''), 3000);
      }
      setShowInvitationDetails(false);
      setShowInvitationRejectDialog(false);
      setShowInvitationEditDialog(false);
      handleCloseDialogs();
    },
    onError: (error) => setError(error.message)
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeInvitation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeInvitations'] });
      setSuccess('Solicitação excluída!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => setError(error.message)
  });

  const getRequesterInfo = (invitation) => {
    if (invitation.requester_type === 'supplier') {
      const supplier = suppliers.find(s => s.id === invitation.supplier_id);
      return { type: 'Fornecedor', name: supplier?.name || 'N/A', icon: Building2, color: 'text-green-600' };
    } else {
      const client = clients.find(c => c.id === invitation.client_id);
      return { type: 'Cliente Corp.', name: client?.name || 'N/A', icon: Building2, color: 'text-blue-600' };
    }
  };

  const getRoleLabel = (invitation) => {
    const labels = {
      manager: 'Gerente', dispatcher: 'Despachante', driver: 'Motorista',
      admin_client: 'Admin', requester: 'Solicitante', passenger: 'Passageiro', approver: 'Aprovador'
    };
    return labels[invitation.desired_role] || invitation.desired_role;
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Gerenciar Aprovações
          </h1>
          <p className="text-gray-600">Aprove ou rejeite motoristas e veículos cadastrados pelos fornecedores</p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && !showApprovalDialog && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Aguardando Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingDrivers.length + pendingVehicles.length + pendingInvitations.length}</div>
              <p className="text-xs opacity-90 mt-1">
                {pendingDrivers.length} motoristas, {pendingVehicles.length} veículos, {pendingInvitations.length} convites
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Aprovados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{approvedDrivers.length + approvedVehicles.length + approvedInvitations.length}</div>
              <p className="text-xs opacity-90 mt-1">
                {approvedDrivers.length} motoristas, {approvedVehicles.length} veículos, {approvedInvitations.length} convites
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Rejeitados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{rejectedDrivers.length + rejectedVehicles.length + rejectedInvitations.length}</div>
              <p className="text-xs opacity-90 mt-1">
                {rejectedDrivers.length} motoristas, {rejectedVehicles.length} veículos, {rejectedInvitations.length} convites
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 gap-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendentes ({pendingDrivers.length + pendingVehicles.length + pendingInvitations.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Aprovados ({approvedDrivers.length + approvedVehicles.length + approvedInvitations.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Rejeitados ({rejectedDrivers.length + rejectedVehicles.length + rejectedInvitations.length})
            </TabsTrigger>
          </TabsList>

          {/* Pendentes */}
          <TabsContent value="pending" className="space-y-6">
            {/* Convites Pendentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Convites de Funcionários Pendentes ({pendingInvitations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingInvitations.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">Nenhum convite pendente</div>
                ) : (
                  <div className="rounded-lg border bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Solicitante</TableHead>
                          <TableHead className="font-semibold">Funcionário</TableHead>
                          <TableHead className="font-semibold">Função</TableHead>
                          <TableHead className="font-semibold">Data</TableHead>
                          <TableHead className="font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingInvitations.map((inv) => {
                          const requesterInfo = getRequesterInfo(inv);
                          const Icon = requesterInfo.icon;
                          return (
                            <TableRow key={inv.id} className="hover:bg-gray-50">
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
                                  <div className="font-medium">{inv.full_name}</div>
                                  <div className="text-xs text-gray-500">{inv.email}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm">{getRoleLabel(inv)}</span>
                                    {inv.pre_approval_status === 'approved' && (
                                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] w-fit">
                                            Pré-Aprovado
                                        </Badge>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-600">
                                  {format(new Date(inv.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => { setSelectedInvitation(inv); setShowInvitationDetails(true); }}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handleOpenApprovalDialog(inv, 'invitation', 'approve')} title={inv.pre_approval_status === 'approved' ? "Enviar Convite Final" : "Aprovar / Iniciar Fluxo"}>
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setSelectedInvitation(inv); setShowInvitationRejectDialog(true); }}>
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Convites/Motoristas em Fluxo Corporativo */}
            {(pendingFlowDrivers.length > 0 || invitationsInFlow.length > 0) && (
              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Briefcase className="w-5 h-5" />
                    Aguardando Aprovação Corporativa ({pendingFlowDrivers.length + invitationsInFlow.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-blue-100 bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-blue-50/50">
                          <TableHead className="font-semibold text-blue-900">Tipo</TableHead>
                          <TableHead className="font-semibold text-blue-900">Candidato / Fornecedor</TableHead>
                          <TableHead className="font-semibold text-blue-900">Cliente Corporativo</TableHead>
                          <TableHead className="font-semibold text-blue-900">Status do Fluxo</TableHead>
                          <TableHead className="font-semibold text-blue-900">Aguardando Aprovador</TableHead>
                          <TableHead className="font-semibold text-blue-900">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Convites em Fluxo */}
                        {invitationsInFlow.map((inv) => {
                          const flow = getFlowDetails(inv, 'invitation');
                          const requesterInfo = getRequesterInfo(inv);
                          return (
                            <TableRow key={inv.id} className="hover:bg-blue-50/30">
                              <TableCell><Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Pré-Cadastro</Badge></TableCell>
                              <TableCell>
                                <div className="font-medium text-gray-900">{inv.full_name}</div>
                                <div className="text-xs text-gray-500">{requesterInfo.name}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-blue-800">{flow?.clientName || '-'}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                                  Etapa {flow?.step || 1} de {flow?.totalSteps || '?'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{flow?.approverName}</div>
                                  <div className="text-xs text-gray-500">{flow?.approverEmail}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => { setSelectedInvitation(inv); setShowInvitationDetails(true); }} title="Ver detalhes">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-blue-600 hover:bg-blue-50" 
                                    onClick={() => flow?.id && resendApprovalLinkMutation.mutate({ flowId: flow.id })} 
                                    title="Reenviar Email de Aprovação"
                                    disabled={resendApprovalLinkMutation.isPending}
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => { setSelectedInvitation(inv); setShowInvitationRejectDialog(true); }} title="Cancelar">
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Motoristas em Fluxo */}
                        {pendingFlowDrivers.map((driver) => {
                          const flow = getFlowDetails(driver, 'driver');
                          return (
                            <TableRow key={driver.id} className="hover:bg-blue-50/30">
                              <TableCell><Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Motorista</Badge></TableCell>
                              <TableCell>
                                <div className="font-medium text-gray-900">{driver.name}</div>
                                <div className="text-xs text-gray-500">{getSupplierName(driver.supplier_id)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-blue-800">{flow?.clientName || '-'}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                                  Etapa {flow?.step || 1} de {flow?.totalSteps || '?'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{flow?.approverName}</div>
                                  <div className="text-xs text-gray-500">{flow?.approverEmail}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleViewDetails(driver, 'driver')} title="Ver detalhes">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-blue-600 hover:bg-blue-50" 
                                    onClick={() => flow?.id && resendApprovalLinkMutation.mutate({ flowId: flow.id })} 
                                    title="Reenviar Email de Aprovação"
                                    disabled={resendApprovalLinkMutation.isPending}
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleOpenApprovalDialog(driver, 'driver', 'reject')} className="text-red-600 hover:bg-red-50" title="Cancelar">
                                    <XCircle className="w-4 h-4" />
                                  </Button>
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
            )}

            {/* Motoristas Pendentes (Aprovação Direta) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Motoristas Pendentes ({pendingDirectDrivers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDrivers ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                  </div>
                ) : pendingDirectDrivers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Nenhum motorista aguardando aprovação direta
                  </div>
                ) : (
                  <div className="rounded-lg border bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Motorista</TableHead>
                          <TableHead className="font-semibold">Fornecedor</TableHead>
                          <TableHead className="font-semibold">Contato</TableHead>
                          <TableHead className="font-semibold">Veículo</TableHead>
                          <TableHead className="font-semibold">Cadastrado em</TableHead>
                          <TableHead className="font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingDirectDrivers.map((driver) => (
                          <TableRow key={driver.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="font-medium text-gray-900">{driver.name}</div>
                              {driver.license_number && (
                                <div className="text-sm text-gray-500">CNH: {driver.license_number}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{getSupplierName(driver.supplier_id)}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm space-y-1">
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-gray-400" />
                                  {driver.phone_number}
                                </div>
                                {driver.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-gray-400" />
                                    {driver.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">{driver.vehicle_model}</div>
                                <div className="text-gray-500">{driver.vehicle_plate}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600">
                                {format(new Date(driver.created_date), "dd/MM/yyyy", { locale: ptBR })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(driver, 'driver')}
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenApprovalDialog(driver, 'driver', 'approve')}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  title="Aprovar"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenApprovalDialog(driver, 'driver', 'reject')}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Rejeitar"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Veículos Pendentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Veículos Pendentes ({pendingVehicles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingVehicles ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                  </div>
                ) : pendingVehicles.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Nenhum veículo aguardando aprovação
                  </div>
                ) : (
                  <div className="rounded-lg border bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Veículo</TableHead>
                          <TableHead className="font-semibold">Fornecedor</TableHead>
                          <TableHead className="font-semibold">Capacidade</TableHead>
                          <TableHead className="font-semibold">Preço/km</TableHead>
                          <TableHead className="font-semibold">Cadastrado em</TableHead>
                          <TableHead className="font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingVehicles.map((vehicle) => (
                          <TableRow key={vehicle.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="font-medium text-gray-900">{vehicle.name}</div>
                              {vehicle.description && (
                                <div className="text-sm text-gray-500 max-w-xs truncate">
                                  {vehicle.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{getSupplierName(vehicle.supplier_id)}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4 text-gray-400" />
                                  <span>{vehicle.max_passengers}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Briefcase className="w-4 h-4 text-gray-400" />
                                  <span>{vehicle.max_luggage}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <span className="font-semibold text-green-600">
                                  {formatPrice(vehicle.base_price_per_km)}/km
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600">
                                {format(new Date(vehicle.created_date), "dd/MM/yyyy", { locale: ptBR })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(vehicle, 'vehicle')}
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenApprovalDialog(vehicle, 'vehicle', 'approve')}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  title="Aprovar"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenApprovalDialog(vehicle, 'vehicle', 'reject')}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Rejeitar"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aprovados */}
          <TabsContent value="approved" className="space-y-6">
            {/* Convites Aprovados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Convites Aprovados ({approvedInvitations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {approvedInvitations.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">Nenhum convite aprovado</div>
                ) : (
                  <div className="rounded-lg border bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-green-50/50">
                          <TableHead className="font-semibold">Solicitante</TableHead>
                          <TableHead className="font-semibold">Funcionário</TableHead>
                          <TableHead className="font-semibold">Função</TableHead>
                          <TableHead className="font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedInvitations.map((inv) => {
                          const requesterInfo = getRequesterInfo(inv);
                          return (
                            <TableRow key={inv.id} className="hover:bg-gray-50">
                              <TableCell>{requesterInfo.name}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{inv.full_name}</div>
                                  <div className="text-xs text-gray-500">{inv.email}</div>
                                </div>
                              </TableCell>
                              <TableCell>{getRoleLabel(inv)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => { setSelectedInvitation(inv); setShowInvitationDetails(true); }}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => sendInviteMutation.mutate(inv.id)} title="Reenviar">
                                    <Send className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Motoristas Aprovados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Motoristas Aprovados ({approvedDrivers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {approvedDrivers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Nenhum motorista aprovado
                  </div>
                ) : (
                  <div className="rounded-lg border bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-green-50/50">
                          <TableHead className="font-semibold">Motorista</TableHead>
                          <TableHead className="font-semibold">Fornecedor</TableHead>
                          <TableHead className="font-semibold">Contato</TableHead>
                          <TableHead className="font-semibold">Veículo</TableHead>
                          <TableHead className="font-semibold">Aprovado em</TableHead>
                          <TableHead className="font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedDrivers.map((driver) => (
                          <TableRow key={driver.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="font-medium text-gray-900">{driver.name}</div>
                              {driver.license_number && (
                                <div className="text-sm text-gray-500">CNH: {driver.license_number}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{getSupplierName(driver.supplier_id)}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm space-y-1">
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-gray-400" />
                                  {driver.phone_number}
                                </div>
                                {driver.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-gray-400" />
                                    {driver.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">{driver.vehicle_model}</div>
                                <div className="text-gray-500">{driver.vehicle_plate}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600">
                                {driver.approved_at ? format(new Date(driver.approved_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(driver, 'driver')}
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEmailDialog(driver)}
                                  title="Gerenciar Email de Acesso"
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => generateAndCopyLink(driver.id)}
                                  title="Copiar link de aceite dos termos"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <LinkIcon className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Veículos Aprovados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Veículos Aprovados ({approvedVehicles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {approvedVehicles.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Nenhum veículo aprovado
                  </div>
                ) : (
                  <div className="rounded-lg border bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-green-50/50">
                          <TableHead className="font-semibold">Veículo</TableHead>
                          <TableHead className="font-semibold">Fornecedor</TableHead>
                          <TableHead className="font-semibold">Capacidade</TableHead>
                          <TableHead className="font-semibold">Preço/km</TableHead>
                          <TableHead className="font-semibold">Aprovado em</TableHead>
                          <TableHead className="font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedVehicles.map((vehicle) => (
                          <TableRow key={vehicle.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="font-medium text-gray-900">{vehicle.name}</div>
                              {vehicle.description && (
                                <div className="text-sm text-gray-500 max-w-xs truncate">
                                  {vehicle.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{getSupplierName(vehicle.supplier_id)}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4 text-gray-400" />
                                  <span>{vehicle.max_passengers}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Briefcase className="w-4 h-4 text-gray-400" />
                                  <span>{vehicle.max_luggage}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <span className="font-semibold text-green-600">
                                  {formatPrice(vehicle.base_price_per_km)}/km
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600">
                                {vehicle.approved_at ? format(new Date(vehicle.approved_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(vehicle, 'vehicle')}
                                title="Ver detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rejeitados */}
          <TabsContent value="rejected" className="space-y-6">
            {/* Convites Rejeitados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Convites Rejeitados ({rejectedInvitations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rejectedInvitations.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">Nenhum convite rejeitado</div>
                ) : (
                  <div className="rounded-lg border bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-red-50/50">
                          <TableHead className="font-semibold">Solicitante</TableHead>
                          <TableHead className="font-semibold">Funcionário</TableHead>
                          <TableHead className="font-semibold">Função</TableHead>
                          <TableHead className="font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rejectedInvitations.map((inv) => {
                          const requesterInfo = getRequesterInfo(inv);
                          return (
                            <TableRow key={inv.id} className="hover:bg-gray-50">
                              <TableCell>{requesterInfo.name}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{inv.full_name}</div>
                                  <div className="text-xs text-gray-500">{inv.email}</div>
                                </div>
                              </TableCell>
                              <TableCell>{getRoleLabel(inv)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedInvitation(inv); setShowInvitationDetails(true); }}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Motoristas Rejeitados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Motoristas Rejeitados ({rejectedDrivers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rejectedDrivers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Nenhum motorista rejeitado
                  </div>
                ) : (
                  <div className="rounded-lg border bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-red-50/50">
                          <TableHead className="font-semibold">Motorista</TableHead>
                          <TableHead className="font-semibold">Fornecedor</TableHead>
                          <TableHead className="font-semibold">Contato</TableHead>
                          <TableHead className="font-semibold">Veículo</TableHead>
                          <TableHead className="font-semibold">Rejeitado em</TableHead>
                          <TableHead className="font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rejectedDrivers.map((driver) => (
                          <TableRow key={driver.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="font-medium text-gray-900">{driver.name}</div>
                              {driver.license_number && (
                                <div className="text-sm text-gray-500">CNH: {driver.license_number}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{getSupplierName(driver.supplier_id)}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm space-y-1">
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-gray-400" />
                                  {driver.phone_number}
                                </div>
                                {driver.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-gray-400" />
                                    {driver.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">{driver.vehicle_model}</div>
                                <div className="text-gray-500">{driver.vehicle_plate}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600">
                                {driver.approved_at ? format(new Date(driver.approved_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(driver, 'driver')}
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEmailDialog(driver)}
                                  title="Gerenciar Email de Acesso"
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => generateAndCopyLink(driver.id)}
                                  title="Copiar link de aceite dos termos"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <LinkIcon className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Veículos Rejeitados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Veículos Rejeitados ({rejectedVehicles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rejectedVehicles.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Nenhum veículo rejeitado
                  </div>
                ) : (
                  <div className="rounded-lg border bg-white overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-red-50/50">
                          <TableHead className="font-semibold">Veículo</TableHead>
                          <TableHead className="font-semibold">Fornecedor</TableHead>
                          <TableHead className="font-semibold">Capacidade</TableHead>
                          <TableHead className="font-semibold">Preço/km</TableHead>
                          <TableHead className="font-semibold">Rejeitado em</TableHead>
                          <TableHead className="font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rejectedVehicles.map((vehicle) => (
                          <TableRow key={vehicle.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="font-medium text-gray-900">{vehicle.name}</div>
                              {vehicle.description && (
                                <div className="text-sm text-gray-500 max-w-xs truncate">
                                  {vehicle.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{getSupplierName(vehicle.supplier_id)}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4 text-gray-400" />
                                  <span>{vehicle.max_passengers}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Briefcase className="w-4 h-4 text-gray-400" />
                                  <span>{vehicle.max_luggage}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <span className="font-semibold text-green-600">
                                  {formatPrice(vehicle.base_price_per_km)}/km
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600">
                                {vehicle.approved_at ? format(new Date(vehicle.approved_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(vehicle, 'vehicle')}
                                title="Ver detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de Detalhes */}
        {selectedItem && (
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {itemType === 'driver' ? 'Detalhes do Motorista' : 'Detalhes do Veículo'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {itemType === 'driver' ? (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Informações Pessoais</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Nome:</strong> {selectedItem.name}</div>
                        <div><strong>Telefone:</strong> {selectedItem.phone_number}</div>
                        {selectedItem.email && <div><strong>Email:</strong> {selectedItem.email}</div>}
                        {selectedItem.document_id && <div><strong>CPF/CNH:</strong> {selectedItem.document_id}</div>}
                        {selectedItem.license_number && <div><strong>CNH:</strong> {selectedItem.license_number}</div>}
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Veículo</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Modelo:</strong> {selectedItem.vehicle_model}</div>
                        <div><strong>Placa:</strong> {selectedItem.vehicle_plate}</div>
                        {selectedItem.vehicle_color && <div><strong>Cor:</strong> {selectedItem.vehicle_color}</div>}
                        {selectedItem.vehicle_year && <div><strong>Ano:</strong> {selectedItem.vehicle_year}</div>}
                      </div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Idiomas</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.languages?.map(lang => (
                          <Badge key={lang} variant="outline">
                            {lang === 'pt' ? '🇧🇷 Português' : lang === 'en' ? '🇺🇸 English' : '🇪🇸 Español'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Informações Básicas</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Nome:</strong> {selectedItem.name}</div>
                        {selectedItem.description && <div><strong>Descrição:</strong> {selectedItem.description}</div>}
                        <div><strong>Passageiros:</strong> {selectedItem.max_passengers}</div>
                        <div><strong>Malas:</strong> {selectedItem.max_luggage}</div>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Tarifas</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Preço/km:</strong> {formatPrice(selectedItem.base_price_per_km)}</div>
                        {selectedItem.min_price_one_way && (
                          <div><strong>Mín. Só Ida:</strong> {formatPrice(selectedItem.min_price_one_way)}</div>
                        )}
                        {selectedItem.min_price_round_trip && (
                          <div><strong>Mín. Ida/Volta:</strong> {formatPrice(selectedItem.min_price_round_trip)}</div>
                        )}
                        {selectedItem.operational_radius_km > 0 && (
                          <div><strong>Raio de Atuação:</strong> {selectedItem.operational_radius_km} km</div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Fornecedor</h3>
                  <div className="text-sm">
                    {getSupplierName(selectedItem.supplier_id)}
                  </div>
                </div>

                <DriverApprovalHistory flow={getFlowDetails(selectedItem, itemType)} />
              </div>

              <DialogFooter>
                <Button onClick={() => setShowDetailsDialog(false)} variant="outline">
                  Fechar
                </Button>
                {selectedItem.approval_status === 'pending' && (
                  <>
                    <Button
                      onClick={() => {
                        setShowDetailsDialog(false);
                        handleOpenApprovalDialog(selectedItem, itemType, 'reject');
                      }}
                      variant="destructive"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                    <Button
                      onClick={() => {
                        setShowDetailsDialog(false);
                        handleOpenApprovalDialog(selectedItem, itemType, 'approve');
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog de Edição de Email */}
        {selectedItem && (
          <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Gerenciar Email do Motorista</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="font-medium">{selectedItem.name}</p>
                    <p className="text-sm text-gray-600">Ao salvar, o sistema atualizará o cadastro e enviará um convite para o usuário (caso ainda não exista).</p>
                </div>
                <div className="space-y-2">
                  <Label>Email de Login</Label>
                  <Input 
                    type="email" 
                    value={emailToUpdate} 
                    onChange={(e) => setEmailToUpdate(e.target.value)}
                    placeholder="exemplo@email.com"
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
                <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancelar</Button>
                <Button 
                    onClick={() => updateEmailMutation.mutate({ driverId: selectedItem.id, email: emailToUpdate })}
                    disabled={updateEmailMutation.isPending || !emailToUpdate}
                >
                    {updateEmailMutation.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        "Salvar e Convidar"
                    )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialogs de Convites */}
        {selectedInvitation && (
          <Dialog open={showInvitationDetails} onOpenChange={setShowInvitationDetails}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Detalhes do Convite</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold">Solicitante</h3>
                  <div className="flex items-center gap-2 mt-2">
                    {(() => {
                      const info = getRequesterInfo(selectedInvitation);
                      const Icon = info.icon;
                      return <><Icon className={`w-4 h-4 ${info.color}`} /> <span>{info.name} ({info.type})</span></>;
                    })()}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold">Funcionário</h3>
                  <div>Nome: {selectedInvitation.full_name}</div>
                  <div>Email: {selectedInvitation.email}</div>
                  <div>Telefone: {selectedInvitation.phone_number}</div>
                  <div>Função: {getRoleLabel(selectedInvitation)}</div>
                </div>
                {selectedInvitation.rejection_reason && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Motivo: {selectedInvitation.rejection_reason}</AlertDescription>
                  </Alert>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInvitationDetails(false)}>Fechar</Button>
                {selectedInvitation.status === 'pendente' && (
                  <>
                    <Button variant="destructive" onClick={() => { setShowInvitationDetails(false); setShowInvitationRejectDialog(true); }}>Rejeitar</Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setShowInvitationDetails(false); handleOpenApprovalDialog(selectedInvitation, 'invitation', 'approve'); }}>Aprovar</Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={showInvitationRejectDialog} onOpenChange={setShowInvitationRejectDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rejeitar Convite</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Label>Motivo</Label>
              <Textarea value={invitationRejectionReason} onChange={e => setInvitationRejectionReason(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInvitationRejectDialog(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => {
                if (!invitationRejectionReason.trim()) return alert('Informe o motivo');
                updateInvitationMutation.mutate({ id: selectedInvitation.id, data: { status: 'rejeitado', rejection_reason: invitationRejectionReason, reviewed_by: user.id, reviewed_at: new Date().toISOString() } });
              }}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Aprovação/Rejeição */}
        {selectedItem && (
          <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {approvalAction === 'approve' ? 'Aprovar' : 'Rejeitar'}{' '}
                  {(itemType === 'driver' || (itemType === 'invitation' && selectedItem?.desired_role === 'driver')) ? 'Motorista' : (itemType === 'invitation' ? 'Solicitação' : 'Veículo')}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">
                    {(itemType === 'driver' || (itemType === 'invitation' && selectedItem?.desired_role === 'driver')) ? 'Motorista:' : (itemType === 'invitation' ? 'Solicitante:' : 'Veículo:')}
                  </div>
                  <div className="font-bold text-lg">{selectedItem.name || selectedItem.full_name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Fornecedor: {getSupplierName(selectedItem.supplier_id)}
                  </div>
                </div>

                {approvalAction === 'reject' && (
                  <div className="space-y-2">
                    <Label htmlFor="admin_notes">Motivo da Rejeição *</Label>
                    <Textarea
                      id="admin_notes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Ex: Documentação incompleta, veículo não atende aos requisitos..."
                      className="h-24"
                    />
                  </div>
                )}

                {approvalAction === 'approve' && (
                  <div className="space-y-4">
                    {/* Exibe opções de fluxo apenas se for Driver ou Convite para Driver E ainda não estiver pré-aprovado */}
                    {((itemType === 'driver' || (itemType === 'invitation' && selectedItem?.desired_role === 'driver')) && selectedItem.pre_approval_status !== 'approved') && (
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 space-y-4">
                            <Label className="text-indigo-900 font-semibold block">Método de Aprovação</Label>
                            
                            <RadioGroup value={approvalMode} onValueChange={(val) => {
                                setApprovalMode(val);
                                if (val === 'direct') setSelectedClientForFlow('');
                            }}>
                                <div className="flex items-center space-x-2 bg-white p-3 rounded border cursor-pointer hover:border-indigo-300">
                                    <RadioGroupItem value="direct" id="mode-direct" />
                                    <Label htmlFor="mode-direct" className="cursor-pointer flex-1">
                                        <span className="font-medium text-gray-900 block">Aprovação Direta (Convencional)</span>
                                        <span className="text-xs text-gray-500">O convite será enviado imediatamente.</span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 bg-white p-3 rounded border cursor-pointer hover:border-indigo-300">
                                    <RadioGroupItem value="flow" id="mode-flow" />
                                    <Label htmlFor="mode-flow" className="cursor-pointer flex-1">
                                        <span className="font-medium text-gray-900 block">Iniciar Fluxo de Aprovadores</span>
                                        <span className="text-xs text-gray-500">Passa por aprovação do cliente antes do envio do convite.</span>
                                    </Label>
                                </div>
                            </RadioGroup>

                            {approvalMode === 'flow' && (
                                <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-xs font-semibold text-indigo-800 mb-1 block">Selecione o Cliente / Fluxo</Label>
                                    <select 
                                        className="w-full p-2 border rounded text-sm bg-white"
                                        value={selectedClientForFlow}
                                        onChange={(e) => setSelectedClientForFlow(e.target.value)}
                                    >
                                        <option value="">Selecione o cliente...</option>
                                        {clients.filter(c => c.driver_approval_configs?.length > 0).map(client => (
                                            <option key={client.id} value={client.id}>
                                                {client.name} (Fluxo Configurado)
                                            </option>
                                        ))}
                                    </select>
                                    {clients.filter(c => c.driver_approval_configs?.length > 0).length === 0 && (
                                        <p className="text-xs text-red-600 mt-1">
                                            Nenhum cliente possui fluxo de aprovação configurado.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {itemType === 'invitation' && selectedItem.pre_approval_status === 'approved' && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 text-green-800 font-semibold mb-1">
                                <CheckCircle className="w-5 h-5" />
                                Pré-Aprovação Corporativa Concluída
                            </div>
                            <p className="text-sm text-green-700">
                                Este convite já passou pelo fluxo de aprovação do cliente. Ao confirmar, o convite será enviado ao motorista.
                            </p>
                        </div>
                    )}
                  
                    <div className="space-y-2">
                      <Label htmlFor="admin_notes">Observações (opcional)</Label>
                      <Textarea
                        id="admin_notes"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Observações sobre a aprovação..."
                        className="h-20"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Alert className={approvalAction === 'approve' ? 'bg-green-50 border-green-200' : ''}>
                  <AlertCircle className={`h-4 w-4 ${approvalAction === 'approve' ? 'text-green-600' : ''}`} />
                  <AlertDescription className={approvalAction === 'approve' ? 'text-green-800' : ''}>
                    {approvalAction === 'approve'
                      ? (approvalMode === 'flow' 
                          ? 'O motorista somente será liberado após avaliação do fluxo.' 
                          : `Ao aprovar, este ${(itemType === 'driver' || (itemType === 'invitation' && selectedItem?.desired_role === 'driver')) ? 'motorista' : 'veículo'} ficará ativo e disponível para viagens.`)
                      : `Ao rejeitar, o fornecedor será notificado do motivo e poderá fazer correções.`
                    }
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button onClick={handleCloseDialogs} variant="outline">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitApproval}
                  disabled={
                    approveDriverMutation.isLoading ||
                    rejectDriverMutation.isLoading ||
                    approveVehicleMutation.isLoading ||
                    rejectVehicleMutation.isLoading
                  }
                  className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                  variant={approvalAction === 'reject' ? 'destructive' : 'default'}
                >
                  {(approveDriverMutation.isLoading ||
                    rejectDriverMutation.isLoading ||
                    approveVehicleMutation.isLoading ||
                    rejectVehicleMutation.isLoading) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : approvalAction === 'approve' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmar Aprovação
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
        )}
      </div>
    </div>
  );
}