import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

export default function PresentationDifferentiators({ title, items }) {
  return (
    <section>
      <Card className="border-0 bg-slate-950 text-white shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
              <ArrowRight className="mt-1 h-4 w-4 text-blue-300" />
              <p className="text-sm leading-7 text-slate-200">{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}