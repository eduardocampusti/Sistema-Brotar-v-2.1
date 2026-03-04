
import React, { useState, useEffect, useRef } from 'react';
import { School } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { formatarNomeBR } from '../utils/formatters';
import {
    Save, School as SchoolIcon, X, MapPin, Phone, Building,
    AlertCircle, Wifi, Globe, Upload, FileText, CheckCircle,
    Info, Layout, Search, Filter, ChevronRight, Activity, Tag,
    Download, Printer, File
} from 'lucide-react';
import { generateSchoolPDF, generateAllSchoolsPDF } from '../utils/pdfExport';
import { PapelTimbradoConfig } from '../types';

export const SchoolManagement: React.FC = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('Todos');
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [filterInternet, setFilterInternet] = useState('Todos');
    const [letterheadConfig, setLetterheadConfig] = useState<PapelTimbradoConfig | null>(null);
    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 10) {
            return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        if (rawValue.length <= 11) {
            const formatted = formatPhone(rawValue);
            const providers = { ...(formData.internetProviders || {}) };
            const current = providers[type] || { company: '', contact: '' };
            providers[type] = { ...current, contact: formatted };
            setFormData({ ...formData, internetProviders: providers });
        }
    };

    const [activeTab, setActiveTab] = useState<'id' | 'connectivity' | 'address'>('id');

    const INTERNET_TYPES = ['Fibra Óptica', 'Via Satélite', 'Rádio / Outros', '4G / 5G Mobile'];

    const [formData, setFormData] = useState<Partial<School>>({
        name: '',
        inep: '',
        director: '',
        phone: '',
        district: '',
        address: { street: '', number: '', district: '', city: 'Brotas', state: 'BA', zipCode: '' },
        isActive: true,
        hasInternet: false,
        internetType: '',
        internetProviderContact: ''
    });

    useEffect(() => {
        loadSchools();
        loadLetterhead();
    }, []);

    const loadLetterhead = async () => {
        const config = await SupabaseService.getPapelTimbradoConfig();
        setLetterheadConfig(config);
    };

    const loadSchools = async () => {
        try {
            const data = await SupabaseService.getSchools();
            setSchools(data || []);
        } catch (err) {
            console.error('Erro ao buscar escolas:', err);
            setError('Não foi possível carregar a lista de escolas.');
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = () => {
        const headers = ['Escola', 'INEP', 'Distrito', 'Diretor', 'Telefone'];
        const rows = [
            ['Escola Exemplo 1', '12345678', 'Sede', 'Diretor A', '(71) 9999-9999'],
            ['Escola Exemplo 2', '87654321', 'Cocal', 'Diretor B', '(71) 9999-9999']
        ];
        const csvContent = [headers, ...rows].map(r => r.join(';')).join('\n');
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "modelo_importacao_escolas.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError('');
        setSuccessMessage('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            let text = e.target?.result as string;
            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

            const allLines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (allLines.length < 2) {
                setError('O arquivo parece estar vazio.');
                return;
            }

            let headerIdx = 0;
            let firstLine = allLines[0];
            for (let i = 0; i < Math.min(allLines.length, 5); i++) {
                const low = allLines[i].toLowerCase();
                if (low.includes('inep') || low.includes('escola') || low.includes('nome')) {
                    headerIdx = i;
                    firstLine = allLines[i];
                    break;
                }
            }

            const separator = firstLine.includes(';') ? ';' : (firstLine.includes(',') ? ',' : '\t');
            const headers = firstLine.split(separator).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

            const idxNome = headers.findIndex(h => h === 'escola' || h === 'nome' || h.includes('unidade'));
            const idxInep = headers.findIndex(h => h === 'inep' || h.includes('codigo') || h.includes('código'));
            const idxDistrito = headers.findIndex(h => h.includes('distrito') || h.includes('localidade'));
            const idxDiretor = headers.findIndex(h => h.includes('diretor') || h.includes('direção'));
            const idxTelefone = headers.findIndex(h => h.includes('fone') || h.includes('tel') || h.includes('contato'));

            if (idxNome === -1 || idxInep === -1) {
                setError('As colunas obrigatórias "Escola" e "INEP" não foram encontradas.');
                return;
            }

            let successCount = 0;
            let errorCount = 0;
            let firstErr = '';

            for (let i = headerIdx + 1; i < allLines.length; i++) {
                const cols = allLines[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
                const nome = cols[idxNome];
                const inepRaw = cols[idxInep];

                if (!nome || !inepRaw || (nome.toLowerCase() === 'escola' && inepRaw.toLowerCase() === 'inep')) continue;

                const inep = inepRaw.replace(/\D/g, '');
                if (nome.length < 3 || inep.length < 4) continue;

                const isDup = schools.some(s => s.inep === inep);
                if (isDup) {
                    errorCount++;
                    if (!firstErr) firstErr = `INEP ${inep} já existe.`;
                    continue;
                }

                const dist = idxDistrito !== -1 ? cols[idxDistrito] : 'Sede';
                const newSchool: School = {
                    id: crypto.randomUUID(),
                    name: nome,
                    inep: inep,
                    district: dist || 'Sede',
                    director: idxDiretor !== -1 ? cols[idxDiretor] : '',
                    phone: idxTelefone !== -1 ? cols[idxTelefone] : '',
                    isActive: true,
                    address: { street: '', number: '', district: dist || '', city: 'Brotas', state: 'BA', zipCode: '' },
                    hasInternet: false
                };

                try {
                    await SupabaseService.saveSchool(newSchool);
                    successCount++;
                } catch (err: any) {
                    errorCount++;
                    if (!firstErr) firstErr = err.message;
                }
            }

            if (successCount > 0) {
                setSuccessMessage(`Sucesso! ${successCount} escolas importadas.`);
                if (errorCount > 0) setError(`${errorCount} linhas ignoradas: ${firstErr}`);
                loadSchools();
            } else {
                setError(`Nenhuma escola importada. Motivo: ${firstErr || 'Formato inválido'}`);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const exportToCSV = () => {
        const csvContent = [
            ['INEP', 'Nome', 'Distrito', 'Diretor', 'Telefone', 'Internet', 'Tipo Internet', 'Endereço'].join(';'),
            ...filteredSchools.map(s => [
                s.inep,
                `"${s.name}"`,
                `"${s.district || 'Sede'}"`,
                `"${s.director || ''}"`,
                s.phone || '',
                s.hasInternet ? 'Sim' : 'Não',
                s.internetType || '',
                `"${s.address?.street || ''}, ${s.address?.number || ''} - ${s.address?.district || ''}"`
            ].join(';'))
        ].join('\n');

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'escolas_export_brotar.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.inep) {
            setError('Nome e INEP são obrigatórios.');
            return;
        }

        try {
            const newSchool: School = {
                id: formData.id || crypto.randomUUID(),
                name: formData.name!,
                inep: formData.inep!,
                director: formData.director,
                phone: formData.phone,
                district: formData.district,
                address: formData.address,
                isActive: formData.isActive ?? true,
                hasInternet: formData.hasInternet,
                internetType: formData.internetType,
                internetProviders: formData.internetProviders || {}
            };

            await SupabaseService.saveSchool(newSchool);
            await loadSchools();
            setIsAdding(false);
            setSuccessMessage('Escola salva com sucesso!');
            resetForm();
        } catch (err) {
            setError('Falha ao salvar escola.');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '', inep: '', director: '', phone: '', district: '',
            address: { street: '', number: '', district: '', city: 'Brotas', state: 'BA', zipCode: '' },
            isActive: true, hasInternet: false, internetType: '', internetProviders: {}
        });
        setActiveTab('id');
    };

    const handleEdit = (school: School) => {
        setFormData({
            ...school,
            internetProviders: school.internetProviders || {}
        });
        setIsAdding(true);
        setActiveTab('id');
    };

    const filteredSchools = schools.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.inep.includes(searchTerm) ||
            s.district?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDistrict = filterDistrict === 'Todos' || s.district === filterDistrict;
        const matchesInternet = filterInternet === 'Todos' || (filterInternet === 'Sim' ? s.hasInternet : !s.hasInternet);
        const matchesStatus = filterStatus === 'Todos' || (filterStatus === 'Ativa' ? s.isActive : !s.isActive);

        return matchesSearch && matchesDistrict && matchesInternet && matchesStatus;
    }).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Unidades Escolares</h1>
                    <p className="text-slate-500 font-medium">Gestão Administrativa e Conectividade</p>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={downloadTemplate} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm">
                        <FileText size={18} className="text-primary-500" /> Modelo
                    </button>

                    <button onClick={exportToCSV} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm">
                        <Download size={18} className="text-emerald-500" /> Exportar CSV
                    </button>

                    <button
                        onClick={() => letterheadConfig && generateAllSchoolsPDF(filteredSchools, letterheadConfig)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm"
                    >
                        <Printer size={18} className="text-blue-500" /> Relatório Geral
                    </button>

                    <button onClick={() => { setIsAdding(true); resetForm(); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-bold text-sm shadow-lg shadow-primary-200">
                        <Building size={18} /> Nova Escola
                    </button>
                    <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleImportCSV} />
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all font-bold text-sm">
                        <Upload size={18} /> Importar
                    </button>
                </div>
            </header>

            {/* Banner de Feedback */}
            {
                (successMessage || error) && (
                    <div className={`p-4 rounded-2xl border flex items-center gap-4 animate-slideDown ${successMessage ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                        <div className={`p-2 rounded-full ${successMessage ? 'bg-green-100' : 'bg-red-100'}`}>
                            {successMessage ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-sm">{successMessage ? 'Sucesso!' : 'Atenção'}</p>
                            <p className="text-xs opacity-90">{successMessage || error}</p>
                        </div>
                        <button onClick={() => { setSuccessMessage(''); setError(''); }} className="hover:bg-black/5 p-2 rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                )
            }

            {
                isAdding && (
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary-100 text-primary-600 rounded-2xl">
                                    <Building size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Ficha da Unidade Escolar</h3>
                                    <p className="text-xs text-slate-500 font-medium">Preencha todos os campos obrigatórios (*)</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="flex border-b border-slate-100 px-6 gap-6 overflow-x-auto no-scrollbar">
                            <button onClick={() => setActiveTab('id')} className={`py-4 px-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'id' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-400'}`}>
                                <Info size={16} /> Identificação
                            </button>
                            <button onClick={() => setActiveTab('connectivity')} className={`py-4 px-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'connectivity' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-400'}`}>
                                <Wifi size={16} /> Conectividade
                            </button>
                            <button onClick={() => setActiveTab('address')} className={`py-4 px-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'address' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-400'}`}>
                                <MapPin size={16} /> Endereço
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-8">
                            {activeTab === 'id' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                            Nome da Unidade *
                                        </label>
                                        <input required type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl p-3.5 text-slate-800 font-medium focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all border"
                                            placeholder="EX: ESCOLA MUNICIPAL..." value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} />
                                    </div>
                                    <div className="space-y-1.5 p-4 bg-primary-50/30 rounded-2xl border border-primary-100/50">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-bold text-primary-700 uppercase flex items-center gap-1.5">
                                                <Tag size={14} /> Cód. INEP *
                                            </label>
                                            <span className="text-[9px] font-black bg-primary-500 text-white px-1.5 py-0.5 rounded-md tracking-tighter shadow-sm">OFICIAL</span>
                                        </div>
                                        <input required type="text" className="w-full bg-white border-primary-200 rounded-xl p-3.5 text-primary-900 font-mono font-bold text-lg focus:ring-4 focus:ring-primary-100 transition-all border shadow-sm text-center tracking-widest"
                                            placeholder="00000000" value={formData.inep} onChange={e => setFormData({ ...formData, inep: e.target.value.replace(/\D/g, '') })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Distrito / Localidade</label>
                                        <input type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl p-3.5 text-slate-800 font-medium focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all border"
                                            placeholder="Ex: Cocal, Sede, Feira Nova..." value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <input type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl p-3.5 text-slate-800 font-medium focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all border"
                                            value={formData.director}
                                            onChange={e => setFormData({ ...formData, director: e.target.value })}
                                            onBlur={e => setFormData({ ...formData, director: formatarNomeBR(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Telefone de Contato</label>
                                        <div className="relative">
                                            <input type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl p-3.5 pl-11 text-slate-800 font-medium focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all border"
                                                value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                            <Phone className="absolute left-4 top-4 text-slate-400" size={18} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'connectivity' && (
                                <div className="space-y-8 animate-fadeIn">
                                    <div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                                        <div className="flex gap-4">
                                            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                                <Wifi size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-blue-900">Status de Internet</h4>
                                                <p className="text-xs text-blue-700">A escola possui conexão ativa para o sistema?</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={formData.hasInternet} onChange={e => setFormData({ ...formData, hasInternet: e.target.checked })} className="sr-only peer" />
                                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-500"></div>
                                        </label>
                                    </div>

                                    {formData.hasInternet && (
                                        <div className="md:col-span-2 space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {INTERNET_TYPES.map(type => {
                                                    const selectedTypes = formData.internetType ? formData.internetType.split(', ') : [];
                                                    const isSelected = selectedTypes.includes(type);

                                                    return (
                                                        <div key={type} className="space-y-2">
                                                            <label className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-100 bg-white text-slate-500'}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                                                                    checked={isSelected}
                                                                    onChange={() => {
                                                                        let newTypes;
                                                                        if (isSelected) {
                                                                            newTypes = selectedTypes.filter(t => t !== type);
                                                                        } else {
                                                                            newTypes = [...selectedTypes, type];
                                                                        }
                                                                        setFormData({ ...formData, internetType: newTypes.join(', ') });
                                                                    }}
                                                                />
                                                                <span className="text-xs font-bold uppercase tracking-tight">{type}</span>
                                                            </label>

                                                            {isSelected && (
                                                                <div className="pl-2 space-y-2 animate-fadeIn bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                                                    <div className="space-y-1">
                                                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Empresa / Provedor</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Ex: Starlink, Oi, Vivo..."
                                                                            className="w-full bg-white border-slate-200 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-primary-100 border"
                                                                            value={formData.internetProviders?.[type]?.company || ''}
                                                                            onChange={e => {
                                                                                const providers = { ...(formData.internetProviders || {}) };
                                                                                const current = providers[type] || { company: '', contact: '' };
                                                                                providers[type] = { ...current, company: e.target.value };
                                                                                setFormData({ ...formData, internetProviders: providers });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Telefone de Contato</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="(00) 00000-0000"
                                                                            className="w-full bg-white border-slate-200 rounded-lg p-2 text-xs font-mono font-medium focus:ring-2 focus:ring-primary-100 border"
                                                                            value={formData.internetProviders?.[type]?.contact || ''}
                                                                            onChange={e => handlePhoneChange(e, type)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'address' && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fadeIn">
                                    <div className="md:col-span-3 space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Rua / Logradouro</label>
                                        <input type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl p-3.5 text-slate-800 border shadow-sm focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all font-medium"
                                            value={formData.address?.street} onChange={e => setFormData({ ...formData, address: { ...formData.address!, street: e.target.value } })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Nº</label>
                                        <input type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl p-3.5 text-slate-800 border shadow-sm focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all font-medium"
                                            value={formData.address?.number} onChange={e => setFormData({ ...formData, address: { ...formData.address!, number: e.target.value } })} />
                                    </div>
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Bairro</label>
                                        <input type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl p-3.5 text-slate-800 border shadow-sm focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all font-medium"
                                            value={formData.address?.district} onChange={e => setFormData({ ...formData, address: { ...formData.address!, district: e.target.value } })} />
                                    </div>
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Cidade</label>
                                        <input type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl p-3.5 text-slate-800 border shadow-sm focus:bg-white focus:ring-4 focus:ring-primary-50 transition-all font-medium"
                                            value={formData.address?.city} onChange={e => setFormData({ ...formData, address: { ...formData.address!, city: e.target.value } })} />
                                    </div>
                                </div>
                            )}

                            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-4">
                                <div className="flex gap-2">
                                    {formData.id && (
                                        <button
                                            type="button"
                                            onClick={() => letterheadConfig && generateSchoolPDF(formData as School, letterheadConfig)}
                                            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm"
                                        >
                                            <Printer size={18} className="text-blue-500" /> Imprimir Ficha
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="flex items-center gap-2 px-8 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-black shadow-lg shadow-primary-200">
                                        <Save size={20} /> SALVAR FICHA
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )
            }

            <div className="space-y-4">
                <div className="relative group">
                    <input type="text" placeholder="Buscar por nome, INEP ou distrito..." className="w-full bg-white border-slate-200 rounded-2xl p-4 pl-12 text-slate-800 font-medium focus:ring-4 focus:ring-primary-50 transition-all border shadow-sm"
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <Search className="absolute left-4 top-4.5 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                </div>

                <div className="flex flex-wrap gap-2 animate-fadeIn">
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Localidade:</span>
                        <select className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer"
                            value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}>
                            <option value="Todos">Todos Distritos</option>
                            {Array.from(new Set(schools.map(s => s.district).filter(Boolean))).sort().map(dist => (
                                <option key={dist} value={dist!}>{dist}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Internet:</span>
                        <select className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer"
                            value={filterInternet} onChange={e => setFilterInternet(e.target.value)}>
                            <option value="Todos">Qualquer Status</option>
                            <option value="Sim">Com Internet</option>
                            <option value="Não">Sem Internet</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Status:</span>
                        <select className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer"
                            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="Todos">Ativas & Inativas</option>
                            <option value="Ativa">Apenas Ativas</option>
                            <option value="Inativa">Apenas Inativas</option>
                        </select>
                    </div>

                    {(searchTerm || filterDistrict !== 'Todos' || filterInternet !== 'Todos' || filterStatus !== 'Todos') && (
                        <button onClick={() => { setSearchTerm(''); setFilterDistrict('Todos'); setFilterInternet('Todos'); setFilterStatus('Todos'); }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-tight flex items-center gap-1 px-2">
                            <X size={12} /> Limpar Filtros
                        </button>
                    )}
                </div>
            </div>
            <div className="flex gap-2">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 flex items-center gap-2 text-xs font-bold uppercase shadow-sm">
                    <Activity size={16} className="text-primary-500" />
                    Total: {filteredSchools.length}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSchools.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-100">
                        <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto mb-4">
                            <Building size={48} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-bold">Nenhuma unidade encontrada.</p>
                    </div>
                ) : filteredSchools.map(school => (
                    <div key={school.id} className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-primary-100 transition-all relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-bl-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform"></div>

                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                    <Building size={20} />
                                </div>
                                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                    INEP: {school.inep}
                                </span>
                            </div>

                            <h3 className="text-lg font-black text-slate-800 leading-tight mb-1 group-hover:text-primary-700 transition-colors uppercase">
                                {school.name}
                            </h3>
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-4">
                                <MapPin size={12} className="text-orange-500" />
                                {school.district || 'Sede'}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Gestão</p>
                                    <p className="text-xs font-bold text-slate-600 truncate">{school.director || 'Não Informado'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Conectividade</p>
                                    <div className={`flex flex-col gap-1 text-[10px] font-bold ${school.hasInternet ? 'text-green-600' : 'text-slate-400'}`}>
                                        <div className="flex items-center gap-1.5">
                                            <Wifi size={14} className="shrink-0" />
                                            <span>{school.hasInternet ? 'Conectada' : 'Sem Internet'}</span>
                                        </div>
                                        {school.hasInternet && school.internetType && (
                                            <div className="pl-5 space-y-0.5 opacity-80">
                                                {school.internetType.split(', ').map(t => {
                                                    const provider = school.internetProviders?.[t];
                                                    return (
                                                        <div key={t} className="truncate">
                                                            • {t} {provider ? (
                                                                <span className="text-slate-500 font-normal">
                                                                    - {provider.company} {provider.contact && `(${provider.contact})`}
                                                                </span>
                                                            ) : ''}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-slate-50 mt-4">
                            <button onClick={() => handleEdit(school)} className="flex-1 py-3 bg-slate-50 text-slate-700 rounded-2xl hover:bg-primary-600 hover:text-white transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                <Layout size={14} /> Abrir Ficha
                            </button>
                            <button
                                onClick={() => letterheadConfig && generateSchoolPDF(school, letterheadConfig)}
                                className="p-3 bg-slate-50 text-blue-500 rounded-2xl hover:bg-blue-50 transition-all title='Gerar Ficha PDF'"
                            >
                                <Printer size={18} />
                            </button>
                            <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div >
    );
};
