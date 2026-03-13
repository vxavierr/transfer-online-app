import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Trash2,
  Percent,
  CheckCircle,
  Edit2,
  X,
  Save
} from 'lucide-react';

export default function CostCenterAllocation({ 
  allocations, 
  onChange, 
  totalPrice 
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(price || 0);
  };

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditValue(String(allocations[index].allocation_value || 0));
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    
    const newValue = parseFloat(editValue);
    if (isNaN(newValue) || newValue <= 0 || newValue > 100) {
      alert('O percentual deve estar entre 0 e 100%');
      return;
    }

    const updatedAllocations = allocations.map((item, idx) => 
      idx === editingIndex 
        ? { ...item, allocation_value: newValue }
        : item
    );

    onChange(updatedAllocations);
    setEditingIndex(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const handleRemove = (index) => {
    const newAllocations = allocations.filter((_, i) => i !== index);
    
    // Redistribuir percentuais automaticamente após remoção
    if (newAllocations.length > 0) {
      const equalShare = 100 / newAllocations.length;
      const redistributed = newAllocations.map(a => ({
        ...a,
        allocation_value: equalShare
      }));
      onChange(redistributed);
    } else {
      onChange(newAllocations);
    }
  };

  if (!allocations || allocations.length === 0) return null;

  const totalPercentage = allocations.reduce((sum, a) => sum + (parseFloat(a.allocation_value) || 0), 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  return (
    <div className="space-y-3">
      {allocations.map((allocation, index) => (
        <Card key={`${allocation.cost_center_code}-${index}`} className="bg-purple-50 border border-purple-200">
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-purple-700">
                    {allocation.cost_center_code}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="font-medium text-gray-900">{allocation.cost_center_name}</span>
                </div>
                
                {editingIndex === index ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-24 h-8 text-sm"
                      autoFocus
                    />
                    <span className="text-sm text-gray-600">%</span>
                    <Button
                      onClick={handleSaveEdit}
                      size="sm"
                      className="h-8 bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Salvar
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      size="sm"
                      variant="ghost"
                      className="h-8"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {allocations.length === 1 ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span className="font-semibold text-green-700">
                          100% do total • {formatPrice(totalPrice)}
                        </span>
                      </>
                    ) : (
                      <>
                        <Percent className="w-3 h-3" />
                        <span className="font-semibold">
                          {(allocation.allocation_value || 0).toFixed(2)}% do total
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="font-semibold text-purple-600">
                          {formatPrice((totalPrice * (allocation.allocation_value || 0)) / 100)}
                        </span>
                        <Button
                          onClick={() => handleStartEdit(index)}
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 ml-2"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <Button 
                onClick={() => handleRemove(index)} 
                variant="ghost" 
                size="sm" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {allocations.length > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-blue-900">Total Alocado:</span>
            <div className={`font-bold text-lg ${isValid ? 'text-green-600' : 'text-red-600'}`}>
              {totalPercentage.toFixed(2)}% {isValid ? '✓' : '⚠️'}
            </div>
          </div>
          {!isValid && (
            <p className="text-xs text-red-600 mt-1">
              Atenção: A soma dos percentuais deve ser 100%.
            </p>
          )}
        </div>
      )}
    </div>
  );
}