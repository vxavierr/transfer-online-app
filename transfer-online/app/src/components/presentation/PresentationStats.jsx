import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { iconMap } from '@/components/presentation/iconMap';

export default function PresentationStats({ stats }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {stats.map((item) => {
        const Icon = iconMap[item.icon];
        return (
          <Card key={item.label} className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Icon className="h-6 w-6" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{item.value}</p>
              <p className="mt-2 font-semibold text-slate-900">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}