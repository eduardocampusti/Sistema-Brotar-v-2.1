import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseService } from '../services/SupabaseService';
import { User, SystemMessage } from '../types';
import { useToast } from './ToastContext';


interface NotificationContextType {
    notifications: SystemMessage[];
    sentMessages: SystemMessage[];
    unreadCount: number;
    loading: boolean;
    refreshNotifications: () => Promise<void>;
    refreshSentMessages: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({} as NotificationContextType);

export const NotificationProvider: React.FC<{ children: React.ReactNode, currentUser: User | null }> = ({ children, currentUser }) => {
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

            // Polling a cada 30 segundos
            const interval = setInterval(() => {
                fetchNotifications();
                fetchSentMessages();
            }, 30000);

            return () => clearInterval(interval);
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

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            sentMessages,
            unreadCount,
            loading,
            refreshNotifications: () => fetchNotifications(),
            refreshSentMessages: () => fetchSentMessages(),
            markAsRead
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
