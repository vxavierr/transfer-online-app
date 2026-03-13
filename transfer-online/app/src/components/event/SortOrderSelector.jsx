import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronUp, ChevronDown, ListFilter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function SortOrderSelector({
  sortConfig,
  onSortConfigChange,
  availableSortFields
}) {
  // Helper to ensure we always work with an array
  const currentConfig = Array.isArray(sortConfig) ? sortConfig : (sortConfig ? [sortConfig] : []);

  const addSortField = (fieldKey) => {
    if (!currentConfig.find(s => s.key === fieldKey)) {
      onSortConfigChange([
        ...currentConfig,
        { key: fieldKey, direction: 'asc' }
      ]);
    }
  };

  const removeSortField = (fieldKey) => {
    onSortConfigChange(currentConfig.filter(s => s.key !== fieldKey));
  };

  const toggleSortDirection = (fieldKey) => {
    onSortConfigChange(currentConfig.map(s => 
      s.key === fieldKey 
        ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
        : s
    ));
  };

  const moveField = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const newConfig = [...currentConfig];
      const temp = newConfig[index];
      newConfig[index] = newConfig[index - 1];
      newConfig[index - 1] = temp;
      onSortConfigChange(newConfig);
    } else if (direction === 'down' && index < currentConfig.length - 1) {
      const newConfig = [...currentConfig];
      const temp = newConfig[index];
      newConfig[index] = newConfig[index + 1];
      newConfig[index + 1] = temp;
      onSortConfigChange(newConfig);
    }
  };

  const getFieldLabel = (key) => {
    const field = availableSortFields.find(f => f.key === key);
    return field ? field.label : key;
  };
  
  const remainingFields = availableSortFields.filter(field => 
    !currentConfig.some(s => s.key === field.key)
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 bg-white border-dashed">
          <ListFilter className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ordenar ({currentConfig.length})</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium leading-none text-sm">Sequência de Organização</h4>
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {currentConfig.length === 0 && (
              <div className="text-center py-4 text-sm text-gray-500 border-2 border-dashed rounded-md">
                Nenhuma ordenação aplicada
              </div>
            )}
            {currentConfig.map((item, index) => (
              <div
                key={item.key}
                className="flex items-center gap-2 p-2 bg-white border rounded-md shadow-sm group"
              >
                <div className="flex flex-col gap-0.5">
                  <button 
                    onClick={() => moveField(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400"
                    title="Mover para cima"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => moveField(index, 'down')}
                    disabled={index === currentConfig.length - 1}
                    className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400"
                    title="Mover para baixo"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                
                <Badge variant="secondary" className="flex-shrink-0 w-6 h-6 flex items-center justify-center p-0 text-[10px]">
                  {index + 1}
                </Badge>
                
                <span className="flex-1 text-sm font-medium truncate" title={getFieldLabel(item.key)}>
                  {getFieldLabel(item.key)}
                </span>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleSortDirection(item.key)}
                  className="flex-shrink-0 h-7 w-7"
                  title={item.direction === 'asc' ? "Crescente (A-Z)" : "Decrescente (Z-A)"}
                >
                  {item.direction === 'asc' ? <ArrowDown className="w-3.5 h-3.5 text-blue-600" /> : <ArrowUp className="w-3.5 h-3.5 text-orange-600" />}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSortField(item.key)}
                  className="flex-shrink-0 text-gray-400 hover:text-red-600 h-7 w-7"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {remainingFields.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <span className="text-xs text-muted-foreground font-medium">Adicionar Critério:</span>
              <div className="flex flex-wrap gap-1.5">
                {remainingFields.map(field => (
                  <Button
                    key={field.key}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => addSortField(field.key)}
                    className="h-6 text-xs px-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent"
                  >
                    <Plus className="w-3 h-3 mr-1" /> {field.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}