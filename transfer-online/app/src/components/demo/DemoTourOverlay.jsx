import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Share2, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DemoMockScreen from './DemoMockScreens';

export default function DemoTourOverlay({ content, currentStep, totalSteps, onNext, onPrev, onSkip, lang }) {
  const step = content.steps[currentStep];
  const isFirst = currentStep === 0;
  const canGoPrev = true; // Sempre permite voltar (step 0 volta para landing)
  const isLast = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleShare = () => {
    const url = `${window.location.origin}/Demonstracao?lang=${lang}`;
    navigator.clipboard.writeText(url);
    toast.success(content.shareCopied);
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Progress bar */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-blue-700">
            {currentStep + 1} {content.stepOf} {totalSteps}
          </span>
          <div className="flex gap-1.5">
            <button onClick={handleShare} className="text-gray-400 hover:text-blue-600 transition-colors" title={content.shareTitle}>
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={onSkip} className="text-gray-400 hover:text-red-500 transition-colors" title={content.skip}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <motion.div
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-1.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content area - scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {/* Text content */}
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1.5">{step.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>

              {step.bullets && (
                <ul className="mt-3 space-y-1.5">
                  {step.bullets.map((bullet, i) => {
                    const parts = bullet.split('**');
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        <span>
                          {parts.map((part, j) => 
                            j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {step.highlight && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 font-medium">
                  💡 {step.highlight}
                </div>
              )}
            </div>

            {/* Mock screen */}
            <div className="pointer-events-none select-none">
              <DemoMockScreen section={step.mockSection} lang={lang} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons - fixed at bottom, with extra padding to avoid WhatsApp bubble */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3 pb-20">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrev} className="gap-1 text-xs">
            <ChevronLeft className="w-4 h-4" /> {content.prev}
          </Button>
          <div className="flex-1" />
          {isLast ? (
            <Button size="sm" onClick={onSkip} className="gap-1 text-xs bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4" /> {content.finish}
            </Button>
          ) : (
            <Button size="sm" onClick={onNext} className="gap-1 text-xs bg-blue-600 hover:bg-blue-700">
              {content.next} <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}