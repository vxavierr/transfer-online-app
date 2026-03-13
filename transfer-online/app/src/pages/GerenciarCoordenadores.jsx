import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Users, Plus, Search, Trash2, Edit, Phone, Mail, 
    CheckCircle2, XCircle, MoreVertical, UserCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, 
    DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageContext";

export default function GerenciarCoordenadores() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCoordinator, setEditingCoordinator] = useState(null);
    const [user, setUser] = useState(null);

    // Initial user load
    useEffect(() => {
        const loadUser = async () => {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        };
        loadUser();
    }, []);

    // Fetch coordinators
    const { data: coordinators, isLoading } = useQuery({
        queryKey: ['coordinators', user?.supplier_id],
        queryFn: async () => {
            if (!user?.supplier_id) return [];
            return await base44.entities.Coordinator.filter({
                supplier_id: user.supplier_id
            });
        },
        enabled: !!user?.supplier_id,
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Coordinator.create({
            ...data,
            supplier_id: user.supplier_id
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['coordinators']);
            toast.success("Coordenador cadastrado com sucesso!");
            setIsDialogOpen(false);
            setEditingCoordinator(null);
        },
        onError: (error) => {
            toast.error("Erro ao cadastrar coordenador: " + error.message);
        }
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Coordinator.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['coordinators']);
            toast.success("Coordenador atualizado com sucesso!");
            setIsDialogOpen(false);
            setEditingCoordinator(null);
        },
        onError: (error) => {
            toast.error("Erro ao atualizar coordenador: " + error.message);
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Coordinator.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['coordinators']);
            toast.success("Coordenador removido com sucesso!");
        },
        onError: (error) => {
            toast.error("Erro ao remover coordenador: " + error.message);
        }
    });

    const handleSave = (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = {
            name: formData.get("name"),
            email: formData.get("email"),
            phone_number: formData.get("phone_number"),
            notes: formData.get("notes"),
            active: formData.get("active") === "on"
        };

        if (editingCoordinator) {
            updateMutation.mutate({ id: editingCoordinator.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (coord) => {
        setEditingCoordinator(coord);
        setIsDialogOpen(true);
    };

    const handleDelete = (id) => {
        if (confirm("Tem certeza que deseja remover este coordenador?")) {
            deleteMutation.mutate(id);
        }
    };

    const toggleStatus = (coord) => {
        updateMutation.mutate({
            id: coord.id,
            data: { active: !coord.active }
        });
    };

    const filteredCoordinators = coordinators?.filter(coord => 
        coord.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coord.email.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (!user) return null;

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <UserCheck className="w-8 h-8 text-blue-600" />
                        Gerenciar Coordenadores
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Cadastre e gerencie sua equipe de coordenação de campo
                    </p>
                </div>
                <Button onClick={() => { setEditingCoordinator(null); setIsDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Coordenador
                </Button>
            </div>

            <div className="flex items-center mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredCoordinators.length === 0 ? (
                <Card className="text-center p-12 bg-gray-50 border-dashed">
                    <CardContent>
                        <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Nenhum coordenador encontrado</h3>
                        <p className="text-gray-500 mb-6">Comece cadastrando seu primeiro coordenador de equipe.</p>
                        <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                            Cadastrar Agora
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCoordinators.map((coord) => (
                        <Card key={coord.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                        {coord.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">{coord.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-2 mt-1">
                                            <Badge variant={coord.active ? "success" : "secondary"} className={coord.active ? "bg-green-100 text-green-700 hover:bg-green-200" : ""}>
                                                {coord.active ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </CardDescription>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="-mr-2">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleEdit(coord)}>
                                            <Edit className="w-4 h-4 mr-2" /> Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => toggleStatus(coord)}>
                                            {coord.active ? <XCircle className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                            {coord.active ? "Desativar" : "Ativar"}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDelete(coord.id)} className="text-red-600">
                                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Mail className="w-4 h-4" />
                                        <span className="truncate">{coord.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Phone className="w-4 h-4" />
                                        <span>{coord.phone_number}</span>
                                    </div>
                                    {coord.notes && (
                                        <div className="pt-2 border-t mt-2">
                                            <p className="text-xs text-gray-500 line-clamp-2 italic">
                                                "{coord.notes}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingCoordinator ? "Editar Coordenador" : "Novo Coordenador"}</DialogTitle>
                        <DialogDescription>
                            Preencha os dados do coordenador para contato e gestão.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input 
                                    id="name" 
                                    name="name" 
                                    defaultValue={editingCoordinator?.name} 
                                    required 
                                    placeholder="Ex: João Silva"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email (Opcional)</Label>
                                    <Input 
                                        id="email" 
                                        name="email" 
                                        type="email" 
                                        defaultValue={editingCoordinator?.email} 
                                        placeholder="joao@email.com"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone_number">Telefone / WhatsApp</Label>
                                    <Input 
                                        id="phone_number" 
                                        name="phone_number" 
                                        defaultValue={editingCoordinator?.phone_number} 
                                        required 
                                        placeholder="(11) 99999-9999"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="notes">Observações (Opcional)</Label>
                                <Textarea 
                                    id="notes" 
                                    name="notes" 
                                    defaultValue={editingCoordinator?.notes} 
                                    placeholder="Informações adicionais..."
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch 
                                    id="active" 
                                    name="active" 
                                    defaultChecked={editingCoordinator ? editingCoordinator.active : true} 
                                />
                                <Label htmlFor="active">Coordenador Ativo</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}