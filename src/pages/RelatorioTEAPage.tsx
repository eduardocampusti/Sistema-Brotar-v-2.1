import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  AlertCircle, 
  Percent, 
  Search, 
  FileDown, 
  Filter,
  Puzzle,
  ChevronRight,
  TrendingUp,
  School
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  TooltipProps
} from 'recharts';
import { SupabaseService } from '../../services/SupabaseService';
import { RelatorioTEAData, User, PapelTimbradoConfig } from '../../types';
import { Loader2 } from 'lucide-react';
import { exportRelatorioTEAPDF } from '../../utils/pdfExport';

interface RelatorioTEAPageProps {
  currentUser: User;
}

export default function RelatorioTEAPage({ currentUser }: RelatorioTEAPageProps) {
  const [data, setData] = useState<RelatorioTEAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Confirmado' | 'Suspeito'>('Todos');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const reportData = await SupabaseService.getRelatorioTEA();
        setData(reportData);
      } catch (error) {
        console.error('Erro ao carregar relatório TEA:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredAlunos = useMemo(() => {
    if (!data) return [];
    return data.detalhesAlunos.filter(aluno => {
      const matchesSearch = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           aluno.escola.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'Todos' || aluno.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  const handleExport = async () => {
    if (!data) return;
    try {
      setExporting(true);
      // Busca a configuração de papel timbrado (geral ou específica se houver)
      const config = await SupabaseService.getPapelTimbradoConfig();
      
      // Filtra os dados para o PDF baseado no que está na tela
      const exportData: RelatorioTEAData = {
        ...data,
        detalhesAlunos: filteredAlunos
      };

      await exportRelatorioTEAPDF(exportData, config, {
        status: statusFilter,
        searchTerm: searchTerm
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const COLORS = {
    confirmado: '#1E40AF', // Blue-800
    suspeito: '#60A5FA',   // Blue-400
    geral: '#3B82F6',      // Blue-500
    destaque: '#F59E0B',   // Amber-500 (para faixa 0-3)
    sucesso: '#10B981',    // Emerald-500
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <Loader2 size={48} className="animate-spin mb-4 text-blue-600" />
        <p className="font-medium">Gerando relatório consolidado...</p>
      </div>
    );
  }

  if (!data) return null;

  const percTEA = ((data.resumo.totalTEA / data.resumo.totalGeralAlunos) * 100).toFixed(2);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Puzzle className="text-blue-600" size={24} />
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Painel de Monitoramento TEA</h1>
          </div>
          <p className="text-sm text-slate-500">Consolidado da rede municipal de ensino para Transtorno do Espectro Autista</p>
        </div>
        <button 
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm group"
        >
          {exporting ? (
            <Loader2 size={18} className="animate-spin text-blue-600" />
          ) : (
            <FileDown size={18} className="text-blue-600 group-hover:scale-110 transition-transform" />
          )}
          {exporting ? 'Gerando...' : 'Exportar PDF'}
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="TEA Confirmado" 
          value={data.resumo.comLaudo} 
          icon={UserCheck} 
          color="#1E40AF"
          onClick={() => setStatusFilter('Confirmado')}
          active={statusFilter === 'Confirmado'}
          description="Com laudo médico inserido"
        />
        <MetricCard 
          title="Suspeitos de TEA" 
          value={data.resumo.suspeitos} 
          icon={AlertCircle} 
          color="#60A5FA"
          onClick={() => setStatusFilter('Suspeito')}
          active={statusFilter === 'Suspeito'}
          description="Em processo de investigação"
        />
        <MetricCard 
          title="Total TEA" 
          value={data.resumo.totalTEA} 
          icon={Users} 
          color="#3B82F6"
          onClick={() => setStatusFilter('Todos')}
          active={statusFilter === 'Todos'}
          description="Consolidado (Laudo + Suspeita)"
        />
        <MetricCard 
          title="Prevalência na Rede" 
          value={`${percTEA}%`} 
          icon={Percent} 
          color="#10B981"
          description={`Sobre ${data.resumo.totalGeralAlunos} alunos totais`}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[450px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <School size={18} className="text-blue-600" />
              Distribuição por Unidade Escolar
            </h3>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Top 10 Unidades</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.porEscola.slice(0, 10)} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="escola" 
                  type="category" 
                  width={150} 
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#64748B' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: '#F8FAFC' }} content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                <Bar dataKey="confirmados" name="Confirmados" stackId="a" fill={COLORS.confirmado} radius={[0, 0, 0, 0]} barSize={20} />
                <Bar dataKey="suspeitos" name="Suspeitos" stackId="a" fill={COLORS.suspeito} radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column Charts */}
        <div className="space-y-6">
          {/* Status Distribution (Pie) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[213px] flex flex-row items-center gap-4">
            <div className="w-1/2 h-full">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Confirmados', value: data.resumo.comLaudo },
                        { name: 'Suspeitos', value: data.resumo.suspeitos }
                      ]}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill={COLORS.confirmado} />
                      <Cell fill={COLORS.suspeito} />
                    </Pie>
                    <Tooltip />
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-3">
               <h3 className="font-bold text-slate-800 text-sm mb-2">Composição de Status</h3>
               <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.confirmado }}></div>
                 <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Confirmados</p>
                    <p className="text-lg font-black text-slate-800">{data.resumo.comLaudo}</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.suspeito }}></div>
                 <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Suspeitos</p>
                    <p className="text-lg font-black text-slate-800">{data.resumo.suspeitos}</p>
                 </div>
               </div>
            </div>
          </div>

          {/* Age Ranges */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[213px] flex flex-col">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-500" />
              Faixas Etárias
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.porFaixaEtaria}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="faixa" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} />
                  <Bar dataKey="confirmados" name="Confirmados" fill={COLORS.confirmado} radius={[4, 4, 0, 0]} barSize={30}>
                    {data.porFaixaEtaria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.faixa === '0-3 anos' ? COLORS.destaque : COLORS.confirmado} />
                    ))}
                  </Bar>
                  <Bar dataKey="suspeitos" name="Suspeitos" fill={COLORS.suspeito} radius={[4, 4, 0, 0]} barSize={30}>
                    {data.porFaixaEtaria.map((entry, index) => (
                      <Cell key={`cell-s-${index}`} fill={entry.faixa === '0-3 anos' ? '#FDE68A' : COLORS.suspeito} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
               <Users size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Relação Nominal de Alunos</h3>
              <p className="text-xs text-slate-500">Visualizando {filteredAlunos.length} de {data.detalhesAlunos.length} registros</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Buscar aluno ou escola..."
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full sm:w-64 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex bg-white border border-slate-200 rounded-xl p-1">
              {(['Todos', 'Confirmado', 'Suspeito'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    statusFilter === s ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Aluno</th>
                <th className="px-6 py-4">Unidade Escolar</th>
                <th className="px-6 py-4">Unidade</th>
                <th className="px-6 py-4">Idade</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">CID</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAlunos.length > 0 ? filteredAlunos.map(aluno => (
                <tr key={aluno.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 text-sm">{aluno.nome}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <School size={14} className="opacity-40" />
                      <span className="text-xs font-medium">{aluno.escola}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                      aluno.unit === 'SEDE' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                      aluno.unit === 'COCAL' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 
                      'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      {aluno.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-500">{aluno.idade} anos</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={aluno.status} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {aluno.cid || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                     Nenhum aluno encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color, description, onClick, active }: any) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-2xl border transition-all duration-300 shadow-sm relative overflow-hidden flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-1' : ''
      } ${active ? 'ring-2 ring-blue-500 border-transparent bg-blue-50/20' : 'border-slate-200'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-xl border" style={{ backgroundColor: `${color}10`, color: color, borderColor: `${color}20` }}>
          <Icon size={20} />
        </div>
        {active && <div className="bg-blue-600 w-2 h-2 rounded-full"></div>}
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide leading-tight">{title}</h4>
        <p className="text-3xl font-black text-slate-800 mt-1 tabular-nums">{value}</p>
        {description && <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{description}</p>}
      </div>
      <div className="absolute -right-2 -bottom-2 opacity-[0.03] rotate-12" style={{ color: color }}>
        <Icon size={80} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'Confirmado' | 'Suspeito' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border ${
      status === 'Confirmado' 
        ? 'bg-blue-600 text-white border-blue-700' 
        : 'bg-blue-100 text-blue-700 border-blue-200'
    }`}>
      {status === 'Confirmado' ? <UserCheck size={10} /> : <AlertCircle size={10} />}
      {status}
    </span>
  );
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-white/10 backdrop-blur-md">
        <p className="text-xs font-bold mb-2 text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="space-y-1.5">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }}></div>
                <span className="text-[11px] font-medium">{p.name}:</span>
              </div>
              <span className="text-[11px] font-black">{p.value}</span>
            </div>
          ))}
          <div className="pt-1.5 mt-1.5 border-t border-white/10 flex justify-between gap-4">
             <span className="text-[11px] font-bold text-slate-400">Total:</span>
             <span className="text-[11px] font-black text-white">{(payload[0].value || 0) + (payload[1]?.value || 0)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
