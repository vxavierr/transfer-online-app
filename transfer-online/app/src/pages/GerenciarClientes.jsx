import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
Plus,
Edit,
Trash2,
Loader2,
Building2,
User,
Phone,
Mail,
MapPin,
CheckCircle,
AlertCircle,
Users,
ArrowUp,
ArrowDown,
X as CloseIcon,
Receipt,
Upload,
Download,
ShieldCheck,
GripVertical
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Link2 } from 'lucide-react';
import ClientAuditAccessDialog from '@/components/admin/ClientAuditAccessDialog';

export default function GerenciarClientes() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // NOVO: Estado para gestão de centros de custo
  const [showCostCenterDialog, setShowCostCenterDialog] = useState(false);
  const [managingCostCentersForClient, setManagingCostCentersForClient] = useState(null);
  const [editingCostCenter, setEditingCostCenter] = useState(null);
  const [costCenterFormData, setCostCenterFormData] = useState({
    code: '',
    name: '',
    description: '',
    active: true
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [auditClient, setAuditClient] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    document_id: '',
    client_type: 'corporate',
    address: '',
    city: '',
    state: '',
    phone_number: '',
    contact_person_name: '',
    contact_person_phone: '',
    contact_person_email: '',
    billing_email: '',
    payment_terms: 'prepaid',
    associated_supplier_ids: [],
    supplier_priority_order: [],
    auto_fallback_enabled: true,
    supplier_response_timeout_minutes: 60,
    has_cost_centers: true,
    requires_purchase_order_number: false,
    driver_approval_configs: [], // Nova configuração
    active: true,
    notes: ''
  });

  // Estado temporário para adicionar aprovador
  const [newApprover, setNewApprover] = useState({ name: '', email: '', role: 'approver' });
  const [editingApproverIndex, setEditingApproverIndex] = useState(null);
  const [tempEditingApprover, setTempEditingApprover] = useState({ name: '', email: '' });

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
        window.location.href = '/AccessPortal?returnUrl=%2FGerenciarClientes';
      }
    };

    checkAuth();
  }, []);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    enabled: !isCheckingAuth,
    initialData: []
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: !isCheckingAuth,
    initialData: []
  });

  // NOVO: Query para centros de custo
  const { data: costCenters = [], isLoading: isLoadingCostCenters } = useQuery({
    queryKey: ['costCenters', managingCostCentersForClient?.id],
    queryFn: () => managingCostCentersForClient 
      ? base44.entities.CostCenter.filter({ client_id: managingCostCentersForClient.id })
      : Promise.resolve([]),
    enabled: !!managingCostCentersForClient,
    initialData: []
  });

  const createClientMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSuccess('Cliente criado com sucesso!');
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao criar cliente');
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSuccess('Cliente atualizado com sucesso!');
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao atualizar cliente');
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSuccess('Cliente excluído com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao excluir cliente');
    }
  });

  // NOVO: Mutations para centros de custo
  const createCostCenterMutation = useMutation({
    mutationFn: (data) => base44.entities.CostCenter.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCenters'] });
      setSuccess('Centro de custo criado com sucesso!');
      resetCostCenterForm();
      // Ensure the error state is cleared if there was a previous error in the dialog
      setError(''); 
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao criar centro de custo');
    }
  });

  const updateCostCenterMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CostCenter.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCenters'] });
      setSuccess('Centro de custo atualizado com sucesso!');
      resetCostCenterForm();
      // Ensure the error state is cleared if there was a previous error in the dialog
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao atualizar centro de custo');
    }
  });

  const deleteCostCenterMutation = useMutation({
    mutationFn: (id) => base44.entities.CostCenter.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCenters'] });
      setSuccess('Centro de custo excluído com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao excluir centro de custo');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      document_id: '',
      client_type: 'corporate',
      address: '',
      city: '',
      state: '',
      phone_number: '',
      contact_person_name: '',
      contact_person_phone: '',
      contact_person_email: '',
      billing_email: '',
      payment_terms: 'prepaid',
      associated_supplier_ids: [],
      supplier_priority_order: [],
      auto_fallback_enabled: true,
      supplier_response_timeout_minutes: 60,
      has_cost_centers: true,
      requires_purchase_order_number: false,
      active: true,
      notes: ''
    });
    setEditingClient(null);
    setShowDialog(false);
    setError('');
  };

  // NOVO: Reset form de centro de custo
  const resetCostCenterForm = () => {
    setCostCenterFormData({
      code: '',
      name: '',
      description: '',
      active: true
    });
    setEditingCostCenter(null);
    setShowCostCenterDialog(false);
    setError(''); // Clear error specific to cost center dialog
  };

  const handleCloseDialog = (open) => {
    if (!open) { // If the dialog is being closed
      resetForm();
    }
    setShowDialog(open); // Keep the Dialog component's open state in sync
  };

  const handleOpenDialog = (client = null) => {
    if (client) {
      setEditingClient(client);
      const supplierIds = client.associated_supplier_ids || [];
      const priorityOrder = (client.supplier_priority_order || []).filter(id => supplierIds.includes(id));
      const fullPriorityOrder = [...new Set([...priorityOrder, ...supplierIds])];
      
      setFormData({
        name: client.name,
        document_id: client.document_id,
        client_type: client.client_type || 'corporate',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        phone_number: client.phone_number || '',
        contact_person_name: client.contact_person_name,
        contact_person_phone: client.contact_person_phone,
        contact_person_email: client.contact_person_email || '',
        billing_email: client.billing_email || '',
        payment_terms: client.payment_terms || 'prepaid',
        associated_supplier_ids: supplierIds,
        supplier_priority_order: fullPriorityOrder,
        auto_fallback_enabled: client.auto_fallback_enabled !== false,
        supplier_response_timeout_minutes: client.supplier_response_timeout_minutes || 60,
        has_cost_centers: client.has_cost_centers !== false,
        requires_purchase_order_number: client.requires_purchase_order_number === true,
        driver_approval_configs: client.driver_approval_configs || [],
        active: client.active !== false,
        notes: client.notes || ''
      });
    } else {
      // For new client, ensure a clean form state
      setFormData({
        name: '',
        document_id: '',
        client_type: 'corporate',
        address: '',
        city: '',
        state: '',
        phone_number: '',
        contact_person_name: '',
        contact_person_phone: '',
        contact_person_email: '',
        billing_email: '',
        payment_terms: 'prepaid',
        associated_supplier_ids: [],
        supplier_priority_order: [],
        auto_fallback_enabled: true,
        supplier_response_timeout_minutes: 60,
        has_cost_centers: true,
        requires_purchase_order_number: false,
        driver_approval_configs: [],
        active: true,
        notes: ''
      });
      setEditingClient(null);
      setNewApprover({ name: '', email: '', role: 'approver' });
    }
    setShowDialog(true);
    setError('');
  };

  // NOVO: Handlers para centros de custo
  const handleOpenCostCenterManagement = (client) => {
    setManagingCostCentersForClient(client);
    setError(''); // Clear any general errors when opening this dialog
  };

  const handleCloseCostCenterManagement = () => {
    setManagingCostCentersForClient(null);
    setEditingCostCenter(null);
    resetCostCenterForm();
    setError(''); // Clear any errors when closing this dialog
  };

  const handleOpenCostCenterDialog = (costCenter = null) => {
    if (costCenter) {
      setEditingCostCenter(costCenter);
      setCostCenterFormData({
        code: costCenter.code,
        name: costCenter.name,
        description: costCenter.description || '',
        active: costCenter.active !== false
      });
    } else {
      resetCostCenterForm(); // Clears form for new creation
    }
    setShowCostCenterDialog(true);
    setError(''); // Clear previous errors when opening the form dialog
  };

  const handleSubmitCostCenter = (e) => {
    e.preventDefault();
    
    if (!costCenterFormData.code || !costCenterFormData.name) {
      setError('Código e nome do centro de custo são obrigatórios');
      return;
    }

    const data = {
      ...costCenterFormData,
      client_id: managingCostCentersForClient.id
    };

    if (editingCostCenter) {
      updateCostCenterMutation.mutate({ id: editingCostCenter.id, data });
    } else {
      createCostCenterMutation.mutate(data);
    }
  };

  const handleDeleteCostCenter = (costCenter) => {
    if (confirm(`Tem certeza que deseja excluir o centro de custo ${costCenter.code} - ${costCenter.name}?`)) {
      deleteCostCenterMutation.mutate(costCenter.id);
    }
  };

  // NOVO: Handler para importação de centros de custo
  const handleImportCostCenters = async () => {
    if (!importFile) {
      setError('Selecione um arquivo para importar');
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      // Tentar múltiplos encodings
      let text = '';
      let encoding = 'UTF-8';
      
      // Primeiro tentar UTF-8
      try {
        text = await importFile.text();
        // Verificar se há caracteres corrompidos comuns de encoding errado
        if (text.includes('') || text.includes('Ã§') || text.includes('Ã£')) {
          throw new Error('UTF-8 decode issue detected');
        }
      } catch (e) {
        console.log('UTF-8 falhou, tentando Windows-1252...');
        // Tentar Windows-1252 (encoding comum do Excel no Windows)
        const arrayBuffer = await importFile.arrayBuffer();
        const decoder = new TextDecoder('windows-1252');
        text = decoder.decode(arrayBuffer);
        encoding = 'Windows-1252';
      }

      console.log(`[CSV Import] Arquivo lido com encoding: ${encoding}`);
      
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('Arquivo vazio ou inválido. O arquivo deve conter um cabeçalho e pelo menos um centro de custo.');
      }

      // Parse header - support both comma and semicolon separators
      const headerLine = lines[0];
      const separator = headerLine.includes(';') ? ';' : ',';
      
      // Normalizar o header removendo acentos e espaços para comparação
      const normalizeHeader = (str) => {
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove acentos
          .replace(/[^\w]/g, ''); // Remove caracteres especiais
      };
      
      const header = headerLine.split(separator).map(h => h.trim());
      const normalizedHeader = header.map(h => normalizeHeader(h));
      
      console.log('[CSV Import] Header original:', header);
      console.log('[CSV Import] Header normalizado:', normalizedHeader);
      
      // Validar header - procurar por 'codigo' e 'nome' (normalizados)
      const codigoIndex = normalizedHeader.findIndex(h => h === 'codigo');
      const nomeIndex = normalizedHeader.findIndex(h => h === 'nome');
      const descricaoIndex = normalizedHeader.findIndex(h => 
        h === 'descricao' || h === 'descrição' || h === 'descricão' // Original checks, included for robustness
      );
      
      if (codigoIndex === -1 || nomeIndex === -1) {
        throw new Error(
          `Cabeçalho inválido.\n\n` +
          `✅ Formato esperado: codigo,nome,descricao\n` +
          `❌ Encontrado: ${headerLine}\n\n` +
          `Dicas:\n` +
          `• Certifique-se que o arquivo está salvo em formato CSV UTF-8\n` +
          `• As colunas "codigo" e "nome" são obrigatórias\n` +
          `• Aceita variações: código/codigo, descrição/descricao\n` +
          `• Encoding detectado: ${encoding}`
        );
      }

      const dataLines = lines.slice(1);
      const costCentersToImport = [];

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        if (!line.trim()) continue;
        
        const values = line.split(separator).map(s => s.trim());
        
        const code = values[codigoIndex];
        const name = values[nomeIndex];
        const description = descricaoIndex !== -1 ? (values[descricaoIndex] || '') : '';
        
        if (!code || !name) {
          console.warn(`[CSV Import] Linha ${i + 2} ignorada (código ou nome vazio):`, line);
          continue;
        }
        
        costCentersToImport.push({
          client_id: managingCostCentersForClient.id,
          code: code.trim(),
          name: name.trim(),
          description: description.trim(),
          active: true
        });
      }

      if (costCentersToImport.length === 0) {
        throw new Error(
          'Nenhum centro de custo válido encontrado no arquivo.\n\n' +
          'Verifique se:\n' +
          '• As linhas contêm dados nas colunas "codigo" e "nome"\n' +
          '• O separador está correto (vírgula ou ponto-e-vírgula)\n' +
          '• Não há linhas em branco no meio do arquivo\n' +
          `• Encoding: ${encoding}`
        );
      }

      console.log(`[CSV Import] ${costCentersToImport.length} centros de custo encontrados para importar`);

      // Criar centros de custo em lote
      await Promise.all(
        costCentersToImport.map(cc => base44.entities.CostCenter.create(cc))
      );

      queryClient.invalidateQueries({ queryKey: ['costCenters'] });
      setSuccess(`✅ ${costCentersToImport.length} centro(s) de custo importado(s) com sucesso! (Encoding: ${encoding})`);
      setShowImportDialog(false);
      setImportFile(null);
      setError('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('[CSV Import] Erro ao importar centros de custo:', error);
      setError(`${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // NOVO: Handler para exportar modelo CSV
  const handleDownloadTemplate = () => {
    const csvContent = 'codigo,nome,descricao\nCC-001,Marketing,Departamento de Marketing\nCC-002,TI,Departamento de TI\nCC-003,RH,Recursos Humanos';
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_centros_custo.csv';
    link.click();
  };

  const handleAddSupplier = (supplierId) => {
    if (!formData.associated_supplier_ids.includes(supplierId)) {
      const newIds = [...formData.associated_supplier_ids, supplierId];
      const newPriority = [...formData.supplier_priority_order, supplierId];
      setFormData({
        ...formData,
        associated_supplier_ids: newIds,
        supplier_priority_order: newPriority
      });
    }
  };

  const handleRemoveSupplier = (supplierId) => {
    const newIds = formData.associated_supplier_ids.filter(id => id !== supplierId);
    const newPriority = formData.supplier_priority_order.filter(id => id !== supplierId);
    setFormData({
      ...formData,
      associated_supplier_ids: newIds,
      supplier_priority_order: newPriority
    });
  };

  const handleMoveSupplierUp = (index) => {
    if (index === 0) return;
    const newPriority = [...formData.supplier_priority_order];
    [newPriority[index], newPriority[index - 1]] = [newPriority[index - 1], newPriority[index]];
    setFormData({ ...formData, supplier_priority_order: newPriority });
  };

  const handleMoveSupplierDown = (index) => {
    if (index === formData.supplier_priority_order.length - 1) return;
    const newPriority = [...formData.supplier_priority_order];
    [newPriority[index], newPriority[index + 1]] = [newPriority[index + 1], newPriority[index]];
    setFormData({ ...formData, supplier_priority_order: newPriority });
  };

  const handleAddApprover = () => {
    if (!newApprover.name || !newApprover.email) {
      alert("Preencha nome e email do aprovador");
      return;
    }
    
    // Garante que é um array antes de espalhar
    let configs = [...(formData.driver_approval_configs || [])];
    
    if (configs.length === 0) {
      configs.push({
        id: crypto.randomUUID(),
        name: 'Fluxo Padrão',
        approver_sequence: [],
        active: true
      });
    }
    
    // Garante que approver_sequence existe
    if (!configs[0].approver_sequence) {
        configs[0].approver_sequence = [];
    }
    
    // Adiciona na sequência
    configs[0].approver_sequence.push({ ...newApprover, id: crypto.randomUUID() });
    
    setFormData({ ...formData, driver_approval_configs: configs });
    setNewApprover({ name: '', email: '', role: 'approver' });
  };

  const handleStartEditApprover = (index, approver) => {
    setEditingApproverIndex(index);
    setTempEditingApprover({ ...approver });
  };

  const handleCancelEditApprover = () => {
    setEditingApproverIndex(null);
    setTempEditingApprover({ name: '', email: '' });
  };

  const handleSaveEditApprover = (configIndex, approverIndex) => {
    if (!tempEditingApprover.name || !tempEditingApprover.email) {
      alert("Nome e email são obrigatórios");
      return;
    }

    let configs = [...(formData.driver_approval_configs || [])];
    if (configs[configIndex] && configs[configIndex].approver_sequence) {
      configs[configIndex].approver_sequence[approverIndex] = {
        ...configs[configIndex].approver_sequence[approverIndex],
        name: tempEditingApprover.name,
        email: tempEditingApprover.email
      };
      setFormData({ ...formData, driver_approval_configs: configs });
    }
    
    setEditingApproverIndex(null);
    setTempEditingApprover({ name: '', email: '' });
  };

  const handleRemoveApprover = (configIndex, approverIndex) => {
    let configs = [...(formData.driver_approval_configs || [])];
    if (configs[configIndex] && configs[configIndex].approver_sequence) {
        configs[configIndex].approver_sequence.splice(approverIndex, 1);
        setFormData({ ...formData, driver_approval_configs: configs });
    }
  };

  const onDragEndApprovers = (result) => {
    if (!result.destination) return;

    const configs = [...(formData.driver_approval_configs || [])];
    if (!configs[0] || !configs[0].approver_sequence) return;

    const items = Array.from(configs[0].approver_sequence);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    configs[0].approver_sequence = items;
    setFormData({ ...formData, driver_approval_configs: configs });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.document_id || !formData.contact_person_name || !formData.contact_person_phone) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient.id, data: formData });
    } else {
      createClientMutation.mutate(formData);
    }
  };

  const handleDelete = (client) => {
    if (confirm(`Tem certeza que deseja excluir o cliente ${client.name}?`)) {
      deleteClientMutation.mutate(client.id);
    }
  };

  const activeSuppliers = suppliers.filter(p => p.active !== false);
  const availableSuppliers = activeSuppliers.filter(s => !formData.associated_supplier_ids.includes(s.id));

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
            Gerenciar Clientes
          </h1>
          <p className="text-gray-600">Cadastre e gerencie clientes corporativos e pessoas físicas (Módulo 2 - SAAS)</p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && !showDialog && !showCostCenterDialog && !managingCostCentersForClient && !showImportDialog && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold">Clientes Cadastrados</h2>
              <p className="text-sm text-gray-600">{clients.length} cliente(s) no total</p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Carregando clientes...</p>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum cliente cadastrado</p>
                <Button
                  onClick={() => handleOpenDialog()}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Primeiro Cliente
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Cliente</TableHead>
                      <TableHead className="font-semibold">Documento</TableHead>
                      <TableHead className="font-semibold">Responsável</TableHead>
                      <TableHead className="font-semibold">Contato</TableHead>
                      <TableHead className="font-semibold">Fornecedores</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {client.client_type === 'corporate' ? (
                                <Building2 className="w-4 h-4 text-blue-600" />
                              ) : (
                                <User className="w-4 h-4 text-purple-600" />
                              )}
                              {client.name}
                            </div>
                            {client.city && client.state && (
                              <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {client.city}, {client.state}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">{client.document_id}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{client.contact_person_name}</div>
                            {client.contact_person_email && (
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <Mail className="w-3 h-3" />
                                {client.contact_person_email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {client.contact_person_phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-semibold">
                              {client.associated_supplier_ids?.length || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              client.active
                                ? 'bg-green-100 text-green-800 border-green-300 border'
                                : 'bg-gray-100 text-gray-800 border-gray-300 border'
                            }
                          >
                            {client.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCostCenterManagement(client)}
                              title="Gerenciar Centros de Custo"
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            >
                              <Receipt className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAuditClient(client)}
                              title="Gerar Link de Auditoria"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Link2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(client)}
                              title="Editar Cliente"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(client)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Excluir Cliente"
                            >
                              <Trash2 className="w-4 h-4" />
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

        <ClientAuditAccessDialog
          client={auditClient}
          open={!!auditClient}
          onOpenChange={(open) => !open && setAuditClient(null)}
        />

        {/* Dialog de Criação/Edição de Cliente */}
        <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="space-y-6 py-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* ID do Cliente - Somente na Edição */}
                {editingClient && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <Label htmlFor="client_id" className="text-sm font-semibold text-purple-900">
                      ID do Cliente (somente leitura)
                    </Label>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        id="client_id"
                        value={editingClient.id}
                        readOnly
                        className="font-mono text-sm bg-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(editingClient.id);
                          alert('ID copiado para a área de transferência!');
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                    <p className="text-xs text-purple-700 mt-1">
                      Use este ID para associar usuários a este cliente no painel da Base44
                    </p>
                  </div>
                )}

                {/* Tipo de Cliente */}
                <div className="space-y-2">
                  <Label htmlFor="client_type">Tipo de Cliente *</Label>
                  <Select
                    value={formData.client_type}
                    onValueChange={(value) => setFormData({ ...formData, client_type: value })}
                  >
                    <SelectTrigger id="client_type">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corporate">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Pessoa Jurídica
                        </div>
                      </SelectItem>
                      <SelectItem value="individual">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Pessoa Física
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dados Principais */}
                <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                  <h3 className="font-semibold text-blue-900">Dados Principais</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        {formData.client_type === 'corporate' ? 'Nome da Empresa' : 'Nome Completo'} *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={formData.client_type === 'corporate' ? 'Ex: Acme Corp LTDA' : 'Ex: João Silva'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="document_id">
                        {formData.client_type === 'corporate' ? 'CNPJ' : 'CPF'} *
                      </Label>
                      <Input
                        id="document_id"
                        value={formData.document_id}
                        onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                        placeholder={formData.client_type === 'corporate' ? '00.000.000/0000-00' : '000.000.000-00'}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Rua, número, complemento"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="São Paulo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="SP"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Telefone Principal</Label>
                      <Input
                        id="phone_number"
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        placeholder="+55 11 99999-9999"
                      />
                    </div>
                  </div>
                </div>

                {/* Responsável pelo Contrato */}
                <div className="bg-green-50 p-4 rounded-lg space-y-4">
                  <h3 className="font-semibold text-green-900">Responsável pelo Contrato</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_person_name">Nome do Responsável *</Label>
                      <Input
                        id="contact_person_name"
                        value={formData.contact_person_name}
                        onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
                        placeholder="Ex: Maria Santos"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_person_phone">Telefone do Responsável *</Label>
                      <Input
                        id="contact_person_phone"
                        value={formData.contact_person_phone}
                        onChange={(e) => setFormData({ ...formData, contact_person_phone: e.target.value })}
                        placeholder="+55 11 98888-8888"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_person_email">E-mail do Responsável</Label>
                      <Input
                        id="contact_person_email"
                        type="email"
                        value={formData.contact_person_email}
                        onChange={(e) => setFormData({ ...formData, contact_person_email: e.target.value })}
                        placeholder="maria@empresa.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="billing_email">E-mail para Faturamento</Label>
                      <Input
                        id="billing_email"
                        type="email"
                        value={formData.billing_email}
                        onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                        placeholder="financeiro@empresa.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Fornecedores Associados - NOVA SEÇÃO */}
                <div className="bg-amber-50 p-4 rounded-lg space-y-4 border-2 border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-amber-700" />
                    <h3 className="font-semibold text-amber-900">Fornecedores Associados</h3>
                  </div>
                  <p className="text-sm text-amber-800 mb-4">
                    Selecione os fornecedores que poderão atender este cliente e defina a ordem de prioridade (primeiro = preferencial).
                  </p>

                  {/* Lista de fornecedores selecionados com ordem de prioridade */}
                  {formData.supplier_priority_order.length > 0 && (
                    <div className="bg-white p-4 rounded-lg border border-amber-200 mb-4">
                      <h4 className="font-medium text-sm text-gray-700 mb-3">Fornecedores Selecionados (ordem de prioridade):</h4>
                      <div className="space-y-2">
                        {formData.supplier_priority_order.map((supplierId, index) => {
                          const supplier = suppliers.find(s => s.id === supplierId);
                          if (!supplier) return null;
                          return (
                            <div key={supplierId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                              <div className="flex items-center gap-3">
                                <Badge className="bg-blue-600 text-white">#{index + 1}</Badge>
                                <div>
                                  <div className="font-medium text-gray-900">{supplier.name}</div>
                                  <div className="text-xs text-gray-500">{supplier.company_name}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMoveSupplierUp(index)}
                                  disabled={index === 0}
                                  title="Mover para cima"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMoveSupplierDown(index)}
                                  disabled={index === formData.supplier_priority_order.length - 1}
                                  title="Mover para baixo"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveSupplier(supplierId)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Remover"
                                >
                                  <CloseIcon className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Select para adicionar fornecedor */}
                  {availableSuppliers.length > 0 ? (
                    <div className="space-y-2">
                      <Label htmlFor="add_supplier">Adicionar Fornecedor</Label>
                      <Select onValueChange={handleAddSupplier} value="">
                        <SelectTrigger id="add_supplier">
                          <SelectValue placeholder="Selecione um fornecedor para adicionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSuppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name} - {supplier.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        {formData.associated_supplier_ids.length === 0 
                          ? 'Nenhum fornecedor ativo cadastrado no sistema.'
                          : 'Todos os fornecedores disponíveis já foram adicionados.'}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Configuração de Centro de Custo */}
                <div className="bg-teal-50 p-4 rounded-lg space-y-4 border-2 border-teal-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="w-5 h-5 text-teal-700" />
                    <h3 className="font-semibold text-teal-900">Centro de Custo</h3>
                  </div>
                  <p className="text-sm text-teal-800 mb-2">
                    Define se este cliente utiliza centros de custo para rateio de despesas ao solicitar viagens.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="has_cost_centers"
                      checked={formData.has_cost_centers !== false}
                      onChange={(e) => setFormData({ ...formData, has_cost_centers: e.target.checked })}
                      className="w-4 h-4 text-teal-600"
                    />
                    <Label htmlFor="has_cost_centers" className="cursor-pointer font-medium">
                      Possui Centro de Custo?
                    </Label>
                  </div>
                  <p className="text-xs text-teal-700 ml-7">
                    {formData.has_cost_centers !== false
                      ? '✅ Sim — O centro de custo será obrigatório ao solicitar viagens.'
                      : '❌ Não — Viagens poderão ser solicitadas sem informar centro de custo.'}
                  </p>

                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-teal-200">
                    <input
                      type="checkbox"
                      id="requires_purchase_order_number"
                      checked={formData.requires_purchase_order_number === true}
                      onChange={(e) => setFormData({ ...formData, requires_purchase_order_number: e.target.checked })}
                      className="w-4 h-4 text-teal-600"
                    />
                    <Label htmlFor="requires_purchase_order_number" className="cursor-pointer font-medium">
                      Exige Número de Ordem de Compra?
                    </Label>
                  </div>
                  <p className="text-xs text-teal-700 ml-7">
                    {formData.requires_purchase_order_number === true
                      ? '✅ Sim — O número da OC será obrigatório ao selecionar "Ordem de Compra" como forma de faturamento.'
                      : '❌ Não — O número da OC será opcional ao selecionar "Ordem de Compra".'}
                  </p>
                </div>

                {/* Configurações de Aprovação de Motoristas - FLUXO CORPORATIVO */}
                <div className="bg-indigo-50 p-4 rounded-lg space-y-4 border-2 border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-700" />
                    <h3 className="font-semibold text-indigo-900">Fluxo de Aprovação de Motoristas</h3>
                  </div>
                  <p className="text-sm text-indigo-800 mb-4">
                    Defina quem deve aprovar novos motoristas para este cliente. A aprovação seguirá a ordem da lista.
                  </p>

                  <div className="bg-white p-4 rounded-lg border border-indigo-200 mb-4">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <Input 
                        placeholder="Nome do Aprovador" 
                        value={newApprover.name}
                        onChange={(e) => setNewApprover({...newApprover, name: e.target.value})}
                      />
                      <Input 
                        placeholder="Email do Aprovador" 
                        type="email"
                        value={newApprover.email}
                        onChange={(e) => setNewApprover({...newApprover, email: e.target.value})}
                      />
                      <Button type="button" onClick={handleAddApprover} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" /> Adicionar
                      </Button>
                    </div>

                    {formData.driver_approval_configs?.[0]?.approver_sequence?.length > 0 ? (
                      <DragDropContext onDragEnd={onDragEndApprovers}>
                        <Droppable droppableId="approvers-list">
                          {(provided) => (
                            <div 
                              className="mt-4 space-y-2"
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                            >
                              <h4 className="text-xs font-semibold text-gray-500 uppercase">Sequência de Aprovação (Arraste para reordenar)</h4>
                              {formData.driver_approval_configs[0].approver_sequence.map((approver, idx) => (
                                <Draggable 
                                  key={approver.id || `approver-${idx}`} 
                                  draggableId={approver.id || `approver-${idx}`} 
                                  index={idx}
                                >
                                  {(provided, snapshot) => (
                                    <div 
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`flex items-center justify-between bg-gray-50 p-2 rounded border ${snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-500 bg-white z-10' : ''}`}
                                      style={provided.draggableProps.style}
                                    >
                                      {editingApproverIndex === idx ? (
                                        <div className="flex-1 flex items-center gap-2 pr-2">
                                          <Input
                                            value={tempEditingApprover.name}
                                            onChange={(e) => setTempEditingApprover({...tempEditingApprover, name: e.target.value})}
                                            placeholder="Nome"
                                            className="h-8 text-sm"
                                          />
                                          <Input
                                            value={tempEditingApprover.email}
                                            onChange={(e) => setTempEditingApprover({...tempEditingApprover, email: e.target.value})}
                                            placeholder="Email"
                                            className="h-8 text-sm"
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSaveEditApprover(0, idx)}
                                            className="text-green-600 hover:bg-green-50"
                                            title="Salvar"
                                          >
                                            <CheckCircle className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCancelEditApprover}
                                            className="text-gray-500 hover:bg-gray-100"
                                            title="Cancelar"
                                          >
                                            <CloseIcon className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex items-center gap-3 flex-1">
                                            <div 
                                              {...provided.dragHandleProps}
                                              className="cursor-move text-gray-400 hover:text-indigo-600 p-1"
                                              title="Arrastar para reordenar"
                                            >
                                              <GripVertical className="w-4 h-4" />
                                            </div>
                                            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                                              Passo {idx + 1}
                                            </Badge>
                                            <div className="min-w-0 flex-1">
                                              <div className="font-medium text-sm truncate">{approver.name}</div>
                                              <div className="text-xs text-gray-500 truncate">{approver.email}</div>
                                            </div>
                                          </div>
                                          <div className="flex items-center">
                                            <Button 
                                              type="button" 
                                              variant="ghost" 
                                              size="sm" 
                                              onClick={() => handleStartEditApprover(idx, approver)}
                                              className="text-blue-600 hover:bg-blue-50"
                                              title="Editar"
                                            >
                                              <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button 
                                              type="button" 
                                              variant="ghost" 
                                              size="sm" 
                                              onClick={() => handleRemoveApprover(0, idx)}
                                              className="text-red-600 hover:bg-red-50"
                                              title="Remover"
                                            >
                                              <CloseIcon className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    ) : (
                      <p className="text-xs text-gray-500 mt-2 text-center italic">Nenhum aprovador configurado.</p>
                    )}
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                  <h3 className="font-semibold text-purple-900">Configurações Operacionais</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment_terms">Termos de Pagamento</Label>
                      <Select
                        value={formData.payment_terms}
                        onValueChange={(value) => setFormData({ ...formData, payment_terms: value })}
                      >
                        <SelectTrigger id="payment_terms">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prepaid">Pré-pago</SelectItem>
                          <SelectItem value="30">Faturado 30 dias</SelectItem>
                          <SelectItem value="60">Faturado 60 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="supplier_response_timeout_minutes">
                        Timeout de Resposta do Fornecedor (minutos)
                      </Label>
                      <Input
                        id="supplier_response_timeout_minutes"
                        type="number"
                        min="5"
                        value={formData.supplier_response_timeout_minutes}
                        onChange={(e) => setFormData({ ...formData, supplier_response_timeout_minutes: parseInt(e.target.value) || 60 })}
                      />
                      <p className="text-xs text-gray-600">
                        Tempo para o fornecedor aceitar/recusar antes de fallback automático
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="auto_fallback_enabled"
                      checked={formData.auto_fallback_enabled}
                      onChange={(e) => setFormData({ ...formData, auto_fallback_enabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Label htmlFor="auto_fallback_enabled" className="cursor-pointer">
                      Fallback Automático Habilitado
                    </Label>
                  </div>
                  <p className="text-xs text-gray-600 ml-7">
                    Se habilitado, redireciona automaticamente para o próximo fornecedor quando houver recusa ou timeout
                  </p>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações Internas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Anotações sobre o cliente, acordos especiais, etc."
                    className="h-20"
                  />
                </div>

                {/* Status */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Label htmlFor="active" className="cursor-pointer">Cliente Ativo</Label>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={resetForm} variant="outline" type="button">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createClientMutation.isLoading || updateClientMutation.isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {(createClientMutation.isLoading || updateClientMutation.isLoading) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {editingClient ? 'Atualizar' : 'Criar'} Cliente
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* NOVO: Dialog de Gestão de Centros de Custo */}
        <Dialog open={!!managingCostCentersForClient} onOpenChange={(open) => !open && handleCloseCostCenterManagement()}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Receipt className="w-6 h-6 text-purple-600" />
                Centros de Custo - {managingCostCentersForClient?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">
                    Gerencie os centros de custo para alocação de despesas.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => { setShowImportDialog(true); setError(''); }} // Clear error when opening import dialog
                    variant="outline"
                    size="sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Importar CSV
                  </Button>
                  <Button
                    onClick={() => handleOpenCostCenterDialog()}
                    className="bg-purple-600 hover:bg-purple-700"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Centro de Custo
                  </Button>
                </div>
              </div>

              {isLoadingCostCenters ? (
                 <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600">Carregando centros de custo...</p>
                 </div>
              ) : costCenters.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                  <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Nenhum centro de custo cadastrado</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Cadastre centros de custo para permitir rateio de despesas.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => handleOpenCostCenterDialog()}
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar Manualmente
                    </Button>
                    <Button
                      onClick={() => { setShowImportDialog(true); setError(''); }}
                      variant="outline"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Importar CSV
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border bg-white overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Código</TableHead>
                        <TableHead className="font-semibold">Nome</TableHead>
                        <TableHead className="font-semibold">Descrição</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costCenters.map((cc) => (
                        <TableRow key={cc.id} className="hover:bg-gray-50">
                          <TableCell>
                            <span className="font-mono text-sm font-semibold text-purple-600">
                              {cc.code}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{cc.name}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">{cc.description || '-'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                cc.active
                                  ? 'bg-green-100 text-green-800 border-green-300 border'
                                  : 'bg-gray-100 text-gray-800 border-gray-300 border'
                              }
                            >
                              {cc.active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenCostCenterDialog(cc)}
                                title="Editar Centro de Custo"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCostCenter(cc)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Excluir Centro de Custo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleCloseCostCenterManagement} variant="outline">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* NOVO: Dialog de Cadastro/Edição de Centro de Custo */}
        <Dialog open={showCostCenterDialog} onOpenChange={setShowCostCenterDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCostCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmitCostCenter}>
              <div className="space-y-4 py-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cc_code">Código *</Label>
                    <Input
                      id="cc_code"
                      value={costCenterFormData.code}
                      onChange={(e) => setCostCenterFormData({...costCenterFormData, code: e.target.value})}
                      placeholder="Ex: CC-001, DEPT-MKT"
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cc_name">Nome *</Label>
                    <Input
                      id="cc_name"
                      value={costCenterFormData.name}
                      onChange={(e) => setCostCenterFormData({...costCenterFormData, name: e.target.value})}
                      placeholder="Ex: Marketing, TI"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cc_description">Descrição</Label>
                  <Textarea
                    id="cc_description"
                    value={costCenterFormData.description}
                    onChange={(e) => setCostCenterFormData({...costCenterFormData, description: e.target.value})}
                    placeholder="Descrição opcional do centro de custo"
                    className="h-20"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="cc_active"
                    checked={costCenterFormData.active}
                    onChange={(e) => setCostCenterFormData({...costCenterFormData, active: e.target.checked})}
                    className="w-4 h-4 text-purple-600"
                  />
                  <Label htmlFor="cc_active" className="cursor-pointer">Centro de Custo Ativo</Label>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={resetCostCenterForm} variant="outline" type="button">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createCostCenterMutation.isLoading || updateCostCenterMutation.isLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {(createCostCenterMutation.isLoading || updateCostCenterMutation.isLoading) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {editingCostCenter ? 'Atualizar' : 'Criar'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* NOVO: Dialog de Importação CSV */}
        <Dialog open={showImportDialog} onOpenChange={(open) => {
          setShowImportDialog(open);
          if (!open) { // Reset state when closing
            setImportFile(null);
            setError('');
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-600" />
                Importar Centros de Custo (CSV)
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Formato do arquivo:</strong> O arquivo CSV deve ter 3 colunas separadas por vírgula (<code>,</code>) ou ponto e vírgula (<code>;</code>):
                  <br />
                  <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded mt-2 block">
                    codigo,nome,descricao
                  </code>
                  <p className="mt-2">A primeira linha deve ser o cabeçalho. Campos "código" e "nome" são obrigatórios. "descricao" é opcional.</p>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="import_file">Selecione o arquivo CSV</Label>
                <Input
                  id="import_file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => { setImportFile(e.target.files[0]); setError(''); }} // Clear error on file change
                />
              </div>

              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Modelo CSV
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => { setShowImportDialog(false); setImportFile(null); setError(''); }} variant="outline">
                Cancelar
              </Button>
              <Button
                onClick={handleImportCostCenters}
                disabled={!importFile || isImporting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}