import React from 'react';
import { Outlet } from 'react-router-dom';
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
    return (
        <Layout
            currentUser={user}
            onLogout={onLogout}
            systemSettings={systemSettings}
        >
            {/* Header Controls */}
            <div className="flex justify-end items-center gap-3 mb-6 px-4 md:px-0">
                <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
                    <MessagingSystem currentUser={user} />
                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    <NotificationBell currentUser={user} />
                </div>
            </div>

            <Outlet />
        </Layout>
    );
};
