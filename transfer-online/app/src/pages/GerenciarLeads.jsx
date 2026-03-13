import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Phone, Calendar, MapPin, Clock, RefreshCw, 
  CheckCircle, AlertCircle, Loader2, Search,
  MessageSquare, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Função para formatar data em horário de Brasília (UTC -> BRT/BRST)
const formatBrasiliaTime = (dateString) => {
  if (!dateString) return '-';
  
  try {
    // Garantir que a string tenha indicador UTC (Z) se não tiver
    let dateStr = dateString.trim();
    if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('T')) {
      // Se é só data, adicionar horário
      dateStr = dateStr + 'T00:00:00Z';
    } else if (dateStr.includes('T') && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
      // Se tem horário mas não tem Z, adicionar
      dateStr = dateStr + 'Z';
    }
    
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    // Converter para horário de Brasília usando toLocaleString
    const brasiliaString = date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    return brasiliaString.replace(',', ' às');
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '-';
  }
};

export default function GerenciarLeads() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['bookingLeads'],
    queryFn: async () => {
      const allLeads = await base44.entities.BookingLead.list('-created_date', 500);
      console.log('[GerenciarLeads] Leads carregados:', allLeads.length, allLeads);
      return allLeads;
    },
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  const checkAbandonedMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('checkAbandonedLeads');
    },
    onSuccess: (response) => {
      alert(`✅ Processamento concluído!\n\nProcessados: ${response.data?.processed || 0}\nEnviados: ${response.data?.sent || 0}\nErros: ${response.data?.errors || 0}`);
      queryClient.invalidateQueries({ queryKey: ['bookingLeads'] });
    },
    onError: (error) => {
      alert(`❌ Erro ao processar leads: ${error.message}`);
    }
  });

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      'viewed_prices': { label: 'Viu Preços', color: 'bg-blue-100 text-blue-800' },
      'booking_started': { label: 'Iniciou Reserva', color: 'bg-purple-100 text-purple-800' },
      'converted': { label: 'Convertido', color: 'bg-green-100 text-green-800' },
      'abandoned': { label: 'Abandonou', color: 'bg-red-100 text-red-800' }
    };
    const config = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lead.phone?.toLowerCase().includes(search) ||
      lead.origin?.toLowerCase().includes(search) ||
      lead.destination?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: leads.length,
    pending: leads.filter(l => l.status === 'pending').length,
    viewedPrices: leads.filter(l => l.status === 'viewed_prices').length,
    abandoned: leads.filter(l => l.status === 'abandoned').length,
    converted: leads.filter(l => l.status === 'converted').length,
    recoveryPending: leads.filter(l => l.status === 'viewed_prices' && !l.recovery_message_sent_at).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Leads</h1>
            <p className="text-gray-600">Acompanhe e recupere leads de reserva</p>
          </div>
          <Button
            onClick={() => checkAbandonedMutation.mutate()}
            disabled={checkAbandonedMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {checkAbandonedMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Processar Leads Abandonados
              </>
            )}
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total de Leads</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-gray-500">Pendentes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.viewedPrices}</div>
              <div className="text-xs text-gray-500">Viram Preços</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.recoveryPending}</div>
              <div className="text-xs text-gray-500">Aguardando Recuperação</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.abandoned}</div>
              <div className="text-xs text-gray-500">Abandonados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
              <div className="text-xs text-gray-500">Convertidos</div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por telefone, origem ou destino..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Leads */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm ? 'Nenhum lead encontrado' : 'Nenhum lead registrado'}
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'Tente buscar com outros termos' : 'Os leads aparecerão aqui quando os usuários iniciarem uma cotação'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredLeads.map((lead) => (
              <Card key={lead.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(lead.status)}
                        <Badge variant="outline" className="capitalize">
                          {lead.service_type === 'one_way' ? 'Só Ida' :
                           lead.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora'}
                        </Badge>
                        {lead.recovery_message_sent_at && (
                          <Badge className="bg-purple-100 text-purple-800">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Recuperação Enviada
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-start gap-2">
                          <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{lead.phone}</div>
                            <div className="text-xs text-gray-500">Telefone</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {lead.date ? format(new Date(lead.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                            </div>
                            <div className="text-xs text-gray-500">Data da viagem</div>
                          </div>
                        </div>

                        {lead.origin && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-green-400 mt-0.5" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 line-clamp-1">{lead.origin}</div>
                              <div className="text-xs text-gray-500">Origem</div>
                            </div>
                          </div>
                        )}

                        {lead.destination && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-red-400 mt-0.5" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 line-clamp-1">{lead.destination}</div>
                              <div className="text-xs text-gray-500">Destino</div>
                            </div>
                          </div>
                        )}

                        {lead.hours && (
                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{lead.hours}h</div>
                              <div className="text-xs text-gray-500">Duração</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {lead.recovery_coupon_code && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs text-purple-700">
                            <strong>Cupom enviado:</strong> {lead.recovery_coupon_code}
                          </div>
                          {lead.recovery_message_sent_at && (
                            <div className="text-xs text-purple-600 mt-1">
                              Enviado em: {formatBrasiliaTime(lead.recovery_message_sent_at)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 text-right">
                      <div className="text-xs text-gray-500">
                        Criado em
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {lead.created_date ? formatBrasiliaTime(lead.created_date) : '-'}
                      </div>
                      {lead.last_activity_at && (
                        <>
                          <div className="text-xs text-gray-500 mt-2">
                            Última atividade
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatBrasiliaTime(lead.last_activity_at)}
                          </div>
                        </>
                      )}
                      {lead.converted_booking_id && (
                        <Badge className="bg-green-100 text-green-800 mt-2">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Reserva: {lead.converted_booking_id}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}