

import React, { useState, useRef, useEffect } from 'react';
import { User, hasPermission } from '../types';
import { BackupService, BackupData } from '../services/backupService';
import { Download, Upload, CheckCircle, AlertTriangle, Shield, Database, Save, RefreshCw, X, CheckSquare, Square, History, HardDrive, Clock, Trash2, ChevronRight, Activity, School, Lock } from 'lucide-react';

interface BackupSystemProps {
    currentUser: User;
}

export const BackupSystem: React.FC<BackupSystemProps> = ({ currentUser }) => {
    // Controle de Abas
    const [activeTab, setActiveTab] = useState<'overview' | 'snapshots'>('overview');

    // Estados de Dados
    const [snapshots, setSnapshots] = useState<BackupData[]>([]);
    const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null);
    const [storageUsage, setStorageUsage] = useState<number>(0);

    // Estados de Restauração
    const [pendingRestoreData, setPendingRestoreData] = useState<BackupData | null>(null);
    const [snapshotName, setSnapshotName] = useState('');

    // Estados de Feedback e UI
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Checkboxes de Módulos para Restauração
    const [selectedModules, setSelectedModules] = useState({
        users: true,
        schools: true,
        students: true,
        supportProfessionals: true
    });

    // VERIFICAÇÃO DE SEGURANÇA: Apenas quem tem permissão explícita
    if (!hasPermission(currentUser, 'can_access_security_data')) {
        return (
            <div className="max-w-4xl mx-auto mt-10 p-8 bg-red-50 rounded-2xl border border-red-100 text-center animate-fadeIn">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock size={40} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-red-700 mb-2">Acesso Restrito</h2>
                <p className="text-red-600 max-w-md mx-auto">
                    O módulo de Segurança de Dados e Backups é exclusivo para Administradores Gerais do sistema.
                    Por favor, contate o gestor responsável se precisar realizar uma restauração.
                </p>
            </div>
        );
    }

    // Carregamento Inicial
    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        try {
            const list = BackupService.getLocalSnapshots();
            setSnapshots(list);
            setLastBackupDate(BackupService.getLastBackupDate());
            setStorageUsage(BackupService.getStorageUsageEstimate());
        } catch (e) {
            console.error("Erro ao carregar dados de backup:", e);
        }
    };

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        // Limpa erro após 8 segundos para dar tempo de ler mensagens longas
        setTimeout(() => setFeedback(null), 8000);
    };

    // --- AÇÕES ---

    const handleCreateSnapshot = async () => {
        if (!snapshotName.trim()) {
            showFeedback('error', 'Por favor, dê um nome para identificar o ponto de restauração.');
            return;
        }

        setIsLoading(true);
        try {
            await BackupService.createLocalSnapshot(currentUser, snapshotName);
            showFeedback('success', 'Ponto de restauração salvo com sucesso e persistido!');
            setSnapshotName('');
            refreshData(); // Atualiza a lista imediatamente
            setActiveTab('snapshots'); // Leva o usuário para a lista para confirmar visualmente
        } catch (err: any) {
            showFeedback('error', err.message || 'Erro crítico ao salvar snapshot.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSnapshot = (id: string) => {
        if (confirm('Atenção: Esta ação é irreversível. Tem certeza que deseja excluir este backup?')) {
            try {
                BackupService.deleteSnapshot(id);
                refreshData();
                showFeedback('success', 'Backup removido com segurança.');
            } catch (err: any) {
                showFeedback('error', 'Erro ao excluir backup.');
            }
        }
    };

    const handleDownloadFile = async () => {
        try {
            const data = await BackupService.generateBackupData(currentUser, 'MANUAL_FILE');
            BackupService.downloadBackupFile(data);
            showFeedback('success', 'Arquivo de backup gerado e download iniciado.');
        } catch (err) {
            showFeedback('error', 'Erro ao gerar o arquivo de backup.');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            const data = await BackupService.validateBackupFile(file);
            setPendingRestoreData(data); // Abre o modal de seleção de módulos
            // Reset input para permitir selecionar o mesmo arquivo novamente se falhar
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) {
            showFeedback('error', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestoreClick = (data: BackupData) => {
        setPendingRestoreData(data);
    };

    const confirmRestore = async () => {
        if (!pendingRestoreData) return;

        const modulesToRestore = Object.keys(selectedModules).filter(
            key => selectedModules[key as keyof typeof selectedModules]
        );

        if (modulesToRestore.length === 0) {
            showFeedback('error', 'Selecione pelo menos um módulo para restaurar.');
            return;
        }

        setIsLoading(true);

        try {
            await BackupService.restoreModules(pendingRestoreData, modulesToRestore);
            showFeedback('success', 'Dados restaurados com sucesso! O sistema será reiniciado em 3 segundos...');

            // Recarrega a página para garantir que os dados do LocalStorage sejam lidos novamente pela aplicação
            setTimeout(() => window.location.reload(), 3000);
        } catch (err) {
            console.error(err);
            showFeedback('error', 'Falha crítica na restauração. Verifique o console ou tente novamente.');
            setIsLoading(false);
        }
    };

    // --- CÁLCULO DE SAÚDE DO SISTEMA ---
    const getSystemHealth = () => {
        if (!lastBackupDate) return { status: 'Critical', color: 'text-red-500', bg: 'bg-red-50', label: 'Risco: Nenhum backup detectado' };

        const daysSince = Math.floor((new Date().getTime() - lastBackupDate.getTime()) / (1000 * 3600 * 24));

        if (daysSince > 7) return { status: 'Warning', color: 'text-orange-500', bg: 'bg-orange-50', label: `Atenção: Backup antigo (${daysSince} dias)` };
        return { status: 'Secure', color: 'text-green-600', bg: 'bg-green-50', label: 'Seguro: Backup atualizado' };
    };

    // Formata bytes para legibilidade
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const health = getSystemHealth();
    const storagePercentage = Math.min((storageUsage / 5000000) * 100, 100); // Assume ~5MB quota

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-slideUp pb-12">

            {/* HEADER & HEALTH STATUS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl shadow-lg">
                        <Database size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Segurança de Dados</h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${health.bg} ${health.color} border border-current opacity-90`}>
                                <Activity size={12} /> {health.label}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1" title="Uso estimado do armazenamento local">
                                <HardDrive size={12} /> Uso: {formatBytes(storageUsage)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Painel de Controle
                    </button>
                    <button
                        onClick={() => setActiveTab('snapshots')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'snapshots' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Snapshots <span className="bg-slate-200 text-slate-600 px-1.5 rounded text-xs">{snapshots.length}</span>
                    </button>
                </div>
            </div>

            {/* FEEDBACK TOAST */}
            {feedback && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl animate-fadeIn flex items-center gap-3 z-50 max-w-md ${feedback.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {feedback.type === 'success' ? <CheckCircle size={24} className="shrink-0" /> : <AlertTriangle size={24} className="shrink-0" />}
                    <p className="font-medium text-sm">{feedback.message}</p>
                    <button onClick={() => setFeedback(null)} className="ml-auto opacity-70 hover:opacity-100"><X size={16} /></button>
                </div>
            )}

            {/* --- TAB: OVERVIEW --- */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
                    {/* Quick Actions Card */}
                    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Save className="text-primary-500" /> Salvar Ponto de Restauração
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Identificação do Backup</label>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border-slate-300 focus:ring-primary-500 p-3 border shadow-sm outline-none"
                                    placeholder="Ex: Backup antes da matrícula..."
                                    value={snapshotName}
                                    onChange={(e) => setSnapshotName(e.target.value)}
                                />
                                <p className="text-xs text-slate-400 mt-2">
                                    Cria uma cópia completa dos dados no armazenamento do navegador. Ideal para prevenções rápidas.
                                </p>
                            </div>

                            {/* Alerta de Cota */}
                            {storagePercentage > 80 && (
                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex gap-2 text-xs text-orange-800">
                                    <AlertTriangle size={16} className="shrink-0" />
                                    <span>Seu armazenamento está quase cheio. Considere baixar e excluir backups antigos.</span>
                                </div>
                            )}

                            <button
                                onClick={handleCreateSnapshot}
                                disabled={isLoading}
                                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <RefreshCw className="animate-spin" /> : <Save size={18} />}
                                {isLoading ? 'Salvando...' : 'Salvar Snapshot Agora'}
                            </button>
                        </div>
                    </div>

                    {/* External Backup Card */}
                    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <HardDrive className="text-blue-500" /> Exportação Externa (.JSON)
                            </h3>
                            <p className="text-slate-500 text-sm mb-6">
                                Baixe um arquivo seguro contendo todos os dados do sistema. Recomendado para backup de longo prazo em nuvem ou HD externo.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={handleDownloadFile}
                                className="w-full py-3 bg-white border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50 text-slate-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Download size={18} className="text-blue-500" /> Baixar Backup Completo
                            </button>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-slate-400 font-bold">Restauração</span>
                                </div>
                            </div>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-3 bg-white border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50 text-slate-600 rounded-xl font-medium transition-all flex items-center justify-center gap-2 group"
                            >
                                {isLoading ? <RefreshCw className="animate-spin text-orange-500" /> : <Upload size={18} className="text-orange-500 group-hover:scale-110 transition-transform" />}
                                {isLoading ? 'Processando Arquivo...' : 'Restaurar de Arquivo .JSON'}
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: SNAPSHOTS --- */}
            {activeTab === 'snapshots' && (
                <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden animate-fadeIn">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <History size={20} className="text-purple-500" /> Histórico de Snapshots
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">
                                {snapshots.length} / 3 (Máx)
                            </span>
                        </div>
                    </div>

                    {snapshots.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <History size={32} className="opacity-40" />
                            </div>
                            <p className="font-medium text-slate-600">Nenhum snapshot local encontrado.</p>
                            <p className="text-sm mt-1">Crie um ponto de restauração na aba "Painel de Controle".</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {snapshots.map((snap) => (
                                <div key={snap.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 group-hover:scale-105 transition-transform">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg">{snap.label}</h4>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                                                <span className="flex items-center gap-1"><Clock size={10} /> {new Date(snap.metadata.exportedAt).toLocaleString()}</span>
                                                <span className="hidden sm:inline">•</span>
                                                <span className="flex items-center gap-1"><Shield size={10} /> {snap.metadata.exportedBy}</span>
                                            </div>
                                            <div className="flex gap-2 mt-2.5">
                                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-bold border border-slate-200">{snap.metadata.recordCounts.students} Alunos</span>
                                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-bold border border-slate-200">{snap.metadata.recordCounts.schools} Escolas</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                                        <button
                                            onClick={() => BackupService.downloadBackupFile(snap)}
                                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                            title="Baixar cópia .JSON"
                                        >
                                            <Download size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSnapshot(snap.id!)}
                                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                            title="Excluir Snapshot Definitivamente"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleRestoreClick(snap)}
                                            className="flex-1 md:flex-none px-5 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 shadow-lg shadow-slate-300/50 text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                                        >
                                            Restaurar <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- RESTORE MODAL --- */}
            {pendingRestoreData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slideUp border border-slate-200">
                        <div className="p-6 bg-orange-50 border-b border-orange-100 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <RefreshCw size={24} className="text-orange-600" /> Confirmar Restauração
                                </h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    Você está prestes a restaurar: <strong>{pendingRestoreData.label || 'Backup Externo'}</strong>
                                </p>
                            </div>
                            <button onClick={() => setPendingRestoreData(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-white rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-6 flex items-start gap-3">
                                <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" />
                                <div className="text-sm text-yellow-800 leading-relaxed">
                                    <strong>Atenção:</strong> Esta ação <u>substituirá os dados atuais</u> pelos dados contidos no backup selecionado.
                                    Certifique-se de que é isso que deseja fazer.
                                </div>
                            </div>

                            <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Selecione os módulos para restaurar:</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { id: 'users', label: 'Usuários e Acessos', icon: Shield, count: pendingRestoreData.metadata.recordCounts.users },
                                    { id: 'schools', label: 'Escolas e Unidades', icon: School, count: pendingRestoreData.metadata.recordCounts.schools },
                                    { id: 'students', label: 'Alunos e Prontuários', icon: Database, count: pendingRestoreData.metadata.recordCounts.students },
                                    { id: 'supportProfessionals', label: 'Profissionais de Apoio', icon: Activity, count: pendingRestoreData.metadata.recordCounts.supportProfessionals },
                                ].map(module => (
                                    <div
                                        key={module.id}
                                        onClick={() => setSelectedModules(prev => ({ ...prev, [module.id]: !prev[module.id as keyof typeof selectedModules] }))}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${selectedModules[module.id as keyof typeof selectedModules] ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg transition-colors ${selectedModules[module.id as keyof typeof selectedModules] ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                                <module.icon size={18} />
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm ${selectedModules[module.id as keyof typeof selectedModules] ? 'text-slate-800' : 'text-slate-500'}`}>{module.label}</p>
                                                <p className="text-xs text-slate-400">{module.count} registros</p>
                                            </div>
                                        </div>
                                        {selectedModules[module.id as keyof typeof selectedModules] ? <CheckSquare className="text-orange-600" /> : <Square className="text-slate-300" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setPendingRestoreData(null)} className="px-6 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-medium transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={confirmRestore}
                                disabled={isLoading}
                                className="px-8 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? <RefreshCw className="animate-spin" /> : <CheckCircle size={18} />}
                                {isLoading ? 'Restaurando...' : 'Confirmar e Restaurar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};