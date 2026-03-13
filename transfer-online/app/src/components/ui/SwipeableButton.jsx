import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

export default function SwipeableButton({ 
  onConfirm, 
  label, 
  color = 'bg-blue-600', 
  icon: Icon, 
  disabled = false, 
  isLoading = false,
  subLabel = ''
}) {
  const [dragWidth, setDragWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const containerRef = useRef(null);
  const sliderRef = useRef(null);
  const startX = useRef(0);

  // Reset state when disabled changes or loading finishes
  useEffect(() => {
    if (!isLoading && !disabled && isConfirmed) {
        // Optional: reset after action completes if needed, but usually we transition to next state
        // For now, we keep it simple
    }
    if (disabled) {
        setDragWidth(0);
        setIsConfirmed(false);
    }
  }, [isLoading, disabled]);

  const handleStart = (clientX) => {
    if (disabled || isLoading || isConfirmed) return;
    setIsDragging(true);
    startX.current = clientX;
  };

  const handleMove = (clientX) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const sliderWidth = sliderRef.current.offsetWidth;
    const maxDrag = containerWidth - sliderWidth - 8; // 8px padding total

    let newWidth = clientX - startX.current;
    
    if (newWidth < 0) newWidth = 0;
    if (newWidth > maxDrag) newWidth = maxDrag;

    setDragWidth(newWidth);
  };

  const handleEnd = () => {
    if (!isDragging || !containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const sliderWidth = sliderRef.current.offsetWidth;
    const maxDrag = containerWidth - sliderWidth - 8;
    const threshold = maxDrag * 0.9; // 90% to confirm

    if (dragWidth >= threshold) {
      setDragWidth(maxDrag);
      setIsConfirmed(true);
      onConfirm();
    } else {
      setDragWidth(0);
    }
    
    setIsDragging(false);
  };

  // Mouse events
  const onMouseDown = (e) => handleStart(e.clientX);
  const onMouseMove = (e) => handleMove(e.clientX);
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => {
      if (isDragging) handleEnd();
  };

  // Touch events
  const onTouchStart = (e) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  // Extract base color for background vs text
  // Assuming color classes like 'bg-blue-600 text-white'
  // We want the container to be a lighter shade or specific style
  // Since we can't easily parse tailwind classes in JS logic without a map, 
  // we'll use the provided color class for the slider and a generic dark/gray for track
  
  return (
    <div 
      className={`relative h-20 w-full rounded-xl overflow-hidden select-none shadow-sm transition-all ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''} bg-slate-900 border border-slate-800`}
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Background Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 pl-12">
        <div className="text-center">
          <span className="text-lg font-bold text-white block animate-pulse">
            {isConfirmed ? 'Confirmado!' : isLoading ? 'Processando...' : `Deslize para ${label}`}
          </span>
          {subLabel && (
            <span className="text-xs font-normal text-white/60 block">
              {subLabel}
            </span>
          )}
        </div>
        {!isConfirmed && !isLoading && (
            <div className="absolute right-6 text-white/40">
                <ArrowRight className="w-6 h-6" />
            </div>
        )}
      </div>

      {/* Slider Button */}
      <div 
        ref={sliderRef}
        className={`absolute top-1 bottom-1 left-1 w-20 rounded-lg flex items-center justify-center z-10 cursor-grab active:cursor-grabbing shadow-md transition-transform duration-75 ${color}`}
        style={{ transform: `translateX(${dragWidth}px)` }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {isLoading ? (
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        ) : isConfirmed ? (
          <Check className="w-8 h-8 text-white" />
        ) : Icon ? (
          <Icon className="w-8 h-8 text-white" />
        ) : (
          <ArrowRight className="w-8 h-8 text-white" />
        )}
      </div>

      {/* Progress Track (Optional visual fill behind slider) */}
      <div 
        className={`absolute top-1 bottom-1 left-1 rounded-l-lg opacity-30 pointer-events-none ${color}`}
        style={{ width: `${dragWidth + 80}px`, maxWidth: 'calc(100% - 8px)' }}
      />
    </div>
  );
}