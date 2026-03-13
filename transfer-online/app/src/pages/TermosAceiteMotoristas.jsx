import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  Loader2,
  Search,
  CheckCircle,
  XCircle,
  Printer,
  Calendar,
  MapPin,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TermosAceiteMotoristas() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        
        if (user.role !== 'admin') {
          alert('Acesso negado. Apenas administradores podem acessar esta página.');
          window.location.href = '/';
          return;
        }

        // Verificar permissões se o admin tiver restrições
        if (user.admin_page_permissions && user.admin_page_permissions.length > 0) {
          if (!user.admin_page_permissions.includes('TermosAceiteMotoristas')) {
            alert('Você não tem permissão para acessar esta página.');
            window.location.href = '/AdminDashboard';
            return;
          }
        }

        setCurrentUser(user);
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['driversTerms'],
    queryFn: () => base44.entities.Driver.list('-created_date'),
    enabled: !!currentUser && !isCheckingAuth,
    initialData: []
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: !!currentUser && !isCheckingAuth,
    initialData: []
  });

  const filteredDrivers = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === '') return drivers;
    const search = searchTerm.trim().toLowerCase();
    return drivers.filter(d => {
      const name = (d.name || '').toLowerCase();
      const email = (d.email || '').toLowerCase();
      const phone = (d.phone_number || '').toLowerCase();
      const supplier = suppliers.find(s => s.id === d.supplier_id);
      const supplierName = (supplier?.name || '').toLowerCase();
      return name.includes(search) || email.includes(search) || phone.includes(search) || supplierName.includes(search);
    });
  }, [drivers, searchTerm, suppliers]);

  const stats = useMemo(() => {
    const accepted = drivers.filter(d => d.terms_accepted_at).length;
    const pending = drivers.filter(d => !d.terms_accepted_at).length;
    return { total: drivers.length, accepted, pending };
  }, [drivers]);

  const handleViewDetails = (driver) => {
    setSelectedDriver(driver);
    setShowDetailsDialog(true);
  };

  const handlePrint = (driver) => {
    const supplier = suppliers.find(s => s.id === driver.supplier_id);
    const printContent = `
      <html>
        <head>
          <title>Termo de Aceite - ${driver.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px;
              line-height: 1.6;
            }
            .header {
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              color: #1e3a8a;
              margin-bottom: 10px;
            }
            .section {
              margin-bottom: 20px;
              padding: 15px;
              background: #f8fafc;
              border-left: 4px solid #3b82f6;
            }
            .label {
              font-weight: bold;
              color: #475569;
            }
            .value {
              color: #1e293b;
              margin-left: 10px;
            }
            .signature {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #cbd5e1;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
            }
            .badge-success {
              background: #dcfce7;
              color: #166534;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Termo de Aceite de Motorista</div>
            <div style="color: #64748b;">TransferOnline - Sistema de Gestão de Transfers</div>
          </div>

          <div class="section">
            <div><span class="label">Motorista:</span><span class="value">${driver.name}</span></div>
            ${driver.email ? `<div><span class="label">Email:</span><span class="value">${driver.email}</span></div>` : ''}
            <div><span class="label">Telefone:</span><span class="value">${driver.phone_number || 'Não informado'}</span></div>
            ${supplier ? `<div><span class="label">Fornecedor:</span><span class="value">${supplier.name}</span></div>` : ''}
          </div>

          <div class="section">
            <div style="margin-bottom: 10px;"><span class="badge badge-success">✓ Termo Aceito Digitalmente</span></div>
            <div><span class="label">Data e Hora do Aceite:</span><span class="value">${driver.terms_accepted_at ? format(new Date(driver.terms_accepted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Não aceito'}</span></div>
            <div><span class="label">Versão do Contrato:</span><span class="value">${driver.terms_version || 'N/A'}</span></div>
            <div><span class="label">Endereço IP:</span><span class="value">${driver.terms_acceptance_ip || 'N/A'}</span></div>
          </div>

          <div class="signature">
            <p style="color: #64748b; font-size: 14px;">
              Este documento certifica digitalmente que o motorista ${driver.name} 
              leu, compreendeu e aceitou os termos do Contrato de Licença de Uso de Software 
              e Intermediação de Serviços com a Transferonline Gestão de Transfer Executivo Ltda.
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
              Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Termos de Aceite dos Motoristas</h1>
          </div>
          <p className="text-gray-600">
            Visualize e imprima os termos aceitos digitalmente pelos motoristas
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <User className="w-4 h-4" />
                Total de Motoristas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Termos Aceitos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.accepted}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Busca */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar por nome, email, telefone ou fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Motoristas */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando motoristas...</p>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum motorista encontrado
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'Tente ajustar sua busca' : 'Não há motoristas cadastrados'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Motorista
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fornecedor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data de Aceite
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDrivers.map((driver) => {
                      const supplier = suppliers.find(s => s.id === driver.supplier_id);
                      return (
                        <tr key={driver.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{driver.name}</div>
                              <div className="text-sm text-gray-500">{driver.email || driver.phone_number}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {supplier?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            {driver.terms_accepted_at ? (
                              <Badge className="bg-green-100 text-green-800 border-green-300">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Aceito
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                                <XCircle className="w-3 h-3 mr-1" />
                                Pendente
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {driver.terms_accepted_at ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {format(new Date(driver.terms_accepted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleViewDetails(driver)}
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                Ver Detalhes
                              </Button>
                              {driver.terms_accepted_at && (
                                <Button
                                  onClick={() => handlePrint(driver)}
                                  variant="outline"
                                  size="sm"
                                  className="text-gray-600 hover:bg-gray-50"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialog de Detalhes */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Detalhes do Termo de Aceite
              </DialogTitle>
            </DialogHeader>

            {selectedDriver && (
              <div className="space-y-6">
                {/* Informações do Motorista */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Informações do Motorista
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nome:</span>
                      <span className="font-medium text-gray-900">{selectedDriver.name}</span>
                    </div>
                    {selectedDriver.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium text-gray-900">{selectedDriver.email}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Telefone:</span>
                      <span className="font-medium text-gray-900">{selectedDriver.phone_number || 'Não informado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fornecedor:</span>
                      <span className="font-medium text-gray-900">
                        {suppliers.find(s => s.id === selectedDriver.supplier_id)?.name || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status do Aceite */}
                {selectedDriver.terms_accepted_at ? (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Termo Aceito Digitalmente
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">Data e Hora:</span>
                        <span className="font-medium text-green-900">
                          {format(new Date(selectedDriver.terms_accepted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Versão do Contrato:</span>
                        <span className="font-medium text-green-900">{selectedDriver.terms_version || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Endereço IP:</span>
                        <span className="font-medium text-green-900 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {selectedDriver.terms_acceptance_ip || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-amber-600" />
                      Aceite Pendente
                    </h3>
                    <p className="text-sm text-amber-700">
                      Este motorista ainda não aceitou os termos de uso da plataforma.
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                onClick={() => setShowDetailsDialog(false)}
                variant="outline"
              >
                Fechar
              </Button>
              {selectedDriver?.terms_accepted_at && (
                <Button
                  onClick={() => handlePrint(selectedDriver)}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Termo
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}