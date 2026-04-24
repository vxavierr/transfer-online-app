import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { addDays, parseISO, isAfter, isBefore } from 'date-fns';

const formatPrice = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function PayableKPIs({ accounts }) {
  const kpis = useMemo(() => {
    const now = new Date();
    const in7Days = addDays(now, 7);
    let totalPending = 0;
    let totalPaid = 0;
    let totalOverdue = 0;
    let upcomingCount = 0;

    (accounts || []).forEach(a => {
      if (a.status === 'cancelado') return;
      if (a.status === 'pago') {
        totalPaid += a.paid_amount || a.amount || 0;
      } else {
        const remaining = (a.amount || 0) - (a.paid_amount || 0);
        totalPending += remaining;
        if (a.due_date) {
          const due = parseISO(a.due_date);
          if (isBefore(due, now) && a.status !== 'pago') {
            totalOverdue += remaining;
          }
          if (isAfter(due, now) && isBefore(due, in7Days)) {
            upcomingCount++;
          }
        }
      }
    });

    return { totalPending, totalPaid, totalOverdue, upcomingCount };
  }, [accounts]);

  const cards = [
    { label: 'Total a Pagar', value: formatPrice(kpis.totalPending), icon: DollarSign, color: 'blue' },
    { label: 'Total Pago', value: formatPrice(kpis.totalPaid), icon: CheckCircle, color: 'green' },
    { label: 'Total Vencido', value: formatPrice(kpis.totalOverdue), icon: AlertTriangle, color: 'red' },
    { label: 'Próx. 7 dias', value: `${kpis.upcomingCount} contas`, icon: Clock, color: 'yellow' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className={`bg-${c.color}-50 border-${c.color}-200`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 bg-${c.color}-100 rounded-full`}>
                  <Icon className={`w-4 h-4 text-${c.color}-600`} />
                </div>
                <p className={`text-xs font-medium text-${c.color}-900`}>{c.label}</p>
              </div>
              <p className={`text-xl font-bold text-${c.color}-700`}>{c.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}