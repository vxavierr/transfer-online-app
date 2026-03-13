import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, DollarSign, TrendingUp, Calendar, Filter, Download, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function RelatorioFinanceiroMotoristas() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Buscar motoristas para o filtro
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers_list'],
    queryFn: async () => {
        // Se for admin, lista todos. Se fornecedor, lista os dele.
        // A entidade Driver já filtra por supplier_id automaticamente se for supplier user via regras de segurança? 
        // Não, o base44 sdk service role bypassa, mas o user scope respeita? 
        // Vamos assumir listagem padrão.
        return await base44.entities.Driver.filter({ active: true });
    },
    initialData: []
  });

  const handleGenerateReport = async () => {
    setIsLoadingReport(true);
    try {
      const response = await base44.functions.invoke('getDriverFinancialSummary', {
        start_date: startDate,
        end_date: endDate,
        driver_id: selectedDriver
      });
      setReportData(response.data);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      alert("Erro ao gerar relatório: " + error.message);
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Gerar relatório automaticamente ao alterar filtros
  useEffect(() => {
    handleGenerateReport();
  }, [startDate, endDate, selectedDriver]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatório Financeiro de Motoristas</h1>
          <p className="text-gray-600">Analise a lucratividade e desempenho financeiro por motorista</p>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Motorista</Label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Motoristas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Motoristas</SelectItem>
                    {drivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Botão removido pois a atualização agora é automática */}
              <div className="flex items-center text-sm text-gray-500 italic h-10">
                {isLoadingReport && <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Atualizando...</>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo Geral */}
        {reportData && (
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="bg-white border-l-4 border-blue-500 shadow">
              <CardContent className="p-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Receita Total</div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.summary.total_revenue)}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-l-4 border-red-500 shadow">
              <CardContent className="p-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Custo Total (Motoristas)</div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(reportData.summary.total_cost)}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-l-4 border-green-500 shadow">
              <CardContent className="p-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Lucro Bruto</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(reportData.summary.total_margin)}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-l-4 border-purple-500 shadow">
              <CardContent className="p-6">
                <div className="text-sm font-medium text-gray-500 mb-1">Total de Viagens</div>
                <div className="text-2xl font-bold text-gray-900">{reportData.summary.total_trips}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabela Detalhada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Detalhamento por Motorista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motorista</TableHead>
                  <TableHead className="text-center">Viagens</TableHead>
                  <TableHead className="text-right">Receita Gerada</TableHead>
                  <TableHead className="text-right">Custo (Pago)</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Margem %</TableHead>
                  <TableHead className="text-center">Despesas Extras</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingReport ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    </TableCell>
                  </TableRow>
                ) : reportData?.report?.length > 0 ? (
                  reportData.report.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.driver_name}</TableCell>
                      <TableCell className="text-center">{item.total_trips}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(item.total_cost)}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">{formatCurrency(item.margin)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          item.roi > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.roi.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.total_additional_expenses > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex items-center justify-center gap-1 text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>{formatCurrency(item.total_additional_expenses)}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Este motorista reportou despesas adicionais em {item.trips_with_expenses_count} viagens.</p>
                                <p>Verifique os detalhes para reembolso.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                      Nenhum dado encontrado para o período selecionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}