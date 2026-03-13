import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { ChevronRight, CheckCircle, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OnboardingTutorial({ tutorialId, steps = [], isOpen: forceOpen, onComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [targetRect, setTargetRect] = useState(null);
  // Detectar mobile simplificado (largura < 768px)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser) return;
        setUser(currentUser);

        if (forceOpen) {
          setIsOpen(true);
          setIsLoading(false);
          return;
        }

        // Verificar se já completou
        const records = await base44.entities.UserOnboarding.filter({
          user_id: currentUser.id,
          tutorial_id: tutorialId
        });

        if (records.length === 0) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Erro ao verificar onboarding:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [tutorialId, forceOpen]);

  const handleClose = async (skipped = false) => {
    setIsOpen(false);
    if (onComplete) onComplete();

    if (user) {
      try {
        // Verificar novamente para evitar duplicatas em race condition
        const records = await base44.entities.UserOnboarding.filter({
            user_id: user.id,
            tutorial_id: tutorialId
        });
        
        if (records.length === 0) {
            await base44.entities.UserOnboarding.create({
            user_id: user.id,
            tutorial_id: tutorialId,
            completed_at: new Date().toISOString(),
            skipped: skipped,
            step_reached: currentStep + 1
            });
        }
      } catch (error) {
        console.error('Erro ao salvar onboarding:', error);
      }
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose(false);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Monitorar target element
  useEffect(() => {
    if (!isOpen || steps.length === 0) return;

    // Em mobile, não usamos o sistema de highlight para evitar problemas de layout/scroll e travamentos
    if (isMobile) {
        setTargetRect(null);
        return;
    }

    const step = steps[currentStep];
    const updateTarget = () => {
        if (step.target) {
            const el = document.querySelector(step.target);
            if (el) {
                // Scroll suave até o elemento
                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                
                // Pequeno delay para garantir que o scroll terminou ou layout estabilizou
                setTimeout(() => {
                    const rect = el.getBoundingClientRect();
                    // Verificar se o elemento está visível
                    if (rect.width > 0 && rect.height > 0) {
                        setTargetRect(rect);
                    } else {
                        setTargetRect(null); // Fallback para centralizado se oculto
                    }
                }, 100);
            } else {
                setTargetRect(null);
            }
        } else {
            setTargetRect(null);
        }
    };

    updateTarget();
    
    // Listeners para atualizar posição
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);

    return () => {
        window.removeEventListener('resize', updateTarget);
        window.removeEventListener('scroll', updateTarget, true);
    };
  }, [currentStep, isOpen, steps]);

  if (isLoading || !isOpen || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Renderização do conteúdo do Card (reutilizável)
  const TutorialCardContent = () => (
    <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-[400px] w-full animate-in fade-in zoom-in-95 duration-300">
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-2 text-white/70 hover:text-white hover:bg-white/20 h-8 w-8"
                onClick={() => handleClose(true)}
            >
                <X className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                    {step.icon || <CheckCircle className="w-5 h-5 text-white" />}
                </div>
                <div>
                    <h3 className="font-bold text-lg text-white leading-tight">
                        {step.title}
                    </h3>
                    <p className="text-blue-100 text-xs">
                        Passo {currentStep + 1} de {steps.length}
                    </p>
                </div>
            </div>
        </div>

        <div className="p-5">
            <p className="text-gray-600 text-sm leading-relaxed">
                {step.content}
            </p>
        </div>

        <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
            <div className="flex gap-1">
                {steps.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'bg-blue-600 w-6' : 'bg-gray-300 w-1.5'}`}
                    />
                ))}
            </div>

            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="text-gray-500 border-gray-200 h-8 text-xs"
                >
                    <ArrowLeft className="w-3 h-3 mr-1" />
                    Anterior
                </Button>
                <Button 
                    size="sm"
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs px-4"
                >
                    {isLastStep ? 'Concluir' : 'Próximo'}
                    {!isLastStep && <ChevronRight className="w-3 h-3 ml-1" />}
                </Button>
            </div>
        </div>
    </div>
  );

  // Se tiver target, renderizar Overlay + Popover posicionado
  if (targetRect) {
    const PADDING = 8;
    // Cálculos para o Highlight
    const highlightStyle = {
        top: targetRect.top - PADDING,
        left: targetRect.left - PADDING,
        width: targetRect.width + (PADDING * 2),
        height: targetRect.height + (PADDING * 2),
    };

    // Cálculos básicos de posicionamento do card (abaixo ou acima)
    const cardIsAbove = targetRect.top > window.innerHeight / 2;
    const cardStyle = {
        position: 'fixed',
        left: Math.max(16, Math.min(window.innerWidth - 416, targetRect.left)), // Clamp horizontal
        top: cardIsAbove 
            ? targetRect.top - PADDING - 16 // Acima
            : targetRect.bottom + PADDING + 16, // Abaixo
    };
    
    // Ajuste se ficar fora da tela (no caso de above)
    if (cardIsAbove) {
        cardStyle.transform = 'translateY(-100%)';
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] isolate">
            {/* Dark Overlay com 'buraco' usando clip-path seria ideal, mas box-shadow é mais simples e robusto */}
            {/* Mascara usando divs pretos ao redor */}
            <div className="fixed bg-black/70 transition-all duration-300 ease-out" style={{ top: 0, left: 0, right: 0, height: highlightStyle.top }} />
            <div className="fixed bg-black/70 transition-all duration-300 ease-out" style={{ top: highlightStyle.top, left: 0, width: highlightStyle.left, height: highlightStyle.height }} />
            <div className="fixed bg-black/70 transition-all duration-300 ease-out" style={{ top: highlightStyle.top, right: 0, left: highlightStyle.left + highlightStyle.width, height: highlightStyle.height }} />
            <div className="fixed bg-black/70 transition-all duration-300 ease-out" style={{ top: highlightStyle.top + highlightStyle.height, left: 0, right: 0, bottom: 0 }} />

            {/* Borda brilhante/pulsante ao redor do elemento */}
            <div 
                className="fixed border-2 border-white rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] pointer-events-none transition-all duration-300 ease-out ring-4 ring-blue-500/50 animate-pulse"
                style={{
                    top: highlightStyle.top,
                    left: highlightStyle.left,
                    width: highlightStyle.width,
                    height: highlightStyle.height,
                    // O shadow gigante faz o backdrop escuro, removendo a necessidade dos divs acima, mas mantive os divs para garantir overlay em navegadores antigos se shadow falhar ou for lento
                    boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5)' 
                }}
            />

            {/* O Card do Tutorial */}
            <div style={cardStyle} className="transition-all duration-300 ease-out z-50">
                <TutorialCardContent />
            </div>
        </div>,
        document.body
    );
  }

  // Fallback: Dialog Centralizado Padrão (se não houver target)
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose(true)}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0 border-0 shadow-2xl">
        <TutorialCardContent />
      </DialogContent>
    </Dialog>
  );
}