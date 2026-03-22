import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { iconMap } from '@/components/presentation/iconMap';

export default function PresentationPillars({ title, pillars }) {
  return (
    <section className="space-y-6">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-bold text-slate-900">{title}</h2>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {pillars.map((pillar) => {
          const Icon = iconMap[pillar.icon];
          return (
            <Card key={pillar.title} className="border-0 shadow-lg">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl text-slate-900">{pillar.title}</CardTitle>
                <p className="text-sm leading-6 text-slate-600">{pillar.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {pillar.bullets.map((bullet) => (
                  <div key={bullet} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <p className="text-sm leading-6 text-slate-700">{bullet}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}