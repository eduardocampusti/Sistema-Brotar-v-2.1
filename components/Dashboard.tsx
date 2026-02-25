import React, { useMemo } from 'react';
import { Student, Specialty, User } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Users, AlertCircle, CheckCircle } from 'lucide-react';
import { WelcomeHeader } from './WelcomeHeader';

interface DashboardProps {
  students: Student[];
  currentUser?: User;
}

const COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b'];

export const Dashboard: React.FC<DashboardProps> = ({ students, currentUser }) => {
  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter(p => p.status === 'Active').length;

    // Simulate distribution for demo purposes based on random logic or real data
    const diagnosisCounts: Record<string, number> = {};
    students.forEach(p => {
      const key = p.clinical.diagnosis.split(' ')[0] || 'Outros';
      diagnosisCounts[key] = (diagnosisCounts[key] || 0) + 1;
    });

    const diagnosisData = Object.keys(diagnosisCounts).map(name => ({
      name, value: diagnosisCounts[name]
    }));

    // Mock demand for professionals
    const demandData = [
      { name: Specialty.PSYCHOLOGY, demand: Math.floor(total * 0.8) },
      { name: Specialty.PSYCHOPEDAGOGY, demand: Math.floor(total * 0.6) },
      { name: Specialty.SOCIAL_WORK, demand: Math.floor(total * 0.4) },
    ];

    return { total, active, diagnosisData, demandData };
  }, [students]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {currentUser ? (
        <WelcomeHeader
          name={currentUser.name.split(' ')[0]}
          subtitle="Acompanhe a visão geral do sistema hoje."
        />
      ) : (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Painel de Controle</h2>
          <p className="text-slate-500">Visão geral do centro de especialidades</p>
        </div>
      )}

      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total de Alunos</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Atendimentos Ativos</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{stats.active}</p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Aguardando Avaliação</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total - stats.active}</p>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagnosis Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Diagnósticos Recorrentes</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={stats.diagnosisData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.diagnosisData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Professional Demand */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Demanda por Especialidade</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={stats.demandData}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="demand" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};