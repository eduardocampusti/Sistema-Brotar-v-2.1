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
  TrendingUp,
  Award,
  Layers,
  Activity
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
  Legend,
  LabelList
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { SupabaseService } from '../../services/SupabaseService';
import { supabase } from '../../services/supabaseClient';
import { 
  exportRelatorioCompletoTEAPDF,
  exportRelatorioConfirmadosTEAPDF,
  exportRelatorioSuspeitosTEAPDF,
  exportRelatorioPorEscolaTEAPDF,
  exportRelatorioContatoTEAPDF,
  exportRelatorioPorBairroPDF,
  exportRelatorioTDAHPDF,
  exportRelatorioDownPDF,
  exportRelatorioParalisiaCerebralPDF,
  exportRelatorioDeficienciaIntelectualPDF,
  exportRelatorioGeralANEEPDF
} from '../../utils/pdfExport';
import { useToast } from '../../contexts/ToastContext';
import { Card, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';

// --- Interfaces ---
interface StudentANEE {
  id: string;
  fullName: string;
  photoUrl?: string;
  school: { 
    schoolName: string; 
    grade?: string;
    shift?: string;
    teachingType?: string;
    district?: string;
  };
  finalStatus: 'Confirmado' | 'Suspeito';
  cid?: string;
  birthDate?: string;
  telefone?: string;
  bairro?: string;
  age?: number | null;
  responsavel?: string;
  condicao?: string;
  clinical?: { 
    cid?: string; 
    laudo?: boolean; 
    diagnosis?: string;
  };
  unit?: string;
  last_update?: string;
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

// --- Função de Normalização dos Diagnósticos ---
// Retorna a condição primária (compatibilidade com usos existentes)
const normalizeDiagnostico = (cid: string, diagnostico: string): string => {
  const condicoes = getAllCondicoes(cid, diagnostico);
  return condicoes.length > 0 ? condicoes[0] : 'Outras';
};

// Retorna TODAS as condições detectadas (suporte a múltiplos diagnósticos)
// Um aluno com TEA + Epilepsia será contado em ambas as listas nos gráficos
const getAllCondicoes = (cid: string, diagnostico: string): string[] => {
  const c = (cid || '').toUpperCase().trim();
  const d = (diagnostico || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const condicoes: string[] = [];

  if (d.includes('autis') || d.includes('tea') || d.includes('espectro') || c.includes('F84') || c.includes('6A02')) {
    condicoes.push('TEA');
  }
  if (d.includes('tdah') || d.includes('deficit de atencao') || d.includes('hiperativ') || c.includes('F90') || c.includes('6A05')) {
    condicoes.push('TDAH');
  }
  if (d.includes('down') || c.includes('Q90') || d.includes('trissomia')) {
    condicoes.push('Síndrome de Down');
  }
  if (d.includes('paralisia') || c.includes('G80')) {
    condicoes.push('Paralisia Cerebral');
  }
  if (
    d.includes('deficiencia intelectual') || c.includes('6A00') || d.includes('intelectual')
  ) {
    condicoes.push('Deficiência Intelectual');
  }
  if (d.includes('epilepsia') || c.includes('G40')) {
    condicoes.push('Epilepsia');
  }
  if (d.includes('opositivo') || c.includes('F91') || /\btod\b/.test(d)) {
    condicoes.push('TOD');
  }

  // Se nenhuma condição específica foi detectada, mas há CID ou diagnóstico preenchido
  if (condicoes.length === 0) {
    condicoes.push('Outras');
  }

  return condicoes;
};

// --- Cores Oficiais por Condição ---
const CORES_CONDICAO: Record<string, string> = {
  'TEA': '#3B82F6',
  'TDAH': '#F97316',
  'Síndrome de Down': '#22C55E',
  'Paralisia Cerebral': '#A855F7',
  'Deficiência Intelectual': '#EF4444',
  'Epilepsia': '#6B7280',
  'TOD': '#8B5CF6',
  'Outras': '#9CA3AF'
};

const CORES_INDICADORES = {
  totalAnee: '#06B6D4',
  percentualAnee: '#10B981',
  suspeitos: '#F59E0B'
};

const CORES_LIGHT_CONDICAO: Record<string, string> = {
  'TEA': '#EFF6FF',
  'TDAH': '#FFF7ED',
  'Síndrome de Down': '#F0FDF4',
  'Paralisia Cerebral': '#FAF5FF',
  'Deficiência Intelectual': '#FEF2F2',
  'Epilepsia': '#F3F4F6',
  'TOD': '#F5F3FF',
  'Outras': '#F9FAFB'
};

// --- Componentes Auxiliares ---

// Tooltip customizado para gráficos Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 4px 16px -4px rgba(0,0,0,0.10)',
      padding: '10px 14px',
      minWidth: '120px'
    }}>
      {label && <p style={{ fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color || entry.fill }} />
          <span style={{ fontSize: '11px', color: '#6b7280' }}>{entry.name || entry.dataKey}:</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// Legenda customizada para gráfico de pizza
const CustomPieLegend = ({ data }: { data: Array<{ name: string; value: number; color: string }> }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
    {data.map((entry, idx) => (
      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color, flexShrink: 0 }} />
        <span style={{ color: '#6b7280', fontWeight: 600 }}>{entry.name}</span>
        <span style={{ color: '#111827', fontWeight: 700, background: '#f3f4f6', padding: '0 5px', borderRadius: '4px' }}>{entry.value}</span>
      </div>
    ))}
  </div>
);

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: string;
  icon: React.ElementType;
  color: string;
  bgLight: string;
  onClick?: () => void;
  active?: boolean;
}

// Card Opção A: borda superior colorida por condição, ícone translúcido, tendência abaixo
const MetricCard = ({ title, value, trend, icon: Icon, color, bgLight, onClick, active }: MetricCardProps) => (
  <Card
    onClick={onClick}
    style={{
      borderTopColor: color,
      borderTopWidth: '3px',
      borderTopStyle: 'solid',
      boxShadow: active ? `0 0 0 2px ${color}20, 0 4px 16px -4px ${color}30` : undefined,
      cursor: onClick ? 'pointer' : 'default'
    }}
    className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${
      active ? 'ring-1' : ''
    }`}
  >
    <CardContent className="p-5">
      {/* Ícone translúcido no canto superior direito */}
      <div
        style={{ color: color, opacity: 0.15, position: 'absolute', top: '12px', right: '12px' }}
      >
        <Icon size={28} />
      </div>

      <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
        {title}
      </p>
      <p style={{ fontSize: '24px', fontWeight: 500, color: '#111827', lineHeight: 1.2 }}>
        {value}
      </p>
      {trend && (
        <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
          {trend}
        </p>
      )}
    </CardContent>
  </Card>
);

// ReportCard: mini-preview colorido, contador no topo e ações embaixo.
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
}: ReportCardProps) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderColor: hovered ? color : '#e5e7eb',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? `0 4px 20px -4px ${color}30` : '0 1px 3px rgba(0,0,0,0.05)'
      }}
      className="bg-white rounded-xl border overflow-hidden flex flex-col h-full"
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 rounded-lg text-white" style={{ backgroundColor: color }}>
            <Icon size={18} />
          </div>
          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
            {badge}
          </span>
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
          {title}
        </h3>
        <p style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.5, flex: 1, marginBottom: '14px' }}>
          {description}
        </p>

        <div
          className="h-24 w-full mb-2 rounded-lg p-1.5 border"
          style={{ backgroundColor: `${color}16`, borderColor: `${color}33` }}
        >
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={15}
                  outerRadius={28}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            ) : (
              <BarChart data={chartData}>
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || color} />
                  ))}
                </Bar>
                <Tooltip content={<CustomTooltip />} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex gap-2">
        <button
          onClick={onViewDetails}
          className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-gray-200 transition-colors"
        >
          <Search size={14} />
          Detalhes
        </button>
        <button
          onClick={onExportPDF}
          className="flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 p-1.5 rounded-lg border border-gray-200 transition-colors group"
          title="Exportar PDF"
        >
          <FileDown size={16} className="group-hover:text-red-600 transition-colors" />
        </button>
      </div>
    </div>
  );
};

// --- Componente Principal ---

interface RelatorioTEAPageProps {
  currentUser?: any;
}

const RelatorioTEAPage: React.FC<RelatorioTEAPageProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  
  // --- States ---
  const [loading, setLoading] = useState(true);
  const [papelTimbrado, setPapelTimbrado] = useState<any>(null);
  const [totalGeralAlunos, setTotalGeralAlunos] = useState<number>(0);
  
  // Listas de Alunos processados no frontend
  const [allStudents, setAllStudents] = useState<StudentANEE[]>([]);
  const [aneeStudents, setAneeStudents] = useState<StudentANEE[]>([]);
  
  // Categorias específicas
  const [teaStudents, setTeaStudents] = useState<StudentANEE[]>([]);
  const [tdahStudents, setTdahStudents] = useState<StudentANEE[]>([]);
  const [downStudents, setDownStudents] = useState<StudentANEE[]>([]);
  const [pcStudents, setPcStudents] = useState<StudentANEE[]>([]);
  const [diStudents, setDiStudents] = useState<StudentANEE[]>([]);
  const [epilepsiaStudents, setEpilepsiaStudents] = useState<StudentANEE[]>([]);
  const [todStudents, setTodStudents] = useState<StudentANEE[]>([]);
  const [outrasStudents, setOutrasStudents] = useState<StudentANEE[]>([]);

  // Filtros da Tabela Nominal
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'confirmado' | 'suspeito'>('todos');
  const [filterCondicao, setFilterCondicao] = useState<string>('todos');
  
  // Controle do Modal
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch e processamento geral dos dados
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 1. Obter sessão do Supabase e carregar perfil do usuário
        const { data: { session } } = await supabase.auth.getSession();
        let userProfile = null;
        if (session?.user) {
          userProfile = await SupabaseService.getUserProfile(session.user.id);
        }

        // 2. Carregar papel timbrado e lista geral de alunos via getStudents
        const [configTimbrado, rawStudents] = await Promise.all([
          SupabaseService.getPapelTimbradoConfig(),
          SupabaseService.getStudents(undefined, { compactList: true })
        ]);

        setPapelTimbrado(configTimbrado);

        // 3. Aplicar filtros de escopo regional do usuário logado (Segunda camada de segurança local)
        let processed = [...rawStudents];
        if (userProfile) {
          const role = (userProfile.role || '').toUpperCase();
          const scope = (userProfile.scope || 'GLOBAL').toUpperCase();

          if (role === 'SECRETARIA_SEDE') {
            processed = processed.filter(s => s.unit === 'SEDE');
          } else if (role === 'SECRETARIA_COCAL') {
            processed = processed.filter(s => s.unit === 'COCAL');
          } else if (role === 'ASSISTANT' && scope === 'COCAL') {
            processed = processed.filter(s => s.unit === 'COCAL');
          }
        }

        // Lógica de cálculo de idade com proteção para ano bissexto e fuso horário
        const getAge = (birthDate?: string) => {
          if (!birthDate) return null;
          const today = new Date();
          const birth = new Date(birthDate.includes('T') ? birthDate : birthDate + 'T00:00:00');
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
          return age < 0 ? 0 : age;
        };

        // 4. Mapear os alunos adicionando campos calculados (finalStatus, age, responsavel, telefone, bairro)
        const studentsWithStats: StudentANEE[] = processed.map(s => {
          const hasExplicitLaudo = s.clinical?.laudo === true;
          const hasLaudoAnexado = Array.isArray(s.documents) && s.documents.some((doc: any) => doc.type === 'Laudo Médico');
          const hasExplicitSuspicion = s.clinical?.suspicion === true;
          
          let finalStatus: 'Confirmado' | 'Suspeito' = 'Suspeito';
          if (hasExplicitLaudo || hasLaudoAnexado) {
            finalStatus = 'Confirmado';
          }

          const ageValue = getAge(s.birthDate);

          return {
            ...s,
            finalStatus,
            age: ageValue,
            responsavel: s.guardians?.[0]?.name || 'Não informado',
            telefone: s.guardians?.[0]?.phone || 'Não informado',
            bairro: s.address?.district || 'Não informado'
          };
        });

        // 5. Filtrar e categorizar alunos por condição ANEE
        // Alunos com múltiplos diagnósticos são contados em TODAS as condições aplicáveis
        const aneeList: StudentANEE[] = [];
        const teaList: StudentANEE[] = [];
        const tdahList: StudentANEE[] = [];
        const downList: StudentANEE[] = [];
        const pcList: StudentANEE[] = [];
        const diList: StudentANEE[] = [];
        const epilepsiaList: StudentANEE[] = [];
        const todList: StudentANEE[] = [];
        const outrasList: StudentANEE[] = [];

        studentsWithStats.forEach(s => {
          const cid = s.clinical?.cid || '';
          const diag = s.clinical?.diagnosis || '';
          
          // Considera aluno ANEE se ele tem diagnóstico ou CID cadastrado no banco
          if (cid.trim() !== '' || diag.trim() !== '') {
            // Detecta TODAS as condições do aluno (suporte a múltiplos diagnósticos)
            const todasCondicoes = getAllCondicoes(cid, diag);
            // A condição exibida na tabela é a primária
            s.condicao = todasCondicoes[0];
            aneeList.push(s);

            // Aluno é adicionado em TODAS as listas de condições detectadas
            todasCondicoes.forEach(condicao => {
              if (condicao === 'TEA') teaList.push(s);
              else if (condicao === 'TDAH') tdahList.push(s);
              else if (condicao === 'Síndrome de Down') downList.push(s);
              else if (condicao === 'Paralisia Cerebral') pcList.push(s);
              else if (condicao === 'Deficiência Intelectual') diList.push(s);
              else if (condicao === 'Epilepsia') epilepsiaList.push(s);
              else if (condicao === 'TOD') todList.push(s);
              else outrasList.push(s);
            });
          }
        });

        // Atualiza os estados locais
        setAllStudents(studentsWithStats);
        setAneeStudents(aneeList);
        setTeaStudents(teaList);
        setTdahStudents(tdahList);
        setDownStudents(downList);
        setPcStudents(pcList);
        setDiStudents(diList);
        setEpilepsiaStudents(epilepsiaList);
        setTodStudents(todList);
        setOutrasStudents(outrasList);

        // Define a base geral de alunos da rede para cálculo de prevalência
        setTotalGeralAlunos(studentsWithStats.length || rawStudents.length);

      } catch (error) {
        console.error('Erro ao carregar ecossistema de relatórios de Educação Especial:', error);
        toastError('Não foi possível carregar os dados dos relatórios.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- Memoized Calculations & Metrics ---
  
  const teaMetrics = useMemo(() => {
    const total = teaStudents.length;
    const confirmados = teaStudents.filter(s => s.finalStatus === 'Confirmado').length;
    const suspeitos = teaStudents.filter(s => s.finalStatus === 'Suspeito').length;
    const percentual = totalGeralAlunos > 0 ? ((total / totalGeralAlunos) * 100).toFixed(2) : '0.00';
    return { total, confirmados, suspeitos, percentual };
  }, [teaStudents, totalGeralAlunos]);

  const aneeMetrics = useMemo(() => {
    const total = aneeStudents.length;
    const percentual = totalGeralAlunos > 0 ? ((total / totalGeralAlunos) * 100).toFixed(2) : '0.00';
    return { total, percentual };
  }, [aneeStudents, totalGeralAlunos]);

  // Lista Nominal Filtrada
  const filteredStudents = useMemo(() => {
    return aneeStudents.filter(s => {
      const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (s.school?.schoolName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'todos' || s.finalStatus.toLowerCase() === filterStatus;
      const matchesCondicao = filterCondicao === 'todos' || s.condicao === filterCondicao;
      return matchesSearch && matchesStatus && matchesCondicao;
    });
  }, [aneeStudents, searchTerm, filterStatus, filterCondicao]);

  // --- Gráficos Recharts Data ---

  // Gráfico 1: Distribuição por Tipo de Condição
  const distribuicaoData = useMemo(() => {
    return [
      { name: 'TEA', value: teaStudents.length, color: CORES_CONDICAO['TEA'] },
      { name: 'TDAH', value: tdahStudents.length, color: CORES_CONDICAO['TDAH'] },
      { name: 'S. Down', value: downStudents.length, color: CORES_CONDICAO['Síndrome de Down'] },
      { name: 'P. Cerebral', value: pcStudents.length, color: CORES_CONDICAO['Paralisia Cerebral'] },
      { name: 'Def. Intelectual', value: diStudents.length, color: CORES_CONDICAO['Deficiência Intelectual'] },
      { name: 'Epilepsia', value: epilepsiaStudents.length, color: CORES_CONDICAO['Epilepsia'] },
      { name: 'TOD', value: todStudents.length, color: CORES_CONDICAO['TOD'] },
      { name: 'Outras', value: outrasStudents.length, color: CORES_CONDICAO['Outras'] }
    ].filter(item => item.value > 0);
  }, [teaStudents, tdahStudents, downStudents, pcStudents, diStudents, epilepsiaStudents, todStudents, outrasStudents]);

  // Gráfico 2: Proporção entre Condições
  const proporcaoData = useMemo(() => {
    return distribuicaoData;
  }, [distribuicaoData]);

  // Gráfico 3: Top 5 Escolas com mais Condições
  const schoolData = useMemo(() => {
    const schools: Record<string, { escola: string, TEA: number, TDAH: number, Down: number, PC: number, DI: number, Epilepsia: number, TOD: number, Outras: number, total: number }> = {};
    
    aneeStudents.forEach(s => {
      const sName = s.school?.schoolName || 'Não vinculada';
      if (!schools[sName]) {
        schools[sName] = {
          escola: sName,
          TEA: 0,
          TDAH: 0,
          Down: 0,
          PC: 0,
          DI: 0,
          Epilepsia: 0,
          TOD: 0,
          Outras: 0,
          total: 0
        };
      }
      
      const cond = s.condicao || 'Outras';
      if (cond === 'TEA') schools[sName].TEA++;
      else if (cond === 'TDAH') schools[sName].TDAH++;
      else if (cond === 'Síndrome de Down') schools[sName].Down++;
      else if (cond === 'Paralisia Cerebral') schools[sName].PC++;
      else if (cond === 'Deficiência Intelectual') schools[sName].DI++;
      else if (cond === 'Epilepsia') schools[sName].Epilepsia++;
      else if (cond === 'TOD') schools[sName].TOD++;
      else schools[sName].Outras++;
      
      schools[sName].total++;
    });
    
    return Object.values(schools)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [aneeStudents]);

  // Gráfico 4: Faixa Etária por Condição
  const faixaEtariaData = useMemo(() => {
    const faixas = {
      '0-3 anos': { faixa: '0-3 anos', TEA: 0, TDAH: 0, Down: 0, PC: 0, DI: 0, Epilepsia: 0, TOD: 0, Outras: 0 },
      '4-5 anos': { faixa: '4-5 anos', TEA: 0, TDAH: 0, Down: 0, PC: 0, DI: 0, Epilepsia: 0, TOD: 0, Outras: 0 },
      '6-10 anos': { faixa: '6-10 anos', TEA: 0, TDAH: 0, Down: 0, PC: 0, DI: 0, Epilepsia: 0, TOD: 0, Outras: 0 },
      '11-14 anos': { faixa: '11-14 anos', TEA: 0, TDAH: 0, Down: 0, PC: 0, DI: 0, Epilepsia: 0, TOD: 0, Outras: 0 },
      '15+ anos': { faixa: '15+ anos', TEA: 0, TDAH: 0, Down: 0, PC: 0, DI: 0, Epilepsia: 0, TOD: 0, Outras: 0 },
      'Não informada': { faixa: 'Não informada', TEA: 0, TDAH: 0, Down: 0, PC: 0, DI: 0, Epilepsia: 0, TOD: 0, Outras: 0 }
    };

    aneeStudents.forEach(s => {
      let fKey: keyof typeof faixas = 'Não informada';
      if (s.age !== null && s.age !== undefined) {
        const age = s.age;
        if (age <= 3) fKey = '0-3 anos';
        else if (age <= 5) fKey = '4-5 anos';
        else if (age <= 10) fKey = '6-10 anos';
        else if (age <= 14) fKey = '11-14 anos';
        else fKey = '15+ anos';
      }

      const cond = s.condicao || 'Outras';
      if (cond === 'TEA') faixas[fKey].TEA++;
      else if (cond === 'TDAH') faixas[fKey].TDAH++;
      else if (cond === 'Síndrome de Down') faixas[fKey].Down++;
      else if (cond === 'Paralisia Cerebral') faixas[fKey].PC++;
      else if (cond === 'Deficiência Intelectual') faixas[fKey].DI++;
      else if (cond === 'Epilepsia') faixas[fKey].Epilepsia++;
      else if (cond === 'TOD') faixas[fKey].TOD++;
      else faixas[fKey].Outras++;
    });

    return Object.values(faixas);
  }, [aneeStudents]);

  // --- Handlers ---
  
  const handleViewDetails = (reportId: string) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setSelectedReport(reportId);
    setIsModalOpen(true);
  };

  const handleSpecializedExport = async (reportType: string) => {
    try {
      console.log('[PDF] Iniciando exportação do tipo:', reportType);
      
      const configTimbradoAtual = papelTimbrado || await SupabaseService.getPapelTimbradoConfig();

      switch(reportType) {
        case 'completo': 
          await exportRelatorioCompletoTEAPDF(teaStudents, configTimbradoAtual); 
          break;
        case 'confirmados': 
          await exportRelatorioConfirmadosTEAPDF(teaStudents.filter(s => s.finalStatus === 'Confirmado'), configTimbradoAtual); 
          break;
        case 'suspeitos': 
          await exportRelatorioSuspeitosTEAPDF(teaStudents.filter(s => s.finalStatus === 'Suspeito'), configTimbradoAtual); 
          break;
        case 'escola': 
          await exportRelatorioPorEscolaTEAPDF(teaStudents, configTimbradoAtual); 
          break;
        case 'contato': 
          await exportRelatorioContatoTEAPDF(teaStudents, configTimbradoAtual); 
          break;
        case 'bairro': 
          await exportRelatorioPorBairroPDF(teaStudents, configTimbradoAtual); 
          break;
        case 'anee_geral': 
          await exportRelatorioGeralANEEPDF(aneeStudents, configTimbradoAtual); 
          break;
        case 'tdah': 
          await exportRelatorioTDAHPDF(tdahStudents, configTimbradoAtual); 
          break;
        case 'down': 
          await exportRelatorioDownPDF(downStudents, configTimbradoAtual); 
          break;
        case 'pc': 
          await exportRelatorioParalisiaCerebralPDF(pcStudents, configTimbradoAtual); 
          break;
        case 'di': 
          await exportRelatorioDeficienciaIntelectualPDF(diStudents, configTimbradoAtual); 
          break;
        default:
          console.error('[PDF] Tipo não reconhecido para geração:', reportType);
      }
      toastSuccess('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('[PDF] ERRO DETALHADO:', error);
      toastError('Erro ao gerar PDF. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      {/* Header Area */}
      <div className="max-w-7xl mx-auto mb-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <Award className="text-[#8B1A3A]" size={32} />
              Painel de Educação Especial
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2 text-sm">
              <Users size={16} />
              Monitoramento Unificado de Alunos ANEE (TEA, TDAH, Down, PC, DI)
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
        
        {/* ================= SEÇÃO DE CARDS SUPERIORES ================= */}
        
        {/* Linha 1: Consolidados da Educação Especial (ANEE) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="text-[#8B1A3A] shrink-0" size={18} />
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-tight">Consolidado Geral ANEE</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard 
              title="Total Alunos ANEE"
              value={aneeStudents.length}
              trend={`${aneeMetrics.percentual}% da rede`}
              icon={Users}
              color={CORES_INDICADORES.totalAnee}
              bgLight={`${CORES_INDICADORES.totalAnee}10`}
              onClick={() => { setFilterCondicao('todos'); setFilterStatus('todos'); }}
              active={filterCondicao === 'todos' && filterStatus === 'todos'}
            />
            <MetricCard 
              title="% ANEE na Rede"
              value={`${aneeMetrics.percentual}%`}
              trend={`de ${totalGeralAlunos} alunos`}
              icon={TrendingUp}
              color={CORES_INDICADORES.percentualAnee}
              bgLight={`${CORES_INDICADORES.percentualAnee}10`}
              active={false}
            />
            <MetricCard 
              title="TDAH"
              value={tdahStudents.length}
              trend={`${tdahStudents.filter(s => s.finalStatus === 'Confirmado').length} confirmados`}
              icon={Activity}
              color={CORES_CONDICAO['TDAH']}
              bgLight={CORES_LIGHT_CONDICAO['TDAH']}
              onClick={() => { setFilterCondicao('TDAH'); setFilterStatus('todos'); }}
              active={filterCondicao === 'TDAH'}
            />
            <MetricCard 
              title="Síndrome de Down"
              value={downStudents.length}
              trend={`${downStudents.filter(s => s.finalStatus === 'Confirmado').length} confirmados`}
              icon={Award}
              color={CORES_CONDICAO['Síndrome de Down']}
              bgLight={CORES_LIGHT_CONDICAO['Síndrome de Down']}
              onClick={() => { setFilterCondicao('Síndrome de Down'); setFilterStatus('todos'); }}
              active={filterCondicao === 'Síndrome de Down'}
            />
            <MetricCard 
              title="Paralisia Cerebral"
              value={pcStudents.length}
              trend={`${pcStudents.filter(s => s.finalStatus === 'Confirmado').length} confirmados`}
              icon={Layers}
              color={CORES_CONDICAO['Paralisia Cerebral']}
              bgLight={CORES_LIGHT_CONDICAO['Paralisia Cerebral']}
              onClick={() => { setFilterCondicao('Paralisia Cerebral'); setFilterStatus('todos'); }}
              active={filterCondicao === 'Paralisia Cerebral'}
            />
          </div>
        </div>

        <Separator className="my-2" />

        {/* Linha 2: Monitoramento Específico TEA */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="shrink-0" style={{ color: CORES_CONDICAO['TEA'] }} size={18} />
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-tight">Monitoramento TEA</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              title="Total de Alunos TEA"
              value={teaMetrics.total}
              trend={`${teaMetrics.percentual}% da rede`}
              icon={Users}
              color={CORES_CONDICAO['TEA']}
              bgLight={CORES_LIGHT_CONDICAO['TEA']}
              onClick={() => { setFilterCondicao('TEA'); setFilterStatus('todos'); }}
              active={filterCondicao === 'TEA' && filterStatus === 'todos'}
            />
            <MetricCard 
              title="TEA Confirmados"
              value={teaMetrics.confirmados}
              trend="com laudo clínico"
              icon={CheckCircle}
              color={CORES_INDICADORES.percentualAnee}
              bgLight={`${CORES_INDICADORES.percentualAnee}10`}
              onClick={() => { setFilterCondicao('TEA'); setFilterStatus('confirmado'); }}
              active={filterCondicao === 'TEA' && filterStatus === 'confirmado'}
            />
            <MetricCard 
              title="Casos TEA Suspeitos"
              value={teaMetrics.suspeitos}
              trend="aguardando laudo"
              icon={AlertCircle}
              color={CORES_INDICADORES.suspeitos}
              bgLight={`${CORES_INDICADORES.suspeitos}10`}
              onClick={() => { setFilterCondicao('TEA'); setFilterStatus('suspeito'); }}
              active={filterCondicao === 'TEA' && filterStatus === 'suspeito'}
            />
            <MetricCard 
              title="% de TEA na Rede"
              value={`${teaMetrics.percentual}%`}
              trend={`de ${totalGeralAlunos} alunos`}
              icon={TrendingUp}
              color={CORES_CONDICAO['TEA']}
              bgLight={CORES_LIGHT_CONDICAO['TEA']}
              active={false}
            />
          </div>
        </div>

        <Separator className="my-2" />

        {/* ================= ANÁLISE GRÁFICA ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gráfico 1: Distribuição por Tipo de Condição — barras horizontais com label interno */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <BarChartIcon size={18} className="text-[#8B1A3A]" />
              <h3 className="text-sm font-medium tracking-tight text-gray-800">Distribuição por Condição</h3>
            </div>
            <div className="flex-1" style={{ minHeight: '280px' }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  layout="vertical"
                  data={distribuicaoData}
                  margin={{ top: 4, right: 36, left: 16, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={108}
                    tick={{ fontSize: 10, fill: '#374151', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" name="Alunos" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={true}>
                    {distribuicaoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="insideRight"
                      style={{ fontSize: '10px', fontWeight: 700, fill: '#fff' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Proporção entre Condições — pizza com label externo % */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <PieChartIcon size={18} className="text-[#8B1A3A]" />
              <h3 className="text-sm font-medium tracking-tight text-gray-800">Proporção entre Condições</h3>
            </div>
            <div style={{ minHeight: '200px' }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={proporcaoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={true}
                    label={({ name, percent }) =>
                      percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                  >
                    {proporcaoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <CustomPieLegend data={proporcaoData} />
          </div>

          {/* Gráfico 3: Top 5 Escolas — barras agrupadas com animação */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <School size={18} className="text-[#8B1A3A]" />
              <h3 className="text-sm font-medium tracking-tight text-gray-800">Top 5 Unidades Escolares ANEE</h3>
            </div>
            <div style={{ minHeight: '280px' }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={schoolData}
                  margin={{ top: 10, right: 8, left: -28, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="escola" tick={{ fontSize: 8, fill: '#9ca3af', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar dataKey="TEA" stackId="a" fill={CORES_CONDICAO['TEA']} isAnimationActive={true} />
                  <Bar dataKey="TDAH" stackId="a" fill={CORES_CONDICAO['TDAH']} isAnimationActive={true} />
                  <Bar dataKey="Down" name="S. Down" stackId="a" fill={CORES_CONDICAO['Síndrome de Down']} isAnimationActive={true} />
                  <Bar dataKey="PC" name="P. Cerebral" stackId="a" fill={CORES_CONDICAO['Paralisia Cerebral']} isAnimationActive={true} />
                  <Bar dataKey="DI" name="Def. Intelectual" stackId="a" fill={CORES_CONDICAO['Deficiência Intelectual']} isAnimationActive={true} />
                  <Bar dataKey="Epilepsia" stackId="a" fill={CORES_CONDICAO['Epilepsia']} isAnimationActive={true} />
                  <Bar dataKey="TOD" stackId="a" fill={CORES_CONDICAO['TOD']} isAnimationActive={true} />
                  <Bar dataKey="Outras" stackId="a" fill={CORES_CONDICAO['Outras']} isAnimationActive={true} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 4: Faixa Etária — barras empilhadas com animação e "Não informada" */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <Calendar size={18} className="text-[#8B1A3A]" />
              <h3 className="text-sm font-medium tracking-tight text-gray-800">Faixas Etárias por Condição</h3>
            </div>
            <div style={{ minHeight: '280px' }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={faixaEtariaData}
                  margin={{ top: 10, right: 8, left: -28, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="faixa" tick={{ fontSize: 8, fill: '#9ca3af', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar dataKey="TEA" stackId="a" fill={CORES_CONDICAO['TEA']} isAnimationActive={true} />
                  <Bar dataKey="TDAH" stackId="a" fill={CORES_CONDICAO['TDAH']} isAnimationActive={true} />
                  <Bar dataKey="Down" name="S. Down" stackId="a" fill={CORES_CONDICAO['Síndrome de Down']} isAnimationActive={true} />
                  <Bar dataKey="PC" name="P. Cerebral" stackId="a" fill={CORES_CONDICAO['Paralisia Cerebral']} isAnimationActive={true} />
                  <Bar dataKey="DI" name="Def. Intelectual" stackId="a" fill={CORES_CONDICAO['Deficiência Intelectual']} isAnimationActive={true} />
                  <Bar dataKey="Epilepsia" stackId="a" fill={CORES_CONDICAO['Epilepsia']} isAnimationActive={true} />
                  <Bar dataKey="TOD" stackId="a" fill={CORES_CONDICAO['TOD']} isAnimationActive={true} />
                  <Bar dataKey="Outras" stackId="a" fill={CORES_CONDICAO['Outras']} isAnimationActive={true} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1 italic">* Coluna "Não informada" inclui alunos sem data de nascimento cadastrada</p>
          </div>

        </div>

        {/* Insight Card */}
        <div className="bg-[#8B1A3A]/5 border border-[#8B1A3A]/10 p-5 rounded-2xl flex items-start gap-4 animate-pulse">
          <TrendingUp className="text-[#8B1A3A] mt-1 shrink-0" size={24} />
          <div>
            <h4 className="text-sm font-black text-[#8B1A3A] uppercase tracking-wide">Direcionamento Estratégico Municipal</h4>
            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              O monitoramento geográfico e demográfico unificado de alunos ANEE apoia a Secretaria Municipal de Educação
              na alocação direcionada de Profissionais de Apoio Escolar e no planejamento pedagógico inclusivo das unidades.
            </p>
          </div>
        </div>

        {/* ================= CENTRAL DE RELATÓRIOS ================= */}
        <div className="bg-slate-100/50 p-6 rounded-3xl border border-slate-200 shadow-inner space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-[#8B1A3A] rounded-full"/>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">
              Central de Relatórios Municipais
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* CARD RELATÓRIO GERAL ANEE */}
            <ReportCard 
              title="Relatório Geral ANEE"
              description="Visão consolidada de toda a rede de Educação Especial (todos os diagnósticos)."
              icon={FileText}
              color={CORES_INDICADORES.totalAnee}
              badge={aneeStudents.length}
              chartType="pie"
              chartData={distribuicaoData}
              onViewDetails={() => handleViewDetails('anee_geral')}
              onExportPDF={() => handleSpecializedExport('anee_geral')}
            />

            {/* CARD COMPLETO TEA */}
            <ReportCard 
              title="Relatório Completo TEA"
              description="Visão consolidada de todos os alunos TEA (confirmados e suspeitos) cadastrados."
              icon={FileText}
              color={CORES_CONDICAO['TEA']}
              badge={teaMetrics.total}
              chartType="pie"
              chartData={[
                { name: 'Confirmados', value: teaMetrics.confirmados, color: CORES_INDICADORES.percentualAnee },
                { name: 'Suspeitos', value: teaMetrics.suspeitos, color: CORES_INDICADORES.suspeitos }
              ]}
              onViewDetails={() => handleViewDetails('completo')}
              onExportPDF={() => handleSpecializedExport('completo')}
            />

            {/* CARD TEA CONFIRMADOS */}
            <ReportCard 
              title="TEA Confirmados"
              description="Listagem exclusiva de alunos TEA com laudo médico validado no sistema."
              icon={CheckCircle}
              color={CORES_INDICADORES.percentualAnee}
              badge={teaMetrics.confirmados}
              chartType="pie"
              chartData={[{ name: 'Confirmado', value: teaMetrics.confirmados, color: CORES_INDICADORES.percentualAnee }]}
              onViewDetails={() => handleViewDetails('confirmados')}
              onExportPDF={() => handleSpecializedExport('confirmados')}
            />

            {/* CARD TDAH */}
            <ReportCard 
              title="Relatório TDAH"
              description="Alunos com Transtorno de Déficit de Atenção e Hiperatividade cadastrados."
              icon={Activity}
              color={CORES_CONDICAO['TDAH']}
              badge={tdahStudents.length}
              chartType="bar"
              chartData={[{ name: 'TDAH', value: tdahStudents.length, color: CORES_CONDICAO['TDAH'] }]}
              onViewDetails={() => handleViewDetails('tdah')}
              onExportPDF={() => handleSpecializedExport('tdah')}
            />

            {/* CARD SÍNDROME DE DOWN */}
            <ReportCard 
              title="Síndrome de Down"
              description="Consolidado de alunos com Trissomia do 21 / Síndrome de Down."
              icon={Award}
              color={CORES_CONDICAO['Síndrome de Down']}
              badge={downStudents.length}
              chartType="bar"
              chartData={[{ name: 'Down', value: downStudents.length, color: CORES_CONDICAO['Síndrome de Down'] }]}
              onViewDetails={() => handleViewDetails('down')}
              onExportPDF={() => handleSpecializedExport('down')}
            />

            {/* CARD PARALISIA CEREBRAL */}
            <ReportCard 
              title="Paralisia Cerebral"
              description="Lista de alunos da rede identificados com quadro de Paralisia Cerebral."
              icon={Layers}
              color={CORES_CONDICAO['Paralisia Cerebral']}
              badge={pcStudents.length}
              chartType="bar"
              chartData={[{ name: 'PC', value: pcStudents.length, color: CORES_CONDICAO['Paralisia Cerebral'] }]}
              onViewDetails={() => handleViewDetails('pc')}
              onExportPDF={() => handleSpecializedExport('pc')}
            />

            {/* CARD DEFICIÊNCIA INTELECTUAL */}
            <ReportCard 
              title="Deficiência Intelectual"
              description="Monitoramento de alunos com diagnóstico/suspeita de Deficiência Intelectual."
              icon={AlertCircle}
              color={CORES_CONDICAO['Deficiência Intelectual']}
              badge={diStudents.length}
              chartType="bar"
              chartData={[{ name: 'DI', value: diStudents.length, color: CORES_CONDICAO['Deficiência Intelectual'] }]}
              onViewDetails={() => handleViewDetails('di')}
              onExportPDF={() => handleSpecializedExport('di')}
            />

            {/* CARD DISTRIBUIÇÃO POR ESCOLA */}
            <ReportCard 
              title="Distribuição por Escola"
              description="Análise quantitativa de alunos TEA distribuídos pelas unidades municipais."
              icon={School}
              color={CORES_INDICADORES.totalAnee}
              badge={schoolData.length > 0 ? `Total: ${schoolData.length} Escolas` : 'Top 5'}
              chartType="bar"
              chartData={schoolData.map(e => ({ name: e.escola, value: e.total, color: CORES_INDICADORES.totalAnee }))}
              onViewDetails={() => handleViewDetails('escola')}
              onExportPDF={() => handleSpecializedExport('escola')}
            />

            {/* CARD CONTATOS */}
            <ReportCard 
              title="Lista de Contato Rápido"
              description="Relatório com telefones e responsáveis para comunicação com famílias TEA."
              icon={Phone}
              color={CORES_CONDICAO['Outras']}
              badge="Contatos"
              chartType="bar"
              chartData={schoolData.map(d => ({ name: d.escola, value: d.total, color: CORES_CONDICAO['Outras'] }))}
              onViewDetails={() => handleViewDetails('contato')}
              onExportPDF={() => handleSpecializedExport('contato')}
            />

          </div>
        </div>

        {/* ================= LISTA NOMINAL DE ALUNOS ANEE ================= */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-8">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users size={20} className="text-[#8B1A3A]" />
                Relação Nominal de Alunos ANEE
              </h3>
              
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Busca */}
                <div className="relative flex-1 min-w-[200px] lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Buscar por nome ou escola..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8B1A3A]/20 focus:border-[#8B1A3A] transition-all"
                  />
                </div>

                {/* Filtro por Condição (Exclusivo da Educação Especial) */}
                <div className="relative">
                  <select
                    value={filterCondicao}
                    onChange={(e) => setFilterCondicao(e.target.value)}
                    className="pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-bold focus:ring-2 focus:ring-[#8B1A3A]/20 focus:border-[#8B1A3A] transition-all appearance-none cursor-pointer"
                  >
                    <option value="todos">TODAS AS CONDIÇÕES</option>
                    <option value="TEA">TEA</option>
                    <option value="TDAH">TDAH</option>
                    <option value="Síndrome de Down">DOWN</option>
                    <option value="Paralisia Cerebral">PARALISIA CEREBRAL</option>
                    <option value="Deficiência Intelectual">DEF. INTELECTUAL</option>
                    <option value="Epilepsia">EPILEPSIA</option>
                    <option value="TOD">TOD</option>
                    <option value="Outras">OUTRAS CONDIÇÕES</option>
                  </select>
                  <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                </div>

                {/* Filtro de Status */}
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                  {(['todos', 'confirmado', 'suspeito'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
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
                  <th className="px-6 py-4">Status / Condição</th>
                  <th className="px-6 py-4">Laudo Médico</th>
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
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-slate-150 relative bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                            {student.photoUrl ? (
                              <img 
                                src={student.photoUrl} 
                                alt={student.fullName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : student.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{student.fullName}</p>
                            <p className="text-xs text-gray-500">
                              {student.age !== null ? `Idade: ${student.age} anos` : 'Idade não informada'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <School size={14} className="text-gray-400" />
                          <div>
                            <p className="font-semibold text-gray-700">{student.school?.schoolName || 'Não vinculada'}</p>
                            {student.unit && <p className="text-[10px] text-gray-400 uppercase tracking-wider">{student.unit}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={student.finalStatus === 'Confirmado' ? 'success' : 'warning'}>
                              {student.finalStatus}
                            </Badge>
                            {student.condicao && (
                              <Badge
                                style={{ 
                                  backgroundColor: CORES_LIGHT_CONDICAO[student.condicao] || '#f3f4f6', 
                                  color: CORES_CONDICAO[student.condicao] || '#6b7280', 
                                  borderColor: (CORES_CONDICAO[student.condicao] || '#6b7280') + '40'
                                }}
                                variant="outline"
                              >
                                {student.condicao}
                              </Badge>
                            )}
                          </div>
                          {(student.clinical?.cid || student.cid) && (
                            <span className="text-[10px] font-mono text-gray-400 ml-1 font-bold">CID: {student.clinical?.cid || student.cid}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(student.clinical?.laudo || student.finalStatus === 'Confirmado') ? (
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <CheckCircle size={14} />
                            <span className="text-xs font-semibold">Anexado no Prontuário</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-500">
                            <AlertCircle size={14} />
                            <span className="text-xs font-semibold">Pendente</span>
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
                        <p className="text-sm font-semibold">Nenhum aluno encontrado com esses filtros.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Total de registros listados: <span className="font-bold text-gray-600">{filteredStudents.length}</span>
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
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(6px)',
            padding: '16px'
          }}
          onClick={() => { setIsModalOpen(false); setSelectedReport(null); }}
        >
          <div
            style={{
              background: 'white',
              width: '100%',
              maxWidth: '960px',
              maxHeight: '88vh',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#8B1A3A] text-white sticky top-0 z-10 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-wide">
                  <FileText size={20} />
                  {selectedReport === 'anee_geral' && 'Detalhamento Geral ANEE'}
                  {selectedReport === 'completo' && 'Detalhamento TEA Completo'}
                  {selectedReport === 'confirmados' && 'Detalhamento TEA Confirmados'}
                  {selectedReport === 'suspeitos' && 'Detalhamento TEA Suspeitos'}
                  {selectedReport === 'tdah' && 'Detalhamento de Alunos com TDAH'}
                  {selectedReport === 'down' && 'Detalhamento de Alunos com Síndrome de Down'}
                  {selectedReport === 'pc' && 'Detalhamento de Alunos com Paralisia Cerebral'}
                  {selectedReport === 'di' && 'Detalhamento de Alunos com Deficiência Intelectual'}
                  {selectedReport === 'escola' && 'Detalhamento TEA por Unidade'}
                  {selectedReport === 'contato' && 'Lista de Contato Especializada'}
                  {selectedReport === 'bairro' && 'Distribuição Geográfica por Bairro'}
                </h2>
                <p className="text-white/70 text-xs mt-0.5">Visualização detalhada dos registros ativos para auditoria</p>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); setSelectedReport(null); }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b-2 border-gray-150 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="pb-3 px-4">Aluno</th>
                    {selectedReport !== 'escola' && <th className="pb-3 px-4">Unidade Escolar</th>}
                    {selectedReport === 'escola' && <th className="pb-3 px-4">Unidade</th>}
                    {(selectedReport === 'contato' || selectedReport === 'completo' || selectedReport === 'bairro' || selectedReport === 'anee_geral') && <th className="pb-3 px-4">Responsável / Fone</th>}
                    {selectedReport === 'bairro' && <th className="pb-3 px-4">Bairro</th>}
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4 text-right">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    let displayData: any[] = [];
                    if (selectedReport === 'confirmados') displayData = teaStudents.filter(s => s.finalStatus === 'Confirmado');
                    else if (selectedReport === 'suspeitos') displayData = teaStudents.filter(s => s.finalStatus === 'Suspeito');
                    else if (selectedReport === 'anee_geral') displayData = aneeStudents;
                    else if (selectedReport === 'tdah') displayData = tdahStudents;
                    else if (selectedReport === 'down') displayData = downStudents;
                    else if (selectedReport === 'pc') displayData = pcStudents;
                    else if (selectedReport === 'di') displayData = diStudents;
                    else if (selectedReport === 'escola') {
                      // Achata alunos por escola
                      const tempMap: Record<string, any> = {};
                      teaStudents.forEach(s => {
                        const sName = s.school?.schoolName || 'Não vinculada';
                        if (!tempMap[sName]) tempMap[sName] = { escola: sName, alunos: [] };
                        tempMap[sName].alunos.push(s);
                      });
                      displayData = Object.values(tempMap).flatMap(e => 
                        e.alunos.map((a: any) => ({
                          fullName: a.fullName,
                          school: { schoolName: e.escola },
                          finalStatus: a.finalStatus,
                          cid: a.clinical?.cid || a.cid
                        }))
                      );
                    } else if (selectedReport === 'bairro') {
                      displayData = teaStudents;
                    } else {
                      displayData = teaStudents; // Default Completo TEA
                    }

                    if (displayData.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-3 text-gray-400">
                              <Search size={32} className="text-gray-300" />
                              <p className="text-sm font-semibold">Nenhum registro encontrado para este relatório.</p>
                              <p className="text-xs">Não há dados cadastrados nesta categoria com os filtros atuais.</p>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return displayData.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-bold text-gray-900">{s.fullName}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs text-gray-600">
                            {s.school?.schoolName || s.schoolName || 'Não vinculada'}
                            {s.unit && <span className="text-[9px] block text-gray-400 font-bold uppercase">{s.unit}</span>}
                          </span>
                        </td>
                        {(selectedReport === 'contato' || selectedReport === 'completo' || selectedReport === 'bairro' || selectedReport === 'anee_geral') && (
                          <td className="py-3.5 px-4 text-xs text-gray-500">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-gray-700">{s.responsavel || 'Não informado'}</span>
                              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                <Phone size={10} />
                                {s.telefone || 'Não informado'}
                              </div>
                            </div>
                          </td>
                        )}
                        {selectedReport === 'bairro' && (
                          <td className="py-3.5 px-4 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <MapPin size={12} className="text-gray-400" />
                              {s.bairro || 'Não informado'}
                            </div>
                          </td>
                        )}
                        <td className="py-3.5 px-4">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            s.finalStatus === 'Confirmado' || s.status === 'Confirmado' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {(s.finalStatus || s.status || '').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-mono text-gray-400 font-bold">
                              {s.clinical?.cid || s.cid || 'PENDENTE'}
                            </span>
                            {s.condicao && (
                              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                {s.condicao}
                              </span>
                            )}
                          </div>
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
                className="px-5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-all border border-gray-200"
              >
                Fechar
              </button>
              <button 
                onClick={() => {
                  if (selectedReport) handleSpecializedExport(selectedReport);
                }}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#8B1A3A] hover:bg-[#6D142E] rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                <FileDown size={14} />
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
