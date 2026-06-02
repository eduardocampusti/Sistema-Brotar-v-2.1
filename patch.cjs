const fs = require('fs');
const file = 'components/AppointmentForm.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /^\s*return \(\r?\n\s*<div className="appointment-stitch-shell/m;
const match = content.match(regex);
if (!match) {
    console.error('Return não encontrado');
    process.exit(1);
}

const startIdx = match.index;

const newReturn = `    return (
        <div className="appointment-stitch-shell flex min-h-0 w-full flex-col overflow-x-hidden bg-background font-body text-on-background transition-colors duration-300 md:max-h-[calc(100dvh-5.5rem)] md:overflow-y-hidden">
            <main className="flex w-full flex-1 justify-center overflow-y-auto px-3 pb-10 pt-3 sm:px-4 sm:pb-12 md:pb-14 md:pt-4">
                <div className="mx-auto w-full max-w-6xl rounded-2xl bg-[#F9FAFB] px-4 py-6 shadow-sm ring-1 ring-slate-200/60 sm:px-6 sm:py-8 md:px-8 md:py-10">
                    <div className="grid w-full grid-cols-1 gap-y-6 md:gap-y-8">
                        <header className="grid grid-cols-[auto_1fr] items-center gap-4 sm:gap-6">
                            <button type="button" onClick={onCancel} className="group w-fit rounded-full bg-surface-container-low p-3 text-on-surface-variant transition-all duration-300 hover:bg-surface-container-high hover:text-primary" aria-label="Voltar">
                                <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
                            </button>
                            <div className="flex flex-wrap items-center justify-self-end gap-3">
                                <label className="sr-only" htmlFor="stitch-unit-select">Unidade</label>
                                <span className="hidden text-sm font-semibold text-on-surface-variant sm:inline">Unidade</span>
                                <select id="stitch-unit-select" value={newApt.unit} onChange={(e) => setNewApt({ ...newApt, unit: e.target.value as Unit })} className="rounded-full border-0 bg-surface-container-low px-4 py-2.5 text-sm font-semibold text-on-surface ring-1 ring-outline/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary">
                                    <option value="SEDE">SEDE</option>
                                    <option value="COCAL">COCAL (distrito)</option>
                                </select>
                            </div>
                        </header>

                        <section className="grid grid-cols-1 gap-2.5 md:gap-3">
                            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-background md:text-5xl">Agendar Atendimento</h1>
                            <p className="max-w-2xl text-lg text-on-surface-variant">Escolha o profissional e o melhor horário para você começar sua jornada de bem-estar.</p>
                        </section>

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 items-start">
                            {/* COLUNA ESQUERDA */}
                            <div className="grid grid-cols-1 gap-6">
                                <section className="grid min-w-0 grid-cols-1 gap-6">
                                    <h2 className="font-headline text-2xl font-bold text-on-background">Contexto do Paciente</h2>
                                    <div className="grid min-w-0 max-w-3xl grid-cols-1 gap-3">
                                        <div className="grid grid-cols-1 gap-1.5">
                                            <label htmlFor="agenda-unidade-escolar" className="px-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Unidade escolar</label>
                                            <div ref={schoolComboRef} className="relative">
                                                <input id="agenda-unidade-escolar" type="text" role="combobox" aria-expanded={schoolAutocompleteOpen} aria-controls="agenda-school-results" aria-autocomplete="list" autoComplete="off" value={searchQuery} onChange={(e) => onSchoolSearchInputChange(e.target.value)} onFocus={() => { if (!(currentUser.role === 'ESCOLA' && currentUser.schoolId)) { setSchoolAutocompleteOpen(true); } }} disabled={currentUser.role === 'ESCOLA' && !!currentUser.schoolId} placeholder={currentUser.role === 'ESCOLA' && currentUser.schoolId ? 'Sua unidade escolar' : 'Digite para buscar a unidade escolar…'} className="w-full rounded-full border-2 border-primary/35 bg-white py-3.5 pl-5 pr-12 text-sm font-semibold text-on-surface shadow-sm transition-[border-color,box-shadow] placeholder:font-normal placeholder:text-outline-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:border-primary/15 disabled:bg-surface-container-low disabled:text-on-surface-variant" />
                                                <span className="pointer-events-none absolute right-3.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-primary/70" aria-hidden>
                                                    {isLoadingSchools && !(currentUser.role === 'ESCOLA' && currentUser.schoolId) && searchQuery.trim().length > 0 ? (
                                                        <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary" aria-label="Buscando escolas" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[22px] leading-none">expand_more</span>
                                                    )}
                                                </span>
                                                {schoolAutocompleteOpen && !(currentUser.role === 'ESCOLA' && currentUser.schoolId) && searchQuery.trim().length > 0 ? (
                                                    <ul id="agenda-school-results" role="listbox" className="absolute z-[80] mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-100/90 bg-white py-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/60">
                                                        {isLoadingSchools ? (
                                                            <li className="px-4 py-3 text-center text-xs text-on-surface-variant/75" role="status">Buscando…</li>
                                                        ) : schoolResults.length === 0 ? (
                                                            <li className="px-4 py-3.5 text-sm text-on-surface-variant">Nenhuma escola encontrada.</li>
                                                        ) : (
                                                            schoolResults.map((sch) => (
                                                                <li key={sch.id} role="none">
                                                                    <button type="button" role="option" className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-primary/5" onMouseDown={(e) => e.preventDefault()} onClick={() => pickSchoolFromAutocomplete(sch)}>
                                                                        <span className="font-semibold text-on-background">{sch.name}</span>
                                                                        {sch.district ? <span className="text-xs text-on-surface-variant">{sch.district}</span> : null}
                                                                    </button>
                                                                </li>
                                                            ))
                                                        )}
                                                    </ul>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="relative w-full">
                                            <span className={\`material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 \${selectedSchoolId ? 'text-on-surface-variant' : 'text-outline-variant'}\`}>search</span>
                                            <input id="agenda-busca-aluno" type="text" placeholder={selectedSchoolId ? 'Buscar por nome, série ou bairro' : 'Selecione uma escola para buscar'} value={searchName} onChange={(e) => setSearchName(e.target.value)} disabled={!selectedSchoolId} aria-disabled={!selectedSchoolId} className="w-full rounded-full border-none bg-white py-4 pl-12 pr-6 text-on-surface shadow-sm ring-1 ring-slate-200/80 transition-all placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-surface-container-low/80 disabled:text-on-surface-variant/80" />
                                        </div>
                                    </div>
                                    <div className="flex min-w-0 flex-col gap-4">
                                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'}}>
                                            <h3 className="font-headline text-lg font-semibold text-on-background">Alunos Pacientes</h3>
                                            {selectedSchoolId && studentsBySchool.length > 0 && <span style={{fontSize:'12px',color:'#6b7280'}}>{studentCardsList.length} aluno(s)</span>}
                                        </div>
                                        <div role="list" aria-label="Lista de alunos pacientes" style={{border:'1px solid #e5e7eb',borderRadius:'16px',overflow:'hidden',background:'#fff'}}>
                                            {!selectedSchoolId ? (
                                                <p style={{padding:'32px 16px',textAlign:'center',fontSize:'14px',color:'#6b7280'}}>Selecione uma unidade escolar para ver os alunos.</p>
                                            ) : loadingStudents || loadingSchoolStudents ? (
                                                <p style={{padding:'16px',textAlign:'center',fontSize:'14px',color:'#6b7280'}}>Carregando alunos…</p>
                                            ) : studentCardsList.length === 0 ? (
                                                <p style={{padding:'24px 16px',textAlign:'center',fontSize:'14px',color:'#6b7280'}}>{studentsBySchool.length === 0 ? 'Nenhum aluno matriculado nesta unidade escolar.' : searchName.trim() ? 'Nenhum aluno corresponde à busca.' : 'Nenhum aluno encontrado.'}</p>
                                            ) : (
                                                <div style={{maxHeight:'260px',overflowY:'auto'}}>
                                                    {studentCardsList.map((s) => {
                                                        const selected = newApt.studentId === s.id;
                                                        const diag = (s.clinical?.diagnosis || (s.clinical?.specialNeeds && s.clinical.specialNeeds[0]) || '').substring(0, 25);
                                                        const grade = s.school?.grade || '';
                                                        const sub = [diag, grade].filter(Boolean).join(' · ') || s.school?.schoolName || '';
                                                        const initials = s.fullName.split(' ').filter(Boolean).slice(0,2).map((n) => n[0].toUpperCase()).join('');
                                                        return (
                                                            <button
                                                                key={s.id}
                                                                type="button"
                                                                role="listitem"
                                                                aria-pressed={selected}
                                                                onClick={() => setNewApt({...newApt, studentId: s.id, studentName: s.fullName})}
                                                                style={{width:'100%',display:'flex',alignItems:'center',gap:'12px',padding:'10px 16px',textAlign:'left',background: selected ? '#f0fdf4' : '#fff',borderLeft: selected ? '3px solid #16a34a' : '3px solid transparent',borderBottom:'1px solid #f3f4f6',cursor:'pointer',transition:'background 0.1s'}}
                                                                onMouseEnter={e => { if (!selected) (e.currentTarget).style.background = '#f9fafb'; }}
                                                                onMouseLeave={e => { if (!selected) (e.currentTarget).style.background = '#fff'; }}
                                                            >
                                                                {s.photoUrl ? <img src={s.photoUrl} alt="" style={{width:'34px',height:'34px',borderRadius:'50%',objectFit:'cover',flexShrink:0}} /> : (
                                                                    <div style={{width:'34px',height:'34px',borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background: selected ? '#16a34a' : '#dcfce7',color: selected ? '#fff' : '#15803d',fontSize:'12px',fontWeight:'600'}}>{initials}</div>
                                                                )}
                                                                <div style={{flex:1,minWidth:0}}>
                                                                    <p style={{fontSize:'13px',fontWeight:'500',color: selected ? '#15803d' : '#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',margin:0}}>{s.fullName}</p>
                                                                    <p style={{fontSize:'11px',color:'#9ca3af',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:'2px',marginBottom:0}}>{sub || '—'}</p>
                                                                </div>
                                                                {selected && <span className="material-symbols-outlined" style={{fontSize:'18px',color:'#16a34a',flexShrink:0}}>check_circle</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {studentCardsList.length > 0 && (
                                                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px',background:'#f9fafb',borderTop:'1px solid #f3f4f6'}}>
                                                    <span style={{fontSize:'11px',color:'#9ca3af'}}>Role para ver todos os {studentCardsList.length}</span>
                                                    {newApt.studentId && <span style={{fontSize:'11px',color:'#16a34a',fontWeight:'600'}}>1 selecionado ✓</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                <section className="grid min-w-0 grid-cols-1 gap-6">
                                    <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_auto] sm:gap-4">
                                        <h2 className="font-headline text-2xl font-bold text-on-background">Especialidades</h2>
                                        <button type="button" onClick={() => setShowAllSpecialties((v) => !v)} className="w-fit font-semibold text-primary underline-offset-4 transition-colors duration-300 hover:underline sm:justify-self-end">{showAllSpecialties ? 'Mostrar menos' : 'Ver todas'}</button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6 lg:grid-cols-7">
                                        {loadingProfissionaisCache ? (
                                            <>
                                                {[1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="flex h-[92px] animate-pulse flex-col items-center justify-center gap-2 rounded-xl bg-surface-container-low px-2 py-2.5 sm:h-[100px]" />)}
                                            </>
                                        ) : (
                                            especialidadesVisiveis.map(({ specialty, count }) => {
                                                const stitch = SPECIALTY_STITCH[specialty];
                                                const semProfissionais = count === 0;
                                                const selected = newApt.specialty === specialty;
                                                return (
                                                    <button
                                                        key={specialty}
                                                        type="button"
                                                        disabled={semProfissionais}
                                                        onClick={() => { if (!semProfissionais) selectSpecialty(specialty); }}
                                                        className={\`flex min-h-0 w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-center transition-all duration-300 sm:gap-2 sm:px-2 sm:py-3 \${semProfissionais ? \`cursor-not-allowed border-transparent opacity-40 \${stitch.card}\` : selected ? \`cursor-pointer border-primary/30 bg-primary-container \${stitch.borderHover}\` : \`cursor-pointer border-transparent \${stitch.card} \${stitch.borderHover}\`}\`}
                                                    >
                                                        <div className={\`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 \${stitch.iconWrap}\`}>
                                                            <span className="material-symbols-outlined text-[20px] sm:text-[22px]">{stitch.symbol}</span>
                                                        </div>
                                                        <span className="line-clamp-2 w-full px-0.5 text-[10px] font-semibold leading-tight text-on-surface sm:text-[11px]">{specialty}</span>
                                                        <span className="sr-only">{count} {count === 1 ? 'profissional' : 'profissionais'}</span>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </section>

                                <section className="grid min-w-0 grid-cols-1 gap-4">
                                    <h2 className="font-headline text-2xl font-bold text-on-background">Profissionais Disponíveis</h2>
                                    {!newApt.specialty ? (
                                        <p className="text-on-surface-variant">Selecione uma especialidade para listar os profissionais.</p>
                                    ) : loadingProfissionaisCache ? (
                                        <div className="flex gap-3">
                                            {[1, 2, 3].map((i) => <div key={i} className="h-12 w-36 shrink-0 animate-pulse rounded-full bg-surface-container-low" />)}
                                        </div>
                                    ) : filteredProfessionals.length === 0 ? (
                                        <p className="text-sm font-medium text-on-surface-variant">Nenhum profissional ativo nesta especialidade.</p>
                                    ) : (
                                        <>
                                            <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin]" role="tablist" aria-label="Selecionar profissional">
                                                {filteredProfessionals.map((p) => {
                                                    const selected = newApt.professionalId === p.id;
                                                    const ocupado = !!(newApt.startTime && newApt.endTime) && proOcupadoNoSlot(p.id);
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            role="tab"
                                                            aria-selected={selected}
                                                            disabled={ocupado}
                                                            onClick={() => { if (!ocupado) selectProfessional(p); }}
                                                            className={\`flex max-w-[220px] shrink-0 items-center gap-2.5 rounded-full border py-2 pl-2 pr-3 text-left transition-all duration-300 \${selected ? 'border-primary/40 bg-emerald-50/90 shadow-sm ring-2 ring-primary/15' : 'border-slate-200/90 bg-white shadow-sm hover:border-primary/30'} \${ocupado ? 'cursor-not-allowed opacity-45' : ''}\`}
                                                        >
                                                            {p.photoUrl ? <img src={p.photoUrl} alt="" className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white" /> : (
                                                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 ring-2 ring-white">{initialsFromName(p.name)}</div>
                                                            )}
                                                            <span className="min-w-0 truncate text-xs font-bold text-on-background sm:text-sm">{p.name}</span>
                                                            {ocupado ? <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700">Ocup.</span> : null}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {profissionalSelecionado ? (
                                                <article className="grid min-h-[4.25rem] w-full max-w-full grid-cols-[4.5rem_1fr] overflow-hidden rounded-2xl border-2 border-primary/35 bg-white shadow-md ring-1 ring-slate-100 sm:min-h-[4.5rem] sm:grid-cols-[5rem_1fr]">
                                                    <div className="relative h-full min-h-[4.25rem] bg-slate-200 sm:min-h-[4.5rem]">
                                                        {profissionalSelecionado.photoUrl ? <img src={profissionalSelecionado.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-primary text-sm font-bold text-on-primary sm:text-base">{initialsFromName(profissionalSelecionado.name)}</div>
                                                        )}
                                                    </div>
                                                    <div className="flex min-w-0 flex-col justify-center gap-0.5 p-4">
                                                        <div className="flex items-start justify-between gap-1.5">
                                                            <h3 className="font-headline min-w-0 text-sm font-bold leading-tight text-on-background sm:text-base">{profissionalSelecionado.name}</h3>
                                                            <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0">
                                                                <span className="material-symbols-outlined fill-1 text-[15px] text-amber-500 leading-none">star</span>
                                                                <span className="text-[11px] font-bold text-on-background sm:text-xs">5.0</span>
                                                            </div>
                                                        </div>
                                                        <p className="line-clamp-1 text-[11px] font-semibold leading-tight text-primary sm:text-xs">{[profissionalSelecionado.specialty, profissionalSelecionado.jobTitle].filter(Boolean).join(' • ')}</p>
                                                        <p className="line-clamp-1 text-[11px] leading-tight text-slate-600 sm:text-xs sm:leading-snug">{profissionalSelecionado.jobTitle ? \`Perfil: \${profissionalSelecionado.jobTitle}.\` : 'Profissional da rede Brotar.'}</p>
                                                        <div className="flex flex-wrap gap-0.5 pt-0.5">
                                                            {pillsForProfessional(profissionalSelecionado).map((label, pi) => (
                                                                <span key={\`\${profissionalSelecionado.id}-\${pi}-\${label}\`} className="rounded-full bg-slate-100 px-1.5 py-px text-[9px] font-semibold leading-tight text-slate-700 sm:text-[10px]">{label}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </article>
                                            ) : (
                                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center text-sm text-slate-500">Toque em um profissional na lista acima para ver a ficha e os horários.</div>
                                            )}
                                        </>
                                    )}
                                </section>
                            </div>

                            {/* COLUNA DIREITA */}
                            <div className="lg:sticky lg:top-4 grid grid-cols-1 gap-6">
                                <div className="grid grid-cols-1 gap-3">
                                    <h2 className="font-headline text-lg font-bold text-on-background">Agendar para</h2>
                                    <div className="overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:p-4">
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            <button type="button" onClick={() => setWeekViewStart((w) => addDaysLocalDate(w, -7))} className="shrink-0 rounded-full p-1 text-on-surface-variant transition-colors hover:bg-slate-100"><span className="material-symbols-outlined text-xl">chevron_left</span></button>
                                            <div className="flex min-w-0 flex-1 items-center justify-between gap-0.5 sm:gap-1">
                                                {weekStripDays.map((d) => {
                                                    const ymd = formatLocalYYYYMMDD(d);
                                                    const dayNum = d.getDate();
                                                    const isSelected = newApt.date === ymd;
                                                    const todayStr = formatLocalYYYYMMDD(now);
                                                    const isToday = todayStr === ymd;
                                                    const dayStart = d.getTime();
                                                    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                                                    const isPastDay = dayStart < startToday;
                                                    const hasMark = monthApptDates.has(ymd);
                                                    if (isPastDay) return <span key={ymd} className="flex h-10 w-8 shrink-0 items-center justify-center text-sm tabular-nums text-slate-300 sm:h-11 sm:w-9" aria-hidden>{dayNum}</span>;
                                                    return (
                                                        <button key={ymd} type="button" onClick={() => setNewApt((prev) => ({ ...prev, date: ymd }))} className={\`relative flex h-10 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-all duration-200 sm:h-11 sm:w-9 sm:text-base \${isSelected ? 'bg-primary font-bold text-on-primary shadow-sm' : 'text-on-surface hover:bg-primary-container/40'} \${isToday && !isSelected ? 'bg-primary-container/30 font-semibold text-on-primary-container' : ''}\`}>
                                                            {dayNum}
                                                            {hasMark && !isSelected ? <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" /> : null}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button type="button" onClick={() => setWeekViewStart((w) => addDaysLocalDate(w, 7))} className="shrink-0 rounded-full p-1 text-on-surface-variant transition-colors hover:bg-slate-100"><span className="material-symbols-outlined text-xl">chevron_right</span></button>
                                        </div>
                                    </div>
                                </div>

                                <div className={\`grid grid-cols-1 gap-3 transition-opacity duration-300 \${!newApt.professionalId ? 'opacity-40' : ''}\`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="font-headline text-lg font-bold text-on-background">Horários Disponíveis</h3>
                                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">Duração: {duration}m</span>
                                    </div>
                                    {!newApt.professionalId && <p className="text-center text-xs text-on-surface-variant">Selecione um profissional na lista</p>}
                                    <div className="grid grid-cols-3 gap-3" style={!newApt.professionalId ? { pointerEvents: 'none' } : {}}>
                                        {SUGGESTED_START_TIMES.map((time) => {
                                            const nextEnd = addMinutesToClock(time, duration);
                                            const past = !!newApt.date && isDateToday && combineLocalDateAndTime(newApt.date, time) <= now;
                                            const ocupado = profApptsDay !== null && !!newApt.professionalId && SupabaseService.filtrarAgendamentosSobrepostosJanela(profApptsDay, time, nextEnd, initialData?.id).length > 0;
                                            const disabled = past || ocupado;
                                            const selected = newApt.startTime === time;
                                            return (
                                                <button key={time} type="button" disabled={disabled} onClick={() => { if (!disabled) setNewApt({ ...newApt, startTime: time, endTime: nextEnd }); }} className={\`w-full rounded-full px-3 py-2.5 text-sm font-semibold transition-all \${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-55' : selected ? 'bg-[#2D6A4F] font-bold text-white shadow-sm' : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50'}\`}>
                                                    <span className={disabled && past ? 'line-through' : ''}>{time}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" style={!newApt.professionalId ? { pointerEvents: 'none' } : {}}>
                                        <div className="space-y-1.5">
                                            <label className="px-1 text-xs font-semibold text-on-surface-variant">Início (manual)</label>
                                            <input type="time" min={minTimeHHmm} value={newApt.startTime || ''} onChange={(e) => { const s = e.target.value; if (!newApt.date) return; if (!s) { setNewApt({ ...newApt, startTime: s, endTime: undefined }); return; } const e_ = addMinutesToClock(s, duration); if (!rejeitarHorarioPassado(newApt.date, s, e_)) setNewApt({ ...newApt, startTime: s, endTime: e_ }); }} className={\`w-full rounded-full border-0 bg-white p-3 text-sm font-bold text-on-surface outline-none ring-1 ring-slate-200 transition-all duration-300 focus:ring-2 focus:ring-[#2D6A4F] \${horarioPassadoBloqueante ? 'ring-2 ring-sanctuary-error' : ''}\`} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="px-1 text-xs font-semibold text-on-surface-variant">Término (manual)</label>
                                            <input type="time" min={minTimeHHmm} value={newApt.endTime || ''} onChange={(e) => { const en = e.target.value; if (!newApt.date) return; if (!en) { setNewApt({ ...newApt, endTime: en }); return; } const st = newApt.startTime || '00:00'; if (!rejeitarHorarioPassado(newApt.date, st, en)) setNewApt({ ...newApt, endTime: en }); }} className={\`w-full rounded-full border-0 bg-white p-3 text-sm font-bold text-on-surface outline-none ring-1 ring-slate-200 transition-all duration-300 focus:ring-2 focus:ring-[#2D6A4F] \${horarioPassadoBloqueante ? 'ring-2 ring-sanctuary-error' : ''}\`} />
                                        </div>
                                    </div>
                                </div>

                                <AppointmentSummaryCard
                                    patientName={newApt.studentName}
                                    schoolName={resumoNomeEscola}
                                    specialty={newApt.specialty}
                                    professionalName={newApt.professionalName}
                                    dateYmd={newApt.date}
                                    startTime={newApt.startTime}
                                    endTime={newApt.endTime}
                                    loading={loading}
                                    confirmDisabled={confirmacaoDesabilitada}
                                    onConfirm={handleSaveAppointment}
                                />

                                <div className="grid grid-cols-1 gap-4">
                                    {(bloqueioProfissional || horarioPassadoBloqueante) && (
                                        <div className="rounded-stitch-lg bg-sanctuary-error-container/30 px-4 py-3 text-sm font-semibold text-red-950 ring-1 ring-sanctuary-error/25">Conflito de agenda do profissional ou horário já passado. Ajuste antes de confirmar.</div>
                                    )}
                                    {alunoConflitosSelecionado.length > 0 && (
                                        <div className="rounded-stitch-lg bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200/70">
                                            <p className="mb-2 font-semibold">Conflito de horário do aluno com outro profissional. Só é possível confirmar com autorização explícita.</p>
                                            {!confStudentOverride ? (
                                                <button type="button" onClick={() => setConfStudentOverride(true)} className="w-full rounded-full bg-amber-500 py-2.5 text-xs font-bold uppercase tracking-wide text-on-background transition-colors duration-300 hover:bg-amber-400">Confirmar mesmo assim</button>
                                            ) : (
                                                <p className="text-xs font-semibold text-amber-900">Confirmação registrada — o agendamento será salvo com a flag de conflito do aluno.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
`;

content = content.substring(0, startIdx) + newReturn;
fs.writeFileSync(file, content);
console.log('Done!');
