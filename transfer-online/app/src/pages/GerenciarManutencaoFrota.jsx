import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Car, ClipboardList, Fuel, ShieldCheck, Wrench } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MaintenanceOverview from '@/components/fleet-maintenance/MaintenanceOverview';
import FleetVehiclesTab from '@/components/fleet-maintenance/FleetVehiclesTab';
import MaintenancePlansTab from '@/components/fleet-maintenance/MaintenancePlansTab';
import MaintenanceRecordsTab from '@/components/fleet-maintenance/MaintenanceRecordsTab';
import MaintenanceProvidersTab from '@/components/fleet-maintenance/MaintenanceProvidersTab';
import FuelRecordsTab from '@/components/fleet-maintenance/FuelRecordsTab';
import { calculateNextDue } from '@/components/fleet-maintenance/maintenanceUtils';

export default function GerenciarManutencaoFrota() {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [supplier, setSupplier] = React.useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        const isSupplier = currentUser?.supplier_id && currentUser?.role !== 'admin';

        if (!isSupplier) {
          window.location.href = '/';
          return;
        }

        setUser(currentUser);
        const supplierData = await base44.entities.Supplier.get(currentUser.supplier_id);
        setSupplier(supplierData);
      } catch (error) {
        base44.auth.redirectToLogin();
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const supplierId = user?.supplier_id;

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['supplierVehicleTypesForMaintenance', supplierId],
    queryFn: () => base44.entities.SupplierVehicleType.filter({ supplier_id: supplierId }, '-updated_date'),
    enabled: !!supplierId,
    initialData: []
  });

  const { data: fleetVehicles = [] } = useQuery({
    queryKey: ['supplierFleetVehicles', supplierId],
    queryFn: () => base44.entities.SupplierFleetVehicle.filter({ supplier_id: supplierId }, '-updated_date'),
    enabled: !!supplierId,
    initialData: []
  });

  // Buscar motoristas do fornecedor e seus veículos (DriverVehicle)
  const { data: supplierDrivers = [] } = useQuery({
    queryKey: ['supplierDriversForFleet', supplierId],
    queryFn: () => base44.entities.Driver.filter({ supplier_id: supplierId }),
    enabled: !!supplierId,
    initialData: []
  });

  const driverIds = supplierDrivers.map(d => d.id);

  const { data: driverVehicles = [] } = useQuery({
    queryKey: ['driverVehiclesForFleet', driverIds.join(',')],
    queryFn: async () => {
      if (driverIds.length === 0) return [];
      const allVehicles = [];
      // Buscar em lotes para evitar queries muito grandes
      for (const dId of driverIds) {
        const vehicles = await base44.entities.DriverVehicle.filter({ driver_id: dId });
        allVehicles.push(...vehicles);
      }
      return allVehicles;
    },
    enabled: driverIds.length > 0,
    initialData: []
  });

  const { data: maintenanceProviders = [] } = useQuery({
    queryKey: ['fleetMaintenanceProviders', supplierId],
    queryFn: () => base44.entities.FleetMaintenanceProvider.filter({ supplier_id: supplierId }, '-updated_date'),
    enabled: !!supplierId,
    initialData: []
  });

  const { data: maintenancePlans = [] } = useQuery({
    queryKey: ['fleetMaintenancePlans', supplierId],
    queryFn: () => base44.entities.FleetMaintenancePlan.filter({ supplier_id: supplierId }, '-updated_date'),
    enabled: !!supplierId,
    initialData: []
  });

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['fleetMaintenanceRecords', supplierId],
    queryFn: () => base44.entities.FleetMaintenanceRecord.filter({ supplier_id: supplierId }, '-updated_date'),
    enabled: !!supplierId,
    initialData: []
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['supplierFleetVehicles', supplierId] });
    queryClient.invalidateQueries({ queryKey: ['fleetMaintenanceProviders', supplierId] });
    queryClient.invalidateQueries({ queryKey: ['fleetMaintenancePlans', supplierId] });
    queryClient.invalidateQueries({ queryKey: ['fleetMaintenanceRecords', supplierId] });
    queryClient.invalidateQueries({ queryKey: ['supplierFuelRecords', supplierId] });
  };

  const saveFleetVehicle = async (data) => {
    const payload = { ...data, supplier_id: supplierId };
    if (data.id) {
      const { id, ...updateData } = payload;
      await base44.entities.SupplierFleetVehicle.update(id, updateData);
      toast.success('Veículo atualizado com sucesso.');
    } else {
      await base44.entities.SupplierFleetVehicle.create(payload);
      toast.success('Veículo cadastrado com sucesso.');
    }
    refreshAll();
  };

  const deleteFleetVehicle = async (id, label) => {
    if (!window.confirm(`Excluir o veículo "${label}"?`)) return;
    await base44.entities.SupplierFleetVehicle.delete(id);
    toast.success('Veículo excluído com sucesso.');
    refreshAll();
  };

  const saveProvider = async (data) => {
    const payload = { ...data, supplier_id: supplierId };
    if (data.id) {
      const { id, ...updateData } = payload;
      await base44.entities.FleetMaintenanceProvider.update(id, updateData);
      toast.success('Prestador atualizado com sucesso.');
    } else {
      await base44.entities.FleetMaintenanceProvider.create(payload);
      toast.success('Prestador cadastrado com sucesso.');
    }
    refreshAll();
  };

  const deleteProvider = async (id, label) => {
    if (!window.confirm(`Excluir o prestador "${label}"?`)) return;
    await base44.entities.FleetMaintenanceProvider.delete(id);
    toast.success('Prestador excluído com sucesso.');
    refreshAll();
  };

  const savePlan = async (data) => {
    const nextDue = calculateNextDue({
      serviceDate: data.last_service_date,
      odometerKm: data.last_service_odometer_km,
      intervalDays: data.interval_days,
      intervalKm: data.interval_km
    });

    const payload = {
      ...data,
      supplier_id: supplierId,
      ...nextDue
    };

    if (data.id) {
      const { id, ...updateData } = payload;
      await base44.entities.FleetMaintenancePlan.update(id, updateData);
      toast.success('Plano atualizado com sucesso.');
    } else {
      await base44.entities.FleetMaintenancePlan.create(payload);
      toast.success('Plano cadastrado com sucesso.');
    }
    refreshAll();
  };

  const deletePlan = async (id, label) => {
    if (!window.confirm(`Excluir o plano "${label}"?`)) return;
    await base44.entities.FleetMaintenancePlan.delete(id);
    toast.success('Plano excluído com sucesso.');
    refreshAll();
  };

  const saveRecord = async (data) => {
    const payload = { ...data, supplier_id: supplierId };

    if (data.id) {
      const { id, ...updateData } = payload;
      await base44.entities.FleetMaintenanceRecord.update(id, updateData);
      toast.success('Registro atualizado com sucesso.');
    } else {
      await base44.entities.FleetMaintenanceRecord.create(payload);
      toast.success('Registro cadastrado com sucesso.');
    }

    const vehicle = fleetVehicles.find((item) => item.id === data.fleet_vehicle_id);
    if (vehicle && Number(data.odometer_km || 0) > Number(vehicle.current_odometer_km || 0)) {
      await base44.entities.SupplierFleetVehicle.update(vehicle.id, {
        current_odometer_km: Number(data.odometer_km || 0)
      });
    }

    if (data.plan_id && data.status === 'completed') {
      const plan = maintenancePlans.find((item) => item.id === data.plan_id);
      if (plan) {
        const computedNextDue = calculateNextDue({
          serviceDate: data.service_date,
          odometerKm: data.odometer_km,
          intervalDays: plan.interval_days,
          intervalKm: plan.interval_km
        });

        const nextDue = {
          next_due_date: data.next_due_date || computedNextDue.next_due_date,
          next_due_odometer_km: Number(data.next_due_odometer_km || computedNextDue.next_due_odometer_km || 0)
        };

        await base44.entities.FleetMaintenancePlan.update(plan.id, {
          last_service_date: data.service_date,
          last_service_odometer_km: Number(data.odometer_km || 0),
          ...nextDue
        });
      }
    }

    refreshAll();
  };

  const deleteRecord = async (id, label) => {
    if (!window.confirm(`Excluir o registro "${label}"?`)) return;
    await base44.entities.FleetMaintenanceRecord.delete(id);
    toast.success('Registro excluído com sucesso.');
    refreshAll();
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando módulo de manutenção...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden border-0 shadow-xl">
          <CardContent className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 p-8 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-2xl bg-white/10 p-3"><Wrench className="h-7 w-7" /></div>
                  <div>
                    <h1 className="text-3xl font-bold">Manutenção da Frota</h1>
                    <p className="mt-1 text-sm text-blue-100">{supplier?.name} • Controle completo de veículos, planos preventivos, históricos e prestadores.</p>
                  </div>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-blue-100">
                  Organize a frota real do fornecedor, acompanhe vencimentos por data e quilometragem, registre serviços executados e tenha visão rápida dos custos e pendências da manutenção veicular.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-blue-100">Veículos reais</p>
                  <p className="mt-2 text-2xl font-bold">{fleetVehicles.length}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-blue-100">Planos ativos</p>
                  <p className="mt-2 text-2xl font-bold">{maintenancePlans.filter((item) => item.active !== false).length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {fleetVehicles.length === 0 && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              Comece cadastrando os veículos reais da sua frota. Depois, crie os planos preventivos e registre os serviços executados.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 lg:grid-cols-6">
            <TabsTrigger value="overview" className="rounded-xl border border-gray-200 bg-white px-4 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"><ShieldCheck className="mr-2 h-4 w-4" /> Visão geral</TabsTrigger>
            <TabsTrigger value="fleet" className="rounded-xl border border-gray-200 bg-white px-4 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"><Car className="mr-2 h-4 w-4" /> Frota</TabsTrigger>
            <TabsTrigger value="plans" className="rounded-xl border border-gray-200 bg-white px-4 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"><Wrench className="mr-2 h-4 w-4" /> Planos</TabsTrigger>
            <TabsTrigger value="records" className="rounded-xl border border-gray-200 bg-white px-4 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"><ClipboardList className="mr-2 h-4 w-4" /> Registros</TabsTrigger>
            <TabsTrigger value="providers" className="rounded-xl border border-gray-200 bg-white px-4 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"><Wrench className="mr-2 h-4 w-4" /> Prestadores</TabsTrigger>
            <TabsTrigger value="fuel" className="rounded-xl border border-gray-200 bg-white px-4 py-3 data-[state=active]:bg-orange-600 data-[state=active]:text-white"><Fuel className="mr-2 h-4 w-4" /> Abastecimentos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><MaintenanceOverview vehicles={fleetVehicles} plans={maintenancePlans} records={maintenanceRecords} providers={maintenanceProviders} /></TabsContent>
          <TabsContent value="fleet"><FleetVehiclesTab vehicles={fleetVehicles} vehicleTypes={vehicleTypes} onSave={saveFleetVehicle} onDelete={deleteFleetVehicle} driverVehicles={driverVehicles} drivers={supplierDrivers} /></TabsContent>
          <TabsContent value="plans"><MaintenancePlansTab vehicles={fleetVehicles} providers={maintenanceProviders} plans={maintenancePlans} onSave={savePlan} onDelete={deletePlan} /></TabsContent>
          <TabsContent value="records"><MaintenanceRecordsTab vehicles={fleetVehicles} plans={maintenancePlans} providers={maintenanceProviders} records={maintenanceRecords} onSave={saveRecord} onDelete={deleteRecord} /></TabsContent>
          <TabsContent value="providers"><MaintenanceProvidersTab providers={maintenanceProviders} onSave={saveProvider} onDelete={deleteProvider} /></TabsContent>
          <TabsContent value="fuel"><FuelRecordsTab supplierId={supplierId} drivers={supplierDrivers} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}