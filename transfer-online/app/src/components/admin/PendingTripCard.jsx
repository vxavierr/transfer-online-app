import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function PendingTripCard({
  code,
  badgeLabel,
  badgeClassName,
  subtitle,
  passengerName,
  date,
  time,
  route,
  detailsLabel = 'Ver Detalhes',
  acceptLabel = 'Aceitar Viagem',
  onViewDetails,
  onAccept,
}) {
  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-800 dark:border-slate-700 transition-colors">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between mb-2">
        <div>
          <span className="font-bold text-lg text-blue-600">{code}</span>
          <Badge className={`ml-3 ${badgeClassName}`}>{badgeLabel}</Badge>
          {subtitle && <span className="ml-2 text-sm text-gray-600">• {subtitle}</span>}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 lg:min-w-[260px] lg:justify-end">
          <Button type="button" variant="outline" onClick={onViewDetails} className="text-sm">
            {detailsLabel}
          </Button>
          <Button type="button" onClick={onAccept} className="bg-blue-600 hover:bg-blue-700 text-sm">
            {acceptLabel}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-600">Passageiro:</span>
          <span className="ml-2 font-medium">{passengerName}</span>
        </div>
        <div>
          <span className="text-gray-600">Data:</span>
          <span className="ml-2 font-medium">{date} às {time}</span>
        </div>
        <div className="md:col-span-2">
          <span className="text-gray-600">Rota:</span>
          <span className="ml-2 font-medium">{route}</span>
        </div>
      </div>
    </div>
  );
}