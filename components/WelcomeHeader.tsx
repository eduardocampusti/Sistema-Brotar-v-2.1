import React, { useState, useEffect, useRef } from 'react';

interface WelcomeHeaderProps {
  name: string;
  subtitle?: string;
  title?: string;
  role?: string;
  specialty?: string;
  isHero?: boolean;
}

const PHRASES_BY_ROLE: Record<string, string[]> = {
  psicologia: [
    'Boa {period}, {name}! 👋',
    'Pronto para acolher hoje? 💜',
    'Cada sessão transforma vidas ✨',
  ],
  psicopedagogia: [
    'Boa {period}, {name}! 👋',
    'Aprender é uma jornada única 📚',
    'Sua dedicação faz a diferença ✨',
  ],
  fonoaudiologia: [
    'Boa {period}, {name}! 👋',
    'A comunicação abre portas 🗣️',
    'Cada voz merece ser ouvida ✨',
  ],
  'terapia ocupacional': [
    'Boa {period}, {name}! 👋',
    'Autonomia é o melhor presente 🌱',
    'Cada conquista conta ✨',
  ],
  fisioterapia: [
    'Boa {period}, {name}! 👋',
    'Movimento é vida 💪',
    'Cada passo é uma vitória ✨',
  ],
  nutrição: [
    'Boa {period}, {name}! 👋',
    'Nutrição é cuidado integral 🥗',
    'Saúde começa no prato ✨',
  ],
  'serviço social': [
    'Boa {period}, {name}! 👋',
    'Proteção é um direito de todos 🤝',
    'Sua atuação transforma famílias ✨',
  ],
  admin: [
    'Boa {period}, {name}! 👋',
    'Gestão que transforma vidas 🏛️',
    'Brotar cresce com você ✨',
  ],
  secretaria: [
    'Boa {period}, {name}! 👋',
    'Organização é a base de tudo 📋',
    'Seu trabalho move o sistema ✨',
  ],
  default: [
    'Boa {period}, {name}! 👋',
    'Bem-vindo ao Sistema Brotar ✨',
    'Educação inclusiva que transforma 💙',
  ],
};

function getPeriod(): string {
  const h = new Date().getHours();
  if (h < 12) return 'manhã';
  if (h < 18) return 'tarde';
  return 'noite';
}

function getPhrases(role?: string, specialty?: string): string[] {
  const key = (specialty || role || '').toLowerCase();
  for (const k of Object.keys(PHRASES_BY_ROLE)) {
    if (key.includes(k)) return PHRASES_BY_ROLE[k];
  }
  return PHRASES_BY_ROLE.default;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ name, subtitle, title, role, specialty, isHero }) => {
  const phrases = getPhrases(role, specialty).map(p =>
    p.replace('{name}', name.split(' ')[0]).replace('{period}', getPeriod())
  );

  const [displayed, setDisplayed] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor(v => !v), 530);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    const phrase = phrases[phraseIdx];

    const tick = () => {
      if (!deleting) {
        setDisplayed(prev => {
          const next = phrase.slice(0, prev.length + 1);
          if (next === phrase) {
            timeoutRef.current = setTimeout(() => setDeleting(true), 2200);
            return next;
          }
          timeoutRef.current = setTimeout(tick, 55);
          return next;
        });
      } else {
        setDisplayed(prev => {
          const next = prev.slice(0, -1);
          if (next === '') {
            setDeleting(false);
            setPhraseIdx(i => (i + 1) % phrases.length);
            return '';
          }
          timeoutRef.current = setTimeout(tick, 30);
          return next;
        });
      }
    };

    timeoutRef.current = setTimeout(tick, deleting ? 30 : 55);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [phraseIdx, deleting]);

  if (title) {
    return (
      <div className={`${isHero ? 'text-white' : 'mb-8'} animate-fadeIn`}>
        <h1 className={`text-3xl font-extrabold tracking-tight ${isHero ? 'text-white' : 'text-slate-800'}`}>{title}</h1>
        {subtitle && <p className={`text-xl mt-2 font-medium ${isHero ? 'text-white/80' : 'text-slate-500'}`}>{subtitle}</p>}
      </div>
    );
  }

  return (
    <div className={`${isHero ? 'text-white' : 'mb-8'} animate-fadeIn`}>
      <h1 className={`tracking-tight min-h-[44px] flex items-center ${isHero ? 'text-2xl md:text-3xl font-black text-white' : 'text-3xl font-extrabold text-slate-800'}`}>
        <span>{displayed}</span>
        <span
          style={{
            display: 'inline-block',
            width: '3px',
            height: '0.9em',
            background: 'currentColor',
            marginLeft: '2px',
            verticalAlign: 'middle',
            opacity: showCursor ? 1 : 0,
            borderRadius: '1px',
          }}
        />
      </h1>
      <p className={`font-medium ${isHero ? 'mt-1 text-[13px] text-white/80' : 'text-xl text-slate-500 mt-2'}`}>
        {subtitle || (isHero ? '' : 'O que você quer fazer hoje?')}
      </p>
    </div>
  );
};
