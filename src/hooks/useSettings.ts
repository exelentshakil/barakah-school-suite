import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSchoolSettings() {
  return useQuery({
    queryKey: ['school-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      name?: string;
      name_bn?: string;
      code?: string;
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
      academic_year?: string;
      session_year?: string;
      logo_url?: string;
    }) => {
      const { data: existing } = await supabase
        .from('school_settings')
        .select('id')
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('school_settings')
          .update(data)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('school_settings')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-settings'] });
      toast.success('Settings updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUserRoles() {
  return useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          profiles (name, avatar_url)
        `);
      
      if (error) throw error;
      return data;
    },
  });
}
