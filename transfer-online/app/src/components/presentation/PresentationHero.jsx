import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const languages = ['pt', 'en', 'es'];

export default function PresentationHero({ content, language, onLanguageChange, onPrimaryClick, onSecondaryClick, pdfButton }) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-slate-800 p-8 text-white shadow-2xl md:p-12">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Badge className="w-fit bg-white/15 text-white hover:bg-white/15">{content.hero.eyebrow}</Badge>
        <div className="flex flex-wrap items-center gap-2">
          {languages.map((item) => (
            <Button key={item} type="button" variant={language === item ? 'secondary' : 'ghost'} size="sm" onClick={() => onLanguageChange(item)} className={language === item ? 'text-slate-900' : 'text-white hover:bg-white/10 hover:text-white'}>
              {item.toUpperCase()}
            </Button>
          ))}
          {pdfButton}
        </div>
      </div>
      <div className="max-w-4xl space-y-5">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-blue-200">{content.audience}</p>
        <h1 className="text-4xl font-bold leading-tight md:text-6xl">{content.hero.title}</h1>
        <p className="max-w-3xl text-lg leading-8 text-blue-100">{content.hero.subtitle}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={onPrimaryClick} className="bg-white text-slate-900 hover:bg-slate-100">{content.hero.primaryLabel}</Button>
          <Button onClick={onSecondaryClick} variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">{content.hero.secondaryLabel}</Button>
        </div>
      </div>
    </section>
  );
}