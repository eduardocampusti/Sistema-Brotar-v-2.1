import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Login } from '../../../components/Login';
import { User, SystemSettings } from '../../../types';

interface LoginPageProps {
    onLogin: (user: User) => void;
    systemSettings: SystemSettings;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, systemSettings }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from?.pathname || "/app/dashboard";

    const handleLoginSuccess = (user: User) => {
        onLogin(user);
        navigate(from, { replace: true });
    };

    return <Login onLogin={handleLoginSuccess} systemSettings={systemSettings} />;
};
