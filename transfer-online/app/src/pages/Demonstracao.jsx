import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, ChevronRight, Globe, ArrowRight, Clock, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DEMO_LANGUAGES, DEMO_MODALITIES, DEMO_UI, buildSteps } from '@/components/demo/demoTourContent';
import DemoTourOverlay from '@/components/demo/DemoTourOverlay';

const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68effdb75fcac474f3f66b8f/57204d3c2_logo-icone.jpg';

// Tela 1: Apenas escolha de idioma
function LanguageScreen({ lang, setLang, onContinue }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-5 overflow-hidden shadow-lg">
            <img src={LOGO_URL} alt="TransferOnline" className="w-full h-full object-cover" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">TransferOnline</h1>
          <p className="text-sm text-gray-500 mb-3">Tour Guiado / Guided Tour / Tour Guiado</p>

          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>~1 {lang === 'en' ? 'min' : 'min'}</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              <span>4 {lang === 'pt' ? 'etapas' : lang === 'en' ? 'steps' : 'pasos'}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">
              {lang === 'pt' ? 'Selecione seu idioma' : lang === 'en' ? 'Select your language' : 'Seleccione su idioma'}
            </span>
          </div>

          <div className="space-y-2 mb-6">
            {DEMO_LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  lang === l.code
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-100 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
              >
                <span className="text-2xl">{l.flag}</span>
                <span className={`font-semibold text-sm ${lang === l.code ? 'text-blue-700' : 'text-gray-700'}`}>{l.label}</span>
                {lang === l.code && (
                  <span className="ml-auto w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="w-2 h-2 bg-white rounded-full" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <Button
            onClick={onContinue}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-base rounded-xl shadow-lg gap-2"
          >
            {lang === 'pt' ? 'Continuar' : lang === 'en' ? 'Continue' : 'Continuar'}
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          TransferOnline © {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}

// Tela 2: Instrução de acesso + Escolha de modalidade
function InstructionAndModalityScreen({ lang, ui, modalities, onSelectModality, onBack, onShare }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-start p-4 pt-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md flex-shrink-0">
              <img src={LOGO_URL} alt="TransferOnline" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{ui.title}</h1>
              <p className="text-xs text-gray-500">{ui.subtitle}</p>
            </div>
          </div>

          {/* Instrução de como acessar */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 mb-5">
            <p className="text-xs font-bold text-white mb-2">{ui.howToAccessTitle}</p>
            <div className="space-y-2.5">
              {ui.howToAccessSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-200 leading-snug">{step}</p>
                </div>
              ))}
            </div>
            {/* Print real do site com destaque no botão Reserva Online */}
            <div className="mt-3 rounded-lg overflow-hidden border border-slate-600 relative">
              <img
                src="https://media.base44.com/images/public/68effdb75fcac474f3f66b8f/8a805a3d8_generated_image.png"
                alt="Website transferonline.com.br"
                className="w-full h-auto"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 to-transparent pt-6 pb-2 px-2">
                <p className="text-[10px] text-slate-300 text-center font-medium">www.transferonline.com.br</p>
              </div>
            </div>
          </div>

          {/* Escolha de modalidade */}
          <p className="text-sm font-semibold text-gray-700 mb-3">{ui.chooseModality}</p>
          <div className="space-y-2 mb-4">
            {modalities.map(m => (
              <button
                key={m.id}
                onClick={() => onSelectModality(m.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
              >
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{m.label}</p>
                  <p className="text-xs text-gray-500 truncate">{m.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              onClick={onBack}
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              ← {ui.changeLanguage}
            </button>
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              {ui.shareTitle}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Demonstracao() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialLang = urlParams.get('lang') || 'pt';

  const [lang, setLang] = useState(DEMO_LANGUAGES.find(l => l.code === initialLang) ? initialLang : 'pt');
  const [screen, setScreen] = useState('language'); // 'language' | 'instruction' | 'tour'
  const [selectedModality, setSelectedModality] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  const ui = useMemo(() => DEMO_UI[lang], [lang]);
  const modalities = useMemo(() => DEMO_MODALITIES[lang], [lang]);

  const steps = useMemo(() => {
    if (!selectedModality) return [];
    return buildSteps(lang, selectedModality);
  }, [lang, selectedModality]);

  const totalSteps = steps.length;

  const handleContinueFromLanguage = () => {
    setScreen('instruction');
  };

  const handleSelectModality = (modalityId) => {
    setSelectedModality(modalityId);
    setCurrentStep(0);
    setScreen('tour');
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep(s => s + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    } else {
      // Voltar para instrução + escolha de modalidade
      setScreen('instruction');
      setSelectedModality(null);
    }
  };

  const handleSkip = () => {
    setScreen('instruction');
    setSelectedModality(null);
    setCurrentStep(0);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/Demonstracao?lang=${lang}`;
    navigator.clipboard.writeText(url);
    toast.success(ui.shareCopied);
  };

  // Tela 1: Idioma
  if (screen === 'language') {
    return <LanguageScreen lang={lang} setLang={setLang} onContinue={handleContinueFromLanguage} />;
  }

  // Tela 3: Tour
  if (screen === 'tour' && steps.length > 0) {
    const content = { ...ui, steps };
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex flex-col">
        <DemoTourOverlay
          content={content}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={handleNext}
          onPrev={handlePrev}
          onSkip={handleSkip}
          lang={lang}
        />
      </div>
    );
  }

  // Tela 2: Instrução + Modalidade
  return (
    <InstructionAndModalityScreen
      lang={lang}
      ui={ui}
      modalities={modalities}
      onSelectModality={handleSelectModality}
      onBack={() => setScreen('language')}
      onShare={handleShare}
    />
  );
}