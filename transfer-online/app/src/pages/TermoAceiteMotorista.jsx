import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TermoAceiteMotorista() {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Novos estados para captura de email
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [needsEmail, setNeedsEmail] = useState(false);

  const CURRENT_TERMS_VERSION = 'v1.0';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
          // Fluxo via Token (sem login obrigatório)
          try {
            const response = await base44.functions.invoke('getDriverByTermsToken', { token });
            if (response.data?.driver) {
              const drv = response.data.driver;
              setDriver(drv);

              // Verificar se precisa de email
              if (!drv.email) {
                  setNeedsEmail(true);
              }

              setIsLoading(false);
              return;
            } else {
              throw new Error('Token inválido');
            }
          } catch (e) {
            console.error('Erro ao validar token:', e);
            setError('Link inválido ou expirado.');
            setIsLoading(false);
            return;
          }
        }

        // Fluxo normal (com login)
        const currentUser = await base44.auth.me();
        
        if (!currentUser.is_driver || !currentUser.driver_id) {
          window.location.href = '/';
          return;
        }

        setUser(currentUser);

        // Buscar dados do motorista
        const driverData = await base44.entities.Driver.get(currentUser.driver_id);
        setDriver(driverData);

        // Se já aceitou os termos da versão atual, redirecionar
        if (driverData.terms_accepted_at && driverData.terms_version === CURRENT_TERMS_VERSION) {
          window.location.href = '/DashboardMotorista';
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = '/AccessPortal?returnUrl=%2FTermoAceiteMotorista';
      }
    };

    checkAuth();
  }, []);

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      const response = await base44.functions.invoke('acceptDriverTerms', {
        termsVersion: CURRENT_TERMS_VERSION,
        token: token,
        email: needsEmail ? email : undefined // Envia o email se foi capturado
      });
      return response.data;
      },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        // Se foi via token, talvez não tenha login, então redirecionar para login ou home
        // Se tiver login, dashboard
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('token')) {
           window.location.href = '/AccessPortal?returnUrl=%2FTermoAceiteMotorista';
        } else {
           window.location.href = '/DashboardMotorista';
        }
      }, 3000);
    },
    onError: (err) => {
      setError(err.message || 'Erro ao aceitar os termos');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!hasAccepted) {
      setError('Você precisa aceitar os termos para continuar');
      return;
    }

    if (needsEmail) {
        if (!email || !confirmEmail) {
            setError('Por favor, informe e confirme seu e-mail para criar seu acesso.');
            return;
        }
        if (email !== confirmEmail) {
            setError('Os e-mails informados não coincidem.');
            return;
        }
        // Validação básica de email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Por favor, informe um e-mail válido.');
            return;
        }
    }

    acceptTermsMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-8 text-center">
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Termo Aceito com Sucesso!
            </h2>
            <p className="text-gray-600">
              Redirecionando para o painel do motorista...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Termo de Aceite Digital
          </h1>
          <p className="text-lg text-gray-600">
            Termo de Aceite e Concordância do Motorista Parceiro
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Bem-vindo(a), {driver?.name || user?.full_name}!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Introdução */}
              <div className="prose max-w-none">
                <p className="text-gray-700">
                  Para utilizar nossa Plataforma e iniciar a prestação de seus serviços de transporte, 
                  é essencial que você leia e aceite integralmente os termos do nosso Contrato.
                </p>
              </div>

              {/* Seção 1: Declaração de Leitura */}
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                <h3 className="font-bold text-gray-900 mb-3">1. Declaração de Leitura e Ciência</h3>
                <p className="text-gray-700 leading-relaxed">
                  Eu, <strong>{driver?.name || user?.full_name}</strong>, 
                  motorista parceiro devidamente habilitado com CNH (com EAR), 
                  declaro que tive acesso, li e compreendi o "Contrato de Licença de Uso de Software 
                  e Intermediação de Serviços" celebrado com a Transferonline Gestão de Transfer Executivo Ltda.
                </p>
              </div>

              {/* Seção 2: Natureza Autônoma */}
              <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded">
                <h3 className="font-bold text-gray-900 mb-3">2. Reconhecimento da Natureza Autônoma</h3>
                <p className="text-gray-700 mb-3">
                  Ao aceitar este Termo, reconheço e concordo expressamente com o seguinte:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>
                    Sou um <strong>prestador de serviços autônomo e independente</strong>, 
                    sem subordinação e sem qualquer vínculo empregatício (CLT) com a Transferonline.
                  </li>
                  <li>
                    Tenho total e irrestrita <strong>autonomia</strong> para definir meus horários, 
                    jornada e para aceitar ou recusar as solicitações de viagens intermediadas pela Plataforma.
                  </li>
                  <li>
                    Sou o único responsável pelas minhas <strong>obrigações fiscais e previdenciárias</strong>, 
                    incluindo a contribuição como Contribuinte Individual (INSS).
                  </li>
                </ul>
              </div>

              {/* Seção 3: Compromissos */}
              <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                <h3 className="font-bold text-gray-900 mb-3">3. Compromissos e Responsabilidades</h3>
                <p className="text-gray-700 mb-3">
                  Comprometo-me a cumprir todas as obrigações e responsabilidades detalhadas no Contrato, incluindo:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>
                    Manter o veículo, a documentação e a CNH (com EAR) sempre válidos e em dia.
                  </li>
                  <li>
                    Manter o Seguro de Acidentes Pessoais de Passageiros (APP) ativo e com cobertura adequada.
                  </li>
                  <li>
                    Assumo a responsabilidade por indenizar e isentar a Plataforma contra quaisquer 
                    ações judiciais (trabalhistas, cíveis ou fiscais) decorrentes da minha conduta 
                    ou da prestação dos meus serviços.
                  </li>
                </ul>
              </div>

              {/* Seção 4: Aceite Eletrônico */}
              <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded">
                <h3 className="font-bold text-gray-900 mb-3">4. Aceite Eletrônico e Validade</h3>
                <p className="text-gray-700">
                  Declaro que este aceite eletrônico possui a mesma validade de uma assinatura física 
                  no Contrato e serve como prova de minha concordância com a totalidade do 
                  "Contrato de Licença de Uso de Software e Intermediação de Serviços".
                </p>
              </div>

              {/* Captura de Email (Se necessário) */}
              {needsEmail && (
                <div className="bg-orange-50 border border-orange-200 p-6 rounded-lg space-y-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-gray-900">Criação de Acesso ao Sistema</h3>
                            <p className="text-sm text-gray-700 mt-1">
                                Identificamos que seu cadastro não possui um e-mail. Por favor, informe seu e-mail abaixo. 
                                Ele será usado como seu <strong>login</strong> para acessar o aplicativo e receber comprovantes.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-800">Seu E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="exemplo@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-white"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmEmail" className="text-gray-800">Confirme seu E-mail</Label>
                            <Input
                                id="confirmEmail"
                                type="email"
                                placeholder="Repita o e-mail"
                                value={confirmEmail}
                                onChange={(e) => setConfirmEmail(e.target.value)}
                                className="bg-white"
                                required
                            />
                        </div>
                    </div>
                </div>
              )}

              {/* Checkbox de Aceite */}
              <div className="border-2 border-blue-600 rounded-lg p-6 bg-blue-50">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={hasAccepted}
                    onCheckedChange={setHasAccepted}
                    className="mt-1"
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium text-gray-900 leading-relaxed cursor-pointer"
                  >
                    ✅ Li e Aceito, de forma integral e irrevogável, o "Contrato de Licença de Uso 
                    de Software e Intermediação de Serviços" e a Política de Privacidade da Plataforma, 
                    declarando que não possuo vínculo empregatício.
                  </label>
                </div>
              </div>

              {/* Informações do Registro */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                <h4 className="font-semibold text-gray-900 mb-2">📋 Registro Digital</h4>
                <p className="mb-2">
                  Ao clicar em "Aceitar e Continuar", o sistema registrará automaticamente:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Data e Hora Exatas do Aceite</li>
                  <li>Endereço IP do Dispositivo</li>
                  <li>Versão do Contrato Aceito ({CURRENT_TERMS_VERSION})</li>
                  <li>ID do Motorista Parceiro</li>
                </ul>
              </div>

              {/* Botão de Aceite */}
              <div className="flex justify-center pt-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={!hasAccepted || acceptTermsMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                >
                  {acceptTermsMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Aceitar e Continuar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer com informações adicionais */}
          <div className="text-center text-sm text-gray-500">
            <p>
              Data/Hora: {format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
            </p>
            <p className="mt-1">
              Versão do Termo: {CURRENT_TERMS_VERSION}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}