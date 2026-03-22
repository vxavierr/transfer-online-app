import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Shield,
  Loader2,
  Search,
  Edit,
  CheckCircle,
  AlertCircle,
  Lock,
  User as UserIcon
} from 'lucide-react';
import { ADMIN_PAGES_CONFIG } from '../components/adminPagesConfig';

// Lista completa de páginas administrativas disponíveis (importada da fonte única de verdade)
const ADMIN_PAGES = ADMIN_PAGES_CONFIG;

export default function GerenciarPermissoesAdmin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [tempPermissions, setTempPermissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        
        // Apenas super admin (sem restrições) pode acessar esta página
        if (user.role !== 'admin') {
          alert('Acesso negado. Apenas administradores podem acessar esta página.');
          window.location.href = '/';
          return;
        }

        // Se o admin tem permissões definidas, verificar se pode acessar esta página
        if (user.admin_page_permissions && user.admin_page_permissions.length > 0) {
          if (!user.admin_page_permissions.includes('GerenciarPermissoesAdmin')) {
            alert('Você não tem permissão para acessar esta página.');
            window.location.href = '/AdminDashboard';
            return;
          }
        }

        setCurrentUser(user);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = '/AccessPortal?returnUrl=%2FGerenciarPermissoesAdmin';
      }
    };

    checkAuth();
  }, []);

  const { data: adminUsers = [], isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.role === 'admin');
    },
    enabled: !!currentUser && !isCheckingAuth,
    initialData: []
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions }) => {
      return await base44.entities.User.update(userId, {
        admin_page_permissions: permissions
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setShowPermissionsDialog(false);
      setSelectedUser(null);
      setTempPermissions([]);
    }
  });

  const filteredUsers = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === '') return adminUsers;
    const search = searchTerm.trim().toLowerCase();
    return adminUsers.filter(u => {
      const name = (u.full_name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  }, [adminUsers, searchTerm]);

  const handleOpenPermissions = (user) => {
    setSelectedUser(user);
    setTempPermissions(user.admin_page_permissions || []);
    setShowPermissionsDialog(true);
  };

  const handleTogglePermission = (pageId) => {
    setTempPermissions(prev => {
      if (prev.includes(pageId)) {
        return prev.filter(p => p !== pageId);
      } else {
        return [...prev, pageId];
      }
    });
  };

  const handleToggleCategory = (category) => {
    const categoryPages = ADMIN_PAGES.filter(p => p.category === category).map(p => p.id);
    const allSelected = categoryPages.every(pageId => tempPermissions.includes(pageId));
    
    if (allSelected) {
      setTempPermissions(prev => prev.filter(p => !categoryPages.includes(p)));
    } else {
      setTempPermissions(prev => {
        const newPerms = [...prev];
        categoryPages.forEach(pageId => {
          if (!newPerms.includes(pageId)) {
            newPerms.push(pageId);
          }
        });
        return newPerms;
      });
    }
  };

  const handleSavePermissions = () => {
    if (selectedUser) {
      updatePermissionsMutation.mutate({
        userId: selectedUser.id,
        permissions: tempPermissions
      });
    }
  };

  const handleGrantAllAccess = () => {
    setTempPermissions(ADMIN_PAGES.map(p => p.id));
  };

  const handleRevokeAllAccess = () => {
    setTempPermissions([]);
  };

  const groupedPages = useMemo(() => {
    const groups = {};
    ADMIN_PAGES.forEach(page => {
      if (!groups[page.category]) {
        groups[page.category] = [];
      }
      groups[page.category].push(page);
    });
    return groups;
  }, []);

  const isSuperAdmin = (user) => {
    return !user.admin_page_permissions || user.admin_page_permissions.length === 0;
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Gerenciar Permissões Admin</h1>
          </div>
          <p className="text-gray-600">
            Controle quais páginas administrativas cada usuário admin pode acessar
          </p>
        </div>

        <Alert className="mb-6 bg-blue-50 border-blue-300">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>ℹ️ Sobre Permissões:</strong><br />
            • <strong>Super Admin</strong>: Usuários sem permissões definidas têm acesso total a todas as páginas.<br />
            • <strong>Admin Restrito</strong>: Usuários com permissões específicas só podem acessar as páginas autorizadas.<br />
            • O menu lateral e o acesso direto às páginas são controlados por estas permissões.
          </AlertDescription>
        </Alert>

        {/* Barra de Busca */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Usuários Admin */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando usuários...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum usuário encontrado
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'Tente ajustar sua busca' : 'Não há usuários admin cadastrados'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredUsers.map((user) => {
              const isSuper = isSuperAdmin(user);
              const permissionCount = user.admin_page_permissions?.length || 0;
              const isCurrentUser = user.id === currentUser.id;

              return (
                <Card key={user.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {user.full_name?.[0]?.toUpperCase() || 'A'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-gray-900">
                              {user.full_name}
                            </h3>
                            {isCurrentUser && (
                              <Badge className="bg-blue-100 text-blue-700">Você</Badge>
                            )}
                            {isSuper ? (
                              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                                <Shield className="w-3 h-3 mr-1" />
                                Super Admin
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-700">
                                <Lock className="w-3 h-3 mr-1" />
                                Admin Restrito
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {!isSuper && (
                            <p className="text-xs text-gray-600 mt-1">
                              {permissionCount} {permissionCount === 1 ? 'página autorizada' : 'páginas autorizadas'}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleOpenPermissions(user)}
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Gerenciar Permissões
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog de Permissões */}
        <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Permissões de {selectedUser?.full_name}
              </DialogTitle>
              <p className="text-sm text-gray-600">
                Selecione as páginas que este administrador pode acessar
              </p>
            </DialogHeader>

            <div className="space-y-6">
              {/* Ações Rápidas */}
              <div className="flex gap-2 pb-4 border-b">
                <Button
                  onClick={handleGrantAllAccess}
                  variant="outline"
                  size="sm"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Liberar Tudo (Super Admin)
                </Button>
                <Button
                  onClick={handleRevokeAllAccess}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Revogar Tudo
                </Button>
              </div>

              {/* Contador de Permissões */}
              <Alert className={tempPermissions.length === 0 ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'}>
                <AlertDescription className={tempPermissions.length === 0 ? 'text-red-900' : 'text-blue-900'}>
                  {tempPermissions.length === 0 ? (
                    <>
                      <strong>⚠️ Nenhuma permissão selecionada</strong><br />
                      Este usuário terá acesso total como Super Admin
                    </>
                  ) : tempPermissions.length === ADMIN_PAGES.length ? (
                    <>
                      <strong>✅ Todas as permissões selecionadas</strong><br />
                      Este usuário terá acesso total (equivalente a Super Admin)
                    </>
                  ) : (
                    <>
                      <strong>📋 {tempPermissions.length} de {ADMIN_PAGES.length} páginas autorizadas</strong><br />
                      Este usuário terá acesso restrito apenas às páginas selecionadas
                    </>
                  )}
                </AlertDescription>
              </Alert>

              {/* Permissões Agrupadas por Categoria */}
              <div className="space-y-4">
                {Object.entries(groupedPages).map(([category, pages]) => {
                  const categoryPages = pages.map(p => p.id);
                  const allSelected = categoryPages.every(pageId => tempPermissions.includes(pageId));
                  const someSelected = categoryPages.some(pageId => tempPermissions.includes(pageId));

                  return (
                    <div key={category} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={() => handleToggleCategory(category)}
                          className={someSelected && !allSelected ? 'data-[state=checked]:bg-blue-600' : ''}
                        />
                        <h3 className="font-bold text-lg text-gray-900">{category}</h3>
                        <Badge variant="outline" className="ml-auto">
                          {pages.filter(p => tempPermissions.includes(p.id)).length} / {pages.length}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        {pages.map((page) => (
                          <div
                            key={page.id}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer ${
                              tempPermissions.includes(page.id)
                                ? 'bg-blue-100 border-2 border-blue-300'
                                : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleTogglePermission(page.id)}
                          >
                            <Checkbox
                              checked={tempPermissions.includes(page.id)}
                              onCheckedChange={() => handleTogglePermission(page.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className={`text-sm ${
                              tempPermissions.includes(page.id)
                                ? 'font-semibold text-blue-900'
                                : 'text-gray-700'
                            }`}>
                              {page.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                onClick={() => {
                  setShowPermissionsDialog(false);
                  setSelectedUser(null);
                  setTempPermissions([]);
                }}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSavePermissions}
                disabled={updatePermissionsMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updatePermissionsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Salvar Permissões
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}