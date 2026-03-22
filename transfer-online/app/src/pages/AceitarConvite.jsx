import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AceitarConvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const invitationId = searchParams.get('id');
  
  const [status, setStatus] = useState('loading'); // loading, processing, success, error
  const [message, setMessage] = useState('Verificando convite...');
  const [user, setUser] = useState(null);

  const [inviteInfo, setInviteInfo] = useState(null);

  useEffect(() => {
    const init = async () => {
      if (!invitationId) {
        setStatus('error');
        setMessage('Link de convite inválido.');
        return;
      }

      // 1. Buscar informações públicas do convite (sem auth)
      try {
        const infoResponse = await base44.functions.invoke('getInvitationPublicInfo', { invitationId });
        if (infoResponse.data?.success) {
          setInviteInfo(infoResponse.data.invitation);
        } else if (infoResponse.data?.error) {
          setStatus('error');
          setMessage(infoResponse.data.error);
          return;
        }
      } catch (err) {
        console.error('Erro ao buscar info do convite:', err);
        // Continua para tentar auth, caso a função falhe
      }

      // 2. Verificar Auth
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Se temos usuário, processamos o convite automaticamente
        // Mas se quisermos mostrar um botão "Aceitar" explícito, podemos mudar isso.
        // Para manter o fluxo rápido, processamos.
        processInvitation(invitationId);
      } catch (error) {
        // Não logado: mostrar tela de "Entrar para aceitar"
        setStatus('waiting_auth');
        setMessage('Faça login para aceitar o convite.');
      }
    };

    init();
  }, [invitationId]);

  const handleLogin = () => {
    const currentUrl = window.location.pathname + window.location.search;
    window.location.href = `/AccessPortal?returnUrl=${encodeURIComponent(currentUrl)}`;
  };

  const processInvitation = async (id) => {
    setStatus('processing');
    setMessage('Vinculando sua conta...');

    try {
      const response = await base44.functions.invoke('processInvitationAcceptance', { invitationId: id });
      
      if (response.data.success) {
        setStatus('success');
        setMessage('Convite aceito com sucesso!');
        
        // Redirecionar baseado no role
        setTimeout(() => {
            if (response.data.role === 'driver') {
                navigate(createPageUrl('TermoAceiteMotorista'));
            } else {
                navigate(createPageUrl('Index')); // Ou dashboard apropriado
            }
        }, 2000);
      } else {
        setStatus('error');
        setMessage(response.data.error || 'Erro ao processar convite.');
      }
    } catch (error) {
      console.error('Erro:', error);
      setStatus('error');
      setMessage('Ocorreu um erro ao aceitar o convite. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Aceitar Convite</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6 text-center space-y-4">
          
          {status === 'loading' || status === 'processing' ? (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">{message}</p>
            </>
          ) : status === 'success' ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-green-800">Sucesso!</h3>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-2">Redirecionando...</p>
            </>
          ) : status === 'waiting_auth' ? (
            <>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-blue-800 mb-2">
                {inviteInfo ? `Convite para ${inviteInfo.desired_role === 'driver' ? 'Motorista' : 'Colaborador'}` : 'Convite Recebido'}
              </h3>
              <p className="text-gray-600 mb-6">
                {inviteInfo 
                  ? `Olá ${inviteInfo.full_name || 'Visitante'}, você foi convidado para se juntar a equipe. Na próxima tela clique em "Inscrever-se (Sign Up)" e defina sua senha para receber o código de segurança e habilitar sua conta.` 
                  : 'Você recebeu um convite para se juntar à plataforma. Na próxima tela clique em "Inscrever-se (Sign Up)" e defina sua senha para receber o código de segurança e habilitar sua conta.'}
              </p>
              
              <Button 
                onClick={handleLogin} 
                className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg"
                size="lg"
              >
                Entrar ou Criar Senha
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-red-800">Ops!</h3>
              <p className="text-gray-600">{message}</p>
              <Button 
                onClick={() => navigate('/')} 
                className="mt-4"
                variant="outline"
              >
                Voltar ao Início
              </Button>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}