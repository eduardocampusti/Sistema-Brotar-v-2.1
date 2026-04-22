import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Sparkles } from 'lucide-react';

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
        const entryTimer = setTimeout(() => setIsVisible(true), 10);

        const autoCloseTimer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onClose(toast.id), 400);
        }, toast.duration || 5000);

        return () => {
            clearTimeout(entryTimer);
            clearTimeout(autoCloseTimer);
        };
    }, [toast, onClose]);

    const icons = {
        success: <CheckCircle className="w-6 h-6 text-emerald-500" />,
        error: <AlertCircle className="w-6 h-6 text-rose-500" />,
        info: <Info className="w-6 h-6 text-sky-500" />,
        warning: <AlertTriangle className="w-6 h-6 text-amber-500" />
    };

    const config = {
        success: {
            bg: 'bg-emerald-50/90',
            border: 'border-emerald-200/50',
            shadow: 'shadow-emerald-200/20',
            accent: 'bg-emerald-500'
        },
        error: {
            bg: 'bg-rose-50/90',
            border: 'border-rose-200/50',
            shadow: 'shadow-rose-200/20',
            accent: 'bg-rose-500'
        },
        info: {
            bg: 'bg-sky-50/90',
            border: 'border-sky-200/50',
            shadow: 'shadow-sky-200/20',
            accent: 'bg-sky-500'
        },
        warning: {
            bg: 'bg-amber-50/90',
            border: 'border-amber-200/50',
            shadow: 'shadow-amber-200/20',
            accent: 'bg-amber-500'
        }
    };

    const currentStyle = config[toast.type];

    return (
        <div
            className={`
                group relative flex items-center gap-4 p-4 pr-12 rounded-2xl border backdrop-blur-xl transition-all duration-500 ease-out
                ${currentStyle.bg} ${currentStyle.border} ${currentStyle.shadow} shadow-2xl
                ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'}
                min-w-[340px] max-w-[440px] pointer-events-auto
            `}
            role="alert"
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${currentStyle.accent}`} />

            <div className="flex-shrink-0 relative">
                <div className={`absolute inset-0 blur-lg opacity-40 ${currentStyle.accent}`} />
                <div className="relative animate-bounce-subtle">
                    {icons[toast.type]}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {toast.type === 'success' ? 'Sistema Brotar' : 'Notificação'}
                    </span>
                    {toast.type === 'success' && <Sparkles size={12} className="text-amber-400 animate-pulse" />}
                </div>
                <h3 className="text-sm font-black text-slate-800 leading-tight">
                    {toast.title || (toast.type === 'success' ? 'Sucesso!' : toast.type === 'error' ? 'Erro' : 'Aviso')}
                </h3>
                <p className="text-[13px] text-slate-600 leading-relaxed font-medium mt-1">
                    {toast.message}
                </p>
            </div>

            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => onClose(toast.id), 400);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-black/5 transition-all active:scale-90"
            >
                <X size={18} />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-6 right-6 z-[10000] flex flex-col gap-4 pointer-events-none items-end">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto animate-fadeIn">
                    <Toast toast={toast} onClose={removeToast} />
                </div>
            ))}
        </div>
    );
};
