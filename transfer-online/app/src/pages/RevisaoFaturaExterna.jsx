import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
  CheckCircle,
  XCircle,
  AlertCircle,
  Receipt,
  Calendar,
  FileText,
  Building2,
  MapPin,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RevisaoFaturaExterna() {
  const [isLoading, setIsLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [supplier, setSupplier] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState('');
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    const loadInvoiceData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const invoiceId = urlParams.get('id');
        const token = urlParams.get('token');

        if (!invoiceId || !token) {
          setError('Link inválido ou expirado. Por favor, verifique o link recebido por e-mail.');
          setIsLoading(false);
          return;
        }

        // Buscar fatura
        const invoices = await base44.entities.SupplierInvoice.filter({ id: invoiceId });
        
        if (invoices.length === 0) {
          setError('Fatura não encontrada.');
          setIsLoading(false);
          return;
        }

        const invoiceData = invoices[0];

        // Validar token
        if (invoiceData.external_review_token !== token) {
          setError('Token de acesso inválido. Por favor, use o link recebido por e-mail.');
          setIsLoading(false);
          return;
        }

        // Verificar se já foi revisado
        if (invoiceData.external_review_status !== 'pendente') {
          setAlreadyReviewed(true);
        }

        setInvoice(invoiceData);

        // Buscar fornecedor
        const suppliers = await base44.entities.Supplier.list();
        const supplierData = suppliers.find(s => s.id === invoiceData.supplier_id);
        setSupplier(supplierData);

        // Buscar solicitações relacionadas
        const allRequests = await base44.entities.ServiceRequest.list();
        const relatedRequests = allRequests.filter(sr => 
          invoiceData.related_service_requests_ids.includes(sr.id)
        );
        setServiceRequests(relatedRequests);

        setIsLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados da fatura:', err);
        setError('Erro ao carregar dados da fatura. Tente novamente mais tarde.');
        setIsLoading(false);
      }
    };

    loadInvoiceData();
  }, []);

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      await base44.functions.invoke('processExternalInvoiceReview', {
        invoice_id: invoice.id,
        token: invoice.external_review_token,
        approved: true,
        comments: comments || null
      });

      setSuccess('Fatura aprovada com sucesso! O fornecedor foi notificado.');
      setAlreadyReviewed(true);
      
      // Recarregar dados da fatura
      const invoices = await base44.entities.SupplierInvoice.filter({ id: invoice.id });
      if (invoices.length > 0) {
        setInvoice(invoices[0]);
      }
    } catch (err) {
      console.error('Erro ao aprovar fatura:', err);
      setError(err.response?.data?.error || 'Erro ao aprovar fatura. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      setError('Por favor, informe o motivo da rejeição nos comentários.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await base44.functions.invoke('processExternalInvoiceReview', {
        invoice_id: invoice.id,
        token: invoice.external_review_token,
        approved: false,
        comments: comments
      });

      setSuccess('Fatura rejeitada. O fornecedor foi notificado com seus comentários.');
      setAlreadyReviewed(true);
      
      // Recarregar dados da fatura
      const invoices = await base44.entities.SupplierInvoice.filter({ id: invoice.id });
      if (invoices.length > 0) {
        setInvoice(invoices[0]);
      }
    } catch (err) {
      console.error('Erro ao rejeitar fatura:', err);
      setError(err.response?.data?.error || 'Erro ao rejeitar fatura. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getReviewStatusBadge = (status) => {
    if (status === 'aprovado') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300 border text-base">
          <CheckCircle className="w-4 h-4 mr-1" />
          Aprovada
        </Badge>
      );
    } else if (status === 'rejeitado') {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300 border text-base">
          <XCircle className="w-4 h-4 mr-1" />
          Rejeitada
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 border text-base">
        <AlertCircle className="w-4 h-4 mr-1" />
        Aguardando Revisão
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados da fatura...</p>
        </div>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Receipt className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Revisão de Fatura</h1>
          </div>
          <p className="text-gray-600">
            {supplier?.name} - {invoice?.invoice_number}
          </p>
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

        {/* Informações da Fatura */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Informações da Fatura</span>
              {getReviewStatusBadge(invoice.external_review_status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-900 font-semibold">Número da Fatura</span>
                </div>
                <p className="font-mono font-bold text-2xl text-blue-600">
                  {invoice.invoice_number}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-900 font-semibold">Período</span>
                </div>
                <p className="font-semibold text-gray-900">
                  {format(new Date(invoice.period_start), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <p className="text-sm text-gray-600">até</p>
                <p className="font-semibold text-gray-900">
                  {format(new Date(invoice.period_end), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-purple-900 font-semibold">Valor Total</span>
                </div>
                <p className="font-bold text-3xl text-purple-600">
                  {formatPrice(invoice.total_amount)}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Fornecedor:</span>
                  <span className="font-semibold ml-2">{supplier?.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Quantidade de Viagens:</span>
                  <span className="font-semibold ml-2">{serviceRequests.length}</span>
                </div>
              </div>
            </div>

            {alreadyReviewed && invoice.external_review_date && (
              <div className="mt-4 pt-4 border-t">
                <Alert className={invoice.external_review_status === 'aprovado' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                  <AlertCircle className={`h-4 w-4 ${invoice.external_review_status === 'aprovado' ? 'text-green-600' : 'text-red-600'}`} />
                  <AlertDescription className={invoice.external_review_status === 'aprovado' ? 'text-green-800' : 'text-red-800'}>
                    <strong>Revisada em:</strong> {format(new Date(invoice.external_review_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    {invoice.external_review_notes && (
                      <>
                        <br />
                        <strong className="mt-2 block">Comentários:</strong> {invoice.external_review_notes}
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Solicitações */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Solicitações Incluídas na Fatura</CardTitle>
          </CardHeader>
          <CardContent>
            {serviceRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nenhuma solicitação encontrada</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Nº Solicitação</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Rota</TableHead>
                      <TableHead>Passageiro</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceRequests.map((sr) => (
                      <TableRow key={sr.id} className="hover:bg-gray-50">
                        <TableCell>
                          <span className="font-mono font-semibold text-blue-600">
                            {sr.request_number}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {format(new Date(sr.date), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2 max-w-xs">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                              <div className="truncate">{sr.origin}</div>
                              <div className="text-gray-500 truncate">→ {sr.destination}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            {sr.passenger_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">
                            {formatPrice(sr.chosen_supplier_cost || 0)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-blue-900">Total da Fatura:</span>
                <span className="text-3xl font-bold text-blue-600">
                  {formatPrice(invoice.total_amount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações de Aprovação/Rejeição */}
        {!alreadyReviewed && (
          <Card>
            <CardHeader>
              <CardTitle>Revisar Fatura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comments">
                  Comentários {!comments.trim() && <span className="text-gray-500">(Opcional para aprovação, obrigatório para rejeição)</span>}
                </Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Adicione observações, correções necessárias ou motivo da rejeição..."
                  className="h-32"
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <Button
                  onClick={handleReject}
                  disabled={isSubmitting}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 py-6"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 mr-2" />
                      Rejeitar Fatura
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 py-6"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Aprovar Fatura
                    </>
                  )}
                </Button>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Importante:</strong> Após aprovar ou rejeitar, esta ação não poderá ser desfeita. 
                  O fornecedor será notificado imediatamente sobre sua decisão.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}