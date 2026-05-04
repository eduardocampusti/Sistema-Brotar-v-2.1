import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, School, BookOpen } from 'lucide-react';

interface Serie {
  id: string;
  nome: string;
  etapa: 'infantil' | 'fundamental_1' | 'fundamental_2' | 'medio';
  turma: string;
  alunos: number;
}

const seriesMock: Serie[] = [
  { id: '1', nome: '1º Ano A', etapa: 'fundamental_1', turma: 'Manhã', alunos: 25 },
  { id: '2', nome: '2º Ano B', etapa: 'fundamental_1', turma: 'Tarde', alunos: 22 },
  { id: '3', nome: '9º Ano C', etapa: 'fundamental_2', turma: 'Manhã', alunos: 30 },
  { id: '4', nome: 'Maternal I', etapa: 'infantil', turma: 'Integral', alunos: 15 },
  { id: '5', nome: '3º Ano EM', etapa: 'medio', turma: 'Manhã', alunos: 28 },
  { id: '6', nome: '5º Ano A', etapa: 'fundamental_1', turma: 'Manhã', alunos: 24 },
];

const getEtapaStyles = (etapa: Serie['etapa']) => {
  switch (etapa) {
    case 'infantil': return 'border-pink-400 text-pink-600 bg-pink-50';
    case 'fundamental_1': return 'border-emerald-400 text-emerald-600 bg-emerald-50';
    case 'fundamental_2': return 'border-blue-400 text-blue-600 bg-blue-50';
    case 'medio': return 'border-amber-400 text-amber-600 bg-amber-50';
    default: return 'border-slate-400 text-slate-600 bg-slate-50';
  }
};

const getEtapaColor = (etapa: Serie['etapa']) => {
  switch (etapa) {
    case 'infantil': return 'border-pink-400';
    case 'fundamental_1': return 'border-emerald-400';
    case 'fundamental_2': return 'border-blue-400';
    case 'medio': return 'border-amber-400';
    default: return 'border-slate-400';
  }
};

const FrequenciaPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f2f4f0] p-4 md:p-8">
      {/* Header Sóbrio */}
      <header className="mb-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Lançamento de Frequência
        </h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">
          Selecione uma turma para registrar a presença dos alunos.
        </p>
      </header>

      {/* Grid Responsivo */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {seriesMock.map((serie) => (
          <button
            key={serie.id}
            onClick={() => navigate(`/frequencia/lancamento/${serie.id}`)}
            className={`group relative bg-white rounded-xl p-5 shadow-sm border-l-4 transition-all duration-300 hover:shadow-md hover:-translate-y-1 text-left flex flex-col justify-between overflow-hidden ${getEtapaColor(serie.etapa)}`}
          >
            {/* Background Accent Subtle */}
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
              <School size={48} />
            </div>

            <div className="relative z-10">
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${getEtapaStyles(serie.etapa)}`}>
                {serie.etapa.replace('_', ' ')}
              </span>
              <h3 className="text-xl font-bold text-slate-800 mt-3 group-hover:text-emerald-700 transition-colors">
                {serie.nome}
              </h3>
              <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-tight">
                Turma: {serie.turma}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4 relative z-10">
              <div className="flex items-center text-slate-500 gap-1.5">
                <Users size={14} className="text-slate-400" />
                <span className="text-xs font-semibold">{serie.alunos} Alunos</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <BookOpen size={16} />
              </div>
            </div>
          </button>
        ))}
      </main>
    </div>
  );
};

export default FrequenciaPage;
