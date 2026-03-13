import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Reusable Dashboard Grid Layout
 * @param {React.ReactNode} children - Grid items
 * @param {number} cols - Number of columns (1, 2, 3, 4)
 * @param {string} className - Additional classes
 */
export default function DashboardGrid({ 
  children, 
  cols = 4, 
  className 
}) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={cn("grid gap-6 mb-8", gridCols[cols], className)}>
      {children}
    </div>
  );
}