import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Car, ClipboardList, DollarSign, Wrench } from 'lucide-react';
import { formatCurrency, formatDate, getPlanStatus, getPlanStatusMeta } from './maintenanceUtils';

export default function MaintenanceOverview({ vehicles, plans, records, providers }) {
  const enrichedPlans = plans
    .map((plan) => ({
      ...plan,
      vehicle: vehicles.find((vehicle) => vehicle.id === plan.fleet_vehicle_id),
      statusMeta: getPlanStatusMeta(getPlanStatus(plan, vehicles.find((vehicle) => vehicle.id === plan.fleet_vehicle_id)))
    }))
    .sort((a, b) => {
      if (!a.next_due_date && !b.next_due_date) return 0;
      if (!a.next_due_date) return 1;
      if (!b.next_due_date) return -1;
      return a.next_due_date.localeCompare(b.next_due_date);
    });

  const overdueCount = enrichedPlans.filter((plan) => plan.statusMeta.label === 'Vencida').length;
  const warningCount = enrichedPlans.filter((plan) => plan.statusMeta.label === 'Próxima').length;
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  const monthlyCost = records
    .filter((record) => record.status === 'completed' && record.service_date && new Date(`${record.service_date}T12:00:00`) >= last30Days)
    .reduce((sum, record) => sum + Number(record.cost || 0), 0);

  const recentRecords = [...records]
    .sort((a, b) => (b.service_date || '').localeCompare(a.service_date || ''))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500"><Car className="h-4 w-4 text-blue-600" /> Veículos na frota</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-gray-900">{vehicles.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500"><AlertTriangle className="h-4 w-4 text-red-600" /> Manutenções vencidas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-red-600">{overdueCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500"><Wrench className="h-4 w-4 text-amber-600" /> Próximas manutenções</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-amber-600">{warningCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500"><DollarSign className="h-4 w-4 text-green-600" /> Gasto 30 dias</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-green-600">{formatCurrency(monthlyCost)}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agenda de manutenção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {enrichedPlans.length === 0 ? (
              <p className="text-sm text-gray-500">Cadastre planos preventivos para começar o acompanhamento.</p>
            ) : (
              enrichedPlans.slice(0, 6).map((plan) => (
                <div key={plan.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{plan.title}</p>
                      <p className="text-sm text-gray-500">{plan.vehicle?.vehicle_name || 'Veículo não encontrado'} • {plan.vehicle?.vehicle_plate || 'Sem placa'}</p>
                    </div>
                    <Badge className={plan.statusMeta.className}>{plan.statusMeta.label}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                    <p>Próxima data: <strong>{formatDate(plan.next_due_date)}</strong></p>
                    <p>Próximo KM: <strong>{plan.next_due_odometer_km ? `${plan.next_due_odometer_km} km` : '—'}</strong></p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimos serviços registrados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentRecords.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum serviço registrado ainda.</p>
            ) : (
              recentRecords.map((record) => {
                const vehicle = vehicles.find((item) => item.id === record.fleet_vehicle_id);
                return (
                  <div key={record.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{record.title}</p>
                        <p className="text-sm text-gray-500">{vehicle?.vehicle_name || 'Veículo não encontrado'} • {formatDate(record.service_date)}</p>
                      </div>
                      <p className="font-semibold text-green-600">{formatCurrency(record.cost)}</p>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">KM: {record.odometer_km ? `${record.odometer_km} km` : '—'} • Prestadores cadastrados: {providers.length}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}