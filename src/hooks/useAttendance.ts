import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAttendance(date: string, classId?: string, sectionId?: string) {
  return useQuery({
    queryKey: ['attendance', date, classId, sectionId],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          students (id, student_id, name_en, roll, class_id, section_id)
        `)
        .eq('date', date);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useStudentsForAttendance(classId: string, sectionId?: string) {
  return useQuery({
    queryKey: ['students-attendance', classId, sectionId],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id, student_id, name_en, roll, photo_url')
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('roll', { ascending: true });
      
      if (sectionId) {
        query = query.eq('section_id', sectionId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      records: {
        student_id: string;
        date: string;
        status: 'present' | 'absent' | 'late' | 'leave';
      }[];
    }) => {
      // Upsert attendance records
      const { error } = await supabase
        .from('attendance')
        .upsert(
          data.records.map(r => ({
            student_id: r.student_id,
            date: r.date,
            status: r.status,
          })),
          { onConflict: 'student_id,date', ignoreDuplicates: false }
        );
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance saved successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAttendanceStats(date: string) {
  return useQuery({
    queryKey: ['attendance-stats', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('status')
        .eq('date', date);
      
      if (error) throw error;
      
      const stats = {
        total: data.length,
        present: data.filter(a => a.status === 'present').length,
        absent: data.filter(a => a.status === 'absent').length,
        late: data.filter(a => a.status === 'late').length,
        leave: data.filter(a => a.status === 'leave').length,
      };
      
      return stats;
    },
  });
}
