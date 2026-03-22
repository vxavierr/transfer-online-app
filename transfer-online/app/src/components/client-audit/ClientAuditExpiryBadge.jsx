import React from 'react';
import { Badge } from '@/components/ui/badge';

function getBadgeConfig(dateValue) {
  if (!dateValue) {
    return {
      label: 'Sem data',
      className: 'border-slate-200 bg-slate-100 text-slate-700'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(`${dateValue}T00:00:00`);

  if (targetDate < today) {
    return {
      label: 'Vencido',
      className: 'border-red-200 bg-red-100 text-red-700'
    };
  }

  return {
    label: 'Regular',
    className: 'border-emerald-200 bg-emerald-100 text-emerald-700'
  };
}

export default function ClientAuditExpiryBadge({ dateValue }) {
  const badge = getBadgeConfig(dateValue);

  return <Badge className={badge.className}>{badge.label}</Badge>;
}