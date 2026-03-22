import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
} from "@/components/ui/table";
import GenericTable from '@/components/ui/GenericTable';
import StatusBadge from '@/components/ui/StatusBadge';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle,
  Send,
  MessageCircle,
  Copy,
  AlertTriangle,
  Briefcase,
  FileText,
  Star
} from 'lucide-react';
import { parseISO, isBefore, differenceInDays } from 'date-fns';
import DriverFormDialog from '@/components/supplier/DriverFormDialog';

export default function MeusMotoristas() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState(null);

  const [inviteFormData, setInviteFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    notes: ''
  });

  const [inviteFiles, setInviteFiles] = useState({
    cnh: null,
    aso: null,
    pgr: null,
    photo: null
  });
  const [isUploadingInvite, setIsUploadingInvite] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        const isAdmin = currentUser.role === 'admin';
        const isSupplier = currentUser.supplier_id && !isAdmin;
        
        if (!isSupplier) {
          alert('Acesso restrito a fornecedores.');
          window.location.href = '/';
          return;
        }

        setUser(currentUser);

        const suppliers = await base44.entities.Supplier.list();
        const supplierData = suppliers.find(p => p.id === currentUser.supplier_id);
        
        if (!supplierData) {
          alert('Dados do fornecedor não encontrados.');
          window.location.href = '/';
          return;
        }

        setSupplier(supplierData);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = '/AccessPortal?returnUrl=%2FMeusMotoristas';
      }
    };

    checkAuth();
  }, []);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['supplierDrivers', user?.supplier_id],
    queryFn: () => base44.entities.Driver.filter({ supplier_id: user.supplier_id }),
    enabled: !!user?.supplier_id,
    initialData: []
  });

  const { data: allDriverVehicles = [] } = useQuery({
    queryKey: ['allDriverVehicles', drivers],
    queryFn: async () => {
      if (drivers.length === 0) return [];
      const driverIds = drivers.map(d => d.id);
      const allVehicles = await Promise.all(
        driverIds.map(driverId =>
          base44.entities.DriverVehicle.filter({ driver_id: driverId })
        )
      );
      return allVehicles.flat();
    },
    enabled: drivers.length > 0,
    initialData: []
  });

  const { data: allInvitations = [] } = useQuery({
    queryKey: ['driverInvitations', supplier?.id],
    queryFn: () => base44.entities.EmployeeInvitation.filter({ 
      supplier_id: supplier.id,
      role_type: 'supplier_employee_role',
      desired_role: 'driver'
    }),
    enabled: !!supplier?.id,
    initialData: []
  });

  const pendingInvitations = allInvitations.filter(i => i.status === 'pendente');
  const approvedInvitations = allInvitations.filter(i => ['aprovado', 'convite_enviado'].includes(i.status));

  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId) => {
      await base44.functions.invoke('resendEmployeeInvitation', { 
        invitationId,
        origin: window.location.origin 
      });
    },
    onSuccess: (response) => {
      const data = response?.data || {};
      if (data.whatsappSent) {
          setSuccess('Convite reenviado via WhatsApp!');
      } else if (data.emailSent) {
          setSuccess('Convite reenviado via E-mail!');
      } else {
          setSuccess('Convite reenviado com sucesso!');
      }
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      const link = error.response?.data?.inviteLink;
      if (link) {
          setError(`Falha no envio. Copie o link: ${link}`);
      } else {
          setError(error.message || 'Erro ao reenviar convite');
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Driver.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierDrivers'] });
      queryClient.invalidateQueries({ queryKey: ['allDriverVehicles'] });
      setSuccess('Motorista removido com sucesso!');
      setShowDeleteDialog(false);
      setDriverToDelete(null);
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao remover motorista');
      setShowDeleteDialog(false);
      setDriverToDelete(null);
    }
  });

  const createInvitationMutation = useMutation({
    mutationFn: (invitationData) => base44.entities.EmployeeInvitation.create(invitationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverInvitations'] });
      setSuccess('Solicitação de convite enviada ao administrador! Assim que aprovado, você poderá complementar os dados do motorista.');
      setShowInviteDialog(false);
      setInviteFormData({
        full_name: '',
        email: '',
        phone_number: '',
        notes: ''
      });
      setInviteFiles({ cnh: null, aso: null, pgr: null, photo: null });
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      setFormError(error.message || 'Erro ao enviar solicitação');
    }
  });

  const handleOpenDialog = async (driver = null) => {
    setFormError('');
    setSuccess('');
    setError('');
    setEditingDriver(driver);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingDriver(null);
  };

  const handleDeleteClick = (driver) => {
    setDriverToDelete(driver);
    setShowDeleteDialog(true);
  };

  const confirmDeleteDriver = () => {
    if (driverToDelete) {
      deleteMutation.mutate(driverToDelete.id);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return null;
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      return response.file_url;
    } catch (error) {
      throw new Error("Falha no upload: " + error.message);
    }
  };

  const handleInviteSubmit = async () => {
    setFormError('');
    
    if (!inviteFormData.full_name || !inviteFormData.email || !inviteFormData.phone_number) {
      setFormError('Preencha todos os campos obrigatórios');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteFormData.email)) {
      setFormError('E-mail inválido');
      return;
    }

    setIsUploadingInvite(true);
    let license_document_url = '';
    let aso_document_url = '';
    let pgr_document_url = '';
    let photo_url = '';
    let cnh_extracted_data = null;

    try {
      if (inviteFiles.cnh) {
        license_document_url = await handleFileUpload(inviteFiles.cnh);
        try {
            const extractionRes = await base44.functions.invoke('extractCNHData', { file_url: license_document_url });
            if (extractionRes?.data?.success && extractionRes.data.data) {
                cnh_extracted_data = extractionRes.data.data;
            }
        } catch (e) { console.warn('CNH OCR failed on invite', e); }
      }
      if (inviteFiles.aso) {
        aso_document_url = await handleFileUpload(inviteFiles.aso);
      }
      if (inviteFiles.pgr) {
        pgr_document_url = await handleFileUpload(inviteFiles.pgr);
      }
      if (inviteFiles.photo) {
        photo_url = await handleFileUpload(inviteFiles.photo);
      }
    } catch (error) {
      console.error("Upload error", error);
      setFormError('Erro ao fazer upload dos documentos. Tente novamente.');
      setIsUploadingInvite(false);
      return;
    }

    createInvitationMutation.mutate({
      requester_type: 'supplier',
      supplier_id: supplier.id,
      requested_by_user_id: user.id,
      full_name: inviteFormData.full_name,
      email: inviteFormData.email,
      phone_number: inviteFormData.phone_number,
      role_type: 'supplier_employee_role',
      desired_role: 'driver',
      notes: inviteFormData.notes,
      status: 'pendente',
      license_document_url,
      aso_document_url,
      pgr_document_url,
      photo_url,
      cnh_extracted_data
    }, {
        onSettled: () => setIsUploadingInvite(false)
    });
  };

  const columns = [
    {
      header: 'Motorista',
      accessor: 'name',
      render: (driver) => (
        <div>
          <div className="font-medium text-gray-900">{driver.name}</div>
          {driver.license_number && (
            <div className="text-sm text-gray-500">CNH: {driver.license_number}</div>
          )}
          <div className="flex gap-2 mt-1">
            {driver.points_on_license > 0 && (
              <Badge variant="outline" className={`text-xs ${driver.points_on_license >= 20 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700'}`}>
                {driver.points_on_license} pts
              </Badge>
            )}
            {driver.cnh_status && driver.cnh_status !== 'active' && (
              <Badge variant="destructive" className="text-xs">
                {driver.cnh_status === 'suspended' ? 'Suspensa' : 
                 driver.cnh_status === 'revoked' ? 'Cassada' : 'Pend. Renovação'}
              </Badge>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Contato',
      accessor: 'phone_number',
      render: (driver) => (
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
      )
    },
    {
      header: 'Veículos',
      render: (driver) => {
        const vehicles = allDriverVehicles.filter(v => v.driver_id === driver.id);
        return vehicles.length > 0 ? (
          <div className="space-y-1">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="text-sm flex items-center gap-2">
                {vehicle.is_default && (
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                )}
                <div>
                  <div className="font-medium">{vehicle.vehicle_model}</div>
                  <div className="text-gray-500">{vehicle.vehicle_plate}</div>
                </div>
              </div>
            ))}
            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-300 text-blue-700">
              {vehicles.length} {vehicles.length === 1 ? 'veículo' : 'veículos'}
            </Badge>
          </div>
        ) : (
          <Badge variant="outline" className="text-xs bg-amber-50 border-amber-300 text-amber-700">
            Sem veículo
          </Badge>
        );
      }
    },
    {
      header: 'Idiomas',
      render: (driver) => (
        <div className="flex flex-wrap gap-1">
          {driver.languages.map(lang => (
            <Badge key={lang} variant="outline" className="text-xs">
              {lang === 'pt' ? '🇧🇷 PT' : lang === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}
            </Badge>
          ))}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'active',
      render: (driver) => {
        let corporateStatusBadge = null;
        if (driver.requires_corporate_approval) {
           const corpStatusMap = {
             'pending_admin_review': { label: 'Análise Admin', color: 'bg-yellow-100 text-yellow-800' },
             'pending_approver_review': { label: 'Aprovação Cliente', color: 'bg-purple-100 text-purple-800' },
             'approved': { label: 'Aprovado Corp.', color: 'bg-green-100 text-green-800' },
             'rejected': { label: 'Rejeitado Corp.', color: 'bg-red-100 text-red-800' }
           };
           const status = corpStatusMap[driver.corporate_approval_status] || { label: 'Fluxo Corp.', color: 'bg-gray-100' };
           corporateStatusBadge = (
             <Badge className={`text-xs mb-1 ${status.color}`}>
               <Briefcase className="w-3 h-3 mr-1" />
               {status.label}
             </Badge>
           );
        }

        let expiryAlert = null;
        if (driver.license_expiry && driver.active) {
          const today = new Date();
          const expiryDate = parseISO(driver.license_expiry);
          const daysToExpiry = differenceInDays(expiryDate, today);
          
          if (isBefore(expiryDate, today)) {
            expiryAlert = (
              <div className="flex items-center text-red-600 text-xs font-bold mt-1 animate-pulse">
                <AlertCircle className="w-3 h-3 mr-1" />
                CNH Vencida
              </div>
            );
          } else if (daysToExpiry <= 30) {
            expiryAlert = (
              <div className="flex items-center text-amber-600 text-xs font-bold mt-1">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Vence em {daysToExpiry} dias
              </div>
            );
          }
        }

        return (
          <div className="flex flex-col items-start">
            {corporateStatusBadge}
            <StatusBadge status={driver.active} type="user_status" />
            {expiryAlert}
          </div>
        );
      }
    },
    {
      header: 'Ações',
      render: (driver) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDialog(driver)}
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(driver)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Meus Motoristas</h1>
            <p className="text-gray-600">{supplier?.name} - Gerencie sua equipe de motoristas</p>
          </div>
          <Button onClick={() => setShowInviteDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Motorista
          </Button>
        </div>

        {success && <Alert className="mb-6 bg-green-50 border-green-200"><CheckCircle className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-800">{success}</AlertDescription></Alert>}
        {error && !showDialog && <Alert variant="destructive" className="mb-6"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        {pendingInvitations.length > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2"><CardTitle className="text-yellow-900 text-lg flex items-center gap-2"><AlertCircle className="w-5 h-5" />Solicitações Aguardando Aprovação ({pendingInvitations.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm text-yellow-800 mb-4">As solicitações abaixo foram enviadas e estão aguardando análise e aprovação do administrador.</div>
              <div className="rounded-lg border border-yellow-200 bg-white overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-yellow-100/50"><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Status</TableHead><TableHead>Data Solicitação</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {pendingInvitations.map((invitation) => (
                      <TableRow key={invitation.id}><TableCell className="font-medium">{invitation.full_name}</TableCell><TableCell>{invitation.email}</TableCell><TableCell>{invitation.phone_number}</TableCell><TableCell><Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Aguardando Aprovação</Badge></TableCell><TableCell>{invitation.created_date ? new Date(invitation.created_date).toLocaleDateString('pt-BR') : '-'}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {approvedInvitations.length > 0 && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader className="pb-2"><CardTitle className="text-green-900 text-lg flex items-center gap-2"><CheckCircle className="w-5 h-5" />Solicitações Aprovadas / Em Andamento</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm text-green-800 mb-4">Os motoristas abaixo foram aprovados pelo administrador e devem aceitar o convite enviado por e-mail para aparecerem na lista principal.</div>
              <div className="rounded-lg border border-green-200 bg-white overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-green-100/50"><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Status</TableHead><TableHead>Data Aprovação</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {approvedInvitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.full_name}</TableCell>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell>{invitation.phone_number}</TableCell>
                        <TableCell><Badge className="bg-green-100 text-green-800 border-green-300">{invitation.status === 'aprovado' ? 'Aprovado pelo Admin' : invitation.status === 'convite_enviado' ? 'Convite Enviado' : invitation.status}</Badge></TableCell>
                        <TableCell>{invitation.reviewed_at ? new Date(invitation.reviewed_at).toLocaleDateString('pt-BR') : '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => { const inviteLink = `${window.location.origin}/AceitarConvite?id=${invitation.id}`; const waMessage = `Olá ${invitation.full_name}, segue o link para aceitar o convite e acessar o sistema: ${inviteLink}`; const phone = invitation.phone_number.replace(/\D/g, ''); const waUrl = `https://wa.me/${phone.startsWith('55') || phone.length < 10 ? phone : '55' + phone}?text=${encodeURIComponent(waMessage)}`; window.open(waUrl, '_blank'); }} className="text-green-600 border-green-200 hover:bg-green-50" title="Enviar via WhatsApp"><MessageCircle className="w-4 h-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => { const inviteLink = `${window.location.origin}/AceitarConvite?id=${invitation.id}`; navigator.clipboard.writeText(inviteLink); setSuccess('Link copiado!'); setTimeout(() => setSuccess(''), 3000); }} title="Copiar Link"><Copy className="w-4 h-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => resendInvitationMutation.mutate(invitation.id)} disabled={resendInvitationMutation.isPending} title="Reenviar por Email">{resendInvitationMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Motoristas Ativos</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="text-center py-12"><Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" /><p className="text-gray-600">Carregando motoristas...</p></div> : drivers.length === 0 ? <div className="text-center py-12 text-gray-500"><Users className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-lg font-medium mb-2">Nenhum motorista cadastrado</p><p className="text-sm">Comece cadastrando seu primeiro motorista</p><Button onClick={() => handleOpenDialog()} className="mt-6 bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Cadastrar Primeiro Motorista</Button></div> : <GenericTable columns={columns} data={drivers} emptyMessage="Nenhum motorista cadastrado" />}
          </CardContent>
        </Card>

        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle className="text-2xl flex items-center gap-2"><Plus className="w-6 h-6 text-blue-600" />Solicitar Acesso para Novo Motorista</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200"><AlertCircle className="h-4 w-4 text-blue-600" /><AlertDescription className="text-blue-800">Preencha os dados básicos do motorista. O administrador receberá sua solicitação e criará o acesso ao sistema.</AlertDescription></Alert>
              <div className="space-y-2"><Label htmlFor="invite_full_name">Nome Completo *</Label><Input id="invite_full_name" value={inviteFormData.full_name} onChange={(e) => setInviteFormData({ ...inviteFormData, full_name: e.target.value })} placeholder="Ex: Carlos Silva" /></div>
              <div className="space-y-2"><Label htmlFor="invite_email">E-mail *</Label><Input id="invite_email" type="email" value={inviteFormData.email} onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })} placeholder="carlos@exemplo.com" /><p className="text-xs text-gray-500">O motorista usará este e-mail para acessar o aplicativo</p></div>
              <div className="space-y-2"><Label htmlFor="invite_phone">Telefone *</Label><PhoneInputWithCountry id="invite_phone" value={inviteFormData.phone_number} onChange={(value) => setInviteFormData({ ...inviteFormData, phone_number: value })} placeholder="(11) 99999-9999" /></div>
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2"><FileText className="w-4 h-4" />Documentação (Opcional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="invite_photo">Foto do Motorista (Rosto)</Label><Input id="invite_photo" type="file" accept="image/*" onChange={(e) => setInviteFiles({ ...inviteFiles, photo: e.target.files[0] })} className="bg-white" /></div>
                    <div className="space-y-2"><Label htmlFor="invite_cnh">CNH (Foto ou PDF)</Label><Input id="invite_cnh" type="file" accept="image/*,.pdf" onChange={(e) => setInviteFiles({ ...inviteFiles, cnh: e.target.files[0] })} className="bg-white" /></div>
                    <div className="space-y-2"><Label htmlFor="invite_aso">ASO</Label><Input id="invite_aso" type="file" accept="image/*,.pdf" onChange={(e) => setInviteFiles({ ...inviteFiles, aso: e.target.files[0] })} className="bg-white" /></div>
                    <div className="space-y-2"><Label htmlFor="invite_pgr">PGR</Label><Input id="invite_pgr" type="file" accept="image/*,.pdf" onChange={(e) => setInviteFiles({ ...inviteFiles, pgr: e.target.files[0] })} className="bg-white" /></div>
                </div>
              </div>
              <div className="space-y-2"><Label htmlFor="invite_notes">Observações</Label><Textarea id="invite_notes" value={inviteFormData.notes} onChange={(e) => setInviteFormData({ ...inviteFormData, notes: e.target.value })} placeholder="Informações adicionais..." rows={3} /></div>
              {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowInviteDialog(false)} variant="outline">Cancelar</Button>
              <Button onClick={handleInviteSubmit} disabled={createInvitationMutation.isPending || isUploadingInvite} className="bg-blue-600 hover:bg-blue-700">{(createInvitationMutation.isPending || isUploadingInvite) ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isUploadingInvite ? 'Enviando Docs...' : 'Enviando Solicitação...'}</> : <><Plus className="w-4 h-4 mr-2" />Solicitar Acesso</>}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DriverFormDialog open={showDialog} onClose={handleCloseDialog} driver={editingDriver} supplierId={user?.supplier_id} />

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
            <div className="py-4"><p>Você tem certeza que deseja remover o motorista <span className="font-semibold">{driverToDelete?.name}</span>? Essa ação não pode ser desfeita.</p></div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmDeleteDriver} disabled={deleteMutation.isLoading}>{deleteMutation.isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Removendo...</> : 'Remover'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}