import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PresentationJourney({ title, items }) {
  return (
    <section>
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl text-slate-900">{title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {items.map((item, index) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {index + 1}
              </div>
              <p className="text-sm leading-7 text-slate-700">{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}