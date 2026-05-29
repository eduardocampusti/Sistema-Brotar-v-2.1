import React, { useEffect, useState, useCallback } from 'react';
import { User, Student } from '../types';

interface BirthdayEffectProps {
  currentUser: User;
  students?: Student[];
}

function isBirthdayToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const today = new Date();
    const birth = new Date(dateStr + 'T12:00');
    return (
      birth.getDate() === today.getDate() &&
      birth.getMonth() === today.getMonth()
    );
  } catch { return false; }
}

function launchBalloons() {
  const colors = [
    '#FF6B6B','#FFD93D','#6BCB77','#4D96FF',
    '#FF6FC8','#C77DFF','#FF9A3C','#10B981',
    '#F43F5E','#8B5CF6','#06B6D4','#84CC16',
  ];
  if (!document.getElementById('brotar-balloon-style')) {
    const style = document.createElement('style');
    style.id = 'brotar-balloon-style';
    style.textContent = `
      @keyframes brotarFloatUp {
        0%   { transform: translateY(0) scale(1); opacity:1; }
        100% { transform: translateY(-110vh) scale(0.85); opacity:0; }
      }
      @keyframes brotarSway {
        0%,100% { margin-left:0; }
        25%     { margin-left:22px; }
        75%     { margin-left:-22px; }
      }
      .brotar-balloon {
        position:fixed; bottom:-100px;
        border-radius:50% 50% 50% 50%/60% 60% 40% 40%;
        z-index:99998; pointer-events:none;
        animation:brotarFloatUp var(--dur) ease-in forwards;
      }
      .brotar-balloon-inner {
        width:100%; height:100%; border-radius:inherit;
        animation:brotarSway 2.5s ease-in-out infinite;
      }
      .brotar-balloon::after {
        content:''; position:absolute; bottom:-22px; left:50%;
        transform:translateX(-50%);
        width:1.5px; height:22px; background:rgba(0,0,0,0.2);
      }
    `;
    document.head.appendChild(style);
  }
  const total = 32;
  for (let i = 0; i < total; i++) {
    setTimeout(() => {
      const wrap = document.createElement('div');
      const inner = document.createElement('div');
      inner.className = 'brotar-balloon-inner';
      wrap.className = 'brotar-balloon';
      const size = 34 + Math.random() * 32;
      const dur = 4 + Math.random() * 4;
      wrap.style.cssText = `
        left:${Math.random()*92+4}%;
        width:${size}px; height:${size*1.25}px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        --dur:${dur}s;
      `;
      wrap.appendChild(inner);
      document.body.appendChild(wrap);
      setTimeout(() => wrap.remove(), (dur+1)*1000);
    }, i * 160);
  }
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador(a)',
  SPECIALIST: 'Especialista Clínico',
  SECRETARIA_SEDE: 'Secretaria — Sede',
  SECRETARIA_COCAL: 'Secretaria — Cocal',
  COORDENADOR: 'Coordenador(a)',
  EDUCATION_SECRETARY: 'Secretário(a) de Educação',
  ASSISTANT: 'Assistente',
  ESCOLA: 'Escola',
};

export const BirthdayEffect: React.FC<BirthdayEffectProps> = ({
  currentUser,
  students = [],
}) => {
  const [show, setShow] = useState(false);
  const [birthdayPerson, setBirthdayPerson] = useState<{
    name: string;
    isStudent: boolean;
    role?: string;
    specialty?: string;
    school?: string;
    age?: number;
  } | null>(null);

  const dismiss = useCallback(() => setShow(false), []);

  useEffect(() => {
    // --- Usuário logado ---
    if (isBirthdayToday(currentUser.birthDate)) {
      const roleLabel = currentUser.specialty
        ? String(currentUser.specialty)
        : ROLE_LABELS[currentUser.role] || currentUser.role;
      setBirthdayPerson({
        name: currentUser.name,
        isStudent: false,
        role: roleLabel,
      });
      setShow(true);
      launchBalloons();
      return;
    }
    // --- Alunos ---
    const aniversariante = students.find(s => isBirthdayToday(s.birthDate));
    if (aniversariante) {
      const age = aniversariante.birthDate
        ? new Date().getFullYear() - new Date(aniversariante.birthDate + 'T12:00').getFullYear()
        : undefined;
      setBirthdayPerson({
        name: aniversariante.fullName,
        isStudent: true,
        school: aniversariante.school?.schoolName || 'Escola não informada',
        age,
      });
      setShow(true);
      launchBalloons();
    }
  }, [currentUser.id]);

  // Auto-dismiss em 9s
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 9000);
    return () => clearTimeout(t);
  }, [show]);

  if (!show || !birthdayPerson) return null;

  const initials = birthdayPerson.name
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:99999,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(0,0,0,0.35)',
      backdropFilter:'blur(4px)',
      pointerEvents:'all',
    }} onClick={dismiss}>

      <style>{`
        @keyframes brotarCardIn {
          0%   { opacity:0; transform:scale(0.65) translateY(60px); }
          60%  { transform:scale(1.04) translateY(-6px); }
          100% { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes brotarFloat {
          0%,100% { transform:translateY(0px) rotate(-1deg); }
          50%     { transform:translateY(-14px) rotate(1deg); }
        }
        @keyframes brotarPulse {
          0%,100% { transform:scale(1); }
          50%     { transform:scale(1.08); }
        }
        @keyframes brotarShimmer {
          0%   { left:-100%; }
          100% { left:200%; }
        }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'linear-gradient(145deg,#6D28D9,#4338CA,#7C3AED)',
          borderRadius:'28px',
          padding:'0',
          maxWidth:'380px',
          width:'90%',
          boxShadow:'0 32px 80px rgba(91,33,182,0.55), 0 0 0 1px rgba(255,255,255,0.15)',
          overflow:'hidden',
          animation:'brotarCardIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards, brotarFloat 3.5s ease-in-out 0.6s infinite',
          cursor:'pointer',
          position:'relative',
        }}
      >
        {/* Shimmer top */}
        <div style={{
          position:'absolute', top:0, left:'-100%',
          width:'60%', height:'100%',
          background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)',
          animation:'brotarShimmer 3s ease-in-out 1s infinite',
          pointerEvents:'none',
        }} />

        {/* Topo com emojis */}
        <div style={{
          background:'rgba(255,255,255,0.1)',
          padding:'20px 24px 16px',
          textAlign:'center',
          borderBottom:'1px solid rgba(255,255,255,0.1)',
          display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
        }}>
          <span style={{ fontSize:'28px', animation:'brotarPulse 1.5s ease-in-out infinite' }}>🎈</span>
          <span style={{ fontSize:'36px', animation:'brotarPulse 1.5s ease-in-out 0.3s infinite' }}>🎂</span>
          <span style={{ fontSize:'28px', animation:'brotarPulse 1.5s ease-in-out 0.6s infinite' }}>🎈</span>
        </div>

        {/* Corpo */}
        <div style={{ padding:'24px 28px 28px', textAlign:'center', color:'white' }}>

          {/* Tag */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:'6px',
            background:'rgba(255,255,255,0.15)',
            borderRadius:'50px', padding:'4px 14px',
            fontSize:'11px', fontWeight:700,
            letterSpacing:'1.5px', textTransform:'uppercase',
            color:'rgba(255,255,255,0.9)',
            marginBottom:'16px',
          }}>
            {birthdayPerson.isStudent ? '🎓 Aluno Aniversariante' : '🌟 Aniversário do Time'}
          </div>

          {/* Avatar */}
          <div style={{
            width:'72px', height:'72px', borderRadius:'50%',
            background:'rgba(255,255,255,0.2)',
            border:'3px solid rgba(255,255,255,0.4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'26px', fontWeight:800, color:'white',
            margin:'0 auto 16px',
            boxShadow:'0 4px 20px rgba(0,0,0,0.2)',
          }}>
            {initials}
          </div>

          {/* Nome em destaque */}
          <p style={{
            fontSize:'11px', opacity:0.7, margin:'0 0 4px',
            textTransform:'uppercase', letterSpacing:'1px',
          }}>
            Feliz Aniversário
          </p>
          <h2 style={{
            fontSize:'26px', fontWeight:900, margin:'0 0 6px',
            lineHeight:1.15, letterSpacing:'-0.5px',
            textShadow:'0 2px 12px rgba(0,0,0,0.3)',
          }}>
            {birthdayPerson.name}
          </h2>

          {/* Função / Escola */}
          {!birthdayPerson.isStudent && birthdayPerson.role && (
            <div style={{
              display:'inline-block',
              background:'rgba(255,255,255,0.18)',
              borderRadius:'8px', padding:'5px 14px',
              fontSize:'13px', fontWeight:600,
              color:'rgba(255,255,255,0.95)',
              marginBottom:'16px',
            }}>
              {birthdayPerson.role}
            </div>
          )}

          {birthdayPerson.isStudent && (
            <div style={{
              display:'flex', flexDirection:'column', gap:'6px',
              margin:'0 0 16px',
            }}>
              {birthdayPerson.age && (
                <div style={{
                  display:'inline-block',
                  background:'rgba(255,255,255,0.18)',
                  borderRadius:'8px', padding:'4px 14px',
                  fontSize:'13px', fontWeight:700,
                  color:'rgba(255,255,255,0.95)',
                }}>
                  {birthdayPerson.age} anos hoje!
                </div>
              )}
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                background:'rgba(255,255,255,0.12)',
                borderRadius:'8px', padding:'6px 14px',
                fontSize:'12px', fontWeight:600,
                color:'rgba(255,255,255,0.85)',
              }}>
                <span>🏫</span>
                <span>{birthdayPerson.school}</span>
              </div>
            </div>
          )}

          {/* Mensagem */}
          <p style={{
            fontSize:'14px', opacity:0.8, lineHeight:1.6,
            margin:'0 0 20px',
          }}>
            {birthdayPerson.isStudent
              ? 'Que este dia seja repleto de alegrias! A equipe BROTAR celebra com você.'
              : 'A equipe BROTAR deseja um dia repleto de realizações e muita alegria!'}
          </p>

          {/* Emojis decorativos */}
          <div style={{
            fontSize:'20px', letterSpacing:'6px',
            marginBottom:'16px',
          }}>
            🎊 🥳 🎁 💜 🎉
          </div>

          <p style={{
            fontSize:'11px', opacity:0.4,
            margin:0,
          }}>
            Clique em qualquer lugar para fechar
          </p>
        </div>
      </div>
    </div>
  );
};
