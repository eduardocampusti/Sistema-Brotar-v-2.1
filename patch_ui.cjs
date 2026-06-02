const fs = require('fs');
const file = 'components/AppointmentForm.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Check and ChevronRight to lucide-react import
content = content.replace(
    "import { ArrowLeft } from 'lucide-react';",
    "import { ArrowLeft, Check, ChevronRight } from 'lucide-react';"
);

// 2. Add Progress Bar UI and Title Hierarchy
const headerSectionOld = `<section className="grid grid-cols-1 gap-2.5 md:gap-3">
                            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-background md:text-5xl">Agendar Atendimento</h1>
                            <p className="max-w-2xl text-lg text-on-surface-variant">Escolha o profissional e o melhor horário para você começar sua jornada de bem-estar.</p>
                        </section>`;

const headerSectionNew = `                        <section className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2.5">
                                <h1 className="font-headline text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                                    Agendar Atendimento
                                </h1>
                                <p className="max-w-2xl text-base text-slate-500 sm:text-lg">
                                    Siga as etapas abaixo para escolher o profissional e o melhor horário para sua consulta.
                                </p>
                            </div>

                            {/* Barra de Progresso */}
                            <div className="mt-2 hidden w-full items-center md:flex">
                                {[
                                    { step: 1, label: 'Contexto', done: !!newApt.studentId },
                                    { step: 2, label: 'Especialidade', done: !!newApt.specialty },
                                    { step: 3, label: 'Profissional', done: !!newApt.professionalId },
                                    { step: 4, label: 'Horário', done: !!(newApt.date && newApt.startTime && newApt.endTime) },
                                    { step: 5, label: 'Confirmação', done: false }
                                ].map((s, i, arr) => {
                                    const isCurrent = (i === 0 && !newApt.studentId) || 
                                                      (i === 1 && newApt.studentId && !newApt.specialty) ||
                                                      (i === 2 && newApt.specialty && !newApt.professionalId) ||
                                                      (i === 3 && newApt.professionalId && !(newApt.date && newApt.startTime && newApt.endTime)) ||
                                                      (i === 4 && newApt.date && newApt.startTime && newApt.endTime);
                                    
                                    return (
                                        <React.Fragment key={s.step}>
                                            <div className="flex items-center gap-2.5">
                                                <div className={\`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-colors duration-300 \${s.done ? 'bg-[#2D6A4F] text-white' : isCurrent ? 'ring-2 ring-[#2D6A4F] ring-offset-2 bg-emerald-50 text-[#2D6A4F]' : 'bg-slate-100 text-slate-400'}\`}>
                                                    {s.done ? <Check size={16} strokeWidth={3} /> : s.step}
                                                </div>
                                                <span className={\`text-sm font-semibold tracking-wide \${s.done || isCurrent ? 'text-slate-900' : 'text-slate-400'}\`}>{s.label}</span>
                                            </div>
                                            {i < arr.length - 1 && (
                                                <div className="mx-4 h-px flex-1 bg-slate-200" />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </section>`;
content = content.replace(headerSectionOld, headerSectionNew);

// 3. Update Section Titles
content = content.replace(
    '<h2 className="font-headline text-2xl font-bold text-on-background">1. Contexto do paciente</h2>',
    '<h2 className="font-headline flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"><span className="flex h-6 w-1 rounded-full bg-[#2D6A4F]" aria-hidden></span>Contexto do Paciente</h2>'
);
content = content.replace(
    '<h2 className="font-headline text-2xl font-bold text-on-background">Especialidades</h2>',
    '<h2 className="font-headline flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"><span className="flex h-6 w-1 rounded-full bg-[#2D6A4F]" aria-hidden></span>Especialidade</h2>'
);
content = content.replace(
    '<h2 className="font-headline text-2xl font-bold text-on-background">Profissionais Disponíveis</h2>',
    '<h2 className="font-headline flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"><span className="flex h-6 w-1 rounded-full bg-[#2D6A4F]" aria-hidden></span>Profissional</h2>'
);
content = content.replace(
    '<h2 className="font-headline text-lg font-bold text-on-background">Agendar para</h2>',
    '<h2 className="font-headline flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl"><span className="flex h-5 w-1 rounded-full bg-[#2D6A4F]" aria-hidden></span>Data do Agendamento</h2>'
);
content = content.replace(
    '<h3 className="font-headline text-lg font-bold text-on-background">Horários Disponíveis</h3>',
    '<h3 className="font-headline flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl"><span className="flex h-5 w-1 rounded-full bg-[#2D6A4F]" aria-hidden></span>Horários Disponíveis</h3>'
);

// 4. Update Specialty Cards
const oldSpecialtyBtn = `className={\`flex min-h-0 w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-center transition-all duration-300 sm:gap-2 sm:px-2 sm:py-3 \${semProfissionais ? \`cursor-not-allowed border-transparent opacity-40 \${stitch.card}\` : selected ? \`cursor-pointer border-primary/30 bg-primary-container \${stitch.borderHover}\` : \`cursor-pointer border-transparent \${stitch.card} \${stitch.borderHover}\`}\`}`;
const newSpecialtyBtn = `className={\`group flex min-h-0 w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-center transition-all duration-300 sm:gap-2 sm:px-2 sm:py-3 \${semProfissionais ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50 grayscale' : selected ? 'border-[#2D6A4F]/30 bg-emerald-50/80 shadow-md ring-1 ring-[#2D6A4F]/20' : 'cursor-pointer border-slate-200/80 bg-white shadow-sm hover:scale-[1.02] hover:border-emerald-200 hover:shadow-md'}\`}`;
content = content.replace(oldSpecialtyBtn, newSpecialtyBtn);

// 5. Update Time Slot buttons
const oldTimeBtn = `className={\`w-full rounded-full px-3 py-2.5 text-sm font-semibold transition-all \${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-55' : selected ? 'bg-[#2D6A4F] font-bold text-white shadow-sm' : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50'}\`}`;
const newTimeBtn = `className={\`w-full rounded-full px-3 py-2.5 text-sm font-semibold transition-all duration-300 \${disabled ? 'cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-400' : selected ? 'bg-[#2D6A4F] font-bold text-white shadow-md ring-2 ring-[#2D6A4F] ring-offset-1' : 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#2D6A4F]/50 hover:bg-emerald-50/50 hover:text-[#2D6A4F]'}\`}`;
content = content.replace(oldTimeBtn, newTimeBtn);

fs.writeFileSync(file, content);
console.log('UI patch applied');
