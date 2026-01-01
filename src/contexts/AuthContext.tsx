import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserRole } from '@/types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                loadUserProfile(session.user);
            } else {
                setUser(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await loadUserProfile(session.user);
        } else {
            setIsLoading(false);
        }
    };

    const loadUserProfile = async (supabaseUser: SupabaseUser) => {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('name')
                .eq('user_id', supabaseUser.id)
                .maybeSingle();

            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', supabaseUser.id)
                .maybeSingle();

            const { data: assignments } = await supabase
                .from('teacher_assignments')
                .select('class_id')
                .eq('user_id', supabaseUser.id);

            setUser({
                id: supabaseUser.id,
                email: supabaseUser.email!,
                name: profile?.name || 'User',
                role: (roleData?.role || 'teacher') as UserRole,
                assignedClasses: assignments?.map(a => a.class_id) || []
            });
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            if (data.user) {
                await loadUserProfile(data.user);
                return { success: true };
            }

            return { success: false, error: 'Login failed' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
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