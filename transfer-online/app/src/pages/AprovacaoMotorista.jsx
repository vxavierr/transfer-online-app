import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, AlertCircle, FileText, User, Calendar, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AprovacaoMotorista() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [data, setData] = useState(null);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token de aprovação inválido ou ausente.');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const response = await base44.functions.invoke('getDriverApprovalFlow', { token });
        if (response.data && !response.data.error) {
          setData(response.data);
        } else {
          setError(response.data?.error || 'Erro ao carregar dados da aprovação.');
        }
      } catch (err) {
        console.error(err);
        setError('Erro ao conectar com o servidor.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const handleAction = async (status) => {
    if (status === 'rejected' && !comments.trim()) {
      alert('Por favor, informe o motivo da rejeição nos comentários.');
      return;
    }

    if (!confirm(`Confirma a ${status === 'approved' ? 'aprovação' : 'rejeição'} deste motorista?`)) {
        return;
    }

    setProcessing(true);
    try {
      const response = await base44.functions.invoke('processDriverApproval', {
        token,
        status,
        comments
      });

      if (response.data && response.data.success) {
        setSuccess(status === 'approved' ? 'Aprovação registrada com sucesso!' : 'Motorista rejeitado com sucesso.');
        setData(null); // Esconder formulário
      } else {
        alert(response.data?.error || 'Erro ao processar ação.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar resposta.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando dados da aprovação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-4">
              {success ? (
                <CheckCircle className="w-16 h-16 text-green-500" />
              ) : (
                <XCircle className="w-16 h-16 text-red-500" />
              )}
            </div>
            <CardTitle className="text-center text-xl">
              {success ? 'Processo Concluído' : (error.includes('utilizado') || error.includes('expirado') ? 'Link Inválido' : 'Acesso Negado')}
            </CardTitle>
            <CardDescription className="text-center mt-2">
              {success || error}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
             {success && <p className="text-sm text-gray-500">Você já pode fechar esta página.</p>}
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { driver, client_name, approver_name, current_step, total_steps, approver_history } = data;

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Aprovação de Motorista</h1>
          <p className="text-gray-600 mt-2">
            Olá <strong>{approver_name}</strong>, você foi solicitado para aprovar um novo motorista para <strong>{client_name}</strong>.
          </p>
          <div className="mt-4 inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            Etapa {current_step} de {total_steps}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Dados do Motorista
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 border">
                {driver.photo_url ? (
                  <img src={driver.photo_url} alt="Motorista" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User className="w-12 h-12" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Nome Completo</Label>
                  <div className="font-medium">{driver.name}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">CPF</Label>
                  <div className="font-medium">{driver.cnh_extracted_data?.cpf || driver.document_id || '-'}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email (Gestão)</Label>
                  <div className="font-medium">{driver.driver_email_by_manager || '-'}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Telefone (Gestão)</Label>
                  <div className="font-medium">{driver.driver_phone_by_manager || '-'}</div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Documentação
              </h3>
              
              <div className="grid gap-4">
                <div className="bg-gray-50 p-3 rounded border flex justify-between items-center">
                  <div>
                    <div className="font-medium">CNH (Carteira Nacional de Habilitação)</div>
                    <div className="text-sm text-gray-500">
                      Nº: {driver.license_number} | Validade: {driver.license_expiry ? format(new Date(driver.license_expiry), 'dd/MM/yyyy') : '-'}
                    </div>
                    {driver.cnh_extracted_data && (
                       <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                         <ShieldCheck className="w-3 h-3" /> Validado por OCR
                       </div>
                    )}
                  </div>
                  {driver.license_document_url && (
                    <Button variant="outline" size="sm" onClick={() => window.open(driver.license_document_url, '_blank')}>
                      Visualizar
                    </Button>
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded border flex justify-between items-center">
                  <div>
                    <div className="font-medium">ASO (Saúde Ocupacional)</div>
                    <div className="text-sm text-gray-500">Documento obrigatório</div>
                  </div>
                  {driver.aso_document_url ? (
                    <Button variant="outline" size="sm" onClick={() => window.open(driver.aso_document_url, '_blank')}>
                      Visualizar
                    </Button>
                  ) : (
                    <span className="text-xs text-red-500 font-medium">Pendente</span>
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded border flex justify-between items-center">
                  <div>
                    <div className="font-medium">PGR (Gerenciamento de Riscos)</div>
                    <div className="text-sm text-gray-500">Documento obrigatório</div>
                  </div>
                  {driver.pgr_document_url ? (
                    <Button variant="outline" size="sm" onClick={() => window.open(driver.pgr_document_url, '_blank')}>
                      Visualizar
                    </Button>
                  ) : (
                    <span className="text-xs text-red-500 font-medium">Pendente</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {approver_history && approver_history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Histórico de Aprovações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approver_history.map((entry, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{entry.approver_name}</p>
                          <p className="text-xs text-gray-500">{entry.approver_email}</p>
                        </div>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                          {entry.timestamp ? format(new Date(entry.timestamp), "dd/MM/yyyy 'às' HH:mm") : '-'}
                        </span>
                      </div>
                      
                      {entry.comments && (
                        <div className="mt-2 text-sm text-gray-700 bg-white p-3 rounded border border-gray-100 italic">
                          "{entry.comments}"
                        </div>
                      )}
                      
                      <div className="mt-2 text-xs font-medium text-green-600">
                        Aprovado
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Sua Decisão</CardTitle>
            <CardDescription>
              Aprovar permitirá que este motorista realize viagens para sua empresa (ou seguirá para o próximo aprovador). Rejeitar encerrará o processo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label htmlFor="comments">Comentários / Observações</Label>
              <Textarea 
                id="comments" 
                placeholder="Adicione observações sobre a aprovação ou motivo da rejeição..." 
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="h-24"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-4 pt-2">
            <Button 
              variant="destructive" 
              onClick={() => handleAction('rejected')}
              disabled={processing}
              className="w-32"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rejeitar'}
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 w-32" 
              onClick={() => handleAction('approved')}
              disabled={processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aprovar'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}