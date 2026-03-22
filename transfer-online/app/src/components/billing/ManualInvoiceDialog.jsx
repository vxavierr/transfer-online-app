import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Loader2, Receipt } from 'lucide-react';

export default function ManualInvoiceDialog({
  open,
  onOpenChange,
  data,
  setData,
  onSubmit,
  isPending,
  error,
}) {
  const updateField = (field, value) => setData((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            Lançar Fatura Manual
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
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Use esta opção para lançar cobranças avulsas que não vieram de viagens já vinculadas ao sistema.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manual_client_name">Cliente / Sacado *</Label>
              <Input
                id="manual_client_name"
                value={data.manual_client_name}
                onChange={(e) => updateField('manual_client_name', e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual_client_document">CPF / CNPJ</Label>
              <Input
                id="manual_client_document"
                value={data.manual_client_document}
                onChange={(e) => updateField('manual_client_document', e.target.value)}
                placeholder="Documento do cliente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual_client_email">E-mail do Cliente</Label>
              <Input
                id="manual_client_email"
                type="email"
                value={data.manual_client_email}
                onChange={(e) => updateField('manual_client_email', e.target.value)}
                placeholder="financeiro@cliente.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_amount">Valor Total *</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                value={data.total_amount}
                onChange={(e) => updateField('total_amount', e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Vencimento *</Label>
              <Input
                id="due_date"
                type="date"
                value={data.due_date}
                onChange={(e) => updateField('due_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual_payment_method">Forma de Recebimento *</Label>
              <Select
                value={data.payment_method_description}
                onValueChange={(value) => updateField('payment_method_description', value)}
              >
                <SelectTrigger id="manual_payment_method">
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
            <Label htmlFor="manual_description">Descrição da Fatura *</Label>
            <Textarea
              id="manual_description"
              value={data.manual_description}
              onChange={(e) => updateField('manual_description', e.target.value)}
              placeholder="Descreva o serviço, cobrança ou ajuste que está sendo faturado"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank_account_details">Dados para Recebimento</Label>
            <Textarea
              id="bank_account_details"
              value={data.bank_account_details}
              onChange={(e) => updateField('bank_account_details', e.target.value)}
              placeholder="Ex: Banco, agência, conta ou chave PIX"
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="receipt_number">Número do Recibo</Label>
              <Input
                id="receipt_number"
                value={data.receipt_number}
                onChange={(e) => updateField('receipt_number', e.target.value)}
                placeholder="Ex: REC-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nf_number">Número da NF</Label>
              <Input
                id="nf_number"
                value={data.nf_number}
                onChange={(e) => updateField('nf_number', e.target.value)}
                placeholder="Ex: 12345"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} className="bg-blue-600 hover:bg-blue-700" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 mr-2" />
                Criar Fatura Manual
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}