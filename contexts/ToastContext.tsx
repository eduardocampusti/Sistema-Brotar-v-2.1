import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer, ToastMessage, ToastType } from '../components/Toast';

interface ToastContextType {
    addToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
    removeToast: (id: string) => void;
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback(
        (message: string, type: ToastType = 'info', title?: string, duration: number = 5000) => {
            const id = Math.random().toString(36).substring(2, 9);
            const newToast: ToastMessage = { id, type, title, message, duration };

            setToasts((prev) => [...prev, newToast]);
        },
        []
    );

    const success = useCallback((message: string, title?: string) => addToast(message, 'success', title), [addToast]);
    const error = useCallback((message: string, title?: string) => addToast(message, 'error', title), [addToast]);
    const warning = useCallback((message: string, title?: string) => addToast(message, 'warning', title), [addToast]);
    const info = useCallback((message: string, title?: string) => addToast(message, 'info', title), [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
