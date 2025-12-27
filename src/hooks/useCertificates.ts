import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCertificates(studentId?: string) {
  return useQuery({
    queryKey: ['certificates', studentId],
    queryFn: async () => {
      let query = supabase
        .from('certificates')
        .select(`
          *,
          students (id, student_id, name_en, classes (name))
        `)
        .order('created_at', { ascending: false });
      
      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCertificate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      student_id: string;
      type: 'transfer' | 'character' | 'hifz';
      reason?: string;
    }) => {
      const { data: certificate, error } = await supabase
        .from('certificates')
        .insert({
          certificate_no: `TEMP-${Date.now()}`,
          student_id: data.student_id,
          type: data.type,
          reason: data.reason,
        })
        .select()
        .single();
      
      if (error) throw error;
      return certificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast.success('Certificate generated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
