import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import GenericTable from '@/components/ui/GenericTable';
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';
import {
  Loader2,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  MapPin,
  Mail,
  Phone,
  Building
} from 'lucide-react';

export default function GerenciarParceiros() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone_number: '',
    company_name: '',
    document_id: '',
    city: '',
    state: '',
    default_margin_percentage: 20,
    active: true,
    payment_details: '',
    notes: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser?.supplier_id) {
          window.location.href = '/DashboardFornecedor';
          return;
        }
        setUser(currentUser);
      } catch (err) {
        console.error(err);
        base44.auth.redirectToLogin();
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['subcontractors', user?.supplier_id],
    queryFn: () => base44.entities.Subcontractor.filter({ supplier_id: user.supplier_id }),
    enabled: !!user?.supplier_id,
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Subcontractor.create({ ...data, supplier_id: user.supplier_id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['subcontractors']);
      setSuccess('Parceiro cadastrado com sucesso!');
      setShowDialog(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => setError(err.message || 'Erro ao criar parceiro')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subcontractor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['subcontractors']);
      setSuccess('Parceiro atualizado com sucesso!');
      setShowDialog(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => setError(err.message || 'Erro ao atualizar parceiro')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Subcontractor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['subcontractors']);
      setSuccess('Parceiro removido com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => setError(err.message || 'Erro ao remover parceiro')
  });

  const resetForm = () => {
    setFormData({
      name: '',
      contact_name: '',
      email: '',
      phone_number: '',
      company_name: '',
      document_id: '',
      city: '',
      state: '',
      default_margin_percentage: 20,
      active: true,
      payment_details: '',
      notes: ''
    });
    setEditingPartner(null);
    setError('');
  };

  const handleOpenDialog = (partner = null) => {
    if (partner) {
      setEditingPartner(partner);
      setFormData({
        name: partner.name || '',
        contact_name: partner.contact_name || '',
        email: partner.email || '',
        phone_number: partner.phone_number || '',
        company_name: partner.company_name || '',
        document_id: partner.document_id || '',
        city: partner.city || '',
        state: partner.state || '',
        default_margin_percentage: partner.default_margin_percentage || 20,
        active: partner.active,
        payment_details: partner.payment_details || '',
        notes: partner.notes || ''
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone_number) {
      setError('Preencha os campos obrigatórios (*)');
      return;
    }

    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredPartners = partners.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      header: 'Parceiro',
      render: (row) => (
        <div>
          <div className="font-semibold text-gray-900">{row.name}</div>
          {row.company_name && <div className="text-xs text-gray-500 flex items-center gap-1"><Building className="w-3 h-3" /> {row.company_name}</div>}
        </div>
      )
    },
    {
      header: 'Contato',
      render: (row) => (
        <div className="text-sm">
          <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" /> {row.email}</div>
          <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" /> {row.phone_number}</div>
          {row.contact_name && <div className="text-xs text-gray-500">Ref: {row.contact_name}</div>}
        </div>
      )
    },
    {
      header: 'Localização',
      render: (row) => (
        <div className="text-sm">
          {row.city ? (
            <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" /> {row.city}/{row.state}</div>
          ) : '-'}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'active',
      render: (row) => (
        <Badge variant={row.active ? 'success' : 'secondary'} className={row.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
          {row.active ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
    {
      header: 'Ações',
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(row)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              if (confirm('Tem certeza que deseja remover este parceiro?')) {
                deleteMutation.mutate(row.id);
              }
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  if (isCheckingAuth) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin w-8 h-8" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-600" />
              Meus Parceiros
            </h1>
            <p className="text-gray-600">Gerencie sua rede de parceiros subcontratados</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Parceiro
          </Button>
        </div>

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Buscar por nome, email ou cidade..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <GenericTable 
              columns={columns}
              data={filteredPartners}
              emptyMessage="Nenhum parceiro cadastrado."
            />
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPartner ? 'Editar Parceiro' : 'Novo Parceiro'}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Parceiro *</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Nome ou Apelido"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Razão Social / Empresa</Label>
                  <Input 
                    id="company_name" 
                    value={formData.company_name} 
                    onChange={e => setFormData({...formData, company_name: e.target.value})} 
                    placeholder="Nome da Empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Pessoa de Contato</Label>
                  <Input 
                    id="contact_name" 
                    value={formData.contact_name} 
                    onChange={e => setFormData({...formData, contact_name: e.target.value})} 
                    placeholder="Quem contatar"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document_id">CPF / CNPJ</Label>
                  <Input 
                    id="document_id" 
                    value={formData.document_id} 
                    onChange={e => setFormData({...formData, document_id: e.target.value})} 
                    placeholder="Documento"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                  <PhoneInputWithCountry
                    id="phone"
                    value={formData.phone_number}
                    onChange={value => setFormData({...formData, phone_number: value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input 
                    id="city" 
                    value={formData.city} 
                    onChange={e => setFormData({...formData, city: e.target.value})} 
                    placeholder="São Paulo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input 
                    id="state" 
                    value={formData.state} 
                    onChange={e => setFormData({...formData, state: e.target.value})} 
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_details">Dados Bancários / Pagamento</Label>
                <Textarea 
                  id="payment_details" 
                  value={formData.payment_details} 
                  onChange={e => setFormData({...formData, payment_details: e.target.value})} 
                  placeholder="Chave PIX, Banco, Agência, Conta..."
                  className="h-20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações Internas</Label>
                <Textarea 
                  id="notes" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  placeholder="Anotações sobre o parceiro (não visível para ele)"
                  className="h-20"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Checkbox 
                  id="active" 
                  checked={formData.active} 
                  onCheckedChange={(checked) => setFormData({...formData, active: checked})}
                />
                <Label htmlFor="active" className="cursor-pointer">Parceiro Ativo</Label>
              </div>

              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="animate-spin mr-2" /> : null}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}