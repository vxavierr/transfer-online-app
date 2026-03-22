import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Loader2, Receipt, CheckCircle, AlertCircle, FileText, DollarSign, Eye,
  Plus, Edit, ParkingCircle, Timer, Users, Building2,
  Calendar, Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReviewDialog from '@/components/billing/ReviewDialog';
import BillableTripsSection from '@/components/billing/BillableTripsSection';
import ManualInvoiceDialog from '@/components/billing/ManualInvoiceDialog';

export default function GerenciarFaturamento() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [supplier, setSupplier] = useState(null);

  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [approvedExpenses, setApprovedExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({
    type: 'estacionamento',
    value: '',
    quantity_minutes: '',
    description: ''
  });
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isApprovingReview, setIsApprovingReview] = useState(false);

  const [selectedRequests, setSelectedRequests] = useState([]);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    period_start: '',
    period_end: '',
    external_reviewer_email: ''
  });
  const [sendOption, setSendOption] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState(null);
  const [showInvoiceDetailsDialog, setShowInvoiceDetailsDialog] = useState(false);
  const [showCompleteInvoiceDialog, setShowCompleteInvoiceDialog] = useState(false);
  const [completingInvoice, setCompletingInvoice] = useState(null);
  const [invoiceCompleteData, setInvoiceCompleteData] = useState({
    due_date: '',
    receipt_number: '',
    payment_method_description: '',
    bank_account_details: '',
    nf_number: ''
  });
  const [showManualInvoiceDialog, setShowManualInvoiceDialog] = useState(false);
  const [manualInvoiceData, setManualInvoiceData] = useState({
    manual_client_name: '',
    manual_client_document: '',
    manual_client_email: '',
    manual_description: '',
    total_amount: '',
    due_date: '',
    payment_method_description: '',
    bank_account_details: '',
    nf_number: '',
    receipt_number: ''
  });

  const [filters, setFilters] = useState({
    client_id: 'all',
    user_id: 'all',
    billing_responsible_user_id: 'all',
    cost_center_code: 'all',
    billing_method: 'all',
    date_start: '',
    date_end: ''
  });
  const [groupBy, setGroupBy] = useState('none');
  const [showAllTrips, setShowAllTrips] = useState(false);
  const [invoiceFilters, setInvoiceFilters] = useState({
    start: '',
    end: '',
    finance_status: 'all'
  });
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    is_full_payment: false
  });

  const [showEditBookingDialog, setShowEditBookingDialog] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editPriceValue, setEditPriceValue] = useState('');

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
      } catch (authError) {
        console.error('Erro ao verificar autenticação:', authError);
        window.location.href = '/AccessPortal?returnUrl=%2FGerenciarFaturamento';
      }
    };

    checkAuth();
  }, []);

  const { data: requestsAwaitingReview = [] } = useQuery({
    queryKey: ['requestsAwaitingReview', user?.supplier_id],
    queryFn: async () => {
      if (!user?.supplier_id) return [];
      return await base44.entities.ServiceRequest.filter({
        chosen_supplier_id: user.supplier_id,
        status: 'aguardando_revisao_fornecedor'
      });
    },
    enabled: !!user?.supplier_id,
    refetchInterval: 30000,
    initialData: []
  });

  const { data: billableRequests = [] } = useQuery({
    queryKey: ['billableRequests', user?.supplier_id],
    queryFn: async () => {
      if (!user?.supplier_id) return [];

      const requests = await base44.entities.ServiceRequest.filter({
        chosen_supplier_id: user.supplier_id,
        supplier_billing_status: 'pendente_faturamento',
        status: 'concluida'
      });

      let ownBookings = [];
      try {
        ownBookings = await base44.entities.SupplierOwnBooking.filter({
          supplier_id: user.supplier_id,
          status: 'concluida',
          payment_status: 'pendente'
        });
      } catch (e) {
        console.warn('Erro ao buscar viagens próprias faturáveis:', e);
      }

      const normalizedRequests = requests.map(r => ({ ...r, type: 'ServiceRequest', origin_type: 'corporate' }));
      const normalizedOwnBookings = ownBookings.map(b => ({
        ...b,
        type: 'SupplierOwnBooking',
        origin_type: 'own',
        request_number: b.booking_number,
        chosen_supplier_cost: b.price || 0,
        total_additional_expenses_approved: 0,
        user_id: null,
        billing_responsible_name: b.passenger_name
      }));

      return [...normalizedRequests, ...normalizedOwnBookings];
    },
    enabled: !!user?.supplier_id,
    refetchInterval: 30000,
    initialData: []
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.supplier_id],
    queryFn: async () => {
      const platformClients = await base44.entities.Client.list();

      let ownClients = [];
      if (user?.supplier_id) {
        try {
          ownClients = await base44.entities.SupplierOwnClient.filter({
            supplier_id: user.supplier_id
          });
        } catch (e) {
          console.error('Erro ao buscar clientes próprios:', e);
        }
      }

      return [
        ...platformClients.map(c => ({ ...c, type: 'corporate', origin: 'Plataforma' })),
        ...ownClients.map(c => ({ ...c, type: 'own', origin: 'Próprio' }))
      ];
    },
    initialData: []
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('listAllUsers');
        return response.data.users || [];
      } catch (listError) {
        console.error('Erro ao carregar usuários:', listError);
        return [];
      }
    },
    initialData: []
  });

  const { data: allSupplierServiceRequests = [] } = useQuery({
    queryKey: ['allSupplierServiceRequests', supplier?.id],
    queryFn: async () => {
      if (!supplier?.id) return [];
      return await base44.entities.ServiceRequest.filter({
        chosen_supplier_id: supplier.id,
      });
    },
    enabled: !!supplier,
    initialData: []
  });

  const { data: allSupplierOwnBookings = [] } = useQuery({
    queryKey: ['allSupplierOwnBookings', supplier?.id],
    queryFn: async () => {
      if (!supplier?.id) return [];
      return await base44.entities.SupplierOwnBooking.filter({
        supplier_id: supplier.id,
      });
    },
    enabled: !!supplier,
    initialData: []
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['supplierInvoices', user?.supplier_id],
    queryFn: async () => {
      if (!user?.supplier_id) return [];
      return await base44.entities.SupplierInvoice.filter({
        supplier_id: user.supplier_id
      }, '-created_date');
    },
    enabled: !!user?.supplier_id,
    refetchInterval: 30000,
    initialData: []
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createSupplierInvoice', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billableRequests'] });
      queryClient.invalidateQueries({ queryKey: ['supplierInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['allSupplierServiceRequests'] });
      setSuccess('Fatura criada e enviada para revisão!');
      setShowInvoiceDialog(false);
      setSelectedRequests([]);
      setInvoiceData({ period_start: '', period_end: '', external_reviewer_email: '' });
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (mutationError) => {
      setError(mutationError.message || 'Erro ao criar fatura');
    }
  });

  const createManualInvoiceMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createManualSupplierInvoice', data);
      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['supplierInvoices'] });
      setSuccess(`Fatura manual #${result.invoice.invoice_number} criada com sucesso!`);
      setShowManualInvoiceDialog(false);
      setManualInvoiceData({
        manual_client_name: '',
        manual_client_document: '',
        manual_client_email: '',
        manual_description: '',
        total_amount: '',
        due_date: '',
        payment_method_description: '',
        bank_account_details: '',
        nf_number: '',
        receipt_number: ''
      });
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (mutationError) => {
      setError(mutationError.message || 'Erro ao criar fatura manual');
    }
  });

  const approveReviewMutation = useMutation({
    mutationFn: async ({ requestId, approvedExpenses: approved, reviewNotes: notes }) => {
      const response = await base44.functions.invoke('approveServiceRequestExpenses', {
        serviceRequestId: requestId,
        approvedExpenses: approved,
        reviewNotes: notes
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requestsAwaitingReview'] });
      queryClient.invalidateQueries({ queryKey: ['billableRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allSupplierServiceRequests'] });
      setSuccess('Revisão aprovada! A viagem está pronta para faturamento.');
      setShowReviewDialog(false);
      setReviewingRequest(null);
      setApprovedExpenses([]);
      setReviewNotes('');
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (mutationError) => {
      setReviewError(mutationError.message || 'Erro ao aprovar revisão');
    }
  });

  const approveInvoiceMutation = useMutation({
    mutationFn: async (invoice) => {
      await base44.entities.SupplierInvoice.update(invoice.id, {
        status: 'aprovada_externamente',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      });
      return invoice;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['supplierInvoices'] });
      setSuccess('Fatura aprovada! Agora preencha os dados de cobrança.');
      setTimeout(() => setSuccess(''), 3000);
      handleOpenCompleteInvoice(invoice);
    },
    onError: (mutationError) => {
      setError(mutationError.message || 'Erro ao aprovar fatura');
    }
  });

  const completeInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, data }) => {
      await base44.entities.SupplierInvoice.update(invoiceId, {
        ...data,
        status: 'faturado_aguardando_pgto'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierInvoices'] });
      setSuccess('Dados de cobrança salvos! Fatura pronta para envio ao cliente.');
      setShowCompleteInvoiceDialog(false);
      setCompletingInvoice(null);
      setInvoiceCompleteData({
        due_date: '',
        receipt_number: '',
        payment_method_description: '',
        bank_account_details: '',
        nf_number: ''
      });
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (mutationError) => {
      setError(mutationError.message || 'Erro ao salvar dados de cobrança');
    }
  });

  const registerPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, data }) => {
      const updateData = {
        paid_amount: (paymentInvoice.paid_amount || 0) + parseFloat(data.amount),
        payment_date: new Date(data.date).toISOString(),
        payment_notes: data.notes ? `${paymentInvoice.payment_notes || ''}\n[${format(new Date(), 'dd/MM/yyyy')}] ${data.notes}` : paymentInvoice.payment_notes,
        finance_status: data.is_full_payment ? 'paid_full' : 'paid_partial',
      };

      if (data.is_full_payment) {
        updateData.status = 'paga';
      }

      await base44.entities.SupplierInvoice.update(invoiceId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierInvoices'] });
      setSuccess('Pagamento registrado com sucesso!');
      setShowPaymentDialog(false);
      setPaymentInvoice(null);
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (mutationError) => {
      setError(mutationError.message || 'Erro ao registrar pagamento');
    }
  });

  const updateBookingPriceMutation = useMutation({
    mutationFn: async ({ id, price }) => {
      await base44.entities.SupplierOwnBooking.update(id, {
        price: parseFloat(price)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billableRequests'] });
      setSuccess('Valor da viagem atualizado com sucesso!');
      setShowEditBookingDialog(false);
      setEditingBooking(null);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (mutationError) => {
      setError(mutationError.message || 'Erro ao atualizar valor');
    }
  });

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (invoiceFilters.finance_status !== 'all' && inv.finance_status !== invoiceFilters.finance_status) return false;
      if (!inv.finance_status && invoiceFilters.finance_status === 'pending') {
        if (inv.status === 'paga') return false;
      }

      if (invoiceFilters.start && new Date(inv.created_date) < parseDateOnly(invoiceFilters.start)) return false;
      if (invoiceFilters.end) {
        const endDate = parseDateOnly(invoiceFilters.end);
        endDate.setHours(23, 59, 59, 999);
        if (new Date(inv.created_date) > endDate) return false;
      }

      return true;
    });
  }, [invoices, invoiceFilters]);

  const invoiceTotals = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => {
      const total = inv.total_amount || 0;
      const paid = inv.paid_amount || 0;
      const pending = total - paid;

      return {
        total: acc.total + total,
        paid: acc.paid + paid,
        pending: acc.pending + (pending > 0 ? pending : 0)
      };
    }, { total: 0, paid: 0, pending: 0 });
  }, [filteredInvoices]);

  const handleOpenReview = (request) => {
    setReviewingRequest(request);
    const initialApprovedExpenses = request.driver_reported_additional_expenses
      ? request.driver_reported_additional_expenses.map(exp => ({ ...exp, value: parseFloat(exp.value) || 0 }))
      : [];
    setApprovedExpenses(initialApprovedExpenses);
    setReviewNotes('');
    setReviewError('');
    setShowReviewDialog(true);
  };

  const handleAddExpenseInReview = () => {
    setReviewError('');
    const value = parseFloat(newExpense.value);

    if (newExpense.type === 'hora_espera') {
      const quantityMinutes = parseInt(newExpense.quantity_minutes);
      if (isNaN(quantityMinutes) || quantityMinutes <= 0) {
        setReviewError('Informe a quantidade de minutos de espera');
        return;
      }
      if (isNaN(value) || value <= 0) {
        setReviewError('Informe o valor da hora de espera');
        return;
      }
      setApprovedExpenses([...approvedExpenses, { ...newExpense, value, quantity_minutes: quantityMinutes }]);
    } else {
      if (isNaN(value) || value <= 0) {
        setReviewError('Informe o valor da despesa');
        return;
      }
      if (newExpense.type === 'outros' && !newExpense.description.trim()) {
        setReviewError('Informe a descrição da despesa');
        return;
      }
      setApprovedExpenses([...approvedExpenses, { ...newExpense, value }]);
    }

    setNewExpense({ type: 'estacionamento', value: '', quantity_minutes: '', description: '' });
  };

  const handleRemoveExpenseInReview = (index) => {
    setApprovedExpenses(approvedExpenses.filter((_, i) => i !== index));
  };

  const handleEditExpenseValue = (index, newValue) => {
    const updated = [...approvedExpenses];
    updated[index] = { ...updated[index], value: parseFloat(newValue) || 0 };
    setApprovedExpenses(updated);
  };

  const calculateApprovedExpensesTotal = () => {
    return approvedExpenses.reduce((total, expense) => total + (parseFloat(expense.value) || 0), 0);
  };

  const handleApproveReview = async () => {
    setReviewError('');

    if (approvedExpenses.some(e => isNaN(parseFloat(e.value)) || parseFloat(e.value) <= 0)) {
      setReviewError('Todas as despesas devem ter um valor definido maior que zero.');
      return;
    }

    setIsApprovingReview(true);
    try {
      await approveReviewMutation.mutateAsync({
        requestId: reviewingRequest.id,
        approvedExpenses,
        reviewNotes: reviewNotes.trim() || null
      });
    } finally {
      setIsApprovingReview(false);
    }
  };

  const handleCreateInvoice = () => {
    if (selectedRequests.length === 0) {
      setError('Selecione pelo menos uma viagem para criar a fatura.');
      return;
    }
    setError('');
    setSendOption('');
    setPreviewPdfUrl(null);
    setShowInvoiceDialog(true);
  };

  const handleCreateManualInvoice = () => {
    setError('');

    if (!manualInvoiceData.manual_client_name.trim()) {
      setError('Informe o cliente da fatura manual.');
      return;
    }

    if (!manualInvoiceData.manual_description.trim()) {
      setError('Informe a descrição da fatura manual.');
      return;
    }

    if (!manualInvoiceData.total_amount || parseFloat(manualInvoiceData.total_amount) <= 0) {
      setError('Informe um valor total válido para a fatura manual.');
      return;
    }

    if (!manualInvoiceData.due_date) {
      setError('Informe a data de vencimento da fatura manual.');
      return;
    }

    if (!manualInvoiceData.payment_method_description) {
      setError('Informe a forma de recebimento da fatura manual.');
      return;
    }

    createManualInvoiceMutation.mutate(manualInvoiceData);
  };

  const handlePreviewPDF = async () => {
    setError('');

    if (!invoiceData.period_start || !invoiceData.period_end) {
      setError('Preencha o período de início e fim da fatura para visualizar a prévia.');
      return;
    }

    if (parseDateOnly(invoiceData.period_start) > parseDateOnly(invoiceData.period_end)) {
      setError('A data de início não pode ser depois da data de fim.');
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const groupingTypeMap = {
        none: 'none',
        client: 'client',
        billing_responsible: 'billing_responsible',
        month: 'month',
        cost_center: 'cost_center',
        billing_method: 'billing_method'
      };

      const response = await base44.functions.invoke('generateSupplierInvoicePDF', {
        serviceRequestIds: selectedRequests,
        groupingType: groupingTypeMap[groupBy] || 'none',
        recipientEmail: null,
        sendEmail: false,
        period_start: invoiceData.period_start,
        period_end: invoiceData.period_end
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setShowPreviewDialog(true);
    } catch (previewError) {
      console.error('Erro ao gerar prévia:', previewError);
      setError(previewError.message || 'Erro ao gerar prévia do relatório');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGeneratePDF = async () => {
    setError('');

    if (!invoiceData.period_start || !invoiceData.period_end) {
      setError('Preencha o período de início e fim da fatura.');
      return;
    }

    if (parseDateOnly(invoiceData.period_start) > parseDateOnly(invoiceData.period_end)) {
      setError('A data de início não pode ser depois da data de fim.');
      return;
    }

    if (sendOption === 'email') {
      if (!invoiceData.external_reviewer_email || !/\S+@\S+\.\S+/.test(invoiceData.external_reviewer_email)) {
        setError('Informe um e-mail válido para enviar o relatório.');
        return;
      }
    }

    setIsGeneratingPDF(true);

    try {
      const reviewerEmail = sendOption === 'email' ? invoiceData.external_reviewer_email : (user?.email || 'interno@sistema.com');

      const invoiceResult = await createInvoiceMutation.mutateAsync({
        supplier_id: supplier.id,
        service_request_ids: selectedRequests,
        period_start: invoiceData.period_start,
        period_end: invoiceData.period_end,
        external_reviewer_email: reviewerEmail
      });

      if (!invoiceResult || !invoiceResult.invoice) {
        throw new Error('Falha ao registrar a fatura no sistema.');
      }

      const groupingTypeMap = {
        none: 'none',
        client: 'client',
        billing_responsible: 'billing_responsible',
        month: 'month',
        cost_center: 'cost_center',
        billing_method: 'billing_method'
      };

      const response = await base44.functions.invoke('generateSupplierInvoicePDF', {
        invoiceId: invoiceResult.invoice.id,
        serviceRequestIds: selectedRequests,
        groupingType: groupingTypeMap[groupBy] || 'none',
        recipientEmail: sendOption === 'email' ? invoiceData.external_reviewer_email : null,
        sendEmail: sendOption === 'email',
        period_start: invoiceData.period_start,
        period_end: invoiceData.period_end,
        invoiceNumber: invoiceResult.invoice.invoice_number
      });

      if (sendOption === 'email') {
        if (response.data.success) {
          if (response.data.pdfUrl) {
            try {
              await base44.entities.SupplierInvoice.update(invoiceResult.invoice.id, {
                invoice_document_url: response.data.pdfUrl
              });
            } catch (updateError) {
              console.error('Erro ao salvar URL do PDF na fatura (email):', updateError);
            }
          }

          setSuccess(`✅ Fatura #${invoiceResult.invoice.invoice_number} gerada e enviada para ${invoiceData.external_reviewer_email}!`);
          setShowInvoiceDialog(false);
          setSelectedRequests([]);
          setInvoiceData({ period_start: '', period_end: '', external_reviewer_email: '' });
          setSendOption('');
          setTimeout(() => setSuccess(''), 5000);
        } else {
          throw new Error(response.data.error || 'Erro ao enviar relatório');
        }
      } else {
        const blob = new Blob([response.data], { type: 'application/pdf' });

        try {
          const file = new File([blob], `Fatura_${invoiceResult.invoice.invoice_number}.pdf`, { type: 'application/pdf' });
          const uploadRes = await base44.integrations.Core.UploadFile({ file });

          if (uploadRes && uploadRes.file_url) {
            await base44.entities.SupplierInvoice.update(invoiceResult.invoice.id, {
              invoice_document_url: uploadRes.file_url
            });
          }
        } catch (uploadError) {
          console.error('Erro ao fazer upload/salvar PDF da fatura (download):', uploadError);
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Fatura_${invoiceResult.invoice.invoice_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        setSuccess(`✅ Fatura #${invoiceResult.invoice.invoice_number} gerada com sucesso! Download iniciado.`);
        setShowInvoiceDialog(false);
        setSelectedRequests([]);
        setInvoiceData({ period_start: '', period_end: '', external_reviewer_email: '' });
        setSendOption('');
        setTimeout(() => setSuccess(''), 5000);
      }

      queryClient.invalidateQueries({ queryKey: ['billableRequests'] });
      queryClient.invalidateQueries({ queryKey: ['supplierInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['allSupplierServiceRequests'] });
    } catch (generateError) {
      console.error('Erro ao processar fatura/PDF:', generateError);
      setError(generateError.message || 'Erro ao processar fatura e relatório');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleViewInvoiceDetails = (invoice) => {
    setSelectedInvoiceForDetails(invoice);
    setShowInvoiceDetailsDialog(true);
  };

  const handleOpenCompleteInvoice = (invoice) => {
    setCompletingInvoice(invoice);
    setInvoiceCompleteData({
      due_date: invoice.due_date || '',
      receipt_number: invoice.receipt_number || '',
      payment_method_description: invoice.payment_method_description || '',
      bank_account_details: invoice.bank_account_details || '',
      nf_number: invoice.nf_number || ''
    });
    setShowCompleteInvoiceDialog(true);
  };

  const handleSaveCompleteInvoice = () => {
    setError('');

    if (!invoiceCompleteData.due_date) {
      setError('Preencha a data de vencimento');
      return;
    }

    if (!invoiceCompleteData.payment_method_description) {
      setError('Preencha a forma de recebimento');
      return;
    }

    completeInvoiceMutation.mutate({
      invoiceId: completingInvoice.id,
      data: invoiceCompleteData
    });
  };

  const handleOpenPaymentDialog = (invoice) => {
    setPaymentInvoice(invoice);
    const remaining = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
    setPaymentFormData({
      amount: remaining > 0 ? remaining.toFixed(2) : '0.00',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      is_full_payment: true
    });
    setShowPaymentDialog(true);
  };

  const handleRegisterPayment = () => {
    if (!paymentFormData.amount || parseFloat(paymentFormData.amount) <= 0) {
      alert('Informe um valor válido');
      return;
    }
    registerPaymentMutation.mutate({
      invoiceId: paymentInvoice.id,
      data: paymentFormData
    });
  };

  const handleViewInvoicePDF = async (invoice) => {
    setIsGeneratingPDF(true);
    try {
      const allIds = [
        ...(invoice.related_service_requests_ids || []),
        ...(invoice.related_supplier_own_booking_ids || [])
      ];

      if (allIds.length === 0) {
        alert('Esta fatura não possui viagens vinculadas.');
        return;
      }

      const response = await base44.functions.invoke('generateSupplierInvoicePDF', {
        invoiceId: invoice.id,
        serviceRequestIds: allIds,
        groupingType: 'none',
        recipientEmail: null,
        sendEmail: false,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        invoiceNumber: invoice.invoice_number
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (pdfError) {
      console.error('Erro ao visualizar PDF:', pdfError);
      alert('Erro ao gerar visualização do relatório: ' + pdfError.message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleOpenEditBooking = (booking) => {
    setEditingBooking(booking);
    setEditPriceValue(booking.chosen_supplier_cost || 0);
    setShowEditBookingDialog(true);
  };

  const handleSaveEditBooking = () => {
    if (parseFloat(editPriceValue) < 0 || isNaN(parseFloat(editPriceValue))) {
      alert('Informe um valor válido');
      return;
    }
    updateBookingPriceMutation.mutate({
      id: editingBooking.id,
      price: editPriceValue
    });
  };

  const getFinanceStatusBadge = (status) => {
    const map = {
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      paid_partial: { label: 'Parcial', className: 'bg-blue-100 text-blue-800' },
      paid_full: { label: 'Pago', className: 'bg-green-100 text-green-800' }
    };
    const config = map[status] || map.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getInvoiceStatusBadge = (status) => {
    const configs = {
      rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-800 border-gray-300' },
      aguardando_aprovacao_externa: { label: 'Aguardando Aprovação', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      aprovada_externamente: { label: 'Aprovada', className: 'bg-green-100 text-green-800 border-green-300' },
      rejeitada: { label: 'Rejeitada', className: 'bg-red-100 text-red-800 border-red-300' },
      faturado_aguardando_pgto: { label: 'Faturada - Aguardando Pagamento', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      paga: { label: 'Paga', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      disputada: { label: 'Disputada', className: 'bg-orange-100 text-orange-800 border-orange-300' }
    };
    const config = configs[status] || configs.rascunho;
    return <Badge className={`${config.className} border`}>{config.label}</Badge>;
  };

  const getExpenseTypeLabel = (type) => {
    const labels = {
      estacionamento: 'Estacionamento',
      pedagio: 'Pedágio',
      hora_espera: 'Hora Parada/Espera',
      outros: 'Outros'
    };
    return labels[type] || type;
  };

  const parseDateOnly = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDateOnly = (dateString) => {
    const parsedDate = parseDateOnly(dateString);
    return parsedDate ? format(parsedDate, 'dd/MM/yyyy', { locale: ptBR }) : '-';
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

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
          <div className="flex items-center gap-3 mb-2">
            <Receipt className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Gerenciar Faturamento</h1>
          </div>
          <p className="text-gray-600">{supplier?.name} - Gerencie suas faturas e cobranças</p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && !showInvoiceDialog && !showReviewDialog && !showManualInvoiceDialog && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="billable" className="space-y-6">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3">
            <TabsTrigger value="review" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Revisão ({requestsAwaitingReview.length})
            </TabsTrigger>
            <TabsTrigger value="billable" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Faturáveis ({billableRequests.length})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Faturas ({invoices.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="review">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-orange-600" />
                  Viagens Aguardando Revisão de Valores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requestsAwaitingReview.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">Nenhuma viagem aguardando revisão</p>
                    <p className="text-sm">Todas as viagens finalizadas já foram revisadas.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requestsAwaitingReview.map((request) => (
                      <Card key={request.id} className="border-2 border-orange-300 bg-orange-50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="font-mono font-bold text-orange-700 text-lg">
                                  {request.request_number}
                                </span>
                                <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Aguardando Revisão
                                </Badge>
                              </div>

                              <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <div className="text-gray-600 mb-1">Passageiro:</div>
                                  <div className="font-semibold">{request.passenger_name}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600 mb-1">Data:</div>
                                  <div className="font-semibold">
                                    {formatDateOnly(request.date)} às {request.time}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-600 mb-1">Rota:</div>
                                  <div className="font-semibold text-xs">
                                    {request.origin} → {request.destination}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-600 mb-1">Valor Original:</div>
                                  <div className="font-bold text-green-600 text-lg">
                                    {formatPrice(request.chosen_supplier_cost)}
                                  </div>
                                </div>
                              </div>

                              {request.driver_reported_additional_expenses && request.driver_reported_additional_expenses.length > 0 && (
                                <div className="mt-3 bg-white border border-orange-200 rounded-lg p-3">
                                  <div className="text-xs font-semibold text-orange-900 mb-2">
                                    📋 Despesas Reportadas pelo Motorista:
                                  </div>
                                  <div className="space-y-1">
                                    {request.driver_reported_additional_expenses.map((expense, idx) => (
                                      <div key={idx} className="text-sm flex items-center justify-between">
                                        <span className="text-gray-700">
                                          • {getExpenseTypeLabel(expense.type)}
                                          {expense.description && `: ${expense.description}`}
                                          {expense.type === 'hora_espera' && ` (${expense.quantity_minutes} min)`}
                                        </span>
                                        {expense.value && (
                                          <span className="font-semibold text-orange-700">
                                            {formatPrice(expense.value)}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <Button onClick={() => handleOpenReview(request)} className="bg-orange-600 hover:bg-orange-700">
                              <Edit className="w-4 h-4 mr-2" />
                              Revisar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billable">
            <BillableTripsSection
              billableRequests={billableRequests}
              allTrips={[
                ...allSupplierServiceRequests.map(r => ({ ...r, type: 'ServiceRequest', origin_type: 'corporate' })),
                ...allSupplierOwnBookings.map(b => ({
                  ...b,
                  type: 'SupplierOwnBooking',
                  origin_type: 'own',
                  request_number: b.booking_number,
                  chosen_supplier_cost: b.price || 0,
                  total_additional_expenses_approved: 0,
                  user_id: null,
                  billing_responsible_name: b.passenger_name
                }))
              ]}
              showAllTrips={showAllTrips}
              setShowAllTrips={setShowAllTrips}
              clients={clients}
              users={users}
              filters={filters}
              setFilters={setFilters}
              groupBy={groupBy}
              setGroupBy={setGroupBy}
              selectedRequests={selectedRequests}
              setSelectedRequests={setSelectedRequests}
              onCreateInvoice={handleCreateInvoice}
              onEditBooking={handleOpenEditBooking}
              isDialogOpen={showInvoiceDialog}
            />
          </TabsContent>

          <TabsContent value="invoices">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-blue-900">Total Faturado</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{formatPrice(invoiceTotals.total)}</p>
                  <p className="text-xs text-blue-600 mt-1">No período selecionado</p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-green-900">Total Recebido</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{formatPrice(invoiceTotals.paid)}</p>
                  <p className="text-xs text-green-600 mt-1">Pagamentos confirmados</p>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-yellow-100 rounded-full">
                      <Timer className="w-5 h-5 text-yellow-600" />
                    </div>
                    <p className="text-sm font-medium text-yellow-900">A Receber</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-700">{formatPrice(invoiceTotals.pending)}</p>
                  <p className="text-xs text-yellow-600 mt-1">Pendente de pagamento</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <CardTitle>Histórico de Faturas</CardTitle>
                    <Button onClick={() => { setError(''); setShowManualInvoiceDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Lançar Fatura Manual
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-2 border rounded-md p-1 bg-white">
                      <Calendar className="w-4 h-4 text-gray-500 ml-2" />
                      <Input
                        type="date"
                        className="border-0 h-8 w-32 text-xs"
                        value={invoiceFilters.start}
                        onChange={(e) => setInvoiceFilters({ ...invoiceFilters, start: e.target.value })}
                      />
                      <span className="text-gray-400">-</span>
                      <Input
                        type="date"
                        className="border-0 h-8 w-32 text-xs"
                        value={invoiceFilters.end}
                        onChange={(e) => setInvoiceFilters({ ...invoiceFilters, end: e.target.value })}
                      />
                    </div>
                    <Select value={invoiceFilters.finance_status} onValueChange={(v) => setInvoiceFilters({ ...invoiceFilters, finance_status: v })}>
                      <SelectTrigger className="w-[180px] h-10">
                        <SelectValue placeholder="Status Financeiro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid_partial">Parcialmente Pago</SelectItem>
                        <SelectItem value="paid_full">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                    {(invoiceFilters.start || invoiceFilters.end || invoiceFilters.finance_status !== 'all') && (
                      <Button variant="ghost" size="sm" onClick={() => setInvoiceFilters({ start: '', end: '', finance_status: 'all' })}>
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredInvoices.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p>Nenhuma fatura encontrada para os filtros selecionados</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredInvoices.map((invoice) => (
                      <Card key={invoice.id} className="border-l-4 border-l-blue-600">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                            <div className="flex-1 w-full">
                              <div className="flex items-center justify-between md:justify-start gap-3 mb-2">
                                <span className="font-mono font-bold text-blue-600 text-lg">
                                  {invoice.invoice_number}
                                </span>
                                <div className="flex gap-2 flex-wrap">
                                  {invoice.invoice_type === 'manual' && (
                                    <Badge className="bg-slate-100 text-slate-700 border border-slate-300">Manual</Badge>
                                  )}
                                  {getInvoiceStatusBadge(invoice.status)}
                                  {getFinanceStatusBadge(invoice.finance_status || 'pending')}
                                </div>
                              </div>
                              {(() => {
                                let clientName = invoice.manual_client_name || null;
                                let isParticular = invoice.invoice_type === 'manual';

                                if (!clientName && invoice.client_id) {
                                  clientName = clients.find(c => c.id === invoice.client_id)?.name;
                                }

                                if (!clientName && invoice.related_service_requests_ids?.length > 0) {
                                  const firstReqId = invoice.related_service_requests_ids[0];
                                  const req = allSupplierServiceRequests.find(r => r.id === firstReqId);
                                  if (req && req.client_id) {
                                    clientName = clients.find(c => c.id === req.client_id)?.name;
                                  }
                                }

                                if (!clientName && invoice.related_supplier_own_booking_ids?.length > 0) {
                                  const firstBookingId = invoice.related_supplier_own_booking_ids[0];
                                  const booking = allSupplierOwnBookings.find(b => b.id === firstBookingId);
                                  if (booking) {
                                    if (booking.client_id) {
                                      clientName = clients.find(c => c.id === booking.client_id)?.name;
                                    }
                                    if (!clientName) {
                                      clientName = booking.passenger_name || 'Cliente Particular';
                                      isParticular = true;
                                    }
                                  }
                                }

                                if (clientName) {
                                  return (
                                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                                      {isParticular ? <Users className="w-4 h-4 text-gray-500" /> : <Building2 className="w-4 h-4 text-gray-500" />}
                                      <span className="truncate">{clientName}</span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600 block">Emissão:</span>
                                  <span className="font-medium">
                                    {format(new Date(invoice.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600 block">Vencimento:</span>
                                  <span className="font-medium">
                                    {formatDateOnly(invoice.due_date)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600 block">Valor Total:</span>
                                  <span className="font-bold text-blue-700">
                                    {formatPrice(invoice.total_amount)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600 block">Recebido:</span>
                                  <span className={`font-bold ${(invoice.paid_amount || 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                    {formatPrice(invoice.paid_amount || 0)}
                                  </span>
                                </div>
                              </div>
                              {invoice.paid_amount > 0 && invoice.paid_amount < invoice.total_amount && (
                                <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
                                  <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${Math.min((invoice.paid_amount / invoice.total_amount) * 100, 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                              <Button
                                onClick={() => handleViewInvoiceDetails(invoice)}
                                variant="outline"
                                size="sm"
                                className="flex-1 md:flex-none"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Detalhes
                              </Button>

                              {invoice.finance_status !== 'paid_full' && invoice.status !== 'rascunho' && invoice.status !== 'rejeitada' && (
                                <Button
                                  onClick={() => handleOpenPaymentDialog(invoice)}
                                  className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none"
                                  size="sm"
                                >
                                  <DollarSign className="w-4 h-4 mr-2" />
                                  Receber
                                </Button>
                              )}

                              {invoice.status === 'aguardando_aprovacao_externa' && (
                                <Button
                                  onClick={() => approveInvoiceMutation.mutate(invoice)}
                                  disabled={approveInvoiceMutation.isPending}
                                  className="bg-blue-600 hover:bg-blue-700 flex-1 md:flex-none"
                                  size="sm"
                                >
                                  {approveInvoiceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                  Aprovar
                                </Button>
                              )}

                              {invoice.status === 'aprovada_externamente' && (
                                <Button
                                  onClick={() => handleOpenCompleteInvoice(invoice)}
                                  className="bg-indigo-600 hover:bg-indigo-700 flex-1 md:flex-none"
                                  size="sm"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Dados
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ReviewDialog
          showReviewDialog={showReviewDialog}
          setShowReviewDialog={setShowReviewDialog}
          reviewingRequest={reviewingRequest}
          setReviewingRequest={setReviewingRequest}
          approvedExpenses={approvedExpenses}
          setApprovedExpenses={setApprovedExpenses}
          newExpense={newExpense}
          setNewExpense={setNewExpense}
          reviewNotes={reviewNotes}
          setReviewNotes={setReviewNotes}
          reviewError={reviewError}
          setReviewError={setReviewError}
          isApprovingReview={isApprovingReview}
          handleAddExpenseInReview={handleAddExpenseInReview}
          handleRemoveExpenseInReview={handleRemoveExpenseInReview}
          handleEditExpenseValue={handleEditExpenseValue}
          calculateApprovedExpensesTotal={calculateApprovedExpensesTotal}
          handleApproveReview={handleApproveReview}
        />

        <ManualInvoiceDialog
          open={showManualInvoiceDialog}
          onOpenChange={setShowManualInvoiceDialog}
          data={manualInvoiceData}
          setData={setManualInvoiceData}
          onSubmit={handleCreateManualInvoice}
          isPending={createManualInvoiceMutation.isPending}
          error={showManualInvoiceDialog ? error : ''}
        />

        <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Receipt className="w-6 h-6 text-blue-600" />
                Gerar Relatório de Faturamento
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📊 Resumo</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Viagens Selecionadas:</span>
                    <span className="font-bold text-blue-900">{selectedRequests.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Valor Total:</span>
                    <span className="font-bold text-green-600 text-lg">
                      {formatPrice(
                        (showAllTrips ? [...allSupplierServiceRequests, ...allSupplierOwnBookings] : billableRequests)
                          .filter(r => selectedRequests.includes(r.id))
                          .reduce((sum, r) => sum + ((r.chosen_supplier_cost || r.price || 0) + ((r.type === 'SupplierOwnBooking' ? 0 : r.total_additional_expenses_approved) || 0)), 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Agrupamento:</span>
                    <span className="font-semibold text-blue-900">
                      {groupBy === 'none' ? 'Sem Agrupamento' :
                        groupBy === 'client' ? 'Por Cliente' :
                        groupBy === 'billing_responsible' ? 'Por Responsável Financeiro' :
                        groupBy === 'cost_center' ? 'Por Centro de Custo' :
                        groupBy === 'billing_method' ? 'Por Método de Faturamento' :
                        groupBy === 'month' ? 'Por Mês' : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period_start">Data de Início *</Label>
                  <Input
                    id="period_start"
                    type="date"
                    value={invoiceData.period_start}
                    onChange={(e) => setInvoiceData({ ...invoiceData, period_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period_end">Data de Fim *</Label>
                  <Input
                    id="period_end"
                    type="date"
                    value={invoiceData.period_end}
                    onChange={(e) => setInvoiceData({ ...invoiceData, period_end: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Como deseja enviar o relatório?</Label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSendOption('email')}
                    className={`p-4 border-2 rounded-lg transition-all ${sendOption === 'email' ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${sendOption === 'email' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <Mail className={`w-6 h-6 ${sendOption === 'email' ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <span className={`font-semibold ${sendOption === 'email' ? 'text-blue-900' : 'text-gray-700'}`}>
                        Enviar por E-mail
                      </span>
                      <span className="text-xs text-gray-500 text-center">Envio automático para o destinatário</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendOption('download')}
                    className={`p-4 border-2 rounded-lg transition-all ${sendOption === 'download' ? 'border-green-600 bg-green-50 shadow-md' : 'border-gray-300 hover:border-green-300 hover:bg-gray-50'}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${sendOption === 'download' ? 'bg-green-600' : 'bg-gray-300'}`}>
                        <FileText className={`w-6 h-6 ${sendOption === 'download' ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <span className={`font-semibold ${sendOption === 'download' ? 'text-green-900' : 'text-gray-700'}`}>
                        Gerar PDF
                      </span>
                      <span className="text-xs text-gray-500 text-center">Download para envio posterior</span>
                    </div>
                  </button>
                </div>
              </div>

              {sendOption === 'email' && (
                <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <Label htmlFor="external_reviewer_email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    E-mail do Destinatário *
                  </Label>
                  <Input
                    id="external_reviewer_email"
                    type="email"
                    value={invoiceData.external_reviewer_email}
                    onChange={(e) => setInvoiceData({ ...invoiceData, external_reviewer_email: e.target.value })}
                    placeholder="financeiro@empresa.com"
                    className="bg-white"
                  />
                  <p className="text-xs text-blue-700">📧 O relatório será enviado automaticamente para este e-mail</p>
                </div>
              )}

              {sendOption === 'download' && (
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    📥 O PDF será gerado e baixado automaticamente para seu dispositivo
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowInvoiceDialog(false);
                  setSendOption('');
                  setPreviewPdfUrl(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePreviewPDF}
                disabled={isGeneratingPDF}
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar Prévia
                  </>
                )}
              </Button>
              <Button onClick={handleGeneratePDF} disabled={isGeneratingPDF || !sendOption} className="bg-blue-600 hover:bg-blue-700">
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : sendOption === 'email' ? (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Gerar e Enviar por E-mail
                  </>
                ) : sendOption === 'download' ? (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar e Baixar PDF
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar Relatório
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Eye className="w-6 h-6 text-purple-600" />
                Prévia do Relatório
              </DialogTitle>
            </DialogHeader>

            <div className="w-full h-[75vh] border-2 border-gray-300 rounded-lg overflow-hidden">
              {previewPdfUrl ? (
                <iframe src={previewPdfUrl} className="w-full h-full" title="Prévia do Relatório" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPreviewDialog(false);
                  if (previewPdfUrl) {
                    window.URL.revokeObjectURL(previewPdfUrl);
                    setPreviewPdfUrl(null);
                  }
                }}
              >
                Fechar Prévia
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-green-600" />
                Registrar Recebimento
              </DialogTitle>
            </DialogHeader>

            {paymentInvoice && (
              <div className="space-y-4 py-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Total da Fatura:</span>
                    <span className="font-semibold">{formatPrice(paymentInvoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Já Recebido:</span>
                    <span className="text-green-600 font-semibold">{formatPrice(paymentInvoice.paid_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="font-bold">Restante:</span>
                    <span className="font-bold text-blue-600">
                      {formatPrice((paymentInvoice.total_amount || 0) - (paymentInvoice.paid_amount || 0))}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Valor do Pagamento (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data do Recebimento</Label>
                  <Input
                    type="date"
                    value={paymentFormData.date}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    placeholder="Ex: TED recebido do cliente..."
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="full_payment"
                    checked={paymentFormData.is_full_payment}
                    onCheckedChange={(checked) => setPaymentFormData({ ...paymentFormData, is_full_payment: checked })}
                  />
                  <Label htmlFor="full_payment" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Marcar como quitação total
                  </Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancelar</Button>
              <Button onClick={handleRegisterPayment} className="bg-green-600 hover:bg-green-700" disabled={registerPaymentMutation.isPending}>
                {registerPaymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Confirmar Recebimento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCompleteInvoiceDialog} onOpenChange={setShowCompleteInvoiceDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Receipt className="w-6 h-6 text-blue-600" />
                Completar Dados de Cobrança - {completingInvoice?.invoice_number}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Preencha os dados necessários para o cliente efetuar o pagamento desta fatura.
                </AlertDescription>
              </Alert>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-green-800 font-semibold">Valor Total da Fatura:</span>
                  <span className="text-3xl font-bold text-green-700">{formatPrice(completingInvoice?.total_amount || 0)}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Data de Vencimento *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={invoiceCompleteData.due_date}
                    onChange={(e) => setInvoiceCompleteData({ ...invoiceCompleteData, due_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt_number">Número da Nota/Recibo</Label>
                  <Input
                    id="receipt_number"
                    value={invoiceCompleteData.receipt_number}
                    onChange={(e) => setInvoiceCompleteData({ ...invoiceCompleteData, receipt_number: e.target.value })}
                    placeholder="Ex: NF-12345"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nf_number">Número da NF Emitida</Label>
                  <Input
                    id="nf_number"
                    value={invoiceCompleteData.nf_number}
                    onChange={(e) => setInvoiceCompleteData({ ...invoiceCompleteData, nf_number: e.target.value })}
                    placeholder="Ex: 001234"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Forma de Recebimento *</Label>
                  <Select value={invoiceCompleteData.payment_method_description} onValueChange={(value) => setInvoiceCompleteData({ ...invoiceCompleteData, payment_method_description: value })}>
                    <SelectTrigger id="payment_method">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="TED">TED</SelectItem>
                      <SelectItem value="DOC">DOC</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Crédito em Conta">Crédito em Conta</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_account_details">Detalhes da Conta/Chave PIX para Recebimento</Label>
                <Textarea
                  id="bank_account_details"
                  value={invoiceCompleteData.bank_account_details}
                  onChange={(e) => setInvoiceCompleteData({ ...invoiceCompleteData, bank_account_details: e.target.value })}
                  placeholder="Ex: Banco Itaú - Ag: 1234 - Conta: 12345-6 ou Chave PIX: cnpj@empresa.com.br"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCompleteInvoiceDialog(false);
                  setCompletingInvoice(null);
                  setInvoiceCompleteData({
                    due_date: '',
                    receipt_number: '',
                    payment_method_description: '',
                    bank_account_details: '',
                    nf_number: ''
                  });
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveCompleteInvoice} disabled={completeInvoiceMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {completeInvoiceMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Salvar e Finalizar Fatura
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showInvoiceDetailsDialog} onOpenChange={setShowInvoiceDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Fatura</DialogTitle>
            </DialogHeader>

            {selectedInvoiceForDetails && (
              <div className="space-y-4 py-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Número da Fatura</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="font-mono font-bold text-lg text-blue-600">{selectedInvoiceForDetails.invoice_number}</p>
                        {selectedInvoiceForDetails.invoice_type === 'manual' && (
                          <Badge className="bg-slate-100 text-slate-700 border border-slate-300">Manual</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      {getInvoiceStatusBadge(selectedInvoiceForDetails.status)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Período</p>
                      <p className="font-medium">
                        {formatDateOnly(selectedInvoiceForDetails.period_start)} - {formatDateOnly(selectedInvoiceForDetails.period_end)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Valor Total</p>
                      <p className="font-bold text-2xl text-green-600">{formatPrice(selectedInvoiceForDetails.total_amount)}</p>
                    </div>
                  </div>
                </div>

                {selectedInvoiceForDetails.invoice_type === 'manual' ? (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Dados do Lançamento Manual</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Cliente</p>
                            <p className="font-semibold text-gray-900">{selectedInvoiceForDetails.manual_client_name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">CPF / CNPJ</p>
                            <p className="font-medium text-gray-900">{selectedInvoiceForDetails.manual_client_document || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">E-mail</p>
                            <p className="font-medium text-gray-900">{selectedInvoiceForDetails.manual_client_email || '-'}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Forma de Recebimento</p>
                            <p className="font-medium text-gray-900">{selectedInvoiceForDetails.payment_method_description || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Número do Recibo</p>
                            <p className="font-medium text-gray-900">{selectedInvoiceForDetails.receipt_number || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Número da NF</p>
                            <p className="font-medium text-gray-900">{selectedInvoiceForDetails.nf_number || '-'}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Descrição</p>
                          <p className="font-medium text-gray-900 whitespace-pre-line">{selectedInvoiceForDetails.manual_description || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Dados para Recebimento</p>
                          <p className="font-medium text-gray-900 whitespace-pre-line">{selectedInvoiceForDetails.bank_account_details || '-'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold">Solicitações Incluídas ({(selectedInvoiceForDetails.related_service_requests_ids?.length || 0) + (selectedInvoiceForDetails.related_supplier_own_booking_ids?.length || 0)})</h4>
                      <Button variant="outline" size="sm" onClick={() => handleViewInvoicePDF(selectedInvoiceForDetails)} disabled={isGeneratingPDF}>
                        {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                        Visualizar Relatório PDF
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead>Nº Solicitação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Rota</TableHead>
                            <TableHead>Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedInvoiceForDetails.related_service_requests_ids && selectedInvoiceForDetails.related_service_requests_ids.length > 0 ? (
                            selectedInvoiceForDetails.related_service_requests_ids.map((srId) => {
                              const sr = allSupplierServiceRequests.find(s => s.id === srId);
                              if (!sr) {
                                return <TableRow key={srId}><TableCell colSpan={4} className="text-gray-500">Solicitação não encontrada</TableCell></TableRow>;
                              }
                              return (
                                <TableRow key={sr.id}>
                                  <TableCell>
                                    <span className="font-mono text-sm">{sr.request_number}</span>
                                  </TableCell>
                                  <TableCell>{formatDateOnly(sr.date)}</TableCell>
                                  <TableCell className="text-sm">{sr.origin} → {sr.destination}</TableCell>
                                  <TableCell className="font-semibold text-green-600">
                                    {formatPrice(sr.chosen_supplier_cost + (sr.total_additional_expenses_approved || 0))}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-4">Nenhuma solicitação encontrada para esta fatura.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInvoiceDetailsDialog(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditBookingDialog} onOpenChange={setShowEditBookingDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Editar Valor da Viagem</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Novo Valor (R$)</Label>
                <Input type="number" step="0.01" value={editPriceValue} onChange={(e) => setEditPriceValue(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditBookingDialog(false)}>Cancelar</Button>
              <Button onClick={handleSaveEditBooking} className="bg-blue-600 hover:bg-blue-700" disabled={updateBookingPriceMutation.isPending}>
                {updateBookingPriceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}