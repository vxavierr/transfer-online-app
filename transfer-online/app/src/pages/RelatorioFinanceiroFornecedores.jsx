import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  DollarSign,
  TrendingUp,
  Users,
  Package,
  Download,
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RelatorioFinanceiroFornecedores() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        const isSupplier = currentUser.supplier_id && currentUser.role !== 'admin';
        
        if (currentUser.role !== 'admin' && !isSupplier) {
          window.location.href = '/';
          return;
        }
        setUser(currentUser);
        setIsCheckingAuth(false);
      } catch (error) {
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date'),
    initialData: []
  });

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers', user?.supplier_id],
    queryFn: async () => {
      if (user?.supplier_id) {
        // Se for fornecedor, busca apenas os dados dele
        const supplier = await base44.entities.Supplier.get(user.supplier_id);
        return [supplier];
      }
      return base44.entities.Supplier.list();
    },
    enabled: !!user,
    initialData: []
  });

  const { data: serviceRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['serviceRequests'],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date'),
    initialData: []
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  // Calcular estatísticas por fornecedor
  const supplierStats = suppliers.map(supplier => {
    // Bookings do fornecedor
    const supplierBookings = bookings.filter(b => b.supplier_id === supplier.id);
    const paidBookings = supplierBookings.filter(b => b.payment_status === 'pago');
    
    // Service Requests do fornecedor
    const supplierRequests = serviceRequests.filter(r => r.chosen_supplier_id === supplier.id);
    const confirmedRequests = supplierRequests.filter(r => r.status === 'confirmada' || r.status === 'concluida');

    // Totais
    const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const totalSupplierCost = paidBookings.reduce((sum, b) => sum + (b.supplier_cost || 0), 0);
    const totalMargin = totalRevenue - totalSupplierCost;

    // Totais de Service Requests
    const totalRequestRevenue = confirmedRequests.reduce((sum, r) => sum + (r.chosen_client_price || 0), 0);
    const totalRequestCost = confirmedRequests.reduce((sum, r) => sum + (r.chosen_supplier_cost || 0), 0);
    const totalRequestMargin = totalRequestRevenue - totalRequestCost;

    // Pagamentos pendentes ao fornecedor
    const unpaidBookings = supplierBookings.filter(b => 
      b.payment_status === 'pago' && b.supplier_payment_status !== 'pago'
    );
    const pendingPayment = unpaidBookings.reduce((sum, b) => sum + (b.supplier_cost || 0), 0);

    return {
      supplier,
      bookingsCount: supplierBookings.length,
      requestsCount: supplierRequests.length,
      totalRevenue: totalRevenue + totalRequestRevenue,
      totalCost: totalSupplierCost + totalRequestCost,
      totalMargin: totalMargin + totalRequestMargin,
      pendingPayment,
      unpaidCount: unpaidBookings.length
    };
  }).filter(stat => stat.bookingsCount > 0 || stat.requestsCount > 0);

  // Totais gerais
  const grandTotals = supplierStats.reduce((acc, stat) => ({
    revenue: acc.revenue + stat.totalRevenue,
    cost: acc.cost + stat.totalCost,
    margin: acc.margin + stat.totalMargin,
    pending: acc.pending + stat.pendingPayment
  }), { revenue: 0, cost: 0, margin: 0, pending: 0 });

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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Relatório Financeiro - Fornecedores
            </h1>
            <p className="text-gray-600">Acompanhe receitas, custos e pagamentos aos fornecedores</p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatPrice(grandTotals.revenue)}</div>
              <p className="text-xs opacity-90 mt-1">De todas as viagens</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Custo Fornecedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatPrice(grandTotals.cost)}</div>
              <p className="text-xs opacity-90 mt-1">Pago aos fornecedores</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Margem Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatPrice(grandTotals.margin)}</div>
              <p className="text-xs opacity-90 mt-1">Lucro bruto</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pagamentos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatPrice(grandTotals.pending)}</div>
              <p className="text-xs opacity-90 mt-1">A pagar aos fornecedores</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Fornecedores */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por Fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            {(loadingBookings || loadingSuppliers || loadingRequests) ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Carregando dados...</p>
              </div>
            ) : supplierStats.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>Nenhuma transação registrada com fornecedores</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Fornecedor</TableHead>
                      <TableHead className="font-semibold">Viagens</TableHead>
                      <TableHead className="font-semibold">Receita Total</TableHead>
                      <TableHead className="font-semibold">Custo Fornecedor</TableHead>
                      <TableHead className="font-semibold">Margem</TableHead>
                      <TableHead className="font-semibold">Pendente</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierStats.map(stat => {
                      const marginPercent = stat.totalRevenue > 0 
                        ? ((stat.totalMargin / stat.totalRevenue) * 100).toFixed(1)
                        : 0;

                      return (
                        <TableRow key={stat.supplier.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900">{stat.supplier.name}</div>
                              <div className="text-sm text-gray-500">{stat.supplier.company_name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold">{stat.bookingsCount + stat.requestsCount}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-blue-600">
                              {formatPrice(stat.totalRevenue)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-orange-600">
                              {formatPrice(stat.totalCost)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold text-green-600">
                                {formatPrice(stat.totalMargin)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {marginPercent}% margem
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold text-amber-600">
                                {formatPrice(stat.pendingPayment)}
                              </div>
                              {stat.unpaidCount > 0 && (
                                <div className="text-xs text-gray-500">
                                  {stat.unpaidCount} viagem(ns)
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={stat.supplier.active ? 
                              'bg-green-100 text-green-800 border-green-300 border' : 
                              'bg-gray-100 text-gray-800 border-gray-300 border'}>
                              {stat.supplier.active ? 'Ativo' : 'Inativo'}
                            </Badge>
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
      </div>
    </div>
  );
}