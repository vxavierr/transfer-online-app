import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PresentationHero from '@/components/presentation/PresentationHero';
import PresentationStats from '@/components/presentation/PresentationStats';
import PresentationPillars from '@/components/presentation/PresentationPillars';
import PresentationJourney from '@/components/presentation/PresentationJourney';
import PresentationDifferentiators from '@/components/presentation/PresentationDifferentiators';
import PresentationPdfButton from '@/components/presentation/PresentationPdfButton';
import { presentationContent } from '@/components/presentation/presentationContent';

export default function PresentationPage({ presentationKey }) {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const initialLanguage = urlParams.get('lang') || 'pt';
  const [language, setLanguage] = React.useState(initialLanguage);
  const content = presentationContent[presentationKey][language] || presentationContent[presentationKey].pt;
  const otherRoute = presentationKey === 'corporate' ? '/ApresentacaoFornecedores' : '/ApresentacaoClientesCorporativos';

  const handleLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage);
    const params = new URLSearchParams(window.location.search);
    params.set('lang', nextLanguage);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', nextUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <PresentationHero
          content={content}
          language={language}
          onLanguageChange={handleLanguageChange}
          onPrimaryClick={() => navigate('/NovaReserva')}
          onSecondaryClick={() => navigate(otherRoute)}
          pdfButton={<PresentationPdfButton content={content} />}
        />
        <PresentationStats stats={content.stats} />
        <PresentationPillars title={content.pillarsTitle} pillars={content.pillars} />
        <PresentationJourney title={content.journeyTitle} items={content.journey} />
        <PresentationDifferentiators title={content.differentiatorsTitle} items={content.differentiators} />
        <Card className="border-0 shadow-xl">
          <CardContent className="flex flex-col gap-5 p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <h3 className="text-3xl font-bold text-slate-900">{content.cta.title}</h3>
              <p className="mt-3 text-base leading-8 text-slate-600">{content.cta.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('/NovaReserva')} className="bg-blue-600 hover:bg-blue-700">{content.cta.primaryLabel}</Button>
              <Button onClick={() => navigate(otherRoute)} variant="outline">{content.cta.secondaryLabel}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}