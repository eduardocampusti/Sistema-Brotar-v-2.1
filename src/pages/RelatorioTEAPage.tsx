import React, { useState, useEffect, useMemo } from 'react';
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
  FileDown
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
import { SupabaseService } from '../services/SupabaseService';
import { 
  exportRelatorioCompletoTEAPDF,
  exportRelatorioConfirmadosTEAPDF,
  exportRelatorioSuspeitosTEAPDF,
  exportRelatorioPorEscolaTEAPDF,
  exportRelatorioContatoTEAPDF,
  exportRelatorioPorBairroPDF
} from '../utils/pdfExport';
import { toast } from 'react-hot-toast';

// --- Interfaces ---
interface StudentTEA {
  id: string;
  name: string;
  school: string;
  status: 'confirmado' | 'suspeito';
  cid?: string;
  birth_date?: string;
  contact_phone?: string;
  neighborhood?: string;
  has_medical_report: boolean;
  last_update: string;
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

const RelatorioTEAPage: React.FC = () => {
  const navigate = useNavigate();
  
  // States
  const [students, setStudents] = useState<StudentTEA[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'confirmado' | 'suspeito'>('todos');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await SupabaseService.getProcessedTEAStudents();
        setStudents(data);
      } catch (error) {
        console.error('Erro ao carregar dados TEA:', error);
        toast.error('Não foi possível carregar os dados dos alunos.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Memoized Calculations
  const metrics = useMemo(() => {
    const total = students.length;
    const confirmados = students.filter(s => s.status === 'confirmado').length;
    const suspeitos = students.filter(s => s.status === 'suspeito').length;
    return { total, confirmados, suspeitos };
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           s.school.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'todos' || s.status === filterStatus;
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
      schools[s.school] = (schools[s.school] || 0) + 1;
    });
    return Object.entries(schools)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [students]);

  // Handlers
  const handleViewDetails = (reportId: string) => {
    setSelectedReport(reportId);
    setIsModalOpen(true);
  };

  const handleSpecializedExport = async (reportType: string) => {
    const unitInfo = await SupabaseService.getUnitSettings();
    
    toast.promise(
      (async () => {
        switch(reportType) {
          case 'completo': await exportRelatorioCompletoTEAPDF(students, unitInfo); break;
          case 'confirmados': await exportRelatorioConfirmadosTEAPDF(students.filter(s => s.status === 'confirmado'), unitInfo); break;
          case 'suspeitos': await exportRelatorioSuspeitosTEAPDF(students.filter(s => s.status === 'suspeito'), unitInfo); break;
          case 'escola': await exportRelatorioPorEscolaTEAPDF(students, unitInfo); break;
          case 'contato': await exportRelatorioContatoTEAPDF(students, unitInfo); break;
          case 'bairro': await exportRelatorioPorBairroPDF(students, unitInfo); break;
        }
      })(),
      {
        loading: 'Gerando relatório PDF...',
        success: 'Relatório gerado com sucesso!',
        error: 'Erro ao gerar PDF. Tente novamente.'
      }
    );
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
        </div>

        {/* Central de Relatórios Section */}
        <div className="pt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-8 bg-[#8B1A3A] rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-800">Central de Relatórios</h2>
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
              badge={metrics.suspeitos}
              chartType="pie"
              chartData={[{ name: 'Suspeito', value: metrics.suspeitos, color: '#F59E0B' }]}
              onViewDetails={() => handleViewDetails('suspeitos')}
              onExportPDF={() => handleSpecializedExport('suspeitos')}
            />

            {/* Card 4 - Por Unidade Escolar */}
            <ReportCard 
              title="Distribuição por Escola"
              description="Análise quantitativa de alunos TEA distribuídos pelas unidades escolares municipais."
              icon={School}
              color="#8B1A3A"
              badge="Top 5"
              chartType="bar"
              chartData={schoolData}
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
              badge="Localização"
              chartType="pie"
              chartData={statusData}
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

          <div className="overflow-x-auto">
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
                          <div className="w-10 h-10 rounded-full bg-[#8B1A3A]/10 text-[#8B1A3A] flex items-center justify-center font-bold text-sm">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{student.name}</p>
                            <p className="text-xs text-gray-500">Nasc: {student.birth_date}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <School size={14} className="text-gray-400" />
                          {student.school}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            student.status === 'confirmado' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {student.status}
                          </span>
                          {student.cid && (
                            <span className="text-xs font-mono text-gray-400 ml-1">CID: {student.cid}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {student.has_medical_report ? (
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
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#8B1A3A] text-white">
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
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="overflow-auto flex-1 p-6">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b-2 border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="pb-3 px-4">Aluno</th>
                    <th className="pb-3 px-4">Unidade Escolar</th>
                    {(selectedReport === 'contato' || selectedReport === 'completo') && <th className="pb-3 px-4">Responsável / Fone</th>}
                    {selectedReport === 'bairro' && <th className="pb-3 px-4">Bairro</th>}
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4 text-right">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students
                    .filter(s => {
                      if (selectedReport === 'confirmados') return s.status === 'confirmado';
                      if (selectedReport === 'suspeitos') return s.status === 'suspeito';
                      return true;
                    })
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="text-sm font-bold text-gray-900">{s.name}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">{s.school}</span>
                        </td>
                        {(selectedReport === 'contato' || selectedReport === 'completo') && (
                          <td className="py-4 px-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <Phone size={12} className="text-gray-400" />
                              {s.contact_phone || 'Não informado'}
                            </div>
                          </td>
                        )}
                        {selectedReport === 'bairro' && (
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {s.neighborhood || 'N/A'}
                          </td>
                        )}
                        <td className="py-4 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            s.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {s.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-xs font-mono text-gray-400">
                          {s.cid || 'PENDENTE'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
              >
                Fechar
              </button>
              <button 
                onClick={() => {
                  if (selectedReport) handleSpecializedExport(selectedReport);
                }}
                className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-[#8B1A3A] hover:bg-[#6D142E] rounded-lg shadow-lg shadow-[#8B1A3A]/20 transition-all"
              >
                <Download size={18} />
                Baixar PDF Completo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatorioTEAPage;
