
import React, { useState, useRef, useEffect } from 'react';
import { SupabaseService } from '../services/SupabaseService';
import { PRESET_THEMES } from '../services/storageService';
import { SystemSettings, ThemePalette } from '../types';
import { Save, Upload, Palette, Layout, Settings as SettingsIcon, Check, RefreshCw, Image as ImageIcon, Type, Monitor, AlertTriangle } from 'lucide-react';

export const SystemSettingsPanel: React.FC = () => {
    const [settings, setSettings] = useState<SystemSettings>(() => SupabaseService.getSystemSettingsSync());
    const [activeTab, setActiveTab] = useState<'branding' | 'theme'>('branding');
    const [previewTheme, setPreviewTheme] = useState<ThemePalette>(() => SupabaseService.getActiveTheme());
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Carregar dados reais ao montar
    useEffect(() => {
        const loadRealSettings = async () => {
            const data = await SupabaseService.getSystemSettings();
            setSettings(data);
            const theme = PRESET_THEMES.find(t => t.id === data.activeThemeId) || PRESET_THEMES[0];
            setPreviewTheme(theme);
        };
        loadRealSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            // Validação básica para garantir consistência
            if (!settings.activeThemeId) {
                console.warn("Tema não definido, revertendo para padrão");
                settings.activeThemeId = 'teal-default';
            }

            // Salva no Supabase
            await SupabaseService.saveSystemSettings(settings);

            // Forçamos recarregamento para aplicar tema globalmente
            setTimeout(() => {
                window.location.reload();
            }, 500);

        } catch (err: any) {
            console.error("Erro ao salvar configurações:", err);
            setError(`Erro ao salvar: ${err.message || 'Verifique sua conexão ou permissões no Supabase'}`);
            setIsSaving(false);
        }
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => ({ ...prev, logoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const selectTheme = (theme: ThemePalette) => {
        setSettings(prev => ({ ...prev, activeThemeId: theme.id }));
        setPreviewTheme(theme);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl shadow-lg">
                        <SettingsIcon size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Identidade Visual (SYNC)</h2>
                        <p className="text-slate-500">Personalize o nome, logo e cores do sistema.</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3 animate-fadeIn">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 text-sm uppercase tracking-wide">
                            Configurações
                        </div>
                        <nav className="p-2 space-y-1">
                            <button
                                onClick={() => setActiveTab('branding')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'branding' ? 'bg-primary-50 text-primary-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Layout size={18} /> Marca e Logo
                            </button>
                            <button
                                onClick={() => setActiveTab('theme')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'theme' ? 'bg-primary-50 text-primary-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Palette size={18} /> Cores e Temas
                            </button>
                        </nav>
                    </div>

                    {/* Preview Box - Mini System Look */}
                    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Monitor size={14} /> Pré-visualização
                        </h4>

                        {/* Fake Sidebar & Content */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden flex h-48">
                            <div className="w-16 flex flex-col items-center pt-4 gap-2" style={{ backgroundColor: previewTheme.colors[800] }}>
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                                    {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-cover" /> : 'Logo'}
                                </div>
                                <div className="w-8 h-1 rounded-full bg-white/20 mt-2"></div>
                                <div className="w-8 h-1 rounded-full bg-white/20"></div>
                            </div>
                            <div className="flex-1 bg-slate-50 p-4">
                                <div className="h-4 w-24 bg-slate-200 rounded mb-4"></div>
                                <div className="h-20 bg-white rounded-lg shadow-sm border border-slate-100 p-3">
                                    <div className="h-3 w-12 rounded mb-2" style={{ backgroundColor: previewTheme.colors[100] }}></div>
                                    <div className="h-6 w-16 bg-slate-800 rounded mb-1"></div>
                                </div>
                                <button className="mt-4 px-3 py-1.5 rounded text-[10px] text-white font-bold w-full" style={{ backgroundColor: previewTheme.colors[600] }}>
                                    Botão Principal
                                </button>
                            </div>
                        </div>
                        <p className="text-center text-xs text-slate-400 mt-2 italic">Exemplo simplificado do layout</p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2">
                    {activeTab === 'branding' && (
                        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 animate-fadeIn">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Type size={22} className="text-primary-500" /> Identidade da Marca
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Sistema</label>
                                    <input
                                        type="text"
                                        value={settings.systemName}
                                        onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                        placeholder="Ex: Brotar, Nexus Care..."
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Este nome aparecerá na aba do navegador e no topo do menu lateral.</p>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <label className="block text-sm font-bold text-slate-700 mb-4">Logotipo do Sistema</label>
                                    <div className="flex items-start gap-6">
                                        <div className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                                            {settings.logoUrl ? (
                                                <img src={settings.logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <ImageIcon className="text-slate-300" size={40} />
                                            )}

                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setSettings({ ...settings, logoUrl: '' })}
                                                    className="text-white text-xs font-bold hover:underline"
                                                >
                                                    Remover
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1">
                                            <p className="text-sm text-slate-600 mb-4">
                                                Carregue uma imagem para substituir o ícone padrão.
                                                Recomendamos formato PNG com fundo transparente (500x500px).
                                            </p>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-2"
                                            >
                                                <Upload size={16} /> Carregar Nova Imagem
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleLogoUpload}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <label className="block text-sm font-bold text-slate-700 mb-4">Imagem de Fundo do Login</label>
                                    <div className="flex items-start gap-6">
                                        <div className="w-48 h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                                            {settings.loginBackgroundImage ? (
                                                <img src={settings.loginBackgroundImage} alt="Background Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center p-4">
                                                    <Layout className="text-slate-300 mx-auto mb-2" size={32} />
                                                    <span className="text-xs text-slate-400">Padrão</span>
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setSettings({ ...settings, loginBackgroundImage: '' })}
                                                    className="text-white text-xs font-bold hover:underline"
                                                >
                                                    Restaurar Padrão
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1">
                                            <p className="text-sm text-slate-600 mb-4">
                                                Personalize a tela de login com uma imagem institucional.
                                                Recomendamos alta resolução (1920x1080).
                                            </p>
                                            <button
                                                onClick={() => document.getElementById('bg-upload')?.click()}
                                                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-2"
                                            >
                                                <Upload size={16} /> Carregar Imagem de Fundo
                                            </button>
                                            <input
                                                id="bg-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setSettings(prev => ({ ...prev, loginBackgroundImage: reader.result as string }));
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Exibir Informações Sobrepostas</label>
                                    <p className="text-xs text-slate-500 max-w-md">
                                        Se desativado, oculta o logo grande, o nome do sistema e os cards informativos da tela de login,
                                        deixando a imagem de fundo em destaque (Modo Banner).
                                    </p>
                                </div>
                                <div className="flex items-center">
                                    <button
                                        onClick={() => setSettings({ ...settings, showLoginInfo: settings.showLoginInfo === false ? true : false })}
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${settings.showLoginInfo !== false ? 'bg-primary-600' : 'bg-slate-200'}`}
                                    >
                                        <span
                                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${settings.showLoginInfo !== false ? 'translate-x-7' : 'translate-x-1'}`}
                                        />
                                    </button>
                                    <span className="ml-3 text-sm font-medium text-slate-700">
                                        {settings.showLoginInfo !== false ? 'Ativado' : 'Desativado'}
                                    </span>
                                </div>
                            </div>
                        </div>

                    )}

                    {activeTab === 'theme' && (
                        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 animate-fadeIn">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Palette size={22} className="text-primary-500" /> Paletas de Cores Modernas
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {PRESET_THEMES.map((theme) => (
                                    <div
                                        key={theme.id}
                                        onClick={() => selectTheme(theme)}
                                        className={`cursor-pointer rounded-xl border-2 p-4 transition-all relative overflow-hidden group ${settings.activeThemeId === theme.id ? 'border-primary-500 bg-primary-50/10 shadow-md ring-1 ring-primary-500' : 'border-slate-100 hover:border-slate-300 hover:shadow-sm'}`}
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <span className={`font-bold text-sm ${settings.activeThemeId === theme.id ? 'text-primary-700' : 'text-slate-700'}`}>{theme.name}</span>
                                            {settings.activeThemeId === theme.id && <div className="bg-primary-500 text-white p-1 rounded-full"><Check size={12} /></div>}
                                        </div>

                                        <div className="flex h-12 rounded-lg overflow-hidden w-full shadow-inner">
                                            <div style={{ backgroundColor: theme.colors[500], flex: 2 }}></div>
                                            <div style={{ backgroundColor: theme.colors[700], flex: 1 }}></div>
                                            <div style={{ backgroundColor: theme.colors[300], flex: 1 }}></div>
                                            <div style={{ backgroundColor: theme.colors[100], flex: 1 }}></div>
                                        </div>

                                        <div className="flex gap-2 mt-3">
                                            <div className="h-2 w-full rounded-full" style={{ backgroundColor: theme.colors[900], opacity: 0.2 }}></div>
                                            <div className="h-2 w-1/2 rounded-full" style={{ backgroundColor: theme.colors[500], opacity: 0.2 }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-6">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold shadow-lg shadow-primary-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-1"
                        >
                            {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={20} />}
                            {isSaving ? 'Aplicando...' : 'Salvar e Reiniciar'}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};
