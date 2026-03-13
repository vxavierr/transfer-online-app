import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PassengerSearchSelect from '@/components/PassengerSearchSelect';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Tag, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function GerenciarTagsPassageiros() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['passengerTags'],
    queryFn: () => base44.entities.PassengerTag.list(),
  });

  const filteredTags = tags.filter(tag => 
    tag.passenger_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.passenger_identifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PassengerTag.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['passengerTags']);
    }
  });

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta tag?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (tag) => {
    setEditingTag(tag);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingTag(null);
    setIsDialogOpen(true);
  };

  const getTagColor = (type) => {
    const colors = {
      'VIP': 'bg-purple-100 text-purple-800 border-purple-200',
      'Atencao': 'bg-amber-100 text-amber-800 border-amber-200',
      'Restricao': 'bg-red-100 text-red-800 border-red-200',
      'Preferencia': 'bg-blue-100 text-blue-800 border-blue-200',
      'Outros': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type] || colors['Outros'];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-8 h-8 text-blue-600" />
            Gerenciar Tags de Passageiros
          </h1>
          <p className="text-gray-500 mt-1">Sinalize passageiros importantes ou com necessidades especiais</p>
        </div>
        <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Tag
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input 
              placeholder="Buscar por nome, email ou observação..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">Nenhuma tag encontrada</h3>
          <p className="text-gray-500">Crie uma tag para começar a sinalizar passageiros.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTags.map(tag => (
            <Card key={tag.id} className={`hover:shadow-md transition-shadow ${!tag.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <Badge className={`${getTagColor(tag.tag_type)} px-2 py-1`}>
                    {tag.tag_type}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleEdit(tag)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(tag.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <h3 className="font-bold text-lg text-gray-900 mb-1">{tag.passenger_name || 'Sem Nome'}</h3>
                <p className="text-sm text-gray-500 mb-3 font-mono bg-gray-100 px-2 py-1 rounded inline-block truncate max-w-full">
                  {tag.passenger_identifier}
                </p>
                
                <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 min-h-[60px]">
                  {tag.notes}
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  {tag.is_active ? (
                    <span className="flex items-center text-green-600 gap-1 font-medium">
                      <CheckCircle className="w-3 h-3" /> Ativa
                    </span>
                  ) : (
                    <span className="flex items-center text-gray-500 gap-1 font-medium">
                      <XCircle className="w-3 h-3" /> Inativa
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TagDialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        tag={editingTag}
        queryClient={queryClient}
      />
    </div>
  );
}

function TagDialog({ open, onClose, tag, queryClient }) {
  const [formData, setFormData] = useState({
    passenger_identifier: '',
    passenger_name: '',
    tag_type: 'Atencao',
    notes: '',
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tag) {
      setFormData({
        passenger_identifier: tag.passenger_identifier,
        passenger_name: tag.passenger_name || '',
        tag_type: tag.tag_type,
        notes: tag.notes,
        is_active: tag.is_active
      });
    } else {
      setFormData({
        passenger_identifier: '',
        passenger_name: '',
        tag_type: 'Atencao',
        notes: '',
        is_active: true
      });
    }
  }, [tag, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const payload = { ...data, created_by_user_id: user.id };
      
      if (tag) {
        return base44.entities.PassengerTag.update(tag.id, payload);
      } else {
        return base44.entities.PassengerTag.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['passengerTags']);
      onClose();
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync(formData);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar tag');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{tag ? 'Editar Tag' : 'Nova Tag de Passageiro'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="passenger_search_select">Passageiro Existente (Opcional)</Label>
            <PassengerSearchSelect
              id="passenger_search_select"
              value={formData.passenger_identifier}
              onSelect={(identifier, name) => setFormData(prev => ({ ...prev, passenger_identifier: identifier, passenger_name: name }))}
              placeholder="Buscar por nome, email ou telefone..."
            />
            <p className="text-xs text-gray-500">Selecione um passageiro existente ou preencha manualmente abaixo.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="identifier">Identificador do Passageiro *</Label>
            <Input 
              id="identifier" 
              placeholder="Email, Telefone ou ID do usuário" 
              value={formData.passenger_identifier}
              onChange={(e) => setFormData({...formData, passenger_identifier: e.target.value})}
              required={!formData.passenger_identifier}
            />
            <p className="text-xs text-gray-500">Use o email ou telefone exato usado nas solicitações.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Passageiro (Opcional)</Label>
            <Input 
              id="name" 
              placeholder="Ex: João Silva" 
              value={formData.passenger_name}
              onChange={(e) => setFormData({...formData, passenger_name: e.target.value})}
              required={!formData.passenger_name && !formData.passenger_identifier}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Tipo de Tag</Label>
            <Select 
              value={formData.tag_type} 
              onValueChange={(val) => setFormData({...formData, tag_type: val})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIP">VIP 🌟</SelectItem>
                <SelectItem value="Atencao">Atenção ⚠️</SelectItem>
                <SelectItem value="Restricao">Restrição 🚫</SelectItem>
                <SelectItem value="Preferencia">Preferência ❤️</SelectItem>
                <SelectItem value="Outros">Outros 📝</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações / Instruções *</Label>
            <Textarea 
              id="notes" 
              placeholder="Ex: Passageiro alérgico a perfumes fortes. Sempre enviar motorista João." 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              required
              className="h-24"
            />
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="active" 
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="active">Tag Ativa</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}