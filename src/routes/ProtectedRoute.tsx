import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User } from '../../types';

interface ProtectedRouteProps {
    user: User | null;
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, children }) => {
    const location = useLocation();

    if (!user) {
        // Redireciona para login, mas salva a localização de onde o usuário estava tentando ir
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
