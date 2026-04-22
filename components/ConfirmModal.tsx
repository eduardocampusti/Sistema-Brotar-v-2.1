import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Trash2, HelpCircle, CheckCircle2 } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info' | 'success';
    isLoading?: boolean;
    /** Desabilita o botão de confirmação (ex.: validação externa). */
    confirmDisabled?: boolean;
    /** Conteúdo entre a mensagem e os botões (ex.: campo opcional). */
    footerExtra?: React.ReactNode;
    /** Sobrescreve a classe do botão de confirmação (ex.: vermelho com type="warning"). */
    confirmButtonClassName?: string;
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
    isLoading = false,
    confirmDisabled = false,
    footerExtra,
    confirmButtonClassName
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            requestAnimationFrame(() => {
                setIsVisible(true);
            });
            document.body.style.overflow = 'hidden';
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!shouldRender || typeof document === 'undefined') return null;

    const icons = {
        danger: <Trash2 size={28} className="text-red-500" />,
        warning: <AlertTriangle size={28} className="text-amber-500" />,
        info: <HelpCircle size={28} className="text-blue-500" />,
        success: <CheckCircle2 size={28} className="text-emerald-500" />
    };

    const confirmButtonColors = {
        danger: 'bg-red-500 hover:bg-red-600 focus:ring-red-500 shadow-red-100',
        warning: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 shadow-amber-100',
        info: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 shadow-blue-100',
        success: 'bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500 shadow-emerald-100'
    };

    const iconBgColors = {
        danger: 'bg-red-50',
        warning: 'bg-amber-50',
        info: 'bg-blue-50',
        success: 'bg-emerald-50'
    };

    const modal = (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 ease-out
                        ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
        >
            <div
                className={`absolute inset-0 z-0 bg-slate-900/60 transition-opacity duration-300
                            ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={isLoading ? undefined : onCancel}
                aria-hidden
            />

            <div
                className={`relative z-10 flex max-h-[min(92dvh,calc(100vh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 ease-out
                            ${isVisible ? 'translate-y-0 scale-100' : 'translate-y-4 scale-[0.98]'}`}
            >
                <div className={`h-2 w-full shrink-0 ${type === 'danger' ? 'bg-red-500' : type === 'warning' ? 'bg-amber-500' : type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`} />

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8">
                    <div className="flex flex-col items-center text-center">
                        <div className={`mb-4 p-4 rounded-full ${iconBgColors[type]} animate-bounce-subtle`}>
                            {icons[type]}
                        </div>

                        <h3 id="confirm-modal-title" className="text-xl font-bold text-slate-800 mb-2">
                            {title}
                        </h3>

                        <p className={`text-slate-600 leading-relaxed whitespace-pre-line ${footerExtra ? 'mb-4' : 'mb-8'}`}>
                            {message}
                        </p>

                        {footerExtra ? <div className="w-full mb-6 text-left">{footerExtra}</div> : null}

                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <button
                                disabled={isLoading}
                                onClick={onCancel}
                                className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                disabled={isLoading || confirmDisabled}
                                onClick={onConfirm}
                                className={`flex-1 px-6 py-3 rounded-xl text-white font-semibold transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClassName ?? confirmButtonColors[type]}`}
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

                {!isLoading && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="absolute right-3 top-3 z-20 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Fechar"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};
