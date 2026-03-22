import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';

export default function ManualSectionCard({ section }) {
  const steps = section.stepByStep || section.features;

  return (
    <Card className="h-full border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-gray-900">{section.menu}</CardTitle>
        <p className="text-sm text-gray-500">{section.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Como usar este menu</p>
          <div className="mt-3 space-y-3">
            {steps.map((step, index) => (
              <div key={`${section.menu}-step-${index}`} className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-gray-700">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">O que você encontra aqui</p>
          <div className="space-y-3">
            {section.features.map((feature) => (
              <div key={feature} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
                <p className="text-sm leading-6 text-gray-700">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-semibold">Leitura prática</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Use a sequência acima como fluxo sugerido: entre no menu, confira os dados principais, execute a ação e valide o resultado antes de seguir para o próximo tópico.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}