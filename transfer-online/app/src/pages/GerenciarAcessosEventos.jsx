import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Calendar, Search, CheckCircle, XCircle, Clock } from "lucide-react";
import GenericTable from "@/components/ui/GenericTable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function GerenciarAcessosEventos() {
  const [accessList, setAccessList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    user_email: "",
    start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_date: "",
    price: "",
    notes: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.EventModuleAccess.list('-created_date', 50);
      setAccessList(data);
    } catch (error) {
      console.error("Erro ao carregar acessos:", error);
      toast({ title: "Erro", description: "Falha ao carregar lista de acessos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!formData.user_email || !formData.end_date) {
      toast({ title: "Campos obrigatórios", description: "Informe o email e a data de término.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Find user by email (using list and filter locally or backend function if list is huge, but here let's try filter)
      // Since email is not unique in some systems but usually is, let's try to find one.
      // We can use base44.functions.invoke to find user securely by email if needed, but let's try entity filter first if User entity is readable (admin usually can).
      // Wait, User entity is special. List might return many. Admin can list all users.
      
      // Use backend function to find user (case-insensitive and bypassing potential RLS limits)
      const { data: { user: targetUser } } = await base44.functions.invoke('findUserByEmail', { 
        email: formData.user_email 
      });

      if (!targetUser) {
        toast({ title: "Usuário não encontrado", description: "Não encontramos um usuário com este e-mail.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      // 2. Create Access Record
      const accessRecord = await base44.entities.EventModuleAccess.create({
        user_id: targetUser.id,
        user_name: targetUser.full_name,
        user_email: targetUser.email,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        price: parseFloat(formData.price) || 0,
        status: 'active',
        payment_status: 'pending',
        notes: formData.notes
      });

      // 3. Update User Entity with Flags
      // Using backend function might be safer but admin can update user if fields are in User.json schema (which we added).
      // Since we modified User.json, we can try direct update via SDK if admin has permission.
      // However, User entity security rules might prevent direct update of some fields.
      // Let's try. If it fails, we'll need a backend function.
      // Actually, usually admin can update users.
      
      await base44.entities.User.update(targetUser.id, {
        event_access_active: true,
        event_access_valid_until: new Date(formData.end_date).toISOString()
      });

      toast({ 
        title: "Acesso Concedido", 
        description: `Módulo de eventos liberado para ${targetUser.full_name} até ${format(new Date(formData.end_date), "dd/MM/yyyy")}.`,
        className: "bg-green-50 border-green-200" 
      });

      setShowDialog(false);
      setFormData({
        user_email: "",
        start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        end_date: "",
        price: "",
        notes: ""
      });
      loadData();

    } catch (error) {
      console.error("Erro ao conceder acesso:", error);
      toast({ title: "Erro", description: error.message || "Falha ao processar.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeAccess = async (access) => {
    if (!confirm(`Deseja revogar o acesso de ${access.user_name}?`)) return;

    try {
      await base44.entities.EventModuleAccess.update(access.id, { status: 'revoked' });
      await base44.entities.User.update(access.user_id, {
        event_access_active: false
      });
      
      toast({ title: "Acesso Revogado", description: "O usuário não tem mais acesso ao módulo de eventos." });
      loadData();
    } catch (error) {
        console.error("Erro ao revogar:", error);
        toast({ title: "Erro", description: "Falha ao revogar acesso.", variant: "destructive" });
    }
  };

  const columns = [
    {
      header: "Usuário",
      accessor: "user_name",
      render: (item) => (
        <div>
          <div className="font-medium">{item.user_name}</div>
          <div className="text-xs text-gray-500">{item.user_email}</div>
        </div>
      )
    },
    {
      header: "Validade",
      render: (item) => (
        <div className="text-sm">
            <div>Início: {format(new Date(item.start_date), "dd/MM/yyyy")}</div>
            <div className={new Date(item.end_date) < new Date() ? "text-red-500 font-bold" : "text-green-600"}>
                Fim: {format(new Date(item.end_date), "dd/MM/yyyy")}
            </div>
        </div>
      )
    },
    {
      header: "Valor",
      accessor: "price",
      render: (item) => item.price ? `R$ ${item.price.toFixed(2)}` : "Cortesia"
    },
    {
      header: "Status",
      accessor: "status",
      render: (item) => {
        let color = "bg-gray-100 text-gray-800";
        let label = item.status;
        
        if (item.status === 'active') {
            if (new Date(item.end_date) < new Date()) {
                label = 'Expirado';
                color = "bg-red-100 text-red-800";
            } else {
                label = 'Ativo';
                color = "bg-green-100 text-green-800";
            }
        } else if (item.status === 'revoked') {
            label = 'Revogado';
            color = "bg-red-100 text-red-800";
        }

        return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>{label}</span>;
      }
    },
    {
      header: "Ações",
      render: (item) => (
        item.status === 'active' && new Date(item.end_date) > new Date() ? (
            <Button variant="ghost" size="sm" onClick={() => handleRevokeAccess(item)} className="text-red-600 hover:text-red-800 hover:bg-red-50">
                Revogar
            </Button>
        ) : null
      )
    }
  ];

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Acessos Temporários a Eventos</h1>
          <p className="text-gray-500">Gerencie permissões temporárias para gestores de eventos externos</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-5 h-5 mr-2" />
          Novo Acesso
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <GenericTable columns={columns} data={accessList} emptyMessage="Nenhum acesso registrado." />
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conceder Acesso a Eventos</DialogTitle>
            <DialogDescription>
              Libere o módulo de gestão de eventos para um usuário por tempo determinado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email do Usuário (deve estar cadastrado)</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="usuario@exemplo.com" 
                  className="pl-8"
                  value={formData.user_email}
                  onChange={(e) => setFormData({...formData, user_email: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início do Acesso</Label>
                <Input 
                  type="datetime-local" 
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Fim do Acesso</Label>
                <Input 
                  type="datetime-local" 
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Valor Cobrado (R$)</Label>
                    <Input 
                        type="number" 
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                    />
                </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input 
                placeholder="Ex: Evento XPTO de Março"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleGrantAccess} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Conceder Acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}