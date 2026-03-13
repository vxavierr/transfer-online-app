import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

export default function GenericForm({
  fields = [], // { name, label, type, options, required, placeholder, disabled, description }
  initialData = {},
  onSubmit,
  onCancel,
  onChange, // Callback for form updates (val) => {}
  isSubmitting = false,
  submitLabel = "Salvar"
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({ ...initialData });
  }, [initialData]);

  const handleChange = (name, value) => {
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    
    if (onChange) {
      onChange(newData);
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    let hasError = false;

    fields.forEach(field => {
      if (field.required && !formData[field.name] && formData[field.name] !== 0 && formData[field.name] !== false) {
        newErrors[field.name] = 'Campo obrigatório';
        hasError = true;
      }
    });

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map(field => {
        if (field.visible === false) return null; // Support conditional visibility

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="flex items-center gap-1">
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            
            {field.type === 'select' ? (
              <Select
                value={String(formData[field.name] || '')}
                onValueChange={(val) => handleChange(field.name, val)}
                disabled={field.disabled}
              >
                <SelectTrigger id={field.name} className={errors[field.name] ? "border-red-500" : ""}>
                  <SelectValue placeholder={field.placeholder || "Selecione..."} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map(opt => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === 'textarea' ? (
              <Textarea
                id={field.name}
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={field.disabled}
                className={errors[field.name] ? "border-red-500" : ""}
              />
            ) : field.type === 'switch' ? (
              <div className="flex items-center space-x-2">
                <Switch
                  id={field.name}
                  checked={!!formData[field.name]}
                  onCheckedChange={(checked) => handleChange(field.name, checked)}
                  disabled={field.disabled}
                />
                <Label htmlFor={field.name} className="font-normal cursor-pointer">
                  {formData[field.name] ? (field.activeLabel || 'Ativo') : (field.inactiveLabel || 'Inativo')}
                </Label>
              </div>
            ) : (
              <Input
                id={field.name}
                type={field.type || 'text'}
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                disabled={field.disabled}
                className={errors[field.name] ? "border-red-500" : ""}
              />
            )}
            
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            
            {errors[field.name] && (
              <p className="text-xs text-red-500">{errors[field.name]}</p>
            )}
          </div>
        );
      })}

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}