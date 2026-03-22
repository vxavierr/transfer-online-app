import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Download, Users, Calendar, Mail, Phone, Package, MessageSquare, Loader2, Crown, Edit, AlertCircle, Car, Building2, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GerenciarUsuarios() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [userQuotes, setUserQuotes] = useState([]);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  // New states for editing user
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    role: 'user',
    special_preferences: '',
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Verificar se é admin
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setUser(currentUser);
        setIsCheckingAuth(false);
      } catch (error) {
        window.location.href = '/AccessPortal?returnUrl=%2FGerenciarUsuarios';
      }
    };

    checkAuth();
  }, []);

  // Buscar todos os usuários
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list('-created_date'), // Removed the filter for drivers
    enabled: !isCheckingAuth,
    initialData: []
  });

  // Buscar todas as reservas
  const { data: allBookings = [] } = useQuery({
    queryKey: ['allBookingsForUsers'],
    queryFn: () => base44.entities.Booking.list(),
    enabled: !isCheckingAuth,
    initialData: []
  });

  // Buscar todas as cotações
  const { data: allQuotes = [] } = useQuery({
    queryKey: ['allQuotesForUsers'],
    queryFn: () => base44.entities.QuoteRequest.list(),
    enabled: !isCheckingAuth,
    initialData: []
  });

  // Buscar todos os fornecedores (para configuração de permissões de admin)
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['allSuppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: !isCheckingAuth && user?.role === 'admin',
    initialData: []
  });

  // Filtrar usuários
  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.phone_number?.toLowerCase().includes(search)
    );
  });

  // Estatísticas
  const stats = {
    totalUsers: users.length,
    adminUsers: users.filter(u => u.role === 'admin' && !u.is_driver && !u.supplier_id).length,
    supplierUsers: users.filter(u => u.supplier_id).length,
    corporateUsers: users.filter(u => u.client_id && !u.is_driver).length,
    driverUsers: users.filter(u => u.is_driver).length,
    regularUsers: users.filter(u => u.role === 'user' && !u.is_driver && !u.supplier_id && !u.client_id).length,
  };

  // Função para ver detalhes do usuário
  const handleViewUserDetails = async (user) => {
    setSelectedUser(user);
    setLoadingUserDetails(true);

    try {
      // Buscar reservas do usuário
      const userBookingsList = allBookings.filter(b => b.created_by === user.email);
      setUserBookings(userBookingsList);

      // Buscar cotações do usuário
      const userQuotesList = allQuotes.filter(q => q.customer_email === user.email);
      setUserQuotes(userQuotesList);
    } catch (error) {
      console.error('Erro ao buscar detalhes do usuário:', error);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // Function to open edit dialog
  const handleEditUser = (userToEdit) => {
    setEditingUser(userToEdit);
    setFormData({
      full_name: userToEdit.full_name || '',
      email: userToEdit.email || '',
      phone_number: userToEdit.phone_number || '',
      role: userToEdit.role || 'user',
      special_preferences: userToEdit.special_preferences || '',
      viewable_supplier_ids: userToEdit.viewable_supplier_ids || [],
    });
    setError(null);
    setShowDialog(true);
  };

  // Function to close edit dialog
  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingUser(null);
    setFormData({
      full_name: '',
      email: '',
      phone_number: '',
      role: 'user',
      special_preferences: '',
      viewable_supplier_ids: [],
    });
    setError(null);
    setIsSubmitting(false);
  };

  // Mutation for updating user
  const updateUserMutation = useMutation({
    mutationFn: (updatedUserData) => base44.entities.User.update(editingUser.id, updatedUserData),
    onSuccess: () => {
      queryClient.invalidateQueries(['allUsers']);
      if (selectedUser && selectedUser.id === editingUser.id) {
        setSelectedUser((prev) => ({ ...prev, ...formData }));
      }
      handleCloseDialog();
    },
    onError: (err) => {
      console.error('Erro ao atualizar usuário:', err);
      let errorMessage = 'Erro ao atualizar usuário. Verifique os dados e tente novamente.';
      if (err.response && err.response.data && err.response.data.detail) {
        errorMessage = typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail);
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Handle form input changes
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Handle Select change (for role)
  const handleSelectChange = (value, id) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!editingUser) {
      setError('Nenhum usuário selecionado para edição.');
      setIsSubmitting(false);
      return;
    }

    // Basic validation
    if (!formData.full_name || !formData.email || !formData.role) {
      setError('Nome completo, email e perfil são campos obrigatórios.');
      setIsSubmitting(false);
      return;
    }

    try {
      await updateUserMutation.mutateAsync(formData);
    } catch (err) {
      // Error handled by mutation's onError callback
    }
  };


  // Função para exportar usuários para CSV
  const handleExportCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Data de Registro', 'Perfil', 'Nº Reservas', 'Nº Cotações'];

    const rows = filteredUsers.map(user => {
      const userBookingsCount = allBookings.filter(b => b.created_by === user.email).length;
      const userQuotesCount = allQuotes.filter(q => q.customer_email === user.email).length;

      let userType = 'Cliente';
      if (user.is_driver) {
        userType = 'Motorista';
      } else if (user.supplier_id) {
        userType = 'Fornecedor';
      } else if (user.client_id) {
        userType = 'Corporativo';
      } else if (user.role === 'admin') {
        userType = 'Administrador';
      }

      return [
        user.full_name || '',
        user.email || '',
        user.phone_number || '',
        format(new Date(user.created_date), 'dd/MM/yyyy', { locale: ptBR }),
        userType,
        userBookingsCount,
        userQuotesCount
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Gerenciar Usuários
          </h1>
          <p className="text-gray-600">Visualize e gerencie todos os usuários cadastrados na plataforma</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.adminUsers}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Fornecedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.supplierUsers}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Corporativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.corporateUsers}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Car className="w-4 h-4" />
                Motoristas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.driverUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="gap-2"
                disabled={filteredUsers.length === 0}
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Usuários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Carregando usuários...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Nome</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Telefone</TableHead>
                      <TableHead className="font-semibold">Cadastro</TableHead>
                      <TableHead className="font-semibold">Perfil</TableHead>
                      <TableHead className="font-semibold text-center">Reservas</TableHead>
                      <TableHead className="font-semibold text-center">Cotações</TableHead>
                      <TableHead className="font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const userBookingsCount = allBookings.filter(b => b.created_by === user.email).length;
                      const userQuotesCount = allQuotes.filter(q => q.customer_email === user.email).length;

                      return (
                        <TableRow key={user.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="font-medium text-gray-900">{user.full_name || '-'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.phone_number ? (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{user.phone_number}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {format(new Date(user.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.is_driver ? (
                              <Badge className="bg-orange-100 text-orange-800 border-orange-300 border">
                                <Car className="w-3 h-3 mr-1" />
                                Motorista
                              </Badge>
                            ) : user.supplier_id ? (
                              <Badge className="bg-teal-100 text-teal-800 border-teal-300 border">
                                <Building2 className="w-3 h-3 mr-1" />
                                Fornecedor
                              </Badge>
                            ) : user.client_id ? (
                              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 border">
                                <Briefcase className="w-3 h-3 mr-1" />
                                Corporativo
                              </Badge>
                            ) : user.role === 'admin' ? (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-300 border">
                                <Crown className="w-3 h-3 mr-1" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300 border">
                                Cliente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-50">
                              {userBookingsCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-orange-50">
                              {userQuotesCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewUserDetails(user)}
                            >
                              Ver Detalhes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              title="Editar Usuário"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Details Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Detalhes do Usuário</DialogTitle>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-6">
                {/* Informações Pessoais */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Nome Completo</Label>
                        <p className="text-gray-900">{selectedUser.full_name || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Email</Label>
                        <p className="text-gray-900">{selectedUser.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Telefone</Label>
                        <p className="text-gray-900">{selectedUser.phone_number || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Data de Cadastro</Label>
                        <p className="text-gray-900">
                          {format(new Date(selectedUser.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Perfil</Label>
                        {selectedUser.is_driver ? (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-300 border">
                            Motorista
                          </Badge>
                        ) : selectedUser.supplier_id ? (
                          <Badge className="bg-teal-100 text-teal-800 border-teal-300 border">
                            Fornecedor
                          </Badge>
                        ) : selectedUser.client_id ? (
                          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 border">
                            Corporativo
                          </Badge>
                        ) : selectedUser.role === 'admin' ? (
                          <Badge
                            className={'bg-purple-100 text-purple-800 border-purple-300 border'}
                          >
                            Administrador
                          </Badge>
                        ) : (
                          <Badge
                            className={'bg-blue-100 text-blue-800 border-blue-300 border'}
                          >
                            Cliente
                          </Badge>
                        )}
                      </div>
                      {selectedUser.special_preferences && (
                        <div className="md:col-span-2">
                          <Label className="text-sm font-semibold text-gray-600">Preferências Especiais</Label>
                          <p className="text-gray-900">{selectedUser.special_preferences}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Resumo de Atividades */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-gradient-to-br from-green-50 to-green-100">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-700 font-medium">Total de Reservas</p>
                          <p className="text-3xl font-bold text-green-900">{userBookings.length}</p>
                        </div>
                        <Package className="w-12 h-12 text-green-600 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-orange-700 font-medium">Total de Cotações</p>
                          <p className="text-3xl font-bold text-orange-900">{userQuotes.length}</p>
                        </div>
                        <MessageSquare className="w-12 h-12 text-orange-600 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {loadingUserDetails ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Carregando histórico...</p>
                  </div>
                ) : (
                  <>
                    {/* Reservas Recentes */}
                    {userBookings.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="w-5 h-5 text-green-600" />
                            Reservas Recentes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {userBookings.slice(0, 5).map((booking) => (
                              <div
                                key={booking.id}
                                className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="font-mono text-sm font-bold text-blue-600">
                                    {booking.booking_number}
                                  </div>
                                  <Badge
                                    className={
                                      booking.status === 'confirmada'
                                        ? 'bg-green-100 text-green-800 border-green-300 border'
                                        : booking.status === 'pendente'
                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300 border'
                                        : 'bg-gray-100 text-gray-800 border-gray-300 border'
                                    }
                                  >
                                    {booking.status}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-600">
                                  <p className="font-medium">{booking.origin} → {booking.destination}</p>
                                  <p className="text-xs mt-1">
                                    {format(new Date(booking.date), 'dd/MM/yyyy', { locale: ptBR })} às {booking.time}
                                  </p>
                                  <p className="text-xs font-semibold text-blue-600 mt-1">
                                    {formatPrice(booking.total_price)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Cotações Recentes */}
                    {userQuotes.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-orange-600" />
                            Cotações Recentes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {userQuotes.slice(0, 5).map((quote) => (
                              <div
                                key={quote.id}
                                className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="font-mono text-sm font-bold text-orange-600">
                                    {quote.quote_number}
                                  </div>
                                  <Badge
                                    className={
                                      quote.status === 'cotado'
                                        ? 'bg-green-100 text-green-800 border-green-300 border'
                                        : quote.status === 'pendente'
                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300 border'
                                        : 'bg-gray-100 text-gray-800 border-gray-300 border'
                                    }
                                  >
                                    {quote.status}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-600">
                                  <p className="font-medium">{quote.origin} → {quote.destination}</p>
                                  <p className="text-xs mt-1">
                                    {format(new Date(quote.date), 'dd/MM/yyyy', { locale: ptBR })} às {quote.time}
                                  </p>
                                  {quote.admin_quote_price && (
                                    <p className="text-xs font-semibold text-orange-600 mt-1">
                                      {formatPrice(quote.admin_quote_price)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Edição */}
        <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Editar Usuário</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="space-y-6 py-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* ID do Usuário - Somente Leitura */}
                {editingUser && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <Label htmlFor="user_id" className="text-sm font-semibold text-gray-900">
                      ID do Usuário (somente leitura)
                    </Label>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        id="user_id"
                        value={editingUser.id}
                        readOnly
                        className="font-mono text-sm bg-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(editingUser.id);
                          alert('ID copiado para a área de transferência!');
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Nome completo do usuário"
                  />
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                    placeholder="Endereço de e-mail"
                  />
                  <p className="text-sm text-gray-500">O email não pode ser alterado diretamente aqui para manter a integridade dos dados de reservas e cotações.</p>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Telefone</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="(XX) XXXXX-XXXX"
                  />
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role">Perfil</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleSelectChange(value, 'role')}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Cliente</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Permissões de Visualização de Fornecedores (Apenas para Admin) */}
                {formData.role === 'admin' && (
                  <div className="space-y-3 border p-4 rounded-lg bg-gray-50">
                    <Label className="text-sm font-semibold text-gray-900">
                      Restringir visualização a Fornecedores específicos
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Selecione os fornecedores que este administrador pode visualizar. Se nenhum for selecionado, ele verá todos (Super Admin).
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-2 bg-white p-2 border rounded">
                      {allSuppliers.map((supplier) => (
                        <div key={supplier.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`supplier-${supplier.id}`}
                            checked={formData.viewable_supplier_ids?.includes(supplier.id)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setFormData(prev => {
                                const currentIds = prev.viewable_supplier_ids || [];
                                if (isChecked) {
                                  return { ...prev, viewable_supplier_ids: [...currentIds, supplier.id] };
                                } else {
                                  return { ...prev, viewable_supplier_ids: currentIds.filter(id => id !== supplier.id) };
                                }
                              });
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <label htmlFor={`supplier-${supplier.id}`} className="text-sm text-gray-700 cursor-pointer select-none">
                            {supplier.name}
                          </label>
                        </div>
                      ))}
                      {allSuppliers.length === 0 && (
                        <p className="text-sm text-gray-500 italic">Nenhum fornecedor cadastrado.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Special Preferences */}
                <div className="space-y-2">
                  <Label htmlFor="special_preferences">Preferências Especiais</Label>
                  <Textarea
                    id="special_preferences"
                    value={formData.special_preferences}
                    onChange={handleChange}
                    placeholder="Ex: Assento na janela, refeição vegetariana, etc."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseDialog} type="button">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}