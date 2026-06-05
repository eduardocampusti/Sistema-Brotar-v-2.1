import React, { useState, useId } from 'react';
import { ChevronDown } from 'lucide-react';

export type BadgeVariant = 'default' | 'outline' | 'secondary' | 'success';

export type AboutDisclosureCardProps = {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: {
    text: string;
    variant?: BadgeVariant;
  };
  alwaysVisibleContent: React.ReactNode;
  expandableContent: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'support' | 'institution' | 'tech';
};

const Badge: React.FC<{ children: React.ReactNode; variant?: BadgeVariant; className?: string }> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variants = {
    default: 'bg-primary-600 text-white',
    outline: 'border border-slate-200 text-slate-600 backdrop-blur-sm bg-white/50',
    secondary: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest leading-none flex items-center justify-center gap-1.5 ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const AboutDisclosureCard: React.FC<AboutDisclosureCardProps> = ({
  title,
  subtitle,
  icon: IconComponent,
  badge,
  alwaysVisibleContent,
  expandableContent,
  defaultOpen = false,
  variant = 'support',
}) => {
  const contentId = useId();

  // Inicia aberto no desktop (>= 768px) se defaultOpen for true, mas fechado no mobile por padrão
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 ? defaultOpen : false;
    }
    return false;
  });

  // Estilizações baseadas na variante
  const variantStyles = {
    support: {
      iconBg: 'bg-blue-500/10 text-blue-600',
      borderActive: 'border-blue-200 ring-4 ring-blue-50/50 shadow-blue-900/5',
      focusRing: 'focus-visible:ring-blue-500',
      headerHover: 'hover:bg-blue-50/10',
    },
    institution: {
      iconBg: 'bg-orange-500/10 text-orange-600',
      borderActive: 'border-orange-200 ring-4 ring-orange-50/50 shadow-orange-900/5',
      focusRing: 'focus-visible:ring-orange-500',
      headerHover: 'hover:bg-orange-50/10',
    },
    tech: {
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      borderActive: 'border-emerald-200 ring-4 ring-emerald-50/50 shadow-emerald-900/5',
      focusRing: 'focus-visible:ring-emerald-500',
      headerHover: 'hover:bg-emerald-50/10',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={`bg-white rounded-3xl shadow-xl overflow-hidden border transition-all duration-500 flex flex-col ${
        isOpen
          ? `${style.borderActive} scale-[1.01] shadow-2xl`
          : 'border-slate-100 hover:border-slate-300 hover:shadow-premium hover:-translate-y-1.5'
      }`}
    >
      {/* Botão de Controle Principal (Cabeçalho Interativo) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={`w-full text-left transition-colors flex items-center justify-between p-5 md:px-8 border-b border-slate-100 focus-visible:outline-none focus-visible:ring-2 ${style.focusRing} focus-visible:ring-offset-2 ${style.headerHover}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${style.iconBg} transition-transform duration-300`}>
            <IconComponent size={18} />
          </div>
          <div className="flex flex-col">
            <h3 className="font-extrabold text-slate-800 tracking-tight">{title}</h3>
            {subtitle && <span className="text-xs text-slate-400 mt-0.5">{subtitle}</span>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform duration-300 flex-shrink-0 ${
              isOpen ? 'transform rotate-180 text-slate-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Área Sempre Visível */}
      <div className="p-5 md:px-8 flex-1 flex flex-col">
        {alwaysVisibleContent}
      </div>

      {/* Conteúdo Expansível com Animação CSS Grid-Rows */}
      <div
        id={contentId}
        className={`grid transition-all duration-500 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100 border-t border-slate-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-5 md:px-8 bg-slate-50/30">
            {expandableContent}
          </div>
        </div>
      </div>
    </div>
  );
};
