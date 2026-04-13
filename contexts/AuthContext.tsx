import React, { createContext, useContext } from 'react';
import type { User } from '../types';

export type AuthContextValue = {
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{
  user: User | null;
  children: React.ReactNode;
}> = ({ user, children }) => (
  <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}
