import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, FileText, Image as ImageIcon, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';
import { PapelTimbradoConfig } from '../types';

export const PapelTimbradoConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<PapelTimbradoConfig>({
    tituloLinha1: "",
    tituloLinha2: "",
    tituloLinha3: "",
    cnpj: "",
    endereco: "",
    telefone: "",
    rodapeTexto: "",
    rodapeImg: null,
    logoUrl: null,
    showLogo: true,
    showTitulos: true,
    showContato: true
  });

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const footerInputRef = useRef<HTMLInputElement>(null);

  // Carregar configurações ao montar via SupabaseService
  useEffect(() => {
    const loadConfig = async () => {
      const loaded = await SupabaseService.getPapelTimbradoConfig();
      setConfig(loaded);
    };
    loadConfig();
  }, []);

  const handleSaveConfigs = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await SupabaseService.savePapelTimbradoConfig(config);
      setFeedback({ type: 'success', message: 'Configurações do papel timbrado salvas com sucesso! As alterações aparecerão nos próximos documentos gerados.' });
      setTimeout(() => setFeedback(null), 5000);
    } catch (e: any) {
      console.error('Erro ao salvar config:', e);
      setFeedback({ type: 'error', message: `Erro ao salvar no banco: ${e.message || 'Verifique permissões RLS'}` });
    } finally {
      setIsSaving(false);
    }
  };

  // Handlers de Upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRodapeImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, rodapeImg: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl shadow-lg">
            <FileText size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Papel Timbrado (SYNC)</h2>
            <p className="text-slate-500">Personalize o cabeçalho e rodapé dos documentos impressos.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Logo Section */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon size={20} className="text-primary-600" /> Logomarca do Cabeçalho
              </h3>
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  className="rounded text-primary-600 focus:ring-primary-500"
                  checked={config.showLogo}
                  onChange={(e) => setConfig(prev => ({ ...prev, showLogo: e.target.checked }))}
                />
                <span className="text-sm font-medium text-slate-700">Exibir Logomarca</span>
              </label>
            </div>

            <div className={`flex items-start gap-6 transition-opacity ${!config.showLogo ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="w-32 h-32 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <ImageIcon className="text-slate-300" size={40} />
                )}
                {config.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, logoUrl: null }))}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-4">
                  Esta imagem aparecerá centralizada no topo de todos os documentos gerados.
                  Recomendamos formato PNG com fundo transparente.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-2"
                >
                  <Upload size={16} /> Carregar Imagem
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

          <hr className="md:col-span-2 border-slate-100" />

          {/* Titles Section */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-800">Títulos Institucionais</h3>
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  className="rounded text-primary-600 focus:ring-primary-500"
                  checked={config.showTitulos}
                  onChange={(e) => setConfig(prev => ({ ...prev, showTitulos: e.target.checked }))}
                />
                <span className="text-sm font-medium text-slate-700">Exibir Títulos</span>
              </label>
            </div>

            <div className={`space-y-4 transition-opacity ${!config.showTitulos ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Título Principal (Linha 1)</label>
                <input
                  type="text"
                  className="w-full rounded-lg border-slate-300 p-2.5 border focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ex: PREFEITURA MUNICIPAL DE..."
                  value={config.tituloLinha1}
                  onChange={(e) => setConfig(prev => ({ ...prev, tituloLinha1: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Subtítulo (Linha 2)</label>
                <input
                  type="text"
                  className="w-full rounded-lg border-slate-300 p-2.5 border focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ex: SECRETARIA MUNICIPAL DE EDUCAÇÃO"
                  value={config.tituloLinha2}
                  onChange={(e) => setConfig(prev => ({ ...prev, tituloLinha2: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Departamento / Setor (Linha 3)</label>
                <input
                  type="text"
                  className="w-full rounded-lg border-slate-300 p-2.5 border focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ex: CENTRO MULTIDISCIPLINAR..."
                  value={config.tituloLinha3}
                  onChange={(e) => setConfig(prev => ({ ...prev, tituloLinha3: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Informações de Contato</h3>
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  className="rounded text-primary-600 focus:ring-primary-500"
                  checked={config.showContato}
                  onChange={(e) => setConfig(prev => ({ ...prev, showContato: e.target.checked }))}
                />
                <span className="text-xs font-medium text-slate-700">Exibir Contato</span>
              </label>
            </div>

            <div className={`space-y-4 transition-opacity ${!config.showContato ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">CNPJ</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-slate-300 p-2.5 border focus:ring-2 focus:ring-primary-500 outline-none"
                    value={config.cnpj}
                    onChange={(e) => setConfig(prev => ({ ...prev, cnpj: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Telefone / Contato</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-slate-300 p-2.5 border focus:ring-2 focus:ring-primary-500 outline-none"
                    value={config.telefone}
                    onChange={(e) => setConfig(prev => ({ ...prev, telefone: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Endereço Completo</label>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border-slate-300 p-2.5 border focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                  value={config.endereco}
                  onChange={(e) => setConfig(prev => ({ ...prev, endereco: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <hr className="md:col-span-2 border-slate-100" />

          {/* Footer Section */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              Rodapé do Documento
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Texto do Rodapé (Opcional)</label>
                <input
                  type="text"
                  className="w-full rounded-lg border-slate-300 p-2.5 border focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ex: Sistema Brotar - Gestão Inteligente"
                  value={config.rodapeTexto}
                  onChange={(e) => setConfig(prev => ({ ...prev, rodapeTexto: e.target.value }))}
                />
                <p className="text-xs text-slate-500 mt-1">Este texto aparecerá centralizado na parte inferior da página.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Imagem de Rodapé (Opcional)</label>
                <div className="flex items-start gap-6">
                  <div className="w-full max-w-[200px] h-32 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                    {config.rodapeImg ? (
                      <img src={config.rodapeImg} alt="Rodapé" className="w-full h-full object-contain p-2" />
                    ) : (
                      <ImageIcon className="text-slate-300" size={32} />
                    )}
                    {config.rodapeImg && (
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, rodapeImg: null }))}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 mb-4">
                      Você pode adicionar uma imagem (banner, arte institucional) para aparecer no final da página.
                    </p>
                    <button
                      type="button"
                      onClick={() => footerInputRef.current?.click()}
                      className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-2"
                    >
                      <Upload size={16} /> Carregar Imagem de Rodapé
                    </button>
                    <input
                      ref={footerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleRodapeImageChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {feedback && (
          <div className={`mt-6 p-4 rounded-xl border flex items-center gap-3 animate-fadeIn ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
            {feedback.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            <span className="font-bold">{feedback.message}</span>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={handleSaveConfigs}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold shadow-lg shadow-primary-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-1"
          >
            <Save size={20} />
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  );
};
