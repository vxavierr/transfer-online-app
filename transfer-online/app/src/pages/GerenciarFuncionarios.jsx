import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Loader2,
  Users,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  UserPlus,
  User as UserIcon,
  Briefcase
} from 'lucide-react';
import GenericList from '@/components/ui/GenericList';
import GenericForm from '@/components/ui/GenericForm';
import GenericDeleteDialog from '@/components/ui/GenericDeleteDialog';
import InvitationManagerDialog from '@/components/admin/InvitationManagerDialog';

export default function GerenciarFuncionarios() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null); // Client or Supplier
  const [contextType, setContextType] = useState(null); // 'client' or 'supplier'
  
  const [showDialog, setShowDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showInvitationsManager, setShowInvitationsManager] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formState, setFormState] = useState({}); // To track form changes for conditional logic

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        let type = null;
        let orgData = null;

        // Verify Context
        if (currentUser.client_id && currentUser.client_role === 'admin') {
            type = 'client';
            const clients = await base44.entities.Client.list();
            orgData = clients.find(c => c.id === currentUser.client_id);
        } else if (currentUser.supplier_id && currentUser.role !== 'admin') {
            type = 'supplier';
            const suppliers = await base44.entities.Supplier.list();
            orgData = suppliers.find(s => s.id === currentUser.supplier_id);
        }

        if (!type || !orgData) {
          alert('Acesso restrito a administradores de clientes ou fornecedores.');
          window.location.href = '/';
          return;
        }

        setUser(currentUser);
        setContextType(type);
        setOrganization(orgData);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []); // Authentication check

  // Queries
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(null, 1000),
    enabled: !!contextType,
    initialData: []
  });

  const { data: frequentRequesters = [], isLoading: isLoadingFreqReq } = useQuery({
    queryKey: ['frequentRequesters', user?.client_id],
    queryFn: () => base44.entities.FrequentRequester.filter({ client_id: user?.client_id }),
    enabled: contextType === 'client' && !!user?.client_id,
    initialData: []
  });

  const { data: frequentPassengers = [], isLoading: isLoadingFreqPass } = useQuery({
    queryKey: ['frequentPassengers', user?.client_id],
    queryFn: () => base44.entities.FrequentPassenger.filter({ client_id: user?.client_id }),
    enabled: contextType === 'client' && !!user?.client_id,
    initialData: []
  });

  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['invitations', organization?.id, contextType],
    queryFn: () => {
        if (contextType === 'client') {
            return base44.entities.EmployeeInvitation.filter({ client_id: organization.id, status: 'pendente' });
        } else {
            return base44.entities.EmployeeInvitation.filter({ supplier_id: organization.id, status: 'pendente' });
        }
    },
    enabled: !!organization?.id,
    initialData: []
  });

  // Data Processing
  let employees = [];

  if (contextType === 'client') {
      const systemEmployees = allUsers.filter(u => 
        u.client_id === user?.client_id && 
        u.id !== user?.id && 
        u.client_corporate_role
      ).map(u => ({ ...u, type: 'system_user', role: u.client_corporate_role }));

      const unlinkedRequesters = frequentRequesters
        .filter(fr => !fr.linked_to_user)
        .map(fr => ({ ...fr, type: 'frequent_requester', role: 'requester', active: true }));

      const unlinkedPassengers = frequentPassengers
        .filter(fp => !fp.linked_to_user)
        .map(fp => ({ ...fp, type: 'frequent_passenger', role: 'passenger', active: true }));

      employees = [...systemEmployees, ...unlinkedRequesters, ...unlinkedPassengers];
  } else if (contextType === 'supplier') {
      employees = allUsers.filter(u => 
        u.supplier_id === user?.supplier_id && 
        u.id !== user?.id && 
        u.supplier_employee_role
      ).map(u => ({ ...u, type: 'system_user', role: u.supplier_employee_role }));
  }

  // Approvers list (Client only)
  const approversList = contextType === 'client' ? [
    ...allUsers.filter(u => 
      u.client_id === user?.client_id && 
      (u.client_corporate_role === 'admin_client' || u.client_corporate_role === 'requester' || u.client_corporate_role === 'approver')
    ),
    ...frequentRequesters.filter(fr => !fr.linked_to_user)
  ].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')) : [];

  const activeEmployees = employees.filter(e => e.active !== false);
  const inactiveEmployees = employees.filter(e => e.active === false);

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setSuccess('Funcionário atualizado com sucesso!');
      handleCloseDialog();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => setError(error.message || 'Erro ao atualizar funcionário')
  });

  const updateFrequentContactMutation = useMutation({
    mutationFn: ({ id, type, data }) => {
      if (type === 'frequent_requester') return base44.entities.FrequentRequester.update(id, data);
      if (type === 'frequent_passenger') return base44.entities.FrequentPassenger.update(id, data);
      throw new Error('Tipo inválido');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frequentRequesters'] });
      queryClient.invalidateQueries({ queryKey: ['frequentPassengers'] });
      setSuccess('Contato atualizado com sucesso!');
      handleCloseDialog();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => setError(error.message || 'Erro ao atualizar contato')
  });

  const createInvitationMutation = useMutation({
    mutationFn: (invitationData) => base44.entities.EmployeeInvitation.create(invitationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setSuccess('Solicitação de convite enviada!');
      setShowInviteDialog(false);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => setError(error.message || 'Erro ao enviar solicitação')
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }) => {
        if (type === 'system_user') {
            const updateData = { active: false };
            if (contextType === 'client') {
                updateData.client_id = null;
                updateData.client_corporate_role = null;
            } else {
                updateData.supplier_id = null;
                updateData.supplier_employee_role = null;
            }
            return base44.entities.User.update(id, updateData);
        } else if (type === 'frequent_requester') {
            return base44.entities.FrequentRequester.delete(id);
        } else if (type === 'frequent_passenger') {
            return base44.entities.FrequentPassenger.delete(id);
        }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      if (contextType === 'client') {
          queryClient.invalidateQueries({ queryKey: ['frequentRequesters'] });
          queryClient.invalidateQueries({ queryKey: ['frequentPassengers'] });
      }
      setSuccess('Removido com sucesso!');
      setShowDeleteDialog(false);
      setEmployeeToDelete(null);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => setError(error.message || 'Erro ao remover')
  });

  // Handlers
  const handleOpenEditDialog = (employee) => {
    setEditingEmployee(employee);
    setFormState({
      role: employee.role,
      // Initialize other needed state
    });
    setShowDialog(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingEmployee(null);
    setFormState({});
    setError('');
  };

  const handleDeleteClick = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (employeeToDelete) {
        deleteMutation.mutate({ id: employeeToDelete.id, type: employeeToDelete.type });
    }
  };

  // Form Submit Handler
  const handleFormSubmit = async (formData) => {
    if (editingEmployee) {
        if (editingEmployee.type === 'system_user') {
            const updateData = {
                full_name: formData.full_name,
                phone_number: formData.phone_number,
                active: formData.active,
                work_location: formData.work_location
            };

            if (contextType === 'client') {
                updateData.client_corporate_role = formData.role;
                
                // Approver Logic
                if (formData.role !== editingEmployee.role && !formData.approverId) {
                    setError('Informe quem aprovou a alteração de função.');
                    return;
                }
                if (formData.role !== editingEmployee.role) {
                    const approver = approversList.find(a => a.id === formData.approverId);
                    if (approver) {
                        updateData.role_change_approved_by_id = approver.id;
                        updateData.role_change_approved_by_name = approver.full_name;
                        updateData.role_change_approved_date = new Date().toISOString();
                    }
                }
            } else {
                updateData.supplier_employee_role = formData.role;
            }

            updateUserMutation.mutate({ id: editingEmployee.id, data: updateData });

        } else {
            // Frequent Contact
            const updateData = {
                full_name: formData.full_name,
                email: formData.email,
                phone_number: formData.phone_number,
                work_location: formData.work_location,
                client_corporate_role: formData.role
            };
            
            if (formData.role !== editingEmployee.role && !formData.approverId) {
                setError('Informe quem aprovou a alteração de função.');
                return;
            }
            if (formData.role !== editingEmployee.role) {
                const approver = approversList.find(a => a.id === formData.approverId);
                if (approver) {
                    updateData.role_change_approved_by_id = approver.id;
                    updateData.role_change_approved_by_name = approver.full_name;
                    updateData.role_change_approved_date = new Date().toISOString();
                }
            }

            updateFrequentContactMutation.mutate({ id: editingEmployee.id, type: editingEmployee.type, data: updateData });
        }
    }
  };

  const handleInviteSubmit = (formData) => {
      const payload = {
          requester_type: contextType,
          requested_by_user_id: user.id,
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone_number,
          desired_role: formData.desired_role,
          notes: formData.notes,
          status: 'pendente'
      };

      if (contextType === 'client') {
          payload.client_id = organization.id;
          payload.role_type = 'client_corporate_role';
      } else {
          payload.supplier_id = organization.id;
          payload.role_type = 'supplier_employee_role';
      }

      createInvitationMutation.mutate(payload);
  };

  // Helpers
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

  const getRoleBadgeColor = (role) => {
    const colors = {
        admin_client: 'bg-purple-100 text-purple-800 border-purple-300',
        requester: 'bg-blue-100 text-blue-800 border-blue-300',
        passenger: 'bg-green-100 text-green-800 border-green-300',
        approver: 'bg-orange-100 text-orange-800 border-orange-300',
        manager: 'bg-purple-100 text-purple-800 border-purple-300',
        dispatcher: 'bg-blue-100 text-blue-800 border-blue-300',
        driver: 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  // Form Configurations
  const editFormFields = [
    { name: 'full_name', label: 'Nome Completo', required: true },
    { name: 'email', label: 'Email', type: 'email', disabled: editingEmployee?.type === 'system_user', description: editingEmployee?.type === 'system_user' ? 'Email gerenciado pelo sistema' : '' },
    { name: 'phone_number', label: 'Telefone', required: true, placeholder: '+55...' },
    { name: 'work_location', label: 'Local de Trabalho', placeholder: 'Ex: Matriz, Filial SP...' },
    { 
      name: 'role', 
      label: 'Função', 
      type: 'select', 
      required: true,
      options: contextType === 'client' ? [
        ...(editingEmployee?.type === 'system_user' ? [{ value: 'admin_client', label: 'Administrador' }, { value: 'approver', label: 'Aprovador' }] : []),
        { value: 'requester', label: 'Solicitante' },
        { value: 'passenger', label: 'Passageiro' }
      ] : [
        { value: 'manager', label: 'Gerente' },
        { value: 'dispatcher', label: 'Despachante' },
        { value: 'driver', label: 'Motorista' }
      ]
    },
    // Conditional Field for Approver
    {
      name: 'approverId',
      label: 'Aprovado Por',
      type: 'select',
      required: true,
      visible: contextType === 'client' && editingEmployee && formState.role !== editingEmployee.role, // Logic handled by GenericForm updates? No, formState updated via onChange
      options: approversList.map(a => ({ value: a.id, label: a.full_name })),
      description: 'Necessário aprovação para mudança de cargo'
    },
    { name: 'active', label: 'Status', type: 'switch', activeLabel: 'Ativo', inactiveLabel: 'Inativo' }
  ];

  const inviteFormFields = [
    { name: 'full_name', label: 'Nome Completo', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone_number', label: 'Telefone', required: true, placeholder: '+55...' },
    { 
      name: 'desired_role', 
      label: 'Função Sugerida', 
      type: 'select', 
      required: true,
      options: contextType === 'client' ? [
        { value: 'admin_client', label: 'Administrador' },
        { value: 'requester', label: 'Solicitante' },
        { value: 'passenger', label: 'Passageiro' },
        { value: 'approver', label: 'Aprovador' }
      ] : [
        { value: 'manager', label: 'Gerente' },
        { value: 'dispatcher', label: 'Despachante' },
        { value: 'driver', label: 'Motorista' }
      ]
    },
    { name: 'notes', label: 'Observações', type: 'textarea' }
  ];

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  const columns = [
    {
        header: 'Funcionário',
        accessor: 'full_name',
        render: (item) => (
            <div>
                <div className="font-medium text-gray-900 flex items-center gap-2">
                    {item.type !== 'system_user' ? (
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center" title="Contato Frequente (Não Cadastrado)">
                            <Users className="w-4 h-4 text-amber-600" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-blue-600" />
                        </div>
                    )}
                    <div>
                        {item.full_name}
                        {item.type !== 'system_user' && (
                            <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full border border-amber-200">
                                Contato
                            </span>
                        )}
                    </div>
                </div>
                {item.type === 'system_user' && (
                    <div className="text-xs text-gray-500 mt-1 ml-10">ID: {item.id.substring(0, 8)}...</div>
                )}
            </div>
        )
    },
    {
        header: 'Contato',
        accessor: 'email',
        render: (item) => (
            <div className="text-sm space-y-1">
                <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-gray-400" />
                    {item.email || <span className="text-gray-400 italic">Sem email</span>}
                </div>
                {item.phone_number && (
                    <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {item.phone_number}
                    </div>
                )}
            </div>
        )
    },
    {
        header: 'Função',
        accessor: 'role',
        render: (item) => (
            <Badge className={`${getRoleBadgeColor(item.role)} border`}>
                {getRoleLabel(item.role)}
            </Badge>
        )
    },
    {
        header: 'Status',
        accessor: 'active',
        render: (item) => (
            <StatusBadge status={item.active !== false} type="user_status" />
        )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Gerenciar Funcionários
          </h1>
          <p className="text-gray-600">
            {organization?.name} - {contextType === 'client' ? 'Equipe Corporativa' : 'Equipe do Fornecedor'}
          </p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && !showDialog && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-blue-600 text-white">
                <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{employees.length}</div>
                    <div className="text-sm opacity-90">Total de Funcionários</div>
                </CardContent>
            </Card>
            <Card className="bg-green-600 text-white">
                <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{activeEmployees.length}</div>
                    <div className="text-sm opacity-90">Ativos</div>
                </CardContent>
            </Card>
            <Card className="bg-red-600 text-white">
                <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{inactiveEmployees.length}</div>
                    <div className="text-sm opacity-90">Inativos</div>
                </CardContent>
            </Card>
        </div>

        {pendingInvitations.length > 0 && (
          <Alert className="bg-yellow-50 border-yellow-300 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                <strong>{pendingInvitations.length}</strong> convite(s) pendente(s) aguardando aprovação.
                </AlertDescription>
            </div>
            <Button 
                size="sm" 
                variant="outline" 
                className="bg-white border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                onClick={() => setShowInvitationsManager(true)}
            >
                Revisar Solicitações
            </Button>
          </Alert>
        )}

        <GenericList
          title="Funcionários"
          subtitle="Gerencie o acesso e funções da equipe"
          data={employees}
          columns={columns}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAdd={() => setShowInviteDialog(true)}
          addButtonLabel="Solicitar Convite"
          onEdit={handleOpenEditDialog}
          onDelete={handleDeleteClick}
        />

        {/* Edit Dialog using GenericForm */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
                </DialogHeader>
                <GenericForm
                  fields={editFormFields}
                  initialData={{
                    ...editingEmployee,
                    role: editingEmployee?.role || '',
                    active: editingEmployee?.active !== false
                  }}
                  onSubmit={handleFormSubmit}
                  onCancel={handleCloseDialog}
                  onChange={(newData) => setFormState(newData)}
                  isSubmitting={updateUserMutation.isPending || updateFrequentContactMutation.isPending}
                />
            </DialogContent>
        </Dialog>

        {/* Invite Dialog using GenericForm */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Solicitar Convite</DialogTitle>
                </DialogHeader>
                <GenericForm
                  fields={inviteFormFields}
                  initialData={{
                    desired_role: contextType === 'client' ? 'requester' : 'dispatcher'
                  }}
                  onSubmit={handleInviteSubmit}
                  onCancel={() => setShowInviteDialog(false)}
                  isSubmitting={createInvitationMutation.isPending}
                  submitLabel="Enviar Convite"
                />
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation using GenericDeleteDialog */}
        <GenericDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={confirmDelete}
          title="Remover Funcionário"
          description={`Tem certeza que deseja remover ${employeeToDelete?.full_name}? ${employeeToDelete?.type === 'system_user' ? 'O usuário perderá o acesso à organização.' : 'O contato será excluído permanentemente.'}`}
          isDeleting={deleteMutation.isPending}
        />

        {/* Invitations Manager Dialog */}
        <InvitationManagerDialog
            open={showInvitationsManager}
            onOpenChange={setShowInvitationsManager}
            invitations={pendingInvitations}
        />
      </div>
    </div>
  );
}