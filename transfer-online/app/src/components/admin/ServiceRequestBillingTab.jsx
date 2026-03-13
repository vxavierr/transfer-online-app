import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  CreditCard, 
  Loader2, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  RotateCcw, 
  Clock, 
  Receipt, 
  Plus, 
  Trash2, 
  Percent, 
  Download,
  AlertCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';

export default function ServiceRequestBillingTab({
  formData,
  handleChange,
  serviceRequest,
  costCenters,
  costAllocation,
  setCostAllocation,
  formatPrice
}) {
  const queryClient = useQueryClient();
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGeneratePaymentLink = async () => {
    if (!formData.chosen_client_price || formData.chosen_client_price <= 0) {
      setError('Defina um valor para a viagem antes de gerar o link de pagamento.');
      return;
    }

    setIsGeneratingLink(true);
    setError('');
    try {
      const response = await base44.functions.invoke('generateServiceRequestPaymentLink', {
        serviceRequestId: serviceRequest.id
      });

      if (response.data && response.data.success) {
        handleChange('payment_link', response.data.payment_link);
        setSuccess('Link de pagamento gerado com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(response.data?.error || 'Erro ao gerar link');
      }
    } catch (err) {
      console.error('Erro ao gerar link de pagamento:', err);
      setError(err.message || 'Erro ao gerar link de pagamento');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleRefundPayment = async () => {
    if (!refundReason.trim()) {
      setError('Por favor, informe o motivo do reembolso.');
      return;
    }

    setIsRefunding(true);
    try {
      const response = await base44.functions.invoke('refundPayment', {
        tripId: serviceRequest.id,
        tripType: 'ServiceRequest',
        refundReason: refundReason
      });

      if (response.data && response.data.success) {
        setSuccess('Pagamento reembolsado com sucesso!');
        setShowRefundDialog(false);
        queryClient.invalidateQueries({ queryKey: ['serviceRequests'] });
        // Pode ser necessário notificar o pai para fechar ou atualizar
      } else {
        throw new Error(response.data?.error || 'Erro ao processar reembolso');
      }
    } catch (err) {
      console.error('Erro no reembolso:', err);
      setError(err.message || 'Erro ao processar reembolso');
    } finally {
      setIsRefunding(false);
    }
  };

  const copyPaymentLink = () => {
    if (formData.payment_link) {
      navigator.clipboard.writeText(formData.payment_link);
      setSuccess('Link copiado!');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  const addCostCenter = () => {
    setCostAllocation([...costAllocation, {
      cost_center_id: '',
      cost_center_code: '',
      cost_center_name: '',
      allocation_type: 'percentage',
      allocation_value: 0
    }]);
  };

  const updateCostCenter = (index, field, value) => {
    const updated = [...costAllocation];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'cost_center_id' && value) {
      const cc = costCenters.find(c => c.id === value);
      if (cc) {
        updated[index].cost_center_code = cc.code;
        updated[index].cost_center_name = cc.name;
      }
    }
    
    setCostAllocation(updated);
  };

  const removeCostCenter = (index) => {
    setCostAllocation(costAllocation.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-300">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">{success}</AlertDescription>
        </Alert>
      )}

      {/* Forma de Pagamento */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Forma de Pagamento
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billing_method">Método de Cobrança</Label>
            <Select
              value={formData.billing_method}
              onValueChange={(value) => handleChange('billing_method', value)}
            >
              <SelectTrigger id="billing_method">
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoiced">Faturado (Boleto/Mensal)</SelectItem>
                <SelectItem value="credit_card">Cartão de Crédito (Link)</SelectItem>
                <SelectItem value="purchase_order">Ordem de Compra (PO)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.billing_method === 'credit_card' && (
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center">
                <Label className="text-indigo-900 font-medium">Link de Pagamento (Stripe)</Label>
                {!formData.payment_link && (
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleGeneratePaymentLink}
                    disabled={isGeneratingLink}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isGeneratingLink ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-3 h-3 mr-2" />
                        Gerar Link Agora
                      </>
                    )}
                  </Button>
                )}
              </div>

              {formData.payment_link ? (
                <div className="flex items-center gap-2">
                  <Input 
                    value={formData.payment_link} 
                    readOnly 
                    className="bg-white text-xs font-mono text-gray-600"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleGeneratePaymentLink}
                    disabled={isGeneratingLink}
                    title="Gerar Novo Link com Valor Atual"
                    className="shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    {isGeneratingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={copyPaymentLink}
                    title="Copiar Link"
                    className="shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <a 
                    href={formData.payment_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button type="button" size="icon" variant="ghost" title="Abrir Link">
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                    </Button>
                  </a>
                </div>
              ) : (
                <p className="text-xs text-indigo-600 italic">
                  Selecione o valor da viagem na aba "Detalhes" antes de gerar o link.
                </p>
              )}
              {formData.payment_link && (
                <div className="flex flex-col gap-2 mt-2">
                    <p className="text-[10px] text-gray-500">
                    * Para atualizar o valor, salve as alterações de preço primeiro e depois clique no botão de atualizar link.
                    </p>
                    
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-indigo-100">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-700">Status do Pagamento:</span>
                            {serviceRequest.payment_status === 'pago' ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                    <CheckCircle className="w-3 h-3" /> Pago
                                </span>
                            ) : serviceRequest.payment_status === 'reembolsado' ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                    <RotateCcw className="w-3 h-3" /> Reembolsado
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                    <Clock className="w-3 h-3" /> Pendente
                                </span>
                            )}
                        </div>

                        {serviceRequest.payment_status === 'pago' && (
                            <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => setShowRefundDialog(true)}
                                className="h-7 text-xs"
                            >
                                <RotateCcw className="w-3 h-3 mr-1" /> Reembolsar
                            </Button>
                        )}
                    </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rateio de Centro de Custo */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Rateio de Centro de Custo</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCostCenter}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Centro de Custo
          </Button>
        </div>

        {costAllocation.length > 0 ? (
          <div className="space-y-3">
            {costAllocation.map((allocation, index) => (
              <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-900">Centro de Custo {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCostCenter(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Centro de Custo Cadastrado</Label>
                    <Select
                      value={allocation.cost_center_id}
                      onValueChange={(value) => updateCostCenter(index, 'cost_center_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione ou deixe em branco" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Manual</SelectItem>
                        {costCenters.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.code} - {cc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!allocation.cost_center_id && (
                    <>
                      <div className="space-y-2">
                        <Label>Código do Centro de Custo *</Label>
                        <Input
                          value={allocation.cost_center_code}
                          onChange={(e) => updateCostCenter(index, 'cost_center_code', e.target.value)}
                          placeholder="Ex: CC-001"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Nome do Centro de Custo *</Label>
                        <Input
                          value={allocation.cost_center_name}
                          onChange={(e) => updateCostCenter(index, 'cost_center_name', e.target.value)}
                          placeholder="Ex: Departamento de Marketing"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Tipo de Alocação</Label>
                    <Select
                      value={allocation.allocation_type}
                      onValueChange={(value) => updateCostCenter(index, 'allocation_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentual (%)</SelectItem>
                        <SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {allocation.allocation_type === 'percentage' ? 'Percentual (%)' : 'Valor (R$)'}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={allocation.allocation_type === 'percentage' ? '100' : undefined}
                        value={allocation.allocation_value}
                        onChange={(e) => updateCostCenter(index, 'allocation_value', parseFloat(e.target.value) || 0)}
                        placeholder={allocation.allocation_type === 'percentage' ? 'Ex: 50' : 'Ex: 100.00'}
                      />
                      {allocation.allocation_type === 'percentage' ? (
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      ) : (
                        <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {allocation.allocation_type === 'percentage' && serviceRequest.chosen_client_price && (
                    <div className="md:col-span-2 bg-white rounded p-2 text-sm">
                      <span className="text-gray-600">Valor calculado: </span>
                      <span className="font-bold text-purple-700">
                        {formatPrice((serviceRequest.chosen_client_price * allocation.allocation_value) / 100)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhum centro de custo alocado
          </p>
        )}
      </div>

      {/* Despesas Adicionais Reportadas pelo Motorista */}
      {serviceRequest.driver_reported_additional_expenses && serviceRequest.driver_reported_additional_expenses.length > 0 && (
        <div className="space-y-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-orange-900">Despesas Adicionais Reportadas pelo Motorista</h3>
          </div>
          <div className="space-y-3">
            {serviceRequest.driver_reported_additional_expenses.map((expense, index) => (
              <div key={index} className="bg-white rounded-md p-3 border border-orange-100 shadow-sm">
                <p className="text-sm font-medium text-gray-800">{expense.type === 'hora_espera' ? `Hora de Espera (${expense.quantity_minutes} min)` : expense.type.charAt(0).toUpperCase() + expense.type.slice(1)}</p>
                <p className="text-xs text-gray-600">Valor: {formatPrice(expense.value)}</p>
                {expense.description && <p className="text-xs text-gray-600">Descrição: {expense.description}</p>}
                {expense.receipt_url && (
                  <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                    <Download className="w-3 h-3" /> Ver Comprovante
                  </a>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-orange-200 pt-3 mt-3">
            <p className="font-bold text-sm text-orange-900 flex justify-between items-center">
              <span>Total de Despesas Reportadas:</span>
              <span>{formatPrice(serviceRequest.driver_reported_additional_expenses.reduce((sum, exp) => sum + (exp.value || 0), 0))}</span>
            </p>
          </div>
        </div>
      )}

      {/* Observações */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Informações adicionais sobre a viagem..."
          rows={3}
        />
      </div>

      {/* Dialog de Reembolso */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                    <RotateCcw className="w-5 h-5" />
                    Confirmar Reembolso
                </DialogTitle>
                <DialogDescription>
                    Esta ação irá estornar o valor pago pelo cliente e cancelar a viagem.
                </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
                <div className="space-y-2">
                    <Label htmlFor="refundReason">Motivo do Reembolso</Label>
                    <Textarea 
                        id="refundReason"
                        value={refundReason} 
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder="Ex: Cancelamento solicitado pelo cliente, erro na cobrança..."
                        className="min-h-[80px]"
                    />
                </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowRefundDialog(false)}
                    disabled={isRefunding}
                >
                    Cancelar
                </Button>
                <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleRefundPayment}
                    disabled={isRefunding}
                >
                    {isRefunding ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processando...
                        </>
                    ) : (
                        <>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Confirmar Reembolso
                        </>
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}