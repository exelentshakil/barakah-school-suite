// FILE: src/hooks/useUserRole.ts - FIX ASYNC LOADING ISSUE

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserRole {
    role: 'admin' | 'teacher' | 'accountant';
    assignments: {
        class_id: string;
        section_id: string | null;
        subject_id: string;
    }[];
}

export function useUserRole() {
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUserRole();
    }, []);

    const loadUserRole = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            // Get role
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .maybeSingle();

            // Get assignments (for teachers)
            const { data: assignmentsData } = await supabase
                .from('teacher_assignments')
                .select('class_id, section_id, subject_id')
                .eq('user_id', user.id);

            const role = roleData?.role || 'teacher';
            const assignments = assignmentsData || [];

            setUserRole({
                role,
                assignments
            });
        } catch (error) {
            console.error('Error loading user role:', error);
        } finally {
            setLoading(false);
        }
    };

    const canAccessClass = (classId: string, sectionId?: string) => {
        if (!userRole) return false;
        if (userRole.role === 'admin') return true;
        if (userRole.role === 'accountant') return true;

        return userRole.assignments.some(a => {
            if (a.class_id !== classId) return false;
            if (sectionId && a.section_id && a.section_id !== sectionId) return false;
            return true;
        });
    };

    const canAccessSubject = (subjectId: string) => {
        if (!userRole) return false;
        if (userRole.role === 'admin') return true;
        if (userRole.role === 'accountant') return false;

        return userRole.assignments.some(a => a.subject_id === subjectId);
    };

    const getAssignedClasses = () => {
        if (!userRole) return [];
        if (userRole.role === 'admin' || userRole.role === 'accountant') return [];

        return [...new Set(userRole.assignments.map(a => a.class_id))];
    };

    const getAssignedSubjects = () => {
        if (!userRole) return [];
        if (userRole.role === 'admin') return [];
        if (userRole.role === 'accountant') return [];

        return [...new Set(userRole.assignments.map(a => a.subject_id))];
    };

    return {
        userRole,
        loading,
        canAccessClass,
        canAccessSubject,
        getAssignedClasses,
        getAssignedSubjects,
        isAdmin: userRole?.role === 'admin',
        isTeacher: userRole?.role === 'teacher',
        isAccountant: userRole?.role === 'accountant'
    };
}