import React, { useState, useEffect, useTransition } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import GenericTable from '@/components/ui/GenericTable';
import StatusBadge from '@/components/ui/StatusBadge';
import TripDetailsDisplay from '@/components/TripDetailsDisplay';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import {
  Loader2,
  Eye,
  DollarSign,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  AlertCircle,
  Pencil,
  Link as LinkIcon,
  Trash2,
  Plus,
  ArrowRight,
  Plane,
  FileText,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import QuoteDialog from '@/components/quotes/QuoteDialog';
import QuotePrintTemplate from '@/components/quotes/QuotePrintTemplate';
import QuoteTable from '@/components/quotes/QuoteTable';

export default function GerenciarCotacoes() {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [quotePrice, setQuotePrice] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [agencyPrices, setAgencyPrices] = useState({}); // { legIndex: { vehicleType: price } }

  // Estado de edição
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingQuoteData, setEditingQuoteData] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  // Novos estados para parceiros
  const [showPartnerDialog, setShowPartnerDialog] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [partnerCost, setPartnerCost] = useState('');
  const [partnerMargin, setPartnerMargin] = useState('');
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  
  // Estado para impressão
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printingQuote, setPrintingQuote] = useState(null);

  // Estado para inputs manuais de itens adicionais na edição
  const [manualItemInputs, setManualItemInputs] = useState({}); 

  const updateManualInput = (key, field, value) => {
    setManualItemInputs(prev => ({
      ...prev,
      [key]: { 
        name: field === 'name' ? value : (prev[key]?.name || ''), 
        price: field === 'price' ? value : (prev[key]?.price || ''), 
        quantity: field === 'quantity' ? value : (prev[key]?.quantity || 1) 
      }
    }));
  };

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const queryClient = useQueryClient();

  const { data: allQuoteRequests = [], isLoading } = useQuery({
    queryKey: ['quoteRequests'],
    queryFn: () => base44.entities.QuoteRequest.list('-created_date'),
    initialData: [],
  });

  const quoteRequests = React.useMemo(() => {
    let filteredQuotes = allQuoteRequests;

    if (customerNameFilter) {
      filteredQuotes = filteredQuotes.filter(quote =>
        quote.customer_name?.toLowerCase().includes(customerNameFilter.toLowerCase())
      );
    }

    if (routeFilter) {
      filteredQuotes = filteredQuotes.filter(quote =>
        (quote.origin?.toLowerCase().includes(routeFilter.toLowerCase())) ||
        (quote.destination?.toLowerCase().includes(routeFilter.toLowerCase())) ||
        (quote.quoted_trips && quote.quoted_trips.some(trip =>
          trip.origin?.toLowerCase().includes(routeFilter.toLowerCase()) ||
          trip.destination?.toLowerCase().includes(routeFilter.toLowerCase())
        )) ||
        (quote.agency_quoted_legs && quote.agency_quoted_legs.some(leg =>
          leg.origin?.toLowerCase().includes(routeFilter.toLowerCase()) ||
          leg.destination?.toLowerCase().includes(routeFilter.toLowerCase())
        ))
      );
    }

    if (dateFilter) {
      filteredQuotes = filteredQuotes.filter(quote => {
        const filterDate = dateFilter.split('T')[0];
        if (quote.date && quote.date.includes(filterDate)) return true;
        if (quote.return_date && quote.return_date.includes(filterDate)) return true;
        if (quote.quoted_trips && quote.quoted_trips.some(trip => trip.date && trip.date.includes(filterDate))) return true;
        if (quote.agency_quoted_legs && quote.agency_quoted_legs.some(leg => leg.date && leg.date.includes(filterDate))) return true;
        return false;
      });
    }

    return filteredQuotes;
  }, [allQuoteRequests, customerNameFilter, routeFilter, dateFilter]);

  // Buscar lista de parceiros (Subcontratados)
  const { data: partners = [] } = useQuery({
    queryKey: ['subcontractors'],
    queryFn: () => base44.entities.Subcontractor.list(),
    initialData: [],
  });

  const { data: additionalItems = [] } = useQuery({
    queryKey: ['additionalItems'],
    queryFn: () => base44.entities.AdditionalItem.filter({ active: true }),
    initialData: [],
  });

  const activePartners = partners.filter(p => p.active !== false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        let isAuthorized = currentUser.role === 'admin';

        if (!isAuthorized && currentUser.supplier_id) {
           const supplier = await base44.entities.Supplier.get(currentUser.supplier_id);
           if (supplier?.features?.can_manage_quotes) {
             isAuthorized = true;
           }
        }

        if (!isAuthorized) {
          window.location.href = '/';
          return;
        }
        setIsCheckingAuth(false);
      } catch (error) {
        window.location.href = '/AccessPortal?returnUrl=%2FGerenciarCotacoes';
      }
    };

    checkAuth();
  }, []);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.QuoteRequest.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
      setSuccess('Status atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao atualizar status');
    }
  });

  const submitQuoteMutation = useMutation({
    mutationFn: async ({ quoteId, price, notes }) => {
      const response = await base44.functions.invoke('createPaymentLinkForQuote', {
        quoteId,
        price,
        adminNotes: notes
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
      setSuccess('Cotação enviada com sucesso! O cliente receberá um e-mail com o link de pagamento.');
      setShowQuoteDialog(false);
      setQuotePrice('');
      setAdminNotes('');
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao enviar cotação');
    }
  });

  // Nova mutation para atribuir parceiro
  const assignPartnerMutation = useMutation({
    mutationFn: async ({ quoteId, partnerId, marginPercentage }) => {
      const partner = partners.find(p => p.id === partnerId);
      
      // Gerar token único para resposta do parceiro
      const token = btoa(`${quoteId}-${Date.now()}-${Math.random()}`);
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
      const responseUrl = `${baseUrl}/PartnerQuoteResponse?q=${quoteId}&t=${token}`;
      
      await base44.entities.QuoteRequest.update(quoteId, {
        partner_id: partnerId,
        partner_margin_percentage: marginPercentage,
        partner_status: 'aguardando_resposta',
        partner_request_sent_at: new Date().toISOString(),
        partner_response_token: token
      });
      
      // Enviar notificação ao parceiro
      try {
        await base44.functions.invoke('sendPartnerQuoteNotification', {
          quoteRequestId: quoteId,
          notificationType: 'new_assignment',
          responseUrl: responseUrl
        });
      } catch (notifError) {
        console.error('Erro ao enviar notificação ao parceiro (não crítico):', notifError);
      }
      
      return { partner, responseUrl };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
      setSuccess(`Parceiro atribuído e notificado com sucesso! Link de resposta: ${data.responseUrl}`);
      setShowPartnerDialog(false);
      setSelectedPartner('');
      setPartnerCost('');
      setPartnerMargin('');
      setTimeout(() => setSuccess(''), 8000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao atribuir parceiro');
    }
  });

  // Nova mutation para registrar resposta do parceiro
  const recordPartnerResponseMutation = useMutation({
    mutationFn: async ({ quoteId, cost }) => {
      const quote = quoteRequests.find(q => q.id === quoteId);
      const marginPercentage = quote.partner_margin_percentage || 15;
      const finalPrice = cost * (1 + marginPercentage / 100);

      await base44.entities.QuoteRequest.update(quoteId, {
        partner_cost: cost,
        partner_status: 'resposta_recebida',
        partner_response_at: new Date().toISOString(),
        admin_quote_price: finalPrice
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
      setSuccess('Resposta do parceiro registrada! Você pode ajustar o preço final antes de enviar ao cliente.');
      setShowPartnerDialog(false);
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao registrar resposta');
    }
  });

  const convertQuoteMutation = useMutation({
    mutationFn: async (quoteId) => {
      setIsConverting(true);
      try {
        const response = await base44.functions.invoke('convertQuoteToTrip', { quoteId });
        if (response.data && response.data.error) {
          throw new Error(response.data.error);
        }
        return response.data;
      } finally {
        setIsConverting(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
      const typeLabel = data.tripType === 'supplier_own_booking' ? 'Viagem Própria' : 'Solicitação de Serviço';
      setSuccess(`Cotação convertida com sucesso em ${typeLabel}! Redirecionando...`);
      
      setTimeout(() => {
        if (data.tripType === 'service_request') {
          // Admin flow
          navigate(createPageUrl('AdminDashboard') + '?editServiceRequest=' + data.trip.id);
        } else if (data.tripType === 'supplier_own_booking') {
          // Supplier flow
          navigate(createPageUrl('MinhasSolicitacoesFornecedor') + '?ownBookingId=' + data.trip.id);
        }
      }, 1500);
    },
    onError: (error) => {
      setError('Erro ao converter cotação: ' + error.message);
    }
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (id) => base44.entities.QuoteRequest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
      setSuccess('Cotação excluída com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao excluir cotação');
    }
  });

  const handleConvertQuote = (quote) => {
    if (confirm('Tem certeza que deseja converter esta cotação em uma viagem confirmada?')) {
      convertQuoteMutation.mutate(quote.id);
    }
  };



  const handlePrintQuote = (quote) => {
    startTransition(() => {
      setPrintingQuote(quote);
      setShowPrintDialog(true);
    });
  };

  const handleDeleteQuote = (quote) => {
    if (confirm(`Tem certeza que deseja excluir a cotação ${quote.quote_number}? Esta ação não pode ser desfeita.`)) {
      deleteQuoteMutation.mutate(quote.id);
    }
  };

  const handleViewDetails = (quote) => {
    startTransition(() => {
      setSelectedQuote(quote);
      setShowDetailsDialog(true);
    });
  };

  const handleOpenQuoteDialog = (quote) => {
    startTransition(() => {
      setSelectedQuote(quote);

      // Se tem parceiro, usar o preço calculado com margem
      if (quote.partner_cost && quote.partner_margin_percentage) {
        const calculatedFromPartner = quote.partner_cost * (1 + quote.partner_margin_percentage / 100);
        setQuotePrice(quote.admin_quote_price || calculatedFromPartner.toFixed(2));
      } else {
        setQuotePrice(quote.admin_quote_price || '');
      }

      if (quote.quote_format === 'agency' && quote.agency_quoted_legs) {
        const prices = {};
        quote.agency_quoted_legs.forEach((leg, idx) => {
          prices[idx] = {};
          if (leg.vehicle_options) {
            leg.vehicle_options.forEach(opt => {
              prices[idx][opt.vehicle_type_name] = opt.price || '';
            });
          }
        });
        setAgencyPrices(prices);
      }

      setAdminNotes(quote.admin_notes || '');
      setShowQuoteDialog(true);
      setError('');
    });
  };

  const handleOpenPartnerDialog = (quote) => {
    startTransition(() => {
      setSelectedQuote(quote);
      setSelectedPartner(quote.partner_id || '');
      setPartnerCost(quote.partner_cost || '');

      // Usar margem do parceiro selecionado ou margem já definida na cotação
      if (quote.partner_id && quote.partner_margin_percentage) {
        setPartnerMargin(String(quote.partner_margin_percentage));
      } else if (quote.partner_id) {
        const partner = partners.find(p => p.id === quote.partner_id);
        setPartnerMargin(String(partner?.default_margin_percentage || 15));
      } else {
        setPartnerMargin('15');
      }

      setShowPartnerDialog(true);
      setError('');
    });
  };

  const handleAssignPartner = () => {
    if (!selectedPartner) {
      setError('Selecione um parceiro');
      return;
    }
    if (!partnerMargin || parseFloat(partnerMargin) < 0) {
      setError('Informe a margem de lucro');
      return;
    }

    assignPartnerMutation.mutate({
      quoteId: selectedQuote.id,
      partnerId: selectedPartner,
      marginPercentage: parseFloat(partnerMargin)
    });
  };

  const handleRecordPartnerResponse = () => {
    if (!partnerCost || parseFloat(partnerCost) <= 0) {
      setError('Informe o custo informado pelo parceiro');
      return;
    }

    recordPartnerResponseMutation.mutate({
      quoteId: selectedQuote.id,
      cost: parseFloat(partnerCost)
    });
  };

  const handleEditQuote = (quote) => {
    startTransition(() => {
      setEditingQuoteData(JSON.parse(JSON.stringify(quote))); // Deep copy
      setGeneratedLink('');
      setShowEditDialog(true);
      // Se já tiver token, montar o link
      if (quote.public_token) {
        const link = `${window.location.origin}/PublicQuoteView?token=${quote.public_token}&id=${quote.id}`;
        setGeneratedLink(link);
      }
    });
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      // Recalcular total se for profissional/multi-trips
      let totalUpdate = {};
      
      if (editingQuoteData.quote_format === 'professional' && editingQuoteData.quoted_trips) {
        // Recalcular admin_quote_price baseado na soma dos trips (opcional, mas bom para manter consistência)
        // Mas admin_quote_price é usado para standard. Professional usa preços individuais.
        // Porém, para facilitar visualização, podemos somar.
      }

      await base44.entities.QuoteRequest.update(editingQuoteData.id, editingQuoteData);
      
      queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
      setSuccess('Cotação atualizada com sucesso!');
      setShowEditDialog(false);
      setSelectedQuote(editingQuoteData); // Atualizar view de detalhes se estiver aberta (mas edit fecha detalhes? Não, edit é sobreposto ou substitui)
      // Melhor fechar o edit e manter detalhes aberto com dados novos
      // Como selectedQuote é um estado local, precisamos atualizá-lo ou re-buscar.
      // O invalidateQueries atualiza a lista, mas selectedQuote é estático.
      // Vamos atualizar selectedQuote manualmente.
      setSelectedQuote(prev => ({ ...prev, ...editingQuoteData }));
      
    } catch (error) {
      console.error(error);
      setError('Erro ao salvar alterações: ' + error.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleGenerateNewLink = async () => {
    if (!editingQuoteData?.id) return;
    
    try {
      // Salvar primeiro para garantir que o link mostre dados atuais
      await base44.entities.QuoteRequest.update(editingQuoteData.id, editingQuoteData);
      
      const response = await base44.functions.invoke('generateQuotePublicToken', { 
        quoteId: editingQuoteData.id,
        forceNew: true 
      });
      
      if (response.data && response.data.token) {
        const link = `${window.location.origin}/PublicQuoteView?token=${response.data.token}&id=${editingQuoteData.id}`;
        setGeneratedLink(link);
        setEditingQuoteData(prev => ({ ...prev, public_token: response.data.token }));
        setSuccess('Novo link gerado com sucesso!');
      }
    } catch (error) {
      console.error(error);
      setError('Erro ao gerar novo link');
    }
  };

  // Recalcular preço quando custo ou margem mudar
  useEffect(() => {
    if (partnerCost && partnerMargin) {
      const cost = parseFloat(partnerCost) || 0;
      const margin = parseFloat(partnerMargin) || 0;
      const calculated = cost * (1 + margin / 100);
      setCalculatedPrice(calculated);
    } else {
      setCalculatedPrice(0);
    }
  }, [partnerCost, partnerMargin]);

  const handleSubmitQuote = async () => {
    if (selectedQuote.quote_format === 'agency') {
      try {
        const updatedLegs = selectedQuote.agency_quoted_legs.map((leg, legIdx) => ({
          ...leg,
          vehicle_options: leg.vehicle_options ? leg.vehicle_options.map(opt => ({
            ...opt,
            price: parseFloat(agencyPrices[legIdx]?.[opt.vehicle_type_name]) || 0
          })) : []
        }));

        await base44.entities.QuoteRequest.update(selectedQuote.id, {
          agency_quoted_legs: updatedLegs,
          status: 'cotado',
          quoted_at: new Date().toISOString(),
          admin_notes: adminNotes
        });

        // Tentar enviar notificação (opcional, pode ser via submitQuoteMutation se adaptado)
        // Por enquanto apenas atualizamos os dados para refletir no link público
        
        setSuccess('Cotação de agência atualizada com sucesso!');
        setShowQuoteDialog(false);
        queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
      } catch (e) {
        setError('Erro ao salvar cotação: ' + e.message);
      }
      return;
    }

    if (!quotePrice || parseFloat(quotePrice) <= 0) {
      setError('Por favor, insira um preço válido');
      return;
    }

    submitQuoteMutation.mutate({
      quoteId: selectedQuote.id,
      price: parseFloat(quotePrice),
      notes: adminNotes
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Funções legadas removidas em favor do componente StatusBadge

  const pendingQuotes = quoteRequests.filter(q => q.status === 'pendente' || q.status === 'em_analise');
  const quotedQuotes = quoteRequests.filter(q => q.status === 'cotado');
  const completedQuotes = quoteRequests.filter(q => ['aceito', 'convertido', 'recusado', 'cancelado'].includes(q.status));

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
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Gerenciar Cotações
              </h1>
              <p className="text-gray-600">Visualize e responda solicitações de cotação de clientes</p>
            </div>
            <Button 
              onClick={() => startTransition(() => setShowNewQuoteDialog(true))}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Cotação Manual
            </Button>
          </div>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Todas as Cotações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="customerNameFilter" className="sr-only">Buscar por Cliente</Label>
                <Input
                  id="customerNameFilter"
                  placeholder="Buscar por Cliente"
                  value={customerNameFilter}
                  onChange={(e) => setCustomerNameFilter(e.target.value)}
                  className="shadow-sm"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="routeFilter" className="sr-only">Buscar por Trajeto</Label>
                <Input
                  id="routeFilter"
                  placeholder="Buscar por Trajeto (Origem ou Destino)"
                  value={routeFilter}
                  onChange={(e) => setRouteFilter(e.target.value)}
                  className="shadow-sm"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label htmlFor="dateFilter" className="sr-only">Filtrar por Data</Label>
                <Input
                  id="dateFilter"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="shadow-sm"
                />
              </div>
            </div>
            <QuoteTable
              quotes={quoteRequests}
              partners={partners}
              onViewDetails={handleViewDetails}
              onQuote={handleOpenQuoteDialog}
              onAssignPartner={handleOpenPartnerDialog}
              onUpdateStatus={updateStatusMutation.mutate}
              onConvert={handleConvertQuote}
              onDelete={handleDeleteQuote}
              onPrint={handlePrintQuote}
              formatPrice={formatPrice}
            />
          </CardContent>
        </Card>

        {/* Dialog de Detalhes */}
        {selectedQuote && (
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-3">
                  Detalhes da Cotação
                  <StatusBadge status={selectedQuote.status} type="request" className="text-lg px-3 py-1" />
                  <span className="text-lg text-gray-500 font-mono">#{selectedQuote.quote_number}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Uso do TripDetailsDisplay adaptado para cotações */}
                <TripDetailsDisplay 
                  trip={selectedQuote} 
                  isEditable={false} // Detalhes de cotação geralmente não são editáveis aqui, usa-se o botão editar
                />

                {/* Dados do Cliente */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-4">Dados do Cliente</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Nome</div>
                        <div className="font-medium">{selectedQuote.customer_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Email</div>
                        <div className="font-medium">{selectedQuote.customer_email}</div>
                      </div>
                    </div>
                    {selectedQuote.customer_phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">Telefone</div>
                          <div className="font-medium">{selectedQuote.customer_phone}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Observações do Cliente */}
                {selectedQuote.notes && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                      <span className="font-semibold">Observações do Cliente</span>
                    </div>
                    <p className="text-gray-700 ml-7 bg-gray-50 p-3 rounded-lg">{selectedQuote.notes}</p>
                  </div>
                )}

                {/* Motivo da Cotação */}
                {selectedQuote.reason && (
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-orange-900">Motivo da Cotação</span>
                    </div>
                    <p className="text-orange-800 ml-7">{selectedQuote.reason}</p>
                  </div>
                )}

                {/* Informações do Parceiro */}
                {selectedQuote.partner_id && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-lg mb-4">Informações do Parceiro</h3>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                      <div>
                        <div className="text-sm text-gray-600">Parceiro Atribuído:</div>
                        <div className="font-bold text-lg">
                          {partners.find(p => p.id === selectedQuote.partner_id)?.name || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Custo do Parceiro:</div>
                        <div className="font-medium">
                          {selectedQuote.partner_cost ? formatPrice(selectedQuote.partner_cost) : 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Margem de Lucro:</div>
                        <div className="font-medium">{selectedQuote.partner_margin_percentage || 0}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Status do Parceiro:</div>
                        <Badge className="mt-1 text-xs" variant="outline">
                          {selectedQuote.partner_status === 'aguardando_resposta' && `⏱️ Aguardando (${format(new Date(selectedQuote.partner_request_sent_at), "dd/MM 'às' HH:mm", { locale: ptBR })})`}
                          {selectedQuote.partner_status === 'resposta_recebida' && `✅ Respondido (${format(new Date(selectedQuote.partner_response_at), "dd/MM 'às' HH:mm", { locale: ptBR })})`}
                          {selectedQuote.partner_status === 'confirmada' && '✅ Confirmado'}
                          {selectedQuote.partner_status === 'nao_enviada' && '📋 Atribuído'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cotação do Admin (se já foi cotado) */}
                {selectedQuote.admin_quote_price && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-lg mb-4">Cotação Enviada</h3>
                    <div className="bg-green-50 p-4 rounded-lg space-y-3">
                      <div>
                        <div className="text-sm text-gray-600">Preço Cotado:</div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatPrice(selectedQuote.admin_quote_price)}
                        </div>
                      </div>
                      {selectedQuote.admin_notes && (
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Observações do Admin:</div>
                          <p className="text-gray-700">{selectedQuote.admin_notes}</p>
                        </div>
                      )}
                      {selectedQuote.quoted_at && (
                        <div className="text-xs text-gray-500">
                          Cotado em: {format(new Date(selectedQuote.quoted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reserva Convertida */}
                {selectedQuote.status === 'convertido' && selectedQuote.booking_id && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span className="font-semibold text-emerald-900">Convertido em Reserva</span>
                    </div>
                    <p className="text-emerald-800 ml-7">
                      Esta cotação foi convertida em uma reserva após o pagamento do cliente.
                    </p>
                    {selectedQuote.converted_at && (
                      <p className="text-xs text-emerald-600 ml-7 mt-2">
                        Convertido em: {format(new Date(selectedQuote.converted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setShowDetailsDialog(false)} variant="outline">
                  Fechar
                </Button>
                
                <Button 
                  onClick={() => handleEditQuote(selectedQuote)}
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar Detalhes
                </Button>

                {(selectedQuote.status === 'pendente' || selectedQuote.status === 'em_analise') && !selectedQuote.partner_id && (
                  <Button
                    onClick={() => {
                      setShowDetailsDialog(false);
                      handleOpenPartnerDialog(selectedQuote);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Atribuir Parceiro
                  </Button>
                )}
                {selectedQuote.partner_id && selectedQuote.partner_status === 'aguardando_resposta' && (
                  <Button
                    onClick={() => {
                      setShowDetailsDialog(false);
                      handleOpenPartnerDialog(selectedQuote);
                    }}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Registrar Resp. Parceiro
                  </Button>
                )}
                {(selectedQuote.status === 'pendente' || selectedQuote.status === 'em_analise' || selectedQuote.partner_status === 'resposta_recebida') && (
                  <Button
                    onClick={() => {
                      setShowDetailsDialog(false);
                      handleOpenQuoteDialog(selectedQuote);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Cotar Preço
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog de Atribuição de Parceiro */}
        {selectedQuote && (
          <Dialog open={showPartnerDialog} onOpenChange={setShowPartnerDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedQuote.partner_status === 'aguardando_resposta' ?
                    'Registrar Resposta do Parceiro' :
                    'Atribuir Parceiro'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Cotação:</div>
                  <div className="font-bold text-lg">{selectedQuote.quote_number}</div>
                  <div className="text-sm text-gray-600 mt-2">Rota:</div>
                  <div className="font-medium">{selectedQuote.origin} → {selectedQuote.destination}</div>
                  {selectedQuote.distance_km > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Distância: {selectedQuote.distance_km} km
                    </div>
                  )}
                </div>

                {selectedQuote.partner_status !== 'aguardando_resposta' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="partner_select">Parceiro *</Label>
                      <Select value={selectedPartner} onValueChange={(value) => {
                        setSelectedPartner(value);
                        const partner = partners.find(p => p.id === value);
                        if (partner) {
                          setPartnerMargin(String(partner.default_margin_percentage || 15));
                        }
                      }}>
                        <SelectTrigger id="partner_select">
                          <SelectValue placeholder="Selecione um parceiro" />
                        </SelectTrigger>
                        <SelectContent>
                          {activePartners.map((partner) => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.name} - {partner.city || 'N/A'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="partner_margin">Margem de Lucro (%) *</Label>
                      <Input
                        id="partner_margin"
                        type="number"
                        min="0"
                        step="0.1"
                        value={partnerMargin}
                        onChange={(e) => setPartnerMargin(e.target.value)}
                        placeholder="15"
                      />
                      <p className="text-xs text-gray-500">
                        Percentual que será aplicado sobre o custo informado pelo parceiro
                      </p>
                    </div>

                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 text-sm">
                        O parceiro receberá uma notificação solicitando que informe o custo da viagem. 
                        Após a resposta, você poderá registrar o valor e calcular o preço final automaticamente.
                      </AlertDescription>
                    </Alert>
                  </>
                )}

                {selectedQuote.partner_id && selectedQuote.partner_status === 'aguardando_resposta' && (
                  <>
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        Parceiro: <strong>{partners.find(p => p.id === selectedQuote.partner_id)?.name}</strong>
                        <br />
                        Aguardando resposta desde {format(new Date(selectedQuote.partner_request_sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="partner_cost">
                        Custo Informado pelo Parceiro (R$) *
                      </Label>
                      <Input
                        id="partner_cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={partnerCost}
                        onChange={(e) => setPartnerCost(e.target.value)}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">
                        Informe o valor que o parceiro cobrou pela viagem
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="partner_margin_edit">Margem de Lucro (%)</Label>
                      <Input
                        id="partner_margin_edit"
                        type="number"
                        min="0"
                        step="0.1"
                        value={partnerMargin}
                        onChange={(e) => setPartnerMargin(e.target.value)}
                        placeholder="15"
                      />
                      <p className="text-xs text-gray-500">
                        Margem já definida: {selectedQuote.partner_margin_percentage}% (você pode ajustá-la se necessário)
                      </p>
                    </div>

                    {calculatedPrice > 0 && (
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Preço Final Calculado para o Cliente:</div>
                        <div className="text-3xl font-bold text-green-600">
                          {formatPrice(calculatedPrice)}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Custo Parceiro: {formatPrice(parseFloat(partnerCost) || 0)} + 
                          Margem ({partnerMargin}%): {formatPrice(calculatedPrice - (parseFloat(partnerCost) || 0))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => {
                  setShowPartnerDialog(false);
                  setError('');
                }} variant="outline">
                  Cancelar
                </Button>
                <Button
                  onClick={selectedQuote.partner_status === 'aguardando_resposta' ?
                    handleRecordPartnerResponse :
                    handleAssignPartner}
                  disabled={assignPartnerMutation.isLoading || recordPartnerResponseMutation.isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {(assignPartnerMutation.isLoading || recordPartnerResponseMutation.isLoading) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : selectedQuote.partner_status === 'aguardando_resposta' ? (
                    'Registrar Resposta'
                  ) : (
                    'Atribuir Parceiro'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog de Edição */}
        {editingQuoteData && (
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Cotação e Gerar Link</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Dados do Cliente */}
                <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label>Nome do Cliente</Label>
                    <Input 
                      value={editingQuoteData.customer_name} 
                      onChange={(e) => setEditingQuoteData({...editingQuoteData, customer_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input 
                      value={editingQuoteData.customer_email} 
                      onChange={(e) => setEditingQuoteData({...editingQuoteData, customer_email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input 
                      value={editingQuoteData.customer_phone} 
                      onChange={(e) => setEditingQuoteData({...editingQuoteData, customer_phone: e.target.value})}
                    />
                  </div>
                </div>

                {/* Edição de Trechos */}
                <div>
                  {editingQuoteData.quote_format === 'agency' ? (
                    <div className="space-y-4">
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-4">
                        <Label className="text-orange-900 font-bold mb-1 block">Número de Controle</Label>
                        <Input 
                          value={editingQuoteData.agency_control_number || ''} 
                          onChange={(e) => setEditingQuoteData({...editingQuoteData, agency_control_number: e.target.value})}
                          className="border-orange-200 bg-white"
                        />
                      </div>

                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg">Trechos da Agência</h3>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            const newLeg = {
                              origin: '',
                              destination: '',
                              date: editingQuoteData.date ? editingQuoteData.date.split('T')[0] : new Date().toISOString().split('T')[0],
                              time: '12:00',
                              vehicle_options: []
                            };
                            setEditingQuoteData({
                              ...editingQuoteData,
                              agency_quoted_legs: [...(editingQuoteData.agency_quoted_legs || []), newLeg]
                            });
                          }}
                          variant="outline"
                        >
                          <Plus className="w-4 h-4 mr-2" /> Adicionar Trecho
                        </Button>
                      </div>

                      {editingQuoteData.agency_quoted_legs?.map((leg, idx) => (
                        <div key={idx} className="border p-4 rounded-lg relative bg-white">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute top-2 right-2 text-red-500 hover:bg-red-50"
                            onClick={() => {
                              const newLegs = [...editingQuoteData.agency_quoted_legs];
                              newLegs.splice(idx, 1);
                              setEditingQuoteData({...editingQuoteData, agency_quoted_legs: newLegs});
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          
                          <div className="grid md:grid-cols-4 gap-3 mb-3 pr-8">
                            <div className="col-span-2">
                              <Label className="text-xs">Origem</Label>
                              <Input 
                                value={leg.origin} 
                                onChange={(e) => {
                                  const newLegs = [...editingQuoteData.agency_quoted_legs];
                                  newLegs[idx].origin = e.target.value;
                                  setEditingQuoteData({...editingQuoteData, agency_quoted_legs: newLegs});
                                }}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Destino</Label>
                              <Input 
                                value={leg.destination} 
                                onChange={(e) => {
                                  const newLegs = [...editingQuoteData.agency_quoted_legs];
                                  newLegs[idx].destination = e.target.value;
                                  setEditingQuoteData({...editingQuoteData, agency_quoted_legs: newLegs});
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Data</Label>
                              <Input 
                                type="date" 
                                value={leg.date ? leg.date.split('T')[0] : ''} 
                                onChange={(e) => {
                                  const newLegs = [...editingQuoteData.agency_quoted_legs];
                                  newLegs[idx].date = e.target.value;
                                  setEditingQuoteData({...editingQuoteData, agency_quoted_legs: newLegs});
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Horário</Label>
                              <Input 
                                type="time" 
                                value={leg.time} 
                                onChange={(e) => {
                                  const newLegs = [...editingQuoteData.agency_quoted_legs];
                                  newLegs[idx].time = e.target.value;
                                  setEditingQuoteData({...editingQuoteData, agency_quoted_legs: newLegs});
                                }}
                              />
                            </div>
                          </div>

                          <div className="bg-orange-50 p-3 rounded border border-orange-100 mt-2">
                            <Label className="text-xs font-bold text-orange-900 mb-2 block">Preços por Veículo (R$)</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {['Sedan Executivo', 'Van Executiva', 'Micro-ônibus', 'Ônibus'].map(vType => {
                                const option = leg.vehicle_options?.find(o => o.vehicle_type_name === vType);
                                return (
                                  <div key={vType}>
                                    <Label className="text-[10px] text-gray-500">{vType}</Label>
                                    <Input 
                                      type="number"
                                      placeholder="0.00"
                                      value={option ? option.price : ''}
                                      onChange={(e) => {
                                        const newLegs = [...editingQuoteData.agency_quoted_legs];
                                        const currentOptions = [...(newLegs[idx].vehicle_options || [])];
                                        const optIndex = currentOptions.findIndex(o => o.vehicle_type_name === vType);
                                        
                                        if (optIndex >= 0) {
                                          currentOptions[optIndex] = { ...currentOptions[optIndex], price: parseFloat(e.target.value) };
                                        } else {
                                          currentOptions.push({ vehicle_type_name: vType, price: parseFloat(e.target.value) });
                                        }
                                        newLegs[idx].vehicle_options = currentOptions;
                                        setEditingQuoteData({...editingQuoteData, agency_quoted_legs: newLegs});
                                      }}
                                      className="h-8 text-sm bg-white"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-3 bg-gray-50 p-2 rounded border border-gray-200">
                            <Label className="text-xs mb-2 block font-bold text-gray-700">Itens Adicionais e Serviços Extras</Label>
                            
                            {/* Lista de Itens Existentes */}
                            {leg.selected_additional_items?.length > 0 && (
                              <div className="space-y-1 mb-3">
                                {leg.selected_additional_items.map((item, itemIdx) => (
                                  <div key={itemIdx} className="flex justify-between items-center text-xs bg-white p-1.5 rounded border border-gray-100">
                                    <div>
                                      <span className="font-semibold">{item.quantity || 1}x</span> {item.name}
                                      <span className="text-gray-500 ml-1">({formatPrice(item.price)})</span>
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-5 w-5 text-red-500 hover:bg-red-50"
                                      onClick={() => {
                                        const newLegs = [...editingQuoteData.agency_quoted_legs];
                                        const newItems = [...(newLegs[idx].selected_additional_items || [])];
                                        newItems.splice(itemIdx, 1);
                                        newLegs[idx].selected_additional_items = newItems;
                                        setEditingQuoteData({...editingQuoteData, agency_quoted_legs: newLegs});
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Adicionar Item Manual */}
                            <div className="flex gap-2 items-end mb-3">
                              <div className="flex-1">
                                <Label className="text-[10px] text-gray-500">Nome</Label>
                                <Input 
                                  value={manualItemInputs[`agency_${idx}`]?.name || ''}
                                  onChange={(e) => updateManualInput(`agency_${idx}`, 'name', e.target.value)}
                                  placeholder="Ex: Taxa de espera"
                                  className="h-7 text-xs bg-white"
                                />
                              </div>
                              <div className="w-16">
                                <Label className="text-[10px] text-gray-500">Qtd</Label>
                                <Input 
                                  type="number"
                                  min="1"
                                  value={manualItemInputs[`agency_${idx}`]?.quantity || 1}
                                  onChange={(e) => updateManualInput(`agency_${idx}`, 'quantity', e.target.value)}
                                  className="h-7 text-xs bg-white"
                                />
                              </div>
                              <div className="w-20">
                                <Label className="text-[10px] text-gray-500">Valor</Label>
                                <Input 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={manualItemInputs[`agency_${idx}`]?.price || ''}
                                  onChange={(e) => updateManualInput(`agency_${idx}`, 'price', e.target.value)}
                                  placeholder="0.00"
                                  className="h-7 text-xs bg-white"
                                />
                              </div>
                              <Button 
                                size="sm" 
                                className="h-7 bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  const input = manualItemInputs[`agency_${idx}`];
                                  if (!input?.name || !input?.price) return;
                                  
                                  const newItem = {
                                    name: input.name,
                                    price: parseFloat(input.price),
                                    quantity: parseInt(input.quantity) || 1,
                                  };
                                  
                                  const newLegs = [...editingQuoteData.agency_quoted_legs];
                                  newLegs[idx].selected_additional_items = [...(newLegs[idx].selected_additional_items || []), newItem];
                                  setEditingQuoteData({...editingQuoteData, agency_quoted_legs: newLegs});
                                  
                                  setManualItemInputs(prev => ({ ...prev, [`agency_${idx}`]: { name: '', price: '', quantity: 1 } }));
                                }}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>

                            <Label className="text-[10px] text-gray-500 mb-1">Ou selecione do catálogo:</Label>
                            <MultiSelect
                              options={additionalItems.map(item => ({
                                label: `${item.name} (+${formatPrice(item.adjustment_value)})`,
                                value: item.id
                              }))}
                              selected={leg.selected_additional_items?.filter(i => i.item_id).map(i => i.item_id) || []}
                              onChange={(selectedIds) => {
                                const newLegs = [...editingQuoteData.agency_quoted_legs];
                                const currentItems = newLegs[idx].selected_additional_items || [];
                                // Manter itens manuais (sem item_id ou id não está no catálogo)
                                const manualItems = currentItems.filter(i => !i.item_id || !additionalItems.find(ai => ai.id === i.item_id));
                                
                                const newCatalogItems = selectedIds.map(id => {
                                  const item = additionalItems.find(i => i.id === id);
                                  return {
                                    item_id: item.id,
                                    name: item.name,
                                    price: item.adjustment_value,
                                    quantity: 1,
                                    adjustment_type: item.adjustment_type
                                  };
                                });
                                
                                newLegs[idx].selected_additional_items = [...manualItems, ...newCatalogItems];
                                setEditingQuoteData({...editingQuoteData, agency_quoted_legs: newLegs});
                              }}
                              placeholder="Selecione itens..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg">Itinerário / Trechos</h3>
                        <Button 
                          size="sm" 
                          onClick={() => {
                        const newTrip = {
                          date: editingQuoteData.date || new Date().toISOString().split('T')[0],
                          time: '12:00',
                          origin: '',
                          destination: '',
                          vehicle_type_name: 'Sedan Executivo',
                          price: 0,
                          service_type: 'one_way'
                        };
                        const currentTrips = editingQuoteData.quoted_trips || [];
                        // Se não tinha trips antes, converte os dados principais em um trip primeiro?
                        // Não, vamos assumir que se adicionar, vira lista.
                        // Mas se já tiver dados na raiz e lista vazia, pode ser confuso.
                        // Vamos adicionar à lista.
                        setEditingQuoteData({
                          ...editingQuoteData,
                          quoted_trips: [...currentTrips, newTrip]
                        });
                      }}
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Trecho
                    </Button>
                  </div>

                  {editingQuoteData.quoted_trips && editingQuoteData.quoted_trips.length > 0 ? (
                    <div className="space-y-4">
                      {editingQuoteData.quoted_trips.map((trip, idx) => (
                        <div key={idx} className="border p-4 rounded-lg relative bg-white">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute top-2 right-2 text-red-500 hover:bg-red-50"
                            onClick={() => {
                              const newTrips = [...editingQuoteData.quoted_trips];
                              newTrips.splice(idx, 1);
                              setEditingQuoteData({...editingQuoteData, quoted_trips: newTrips});
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          
                          <div className="grid md:grid-cols-4 gap-3 mb-3 pr-8">
                            <div>
                              <Label className="text-xs">Data</Label>
                              <Input 
                                type="date" 
                                value={trip.date ? trip.date.split('T')[0] : ''} 
                                onChange={(e) => {
                                  const newTrips = [...editingQuoteData.quoted_trips];
                                  newTrips[idx].date = e.target.value;
                                  setEditingQuoteData({...editingQuoteData, quoted_trips: newTrips});
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Horário</Label>
                              <Input 
                                type="time" 
                                value={trip.time} 
                                onChange={(e) => {
                                  const newTrips = [...editingQuoteData.quoted_trips];
                                  newTrips[idx].time = e.target.value;
                                  setEditingQuoteData({...editingQuoteData, quoted_trips: newTrips});
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Veículo</Label>
                              <Input 
                                value={trip.vehicle_type_name} 
                                onChange={(e) => {
                                  const newTrips = [...editingQuoteData.quoted_trips];
                                  newTrips[idx].vehicle_type_name = e.target.value;
                                  setEditingQuoteData({...editingQuoteData, quoted_trips: newTrips});
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-green-700 font-bold">Preço (R$)</Label>
                              <Input 
                                type="number"
                                value={trip.price} 
                                onChange={(e) => {
                                  const newTrips = [...editingQuoteData.quoted_trips];
                                  newTrips[idx].price = parseFloat(e.target.value);
                                  setEditingQuoteData({...editingQuoteData, quoted_trips: newTrips});
                                }}
                                className="font-bold text-green-700"
                              />
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Origem</Label>
                              <Input 
                                value={trip.origin} 
                                onChange={(e) => {
                                  const newTrips = [...editingQuoteData.quoted_trips];
                                  newTrips[idx].origin = e.target.value;
                                  setEditingQuoteData({...editingQuoteData, quoted_trips: newTrips});
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Destino</Label>
                              <Input 
                                value={trip.destination} 
                                onChange={(e) => {
                                  const newTrips = [...editingQuoteData.quoted_trips];
                                  newTrips[idx].destination = e.target.value;
                                  setEditingQuoteData({...editingQuoteData, quoted_trips: newTrips});
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="mt-3 bg-gray-50 p-2 rounded border border-gray-200">
                            <Label className="text-xs mb-2 block font-bold text-gray-700">Itens Adicionais</Label>
                            
                            {trip.selected_additional_items?.length > 0 && (
                              <div className="space-y-1 mb-3">
                                {trip.selected_additional_items.map((item, itemIdx) => (
                                  <div key={itemIdx} className="flex justify-between items-center text-xs bg-white p-1.5 rounded border border-gray-100">
                                    <div>
                                      <span className="font-semibold">{item.quantity || 1}x</span> {item.name}
                                      <span className="text-gray-500 ml-1">({formatPrice(item.price)})</span>
                                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-5 w-5 text-red-500 hover:bg-red-50"
                                      onClick={() => {
                                        const newTrips = [...editingQuoteData.quoted_trips];
                                        const newItems = [...(newTrips[idx].selected_additional_items || [])];
                                        newItems.splice(itemIdx, 1);
                                        newTrips[idx].selected_additional_items = newItems;
                                        setEditingQuoteData({...editingQuoteData, quoted_trips: newTrips});
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-2 items-end mb-3">
                              <div className="flex-1">
                                <Label className="text-[10px] text-gray-500">Nome</Label>
                                <Input 
                                  value={manualItemInputs[`trip_${idx}`]?.name || ''}
                                  onChange={(e) => updateManualInput(`trip_${idx}`, 'name', e.target.value)}
                                  placeholder="Ex: Cadeira"
                                  className="h-7 text-xs bg-white"
                                />
                              </div>
                              <div className="w-16">
                                <Label className="text-[10px] text-gray-500">Qtd</Label>
                                <Input 
                                  type="number"
                                  min="1"
                                  value={manualItemInputs[`trip_${idx}`]?.quantity || 1}
                                  onChange={(e) => updateManualInput(`trip_${idx}`, 'quantity', e.target.value)}
                                  className="h-7 text-xs bg-white"
                                />
                              </div>
                              <div className="w-20">
                                <Label className="text-[10px] text-gray-500">Valor</Label>
                                <Input 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={manualItemInputs[`trip_${idx}`]?.price || ''}
                                  onChange={(e) => updateManualInput(`trip_${idx}`, 'price', e.target.value)}
                                  placeholder="0.00"
                                  className="h-7 text-xs bg-white"
                                />
                              </div>
                              <Button 
                                size="sm" 
                                className="h-7 bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  const input = manualItemInputs[`trip_${idx}`];
                                  if (!input?.name || !input?.price) return;
                                  
                                  const newItem = {
                                    name: input.name,
                                    price: parseFloat(input.price),
                                    quantity: parseInt(input.quantity) || 1,
                                  };
                                  
                                  const newTrips = [...editingQuoteData.quoted_trips];
                                  newTrips[idx].selected_additional_items = [...(newTrips[idx].selected_additional_items || []), newItem];
                                  setEditingQuoteData({...editingQuoteData, quoted_trips: newTrips});
                                  
                                  setManualItemInputs(prev => ({ ...prev, [`trip_${idx}`]: { name: '', price: '', quantity: 1 } }));
                                }}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>

                            <Label className="text-[10px] text-gray-500 mb-1">Catálogo:</Label>
                            <MultiSelect
                              options={additionalItems.map(item => ({
                                label: `${item.name} (+${formatPrice(item.adjustment_value)})`,
                                value: item.id
                              }))}
                              selected={trip.selected_additional_items?.filter(i => i.item_id).map(i => i.item_id) || []}
                              onChange={(selectedIds) => {
                                const newTrips = [...editingQuoteData.quoted_trips];
                                const currentItems = newTrips[idx].selected_additional_items || [];
                                const manualItems = currentItems.filter(i => !i.item_id || !additionalItems.find(ai => ai.id === i.item_id));
                                
                                const newCatalogItems = selectedIds.map(id => {
                                  const item = additionalItems.find(i => i.id === id);
                                  return {
                                    item_id: item.id,
                                    name: item.name,
                                    price: item.adjustment_value,
                                    quantity: 1,
                                    adjustment_type: item.adjustment_type
                                  };
                                });
                                newTrips[idx].selected_additional_items = [...manualItems, ...newCatalogItems];
                                setEditingQuoteData({...editingQuoteData, quoted_trips: newTrips});
                              }}
                              placeholder="Selecione..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Edição de Viagem Única (Legacy) */
                    <div className="border p-4 rounded-lg bg-white">
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label>Origem</Label>
                          <Input 
                            value={editingQuoteData.origin} 
                            onChange={(e) => setEditingQuoteData({...editingQuoteData, origin: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Destino</Label>
                          <Input 
                            value={editingQuoteData.destination} 
                            onChange={(e) => setEditingQuoteData({...editingQuoteData, destination: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label>Data</Label>
                          <Input 
                            type="date"
                            value={editingQuoteData.date ? editingQuoteData.date.split('T')[0] : ''} 
                            onChange={(e) => setEditingQuoteData({...editingQuoteData, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Horário</Label>
                          <Input 
                            type="time"
                            value={editingQuoteData.time} 
                            onChange={(e) => setEditingQuoteData({...editingQuoteData, time: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label className="text-green-700 font-bold">Preço Base (R$)</Label>
                          <Input 
                            type="number"
                            value={editingQuoteData.admin_quote_price} 
                            onChange={(e) => setEditingQuoteData({...editingQuoteData, admin_quote_price: parseFloat(e.target.value)})}
                            className="font-bold text-green-700"
                          />
                        </div>
                        </div>

                        <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <Label className="text-xs mb-2 block font-bold text-gray-700">Itens Adicionais (Global)</Label>
                          
                          {editingQuoteData.selected_additional_items?.length > 0 && (
                            <div className="space-y-1 mb-3 bg-white p-2 rounded border border-gray-100">
                              {editingQuoteData.selected_additional_items.map((item, itemIdx) => (
                                <div key={itemIdx} className="flex justify-between items-center text-sm p-1 hover:bg-gray-50 rounded">
                                  <div>
                                    <span className="font-semibold">{item.quantity || 1}x</span> {item.name}
                                    <span className="text-gray-500 ml-1">({formatPrice(item.price)})</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold">{formatPrice((item.price || 0) * (item.quantity || 1))}</span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-5 w-5 text-red-500 hover:bg-red-50"
                                      onClick={() => {
                                        const newItems = [...(editingQuoteData.selected_additional_items || [])];
                                        newItems.splice(itemIdx, 1);
                                        setEditingQuoteData({...editingQuoteData, selected_additional_items: newItems});
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              <div className="text-right text-sm font-bold text-gray-700 pt-2 border-t">
                                Total Adicionais: {formatPrice(editingQuoteData.selected_additional_items.reduce((acc, i) => acc + ((i.price || 0) * (i.quantity || 1)), 0))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-12 gap-2 items-end mb-3">
                            <div className="col-span-5">
                              <Label className="text-[10px] text-gray-500">Nome</Label>
                              <Input 
                                value={manualItemInputs[`global`]?.name || ''}
                                onChange={(e) => updateManualInput(`global`, 'name', e.target.value)}
                                placeholder="Ex: Cadeira"
                                className="h-8 text-sm bg-white"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-[10px] text-gray-500">Qtd</Label>
                              <Input 
                                type="number"
                                min="1"
                                value={manualItemInputs[`global`]?.quantity || 1}
                                onChange={(e) => updateManualInput(`global`, 'quantity', e.target.value)}
                                className="h-8 text-sm bg-white"
                              />
                            </div>
                            <div className="col-span-3">
                              <Label className="text-[10px] text-gray-500">Valor</Label>
                              <Input 
                                type="number"
                                min="0"
                                step="0.01"
                                value={manualItemInputs[`global`]?.price || ''}
                                onChange={(e) => updateManualInput(`global`, 'price', e.target.value)}
                                placeholder="0.00"
                                className="h-8 text-sm bg-white"
                              />
                            </div>
                            <div className="col-span-2">
                              <Button 
                                size="sm" 
                                className="w-full h-8 bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  const input = manualItemInputs[`global`];
                                  if (!input?.name || !input?.price) return;
                                  
                                  const newItem = {
                                    name: input.name,
                                    price: parseFloat(input.price),
                                    quantity: parseInt(input.quantity) || 1,
                                  };
                                  
                                  setEditingQuoteData({
                                    ...editingQuoteData,
                                    selected_additional_items: [...(editingQuoteData.selected_additional_items || []), newItem]
                                  });
                                  
                                  setManualItemInputs(prev => ({ ...prev, [`global`]: { name: '', price: '', quantity: 1 } }));
                                }}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <Label className="text-xs text-gray-500 mb-1">Catálogo:</Label>
                          <MultiSelect
                            options={additionalItems.map(item => ({
                              label: `${item.name} (+${formatPrice(item.adjustment_value)})`,
                              value: item.id
                            }))}
                            selected={editingQuoteData.selected_additional_items?.filter(i => i.item_id).map(i => i.item_id) || []}
                            onChange={(selectedIds) => {
                              const currentItems = editingQuoteData.selected_additional_items || [];
                              const manualItems = currentItems.filter(i => !i.item_id || !additionalItems.find(ai => ai.id === i.item_id));
                              
                              const newCatalogItems = selectedIds.map(id => {
                                const item = additionalItems.find(i => i.id === id);
                                return {
                                  item_id: item.id,
                                  name: item.name,
                                  price: item.adjustment_value,
                                  quantity: 1,
                                  adjustment_type: item.adjustment_type
                                };
                              });
                              
                              setEditingQuoteData({...editingQuoteData, selected_additional_items: [...manualItems, ...newCatalogItems]});
                            }}
                            placeholder="Selecione itens adicionais..."
                          />
                        </div>
                        </div>
                        )}
                  </div>
                )}
                </div>

                {/* Observações */}
                <div>
                  <Label>Observações (Exibido no topo da proposta)</Label>
                  <Textarea 
                    value={editingQuoteData.professional_notes || editingQuoteData.admin_notes || ''}
                    onChange={(e) => setEditingQuoteData({
                      ...editingQuoteData, 
                      professional_notes: e.target.value,
                      admin_notes: e.target.value // Atualiza ambos para garantir
                    })}
                    rows={3}
                  />
                </div>

                {/* Link Gerado */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-purple-900 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Link da Cotação
                    </h4>
                    <Button 
                      size="sm" 
                      onClick={handleGenerateNewLink}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Gerar Novo Link
                    </Button>
                  </div>
                  
                  {generatedLink ? (
                    <div className="flex gap-2 mt-2">
                      <Input value={generatedLink} readOnly className="bg-white text-sm" />
                      <Button 
                        size="icon" 
                        variant="outline" 
                        onClick={() => {
                          navigator.clipboard.writeText(generatedLink);
                          setSuccess('Link copiado!');
                          setTimeout(() => setSuccess(''), 2000);
                        }}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Clique em "Gerar Novo Link" para criar uma nova URL de acesso para o cliente.</p>
                  )}
                </div>

              </div>

              <DialogFooter>
                <Button onClick={() => setShowEditDialog(false)} variant="outline">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveEdit} 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog de Visualização para Impressão */}
        {printingQuote && (
          <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0" id="printable-quote-modal-container">
              <DialogHeader className="p-6 border-b no-print">
                <DialogTitle>Visualização para Impressão</DialogTitle>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
                <div className="shadow-lg mx-auto bg-white">
                  <QuotePrintTemplate quote={printingQuote} />
                </div>
              </div>

              <DialogFooter className="p-6 border-t bg-white no-print">
                <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
                  Fechar
                </Button>
                <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir / Salvar PDF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Novo Dialog de Criação de Cotação Manual */}
        <QuoteDialog 
          open={showNewQuoteDialog} 
          onOpenChange={setShowNewQuoteDialog}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
            // Não fechamos automaticamente aqui pois o dialog tem sua tela de sucesso,
            // mas se o usuário fechar, a lista estará atualizada.
          }}
        />

        {/* Dialog de Cotação */}
        {selectedQuote && (
          <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Cotar Preço</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Cotação:</div>
                  <div className="font-bold text-lg">{selectedQuote.quote_number}</div>
                  <div className="text-sm text-gray-600 mt-2">Cliente:</div>
                  <div className="font-medium">{selectedQuote.customer_name}</div>
                  {selectedQuote.quote_format === 'agency' && selectedQuote.agency_control_number && (
                    <div className="text-sm text-gray-600 mt-2">Controle: <span className="font-medium text-black">{selectedQuote.agency_control_number}</span></div>
                  )}
                </div>

                {selectedQuote.quote_format === 'agency' ? (
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                    <Label className="text-base font-bold text-orange-900 block">Preços por Trecho</Label>
                    {selectedQuote.agency_quoted_legs?.map((leg, idx) => (
                      <div key={idx} className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="bg-white text-orange-800 border-orange-200">Trecho #{idx + 1}</Badge>
                          <div className="text-xs text-right text-gray-500">
                            {format(new Date(leg.date), 'dd/MM/yyyy')} - {leg.time}
                          </div>
                        </div>
                        <div className="text-sm font-medium mb-3 text-gray-800">
                          {leg.origin} <ArrowRight className="inline-block w-3 h-3 mx-1" /> {leg.destination}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {leg.vehicle_options?.map((opt, optIdx) => (
                            <div key={optIdx}>
                              <Label className="text-xs text-gray-600 mb-1 block">{opt.vehicle_type_name}</Label>
                              <Input 
                                type="number" 
                                placeholder="0.00"
                                value={agencyPrices[idx]?.[opt.vehicle_type_name] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAgencyPrices(prev => ({
                                    ...prev,
                                    [idx]: {
                                      ...prev[idx],
                                      [opt.vehicle_type_name]: val
                                    }
                                  }));
                                }}
                                className="h-8 text-sm bg-white"
                              />
                            </div>
                          ))}
                        </div>
                        
                        {leg.selected_additional_items && leg.selected_additional_items.length > 0 && (
                          <div className="mt-3 border-t border-orange-200 pt-2">
                            <Label className="text-xs font-bold text-orange-900 mb-1 block">Itens Adicionais:</Label>
                            <div className="flex flex-wrap gap-2">
                              {leg.selected_additional_items.map((item, i) => (
                                <Badge key={i} variant="outline" className="bg-white border-orange-200 text-orange-800 text-[10px]">
                                  {item.name} (+{formatPrice(item.price)})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="quote_price">Preço da Cotação (R$) *</Label>
                    <Input
                      id="quote_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={quotePrice}
                      onChange={(e) => setQuotePrice(e.target.value)}
                      placeholder="0.00"
                      className="text-lg"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="admin_notes">Observações (opcional)</Label>
                  <Textarea
                    id="admin_notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Informações adicionais para o cliente..."
                    className="h-24"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Alert className="bg-blue-50 border-blue-200">
                  <Send className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    Ao enviar, o cliente receberá um e-mail com o preço e um link de pagamento do Stripe.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button onClick={() => setShowQuoteDialog(false)} variant="outline">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitQuote}
                  disabled={submitQuoteMutation.isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitQuoteMutation.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Cotação
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