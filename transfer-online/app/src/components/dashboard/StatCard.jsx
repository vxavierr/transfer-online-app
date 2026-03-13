import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Reusable Statistic Card Component
 * @param {string} title - The title of the statistic
 * @param {string|number} value - The main value to display
 * @param {React.ElementType} icon - Lucide icon component
 * @param {string} description - Optional description or trend text
 * @param {string} variant - 'default', 'blue', 'green', 'red', 'yellow', 'purple', 'orange'
 * @param {string} className - Additional classes
 * @param {function} onClick - Optional click handler
 */
export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  variant = 'default',
  className,
  onClick
}) {
  const variants = {
    default: 'bg-white text-gray-900 border-gray-200',
    blue: 'bg-blue-600 text-white border-blue-700',
    green: 'bg-green-600 text-white border-green-700',
    red: 'bg-red-600 text-white border-red-700',
    yellow: 'bg-yellow-500 text-white border-yellow-600',
    purple: 'bg-purple-600 text-white border-purple-700',
    orange: 'bg-orange-600 text-white border-orange-700',
    white: 'bg-white text-gray-900 border-gray-200 shadow-sm'
  };

  const iconVariants = {
    default: 'text-gray-500',
    blue: 'text-blue-100',
    green: 'text-green-100',
    red: 'text-red-100',
    yellow: 'text-yellow-100',
    purple: 'text-purple-100',
    orange: 'text-orange-100',
    white: 'text-blue-600 bg-blue-100 p-2 rounded-lg' // Special case for white cards with colored icons
  };

  const selectedVariant = variants[variant] || variants.default;
  const selectedIconVariant = iconVariants[variant] || iconVariants.default;

  return (
    <Card 
      className={cn(
        "transition-all duration-200", 
        selectedVariant,
        onClick && "cursor-pointer hover:opacity-90 hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className={cn("text-sm font-medium mb-1", variant === 'white' ? "text-gray-500" : "opacity-90")}>
            {title}
          </p>
          <h3 className="text-2xl font-bold">{value}</h3>
          {description && (
            <p className={cn("text-xs mt-1", variant === 'white' ? "text-gray-400" : "opacity-75")}>
              {description}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("flex-shrink-0", selectedIconVariant)}>
            <Icon className={cn("w-8 h-8", variant === 'white' && "w-6 h-6")} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}