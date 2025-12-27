import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StudentWithDetails {
  id: string;
  student_id: string;
  name_en: string;
  name_bn: string | null;
  photo_url: string | null;
  dob: string | null;
  gender: 'male' | 'female' | null;
  blood_group: string | null;
  class_id: string | null;
  section_id: string | null;
  shift: 'morning' | 'day' | 'evening' | null;
  roll: number | null;
  address_present: string | null;
  admission_date: string | null;
  status: 'active' | 'inactive' | 'transferred' | null;
  created_at: string | null;
  classes?: { id: string; name: string; name_bn: string | null } | null;
  sections?: { id: string; name: string } | null;
  guardians?: { father_name: string; father_mobile: string; mother_name: string | null; mother_mobile: string | null } | null;
}

export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          classes (id, name, name_bn),
          sections (id, name),
          guardians (father_name, father_mobile, mother_name, mother_mobile)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StudentWithDetails[];
    },
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          classes (id, name, name_bn),
          sections (id, name),
          guardians (*)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      student: {
        name_en: string;
        name_bn?: string;
        dob?: string;
        gender?: 'male' | 'female';
        blood_group?: string;
        class_id?: string;
        section_id?: string;
        shift?: 'morning' | 'day' | 'evening';
        roll?: number;
        address_present?: string;
      };
      guardian: {
        father_name: string;
        father_mobile: string;
        mother_name?: string;
        mother_mobile?: string;
      };
    }) => {
      // Insert student
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          student_id: `TEMP-${Date.now()}`, // Will be replaced by trigger
          name_en: data.student.name_en,
          name_bn: data.student.name_bn,
          dob: data.student.dob,
          gender: data.student.gender,
          blood_group: data.student.blood_group,
          class_id: data.student.class_id,
          section_id: data.student.section_id,
          shift: data.student.shift,
          roll: data.student.roll,
          address_present: data.student.address_present,
        })
        .select()
        .single();
      
      if (studentError) throw studentError;
      
      // Insert guardian
      const { error: guardianError } = await supabase
        .from('guardians')
        .insert({
          student_id: student.id,
          father_name: data.guardian.father_name,
          father_mobile: data.guardian.father_mobile,
          mother_name: data.guardian.mother_name,
          mother_mobile: data.guardian.mother_mobile,
        });
      
      if (guardianError) throw guardianError;
      
      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student registered successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useSections(classId?: string) {
  return useQuery({
    queryKey: ['sections', classId],
    queryFn: async () => {
      let query = supabase.from('sections').select('*');
      if (classId) {
        query = query.eq('class_id', classId);
      }
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
    enabled: !classId || !!classId,
  });
}
