import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  Users, FileText, AlertCircle, TrendingUp, Download, Search, Filter, 
  ChevronRight, School, Calendar, MapPin
} from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import { RelatorioTEAData, Unit } from '../types';
import { exportRelatorioTEAPDF } from '../utils/pdfExport';

const COLORS = {
  confirmado: '#1E40AF', // Azul Escuro
  suspeito: '#60A5FA',   // Azul Claro
  total: '#3B82F6',      // Azul Médio
  percent: '#10B981',    // Verde Brotar
  faixaDestaque: '#F59E0B' // Amarelo/Laranja para 0-3 anos
};

const RelatorioTEAPage: React.FC = () => {
  const [data, setData] = useState<RelatorioTEAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unitFilter, setUnitFilter] = useState<Unit | 'TODAS'>('TODAS');
  const [statusFilter, setStatusFilter] = useState<'Confirmado' | 'Suspeito' | 'TODOS'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const filters = unitFilter !== 'TODAS' ? { unit: unitFilter as Unit } : undefined;
      const res = await SupabaseService.getRelatorioTEA(filters);
      setData(res);
    } catch (error) {
      console.error('Erro ao buscar dados do relatório TEA:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [unitFilter]);

  const filteredStudents = useMemo(() => {
    if (!data) return [];
    return data.detalhesAlunos.filter(s => {
      const matchesStatus = statusFilter === 'TODOS' || s.status === statusFilter;
      const matchesSearch = s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           s.escola.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [data, statusFilter, searchTerm]);

  const handleExportPDF = async () => {
    if (!data || isExporting) return;
    setIsExporting(true);
    try {
      const config = await SupabaseService.getPapelTimbrado();
      await exportRelatorioTEAPDF(data, config, { unit: unitFilter, status: statusFilter });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const percentRede = data ? ((data.resumo.totalTEA / data.resumo.totalGeralAlunos) * 100).toFixed(2) : '0';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-700" />
            Relatório TEA (Espectro Autista)
          </h1>
          <p className="text-slate-500">Panorama clínico e educacional da rede municipal</p>
        </div>
        <button 
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex items-center gap-2 bg-[#8B1A3A] hover:bg-[#6b142d] text-white px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          {isExporting ? <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div> : <Download size={18} />}
          Exportar PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusFilter('Confirmado')}
          className={`bg-white p-5 rounded-xl border-l-4 border-blue-800 shadow-sm hover:shadow-md transition-all cursor-pointer ${statusFilter === 'Confirmado' ? 'ring-2 ring-blue-400' : ''}`}
        >
          <div className="flex items-center justify-between text-blue-800 mb-2">
            <Users size={20} />
            <span className="text-xs font-semibold uppercase">Confirmados</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{data?.resumo.comLaudo}</div>
          <p className="text-xs text-slate-500 mt-1">Alunos com laudo clínico</p>
        </div>

        <div 
          onClick={() => setStatusFilter('Suspeito')}
          className={`bg-white p-5 rounded-xl border-l-4 border-blue-400 shadow-sm hover:shadow-md transition-all cursor-pointer ${statusFilter === 'Suspeito' ? 'ring-2 ring-blue-300' : ''}`}
        >
          <div className="flex items-center justify-between text-blue-500 mb-2">
            <AlertCircle size={20} />
            <span className="text-xs font-semibold uppercase">Suspeitos</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{data?.resumo.suspeitos}</div>
          <p className="text-xs text-slate-500 mt-1">Sinais identificados</p>
        </div>

        <div 
          onClick={() => setStatusFilter('TODOS')}
          className={`bg-white p-5 rounded-xl border-l-4 border-blue-600 shadow-sm hover:shadow-md transition-all cursor-pointer ${statusFilter === 'TODOS' ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <TrendingUp size={20} />
            <span className="text-xs font-semibold uppercase">Total TEA</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{data?.resumo.totalTEA}</div>
          <p className="text-xs text-slate-500 mt-1">Soma de confirmados e suspeitos</p>
        </div>

        <div className="bg-white p-5 rounded-xl border-l-4 border-emerald-500 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <Users size={20} />
            <span className="text-xs font-semibold uppercase">% na Rede</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{percentRede}%</div>
          <p className="text-xs text-slate-500 mt-1">De um total de {data?.resumo.totalGeralAlunos} alunos</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Filtros:</span>
        </div>
        
        <select 
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="TODAS">Todas as Unidades</option>
          <option value="SEDE">Sede</option>
          <option value="COCAL">Cocal</option>
        </select>

        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou escola..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Escola */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <School size={20} className="text-blue-700" />
            Distribuição por Escola
          </h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data?.porEscola.slice(0, 10)}
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="escola" 
                  type="category" 
                  width={100}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [value, 'Alunos']}
                />
                <Legend iconType="circle" />
                <Bar dataKey="confirmados" name="Confirmados" stackId="a" fill={COLORS.confirmado} radius={[0, 0, 0, 0]} />
                <Bar dataKey="suspeitos" name="Suspeitos" stackId="a" fill={COLORS.suspeito} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          {/* Status Pie Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 w-full flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-700" />
              Proporção por Status
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Confirmados', value: data?.resumo.comLaudo },
                      { name: 'Suspeitos', value: data?.resumo.suspeitos }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill={COLORS.confirmado} />
                    <Cell fill={COLORS.suspeito} />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Faixas Etárias */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <Calendar size={20} className="text-blue-700" />
              Faixas Etárias
            </h3>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.porFaixaEtaria}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="faixa" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="confirmados" name="Confirmados" stackId="a" fill={COLORS.confirmado} />
                  <Bar dataKey="suspeitos" name="Suspeitos" stackId="a">
                    {data?.porFaixaEtaria.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.faixa === '0-3 anos' ? COLORS.faixaDestaque : COLORS.suspeito} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic text-center">
              * Destaque em amarelo: faixa crítica para intervenção precoce (0-3 anos)
            </p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Users size={20} className="text-blue-700" />
            Listagem Detalhada
          </h3>
          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
            {filteredStudents.length} Alunos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Nome do Aluno</th>
                <th className="px-6 py-4">Escola</th>
                <th className="px-6 py-4">Idade</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">CID</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-700">{student.nome}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                      <School size={14} className="text-slate-400" />
                      {student.escola}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600 text-sm">{student.idade} anos</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      student.status === 'Confirmado' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-sky-100 text-sky-700'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <code className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">
                      {student.cid || '-'}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => window.location.href = `#/app/students/${student.id}`}
                      className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                      title="Ver prontuário"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Users className="mx-auto mb-2 opacity-20" size={48} />
                    Nenhum aluno encontrado com estes filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RelatorioTEAPage;
