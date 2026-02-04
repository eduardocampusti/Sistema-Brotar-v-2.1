import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, AlertTriangle, Check, CheckCheck, Trash, X } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { User } from '../types';
import { useToast } from '../contexts/ToastContext';

interface NotificationBellProps {
    currentUser: User | null;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ currentUser }) => {
    const { unreadAlertsCount: unreadCount, alerts: notifications, markAsRead, deleteMessage } = useNotifications();
    const { success } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    // Estado para o Modal de Confirmação
    const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

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

    // Abre o modal ao invés de usar window.confirm
    const requestDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteConfirmationId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmationId) return;

        const id = deleteConfirmationId;
        setDeleteConfirmationId(null); // Fecha o modal imediatamente

        setProcessingIds(prev => new Set(prev).add(id));
        try {
            await deleteMessage(id);
            success('Aviso excluído.');
        } catch (error) {
            // Erro já tratado no contexto
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    return (
        <div className="relative">
            {/* Ícone do Sino */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative text-gray-600 dark:text-gray-300"
                title="Avisos do Sistema"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse border-2 border-white dark:border-gray-800">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown - Portal */}
            {isOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9990]"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="absolute top-16 right-4 md:right-8 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                <Bell size={16} /> Avisos do Sistema
                            </h3>
                            <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                {notifications.length}
                            </span>
                        </div>

                        <div className="max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Nenhum aviso no momento.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {notifications.map((notif) => (
                                        <li
                                            key={notif.id}
                                            className={`p-4 transition-colors relative ${!notif.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    {notif.priority === 'urgent' && <AlertTriangle size={14} className="text-red-500" />}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`font-semibold text-sm ${notif.priority === 'urgent' ? 'text-red-600' : 'text-gray-800 dark:text-gray-200'} ${notif.is_read ? 'opacity-70' : ''}`}>
                                                            {notif.title}
                                                        </span>
                                                        {notif.is_read && (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800 uppercase">
                                                                <CheckCheck size={10} /> Lido
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {/* Botão de Marcar como Lido */}
                                                    {!notif.is_read && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarkAsRead(notif.id);
                                                            }}
                                                            disabled={processingIds.has(notif.id)}
                                                            className={`p-1.5 rounded-full transition-all ${processingIds.has(notif.id) ? 'bg-gray-100 text-gray-400' : 'text-teal-600 hover:bg-teal-100/50 dark:hover:bg-teal-900/30'}`}
                                                            title="Marcar como lida"
                                                        >
                                                            {processingIds.has(notif.id) ? <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
                                                        </button>
                                                    )}

                                                    {/* Botão de Excluir */}
                                                    <button
                                                        onClick={(e) => requestDelete(notif.id, e)}
                                                        disabled={processingIds.has(notif.id)}
                                                        className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                        title="Excluir aviso"
                                                    >
                                                        <Trash size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className={`text-gray-600 dark:text-gray-300 text-sm mb-2 break-words leading-relaxed ${notif.is_read ? 'opacity-70' : ''}`}>{notif.content}</p>
                                            <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-medium text-gray-400">
                                                <span>
                                                    {notif.sender?.full_name || 'Sistema'}
                                                </span>
                                                <span>{notif.created_at ? new Date(notif.created_at).toLocaleDateString() : ''} {notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
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

            {/* Modal de Confirmação de Exclusão - Portal */}
            {deleteConfirmationId && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
                                <Trash size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Excluir Aviso?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Você tem certeza que deseja remover este aviso permanentemente? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setDeleteConfirmationId(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-500/30"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
