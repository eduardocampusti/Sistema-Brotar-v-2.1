import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    type: ToastType;
    title?: string;
    message: string;
    duration?: number;
}

interface ToastProps {
    toast: ToastMessage;
    onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Small delay to trigger entry animation
        requestAnimationFrame(() => setIsVisible(true));

        const timer = setTimeout(() => {
            setIsVisible(false); // Trigger exit animation
            setTimeout(() => onClose(toast.id), 300); // Wait for animation to finish
        }, toast.duration || 4000);

        return () => clearTimeout(timer);
    }, [toast, onClose]);

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-500" />
    };

    const bgColors = {
        success: 'bg-white border-green-100',
        error: 'bg-white border-red-100',
        info: 'bg-white border-blue-100',
        warning: 'bg-white border-amber-100'
    };

    const borderColors = {
        success: 'border-l-4 border-l-green-500',
        error: 'border-l-4 border-l-red-500',
        info: 'border-l-4 border-l-blue-500',
        warning: 'border-l-4 border-l-amber-500'
    };

    return (
        <div
            className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}
        flex items-start gap-4 p-4 rounded-lg shadow-lg border border-slate-100 
        ${bgColors[toast.type]} ${borderColors[toast.type]}
        min-w-[320px] max-w-[400px] backdrop-blur-sm
      `}
            role="alert"
        >
            <div className="flex-shrink-0 mt-0.5 animate-bounce-subtle">
                {icons[toast.type]}
            </div>
            <div className="flex-1 min-w-0">
                {toast.title && (
                    <h3 className="text-sm font-bold text-slate-800 mb-1 leading-tight">
                        {toast.title}
                    </h3>
                )}
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {toast.message}
                </p>
            </div>
            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => onClose(toast.id), 300);
                }}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
            >
                <X size={16} />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast toast={toast} onClose={removeToast} />
                </div>
            ))}
        </div>
    );
};
