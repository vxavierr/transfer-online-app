import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

export default function AdditionalItemsManager({ 
  items = [], 
  onUpdateItems, 
  additionalItemsCatalog = [], 
  formatPrice,
  showSaveToCatalog = false,
  onSaveToCatalog
}) {
  const [manualItem, setManualItem] = React.useState({ name: '', price: '', quantity: 1 });
  const [saveToCatalog, setSaveToCatalog] = React.useState(false);

  const handleAddItem = () => {
    if (!manualItem.name || !manualItem.price) return;
    
    const newItem = {
      name: manualItem.name,
      price: parseFloat(manualItem.price),
      quantity: parseInt(manualItem.quantity) || 1,
    };
    
    onUpdateItems([...(items || []), newItem]);
    
    if (showSaveToCatalog && saveToCatalog && onSaveToCatalog) {
      onSaveToCatalog(newItem);
    }

    setManualItem({ name: '', price: '', quantity: 1 });
    setSaveToCatalog(false);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onUpdateItems(newItems);
  };

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
      <Label className="font-bold block">Itens Adicionais</Label>
      
      {items?.length > 0 && (
        <div className="space-y-2 mb-4 bg-white p-2 rounded border">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm p-1 hover:bg-gray-50 rounded">
              <div>
                <span className="font-medium">{item.name}</span>
                <span className="text-gray-500 mx-2">x{item.quantity}</span>
                <span className="text-gray-500">({formatPrice(item.price)} un.)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => handleRemoveItem(idx)} 
                  className="h-6 w-6 text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          <div className="text-right text-sm font-bold text-gray-700 pt-2 border-t">
            Total: {formatPrice(items.reduce((acc, item) => acc + (item.price * item.quantity), 0))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-5">
          <Label className="text-xs">Nome</Label>
          <Input 
            value={manualItem.name}
            onChange={(e) => setManualItem({...manualItem, name: e.target.value})}
            placeholder="Ex: Cadeira"
            className="h-8 text-sm bg-white"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Qtd</Label>
          <Input 
            type="number" 
            min="1"
            value={manualItem.quantity}
            onChange={(e) => setManualItem({...manualItem, quantity: e.target.value})}
            className="h-8 text-sm bg-white"
          />
        </div>
        <div className="col-span-3">
          <Label className="text-xs">Valor (R$)</Label>
          <Input 
            type="number" 
            min="0"
            step="0.01"
            value={manualItem.price}
            onChange={(e) => setManualItem({...manualItem, price: e.target.value})}
            placeholder="0.00"
            className="h-8 text-sm bg-white"
          />
        </div>
        <div className="col-span-2">
          <Button 
            onClick={handleAddItem}
            disabled={!manualItem.name || !manualItem.price}
            size="sm"
            className="w-full h-8 bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {showSaveToCatalog && (
        <div className="flex items-center space-x-2 mt-2">
          <Checkbox 
            id="save_item_catalog" 
            checked={saveToCatalog}
            onCheckedChange={setSaveToCatalog}
          />
          <Label htmlFor="save_item_catalog" className="text-xs text-gray-600 font-normal cursor-pointer">
            Salvar item no sistema para futuras cotações
          </Label>
        </div>
      )}
      
      {additionalItemsCatalog.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <Label className="text-xs text-gray-500 mb-1">Sugestões:</Label>
          <div className="flex flex-wrap gap-2">
            {additionalItemsCatalog.map(item => (
              <Badge 
                key={item.id} 
                variant="outline" 
                className="cursor-pointer hover:bg-blue-50 bg-white"
                onClick={() => setManualItem({ name: item.name, price: item.adjustment_value, quantity: 1 })}
              >
                {item.name} ({formatPrice(item.adjustment_value)})
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}