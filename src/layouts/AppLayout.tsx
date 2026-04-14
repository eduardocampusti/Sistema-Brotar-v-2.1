import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { User, SystemSettings } from '../../types';
import { MessagingSystem } from '../../components/MessagingSystem';
import { NotificationBell } from '../../components/NotificationBell';

interface AppLayoutProps {
    user: User;
    onLogout: () => void;
    systemSettings: SystemSettings;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ user, onLogout, systemSettings }) => {
    const location = useLocation();
    const compactHeaderSpacing = location.pathname.endsWith('/new-appointment');

    return (
        <Layout
            currentUser={user}
            onLogout={onLogout}
            systemSettings={systemSettings}
        >
            {/* Header Controls */}
            <div
                className={`flex justify-end items-center gap-3 px-4 md:px-0 ${compactHeaderSpacing ? 'mb-2' : 'mb-6'}`}
            >
                <div
                    className={
                        compactHeaderSpacing
                            ? 'flex items-center gap-2 rounded-full bg-surface-container-low/90 p-2 shadow-sm ring-1 ring-outline/10 backdrop-blur-sm'
                            : 'flex items-center gap-2 rounded-full border border-gray-100 bg-white/80 p-2 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80'
                    }
                >
                    <MessagingSystem currentUser={user} />
                    <div
                        className={
                            compactHeaderSpacing
                                ? 'mx-1 h-6 w-px bg-outline/20'
                                : 'mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700'
                        }
                    />
                    <NotificationBell currentUser={user} />
                </div>
            </div>

            <Outlet />
        </Layout>
    );
};
