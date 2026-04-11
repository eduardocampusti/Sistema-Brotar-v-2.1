import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Login } from '../../../components/Login';
import { User, SystemSettings } from '../../../types';

interface LoginPageProps {
    onLogin: (user: User) => void;
    systemSettings: SystemSettings;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, systemSettings }) => {
    const navigate = useNavigate();

    const handleLoginSuccess = (user: User) => {
        onLogin(user);
        navigate('/app/dashboard', { replace: true });
    };

    return <Login onLogin={handleLoginSuccess} systemSettings={systemSettings} />;
};
