import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users for MVP
const demoUsers: Record<string, { password: string; user: User }> = {
  'admin@barakahsoft.com': {
    password: 'admin123',
    user: {
      id: '1',
      email: 'admin@barakahsoft.com',
      name: 'Principal Mohammad',
      role: 'admin',
    },
  },
  'teacher@barakahsoft.com': {
    password: 'teacher123',
    user: {
      id: '2',
      email: 'teacher@barakahsoft.com',
      name: 'Ustaz Abdullah',
      role: 'teacher',
      assignedClasses: ['class-1', 'class-2'],
    },
  },
  'accountant@barakahsoft.com': {
    password: 'accountant123',
    user: {
      id: '3',
      email: 'accountant@barakahsoft.com',
      name: 'Karim Ahmed',
      role: 'accountant',
    },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('barakahsoft_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('barakahsoft_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const demoUser = demoUsers[email.toLowerCase()];
    
    if (!demoUser) {
      return { success: false, error: 'User not found. Please check your email.' };
    }

    if (demoUser.password !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    setUser(demoUser.user);
    localStorage.setItem('barakahsoft_user', JSON.stringify(demoUser.user));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('barakahsoft_user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
