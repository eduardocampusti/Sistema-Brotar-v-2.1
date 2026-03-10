import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { SupabaseService } from '../services/SupabaseService';
import { supabase } from '../services/supabaseClient';
import { User, SystemMessage } from '../types';
import { useToast } from './ToastContext';


interface NotificationContextType {
    notifications: SystemMessage[];
    sentMessages: SystemMessage[];
    alerts: SystemMessage[];
    messages: SystemMessage[];
    sentAlerts: SystemMessage[];
    sentPrivateMessages: SystemMessage[];
    unreadCount: number;
    unreadAlertsCount: number;
    unreadMessagesCount: number;
    loading: boolean;
    refreshNotifications: () => Promise<void>;
    refreshSentMessages: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    deleteMessage: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({} as NotificationContextType);

export function NotificationProvider({ children, currentUser }: { children: React.ReactNode, currentUser: User | null }) {
    const [notifications, setNotifications] = useState<SystemMessage[]>([]);
    const [sentMessages, setSentMessages] = useState<SystemMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const { error: toastError } = useToast();

    // Busca notificações recebidas
    const fetchNotifications = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const msgs = await SupabaseService.getNotifications(currentUser.id);
            setNotifications(msgs);
        } catch (error) {
            console.error('Falha ao buscar notificações', error);
        } finally {
            setLoading(false);
        }
    };

    // Busca mensagens enviadas
    const fetchSentMessages = async () => {
        if (!currentUser) return;
        try {
            const msgs = await SupabaseService.getSentMessages(currentUser.id);
            setSentMessages(msgs);
        } catch (error) {
            console.error('Falha ao buscar mensagens enviadas', error);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchNotifications();
            fetchSentMessages();

            // Ativa o Realtime para mensagens instantâneas
            const channel = supabase
                .channel(`system_messages:${currentUser.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'system_messages',
                        filter: `recipient_id=eq.${currentUser.id}`
                    },
                    () => {
                        fetchNotifications();
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'system_messages',
                        filter: `sender_id=eq.${currentUser.id}`
                    },
                    () => {
                        fetchSentMessages();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            setNotifications([]);
            setSentMessages([]);
        }
    }, [currentUser?.id]);

    const markAsRead = async (id: string) => {
        // Guarda estado anterior para rollback em caso de erro
        const previousNotifications = [...notifications];

        // Atualização Otimista
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));

        try {
            await SupabaseService.markAsRead(id);
            // Sucesso – não precisa recarregar imediatamente, o polling fará isso
        } catch (error) {
            console.error('Erro ao marcar como lida, revertendo estado:', error);
            setNotifications(previousNotifications);
            toastError('Não foi possível marcar o aviso como lido.');
        }
    };

    const deleteMessage = async (id: string) => {
        // Guarda estado anterior para rollback
        const previousNotifications = [...notifications];
        const previousSent = [...sentMessages];

        // Otimista
        setNotifications(prev => prev.filter(n => n.id !== id));
        setSentMessages(prev => prev.filter(n => n.id !== id));

        try {
            await SupabaseService.deleteSystemMessage(id);
        } catch (error) {
            console.error('Erro ao excluir mensagem, revertendo:', error);
            setNotifications(previousNotifications);
            setSentMessages(previousSent);
            toastError('Não foi possível excluir a mensagem.');
        }
    };

    // Filtered Derivados — memoizados para evitar recalculo desnecessário
    const alerts = useMemo(() => notifications.filter(n => !n.type || n.type === 'ALERT'), [notifications]);
    const messages = useMemo(() => notifications.filter(n => n.type === 'MESSAGE'), [notifications]);
    const sentAlerts = useMemo(() => sentMessages.filter(n => !n.type || n.type === 'ALERT'), [sentMessages]);
    const sentPrivateMessages = useMemo(() => sentMessages.filter(n => n.type === 'MESSAGE'), [sentMessages]);
    const unreadAlertsCount = useMemo(() => alerts.filter(n => !n.is_read).length, [alerts]);
    const unreadMessagesCount = useMemo(() => messages.filter(n => !n.is_read).length, [messages]);

    // Memoiza o objeto de contexto para evitar re-render de todos os consumers
    const contextValue = useMemo(() => ({
        notifications,
        sentMessages,
        alerts,
        messages,
        sentAlerts,
        sentPrivateMessages,
        unreadCount: unreadAlertsCount + unreadMessagesCount,
        unreadAlertsCount,
        unreadMessagesCount,
        loading,
        refreshNotifications: fetchNotifications,
        refreshSentMessages: fetchSentMessages,
        markAsRead,
        deleteMessage,
    }), [notifications, sentMessages, alerts, messages, sentAlerts, sentPrivateMessages,
         unreadAlertsCount, unreadMessagesCount, loading, markAsRead, deleteMessage]);

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
        </NotificationContext.Provider>
    );
};

export function useNotifications() { return useContext(NotificationContext); }
