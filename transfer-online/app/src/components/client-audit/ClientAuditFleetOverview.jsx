import React from 'react';
import { Car, Users } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ClientAuditExpiryBadge from './ClientAuditExpiryBadge';

function formatDate(dateValue) {
  if (!dateValue) return '-';
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString('pt-BR');
}

function compareByDate(firstDate, secondDate) {
  if (!firstDate && !secondDate) return 0;
  if (!firstDate) return 1;
  if (!secondDate) return -1;
  return new Date(`${firstDate}T00:00:00`) - new Date(`${secondDate}T00:00:00`);
}

function sortDrivers(drivers, sortMode) {
  const items = [...drivers];

  if (sortMode === 'expiry') {
    return items.sort((a, b) => compareByDate(a.license_expiry, b.license_expiry));
  }

  return items.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
}

function sortVehicles(vehicles, sortMode) {
  const items = [...vehicles];

  if (sortMode === 'expiry') {
    return items.sort((a, b) => compareByDate(a.registration_expiry, b.registration_expiry));
  }

  return items.sort((a, b) => {
    const firstLabel = a.vehicle_name || a.model || a.vehicle_plate || '';
    const secondLabel = b.vehicle_name || b.model || b.vehicle_plate || '';
    return firstLabel.localeCompare(secondLabel, 'pt-BR', { sensitivity: 'base' });
  });
}

export default function ClientAuditFleetOverview({ supplier }) {
  const [driverSort, setDriverSort] = React.useState('alphabetical');
  const [vehicleSort, setVehicleSort] = React.useState('alphabetical');

  const drivers = supplier.drivers || [];
  const vehicles = supplier.supplier_vehicles || [];

  const sortedDrivers = React.useMemo(() => sortDrivers(drivers, driverSort), [drivers, driverSort]);
  const sortedVehicles = React.useMemo(() => sortVehicles(vehicles, vehicleSort), [vehicles, vehicleSort]);

  return (
    <div className="rounded-2xl border bg-slate-50 p-4 md:p-5">
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Motoristas associados</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{drivers.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Veículos associados</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{vehicles.length}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Users className="h-4 w-4 text-blue-600" />
                Lista de motoristas
              </h3>
              <p className="text-xs text-slate-500">Ordene por nome ou por vencimento da CNH.</p>
            </div>
            <Select value={driverSort} onValueChange={setDriverSort}>
              <SelectTrigger className="w-full md:w-[190px]">
                <SelectValue placeholder="Ordenar motoristas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alphabetical">Ordem alfabética</SelectItem>
                <SelectItem value="expiry">Vencimento da CNH</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {sortedDrivers.length === 0 && <p className="text-sm text-slate-500">Nenhum motorista associado.</p>}
            {sortedDrivers.map((driver) => (
              <div key={driver.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{driver.name}</p>
                    <p className="text-xs text-slate-500">CNH vence em {formatDate(driver.license_expiry)}</p>
                  </div>
                  <ClientAuditExpiryBadge dateValue={driver.license_expiry} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Car className="h-4 w-4 text-blue-600" />
                Lista de veículos
              </h3>
              <p className="text-xs text-slate-500">Visualize os veículos separados e ordene pelo licenciamento.</p>
            </div>
            <Select value={vehicleSort} onValueChange={setVehicleSort}>
              <SelectTrigger className="w-full md:w-[190px]">
                <SelectValue placeholder="Ordenar veículos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alphabetical">Ordem alfabética</SelectItem>
                <SelectItem value="expiry">Vencimento do licenciamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {sortedVehicles.length === 0 && <p className="text-sm text-slate-500">Nenhum veículo associado.</p>}
            {sortedVehicles.map((vehicle) => (
              <div key={vehicle.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{vehicle.vehicle_name || vehicle.model || 'Veículo sem identificação'}</p>
                    <p className="text-xs text-slate-500">
                      {vehicle.model || 'Modelo não informado'}
                      {vehicle.vehicle_plate ? ` • ${vehicle.vehicle_plate}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Licenciamento vence em {formatDate(vehicle.registration_expiry)}</p>
                  </div>
                  <ClientAuditExpiryBadge dateValue={vehicle.registration_expiry} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}