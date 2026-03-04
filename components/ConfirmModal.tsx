import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, Trash2, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
    type = 'danger',
    isLoading = false
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            // Pequeno delay para a animação de entrada
            requestAnimationFrame(() => {
                setIsVisible(true);
            });
            // Bloquear scroll do body
            document.body.style.overflow = 'hidden';
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300); // Tempo da animação de saída
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!shouldRender) return null;

    const icons = {
        danger: <Trash2 size={28} className="text-red-500" />,
        warning: <AlertTriangle size={28} className="text-amber-500" />,
        info: <HelpCircle size={28} className="text-blue-500" />
    };

    const confirmButtonColors = {
        danger: 'bg-red-500 hover:bg-red-600 focus:ring-red-500 shadow-red-100',
        warning: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 shadow-amber-100',
        info: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 shadow-blue-100'
    };

    const iconBgColors = {
        danger: 'bg-red-50',
        warning: 'bg-amber-50',
        info: 'bg-blue-50'
    };

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ease-out
                        ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300
                            ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={isLoading ? undefined : onCancel}
            />

            {/* Modal Content */}
            <div
                className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 ease-out
                            ${isVisible ? 'translate-y-0 scale-100 rotate-0' : 'translate-y-8 scale-95 rotate-1'}`}
            >
                {/* Header/Banner decorative */}
                <div className={`h-2 w-full ${type === 'danger' ? 'bg-red-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />

                <div className="p-6 sm:p-8">
                    <div className="flex flex-col items-center text-center">
                        <div className={`mb-4 p-4 rounded-full ${iconBgColors[type]} animate-bounce-subtle`}>
                            {icons[type]}
                        </div>

                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {title}
                        </h3>

                        <p className="text-slate-600 mb-8 leading-relaxed">
                            {message}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <button
                                disabled={isLoading}
                                onClick={onCancel}
                                className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                disabled={isLoading}
                                onClick={onConfirm}
                                className={`flex-1 px-6 py-3 rounded-xl text-white font-semibold transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${confirmButtonColors[type]}`}
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    confirmLabel
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Close Button Trigger */}
                {!isLoading && (
                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>
        </div>
    );
};
