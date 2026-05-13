import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Search, 
  Filter,
  ArrowLeft,
  ChevronRight,
  School,
  MapPin,
  Phone,
  Calendar,
  MoreHorizontal,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  X,
  FileDown,
  TrendingUp
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { SupabaseService } from '../../services/SupabaseService';
import { 
  exportRelatorioCompletoTEAPDF,
  exportRelatorioConfirmadosTEAPDF,
  exportRelatorioSuspeitosTEAPDF,
  exportRelatorioPorEscolaTEAPDF,
  exportRelatorioContatoTEAPDF,
  exportRelatorioPorBairroPDF
} from '../../utils/pdfExport';
import { useToast } from '../../contexts/ToastContext';

// --- Interfaces ---
interface StudentTEA {
  id: string;
  fullName: string;
  photoUrl?: string;
  school: { schoolName: string };
  finalStatus: 'Confirmado' | 'Suspeito';
  cid?: string;
  birthDate?: string;
  telefone?: string;
  bairro?: string;
  age?: number;
  responsavel?: string;
  clinical?: { cid?: string; laudo?: boolean };
  last_update: string;
}

interface RelatorioTEAData {
  resumo: {
    totalTEA: number;
    comLaudo: number;
    suspeitos: number;
    totalGeralAlunos: number;
  };
  porEscola: any[];
  porFaixaEtaria: any[];
}

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badge: string | number;
  chartType: 'pie' | 'bar';
  chartData: any[];
  onViewDetails: () => void;
  onExportPDF: () => void;
}

// --- Componentes Auxiliares ---

const MetricCard = ({ title, value, icon: Icon, color, onClick, active }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
      active ? `border-${color}-500 ring-2 ring-${color}-500/20` : 'border-gray-100 hover:border-gray-200'
    }`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg bg-${color}-50 text-${color}-600`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

const ReportCard = ({ 
  title, 
  description, 
  icon: Icon, 
  color, 
  badge, 
  chartType, 
  chartData, 
  onViewDetails, 
  onExportPDF 
}: ReportCardProps) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full">
    {/* Top Border Accent */}
    <div className="h-1.5 w-full" style={{ backgroundColor: color }}></div>
    
    <div className="p-5 flex-1">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-lg text-white`} style={{ backgroundColor: color }}>
          <Icon size={20} />
        </div>
        <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200">
          {badge}
        </span>
      </div>
      
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">{description}</p>
      
      {/* Mini Chart Section */}
      <div className="h-32 w-full mb-4 bg-gray-50 rounded-lg p-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={25}
                outerRadius={40}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : (
            <BarChart data={chartData}>
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Bar>
              <Tooltip />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
    
    <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
      <button 
        onClick={onViewDetails}
        className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-700 text-sm font-semibold py-2 px-3 rounded-lg border border-gray-200 transition-colors"
      >
        <Search size={16} />
        Detalhes
      </button>
      <button 
        onClick={onExportPDF}
        className="flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 p-2 rounded-lg border border-gray-200 transition-colors group"
        title="Exportar PDF"
      >
        <FileDown size={18} className="group-hover:text-red-600 transition-colors" />
      </button>
    </div>
  </div>
);

// --- Componente Principal ---

const getAvatarColor = (nome: string) => {
  const colors = ['#8B1A3A', '#1E40AF', '#10B981', 
    '#F59E0B', '#6366F1', '#EC4899'];
  const index = nome ? nome.charCodeAt(0) % colors.length : 0;
  return colors[index];
};

const RelatorioTEAPage: React.FC = () => {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  
  // States
  const [data, setData] = useState<RelatorioTEAData | null>(null);
  const [students, setStudents] = useState<StudentTEA[]>([]);
  const [relatorioConfirmados, setRelatorioConfirmados] = useState<StudentTEA[]>([]);
  const [relatorioSuspeitos, setRelatorioSuspeitos] = useState<any[]>([]);
  const [relatorioPorEscola, setRelatorioPorEscola] = useState<any[]>([]);
  const [relatorioPorBairro, setRelatorioPorBairro] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'confirmado' | 'suspeito'>('todos');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch Data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const results = await Promise.allSettled([
          SupabaseService.getRelatorioTEA(),
          SupabaseService.getRelatorioTEACompleto(),
          SupabaseService.getRelatorioTEAConfirmados(),
          SupabaseService.getRelatorioTEASuspeitos(),
          SupabaseService.getRelatorioTEAPorEscola(),
          SupabaseService.getRelatorioTEAPorBairro()
        ]);

        const [
          resBase,
          resCompleto,
          resConfirmados,
          resSuspeitos,
          resPorEscola,
          resPorBairro
        ] = results.map(r => r.status === 'fulfilled' ? r.value : []);

        if (resBase) setData(resBase as RelatorioTEAData);
        if (resCompleto) setStudents(resCompleto);
        if (resConfirmados) setRelatorioConfirmados(resConfirmados);
        if (resSuspeitos) setRelatorioSuspeitos(resSuspeitos);
        if (resPorEscola) setRelatorioPorEscola(resPorEscola);
        if (resPorBairro) setRelatorioPorBairro(resPorBairro);

      } catch (error) {
        console.error('Erro ao carregar ecossistema de relatórios TEA:', error);
        toastError('Não foi possível carregar todos os dados dos relatórios.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Memoized Calculations
  const metrics = useMemo(() => {
    // Prioriza dados do resumo consolidado se disponível
    if (data?.resumo) {
      return {
        total: data.resumo.totalTEA,
        confirmados: data.resumo.comLaudo,
        suspeitos: data.resumo.suspeitos,
        totalGeral: data.resumo.totalGeralAlunos,
        percentual: ((data.resumo.totalTEA / data.resumo.totalGeralAlunos) * 100).toFixed(2)
      };
    }
    
    // Fallback para cálculo local
    const total = students.length;
    const confirmados = students.filter(s => s.finalStatus === 'Confirmado').length;
    const suspeitos = students.filter(s => s.finalStatus === 'Suspeito').length;
    return { 
      total, 
      confirmados, 
      suspeitos, 
      totalGeral: 0, 
      percentual: '0.00' 
    };
  }, [students, data]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (s.school?.schoolName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'todos' || s.finalStatus.toLowerCase() === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [students, searchTerm, filterStatus]);

  // Chart Data Preparation
  const statusData = [
    { name: 'Confirmados', value: metrics.confirmados, color: '#10B981' },
    { name: 'Suspeitos', value: metrics.suspeitos, color: '#F59E0B' }
  ];

  const schoolData = useMemo(() => {
    const schools: Record<string, number> = {};
    students.forEach(s => {
      const sName = s.school?.schoolName || 'Não vinculada';
      schools[sName] = (schools[sName] || 0) + 1;
    });
    return Object.entries(schools)
      .map(([name, value]) => ({ escola: name, totalConfirmados: value, totalSuspeitos: 0 }))
      .sort((a, b) => b.totalConfirmados - a.totalConfirmados)
      .slice(0, 5);
  }, [students]);

  // Handlers
  const handleViewDetails = (reportId: string) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setSelectedReport(reportId);
    setIsModalOpen(true);
  };

  const handleSpecializedExport = async (reportType: string) => {
    try {
      console.log('[PDF] Iniciando export tipo:', reportType);
      
      const unitInfo = await SupabaseService.getPapelTimbradoConfig();
      console.log('[PDF] Config obtida:', unitInfo ? 'ok' : 'null/undefined');
      console.log('[PDF] Config keys:', unitInfo ? Object.keys(unitInfo) : 'N/A');
      
      console.log('[PDF] Dados disponíveis:', {
        students: students?.length,
        confirmados: relatorioConfirmados?.length,
        suspeitos: relatorioSuspeitos?.length,
        escola: relatorioPorEscola?.length,
        bairro: relatorioPorBairro?.length
      });

      switch(reportType) {
        case 'completo': 
          console.log('[PDF] Chamando exportRelatorioCompletoTEAPDF com', students?.length, 'registros');
          await exportRelatorioCompletoTEAPDF(students, unitInfo); 
          break;
        case 'confirmados': 
          console.log('[PDF] Chamando exportRelatorioConfirmadosTEAPDF com', relatorioConfirmados?.length, 'registros');
          await exportRelatorioConfirmadosTEAPDF(relatorioConfirmados, unitInfo); 
          break;
        case 'suspeitos': 
          console.log('[PDF] Chamando exportRelatorioSuspeitosTEAPDF com', relatorioSuspeitos?.length, 'registros');
          await exportRelatorioSuspeitosTEAPDF(relatorioSuspeitos, unitInfo); 
          break;
        case 'escola': 
          console.log('[PDF] Chamando exportRelatorioPorEscolaTEAPDF com', students?.length, 'registros');
          await exportRelatorioPorEscolaTEAPDF(students, unitInfo); 
          break;
        case 'contato': 
          console.log('[PDF] Chamando exportRelatorioContatoTEAPDF com', students?.length, 'registros');
          await exportRelatorioContatoTEAPDF(students, unitInfo); 
          break;
        case 'bairro': 
          console.log('[PDF] Chamando exportRelatorioPorBairroPDF com', relatorioPorBairro?.length, 'registros');
          await exportRelatorioPorBairroPDF(students, unitInfo); 
          break;
        default:
          console.error('[PDF] Tipo não reconhecido:', reportType);
      }
      console.log('[PDF] Export concluído com sucesso');
      toastSuccess('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('[PDF] ERRO DETALHADO:', error);
      console.error('[PDF] Stack:', error instanceof Error ? error.stack : error);
      toastError('Erro ao gerar PDF. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      {/* Header Area */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Monitoramento TEA</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <Users size={16} />
              Gestão de Alunos com Transtorno do Espectro Autista
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Dashboard */}
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Total de Alunos TEA"
            value={metrics.total}
            icon={Users}
            color="blue"
            onClick={() => setFilterStatus('todos')}
            active={filterStatus === 'todos'}
          />
          <MetricCard 
            title="Diagnósticos Confirmados"
            value={metrics.confirmados}
            icon={CheckCircle}
            color="emerald"
            onClick={() => setFilterStatus('confirmado')}
            active={filterStatus === 'confirmado'}
          />
          <MetricCard 
            title="Casos em Suspeita"
            value={metrics.suspeitos}
            icon={AlertCircle}
            color="amber"
            onClick={() => setFilterStatus('suspeito')}
            active={filterStatus === 'suspeito'}
          />
          <MetricCard 
            title="% de TEA na Rede"
            value={`${metrics.percentual}%`}
            icon={TrendingUp}
            color="indigo"
            onClick={() => {}}
            active={false}
          />
        </div>

        {/* Análise Gráfica */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição por Escola */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <School size={20} className="text-[#8B1A3A]" />
              <h3 className="text-lg font-bold text-gray-800">Distribuição por Escola</h3>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={(data?.porEscola && data.porEscola.length > 0) ? data.porEscola.slice(0, 8) : schoolData}
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="escola" 
                    type="category" 
                    width={120}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="totalConfirmados" name="Confirmados" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="totalSuspeitos" name="Suspeitos" stackId="a" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Proporção e Faixas */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <PieChartIcon size={20} className="text-[#8B1A3A]" />
                  <h3 className="text-lg font-bold text-gray-800">Proporção</h3>
                </div>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={20} className="text-[#8B1A3A]" />
                  <h3 className="text-lg font-bold text-gray-800">Faixas Etárias</h3>
                </div>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.porFaixaEtaria}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="faixa" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} />
                      <YAxis hide />
                      <Tooltip />
                      <Bar dataKey="confirmados" name="Confirmados" stackId="a" fill="#10B981" />
                      <Bar dataKey="suspeitos" name="Suspeitos" stackId="a" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-[#8B1A3A]/5 border border-[#8B1A3A]/10 p-4 rounded-xl flex items-start gap-3">
              <TrendingUp className="text-[#8B1A3A] mt-1 shrink-0" size={20} />
              <div>
                <h4 className="text-sm font-bold text-[#8B1A3A]">Insight Estratégico</h4>
                <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                  A maior concentração de casos em suspeita na faixa de 0-3 anos indica a necessidade de 
                  reforço em equipes de triagem precoce para agilizar diagnósticos definitivos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Central de Relatórios */}
        <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200 shadow-inner space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-[#8B1A3A] rounded-full"/>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Central de Relatórios
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 - Relatório Completo */}
            <ReportCard 
              title="Relatório Completo TEA"
              description="Visão consolidada de todos os alunos (confirmados e suspeitos) cadastrados no sistema."
              icon={FileText}
              color="#3B82F6"
              badge={metrics.total}
              chartType="pie"
              chartData={statusData}
              onViewDetails={() => handleViewDetails('completo')}
              onExportPDF={() => handleSpecializedExport('completo')}
            />

            {/* Card 2 - TEA Confirmados */}
            <ReportCard 
              title="TEA Confirmados"
              description="Listagem exclusiva de alunos com laudo médico anexado e CID validado."
              icon={CheckCircle}
              color="#10B981"
              badge={metrics.confirmados}
              chartType="pie"
              chartData={[{ name: 'Confirmado', value: metrics.confirmados, color: '#10B981' }]}
              onViewDetails={() => handleViewDetails('confirmados')}
              onExportPDF={() => handleSpecializedExport('confirmados')}
            />

            {/* Card 3 - TEA Suspeitos */}
            <ReportCard 
              title="TEA Suspeitos"
              description="Alunos identificados em triagem ou por observação pedagógica aguardando laudo."
              icon={AlertCircle}
              color="#F59E0B"
              badge={relatorioSuspeitos.length || metrics.suspeitos}
              chartType="pie"
              chartData={[{ name: 'Suspeito', value: relatorioSuspeitos.length || metrics.suspeitos, color: '#F59E0B' }]}
              onViewDetails={() => handleViewDetails('suspeitos')}
              onExportPDF={() => handleSpecializedExport('suspeitos')}
            />

            {/* Card 4 - Por Unidade Escolar */}
            <ReportCard 
              title="Distribuição por Escola"
              description="Análise quantitativa de alunos TEA distribuídos pelas unidades escolares municipais."
              icon={School}
              color="#8B1A3A"
              badge={relatorioPorEscola.length > 0 ? `Total: ${relatorioPorEscola.length} Escolas` : 'Top 5'}
              chartType="bar"
              chartData={relatorioPorEscola.length > 0 
                ? relatorioPorEscola.slice(0, 5).map(e => ({ name: e.escola, value: e.totalConfirmados + e.totalSuspeitos }))
                : schoolData
              }
              onViewDetails={() => handleViewDetails('escola')}
              onExportPDF={() => handleSpecializedExport('escola')}
            />

            {/* Card 5 - Lista de Contato */}
            <ReportCard 
              title="Lista de Contato Rápido"
              description="Relatório otimizado com telefones e nomes de responsáveis para comunicação direta."
              icon={Phone}
              color="#6366F1"
              badge="Contatos"
              chartType="bar"
              chartData={schoolData.map(d => ({ ...d, value: Math.floor(d.value * 0.8) }))}
              onViewDetails={() => handleViewDetails('contato')}
              onExportPDF={() => handleSpecializedExport('contato')}
            />

            {/* Card 6 - Por Bairro */}
            <ReportCard 
              title="Análise por Bairro"
              description="Mapeamento geográfico para identificar áreas de maior demanda de atendimento especializado."
              icon={MapPin}
              color="#4F46E5"
              badge={relatorioPorBairro.length > 0 ? `Total: ${relatorioPorBairro.length} Bairros` : 'Localização'}
              chartType="pie"
              chartData={relatorioPorBairro.length > 0
                ? relatorioPorBairro.slice(0, 5).map(b => ({ name: b.bairro, value: b.totalTEA, color: '#4F46E5' }))
                : statusData
              }
              onViewDetails={() => handleViewDetails('bairro')}
              onExportPDF={() => handleSpecializedExport('bairro')}
            />
          </div>
        </div>

        {/* Nominal List Section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users size={20} className="text-[#8B1A3A]" />
                Lista Nominal de Alunos
              </h3>
              
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Buscar por nome ou escola..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8B1A3A]/20 focus:border-[#8B1A3A] transition-all"
                  />
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                  {(['todos', 'confirmado', 'suspeito'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        filterStatus === status 
                          ? 'bg-white text-[#8B1A3A] shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {status.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Aluno</th>
                  <th className="px-6 py-4">Escola / Unidade</th>
                  <th className="px-6 py-4">Status / CID</th>
                  <th className="px-6 py-4">Laudo</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8 h-16 bg-gray-50/30"></td>
                    </tr>
                  ))
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-slate-100 relative">
                            {student.photoUrl ? (
                              <img 
                                src={student.photoUrl} 
                                alt={student.fullName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center text-white font-bold text-sm ${student.photoUrl ? 'hidden' : 'flex'}`}
                              style={{ backgroundColor: getAvatarColor(student.fullName) }}>
                              {student.fullName.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{student.fullName}</p>
                            <p className="text-xs text-gray-500">Nasc: {student.birthDate || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <School size={14} className="text-gray-400" />
                          {student.school?.schoolName || 'Não vinculada'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            student.finalStatus === 'Confirmado' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {student.finalStatus}
                          </span>
                          {(student.clinical?.cid || student.cid) && (
                            <span className="text-xs font-mono text-gray-400 ml-1">CID: {student.clinical?.cid || student.cid}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(student.clinical?.laudo || student.finalStatus === 'Confirmado') ? (
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <CheckCircle size={14} />
                            <span className="text-xs font-medium">Anexado</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-500">
                            <AlertCircle size={14} />
                            <span className="text-xs font-medium">Pendente</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => navigate(`/student/${student.id}`)}
                          className="p-2 text-gray-400 hover:text-[#8B1A3A] hover:bg-[#8B1A3A]/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Search size={32} className="text-gray-300" />
                        <p>Nenhum aluno encontrado com esses filtros.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Total de registros: <span className="font-bold text-gray-600">{filteredStudents.length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {isModalOpen && selectedReport && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            padding: '16px'
          }}
          onClick={() => { setIsModalOpen(false); setSelectedReport(null); }}
        >
          <div
            style={{
              background: 'white',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '88vh',
              borderRadius: '16px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#8B1A3A] text-white sticky top-0 z-10 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileText size={22} />
                  {selectedReport === 'completo' && 'Detalhamento TEA Completo'}
                  {selectedReport === 'confirmados' && 'Detalhamento TEA Confirmados'}
                  {selectedReport === 'suspeitos' && 'Detalhamento TEA Suspeitos'}
                  {selectedReport === 'escola' && 'Detalhamento TEA por Unidade'}
                  {selectedReport === 'contato' && 'Lista de Contato Especializada'}
                  {selectedReport === 'bairro' && 'Distribuição Geográfica por Bairro'}
                </h2>
                <p className="text-white/70 text-sm mt-0.5">Visualização detalhada dos registros para análise</p>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); setSelectedReport(null); }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b-2 border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="pb-3 px-4">Aluno</th>
                    {selectedReport !== 'escola' && <th className="pb-3 px-4">Unidade Escolar</th>}
                    {selectedReport === 'escola' && <th className="pb-3 px-4">Unidade</th>}
                    {(selectedReport === 'contato' || selectedReport === 'completo' || selectedReport === 'bairro') && <th className="pb-3 px-4">Responsável / Fone</th>}
                    {selectedReport === 'bairro' && <th className="pb-3 px-4">Localização</th>}
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4 text-right">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(() => {
                    let displayData: any[] = [];
                    if (selectedReport === 'confirmados') displayData = relatorioConfirmados;
                    else if (selectedReport === 'suspeitos') displayData = relatorioSuspeitos;
                    else if (selectedReport === 'escola') {
                      // Achatar a lista de alunos por escola para a tabela
                      displayData = relatorioPorEscola.flatMap(e => 
                        (e.alunos || []).map((a: any) => ({
                          fullName: a.nome,
                          school: { schoolName: e.escola },
                          unit: e.unidade,
                          finalStatus: a.status,
                          cid: a.cid
                        }))
                      );
                    } else if (selectedReport === 'bairro') {
                      displayData = relatorioPorBairro.flatMap(b => 
                        (b.alunos || []).map((a: any) => ({
                          fullName: a.nome,
                          school: { schoolName: a.escola },
                          finalStatus: a.status,
                          bairro: b.bairro,
                          telefone: a.telefone,
                          responsavel: a.responsavel
                        }))
                      );
                    } else {
                      displayData = students;
                    }

                    if (displayData.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-3 text-gray-400">
                              <Search size={32} className="text-gray-300" />
                              <p className="text-sm font-medium">Nenhum registro encontrado para este relatório.</p>
                              <p className="text-xs">Os dados podem ainda estar sendo carregados ou não há registros nesta categoria.</p>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return displayData.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="text-sm font-bold text-gray-900">{s.fullName}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {s.school?.schoolName || s.schoolName || 'Não vinculada'}
                            {s.unit && <span className="text-[10px] block text-gray-400">{s.unit}</span>}
                          </span>
                        </td>
                        {(selectedReport === 'contato' || selectedReport === 'completo' || selectedReport === 'bairro') && (
                          <td className="py-4 px-4 text-sm text-gray-500">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-gray-700">{s.responsavel || 'N/I'}</span>
                              <div className="flex items-center gap-1 text-[10px]">
                                <Phone size={10} className="text-gray-400" />
                                {s.telefone || 'N/I'}
                              </div>
                            </div>
                          </td>
                        )}
                        {selectedReport === 'bairro' && (
                          <td className="py-4 px-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <MapPin size={12} className="text-gray-400" />
                              {s.bairro || 'N/A'}
                            </div>
                          </td>
                        )}
                        <td className="py-4 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            s.finalStatus === 'Confirmado' || s.status === 'Confirmado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {(s.finalStatus || s.status || '').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-xs font-mono text-gray-400">
                          {s.clinical?.cid || s.cid || 'PENDENTE'}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={() => { setIsModalOpen(false); setSelectedReport(null); }}
                className="px-6 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
              >
                Fechar
              </button>
              <button 
                onClick={() => {
                  console.log('[TEA Modal] PDF click, selectedReport:', selectedReport);
                  if (selectedReport) handleSpecializedExport(selectedReport);
                }}
                className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-[#8B1A3A] hover:bg-[#6D142E] rounded-lg shadow-lg shadow-[#8B1A3A]/20 transition-all"
              >
                <FileDown size={18} />
                Baixar PDF
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RelatorioTEAPage;
