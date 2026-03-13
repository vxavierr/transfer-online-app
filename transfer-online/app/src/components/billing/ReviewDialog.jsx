import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, CheckCircle, AlertCircle, Plus, Trash2, Loader2, DollarSign, ParkingCircle, Timer, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatPrice = (price) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price || 0);

const expenseLabels = { estacionamento: 'Estacionamento', pedagio: 'Pedágio', hora_espera: 'Hora Parada/Espera', outros: 'Outros' };
const expenseIcons = { estacionamento: ParkingCircle, pedagio: DollarSign, hora_espera: Timer, outros: FileText };

export default function ReviewDialog({
  showReviewDialog, setShowReviewDialog,
  reviewingRequest, setReviewingRequest,
  approvedExpenses, setApprovedExpenses,
  newExpense, setNewExpense,
  reviewNotes, setReviewNotes,
  reviewError, setReviewError,
  isApprovingReview,
  handleAddExpenseInReview,
  handleRemoveExpenseInReview,
  handleEditExpenseValue,
  calculateApprovedExpensesTotal,
  handleApproveReview
}) {
  const handleClose = () => {
    setShowReviewDialog(false);
    setReviewingRequest(null);
    setApprovedExpenses([]);
    setNewExpense({ type: 'estacionamento', value: '', quantity_minutes: '', description: '' });
    setReviewNotes('');
    setReviewError('');
  };

  return (
    <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Edit className="w-6 h-6 text-orange-600" />
            Revisão de Valores - {reviewingRequest?.request_number}
          </DialogTitle>
        </DialogHeader>

        {reviewingRequest && (
          <div className="space-y-6 py-4">
            {reviewError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{reviewError}</AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">📋 Resumo da Viagem</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-blue-700">Passageiro:</span><span className="font-semibold ml-2">{reviewingRequest.passenger_name}</span></div>
                  <div>
                    <span className="text-blue-700">Data:</span>
                    <span className="font-semibold ml-2">
                      {format(new Date(reviewingRequest.date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })} às {reviewingRequest.time}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Rota:</span>
                    <div className="font-medium text-xs mt-1">{reviewingRequest.origin} → {reviewingRequest.destination}</div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-3">💰 Valor Original</h3>
                <div className="text-4xl font-bold text-green-700">{formatPrice(reviewingRequest.chosen_supplier_cost)}</div>
                <p className="text-xs text-green-700 mt-2">Valor negociado inicialmente</p>
              </div>
            </div>

            {reviewingRequest.driver_reported_additional_expenses?.length > 0 && (
              <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Despesas Reportadas pelo Motorista
                </h3>
                <div className="space-y-2">
                  {reviewingRequest.driver_reported_additional_expenses.map((expense, idx) => {
                    const Icon = expenseIcons[expense.type] || DollarSign;
                    return (
                      <div key={idx} className="bg-white border border-purple-200 rounded p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-purple-600" />
                            <span className="font-medium">{expenseLabels[expense.type] || expense.type}</span>
                            {expense.description && <span className="text-sm text-gray-600">- {expense.description}</span>}
                            {expense.type === 'hora_espera' && <Badge variant="outline" className="text-xs">{expense.quantity_minutes} min</Badge>}
                          </div>
                          {expense.value && <span className="font-bold text-purple-700">{formatPrice(expense.value)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-2 border-blue-300 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Despesas Aprovadas para Faturamento
              </h3>

              {approvedExpenses.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {approvedExpenses.map((expense, idx) => {
                    const Icon = expenseIcons[expense.type] || DollarSign;
                    return (
                      <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 flex-1">
                            <Icon className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-sm">{expenseLabels[expense.type] || expense.type}</span>
                            {expense.description && <span className="text-sm text-gray-600">- {expense.description}</span>}
                            {expense.type === 'hora_espera' && expense.quantity_minutes && (
                              <Badge variant="outline" className="text-xs">{expense.quantity_minutes} min</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number" min="0" step="0.01"
                              value={expense.value}
                              onChange={(e) => handleEditExpenseValue(idx, e.target.value)}
                              className="w-32 text-right"
                              placeholder="0.00"
                            />
                            <Button onClick={() => handleRemoveExpenseInReview(idx)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Alert className="mb-4 bg-gray-50">
                  <AlertCircle className="h-4 w-4 text-gray-500" />
                  <AlertDescription className="text-gray-600 text-sm">
                    Nenhuma despesa adicional aprovada. Adicione novas despesas abaixo, se houver.
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar/Ajustar Despesa
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Despesa</Label>
                    <select
                      value={newExpense.type}
                      onChange={(e) => setNewExpense({ ...newExpense, type: e.target.value, value: '', quantity_minutes: '', description: '' })}
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                    >
                      <option value="estacionamento">Estacionamento</option>
                      <option value="pedagio">Pedágio</option>
                      <option value="hora_espera">Hora Parada/Espera</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                  {newExpense.type === 'hora_espera' && (
                    <div className="space-y-2">
                      <Label>Quantidade de Minutos</Label>
                      <Input type="number" min="1" value={newExpense.quantity_minutes}
                        onChange={(e) => setNewExpense({ ...newExpense, quantity_minutes: e.target.value })} placeholder="30" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" min="0" step="0.01" value={newExpense.value}
                      onChange={(e) => setNewExpense({ ...newExpense, value: e.target.value })} placeholder="0.00" />
                  </div>
                  {newExpense.type === 'outros' && (
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Input value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Descreva a despesa" />
                    </div>
                  )}
                </div>
                <Button onClick={handleAddExpenseInReview} variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Despesa
                </Button>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 mt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-800">Valor Original da Viagem:</span>
                    <span className="font-semibold text-green-900">{formatPrice(reviewingRequest.chosen_supplier_cost)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-800">Total de Despesas Adicionais:</span>
                    <span className="font-semibold text-green-900">+ {formatPrice(calculateApprovedExpensesTotal())}</span>
                  </div>
                  <div className="border-t-2 border-green-300 pt-3 flex justify-between items-center">
                    <span className="font-bold text-green-900 text-lg">Valor Final para Faturamento:</span>
                    <span className="text-3xl font-bold text-green-700">
                      {formatPrice(reviewingRequest.chosen_supplier_cost + calculateApprovedExpensesTotal())}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações da Revisão (Opcional)</Label>
              <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Adicione observações sobre os ajustes realizados..." className="h-20" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleApproveReview} disabled={isApprovingReview} className="bg-green-600 hover:bg-green-700">
            {isApprovingReview ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aprovando...</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" />Aprovar e Liberar para Faturamento</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}