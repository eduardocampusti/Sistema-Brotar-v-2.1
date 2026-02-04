import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Mail, AlertTriangle, Check, X, CheckCheck, Send, Trash } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { User } from '../types';
import { SupabaseService } from '../services/SupabaseService';
import { useToast } from '../contexts/ToastContext';

interface MessagingSystemProps {
    currentUser: User | null;
}

export const MessagingSystem: React.FC<MessagingSystemProps> = ({ currentUser }) => {
    // Usando as variaveis de MENSAGENS do contexto
    const { unreadMessagesCount: unreadCount, messages: notifications, sentPrivateMessages: sentMessages, markAsRead, refreshSentMessages, deleteMessage } = useNotifications();
    const { success, error: toastError } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    // Estados do formulário de envio
    const [recipientId, setRecipientId] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    // Mensagens privadas nao tem prioridade visual forte, mas vamos manter o campo backend como normal
    const priority = 'normal';
    const [isSending, setIsSending] = useState(false);
    const [usersList, setUsersList] = useState<User[]>([]);

    const handleOpenCompose = async () => {
        setIsComposeOpen(true);
        setIsOpen(false);
        try {
            const users = await SupabaseService.getUsers();
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
            // TIPO MESSAGE EXPLICITO
            await SupabaseService.sendSystemMessage(currentUser!.id, recipientId, title, content, priority, 'MESSAGE');
            success('Mensagem enviada com sucesso!');
            setIsComposeOpen(false);
            setRecipientId('');
            setTitle('');
            setContent('');
            refreshSentMessages();
        } catch (error) {
            console.error('Erro detalhado ao enviar mensagem:', error);
            toastError('Erro ao enviar mensagem');
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

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Tem certeza que deseja excluir esta mensagem?')) {
            setProcessingIds(prev => new Set(prev).add(id));
            try {
                await deleteMessage(id);
                success('Mensagem excluída.');
            } catch (error) {
                // Erro já tratado no contexto
            } finally {
                setProcessingIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
        }
    };

    const displayList = (activeTab === 'received' ? notifications : sentMessages) || [];

    return (
        <div className="relative">
            {/* Ícone do Envelope */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative text-gray-600 dark:text-gray-300"
                title="Mensagens Privadas"
            >
                <Mail size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-teal-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse border-2 border-white dark:border-gray-800">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown - USANDO PORTAL */}
            {isOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999]"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="absolute top-16 right-16 md:right-20 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-3 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-100 dark:border-teal-800 flex justify-between items-center">
                            <h3 className="font-semibold text-teal-800 dark:text-teal-200 flex items-center gap-2">
                                <Mail size={16} /> Mensagens
                            </h3>
                            <button
                                onClick={handleOpenCompose}
                                className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-2 py-1.5 rounded flex items-center gap-1 transition-colors shadow-sm"
                            >
                                <Send size={12} /> Escrever
                            </button>
                        </div>

                        {/* Aviso de Privacidade/Auto-delete */}
                        <div className="bg-yellow-50 px-3 py-1.5 border-b border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-900/30 text-[10px] text-yellow-800 dark:text-yellow-200 text-center">
                            Mensagens lidas são apagadas automaticamente após 5 minutos.
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700 text-xs">
                            <button
                                onClick={() => setActiveTab('received')}
                                className={`flex-1 py-2 font-medium transition-colors ${activeTab === 'received' ? 'text-teal-600 bg-teal-50/50 dark:bg-teal-900/10 border-b-2 border-teal-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                Entrada ({(notifications || []).length})
                            </button>
                            <button
                                onClick={() => setActiveTab('sent')}
                                className={`flex-1 py-2 font-medium transition-colors ${activeTab === 'sent' ? 'text-teal-600 bg-teal-50/50 dark:bg-teal-900/10 border-b-2 border-teal-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                Enviadas ({(sentMessages || []).length})
                            </button>
                        </div>

                        <div className="max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                            {displayList.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    <Mail size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Nenhuma mensagem.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {displayList.map((msg) => (
                                        <li
                                            key={msg.id}
                                            className={`p-4 transition-colors relative ${activeTab === 'received' && !msg.is_read ? 'bg-teal-50/30 dark:bg-teal-900/10 border-l-4 border-teal-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`font-semibold text-sm text-gray-800 dark:text-gray-200 ${msg.is_read ? 'opacity-70' : ''}`}>
                                                            {msg.title}
                                                        </span>
                                                        {msg.is_read && (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 uppercase">
                                                                <CheckCheck size={10} /> Lida
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {activeTab === 'received' && !msg.is_read && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarkAsRead(msg.id);
                                                            }}
                                                            disabled={processingIds.has(msg.id)}
                                                            className={`flex-shrink-0 p-1.5 rounded-full transition-all ${processingIds.has(msg.id) ? 'bg-gray-100 text-gray-400 animate-pulse' : 'text-teal-600 hover:text-teal-800 bg-teal-100/50 dark:bg-teal-900/30 hover:scale-110'}`}
                                                            title="Marcar como lida"
                                                        >
                                                            {processingIds.has(msg.id) ? (
                                                                <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                                                            ) : (
                                                                <Check size={14} />
                                                            )}
                                                        </button>
                                                    )}

                                                    {(activeTab === 'sent' || (activeTab === 'received' && msg.is_read)) && (
                                                        <button
                                                            onClick={(e) => handleDelete(msg.id, e)}
                                                            disabled={processingIds.has(msg.id)}
                                                            className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                            title="Excluir mensagem"
                                                        >
                                                            <Trash size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className={`text-gray-600 dark:text-gray-300 text-sm mb-2 break-words leading-relaxed ${msg.is_read ? 'opacity-70' : ''}`}>{msg.content}</p>
                                            <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-medium text-gray-400">
                                                <span>
                                                    {activeTab === 'received'
                                                        ? `DE: ${msg.sender?.full_name || 'Usuário'}`
                                                        : `PARA: ${msg.recipient?.full_name || 'Usuário'}`}
                                                </span>
                                                <span>{new Date(msg.created_at).toLocaleDateString()} {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-teal-50/50 dark:bg-teal-900/20">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400">
                                    <Send size={20} />
                                </div>
                                Nova Mensagem Privada
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
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-xs text-blue-800 dark:text-blue-200">
                                <p className="font-semibold mb-1">Privacidade Garantida</p>
                                <p>Esta mensagem será vista apenas pelo destinatário e será apagada automaticamente 5 minutos após a leitura.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Destinatário</label>
                                <select
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
                                    value={recipientId}
                                    onChange={(e) => setRecipientId(e.target.value)}
                                >
                                    <option value="">Selecione o usuário...</option>
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
                                    placeholder="Ex: Dúvida sobre paciente..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Mensagem</label>
                                <textarea
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none min-h-[120px] resize-none"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Digite sua mensagem privada aqui..."
                                />
                            </div>
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
                                <Send size={16} /> {isSending ? 'Enviando...' : 'Enviar Mensagem'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
