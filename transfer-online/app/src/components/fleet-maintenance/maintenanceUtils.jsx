export function formatCurrency(value = 0) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function calculateNextDue({ serviceDate, odometerKm, intervalDays, intervalKm }) {
  const result = {};

  if (serviceDate && Number(intervalDays) > 0) {
    const date = new Date(`${serviceDate}T12:00:00`);
    date.setDate(date.getDate() + Number(intervalDays));
    result.next_due_date = date.toISOString().slice(0, 10);
  }

  if ((odometerKm || odometerKm === 0) && Number(intervalKm) > 0) {
    result.next_due_odometer_km = Number(odometerKm) + Number(intervalKm);
  }

  return result;
}

export function getPlanStatus(plan, vehicle) {
  if (!plan?.active) return 'inactive';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentKm = Number(vehicle?.current_odometer_km || 0);
  const nextKm = Number(plan?.next_due_odometer_km || 0);

  if (plan?.next_due_date) {
    const dueDate = new Date(`${plan.next_due_date}T12:00:00`);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate < today) return 'overdue';

    const warningDate = new Date(today);
    warningDate.setDate(warningDate.getDate() + 15);
    if (dueDate <= warningDate) return 'warning';
  }

  if (nextKm > 0) {
    if (currentKm >= nextKm) return 'overdue';
    if (currentKm >= nextKm - 1000) return 'warning';
  }

  return 'planned';
}

export function getPlanStatusMeta(status) {
  const map = {
    overdue: { label: 'Vencida', className: 'bg-red-100 text-red-800 border-red-200' },
    warning: { label: 'Próxima', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    planned: { label: 'Planejada', className: 'bg-green-100 text-green-800 border-green-200' },
    inactive: { label: 'Inativa', className: 'bg-slate-100 text-slate-700 border-slate-200' }
  };

  return map[status] || map.planned;
}

export function getVehicleStatusMeta(status) {
  const map = {
    operational: { label: 'Operacional', className: 'bg-green-100 text-green-800 border-green-200' },
    maintenance: { label: 'Em manutenção', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    inactive: { label: 'Inativo', className: 'bg-slate-100 text-slate-700 border-slate-200' }
  };

  return map[status] || map.operational;
}

export function getMaintenanceTypeLabel(type) {
  const map = {
    preventive: 'Preventiva',
    corrective: 'Corretiva',
    inspection: 'Inspeção',
    oil: 'Troca de óleo',
    brakes: 'Freios',
    tires: 'Pneus',
    suspension: 'Suspensão',
    electrical: 'Elétrica',
    air_conditioning: 'Ar-condicionado',
    bodywork: 'Funilaria',
    scheduled: 'Programada',
    other: 'Outros'
  };

  return map[type] || 'Outros';
}

export function getProviderCategoryLabel(category) {
  const map = {
    workshop: 'Oficina',
    dealership: 'Concessionária',
    tire_shop: 'Pneus',
    electrician: 'Elétrica',
    body_shop: 'Funilaria',
    oil_service: 'Lubrificação',
    other: 'Outros'
  };

  return map[category] || 'Outros';
}