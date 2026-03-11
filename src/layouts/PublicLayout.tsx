import React from 'react';

interface PublicLayoutProps {
    children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary-500 selection:text-white">
            {/* Aqui poderíamos ter um Header simples ou apenas renderizar o conteúdo */}
            <main>
                {children}
            </main>
        </div>
    );
};
