import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const hasAdminAccess = user?.role === 'admin' || user?.email === 'fernandotransferonline@gmail.com';
    if (!hasAdminAccess) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { driver_id } = await req.json();
    if (!driver_id) {
      return Response.json({ error: 'driver_id is required' }, { status: 400 });
    }

    const vehicles = await base44.asServiceRole.entities.DriverVehicle.filter({ driver_id });
    const activeVehicles = (vehicles || [])
      .filter((vehicle) => vehicle.active !== false)
      .sort((a, b) => Number(b.is_default === true) - Number(a.is_default === true));

    return Response.json({ vehicles: activeVehicles });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to fetch driver vehicles' }, { status: 500 });
  }
});