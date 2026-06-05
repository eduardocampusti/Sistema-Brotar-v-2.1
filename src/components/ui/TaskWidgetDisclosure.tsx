import React, { useState } from 'react';
import { ChevronDown, CheckCircle, Clock, AlertTriangle, HelpCircle, Rocket } from 'lucide-react';

export type TaskStatus = "completed" | "in-progress" | "pending" | "warning";

export type TaskItem = {
  id: string;
  label: string;
  description?: string;
  status: TaskStatus;
};

export type TaskWidgetDisclosureProps = {
  version: string;
  title: string;
  date: string;
  category?: string;
  current?: boolean;
  defaultOpen?: boolean;
  summary?: string;
  tasks: TaskItem[];
};

export const TaskWidgetDisclosure: React.FC<TaskWidgetDisclosureProps> = ({
  version,
  title,
  date,
  category,
  current = false,
  defaultOpen = false,
  summary,
  tasks = []
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return (
          <div className="flex-shrink-0 p-1 rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle size={16} className="stroke-[2.5]" />
          </div>
        );
      case 'in-progress':
        return (
          <div className="flex-shrink-0 p-1 rounded-full bg-blue-100 text-blue-600 animate-pulse">
            <Clock size={16} className="stroke-[2.5]" />
          </div>
        );
      case 'warning':
        return (
          <div className="flex-shrink-0 p-1 rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle size={16} className="stroke-[2.5]" />
          </div>
        );
      case 'pending':
      default:
        return (
          <div className="flex-shrink-0 p-1 rounded-full bg-slate-100 text-slate-400">
            <HelpCircle size={16} className="stroke-[2.5]" />
          </div>
        );
    }
  };

  const getStatusTextClass = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return 'text-slate-700';
      case 'in-progress':
        return 'text-slate-800 font-semibold';
      case 'warning':
        return 'text-slate-800 font-semibold';
      case 'pending':
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div
      className={`rounded-[2rem] overflow-hidden transition-all duration-500 bg-white border ${
        current
          ? 'border-emerald-500 shadow-2xl shadow-emerald-900/10 ring-4 ring-emerald-100/80 scale-[1.01]'
          : 'border-slate-100 shadow-premium hover:border-slate-300'
      }`}
    >
      {/* Botão de Acionamento (Acessível) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`release-tasks-${version}`}
        className={`w-full text-left transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
          current ? 'bg-emerald-50/30' : 'bg-white hover:bg-slate-50/30'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3 md:gap-4 flex-1">
          {/* Badge de Versão */}
          <span
            className={`px-4 py-1.5 rounded-full font-black tracking-widest text-xs flex items-center gap-2 ${
              current
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {current && <Rocket size={14} className="animate-pulse-subtle" />}
            {version}
          </span>

          {/* Badge "ATUAL" */}
          {current && (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest leading-none flex items-center justify-center gap-1.5 bg-emerald-500 text-white border border-emerald-500 py-1.5 px-3">
              ATUAL
            </span>
          )}

          {/* Título do Release */}
          <h3 className={`font-black text-slate-900 tracking-tight flex-1 min-w-[200px] ${current ? 'text-lg md:text-xl' : 'text-sm md:text-base'}`}>
            {title}
          </h3>
        </div>

        {/* Data, Categoria e Seta */}
        <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <span className="text-xs text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
            <Clock size={12} /> {date}
          </span>

          {category && (
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest leading-none flex items-center justify-center gap-1.5 border ${
                category === 'Funcionalidade' || category === 'feature'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : category === 'Correção' || category === 'fix'
                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                  : category === 'Melhoria' || category === 'improvement'
                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {category === 'feature' ? 'Funcionalidade' :
               category === 'fix' ? 'Correção' :
               category === 'improvement' ? 'Melhoria' :
               category === 'security' ? 'Segurança' : category}
            </span>
          )}

          {/* Chevron Indicador com Transição de Rotação */}
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform duration-300 flex-shrink-0 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Conteúdo Expandido com Animação Smooth de Grid-Rows */}
      <div
        id={`release-tasks-${version}`}
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100 border-t border-slate-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-5 md:p-6 bg-slate-50/50 space-y-4">
            {/* Resumo */}
            {summary && (
              <p className="text-slate-600 font-medium text-sm leading-relaxed border-b border-slate-100/80 pb-3">
                {summary}
              </p>
            )}

            {/* Lista de Tarefas */}
            {tasks && tasks.length > 0 ? (
              <ul className="space-y-4">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-3 text-sm group/item">
                    {/* Indicador visual de status */}
                    <div className="mt-0.5">
                      {getStatusIcon(task.status)}
                    </div>
                    {/* Rótulo e descrição */}
                    <div className="space-y-0.5">
                      <span className={`block font-medium leading-relaxed transition-colors ${getStatusTextClass(task.status)}`}>
                        {task.label}
                      </span>
                      {task.description && (
                        <span className="block text-xs text-slate-400 font-normal leading-relaxed">
                          {task.description}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">Sem tarefas detalhadas para esta versão.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
