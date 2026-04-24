import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fuel, Loader2, Sparkles, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReceiptPreviewDialog from '@/components/driver/ReceiptPreviewDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FUEL_LABELS = {
  gasolina: 'Gasolina',
  etanol: 'Etanol',
  diesel: 'Diesel',
  gnv: 'GNV',
  gasolina_aditivada: 'Gasolina Aditivada',
  diesel_s10: 'Diesel S10',
  other: 'Outro'
};

export default function FuelRecordsTab({ supplierId, drivers = [] }) {
  const [previewUrl, setPreviewUrl] = React.useState(null);
  const { data: fuelRecords = [], isLoading } = useQuery({
    queryKey: ['supplierFuelRecords', supplierId],
    queryFn: () => base44.entities.FuelRecord.filter({ supplier_id: supplierId }, '-fuel_date', 200),
    enabled: !!supplierId
  });

  const totalLiters = fuelRecords.reduce((s, r) => s + (r.liters || 0), 0);
  const totalCost = fuelRecords.reduce((s, r) => s + (r.total_cost || 0), 0);
  const avgPricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

  // Agrupar por motorista
  const byDriver = {};
  fuelRecords.forEach(r => {
    const key = r.driver_id || 'unknown';
    if (!byDriver[key]) byDriver[key] = { records: [], total: 0, liters: 0 };
    byDriver[key].records.push(r);
    byDriver[key].total += r.total_cost || 0;
    byDriver[key].liters += r.liters || 0;
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2"><Fuel className="h-4 w-4 text-orange-600" />Total Registros</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-gray-900">{fuelRecords.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total Litros</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-orange-600">{totalLiters.toFixed(1)} L</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Gasto Total</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-red-600">R$ {totalCost.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Preço Médio/L</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-blue-600">R$ {avgPricePerLiter.toFixed(2)}</p></CardContent>
        </Card>
      </div>

      {/* Resumo por motorista */}
      {Object.keys(byDriver).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Consumo por Motorista</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byDriver).map(([dId, data]) => {
              const driverData = drivers.find(d => d.id === dId);
              return (
                <div key={dId} className="flex items-center justify-between p-3 rounded-xl border border-gray-200">
                  <div>
                    <p className="font-semibold text-gray-900">{driverData?.name || 'Motorista desconhecido'}</p>
                    <p className="text-sm text-gray-500">{data.records.length} abastecimentos • {data.liters.toFixed(1)} L</p>
                  </div>
                  <p className="font-bold text-red-600">R$ {data.total.toFixed(2)}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Lista completa */}
      {fuelRecords.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-gray-500"><Fuel className="h-12 w-12 mx-auto mb-3 text-gray-300" /><p className="font-medium">Nenhum abastecimento registrado.</p><p className="text-sm">Os motoristas podem registrar abastecimentos pelo app.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">Últimos abastecimentos</h3>
          {fuelRecords.slice(0, 30).map(record => {
            const driverData = drivers.find(d => d.id === record.driver_id);
            return (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-orange-100 text-orange-800 text-xs">{FUEL_LABELS[record.fuel_type] || record.fuel_type}</Badge>
                        {record.ai_extracted && <Badge className="bg-purple-100 text-purple-800 text-xs"><Sparkles className="h-3 w-3 mr-1" />IA</Badge>}
                      </div>
                      <p className="font-semibold text-gray-900">
                        {record.fuel_date ? format(new Date(record.fuel_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                        {record.fuel_time && ` às ${record.fuel_time}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {record.liters ? `${record.liters}L` : ''}
                        {record.price_per_liter ? ` × R$${record.price_per_liter.toFixed(2)}/L` : ''}
                        {record.total_cost ? ` = R$${record.total_cost.toFixed(2)}` : ''}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">👤 {driverData?.name || 'Desconhecido'}</p>
                      {record.station_name && <p className="text-xs text-gray-500">📍 {record.station_name}</p>}
                      {record.vehicle_plate && <p className="text-xs text-gray-500">🚗 {record.vehicle_plate}</p>}
                      {record.odometer_km > 0 && <p className="text-xs text-gray-500">📏 {record.odometer_km.toLocaleString('pt-BR')} km</p>}
                    </div>
                    {record.receipt_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewUrl(record.receipt_url)}>
                        <Eye className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Receipt Preview */}
      <ReceiptPreviewDialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)} imageUrl={previewUrl} />
    </div>
  );
}