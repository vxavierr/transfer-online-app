import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Plus,
  Trash2,
  Edit,
  Briefcase,
  CheckCircle,
  AlertCircle,
  FileText,
  Upload
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function ClientCostCentersManager({ client, open, onClose }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    active: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importMode, setImportMode] = useState(false);
  const [importText, setImportText] = useState('');

  // Fetch Cost Centers for this client
  const { data: costCenters = [], isLoading } = useQuery({
    queryKey: ['costCenters', client?.id],
    queryFn: () => base44.entities.CostCenter.filter({ client_id: client.id }),
    enabled: !!client,
    initialData: []
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CostCenter.create({ ...data, client_id: client.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCenters', client.id] });
      setSuccess('Centro de custo adicionado com sucesso!');
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => setError(err.message || 'Erro ao criar centro de custo')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CostCenter.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCenters', client.id] });
      setSuccess('Centro de custo atualizado com sucesso!');
      resetForm();
      setIsEditing(null);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => setError(err.message || 'Erro ao atualizar centro de custo')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CostCenter.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCenters', client.id] });
      setSuccess('Centro de custo removido com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => setError(err.message || 'Erro ao remover centro de custo')
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (items) => {
      // Using individual creates for now as bulkCreate might not be available/configured same way in this context
      // or to ensure client_id attachment securely. 
      // Optimized: Create promise array
      const promises = items.map(item => 
        base44.entities.CostCenter.create({ ...item, client_id: client.id })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCenters', client.id] });
      setSuccess('Centros de custo importados com sucesso!');
      setImportMode(false);
      setImportText('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => setError(err.message || 'Erro na importação em massa')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      setError('Código e Nome são obrigatórios');
      return;
    }

    if (isEditing) {
      updateMutation.mutate({ id: isEditing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (cc) => {
    setIsEditing(cc);
    setFormData({
      code: cc.code,
      name: cc.name,
      description: cc.description || '',
      active: cc.active
    });
    setError('');
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja remover este centro de custo?')) {
      deleteMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({ code: '', name: '', description: '', active: true });
    setIsEditing(null);
    setError('');
  };

  const handleBulkImport = () => {
    if (!importText.trim()) {
      setError('Cole o conteúdo para importar');
      return;
    }

    try {
      // Expected format: CODE;NAME;DESCRIPTION (CSV-like)
      const lines = importText.split('\n').filter(line => line.trim());
      const items = lines.map(line => {
        // Try semicolon first, then comma
        let parts = line.split(';');
        if (parts.length < 2) parts = line.split(',');
        
        if (parts.length < 2) throw new Error(`Formato inválido na linha: ${line}`);
        
        return {
          code: parts[0].trim(),
          name: parts[1].trim(),
          description: parts[2] ? parts[2].trim() : '',
          active: true
        };
      });

      bulkCreateMutation.mutate(items);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Briefcase className="w-6 h-6 text-blue-600" />
            Centros de Custo - {client?.name}
          </DialogTitle>
        </DialogHeader>

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

          {/* Form / Actions Area */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">
                {importMode ? 'Importar em Massa' : (isEditing ? 'Editar Centro de Custo' : 'Novo Centro de Custo')}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setImportMode(!importMode);
                  resetForm();
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                {importMode ? <><Plus className="w-4 h-4 mr-2"/> Cadastro Manual</> : <><Upload className="w-4 h-4 mr-2"/> Importar Lista</>}
              </Button>
            </div>

            {importMode ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-2">
                  Cole a lista abaixo no formato: <strong>CÓDIGO;NOME;DESCRIÇÃO</strong> (uma por linha)
                </div>
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="EXEMPLO:
1001;MARKETING;Departamento de Marketing
1002;TI;Tecnologia da Informação"
                  rows={6}
                  className="font-mono text-sm"
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    onClick={handleBulkImport} 
                    disabled={bulkCreateMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {bulkCreateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Upload className="w-4 h-4 mr-2"/>}
                    Processar Importação
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-2 space-y-2">
                  <Label>Código *</Label>
                  <Input 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    placeholder="Ex: 1001"
                  />
                </div>
                <div className="md:col-span-4 space-y-2">
                  <Label>Nome *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Marketing"
                  />
                </div>
                <div className="md:col-span-4 space-y-2">
                  <Label>Descrição</Label>
                  <Input 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Opcional"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {isEditing ? <CheckCircle className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                    <span className="ml-2">{isEditing ? 'Salvar' : 'Adicionar'}</span>
                  </Button>
                </div>
                {isEditing && (
                  <div className="md:col-span-12 flex justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancelar Edição</Button>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* List */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    </TableCell>
                  </TableRow>
                ) : costCenters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      Nenhum centro de custo cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  costCenters.map((cc) => (
                    <TableRow key={cc.id}>
                      <TableCell className="font-medium">{cc.code}</TableCell>
                      <TableCell>{cc.name}</TableCell>
                      <TableCell className="text-gray-500">{cc.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(cc)}>
                          <Edit className="w-4 h-4 text-gray-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(cc.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}