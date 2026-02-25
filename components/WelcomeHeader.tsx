import React from 'react';

interface WelcomeHeaderProps {
    name: string;
    subtitle?: string;
    title?: string;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ name, subtitle, title }) => (
    <div className="mb-8 animate-fadeIn">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {title ? title : <>Olá, <span className="text-primary-600">{name}</span></>}
        </h1>
        <p className="text-xl text-slate-500 mt-2 font-medium">
            {subtitle || "O que você quer fazer hoje?"}
        </p>
    </div>
);
