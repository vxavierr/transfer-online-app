import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Plus, Trash2, AlertCircle, CheckCircle, Loader2, Timer, FileText, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ExpensesDialog({ open, onClose, onConfirm, isUpdating }) {
  const [hasAdditionalExpenses, setHasAdditionalExpenses] = useState(null);
  const [additionalExpenses, setAdditionalExpenses] = useState([]);
  const [currentExpense, setCurrentExpense] = useState({
    type: 'estacionamento',
    value: '',
    quantity_minutes: '',
    description: '',
    receipt_url: ''
  });
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setHasAdditionalExpenses(null);
    setAdditionalExpenses([]);
    setCurrentExpense({
      type: 'estacionamento',
      value: '',
      quantity_minutes: '',
      description: '',
      receipt_url: ''
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Formato inválido. Apenas Imagens e PDF.');
      return;
    }

    setIsUploadingReceipt(true);
    setError('');

    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      if (response && response.file_url) {
        setCurrentExpense(prev => ({ ...prev, receipt_url: response.file_url }));
      } else {
        throw new Error('Falha no upload');
      }
    } catch (err) {
      console.error('Erro no upload do recibo:', err);
      setError('Erro ao enviar recibo. Tente novamente.');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleAddExpense = () => {
    setError('');

    let newExpense = {
      type: currentExpense.type,
      receipt_url: currentExpense.receipt_url || null
    };

    if (currentExpense.type === 'hora_espera') {
      if (!currentExpense.quantity_minutes || currentExpense.quantity_minutes <= 0) {
        setError('Informe a quantidade de minutos de espera');
        return;
      }
      newExpense.quantity_minutes = parseInt(currentExpense.quantity_minutes);
    } else {
      if (!currentExpense.value || currentExpense.value <= 0) {
        setError('Informe o valor da despesa');
        return;
      }
      newExpense.value = parseFloat(currentExpense.value);
      
      if (currentExpense.type === 'outros') {
        if (!currentExpense.description.trim()) {
          setError('Informe a descrição da despesa');
          return;
        }
        newExpense.description = currentExpense.description.trim();
      }
    }

    setAdditionalExpenses([...additionalExpenses, newExpense]);
    setCurrentExpense({
      type: 'estacionamento',
      value: '',
      quantity_minutes: '',
      description: '',
      receipt_url: ''
    });
    setError('');
  };

  const handleRemoveExpense = (index) => {
    setAdditionalExpenses(additionalExpenses.filter((_, i) => i !== index));
  };

  const calculateExpensesTotal = () => {
    return additionalExpenses.reduce((total, expense) => {
      if (expense.type === 'hora_espera') return total;
      return total + (parseFloat(expense.value) || 0);
    }, 0);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
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

  const handleConfirm = () => {
    if (hasAdditionalExpenses === null) {
      setError('Por favor, indique se houve despesas adicionais');
      return;
    }

    if (hasAdditionalExpenses && additionalExpenses.length === 0) {
      setError('Adicione pelo menos uma despesa ou selecione "Não"');
      return;
    }

    onConfirm({
      hasAdditionalExpenses,
      additionalExpenses: hasAdditionalExpenses ? additionalExpenses : []
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <span className="text-base sm:text-xl">Finalizar - Despesas Adicionais</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="font-semibold text-blue-900 mb-1 text-sm sm:text-base">
              ❓ Houve despesas adicionais nesta viagem?
            </p>
            <p className="text-xs sm:text-sm text-blue-800 mb-3">
              (Estacionamento, pedágio, horas de espera, etc.)
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => {
                  setHasAdditionalExpenses(true);
                  setError('');
                }}
                variant={hasAdditionalExpenses === true ? 'default' : 'outline'}
                className={`h-10 sm:h-12 text-sm sm:text-base font-bold ${hasAdditionalExpenses === true ? 'bg-blue-600' : ''}`}
              >
                Sim
              </Button>
              <Button
                onClick={() => {
                  setHasAdditionalExpenses(false);
                  setAdditionalExpenses([]);
                  setError('');
                }}
                variant={hasAdditionalExpenses === false ? 'default' : 'outline'}
                className={`h-10 sm:h-12 text-sm sm:text-base font-bold ${hasAdditionalExpenses === false ? 'bg-green-600' : ''}`}
              >
                Não
              </Button>
            </div>
          </div>

          {hasAdditionalExpenses && (
            <>
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                  <Plus className="w-4 h-4" />
                  Adicionar Despesa
                </h3>

                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Tipo *</Label>
                  <select
                    value={currentExpense.type}
                    onChange={(e) => setCurrentExpense({ ...currentExpense, type: e.target.value, value: '', quantity_minutes: '', description: '' })}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                  >
                    <option value="estacionamento">Estacionamento</option>
                    <option value="pedagio">Pedágio</option>
                    <option value="hora_espera">Hora Parada</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                {currentExpense.type === 'hora_espera' ? (
                  <div className="space-y-2">
                    <Label htmlFor="quantity_minutes" className="text-xs sm:text-sm">Minutos *</Label>
                    <Input
                      id="quantity_minutes"
                      type="number"
                      min="1"
                      value={currentExpense.quantity_minutes}
                      onChange={(e) => setCurrentExpense({ ...currentExpense, quantity_minutes: e.target.value })}
                      placeholder="Ex: 30"
                      className="h-10 text-sm"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="value" className="text-xs sm:text-sm">Valor (R$) *</Label>
                    <Input
                      id="value"
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentExpense.value}
                      onChange={(e) => setCurrentExpense({ ...currentExpense, value: e.target.value })}
                      placeholder="0.00"
                      className="h-10 text-sm"
                    />
                  </div>
                )}

                {currentExpense.type === 'outros' && (
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-xs sm:text-sm">Descrição *</Label>
                    <Input
                      id="description"
                      value={currentExpense.description}
                      onChange={(e) => setCurrentExpense({ ...currentExpense, description: e.target.value })}
                      placeholder="Ex: Lavagem do veículo"
                      className="h-10 text-sm"
                    />
                  </div>
                )}

                {currentExpense.type !== 'hora_espera' && (
                  <div className="space-y-2">
                    <Label htmlFor="receipt" className="text-xs sm:text-sm flex items-center justify-between">
                      <span>Comprovante (Opcional)</span>
                      {currentExpense.receipt_url && <span className="text-green-600 text-xs font-bold">✓ Anexado</span>}
                    </Label>
                    
                    <div className="flex gap-2">
                      <label className={`flex-1 flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer transition-colors ${
                        currentExpense.receipt_url 
                          ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleReceiptUpload}
                          className="hidden"
                          disabled={isUploadingReceipt}
                        />
                        {isUploadingReceipt ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                        ) : currentExpense.receipt_url ? (
                          <><FileText className="w-4 h-4 mr-2" /> Alterar Recibo</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" /> Upload</>
                        )}
                      </label>
                      
                      {currentExpense.receipt_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => setCurrentExpense(prev => ({ ...prev, receipt_url: '' }))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleAddExpense}
                  disabled={isUploadingReceipt}
                  className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {additionalExpenses.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 text-sm">Despesas:</h3>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {additionalExpenses.map((expense, index) => (
                      <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-purple-100 text-purple-800 text-xs">
                                {getExpenseTypeLabel(expense.type)}
                              </Badge>
                              {expense.receipt_url && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] gap-1 px-1.5 h-5">
                                  <FileText className="w-3 h-3" />
                                  Recibo
                                </Badge>
                              )}
                            </div>
                            {expense.type === 'hora_espera' ? (
                              <div className="text-xs">
                                <Timer className="w-3 h-3 inline mr-1 text-gray-400" />
                                <span className="font-semibold">{expense.quantity_minutes}min</span>
                              </div>
                            ) : (
                              <div className="text-sm font-bold text-purple-700">
                                {formatPrice(expense.value)}
                              </div>
                            )}
                            {expense.description && (
                              <p className="text-xs text-gray-600 mt-1 truncate">{expense.description}</p>
                            )}
                          </div>
                          <Button
                            onClick={() => handleRemoveExpense(index)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-blue-900 text-xs sm:text-sm">Total:</span>
                      <span className="text-lg sm:text-xl font-bold text-blue-700">
                        {formatPrice(calculateExpensesTotal())}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {hasAdditionalExpenses !== null && (
            <Alert className="bg-amber-50 border-amber-200 py-2">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
              <AlertDescription className="text-xs sm:text-sm text-amber-800">
                {hasAdditionalExpenses 
                  ? '⚠️ O status será "Aguardando Confirmação" até aprovação.'
                  : '✅ A viagem será finalizada e concluída imediatamente.'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 pt-3">
          <Button
            onClick={handleConfirm}
            disabled={isUpdating || hasAdditionalExpenses === null}
            className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Finalização
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full h-10 text-sm"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}