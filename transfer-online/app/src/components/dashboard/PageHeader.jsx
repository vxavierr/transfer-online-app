import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Reusable Page Header Component
 * @param {string} title - Main page title
 * @param {string} subtitle - Optional subtitle
 * @param {React.ReactNode} actions - Optional actions (buttons)
 * @param {string} className - Additional classes
 */
export default function PageHeader({ 
  title, 
  subtitle, 
  actions, 
  className 
}) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8", className)}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}