import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ArrowRight } from 'lucide-react';
import ManualSectionCard from '@/components/manual/ManualSectionCard';

export default function UserManualRoleView({ manual }) {
  return (
    <div className="space-y-6">
      <Card className="border-blue-100 bg-blue-50/70 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-blue-700 mb-3">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-semibold">Leitura guiada por perfil</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{manual.title}</h2>
          <p className="mt-2 text-sm text-gray-600">{manual.intro}</p>
          <Badge className="mt-4 bg-white text-blue-700 border border-blue-200 hover:bg-white">Público: {manual.audience}</Badge>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-slate-50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-slate-900">Como navegar neste manual</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">1. Escolha o menu</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Abra o tópico correspondente à tarefa que você quer executar no sistema.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">2. Siga o passo a passo</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Cada bloco agora mostra uma ordem sugerida de uso para facilitar a operação do dia a dia.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">3. Valide o resultado</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Depois da ação, revise status, dados e confirmações antes de sair da tela.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {manual.menus.map((section) => (
          <ManualSectionCard key={section.menu} section={section} />
        ))}
      </div>

      <Card className="border-amber-200 bg-amber-50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-amber-900">Boas práticas de uso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {manual.quickTips.map((tip) => (
            <div key={tip} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-white p-3">
              <ArrowRight className="mt-0.5 h-4 w-4 text-amber-600" />
              <p className="text-sm leading-6 text-gray-700">{tip}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}