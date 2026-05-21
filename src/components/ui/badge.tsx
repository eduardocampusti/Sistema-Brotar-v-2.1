import React from 'react';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:     'bg-gray-900 text-white border-transparent',
  secondary:   'bg-gray-100 text-gray-700 border-transparent',
  destructive: 'bg-red-100 text-red-700 border-red-200',
  outline:     'bg-transparent text-gray-700 border-gray-200',
  success:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning:     'bg-amber-50 text-amber-700 border-amber-200',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={`
        inline-flex items-center rounded-full border px-2 py-0.5 
        text-[10px] font-bold uppercase tracking-wide transition-colors
        ${variantClasses[variant]} ${className}
      `}
      {...props}
    />
  )
);
Badge.displayName = 'Badge';
