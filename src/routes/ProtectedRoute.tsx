import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User } from '../../types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    user: User | null;
    isLoading?: boolean;
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, isLoading, children }) => {
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-primary-500 mb-4" size={48} />
                <p className="text-slate-500 font-medium animate-pulse">Verificando sessão...</p>
            </div>
        );
    }

    if (!user) {
        // Redireciona para login, mas salva a localização de onde o usuário estava tentando ir
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
