import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, Search, Filter, Loader2, RefreshCcw } from 'lucide-react';
import { AuditLog, User, canViewSystemAuditLogs } from '../types';
import { SupabaseService } from '../services/SupabaseService';

interface AuditLogsProps {
    currentUser: User;
}

export function AuditLogs({ currentUser }: AuditLogsProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Filtros
    const [filterModule, setFilterModule] = useState<string>('');
    const [filterAction, setFilterAction] = useState<string>('');
    const [filterDate, setFilterDate] = useState<string>('');

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await SupabaseService.getAuditLogs({
                user: searchTerm,
                module: filterModule || undefined,
                action: filterAction || undefined,
                date: filterDate || undefined
            });
            setLogs(data);
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, filterModule, filterAction, filterDate]);

    // Obter opções únicas para filtros baseados nos dados atuais ajuda, mas no banco podem ter mais.
    // Vamos deixar aberto ou usar os que já carregaram se não quisermos fazer queries distintas.
    const uniqueModules = useMemo(() => Array.from(new Set(logs.map(log => log.module))).filter(Boolean).sort(), [logs]);
    const uniqueActions = useMemo(() => Array.from(new Set(logs.map(log => log.action))).filter(Boolean).sort(), [logs]);

    if (!canViewSystemAuditLogs(currentUser)) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900/30">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Acesso Negado</h2>
                <p className="text-gray-500 dark:text-gray-400">Você não tem permissão para visualizar os logs de auditoria do sistema.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldAlert className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                        Auditoria do Sistema
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Registro de atividades críticas e alterações no sistema
                    </p>
                </div>
                <button
                    onClick={fetchLogs}
                    disabled={isLoading}
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                    title="Atualizar"
                >
                    <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Buscar por Usuário</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Nome ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Módulo</label>
                        <div className="relative">
                            <select
                                value={filterModule}
                                onChange={(e) => setFilterModule(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                            >
                                <option value="">Todos os Módulos</option>
                                {uniqueModules.map(mod => (
                                    <option key={mod} value={mod}>{mod}</option>
                                ))}
                                {/* Fallbacks in case records don't exist yet but we want them in dropdown */}
                                {!uniqueModules.includes('ALUNOS') && <option value="ALUNOS">ALUNOS</option>}
                                {!uniqueModules.includes('AGENDAMENTOS') && <option value="AGENDAMENTOS">AGENDAMENTOS</option>}
                                {!uniqueModules.includes('USUARIOS') && <option value="USUARIOS">USUARIOS</option>}
                                {!uniqueModules.includes('SISTEMA') && <option value="SISTEMA">SISTEMA</option>}
                            </select>
                            <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ação</label>
                        <div className="relative">
                            <select
                                value={filterAction}
                                onChange={(e) => setFilterAction(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                            >
                                <option value="">Todas as Ações</option>
                                <option value="LOGIN">LOGIN</option>
                                <option value="CRIAR">CRIAR</option>
                                <option value="EDITAR">EDITAR</option>
                                <option value="EXCLUIR">EXCLUIR</option>
                                <option value="CANCELAR">CANCELAR</option>
                            </select>
                            <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data Específica</label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <th className="p-4">Data/Hora</th>
                                <th className="p-4">Usuário</th>
                                <th className="p-4">Perfil</th>
                                <th className="p-4">Ação</th>
                                <th className="p-4">Módulo</th>
                                <th className="p-4">Registro Afetado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                                        Buscando logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        Nenhum log de auditoria encontrado com os filtros atuais.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                        <td className="p-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {log.user}
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md text-xs font-medium">
                                                {log.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm">
                                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${log.action === 'CRIAR' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                log.action === 'EDITAR' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    log.action === 'EXCLUIR' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        log.action === 'LOGIN' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-gray-900 dark:text-gray-300">
                                            {log.module}
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={log.affected_record}>
                                            {log.affected_record}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
