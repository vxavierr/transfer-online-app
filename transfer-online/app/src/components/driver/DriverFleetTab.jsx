import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Car } from 'lucide-react';
import DriverFuelRecords from './DriverFuelRecords';
import DriverMaintenanceRecords from './DriverMaintenanceRecords';

export default function DriverFleetTab({ user }) {
  const driverId = user?.driver_id;

  // Buscar dados do motorista para obter supplier_id
  const { data: driver, isLoading: isLoadingDriver } = useQuery({
    queryKey: ['driverDataForFleet', driverId],
    queryFn: () => base44.entities.Driver.get(driverId),
    enabled: !!driverId
  });

  const supplierId = driver?.supplier_id;

  // Buscar veículos do motorista (DriverVehicle)
  const { data: driverVehicles = [] } = useQuery({
    queryKey: ['driverVehiclesForFleet', driverId],
    queryFn: () => base44.entities.DriverVehicle.filter({ driver_id: driverId }),
    enabled: !!driverId
  });

  // Buscar veículos da frota do fornecedor (para vincular manutenções)
  const { data: fleetVehicles = [] } = useQuery({
    queryKey: ['supplierFleetVehiclesForDriver', supplierId],
    queryFn: () => base44.entities.SupplierFleetVehicle.filter({ supplier_id: supplierId }),
    enabled: !!supplierId
  });

  if (isLoadingDriver) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
        <CardTitle className="text-2xl flex items-center gap-2">
          <Car className="h-6 w-6" /> Frota e Abastecimentos
        </CardTitle>
        <CardDescription className="text-orange-100">
          Registre manutenções e abastecimentos dos seus veículos
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        <DriverFuelRecords 
          driverId={driverId} 
          supplierId={supplierId} 
          vehicles={driverVehicles} 
        />
        
        <div className="border-t border-gray-200 pt-6">
          <DriverMaintenanceRecords 
            driverId={driverId} 
            supplierId={supplierId} 
            vehicles={driverVehicles} 
            fleetVehicles={fleetVehicles} 
          />
        </div>
      </CardContent>
    </Card>
  );
}