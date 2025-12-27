import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useExams(classId?: string) {
  return useQuery({
    queryKey: ['exams', classId],
    queryFn: async () => {
      let query = supabase
        .from('exams')
        .select(`
          *,
          classes (id, name),
          exam_subjects (id, subject_name, full_marks)
        `)
        .order('start_date', { ascending: false });
      
      if (classId) {
        query = query.eq('class_id', classId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateExam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      name: string;
      type: 'class-test' | 'mid-term' | 'final' | 'annual';
      class_id: string;
      start_date: string;
      end_date?: string;
      academic_year?: string;
      subjects: { subject_name: string; full_marks: number }[];
    }) => {
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          name: data.name,
          type: data.type,
          class_id: data.class_id,
          start_date: data.start_date,
          end_date: data.end_date,
          academic_year: data.academic_year,
        })
        .select()
        .single();
      
      if (examError) throw examError;
      
      if (data.subjects.length > 0) {
        const { error: subjectsError } = await supabase
          .from('exam_subjects')
          .insert(
            data.subjects.map(s => ({
              exam_id: exam.id,
              subject_name: s.subject_name,
              full_marks: s.full_marks,
            }))
          );
        
        if (subjectsError) throw subjectsError;
      }
      
      return exam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Exam created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useMarks(examId: string) {
  return useQuery({
    queryKey: ['marks', examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marks')
        .select(`
          *,
          students (id, student_id, name_en, roll),
          exam_subjects (id, subject_name, full_marks)
        `)
        .eq('exam_id', examId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!examId,
  });
}

export function useSaveMarks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      exam_id: string;
      marks: {
        student_id: string;
        exam_subject_id: string;
        written?: number;
        mcq?: number;
        practical?: number;
        total: number;
        letter_grade?: string;
        grade_point?: number;
      }[];
    }) => {
      const { error } = await supabase
        .from('marks')
        .upsert(
          data.marks.map(m => ({
            exam_id: data.exam_id,
            student_id: m.student_id,
            exam_subject_id: m.exam_subject_id,
            written: m.written,
            mcq: m.mcq,
            practical: m.practical,
            total: m.total,
            letter_grade: m.letter_grade,
            grade_point: m.grade_point,
          }))
        );
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      toast.success('Marks saved successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSubjects(classId?: string) {
  return useQuery({
    queryKey: ['subjects', classId],
    queryFn: async () => {
      let query = supabase
        .from('subjects')
        .select('*')
        .order('name');
      
      if (classId) {
        query = query.eq('class_id', classId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
