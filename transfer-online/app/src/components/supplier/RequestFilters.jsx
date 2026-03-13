import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X as XIcon } from 'lucide-react';

export default function RequestFilters({
  searchTerm,
  setSearchTerm,
  showFilters,
  setShowFilters,
  hasActiveFilters,
  tripTypeFilter,
  setTripTypeFilter,
  statusFilter,
  setStatusFilter,
  vehicleTypeFilter,
  setVehicleTypeFilter,
  clientFilter,
  setClientFilter,
  driverFilter,
  setDriverFilter,
  costCenterFilter,
  setCostCenterFilter,
  dateFilter,
  setDateFilter,
  resetFilters,
  supplierVehicleTypes,
  clients,
  ownClients,
  uniqueDrivers,
  uniqueCostCenters,
  filteredCount,
  totalCount
}) {
  return (
    <Card className="mb-6 border-2 border-blue-300 shadow-lg">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar por número, passageiro, motorista, origem ou destino..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="w-40 hidden md:block">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-12"
                title="Filtrar por Data"
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={resetFilters}
                className="h-12 px-3 text-red-600 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200"
                title="Limpar Todos os Filtros"
              >
                <XIcon className="w-5 h-5 mr-2" />
                Limpar
              </Button>
            )}

            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="h-12"
            >
              <Filter className="w-5 h-5 mr-2" />
              Filtros
              {hasActiveFilters && (
                <Badge className="ml-2 bg-red-500 text-white">●</Badge>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Origem da Viagem</Label>
                <Select value={tripTypeFilter} onValueChange={setTripTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as Origens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="platform">Solicitações da Plataforma</SelectItem>
                    <SelectItem value="direct_booking">Particulares / Diretas</SelectItem>
                    <SelectItem value="own">Minhas Viagens Próprias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="aguardando_resposta">Aguardando Resposta (Plat.)</SelectItem>
                    <SelectItem value="aceito">Aceito / Pendente</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="recusado">Recusado</SelectItem>
                    <SelectItem value="timeout">Expirado</SelectItem>
                    <SelectItem value="aguardando">Status Motorista: Aguardando</SelectItem>
                    <SelectItem value="a_caminho">Status Motorista: A Caminho</SelectItem>
                    <SelectItem value="chegou_origem">Status Motorista: Na Origem</SelectItem>
                    <SelectItem value="passageiro_embarcou">Status Motorista: Em Viagem</SelectItem>
                    <SelectItem value="parada_adicional">Status Motorista: Parada</SelectItem>
                    <SelectItem value="chegou_destino">Status Motorista: No Destino</SelectItem>
                    <SelectItem value="finalizada">Status Motorista: Finalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tipo de Veículo</Label>
                <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Veículos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Veículos</SelectItem>
                    {supplierVehicleTypes.map(vt => (
                      <SelectItem key={vt.id} value={vt.id}>
                        {vt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Cliente</Label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Clientes</SelectItem>
                    {[...clients, ...ownClients].sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Motorista</Label>
                <Select value={driverFilter} onValueChange={setDriverFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Motoristas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Motoristas</SelectItem>
                    {uniqueDrivers.map(driverName => (
                      <SelectItem key={driverName} value={driverName}>
                        {driverName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Centro de Custo</Label>
                <Select value={costCenterFilter} onValueChange={setCostCenterFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Centros" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Centros</SelectItem>
                    {uniqueCostCenters.map(cc => (
                      <SelectItem key={cc.code} value={cc.code}>
                        {cc.code} - {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Data da Viagem</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full"
                />
              </div>

              {hasActiveFilters && (
                <div className="md:col-span-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="w-full"
                  >
                    <XIcon className="w-4 h-4 mr-2" />
                    Limpar Todos os Filtros
                  </Button>
                </div>
              )}
            </div>
          )}

          {(searchTerm || hasActiveFilters) && (
            <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Search className="w-4 h-4 inline mr-2" />
              Exibindo <strong>{filteredCount}</strong> de <strong>{totalCount}</strong> solicitações
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}