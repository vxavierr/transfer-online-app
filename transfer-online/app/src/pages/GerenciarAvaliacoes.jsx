import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  TrendingUp, 
  MessageSquare, 
  Search,
  Loader2,
  User,
  Car,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function GerenciarAvaliacoes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Buscar avaliações
  const { data: ratings = [], isLoading: isLoadingRatings } = useQuery({
    queryKey: ['allRatings'],
    queryFn: () => base44.entities.Rating.list('-created_date', 500), // Limitando a 500 para performance inicial
    initialData: []
  });

  // Buscar solicitações para cálculo de conversão (avaliadas vs total concluídas)
  // Idealmente isso seria feito no backend para grandes volumes, mas faremos aqui para o MVP
  const { data: serviceRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['completedServiceRequests'],
    queryFn: () => base44.entities.ServiceRequest.filter({ status: 'concluida' }), // ou 'finalizada' no driver_trip_status
    initialData: []
  });

  // Métricas Principais
  const metrics = useMemo(() => {
    const totalRatings = ratings.length;
    if (totalRatings === 0) return null;

    const sumRating = ratings.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = sumRating / totalRatings;

    const sumPunctuality = ratings.reduce((acc, r) => acc + (r.punctuality_rating || r.rating), 0);
    const avgPunctuality = sumPunctuality / totalRatings;

    const sumVehicle = ratings.reduce((acc, r) => acc + (r.vehicle_condition_rating || r.rating), 0);
    const avgVehicle = sumVehicle / totalRatings;

    const sumDriver = ratings.reduce((acc, r) => acc + (r.driver_behavior_rating || r.rating), 0);
    const avgDriver = sumDriver / totalRatings;

    // Distribuição de Estrelas
    const distribution = [0, 0, 0, 0, 0]; // index 0 = 1 estrela, etc.
    ratings.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating - 1]++;
      }
    });

    const distributionData = distribution.map((count, idx) => ({
      name: `${idx + 1} ⭐`,
      count,
      percentage: (count / totalRatings) * 100
    })).reverse(); // 5 estrelas primeiro

    // Taxa de Resposta
    // Consideramos "Enviadas" as viagens concluídas
    // Consideramos "Respondidas" o total de ratings
    // Nota: Isso é uma aproximação se não tivermos o log exato de envio de links
    const totalEligible = serviceRequests.length || 1; // Evitar divisão por zero
    const responseRate = (totalRatings / totalEligible) * 100;

    return {
      totalRatings,
      avgRating: avgRating.toFixed(1),
      avgPunctuality: avgPunctuality.toFixed(1),
      avgVehicle: avgVehicle.toFixed(1),
      avgDriver: avgDriver.toFixed(1),
      distributionData,
      responseRate: Math.min(responseRate, 100).toFixed(1) // Cap at 100% just in case
    };
  }, [ratings, serviceRequests]);

  // Filtragem da Lista
  const filteredRatings = useMemo(() => {
    return ratings.filter(r => {
      const matchesSearch = 
        (r.comment && r.comment.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.submitted_by_name && r.submitted_by_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.driver_id && r.driver_id.includes(searchTerm)); // Se tivéssemos o nome do motorista aqui seria melhor

      const matchesRating = ratingFilter === 'all' || r.rating === parseInt(ratingFilter);

      // Filtro de data simplificado para exemplo
      const matchesDate = true; 

      return matchesSearch && matchesRating && matchesDate;
    });
  }, [ratings, searchTerm, ratingFilter]);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']; // Vermelho a Verde

  if (isLoadingRatings || isLoadingRequests) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
              Gestão de Qualidade
            </h1>
            <p className="text-gray-500">
              Acompanhe as avaliações e métricas de satisfação dos clientes
            </p>
          </div>
          {/* 
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Exportar Relatório
          </Button>
           */}
        </div>

        {metrics ? (
          <>
            {/* Cards de Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-t-4 border-blue-500 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Média Geral</p>
                      <h3 className="text-4xl font-bold text-gray-900 mt-2">{metrics.avgRating}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Star className="w-6 h-6 text-blue-600 fill-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-green-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span className="font-medium">Baseado em {metrics.totalRatings} avaliações</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-green-500 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Taxa de Resposta</p>
                      <h3 className="text-4xl font-bold text-gray-900 mt-2">{metrics.responseRate}%</h3>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <MessageSquare className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    {metrics.totalRatings} respostas de {serviceRequests.length} viagens
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 border-t-4 border-purple-500 shadow-sm">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-gray-500 mb-4">Detalhamento por Critério</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-2">
                      <div className="mx-auto p-3 bg-purple-50 rounded-full w-12 h-12 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{metrics.avgPunctuality}</div>
                        <div className="text-xs text-gray-500">Pontualidade</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="mx-auto p-3 bg-indigo-50 rounded-full w-12 h-12 flex items-center justify-center">
                        <Car className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{metrics.avgVehicle}</div>
                        <div className="text-xs text-gray-500">Veículo</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="mx-auto p-3 bg-pink-50 rounded-full w-12 h-12 flex items-center justify-center">
                        <User className="w-6 h-6 text-pink-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{metrics.avgDriver}</div>
                        <div className="text-xs text-gray-500">Motorista</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Distribuição */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Distribuição de Notas</CardTitle>
                  <CardDescription>Volume de avaliações por quantidade de estrelas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={metrics.distributionData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={40} tick={{fontSize: 14}} />
                        <Tooltip 
                          cursor={{fill: 'transparent'}}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                          {metrics.distributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[4 - index]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Card de NPS (Simulado/Conceitual) */}
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white border-none">
                <CardContent className="p-8 flex flex-col justify-center h-full text-center space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Score de Qualidade</h3>
                    <div className="text-6xl font-bold text-white tracking-tight">
                      {(metrics.avgRating * 20).toFixed(0)}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">de 100 pontos possíveis</p>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Promotores (5★)</span>
                      <span className="text-green-400 font-medium">
                        {metrics.distributionData.find(d => d.name === '5 ⭐')?.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Neutros (3-4★)</span>
                      <span className="text-yellow-400 font-medium">
                        {(
                          (metrics.distributionData.find(d => d.name === '4 ⭐')?.percentage || 0) +
                          (metrics.distributionData.find(d => d.name === '3 ⭐')?.percentage || 0)
                        ).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Detratores (1-2★)</span>
                      <span className="text-red-400 font-medium">
                        {(
                          (metrics.distributionData.find(d => d.name === '2 ⭐')?.percentage || 0) +
                          (metrics.distributionData.find(d => d.name === '1 ⭐')?.percentage || 0)
                        ).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="py-12 text-center">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Nenhuma avaliação encontrada</h3>
              <p className="text-gray-500">As métricas aparecerão aqui quando as primeiras avaliações forem enviadas.</p>
            </CardContent>
          </Card>
        )}

        {/* Lista de Avaliações */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Avaliações Recentes</CardTitle>
                <CardDescription>Lista detalhada de feedbacks recebidos</CardDescription>
              </div>
              
              <div className="flex gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Buscar por nome, comentário..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Nota" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as notas</SelectItem>
                    <SelectItem value="5">5 Estrelas</SelectItem>
                    <SelectItem value="4">4 Estrelas</SelectItem>
                    <SelectItem value="3">3 Estrelas</SelectItem>
                    <SelectItem value="2">2 Estrelas</SelectItem>
                    <SelectItem value="1">1 Estrela</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Avaliador</TableHead>
                    <TableHead>Viagem</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead className="w-[40%]">Comentário</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRatings.map((rating) => (
                    <TableRow key={rating.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(rating.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(rating.created_date), 'HH:mm')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {rating.submitted_by_name || 'Anônimo'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {rating.submitted_by_email || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Idealmente aqui buscaríamos o número da OS, mas vamos mostrar o ID por enquanto se não tivermos join */}
                        <Badge variant="outline" className="font-mono text-xs">
                          {rating.service_request_id ? `OS...${rating.service_request_id.slice(-6)}` : 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className={`w-4 h-4 ${rating.rating >= 1 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                          <span className="font-bold">{rating.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {rating.comment ? (
                          <p className="text-sm text-gray-600 line-clamp-2" title={rating.comment}>
                            "{rating.comment}"
                          </p>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Sem comentário</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 text-xs text-gray-500">
                          {rating.punctuality_rating && (
                            <span title="Pontualidade" className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                              <Clock className="w-3 h-3" /> {rating.punctuality_rating}
                            </span>
                          )}
                          {rating.vehicle_condition_rating && (
                            <span title="Veículo" className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                              <Car className="w-3 h-3" /> {rating.vehicle_condition_rating}
                            </span>
                          )}
                          {rating.driver_behavior_rating && (
                            <span title="Motorista" className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                              <User className="w-3 h-3" /> {rating.driver_behavior_rating}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRatings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhuma avaliação encontrada com os filtros atuais.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}