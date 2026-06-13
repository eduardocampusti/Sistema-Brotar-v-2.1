import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../contexts/ToastContext';

const TIMEOUT_CLINICAL = 60 * 60 * 1000;
const TIMEOUT_ADMIN = 30 * 60 * 1000;
const WARNING_DURATION = 60 * 1000;

const ADMIN_ROLES = ['ADMIN', 'COORDENADOR', 'EDUCATION_SECRETARY', 'SECRETARIA_EDUCACAO'];

export function useSessionTimeout(role: string | undefined, onLogout: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const navigate = useNavigate();
  const location = useLocation();
  const { warning } = useToast();

  const lastActivityRef = useRef<number>(Date.now());
  const mainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningActiveRef = useRef(false);

  const timeoutDuration = role && ADMIN_ROLES.includes(role) ? TIMEOUT_ADMIN : TIMEOUT_CLINICAL;
  const timeBeforeWarning = timeoutDuration - WARNING_DURATION;

  const clearAllTimers = useCallback(() => {
    if (mainTimerRef.current) { clearTimeout(mainTimerRef.current); mainTimerRef.current = null; }
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
  }, []);

  const doLogout = useCallback(async () => {
    clearAllTimers();
    warningActiveRef.current = false;
    setShowWarning(false);
    try {
      await supabase.auth.signOut();
      onLogout();
      warning('Sessão encerrada por inatividade', 'Inatividade');
      navigate('/login');
    } catch (e) {
      console.error('Erro no logout automático:', e);
      navigate('/login');
    }
  }, [clearAllTimers, navigate, onLogout, warning]);

  const startCountdown = useCallback(() => {
    warningActiveRef.current = true;
    setShowWarning(true);
    setCountdown(60);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          void doLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [doLogout]);

  const scheduleCheck = useCallback(() => {
    if (mainTimerRef.current) clearTimeout(mainTimerRef.current);
    mainTimerRef.current = setTimeout(() => {
      if (warningActiveRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= timeBeforeWarning) {
        startCountdown();
      } else {
        const remaining = timeBeforeWarning - elapsed;
        mainTimerRef.current = setTimeout(scheduleCheck, Math.max(remaining, 1000));
      }
    }, timeBeforeWarning);
  }, [timeBeforeWarning, startCountdown]);

  const handleActivity = useCallback(() => {
    if (warningActiveRef.current) return;
    lastActivityRef.current = Date.now();
  }, []);

  const handleKeepSession = useCallback(() => {
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    warningActiveRef.current = false;
    setShowWarning(false);
    setCountdown(60);
    lastActivityRef.current = Date.now();
    scheduleCheck();
  }, [scheduleCheck]);

  useEffect(() => {
    if (!role) {
      clearAllTimers();
      warningActiveRef.current = false;
      setShowWarning(false);
      return;
    }

    lastActivityRef.current = Date.now();
    warningActiveRef.current = false;

    const events = ['mousemove', 'mousedown', 'keydown', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));

    scheduleCheck();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      clearAllTimers();
    };
  }, [role]);

  // Reseta o timer ao navegar entre rotas
  useEffect(() => {
    if (!role) return;
    lastActivityRef.current = Date.now();
    if (warningActiveRef.current) {
      if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
      warningActiveRef.current = false;
      setShowWarning(false);
      setCountdown(60);
    }
    scheduleCheck();
  }, [location.pathname]);

  if (!showWarning) return null;

  return React.createElement(
    'div',
    {
      style: {
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.65)'
      }
    },
    React.createElement(
      'div',
      {
        style: {
          backgroundColor: '#8B1A3A', color: 'white',
          padding: '2rem', borderRadius: '16px',
          maxWidth: '420px', width: '100%', margin: '0 1rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      },
      React.createElement(
        'div',
        {
          style: {
            width: '64px', height: '64px', borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.5rem'
          }
        },
        React.createElement(
          'svg',
          { width: 32, height: 32, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
          React.createElement('path', {
            strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2,
            d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
          })
        )
      ),
      React.createElement('h3', { style: { fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' } }, 'Sessão Expirando'),
      React.createElement(
        'p',
        { style: { fontSize: '0.875rem', opacity: 0.8, marginBottom: '1.5rem', lineHeight: 1.6 } },
        'Sua sessão expira em ',
        React.createElement(
          'span',
          {
            style: {
              fontWeight: 800, fontSize: '1.1rem',
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '2px 10px', borderRadius: '6px'
            }
          },
          countdown
        ),
        ' segundos por inatividade.'
      ),
      React.createElement(
        'button',
        {
          onClick: handleKeepSession,
          style: {
            width: '100%', backgroundColor: '#10B981',
            color: 'white', fontWeight: 700,
            padding: '0.875rem 1.5rem', borderRadius: '10px',
            border: 'none', cursor: 'pointer', fontSize: '1rem'
          }
        },
        'Continuar sessão'
      )
    )
  );
}
