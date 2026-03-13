import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Lock, AlertCircle, CheckCircle, Loader2, Phone, FileText, FileCheck, DollarSign, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PhoneInputWithCountry from '@/components/ui/PhoneInputWithCountry';
import { useLocation, useNavigate } from 'react-router-dom';
import DriverDocuments from '@/components/driver/DriverDocuments';
import DriverPayments from '@/components/driver/DriverPayments';

export default function MeusDados() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Estado para Informações Pessoais
  const [phoneNumber, setPhoneNumber] = useState('');
  const [specialPreferences, setSpecialPreferences] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Estado para Alteração de Senha
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Carregar dados existentes do usuário
        setPhoneNumber(currentUser.phone_number || '');
        setSpecialPreferences(currentUser.special_preferences || '');
        
        // Verificar tab na URL
        const params = new URLSearchParams(location.search);
        const tabParam = params.get('tab');
        if (tabParam) {
          setActiveTab(tabParam);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [location.search]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    navigate(`?tab=${value}`, { replace: true });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);

    // Validação de telefone
    if (phoneNumber && !phoneNumber.startsWith('+')) {
      setProfileError('O telefone deve começar com + seguido do código do país (ex: +5511999998888)');
      return;
    }

    setIsSavingProfile(true);

    try {
      await base44.auth.updateMe({
        phone_number: phoneNumber,
        special_preferences: specialPreferences
      });

      // Atualizar estado local
      setUser(prev => ({
        ...prev,
        phone_number: phoneNumber,
        special_preferences: specialPreferences
      }));

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      setProfileError(error.message || 'Erro ao salvar dados. Tente novamente.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const validatePasswordForm = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Por favor, preencha todos os campos');
      return false;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres');
      return false;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return false;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('A nova senha deve ser diferente da senha atual');
      return false;
    }

    return true;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!validatePasswordForm()) {
      return;
    }

    setIsSavingPassword(true);

    try {
      const response = await base44.functions.invoke('changePassword', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        setPasswordSuccess(true);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        setTimeout(() => {
          setPasswordSuccess(false);
        }, 5000);
      } else {
        setPasswordError(response.data.error || 'Erro ao alterar senha');
      }
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      setPasswordError(err.response?.data?.error || err.message || 'Erro ao alterar senha. Verifique sua senha atual e tente novamente.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await base44.functions.invoke('deleteUserAccount');
      if (response.data.success) {
        toast.success('Sua conta foi excluída com sucesso.');
        setTimeout(() => base44.auth.logout(), 2000);
      } else {
        toast.error(response.data.error || 'Erro ao excluir conta.');
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error('Erro ao processar solicitação.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const isDriver = user?.is_driver || user?.driver_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 relative overflow-hidden">
      {/* Formas Abstratas Animadas */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-gradient-to-br from-blue-300/15 to-purple-200/10 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute bottom-20 left-1/4 w-96 h-96 bg-gradient-to-br from-green-300/15 to-blue-200/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Meus Dados</h1>
          </div>
          <p className="text-gray-600">Gerencie suas informações pessoais, segurança e documentos</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className={`grid w-full ${isDriver ? 'grid-cols-4' : 'grid-cols-2'}`}>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            
            {isDriver && (
              <>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Documentos</span>
                </TabsTrigger>
                <TabsTrigger value="payments" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden sm:inline">Financeiro</span>
                </TabsTrigger>
              </>
            )}

            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <CardTitle className="text-2xl">Informações Pessoais</CardTitle>
                <CardDescription className="text-blue-100">
                  Atualize seus dados de contato e preferências
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {profileSuccess && (
                  <Alert className="mb-6 bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Dados atualizados com sucesso!
                    </AlertDescription>
                  </Alert>
                )}

                {profileError && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{profileError}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-base font-semibold">
                      Nome Completo
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={user?.full_name || ''}
                      disabled
                      className="h-12 bg-gray-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">
                      Para alterar seu nome, entre em contato com o suporte
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base font-semibold">
                      E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="h-12 bg-gray-100 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">
                      O e-mail não pode ser alterado
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-base font-semibold flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-600" />
                      Telefone de Contato
                    </Label>
                    <PhoneInputWithCountry
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(value) => setPhoneNumber(value)}
                      placeholder="(11) 99999-9999"
                      className="h-12"
                    />
                    <p className="text-sm text-gray-500">
                      Seu telefone é importante para notificações de viagem.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialPreferences" className="text-base font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Preferências Especiais
                    </Label>
                    <Textarea
                      id="specialPreferences"
                      value={specialPreferences}
                      onChange={(e) => setSpecialPreferences(e.target.value)}
                      placeholder="Ex: Prefiro veículos com ar-condicionado, tenho alergia a perfumes fortes, etc."
                      className="h-32 resize-none"
                    />
                    <p className="text-sm text-gray-500">
                      Informe qualquer preferência ou necessidade especial para suas viagens
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSavingProfile}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 h-12 text-lg"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <User className="w-5 h-5 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-8 border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Gerenciamento de Conta
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-red-900">Excluir minha conta</p>
                      <p className="text-sm text-red-700 mt-1">
                        Esta ação é irreversível. Todos os seus dados serão apagados permanentemente.
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="whitespace-nowrap bg-red-600 hover:bg-red-700"
                    >
                      Excluir Conta
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta
                    e removerá seus dados de nossos servidores.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteAccount();
                    }}
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      'Sim, excluir minha conta'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {isDriver && (
            <>
              <TabsContent value="documents">
                <DriverDocuments user={user} />
              </TabsContent>

              <TabsContent value="payments">
                <DriverPayments user={user} />
              </TabsContent>
            </>
          )}

          <TabsContent value="security">
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <CardTitle className="text-2xl">Segurança da Conta</CardTitle>
                <CardDescription className="text-purple-100">
                  Mantenha sua conta segura com uma senha forte
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {passwordSuccess && (
                  <Alert className="mb-6 bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Senha alterada com sucesso!
                    </AlertDescription>
                  </Alert>
                )}

                {passwordError && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-base font-semibold">
                      Senha Atual <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Digite sua senha atual"
                      className="h-12"
                      disabled={isSavingPassword}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-base font-semibold">
                      Nova Senha <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Digite sua nova senha (mínimo 6 caracteres)"
                      className="h-12"
                      disabled={isSavingPassword}
                    />
                    <p className="text-sm text-gray-500">
                      A senha deve ter pelo menos 6 caracteres
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-base font-semibold">
                      Confirmar Nova Senha <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Digite novamente sua nova senha"
                      className="h-12"
                      disabled={isSavingPassword}
                    />
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">💡 Dicas para uma senha forte:</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• Use pelo menos 8 caracteres</li>
                      <li>• Combine letras maiúsculas e minúsculas</li>
                      <li>• Inclua números e caracteres especiais</li>
                      <li>• Evite informações pessoais óbvias</li>
                      <li>• Não reutilize senhas de outros serviços</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSavingPassword}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 h-12 text-lg"
                  >
                    {isSavingPassword ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        Alterar Senha
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 20s infinite ease-in-out;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}