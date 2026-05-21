import React from 'react';

interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
  ({ className = '', orientation = 'horizontal', ...props }, ref) => (
    <hr
      ref={ref}
      className={`
        shrink-0 bg-gray-200 border-0
        ${orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px'}
        ${className}
      `}
      {...props}
    />
  )
);
Separator.displayName = 'Separator';
