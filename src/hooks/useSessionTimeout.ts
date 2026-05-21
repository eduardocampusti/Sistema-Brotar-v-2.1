import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../contexts/ToastContext';

// Tempos limites em milissegundos
const TIMEOUT_CLINICAL_SECRETARY = 15 * 60 * 1000; // 15 minutos = 900.000 ms
const TIMEOUT_ADMIN = 30 * 60 * 1000; // 30 minutos = 1.800.000 ms
const WARNING_DURATION = 60 * 1000; // 60 segundos = 60.000 ms

export function useSessionTimeout(role: string | undefined, onLogout: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  
  const navigate = useNavigate();
  const { warning } = useToast();
  
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Determina o tempo limite com base na role do usuário
  const getTimeoutDuration = (userRole: string | undefined): number => {
    if (!userRole) return TIMEOUT_CLINICAL_SECRETARY;
    
    const adminRoles = ['ADMIN', 'COORDENADOR', 'EDUCATION_SECRETARY', 'SECRETARIA_EDUCACAO'];
    if (adminRoles.includes(userRole)) {
      return TIMEOUT_ADMIN;
    }
    return TIMEOUT_CLINICAL_SECRETARY;
  };

  const timeoutDuration = getTimeoutDuration(role);

  // Função simples para registrar atividade
  const handleActivity = () => {
    lastActivityRef.current = Date.now();
  };

  // Reseta o temporizador e mantém a sessão ativa ao interagir no modal
  const handleKeepSession = () => {
    setShowWarning(false);
    setCountdown(60);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    
    lastActivityRef.current = Date.now();
    scheduleTimeoutCheck();
  };

  // Efetua o logout do usuário de forma limpa por inatividade
  const handleLogoutTimeout = async () => {
    try {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      
      await supabase.auth.signOut();
      onLogout();
      warning("Sessão encerrada por inatividade", "Inatividade");
      navigate('/login');
    } catch (error) {
      console.error("Erro no logout automático:", error);
    }
  };

  // Agenda recursivamente a checagem de timeout para maximizar eficiência de CPU
  const scheduleTimeoutCheck = () => {
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    
    const timeBeforeWarning = timeoutDuration - WARNING_DURATION;
    
    timeoutTimerRef.current = setTimeout(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      
      if (timeSinceLastActivity >= timeBeforeWarning) {
        // Exibe o modal de aviso de inatividade
        setShowWarning(true);
        setCountdown(60);
        
        // Inicia a contagem regressiva visual de 60 segundos
        countdownTimerRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownTimerRef.current!);
              void handleLogoutTimeout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // Usuário teve atividade recente; reagenda para o tempo restante de inatividade
        const remaining = timeBeforeWarning - timeSinceLastActivity;
        timeoutTimerRef.current = setTimeout(scheduleTimeoutCheck, Math.max(remaining, 1000));
      }
    }, timeBeforeWarning);
  };

  useEffect(() => {
    if (!role) {
      // Garante que tudo esteja limpo quando o usuário deslogar manualmente
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setShowWarning(false);
      return;
    }

    // Registra listeners de atividade global do usuário
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    const eventOptions = { passive: true };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, eventOptions);
    });

    // Inicia a verificação de timeout inicial
    lastActivityRef.current = Date.now();
    scheduleTimeoutCheck();

    return () => {
      // Cleanup completo dos event listeners e temporizadores no unmount ou mudança de role
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [role, timeoutDuration]);

  // Se o modal de aviso não deve ser exibido, retorna null
  if (!showWarning) return null;

  return React.createElement(
    'div',
    { className: 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn' },
    React.createElement(
      'div',
      { className: 'bg-[#8B1A3A] text-white p-8 rounded-2xl max-w-md w-full mx-4 shadow-2xl border border-white/10 flex flex-col items-center text-center animate-scaleIn' },
      React.createElement(
        'div',
        { className: 'w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 animate-pulse text-white' },
        React.createElement(
          'svg',
          { className: 'w-8 h-8', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' })
        )
      ),
      React.createElement('h3', { className: 'text-xl font-bold mb-2' }, 'Sessão Expirando'),
      React.createElement(
        'p',
        { className: 'text-white/80 text-sm mb-6 leading-relaxed' },
        'Você está inativo há algum tempo. Sua sessão expira em ',
        React.createElement('span', { className: 'font-extrabold text-white bg-white/20 px-2 py-0.5 rounded text-lg' }, countdown),
        ' segundos por inatividade.'
      ),
      React.createElement(
        'button',
        {
          onClick: handleKeepSession,
          className: 'w-full bg-[#10B981] hover:bg-[#059669] text-white font-bold py-3.5 px-6 rounded-xl transition-all transform hover:-translate-y-0.5 active:scale-[0.98] shadow-lg shadow-emerald-900/30 cursor-pointer'
        },
        'Continuar sessão'
      )
    )
  );
}
