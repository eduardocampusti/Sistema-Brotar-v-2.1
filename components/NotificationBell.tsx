import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Mail, AlertTriangle, Check, X, CheckCheck } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { User } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { useToast } from '../contexts/ToastContext';

interface NotificationBellProps {
    currentUser: User | null;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ currentUser }) => {
    const { unreadCount, notifications, sentMessages, markAsRead, refreshSentMessages } = useNotifications();
    const { success, error: toastError } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    // Estados do formulário de envio
    const [recipientId, setRecipientId] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
    const [isSending, setIsSending] = useState(false);
    const [usersList, setUsersList] = useState<User[]>([]);

    // Carrega usuários para o select ao abrir o modal de composição
    const handleOpenCompose = async () => {
        setIsComposeOpen(true);
        setIsOpen(false); // Fecha o dropdown
        try {
            const users = await SupabaseService.getUsers();
            // Filtra o próprio usuário
            setUsersList(users.filter(u => u.id !== currentUser?.id));
        } catch (error) {
            console.error('Erro ao carregar usuários', error);
            toastError('Erro ao carregar lista de usuários');
        }
    };

    const handleSend = async () => {
        if (!recipientId || !title || !content) {
            toastError('Preencha todos os campos');
            return;
        }

        if (isSending) return;

        setIsSending(true);
        try {
            await SupabaseService.sendSystemMessage(currentUser!.id, recipientId, title, content, priority);
            success('Aviso enviado com sucesso!');
            setIsComposeOpen(false);
            setRecipientId('');
            setTitle('');
            setContent('');
            setPriority('normal');
            refreshSentMessages(); // Atualiza a lista de enviadas
        } catch (error) {
            console.error('Erro detalhado ao enviar aviso:', error);
            toastError('Erro ao enviar aviso');
        } finally {
            setIsSending(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        setProcessingIds(prev => new Set(prev).add(id));
        try {
            await markAsRead(id);
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const displayList = activeTab === 'received' ? notifications : sentMessages;

    return (
        <div className="relative">
            {/* Ícone do Sino */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative text-gray-600 dark:text-gray-300"
                title="Avisos e Notificações"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse border-2 border-white dark:border-gray-800">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown de Notificações - USANDO PORTAL PARA EVITAR OVERLAP */}
            {isOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999]"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="absolute top-16 right-4 md:right-8 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-200">Notificações</h3>
                            <button
                                onClick={handleOpenCompose}
                                className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                            >
                                <Mail size={12} /> Novo Aviso
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700 text-xs">
                            <button
                                onClick={() => setActiveTab('received')}
                                className={`flex-1 py-2 font-medium transition-colors ${activeTab === 'received' ? 'text-teal-600 bg-teal-50/50 dark:bg-teal-900/10 border-b-2 border-teal-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                Recebidos ({notifications.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('sent')}
                                className={`flex-1 py-2 font-medium transition-colors ${activeTab === 'sent' ? 'text-teal-600 bg-teal-50/50 dark:bg-teal-900/10 border-b-2 border-teal-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                Enviados ({sentMessages.length})
                            </button>
                        </div>

                        <div className="max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                            {displayList.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Nenhum aviso aqui.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {displayList.map((notif) => (
                                        <li
                                            key={notif.id}
                                            className={`p-4 transition-colors relative ${activeTab === 'received' && !notif.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    {notif.priority === 'urgent' && <AlertTriangle size={14} className="text-red-500" />}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`font-semibold text-sm ${notif.priority === 'urgent' ? 'text-red-600' : 'text-gray-800 dark:text-gray-200'} ${notif.is_read ? 'opacity-70' : ''}`}>
                                                            {notif.title}
                                                        </span>
                                                        {notif.is_read && (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800 uppercase animate-in fade-in zoom-in">
                                                                <CheckCheck size={10} /> Lido
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {activeTab === 'received' && !notif.is_read && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkAsRead(notif.id);
                                                        }}
                                                        disabled={processingIds.has(notif.id)}
                                                        className={`flex-shrink-0 p-1.5 rounded-full transition-all ${processingIds.has(notif.id) ? 'bg-gray-100 text-gray-400 animate-pulse' : 'text-teal-600 hover:text-teal-800 bg-teal-100/50 dark:bg-teal-900/30 hover:scale-110'}`}
                                                        title="Marcar como lida"
                                                    >
                                                        {processingIds.has(notif.id) ? (
                                                            <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Check size={14} />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                            <p className={`text-gray-600 dark:text-gray-300 text-sm mb-2 break-words leading-relaxed ${notif.is_read ? 'opacity-70' : ''}`}>{notif.content}</p>
                                            <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-medium text-gray-400">
                                                <span>
                                                    {activeTab === 'received'
                                                        ? `DE: ${notif.sender?.full_name || 'Sistema'}`
                                                        : `PARA: ${notif.recipient?.full_name || 'Usuário'}`}
                                                </span>
                                                <span>{new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Composição (Portal) */}
            {isComposeOpen && createPortal(
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 font-sans">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-0 relative overflow-hidden border border-gray-100 dark:border-gray-700">
                        {/* Header do Modal */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400">
                                    <Mail size={20} />
                                </div>
                                Novo Aviso
                            </h2>
                            <button
                                onClick={() => setIsComposeOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Corpo do Form */}
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Destinatário</label>
                                <select
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
                                    value={recipientId}
                                    onChange={(e) => setRecipientId(e.target.value)}
                                >
                                    <option value="">Selecione quem receberá o aviso...</option>
                                    {usersList.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Assunto</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ex: Reunião Pedagógica"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Mensagem</label>
                                <textarea
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none min-h-[120px] resize-none"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Digite os detalhes do aviso aqui..."
                                />
                            </div>

                            <label className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl cursor-pointer hover:bg-red-100/50 transition-colors group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={priority === 'urgent'}
                                        onChange={(e) => setPriority(e.target.checked ? 'urgent' : 'normal')}
                                        className="peer w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">Marcar como Importante</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Destaca o aviso com um ícone de alerta para o destinatário.</span>
                                </div>
                            </label>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setIsComposeOpen(false)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={isSending}
                                className={`px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-teal-600/20 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Mail size={16} /> {isSending ? 'Enviando...' : 'Enviar Aviso'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
