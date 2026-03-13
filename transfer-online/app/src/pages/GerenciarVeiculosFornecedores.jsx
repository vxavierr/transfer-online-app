import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Car,
  Users,
  Briefcase,
  DollarSign,
  MapPin,
  Eye,
  AlertCircle
} from 'lucide-react';

export default function GerenciarVeiculosFornecedores() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
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

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: []
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['supplierVehicles'],
    queryFn: () => base44.entities.SupplierVehicleType.list(),
    initialData: []
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  const handleViewDetails = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetailsDialog(true);
  };

  // Agrupar veículos por fornecedor
  const vehiclesBySupplier = suppliers.map(supplier => ({
    supplier,
    vehicles: vehicles.filter(v => v.supplier_id === supplier.id)
  })).filter(group => group.vehicles.length > 0);

  const allVehicles = vehicles;
  const activeVehicles = vehicles.filter(v => v.active);
  const inactiveVehicles = vehicles.filter(v => !v.active);

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Veículos dos Fornecedores
          </h1>
          <p className="text-gray-600">Visualize todos os tipos de veículos cadastrados pelos fornecedores</p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Car className="w-4 h-4" />
                Total de Veículos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{allVehicles.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Car className="w-4 h-4" />
                Veículos Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeVehicles.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Veículos Inativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{inactiveVehicles.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs por Fornecedor */}
        <Card>
          <CardHeader>
            <CardTitle>Veículos por Fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            {(loadingSuppliers || loadingVehicles) ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Carregando veículos...</p>
              </div>
            ) : vehiclesBySupplier.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>Nenhum veículo cadastrado por fornecedores</p>
              </div>
            ) : (
              <Tabs defaultValue={vehiclesBySupplier[0]?.supplier.id}>
                <TabsList className="flex-wrap h-auto gap-2">
                  {vehiclesBySupplier.map(group => (
                    <TabsTrigger key={group.supplier.id} value={group.supplier.id} className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {group.supplier.name} ({group.vehicles.length})
                    </TabsTrigger>
                  ))}
                </TabsList>

                {vehiclesBySupplier.map(group => (
                  <TabsContent key={group.supplier.id} value={group.supplier.id}>
                    <div className="mb-4 bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">{group.supplier.name}</h3>
                      <div className="grid md:grid-cols-2 gap-2 text-sm text-blue-800">
                        <div>
                          <span className="font-medium">Empresa:</span> {group.supplier.company_name}
                        </div>
                        <div>
                          <span className="font-medium">Cidade:</span> {group.supplier.city || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Telefone:</span> {group.supplier.phone_number}
                        </div>
                        <div>
                          <span className="font-medium">Margem Padrão:</span> {group.supplier.default_margin_percentage}%
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-white overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">Veículo</TableHead>
                            <TableHead className="font-semibold">Capacidade</TableHead>
                            <TableHead className="font-semibold">Preço/km</TableHead>
                            <TableHead className="font-semibold">Preço Mínimo</TableHead>
                            <TableHead className="font-semibold">Raio</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.vehicles.map(vehicle => (
                            <TableRow key={vehicle.id} className="hover:bg-gray-50">
                              <TableCell>
                                <div>
                                  <div className="font-medium text-gray-900">{vehicle.name}</div>
                                  {vehicle.description && (
                                    <div className="text-sm text-gray-500 max-w-xs truncate">
                                      {vehicle.description}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3 text-sm">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span>{vehicle.max_passengers}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Briefcase className="w-4 h-4 text-gray-400" />
                                    <span>{vehicle.max_luggage}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  <span className="font-semibold text-green-600">
                                    {formatPrice(vehicle.base_price_per_km)}/km
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm space-y-1">
                                  {vehicle.min_price_one_way && (
                                    <div>Ida: {formatPrice(vehicle.min_price_one_way)}</div>
                                  )}
                                  {vehicle.min_price_round_trip && (
                                    <div>Ida/Volta: {formatPrice(vehicle.min_price_round_trip)}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {vehicle.operational_radius_km > 0 ? (
                                  <div className="flex items-center gap-1 text-sm">
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                    <span>{vehicle.operational_radius_km} km</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">Ilimitado</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={vehicle.active ? 
                                  'bg-green-100 text-green-800 border-green-300 border' : 
                                  'bg-gray-100 text-gray-800 border-gray-300 border'}>
                                  {vehicle.active ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(vehicle)}
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Detalhes */}
        {selectedVehicle && (
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedVehicle.name}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Informações Básicas</h3>
                  {selectedVehicle.description && (
                    <p className="text-gray-700 mb-3">{selectedVehicle.description}</p>
                  )}
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Máx. Passageiros:</span>
                      <span className="font-semibold ml-2">{selectedVehicle.max_passengers}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Máx. Malas:</span>
                      <span className="font-semibold ml-2">{selectedVehicle.max_luggage}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Antecedência:</span>
                      <span className="font-semibold ml-2">{selectedVehicle.min_booking_lead_time_hours}h</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <Badge className={`ml-2 ${selectedVehicle.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {selectedVehicle.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Tarifas */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Tarifas</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Preço por KM:</span>
                      <span className="font-semibold ml-2 text-green-600">
                        {formatPrice(selectedVehicle.base_price_per_km)}/km
                      </span>
                    </div>
                    {selectedVehicle.min_price_one_way && (
                      <div>
                        <span className="text-gray-600">Mín. Só Ida:</span>
                        <span className="font-semibold ml-2">{formatPrice(selectedVehicle.min_price_one_way)}</span>
                      </div>
                    )}
                    {selectedVehicle.min_price_round_trip && (
                      <div>
                        <span className="text-gray-600">Mín. Ida/Volta:</span>
                        <span className="font-semibold ml-2">{formatPrice(selectedVehicle.min_price_round_trip)}</span>
                      </div>
                    )}
                    {selectedVehicle.operational_radius_km > 0 && (
                      <div>
                        <span className="text-gray-600">Raio de Atuação:</span>
                        <span className="font-semibold ml-2">{selectedVehicle.operational_radius_km} km</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pacotes por Hora */}
                {(selectedVehicle.hourly_5_hours_price > 0 || selectedVehicle.hourly_10_hours_price > 0) && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3">Pacotes por Hora</h3>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      {selectedVehicle.hourly_5_hours_price > 0 && (
                        <div>
                          <span className="text-gray-600">Pacote 5h:</span>
                          <span className="font-semibold ml-2">{formatPrice(selectedVehicle.hourly_5_hours_price)}</span>
                          <span className="text-xs text-gray-500 ml-1">
                            ({selectedVehicle.hourly_5_hours_km_allowance} km)
                          </span>
                        </div>
                      )}
                      {selectedVehicle.hourly_10_hours_price > 0 && (
                        <div>
                          <span className="text-gray-600">Pacote 10h:</span>
                          <span className="font-semibold ml-2">{formatPrice(selectedVehicle.hourly_10_hours_price)}</span>
                          <span className="text-xs text-gray-500 ml-1">
                            ({selectedVehicle.hourly_10_hours_km_allowance} km)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sobretaxas de Idioma */}
                {(selectedVehicle.language_surcharge_en > 0 || selectedVehicle.language_surcharge_es > 0) && (
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3">Sobretaxas de Idioma</h3>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      {selectedVehicle.language_surcharge_en > 0 && (
                        <div>
                          <span className="text-gray-600">Inglês:</span>
                          <span className="font-semibold ml-2">
                            {selectedVehicle.language_surcharge_en_type === 'percentage' 
                              ? `${selectedVehicle.language_surcharge_en}%`
                              : formatPrice(selectedVehicle.language_surcharge_en)}
                          </span>
                        </div>
                      )}
                      {selectedVehicle.language_surcharge_es > 0 && (
                        <div>
                          <span className="text-gray-600">Espanhol:</span>
                          <span className="font-semibold ml-2">
                            {selectedVehicle.language_surcharge_es_type === 'percentage' 
                              ? `${selectedVehicle.language_surcharge_es}%`
                              : formatPrice(selectedVehicle.language_surcharge_es)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Características */}
                {selectedVehicle.features && selectedVehicle.features.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Características</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedVehicle.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-sm">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setShowDetailsDialog(false)} variant="outline">
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}